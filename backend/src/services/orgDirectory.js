const orgApi = require("../config/orgApi");

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedEmployees = null;
let cachedAt = 0;
let inflight = null;

function normalizeCode(value) {
  return String(value ?? "").trim();
}

function isActiveEmployee(row) {
  return normalizeCode(row.EmpStatus).toLowerCase() === "active";
}

function toPerson(code, name, role, reportsTo) {
  const person = {
    id: code,
    name: name || code,
    email: `${code.toLowerCase()}@org.local`,
    title: role === "manager" ? "Manager" : "Employee",
    department: "",
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
    const user = toPerson(code, managerName, "manager");
    const reports = reportRows.map((row) =>
      toPerson(
        normalizeCode(row.EMPLOYEE_CODE),
        normalizeCode(row.EMPLOYEE_NAME),
        "employee",
        code,
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

async function establishSessionFromEmployeeCode(employeeCode) {
  const employees = await getEmployees();
  return resolveOrgIdentity(employees, employeeCode);
}

module.exports = {
  establishSessionFromEmployeeCode,
  resolveOrgIdentity,
};
