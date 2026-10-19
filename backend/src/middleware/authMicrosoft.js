const azureAuth = require("../config/azureAuth");
const { tryVerifySessionToken } = require("../services/sessionToken");

let joseModulePromise;

function loadJose() {
  if (!joseModulePromise) {
    joseModulePromise = import("jose");
  }
  return joseModulePromise;
}

const jwksByTenant = new Map();

async function getJwksForTenant(tenantId) {
  const { createRemoteJWKSet } = await loadJose();
  if (!tenantId) return null;
  if (!jwksByTenant.has(tenantId)) {
    const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
    jwksByTenant.set(tenantId, createRemoteJWKSet(new URL(jwksUri)));
  }
  return jwksByTenant.get(tenantId);
}

function getIssuersForTenant(tenantId) {
  return [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://login.microsoftonline.com/${tenantId}/`,
    `https://sts.windows.net/${tenantId}/`,
  ];
}

function audienceMatches(payload, clientId) {
  const aud = payload.aud;
  if (typeof aud === "string") return aud === clientId;
  if (Array.isArray(aud)) return aud.includes(clientId);
  return false;
}

function extractEmail(payload) {
  const raw =
    payload.preferred_username ||
    payload.email ||
    payload.upn ||
    payload.unique_name ||
    "";
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function extractName(payload) {
  const raw = payload.name || payload.given_name || "";
  return typeof raw === "string" ? raw.trim() : "";
}

function readClaimString(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function extractEmployeeCode(payload) {
  if (!payload || typeof payload !== "object") return "";
  return (
    readClaimString(payload.employeeId) ||
    readClaimString(payload.employeeid) ||
    readClaimString(payload.employee_id) ||
    readClaimString(payload.employeeCode) ||
    readClaimString(payload.extension_EmployeeID) ||
    readClaimString(payload.extension_employeeid)
  );
}

async function verifyBearerToken(token) {
  const { jwtVerify, decodeJwt } = await loadJose();
  const clientId = azureAuth.clientId;

  let unverified;
  try {
    unverified = decodeJwt(token);
  } catch {
    throw new Error("Invalid or expired sign-in. Sign in again.");
  }

  const tokenTenantId =
    typeof unverified.tid === "string" && unverified.tid.trim()
      ? unverified.tid.trim()
      : azureAuth.tenantId;

  if (!tokenTenantId) {
    throw new Error("Invalid or expired sign-in. Sign in again.");
  }

  if (azureAuth.tenantId && tokenTenantId !== azureAuth.tenantId) {
    throw new Error("Invalid or expired sign-in. Sign in again.");
  }

  const keySet = await getJwksForTenant(tokenTenantId);
  if (!keySet) {
    throw new Error(
      "Microsoft sign-in is temporarily unavailable. Try again shortly.",
    );
  }

  const verifyOptions = {
    issuer: getIssuersForTenant(tokenTenantId),
    clockTolerance: "60s",
  };

  let payload;
  try {
    ({ payload } = await jwtVerify(token, keySet, {
      ...verifyOptions,
      audience: clientId,
    }));
  } catch {
    ({ payload } = await jwtVerify(token, keySet, verifyOptions));
    const azp = typeof payload.azp === "string" ? payload.azp : "";
    if (!audienceMatches(payload, clientId) && azp !== clientId) {
      throw new Error("Invalid or expired sign-in. Sign in again.");
    }
  }

  const email = extractEmail(payload);
  if (!email) {
    throw new Error(
      "Your Microsoft account has no email. Sign in with a work account.",
    );
  }
  return {
    oid: typeof payload.oid === "string" ? payload.oid : "",
    email,
    name: extractName(payload),
    claims: payload,
  };
}

function readBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

async function requireMicrosoftAuth(req, res, next) {
  if (azureAuth.authDisabled) {
    const token = readBearerToken(req);
    if (token) {
      try {
        const sessionAuth = await tryVerifySessionToken(token);
        if (sessionAuth) {
          req.auth = { ...sessionAuth, bypassed: true };
          return next();
        }
      } catch {
        // Fall through to demo impersonation.
      }
    }

    req.auth = {
      oid: "",
      email: "",
      name: "",
      employeeCode: "",
      source: "demo",
      bypassed: true,
    };
    return next();
  }

  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({
      message: "Sign in again.",
    });
  }

  try {
    const sessionAuth = await tryVerifySessionToken(token);
    if (sessionAuth) {
      req.auth = sessionAuth;
      return next();
    }

    if (!azureAuth.isConfigured) {
      return res.status(401).json({
        message: "Invalid or expired session. Sign in again.",
      });
    }

    const microsoftAuth = await verifyBearerToken(token);
    req.auth = {
      ...microsoftAuth,
      employeeCode: extractEmployeeCode(microsoftAuth.claims),
      source: "microsoft",
      bypassed: false,
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      message: error.message || "Invalid or expired sign-in. Sign in again.",
    });
  }
}

module.exports = {
  requireMicrosoftAuth,
  verifyBearerToken,
  extractEmployeeCode,
};
