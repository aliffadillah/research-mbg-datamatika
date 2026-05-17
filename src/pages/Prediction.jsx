import { RefreshCw } from 'lucide-react'
import './Prediction.css'

const METRICS = [
  { label:'RMSE', value:'42.6', unit:'kcal', delta:'↓ 3.2 vs last train', cls:'m1', pct:88 },
  { label:'MAPE', value:'5.8', unit:'%', delta:'↓ 0.4% vs last train', cls:'m2', pct:92 },
  { label:'R² Score', value:'0.952', unit:'', delta:'↑ 0.018 vs last train', cls:'m3', pct:95 },
  { label:'Training Loss', value:'0.0086', unit:'', delta:'100 epochs · 12 min', cls:'m4', pct:42, neutral:true },
]

const FORECAST_TABLE = [
  { date:'May 18', actual:'—', pred:788, ci:'748 – 828', trend:'up' },
  { date:'May 19', actual:'—', pred:795, ci:'752 – 838', trend:'up' },
  { date:'May 20', actual:'—', pred:802, ci:'756 – 848', trend:'up' },
  { date:'May 21', actual:'—', pred:798, ci:'750 – 846', trend:'flat' },
  { date:'May 22', actual:'—', pred:812, ci:'770 – 854', trend:'up' },
  { date:'Jun 1', actual:'—', pred:825, ci:'778 – 872', trend:'up' },
  { date:'Jun 7', actual:'—', pred:831, ci:'782 – 880', trend:'up' },
  { date:'Jun 12', actual:'—', pred:812, ci:'770 – 854', trend:'flat' },
]

