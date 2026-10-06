import {
  acquireMicrosoftTokens,
  getActiveMicrosoftAccount,
} from '#/lib/msal-auth'
import { getSsoAccessToken } from '#/lib/api'

const GRAPH_SELECT =
  'id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,officeLocation,employeeId,employeeType,mailNickname,onPremisesSamAccountName,onPremisesUserPrincipalName,onPremisesDomainName,onPremisesExtensionAttributes,businessPhones,mobilePhone,preferredLanguage'

export type SsoDebugDump = {
  capturedAt: string
  likelyEmployeeFields: Record<string, unknown>
  msalAccount: {
    username?: string
    name?: string
    localAccountId?: string
    homeAccountId?: string
    tenantId?: string
    environment?: string
    idTokenClaims: Record<string, unknown>
  } | null
  graphMe: unknown
  backendTokenClaims: unknown
  backendClaimKeys: unknown
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function errorDump(error: unknown) {
  if (error instanceof Error) {
    return { error: error.message }
  }
  return { error: String(error) }
}

async function fetchGraphMe(accessToken: string | null) {
  if (!accessToken) {
    return { error: 'No Microsoft Graph access token. User.Read may be missing.' }
  }

  const urls = [
    `https://graph.microsoft.com/v1.0/me?$select=${encodeURIComponent(GRAPH_SELECT)}`,
    'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,employeeId,mailNickname,onPremisesSamAccountName,onPremisesExtensionAttributes',
    'https://graph.microsoft.com/v1.0/me',
  ]

  let lastError: unknown = null
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const payload = await response.json().catch(() => null)
      if (response.ok) {
        return payload
      }
      lastError = {
        status: response.status,
        payload,
      }
    } catch (error) {
      lastError = errorDump(error)
    }
  }

  return lastError
}

async function fetchBackendClaims(idToken: string | null) {
  if (!idToken) {
    return { error: 'No Microsoft ID token available.' }
  }

  try {
    const response = await fetch('/api/session/sso-debug', {
      headers: { Authorization: `Bearer ${idToken}` },
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        error:
          payload && typeof payload === 'object' && 'message' in payload
            ? String(payload.message)
            : `Backend inspect failed (${response.status})`,
        payload,
      }
    }
    return payload
  } catch (error) {
    return errorDump(error)
  }
}

export async function collectSsoDebugDump(): Promise<SsoDebugDump> {
  const account = await getActiveMicrosoftAccount()
  const tokens = await acquireMicrosoftTokens(getSsoAccessToken())
  const [graphMe, backendTokenClaims] = await Promise.all([
    fetchGraphMe(tokens.accessToken),
    fetchBackendClaims(tokens.idToken),
  ])

  const idTokenClaims = asRecord(account?.idTokenClaims)
  const graphRecord = asRecord(graphMe)
  const backendClaims = asRecord(asRecord(backendTokenClaims).claims)

  return {
    capturedAt: new Date().toISOString(),
    likelyEmployeeFields: {
      graph_employeeId: graphRecord.employeeId ?? null,
      graph_mailNickname: graphRecord.mailNickname ?? null,
      graph_onPremisesSamAccountName:
        graphRecord.onPremisesSamAccountName ?? null,
      graph_onPremisesExtensionAttributes:
        graphRecord.onPremisesExtensionAttributes ?? null,
      idToken_employeeid:
        idTokenClaims.employeeid ??
        idTokenClaims.employeeId ??
        idTokenClaims.employee_id ??
        idTokenClaims.employeeCode ??
        null,
      backend_extracted_employeeCode:
        asRecord(asRecord(backendTokenClaims).extracted).employeeCode ?? null,
      idToken_preferred_username: idTokenClaims.preferred_username ?? null,
      idToken_upn: idTokenClaims.upn ?? null,
      idToken_email: idTokenClaims.email ?? null,
      graph_mail: graphRecord.mail ?? null,
      graph_userPrincipalName: graphRecord.userPrincipalName ?? null,
    },
    msalAccount: account
      ? {
          username: account.username,
          name: account.name,
          localAccountId: account.localAccountId,
          homeAccountId: account.homeAccountId,
          tenantId: account.tenantId,
          environment: account.environment,
          idTokenClaims,
        }
      : null,
    graphMe,
    backendTokenClaims,
    backendClaimKeys: Array.isArray(asRecord(backendTokenClaims).claimKeys)
      ? asRecord(backendTokenClaims).claimKeys
      : Object.keys(backendClaims).sort(),
  }
}

export function formatSsoDebugDump(dump: SsoDebugDump) {
  return JSON.stringify(dump, null, 2)
}
