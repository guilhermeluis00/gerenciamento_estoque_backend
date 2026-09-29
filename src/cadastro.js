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
 * POST /auth/register
 * Cria uma nova Account (empresa) + o primeiro usuário como ADMIN.
 */
async function cadastrar (req, res) {
  const { accountName, name, email, password } = req.body

  if (!accountName || !name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos: accountName, name, email, password' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' })
  }

  try {
    const emailFormatado = email.toLowerCase().trim()

    const existingUser = await prisma.user.findUnique({ where: { email: emailFormatado } })
    if (existingUser) {
      return res.status(409).json({ error: 'Já existe um usuário com este e-mail' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: accountName,
          subscriptionStatus: 'TRIAL',
          trialEndsAt
        }
      })

      const user = await tx.user.create({
        data: {
          name,
          email: emailFormatado,
          password: hashedPassword,
          role: 'ADMIN',
          accountId: account.id
        }
      })

      return { account, user }
    })

    const token = generateToken(result.user)

    return res.status(201).json({
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role
      },
      account: {
        id: result.account.id,
        name: result.account.name,
        subscriptionStatus: result.account.subscriptionStatus,
        trialEndsAt: result.account.trialEndsAt
      }
    })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe um usuário com este e-mail' })
    }
    console.error(error)
    return res.status(500).json({ error: 'Erro interno ao cadastrar' })
  }
}

module.exports = { cadastrar }