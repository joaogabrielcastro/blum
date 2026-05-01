const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { sql } = require("../config/database");
const { getJwtSecret } = require("../config/env");
const refreshTokenService = require("../services/refreshTokenService");
const { logAuditEvent } = require("../services/auditService");
const authRepository = require("../repositories/authRepository");
const {
  mapAuthUserResponse,
  mapAuthUsersPayload,
} = require("../mappers/apiResponseMapper");

exports.login = async (req, res) => {
  let { username, password } = req.body; // use let para permitir alteração
  const tenantSlug = String(
    req.body.tenantSlug || req.headers["x-tenant-slug"] || "default",
  ).trim();

  // Limpeza de segurança no servidor
  username = username?.trim();
  password = password?.trim();

  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    // Validação básica
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Usuário e senha são obrigatórios" });
    }

    const users = await authRepository.findUserByUsernameAndTenantSlug(
      username,
      tenantSlug,
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = users[0];

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
        tenantId: user.tenant_id,
      },
      getJwtSecret(),
      { expiresIn: "8h" },
    );
    const refreshToken = await refreshTokenService.issueRefreshToken({
      tenantId: user.tenant_id,
      userId: user.id,
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });

    await logAuditEvent({
      tenantId: user.tenant_id,
      actorUserId: user.id,
      action: "auth.login.success",
      resourceType: "user",
      resourceId: String(user.id),
      requestId: req.requestId,
      metadata: { username: user.username },
    });

    res.json({
      token,
      refreshToken,
      user: mapAuthUserResponse({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        tenantId: user.tenant_id,
      }, mapOptions),
    });
  } catch (error) {
    console.error("❌ ERRO FATAL no processo de login:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
};

// Verificar token (opcional - para refresh de sessão)
exports.verifyToken = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    // O middleware authenticate já validou o token
    // req.user já contém os dados do token
    res.json({
      user: mapAuthUserResponse({
        id: req.user.userId,
        username: req.user.username,
        role: req.user.role,
        name: req.user.name,
        tenantId: req.user.tenantId,
      }, mapOptions),
    });
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
};

// Criar novo usuário (apenas admin)
exports.createUser = async (req, res) => {
  const usernameRaw = String(req.body.username || "").trim();
  const passwordRaw = String(req.body.password || "").trim();
  const { role, name } = req.body;

  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    // Validação
    if (!usernameRaw || !passwordRaw || !role) {
      return res
        .status(400)
        .json({ error: "Usuário, senha e role são obrigatórios" });
    }

    if (!["admin", "salesperson"].includes(role)) {
      return res.status(400).json({ error: "Role inválida" });
    }

    // Mesmo login independente de maiúsculas (evita duplicata antonio/Antonio)
    const existingUsers = await sql`
      SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(${usernameRaw})
      AND tenant_id = ${req.user.tenantId}
    `;

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "Usuário já existe" });
    }

    // Hash da senha (alinhado ao trim do login)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(passwordRaw, saltRounds);

    // Inserir usuário
    const result = await authRepository.createUser({
      username: usernameRaw,
      passwordHash: password_hash,
      role,
      name: name || usernameRaw,
      tenantId: req.user.tenantId,
    });

    await logAuditEvent({
      tenantId: req.user.tenantId,
      actorUserId: req.user.userId,
      action: "auth.user.create",
      resourceType: "user",
      resourceId: String(result[0].id),
      requestId: req.requestId,
      metadata: { role },
    });

    res.status(201).json({
      message: "Usuário criado com sucesso",
      user: mapAuthUserResponse(result[0], mapOptions),
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
};

// Listar usuários (apenas admin)
exports.getUsers = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const users = await authRepository.listUsersByTenant(req.user.tenantId);
    res.json(mapAuthUsersPayload(users, mapOptions));
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
};

/** Admin redefine senha de outro usuário (ex.: vendedor criado com hash errado). */
exports.adminResetUserPassword = async (req, res) => {
  const targetId = parseInt(req.params.userId, 10);
  const newPassword = String(req.body.newPassword || "").trim();

  try {
    if (!Number.isInteger(targetId) || targetId < 1) {
      return res.status(400).json({ error: "ID de usuário inválido" });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Nova senha deve ter no mínimo 6 caracteres" });
    }

    const rows = await authRepository.findUserByIdAndTenant(
      targetId,
      req.user.tenantId,
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    await authRepository.updateUserPassword(
      targetId,
      req.user.tenantId,
      password_hash,
    );

    await logAuditEvent({
      tenantId: req.user.tenantId,
      actorUserId: req.user.userId,
      action: "auth.user.password.reset",
      resourceType: "user",
      resourceId: String(targetId),
      requestId: req.requestId,
      metadata: null,
    });

    res.json({ message: "Senha atualizada com sucesso" });
  } catch (error) {
    console.error("adminResetUserPassword:", error);
    res.status(500).json({ error: "Erro ao redefinir senha" });
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
    const users = await authRepository.findUserByIdAndTenant(
      userId,
      req.user.tenantId,
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Verificar senha atual
    const validPassword = await bcrypt.compare(
      currentPassword,
      users[0].password_hash,
    );

    if (!validPassword) {
      return res.status(401).json({ error: "Senha atual incorreta" });
    }

    // Hash da nova senha
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar senha
    await authRepository.updateUserPassword(
      userId,
      req.user.tenantId,
      newPasswordHash,
    );

    await logAuditEvent({
      tenantId: req.user.tenantId,
      actorUserId: req.user.userId,
      action: "auth.user.password.update",
      resourceType: "user",
      resourceId: String(userId),
      requestId: req.requestId,
      metadata: null,
    });

    res.json({ message: "Senha atualizada com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar senha:", error);
    res.status(500).json({ error: "Erro ao atualizar senha" });
  }
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken é obrigatório" });
    }
    const rotated = await refreshTokenService.rotateRefreshToken({
      refreshToken,
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });
    const userRows = await authRepository.findUserByIdAndTenant(
      rotated.userId,
      rotated.tenantId,
    );
    if (!userRows.length) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }
    const user = userRows[0];
    const accessToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        tenantId: user.tenant_id,
      },
      getJwtSecret(),
      { expiresIn: "8h" },
    );
    await logAuditEvent({
      tenantId: user.tenant_id,
      actorUserId: user.id,
      action: "auth.refresh.success",
      resourceType: "user",
      resourceId: String(user.id),
      requestId: req.requestId,
      metadata: null,
    });
    return res.status(200).json({
      token: accessToken,
      refreshToken: rotated.refreshToken,
      user: mapAuthUserResponse({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        tenantId: user.tenant_id,
      }, mapOptions),
    });
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      error: error.message || "Falha ao renovar sessão",
    });
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    if (refreshToken) {
      await refreshTokenService.revokeRefreshToken(refreshToken);
    }
    await logAuditEvent({
      tenantId: req.user?.tenantId || 1,
      actorUserId: req.user?.userId || null,
      action: "auth.logout",
      resourceType: "user",
      resourceId: req.user?.userId ? String(req.user.userId) : null,
      requestId: req.requestId,
      metadata: null,
    });
    return res.status(200).json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao realizar logout" });
  }
};
