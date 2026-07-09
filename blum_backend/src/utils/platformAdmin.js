function parsePlatformAdminEmails() {
  return (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isPlatformAdminEmail(username) {
  const email = String(username || "").trim().toLowerCase();
  if (!email) return false;
  return parsePlatformAdminEmails().includes(email);
}

function resolvePlatformAdminFlag(user) {
  if (!user) return false;
  if (user.is_platform_admin || user.isPlatformAdmin) return true;
  return isPlatformAdminEmail(user.username);
}

module.exports = {
  parsePlatformAdminEmails,
  isPlatformAdminEmail,
  resolvePlatformAdminFlag,
};
