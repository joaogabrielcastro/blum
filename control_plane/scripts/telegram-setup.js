/**
 * Ajuda a configurar Telegram.
 *
 * Uso:
 *   node scripts/telegram-setup.js
 *   node scripts/telegram-setup.js SEU_TOKEN_AQUI
 *
 * 1) Cria/usa o bot token
 * 2) Lista updates recentes e mostra chat.id
 * 3) Opcionalmente grava no .env (sem sobrescrever outros valores)
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const envPath = path.join(__dirname, "..", ".env");

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer || "").trim());
    });
  });
}

async function api(token, method) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`);
  const body = await res.json();
  if (!body.ok) {
    throw new Error(body.description || `Telegram ${method} falhou`);
  }
  return body.result;
}

function upsertEnv(key, value) {
  let text = "";
  if (fs.existsSync(envPath)) {
    text = fs.readFileSync(envPath, "utf8");
  }
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) {
    text = text.replace(re, line);
  } else {
    text = `${text.replace(/\s*$/, "")}\n${line}\n`;
  }
  fs.writeFileSync(envPath, text, "utf8");
}

async function main() {
  console.log("");
  console.log("=== Setup Telegram — Control Plane ===");
  console.log("");
  console.log("Passo A — criar o bot (no celular):");
  console.log("  1. Abra o Telegram");
  console.log("  2. Busque: BotFather  (nome oficial, verificado)");
  console.log("  3. Toque Start / enviar /start");
  console.log("  4. Envie: /newbot");
  console.log("  5. Escolha um nome (ex: Blum Control)");
  console.log("  6. Escolha um username terminado em bot (ex: blum_control_bot)");
  console.log("  7. O BotFather devolve um token tipo: 123456789:AAH...");
  console.log("");

  let token = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN || "";
  if (!token) {
    token = await ask("Cole o token do BotFather aqui e Enter: ");
  }
  if (!token || !token.includes(":")) {
    console.error("Token inválido. Tem que parecer: 123456:AAH...");
    process.exit(1);
  }

  console.log("");
  console.log("Validando token...");
  const me = await api(token, "getMe");
  console.log(`OK — bot @${me.username} (${me.first_name})`);
  console.log("");
  console.log("Passo B — vincular o SEU chat:");
  console.log(`  1. No Telegram, busque: @${me.username}`);
  console.log("  2. Abra o chat com o bot");
  console.log("  3. Toque Start / envie: /start");
  console.log("  4. Volte aqui e pressione Enter");
  await ask("Depois de /start no bot, Enter para continuar... ");

  console.log("Buscando chat.id em getUpdates...");
  let updates = await api(token, "getUpdates");
  if (!updates.length) {
    console.log("Ainda sem mensagens. Envie /start de novo no bot e Enter.");
    await ask("Enter... ");
    updates = await api(token, "getUpdates");
  }

  const chats = new Map();
  for (const u of updates) {
    const msg = u.message || u.edited_message || u.my_chat_member;
    const chat = msg?.chat;
    if (chat?.id != null) {
      chats.set(String(chat.id), chat);
    }
  }

  if (!chats.size) {
    console.error("");
    console.error("Não achei nenhum chat.id.");
    console.error("Checklist:");
    console.error("  - token está certo?");
    console.error(`  - você abriu o bot certo (@${me.username})?`);
    console.error("  - enviou /start para esse bot?");
    process.exit(1);
  }

  console.log("");
  console.log("Chats encontrados:");
  for (const [id, chat] of chats) {
    const label =
      chat.username ||
      [chat.first_name, chat.last_name].filter(Boolean).join(" ") ||
      chat.title ||
      "chat";
    console.log(`  - ${id}  (${label} / type=${chat.type})`);
  }

  let chatId = [...chats.keys()][0];
  if (chats.size > 1) {
    const picked = await ask(`Qual chat.id usar? [default ${chatId}]: `);
    if (picked) chatId = picked;
  }

  console.log("");
  const save = await ask("Gravar no control_plane/.env? (s/N): ");
  if (String(save).toLowerCase() === "s") {
    upsertEnv("TELEGRAM_BOT_TOKEN", token);
    upsertEnv("TELEGRAM_CHAT_ID", chatId);
    upsertEnv("TELEGRAM_NOTIFY", "true");
    if (!fs.readFileSync(envPath, "utf8").includes("CONTROL_PLANE_PUBLIC_URL=")) {
      upsertEnv("CONTROL_PLANE_PUBLIC_URL", "http://localhost:3020");
    }
    console.log("Salvo em control_plane/.env");
  } else {
    console.log("");
    console.log("Cole manualmente no control_plane/.env:");
    console.log(`TELEGRAM_BOT_TOKEN=${token}`);
    console.log(`TELEGRAM_CHAT_ID=${chatId}`);
    console.log("TELEGRAM_NOTIFY=true");
  }

  console.log("");
  console.log("Enviando mensagem de teste...");
  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ Control Plane — Telegram OK. Você vai receber avisos de propostas aqui.",
      }),
    },
  );
  const body = await res.json();
  if (!body.ok) {
    console.error("Falha no teste:", body.description);
    process.exit(1);
  }
  console.log("Mensagem enviada! Olhe o Telegram no celular.");
  console.log("");
  console.log("Depois rode:");
  console.log("  docker compose up -d --build control-plane");
  console.log("");
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
