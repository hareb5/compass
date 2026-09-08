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
const orgApi = require("./config/orgApi");

const PORT = process.env.PORT || 5020;

async function startServer() {
  try {
    await connectDB();
    await seedDatabase();

    if (azureAuth.authDisabled) {
      console.warn(
        "[Auth] AUTH_DISABLED=true — demo impersonation via X-Demo-User-Id is enabled.",
      );
      if (process.env.NODE_ENV === "production") {
        console.warn(
          "[Auth] Do not launch with AUTH_DISABLED=true. Turn it off before SSO or go-live.",
        );
      }
    } else if (!azureAuth.isConfigured) {
      console.warn(
        "[Auth] SSO is off. Set AZURE_TENANT_ID and AZURE_CLIENT_ID, keep AUTH_DISABLED unset, then send a Microsoft Bearer token from the frontend.",
      );
    } else {
      console.log("[Auth] Microsoft JWT verification configured.");
    }

    if (orgApi.isConfigured) {
      console.log("[Org] Employee-code directory lookup configured.");
    } else {
      console.warn(
        "[Org] Set ORG_API_URL (and ORG_API_KEY) for employee-code sign-in.",
      );
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
