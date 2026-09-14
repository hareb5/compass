import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  cloneScores,
  createInitialAssessments,
  getEmployeesForManager,
  getUserById as getMockUserById,
  type AssessmentRecord,
  type MockUser,
} from '#/lib/mock-data'
import type { CompetencyId, ScoreMap } from '#/lib/competencies'
import { isCompleteScores } from '#/lib/competencies'
import { DEMO_USER_KEY, ORG_EMPLOYEE_CODE_KEY, SHOW_DEMO, USE_API } from '#/lib/config'
import { getSsoAccessToken, setDemoUserId, setSsoAccessToken } from '#/lib/api'
import {
  fetchAdminAssessments,
  fetchDemoAccounts,
  fetchMe,
  fetchMyAssessments,
  resetAdminData,
  submitManagerScores as apiSubmitManagerScores,
  submitSelfScores as apiSubmitSelfScores,
  type AdminAssessmentRow,
  type MeResponse,
} from '#/lib/comp-api'
import { establishSessionFromEmployeeCode } from '#/lib/org-directory'

type SessionKind = 'none' | 'mock' | 'api' | 'org'

type CompState = {
  useApi: boolean
  sessionKind: SessionKind
  currentUser: MockUser | null
  reports: MockUser[]
  usersById: Record<string, MockUser>
  assessments: AssessmentRecord[]
  adminRows: AdminAssessmentRow[]
  demoAccounts: MockUser[]
  isLoading: boolean
  error: string | null
  hasHydrated: boolean
  setHasHydrated: (value: boolean) => void
  loadDemoAccounts: () => Promise<void>
  restoreSession: () => Promise<void>
  signInAs: (userId: string) => Promise<void>
  /** Emp-code sign-in now; same path SSO will use once it yields a code. */
  signInWithEmployeeCode: (employeeCode: string) => Promise<void>
  signOut: () => void
  submitEmployeeScores: (
    employeeId: string,
    scores: ScoreMap,
  ) => Promise<boolean>
  submitManagerScores: (
    managerId: string,
    employeeId: string,
    scores: ScoreMap,
  ) => Promise<boolean>
  resetMockData: () => Promise<void>
  getAssessment: (employeeId: string) => AssessmentRecord | undefined
  getUser: (userId: string) => MockUser | undefined
}

function indexUsers(users: MockUser[]): Record<string, MockUser> {
  return Object.fromEntries(users.map((user) => [user.id, user]))
}

function applyAdminRows(rows: AdminAssessmentRow[]) {
  const assessments: AssessmentRecord[] = rows.map((row) => ({
    employeeId: row.employeeId,
    managerId: row.managerId,
    employeeScores: row.employeeScores,
    managerScores: row.managerScores,
    employeeSubmittedAt: row.employeeSubmittedAt,
    managerSubmittedAt: row.managerSubmittedAt,
  }))

  const users: MockUser[] = []
  for (const row of rows) {
    if (row.employee) users.push(row.employee)
    if (row.manager) users.push(row.manager)
  }

  return { assessments, usersById: indexUsers(users), adminRows: rows }
}

function getOrgEmployeeCode(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ORG_EMPLOYEE_CODE_KEY)
}

function setOrgEmployeeCode(code: string | null) {
  if (typeof window === 'undefined') return
  if (code) {
    sessionStorage.setItem(ORG_EMPLOYEE_CODE_KEY, code)
  } else {
    sessionStorage.removeItem(ORG_EMPLOYEE_CODE_KEY)
  }
}

function usesLocalScoring(sessionKind: SessionKind, useApi: boolean) {
  return sessionKind === 'mock' || !useApi
}

async function buildApiWorkspace(me: MeResponse): Promise<Partial<CompState>> {
  const reports = me.reports ?? []
  const next: Partial<CompState> = {
    sessionKind: 'api',
    currentUser: me,
    reports,
    usersById: indexUsers([me, ...reports]),
    isLoading: false,
    error: null,
  }

  switch (me.role) {
    case 'admin': {
      const admin = await fetchAdminAssessments()
      Object.assign(next, applyAdminRows(admin.assessments))
      break
    }
    case 'employee': {
      const mine = await fetchMyAssessments()
      next.assessments = mine.assessment ? [mine.assessment] : []
      break
    }
    case 'manager': {
      const mine = await fetchMyAssessments()
      next.assessments = mine.assessments ?? []
      next.reports = mine.reports ?? reports
      next.usersById = indexUsers([me, ...(mine.reports ?? reports)])
      break
    }
    default: {
      const _exhaustive: never = me.role
      throw new Error(`Unhandled role: ${_exhaustive}`)
    }
  }

  return next
}

