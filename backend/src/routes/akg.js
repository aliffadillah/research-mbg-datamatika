const express  = require('express')
const router   = express.Router()
const supabase = require('../supabase')

// ── Seed data default (13 baris AKG Permenkes RI) ────────────────────────────
const SEED_DATA = [
  { group_name: 'Bayi/Anak', age: '0-5 Bulan',    gender: '-', weight: 6,  height: 60,  energy: 550,  fat: 31, protein: 9,  carbs: 59,   fiber: 0  },
  { group_name: 'Bayi/Anak', age: '6-11 Bulan',   gender: '-', weight: 9,  height: 72,  energy: 800,  fat: 35, protein: 15, carbs: 105,  fiber: 11 },
  { group_name: 'Bayi/Anak', age: '1-3 Tahun',    gender: '-', weight: 13, height: 92,  energy: 1350, fat: 45, protein: 20, carbs: 215,  fiber: 19 },
  { group_name: 'Bayi/Anak', age: '4-6 Tahun',    gender: '-', weight: 19, height: 113, energy: 1400, fat: 50, protein: 25, carbs: 220,  fiber: 20 },
  { group_name: 'Bayi/Anak', age: '7-9 Tahun',    gender: '-', weight: 27, height: 130, energy: 1650, fat: 55, protein: 40, carbs: 250,  fiber: 23 },
  { group_name: 'Laki-Laki', age: '10-12 Tahun',  gender: 'L', weight: 36, height: 145, energy: 2000, fat: 65, protein: 50, carbs: 300,  fiber: 28 },
  { group_name: 'Laki-Laki', age: '13-15 Tahun',  gender: 'L', weight: 50, height: 163, energy: 2400, fat: 80, protein: 70, carbs: 350,  fiber: 34 },
  { group_name: 'Laki-Laki', age: '16-18 Tahun',  gender: 'L', weight: 60, height: 168, energy: 2650, fat: 85, protein: 75, carbs: 400,  fiber: 37 },
  { group_name: 'Perempuan',  age: '10-12 Tahun', gender: 'P', weight: 38, height: 147, energy: 1900, fat: 65, protein: 55, carbs: 280,  fiber: 27 },
  { group_name: 'Perempuan',  age: '13-15 Tahun', gender: 'P', weight: 48, height: 156, energy: 2050, fat: 70, protein: 65, carbs: 300,  fiber: 29 },
  { group_name: 'Perempuan',  age: '16-18 Tahun', gender: 'P', weight: 52, height: 159, energy: 2100, fat: 70, protein: 65, carbs: 300,  fiber: 29 },
  { group_name: 'Perempuan',  age: '19-29 Tahun', gender: 'P', weight: 55, height: 159, energy: 2250, fat: 65, protein: 60, carbs: 360,  fiber: 32 },
  { group_name: 'Perempuan',  age: '30-49 Tahun', gender: 'P', weight: 56, height: 158, energy: 2150, fat: 60, protein: 60, carbs: 340,  fiber: 30 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseNum(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

function validateBody(body) {
  const required = ['group_name', 'age', 'energy', 'fat', 'protein', 'carbs', 'fiber', 'weight', 'height']
  for (const field of required) {
    if (body[field] === undefined || body[field] === '') {
      return `Field '${field}' wajib diisi`
    }
  }
  return null
}

// ── GET /api/akg ──────────────────────────────────────────────────────────────
// Query params: group (filter by group_name), sort (field name), order (asc|desc)
router.get('/', async (req, res) => {
  const { group } = req.query

  let query = supabase
    .from('akg_references')
    .select('*', { count: 'exact' })
    .order('id', { ascending: true })

  if (group && group !== 'Semua') {
    query = query.eq('group_name', group)
  }

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data: data ?? [], total: count ?? 0 })
})

// ── GET /api/akg/:id ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('akg_references')
    .select('*')
    .eq('id', req.params.id)
    .single()
  if (error || !data) return res.status(404).json({ error: 'Data AKG tidak ditemukan' })
  res.json(data)
})

// ── POST /api/akg/seed ────────────────────────────────────────────────────────
// Seed 13 baris default — hanya jika tabel kosong
router.post('/seed', async (req, res) => {
  // Cek apakah sudah ada data
  const { count } = await supabase
    .from('akg_references')
    .select('id', { count: 'exact', head: true })

  if (count && count > 0) {
    return res.json({ skipped: true, message: `Tabel sudah berisi ${count} baris, seed dilewati` })
  }

  const { data, error } = await supabase
    .from('akg_references')
    .insert(SEED_DATA)
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ seeded: true, count: data.length, data })
})

// ── POST /api/akg ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const validationError = validateBody(req.body)
  if (validationError) return res.status(400).json({ error: validationError })

  const { group_name, age, gender = '-', weight, height, energy, fat, protein, carbs, fiber } = req.body

  const { data, error } = await supabase
    .from('akg_references')
    .insert([{
      group_name: group_name.trim(),
      age:        age.trim(),
      gender:     gender.trim() || '-',
      weight:     parseNum(weight),
      height:     parseNum(height),
      energy:     parseNum(energy),
      fat:        parseNum(fat),
      protein:    parseNum(protein),
      carbs:      parseNum(carbs),
      fiber:      parseNum(fiber),
    }])
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// ── PATCH /api/akg/:id ────────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID tidak valid' })

  const { group_name, age, gender, weight, height, energy, fat, protein, carbs, fiber } = req.body

  const updates = {}
  if (group_name !== undefined) updates.group_name = group_name.trim()
  if (age        !== undefined) updates.age        = age.trim()
  if (gender     !== undefined) updates.gender     = gender.trim() || '-'
  if (weight     !== undefined) updates.weight     = parseNum(weight)
  if (height     !== undefined) updates.height     = parseNum(height)
  if (energy     !== undefined) updates.energy     = parseNum(energy)
  if (fat        !== undefined) updates.fat        = parseNum(fat)
  if (protein    !== undefined) updates.protein    = parseNum(protein)
  if (carbs      !== undefined) updates.carbs      = parseNum(carbs)
  if (fiber      !== undefined) updates.fiber      = parseNum(fiber)

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Tidak ada field yang diperbarui' })
  }

  const { data, error } = await supabase
    .from('akg_references')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'Data AKG tidak ditemukan' })
  res.json(data)
})

// ── DELETE /api/akg/:id ───────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID tidak valid' })

  const { error } = await supabase
    .from('akg_references')
    .delete()
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, id })
})

module.exports = router
