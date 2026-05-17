// ─── Prisma Client Singleton (Prisma v7) ──────────────────────────────────────
// Prisma v7 membaca DATABASE_URL otomatis dari environment.
// Pastikan dotenv sudah di-load di src/index.js SEBELUM require file ini.

const { PrismaClient } = require('@prisma/client')

const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

module.exports = prisma
