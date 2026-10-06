import { Outlet, createRootRoute } from '@tanstack/react-router'
import Header from '../components/Header'
import { NotFound } from '../components/NotFound'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}
