const orgApi = require("../config/orgApi");
const CompUser = require("../models/CompUser");
const CompAssessment = require("../models/CompAssessment");
const { USER_ROLES } = require("../constants/userRoles");
const { isAdminEmployeeCode, isAdminEmail } = require("../config/adminAccess");
const {
  normalizeCode,
  placeholderEmail,
  pickEmail,
  pickTitle,
  pickDepartment,
  isActiveEmployee,
} = require("./orgFields");
const {
  persistResolvedIdentity,
  findOrgCodeForEmail,
  upsertPerson,
  ensureAssessment,
} = require("./orgSync");
const {
  serializeUser,
  getReportsFor,
} = require("./orgHierarchy");
const {
  serializeAssessmentBase,
  stripForEmployee,
  stripForManager,
} = require("./assessmentService");

const CACHE_TTL_MS = 5 * 60 * 1000;
const ORG_FETCH_TIMEOUT_MS = 20_000;

let cachedEmployees = null;
let cachedAt = 0;
let inflight = null;

function directoryError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toPerson(code, name, role, reportsTo, row) {
  const person = {
    id: code,
    name: name || code,
    email: pickEmail(row) || placeholderEmail(code),
    title: pickTitle(row) || (role === "manager" ? "Manager" : "Employee"),
    department: pickDepartment(row) || "General",
    role,
  };
  if (reportsTo) person.reportsTo = reportsTo;
  return person;
}

function hasActiveReports(employees, code) {
  return employees.some(
    (row) =>
      normalizeCode(row.L1_MANAGER_CODE) === code && isActiveEmployee(row),
  );
}

function ownManagerCode(selfRow, code) {
  const managerCode = normalizeCode(selfRow?.L1_MANAGER_CODE);
  if (!managerCode || managerCode === code) return undefined;
  return managerCode;
}

function emptyAssessment(employeeId, managerId) {
  return {
    employeeId,
    managerId,
    employeeScores: null,
    managerScores: null,
    employeeSubmittedAt: null,
    managerSubmittedAt: null,
  };
}

function parseEmployeesPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.employees)) {
    return payload.employees;
  }
  throw new Error("The employee directory returned an unexpected response.");
}

