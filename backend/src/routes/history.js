const express  = require('express')
const router   = express.Router()
const supabase = require('../supabase')

// ─── POST /api/history ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { user_id, filename, portion, detections, nutrition_summary, mbg_compliance, inference_ms, overlay_image_url } = req.body
  const { data, error } = await supabase
    .from('histories')
    .insert([{
      user_id:           user_id ?? null,
      filename:          filename ?? 'unknown.jpg',
      portion:           portion ?? 'besar',
      detections:        JSON.stringify(detections ?? []),
      nutrition_summary: JSON.stringify(nutrition_summary ?? {}),
      mbg_compliance:    JSON.stringify(mbg_compliance ?? {}),
      inference_ms:      inference_ms ?? 0,
      overlay_image_url: overlay_image_url ?? null,
    }])
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// ─── GET /api/history ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { user_id, limit = 20, offset = 0 } = req.query
  let query = supabase
    .from('histories')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
  if (user_id) query = query.eq('user_id', user_id)

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data, total: count })
})

// ─── GET /api/history/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('histories')
    .select('*')
    .eq('id', req.params.id)
    .single()
  if (error || !data) return res.status(404).json({ error: 'Not found' })
  res.json(data)
})

module.exports = router
