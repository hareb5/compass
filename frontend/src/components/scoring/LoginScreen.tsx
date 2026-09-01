import { useEffect } from 'react'
import { AuthHeroPanel } from '#/components/AuthHeroPanel'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { getDemoAccounts, type Role } from '#/lib/mock-data'
import { USE_API } from '#/lib/config'
import { useCompStore } from '#/store/comp-store'
import { Shield, User, Users } from 'lucide-react'

const ROLE_META: Record<
  Role,
  { label: string; hint: string; icon: typeof User }
> = {
  admin: {
    label: 'Admin',
    hint: 'See all scores and weighted results',
    icon: Shield,
  },
  manager: {
    label: 'Manager',
    hint: 'Score your team (60% weight)',
    icon: Users,
  },
  employee: {
    label: 'Employee',
    hint: 'Score yourself (40% weight)',
    icon: User,
  },
}

export function LoginScreen() {
  const signInAs = useCompStore((s) => s.signInAs)
  const demoAccounts = useCompStore((s) => s.demoAccounts)
  const isLoading = useCompStore((s) => s.isLoading)
  const error = useCompStore((s) => s.error)
  const loadDemoAccounts = useCompStore((s) => s.loadDemoAccounts)

  const accounts = USE_API ? demoAccounts : getDemoAccounts()

  useEffect(() => {
    if (USE_API) {
      void loadDemoAccounts()
    }
  }, [loadDemoAccounts])

  return (
    <div className="min-h-[calc(100vh-72px)] bg-white lg:grid lg:grid-cols-[1.15fr_0.85fr]">
      <AuthHeroPanel title="Competency mapping and skill assessment system" />

      <section className="flex items-center justify-center bg-white px-5 py-10 sm:px-8 lg:min-h-[calc(100vh-72px)] lg:px-12 xl:px-16">
        <div className="w-full max-w-lg">
          <img
            src="/logo-sobha.png"
            alt="xp COMPASS"
            className="mx-auto mb-4 h-20 w-20 object-contain"
          />
          <div className="text-center">
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              xp COMPASS
            </p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Competency mapping and skill assessment system
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {USE_API
                ? 'Demo sign-in — pick an account. Backend API with mock auth.'
                : 'Mock sign-in — pick a demo account. No backend connected.'}
            </p>
          </div>

          {error ? (
            <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-8 space-y-3">
            {accounts.map((account) => {
              const meta = ROLE_META[account.role]
              const Icon = meta.icon
              return (
                <button
                  key={account.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void signInAs(account.id)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-accent/40 disabled:opacity-60"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {account.name}
                      </p>
                      <Badge variant="secondary">{meta.label}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {account.title} · {account.department}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {meta.hint}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Manager and employee scores stay private from each other. Admin sees
            everything.
          </p>

          <Button className="mt-4 w-full" size="lg" disabled>
            Microsoft SSO (coming later)
          </Button>
        </div>
      </section>
    </div>
  )
}
