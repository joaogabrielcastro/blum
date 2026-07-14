const {
  getTelegramConfig,
  isTelegramConfigured,
} = require("./telegramNotify");

describe("telegramNotify config", () => {
  const keys = [
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "TELEGRAM_NOTIFY",
    "CONTROL_PLANE_PUBLIC_URL",
  ];
  const snapshot = {};

  beforeEach(() => {
    for (const k of keys) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  test("desligado sem token/chat", () => {
    expect(isTelegramConfigured()).toBe(false);
  });

  test("ligado com token e chat", () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:ABC";
    process.env.TELEGRAM_CHAT_ID = "999";
    expect(isTelegramConfigured()).toBe(true);
    expect(getTelegramConfig().publicUrl).toContain("http");
  });

  test("TELEGRAM_NOTIFY=false desliga", () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:ABC";
    process.env.TELEGRAM_CHAT_ID = "999";
    process.env.TELEGRAM_NOTIFY = "false";
    expect(isTelegramConfigured()).toBe(false);
  });
});
