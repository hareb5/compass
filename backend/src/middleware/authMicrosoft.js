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

function extractEmployeeCode(payload) {
  if (!payload || typeof payload !== "object") return "";
  const raw =
    payload.employeeid ||
    payload.employee_id ||
    payload.employeeCode ||
    payload.extension_EmployeeID ||
    payload.extension_employeeid ||
    "";
  return typeof raw === "string" ? raw.trim() : "";
}

function isEmailDomainAllowed(email) {
  if (azureAuth.allowedEmailDomains.length === 0) return true;
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return false;
  const domain = email.slice(atIndex + 1);
  return azureAuth.allowedEmailDomains.includes(domain);
}

async function verifyBearerToken(token) {
  const { jwtVerify, decodeJwt } = await loadJose();
  const clientId = azureAuth.clientId;

  let unverified;
  try {
    unverified = decodeJwt(token);
  } catch {
    throw new Error("Malformed token.");
  }

  const tokenTenantId =
    typeof unverified.tid === "string" && unverified.tid.trim()
      ? unverified.tid.trim()
      : azureAuth.tenantId;

  if (!tokenTenantId) {
    throw new Error("Token is missing tenant id (tid).");
  }

  if (azureAuth.tenantId && tokenTenantId !== azureAuth.tenantId) {
    throw new Error("Token tenant does not match AZURE_TENANT_ID.");
  }

  const keySet = await getJwksForTenant(tokenTenantId);
  if (!keySet) {
    throw new Error("Could not load Microsoft signing keys.");
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
      throw new Error("Token audience mismatch.");
    }
  }

  const email = extractEmail(payload);
  if (!email) {
    throw new Error("Token does not contain a user email.");
  }
  if (!isEmailDomainAllowed(email)) {
    throw new Error("Email domain is not allowed.");
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
      message: "Authorization Bearer token is required.",
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
      message: error.message || "Invalid or expired token.",
    });
  }
}

module.exports = {
  requireMicrosoftAuth,
  verifyBearerToken,
  extractEmployeeCode,
};
