import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ user: 'admin@mbg.go.id', pass: 'password123' })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.user.trim() || !form.pass.trim()) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/app/dashboard')
    }, 800)
  }

  return (
    <div className="login-wrap">
      <aside className="login-left">
        <div className="login-brand">
          <span className="brand-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M7 20s-2-2-2-6 4-9 9-9c0 4-2 8-5 10"/>
              <path d="M12 22c-2.5-1.5-4-4-4-7 0-3 1.5-5.5 4-7"/>
            </svg>
          </span>
          <span>NutriVision<small>MBG · Monitoring</small></span>
        </div>

        <div>
          <div className="login-illu">
            <div className="login-tray">
              <div className="lf lf1"/><div className="lf lf2"/>
              <div className="lf lf3"/><div className="lf lf4"/>
            </div>
            <div className="lb lb1"><span className="lb-lbl">Nasi · 98%</span></div>
            <div className="lb lb2"><span className="lb-lbl">Ayam · 96%</span></div>
            <div className="lb lb3"><span className="lb-lbl">Sayur · 94%</span></div>
            <div className="lb lb4"><span className="lb-lbl">Tempe · 92%</span></div>
          </div>
          <h1>Monitor every meal.<br/>Predict every trend.</h1>
          <p className="login-tagline">
            Sign in to access the AI dashboard that powers nutrition
            oversight for 120+ MBG schools across Indonesia.
          </p>
        </div>

        <div className="login-metrics">
          <div className="lm"><div className="lm-v">128K+</div><div className="lm-l">Detections</div></div>
          <div className="lm"><div className="lm-v">96.8%</div><div className="lm-l">mAP accuracy</div></div>
          <div className="lm"><div className="lm-v">124</div><div className="lm-l">Schools</div></div>
        </div>
      </aside>

      <section className="login-right">
        <div className="login-right-top">
          <Link to="/" className="back-link"><ArrowLeft size={14}/> Back to home</Link>
          <div className="lang-toggle"><span className="active">EN</span><span>ID</span></div>
        </div>
        <div className="form-wrap">
          <form className="form-card" onSubmit={handleSubmit}>
            <h2>Welcome back</h2>
            <p className="form-sub">Sign in to continue to your NutriVision MBG workspace.</p>

            <div className="field">
              <label>Username or email</label>
              <div className="input-wrap">
                <User size={18} className="input-icon"/>
                <input
                  type="text"
                  placeholder="admin@mbg.go.id"
                  value={form.user}
                  onChange={e => setForm({...form, user: e.target.value})}
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <Lock size={18} className="input-icon"/>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.pass}
                  onChange={e => setForm({...form, pass: e.target.value})}
                />
                <button type="button" className="eye-btn" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            <div className="form-row">
              <label className="check-label">
                <input type="checkbox" defaultChecked /> Remember me for 30 days
              </label>
              <a href="#" className="forgot">Forgot password?</a>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <span className="loader"/>
              ) : (
                <>Sign in <ArrowRight size={16}/></>
              )}
            </button>

            <div className="divider">demo prototype</div>

            <div className="demo-box">
              <strong>Try any credentials</strong>
              This is a frontend prototype — any non-empty username and password will sign you in. Try <code>demo</code> / <code>demo</code>.
            </div>

            <p className="form-foot">No account yet? <a href="#">Contact your school admin</a></p>
          </form>
        </div>
      </section>
    </div>
  )
}
