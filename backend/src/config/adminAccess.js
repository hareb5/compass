function parseCsv(value) {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmployeeCode(code) {
  if (!code) return false;
  return parseCsv(process.env.ADMIN_EMPLOYEE_CODES).includes(
    String(code).trim().toLowerCase(),
  );
}

function isAdminEmail(email) {
  if (!email) return false;
  return parseCsv(process.env.ADMIN_EMAILS).includes(
    String(email).trim().toLowerCase(),
  );
}

module.exports = {
  isAdminEmployeeCode,
  isAdminEmail,
};
