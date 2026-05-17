import { useLocation } from 'react-router-dom'
import { Search, Bell } from 'lucide-react'
import './TopBar.css'

const ROUTE_META = {
  '/app/dashboard': { crumb: 'Workspace · Dashboard', title: 'Overview', live: true },
  '/app/detection': { crumb: 'Workspace · Food Detection', title: 'RT-DETR Detection', live: true, liveText: 'Inference ready' },
  '/app/nutrition': { crumb: 'Workspace · Nutrition Data', title: 'Food Nutrition Database' },
  '/app/daily-menu': { crumb: 'Workspace · Daily Menu', title: 'Daily Menu Monitoring' },
  '/app/prediction': { crumb: 'Workspace · AI Prediction', title: 'LSTM Nutrition Forecasting' },
  '/app/reports': { crumb: 'Workspace · Reports', title: 'Detection Reports' },
}

export default function TopBar() {
  const location = useLocation()
  const meta = ROUTE_META[location.pathname] || { crumb: 'Workspace', title: 'NutriVision' }

  return (
    <header className="topbar">
      <div className="tb-left">
        <div className="tb-crumb">{meta.crumb}</div>
        <div className="tb-title">
          {meta.title}
          {meta.live && (
            <>
              <span className="live-dot" />
              <span className="live-text">{meta.liveText || 'Live'}</span>
            </>
          )}
        </div>
      </div>
      <div className="tb-right">
        <div className="tb-search">
          <Search size={16} />
          <span>Search schools, foods, reports…</span>
          <span className="kbd">⌘K</span>
        </div>
        <div className="lang-toggle">
          <span className="active">EN</span>
          <span>ID</span>
        </div>
        <button className="tb-icon-btn">
          <Bell size={18} />
          <span className="notif-dot" />
        </button>
        <div className="tb-avatar">AF</div>
      </div>
    </header>
  )
}
