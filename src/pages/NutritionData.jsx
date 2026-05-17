import { useState } from 'react'
import { Plus, Download, Upload, X, Trash2, MoreHorizontal } from 'lucide-react'
import './NutritionData.css'

const FOODS = [
  { id:'food_001', name:'Ayam Goreng', cat:'Protein', cal:239, pro:27.3, carb:0, fat:13.6, fiber:0, sugar:0, sodium:365, bg:'linear-gradient(135deg,#fde68a,#d97706)' },
  { id:'food_002', name:'Nasi Putih', cat:'Karbohidrat', cal:130, pro:2.7, carb:28.2, fat:0.3, fiber:0.4, sugar:0.1, sodium:1, bg:'linear-gradient(135deg,#fef9c3,#fde047)' },
  { id:'food_003', name:'Tumis Kangkung', cat:'Sayur', cal:52, pro:2.6, carb:5.4, fat:2.8, fiber:2.1, sugar:0.3, sodium:235, bg:'linear-gradient(135deg,#bbf7d0,#16a34a)' },
  { id:'food_004', name:'Tempe Orek', cat:'Protein', cal:193, pro:18.5, carb:9.4, fat:10.8, fiber:1.4, sugar:0.7, sodium:312, bg:'linear-gradient(135deg,#fef3c7,#a16207)' },
  { id:'food_005', name:'Tahu Goreng', cat:'Protein', cal:180, pro:11.0, carb:5.4, fat:13.2, fiber:1.0, sugar:0.5, sodium:180, bg:'linear-gradient(135deg,#fef9c3,#fef08a)' },
  { id:'food_006', name:'Sambal Goreng Ati', cat:'Protein', cal:198, pro:20.4, carb:4.2, fat:11.6, fiber:0.8, sugar:1.2, sodium:420, bg:'linear-gradient(135deg,#fee2e2,#dc2626)' },
  { id:'food_007', name:'Pisang Ambon', cat:'Buah', cal:89, pro:1.1, carb:22.8, fat:0.3, fiber:2.6, sugar:12.2, sodium:1, bg:'linear-gradient(135deg,#fce7f3,#db2777)' },
  { id:'food_008', name:'Gado-Gado', cat:'Sayur', cal:137, pro:5.4, carb:11.2, fat:8.6, fiber:3.7, sugar:3.1, sodium:286, bg:'linear-gradient(135deg,#dcfce7,#15803d)' },
  { id:'food_009', name:'Ikan Goreng', cat:'Protein', cal:215, pro:23.5, carb:0.8, fat:13.0, fiber:0, sugar:0, sodium:340, bg:'linear-gradient(135deg,#a5f3fc,#0891b2)' },
  { id:'food_010', name:'Susu UHT', cat:'Snack', cal:61, pro:3.2, carb:4.8, fat:3.3, fiber:0, sugar:4.8, sodium:43, bg:'linear-gradient(135deg,#e0e7ff,#4f46e5)' },
]

const CAT_COLORS = { Protein:'p-protein', Karbohidrat:'p-karbo', Sayur:'p-sayur', Buah:'p-buah', Snack:'p-snack' }

