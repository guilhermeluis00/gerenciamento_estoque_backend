const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /users
 * Lista os usuários da própria conta (qualquer membro pode ver a equipe)
 */
router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    where: { accountId: req.user.accountId },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

/**
 * POST /users
 * ADMIN convida/cria um novo usuário (OPERATOR ou outro ADMIN) dentro da própria conta.
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email e password são obrigatórios' });
    }

    if (role && !['ADMIN', 'OPERATOR'].includes(role)) {
      return res.status(400).json({ error: 'role deve ser ADMIN ou OPERATOR' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Já existe um usuário com este e-mail' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'OPERATOR',
        accountId: req.user.accountId,
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

/**
 * PUT /users/:id
 * ADMIN edita nome/role/ativo de um usuário da própria conta.
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, role, active } = req.body;

    const updated = await prisma.user.updateMany({
      where: { id: req.params.id, accountId: req.user.accountId },
      data: { name, role, active },
    });

    if (updated.count === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

/**
 * DELETE /users/:id
 * ADMIN remove um usuário da própria conta (não pode remover a si mesmo).
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode remover a si mesmo' });
  }

  const deleted = await prisma.user.deleteMany({
    where: { id: req.params.id, accountId: req.user.accountId },
  });

  if (deleted.count === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ success: true });
});

module.exports = router;