export const useCompStore = create<CompState>()(
  persist(
    (set, get) => ({
      useApi: USE_API,
      sessionKind: 'none',
      currentUser: null,
      reports: [],
      usersById: {},
      assessments: USE_API ? [] : createInitialAssessments(),
      adminRows: [],
      demoAccounts: [],
      isLoading: false,
      error: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      loadDemoAccounts: async () => {
        if (!USE_API || !SHOW_DEMO) return
        try {
          const { accounts } = await fetchDemoAccounts()
          set({ demoAccounts: accounts })
        } catch {
          set({ demoAccounts: [] })
        }
      },

      restoreSession: async () => {
        if (USE_API) {
          const orgCode = getOrgEmployeeCode()
          const existingToken = getSsoAccessToken()
          const demoUserId =
            typeof window !== 'undefined'
              ? sessionStorage.getItem(DEMO_USER_KEY)
              : null

          if (!orgCode && !existingToken && !demoUserId) {
            return
          }

          set({ isLoading: true, error: null })
          try {
            if (orgCode) {
              const identity =
                await establishSessionFromEmployeeCode(orgCode)
              if (identity.accessToken) {
                setSsoAccessToken(identity.accessToken)
              }
              setDemoUserId(identity.user.id)
              setOrgEmployeeCode(identity.user.id)
            } else if (demoUserId) {
              setDemoUserId(demoUserId)
            }

            const me = await fetchMe()
            set(await buildApiWorkspace(me))
          } catch (error) {
            setDemoUserId(null)
            setSsoAccessToken(null)
            setOrgEmployeeCode(null)
            set({
              currentUser: null,
              sessionKind: 'none',
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to restore session.',
            })
          }
          return
        }

        const orgCode = getOrgEmployeeCode()
        if (!orgCode) return

        set({ isLoading: true, error: null })
        try {
          const identity = await establishSessionFromEmployeeCode(orgCode)
          const previous = get().assessments
          const previousByEmployee = Object.fromEntries(
            previous.map((record) => [record.employeeId, record]),
          )
          const assessments = identity.assessments.map(
            (record) => previousByEmployee[record.employeeId] ?? record,
          )
          set({
            sessionKind: 'org',
            currentUser: identity.user,
            reports: identity.reports,
            usersById: indexUsers([identity.user, ...identity.reports]),
            assessments,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          setOrgEmployeeCode(null)
          set({
            sessionKind: 'none',
            currentUser: null,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to restore org session.',
          })
        }
      },

      signInAs: async (userId) => {
        setOrgEmployeeCode(null)
        if (!USE_API) {
          const user = getMockUserById(userId)
          if (!user) return
          const reports =
            user.role === 'manager' ? getEmployeesForManager(userId) : []
          set({
            sessionKind: 'mock',
            currentUser: user,
            reports,
            usersById: indexUsers([user, ...reports]),
            error: null,
          })
          return
        }

        set({ isLoading: true, error: null })
        try {
          setDemoUserId(userId)
          const me = await fetchMe()
          set(await buildApiWorkspace(me))
        } catch (error) {
          setDemoUserId(null)
          set({
            isLoading: false,
            sessionKind: 'none',
            error:
              error instanceof Error ? error.message : 'Failed to sign in.',
          })
        }
      },

      signInWithEmployeeCode: async (employeeCode) => {
        set({ isLoading: true, error: null })
        try {
          const identity = await establishSessionFromEmployeeCode(employeeCode)
          setOrgEmployeeCode(identity.user.id)

          if (USE_API) {
            if (identity.accessToken) {
              setSsoAccessToken(identity.accessToken)
            }
            setDemoUserId(identity.user.id)
            const me = await fetchMe()
            set(await buildApiWorkspace(me))
            return
          }

          setDemoUserId(null)
          set({
            sessionKind: 'org',
            currentUser: identity.user,
            reports: identity.reports,
            usersById: indexUsers([identity.user, ...identity.reports]),
            assessments: identity.assessments,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          setOrgEmployeeCode(null)
          setSsoAccessToken(null)
          setDemoUserId(null)
          set({
            isLoading: false,
            sessionKind: 'none',
            error:
              error instanceof Error
                ? error.message
                : 'Failed to sign in with employee code.',
          })
        }
      },

      signOut: () => {
        setDemoUserId(null)
        setSsoAccessToken(null)
        setOrgEmployeeCode(null)
        set({
          sessionKind: 'none',
          currentUser: null,
          reports: [],
          usersById: {},
          assessments: USE_API ? [] : createInitialAssessments(),
          adminRows: [],
          error: null,
        })
      },

      submitEmployeeScores: async (employeeId, scores) => {
        if (!isCompleteScores(scores)) return false
        const { currentUser, useApi, sessionKind } = get()
        if (!currentUser || currentUser.id !== employeeId) return false

        if (usesLocalScoring(sessionKind, useApi)) {
          const { assessments } = get()
          const next = assessments.some(
            (record) => record.employeeId === employeeId,
          )
            ? assessments.map((record) => {
                if (record.employeeId !== employeeId) return record
                return {
                  ...record,
                  employeeScores: cloneScores(scores),
                  employeeSubmittedAt: new Date().toISOString(),
                }
              })
            : [
                ...assessments,
                {
                  employeeId,
                  managerId: currentUser.reportsTo ?? '',
                  employeeScores: cloneScores(scores),
                  managerScores: null,
                  employeeSubmittedAt: new Date().toISOString(),
                  managerSubmittedAt: null,
                },
              ]
          set({ assessments: next })
          return true
        }

        try {
          const { assessment } = await apiSubmitSelfScores(employeeId, scores)
          set((state) => ({
            assessments: state.assessments.some(
              (record) => record.employeeId === employeeId,
            )
              ? state.assessments.map((record) =>
                  record.employeeId === employeeId ? assessment : record,
                )
              : [...state.assessments, assessment],
            error: null,
          }))
          return true
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to submit self scores.',
          })
          return false
        }
      },

      submitManagerScores: async (managerId, employeeId, scores) => {
        if (!isCompleteScores(scores)) return false
        const { currentUser, useApi, sessionKind } = get()
        if (!currentUser || currentUser.id !== managerId) return false

        if (usesLocalScoring(sessionKind, useApi)) {
          const { assessments } = get()
          const next = assessments.some(
            (record) =>
              record.employeeId === employeeId &&
              record.managerId === managerId,
          )
            ? assessments.map((record) => {
                if (
                  record.employeeId !== employeeId ||
                  record.managerId !== managerId
                ) {
                  return record
                }
                return {
                  ...record,
                  managerScores: cloneScores(scores),
                  managerSubmittedAt: new Date().toISOString(),
                }
              })
            : [
                ...assessments,
                {
                  employeeId,
                  managerId,
                  employeeScores: null,
                  managerScores: cloneScores(scores),
                  employeeSubmittedAt: null,
                  managerSubmittedAt: new Date().toISOString(),
                },
              ]
          set({ assessments: next })
          return true
        }

        try {
          const { assessment } = await apiSubmitManagerScores(
            employeeId,
            scores,
          )
          set((state) => ({
            assessments: state.assessments.some(
              (record) => record.employeeId === employeeId,
            )
              ? state.assessments.map((record) =>
                  record.employeeId === employeeId ? assessment : record,
                )
              : [...state.assessments, assessment],
            error: null,
          }))
          return true
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to submit manager scores.',
          })
          return false
        }
      },

      resetMockData: async () => {
        if (get().sessionKind === 'org') {
          const code = getOrgEmployeeCode()
          if (!code) return
          try {
            const identity = await establishSessionFromEmployeeCode(code)
            set({
              assessments: identity.assessments,
              reports: identity.reports,
              usersById: indexUsers([identity.user, ...identity.reports]),
            })
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to reset org data.',
            })
          }
          return
        }

        if (get().useApi) {
          try {
            await resetAdminData()
            const admin = await fetchAdminAssessments()
            set(applyAdminRows(admin.assessments))
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to reset data.',
            })
          }
          return
        }

        set({ assessments: createInitialAssessments() })
      },

      getAssessment: (employeeId) =>
        get().assessments.find((record) => record.employeeId === employeeId),

      getUser: (userId) => {
        const fromStore = get().usersById[userId]
        if (fromStore) return fromStore
        return getMockUserById(userId)
      },
    }),
    {
      name: USE_API ? 'comptool-api-v1' : 'comptool-mock-v1',
      partialize: (state) =>
        USE_API
          ? { hasHydrated: state.hasHydrated }
          : state.sessionKind === 'org'
            ? {
                currentUser: state.currentUser,
                reports: state.reports,
                usersById: state.usersById,
                assessments: state.assessments,
                sessionKind: state.sessionKind,
                hasHydrated: state.hasHydrated,
              }
            : {
                currentUser: state.currentUser,
                assessments: state.assessments,
                hasHydrated: state.hasHydrated,
              },
      onRehydrateStorage: () => async (state) => {
        state?.setHasHydrated(true)
        await state?.restoreSession()
        if (USE_API && SHOW_DEMO) {
          await state?.loadDemoAccounts()
        }
      },
    },
  ),
)

export function setScoreValue(
  scores: ScoreMap,
  competencyId: CompetencyId,
  value: number,
): ScoreMap {
  return { ...scores, [competencyId]: value }
}
