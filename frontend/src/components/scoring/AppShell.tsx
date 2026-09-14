import { useEffect } from 'react'
import { AdminDashboard } from '#/components/admin/AdminDashboard'
import { EmployeeScoringScreen } from '#/components/scoring/EmployeeScoringScreen'
import { LoginScreen } from '#/components/scoring/LoginScreen'
import { ManagerScoringScreen } from '#/components/scoring/ManagerScoringScreen'
import { useCompStore } from '#/store/comp-store'

export function AppShell() {
  const currentUser = useCompStore((s) => s.currentUser)
  const hasHydrated = useCompStore((s) => s.hasHydrated)

  useEffect(() => {
    if (hasHydrated) return
    const timeoutId = window.setTimeout(() => {
      if (!useCompStore.getState().hasHydrated) {
        useCompStore.getState().setHasHydrated(true)
      }
    }, 2500)
    return () => window.clearTimeout(timeoutId)
  }, [hasHydrated])

  if (!hasHydrated) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-white text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!currentUser) {
    return <LoginScreen />
  }

  switch (currentUser.role) {
    case 'admin':
      return <AdminDashboard />
    case 'manager':
      return <ManagerScoringScreen />
    case 'employee':
      return <EmployeeScoringScreen />
    default: {
      const _exhaustive: never = currentUser.role
      throw new Error(`Unhandled role: ${_exhaustive}`)
    }
  }
}
