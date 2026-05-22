import { useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, Loader2, AlertCircle, Search, RefreshCw, Pencil } from 'lucide-react'
import './DailyMenu.css'

// ── Helpers ───────────────────────────────────────────────────────────
function parseFoods(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
  return []
}

const CAT_ICONS = { protein:'🥩', sayuran:'🥬', buah:'🍎', karbohidrat:'🍚', pelengkap:'🧂', snack:'🍪', minuman:'🥛', other:'🍽️' }

// ═══════════════════════════════════════════════════════════════════
export default function DailyMenu() {
  const [menus,   setMenus]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const [drawer,    setDrawer]    = useState(null)
  const [form,      setForm]      = useState({ name: '', foods: [] })
  const [foodInput, setFoodInput] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [formErr,   setFormErr]   = useState('')

  const [suggestions, setSuggestions] = useState([])
  const [sugLoading,  setSugLoading]  = useState(false)
  const [showSug,     setShowSug]     = useState(false)
  const sugTimeout = useRef(null)
  const inputRef   = useRef(null)

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchMenus = async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/daily-menus')
      const json = await res.json()
      setMenus(json.data ?? [])
    } catch { setError('Gagal memuat data. Pastikan backend berjalan.') }
    finally  { setLoading(false) }
  }
  useEffect(() => { fetchMenus() }, [])

  // ── Autocomplete ───────────────────────────────────────────────────
  const onFoodInput = (val) => {
    setFoodInput(val)
    clearTimeout(sugTimeout.current)
    if (!val.trim() || val.length < 2) { setSuggestions([]); return }
    sugTimeout.current = setTimeout(async () => {
      setSugLoading(true)
      try {
        const res  = await fetch(`/api/nutrition?search=${encodeURIComponent(val)}&limit=8`)
        const json = await res.json()
        setSuggestions((json.data ?? []).map(f => f.name))
        setShowSug(true)
      } catch { setSuggestions([]) }
      finally  { setSugLoading(false) }
    }, 280)
  }

  const addFood = (name) => {
    const n = name.trim()
    if (!n || form.foods.includes(n)) { setFoodInput(''); setSuggestions([]); setShowSug(false); return }
    setForm(f => ({ ...f, foods: [...f.foods, n] }))
    setFoodInput(''); setSuggestions([]); setShowSug(false)
    inputRef.current?.focus()
  }

  const removeFood = (idx) => setForm(f => ({ ...f, foods: f.foods.filter((_, i) => i !== idx) }))

  // ── Drawer helpers ─────────────────────────────────────────────────
  const openAdd = () => { setForm({ name:'', foods:[] }); setFoodInput(''); setSuggestions([]); setFormErr(''); setDrawer('add') }
  const openEdit = (m) => { setForm({ name: m.name ?? '', foods: parseFoods(m.foods) }); setFoodInput(''); setSuggestions([]); setFormErr(''); setDrawer(m) }

  // ── Save ───────────────────────────────────────────────────────────
  const onSave = async () => {
    if (!form.name.trim())    { setFormErr('Nama menu wajib diisi.'); return }
    if (!form.foods.length)   { setFormErr('Tambahkan minimal 1 item makanan.'); return }
    setSaving(true); setFormErr('')
    const isEdit = drawer && drawer !== 'add'
    const url    = isEdit ? `/api/daily-menus/${drawer.id}` : '/api/daily-menus'
    try {
      const res = await fetch(url, {
        method:  isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({ name: form.name.trim(), foods: form.foods }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Gagal menyimpan') }
      setDrawer(null); fetchMenus()
    } catch (e) { setFormErr(e.message) }
    finally  { setSaving(false) }
  }

  // ── Delete ─────────────────────────────────────────────────────────
  const onDelete = async (id) => {
    if (!window.confirm('Hapus menu ini?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/daily-menus/${id}`, { method:'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus')
      setDrawer(null); fetchMenus()
    } catch (e) { setFormErr(e.message) }
    finally { setDeleting(false) }
  }

  // ── Nutrition pills for large_portion ─────────────────────────────
  function NutPills({ p }) {
    if (!p) return null
    const pairs = [
      { label:'Energi', val: p.energi ?? p.kalori ?? p.calories, unit:'kcal' },
      { label:'Protein', val: p.protein, unit:'g' },
      { label:'Karbo', val: p.karbohidrat ?? p.karbo ?? p.carbs, unit:'g' },
      { label:'Lemak', val: p.lemak ?? p.fat, unit:'g' },
      { label:'Serat', val: p.serat ?? p.fiber, unit:'g' },
    ].filter(x => x.val != null)
    if (!pairs.length) return null
    return (
      <div className="dm-nut-pills">
        {pairs.map(x => (
          <span className="dm-nut-pill" key={x.label}>
            <b>{x.val}</b>{x.unit} {x.label}
          </span>
        ))}
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════
  return (
    <div className="dm-page">

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div className="dm-header">
        <div className="dm-header-left">
          <div className="dm-header-icon">🍱</div>
          <div>
            <h1 className="dm-title">Menu Harian</h1>
            <p className="dm-subtitle">Kelola set makanan untuk program MBG</p>
            <div className="dm-header-badge">
              <span>●</span> {menus.length} menu tersimpan
            </div>
          </div>
        </div>
        <div className="dm-header-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchMenus}><RefreshCw size={14}/></button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14}/> Tambah Menu</button>
        </div>
      </div>

      {/* ── ERROR ─────────────────────────────────────────────────── */}
      {error && (
        <div className="dm-alert">
          <AlertCircle size={14}/> {error}
          <button onClick={fetchMenus}>Coba lagi</button>
        </div>
      )}

      {/* ── TABLE CARD ────────────────────────────────────────────── */}
      <div className="dm-table-card">

        {loading ? (
          <div className="dm-state-center">
            <Loader2 size={22} className="dm-spin"/> Memuat menu…
          </div>
        ) : menus.length === 0 ? (
          <div className="dm-state-center dm-empty">
            <div className="dm-empty-icon">🍱</div>
            <p>Belum ada menu. Klik <strong>Tambah Menu</strong> untuk memulai.</p>
          </div>
        ) : (
          <table className="dm-tbl">
            <thead>
              <tr>
                <th style={{ width:48 }}>#</th>
                <th>Nama Menu</th>
                <th>Item Makanan</th>
                <th>Porsi Besar</th>
                <th style={{ width:96, textAlign:'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {menus.map((m, i) => {
                const foods = parseFoods(m.foods)
                return (
                  <tr key={m.id} className="dm-row">
                    <td className="dm-idx"><div className="dm-idx-bubble">{i + 1}</div></td>
                    <td>
                      <div className="dm-menu-name">{m.name}</div>
                      <div className="dm-menu-count">{foods.length} item</div>
                    </td>
                    <td>
                      <div className="dm-food-chips">
                        {foods.slice(0, 5).map((f, j) => (
                          <span className="dm-chip" key={j}>{f}</span>
                        ))}
                        {foods.length > 5 && (
                          <span className="dm-chip dm-chip-more">+{foods.length - 5}</span>
                        )}
                      </div>
                    </td>
                    <td><NutPills p={m.large_portion}/></td>
                    <td>
                      <div className="dm-row-actions">
                        <button className="dm-action-btn" title="Edit" onClick={() => openEdit(m)}>
                          <Pencil size={13}/>
                        </button>
                        <button className="dm-action-btn dm-action-del" title="Hapus" onClick={() => onDelete(m.id)}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className="dm-table-footer">
          {menus.length} menu · data dari Supabase
        </div>
      </div>

      {/* ── DRAWER ────────────────────────────────────────────────── */}
      {drawer && (
        <>
          <div className="dm-overlay" onClick={() => setDrawer(null)}/>
          <aside className="dm-drawer">

            <div className="dm-drawer-head">
              <div>
                <h2>{drawer === 'add' ? 'Tambah Menu Harian' : 'Edit Menu'}</h2>
                <div className="dm-drawer-head-sub">{drawer === 'add' ? 'Isi detail menu baru' : `Editing: ${drawer.name ?? ''}`}</div>
              </div>
              <button className="dm-drawer-close" onClick={() => setDrawer(null)}><X size={16}/></button>
            </div>

            <div className="dm-drawer-body">

              {formErr && (
                <div className="dm-form-err"><AlertCircle size={13}/> {formErr}</div>
              )}

              {/* Nama */}
              <div className="dm-form-group">
                <label className="dm-label">Nama Menu <span>*</span></label>
                <input
                  className="dm-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Menu Nasi Ayam Sayur"
                />
              </div>

              {/* Food items */}
              <div className="dm-form-group">
                <label className="dm-label">
                  Item Makanan <span>*</span>
                  <em>{form.foods.length} item</em>
                </label>

                {/* Selected tags */}
                {form.foods.length > 0 && (
                  <div className="dm-sel-list">
                    {form.foods.map((f, i) => (
                      <span className="dm-sel-tag" key={i}>
                        {f}
                        <button onClick={() => removeFood(i)}><X size={10}/></button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <div className="dm-search-wrap">
                  <Search size={13} className="dm-search-ic"/>
                  {sugLoading && <Loader2 size={13} className="dm-spin dm-search-loader"/>}
                  <input
                    ref={inputRef}
                    className="dm-input dm-search-input"
                    value={foodInput}
                    onChange={e => onFoodInput(e.target.value)}
                    onFocus={() => suggestions.length && setShowSug(true)}
                    onBlur={() => setTimeout(() => setShowSug(false), 150)}
                    onKeyDown={e => e.key === 'Enter' && addFood(foodInput)}
                    placeholder="Cari dari database atau ketik nama makanan…"
                  />
                </div>

                {/* Suggestions */}
                {showSug && suggestions.length > 0 && (
                  <div className="dm-suggestions">
                    {suggestions.map((s, i) => (
                      <button key={i} className="dm-sug-item" onMouseDown={() => addFood(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <p className="dm-hint">Tekan Enter atau pilih dari saran. Nilai nutrisi tidak perlu diisi.</p>
              </div>

            </div>{/* end dm-drawer-body */}

            {/* Actions */}
            <div className="dm-drawer-actions">
              {drawer !== 'add' && (
                <button className="dm-delete-btn" onClick={() => onDelete(drawer.id)} disabled={deleting}>
                  {deleting ? <Loader2 size={13} className="dm-spin"/> : <Trash2 size={13}/>}
                  Hapus
                </button>
              )}
              <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setDrawer(null)}>Batal</button>
                <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                  {saving && <Loader2 size={13} className="dm-spin"/>}
                  {saving ? 'Menyimpan…' : drawer === 'add' ? 'Simpan' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>

          </aside>
        </>
      )}
    </div>
  )
}
