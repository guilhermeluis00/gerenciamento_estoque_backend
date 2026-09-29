const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /stock-movements
 * Histórico de movimentações da conta, mais recentes primeiro.
 * Filtros opcionais: ?productId=, ?type=IN|OUT
 */
router.get('/', async (req, res) => {
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
    take: 200, // limite razoável; paginação pode ser adicionada depois se precisar
  });

  res.json(movements);
});

/**
 * POST /stock-movements
 * Registra uma entrada (IN) ou saída (OUT) de estoque.
 * Atualiza o quantity do produto na mesma transação — ou tudo falha, ou tudo salva.
 */
router.post('/', async (req, res) => {
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

module.exports = router;