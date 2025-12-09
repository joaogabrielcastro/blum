// Script para criar usuários iniciais com senhas hashadas
// Execute: node blum_backend/migrations/create-users.js

require("dotenv").config();
const bcrypt = require("bcrypt");
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

const defaultUsers = [
  {
    username: "admin",
    password: "BlumAdmin2025!", // ALTERE ESTA SENHA EM PRODUÇÃO
    role: "admin",
    name: "Administrador",
  },
  {
    username: "siane",
    password: "Siane2025!", // ALTERE ESTA SENHA EM PRODUÇÃO
    role: "salesperson",
    name: "Siane",
  },
  {
    username: "eduardo",
    password: "Eduardo2025!", // ALTERE ESTA SENHA EM PRODUÇÃO
    role: "salesperson",
    name: "Eduardo",
  },
  {
    username: "vendedor",
    password: "Vendedor2025!", // ALTERE ESTA SENHA EM PRODUÇÃO
    role: "salesperson",
    name: "Vendedor",
  },
];

async function createUsers() {
  console.log("🔐 Criando usuários padrão...\n");

  try {
    for (const user of defaultUsers) {
      console.log(`📝 Processando usuário: ${user.username}`);

      // Verificar se usuário já existe
      const existing = await sql`
        SELECT id FROM users WHERE username = ${user.username}
      `;

      if (existing.length > 0) {
        console.log(`⚠️  Usuário ${user.username} já existe, pulando...\n`);
        continue;
      }

      // Hash da senha
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(user.password, saltRounds);

      // Inserir usuário
      await sql`
        INSERT INTO users (username, password_hash, role, name)
        VALUES (${user.username}, ${password_hash}, ${user.role}, ${user.name})
      `;

      console.log(`✅ Usuário ${user.username} criado com sucesso!`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Senha temporária: ${user.password}`);
      console.log(`   Role: ${user.role}\n`);
    }

    console.log("✨ Processo concluído!\n");
    console.log(
      "⚠️  IMPORTANTE: Altere todas as senhas após o primeiro login!\n"
    );

    // Listar usuários criados
    const allUsers = await sql`
      SELECT id, username, role, name, createdat 
      FROM users 
      ORDER BY id
    `;

    console.log("📋 Usuários cadastrados:");
    console.table(allUsers);
  } catch (error) {
    console.error("❌ Erro ao criar usuários:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Executar
createUsers();
