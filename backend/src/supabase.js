// ─── Supabase Client Singleton ────────────────────────────────────────────────
// Menggunakan SUPABASE_SERVICE_ROLE_KEY agar bisa bypass RLS dan akses semua data
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,  // service role = full access
  { auth: { persistSession: false } }
)

module.exports = supabase
