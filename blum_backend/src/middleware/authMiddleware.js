const jwt = require('jsonwebtoken');

// Middleware para verificar token JWT
exports.authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2) {
    return res.status(401).json({ error: "Formato de token inválido" });
  }
  
  const [scheme, token] = parts;
  
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: "Token mal formatado" });
  }
  
  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'blum-secret-key-change-in-production'
    );
    
    // Adiciona informações do usuário ao request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      name: decoded.name
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expirado" });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Token inválido" });
    }
    
    return res.status(401).json({ error: "Falha na autenticação" });
  }
};

// Middleware para verificar permissões por role
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Acesso negado",
        message: `Esta operação requer permissão de: ${allowedRoles.join(', ')}`
      });
    }
    
    next();
  };
};

// Middleware opcional - permite acesso sem token ou com token válido
exports.optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // Sem token, continua mas sem user info
    req.user = null;
    return next();
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2) {
    req.user = null;
    return next();
  }
  
  const [scheme, token] = parts;
  
  if (!/^Bearer$/i.test(scheme)) {
    req.user = null;
    return next();
  }
  
  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'blum-secret-key-change-in-production'
    );
    
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      name: decoded.name
    };
  } catch (error) {
    req.user = null;
  }
  
  next();
};
