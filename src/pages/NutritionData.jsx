import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Download, X, Trash2, MoreHorizontal, RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import './NutritionData.css'

const LIMIT = 15

const CAT_COLORS = {
  protein: 'p-protein',
  sayuran: 'p-sayur',
  buah: 'p-buah',
  karbohidrat: 'p-karbo',
  pelengkap: 'p-snack',
  snack: 'p-snack',
  minuman: 'p-minuman',
  other: 'p-other',
}

const THUMB_GRADS = [
  'linear-gradient(135deg,#fde68a,#d97706)',
  'linear-gradient(135deg,#bbf7d0,#16a34a)',
  'linear-gradient(135deg,#a5f3fc,#0891b2)',
  'linear-gradient(135deg,#fee2e2,#dc2626)',
  'linear-gradient(135deg,#fce7f3,#db2777)',
  'linear-gradient(135deg,#e0e7ff,#4f46e5)',
  'linear-gradient(135deg,#fef9c3,#fde047)',
  'linear-gradient(135deg,#dcfce7,#15803d)',
]

function thumbGrad(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return THUMB_GRADS[h % THUMB_GRADS.length]
}

function catClass(cat = '') {
  return CAT_COLORS[cat.toLowerCase()] ?? 'p-other'
}

function exportCSV(data) {
  const header = 'id,name,category,calories,protein,carbs,fat,fiber'
  const rows = data.map(f =>
    [f.id, `"${f.name}"`, f.category, f.calories, f.protein, f.carbs, f.fat, f.fiber].join(',')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: 'nutrition_data.csv' })
  a.click()
  URL.revokeObjectURL(url)
}

const EMPTY_FORM = { name: '', category: 'protein', calories: '', protein: '', carbs: '', fat: '', fiber: '' }

