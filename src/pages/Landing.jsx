import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScanSearch, LayoutDashboard, ArrowRight, TrendingUp, Activity, CheckCircle, Home, FileText, Boxes } from 'lucide-react'
import './Landing.css'

const FEATURES = [
  { icon: <Boxes size={22}/>, title:'RT-DETR Detection', desc:'Real-time object detection of Indonesian food trays with multi-class bounding boxes and confidence scores.' },
  { icon: <TrendingUp size={22}/>, title:'LSTM Forecasting', desc:'Time-series prediction of weekly nutrition trends with RMSE/MAPE evaluation built in.' },
  { icon: <Activity size={22}/>, title:'Real-time Monitoring', desc:'Live dashboards stream school meal data with confidence gauges and anomaly alerts.' },
  { icon: <CheckCircle size={22}/>, title:'MBG Compliance', desc:'Automatic comparison against MBG standards by portion size (Porsi Besar / Porsi Kecil).' },
  { icon: <Home size={22}/>, title:'Multi-School Tracking', desc:'Centralized monitoring across 120+ schools with per-region drilldowns and benchmarks.' },
  { icon: <FileText size={22}/>, title:'Exportable Reports', desc:'One-click PDF and CSV exports with detection metrics, accuracy, precision and recall.' },
]

const STEPS = [
  { n:'1', title:'Upload Image', desc:'Capture the food tray from any phone or kitchen camera.' },
  { n:'2', title:'RT-DETR Detect', desc:'Backbone + encoder + decoder identify every food item.' },
  { n:'3', title:'Estimate Nutrition', desc:'Per-class lookup computes calories, protein, carbs, fat, fiber.' },
  { n:'4', title:'Monitor & Forecast', desc:'LSTM predicts trends and flags MBG compliance gaps.' },
]

