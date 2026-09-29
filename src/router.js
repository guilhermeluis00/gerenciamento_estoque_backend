const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');
const { authMiddleware, requireAdmin } = require('./middleware/auth');
const { cadastrar } = require('./cadastro');
const { login } = require('./login');

const router = express.Router();

// ============================================================
// AUTH (rotas públicas) — lógica em cadastro.js e login.js
// ============================================================

router.post('/auth/register', cadastrar);
router.post('/auth/login', login);

// ============================================================
// A partir daqui, todas as rotas exigem autenticação
// ============================================================
router.use(authMiddleware);

// ============================================================
// PRODUCTS
// ============================================================

router.get('/products', async (req, res) => {
  const { search, lowStock, categoryId, supplierId } = req.query;

  const where = {
    accountId: req.user.accountId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(supplierId && { supplierId }),
  };

  let products = await prisma.product.findMany({
    where,
    include: { category: true, supplier: true },
    orderBy: { name: 'asc' },
  });

  if (lowStock === 'true') {
    products = products.filter((p) => p.quantity <= p.minStock);
  }

  res.json(products);
});

router.get('/products/:id', async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, accountId: req.user.accountId },
    include: { category: true, supplier: true },
  });
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(product);
});

router.post('/products', async (req, res) => {
  try {
    const { name, sku, barcode, description, costPrice, sellingPrice, quantity, minStock, categoryId, supplierId } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        barcode,
        description,
        costPrice: costPrice ?? 0,
        sellingPrice: sellingPrice ?? 0,
        quantity: quantity ?? 0,
        minStock: minStock ?? 0,
        accountId: req.user.accountId,
        categoryId: categoryId || null,
        supplierId: supplierId || null,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe um produto com esse SKU' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { name, sku, barcode, description, costPrice, sellingPrice, minStock, categoryId, supplierId, active } = req.body;

    // quantity NÃO é editável aqui de propósito — saldo só muda via /stock-movements
    const updated = await prisma.product.updateMany({
      where: { id: req.params.id, accountId: req.user.accountId },
      data: { name, sku, barcode, description, costPrice, sellingPrice, minStock, categoryId, supplierId, active },
    });

    if (updated.count === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe um produto com esse SKU' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

router.delete('/products/:id', async (req, res) => {
  const deleted = await prisma.product.deleteMany({
    where: { id: req.params.id, accountId: req.user.accountId },
  });
  if (deleted.count === 0) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json({ success: true });
});

// ============================================================
// STOCK MOVEMENTS
// ============================================================

router.get('/stock-movements', async (req, res) => {
  const { productId, type } = req.query;

  const movements = await prisma.stockMovement.findMany({
    where: {
      accountId: req.user.accountId,
      ...(productId && { productId }),
      ...(type && { type }),
    },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  res.json(movements);
});

router.post('/stock-movements', async (req, res) => {
  try {
    const { productId, type, quantity, reason } = req.body;

    if (!productId || !type || !quantity) {
      return res.status(400).json({ error: 'productId, type e quantity são obrigatórios' });
    }

    if (!['IN', 'OUT'].includes(type)) {
      return res.status(400).json({ error: 'type deve ser IN ou OUT' });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'quantity deve ser um número inteiro positivo' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, accountId: req.user.accountId },
      });

      if (!product) {
        throw { status: 404, message: 'Produto não encontrado' };
      }

      const newQuantity = type === 'IN' ? product.quantity + qty : product.quantity - qty;

      if (newQuantity < 0) {
        throw { status: 400, message: `Estoque insuficiente. Saldo atual: ${product.quantity}` };
      }

      const movement = await tx.stockMovement.create({
        data: {
          type,
          quantity: qty,
          reason: reason || null,
          accountId: req.user.accountId,
          productId,
          userId: req.user.id,
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: { quantity: newQuantity },
      });

      return movement;
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro em POST /stock-movements:', err);
    res.status(500).json({ error: 'Erro ao registrar movimentação' });
  }
});

// ============================================================
// CATEGORIES
// ============================================================

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

// ============================================================
// SUPPLIERS
// ============================================================

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

// ============================================================
// USERS (equipe da conta)
// ============================================================

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    where: { accountId: req.user.accountId },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

router.post('/users', requireAdmin, async (req, res) => {
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

router.put('/users/:id', requireAdmin, async (req, res) => {
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

router.delete('/users/:id', requireAdmin, async (req, res) => {
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