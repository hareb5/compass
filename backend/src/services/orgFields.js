function normalizeCode(value) {
  return String(value ?? "").trim();
}

function placeholderEmail(code) {
  const safe = normalizeCode(code)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
  return `${safe || "unknown"}@org.local`;
}

function isPlaceholderEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase()
    .endsWith("@org.local");
}

function pickField(row, keys) {
  if (!row || typeof row !== "object") return "";
  const entries = Object.entries(row);
  for (const key of keys) {
    const direct = row[key];
    if (direct != null && String(direct).trim()) {
      return String(direct).trim();
    }
    const match = entries.find(
      ([entryKey]) => entryKey.toLowerCase() === key.toLowerCase(),
    );
    if (match && match[1] != null && String(match[1]).trim()) {
      return String(match[1]).trim();
    }
  }
  return "";
}

function pickEmail(row) {
  return pickField(row, [
    "EMAIL",
    "EMAIL_ID",
    "EMPLOYEE_EMAIL",
    "WORK_EMAIL",
    "COMPANY_EMAIL",
    "OFFICIAL_EMAIL",
    "Email",
    "email",
  ]).toLowerCase();
}

function pickTitle(row) {
  return pickField(row, [
    "DESIGNATION",
    "TITLE",
    "JOB_TITLE",
    "POSITION",
    "JOBTITLE",
  ]);
}

function pickDepartment(row) {
  return pickField(row, [
    "DEPARTMENT",
    "DEPT_NAME",
    "DEPT",
    "DIVISION",
    "UNIT",
  ]);
}

function isActiveEmployee(row) {
  const status = normalizeCode(row?.EmpStatus || row?.EMP_STATUS || row?.STATUS);
  if (!status) return true;
  return status.toLowerCase() === "active";
}

module.exports = {
  normalizeCode,
  placeholderEmail,
  isPlaceholderEmail,
  pickField,
  pickEmail,
  pickTitle,
  pickDepartment,
  isActiveEmployee,
};
