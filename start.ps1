# NutriVision MBG — Start All Servers
# Menjalankan Flask (Python), Node.js backend, dan Vite frontend sekaligus

Write-Host "========================================" -ForegroundColor Green
Write-Host " NutriVision MBG — Starting all servers" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# 1. Flask (Python) — AI inference di :5000
Write-Host "[1/3] Flask inference server   :5000  (Python)" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; python server\app.py" -WindowStyle Normal

Start-Sleep -Seconds 1

# 2. Node.js backend — Supabase/Prisma di :3001
Write-Host "[2/3] Node.js API backend      :3001  (Express + Supabase JS)" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; node src\index.js" -WindowStyle Normal

Start-Sleep -Seconds 2

# 3. Vite frontend
Write-Host "[3/3] Vite React frontend      :5173  (dev server)`n" -ForegroundColor Cyan
Write-Host "  Flask Python  → http://localhost:5000/api/health"    -ForegroundColor Yellow
Write-Host "  Node.js API   → http://localhost:3001/api/nutrition" -ForegroundColor Yellow
Write-Host "  Frontend      → http://localhost:5173`n"             -ForegroundColor Yellow

npm run dev