export default function Landing() {
  return (
    <>
      {/* NAV */}
      <header className="nav">
        <div className="container nav-inner">
          <a href="/" className="logo">
            <span className="logo-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M7 20s-2-2-2-6 4-9 9-9c0 4-2 8-5 10"/>
                <path d="M12 22c-2.5-1.5-4-4-4-7 0-3 1.5-5.5 4-7"/>
              </svg>
            </span>
            <span>NutriVision<small>MBG · Monitoring</small></span>
          </a>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#workflow">How it works</a>
            <a href="#impact">Impact</a>
            <a href="#about">About MBG</a>
          </nav>
          <div className="nav-actions">
            <div className="lang-toggle"><span className="active">EN</span><span>ID</span></div>
            <Link to="/login" className="btn btn-ghost">Sign in</Link>
            <Link to="/app/detection" className="btn btn-primary">
              Start Detection <ArrowRight size={14}/>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">
          <motion.div
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6 }}
          >
            <div className="eyebrow">
              <span className="dot"/>
              Powered by RT-DETR + LSTM · Live AI inference
            </div>
            <h1>
              AI-Powered Nutrition Monitoring for <span className="accent">MBG</span>
            </h1>
            <p className="lead">
              Real-time food detection and nutrition estimation for Indonesia's Makan Bergizi Gratis
              school meal program — built on RT-DETR computer vision and LSTM forecasting.
            </p>
            <div className="ctas">
              <motion.div whileHover={{ y:-2 }}>
                <Link to="/app/detection" className="btn btn-primary btn-lg">
                  <ScanSearch size={16}/> Start Detection
                </Link>
              </motion.div>
              <motion.div whileHover={{ y:-2 }}>
                <Link to="/app/dashboard" className="btn btn-outline btn-lg">
                  <LayoutDashboard size={16}/> View Dashboard
                </Link>
              </motion.div>
            </div>
            <div className="trust">
              <div className="avatars"><span/><span/><span/></div>
              Trusted by <strong>120+ schools</strong> across 8 provinces
            </div>
          </motion.div>

          <motion.div
            className="hero-illu"
            initial={{ opacity:0, scale:0.95 }}
            animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.8, delay:0.2 }}
          >
            <div className="tray">
              <div className="food rice"/>
              <div className="food ayam"/>
              <div className="food sayur"/>
              <div className="food tempe"/>
            </div>
            {[
              { cls:'bbox-1', label:'Nasi Putih', conf:'98%', delay:0.4 },
              { cls:'bbox-2', label:'Ayam Goreng', conf:'96%', delay:0.5 },
              { cls:'bbox-3', label:'Tumis Sayur', conf:'94%', delay:0.6 },
              { cls:'bbox-4', label:'Tempe Orek', conf:'92%', delay:0.7 },
            ].map(b => (
              <motion.div
                key={b.cls}
                className={`bbox ${b.cls}`}
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                transition={{ duration:0.5, delay:b.delay }}
              >
                <span className="bbox-label">{b.label} <span className="conf">{b.conf}</span></span>
              </motion.div>
            ))}
            <div className="chip-float c1"><div className="ic">🔥</div><div><small>Calories</small>682 kcal</div></div>
            <div className="chip-float c2"><div className="ic">P</div><div><small>Protein</small>34.2 g</div></div>
            <div className="chip-float c3"><div className="ic">AI</div><div><small>RT-DETR avg confidence</small>95.3%</div></div>
            <div className="dash-preview">
              <h4>Today's Detections</h4>
              <div className="prev-val">2,847 <span>↑ 12%</span></div>
              <div className="dash-bars">
                {[40,55,70,48,82,65,92].map((h,i) => (
                  <i key={i} style={{ height:`${h}%` }}/>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* STAT STRIP */}
        <div className="container">
          <div className="stat-strip">
            {[
              { num:'128,940', unit:'images', label:'Total Food Detected' },
              { num:'12.4M', unit:'kcal', label:'Daily Nutrition Monitored' },
              { num:'96.8', unit:'%', label:'Detection Accuracy' },
              { num:'124', unit:'schools', label:'Active Schools' },
            ].map((s,i) => (
              <div className="stat-item" key={i}>
                <div className="stat-num">{s.num}<span className="stat-unit">{s.unit}</span></div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-header">
            <span className="tag">Platform capabilities</span>
            <h2>Everything you need to monitor school nutrition</h2>
            <p>A complete AI pipeline from camera to report — detect, estimate, forecast, and audit every MBG meal in real time.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f,i) => (
              <motion.div
                className="feature"
                key={i}
                whileHover={{ y:-3 }}
                transition={{ duration:0.2 }}
              >
                <div className="ic-tile">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="section workflow-section" id="workflow" style={{ background:'#fff', borderTop:'1px solid var(--border-light)', borderBottom:'1px solid var(--border-light)' }}>
        <div className="container">
          <div className="section-header">
            <span className="tag">How it works</span>
            <h2>From food tray to nutrition insight in 4 steps</h2>
            <p>The end-to-end AI pipeline behind every detection — no manual data entry required.</p>
          </div>
          <div className="workflow">
            {STEPS.map((s,i) => (
              <div className="wf-step" key={i}>
                <div className="wf-n">{s.n}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BIG STATS */}
      <section className="section" id="impact">
        <div className="container">
          <div className="big-stats">
            {[
              { num:'128K+', label:'Food trays analyzed' },
              { num:'96.8%', label:'RT-DETR mAP accuracy' },
              { num:'12.4M', label:'Daily calories monitored' },
              { num:'124', label:'Active schools (8 provinces)' },
            ].map((s,i) => (
              <div className="bs" key={i}>
                <div className="bs-num">{s.num}</div>
                <div className="bs-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="logo" style={{ marginBottom:14 }}>
                <span className="logo-mark">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M7 20s-2-2-2-6 4-9 9-9c0 4-2 8-5 10"/>
                    <path d="M12 22c-2.5-1.5-4-4-4-7 0-3 1.5-5.5 4-7"/>
                  </svg>
                </span>
                <span>NutriVision<small>MBG · Monitoring</small></span>
              </div>
              <p className="footer-desc">AI-powered nutrition monitoring for Indonesia's Makan Bergizi Gratis school meal program. Built on RT-DETR and LSTM.</p>
            </div>
            <div>
              <h5>Product</h5>
              <ul><li><a href="#">Food Detection</a></li><li><a href="#">Nutrition Database</a></li><li><a href="#">AI Prediction</a></li><li><a href="#">Reports</a></li></ul>
            </div>
            <div>
              <h5>Resources</h5>
              <ul><li><a href="#">Research Paper</a></li><li><a href="#">RT-DETR Model</a></li><li><a href="#">MBG Standards</a></li><li><a href="#">API Docs</a></li></ul>
            </div>
            <div>
              <h5>Organization</h5>
              <ul><li><a href="#">About</a></li><li><a href="#">Schools</a></li><li><a href="#">Contact</a></li><li><a href="#">Privacy</a></li></ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>© 2026 NutriVision MBG · Research prototype</div>
            <div>RT-DETR · LSTM · Built with React + Vite</div>
          </div>
        </div>
      </footer>
    </>
  )
}
