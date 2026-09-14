const CompUser = require("../models/CompUser");
const CompAssessment = require("../models/CompAssessment");
const { USER_ROLES } = require("../constants/userRoles");
const { isAdminEmployeeCode, isAdminEmail } = require("../config/adminAccess");
const {
  normalizeCode,
  placeholderEmail,
  isPlaceholderEmail,
  pickEmail,
  pickTitle,
  pickDepartment,
} = require("./orgFields");

async function findUserByCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return CompUser.findOne({
    $or: [{ employeeCode: normalized }, { externalId: normalized }],
  });
}

function resolveRole(code, email, fallbackRole) {
  if (isAdminEmployeeCode(code) || isAdminEmail(email)) {
    return USER_ROLES.ADMIN;
  }
  return fallbackRole;
}

async function upsertPerson({
  code,
  name,
  email,
  title,
  department,
  role,
}) {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const safeEmail = (email || placeholderEmail(normalizedCode)).toLowerCase();
  const resolvedRole = resolveRole(normalizedCode, safeEmail, role);
  const safeTitle =
    title ||
    (resolvedRole === USER_ROLES.MANAGER ? "Manager" : "Employee");
  const safeDepartment = department || "General";
  const safeName = name || normalizedCode;

  let user = await findUserByCode(normalizedCode);
  if (!user && !isPlaceholderEmail(safeEmail)) {
    user = await CompUser.findOne({ email: safeEmail });
  }

  if (user) {
    user.employeeCode = normalizedCode;
    if (!user.externalId) {
      user.externalId = normalizedCode;
    }
    user.name = safeName;
    user.title = safeTitle;
    user.department = safeDepartment;
    user.role = resolvedRole;
    if (!isPlaceholderEmail(safeEmail)) {
      user.email = safeEmail;
    } else if (!user.email) {
      user.email = safeEmail;
    }
    await user.save();
    return user;
  }

  try {
    return await CompUser.create({
      externalId: normalizedCode,
      employeeCode: normalizedCode,
      email: safeEmail,
      name: safeName,
      title: safeTitle,
      department: safeDepartment,
      role: resolvedRole,
      managerRef: null,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return CompUser.findOne({
      $or: [
        { employeeCode: normalizedCode },
        { externalId: normalizedCode },
        { email: safeEmail },
      ],
    });
  }
}

async function linkManager(user, managerCode) {
  if (!user) return;
  const normalizedManager = normalizeCode(managerCode);
  if (!normalizedManager || normalizedManager === user.employeeCode) {
    if (user.managerRef) {
      user.managerRef = null;
      await user.save();
    }
    return;
  }

  const manager = await findUserByCode(normalizedManager);
  if (!manager) return;
  if (String(user.managerRef) === String(manager._id)) return;

  user.managerRef = manager._id;
  await user.save();
}

async function ensureAssessment(employee, manager) {
  if (!employee?._id || !manager?._id) return null;
  if (String(employee._id) === String(manager._id)) return null;

  let assessment = await CompAssessment.findOne({ employeeRef: employee._id });
  if (!assessment) {
    return CompAssessment.create({
      employeeRef: employee._id,
      managerRef: manager._id,
    });
  }

  if (
    !assessment.managerSubmittedAt &&
    String(assessment.managerRef) !== String(manager._id)
  ) {
    assessment.managerRef = manager._id;
    await assessment.save();
  }

  return assessment;
}

function personFromIdentity(person, row) {
  return {
    code: person.id,
    name: person.name,
    email: person.email || pickEmail(row) || placeholderEmail(person.id),
    title: person.title || pickTitle(row),
    department: person.department || pickDepartment(row),
    role: person.role,
  };
}

async function persistResolvedIdentity(identity, employees = []) {
  const rowsByCode = new Map(
    employees.map((row) => [normalizeCode(row.EMPLOYEE_CODE), row]),
  );

  const selfRow = rowsByCode.get(identity.user.id);
  const upsertedUser = await upsertPerson(
    personFromIdentity(identity.user, selfRow),
  );

  if (identity.user.reportsTo && identity.user.reportsTo !== identity.user.id) {
    const managerRow = rowsByCode.get(identity.user.reportsTo);
    await upsertPerson({
      code: identity.user.reportsTo,
      name:
        pickFieldName(managerRow) ||
        (selfRow && (selfRow.L1_MANAGER_NAME || selfRow.l1_manager_name)) ||
        identity.user.reportsTo,
      email: pickEmail(managerRow) || placeholderEmail(identity.user.reportsTo),
      title: pickTitle(managerRow) || "Manager",
      department: pickDepartment(managerRow) || identity.user.department,
      role: USER_ROLES.MANAGER,
    });
  }

  for (const report of identity.reports) {
    const reportRow = rowsByCode.get(report.id);
    await upsertPerson(personFromIdentity(report, reportRow));
  }

  await linkManager(upsertedUser, identity.user.reportsTo);

  for (const report of identity.reports) {
    const reportUser = await findUserByCode(report.id);
    await linkManager(reportUser, identity.user.id);
    await ensureAssessment(reportUser, upsertedUser);
  }

  if (
    upsertedUser.role === USER_ROLES.EMPLOYEE &&
    identity.user.reportsTo
  ) {
    const manager = await findUserByCode(identity.user.reportsTo);
    await ensureAssessment(upsertedUser, manager);
  }

  return CompUser.findById(upsertedUser._id).populate("managerRef");
}

function pickFieldName(row) {
  if (!row) return "";
  return String(row.EMPLOYEE_NAME || row.employee_name || "").trim();
}

async function findOrgCodeForEmail(employees, email) {
  const normalizedEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail || isPlaceholderEmail(normalizedEmail)) return "";
  const match = employees.find(
    (row) => pickEmail(row) === normalizedEmail,
  );
  return match ? normalizeCode(match.EMPLOYEE_CODE) : "";
}

module.exports = {
  findUserByCode,
  upsertPerson,
  linkManager,
  ensureAssessment,
  persistResolvedIdentity,
  findOrgCodeForEmail,
};
