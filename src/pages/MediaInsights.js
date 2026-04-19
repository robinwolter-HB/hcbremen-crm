import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const PLATTFORMEN = ['instagram','linkedin','facebook','tiktok','sonstiges']
const PL = { instagram:'📸 Instagram', linkedin:'💼 LinkedIn', facebook:'👥 Facebook', tiktok:'🎵 TikTok', sonstiges:'🌐 Sonstiges' }
const ZR = { taeglich:'Täglich', woechentlich:'Wöchentlich', monatlich:'Monatlich' }

export default function MediaInsights() {
  const { profile } = useAuth()
  const [importe, setImporte] = useState([])
  const [metriken, setMetriken] = useState([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [aktivePlattform, setAktivePlattform] = useState('alle')
  const [importForm, setImportForm] = useState({ plattform:'instagram', zeitraum_typ:'monatlich', zeitraum_von:'', zeitraum_bis:'' })
  const [csvVorschau, setCsvVorschau] = useState(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: imp }, { data: met }] = await Promise.all([
      supabase.from('media_insights_importe').select('*').order('importiert_am', { ascending: false }),
      supabase.from('media_insights_metriken').select('*').order('datum', { ascending: true }),
    ])
    setImporte(imp || []); setMetriken(met || [])
    setLoading(false)
  }

  function parseCsv(text) {
    const lines = text.trim().split('\n'); if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase())
    return lines.slice(1).map(line => { const vals = line.split(',').map(v=>v.trim().replace(/"/g,'')); return headers.reduce((obj,h,i)=>{ obj[h]=vals[i]||''; return obj },{}) })
  }

  function mapRow(row, plattform) {
    const get = (...keys) => { for(const k of keys){ const f=Object.keys(row).find(rk=>rk.includes(k)); if(f&&row[f]) return parseInt(row[f].replace(/[^\d]/g,''))||0 } return 0 }
    const getDate = () => { const dk=Object.keys(row).find(k=>k.includes('datum')||k.includes('date')||k.includes('tag')); return row[dk]||'' }
    return { plattform, datum:getDate(), reichweite:get('reichweite','reach'), impressionen:get('impression','impres'), interaktionen:get('interak','engag'), neue_follower:get('neue_follower','new_follower','gained'), follower_gesamt:get('follower_gesamt','total_follower'), profilbesuche:get('profilbesuche','profile_visit'), klicks:get('klick','click'), beitraege_anzahl:get('beiträge','posts') }
  }

  async function handleCsvUpload(e) {
    const file = e.target.files[0]; if(!file) return
    const text = await file.text()
    setCsvVorschau({ rows: parseCsv(text), dateiname: file.name })
  }

  async function importBestaetigen() {
    if(!csvVorschau || !importForm.zeitraum_von || !importForm.zeitraum_bis) return
    setImporting(true)
    const { data: ir } = await supabase.from('media_insights_importe').insert({ ...importForm, rohdaten: csvVorschau.rows, importiert_von: profile.id }).select().single()
    if(ir) {
      const met = csvVorschau.rows.map(row=>({...mapRow(row,importForm.plattform), import_id:ir.id})).filter(m=>m.datum)
      if(met.length>0) await supabase.from('media_insights_metriken').insert(met)
    }
    setCsvVorschau(null); setShowImport(false); setImporting(false); load()
  }

  const gef = aktivePlattform==='alle' ? metriken : metriken.filter(m=>m.plattform===aktivePlattform)
  const sum = gef.reduce((acc,m)=>({ reichweite:acc.reichweite+(m.reichweite||0), impressionen:acc.impressionen+(m.impressionen||0), interaktionen:acc.interaktionen+(m.interaktionen||0), neue_follower:acc.neue_follower+(m.neue_follower||0), follower_gesamt:Math.max(acc.follower_gesamt,m.follower_gesamt||0) }),{reichweite:0,impressionen:0,interaktionen:0,neue_follower:0,follower_gesamt:0})
  const letzten = gef.slice(-30)
  const maxR = Math.max(...letzten.map(m=>m.reichweite||0), 1)

  return (
    <div>
      <div className="toolbar">
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['alle',...PLATTFORMEN].map(p => (
            <button key={p} onClick={()=>setAktivePlattform(p)} className={`btn btn-sm ${aktivePlattform===p?'btn-primary':'btn-outline'}`}>{p==='alle'?'Alle Kanäle':PL[p]}</button>
          ))}
        </div>
        <button onClick={()=>setShowImport(true)} className="btn btn-gold">⬆ CSV importieren</button>
      </div>

      {showImport && (
        <div className="card">
          <h3 style={{ fontSize:16, marginBottom:16, color:'var(--navy)' }}>CSV-Import</h3>
          <div className="form-row">
            <div className="form-group"><label>Plattform</label><select value={importForm.plattform} onChange={e=>setImportForm(p=>({...p,plattform:e.target.value}))}>{PLATTFORMEN.map(p=><option key={p} value={p}>{PL[p]}</option>)}</select></div>
            <div className="form-group"><label>Zeitraum-Typ</label><select value={importForm.zeitraum_typ} onChange={e=>setImportForm(p=>({...p,zeitraum_typ:e.target.value}))}><option value="taeglich">Täglich</option><option value="woechentlich">Wöchentlich</option><option value="monatlich">Monatlich</option></select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Von</label><input type="date" value={importForm.zeitraum_von} onChange={e=>setImportForm(p=>({...p,zeitraum_von:e.target.value}))} /></div>
            <div className="form-group"><label>Bis</label><input type="date" value={importForm.zeitraum_bis} onChange={e=>setImportForm(p=>({...p,zeitraum_bis:e.target.value}))} /></div>
          </div>
          <div className="alert alert-info" style={{ fontSize:13, marginBottom:12 }}>💡 CSV sollte Spalten enthalten wie: datum, reichweite, impressionen, interaktionen, follower_gesamt, neue_follower</div>
          <div style={{ display:'flex', gap:8 }}>
            <label className="btn btn-outline" style={{ cursor:'pointer' }}>
              📁 CSV-Datei wählen
              <input type="file" accept=".csv" style={{ display:'none' }} onChange={handleCsvUpload} />
            </label>
            <button onClick={()=>setShowImport(false)} className="btn btn-outline">Abbrechen</button>
          </div>
          {csvVorschau && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontWeight:600, marginBottom:8, fontSize:13 }}>Vorschau: {csvVorschau.dateiname} ({csvVorschau.rows.length} Zeilen)</div>
              <div style={{ overflowX:'auto', background:'var(--gray-100)', borderRadius:'var(--radius)', padding:12, marginBottom:12 }}>
                <table style={{ fontSize:11, borderCollapse:'collapse', whiteSpace:'nowrap' }}>
                  <thead><tr>{Object.keys(csvVorschau.rows[0]||{}).map(h=><th key={h} style={{ padding:'4px 8px', color:'var(--navy)', textAlign:'left', fontWeight:600 }}>{h}</th>)}</tr></thead>
                  <tbody>{csvVorschau.rows.slice(0,5).map((row,i)=><tr key={i}>{Object.values(row).map((v,j)=><td key={j} style={{ padding:'4px 8px', borderTop:'1px solid var(--gray-200)' }}>{v}</td>)}</tr>)}</tbody>
                </table>
                {csvVorschau.rows.length>5 && <div style={{ fontSize:11, color:'var(--gray-400)', padding:'4px 8px' }}>… und {csvVorschau.rows.length-5} weitere Zeilen</div>}
              </div>
              <button onClick={importBestaetigen} className="btn btn-primary" disabled={importing}>{importing?'Importiere…':`✓ ${csvVorschau.rows.length} Zeilen importieren`}</button>
            </div>
          )}
        </div>
      )}

      {loading ? <div className="loading-center"><div className="spinner"/></div> : metriken.length===0 ? (
        <div className="empty-state">
          <p style={{ fontSize:32, marginBottom:12 }}>📊</p>
          <p style={{ fontWeight:600, marginBottom:6 }}>Noch keine Daten importiert</p>
          <p>Exportiere deine Insights von Instagram, LinkedIn oder Facebook als CSV und importiere sie hier.</p>
        </div>
      ) : (
        <>
          <div className="stats-row">
            {[['👁','Gesamtreichweite',sum.reichweite],['📣','Impressionen',sum.impressionen],['❤️','Interaktionen',sum.interaktionen],['+📈','Neue Follower',sum.neue_follower],['👥','Follower Gesamt',sum.follower_gesamt]].map(([icon,label,wert])=>(
              <div key={label} className="stat-card gold">
                <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
                <div className="stat-num" style={{ fontSize:26 }}>{wert.toLocaleString('de-DE')}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {letzten.length>0 && (
            <div className="card">
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12, color:'var(--gray-600)' }}>📊 Reichweite (letzte {letzten.length} Einträge)</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:80 }}>
                {letzten.map((m,i)=>(
                  <div key={i} title={`${m.datum}: ${(m.reichweite||0).toLocaleString('de-DE')}`}
                    style={{ flex:1, background:'var(--gold)', height:`${Math.max(4,((m.reichweite||0)/maxR)*80)}px`, borderRadius:'2px 2px 0 0', opacity:0.7, cursor:'default', transition:'opacity 0.15s' }}
                    onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=0.7} />
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, color:'var(--gray-400)' }}>
                <span>{letzten[0]?.datum}</span><span>{letzten[letzten.length-1]?.datum}</span>
              </div>
            </div>
          )}

          <div className="card">
            <h3 style={{ fontSize:14, color:'var(--navy)', marginBottom:12 }}>Import-Verlauf</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Plattform</th><th>Zeitraum</th><th>Von</th><th>Bis</th><th>Importiert</th></tr></thead>
                <tbody>
                  {importe.map(imp=>(
                    <tr key={imp.id}>
                      <td>{PL[imp.plattform]}</td>
                      <td>{ZR[imp.zeitraum_typ]}</td>
                      <td>{new Date(imp.zeitraum_von).toLocaleDateString('de-DE')}</td>
                      <td>{new Date(imp.zeitraum_bis).toLocaleDateString('de-DE')}</td>
                      <td style={{ color:'var(--gray-400)', fontSize:12 }}>{new Date(imp.importiert_am).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
