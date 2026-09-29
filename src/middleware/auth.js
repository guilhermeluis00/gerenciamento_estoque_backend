const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no .env');
}

/**
 * Middleware que valida o token JWT e injeta req.user = { id, accountId, role }
 * Todo o isolamento multi-tenant depende de req.user.accountId estar correto aqui.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.id,
      accountId: payload.accountId,
      role: payload.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

/**
 * Middleware extra: bloqueia rota se o usuário não for ADMIN da conta.
 * Usar depois do authMiddleware nas rotas sensíveis (gestão de usuários, config).
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas administradores podem executar esta ação' });
  }
  next();
}

module.exports = { authMiddleware, requireAdmin };