# 📦 Sistema de Estoque — Backend

> API para gerenciamento de estoque, construída com **Node.js**, **Express**, **PostgreSQL** e **Prisma ORM 7**.

---

## 🛠️ Stack

![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express.js-5-black?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-7.10.0-2D3748?logo=prisma)

---

## 🚀 Instalação

### 1. Criar o projeto

```bash
mkdir sistema_estoque
cd sistema_estoque
mkdir backend
cd backend
npm init -y
```

### 2. Instalar dependências

```bash
npm install
npm install @prisma/client@7.10.0 @prisma/adapter-pg pg dotenv
npm install -D prisma@7.10.0
```

> `node_modules` e `package-lock.json` são criados automaticamente pelo npm.

---

## 📁 Estrutura

```text
backend/
├── prisma/
│   └── schema.prisma
├── .env
├── .gitignore
├── package.json
└── prisma.config.js
```

---

## 🔐 Variáveis de ambiente

Crie o arquivo `.env`:

```env
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/sistema_estoque?schema=public"
```

---

## ⚙️ Configuração do Prisma

### `prisma.config.js`

```js
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

### `schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

No `package.json`, adicione:

```json
"type": "module"
```

---

## 🔒 Git

Crie o `.gitignore`:

```gitignore
node_modules/
.env
generated/
```

---

## 🧬 Prisma

### Autorizar scripts

Caso o npm solicite:

```bash
npm approve-scripts --allow-scripts-pending
```

### Gerar Prisma Client

```bash
npx prisma generate
```

### Validar o schema

```bash
npx prisma validate
```

### Criar migration

```bash
npx prisma migrate dev --name init
```

### Abrir Prisma Studio

```bash
npx prisma studio
```

---

## 📌 Comandos rápidos

| Comando | Função |
|---|---|
| `npm install` | Instala as dependências |
| `npx prisma generate` | Gera o Prisma Client |
| `npx prisma validate` | Valida o schema |
| `npx prisma migrate dev --name nome` | Cria uma migration |
| `npx prisma studio` | Abre o banco no Prisma Studio |

---

## ⚠️ Importante

Não use:

```bash
npm install all
```

Para instalar as dependências do projeto, use:

```bash
npm install
```

Também não crie `node_modules` manualmente — o npm faz isso automaticamente.

---

### 📚 Tecnologias

**Node.js • Express • PostgreSQL • Prisma • JavaScript**
