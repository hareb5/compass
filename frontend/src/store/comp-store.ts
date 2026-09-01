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
import { USE_API } from '#/lib/config'
import { setDemoUserId } from '#/lib/api'
import {
  fetchAdminAssessments,
  fetchDemoAccounts,
  fetchMe,
  fetchMyAssessments,
  resetAdminData,
  submitManagerScores as apiSubmitManagerScores,
  submitSelfScores as apiSubmitSelfScores,
  type AdminAssessmentRow,
} from '#/lib/comp-api'

type CompState = {
  useApi: boolean
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

export const useCompStore = create<CompState>()(
  persist(
    (set, get) => ({
      useApi: USE_API,
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
        if (!USE_API) return
        try {
          const { accounts } = await fetchDemoAccounts()
          set({ demoAccounts: accounts })
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load demo accounts.',
          })
        }
      },

      restoreSession: async () => {
        if (!USE_API) return
        const demoUserId =
          typeof window !== 'undefined'
            ? sessionStorage.getItem('comptool-demo-user-id')
            : null
        if (!demoUserId) return

        set({ isLoading: true, error: null })
        try {
          setDemoUserId(demoUserId)
          const me = await fetchMe()
          const reports = me.reports ?? []
          const next: Partial<CompState> = {
            currentUser: me,
            reports,
            usersById: indexUsers([me, ...reports]),
            isLoading: false,
          }

          if (me.role === 'admin') {
            const admin = await fetchAdminAssessments()
            Object.assign(next, applyAdminRows(admin.assessments))
          } else {
            const mine = await fetchMyAssessments()
            if (me.role === 'employee') {
              next.assessments = mine.assessment ? [mine.assessment] : []
            } else if (me.role === 'manager') {
              next.assessments = mine.assessments ?? []
              next.reports = mine.reports ?? reports
              next.usersById = indexUsers([
                me,
                ...(mine.reports ?? reports),
              ])
            }
          }

          set(next)
        } catch (error) {
          setDemoUserId(null)
          set({
            currentUser: null,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to restore session.',
          })
        }
      },

      signInAs: async (userId) => {
        if (!USE_API) {
          const user = getMockUserById(userId)
          if (!user) return
          const reports =
            user.role === 'manager' ? getEmployeesForManager(userId) : []
          set({
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
          const reports = me.reports ?? []

          const next: Partial<CompState> = {
            currentUser: me,
            reports,
            usersById: indexUsers([me, ...reports]),
            isLoading: false,
          }

          if (me.role === 'admin') {
            const admin = await fetchAdminAssessments()
            Object.assign(next, applyAdminRows(admin.assessments))
          } else {
            const mine = await fetchMyAssessments()
            if (me.role === 'employee') {
              next.assessments = mine.assessment ? [mine.assessment] : []
            } else if (me.role === 'manager') {
              next.assessments = mine.assessments ?? []
              next.reports = mine.reports ?? reports
              next.usersById = indexUsers([
                me,
                ...(mine.reports ?? reports),
              ])
            }
          }

          set(next)
        } catch (error) {
          setDemoUserId(null)
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : 'Failed to sign in.',
          })
        }
      },

      signOut: () => {
        setDemoUserId(null)
        set({
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
        const { currentUser, useApi } = get()
        if (!currentUser || currentUser.id !== employeeId) return false

        if (!useApi) {
          const { assessments } = get()
          const next = assessments.map((record) => {
            if (record.employeeId !== employeeId) return record
            return {
              ...record,
              employeeScores: cloneScores(scores),
              employeeSubmittedAt: new Date().toISOString(),
            }
          })
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
        const { currentUser, useApi } = get()
        if (!currentUser || currentUser.id !== managerId) return false

        if (!useApi) {
          const { assessments } = get()
          const next = assessments.map((record) => {
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
          : {
              currentUser: state.currentUser,
              assessments: state.assessments,
              hasHydrated: state.hasHydrated,
            },
      onRehydrateStorage: () => async (state) => {
        state?.setHasHydrated(true)
        if (USE_API) {
          await state?.loadDemoAccounts()
          await state?.restoreSession()
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
