import React from 'react'
import { Download, Calendar } from 'lucide-react'
import './DailyMenu.css'

const RINGS = [
  { label:'Calories', value:'87%', meta:'695 / 800 kcal · ↓ 13% under target', offset:34, grad:'g1', colors:['#fbbf24','#ef4444'] },
  { label:'Protein', value:'108%', meta:'34 / 31.5 g · ↑ above target ✓', offset:-22, grad:'g2', colors:['#22c55e','#16a34a'] },
  { label:'Carbs', value:'78%', meta:'88 / 113 g · within range', offset:58, grad:'g3', colors:['#0891b2','#6366f1'] },
  { label:'Fiber', value:'48%', meta:'6.4 / 13 g · ⚠ below target', offset:138, grad:'g4', colors:['#84cc16','#16a34a'] },
]

const SCHOOLS = [
  { init:'SC', name:'SDN Cipinang 05', city:'Jakarta', det:248, pct:96 },
  { init:'SS', name:'SMAN 2 Surabaya', city:'Surabaya', det:218, pct:97 },
  { init:'SB', name:'SMPN 14 Bandung', city:'Bandung', det:224, pct:94 },
  { init:'SM', name:'SDN Medan Helvetia', city:'Medan', det:184, pct:92 },
  { init:'SP', name:'SDN Pondok Indah', city:'Jakarta', det:198, pct:88, warn:true },
]

const MEALS = [
  { name:'Nasi · Ayam · Sayur · Tempe', school:'SDN Cipinang 05 · 11:48', conf:'96%', kcal:'682 kcal', nuts:['34g P','88g C','18g F'], cls:'' },
  { name:'Nasi · Ikan · Bayam · Tahu', school:'SMPN 14 Bandung · 11:42', conf:'94%', kcal:'745 kcal', nuts:['38g P','94g C','19g F'], cls:'m2' },
  { name:'Nasi · Ayam · Kacang · Buncis', school:'SMAN 2 Surabaya · 11:38', conf:'97%', kcal:'812 kcal', nuts:['42g P','98g C','22g F'], cls:'m3' },
  { name:'Nasi · Telur · Sayur', school:'SDN Pondok Indah · 11:36', conf:'88%', kcal:'540 kcal', nuts:['26g P','68g C','14g F'], cls:'m4' },
]

const HEATMAP = {
  rows: ['Calories','Protein','Carbs','Fat','Fiber'],
  cols: ['Mon','Tue','Wed','Thu','Fri','Sat','Today'],
  data: [
    [92,96,98,102,93,90,87],
    [108,102,110,104,108,101,108],
    [82,85,90,88,81,79,78],
    [91,95,88,90,94,86,84],
    [42,48,62,52,46,44,48],
  ]
}

const BARS = [
  { day:'Mon', v:735, h:78 },
  { day:'Tue', v:768, h:82 },
  { day:'Wed', v:782, h:84 },
  { day:'Thu', v:815, h:88 },
  { day:'Fri', v:695, h:74, today:true },
]

function heatColor(v) {
  if (v < 60) return 'hm-neg'
  if (v < 80) return 'hm-l1'
  if (v < 95) return 'hm-l2'
  if (v <= 100) return 'hm-l3'
  return 'hm-l4'
}