// ════════════════════════════════════════════════════════════════════
export default function NutritionData() {
  const [foods, setFoods] = useState([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)

  const [drawer, setDrawer] = useState(null)   // null | 'add' | food-object
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [selected, setSelected] = useState(new Set())
  const searchTimeout = useRef(null)

  // ── Fetch foods ─────────────────────────────────────────────────
  const fetchFoods = useCallback(async (opts = {}) => {
    setLoading(true)
    setError('')
    try {
      const offset = ((opts.page ?? page) - 1) * LIMIT
      const params = new URLSearchParams({
        limit: LIMIT,
        offset,
        ...(opts.search ?? search ? { search: opts.search ?? search } : {}),
        ...(opts.cat ?? catFilter ? { category: opts.cat ?? catFilter } : {}),
      })
      const res = await fetch(`/api/nutrition?${params}`)
      const json = await res.json()
      setFoods(json.data ?? [])
      setTotal(json.total ?? 0)
      setSelected(new Set())
    } catch {
      setError('Gagal memuat data. Pastikan backend berjalan.')
    } finally {
      setLoading(false)
    }
  }, [page, search, catFilter])

  // ── Fetch categories ────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/nutrition/categories')
      const json = await res.json()
      setCategories(Array.isArray(json) ? json : [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { fetchFoods() }, [fetchFoods])

  // ── Search debounce ─────────────────────────────────────────────
  const onSearch = (val) => {
    setSearch(val)
    setPage(1)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchFoods({ search: val, page: 1 })
    }, 350)
  }

  const onCatFilter = (cat) => {
    const next = catFilter === cat ? '' : cat
    setCatFilter(next)
    setPage(1)
    fetchFoods({ cat: next, page: 1 })
  }

  const onPage = (p) => {
    setPage(p)
    fetchFoods({ page: p })
  }

  // ── Sort (client-side within page) ─────────────────────────────
  const onSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const sorted = [...foods].sort((a, b) => {
    const va = a[sortKey] ?? '', vb = b[sortKey] ?? ''
    if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortAsc ? va - vb : vb - va
  })

  // ── Add / Edit form ─────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM)
    setFormErr('')
    setDrawer('add')
  }

  const openEdit = (f) => {
    setForm({
      name: f.name ?? '',
      category: f.category ?? 'protein',
      calories: f.calories ?? '',
      protein: f.protein ?? '',
      carbs: f.carbs ?? '',
      fat: f.fat ?? '',
      fiber: f.fiber ?? '',
    })
    setFormErr('')
    setDrawer(f)
  }

  const onFormChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const validateForm = () => {
    if (!form.name.trim()) return 'Nama makanan wajib diisi.'
    if (form.calories === '' || isNaN(+form.calories)) return 'Kalori harus berupa angka.'
    if (form.protein === '' || isNaN(+form.protein)) return 'Protein harus berupa angka.'
    if (form.carbs === '' || isNaN(+form.carbs)) return 'Karbohidrat harus berupa angka.'
    if (form.fat === '' || isNaN(+form.fat)) return 'Lemak harus berupa angka.'
    if (form.fiber === '' || isNaN(+form.fiber)) return 'Serat harus berupa angka.'
    return ''
  }

  const onSave = async () => {
    const err = validateForm()
    if (err) { setFormErr(err); return }
    setSaving(true)
    setFormErr('')
    const body = {
      name: form.name.trim(),
      category: form.category,
      calories: +form.calories,
      protein: +form.protein,
      carbs: +form.carbs,
      fat: +form.fat,
      fiber: +form.fiber,
    }
    try {
      const isEdit = drawer && drawer !== 'add'
      const url = isEdit ? `/api/nutrition/${drawer.id}` : '/api/nutrition'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Gagal menyimpan') }
      setDrawer(null)
      fetchFoods()
      fetchCategories()
    } catch (e) {
      setFormErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    if (!window.confirm('Hapus item ini dari database?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/nutrition/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus')
      setDrawer(null)
      fetchFoods()
      fetchCategories()
    } catch (e) {
      setFormErr(e.message)
    } finally {
      setDeleting(false)
    }
  }

  // ── Select all ──────────────────────────────────────────────────
  const allChecked = foods.length > 0 && foods.every(f => selected.has(f.id))
  const toggleAll = () => {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(foods.map(f => f.id)))
  }
  const toggleOne = (id) => {
    const n = new Set(selected)
    n.has(id) ? n.delete(id) : n.add(id)
    setSelected(n)
  }

  // ── Pagination ──────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  // ── Sort indicator ──────────────────────────────────────────────
  const si = (key) => sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ''

  // ════════════════════════════════════════════════════════════════
  return (
    <div className="nd-content">

      {/* PAGE HEADER */}
      <div className="page-head">
        <div>
          <h1>Food Nutrition Database</h1>
          <p>{total} item makanan Indonesia · digunakan untuk mapping RT-DETR → nutrisi · nilai per 100g</p>
        </div>
        <div className="page-acts">
          <button className="btn btn-outline btn-sm" onClick={() => exportCSV(foods)} disabled={foods.length === 0}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => fetchFoods()} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14} /> Tambah Makanan
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="nd-error">
          <AlertCircle size={15} />
          {error}
          <button onClick={() => fetchFoods()}>Coba lagi</button>
        </div>
      )}

      {/* FILTERS */}
      <div className="nd-filters">
        <div className="nd-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            placeholder="Cari nama makanan…"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
          {search && (
            <button className="nd-search-clear" onClick={() => onSearch('')}><X size={12} /></button>
          )}
        </div>

        <span
          className={`chip-sel ${catFilter === '' ? 'on' : ''}`}
          onClick={() => onCatFilter('')}
        >Semua</span>

        {categories.map(c => (
          <span
            key={c.category}
            className={`chip-sel ${catFilter === c.category ? 'on' : ''}`}
            onClick={() => onCatFilter(c.category)}
          >
            {c.category} <em>{c.count}</em>
          </span>
        ))}

        <div className="nd-filter-right">
          {loading ? 'Memuat…' : `${total} item · halaman ${page}/${totalPages}`}
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="nd-table-card">
        <div className="nd-table-head">
          <div className="nd-table-t">
            Semua Makanan <span className="nd-cnt">{total}</span>
            {selected.size > 0 && <span className="nd-cnt" style={{ background: '#fee2e2', color: '#b91c1c' }}>{selected.size} dipilih</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {selected.size > 0 && (
              <button className="btn nd-danger btn-sm">
                <Trash2 size={13} /> Hapus {selected.size} item
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="nd-loading"><Loader2 size={24} className="spin" /><span>Memuat data…</span></div>
        ) : foods.length === 0 ? (
          <div className="nd-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /></svg>
            <p>{search || catFilter ? 'Tidak ada hasil untuk filter ini.' : 'Belum ada data makanan.'}</p>
            {!search && !catFilter && (
              <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Tambah Makanan Pertama</button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  </th>
                  <th className="nd-sortable" onClick={() => onSort('name')}>Nama Makanan{si('name')}</th>
                  <th>Kategori</th>
                  <th className="nd-sortable" onClick={() => onSort('calories')}>Kalori{si('calories')}</th>
                  <th className="nd-sortable" onClick={() => onSort('protein')}>Protein{si('protein')}</th>
                  <th className="nd-sortable" onClick={() => onSort('carbs')}>Karbo{si('carbs')}</th>
                  <th className="nd-sortable" onClick={() => onSort('fat')}>Lemak{si('fat')}</th>
                  <th className="nd-sortable" onClick={() => onSort('fiber')}>Serat{si('fiber')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(f => (
                  <tr key={f.id} onClick={() => openEdit(f)} style={{ cursor: 'pointer' }}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleOne(f.id)} />
                    </td>
                    <td>
                      <div className="nd-name">
                        <div>
                          <div className="nd-nm">{f.name}</div>
                          <div className="nd-id">#{f.id?.toString().slice(-6) ?? '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`pill-cat ${catClass(f.category)}`}>{f.category}</span></td>
                    <td>{f.calories ?? '—'} <span style={{ color: 'var(--text-faint)' }}>kcal</span></td>
                    <td>{f.protein ?? '—'} g</td>
                    <td>{f.carbs ?? '—'} g</td>
                    <td>{f.fat ?? '—'} g</td>
                    <td>{f.fiber ?? '—'} g</td>
                    <td className="nd-act" onClick={e => e.stopPropagation()}>
                      <button className="act-btn" onClick={() => openEdit(f)}><MoreHorizontal size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="nd-foot">
            <div>{((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} dari {total} item</div>
            <div className="nd-pag">
              <a onClick={() => page > 1 && onPage(page - 1)} className={page <= 1 ? 'dis' : ''}>«</a>
              {pages.slice(Math.max(0, page - 3), Math.min(totalPages, page + 2)).map(p => (
                <a key={p} className={p === page ? 'on' : ''} onClick={() => onPage(p)}>{p}</a>
              ))}
              <a onClick={() => page < totalPages && onPage(page + 1)} className={page >= totalPages ? 'dis' : ''}>»</a>
            </div>
          </div>
        )}
        {!loading && totalPages <= 1 && foods.length > 0 && (
          <div className="nd-foot">
            <div>{foods.length} dari {total} item · {selected.size} dipilih</div>
          </div>
        )}
      </div>

      {/* DRAWER — Add / Edit */}
      {drawer && (
        <>
          <div className="nd-overlay" onClick={() => setDrawer(null)} />
          <aside className="nd-drawer">
            <div className="nd-drawer-head">
              <h3>{drawer === 'add' ? 'Tambah Makanan' : 'Edit Makanan'}</h3>
              <button className="nd-close" onClick={() => setDrawer(null)}><X size={18} /></button>
            </div>

            {drawer !== 'add' && (
              <div className="nd-preview">
                <div className="nd-pthumb" style={{ background: thumbGrad(form.name || drawer.name) }} />
                <div>
                  <div className="nd-pnm">{form.name || drawer.name}</div>
                  <div className="nd-pmeta">#{drawer.id?.toString().slice(-6)} · {form.category} · per 100g</div>
                </div>
              </div>
            )}

            {formErr && <div className="nd-form-err"><AlertCircle size={13} /> {formErr}</div>}

            <div className="nd-field">
              <label>Nama Makanan *</label>
              <input value={form.name} onChange={e => onFormChange('name', e.target.value)} placeholder="Contoh: Ayam Goreng" />
            </div>
            <div className="nd-field">
              <label>Kategori *</label>
              <select value={form.category} onChange={e => onFormChange('category', e.target.value)}>
                {['protein', 'sayuran', 'buah', 'karbohidrat', 'pelengkap', 'snack', 'minuman', 'other'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
                {categories.filter(c => !['protein', 'sayuran', 'buah', 'karbohidrat', 'pelengkap', 'snack', 'minuman', 'other'].includes(c.category)).map(c => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>
            </div>

            <h4 className="nd-section-label">Nilai Gizi per 100g</h4>
            <div className="nd-grid2">
              {[
                { k: 'calories', label: 'Kalori (kcal)' },
                { k: 'protein', label: 'Protein (g)' },
                { k: 'carbs', label: 'Karbohidrat (g)' },
                { k: 'fat', label: 'Lemak (g)' },
                { k: 'fiber', label: 'Serat (g)' },
              ].map(({ k, label }) => (
                <div className="nd-field" key={k}>
                  <label>{label} *</label>
                  <input type="number" min="0" step="0.1"
                    value={form[k]}
                    onChange={e => onFormChange(k, e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <div className="nd-drawer-actions">
              {drawer !== 'add' && (
                <button className="btn nd-danger" onClick={() => onDelete(drawer.id)} disabled={deleting}>
                  {deleting ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                  Hapus
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setDrawer(null)} style={{ marginLeft: drawer === 'add' ? 'auto' : 0 }}>
                Batal
              </button>
              <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
                {saving ? <Loader2 size={13} className="spin" /> : null}
                {saving ? 'Menyimpan…' : drawer === 'add' ? 'Simpan' : 'Simpan Perubahan'}
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
