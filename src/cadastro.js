const bcrypt = require('bcryptjs')
const prisma = require('./lib/prisma')

async function cadastrarUsuario (req, res) {
  const { name, email, password, role } = req.body

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const emailFormatado = email.toLowerCase().trim()

    // Criação do usuário usando os nomes exatos do seu schema
    const novoUsuario = await prisma.usuario.create({
      data: {
        name,
        email: emailFormatado,
        password: hashedPassword, // Usando o hash criado
        role: role.toUpperCase()
      }
    })

    // Remove a senha antes de responder
    const { password: _, ...userWithoutPassword } = novoUsuario

    return res.status(201).json(userWithoutPassword)
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' })
    }
    console.error(error)
    return res.status(500).json({ error: 'Erro interno ao cadastrar.' })
  }
}

module.exports = { cadastrarUsuario }
