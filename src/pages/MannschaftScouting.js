import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const PRIO = {
  heiss:       { bg:'#fce4d6', text:'#d94f4f',  label:'🔥 Heiss',       icon:'🔥' },
  interessant: { bg:'#fff3cd', text:'#8a6a00',  label:'⭐ Interessant',  icon:'⭐' },
  beobachten:  { bg:'#ddeaff', text:'#1a4a8a',  label:'👁 Beobachten',  icon:'👁' },
  abgehakt:    { bg:'#ececec', text:'#555',      label:'✗ Abgehakt',     icon:'✗' },
}

export default function MannschaftScouting() {
  const { profile } = useAuth()
  const isManager = profile?.ist_manager || profile?.rolle === 'admin'
  const [spieler, setSpieler] = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('alle')
  const [selected, setSelected] = useState(null)
  const [notizen, setNotizen] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showNotizForm, setShowNotizForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ vorname:'', nachname:'', aktueller_verein:'', position:'', prioritaet:'beobachten', ziel_mannschaft_id:'', bewertung:'', nationalitaet:'', geburtsdatum:'', groesse_cm:'', berater_name:'', berater_kontakt:'', email:'', telefon:'', notizen:'', video_url:'' })
  const [notizForm, setNotizForm] = useState({ typ:'beobachtung', inhalt:'', bewertung:'', datum: new Date().toISOString().split('T')[0] })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: sp }, { data: mn }] = await Promise.all([
      supabase.from('scouting_spieler').select('*, ziel_mannschaft:ziel_mannschaft_id(name,farbe)').eq('aktiv', true).order('prioritaet').order('nachname'),
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setSpieler(sp || [])
    setMannschaften(mn || [])
    setLoading(false)
  }

  async function loadNotizen(id) {
    const { data } = await supabase.from('scouting_notizen')
      .select('*, autor:autor_id(name)')
      .eq('scouting_spieler_id', id)
      .order('datum', { ascending: false })
    setNotizen(data || [])
  }

  async function selectSpieler(s) {
    setSelected(s)
    await loadNotizen(s.id)
  }

  async function speichern() {
    if (!form.vorname.trim() || !form.nachname.trim()) return
    setSaving(true)
    const payload = { ...form, bewertung: form.bewertung ? parseFloat(form.bewertung) : null, groesse_cm: form.groesse_cm ? parseInt(form.groesse_cm) : null, geburtsdatum: form.geburtsdatum || null, ziel_mannschaft_id: form.ziel_mannschaft_id || null, erstellt_von: profile.id }
    await supabase.from('scouting_spieler').insert(payload)
    setSaving(false); setShowForm(false); load()
    setForm({ vorname:'', nachname:'', aktueller_verein:'', position:'', prioritaet:'beobachten', ziel_mannschaft_id:'', bewertung:'', nationalitaet:'', geburtsdatum:'', groesse_cm:'', berater_name:'', berater_kontakt:'', email:'', telefon:'', notizen:'', video_url:'' })
  }

  async function prioritaetAendern(id, prioritaet) {
    await supabase.from('scouting_spieler').update({ prioritaet }).eq('id', id)
    load()
    if (selected?.id === id) setSelected(p => ({ ...p, prioritaet }))
  }

  async function notizSpeichern() {
    if (!notizForm.inhalt.trim() || !selected) return
    await supabase.from('scouting_notizen').insert({ ...notizForm, scouting_spieler_id: selected.id, autor_id: profile.id, bewertung: notizForm.bewertung ? parseFloat(notizForm.bewertung) : null })
    setNotizForm({ typ:'beobachtung', inhalt:'', bewertung:'', datum: new Date().toISOString().split('T')[0] })
    setShowNotizForm(false)
    loadNotizen(selected.id)
  }

  async function archivieren(id) {
    await supabase.from('scouting_spieler').update({ aktiv: false }).eq('id', id)
    setSelected(null); load()
  }

  const gefiltert = spieler.filter(s => filter === 'alle' || s.prioritaet === filter)

  const POSITIONEN = ['Torwart','Linksaußen','Rechtsaußen','Rückraum Links','Rückraum Mitte','Rückraum Rechts','Kreisläufer']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20, alignItems: 'flex-start' }}>
      <div>
        {/* Filter + Neu */}
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setFilter('alle')} className={`btn btn-sm ${filter==='alle'?'btn-primary':'btn-outline'}`}>Alle ({spieler.length})</button>
            {Object.entries(PRIO).map(([k, p]) => (
              <button key={k} onClick={() => setFilter(k)}
                style={{ padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background: filter===k ? p.text : p.bg, color: filter===k ? 'white' : p.text }}>
                {p.icon} {p.label.split(' ')[1]} ({spieler.filter(s=>s.prioritaet===k).length})
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Scout-Spieler</button>
        </div>

        {/* Formular */}
        {showForm && (
          <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowForm(false)}>
            <div className="modal" style={{ maxWidth: 640 }}>
              <div className="modal-header"><span className="modal-title">Neuer Scout-Spieler</span><button className="close-btn" onClick={() => setShowForm(false)}>×</button></div>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Vorname *</label><input value={form.vorname} onChange={e=>setForm(p=>({...p,vorname:e.target.value}))} autoFocus /></div>
                  <div className="form-group"><label>Nachname *</label><input value={form.nachname} onChange={e=>setForm(p=>({...p,nachname:e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Aktueller Verein</label><input value={form.aktueller_verein} onChange={e=>setForm(p=>({...p,aktueller_verein:e.target.value}))} /></div>
                  <div className="form-group"><label>Position</label>
                    <select value={form.position} onChange={e=>setForm(p=>({...p,position:e.target.value}))}>
                      <option value="">–</option>
                      {POSITIONEN.map(pos => <option key={pos}>{pos}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Priorität</label>
                    <select value={form.prioritaet} onChange={e=>setForm(p=>({...p,prioritaet:e.target.value}))}>
                      {Object.entries(PRIO).map(([k,p]) => <option key={k} value={k}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Ziel-Mannschaft</label>
                    <select value={form.ziel_mannschaft_id} onChange={e=>setForm(p=>({...p,ziel_mannschaft_id:e.target.value}))}>
                      <option value="">Offen</option>
                      {mannschaften.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Bewertung (1-10)</label><input type="number" min="1" max="10" step="0.5" value={form.bewertung} onChange={e=>setForm(p=>({...p,bewertung:e.target.value}))} /></div>
                  <div className="form-group"><label>Geburtsdatum</label><input type="date" value={form.geburtsdatum} onChange={e=>setForm(p=>({...p,geburtsdatum:e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Nationalität</label><input value={form.nationalitaet} onChange={e=>setForm(p=>({...p,nationalitaet:e.target.value}))} /></div>
                  <div className="form-group"><label>Größe (cm)</label><input type="number" value={form.groesse_cm} onChange={e=>setForm(p=>({...p,groesse_cm:e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>E-Mail</label><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
                  <div className="form-group"><label>Telefon</label><input value={form.telefon} onChange={e=>setForm(p=>({...p,telefon:e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Berater</label><input value={form.berater_name} onChange={e=>setForm(p=>({...p,berater_name:e.target.value}))} /></div>
                  <div className="form-group"><label>Berater Kontakt</label><input value={form.berater_kontakt} onChange={e=>setForm(p=>({...p,berater_kontakt:e.target.value}))} /></div>
                </div>
                <div className="form-group"><label>Video-URL</label><input type="url" value={form.video_url} onChange={e=>setForm(p=>({...p,video_url:e.target.value}))} placeholder="YouTube, Vimeo..." /></div>
                <div className="form-group"><label>Notizen</label><textarea value={form.notizen} onChange={e=>setForm(p=>({...p,notizen:e.target.value}))} rows={3} /></div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowForm(false)} className="btn btn-outline">Abbrechen</button>
                <button onClick={speichern} className="btn btn-primary" disabled={saving}>{saving?'Speichern…':'Hinzufügen'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Liste */}
        {loading ? <div className="loading-center"><div className="spinner"/></div> : gefiltert.length === 0 ? (
          <div className="empty-state card"><p>Keine Spieler in dieser Kategorie.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gefiltert.map(s => {
              const p = PRIO[s.prioritaet] || PRIO.beobachten
              const alter = s.geburtsdatum ? Math.floor((Date.now() - new Date(s.geburtsdatum)) / (365.25*24*60*60*1000)) : null
              return (
                <div key={s.id} onClick={() => selectSpieler(s)} className="card"
                  style={{ cursor:'pointer', padding:14, marginBottom:0, border: selected?.id===s.id ? '2px solid var(--navy)' : '2px solid transparent', borderLeft:`4px solid ${p.text}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>{s.vorname} {s.nachname}</div>
                        <span style={{ fontSize:11, padding:'2px 7px', borderRadius:10, background:p.bg, color:p.text, fontWeight:700 }}>{p.icon} {s.prioritaet}</span>
                        {s.bewertung && <span style={{ fontSize:11, background:'var(--gray-100)', color:'var(--gray-600)', padding:'2px 7px', borderRadius:10 }}>⭐ {s.bewertung}/10</span>}
                      </div>
                      <div style={{ fontSize:12, color:'var(--gray-600)', display:'flex', gap:12, flexWrap:'wrap' }}>
                        {s.aktueller_verein && <span>🏐 {s.aktueller_verein}</span>}
                        {s.position && <span>📍 {s.position}</span>}
                        {alter && <span>🎂 {alter} J.</span>}
                        {s.nationalitaet && <span>🌍 {s.nationalitaet}</span>}
                        {s.ziel_mannschaft && <span style={{ color: s.ziel_mannschaft.farbe||'var(--navy)', fontWeight:600 }}>→ {s.ziel_mannschaft.name}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      {Object.entries(PRIO).filter(([k]) => k !== s.prioritaet).slice(0,2).map(([k,pp]) => (
                        <button key={k} onClick={e => { e.stopPropagation(); prioritaetAendern(s.id, k) }}
                          style={{ padding:'3px 8px', borderRadius:10, border:'none', cursor:'pointer', fontSize:10, background:pp.bg, color:pp.text, fontWeight:700 }}>
                          {pp.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="card" style={{ position:'sticky', top:80, maxHeight:'calc(100vh - 120px)', overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <h3 style={{ fontSize:16, color:'var(--navy)', margin:0 }}>{selected.vorname} {selected.nachname}</h3>
            <button onClick={() => setSelected(null)} className="close-btn">×</button>
          </div>

          {/* Info */}
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14, fontSize:13 }}>
            {[
              ['Verein', selected.aktueller_verein],
              ['Position', selected.position],
              ['Priorität', <span style={{ padding:'2px 8px', borderRadius:10, background:PRIO[selected.prioritaet]?.bg, color:PRIO[selected.prioritaet]?.text, fontWeight:700, fontSize:12 }}>{PRIO[selected.prioritaet]?.label}</span>],
              ['Bewertung', selected.bewertung ? `${selected.bewertung}/10` : null],
              ['Ziel', selected.ziel_mannschaft?.name],
              ['Nationalität', selected.nationalitaet],
              selected.email && ['E-Mail', <a href={`mailto:${selected.email}`} style={{ color:'var(--navy)' }}>{selected.email}</a>],
              selected.telefon && ['Telefon', <a href={`tel:${selected.telefon}`} style={{ color:'var(--navy)' }}>{selected.telefon}</a>],
              selected.berater_name && ['Berater', `${selected.berater_name}${selected.berater_kontakt ? ' · '+selected.berater_kontakt : ''}`],
            ].filter(Boolean).filter(([,v]) => v).map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                <span style={{ color:'var(--gray-400)', flexShrink:0 }}>{l}</span>
                <span style={{ textAlign:'right' }}>{v}</span>
              </div>
            ))}
          </div>

          {selected.video_url && (
            <a href={selected.video_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ display:'block', marginBottom:12, textAlign:'center' }}>▶ Video ansehen</a>
          )}

          {/* Priorität ändern */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Priorität ändern</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {Object.entries(PRIO).map(([k,p]) => (
                <button key={k} onClick={() => prioritaetAendern(selected.id, k)}
                  style={{ padding:'4px 10px', borderRadius:10, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
                    background: selected.prioritaet===k ? p.text : p.bg,
                    color: selected.prioritaet===k ? 'white' : p.text }}>
                  {p.icon} {k}
                </button>
              ))}
            </div>
          </div>

          {selected.notizen && (
            <div style={{ marginBottom:14, padding:'8px 10px', background:'var(--gray-100)', borderRadius:'var(--radius)', fontSize:13, color:'var(--gray-600)' }}>
              {selected.notizen}
            </div>
          )}

          {/* Notizen Timeline */}
          <div style={{ borderTop:'1px solid var(--gray-200)', paddingTop:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1 }}>Beobachtungen ({notizen.length})</div>
              <button onClick={() => setShowNotizForm(true)} className="btn btn-sm btn-primary">+ Notiz</button>
            </div>

            {showNotizForm && (
              <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:12, marginBottom:12 }}>
                <div className="form-group"><label>Typ</label>
                  <select value={notizForm.typ} onChange={e=>setNotizForm(p=>({...p,typ:e.target.value}))}>
                    <option value="beobachtung">👁 Beobachtung</option>
                    <option value="kontakt">📞 Kontakt</option>
                    <option value="angebot">💼 Angebot</option>
                    <option value="notiz">📝 Notiz</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Datum</label><input type="date" value={notizForm.datum} onChange={e=>setNotizForm(p=>({...p,datum:e.target.value}))} /></div>
                  <div className="form-group"><label>Bewertung (1-10)</label><input type="number" min="1" max="10" step="0.5" value={notizForm.bewertung} onChange={e=>setNotizForm(p=>({...p,bewertung:e.target.value}))} /></div>
                </div>
                <div className="form-group"><label>Inhalt *</label><textarea value={notizForm.inhalt} onChange={e=>setNotizForm(p=>({...p,inhalt:e.target.value}))} rows={3} autoFocus /></div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={notizSpeichern} className="btn btn-sm btn-primary">Speichern</button>
                  <button onClick={() => setShowNotizForm(false)} className="btn btn-sm btn-outline">Abbrechen</button>
                </div>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
              {notizen.length === 0 ? <p style={{ fontSize:12, color:'var(--gray-400)' }}>Noch keine Beobachtungen.</p> :
                notizen.map(n => (
                  <div key={n.id} style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:'8px 10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'var(--navy)' }}>
                        {n.typ === 'beobachtung' ? '👁' : n.typ === 'kontakt' ? '📞' : n.typ === 'angebot' ? '💼' : '📝'} {n.autor?.name || 'Unbekannt'}
                      </span>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        {n.bewertung && <span style={{ fontSize:10, background:'var(--white)', padding:'1px 6px', borderRadius:10, fontWeight:700 }}>⭐ {n.bewertung}</span>}
                        <span style={{ fontSize:10, color:'var(--gray-400)' }}>{new Date(n.datum).toLocaleDateString('de-DE')}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>{n.inhalt}</div>
                  </div>
                ))
              }
            </div>
          </div>

          <button onClick={() => archivieren(selected.id)} className="btn btn-sm btn-outline" style={{ marginTop:14, color:'var(--gray-400)', width:'100%' }}>
            Archivieren
          </button>
        </div>
      )}
    </div>
  )
}
