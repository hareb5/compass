import type { CompetencyId, ScoreMap } from '#/lib/competencies'
import { emptyScores } from '#/lib/competencies'

export type Role = 'admin' | 'manager' | 'employee'

export type Person = {
  id: string
  name: string
  email: string
  title: string
  department: string
}

export type MockUser = Person & {
  role: Role
  /** For managers: employees they can score. For employees: unused. */
  reportsTo?: string
}

export type AssessmentRecord = {
  employeeId: string
  managerId: string
  employeeScores: ScoreMap | null
  managerScores: ScoreMap | null
  employeeSubmittedAt: string | null
  managerSubmittedAt: string | null
}

function scores(
  communication: number,
  collaboration: number,
  results: number,
  innovation: number,
  accountability: number,
): ScoreMap {
  return {
    communication,
    collaboration,
    results,
    innovation,
    accountability,
  }
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 'admin-1',
    name: 'Sara Al Hashimi',
    email: 'sara.admin@sobha.com',
    title: 'HR Admin',
    department: 'People & Culture',
    role: 'admin',
  },
  {
    id: 'mgr-1',
    name: 'Omar Khalid',
    email: 'omar.khalid@sobha.com',
    title: 'Engineering Manager',
    department: 'Technology',
    role: 'manager',
  },
  {
    id: 'mgr-2',
    name: 'Layla Mansour',
    email: 'layla.mansour@sobha.com',
    title: 'Operations Manager',
    department: 'Operations',
    role: 'manager',
  },
  {
    id: 'emp-1',
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@sobha.com',
    title: 'Software Engineer',
    department: 'Technology',
    role: 'employee',
    reportsTo: 'mgr-1',
  },
  {
    id: 'emp-2',
    name: 'Fatima Noor',
    email: 'fatima.noor@sobha.com',
    title: 'Frontend Engineer',
    department: 'Technology',
    role: 'employee',
    reportsTo: 'mgr-1',
  },
  {
    id: 'emp-3',
    name: 'Yousef Ali',
    email: 'yousef.ali@sobha.com',
    title: 'QA Engineer',
    department: 'Technology',
    role: 'employee',
    reportsTo: 'mgr-1',
  },
  {
    id: 'emp-4',
    name: 'Noura Saeed',
    email: 'noura.saeed@sobha.com',
    title: 'Operations Analyst',
    department: 'Operations',
    role: 'employee',
    reportsTo: 'mgr-2',
  },
  {
    id: 'emp-5',
    name: 'Karim Faris',
    email: 'karim.faris@sobha.com',
    title: 'Process Specialist',
    department: 'Operations',
    role: 'employee',
    reportsTo: 'mgr-2',
  },
]

export function createInitialAssessments(): AssessmentRecord[] {
  return [
    {
      employeeId: 'emp-1',
      managerId: 'mgr-1',
      employeeScores: scores(4, 4, 5, 3, 4),
      managerScores: scores(4, 5, 4, 4, 5),
      employeeSubmittedAt: '2026-07-10T09:00:00.000Z',
      managerSubmittedAt: '2026-07-11T11:30:00.000Z',
    },
    {
      employeeId: 'emp-2',
      managerId: 'mgr-1',
      employeeScores: scores(5, 4, 4, 5, 4),
      managerScores: null,
      employeeSubmittedAt: '2026-07-12T14:20:00.000Z',
      managerSubmittedAt: null,
    },
    {
      employeeId: 'emp-3',
      managerId: 'mgr-1',
      employeeScores: null,
      managerScores: scores(3, 4, 4, 3, 4),
      employeeSubmittedAt: null,
      managerSubmittedAt: '2026-07-13T08:15:00.000Z',
    },
    {
      employeeId: 'emp-4',
      managerId: 'mgr-2',
      employeeScores: scores(4, 5, 4, 4, 5),
      managerScores: scores(5, 4, 5, 4, 4),
      employeeSubmittedAt: '2026-07-09T10:00:00.000Z',
      managerSubmittedAt: '2026-07-10T16:45:00.000Z',
    },
    {
      employeeId: 'emp-5',
      managerId: 'mgr-2',
      employeeScores: null,
      managerScores: null,
      employeeSubmittedAt: null,
      managerSubmittedAt: null,
    },
  ]
}

export function getUserById(id: string): MockUser | undefined {
  return MOCK_USERS.find((user) => user.id === id)
}

export function getEmployeesForManager(managerId: string): MockUser[] {
  return MOCK_USERS.filter(
    (user) => user.role === 'employee' && user.reportsTo === managerId,
  )
}

export function getEmployees(): MockUser[] {
  return MOCK_USERS.filter((user) => user.role === 'employee')
}

export function getManagers(): MockUser[] {
  return MOCK_USERS.filter((user) => user.role === 'manager')
}

export function getDemoAccounts(): MockUser[] {
  return MOCK_USERS.filter((user) =>
    user.role === 'admin' || user.role === 'manager' || user.role === 'employee',
  )
}

export function cloneScores(scores: ScoreMap | null): ScoreMap {
  if (!scores) return emptyScores()
  const next = emptyScores()
  for (const key of Object.keys(next) as CompetencyId[]) {
    next[key] = scores[key]
  }
  return next
}
