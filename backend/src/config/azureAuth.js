function readConfig() {
  const tenantId = process.env.AZURE_TENANT_ID?.trim() ?? "";
  const clientId = process.env.AZURE_CLIENT_ID?.trim() ?? "";
  const authDisabled = process.env.AUTH_DISABLED === "true";
  const isConfigured = Boolean(tenantId && clientId);

  return {
    tenantId,
    clientId,
    authDisabled,
    isConfigured,
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
