/**
 * Policy engine Blum — classifica paths do diff e define modo HITL.
 * Enforcement em código (não só no prompt).
 */

const TIER_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

const RULES = [
  {
    tier: "CRITICAL",
    mode: "propose_quarantine",
    patterns: [
      /(^|\/)\.env(\.|$)/i,
      /env\.production\.example$/i,
      /\/stripe\//i,
      /billingRoutes\.js$/i,
      /stripeWebhook/i,
      /authMiddleware\.js$/i,
      /authRoutes\.js$/i,
      /platformAdmin/i,
      /\/migrations\//i,
      /db\/migrate/i,
      /config\/env\.js$/i,
      /config\/stripe\.js$/i,
      /setup-stripe/i,
      /migrate_tenant/i,
      /STRIPE_LIVE/i,
    ],
  },
  {
    tier: "HIGH",
    mode: "propose_require_approve",
    patterns: [
      /subscriptionMiddleware/i,
      /planFeatureMiddleware/i,
      /config\/plans\.js$/i,
      /planFeatures\.js$/i,
      /subscriptionAccess\.js$/i,
      /tenantDbContext/i,
      /emailService\.js$/i,
      /docker-compose\.prod\.yml$/i,
      /Dockerfile/i,
    ],
  },
  {
    tier: "MEDIUM",
    mode: "propose_ci_gate",
    patterns: [
      /blum_backend\/src\/routes\//i,
      /blum_backend\/src\/controllers\//i,
      /blum_backend\/src\/services\//i,
      /useOfflineSync\.js$/i,
      /\/offline\//i,
      /services\/api\//i,
    ],
  },
];

function matchTier(path) {
  const p = String(path || "").replace(/\\/g, "/");
  for (const rule of RULES) {
    if (rule.patterns.some((re) => re.test(p))) {
      return { tier: rule.tier, mode: rule.mode };
    }
  }
  if (/\.(test|spec)\.(js|ts|jsx|tsx)$/i.test(p) || /\/e2e\//i.test(p)) {
    return { tier: "LOW", mode: "propose_fast_track" };
  }
  if (/blum_frontend\/src\/components\//i.test(p) && !/billing|admin|login/i.test(p)) {
    return { tier: "LOW", mode: "propose_fast_track" };
  }
  return { tier: "MEDIUM", mode: "propose_ci_gate" };
}

function classifyProposalFiles(files = []) {
  let maxTier = "LOW";
  let mode = "propose_fast_track";

  const classified = files.map((f) => {
    const path = f.path || f.file || "";
    const { tier, mode: fileMode } = matchTier(path);
    if (TIER_RANK[tier] > TIER_RANK[maxTier]) {
      maxTier = tier;
      mode = fileMode;
    }
    return {
      path,
      changeType: f.changeType || f.change_type || "modify",
      diffUnified: f.diffUnified || f.diff || f.diff_unified || "",
      riskTier: tier,
    };
  });

  // Quarentena automática por tamanho / secrets
  const totalLines = classified.reduce(
    (n, f) => n + String(f.diffUnified).split("\n").length,
    0,
  );
  const blob = classified.map((f) => f.diffUnified).join("\n");
  const secretHit = /sk_live|sk_test|whsec_|JWT_SECRET|DATABASE_URL|CURSOR_API_KEY/i.test(
    blob,
  );

  if (secretHit || classified.length > 8 || totalLines > 400) {
    maxTier = TIER_RANK.CRITICAL > TIER_RANK[maxTier] ? "CRITICAL" : maxTier;
    if (secretHit) maxTier = "CRITICAL";
    mode = "propose_quarantine";
  }

  const riskLevel =
    maxTier === "CRITICAL"
      ? "critical"
      : maxTier === "HIGH"
        ? "high"
        : maxTier === "LOW"
          ? "low"
          : "medium";

  return {
    files: classified,
    riskTier: maxTier,
    policyMode: mode,
    riskLevel,
    requiresHumanApproval: true, // Fase 4: sempre HITL
    quarantine: mode === "propose_quarantine",
  };
}

module.exports = {
  matchTier,
  classifyProposalFiles,
  RULES,
  TIER_RANK,
};
