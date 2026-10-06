import { useEffect, useState, type FormEvent } from 'react'
import { AuthHeroPanel } from '#/components/AuthHeroPanel'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { SHOW_DEMO, USE_API } from '#/lib/config'
import { getDemoAccounts, type Role } from '#/lib/mock-data'
import {
  formatMsalError,
  isMsalConfigured,
  loginWithMicrosoft,
} from '#/lib/msal-auth'
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
  const signInWithEmployeeCode = useCompStore((s) => s.signInWithEmployeeCode)
  const demoAccounts = useCompStore((s) => s.demoAccounts)
  const isLoading = useCompStore((s) => s.isLoading)
  const error = useCompStore((s) => s.error)
  const loadDemoAccounts = useCompStore((s) => s.loadDemoAccounts)

  const [employeeCode, setEmployeeCode] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthRedirecting, setIsAuthRedirecting] = useState(false)

  const accounts = USE_API ? demoAccounts : getDemoAccounts()
  const microsoftEnabled = USE_API && isMsalConfigured()
  const busy = isLoading || isAuthRedirecting
  const displayError = authError || error

  useEffect(() => {
    if (USE_API && SHOW_DEMO) {
      void loadDemoAccounts()
    }
  }, [loadDemoAccounts])

  const handleEmployeeCodeSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (honeypot.trim()) return
    setAuthError(null)
    void signInWithEmployeeCode(employeeCode)
  }

  const handleMicrosoftLogin = async () => {
    setAuthError(null)
    if (!isMsalConfigured()) {
      setAuthError(
        'Microsoft SSO is not configured. Set VITE_MSAL_CLIENT_ID and VITE_MSAL_TENANT_ID, then restart the frontend.',
      )
      return
    }

    setIsAuthRedirecting(true)
    try {
      await loginWithMicrosoft()
    } catch (loginError) {
      setAuthError(formatMsalError(loginError))
      setIsAuthRedirecting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-white lg:grid lg:grid-cols-[1.15fr_0.85fr]">
      <AuthHeroPanel title="Competency mapping and skill assessment system" />

      <section className="flex items-center justify-center bg-white px-5 py-10 sm:px-8 lg:min-h-[calc(100vh-72px)] lg:px-12 xl:px-16">
        <div className="w-full max-w-lg">
          <img
            src="/logo-sobha.png"
            alt="SOBHA COMPASS"
            className="mx-auto mb-4 h-20 w-20 object-contain"
          />
          <div className="text-center">
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              SOBHA COMPASS
            </p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Competency mapping and skill assessment system
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {microsoftEnabled
                ? 'Sign in with Microsoft to continue.'
                : 'Enter your employee code to continue.'}
            </p>
          </div>

          {displayError ? (
            <p
              className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {displayError}
            </p>
          ) : null}

          {microsoftEnabled ? (
            <Button
              className="mt-8 flex w-full items-center justify-center gap-3"
              size="lg"
              disabled={busy}
              onClick={() => void handleMicrosoftLogin()}
            >
              <img
                src="/microsoft.png"
                alt=""
                className="h-5 w-5 object-contain"
                aria-hidden
              />
              {isLoading
                ? 'Completing sign in…'
                : isAuthRedirecting
                  ? 'Redirecting to Microsoft…'
                  : 'Sign in with Microsoft Single Sign-On'}
            </Button>
          ) : USE_API ? (
            <p className="mt-8 text-sm text-muted-foreground">
              Microsoft SSO is not configured. Set VITE_MSAL_CLIENT_ID and
              VITE_MSAL_TENANT_ID, then restart the frontend.
            </p>
          ) : null}

          <form className="relative mt-8 space-y-3" onSubmit={handleEmployeeCodeSubmit}>
            {microsoftEnabled ? (
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  or employee code
                </p>
                <div className="h-px flex-1 bg-border" />
              </div>
            ) : null}
            <div hidden aria-hidden="true">
              <label htmlFor="company-website">Company website</label>
              <input
                id="company-website"
                name="companyWebsite"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-code">Employee code</Label>
              <Input
                id="employee-code"
                name="employeeCode"
                value={employeeCode}
                onChange={(event) => setEmployeeCode(event.target.value)}
                placeholder="e.g. E12345"
                autoComplete="username"
                inputMode="text"
                maxLength={64}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                If this code is an L1 manager for others, you score that team.
                Otherwise you only rate yourself.
              </p>
            </div>
            <Button
              type="submit"
              className="w-full min-h-11"
              size="lg"
              disabled={busy || !employeeCode.trim()}
            >
              {isLoading && !isAuthRedirecting
                ? 'Checking directory…'
                : 'Continue'}
            </Button>
          </form>

          {SHOW_DEMO ? (
            <>
              <div className="mt-8 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Demo accounts
                </p>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="mt-4 space-y-3">
                {accounts.map((account) => {
                  const meta = ROLE_META[account.role]
                  const Icon = meta.icon
                  return (
                    <button
                      key={account.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void signInAs(account.id)}
                      className="flex min-h-11 w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-accent/40 disabled:opacity-60"
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
            </>
          ) : null}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Manager and employee scores stay private from each other. Admin sees
            everything.
          </p>
        </div>
      </section>
    </div>
  )
}
