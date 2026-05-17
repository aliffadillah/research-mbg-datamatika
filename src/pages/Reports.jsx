import { Download, FileText, Filter, Calendar } from 'lucide-react'
import './Reports.css'

const REPORTS = [
  { id:'RPT-2847', title:'Daily Detection Summary', date:'May 17, 2026', school:'All Schools', type:'Detection', size:'2.4 MB', status:'Ready' },
  { id:'RPT-2846', title:'Weekly Nutrition Compliance', date:'May 10–16, 2026', school:'Jakarta Region', type:'Compliance', size:'3.1 MB', status:'Ready' },
  { id:'RPT-2845', title:'LSTM Forecast Report', date:'May 17, 2026', school:'All Schools', type:'Prediction', size:'1.8 MB', status:'Ready' },
  { id:'RPT-2844', title:'Monthly School Performance', date:'April 2026', school:'All Schools', type:'Performance', size:'4.2 MB', status:'Ready' },
  { id:'RPT-2843', title:'RT-DETR Model Accuracy', date:'May 17, 2026', school:'All Schools', type:'Model', size:'1.2 MB', status:'Ready' },
  { id:'RPT-2842', title:'Protein Deficiency Alert', date:'May 16, 2026', school:'SDN Pondok Indah', type:'Alert', size:'0.8 MB', status:'Ready' },
  { id:'RPT-2841', title:'Daily Detection Summary', date:'May 16, 2026', school:'All Schools', type:'Detection', size:'2.3 MB', status:'Ready' },
  { id:'RPT-2840', title:'Weekly Nutrition Compliance', date:'May 3–9, 2026', school:'Bandung Region', type:'Compliance', size:'2.9 MB', status:'Ready' },
]

const TYPE_COLORS = {
  Detection:'pill-success',
  Compliance:'pill-cyan',
  Prediction:'pill-violet',
  Performance:'pill-amber',
  Model:'pill-blue',
  Alert:'pill-danger',
}

const SUMMARY = [
  { label:'Total Reports', value:'248', delta:'↑ 12 this week' },
  { label:'Auto-generated', value:'186', delta:'75% of total' },
  { label:'Pending Review', value:'3', delta:'2 alerts' },
  { label:'Storage Used', value:'1.2 GB', delta:'of 10 GB' },
]

export default function Reports() {
  return (
    <div className="rpt-content">
      <div className="page-head">
        <div><h1>Detection Reports</h1><p>Auto-generated and manual reports from all monitored schools</p></div>
        <div className="page-acts">
          <button className="btn btn-outline btn-sm"><Filter size={14}/>Filter</button>
          <button className="btn btn-primary btn-sm"><FileText size={14}/>Generate Report</button>
        </div>
      </div>

      {/* SUMMARY KPIS */}
      {SUMMARY.map((s, i) => (
        <div className="card rpt-kpi" key={i}>
          <div className="rk-lbl">{s.label}</div>
          <div className="rk-val">{s.value}</div>
          <div className="rk-delta">{s.delta}</div>
        </div>
      ))}

      {/* REPORTS TABLE */}
      <div className="card rpt-table">
        <h3>All Reports <span className="more">248 total</span></h3>
        <div className="sub">Sorted by most recent · click to preview or download</div>
        <table className="tbl">
          <thead>
            <tr><th>Report</th><th>Date</th><th>School</th><th>Type</th><th>Size</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {REPORTS.map((r, i) => (
              <tr key={i}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div className="rpt-icon"><FileText size={18}/></div>
                    <div><div className="rpt-nm">{r.title}</div><div className="rpt-id">{r.id}</div></div>
                  </div>
                </td>
                <td><div style={{ display:'flex', alignItems:'center', gap:6 }}><Calendar size={12}/>{r.date}</div></td>
                <td>{r.school}</td>
                <td><span className={`pill-rpt ${TYPE_COLORS[r.type]}`}>{r.type}</span></td>
                <td>{r.size}</td>
                <td><span className="pill pill-success">Ready</span></td>
                <td>
                  <button className="btn btn-outline btn-sm"><Download size={12}/>PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rpt-foot">
          <div>Showing 8 of 248 reports</div>
          <div className="nd-pag"><a>«</a><a className="on">1</a><a>2</a><a>3</a><a>…</a><a>31</a><a>»</a></div>
        </div>
      </div>
    </div>
  )
}
