const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

// Driver adapter é obrigatório no Prisma 7 para conectar ao Postgres.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

const prisma = global.prisma || new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

module.exports = prisma