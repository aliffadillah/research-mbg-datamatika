const express  = require('express')
const router   = express.Router()
const supabase = require('../supabase')

// ─── GET /api/daily-menus ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { data, error, count } = await supabase
    .from('daily_menus')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data: data ?? [], total: count ?? 0 })
})

// ─── GET /api/daily-menus/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('daily_menus')
    .select('*')
    .eq('id', req.params.id)
    .single()
  if (error || !data) return res.status(404).json({ error: 'Not found' })
  res.json(data)
})

// ─── POST /api/daily-menus ────────────────────────────────────────────────────
// Body: { name, foods: string[] }
// Nutrition values are NOT required — stored as empty if not provided
router.post('/', async (req, res) => {
  const { name, foods = [] } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })

  const { data, error } = await supabase
    .from('daily_menus')
    .insert([{
      name:          name.trim(),
      foods:         foods,          // jsonb array of food name strings
      large_portion: null,
      small_portion: null,
    }])
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// ─── PATCH /api/daily-menus/:id ───────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const { name, foods } = req.body
  const updates = {}
  if (name  !== undefined) updates.name  = name.trim()
  if (foods !== undefined) updates.foods = foods

  const { data, error } = await supabase
    .from('daily_menus')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ─── DELETE /api/daily-menus/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('daily_menus')
    .delete()
    .eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

module.exports = router
