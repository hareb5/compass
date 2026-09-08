import { Link, useRouterState } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { useCompStore } from '#/store/comp-store'
import { LogOut, RotateCcw } from 'lucide-react'

export default function Header() {
  const currentUser = useCompStore((s) => s.currentUser)
  const signOut = useCompStore((s) => s.signOut)
  const resetMockData = useCompStore((s) => s.resetMockData)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAdminRoute = pathname.startsWith('/admin')
  const isAdmin = currentUser?.role === 'admin'

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background px-4">
      <nav className="mx-auto flex h-[72px] w-full max-w-[1400px] items-center justify-between gap-3">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 font-semibold no-underline"
        >
          <img
            src="/logo-sobha.png"
            alt="SOBHA COMPASS"
            className="h-10 w-10 shrink-0 object-contain"
          />
          <span className="min-w-0">
            <span className="block text-lg font-semibold leading-tight text-primary sm:text-2xl">
              SOBHA COMPASS
            </span>
            <span className="hidden text-xs font-normal text-muted-foreground sm:block">
              Competency mapping & skill assessment
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {isAdmin ? (
            <>
              {!isAdminRoute ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin">Admin dashboard</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/">Scoring home</Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void resetMockData()}
                title="Reset assessment data"
              >
                <RotateCcw className="size-4 sm:mr-2" />
                <span className="hidden sm:inline">Reset data</span>
              </Button>
            </>
          ) : null}
          {currentUser ? (
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              <LogOut className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : null}
        </div>
      </nav>
    </header>
  )
}