async function fetchEmployeesFromSource() {
  if (!orgApi.isConfigured) {
    throw directoryError(
      "The employee directory is unavailable. Try again later.",
      503,
    );
  }

  const headers = { Accept: "application/json" };
  if (orgApi.apiKey) {
    headers.Authorization = `Bearer ${orgApi.apiKey}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ORG_FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(orgApi.url, {
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw directoryError("The employee directory timed out. Try again.", 503);
    }
    throw directoryError(
      "Could not reach the employee directory. Try again shortly.",
      503,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw directoryError(
      "The employee directory is unavailable. Try again shortly.",
      503,
    );
  }

  try {
    return parseEmployeesPayload(await response.json());
  } catch {
    throw directoryError(
      "The employee directory returned an unexpected response.",
      503,
    );
  }
}

async function getEmployees() {
  const now = Date.now();
  if (cachedEmployees && now - cachedAt < CACHE_TTL_MS) {
    return cachedEmployees;
  }

  if (!inflight) {
    inflight = fetchEmployeesFromSource()
      .then((employees) => {
        cachedEmployees = employees;
        cachedAt = Date.now();
        return employees;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

function resolveOrgIdentity(employees, employeeCode) {
  const code = normalizeCode(employeeCode);
  if (!code) {
    const error = new Error("Enter an employee code.");
    error.status = 400;
    throw error;
  }

  const selfRow = employees.find(
    (row) => normalizeCode(row.EMPLOYEE_CODE) === code,
  );

  const reportRows = employees.filter(
    (row) =>
      normalizeCode(row.L1_MANAGER_CODE) === code && isActiveEmployee(row),
  );

  if (reportRows.length > 0) {
    const managerName =
      normalizeCode(selfRow?.EMPLOYEE_NAME) ||
      normalizeCode(reportRows[0]?.L1_MANAGER_NAME) ||
      code;
    const reportsTo = ownManagerCode(selfRow, code);
    const user = toPerson(code, managerName, "manager", reportsTo, selfRow);
    const reports = reportRows.map((row) => {
      const reportCode = normalizeCode(row.EMPLOYEE_CODE);
      return toPerson(
        reportCode,
        normalizeCode(row.EMPLOYEE_NAME),
        hasActiveReports(employees, reportCode)
          ? USER_ROLES.MANAGER
          : USER_ROLES.EMPLOYEE,
        code,
        row,
      );
    });
    const assessments = [
      ...(reportsTo ? [emptyAssessment(code, reportsTo)] : []),
      ...reports.map((report) => emptyAssessment(report.id, code)),
    ];
    return { user, reports, assessments };
  }

  if (!selfRow) {
    const error = new Error(
      `Employee code "${code}" was not found in the directory.`,
    );
    error.status = 404;
    throw error;
  }

  const managerCode = ownManagerCode(selfRow, code);
  const user = toPerson(
    code,
    normalizeCode(selfRow.EMPLOYEE_NAME),
    "employee",
    managerCode,
    selfRow,
  );
  const assessments = [emptyAssessment(code, managerCode || "")];
  return { user, reports: [], assessments };
}

async function serializeOwnAssessmentForUser(user) {
  const boss =
    user.managerRef && user.managerRef.externalId
      ? user.managerRef
      : user.managerRef
        ? await CompUser.findById(user.managerRef)
        : null;
  if (!boss) return null;

  let assessment = await CompAssessment.findOne({
    employeeRef: user._id,
  })
    .populate("employeeRef")
    .populate("managerRef");

  if (!assessment) {
    assessment = await ensureAssessment(user, boss);
    if (assessment?._id) {
      assessment = await CompAssessment.findById(assessment._id)
        .populate("employeeRef")
        .populate("managerRef");
    }
  }

  if (!assessment) return null;

  return stripForEmployee(
    serializeAssessmentBase({
      ...assessment.toObject(),
      employeeRef: assessment.employeeRef || user,
      managerRef: assessment.managerRef || boss,
    }),
  );
}

async function serializeAssessmentForRole(assessment, viewer) {
  const populated = assessment.toObject
    ? {
        ...assessment.toObject(),
        employeeRef: assessment.employeeRef,
        managerRef: assessment.managerRef,
      }
    : assessment;
  const base = serializeAssessmentBase(populated);

  switch (viewer.role) {
    case USER_ROLES.EMPLOYEE:
      return stripForEmployee(base);
    case USER_ROLES.MANAGER:
      return stripForManager(base);
    case USER_ROLES.ADMIN:
      return base;
    default: {
      const _exhaustive = viewer.role;
      throw new Error(`Unhandled role: ${_exhaustive}`);
    }
  }
}

async function buildIdentityFromUser(user) {
  const populated =
    user.managerRef && user.managerRef.externalId
      ? user
      : await CompUser.findById(user._id).populate("managerRef");

  const serializedUser = serializeUser(populated);

  if (populated.role === USER_ROLES.ADMIN) {
    return {
      user: serializedUser,
      reports: [],
      assessments: [],
    };
  }

  if (populated.role === USER_ROLES.MANAGER) {
    const reports = await getReportsFor(populated._id);
    const reportIds = reports.map((report) => report._id);
    const assessments = await CompAssessment.find({
      employeeRef: { $in: reportIds },
      managerRef: populated._id,
    })
      .populate("employeeRef")
      .populate("managerRef");
    const ownAssessment = await serializeOwnAssessmentForUser(populated);
    const teamAssessments = await Promise.all(
      assessments.map((assessment) =>
        serializeAssessmentForRole(assessment, populated),
      ),
    );

    return {
      user: serializedUser,
      reports: reports.map(serializeUser),
      assessments: ownAssessment
        ? [ownAssessment, ...teamAssessments]
        : teamAssessments,
    };
  }

  const assessment = await CompAssessment.findOne({
    employeeRef: populated._id,
  })
    .populate("employeeRef")
    .populate("managerRef");

  return {
    user: serializedUser,
    reports: [],
    assessments: assessment
      ? [await serializeAssessmentForRole(assessment, populated)]
      : [],
  };
}

async function establishSessionFromEmployeeCode(employeeCode) {
  const employees = await getEmployees();
  try {
    const identity = resolveOrgIdentity(employees, employeeCode);
    const user = await persistResolvedIdentity(identity, employees);
    return buildIdentityFromUser(user);
  } catch (error) {
    if (error.status === 404 && isAdminEmployeeCode(employeeCode)) {
      const user = await upsertPerson({
        code: normalizeCode(employeeCode),
        name: normalizeCode(employeeCode),
        email: placeholderEmail(employeeCode),
        title: "HR Admin",
        department: "People & Culture",
        role: USER_ROLES.ADMIN,
      });
      return buildIdentityFromUser(user);
    }
    throw error;
  }
}

async function provisionCompUserFromAuth({ employeeCode, email }) {
  const employees = await getEmployees();
  const code =
    normalizeCode(employeeCode) || (await findOrgCodeForEmail(employees, email));

  if (!code) {
    if (email && isAdminEmail(email)) {
      return upsertPerson({
        code: email,
        name: email,
        email,
        title: "HR Admin",
        department: "People & Culture",
        role: USER_ROLES.ADMIN,
      });
    }
    return null;
  }

  try {
    const identity = resolveOrgIdentity(employees, code);
    return persistResolvedIdentity(identity, employees);
  } catch (error) {
    if (error.status === 404 && isAdminEmployeeCode(code)) {
      return upsertPerson({
        code,
        name: code,
        email: email || placeholderEmail(code),
        title: "HR Admin",
        department: "People & Culture",
        role: USER_ROLES.ADMIN,
      });
    }
    throw error;
  }
}

module.exports = {
  establishSessionFromEmployeeCode,
  resolveOrgIdentity,
  provisionCompUserFromAuth,
  getEmployees,
  buildIdentityFromUser,
  serializeOwnAssessmentForUser,
};
