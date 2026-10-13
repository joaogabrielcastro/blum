const COOKIE_NAME = "blum_refresh";
const MAX_AGE_MS =
  (parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "15", 10) || 15) *
  24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v2/auth",
    maxAge: MAX_AGE_MS,
  };
}

function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function clearRefreshCookie(res) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
}

function readRefreshCookie(req) {
  const raw = String(req.headers.cookie || "");
  for (const part of raw.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== COOKIE_NAME) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function attachRefreshToken(req, _res, next) {
  req.body = req.body || {};
  if (!req.body.refreshToken) req.body.refreshToken = readRefreshCookie(req);
  next();
}

module.exports = {
  COOKIE_NAME,
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshCookie,
  attachRefreshToken,
};
