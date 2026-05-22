import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ScanSearch, Database, CalendarDays,
  TrendingUp, FileText, BookOpen, Settings, LogOut
} from 'lucide-react'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/detection', icon: ScanSearch, label: 'Food Detection', badge: 'AI' },
  { to: '/app/nutrition', icon: Database, label: 'Nutrition Data' },
  { to: '/app/daily-menu', icon: CalendarDays, label: 'Daily Menu' },
  { to: '/app/prediction', icon: TrendingUp, label: 'AI Prediction' },
  { to: '/app/reports', icon: FileText, label: 'Reports' },
  { to: '/app/akg', icon: BookOpen, label: 'AKG — Gizi MBG', badge: 'MBG' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <a href="/" className="sb-brand">
        <span className="sb-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M7 20s-2-2-2-6 4-9 9-9c0 4-2 8-5 10"/>
            <path d="M12 22c-2.5-1.5-4-4-4-7 0-3 1.5-5.5 4-7"/>
          </svg>
        </span>
        <span>NutriVision<small>MBG</small></span>
      </a>

      <div className="sb-section">Workspace</div>
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}
        >
          <item.icon size={18} />
          {item.label}
          {item.badge && <span className="sb-badge">{item.badge}</span>}
        </NavLink>
      ))}

      <div className="sb-section">Account</div>
      <a className="sb-link" href="#">
        <Settings size={18} />
        Settings
      </a>

      <div className="sb-user">
        <div className="sb-av">AF</div>
        <div>
          <div className="sb-nm">Andi Fadillah</div>
          <div className="sb-em">admin@mbg.go.id</div>
        </div>
      </div>
    </aside>
  )
}
