import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'

export function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-white px-5 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-primary">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This address does not exist in SOBHA COMPASS. Check the link or go
          back to the home page.
        </p>
        <Button asChild className="mt-8" size="lg">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </main>
  )
}
