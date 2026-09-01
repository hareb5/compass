export const USE_API =
  import.meta.env.VITE_USE_API === 'true' ||
  import.meta.env.VITE_USE_API === '1'

export const DEMO_USER_KEY = 'comptool-demo-user-id'

/** Session key for emp-code / future SSO sign-in via org directory. */
export const ORG_EMPLOYEE_CODE_KEY = 'compass-org-employee-code'

export const ORG_API_URL = import.meta.env.VITE_URL_API?.trim() ?? ''
export const ORG_API_KEY = import.meta.env.VITE_API_KEY?.trim() ?? ''

export const HAS_ORG_API = Boolean(ORG_API_URL)
