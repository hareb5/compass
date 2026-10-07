import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminDashboard } from '#/components/admin/AdminDashboard'
import { hasAdminAccess } from '#/lib/mock-data'
import { useCompStore } from '#/store/comp-store'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    const user = useCompStore.getState().currentUser
    if (!hasAdminAccess(user)) {
      throw redirect({ to: '/' })
    }
  },
  component: AdminPage,
})

function AdminPage() {
  return <AdminDashboard />
}
