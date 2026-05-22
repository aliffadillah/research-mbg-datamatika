import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import './AKG.css'

// ── Constants ────────────────────────────────────────────────────────────────
const API_BASE = '/api/akg'

const GROUPS = ['Semua', 'Bayi/Anak', 'Laki-Laki', 'Perempuan', 'Perbandingan']

const GROUP_OPTIONS = ['Bayi/Anak', 'Laki-Laki', 'Perempuan']

const GENDER_MAP = { 'Bayi/Anak': '-', 'Laki-Laki': 'L', 'Perempuan': 'P' }

// Empty form template
const EMPTY_FORM = {
  group_name: 'Bayi/Anak',
  age: '',
  gender: '-',
  weight: '',
  height: '',
  energy: '',
  fat: '',
  protein: '',
  carbs: '',
  fiber: '',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcPortion(value, lowPct, highPct) {
  return {
    low: Math.round(value * lowPct * 10) / 10,
    high: Math.round(value * highPct * 10) / 10,
  }
}

function getMax(data, key) {
  return Math.max(...data.map(d => d[key] ?? 0), 1)
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IconEnergy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IconProtein = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)
const IconFat = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c6.23-.05 7.87-5.57 7.5-10-.36-4.34-3.95-9.96-7.5-12-3.55 2.04-7.14 7.66-7.5 12-.37 4.43 1.27 9.95 7.5 10z" />
  </svg>
)
const IconCarbs = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h20" /><path d="M6 12a6 6 0 0 1 12 0" /><path d="M6 12a6 6 0 0 0 12 0" /><path d="M12 2v4" />
  </svg>
)
const IconFiber = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 20s-2-2-2-6 4-9 9-9c0 4-2 8-5 10" /><path d="M12 22c-2.5-1.5-4-4-4-7 0-3 1.5-5.5 4-7" />
  </svg>
)

