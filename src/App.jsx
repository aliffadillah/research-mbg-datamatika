import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Detection from './pages/Detection'
import NutritionData from './pages/NutritionData'
import DailyMenu from './pages/DailyMenu'
import Prediction from './pages/Prediction'
import Reports from './pages/Reports'
import AKG from './pages/AKG'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<AppLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="detection" element={<Detection />} />
          <Route path="nutrition" element={<NutritionData />} />
          <Route path="daily-menu" element={<DailyMenu />} />
          <Route path="prediction" element={<Prediction />} />
          <Route path="reports" element={<Reports />} />
          <Route path="akg" element={<AKG />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