export default function Prediction() {
  return (
    <div className="pred-content">
      <div className="page-head">
        <div><h1>LSTM Nutrition Forecasting</h1><p>Time-series prediction of daily nutrition trends · 90-day input window → 30-day forecast</p></div>
        <div className="toolbar">
          <span className="pred-sel">Nutrient: Calories ▾</span>
          <span className="pred-sel">Horizon: 30 days ▾</span>
          <span className="pred-sel">School: All ▾</span>
          <button className="btn btn-primary btn-sm"><RefreshCw size={14}/>Retrain Model</button>
        </div>
      </div>

      {/* METRICS */}
      {METRICS.map((m, i) => (
        <div className={`card pred-metric ${m.cls}`} key={i}>
          <div className="pm-lbl">{m.label}</div>
          <div className="pm-val">{m.value}{m.unit && <span className="pm-u">{m.unit}</span>}</div>
          <div className="pm-delta" style={m.neutral ? { color:'var(--text-muted)' } : { color:'var(--primary)' }}>{m.delta}</div>
          <div className="pm-bar"><i style={{ width:`${m.pct}%` }}/></div>
        </div>
      ))}

      {/* FORECAST CHART */}
      <div className="card pred-forecast">
        <div className="pf-head">
          <h3>Calories Forecast · Next 30 days</h3>
          <span style={{ fontWeight:500, fontSize:12, color:'var(--text-faint)' }}>Model trained · 17 May 2026</span>
        </div>
        <div className="sub">Predicted daily aggregate calories per student with 95% confidence interval</div>
        <div className="f-legend">
          <span><i style={{ background:'#bbf7d0' }}/>Historical actual (90d)</span>
          <span><i style={{ background:'#22c55e' }}/>LSTM forecast (30d)</span>
          <span><i style={{ background:'rgba(34,197,94,0.18)' }}/>95% confidence interval</span>
          <span><i className="dashed-i"/>MBG target (800 kcal)</span>
        </div>
        <div className="f-chart">
          <svg viewBox="0 0 1100 300" preserveAspectRatio="none">
            <defs>
              <linearGradient id="histG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#86efac" stopOpacity="0.45"/><stop offset="100%" stopColor="#86efac" stopOpacity="0"/></linearGradient>
              <linearGradient id="ciG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.30"/><stop offset="100%" stopColor="#22c55e" stopOpacity="0.08"/></linearGradient>
            </defs>
            <g stroke="rgba(255,255,255,0.08)" strokeWidth="1"><line x1="0" y1="60" x2="1100" y2="60"/><line x1="0" y1="120" x2="1100" y2="120"/><line x1="0" y1="180" x2="1100" y2="180"/><line x1="0" y1="240" x2="1100" y2="240"/></g>
            <line x1="700" y1="20" x2="700" y2="270" stroke="rgba(187,247,208,0.40)" strokeWidth="1.5" strokeDasharray="4 4"/>
            <text x="710" y="38" fontSize="10" fill="#bbf7d0" fontWeight="700" fontFamily="Inter">FORECAST →</text>
            <text x="690" y="38" fontSize="10" fill="#94a3b8" fontWeight="700" fontFamily="Inter" textAnchor="end">← HISTORY</text>
            <line x1="0" y1="100" x2="1100" y2="100" stroke="#0891b2" strokeWidth="1.5" strokeDasharray="6 4"/>
            <text x="10" y="94" fontSize="10" fill="#67e8f9" fontFamily="Inter">MBG target 800 kcal</text>
            <path d="M0,170 C50,160 100,180 150,170 C200,160 250,150 300,160 C350,170 400,140 450,150 C500,160 550,130 600,140 C650,150 680,135 700,145 L700,300 L0,300 Z" fill="url(#histG)"/>
            <path d="M0,170 C50,160 100,180 150,170 C200,160 250,150 300,160 C350,170 400,140 450,150 C500,160 550,130 600,140 C650,150 680,135 700,145" stroke="#86efac" strokeWidth="2" fill="none"/>
            <path d="M700,135 C740,120 780,110 820,100 C860,90 900,82 940,76 C980,70 1020,66 1060,62 L1100,58 L1100,182 L1060,178 C1020,174 980,170 940,164 C900,158 860,150 820,140 C780,130 740,128 700,135 Z" fill="url(#ciG)"/>
            <path d="M700,140 C740,128 780,118 820,108 C860,98 900,88 940,80 C980,72 1020,66 1060,60 L1100,55" stroke="#22c55e" strokeWidth="2.5" fill="none"/>
            <g><circle cx="780" cy="118" r="3" fill="#22c55e"/><circle cx="860" cy="98" r="3" fill="#22c55e"/><circle cx="940" cy="80" r="3" fill="#22c55e"/><circle cx="1020" cy="66" r="3" fill="#22c55e"/></g>
            <circle cx="700" cy="145" r="4" fill="#86efac" stroke="#022c22" strokeWidth="2"/>
            <circle cx="940" cy="80" r="6" fill="#bbf7d0" stroke="#16a34a" strokeWidth="2"/>
            <line x1="940" y1="80" x2="940" y2="270" stroke="rgba(187,247,208,0.30)" strokeWidth="1" strokeDasharray="3 3"/>
            <g fontSize="9" fill="#64748b" fontFamily="Inter"><text x="0" y="295">Feb 17</text><text x="175" y="295">Mar 9</text><text x="350" y="295">Mar 30</text><text x="525" y="295">Apr 20</text><text x="685" y="295">May 17</text><text x="845" y="295">Jun 7</text><text x="1020" y="295">Jun 16</text></g>
          </svg>
          <div className="f-tooltip">
            <div className="ft-lbl">Jun 12 · forecast</div>
            <div className="ft-v">812 kcal</div>
            <div className="ft-ci">95% CI: 770 – 854 kcal</div>
            <div className="ft-ci">↑ 4.1% above current average</div>
          </div>
        </div>
      </div>

      {/* LOSS CURVE */}
      <div className="card pred-loss">
        <h3>Training & Validation Loss <span style={{ fontWeight:500, fontSize:12, color:'var(--text-muted)' }}>MSE · 100 epochs</span></h3>
        <div className="sub">Convergence over training run · 80/20 train-val split</div>
        <div className="loss-chart">
          <svg viewBox="0 0 600 200" preserveAspectRatio="none">
            <g stroke="var(--border-light)" strokeWidth="1"><line x1="0" y1="50" x2="600" y2="50"/><line x1="0" y1="100" x2="600" y2="100"/><line x1="0" y1="150" x2="600" y2="150"/></g>
            <path d="M0,30 C40,50 80,80 120,120 C160,145 200,160 240,168 C280,172 320,176 360,178 C400,179 440,180 480,180 C520,180 560,181 600,181" stroke="#16a34a" strokeWidth="2.5" fill="none"/>
            <path d="M0,40 C40,65 80,95 120,130 C160,150 200,160 240,170 C280,170 320,168 360,170 C400,168 440,166 480,164 C520,162 560,161 600,160" stroke="#0891b2" strokeWidth="2.5" fill="none" strokeDasharray="5 3"/>
            <g fontSize="9" fill="var(--text-faint)" fontFamily="Inter"><text x="0" y="195">epoch 1</text><text x="150" y="195">25</text><text x="300" y="195">50</text><text x="450" y="195">75</text><text x="575" y="195">100</text></g>
          </svg>
        </div>
        <div className="loss-legend">
          <span><i style={{ background:'#16a34a' }}/>Train (final 0.0086)</span>
          <span><i style={{ background:'#0891b2' }}/>Validation (final 0.0094)</span>
        </div>
      </div>

      {/* ARCHITECTURE */}
      <div className="card pred-arch">
        <h3>LSTM Architecture</h3>
        <div className="sub">Model topology used for nutrition time-series forecasting</div>
        <div className="arch-row">
          <div className="arch-node"><span className="arch-top">Input</span>x(t-90..t)</div>
          <div className="arch-arrow">→</div>
          <div className="arch-node arch-h"><span className="arch-top">LSTM</span>128 units</div>
          <div className="arch-arrow">→</div>
          <div className="arch-node arch-h"><span className="arch-top">LSTM</span>64 units</div>
          <div className="arch-arrow">→</div>
          <div className="arch-node"><span className="arch-top">Dense</span>32 → 30</div>
          <div className="arch-arrow">→</div>
          <div className="arch-node"><span className="arch-top">Output</span>ŷ(t+1..30)</div>
        </div>
        <div className="arch-meta">
          <div className="arch-item"><div className="arch-k">Input window</div><div className="arch-v">90 days</div></div>
          <div className="arch-item"><div className="arch-k">Forecast horizon</div><div className="arch-v">30 days</div></div>
          <div className="arch-item"><div className="arch-k">Total params</div><div className="arch-v">148,510</div></div>
          <div className="arch-item"><div className="arch-k">Optimizer</div><div className="arch-v">Adam · lr=1e-3</div></div>
        </div>
      </div>

      {/* FORECAST TABLE */}
      <div className="card pred-table">
        <h3>Forecast Values <span className="more">Download CSV →</span></h3>
        <div className="sub">Predicted daily calories with confidence intervals</div>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Actual</th><th>Predicted</th><th>95% CI</th><th>Confidence</th><th>Trend</th></tr></thead>
          <tbody>
            {FORECAST_TABLE.map((r, i) => (
              <tr key={i}>
                <td className="ft-dt">{r.date}</td>
                <td style={{ color:'var(--text-faint)' }}>{r.actual}</td>
                <td style={{ fontWeight:700 }}>{r.pred} kcal</td>
                <td>{r.ci} kcal</td>
                <td>
                  <div className="ci-bar">
                    <div className="ci-track">
                      <div className="ci-band" style={{ left:'20%', width:'60%' }}/>
                      <div className="ci-point" style={{ left:`${40 + Math.random()*20}%` }}/>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`tag-${r.trend}`}>
                    {r.trend === 'up' ? '↑ Rising' : r.trend === 'down' ? '↓ Falling' : '— Stable'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
