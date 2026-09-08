function isProduction() {
  return process.env.NODE_ENV === "production";
}

function sendError(res, status, message, error) {
  const payload = { message };
  if (!isProduction() && error?.message) {
    payload.error = error.message;
  }
  return res.status(status).json(payload);
}

module.exports = {
  isProduction,
  sendError,
};
