require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { sql } = require("../src/config/database");

const NEW_USERNAME = "admin@jwsoftware.com.br";

async function main() {
  const rows = await sql`
    UPDATE users
    SET username = ${NEW_USERNAME}
    WHERE role = 'admin'
      AND LOWER(TRIM(username)) IN ('admin', 'administrator')
    RETURNING id, username, role, name
  `;

  if (!rows.length) {
    const existing = await sql`
      SELECT id, username, role FROM users WHERE username = ${NEW_USERNAME} LIMIT 1
    `;
    if (existing.length) {
      console.log("Admin já usa o e-mail:", existing[0]);
      return;
    }
    console.log("Nenhum utilizador admin com username 'admin' encontrado.");
    return;
  }

  console.log("Atualizado:", rows[0]);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
