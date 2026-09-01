import type { AssessmentRecord, MockUser, Role } from '#/lib/mock-data'

/** Raw row from the HR / org employees API. */
export type OrgEmployee = {
  EMPLOYEE_CODE: string
  EMPLOYEE_NAME: string
  L1_MANAGER_CODE: string
  L1_MANAGER_NAME: string
  EmpStatus?: string
  [key: string]: unknown
}

export type OrgIdentity = {
  user: MockUser
  reports: MockUser[]
  assessments: AssessmentRecord[]
}

function normalizeCode(value: unknown): string {
  return String(value ?? '').trim()
}

function isActiveEmployee(row: OrgEmployee): boolean {
  return normalizeCode(row.EmpStatus).toLowerCase() === 'active'
}

function toPerson(
  code: string,
  name: string,
  role: Role,
  reportsTo?: string,
): MockUser {
  return {
    id: code,
    name: name || code,
    email: `${code.toLowerCase()}@org.local`,
    title: role === 'manager' ? 'Manager' : 'Employee',
    department: '',
    role,
    ...(reportsTo ? { reportsTo } : {}),
  }
}

/**
 * Resolve role from an employee code against the org directory.
 * - Appears as anyone's L1_MANAGER_CODE (active reports) → manager
 * - Otherwise → employee (self-score only)
 *
 * Same entry point SSO will call once it provides the employee code.
 */
export function resolveOrgIdentity(
  employees: OrgEmployee[],
  employeeCode: string,
): OrgIdentity {
  const code = normalizeCode(employeeCode)
  if (!code) {
    throw new Error('Enter an employee code.')
  }

  const selfRow = employees.find(
    (row) => normalizeCode(row.EMPLOYEE_CODE) === code,
  )

  // Managers only see Active reports; Inactive are hidden from the team list.
  const reportRows = employees.filter(
    (row) =>
      normalizeCode(row.L1_MANAGER_CODE) === code && isActiveEmployee(row),
  )

  if (reportRows.length > 0) {
    const managerName =
      normalizeCode(selfRow?.EMPLOYEE_NAME) ||
      normalizeCode(reportRows[0]?.L1_MANAGER_NAME) ||
      code
    const user = toPerson(code, managerName, 'manager')
    const reports = reportRows.map((row) =>
      toPerson(
        normalizeCode(row.EMPLOYEE_CODE),
        normalizeCode(row.EMPLOYEE_NAME),
        'employee',
        code,
      ),
    )
    const assessments: AssessmentRecord[] = reports.map((report) => ({
      employeeId: report.id,
      managerId: code,
      employeeScores: null,
      managerScores: null,
      employeeSubmittedAt: null,
      managerSubmittedAt: null,
    }))
    return { user, reports, assessments }
  }

  if (!selfRow) {
    throw new Error(`Employee code "${code}" was not found in the directory.`)
  }

  const managerCode = normalizeCode(selfRow.L1_MANAGER_CODE)
  const user = toPerson(
    code,
    normalizeCode(selfRow.EMPLOYEE_NAME),
    'employee',
    managerCode || undefined,
  )
  const assessments: AssessmentRecord[] = [
    {
      employeeId: code,
      managerId: managerCode,
      employeeScores: null,
      managerScores: null,
      employeeSubmittedAt: null,
      managerSubmittedAt: null,
    },
  ]
  return { user, reports: [], assessments }
}

function parseEmployeesPayload(payload: unknown): OrgEmployee[] {
  if (Array.isArray(payload)) {
    return payload as OrgEmployee[]
  }
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { employees?: unknown }).employees)
  ) {
    return (payload as { employees: OrgEmployee[] }).employees
  }
  throw new Error('Org API response missing an "employees" array.')
}

/**
 * Fetch org employees. Prefer same-origin `/org-api/employees` (Vite proxy
 * attaches the Bearer token). Falls back to direct VITE_URL_API if set.
 */
export async function fetchOrgEmployees(): Promise<OrgEmployee[]> {
  const directUrl = import.meta.env.VITE_URL_API?.trim()
  const apiKey = import.meta.env.VITE_API_KEY?.trim()

  const tryProxy = async () => {
    const response = await fetch('/org-api/employees')
    if (!response.ok) {
      throw new Error(`Org API failed (${response.status})`)
    }
    return parseEmployeesPayload(await response.json())
  }

  const tryDirect = async () => {
    if (!directUrl) {
      throw new Error(
        'VITE_URL_API is not set. Add it to frontend/.env and restart Vite.',
      )
    }
    const headers = new Headers()
    if (apiKey) {
      headers.set('Authorization', `Bearer ${apiKey}`)
    }
    const response = await fetch(directUrl, { headers })
    if (!response.ok) {
      throw new Error(`Org API failed (${response.status})`)
    }
    return parseEmployeesPayload(await response.json())
  }

  try {
    return await tryProxy()
  } catch {
    return tryDirect()
  }
}

export async function establishSessionFromEmployeeCode(
  employeeCode: string,
): Promise<OrgIdentity> {
  const employees = await fetchOrgEmployees()
  return resolveOrgIdentity(employees, employeeCode)
}
