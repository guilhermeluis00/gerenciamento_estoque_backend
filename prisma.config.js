const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const { defineConfig } = require('prisma/config')

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})