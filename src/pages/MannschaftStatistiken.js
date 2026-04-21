import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function MannschaftStatistiken() {
  const [statistiken, setStatistiken] = useState([])
  const [spieler, setSpieler] = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [saisons, setSaisons] = useState([])
  const [spieltage, setSpieltage] = useState([])
  const [aktiveSaison, setAktiveSaison] = useState('')
  const [mannschaftFilter, setMannschaftFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ spieler_id:'', saison:'', event_id:'', datum:'', gegner:'', gespielt:true, startelf:false, tore:0, assists:0, gelbe_karten:0, rote_karten:0, sieben_meter_tore:0, sieben_meter_versuche:0, bewertung:'', notizen:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: st }, { data: sp }, { data: mn }, { data: sa }, { data: ev }] = await Promise.all([
      supabase.from('spieler_statistiken').select('*, spieler(vorname, nachname, mannschaft:mannschaft_id(name,farbe)), event:event_id(name)').order('datum', { ascending: false }),
      supabase.from('spieler').select('id, vorname, nachname, mannschaft_id, mannschaft:mannschaft_id(name)').eq('aktiv', true).order('nachname'),
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('saisons').select('*').order('name'),
      supabase.from('veranstaltungen').select('id, name, datum').in('art', ['Heimspiel','Auswärtsspiel','Turnier']).order('datum', { ascending: false }).limit(40),
    ])
    setStatistiken(st || [])
    setSpieler(sp || [])
    setMannschaften(mn || [])
    setSaisons(sa || [])
    setSpieltage(ev || [])
    if (sa?.length) setAktiveSaison(sa.find(s => s.aktiv)?.name || sa[0]?.name || '')
    setLoading(false)
  }

  async function speichern() {
    if (!form.spieler_id || !form.saison) return
    setSaving(true)
    const payload = { ...form, tore: parseInt(form.tore)||0, assists: parseInt(form.assists)||0, gelbe_karten: parseInt(form.gelbe_karten)||0, rote_karten: parseInt(form.rote_karten)||0, sieben_meter_tore: parseInt(form.sieben_meter_tore)||0, sieben_meter_versuche: parseInt(form.sieben_meter_versuche)||0, bewertung: form.bewertung ? parseFloat(form.bewertung) : null, event_id: form.event_id || null, datum: form.datum || null }
    await supabase.from('spieler_statistiken').insert(payload)
    setSaving(false); setShowForm(false); load()
  }

  const gefiltert = statistiken.filter(s => {
    const matchSaison = !aktiveSaison || s.saison === aktiveSaison
    const matchMannschaft = !mannschaftFilter || s.spieler?.mannschaft_id === mannschaftFilter || s.spieler?.mannschaft?.name === mannschaften.find(m=>m.id===mannschaftFilter)?.name
    return matchSaison && matchMannschaft
  })

  // Rangliste
  const rangliste = spieler.map(sp => {
    const spStats = gefiltert.filter(s => s.spieler_id === sp.id)
    return { ...sp, spiele: spStats.filter(s=>s.gespielt).length, tore: spStats.reduce((a,s)=>a+(s.tore||0),0), assists: spStats.reduce((a,s)=>a+(s.assists||0),0) }
  }).filter(sp => sp.tore > 0 || sp.assists > 0 || sp.spiele > 0).sort((a,b) => (b.tore+b.assists)-(a.tore+a.assists))

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={aktiveSaison} onChange={e => setAktiveSaison(e.target.value)}
            style={{ padding:'6px 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13 }}>
            <option value="">Alle Saisons</option>
            {saisons.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select value={mannschaftFilter} onChange={e => setMannschaftFilter(e.target.value)}
            style={{ padding:'6px 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13 }}>
            <option value="">Alle Mannschaften</option>
            {mannschaften.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Statistik eintragen</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header"><span className="modal-title">Statistik eintragen</span><button className="close-btn" onClick={() => setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Spieler *</label>
                  <select value={form.spieler_id} onChange={e=>setForm(p=>({...p,spieler_id:e.target.value}))}>
                    <option value="">Wählen…</option>
                    {spieler.map(s => <option key={s.id} value={s.id}>{s.vorname} {s.nachname} ({s.mannschaft?.name})</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Saison *</label>
                  <select value={form.saison} onChange={e=>setForm(p=>({...p,saison:e.target.value}))}>
                    <option value="">Wählen…</option>
                    {saisons.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Spieltag (Event)</label>
                  <select value={form.event_id} onChange={e=>{ const ev=spieltage.find(s=>s.id===e.target.value); setForm(p=>({...p,event_id:e.target.value,datum:ev?.datum||p.datum})) }}>
                    <option value="">Kein Event</option>
                    {spieltage.map(e => <option key={e.id} value={e.id}>{e.name}{e.datum?' · '+new Date(e.datum+'T00:00:00').toLocaleDateString('de-DE'):''}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Datum</label><input type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Gegner</label><input value={form.gegner} onChange={e=>setForm(p=>({...p,gegner:e.target.value}))} placeholder="Gegnerteam" /></div>
              <div className="form-row-3">
                <div className="form-group"><label>Tore</label><input type="number" min="0" value={form.tore} onChange={e=>setForm(p=>({...p,tore:e.target.value}))} /></div>
                <div className="form-group"><label>Assists</label><input type="number" min="0" value={form.assists} onChange={e=>setForm(p=>({...p,assists:e.target.value}))} /></div>
                <div className="form-group"><label>7m Tore/Versuche</label>
                  <div style={{ display:'flex', gap:4 }}>
                    <input type="number" min="0" value={form.sieben_meter_tore} onChange={e=>setForm(p=>({...p,sieben_meter_tore:e.target.value}))} style={{ width:'50%' }} />
                    <input type="number" min="0" value={form.sieben_meter_versuche} onChange={e=>setForm(p=>({...p,sieben_meter_versuche:e.target.value}))} style={{ width:'50%' }} />
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Gelbe Karten</label><input type="number" min="0" value={form.gelbe_karten} onChange={e=>setForm(p=>({...p,gelbe_karten:e.target.value}))} /></div>
                <div className="form-group"><label>Rote Karten</label><input type="number" min="0" value={form.rote_karten} onChange={e=>setForm(p=>({...p,rote_karten:e.target.value}))} /></div>
                <div className="form-group"><label>Bewertung (1-10)</label><input type="number" min="1" max="10" step="0.5" value={form.bewertung} onChange={e=>setForm(p=>({...p,bewertung:e.target.value}))} /></div>
              </div>
              <div style={{ display:'flex', gap:16, marginBottom:8 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer' }}><input type="checkbox" checked={form.gespielt} onChange={e=>setForm(p=>({...p,gespielt:e.target.checked}))} />Gespielt</label>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer' }}><input type="checkbox" checked={form.startelf} onChange={e=>setForm(p=>({...p,startelf:e.target.checked}))} />Startelf</label>
              </div>
              <div className="form-group"><label>Notizen</label><textarea value={form.notizen} onChange={e=>setForm(p=>({...p,notizen:e.target.value}))} rows={2} /></div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowForm(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={speichern} className="btn btn-primary" disabled={saving}>{saving?'Speichern…':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Rangliste */}
      {rangliste.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>🏆 Torschützenliste {aktiveSaison}</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Spieler</th><th>Mannschaft</th><th>Spiele</th><th>Tore</th><th>Assists</th><th>Punkte</th></tr></thead>
              <tbody>
                {rangliste.slice(0,15).map((sp, i) => (
                  <tr key={sp.id} style={{ background: i === 0 ? '#fff8e8' : 'inherit' }}>
                    <td style={{ fontWeight: 700, color: i < 3 ? 'var(--gold)' : 'var(--gray-400)', fontSize: 16 }}>{i+1}.</td>
                    <td style={{ fontWeight: 600 }}>{sp.vorname} {sp.nachname}</td>
                    <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--gray-100)', color: 'var(--gray-600)' }}>{sp.mannschaft?.name}</span></td>
                    <td>{sp.spiele}</td>
                    <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{sp.tore}</td>
                    <td>{sp.assists}</td>
                    <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{sp.tore + sp.assists}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alle Einträge */}
      {gefiltert.length === 0 ? <div className="empty-state card"><p>Keine Statistiken gefunden.</p></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Spieler</th><th>Datum</th><th>Spiel</th><th>Tore</th><th>Assists</th><th>7m</th><th>Karten</th><th>Bewertung</th></tr></thead>
            <tbody>
              {gefiltert.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, whiteSpace:'nowrap' }}>{s.spieler?.vorname} {s.spieler?.nachname}</td>
                  <td style={{ fontSize:12 }}>{s.datum ? new Date(s.datum).toLocaleDateString('de-DE') : '–'}</td>
                  <td style={{ fontSize:12 }}>{s.event?.name || s.gegner || '–'}</td>
                  <td style={{ fontWeight:600 }}>{s.tore || 0}</td>
                  <td>{s.assists || 0}</td>
                  <td style={{ fontSize:12 }}>{s.sieben_meter_tore||0}/{s.sieben_meter_versuche||0}</td>
                  <td>{s.gelbe_karten ? <span style={{color:'var(--orange)'}}>🟨</span> : ''}{s.rote_karten ? <span style={{color:'var(--red)'}}>🟥</span> : ''}</td>
                  <td>{s.bewertung ? `${s.bewertung}/10` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
