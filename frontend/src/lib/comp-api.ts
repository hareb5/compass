import { apiFetch } from '#/lib/api'
import type { ScoreMap } from '#/lib/competencies'
import type { AssessmentRecord, MockUser } from '#/lib/mock-data'

export type MeResponse = MockUser & {
  reports?: MockUser[]
}

export type AdminAssessmentRow = AssessmentRecord & {
  employee?: MockUser
  manager?: MockUser
  employeeAvg?: number | null
  managerAvg?: number | null
  finalScore?: number | null
}

export function fetchDemoAccounts() {
  return apiFetch<{ accounts: MockUser[] }>('/api/demo/accounts')
}

export function fetchMe() {
  return apiFetch<MeResponse>('/api/me')
}

export function fetchMyAssessments() {
  return apiFetch<{
    assessment?: AssessmentRecord | null
    assessments?: AssessmentRecord[]
    reports?: MockUser[]
  }>('/api/assessments/mine')
}

export function fetchAdminAssessments() {
  return apiFetch<{ assessments: AdminAssessmentRow[] }>(
    '/api/admin/assessments',
  )
}

export function submitSelfScores(employeeId: string, scores: ScoreMap) {
  return apiFetch<{ assessment: AssessmentRecord }>(
    `/api/assessments/${employeeId}/self`,
    {
      method: 'POST',
      body: JSON.stringify({ scores }),
    },
  )
}

export function submitManagerScores(employeeId: string, scores: ScoreMap) {
  return apiFetch<{ assessment: AssessmentRecord }>(
    `/api/assessments/${employeeId}/manager`,
    {
      method: 'POST',
      body: JSON.stringify({ scores }),
    },
  )
}

export function resetAdminData() {
  return apiFetch<{ message: string }>('/api/admin/reset', {
    method: 'POST',
  })
}
