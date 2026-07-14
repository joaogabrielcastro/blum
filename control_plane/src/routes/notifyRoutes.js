const express = require("express");
const { requireAdmin } = require("../middleware/adminAuth");
const {
  isTelegramConfigured,
  getTelegramConfig,
  sendTelegramTestMessage,
} = require("../services/telegramNotify");

const router = express.Router();

router.use(requireAdmin);

router.get("/telegram", (req, res) => {
  const cfg = getTelegramConfig();
  res.json({
    configured: isTelegramConfigured(),
    publicUrl: cfg.publicUrl,
    chatIdSet: Boolean(cfg.chatId),
  });
});

router.post("/telegram/test", async (req, res, next) => {
  try {
    const result = await sendTelegramTestMessage();
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
