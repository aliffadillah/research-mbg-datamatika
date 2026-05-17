import './Dashboard.css'

const KPI_DATA = [
  { icon:'scan', label:'Total Detections (today)', value:'2,847', delta:'↑ 12.4%', up:true, color:'k1', bars:[30,45,38,62,50,75,88] },
  { icon:'fire', label:'Total Calories Monitored', value:'1.94M', unit:'kcal', delta:'↑ 8.2%', up:true, color:'k2', bars:[48,55,42,68,72,60,82] },
  { icon:'heart', label:'Avg Protein per Meal', value:'28.4', unit:'g/student', delta:'↑ 3.1%', up:true, color:'k3', bars:[55,60,58,70,65,78,75] },
  { icon:'check', label:'MBG Compliance Rate', value:'94.2', unit:'%', delta:'↓ 1.8%', up:false, color:'k4', bars:[72,80,78,85,82,88,75] },
]

const TABLE_DATA = [
  { school:'SDN Cipinang 05', file:'tray-2847.jpg', city:'Jakarta', time:'2 min ago', items:'4 items · 682 kcal', conf:96, status:'Compliant', bg:'linear-gradient(135deg,#fde68a,#d97706)' },
  { school:'SMPN 14 Bandung', file:'tray-2846.jpg', city:'Bandung', time:'5 min ago', items:'5 items · 745 kcal', conf:94, status:'Compliant', bg:'linear-gradient(135deg,#bbf7d0,#16a34a)' },
  { school:'SDN Pondok Indah', file:'tray-2845.jpg', city:'Jakarta', time:'8 min ago', items:'3 items · 540 kcal', conf:88, status:'Below target', bg:'linear-gradient(135deg,#fde68a,#d97706)', warn:true },
  { school:'SMAN 2 Surabaya', file:'tray-2844.jpg', city:'Surabaya', time:'12 min ago', items:'5 items · 812 kcal', conf:97, status:'Compliant', bg:'linear-gradient(135deg,#a5f3fc,#0891b2)' },
  { school:'SDN Medan Helvetia', file:'tray-2843.jpg', city:'Medan', time:'16 min ago', items:'4 items · 698 kcal', conf:92, status:'Compliant', bg:'linear-gradient(135deg,#fecaca,#ef4444)' },
]

const SCHOOLS = [
  { init:'SC', name:'SDN Cipinang 05', city:'Jakarta', detections:248, pct:96 },
  { init:'SB', name:'SMPN 14 Bandung', city:'Bandung', detections:224, pct:94 },
  { init:'SS', name:'SMAN 2 Surabaya', city:'Surabaya', detections:218, pct:97 },
  { init:'SP', name:'SDN Pondok Indah', city:'Jakarta', detections:198, pct:88 },
  { init:'SM', name:'SDN Medan Helvetia', city:'Medan', detections:184, pct:92 },
]

const DONUT = [
  { label:'Carbohydrates', pct:'40%', val:'68g', color:'#16a34a' },
  { label:'Protein', pct:'31%', val:'28g', color:'#f59e0b' },
  { label:'Fat', pct:'19%', val:'14g', color:'#0891b2' },
  { label:'Fiber & other', pct:'10%', val:'8g', color:'#a78bfa' },
]

