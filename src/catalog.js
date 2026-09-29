const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ---------- CATEGORIES ----------

router.get('/categories', async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { accountId: req.user.accountId },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
});

router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const category = await prisma.category.create({
      data: { name, accountId: req.user.accountId },
    });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe uma categoria com esse nome' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const category = await prisma.category.updateMany({
      where: { id: req.params.id, accountId: req.user.accountId },
      data: { name },
    });
    if (category.count === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  const deleted = await prisma.category.deleteMany({
    where: { id: req.params.id, accountId: req.user.accountId },
  });
  if (deleted.count === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
  res.json({ success: true });
});

// ---------- SUPPLIERS ----------

router.get('/suppliers', async (req, res) => {
  const suppliers = await prisma.supplier.findMany({
    where: { accountId: req.user.accountId },
    orderBy: { name: 'asc' },
  });
  res.json(suppliers);
});

router.post('/suppliers', async (req, res) => {
  try {
    const { name, email, phone, document } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const supplier = await prisma.supplier.create({
      data: { name, email, phone, document, accountId: req.user.accountId },
    });
    res.status(201).json(supplier);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar fornecedor' });
  }
});

router.put('/suppliers/:id', async (req, res) => {
  try {
    const { name, email, phone, document } = req.body;
    const updated = await prisma.supplier.updateMany({
      where: { id: req.params.id, accountId: req.user.accountId },
      data: { name, email, phone, document },
    });
    if (updated.count === 0) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  const deleted = await prisma.supplier.deleteMany({
    where: { id: req.params.id, accountId: req.user.accountId },
  });
  if (deleted.count === 0) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  res.json({ success: true });
});

module.exports = router;