const SESSION_TYP = "compass-session";

let joseModulePromise;

function loadJose() {
  if (!joseModulePromise) {
    joseModulePromise = import("jose");
  }
  return joseModulePromise;
}

function readSecretString() {
  const configured =
    process.env.SESSION_SECRET?.trim() ||
    process.env.AZURE_CLIENT_ID?.trim() ||
    "";
  if (configured) {
    return configured.padEnd(32, "0");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is required in production when using employee-code sessions.",
    );
  }
  return "comptool-dev-session-secret-32ch";
}

function getSecretKey() {
  return new TextEncoder().encode(readSecretString());
}

async function signSessionToken({ employeeCode, email, name, role }) {
  const { SignJWT } = await loadJose();
  return new SignJWT({
    typ: SESSION_TYP,
    employeeCode,
    email: email || "",
    name: name || "",
    role: role || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(employeeCode)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecretKey());
}

async function tryVerifySessionToken(token) {
  const { decodeJwt, jwtVerify } = await loadJose();

  let unverified;
  try {
    unverified = decodeJwt(token);
  } catch {
    return null;
  }

  if (unverified.typ !== SESSION_TYP) {
    return null;
  }

  const { payload } = await jwtVerify(token, getSecretKey(), {
    clockTolerance: "60s",
  });

  const employeeCode =
    (typeof payload.employeeCode === "string" && payload.employeeCode.trim()) ||
    (typeof payload.sub === "string" ? payload.sub.trim() : "");

  return {
    oid: "",
    email: typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "",
    name: typeof payload.name === "string" ? payload.name.trim() : "",
    employeeCode,
    source: "session",
    bypassed: false,
    claims: payload,
  };
}

module.exports = {
  SESSION_TYP,
  signSessionToken,
  tryVerifySessionToken,
};
