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

let cachedEmployees = null;
let cachedAt = 0;
let inflight = null;

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

function parseEmployeesPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.employees)) {
    return payload.employees;
  }
  throw new Error('Org API response missing an "employees" array.');
}

async function fetchEmployeesFromSource() {
  if (!orgApi.isConfigured) {
    throw new Error("Org directory is not configured.");
  }

  const headers = { Accept: "application/json" };
  if (orgApi.apiKey) {
    headers.Authorization = `Bearer ${orgApi.apiKey}`;
  }

  const response = await fetch(orgApi.url, { headers });
  if (!response.ok) {
    throw new Error(`Org API failed (${response.status})`);
  }

  return parseEmployeesPayload(await response.json());
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
    const user = toPerson(code, managerName, "manager", undefined, selfRow);
    const reports = reportRows.map((row) =>
      toPerson(
        normalizeCode(row.EMPLOYEE_CODE),
        normalizeCode(row.EMPLOYEE_NAME),
        "employee",
        code,
        row,
      ),
    );
    const assessments = reports.map((report) => ({
      employeeId: report.id,
      managerId: code,
      employeeScores: null,
      managerScores: null,
      employeeSubmittedAt: null,
      managerSubmittedAt: null,
    }));
    return { user, reports, assessments };
  }

  if (!selfRow) {
    const error = new Error(
      `Employee code "${code}" was not found in the directory.`,
    );
    error.status = 404;
    throw error;
  }

  const managerCode = normalizeCode(selfRow.L1_MANAGER_CODE);
  const user = toPerson(
    code,
    normalizeCode(selfRow.EMPLOYEE_NAME),
    "employee",
    managerCode || undefined,
    selfRow,
  );
  const assessments = [
    {
      employeeId: code,
      managerId: managerCode,
      employeeScores: null,
      managerScores: null,
      employeeSubmittedAt: null,
      managerSubmittedAt: null,
    },
  ];
  return { user, reports: [], assessments };
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

    return {
      user: serializedUser,
      reports: reports.map(serializeUser),
      assessments: await Promise.all(
        assessments.map((assessment) =>
          serializeAssessmentForRole(assessment, populated),
        ),
      ),
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
};
