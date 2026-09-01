const dotenv = require("dotenv");

dotenv.config();

if (!globalThis.crypto) {
  const { webcrypto } = require("node:crypto");
  globalThis.crypto = webcrypto;
}

const app = require("./app");
const connectDB = require("./config/db");
const { seedDatabase } = require("./config/seed");
const azureAuth = require("./config/azureAuth");

const PORT = process.env.PORT || 5020;

async function startServer() {
  try {
    await connectDB();
    await seedDatabase();

    if (azureAuth.authDisabled) {
      console.warn(
        "[Auth] AUTH_DISABLED=true — demo mode via X-Demo-User-Id header.",
      );
    } else if (!azureAuth.isConfigured) {
      console.warn(
        "[Auth] AZURE_TENANT_ID and AZURE_CLIENT_ID required for SSO.",
      );
    } else {
      console.log("[Auth] Microsoft JWT verification configured.");
    }

    app.listen(PORT, () => {
      console.log(`SOBHA COMPASS API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
