const CompUser = require("../models/CompUser");

function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.externalId,
    name: user.name,
    email: user.email,
    title: user.title,
    department: user.department,
    role: user.role,
    reportsTo: user.managerRef?.externalId ?? undefined,
  };
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
  return CompUser.find({ managerRef }).sort({ name: 1 });
}

async function getReportsForExternalId(managerExternalId) {
  const manager = await CompUser.findOne({ externalId: managerExternalId });
  if (!manager) return [];
  return getReportsFor(manager._id);
}

/** Stub for future external line-manager API sync. */
async function syncFromExternal(_payload) {
  throw new Error("External org sync is not implemented yet.");
}

module.exports = {
  serializeUser,
  getManagerFor,
  getManagerForExternalId,
  getReportsFor,
  getReportsForExternalId,
  syncFromExternal,
};
