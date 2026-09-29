require('dotenv').config();
const express = require('express');
const cors = require('cors');
const router = require('./router');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/', router);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Handler de erro genérico (fallback)
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});