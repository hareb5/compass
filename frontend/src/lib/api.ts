import {
  DEMO_USER_KEY,
  SSO_ACCESS_TOKEN_KEY,
} from '#/lib/config'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function getDemoUserId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(DEMO_USER_KEY)
}

export function setDemoUserId(userId: string | null) {
  if (typeof window === 'undefined') return
  if (userId) {
    sessionStorage.setItem(DEMO_USER_KEY, userId)
  } else {
    sessionStorage.removeItem(DEMO_USER_KEY)
  }
}

export function getSsoAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(SSO_ACCESS_TOKEN_KEY)
}

export function setSsoAccessToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) {
    sessionStorage.setItem(SSO_ACCESS_TOKEN_KEY, token)
  } else {
    sessionStorage.removeItem(SSO_ACCESS_TOKEN_KEY)
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const ssoToken = getSsoAccessToken()
  if (ssoToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${ssoToken}`)
  }

  const demoUserId = getDemoUserId()
  if (demoUserId) {
    headers.set('X-Demo-User-Id', demoUserId)
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }

  return payload as T
}
