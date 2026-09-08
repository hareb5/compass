const express = require("express");
const azureAuth = require("../config/azureAuth");
const orgApi = require("../config/orgApi");
const {
  establishSessionFromEmployeeCode,
} = require("../services/orgDirectory");
const { sendError } = require("../utils/httpError");

const router = express.Router();
const MAX_EMPLOYEE_CODE_LENGTH = 32;

router.post("/employee-code", async (req, res) => {
  if (!azureAuth.authDisabled && azureAuth.isConfigured) {
    return res.status(403).json({
      message: "Sign in with Microsoft SSO. Employee-code login is disabled.",
    });
  }

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
    return res.json(identity);
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) {
      return sendError(res, 500, "Failed to look up employee code.", error);
    }
    return res.status(status).json({ message: error.message });
  }
});

module.exports = router;
