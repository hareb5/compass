const express = require("express");
const orgApi = require("../config/orgApi");
const azureAuth = require("../config/azureAuth");
const { isAdminEmail } = require("../config/adminAccess");
const {
  establishSessionFromEmployeeCode,
} = require("../services/orgDirectory");
const { signSessionToken } = require("../services/sessionToken");
const { verifyBearerToken } = require("../middleware/authMicrosoft");
const { sendError } = require("../utils/httpError");

const router = express.Router();
const MAX_EMPLOYEE_CODE_LENGTH = 64;

function readBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
}

function readEmployeeCode(req) {
  return typeof req.body?.employeeCode === "string"
    ? req.body.employeeCode.trim()
    : "";
}

/** Prefer whichever Microsoft email claim is listed in ADMIN_EMAILS. */
function pickVerifiedEmail(microsoftAuth) {
  const claims = microsoftAuth.claims || {};
  const candidates = [
    claims.preferred_username,
    claims.email,
    claims.upn,
    claims.unique_name,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim().toLowerCase());

  return candidates.find(isAdminEmail) || microsoftAuth.email;
}

async function respondWithSession(res, employeeCode, emailOverride) {
  try {
    const identity = await establishSessionFromEmployeeCode(employeeCode);
    const accessToken = await signSessionToken({
      employeeCode: identity.user.id,
      email: emailOverride || identity.user.email,
      name: identity.user.name,
      role: identity.user.role,
    });
    return res.json({ ...identity, accessToken });
  } catch (error) {
    const status = error.status || 500;
    console.error("[Org] Employee-code lookup failed:", error.message);
    if (status === 500) {
      return sendError(res, 500, "Failed to look up employee code.", error);
    }
    return res.status(status).json({ message: error.message });
  }
}

function validateEmployeeCode(req, res) {
  const employeeCode = readEmployeeCode(req);
  if (!employeeCode) {
    res.status(400).json({ message: "Employee code is required." });
    return null;
  }
  if (employeeCode.length > MAX_EMPLOYEE_CODE_LENGTH) {
    res.status(400).json({ message: "Employee code is invalid." });
    return null;
  }
  return employeeCode;
}

router.post("/employee-code", async (req, res) => {
  if (!orgApi.isConfigured) {
    return res.status(503).json({
      message: "Org directory is not configured on the server.",
    });
  }

  const employeeCode = validateEmployeeCode(req, res);
  if (!employeeCode) return undefined;

  return respondWithSession(res, employeeCode);
});

/**
 * Microsoft sign-in: the ID token is verified here, so the email used for
 * ADMIN_EMAILS comes from Microsoft and cannot be forged by the browser.
 */
router.post("/microsoft", async (req, res) => {
  if (!azureAuth.isConfigured) {
    return res.status(503).json({
      message: "Microsoft sign-in is not configured on the server.",
    });
  }
  if (!orgApi.isConfigured) {
    return res.status(503).json({
      message: "Org directory is not configured on the server.",
    });
  }

  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({
      message: "Authorization Bearer token is required.",
    });
  }

  let microsoftAuth;
  try {
    microsoftAuth = await verifyBearerToken(token);
  } catch (error) {
    return res.status(401).json({
      message: error.message || "Invalid or expired token.",
    });
  }

  const employeeCode = validateEmployeeCode(req, res);
  if (!employeeCode) return undefined;

  return respondWithSession(res, employeeCode, pickVerifiedEmail(microsoftAuth));
});

module.exports = router;
