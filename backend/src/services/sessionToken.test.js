process.env.SESSION_SECRET = "test-session-secret-value-32chars!";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  signSessionToken,
  tryVerifySessionToken,
} = require("./sessionToken");

describe("sessionToken", () => {
  it("signs and verifies an employee-code session", async () => {
    const token = await signSessionToken({
      employeeCode: "E100",
      email: "ahmed.hassan@sobha.com",
      name: "Ahmed Hassan",
      role: "employee",
    });

    const auth = await tryVerifySessionToken(token);
    assert.equal(auth.employeeCode, "E100");
    assert.equal(auth.email, "ahmed.hassan@sobha.com");
    assert.equal(auth.source, "session");
  });

  it("ignores tokens that are not compass sessions", async () => {
    const auth = await tryVerifySessionToken(
      "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.",
    );
    assert.equal(auth, null);
  });
});