export default function DailyMenu() {
  return (
    <div className="dm-content">
      <div className="page-head">
        <div><h1>Daily Menu Monitoring</h1><p>What was served vs MBG target, by day and by school</p></div>
        <div className="toolbar">
          <button className="btn btn-outline btn-sm">Today</button>
          <span className="dm-date"><Calendar size={14}/>Friday, 17 May 2026 ▾</span>
          <span className="dm-sel">All schools (12) ▾</span>
          <button className="btn btn-primary btn-sm"><Download size={14}/>Export day</button>
        </div>
      </div>

      {/* TARGETS */}
      <div className="card dm-targets">
        <h3>Today's Nutrition Targets <span className="more">Porsi Besar · all schools</span></h3>
        <div className="sub">Aggregate actual vs MBG target across 12 monitored schools</div>
        <div className="targets-grid">
          {RINGS.map((r, i) => (
            <div className="ring-card" key={i}>
              <div className="ring-wrap">
                <svg viewBox="0 0 100 100" width="120" height="120">
                  <circle cx="50" cy="50" r="42" stroke="var(--border-light)" strokeWidth="10" fill="none"/>
                  <circle cx="50" cy="50" r="42" stroke={`url(#${r.grad})`} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray="264" strokeDashoffset={r.offset}/>
                  <defs><linearGradient id={r.grad} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={r.colors[0]}/><stop offset="1" stopColor={r.colors[1]}/></linearGradient></defs>
                </svg>
                <div className="ring-val"><div className="ring-v">{r.value}</div><div className="ring-l">{r.label}</div></div>
              </div>
              <div className="ring-nm">{r.label === 'Carbs' ? 'Carbohydrates' : r.label}</div>
              <div className="ring-meta">{r.meta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SCHOOLS */}
      <div className="card dm-schools">
        <h3>School Compliance Today <span className="more">12 schools</span></h3>
        <div className="sub">% of MBG targets met across all 5 macros</div>
        {SCHOOLS.map((s, i) => (
          <div className="sch-row" key={i}>
            <div className={`sch-av ${s.warn ? 'sch-warn' : ''}`}>{s.init}</div>
            <div className="sch-info">
              <div className="sch-nm">{s.name}</div>
              <div className="sch-meta">{s.city} · {s.det} detections</div>
              <div className="sch-bar"><i style={{ width:`${s.pct}%`, background: s.warn ? 'linear-gradient(90deg,#fbbf24,#f59e0b)' : undefined }}/></div>
            </div>
            <div className="sch-pct" style={s.warn ? { color:'#d97706' } : undefined}>{s.pct}%</div>
          </div>
        ))}
      </div>

      {/* MEALS */}
      <div className="card dm-meals">
        <h3>Today's Meal Gallery <span className="more">8 of 124 →</span></h3>
        <div className="sub">Latest detected meals across all monitored schools</div>
        <div className="meals-grid">
          {MEALS.map((m, i) => (
            <div className="meal" key={i}>
              <div className={`meal-img ${m.cls}`}>
                <span className="meal-conf">{m.conf} conf</span>
                <span className="meal-kcal">{m.kcal}</span>
              </div>
              <div className="meal-body">
                <div className="meal-nm">{m.name}</div>
                <div className="meal-sch">{m.school}</div>
                <div className="meal-nuts">{m.nuts.map((n, j) => <span key={j} className="meal-nut">{n}</span>)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HEATMAP */}
      <div className="card dm-heatmap">
        <h3>Weekly Nutrition Heatmap <span className="more">Last 7 days · % of target ▾</span></h3>
        <div className="sub">Each cell = aggregate compliance of all schools for that macro on that day</div>
        <div className="hm-grid">
          <span/>
          {HEATMAP.cols.map(c => <span className="hm-head" key={c}>{c}</span>)}
          {HEATMAP.rows.map((row, ri) => (
            <React.Fragment key={ri}>
              <span className="hm-lbl">{row}</span>
              {HEATMAP.data[ri].map((v, ci) => (
                <span className={`hm-cell ${heatColor(v)}`} key={`${ri}${ci}`}>{v}</span>
              ))}
            </React.Fragment>
          ))}
        </div>
        <div className="hm-legend">
          % of MBG target
          <i style={{ background:'#fee2e2' }}/>&lt;60
          <i style={{ background:'#dcfce7' }}/>60–80
          <i style={{ background:'#86efac' }}/>80–95
          <i style={{ background:'#22c55e' }}/>95–100
          <i style={{ background:'#16a34a' }}/>100+
        </div>
      </div>

      {/* WEEKLY BARS */}
      <div className="card dm-trend">
        <h3>Weekly Calories <span className="more">All schools ▾</span></h3>
        <div className="sub">Avg kcal per student per day</div>
        <div className="bars-wrap">
          {BARS.map((b, i) => (
            <div className={`bar-col ${b.today ? 'bar-today' : ''}`} key={i}>
              <i style={{ height:`${b.h}%` }} data-v={b.v}/>
              <span className="bar-d">{b.day}</span>
            </div>
          ))}
        </div>
        <div className="bars-footer">
          <div><div className="bars-avg">759 <span>avg kcal</span></div></div>
          <div style={{ textAlign:'right' }}><div style={{ fontSize:11, color:'var(--text-muted)' }}>vs last week</div><div style={{ fontWeight:700, color:'var(--primary)' }}>↑ 4.2%</div></div>
        </div>
      </div>
    </div>
  )
}
