function parseCsv(value) {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function readConfig() {
  const tenantId = process.env.AZURE_TENANT_ID?.trim() ?? "";
  const clientId = process.env.AZURE_CLIENT_ID?.trim() ?? "";
  const authDisabled = process.env.AUTH_DISABLED === "true";
  const allowedEmailDomains = parseCsv(process.env.AZURE_ALLOWED_EMAIL_DOMAINS);
  const isConfigured = Boolean(tenantId && clientId);

  return {
    tenantId,
    clientId,
    authDisabled,
    isConfigured,
    allowedEmailDomains,
  };
}

module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      return readConfig()[prop];
    },
  },
);
