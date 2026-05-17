import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import './AppLayout.css'

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <TopBar />
        <Outlet />
      </main>
    </div>
  )
}
