import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminDashboard } from '#/components/admin/AdminDashboard'
import { useCompStore } from '#/store/comp-store'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    const user = useCompStore.getState().currentUser
    if (!user || user.role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: AdminPage,
})

function AdminPage() {
  return <AdminDashboard />
}
