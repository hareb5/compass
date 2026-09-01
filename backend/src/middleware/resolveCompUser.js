const azureAuth = require("../config/azureAuth");
const CompUser = require("../models/CompUser");
const { USER_ROLES } = require("../constants/userRoles");
const { serializeUser } = require("../services/orgHierarchy");

async function resolveCompUser(req, res, next) {
  try {
    let user;

    if (azureAuth.authDisabled) {
      const demoUserId = req.headers["x-demo-user-id"];
      if (typeof demoUserId !== "string" || !demoUserId.trim()) {
        return res.status(401).json({
          message: "X-Demo-User-Id header is required when AUTH_DISABLED=true.",
        });
      }

      user = await CompUser.findOne({ externalId: demoUserId.trim() }).populate(
        "managerRef",
      );
      if (!user) {
        return res.status(401).json({
          message: "Unknown demo user id.",
        });
      }
    } else {
      const email = req.auth?.email;
      if (!email) {
        return res.status(401).json({
          message: "Authenticated user email is required.",
        });
      }

      user = await CompUser.findOne({ email }).populate("managerRef");
      if (!user) {
        return res.status(403).json({
          message: "User is not registered in xp COMPASS.",
        });
      }
    }

    req.compUser = user;
    return next();
  } catch (error) {
    return res.status(500).json({
      message: "Failed to resolve user.",
      error: error.message,
    });
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
