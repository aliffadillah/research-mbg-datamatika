/**
 * NutriVision MBG — Node.js Backend API
 * ======================================
 * Express + Prisma server for all database operations.
 * Port: 3001
 *
 * Responsibilities:
 *   - Nutrition data CRUD (from Supabase via Prisma)
 *   - Detection history (save / list / get)
 *   - Serving nutrition lookup for detected food classes
 *
 * NOT responsible for:
 *   - AI model inference  → Python server on :5000
 *   - Frontend serving    → Vite on :5173
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const express  = require('express')
const cors     = require('cors')

const nutritionRouter = require('./routes/nutrition')
const historyRouter   = require('./routes/history')

const app  = express()
const PORT = process.env.BACKEND_PORT || 3001

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '10mb' }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/nutrition', nutritionRouter)
app.use('/api/history',   historyRouter)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NutriVision MBG — Node.js Backend',
    database: 'Supabase (Prisma)',
    timestamp: new Date().toISOString(),
  })
})

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }))

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[error]', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('='.repeat(55))
  console.log(' NutriVision MBG — Node.js Backend API')
  console.log(`  Port     : ${PORT}`)
  console.log(`  DB       : Supabase (${process.env.SUPABASE_URL?.slice(8, 40)}...)`)
  console.log('='.repeat(55))
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} sudah dipakai proses lain!`)
    console.error(`  Hentikan proses di port ${PORT} dulu, atau ganti BACKEND_PORT di .env\n`)
    process.exit(1)
  } else {
    throw err
  }
})
