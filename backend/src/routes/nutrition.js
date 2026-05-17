const express   = require('express')
const router    = express.Router()
const supabase  = require('../supabase')

// ─── GET /api/nutrition ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { search, category, limit = 100, offset = 0 } = req.query

  let query = supabase
    .from('nutritions')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

  if (search)   query = query.ilike('name', `%${search}%`)
  if (category) query = query.ilike('category', category)

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data, total: count, limit: parseInt(limit), offset: parseInt(offset) })
})

// ─── GET /api/nutrition/categories ───────────────────────────────────────────
router.get('/categories', async (req, res) => {
  const { data, error } = await supabase
    .from('nutritions')
    .select('category')
  if (error) return res.status(500).json({ error: error.message })

  const counts = {}
  data.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1 })
  const result = Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
  res.json(result)
})

// ─── GET /api/nutrition/lookup?name=... ──────────────────────────────────────
// Dipakai oleh Detection.jsx untuk memperkaya hasil deteksi dengan data gizi DB
router.get('/lookup', async (req, res) => {
  const { name } = req.query
  if (!name) return res.status(400).json({ error: 'name query param required' })

  const nameLower = name.trim().toLowerCase()

  // 1. Exact match (case-insensitive)
  let { data } = await supabase
    .from('nutritions')
    .select('*')
    .ilike('name', nameLower)
    .limit(1)

  // 2. Starts-with first word
  if (!data?.length) {
    const firstWord = nameLower.split(' ')[0]
    if (firstWord.length > 2) {
      ;({ data } = await supabase
        .from('nutritions')
        .select('*')
        .ilike('name', `${firstWord}%`)
        .limit(1))
    }
  }

  // 3. Contains any significant word
  if (!data?.length) {
    const words = nameLower.split(/\s+/).filter(w => w.length > 2)
    for (const word of words) {
      ;({ data } = await supabase
        .from('nutritions')
        .select('*')
        .ilike('name', `%${word}%`)
        .limit(1))
      if (data?.length) break
    }
  }

  if (!data?.length) {
    return res.json({
      found: false,
      nutrition: { id: null, name, calories: 100, protein: 5, fat: 3, carbs: 15, fiber: 1, category: 'other' },
    })
  }

  res.json({ found: true, nutrition: data[0] })
})

// ─── GET /api/nutrition/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('nutritions')
    .select('*')
    .eq('id', req.params.id)
    .single()
  if (error || !data) return res.status(404).json({ error: 'Not found' })
  res.json(data)
})

// ─── POST /api/nutrition ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, calories, protein, fat, carbs, fiber, category, image_url } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const { data, error } = await supabase
    .from('nutritions')
    .insert([{ name, calories: +calories, protein: +protein, fat: +fat, carbs: +carbs, fiber: +fiber, category, image_url }])
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// ─── PATCH /api/nutrition/:id ─────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('nutritions')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ─── DELETE /api/nutrition/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('nutritions').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

module.exports = router
