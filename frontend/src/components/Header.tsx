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
      <nav className="mx-auto flex h-[72px] w-full max-w-[1400px] items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-semibold no-underline">
          <img
            src="/logo-sobha.png"
            alt="xp COMPASS"
            className="h-10 w-10 object-contain"
          />
          <span>
            <span className="block text-xl font-semibold text-primary sm:text-2xl">
              xp COMPASS
            </span>
            <span className="block text-xs font-normal text-muted-foreground">
              {currentUser
                ? `${currentUser.name} · ${currentUser.role}`
                : 'Competency mapping & skill assessment'}
            </span>
          </span>
        </a>
        <div className="flex items-center gap-2">
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
