interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_API?: string
  /** Full URL of the org employees API (JSON with `employees` array). */
  readonly VITE_URL_API?: string
  /** Bearer token for the org employees API. */
  readonly VITE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