function MiniBar({ value, max, color }) {
  const pct = Math.round((value / Math.max(max, 1)) * 100)
  return (
    <div className="mini-bar-wrap">
      <div className="mini-bar-track">
        <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Portion Card (dipakai di modal detail) ────────────────────────────────────
function PortionCard({ item, type, allData }) {
  const isBesar = type === 'besar'
  const lowPct = isBesar ? 0.30 : 0.20
  const highPct = isBesar ? 0.35 : 0.25
  const label = isBesar ? 'Porsi Besar' : 'Porsi Kecil'
  const pctLabel = isBesar ? '30–35%' : '20–25%'

  const maxEnergy = getMax(allData, 'energy')
  const maxFat = getMax(allData, 'fat')
  const maxProtein = getMax(allData, 'protein')
  const maxCarbs = getMax(allData, 'carbs')
  const maxFiber = getMax(allData, 'fiber')

  const nutrients = [
    { label: 'Energi', ...calcPortion(item.energy, lowPct, highPct), unit: 'kkal', icon: <IconEnergy />, color: 'var(--amber-500)', bg: 'rgba(245,158,11,0.10)', barPct: Math.min((calcPortion(item.energy, lowPct, highPct).high / maxEnergy) * 100, 100) },
    { label: 'Lemak', ...calcPortion(item.fat, lowPct, highPct), unit: 'g', icon: <IconFat />, color: 'var(--cyan-600)', bg: 'rgba(8,145,178,0.10)', barPct: Math.min((calcPortion(item.fat, lowPct, highPct).high / maxFat) * 100, 100) },
    { label: 'Protein', ...calcPortion(item.protein, lowPct, highPct), unit: 'g', icon: <IconProtein />, color: 'var(--red-500)', bg: 'rgba(239,68,68,0.10)', barPct: Math.min((calcPortion(item.protein, lowPct, highPct).high / maxProtein) * 100, 100) },
    { label: 'Karbohidrat', ...calcPortion(item.carbs, lowPct, highPct), unit: 'g', icon: <IconCarbs />, color: 'var(--emerald-500)', bg: 'rgba(16,185,129,0.10)', barPct: Math.min((calcPortion(item.carbs, lowPct, highPct).high / maxCarbs) * 100, 100) },
    { label: 'Serat', ...calcPortion(item.fiber, lowPct, highPct), unit: 'g', icon: <IconFiber />, color: 'var(--violet-500)', bg: 'rgba(139,92,246,0.10)', barPct: Math.min((calcPortion(item.fiber, lowPct, highPct).high / maxFiber) * 100, 100) },
  ]

  return (
    <div className={`portion-card ${isBesar ? 'portion-besar' : 'portion-kecil'}`}>
      <div className="portion-header">
        <div className={`portion-badge ${isBesar ? 'badge-besar' : 'badge-kecil'}`}>
          {label}
        </div>
        <span className="portion-pct">{pctLabel} dari AKG</span>
      </div>
      <div className="portion-nutrients">
        {nutrients.map((n, i) => (
          <div className="nutrient-row" key={i} style={{ '--nutrient-color': n.color, '--nutrient-bg': n.bg }}>
            <div className="nutrient-icon">{n.icon}</div>
            <div className="nutrient-info">
              <span className="nutrient-label">{n.label}</span>
              <span className="nutrient-range">{n.low} – {n.high} {n.unit}</span>
            </div>
            <div className="nutrient-bar-wrap">
              <div className="nutrient-bar">
                <div className="nutrient-fill" style={{ width: `${n.barPct}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ item, allData, onClose, onEdit }) {
  if (!item) return null
  return (
    <div className="akg-overlay" onClick={onClose}>
      <div className="akg-modal" onClick={e => e.stopPropagation()}>
        <button className="akg-modal-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>

        <div className="modal-hero">
          <div className="modal-hero-icon">
            {item.group_name === 'Bayi/Anak' && '👶'}
            {item.group_name === 'Laki-Laki' && '👦'}
            {item.group_name === 'Perempuan' && '👧'}
          </div>
          <h2>{item.age}</h2>
          <p className="modal-group">{item.group_name}</p>
          <div className="modal-stats">
            <span>BB: <strong>{item.weight} kg</strong></span>
            <span className="modal-divider">•</span>
            <span>TB: <strong>{item.height} cm</strong></span>
          </div>
        </div>

        <div className="modal-akg-summary">
          <h3>Nilai AKG Harian</h3>
          <div className="modal-akg-grid">
            {[
              { label: 'Energi', value: item.energy, unit: 'kkal', color: '#f59e0b', max: getMax(allData, 'energy') },
              { label: 'Lemak', value: item.fat, unit: 'g', color: '#0891b2', max: getMax(allData, 'fat') },
              { label: 'Protein', value: item.protein, unit: 'g', color: '#ef4444', max: getMax(allData, 'protein') },
              { label: 'Karbohidrat', value: item.carbs, unit: 'g', color: '#10b981', max: getMax(allData, 'carbs') },
              { label: 'Serat', value: item.fiber, unit: 'g', color: '#8b5cf6', max: getMax(allData, 'fiber') },
            ].map((n, i) => (
              <div className="modal-akg-item" key={i} style={{ '--item-color': n.color }}>
                <div className="modal-akg-val">{n.value}<small>{n.unit}</small></div>
                <div className="modal-akg-bar-wrap">
                  <div className="modal-akg-bar">
                    <div className="modal-akg-bar-fill" style={{ width: `${Math.round((n.value / n.max) * 100)}%`, background: n.color }} />
                  </div>
                </div>
                <div className="modal-akg-label">{n.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-mbg-label">
          Porsi MBG berdasarkan % AKG
        </div>

        <div className="modal-portions">
          <PortionCard item={item} type="besar" allData={allData} />
          <PortionCard item={item} type="kecil" allData={allData} />
        </div>

        <div className="modal-actions">
          <button className="btn-modal-edit" onClick={() => { onClose(); onEdit(item) }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
            Edit Data Ini
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit / Add Form Modal ─────────────────────────────────────────────────────
function FormModal({ mode, initial, onClose, onSaved }) {
  // mode: 'add' | 'edit'
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const firstRef = useRef(null)

  useEffect(() => {
    // auto-set gender when group changes
    setForm(f => ({ ...f, gender: GENDER_MAP[f.group_name] ?? '-' }))
  }, [form.group_name])

  useEffect(() => { firstRef.current?.focus() }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrMsg('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrMsg('')
    const numFields = ['weight', 'height', 'energy', 'fat', 'protein', 'carbs', 'fiber']
    for (const f of numFields) {
      if (form[f] === '' || isNaN(Number(form[f]))) {
        return setErrMsg(`Nilai "${f}" harus berupa angka`)
      }
    }
    if (!form.age.trim()) return setErrMsg('Kelompok usia wajib diisi')

    setSaving(true)
    try {
      const url = mode === 'edit' ? `${API_BASE}/${initial.id}` : API_BASE
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          weight: Number(form.weight),
          height: Number(form.height),
          energy: Number(form.energy),
          fat: Number(form.fat),
          protein: Number(form.protein),
          carbs: Number(form.carbs),
          fiber: Number(form.fiber),
        }),
      })
      const json = await res.json()
      if (!res.ok) return setErrMsg(json.error || 'Gagal menyimpan')
      onSaved(json)
    } catch {
      setErrMsg('Koneksi ke server gagal')
    } finally {
      setSaving(false)
    }
  }

  const FIELDS = [
    { name: 'energy', label: 'Energi', unit: 'kkal', color: '#f59e0b' },
    { name: 'fat', label: 'Lemak', unit: 'g', color: '#0891b2' },
    { name: 'protein', label: 'Protein', unit: 'g', color: '#ef4444' },
    { name: 'carbs', label: 'Karbohidrat', unit: 'g', color: '#10b981' },
    { name: 'fiber', label: 'Serat', unit: 'g', color: '#8b5cf6' },
    { name: 'weight', label: 'Berat Badan', unit: 'kg', color: '#64748b' },
    { name: 'height', label: 'Tinggi Badan', unit: 'cm', color: '#64748b' },
  ]

  return (
    <div className="akg-overlay" onClick={onClose}>
      <div className="akg-form-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="akg-form-header">
          <div className="akg-form-title">
            <div className={`akg-form-icon ${mode === 'edit' ? 'icon-edit' : 'icon-add'}`}>
              {mode === 'edit'
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
              }
            </div>
            <div>
              <h2>{mode === 'edit' ? 'Edit Data AKG' : 'Tambah Data AKG'}</h2>
              <p>{mode === 'edit' ? `ID #${initial.id} · ${initial.age}` : 'Tambah kelompok umur baru'}</p>
            </div>
          </div>
          <button className="akg-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        {/* Form */}
        <form className="akg-form-body" onSubmit={handleSubmit}>
          {/* Kelompok & Usia */}
          <div className="akg-form-row">
            <div className="akg-form-field">
              <label>Kelompok Umur</label>
              <select name="group_name" value={form.group_name} onChange={handleChange} ref={firstRef}>
                {GROUP_OPTIONS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="akg-form-field">
              <label>Rentang Usia</label>
              <input
                name="age"
                placeholder="cth: 10-12 Tahun"
                value={form.age}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="akg-form-section-label">
            Nilai Gizi Harian (AKG)
          </div>

          {/* Nutrient fields — 2 columns */}
          <div className="akg-form-grid">
            {FIELDS.map(f => (
              <div className="akg-form-field" key={f.name}>
                <label style={{ color: f.color !== '#64748b' ? f.color : undefined }}>{f.label}</label>
                <div className="akg-form-input-wrap">
                  <input
                    type="number"
                    name={f.name}
                    min="0"
                    step="0.1"
                    placeholder="0"
                    value={form[f.name]}
                    onChange={handleChange}
                  />
                  <span className="akg-form-unit">{f.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* MBG Preview */}
          {form.energy && !isNaN(Number(form.energy)) && Number(form.energy) > 0 && (
            <div className="akg-form-preview">
              <div className="akg-form-preview-title">Preview Porsi MBG</div>
              <div className="akg-form-preview-row">
                <span className="prev-besar">
                  🍽️ Porsi Besar (30–35%)
                  <strong>{calcPortion(Number(form.energy), 0.30, 0.35).low} – {calcPortion(Number(form.energy), 0.30, 0.35).high} kkal</strong>
                </span>
                <span className="prev-kecil">
                  🥗 Porsi Kecil (20–25%)
                  <strong>{calcPortion(Number(form.energy), 0.20, 0.25).low} – {calcPortion(Number(form.energy), 0.20, 0.25).high} kkal</strong>
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {errMsg && (
            <div className="akg-form-error">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
              {errMsg}
            </div>
          )}

          {/* Actions */}
          <div className="akg-form-actions">
            <button type="button" className="btn-form-cancel" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-form-save" disabled={saving}>
              {saving
                ? <><span className="btn-spinner" />Menyimpan…</>
                : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>{mode === 'edit' ? 'Simpan Perubahan' : 'Tambah Data'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ item, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function handleDelete() {
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/${item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json()
        return setErr(j.error || 'Gagal menghapus')
      }
      onDeleted(item.id)
    } catch {
      setErr('Koneksi ke server gagal')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="akg-overlay" onClick={onClose}>
      <div className="akg-confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="akg-confirm-icon">🗑️</div>
        <h3>Hapus Data AKG?</h3>
        <p>
          <strong>{item.age}</strong> ({item.group_name}) akan dihapus permanen dari database.
          Tindakan ini tidak bisa dibatalkan.
        </p>
        {err && <div className="akg-form-error">{err}</div>}
        <div className="akg-confirm-actions">
          <button className="btn-form-cancel" onClick={onClose}>Batal</button>
          <button className="btn-confirm-delete" onClick={handleDelete} disabled={busy}>
            {busy ? <><span className="btn-spinner" />Menghapus…</> : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function AKG() {
  const [akgData, setAkgData] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [activeGroup, setActiveGroup] = useState('Semua')
  const [portionView, setPortionView] = useState('besar')
  const [detailItem, setDetailItem] = useState(null)
  const [editItem, setEditItem] = useState(null)    // item being edited
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteItem, setDeleteItem] = useState(null)
  const [toast, setToast] = useState(null)    // { msg, type }

  // ── Toast helper ──────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Fetch data from API ───────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const res = await fetch(API_BASE)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setAkgData(json.data ?? [])
    } catch (e) {
      setApiError('Gagal memuat data dari server. Pastikan backend berjalan.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Auto-seed on first load if empty ─────────────────────────────
  useEffect(() => {
    async function init() {
      await fetchData()
      // After first fetch, seed if empty
      const res = await fetch(API_BASE)
      const json = await res.json()
      if ((json.data ?? []).length === 0) {
        await fetch(`${API_BASE}/seed`, { method: 'POST' })
        await fetchData()
      }
    }
    init()
  }, [fetchData])

  // ── Filtered + derived data ───────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeGroup === 'Semua' || activeGroup === 'Perbandingan') return akgData
    return akgData.filter(d => d.group_name === activeGroup)
  }, [akgData, activeGroup])

  const summary = useMemo(() => {
    if (!filtered.length) return { avgEnergy: 0, avgProtein: 0, maxEnergy: 0, minEnergy: 0, count: 0 }
    return {
      avgEnergy: Math.round(filtered.reduce((a, d) => a + d.energy, 0) / filtered.length),
      avgProtein: Math.round(filtered.reduce((a, d) => a + d.protein, 0) / filtered.length),
      maxEnergy: Math.max(...filtered.map(d => d.energy)),
      minEnergy: Math.min(...filtered.map(d => d.energy)),
      count: filtered.length,
    }
  }, [filtered])

  const lowPct = portionView === 'besar' ? 0.30 : 0.20
  const highPct = portionView === 'besar' ? 0.35 : 0.25

  const maxEnergy = getMax(akgData, 'energy')
  const maxFat = getMax(akgData, 'fat')
  const maxProtein = getMax(akgData, 'protein')
  const maxCarbs = getMax(akgData, 'carbs')
  const maxFiber = getMax(akgData, 'fiber')

  // ── CRUD callbacks ────────────────────────────────────────────────
  function handleSaved(savedItem) {
    setAkgData(prev => {
      const idx = prev.findIndex(d => d.id === savedItem.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = savedItem
        return next
      }
      return [...prev, savedItem]
    })
    setEditItem(null)
    setShowAddForm(false)
    showToast(editItem ? 'Data AKG berhasil diperbarui ✓' : 'Data AKG baru berhasil ditambahkan ✓')
  }

  function handleDeleted(id) {
    setAkgData(prev => prev.filter(d => d.id !== id))
    setDeleteItem(null)
    showToast('Data AKG berhasil dihapus', 'warn')
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="akg-page">

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div className={`akg-toast ${toast.type === 'warn' ? 'toast-warn' : 'toast-ok'}`}>
          {toast.type === 'warn'
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="akg-header">
        <div className="akg-header-text">
          <h1>
            Angka Kebutuhan Gizi
          </h1>
          <p>Referensi AKG berdasarkan kelompok umur — porsi MBG dihitung otomatis. Data tersimpan di database &amp; bisa diedit.</p>
        </div>
        <div className="akg-header-right">
          <div className="akg-portion-toggle">
            <button className={`apt-btn ${portionView === 'besar' ? 'active' : ''}`} onClick={() => setPortionView('besar')}>
              Porsi Besar <small>30–35%</small>
            </button>
            <button className={`apt-btn ${portionView === 'kecil' ? 'active' : ''}`} onClick={() => setPortionView('kecil')}>
              Porsi Kecil <small>20–25%</small>
            </button>
          </div>
          <button className="btn-akg-add" onClick={() => setShowAddForm(true)}>
            + Tambah Data
          </button>
        </div>
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────────────── */}
      <div className="akg-filters">
        {GROUPS.map(g => (
          <button key={g} className={`akg-tab ${activeGroup === g ? 'active' : ''}`} onClick={() => setActiveGroup(g)}>
            {g === 'Bayi/Anak'}{g === 'Laki-Laki'}{g === 'Perempuan'}{g === 'Semua'}{g === 'Perbandingan'}{g}
          </button>
        ))}
        <button className="akg-tab akg-tab-refresh" onClick={fetchData} title="Refresh dari database">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
          Refresh
        </button>
      </div>

      {/* ── API Error Banner ─────────────────────────────────────────── */}
      {apiError && (
        <div className="akg-api-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
          <div>
            <strong>Koneksi database gagal</strong>
            <p>{apiError}</p>
          </div>
          <button onClick={fetchData}>Coba Lagi</button>
        </div>
      )}

      {/* ── Loading Skeleton ─────────────────────────────────────────── */}
      {loading && (
        <div className="akg-skeleton-wrap">
          {[...Array(4)].map((_, i) => <div key={i} className="akg-skeleton" />)}
        </div>
      )}

      {!loading && !apiError && (
        <>
          {activeGroup !== 'Perbandingan' && (
            <div className="akg-summary-row">
              <div className="akg-summary-card">
                <div className="asg-icon asg-energy"><IconEnergy /></div>
                <div className="asg-info">
                  <div className="asg-val">{summary.avgEnergy} <small>kkal</small></div>
                  <div className="asg-label">Rata-rata Energi</div>
                </div>
              </div>
              <div className="akg-summary-card">
                <div className="asg-icon asg-protein"><IconProtein /></div>
                <div className="asg-info">
                  <div className="asg-val">{summary.avgProtein} <small>g</small></div>
                  <div className="asg-label">Rata-rata Protein</div>
                </div>
              </div>
              <div className="akg-summary-card">
                <div className="asg-icon asg-range">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
                </div>
                <div className="asg-info">
                  <div className="asg-val">{summary.minEnergy}–{summary.maxEnergy} <small>kkal</small></div>
                  <div className="asg-label">Rentang Energi</div>
                </div>
              </div>
              <div className="akg-summary-card">
                <div className="asg-icon asg-count">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <div className="asg-info">
                  <div className="asg-val">{summary.count} <small>/ {akgData.length}</small></div>
                  <div className="asg-label">Kelompok Umur</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Referensi Table (sembunyikan di tab Perbandingan) ─────────────────── */}
          {activeGroup !== 'Perbandingan' && (
            <div className="akg-main">
              <div className="card akg-table-card">
                <h3>
                  Tabel Referensi AKG
                </h3>
                <div className="akg-table-wrap">
                  <table className="tbl akg-tbl">
                    <thead>
                      <tr>
                        <th>Kelompok Umur</th>
                        <th>BB (kg)</th>
                        <th>TB (cm)</th>
                        <th><span className="th-energy">Energi (kkal)</span></th>
                        <th>Lemak (g)</th>
                        <th>Protein (g)</th>
                        <th>Karbohidrat (g)</th>
                        <th>Serat (g)</th>
                        <th className={portionView === 'besar' ? 'th-besar' : 'th-kecil'}>
                          {portionView === 'besar' ? '🍽️ Porsi Besar (30–35%)' : '🥗 Porsi Kecil (20–25%)'}
                        </th>
                        <th className="th-actions">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                            Tidak ada data AKG untuk kelompok ini.
                          </td>
                        </tr>
                      ) : filtered.map((item, i) => {
                        const portionEnergy = calcPortion(item.energy, lowPct, highPct)
                        const portionProtein = calcPortion(item.protein, lowPct, highPct)
                        const portionCarbs = calcPortion(item.carbs, lowPct, highPct)
                        const isGroupHeader = i === 0 || filtered[i - 1]?.group_name !== item.group_name

                        return (
                          <tr key={item.id} className="akg-row" onClick={() => setDetailItem(item)}>
                            <td>
                              <div className="akg-age-cell">
                                {isGroupHeader && (
                                  <span className="akg-group-badge">
                                    {item.group_name}
                                  </span>
                                )}
                                <span className="akg-age">{item.age}</span>
                              </div>
                            </td>
                            <td>
                              <div className="td-energy-cell">{item.weight}<MiniBar value={item.weight} max={80} color="#64748b" /></div>
                            </td>
                            <td>
                              <div className="td-energy-cell">{item.height}<MiniBar value={item.height} max={200} color="#64748b" /></div>
                            </td>
                            <td>
                              <div className="td-energy-cell">
                                <strong className="td-energy">{item.energy}</strong>
                                <MiniBar value={item.energy} max={maxEnergy} color="#f59e0b" />
                              </div>
                            </td>
                            <td><div className="td-energy-cell">{item.fat}<MiniBar value={item.fat} max={maxFat} color="#0891b2" /></div></td>
                            <td><div className="td-energy-cell">{item.protein}<MiniBar value={item.protein} max={maxProtein} color="#ef4444" /></div></td>
                            <td><div className="td-energy-cell">{item.carbs}<MiniBar value={item.carbs} max={maxCarbs} color="#10b981" /></div></td>
                            <td><div className="td-energy-cell">{item.fiber}<MiniBar value={item.fiber} max={maxFiber} color="#8b5cf6" /></div></td>
                            <td>
                              <div className="td-portion-block">
                                <div className={`td-portion-val ${portionView === 'besar' ? 'td-besar' : 'td-kecil'}`}>
                                  {portionEnergy.low} – {portionEnergy.high}<small> kkal</small>
                                </div>
                                <div className="td-portion-macros">
                                  <span>P: {portionProtein.low}–{portionProtein.high}g</span>
                                  <span>K: {portionCarbs.low}–{portionCarbs.high}g</span>
                                </div>
                              </div>
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              <div className="td-actions">
                                <button className="btn-tbl-edit" title="Edit baris ini" onClick={() => setEditItem(item)}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                                </button>
                                <button className="btn-tbl-delete" title="Hapus baris ini" onClick={() => setDeleteItem(item)}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6 18.1 20a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeGroup === 'Perbandingan' && (
            <div className="akg-portion-section">
              <h2 className="akg-section-title">Perbandingan Porsi MBG</h2>
              <p className="akg-section-sub">Pembagian nilai gizi per porsi makan — klik kartu untuk detail lengkap</p>
              <div className="akg-portion-grid">
                {akgData.map((item) => (
                  <div className="akg-portion-entry" key={item.id} onClick={() => setDetailItem(item)}>
                    <div className="ape-header">
                      <div>
                        <div className="ape-age">{item.age}</div>
                        <div className="ape-group">{item.group_name}</div>
                      </div>
                      <div className="ape-akg-total">
                        <span>{item.energy}</span>
                        <small>kkal/hari</small>
                      </div>
                    </div>
                    <div className="ape-body">
                      <div className="ape-col ape-besar">
                        <div className="ape-col-title">Porsi Besar</div>
                        <div className="ape-col-pct">30–35% AKG</div>
                        <div className="ape-energy">
                          {calcPortion(item.energy, 0.30, 0.35).low}<span className="ape-energy-sep">–</span>{calcPortion(item.energy, 0.30, 0.35).high}
                        </div>
                        <div className="ape-unit">kkal / sajian</div>
                        <div className="ape-macros">
                          <span>P: {calcPortion(item.protein, 0.30, 0.35).low}–{calcPortion(item.protein, 0.30, 0.35).high}g</span>
                          <span>L: {calcPortion(item.fat, 0.30, 0.35).low}–{calcPortion(item.fat, 0.30, 0.35).high}g</span>
                          <span>K: {calcPortion(item.carbs, 0.30, 0.35).low}–{calcPortion(item.carbs, 0.30, 0.35).high}g</span>
                        </div>
                      </div>
                      <div className="ape-divider" />
                      <div className="ape-col ape-kecil">
                        <div className="ape-col-title">Porsi Kecil</div>
                        <div className="ape-col-pct">20–25% AKG</div>
                        <div className="ape-energy">
                          {calcPortion(item.energy, 0.20, 0.25).low}<span className="ape-energy-sep">–</span>{calcPortion(item.energy, 0.20, 0.25).high}
                        </div>
                        <div className="ape-unit">kkal / sajian</div>
                        <div className="ape-macros">
                          <span>P: {calcPortion(item.protein, 0.20, 0.25).low}–{calcPortion(item.protein, 0.20, 0.25).high}g</span>
                          <span>L: {calcPortion(item.fat, 0.20, 0.25).low}–{calcPortion(item.fat, 0.20, 0.25).high}g</span>
                          <span>K: {calcPortion(item.carbs, 0.20, 0.25).low}–{calcPortion(item.carbs, 0.20, 0.25).high}g</span>
                        </div>
                      </div>
                    </div>
                    <div className="ape-energy-bar">
                      <div className="ape-energy-bar-besar" style={{ width: '32.5%' }} />
                      <div className="ape-energy-bar-kecil" style={{ width: '22.5%' }} />
                    </div>
                    <div className="ape-energy-bar-labels">
                      <span>Besar ~32.5%</span><span>Kecil ~22.5%</span><span>Sisa 45%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Info Banner ───────────────────────────────────────────── */}
          <div className="akg-info-banner">
            <div className="akg-info-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            </div>
            <div className="akg-info-text">
              <strong>Tentang Porsi dalam Program MBG</strong>
              <p>
                <strong>Porsi Besar (30–35% AKG)</strong> diperuntukkan sebagai makan siang utama.
                <strong> Porsi Kecil (20–25% AKG)</strong> digunakan untuk makan pagi atau makanan selingan.
                Data AKG tersimpan di database Supabase dan dapat diedit sesuai pembaruan Permenkes RI.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <DetailModal
        item={detailItem}
        allData={akgData}
        onClose={() => setDetailItem(null)}
        onEdit={(item) => setEditItem(item)}
      />

      {editItem && (
        <FormModal
          mode="edit"
          initial={{ ...editItem, weight: String(editItem.weight), height: String(editItem.height), energy: String(editItem.energy), fat: String(editItem.fat), protein: String(editItem.protein), carbs: String(editItem.carbs), fiber: String(editItem.fiber) }}
          onClose={() => setEditItem(null)}
          onSaved={handleSaved}
        />
      )}

      {showAddForm && (
        <FormModal
          mode="add"
          initial={EMPTY_FORM}
          onClose={() => setShowAddForm(false)}
          onSaved={handleSaved}
        />
      )}

      {deleteItem && (
        <DeleteConfirm
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
