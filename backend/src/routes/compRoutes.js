const express = require("express");
const CompUser = require("../models/CompUser");
const CompAssessment = require("../models/CompAssessment");
const azureAuth = require("../config/azureAuth");
const { USER_ROLES } = require("../constants/userRoles");
const { validateScoresPayload } = require("../constants/competencies");
const { resetToSeed, SEED_USERS } = require("../config/seed");
const {
  requireMicrosoftAuth,
} = require("../middleware/authMicrosoft");
const {
  resolveCompUser,
  requireAdmin,
  attachMePayload,
} = require("../middleware/resolveCompUser");
const {
  getReportsFor,
  serializeUser,
} = require("../services/orgHierarchy");
const {
  serializeAssessmentBase,
  stripForEmployee,
  stripForManager,
  serializeAdminAssessment,
} = require("../services/assessmentService");
const { sendError } = require("../utils/httpError");

const router = express.Router();

router.use(requireMicrosoftAuth);

router.get("/demo/accounts", async (_req, res) => {
  if (!azureAuth.authDisabled) {
    return res.status(404).json({ message: "Not found." });
  }

  try {
    const users = await CompUser.find({
      externalId: { $in: SEED_USERS.map((u) => u.externalId) },
    }).sort({ role: 1, name: 1 });

    return res.json({
      accounts: users.map(serializeUser),
    });
  } catch (error) {
    return sendError(res, 500, "Failed to load demo accounts.", error);
  }
});

router.get("/me", resolveCompUser, async (req, res) => {
  try {
    const user = req.compUser;
    let reports = [];

    if (user.role === USER_ROLES.MANAGER) {
      reports = await getReportsFor(user._id);
    }

    return res.json(attachMePayload(user, reports));
  } catch (error) {
    return sendError(res, 500, "Failed to load profile.", error);
  }
});

router.get("/assessments/mine", resolveCompUser, async (req, res) => {
  try {
    const user = req.compUser;

    if (user.role === USER_ROLES.EMPLOYEE) {
      const assessment = await CompAssessment.findOne({
        employeeRef: user._id,
      });

      if (!assessment) {
        return res.json({ assessment: null });
      }

      const base = serializeAssessmentBase({
        ...assessment.toObject(),
        employeeRef: user,
        managerRef: await CompUser.findById(assessment.managerRef),
      });

      return res.json({
        assessment: stripForEmployee(base),
      });
    }

    if (user.role === USER_ROLES.MANAGER) {
      const reports = await getReportsFor(user._id);
      const reportIds = reports.map((report) => report._id);
      const assessments = await CompAssessment.find({
        employeeRef: { $in: reportIds },
        managerRef: user._id,
      }).populate("employeeRef");

      return res.json({
        reports: reports.map(serializeUser),
        assessments: assessments.map((assessment) =>
          stripForManager(
            serializeAssessmentBase({
              ...assessment.toObject(),
              employeeRef: assessment.employeeRef,
              managerRef: user,
            }),
          ),
        ),
      });
    }

    return res.status(403).json({
      message: "Only employees and managers can access assessments.",
    });
  } catch (error) {
    return sendError(res, 500, "Failed to load assessments.", error);
  }
});

router.post(
  "/assessments/:employeeId/self",
  resolveCompUser,
  async (req, res) => {
    try {
      const user = req.compUser;
      if (user.role !== USER_ROLES.EMPLOYEE) {
        return res.status(403).json({ message: "Employee access required." });
      }

      if (req.params.employeeId !== user.externalId) {
        return res.status(403).json({
          message: "You can only submit your own self scores.",
        });
      }

      const validation = validateScoresPayload(req.body?.scores);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const assessment = await CompAssessment.findOne({ employeeRef: user._id });
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found." });
      }

      if (assessment.employeeSubmittedAt) {
        return res.status(409).json({
          message: "Self scores were already submitted.",
        });
      }

      assessment.employeeScores = validation.scores;
      assessment.employeeSubmittedAt = new Date();
      await assessment.save();

      const base = serializeAssessmentBase({
        ...assessment.toObject(),
        employeeRef: user,
        managerRef: await CompUser.findById(assessment.managerRef),
      });

      return res.json({
        assessment: stripForEmployee(base),
      });
    } catch (error) {
      return sendError(res, 500, "Failed to submit self scores.", error);
    }
  },
);

router.post(
  "/assessments/:employeeId/manager",
  resolveCompUser,
  async (req, res) => {
    try {
      const user = req.compUser;
      if (user.role !== USER_ROLES.MANAGER) {
        return res.status(403).json({ message: "Manager access required." });
      }

      const employee = await CompUser.findOne({
        externalId: req.params.employeeId,
      });
      if (!employee) {
        return res.status(404).json({ message: "Employee not found." });
      }

      if (String(employee.managerRef) !== String(user._id)) {
        return res.status(403).json({
          message: "You can only score your direct reports.",
        });
      }

      const validation = validateScoresPayload(req.body?.scores);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const assessment = await CompAssessment.findOne({
        employeeRef: employee._id,
        managerRef: user._id,
      });
      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found." });
      }

      if (assessment.managerSubmittedAt) {
        return res.status(409).json({
          message: "Manager scores were already submitted for this employee.",
        });
      }

      assessment.managerScores = validation.scores;
      assessment.managerSubmittedAt = new Date();
      await assessment.save();

      const base = serializeAssessmentBase({
        ...assessment.toObject(),
        employeeRef: employee,
        managerRef: user,
      });

      return res.json({
        assessment: stripForManager(base),
      });
    } catch (error) {
      return sendError(res, 500, "Failed to submit manager scores.", error);
    }
  },
);

router.get(
  "/admin/assessments",
  resolveCompUser,
  requireAdmin,
  async (_req, res) => {
    try {
      const assessments = await CompAssessment.find({})
        .populate("employeeRef")
        .populate("managerRef");

      assessments.sort((a, b) =>
        (a.employeeRef?.name ?? "").localeCompare(b.employeeRef?.name ?? ""),
      );

      return res.json({
        assessments: assessments.map(serializeAdminAssessment),
      });
    } catch (error) {
      return sendError(res, 500, "Failed to load admin assessments.", error);
    }
  },
);

router.post(
  "/admin/reset",
  resolveCompUser,
  requireAdmin,
  async (_req, res) => {
    if (!azureAuth.authDisabled) {
      return res.status(403).json({
        message: "Reset is only allowed when AUTH_DISABLED=true.",
      });
    }

    try {
      await resetToSeed();
      return res.json({ message: "Database reset to seed data." });
    } catch (error) {
      return sendError(res, 500, "Failed to reset database.", error);
    }
  },
);

module.exports = router;
