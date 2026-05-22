import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Camera, Save, Download, RefreshCw, AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { evaluateNutrition, PORTION_PERCENTAGES } from '../utils/nutritionEvaluator'
import './Detection.css'

// ── Helpers ───────────────────────────────────────────────────────
function fmtNum(n) {
  return typeof n === 'number' ? n.toFixed(1).replace(/\.0$/, '') : '—'
}

const round1 = (n) => Math.round(n * 10) / 10

// Calculate average AKG from fetched data
function calculateAverageAKG(akgData) {
  if (!akgData || akgData.length === 0) return null
  const sum = akgData.reduce((acc, item) => ({
    energy: acc.energy + (item.energy || 0),
    protein: acc.protein + (item.protein || 0),
    carbs: acc.carbs + (item.carbs || 0),
    fat: acc.fat + (item.fat || 0),
    fiber: acc.fiber + (item.fiber || 0),
  }), { energy: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
  const count = akgData.length
  return {
    energy: Math.round(sum.energy / count),
    protein: Math.round((sum.protein / count) * 10) / 10,
    carbs: Math.round((sum.carbs / count) * 10) / 10,
    fat: Math.round((sum.fat / count) * 10) / 10,
    fiber: Math.round((sum.fiber / count) * 10) / 10,
  }
}

// ── States ────────────────────────────────────────────────────────
export default function Detection() {
  const [portion, setPortion] = useState('besar')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [history, setHistory] = useState([])
  const [akgData, setAkgData] = useState([])
  const [akgLoading, setAkgLoading] = useState(true)
  const fileInputRef = useRef(null)

  // ── Fetch AKG data on mount ─────────────────────────────────────
  useEffect(() => {
    async function fetchAKG() {
      try {
        const res = await fetch('/api/akg')
        if (res.ok) {
          const json = await res.json()
          setAkgData(json.data ?? [])
          if ((json.data ?? []).length === 0) {
            await fetch('/api/akg/seed', { method: 'POST' })
            const reRes = await fetch('/api/akg')
            const reJson = await reRes.json()
            setAkgData(reJson.data ?? [])
          }
        }
      } catch (e) {
        console.error('Failed to fetch AKG:', e)
      } finally {
        setAkgLoading(false)
      }
    }
    fetchAKG()
  }, [])

  // ── Core detect function ────────────────────────────────────────
  const runDetect = useCallback(async (file) => {
    if (!file) return
    setStatus('loading')
    setResult(null)
    setErrorMsg('')

    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('conf', '0.25')
    formData.append('imgsz', '640')

    try {
      const modelRes = await fetch('/api/detect', { method: 'POST', body: formData })
      const modelData = await modelRes.json()
      if (!modelRes.ok) {
        const code = modelData.error_code || ''
        throw Object.assign(new Error(modelData.error || `Model error ${modelRes.status}`), { code })
      }

      const rawDetections = modelData.detections ?? []

      const enriched = await Promise.all(
        rawDetections.map(async (det) => {
          try {
            const nutRes = await fetch(`/api/nutrition/lookup?name=${encodeURIComponent(det.class_name)}`)
            const nutData = await nutRes.json()
            const nut = nutData.nutrition ?? {}
            return {
              ...det,
              nutrition_found: nutData.found ?? false,
              db_name: nut.name ?? det.class_name,
              nutrition: {
                calories: round1(nut.calories ?? 0),
                protein: round1(nut.protein ?? 0),
                carbs: round1(nut.carbs ?? 0),
                fat: round1(nut.fat ?? 0),
                fiber: round1(nut.fiber ?? 0),
              },
              category: nut.category ?? 'other',
            }
          } catch {
            return {
              ...det,
              nutrition_found: false,
              nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
              category: 'other',
            }
          }
        })
      )

      const totals = enriched.reduce(
        (acc, d) => ({
          calories: round1(acc.calories + (d.nutrition.calories ?? 0)),
          protein: round1(acc.protein + (d.nutrition.protein ?? 0)),
          carbs: round1(acc.carbs + (d.nutrition.carbs ?? 0)),
          fat: round1(acc.fat + (d.nutrition.fat ?? 0)),
          fiber: round1(acc.fiber + (d.nutrition.fiber ?? 0)),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      )

      const avgAKG = calculateAverageAKG(akgData)
      const dailyAKG = avgAKG || {
        energy: 2100, protein: 65, carbs: 300, fat: 65, fiber: 30,
      }
      const nutritionEvaluation = evaluateNutrition(totals, dailyAKG, portion)

      const combined = {
        ...modelData,
        detections: enriched,
        nutrition_summary: totals,
        akg_evaluation: nutritionEvaluation,
      }

      setResult(combined)
      setStatus('success')
      setHistory(prev => [{ url: localUrl, name: file.name, result: combined }, ...prev.slice(0, 3)])

    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
      setErrorCode(err.code || '')
    }
  }, [portion, akgData])

  // ── Event handlers ──────────────────────────────────────────────
  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) runDetect(file)
    e.target.value = ''
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) runDetect(file)
  }

  const onRerun = () => {
    if (history[0]) runDetect(history[0].file || null)
    else fileInputRef.current?.click()
  }

  const onNewPhoto = () => {
    setStatus('idle')
    setResult(null)
    setPreview(null)
    setErrorMsg('')
  }

  // ── Derived data ─────────────────────────────────────────────────
  const detections = result?.detections ?? []
  const nutrition = result?.nutrition_summary ?? {}
  const evaluation = result?.akg_evaluation
  const infMs = result?.inference_ms ?? 0
  const imgMeta = result?.image_meta ?? {}
  const overlayB64 = result?.overlay_image ?? ''
  const avgConf = result?.avg_confidence ?? 0

  const hasResult = status === 'success' && result

  // AKG targets from real DB (via evaluation object)
  // Compute BOTH Porsi Besar (30-35%) and Porsi Kecil (20-25%) from the same AKG
  const lunchTarget = evaluation?.target ?? null
  const midPctBesar = 0.325   // midpoint of 30-35%
  const midPctKecil = 0.225   // midpoint of 20-25%

  // Derive daily AKG from whichever target we have, then compute both
  const dailyAKG = lunchTarget ? {
    energy:  lunchTarget.energy  / (portion === 'besar' ? midPctBesar : midPctKecil),
    protein: lunchTarget.protein / (portion === 'besar' ? midPctBesar : midPctKecil),
    carbs:   lunchTarget.carbs   / (portion === 'besar' ? midPctBesar : midPctKecil),
    fat:     lunchTarget.fat     / (portion === 'besar' ? midPctBesar : midPctKecil),
    fiber:   lunchTarget.fiber   / (portion === 'besar' ? midPctBesar : midPctKecil),
  } : null

  const round1 = (n) => Math.round(n * 10) / 10
  const tBesar = dailyAKG ? {
    energy:  Math.round(dailyAKG.energy  * midPctBesar),
    protein: round1(dailyAKG.protein * midPctBesar),
    carbs:   round1(dailyAKG.carbs   * midPctBesar),
    fat:     round1(dailyAKG.fat     * midPctBesar),
    fiber:   round1(dailyAKG.fiber   * midPctBesar),
  } : { energy: 800, protein: 20, carbs: 100, fat: 22, fiber: 10 }

  const tKecil = dailyAKG ? {
    energy:  Math.round(dailyAKG.energy  * midPctKecil),
    protein: round1(dailyAKG.protein * midPctKecil),
    carbs:   round1(dailyAKG.carbs   * midPctKecil),
    fat:     round1(dailyAKG.fat     * midPctKecil),
    fiber:   round1(dailyAKG.fiber   * midPctKecil),
  } : { energy: 600, protein: 14, carbs: 70, fat: 15, fiber: 7 }

  // Active target = selected portion
  const activeTarget = portion === 'besar' ? tBesar : tKecil
  const energyPct = activeTarget.energy > 0
    ? Math.round((nutrition.calories / activeTarget.energy) * 100) : 0

  // Portion labels
  const portionLabel = portion === 'besar' ? 'Porsi Besar' : 'Porsi Kecil'
  const portionPct   = portion === 'besar' ? '30–35%' : '20–25%'
  const compliant    = evaluation?.compliant

  // Nutrient rows
  const NUTRIENT_ROWS = [
    { key: 'energy',  label: 'Energi',      icon: '🔥', actual: nutrition.calories, besar: tBesar.energy,  kecil: tKecil.energy,  unit: 'kkal', col: '#d97706' },
    { key: 'protein', label: 'Protein',     icon: '🥩', actual: nutrition.protein,  besar: tBesar.protein, kecil: tKecil.protein, unit: 'g',    col: '#ef4444' },
    { key: 'carbs',   label: 'Karbohidrat', icon: '🍚', actual: nutrition.carbs,    besar: tBesar.carbs,   kecil: tKecil.carbs,   unit: 'g',    col: '#10b981' },
    { key: 'fat',     label: 'Lemak',       icon: '🧈', actual: nutrition.fat,      besar: tBesar.fat,     kecil: tKecil.fat,     unit: 'g',    col: '#0891b2' },
    { key: 'fiber',   label: 'Serat',       icon: '🥬', actual: nutrition.fiber,    besar: tBesar.fiber,   kecil: tKecil.fiber,   unit: 'g',    col: '#8b5cf6' },
  ]

  // ════════════════════════════════════════════════════════════════
  return (
    <div className={`det-content ${hasResult ? 'det-has-result' : 'det-no-result'}`}>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />

      {/* ── UPLOAD PANEL ──────────────────────────────────────── */}
      {!hasResult && (
        <div className="card det-upload-center">
          <h3>Upload Food Tray Image</h3>
          <div className="sub">Drag-drop a photo, paste from clipboard, or choose from device</div>

          <div
            className={`dz ${dragOver ? 'dz-over' : ''} ${status === 'loading' ? 'dz-loading' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => status !== 'loading' && fileInputRef.current?.click()}
          >
            {status === 'loading' ? (
              <div className="dz-loading-inner">
                <Loader2 size={36} className="spin" style={{ color: 'var(--primary)', marginBottom: 12 }} />
                <div style={{ fontWeight: 600, fontSize: 14 }}>Running RT-DETR inference…</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Sending to Ultralytics Cloud Run
                </div>
              </div>
            ) : (
              <>
                <div className="dz-ic"><Upload size={28} /></div>
                <h4>Drop your food tray image here</h4>
                <p>PNG, JPG, HEIC up to 10MB · Indonesian school meal trays only</p>
                <div className="dz-actions">
                  <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                    Choose file
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={(e) => e.stopPropagation()}>
                    <Camera size={14} /> Use camera
                  </button>
                </div>
                <div className="dz-or">or</div>
                <button className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()}>
                  Paste from clipboard
                </button>
              </>
            )}
          </div>

          {status === 'error' && (
            <div className={`det-error ${errorCode === 'TRAY_NOT_FOUND' ? 'det-error-tray' : ''}`}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {errorCode === 'TRAY_NOT_FOUND' ? 'Nampan tidak terdeteksi' : 'Detection failed'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{errorMsg}</div>
                {errorCode === 'TRAY_NOT_FOUND' && (
                  <div style={{ fontSize: 11, marginTop: 6, color: 'var(--text-faint)', lineHeight: 1.6 }}>
                    💡 Tips: pastikan nampan MBG terlihat penuh di foto, pencahayaan cukup, dan tidak terlalu jauh.
                  </div>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', flexShrink: 0 }}
                onClick={() => { setStatus('idle'); setErrorMsg(''); setErrorCode('') }}>
                Coba Lagi
              </button>
            </div>
          )}

          <h3 style={{ marginTop: 20 }}>Portion size</h3>
          <div className="sub">Select MBG portion category for accurate nutrition scaling</div>
          <div className="portion-toggle">
            <button className={portion === 'besar' ? 'on' : ''} onClick={() => setPortion('besar')}>
              Porsi Besar<span className="portion-meta">SMP / SMA · 750–950 kcal</span>
            </button>
            <button className={portion === 'kecil' ? 'on' : ''} onClick={() => setPortion('kecil')}>
              Porsi Kecil<span className="portion-meta">SD · 500–700 kcal</span>
            </button>
          </div>
        </div>
      )}

      {/* ── DETECTION RESULT (left) ─────────────────────────── */}
      {hasResult && (
        <div className="card det-result-left">
          <div className="det-result-header">
            <div>
              <h3 style={{ margin: 0 }}>Detection Result</h3>
              <div className="sub" style={{ margin: '2px 0 0' }}>
                RT-DETR detected <strong>{detections.length}</strong> food item{detections.length !== 1 ? 's' : ''} with avg confidence{' '}
                <strong>{(avgConf * 100).toFixed(1)}%</strong>
              </div>
            </div>
            <button className="btn btn-new-photo" onClick={onNewPhoto}>
              <Upload size={14} />
              Analisis Foto Lain
            </button>
          </div>

          <div className="canvas-wrap" style={{ marginTop: 12 }}>
            <div className="scan-badge">
              <i className="scan-dot" />
              Inference complete · {infMs} ms
            </div>
            <div className="canvas-meta">
              <span className="chip-dark">{imgMeta.width} × {imgMeta.height}</span>
              <span className="chip-dark">RT-DETR v2.1</span>
            </div>
            {overlayB64 ? (
              <img
                src={`data:image/jpeg;base64,${overlayB64}`}
                alt="Detection overlay"
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12, imageOrientation: 'none' }}
              />
            ) : preview ? (
              <img
                src={preview}
                alt="Uploaded food tray"
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12, imageOrientation: 'none' }}
              />
            ) : (
              <>
                <div className="fd fd-rice" /><div className="fd fd-ayam" />
                <div className="fd fd-sayur" /><div className="fd fd-tempe" />
              </>
            )}
          </div>

          <div className="det-actions">
            <button className="btn btn-primary btn-sm"><Save size={14} />Save Result</button>
            <button className="btn btn-outline btn-sm"><Download size={14} />Download PDF</button>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onRerun}>
              <RefreshCw size={14} />Re-run
            </button>
          </div>
        </div>
      )}

      {/* ── NUTRITION + AKG PANEL (right) ───────────────── */}
      {hasResult && (
        <div className="card det-nutrition-right">

          {/* ── Header: Verdict ────────────────────── */}
          <div className="ntr-top-header">
            <div className="ntr-portion-pill">
              <div>
                <div className="ntr-portion-name">Kesesuaian Gizi MBG</div>
                <div className="ntr-portion-pct">{lunchTarget ? 'Target dari database AKG' : 'Target estimasi'}</div>
              </div>
            </div>
            {evaluation && (
              <div className={`ntr-verdict ${compliant ? 'ntr-verdict-ok' : 'ntr-verdict-warn'}`}>
                {compliant
                  ? <><CheckCircle2 size={12} />Sesuai AKG</>
                  : <><XCircle size={12} />Belum Sesuai</>
                }
              </div>
            )}
          </div>

          {/* ── Detected Items ──────────────────────────── */}
          <div className="det-items-scroll">
            {detections.map((item, i) => {
              const n = item.nutrition ?? {}
              return (
                <div className="det-item-card" key={i}>
                  <div className="det-item-header">
                    <span className="items-dot" style={{ background: item.color ?? '#10b981' }} />
                    <span className="det-item-name">{item.db_name || item.class_name}</span>
                    <span className="det-item-conf" style={{ color: item.color ?? '#10b981' }}>
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="det-item-chips">
                    <span className="nut-chip nut-chip-cal">{n.calories ?? 0} kkal</span>
                    <span className="nut-chip nut-chip-p">P {n.protein ?? 0}g</span>
                    <span className="nut-chip nut-chip-k">K {n.carbs ?? 0}g</span>
                    <span className="nut-chip nut-chip-l">L {n.fat ?? 0}g</span>
                    <span className="nut-chip nut-chip-f">S {n.fiber ?? 0}g</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="ntr-panel-divider" />

          {/* ── 3-Column Comparison Table ─────────────────────── */}
          <div className="ntr-cmp-table">
            {/* Column headers */}
            <div className="ntr-col-headers">
              <div className="ntr-col-h ntr-col-nutrisi">Gizi</div>
              <div className="ntr-col-h ntr-col-detected">Terdeteksi</div>
              <div className={`ntr-col-h ntr-col-besar ${portion === 'besar' ? 'ntr-col-active-besar' : 'ntr-col-inactive'}`}>
                Porsi Besar
                <small>30–35% AKG</small>
                {portion === 'besar' && <span className="ntr-col-selected-dot" />}
              </div>
              <div className={`ntr-col-h ntr-col-kecil ${portion === 'kecil' ? 'ntr-col-active-kecil' : 'ntr-col-inactive'}`}>
                Porsi Kecil
                <small>20–25% AKG</small>
                {portion === 'kecil' && <span className="ntr-col-selected-dot" />}
              </div>
            </div>

            {/* Data rows */}
            {NUTRIENT_ROWS.map(({ key, label, icon, actual, besar, kecil, unit, col }) => {
              const pctBesar = besar > 0 ? Math.round((actual / besar) * 100) : 0
              const pctKecil = kecil > 0 ? Math.round((actual / kecil) * 100) : 0
              const stBesar = pctBesar >= 80 && pctBesar <= 120 ? 'ok' : pctBesar > 120 ? 'over' : 'low'
              const stKecil = pctKecil >= 80 && pctKecil <= 120 ? 'ok' : pctKecil > 120 ? 'over' : 'low'
              return (
                <div key={key} className="ntr-cmp-row-new">
                  <div className="ntr-col-nutrisi">
                    <span className="ntr-row-icon-sm">{icon}</span>
                    <span className="ntr-row-label-sm">{label}</span>
                  </div>
                  <div className="ntr-col-detected">
                    <span className="ntr-val-actual" style={{ color: col }}>{fmtNum(actual)}</span>
                    <span className="ntr-val-unit">{unit}</span>
                  </div>
                  <div className={`ntr-col-besar ${portion === 'besar' ? 'ntr-col-target-active' : 'ntr-col-target-dim'}`}>
                    <span className="ntr-val-target">{fmtNum(besar)}{unit}</span>
                    <span className={`ntr-pct-mini ntr-pct-${stBesar}`}>{pctBesar}%</span>
                  </div>
                  <div className={`ntr-col-kecil ${portion === 'kecil' ? 'ntr-col-target-active' : 'ntr-col-target-dim'}`}>
                    <span className="ntr-val-target">{fmtNum(kecil)}{unit}</span>
                    <span className={`ntr-pct-mini ntr-pct-${stKecil}`}>{pctKecil}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Final Verdict ─────────────────────────────────── */}
          {evaluation && (
            <div className={`ntr-final-verdict ${compliant ? 'fv-pass' : 'fv-fail'}`}>
              <div className="fv-icon">
                {compliant ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              </div>
              <div className="fv-text">
                <div className="fv-main">
                  {compliant ? 'Menu MBG SESUAI Standar AKG' : 'Menu MBG BELUM SESUAI Standar AKG'}
                </div>
                <div className="fv-sub">
                  Dibandingkan target {portionLabel} ({portionPct} dari AKG harian)
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}