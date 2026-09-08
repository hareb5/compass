export const USE_API =
  import.meta.env.VITE_USE_API === 'true' ||
  import.meta.env.VITE_USE_API === '1'

/** Show demo account buttons. Keep false for launch. */
export const SHOW_DEMO =
  import.meta.env.VITE_SHOW_DEMO === 'true' ||
  import.meta.env.VITE_SHOW_DEMO === '1'

export const APP_URL = (import.meta.env.VITE_APP_URL ?? '').trim().replace(/\/$/, '')

export const DEMO_USER_KEY = 'comptool-demo-user-id'

/** Session key for emp-code / future SSO sign-in via org directory. */
export const ORG_EMPLOYEE_CODE_KEY = 'compass-org-employee-code'

/** Populated by Microsoft SSO (MSAL) once that is wired. */
export const SSO_ACCESS_TOKEN_KEY = 'comptool-sso-access-token'
