const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /products
 * Lista produtos da conta logada. Suporta busca (?search=) e filtro de estoque baixo (?lowStock=true)
 */
router.get('/', async (req, res) => {
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

  // Filtro de estoque baixo é feito em memória pois compara duas colunas (quantity <= minStock)
  if (lowStock === 'true') {
    products = products.filter((p) => p.quantity <= p.minStock);
  }

  res.json(products);
});

router.get('/:id', async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, accountId: req.user.accountId },
    include: { category: true, supplier: true },
  });
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(product);
});

router.post('/', async (req, res) => {
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

router.put('/:id', async (req, res) => {
  try {
    const { name, sku, barcode, description, costPrice, sellingPrice, minStock, categoryId, supplierId, active } = req.body;

    // Nota: quantity NÃO é editável aqui de propósito — o saldo só muda via /stock-movements,
    // pra garantir que toda alteração de estoque fique registrada no histórico.
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

router.delete('/:id', async (req, res) => {
  const deleted = await prisma.product.deleteMany({
    where: { id: req.params.id, accountId: req.user.accountId },
  });
  if (deleted.count === 0) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json({ success: true });
});

module.exports = router;