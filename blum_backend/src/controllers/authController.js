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
const billingService = require("../services/billingService");
const { resolvePlatformAdminFlag } = require("../utils/platformAdmin");
const { assertCanAddUser } = require("../services/planLimitsService");
const {
  normalizeTenantSlug,
  findUsersForLogin,
  matchUsersByPassword,
  buildTenantChoicePayload,
} = require("../services/authLoginService");

function buildTokenPayload(user) {
  const isPlatformAdmin = resolvePlatformAdminFlag(user);
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    tenantId: user.tenant_id,
    tenantSlug: user.tenant_slug,
    tenantName: user.tenant_name,
    isPlatformAdmin,
  };
}

function buildUserResponse(user, mapOptions) {
  return mapAuthUserResponse(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      tenantId: user.tenant_id,
      tenantSlug: user.tenant_slug,
      tenantName: user.tenant_name,
      isPlatformAdmin: resolvePlatformAdminFlag(user),
    },
    mapOptions,
  );
}

async function issueLoginSuccess(req, res, user, mapOptions) {
  const token = jwt.sign(buildTokenPayload(user), getJwtSecret(), {
    expiresIn: "8h",
  });
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
    user: buildUserResponse(user, mapOptions),
  });
}

exports.login = async (req, res) => {
  let { username, password } = req.body;
  const tenantSlug = normalizeTenantSlug(
    req.body.tenantSlug || req.headers["x-tenant-slug"],
  );

  username = username?.trim();
  password = password?.trim();

  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Usuário e senha são obrigatórios" });
    }

    const candidates = await findUsersForLogin(username, tenantSlug);

    if (!candidates || candidates.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const { matched, suspendedValid } = await matchUsersByPassword(
      candidates,
      password,
    );

    if (matched.length === 0) {
      if (suspendedValid.length > 0) {
        return res.status(403).json({
          error: "Esta empresa está suspensa. Contacte o suporte.",
        });
      }
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (matched.length > 1) {
      return res.status(409).json({
        error: "multiple_tenants",
        message:
          "Esta conta existe em mais de uma empresa. Escolha qual acessar.",
        tenants: matched.map(buildTenantChoicePayload),
      });
    }

    await issueLoginSuccess(req, res, matched[0], mapOptions);
  } catch (error) {
    console.error("❌ ERRO FATAL no processo de login:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
};

// Verificar token (opcional - para refresh de sessão)
exports.verifyToken = async (req, res) => {
  try {
    const mapOptions = { camelOnly: req.apiVersion === "v2" };
    const subscription = await billingService.getSubscriptionSummary(
      req.user.tenantId,
    );
    res.json({
      user: buildUserResponse(
        {
          id: req.user.userId,
          username: req.user.username,
          role: req.user.role,
          name: req.user.name,
          tenant_id: req.user.tenantId,
          tenant_slug: req.user.tenantSlug,
          tenant_name: req.user.tenantName,
          is_platform_admin: req.user.isPlatformAdmin,
        },
        mapOptions,
      ),
      subscription,
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

    await assertCanAddUser(req.user.tenantId);

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
    const status = error.statusCode || 500;
    res.status(status).json({
      error: error.message || "Erro ao criar usuário",
    });
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

/** Admin remove vendedor (não remove administradores). */
exports.deleteUser = async (req, res) => {
  const targetId = parseInt(req.params.userId, 10);

  try {
    if (!Number.isInteger(targetId) || targetId < 1) {
      return res.status(400).json({ error: "ID de usuário inválido" });
    }

    if (targetId === req.user.userId) {
      return res
        .status(400)
        .json({ error: "Não é possível excluir a própria conta." });
    }

    const rows = await authRepository.findUserByIdAndTenant(
      targetId,
      req.user.tenantId,
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (rows[0].role !== "salesperson") {
      return res.status(403).json({
        error: "Só é possível excluir contas de vendedor.",
      });
    }

    const orderCount = await authRepository.countOrdersByUserRef(
      targetId,
      req.user.tenantId,
    );
    if (orderCount > 0) {
      return res.status(409).json({
        error: `Este vendedor tem ${orderCount} pedido(s) associado(s). Não é possível excluir.`,
      });
    }

    const deleted = await authRepository.deleteSalespersonById(
      targetId,
      req.user.tenantId,
    );
    if (!deleted.length) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    await logAuditEvent({
      tenantId: req.user.tenantId,
      actorUserId: req.user.userId,
      action: "auth.user.delete",
      resourceType: "user",
      resourceId: String(targetId),
      requestId: req.requestId,
      metadata: { username: deleted[0].username },
    });

    res.json({ message: "Vendedor excluído com sucesso." });
  } catch (error) {
    console.error("deleteUser:", error);
    res.status(500).json({ error: "Erro ao excluir usuário." });
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
    const accessToken = jwt.sign(buildTokenPayload(user), getJwtSecret(), {
      expiresIn: "8h",
    });
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
      user: buildUserResponse(user, mapOptions),
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
      tenantId: req.user?.tenantId ?? null,
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
