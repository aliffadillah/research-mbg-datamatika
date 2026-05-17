import { useState, useRef, useCallback } from 'react'
import { Upload, Camera, Save, Download, RefreshCw, BarChart3, AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import './Detection.css'

// ── Nutrition icon map ────────────────────────────────────────────
const NUT_ICONS = {
  Calories: { emoji: '🔥', color: 'var(--grad-fire)' },
  Protein: { emoji: 'P', color: 'var(--grad-brand)' },
  Carbs: { emoji: 'C', color: 'var(--grad-ocean)' },
  Fat: { emoji: 'F', color: 'var(--grad-violet)' },
  Fiber: { emoji: '🌿', color: 'var(--grad-nature)' },
}

// MBG targets for delta calculation
const MBG_TARGETS = {
  besar: { calories: 800, protein: 31.5, carbs: 113, fat: 22, fiber: 13 },
  kecil: { calories: 600, protein: 24, carbs: 85, fat: 17, fiber: 10 },
}

// Static pipeline info (model architecture doesn't change per-request)
const PIPELINE = [
  { cls: 'n1', code: 'BB', title: 'Backbone', desc: 'HGNetV2 extracts multi-scale feature maps from the input image.', k: 'Tensor out', v: '[1, 256, H/16, W/16]' },
  { cls: 'n2', code: 'EN', title: 'Encoder', desc: 'Efficient hybrid encoder fuses multi-scale features with attention.', k: 'Memory tokens', v: '2,400' },
  { cls: 'n3', code: 'DE', title: 'Decoder', desc: 'IoU-aware query selection + 6-layer decoder predicts boxes & classes.', k: 'Queries', v: '300' },
  { cls: 'n4', code: 'OUT', title: 'Detection Output', desc: 'NMS-free post-processing emits final boxes above confidence threshold.', k: 'Model', v: 'RT-DETR v2.1' },
]

// ── Helpers ───────────────────────────────────────────────────────
function pctDelta(actual, target) {
  if (!target) return { text: '0%', warn: false, neutral: true }
  const p = ((actual - target) / target) * 100
  const warn = p < -20
  const neutral = Math.abs(p) < 5
  return {
    text: `${p >= 0 ? '+' : ''}${p.toFixed(0)}%`,
    warn,
    neutral,
  }
}

function fmtNum(n) {
  return typeof n === 'number' ? n.toFixed(1).replace(/\.0$/, '') : '—'
}

const round1 = (n) => Math.round(n * 10) / 10

function estimateGrams(className, bboxAreaPct = 10) {
  const name = className.toLowerCase()
  let base = 80
  if (name.includes('nasi')) base = 150
  else if (['ayam', 'ikan', 'rendang', 'bakso'].some(k => name.includes(k))) base = 80
  else if (['kangkung', 'sayur', 'tumis', 'sop', 'gado'].some(k => name.includes(k))) base = 65
  else if (['tempe', 'tahu', 'telur', 'perkedel'].some(k => name.includes(k))) base = 50
  else if (['pisang', 'buah'].some(k => name.includes(k))) base = 100
  else if (name.includes('kerupuk')) base = 20
  const factor = Math.max(0.6, Math.min(2.0, (bboxAreaPct / 10) * 1.2))
  return Math.round(base * factor)
}

// ── States ────────────────────────────────────────────────────────
export default function Detection() {
  const [portion, setPortion] = useState('besar')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [history, setHistory] = useState([])
  const fileInputRef = useRef(null)

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
      if (!modelRes.ok) throw new Error(modelData.error || `Model error ${modelRes.status}`)

      const rawDetections = modelData.detections ?? []

      const enriched = await Promise.all(
        rawDetections.map(async (det) => {
          try {
            const nutRes = await fetch(`/api/nutrition/lookup?name=${encodeURIComponent(det.class_name)}`)
            const nutData = await nutRes.json()
            const nut = nutData.nutrition ?? {}
            const grams = estimateGrams(det.class_name, det.bbox_area_pct ?? 10)
            const scale = grams / 100
            return {
              ...det,
              portion_grams: grams,
              nutrition_found: nutData.found ?? false,
              nutrition: {
                calories: round1((nut.calories ?? 100) * scale),
                protein: round1((nut.protein ?? 5) * scale),
                carbs: round1((nut.carbs ?? 15) * scale),
                fat: round1((nut.fat ?? 3) * scale),
                fiber: round1((nut.fiber ?? 1) * scale),
              },
              category: nut.category ?? 'other',
            }
          } catch {
            return {
              ...det, portion_grams: 80,
              nutrition: { calories: 100, protein: 5, carbs: 15, fat: 3, fiber: 1 }, category: 'other'
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

      const targets = MBG_TARGETS[portion]
      const nutrients = {}
      let allMet = true
      for (const [key, target] of Object.entries(targets)) {
        const actual = totals[key] ?? 0
        const pct = round1((actual / target) * 100)
        if (pct < 80) allMet = false
        nutrients[key] = { actual, target, percentage: pct, met: pct >= 80 }
      }

      const combined = {
        ...modelData,
        detections: enriched,
        nutrition_summary: totals,
        mbg_compliance: {
          portion,
          portion_label: portion === 'besar' ? 'Porsi Besar · SMP/SMA' : 'Porsi Kecil · SD',
          compliant: allMet,
          nutrients,
        },
      }

      setResult(combined)
      setStatus('success')
      setHistory(prev => [{ url: localUrl, name: file.name, result: combined }, ...prev.slice(0, 3)])

    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }, [portion])

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

  const onHistoryClick = (item) => {
    setResult(item.result)
    setPreview(item.url)
    setStatus('success')
  }

  const onRerun = () => {
    if (history[0]) runDetect(history[0].file || null)
    else fileInputRef.current?.click()
  }

  // Reset ke state awal untuk coba foto lain
  const onNewPhoto = () => {
    setStatus('idle')
    setResult(null)
    setPreview(null)
    setErrorMsg('')
  }

  // ── Derived UI data ─────────────────────────────────────────────
  const detections = result?.detections ?? []
  const nutrition = result?.nutrition_summary ?? {}
  const compliance = result?.mbg_compliance ?? {}
  const infMs = result?.inference_ms ?? 0
  const imgMeta = result?.image_meta ?? {}
  const overlayB64 = result?.overlay_image ?? ''
  const avgConf = result?.avg_confidence ?? 0
  const targets = MBG_TARGETS[portion]

  const nutCards = [
    { key: 'calories', label: 'Calories', unit: 'kcal', value: nutrition.calories },
    { key: 'protein', label: 'Protein', unit: 'g', value: nutrition.protein },
    { key: 'carbs', label: 'Carbs', unit: 'g', value: nutrition.carbs },
    { key: 'fat', label: 'Fat', unit: 'g', value: nutrition.fat },
    { key: 'fiber', label: 'Fiber', unit: 'g', value: nutrition.fiber },
  ]

  // ════════════════════════════════════════════════════════════════
  const hasResult = status === 'success' && result

  return (
    <div className={`det-content ${hasResult ? 'det-has-result' : 'det-no-result'}`}>

      {/* Hidden file input — selalu tersedia */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />

      {/* ── UPLOAD PANEL — hanya tampil saat belum ada hasil ─────── */}
      {!hasResult && (
        <div className="card det-upload-center">
          <h3>Upload Food Tray Image</h3>
          <div className="sub">Drag-drop a photo, paste from clipboard, or choose from device</div>

          {/* Drop zone */}
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

          {/* Error banner */}
          {status === 'error' && (
            <div className="det-error">
              <AlertCircle size={16} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Detection failed</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{errorMsg}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setStatus('idle'); setErrorMsg('') }}>
                Dismiss
              </button>
            </div>
          )}

          {/* Portion toggle */}
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

      {/* ── DETECTION RESULT (kiri saat ada hasil) ──────────────── */}
      {hasResult && (
        <div className="card det-result-left">
          {/* Header row dengan tombol Foto Lain */}
          <div className="det-result-header">
            <div>
              <h3 style={{ margin: 0 }}>
                Detection Result{' '}
              </h3>
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

          {/* Image with overlay */}
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

          {/* Actions */}
          <div className="det-actions">
            <button className="btn btn-primary btn-sm"><Save size={14} />Save Result</button>
            <button className="btn btn-outline btn-sm"><Download size={14} />Download PDF</button>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onRerun}>
              <RefreshCw size={14} />Re-run
            </button>
          </div>
        </div>
      )}

      {/* ── NUTRITION INFO (kanan saat ada hasil) ─────────────────── */}
      {hasResult && (
        <div className="card det-nutrition-right">
          {/* Detected items list — di atas Nutrition Summary */}
          <div className="items-list items-list-top">
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Detected Items</h4>
            {detections.map((item, i) => (
              <div className="items-row" key={i}>
                <span className="items-dot" style={{ background: item.color }} />
                <div className="items-nm">
                  {item.class_name}
                  <span className="items-grams"> · {item.portion_grams}g</span>
                </div>
                <div className="cbar" style={{ minWidth: 120 }}>
                  <div className="track">
                    <div className="fill" style={{ width: `${(item.confidence * 100).toFixed(0)}%`, background: `linear-gradient(90deg,${item.color},${item.color})` }} />
                  </div>
                  <span className="val" style={{ color: item.color }}>
                    {(item.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="items-nutrition-divider" />

          <h3>Nutrition Summary</h3>
          <div className="sub">Estimated total nutrition for this meal tray</div>

          {/* Nutrition cards */}
          <div className="nut-row nut-row-col">
            {nutCards.map((n) => {
              const delta = pctDelta(n.value, targets[n.key])
              const pct = targets[n.key] ? Math.min(120, (n.value / targets[n.key]) * 100) : 0
              return (
                <div className="nut-card nut-card-row" key={n.key}>
                  <div className="nut-head">
                    <div>
                      <div className="nut-lbl" style={{ margin: 0 }}>{n.label}</div>
                      <div className="nut-val" style={{ fontSize: 18 }}>
                        {fmtNum(n.value)}<span className="nut-unit">{n.unit}</span>
                      </div>
                    </div>
                    <span className={`nut-delta${delta.warn ? ' warn' : delta.neutral ? ' neutral' : ''}`}>
                      {delta.text}
                    </span>
                  </div>
                  <div className="nut-ring" style={{ marginTop: 8 }}><i style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </div>

          {/* MBG Compliance */}
          <div className="mbg-section">
            <h4>
              MBG Compliance · {compliance.portion_label ?? `Porsi ${portion}`}
              <span className={`target-pill ${compliance.compliant ? '' : 'pill-warning'}`}>
                {compliance.compliant
                  ? <><CheckCircle2 size={11} /> Compliant</>
                  : <><XCircle size={11} /> Below target</>}
              </span>
            </h4>
            {Object.entries(compliance.nutrients ?? {}).map(([key, nut]) => (
              <div className="mbg-row" key={key}>
                <span className="mbg-nm">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <div className="mbg-track">
                  <div
                    className="mbg-fill"
                    style={{
                      width: `${Math.min(nut.percentage, 100)}%`,
                      background: nut.percentage < 60
                        ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                        : nut.percentage > 110
                          ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                          : 'linear-gradient(90deg,#22c55e,#16a34a)',
                    }}
                  />
                  <div className="mbg-target" style={{ left: '100%' }} />
                </div>
                <span className="mbg-val">
                  {fmtNum(nut.actual)} / {nut.target} {key === 'calories' ? 'kcal' : 'g'}
                </span>
              </div>
            ))}
          </div>

          {/* Compare button */}
          <div className="det-actions" style={{ marginTop: 14 }}>
            <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              <BarChart3 size={14} />Compare with targets
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
