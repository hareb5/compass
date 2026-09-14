const express = require("express");
const orgApi = require("../config/orgApi");
const {
  establishSessionFromEmployeeCode,
} = require("../services/orgDirectory");
const { signSessionToken } = require("../services/sessionToken");
const { sendError } = require("../utils/httpError");

const router = express.Router();
const MAX_EMPLOYEE_CODE_LENGTH = 32;

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
