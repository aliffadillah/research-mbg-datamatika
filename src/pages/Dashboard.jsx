import { useState, useEffect } from 'react'
import './Dashboard.css'

// ── Helpers ────────────────────────────────────────────────────────
const round1 = (n) => Math.round((n ?? 0) * 10) / 10
const fmtNum = (n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(Math.round(n)))

function parseJSON(str, fallback) {
  if (!str) return fallback
  if (typeof str === 'object') return str
  try { return JSON.parse(str) } catch { return fallback }
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

const THUMB_COLORS = [
  'linear-gradient(135deg,#fde68a,#d97706)',
  'linear-gradient(135deg,#bbf7d0,#16a34a)',
  'linear-gradient(135deg,#a5f3fc,#0891b2)',
  'linear-gradient(135deg,#fecaca,#ef4444)',
  'linear-gradient(135deg,#ddd6fe,#7c3aed)',
]

const DONUT_COLORS = ['#16a34a', '#f59e0b', '#0891b2', '#a78bfa']
const DONUT_LABELS = ['Carbohydrates', 'Protein', 'Fat', 'Fiber']
const DONUT_KEYS   = ['carbs', 'protein', 'fat', 'fiber']

// ── Spark bar sparkline ────────────────────────────────────────────
function Spark({ vals }) {
  if (!vals?.length) return null
  const max = Math.max(...vals, 1)
  return (
    <div className="spark">
      {vals.map((v, i) => <i key={i} style={{ height: `${Math.round((v / max) * 100)}%` }} />)}
    </div>
  )
}

// ── Donut chart ────────────────────────────────────────────────────
function DonutChart({ totals }) {
  const vals = DONUT_KEYS.map(k => totals[k] ?? 0)
  const sum  = vals.reduce((a, b) => a + b, 0) || 1
  const circumference = 2 * Math.PI * 40  // r=40
  let offset = 0
  const slices = vals.map((v, i) => {
    const frac = v / sum
    const dash = frac * circumference
    const slice = { dash, offset, color: DONUT_COLORS[i] }
    offset += dash
    return slice
  })

  return (
    <svg viewBox="0 0 100 100" width="170" height="170">
      {slices.map((s, i) => (
        <circle key={i} cx="50" cy="50" r="40" fill="none"
          stroke={s.color} strokeWidth="14"
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={-s.offset}
        />
      ))}
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [histories, setHistories]     = useState([])
  const [categories, setCategories]   = useState([])
  const [aiStatus, setAiStatus]       = useState(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [histRes, catRes, aiRes] = await Promise.allSettled([
          fetch('/api/history?limit=50').then(r => r.json()),
          fetch('/api/nutrition/categories').then(r => r.json()),
          fetch('/api/health').then(r => r.json()),
        ])
        if (histRes.status === 'fulfilled') setHistories(histRes.value.data ?? [])
        if (catRes.status  === 'fulfilled') setCategories(Array.isArray(catRes.value) ? catRes.value : [])
        if (aiRes.status   === 'fulfilled') setAiStatus(aiRes.value)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  // ── Derived KPI values ──────────────────────────────────────────
  const totalDetections = histories.reduce((acc, h) => {
    const dets = parseJSON(h.detections, [])
    return acc + (Array.isArray(dets) ? dets.length : 0)
  }, 0)

  const totalCalories = histories.reduce((acc, h) => {
    const ns = parseJSON(h.nutrition_summary, {})
    return acc + (ns.calories ?? 0)
  }, 0)

  const avgProtein = histories.length
    ? round1(histories.reduce((acc, h) => {
        const ns = parseJSON(h.nutrition_summary, {})
        return acc + (ns.protein ?? 0)
      }, 0) / histories.length)
    : 0

  const compliantCount = histories.filter(h => {
    const c = parseJSON(h.mbg_compliance, {})
    return c.compliant === true
  }).length
  const complianceRate = histories.length ? round1((compliantCount / histories.length) * 100) : 0

  // ── Spark values: last 7 records (item count) ───────────────────
  const last7 = histories.slice(0, 7).reverse()
  const spark1 = last7.map(h => parseJSON(h.detections, []).length || 1)
  const spark2 = last7.map(h => parseJSON(h.nutrition_summary, {}).calories || 0)
  const spark3 = last7.map(h => parseJSON(h.nutrition_summary, {}).protein || 0)
  const spark4 = last7.map(h => {
    const c = parseJSON(h.mbg_compliance, {})
    return c.compliant ? 100 : 50
  })

  const KPI_DATA = [
    { icon:'scan', label:'Total Item Terdeteksi', value: fmtNum(totalDetections), color:'k1', bars: spark1, up: true, delta: `${histories.length} sesi` },
    { icon:'fire', label:'Total Kalori Dipantau', value: fmtNum(totalCalories), unit:'kcal', color:'k2', bars: spark2, up: true, delta: `${histories.length} foto` },
    { icon:'heart', label:'Rata-rata Protein/Makan', value: String(avgProtein), unit:'g', color:'k3', bars: spark3, up: avgProtein >= 20, delta: avgProtein >= 20 ? '≥ target' : '< target' },
    { icon:'check', label:'Tingkat Kepatuhan MBG', value: String(complianceRate), unit:'%', color:'k4', bars: spark4, up: complianceRate >= 80, delta: `${compliantCount}/${histories.length} sesi` },
  ]

  // ── Nutrition totals for donut ──────────────────────────────────
  const nutTotals = histories.reduce((acc, h) => {
    const ns = parseJSON(h.nutrition_summary, {})
    return {
      carbs:   acc.carbs   + (ns.carbs   ?? 0),
      protein: acc.protein + (ns.protein ?? 0),
      fat:     acc.fat     + (ns.fat     ?? 0),
      fiber:   acc.fiber   + (ns.fiber   ?? 0),
    }
  }, { carbs: 0, protein: 0, fat: 0, fiber: 0 })

  const avgKcalPerMeal = histories.length
    ? Math.round(totalCalories / histories.length)
    : 0

  // ── Donut legend values ─────────────────────────────────────────
  const nutSum = (nutTotals.carbs + nutTotals.protein + nutTotals.fat + nutTotals.fiber) || 1
  const DONUT = DONUT_KEYS.map((k, i) => ({
    label: DONUT_LABELS[i],
    color: DONUT_COLORS[i],
    pct: `${Math.round((nutTotals[k] / nutSum) * 100)}%`,
    val: `${Math.round(nutTotals[k] / (histories.length || 1))}g`,
  }))

  // ── Recent uploads table ────────────────────────────────────────
  const recentRows = histories.slice(0, 5).map((h, i) => {
    const dets = parseJSON(h.detections, [])
    const ns   = parseJSON(h.nutrition_summary, {})
    const comp = parseJSON(h.mbg_compliance, {})
    const avgConf = dets.length
      ? Math.round(dets.reduce((a, d) => a + (d.confidence ?? 0), 0) / dets.length * 100)
      : 0
    return {
      filename: h.filename ?? 'unknown.jpg',
      time: timeAgo(h.created_at),
      items: `${dets.length} item · ${Math.round(ns.calories ?? 0)} kcal`,
      conf: avgConf,
      compliant: comp.compliant === true,
      bg: THUMB_COLORS[i % THUMB_COLORS.length],
      portion: comp.portion_label ?? h.portion ?? '-',
    }
  })

  // ── Confidence distribution ─────────────────────────────────────
  const allConf = histories.flatMap(h => parseJSON(h.detections, []).map(d => (d.confidence ?? 0) * 100))
  const confTotal = allConf.length || 1
  const confBands = [
    { label: '≥95%', min: 95, max: 101, color: 'linear-gradient(135deg,#16a34a,#15803d)', legend: 'High confidence (auto-approved)', lc: '#15803d' },
    { label: '90–95%', min: 90, max: 95, color: 'linear-gradient(135deg,#84cc16,#65a30d)', legend: 'Good', lc: '#65a30d' },
    { label: '80–90%', min: 80, max: 90, color: 'linear-gradient(135deg,#f59e0b,#d97706)', legend: 'Review recommended', lc: '#d97706' },
    { label: '<80%',  min: 0,  max: 80, color: 'linear-gradient(135deg,#ef4444,#b91c1c)', legend: 'Manual review required', lc: '#b91c1c' },
  ].map(b => {
    const cnt = allConf.filter(c => c >= b.min && c < b.max).length
    const pct = Math.round((cnt / confTotal) * 100)
    return { ...b, pct, cnt }
  })

  // ── AI Status ──────────────────────────────────────────────────
  const aiOnline = aiStatus?.status === 'ok'
  const avgConfAll = allConf.length
    ? round1(allConf.reduce((a, b) => a + b, 0) / allConf.length)
    : 0

  // gauge offset: circumference=503, full=503, so offset = 503*(1-frac)
  const gaugeOffset = Math.round(503 * (1 - avgConfAll / 100))

  // ── Category top list ──────────────────────────────────────────
  const topCats = categories.slice(0, 5)
  const maxCat  = topCats[0]?.count || 1

  if (loading) {
    return (
      <div className="dash-content dash-loading">
        <div className="dash-spinner" />
        <p>Memuat data dashboard…</p>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════
  return (
    <div className="dash-content">

      {/* KPI ROW */}
      {KPI_DATA.map((k, i) => (
        <div className="card kpi" key={i}>
          <div className="kpi-top">
            <div className={`kpi-ic ${k.color}`}>
              {k.icon === 'scan' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>}
              {k.icon === 'fire' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.13-1-3.5-1-4 0 0 4 1 6 4 1 1.5 1 3 1 4a4 4 0 1 1-8 0c0-.36.04-.71.12-1"/></svg>}
              {k.icon === 'heart' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>}
              {k.icon === 'check' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            </div>
            <span className={`kpi-delta ${k.up ? '' : 'dn'}`}>{k.delta}</span>
          </div>
          <div className="kpi-val">{k.value}{k.unit && <span className="kpi-u">{k.unit}</span>}</div>
          <div className="kpi-lbl">{k.label}</div>
          <Spark vals={k.bars} />
        </div>
      ))}

      {/* RECENT UPLOADS TABLE */}
      <div className="card c-table">
        <h3>Deteksi Terbaru <span className="more">{histories.length} total →</span></h3>
        <div className="sub">5 sesi deteksi terakhir dari database</div>
        {recentRows.length === 0 ? (
          <div className="dash-empty">Belum ada data deteksi. Upload foto di halaman Deteksi.</div>
        ) : (
          <table className="tbl">
            <thead><tr><th>File / Porsi</th><th>Waktu</th><th>Item terdeteksi</th><th>Avg confidence</th><th>Status</th></tr></thead>
            <tbody>
              {recentRows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center' }}>
                      <span className="tbl-thumb" style={{ background: r.bg }} />
                      <div>
                        <div className="tbl-nm">{r.filename}</div>
                        <div className="tbl-meta">{r.portion}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.time}</td>
                  <td>{r.items}</td>
                  <td>
                    <div className="cbar">
                      <div className="track"><div className="fill" style={{ width:`${r.conf}%` }}/></div>
                      <span className="val">{r.conf}%</span>
                    </div>
                  </td>
                  <td><span className={`pill ${r.compliant ? 'pill-success' : 'pill-warning'}`}>{r.compliant ? 'Compliant' : 'Below target'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* TOP SCHOOLS (diganti: Top Food Categories) */}
      <div className="card c-schools">
        <h3>Kategori Makanan Teratas <span className="more">▾</span></h3>
        <div className="sub">Berdasarkan data nutrisi di database</div>
        {topCats.length === 0 ? (
          <div className="dash-empty">Tidak ada data kategori.</div>
        ) : topCats.map((s, i) => (
          <div className="sch-row" key={i}>
            <div className="sch-av" style={{ background: `hsl(${i * 55 + 150},60%,88%)`, color: `hsl(${i * 55 + 150},60%,30%)` }}>
              {s.category?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
            <div className="sch-info">
              <div className="sch-nm">{s.category ?? 'Unknown'}</div>
              <div className="sch-meta">{s.count} item dalam database</div>
              <div className="sch-bar"><i style={{ width:`${Math.round((s.count / maxCat) * 100)}%` }}/></div>
            </div>
            <div className="sch-pct">{s.count}</div>
          </div>
        ))}
      </div>

      {/* AI STATUS */}
      <div className="card c-ai">
        <h3>Status AI Real-time</h3>
        <div className="sub">Kesehatan pipeline inferensi · auto-refresh 30s</div>
        <div className="gauge">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" stroke="rgba(255,255,255,0.10)" strokeWidth="14" fill="none"/>
            <circle cx="100" cy="100" r="80" stroke="url(#gg)" strokeWidth="14" fill="none"
              strokeLinecap="round" strokeDasharray="503"
              strokeDashoffset={allConf.length ? gaugeOffset : 503}
              transform="rotate(-90 100 100)"/>
            <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#bbf7d0"/><stop offset="100%" stopColor="#67e8f9"/></linearGradient></defs>
          </svg>
          <div className="gauge-val">
            <div className="gauge-v">{allConf.length ? `${round1(avgConfAll)}%` : '—'}</div>
            <div className="gauge-l">Avg confidence</div>
          </div>
        </div>
        {[
          { name: 'RT-DETR · v2.1 (Menu)', on: aiOnline },
          { name: 'Tray Detector (Stage 1)', on: aiOnline },
          { name: 'Node.js Backend (DB)', on: true },
        ].map((m, i) => (
          <div className="model-row" key={i}>
            <span className="model-nm">{m.name}</span>
            <span className="model-st" style={{ color: m.on ? '#bbf7d0' : '#fca5a5' }}>
              <i style={{ background: m.on ? '#22c55e' : '#ef4444', boxShadow: m.on ? '0 0 0 4px rgba(34,197,94,0.20)' : '0 0 0 4px rgba(239,68,68,0.20)' }}/>
              {m.on ? 'Operational' : 'Offline'}
            </span>
          </div>
        ))}
      </div>

      {/* NUTRITION BREAKDOWN DONUT */}
      <div className="card c-donut">
        <h3>Breakdown Nutrisi <span className="more">Semua sesi ▾</span></h3>
        <div className="sub">Komposisi makronutrien dari seluruh deteksi</div>
        {histories.length === 0 ? (
          <div className="dash-empty">Belum ada data.</div>
        ) : (
          <div className="donut-wrap">
            <div className="donut">
              <DonutChart totals={nutTotals} />
              <div className="donut-center">
                <div className="donut-v">{avgKcalPerMeal}</div>
                <div className="donut-l">kcal/sesi</div>
              </div>
            </div>
            <ul className="donut-leg">
              {DONUT.map((d, i) => (
                <li key={i}>
                  <span className="d-nm"><i style={{ background: d.color }}/>{d.label}</span>
                  <span className="d-val">{d.pct} · {d.val}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* CONFIDENCE DISTRIBUTION */}
      <div className="card c-conf">
        <h3>Distribusi Confidence Deteksi <span className="more">Semua waktu ▾</span></h3>
        <div className="sub">Berdasarkan {allConf.length} deteksi dari {histories.length} sesi — RT-DETR class confidence</div>
        {allConf.length === 0 ? (
          <div className="dash-empty">Belum ada data confidence.</div>
        ) : (
          <>
            <div className="conf-bar">
              {confBands.filter(b => b.pct > 0).map((b, i) => (
                <i key={i} style={{ width:`${b.pct}%`, background: b.color, minWidth: b.pct > 0 ? 40 : 0 }}>
                  {b.pct > 5 ? `${b.label} · ${b.pct}%` : ''}
                </i>
              ))}
            </div>
            <div className="conf-legend">
              {confBands.map((b, i) => (
                <span className="conf-item" key={i}><i style={{ background: b.lc }}/>{b.legend} ({b.pct}%)</span>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  )
}
