const express = require("express");
const orgApi = require("../config/orgApi");
const azureAuth = require("../config/azureAuth");
const {
  establishSessionFromEmployeeCode,
} = require("../services/orgDirectory");
const { signSessionToken, tryVerifySessionToken } = require("../services/sessionToken");
const {
  extractEmployeeCode,
  verifyBearerToken,
} = require("../middleware/authMicrosoft");
const { sendError } = require("../utils/httpError");

const router = express.Router();
const MAX_EMPLOYEE_CODE_LENGTH = 32;

function readBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

router.get("/sso-debug", async (req, res) => {
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({
      message: "Authorization Bearer token is required.",
    });
  }

  try {
    const sessionAuth = await tryVerifySessionToken(token);
    if (sessionAuth) {
      const dump = {
        source: "session",
        claimKeys: Object.keys(sessionAuth.claims || {}).sort(),
        claims: sessionAuth.claims,
        extracted: {
          email: sessionAuth.email,
          name: sessionAuth.name,
          employeeCode: sessionAuth.employeeCode,
        },
      };
      console.log("[SSO debug]", JSON.stringify(dump, null, 2));
      return res.json(dump);
    }

    if (!azureAuth.isConfigured) {
      return res.status(401).json({
        message: "Microsoft SSO is not configured on the server.",
      });
    }

    const microsoftAuth = await verifyBearerToken(token);
    const dump = {
      source: "microsoft",
      claimKeys: Object.keys(microsoftAuth.claims || {}).sort(),
      claims: microsoftAuth.claims,
      extracted: {
        oid: microsoftAuth.oid,
        email: microsoftAuth.email,
        name: microsoftAuth.name,
        employeeCode: extractEmployeeCode(microsoftAuth.claims),
      },
    };
    console.log("[SSO debug]", JSON.stringify(dump, null, 2));
    return res.json(dump);
  } catch (error) {
    return res.status(401).json({
      message: error.message || "Invalid or expired token.",
    });
  }
});

router.post("/employee-code", async (req, res) => {
  if (!orgApi.isConfigured) {
    return res.status(503).json({
      message: "Org directory is not configured on the server.",
    });
  }

  const employeeCode =
    typeof req.body?.employeeCode === "string" ? req.body.employeeCode.trim() : "";

  if (!employeeCode) {
    return res.status(400).json({ message: "Employee code is required." });
  }

  if (employeeCode.length > MAX_EMPLOYEE_CODE_LENGTH) {
    return res.status(400).json({ message: "Employee code is invalid." });
  }

  try {
    const identity = await establishSessionFromEmployeeCode(employeeCode);
    const accessToken = await signSessionToken({
      employeeCode: identity.user.id,
      email: identity.user.email,
      name: identity.user.name,
      role: identity.user.role,
    });
    return res.json({
      ...identity,
      accessToken,
    });
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) {
      return sendError(res, 500, "Failed to look up employee code.", error);
    }
    return res.status(status).json({ message: error.message });
  }
});

module.exports = router;
