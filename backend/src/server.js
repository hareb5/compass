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
      console.log(
        "[Auth] Microsoft SSO keys are optional until MSAL is wired. Employee-code sessions are active.",
      );
    } else {
      console.log(
        "[Auth] Microsoft JWT verification configured. Employee-code sessions still work until MSAL is added.",
      );
    }

    if (orgApi.isConfigured) {
      console.log("[Org] Employee-code directory lookup configured.");
    } else {
      console.warn(
        "[Org] Set ORG_API_URL (and ORG_API_KEY) for employee-code sign-in.",
      );
    }

    if (!process.env.SESSION_SECRET?.trim() && process.env.AUTH_DISABLED !== "true") {
      if (process.env.NODE_ENV === "production" && !azureAuth.clientId) {
        console.warn(
          "[Auth] Set SESSION_SECRET (or AZURE_CLIENT_ID) so employee-code sessions can be signed.",
        );
      } else if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[Auth] SESSION_SECRET is unset — using the development session secret.",
        );
      }
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
