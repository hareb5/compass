const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const compRoutes = require("./routes/compRoutes");
const sessionRoutes = require("./routes/sessionRoutes");

function parseAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN?.trim() || "http://localhost:3020";
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

const allowedOrigins = new Set(parseAllowedOrigins());

const app = express();

if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts:
      process.env.NODE_ENV === "production"
        ? { maxAge: 15552000, includeSubDomains: true }
        : false,
  }),
);

app.use((req, res, next) => {
  if (process.env.REQUIRE_HTTPS !== "true") {
    return next();
  }

  const forwarded = req.headers["x-forwarded-proto"];
  const isHttps = req.secure || forwarded === "https";
  if (isHttps) {
    return next();
  }

  const host = req.headers.host;
  if (!host) {
    return res.status(400).json({ message: "HTTPS is required." });
  }

  return res.redirect(301, `https://${host}${req.originalUrl}`);
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Demo-User-Id"],
    maxAge: 600,
  }),
);

app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Try again later." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Try again later." },
});

app.use(generalLimiter);

app.use((req, _res, next) => {
  console.log(
    `[API] ${req.method} ${req.originalUrl} at ${new Date().toISOString()}`,
  );
  next();
});

app.use("/api/session", loginLimiter, sessionRoutes);
app.use("/api", compRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found." });
});

app.use((error, _req, res, _next) => {
  if (error?.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Origin is not allowed." });
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large." });
  }

  return res.status(500).json({ message: "Unexpected server error." });
});

module.exports = app;
