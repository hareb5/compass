function readConfig() {
  const url =
    process.env.ORG_API_URL?.trim() || process.env.VITE_URL_API?.trim() || "";
  const apiKey =
    process.env.ORG_API_KEY?.trim() || process.env.VITE_API_KEY?.trim() || "";

  return {
    url,
    apiKey,
    isConfigured: Boolean(url),
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