export default function NutritionData() {
  const [drawer, setDrawer] = useState(null)
  const [selected, setSelected] = useState(new Set([1]))

  return (
    <div className="nd-content">
      <div className="page-head">
        <div>
          <h1>Food Nutrition Database</h1>
          <p>30 Indonesian foods · used for RT-DETR class-to-nutrition mapping · values per 100g</p>
        </div>
        <div className="page-acts">
          <button className="btn btn-outline btn-sm"><Download size={14}/>Export CSV</button>
          <button className="btn btn-outline btn-sm"><Upload size={14}/>Import</button>
          <button className="btn btn-primary btn-sm"><Plus size={14}/>Add Food</button>
        </div>
      </div>

      <div className="nd-filters">
        <div className="nd-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input placeholder="Search by food name…"/>
        </div>
        <span className="chip-sel on">Category: All</span>
        <span className="chip-sel">+ Calories range</span>
        <span className="chip-sel">+ Protein range</span>
        <div className="nd-filter-right">Showing {FOODS.length} of 30</div>
      </div>

      <div className="nd-table-card">
        <div className="nd-table-head">
          <div className="nd-table-t">All foods <span className="nd-cnt">{30}</span></div>
          <div className="nd-cols">Columns ▾</div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width:30 }}><input type="checkbox"/></th>
                <th>Food Name ↑</th><th>Category</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th><th>Fiber</th><th>Sugar</th><th>Sodium</th><th></th>
              </tr>
            </thead>
            <tbody>
              {FOODS.map((f, i) => (
                <tr key={f.id} onClick={() => setDrawer(f)} style={{ cursor:'pointer' }}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(i)} onChange={() => {
                    const n = new Set(selected)
                    n.has(i) ? n.delete(i) : n.add(i)
                    setSelected(n)
                  }}/></td>
                  <td>
                    <div className="nd-name">
                      <span className="nd-thumb" style={{ background:f.bg }}/>
                      <div><div className="nd-nm">{f.name}</div><div className="nd-id">{f.id}</div></div>
                    </div>
                  </td>
                  <td><span className={`pill-cat ${CAT_COLORS[f.cat]}`}>{f.cat}</span></td>
                  <td>{f.cal} <span style={{ color:'var(--text-faint)' }}>kcal</span></td>
                  <td>{f.pro} g</td><td>{f.carb} g</td><td>{f.fat} g</td><td>{f.fiber} g</td><td>{f.sugar} g</td><td>{f.sodium} mg</td>
                  <td className="nd-act" onClick={e => e.stopPropagation()}>
                    <button className="act-btn"><MoreHorizontal size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="nd-foot">
          <div>{FOODS.length} of 30 foods · {selected.size} selected</div>
          <div className="nd-pag"><a>«</a><a className="on">1</a><a>2</a><a>3</a><a>»</a></div>
        </div>
      </div>

      {/* DRAWER */}
      {drawer && (
        <aside className="nd-drawer">
          <div className="nd-drawer-head">
            <h3>Edit Food</h3>
            <button className="nd-close" onClick={() => setDrawer(null)}><X size={18}/></button>
          </div>
          <div className="nd-preview">
            <div className="nd-pthumb" style={{ background:drawer.bg }}/>
            <div><div className="nd-pnm">{drawer.name}</div><div className="nd-pmeta">{drawer.id} · {drawer.cat} · per 100g</div></div>
          </div>
          <div className="nd-field"><label>Food name</label><input defaultValue={drawer.name}/></div>
          <div className="nd-field"><label>Category</label><select defaultValue={drawer.cat}><option>Karbohidrat</option><option>Protein</option><option>Sayur</option><option>Buah</option><option>Snack</option></select></div>
          <h4 className="nd-section-label">Nutrition per 100g</h4>
          <div className="nd-grid2">
            <div className="nd-field"><label>Calories (kcal)</label><input defaultValue={drawer.cal}/></div>
            <div className="nd-field"><label>Protein (g)</label><input defaultValue={drawer.pro}/></div>
            <div className="nd-field"><label>Carbohydrates (g)</label><input defaultValue={drawer.carb}/></div>
            <div className="nd-field"><label>Fat (g)</label><input defaultValue={drawer.fat}/></div>
            <div className="nd-field"><label>Fiber (g)</label><input defaultValue={drawer.fiber}/></div>
            <div className="nd-field"><label>Sugar (g)</label><input defaultValue={drawer.sugar}/></div>
            <div className="nd-field"><label>Sodium (mg)</label><input defaultValue={drawer.sodium}/></div>
            <div className="nd-field"><label>Serving size (g)</label><input defaultValue="180"/></div>
          </div>
          <div className="nd-drawer-actions">
            <button className="btn nd-danger"><Trash2 size={14}/>Delete</button>
            <button className="btn btn-outline btn-sm" onClick={() => setDrawer(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm">Save changes</button>
          </div>
        </aside>
      )}
    </div>
  )
}
