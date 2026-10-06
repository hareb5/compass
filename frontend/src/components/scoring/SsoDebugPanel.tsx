import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { ScrollArea } from '#/components/ui/scroll-area'
import { formatSsoDebugDump, type SsoDebugDump } from '#/lib/sso-debug'

export function SsoDebugPanel({ dump }: { dump: SsoDebugDump }) {
  const [copied, setCopied] = useState(false)
  const text = formatSsoDebugDump(dump)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('[SSO debug] Copy failed', error)
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-950">
          SSO details (temporary)
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
          {copied ? 'Copied' : 'Copy JSON'}
        </Button>
      </div>
      <p className="mt-1 text-xs text-amber-900">
        Sign-in cannot map you to the org directory yet. Copy this JSON and send
        it so we can pick the employee-code field.
      </p>
      <ScrollArea className="mt-3 h-72 rounded-md border border-amber-200 bg-white">
        <pre className="whitespace-pre-wrap break-all p-3 text-xs text-foreground">
          {text}
        </pre>
      </ScrollArea>
    </div>
  )
}
