const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

// Login de usuário
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Validação básica
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Usuário e senha são obrigatórios" });
    }

    // Buscar usuário no banco
    const users = await sql`
      SELECT id, username, password_hash, role, name 
      FROM users 
      WHERE username = ${username}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = users[0];

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // Gerar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET || "blum-secret-key-change-in-production",
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
};

// Verificar token (opcional - para refresh de sessão)
exports.verifyToken = async (req, res) => {
  try {
    // O middleware authenticate já validou o token
    // req.user já contém os dados do token
    res.json({
      user: {
        id: req.user.userId,
        username: req.user.username,
        role: req.user.role,
        name: req.user.name,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
};

// Criar novo usuário (apenas admin)
exports.createUser = async (req, res) => {
  const { username, password, role, name } = req.body;

  try {
    // Validação
    if (!username || !password || !role) {
      return res
        .status(400)
        .json({ error: "Usuário, senha e role são obrigatórios" });
    }

    if (!["admin", "salesperson"].includes(role)) {
      return res.status(400).json({ error: "Role inválida" });
    }

    // Verificar se usuário já existe
    const existingUsers = await sql`
      SELECT id FROM users WHERE username = ${username}
    `;

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "Usuário já existe" });
    }

    // Hash da senha
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Inserir usuário
    const result = await sql`
      INSERT INTO users (username, password_hash, role, name)
      VALUES (${username}, ${password_hash}, ${role}, ${name || username})
      RETURNING id, username, role, name, createdat
    `;

    res.status(201).json({
      message: "Usuário criado com sucesso",
      user: result[0],
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
};

// Listar usuários (apenas admin)
exports.getUsers = async (req, res) => {
  try {
    const users = await sql`
      SELECT id, username, role, name, createdat
      FROM users
      ORDER BY username ASC
    `;

    res.json(users);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
};

// Atualizar senha
exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Senhas são obrigatórias" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Nova senha deve ter no mínimo 6 caracteres" });
    }

    // Buscar usuário
    const users = await sql`
      SELECT password_hash FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Verificar senha atual
    const validPassword = await bcrypt.compare(
      currentPassword,
      users[0].password_hash
    );

    if (!validPassword) {
      return res.status(401).json({ error: "Senha atual incorreta" });
    }

    // Hash da nova senha
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar senha
    await sql`
      UPDATE users 
      SET password_hash = ${newPasswordHash}
      WHERE id = ${userId}
    `;

    res.json({ message: "Senha atualizada com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar senha:", error);
    res.status(500).json({ error: "Erro ao atualizar senha" });
  }
};
