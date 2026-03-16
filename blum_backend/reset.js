const bcrypt = require("bcrypt");
const { sql } = require("./src/config/database"); // Ajuste o caminho se necessário

async function resetAdmin() {
  try {
    const hash = await bcrypt.hash("123456", 10);
    
    await sql`
      UPDATE users 
      SET password_hash = ${hash} 
      WHERE username = 'admin'
    `;
    
    console.log("✅ Senha do admin resetada com sucesso para: 123456");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

resetAdmin();