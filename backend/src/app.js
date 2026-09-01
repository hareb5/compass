const express = require("express");
const cors = require("cors");

const compRoutes = require("./routes/compRoutes");

const FRONTEND_ORIGIN =
  process.env.CORS_ORIGIN?.trim() || "http://localhost:3020";

const app = express();

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Demo-User-Id"],
  }),
);
app.use(express.json());

app.use((req, _res, next) => {
  console.log(
    `[API] ${req.method} ${req.originalUrl} at ${new Date().toISOString()}`,
  );
  next();
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", compRoutes);

module.exports = app;