export default function Dashboard() {
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
          <div className="spark">{k.bars.map((h, j) => <i key={j} style={{ height:`${h}%` }}/>)}</div>
        </div>
      ))}

      {/* PROTEIN TREND */}
      <div className="card c-area">
        <h3>Protein Intake Trend <span className="more">Last 30 days ▾</span></h3>
        <div className="sub">Aggregated grams per student per day across all monitored schools</div>
        <div className="legend">
          <span><i style={{ background:'#16a34a' }}/>Actual</span>
          <span><i style={{ background:'#0891b2' }}/>MBG Target</span>
          <span><i style={{ background:'#cbd5e1' }}/>Last period</span>
        </div>
        <div className="chart-area">
          <svg viewBox="0 0 600 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.35"/>
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,180 C40,170 80,140 120,150 C160,160 200,120 240,100 C280,80 320,110 360,90 C400,70 440,60 480,55 C520,50 560,40 600,45 L600,240 L0,240 Z" fill="url(#ga)"/>
            <path d="M0,180 C40,170 80,140 120,150 C160,160 200,120 240,100 C280,80 320,110 360,90 C400,70 440,60 480,55 C520,50 560,40 600,45" stroke="#16a34a" strokeWidth="2.5" fill="none"/>
            <path d="M0,130 L600,130" stroke="#0891b2" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.7"/>
            <path d="M0,200 C40,195 80,180 120,185 C160,190 200,170 240,160 C280,150 320,165 360,155 C400,145 440,140 480,135 C520,130 560,125 600,128" stroke="#cbd5e1" strokeWidth="1.5" fill="none" strokeDasharray="3 3"/>
            <g fontSize="9" fill="#94a3b8" fontFamily="Inter">
              <text x="0" y="234">May 1</text><text x="120" y="234">May 8</text><text x="240" y="234">May 15</text><text x="360" y="234">May 22</text><text x="480" y="234">May 29</text>
            </g>
            <circle cx="480" cy="55" r="5" fill="#16a34a" stroke="#fff" strokeWidth="2"/>
            <g transform="translate(420,15)"><rect width="120" height="34" rx="6" fill="#0f172a"/><text x="10" y="14" fontSize="10" fill="#94a3b8">May 29 · Protein</text><text x="10" y="28" fontSize="13" fontWeight="700" fill="#fff">32.4g · ↑ above target</text></g>
          </svg>
        </div>
      </div>

      {/* AI STATUS */}
      <div className="card c-ai">
        <h3>Real-time AI Status</h3>
        <div className="sub">Inference pipeline health · last 60s</div>
        <div className="gauge">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" stroke="rgba(255,255,255,0.10)" strokeWidth="14" fill="none"/>
            <circle cx="100" cy="100" r="80" stroke="url(#gg)" strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray="503" strokeDashoffset="35" transform="rotate(-90 100 100)"/>
            <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#bbf7d0"/><stop offset="100%" stopColor="#67e8f9"/></linearGradient></defs>
          </svg>
          <div className="gauge-val"><div className="gauge-v">95.3%</div><div className="gauge-l">Avg confidence</div></div>
        </div>
        {['RT-DETR · v2.1','LSTM Forecaster','Image preprocessor'].map((m,i) => (
          <div className="model-row" key={i}>
            <span className="model-nm">{m}</span>
            <span className="model-st"><i/>Operational</span>
          </div>
        ))}
      </div>

      {/* CARB TRENDS */}
      <div className="card c-line">
        <h3>Carbohydrate Trends <span className="more">Weekly ▾</span></h3>
        <div className="sub">Grams per student · target vs actual vs LSTM forecast</div>
        <div className="legend">
          <span><i style={{ background:'#16a34a' }}/>Actual</span>
          <span><i style={{ background:'#0891b2' }}/>Target</span>
          <span><i style={{ background:'#a78bfa' }}/>Forecast</span>
        </div>
        <div className="chart-line">
          <svg viewBox="0 0 600 200" preserveAspectRatio="none">
            <g stroke="#f1f5f9" strokeWidth="1"><line x1="0" y1="50" x2="600" y2="50"/><line x1="0" y1="100" x2="600" y2="100"/><line x1="0" y1="150" x2="600" y2="150"/></g>
            <polyline points="0,140 100,120 200,130 300,110 400,90 500,100 600,85" stroke="#16a34a" strokeWidth="2.5" fill="none"/>
            <polyline points="0,100 600,100" stroke="#0891b2" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
            <polyline points="400,90 500,80 600,70" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="5 3" fill="none"/>
            <g><circle cx="0" cy="140" r="3" fill="#16a34a"/><circle cx="100" cy="120" r="3" fill="#16a34a"/><circle cx="200" cy="130" r="3" fill="#16a34a"/><circle cx="300" cy="110" r="3" fill="#16a34a"/><circle cx="400" cy="90" r="3" fill="#16a34a"/></g>
            <g fontSize="9" fill="#94a3b8" fontFamily="Inter"><text x="0" y="195">W1</text><text x="100" y="195">W2</text><text x="200" y="195">W3</text><text x="300" y="195">W4</text><text x="400" y="195">W5</text><text x="500" y="195">W6</text><text x="585" y="195">W7</text></g>
          </svg>
        </div>
      </div>

      {/* DONUT */}
      <div className="card c-donut">
        <h3>Nutrition Breakdown <span className="more">Today ▾</span></h3>
        <div className="sub">Macronutrient composition of all detected meals</div>
        <div className="donut-wrap">
          <div className="donut">
            <svg viewBox="0 0 100 100" width="170" height="170">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#16a34a" strokeWidth="14" strokeDasharray="100 251" strokeDashoffset="0"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="14" strokeDasharray="78 251" strokeDashoffset="-100"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#0891b2" strokeWidth="14" strokeDasharray="48 251" strokeDashoffset="-178"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#a78bfa" strokeWidth="14" strokeDasharray="25 251" strokeDashoffset="-226"/>
            </svg>
            <div className="donut-center"><div className="donut-v">682</div><div className="donut-l">kcal/meal</div></div>
          </div>
          <ul className="donut-leg">
            {DONUT.map((d, i) => (
              <li key={i}><span className="d-nm"><i style={{ background:d.color }}/>{d.label}</span><span className="d-val">{d.pct} · {d.val}</span></li>
            ))}
          </ul>
        </div>
      </div>

      {/* RECENT UPLOADS TABLE */}
      <div className="card c-table">
        <h3>Recent Uploads <span className="more">View all →</span></h3>
        <div className="sub">Latest 5 detection results streamed from monitored schools</div>
        <table className="tbl">
          <thead><tr><th>School / Image</th><th>Time</th><th>Items detected</th><th>Avg confidence</th><th>Status</th></tr></thead>
          <tbody>
            {TABLE_DATA.map((r, i) => (
              <tr key={i}>
                <td>
                  <div style={{ display:'flex', alignItems:'center' }}>
                    <span className="tbl-thumb" style={{ background:r.bg }}/>
                    <div><div className="tbl-nm">{r.school}</div><div className="tbl-meta">{r.file} · {r.city}</div></div>
                  </div>
                </td>
                <td>{r.time}</td>
                <td>{r.items}</td>
                <td><div className="cbar"><div className="track"><div className="fill" style={{ width:`${r.conf}%` }}/></div><span className="val">{r.conf}%</span></div></td>
                <td><span className={`pill ${r.warn ? 'pill-warning' : 'pill-success'}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOP SCHOOLS */}
      <div className="card c-schools">
        <h3>Top School Activity <span className="more">▾</span></h3>
        <div className="sub">Most active monitored schools today</div>
        {SCHOOLS.map((s, i) => (
          <div className="sch-row" key={i}>
            <div className="sch-av">{s.init}</div>
            <div className="sch-info">
              <div className="sch-nm">{s.name}</div>
              <div className="sch-meta">{s.city} · {s.detections} detections</div>
              <div className="sch-bar"><i style={{ width:`${s.pct}%` }}/></div>
            </div>
            <div className="sch-pct">{s.pct}%</div>
          </div>
        ))}
      </div>

      {/* CONFIDENCE DISTRIBUTION */}
      <div className="card c-conf">
        <h3>Detection Confidence Distribution <span className="more">All time ▾</span></h3>
        <div className="sub">Across 128,940 detections — RT-DETR class confidence bands</div>
        <div className="conf-bar">
          <i style={{ width:'62%', background:'linear-gradient(135deg,#16a34a,#15803d)' }}>≥95% · 62%</i>
          <i style={{ width:'24%', background:'linear-gradient(135deg,#84cc16,#65a30d)' }}>90–95% · 24%</i>
          <i style={{ width:'9%', background:'linear-gradient(135deg,#f59e0b,#d97706)' }}>80–90% · 9%</i>
          <i style={{ width:'5%', background:'linear-gradient(135deg,#ef4444,#b91c1c)' }}>&lt;80% · 5%</i>
        </div>
        <div className="conf-legend">
          <span className="conf-item"><i style={{ background:'#15803d' }}/>High confidence (auto-approved)</span>
          <span className="conf-item"><i style={{ background:'#65a30d' }}/>Good</span>
          <span className="conf-item"><i style={{ background:'#d97706' }}/>Review recommended</span>
          <span className="conf-item"><i style={{ background:'#b91c1c' }}/>Manual review required</span>
        </div>
      </div>
    </div>
  )
}
