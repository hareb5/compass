const azureAuth = require("../config/azureAuth");
const orgApi = require("../config/orgApi");
const CompUser = require("../models/CompUser");
const { USER_ROLES } = require("../constants/userRoles");
const { serializeUser } = require("../services/orgHierarchy");
const { provisionCompUserFromAuth } = require("../services/orgDirectory");
const { isPlaceholderEmail } = require("../services/orgFields");
const { sendError } = require("../utils/httpError");

async function findRegisteredUser({ employeeCode, email }) {
  if (employeeCode) {
    const byCode = await CompUser.findOne({
      $or: [{ externalId: employeeCode }, { employeeCode }],
    }).populate("managerRef");
    if (byCode) return byCode;
  }

  if (email) {
    return CompUser.findOne({ email }).populate("managerRef");
  }

  return null;
}

async function resolveCompUser(req, res, next) {
  try {
    let user;

    if (azureAuth.authDisabled) {
      const demoUserId = req.headers["x-demo-user-id"];
      const fallbackCode = req.auth?.employeeCode;
      const lookupId =
        typeof demoUserId === "string" && demoUserId.trim()
          ? demoUserId.trim()
          : typeof fallbackCode === "string"
            ? fallbackCode.trim()
            : "";

      if (!lookupId) {
        return res.status(401).json({
          message: "X-Demo-User-Id header is required when AUTH_DISABLED=true.",
        });
      }

      user = await findRegisteredUser({
        employeeCode: lookupId,
        email: "",
      });
      if (!user && orgApi.isConfigured) {
        user = await provisionCompUserFromAuth({
          employeeCode: lookupId,
          email: "",
        });
        if (user) {
          user = await CompUser.findById(user._id).populate("managerRef");
        }
      }
      if (!user) {
        return res.status(401).json({
          message: "Unknown demo user id.",
        });
      }
    } else {
      const email = req.auth?.email || "";
      const employeeCode = req.auth?.employeeCode || "";

      if (!email && !employeeCode) {
        return res.status(401).json({
          message: "Authenticated user identity is required.",
        });
      }

      user = await findRegisteredUser({ employeeCode, email });

      if (!user && orgApi.isConfigured) {
        user = await provisionCompUserFromAuth({ employeeCode, email });
        if (user) {
          user = await CompUser.findById(user._id).populate("managerRef");
        }
      }

      if (!user) {
        return res.status(403).json({
          message: "User is not registered in SOBHA COMPASS.",
        });
      }

      if (
        req.auth?.source === "microsoft" &&
        email &&
        isPlaceholderEmail(user.email)
      ) {
        user.email = email;
        await user.save();
      }
    }

    req.compUser = user;
    return next();
  } catch (error) {
    if (error.status && error.status < 500) {
      return res.status(error.status).json({ message: error.message });
    }
    return sendError(res, 500, "Failed to resolve user.", error);
  }
}

async function requireAdmin(req, res, next) {
  if (req.compUser?.role !== USER_ROLES.ADMIN) {
    return res.status(403).json({
      message: "Admin access required.",
    });
  }
  return next();
}

async function requireManager(req, res, next) {
  if (req.compUser?.role !== USER_ROLES.MANAGER) {
    return res.status(403).json({
      message: "Manager access required.",
    });
  }
  return next();
}

async function requireEmployee(req, res, next) {
  if (req.compUser?.role !== USER_ROLES.EMPLOYEE) {
    return res.status(403).json({
      message: "Employee access required.",
    });
  }
  return next();
}

function attachMePayload(user, reports) {
  return {
    ...serializeUser(user),
    reports: reports.map(serializeUser),
  };
}

module.exports = {
  resolveCompUser,
  requireAdmin,
  requireManager,
  requireEmployee,
  attachMePayload,
};
