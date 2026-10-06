interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_API?: string
  readonly VITE_SHOW_DEMO?: string
  /** Public site origin for Open Graph / canonical URLs (https://compass.example.com). */
  readonly VITE_APP_URL?: string
  readonly VITE_MSAL_CLIENT_ID?: string
  readonly VITE_MSAL_TENANT_ID?: string
  readonly VITE_MSAL_REDIRECT_URI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
