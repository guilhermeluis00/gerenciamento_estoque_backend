const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('./lib/prisma')

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '7d'

function generateToken (user) {
  return jwt.sign(
    { id: user.id, accountId: user.accountId, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

/**
 * POST /auth/login
 */
async function login (req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe email e senha' })
  }

  try {
    const emailFormatado = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({
      where: { email: emailFormatado },
      include: { account: true }
    })

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    if (user.account.subscriptionStatus === 'CANCELED') {
      return res.status(402).json({ error: 'Assinatura cancelada. Reative para continuar usando o sistema.' })
    }

    const token = generateToken(user)

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      account: {
        id: user.account.id,
        name: user.account.name,
        subscriptionStatus: user.account.subscriptionStatus,
        trialEndsAt: user.account.trialEndsAt
      }
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro interno ao fazer login' })
  }
}

module.exports = { login }