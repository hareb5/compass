const CompUser = require("../models/CompUser");
const { USER_ROLES } = require("../constants/userRoles");

function serializeUser(user) {
  if (!user) return null;
  const managerExternalId =
    user.managerRef &&
    typeof user.managerRef === "object" &&
    user.managerRef.externalId
      ? user.managerRef.externalId
      : undefined;
  return {
    id: user.externalId,
    name: user.name,
    email: user.email,
    title: user.title,
    department: user.department,
    role: user.role,
    reportsTo: managerExternalId,
  };
}

function canSubmitSelfScores(user) {
  if (!user) return false;
  switch (user.role) {
    case USER_ROLES.EMPLOYEE:
      return true;
    case USER_ROLES.MANAGER:
      return Boolean(user.managerRef);
    case USER_ROLES.ADMIN:
      return false;
    default: {
      const _exhaustive = user.role;
      throw new Error(`Unhandled role: ${_exhaustive}`);
    }
  }
}

async function getManagerFor(employeeRef) {
  const employee = await CompUser.findById(employeeRef).populate("managerRef");
  if (!employee?.managerRef) return null;
  return employee.managerRef;
}

async function getManagerForExternalId(employeeExternalId) {
  const employee = await CompUser.findOne({ externalId: employeeExternalId }).populate(
    "managerRef",
  );
  if (!employee?.managerRef) return null;
  return employee.managerRef;
}

async function getReportsFor(managerRef) {
  return CompUser.find({ managerRef }).populate("managerRef").sort({ name: 1 });
}

async function getReportsForExternalId(managerExternalId) {
  const manager = await CompUser.findOne({ externalId: managerExternalId });
  if (!manager) return [];
  return getReportsFor(manager._id);
}

/** Org graph is persisted on employee-code / SSO provision via orgSync. */
async function syncFromExternal(_payload) {
  throw new Error(
    "Bulk org sync is not used. Users and teams are upserted on sign-in.",
  );
}

module.exports = {
  serializeUser,
  canSubmitSelfScores,
  getManagerFor,
  getManagerForExternalId,
  getReportsFor,
  getReportsForExternalId,
  syncFromExternal,
};
