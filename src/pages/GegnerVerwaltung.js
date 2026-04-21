import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const POSITIONEN = ['Torwart','Linksaußen','Rechtsaußen','Rückraum Links','Rückraum Mitte','Rückraum Rechts','Kreisläufer']

function extractYoutubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  return match?.[1] || null
}

// ── GEGNER LISTE ─────────────────────────────────────────────
function GegnerListe() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [teams, setTeams]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [suche, setSuche]     = useState('')
  const [form, setForm] = useState({
    name:'', kuerzel:'', liga:'', stadt:'', farbe_primaer:'#cccccc', farbe_sekundaer:'#999999', website:'', notizen:''
  })
  const fileRef = useRef()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('gegner_teams').select('*, spieler:gegner_spieler(count)').eq('aktiv', true).order('name')
    setTeams(data||[])
    setLoading(false)
  }

  async function speichern() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('gegner_teams').insert({ ...form })
    setSaving(false); setShowForm(false)
    setForm({ name:'', kuerzel:'', liga:'', stadt:'', farbe_primaer:'#cccccc', farbe_sekundaer:'#999999', website:'', notizen:'' })
    load()
  }

  const gefiltert = teams.filter(t => !suche || t.name.toLowerCase().includes(suche.toLowerCase()) || (t.liga||'').toLowerCase().includes(suche.toLowerCase()))

  return (
    <div>
      <div className="toolbar" style={{ marginBottom:16 }}>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input placeholder="Team suchen…" value={suche} onChange={e=>setSuche(e.target.value)} />
        </div>
        <button onClick={()=>setShowForm(true)} className="btn btn-primary">+ Gegner anlegen</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal" style={{ maxWidth:560 }}>
            <div className="modal-header"><span className="modal-title">Neuer Gegner</span><button className="close-btn" onClick={()=>setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} autoFocus /></div>
                <div className="form-group"><label>Kürzel</label><input value={form.kuerzel} onChange={e=>setForm(p=>({...p,kuerzel:e.target.value}))} placeholder="z.B. ATSV" maxLength={6} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Liga</label><input value={form.liga} onChange={e=>setForm(p=>({...p,liga:e.target.value}))} placeholder="z.B. Handball-Bundesliga" /></div>
                <div className="form-group"><label>Stadt</label><input value={form.stadt} onChange={e=>setForm(p=>({...p,stadt:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Primärfarbe</label>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input type="color" value={form.farbe_primaer} onChange={e=>setForm(p=>({...p,farbe_primaer:e.target.value}))} style={{ width:44, height:38, padding:2, borderRadius:'var(--radius)', border:'1.5px solid var(--gray-200)', cursor:'pointer' }} />
                    <span style={{ fontSize:11, color:'var(--gray-400)' }}>{form.farbe_primaer}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Sekundärfarbe</label>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input type="color" value={form.farbe_sekundaer} onChange={e=>setForm(p=>({...p,farbe_sekundaer:e.target.value}))} style={{ width:44, height:38, padding:2, borderRadius:'var(--radius)', border:'1.5px solid var(--gray-200)', cursor:'pointer' }} />
                    <span style={{ fontSize:11, color:'var(--gray-400)' }}>{form.farbe_sekundaer}</span>
                  </div>
                </div>
              </div>
              <div className="form-group"><label>Website</label><input type="url" value={form.website} onChange={e=>setForm(p=>({...p,website:e.target.value}))} placeholder="https://…" /></div>
              <div className="form-group"><label>Notizen</label><textarea value={form.notizen} onChange={e=>setForm(p=>({...p,notizen:e.target.value}))} rows={2} /></div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setShowForm(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={speichern} className="btn btn-primary" disabled={saving}>{saving?'Anlegen…':'Gegner anlegen'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="loading-center"><div className="spinner"/></div> : gefiltert.length===0 ? (
        <div className="empty-state card"><p>Noch keine Gegner angelegt.</p></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
          {gefiltert.map(t=>(
            <div key={t.id} onClick={()=>navigate(`/einstellungen/gegner/${t.id}`)}
              className="card" style={{ padding:0, marginBottom:0, cursor:'pointer', overflow:'hidden', transition:'box-shadow 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-lg)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow)'}>
              {/* Farb-Header */}
              <div style={{ height:8, background:`linear-gradient(90deg, ${t.farbe_primaer}, ${t.farbe_sekundaer})` }}/>
              <div style={{ padding:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  {t.logo_url
                    ? <img src={t.logo_url} alt="" style={{ width:44, height:44, objectFit:'contain', flexShrink:0 }} />
                    : <div style={{ width:44, height:44, borderRadius:8, background:t.farbe_primaer+'33', border:`2px solid ${t.farbe_primaer}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:14, color:t.farbe_primaer, flexShrink:0 }}>
                        {(t.kuerzel||t.name).slice(0,3).toUpperCase()}
                      </div>
                  }
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>{t.name}</div>
                    {t.liga && <div style={{ fontSize:11, color:'var(--gray-400)' }}>{t.liga}</div>}
                    {t.stadt && <div style={{ fontSize:11, color:'var(--gray-400)' }}>{t.stadt}</div>}
                  </div>
                </div>
                <div style={{ fontSize:11, color:'var(--gray-400)' }}>
                  {t.spieler?.[0]?.count||0} Spieler im Kader
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── GEGNER DETAIL ─────────────────────────────────────────────
function GegnerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [team, setTeam]       = useState(null)
  const [spieler, setSpieler] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('kader')
  const [editMode, setEditMode] = useState(false)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [showSpielerForm, setShowSpielerForm] = useState(false)
  const [spForm, setSpForm]   = useState({ vorname:'', nachname:'', trikotnummer:'', position:'', wurfhand:'Rechts', geburtsdatum:'', nationalitaet:'', groesse_cm:'', notizen:'' })
  const [editSpieler, setEditSpieler] = useState(null)
  const logoRef = useRef()

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: sp }] = await Promise.all([
      supabase.from('gegner_teams').select('*').eq('id', id).single(),
      supabase.from('gegner_spieler').select('*').eq('team_id', id).eq('aktiv', true).order('trikotnummer'),
    ])
    setTeam(t); setForm(t||{})
    setSpieler(sp||[])
    setLoading(false)
  }

  async function teamSpeichern() {
    setSaving(true)
    await supabase.from('gegner_teams').update({
      name:form.name, kuerzel:form.kuerzel, liga:form.liga, stadt:form.stadt,
      farbe_primaer:form.farbe_primaer, farbe_sekundaer:form.farbe_sekundaer,
      website:form.website, notizen:form.notizen,
    }).eq('id', id)
    setSaving(false); setEditMode(false); load()
  }

  async function logoHochladen(e) {
    const file = e.target.files[0]; if (!file) return
    const pfad = `logos/${id}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('gegner-logos').upload(pfad, file, { upsert:true })
    if (!error) {
      const { data:{ publicUrl } } = supabase.storage.from('gegner-logos').getPublicUrl(pfad)
      await supabase.from('gegner_teams').update({ logo_url:publicUrl }).eq('id', id)
      load()
    }
  }

  async function spielerSpeichern() {
    if (!spForm.vorname.trim()||!spForm.nachname.trim()) return
    setSaving(true)
    const payload = { ...spForm, team_id:id, trikotnummer:spForm.trikotnummer?parseInt(spForm.trikotnummer):null, groesse_cm:spForm.groesse_cm?parseInt(spForm.groesse_cm):null, geburtsdatum:spForm.geburtsdatum||null }
    if (editSpieler) {
      await supabase.from('gegner_spieler').update(payload).eq('id', editSpieler.id)
    } else {
      await supabase.from('gegner_spieler').insert({ ...payload, aktiv:true })
    }
    setSaving(false); setShowSpielerForm(false); setEditSpieler(null)
    setSpForm({ vorname:'', nachname:'', trikotnummer:'', position:'', wurfhand:'Rechts', geburtsdatum:'', nationalitaet:'', groesse_cm:'', notizen:'' })
    load()
  }

  function openEditSpieler(sp) {
    setEditSpieler(sp)
    setSpForm({ vorname:sp.vorname, nachname:sp.nachname, trikotnummer:sp.trikotnummer||'', position:sp.position||'', wurfhand:sp.wurfhand||'Rechts', geburtsdatum:sp.geburtsdatum||'', nationalitaet:sp.nationalitaet||'', groesse_cm:sp.groesse_cm||'', notizen:sp.notizen||'' })
    setShowSpielerForm(true)
  }

  async function spielerArchivieren(spId) {
    await supabase.from('gegner_spieler').update({ aktiv:false }).eq('id', spId); load()
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!team) return null

  return (
    <div>
      <button onClick={()=>navigate('/einstellungen/gegner')} className="back-btn">← Alle Gegner</button>

      {/* Header */}
      <div className="card" style={{ marginBottom:16, overflow:'hidden', padding:0 }}>
        <div style={{ height:10, background:`linear-gradient(90deg, ${team.farbe_primaer}, ${team.farbe_sekundaer})` }}/>
        <div style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:20 }}>
            {/* Logo */}
            <div style={{ position:'relative', flexShrink:0 }}>
              {team.logo_url
                ? <img src={team.logo_url} alt="" style={{ width:80, height:80, objectFit:'contain', borderRadius:8, border:'2px solid var(--gray-200)' }} />
                : <div style={{ width:80, height:80, borderRadius:8, background:team.farbe_primaer+'22', border:`2px solid ${team.farbe_primaer}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:22, color:team.farbe_primaer }}>
                    {(team.kuerzel||team.name).slice(0,3).toUpperCase()}
                  </div>
              }
              <label style={{ position:'absolute', bottom:0, right:0, background:'white', borderRadius:'50%', width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'var(--shadow)', fontSize:12, border:'1px solid var(--gray-200)' }}>
                📷<input type="file" accept="image/*" style={{ display:'none' }} onChange={logoHochladen} />
              </label>
            </div>

            <div style={{ flex:1 }}>
              {editMode ? (
                <div>
                  <div className="form-row">
                    <div className="form-group"><label>Name *</label><input value={form.name||''} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
                    <div className="form-group"><label>Kürzel</label><input value={form.kuerzel||''} onChange={e=>setForm(p=>({...p,kuerzel:e.target.value}))} maxLength={6} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Liga</label><input value={form.liga||''} onChange={e=>setForm(p=>({...p,liga:e.target.value}))} /></div>
                    <div className="form-group"><label>Stadt</label><input value={form.stadt||''} onChange={e=>setForm(p=>({...p,stadt:e.target.value}))} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Primärfarbe</label><input type="color" value={form.farbe_primaer||'#ccc'} onChange={e=>setForm(p=>({...p,farbe_primaer:e.target.value}))} style={{ width:44, height:38, padding:2, border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', cursor:'pointer' }} /></div>
                    <div className="form-group"><label>Sekundärfarbe</label><input type="color" value={form.farbe_sekundaer||'#999'} onChange={e=>setForm(p=>({...p,farbe_sekundaer:e.target.value}))} style={{ width:44, height:38, padding:2, border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', cursor:'pointer' }} /></div>
                  </div>
                  <div className="form-group"><label>Website</label><input type="url" value={form.website||''} onChange={e=>setForm(p=>({...p,website:e.target.value}))} /></div>
                  <div className="form-group"><label>Notizen</label><textarea value={form.notizen||''} onChange={e=>setForm(p=>({...p,notizen:e.target.value}))} rows={2} /></div>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize:24, color:'var(--navy)', margin:'0 0 6px', fontFamily:'"DM Serif Display",serif' }}>{team.name}</h2>
                  <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:13, color:'var(--gray-600)', marginBottom:8 }}>
                    {team.liga && <span>🏆 {team.liga}</span>}
                    {team.stadt && <span>📍 {team.stadt}</span>}
                    {team.website && <a href={team.website} target="_blank" rel="noreferrer" style={{ color:'var(--navy)' }}>🌐 Website</a>}
                  </div>
                  {team.notizen && <div style={{ fontSize:13, color:'var(--gray-500)' }}>{team.notizen}</div>}
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              <button onClick={()=>setEditMode(!editMode)} className={`btn btn-sm ${editMode?'btn-primary':'btn-outline'}`}>{editMode?'Abbrechen':'Bearbeiten'}</button>
              {editMode && <button onClick={teamSpeichern} className="btn btn-sm btn-gold" disabled={saving}>{saving?'…':'Speichern'}</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:16 }}>
        <button className={`tab-btn${tab==='kader'?' active':''}`} onClick={()=>setTab('kader')}>👥 Kader ({spieler.length})</button>
        <button className={`tab-btn${tab==='analyse'?' active':''}`} onClick={()=>setTab('analyse')}>📊 Analyse</button>
      </div>

      {/* KADER TAB */}
      {tab==='kader' && (
        <div>
          <div className="toolbar" style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, color:'var(--gray-500)' }}>{spieler.length} Spieler im Kader</div>
            <button onClick={()=>{ setEditSpieler(null); setSpForm({ vorname:'', nachname:'', trikotnummer:'', position:'', wurfhand:'Rechts', geburtsdatum:'', nationalitaet:'', groesse_cm:'', notizen:'' }); setShowSpielerForm(true) }} className="btn btn-primary">+ Spieler hinzufügen</button>
          </div>

          {showSpielerForm && (
            <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowSpielerForm(false)}>
              <div className="modal" style={{ maxWidth:560 }}>
                <div className="modal-header">
                  <span className="modal-title">{editSpieler?'Spieler bearbeiten':'Neuer Spieler'}</span>
                  <button className="close-btn" onClick={()=>setShowSpielerForm(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group"><label>Vorname *</label><input value={spForm.vorname} onChange={e=>setSpForm(p=>({...p,vorname:e.target.value}))} autoFocus /></div>
                    <div className="form-group"><label>Nachname *</label><input value={spForm.nachname} onChange={e=>setSpForm(p=>({...p,nachname:e.target.value}))} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Trikotnummer</label><input type="number" value={spForm.trikotnummer} onChange={e=>setSpForm(p=>({...p,trikotnummer:e.target.value}))} /></div>
                    <div className="form-group"><label>Position</label>
                      <select value={spForm.position} onChange={e=>setSpForm(p=>({...p,position:e.target.value}))}>
                        <option value="">–</option>
                        {POSITIONEN.map(pos=><option key={pos}>{pos}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Wurfhand</label>
                      <select value={spForm.wurfhand} onChange={e=>setSpForm(p=>({...p,wurfhand:e.target.value}))}>
                        <option>Rechts</option><option>Links</option><option>Beidhändig</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Geburtsdatum</label><input type="date" value={spForm.geburtsdatum} onChange={e=>setSpForm(p=>({...p,geburtsdatum:e.target.value}))} /></div>
                    <div className="form-group"><label>Nationalität</label><input value={spForm.nationalitaet} onChange={e=>setSpForm(p=>({...p,nationalitaet:e.target.value}))} /></div>
                    <div className="form-group"><label>Größe (cm)</label><input type="number" value={spForm.groesse_cm} onChange={e=>setSpForm(p=>({...p,groesse_cm:e.target.value}))} /></div>
                  </div>
                  <div className="form-group"><label>Notizen / Stärken-Schwächen</label><textarea value={spForm.notizen} onChange={e=>setSpForm(p=>({...p,notizen:e.target.value}))} rows={3} placeholder="Beobachtungen, Stärken, Schwächen…" /></div>
                </div>
                <div className="modal-footer">
                  <button onClick={()=>setShowSpielerForm(false)} className="btn btn-outline">Abbrechen</button>
                  <button onClick={spielerSpeichern} className="btn btn-primary" disabled={saving}>{saving?'Speichern…':'Speichern'}</button>
                </div>
              </div>
            </div>
          )}

          {spieler.length===0 ? (
            <div className="empty-state card"><p>Noch kein Kader angelegt. Füge Spieler hinzu.</p></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
              {spieler.map(sp=>{
                const alter = sp.geburtsdatum ? Math.floor((Date.now()-new Date(sp.geburtsdatum))/(365.25*24*60*60*1000)) : null
                return (
                  <div key={sp.id} className="card" style={{ padding:14, marginBottom:0, borderTop:`3px solid ${team.farbe_primaer}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:team.farbe_primaer+'33', border:`2px solid ${team.farbe_primaer}`, display:'flex', alignItems:'center', justifyContent:'center', color:team.farbe_primaer, fontWeight:900, fontSize:14, fontFamily:'monospace', flexShrink:0 }}>
                        {sp.trikotnummer ? `#${sp.trikotnummer}` : sp.vorname[0]+sp.nachname[0]}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sp.vorname} {sp.nachname}</div>
                        <div style={{ fontSize:11, color:'var(--gray-400)' }}>{sp.position||'–'}{alter?` · ${alter} J.`:''}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                      {sp.wurfhand && <span style={{ fontSize:10, background:'var(--gray-100)', color:'var(--gray-600)', padding:'1px 7px', borderRadius:10 }}>✋ {sp.wurfhand}</span>}
                      {sp.groesse_cm && <span style={{ fontSize:10, background:'var(--gray-100)', color:'var(--gray-600)', padding:'1px 7px', borderRadius:10 }}>{sp.groesse_cm}cm</span>}
                      {sp.nationalitaet && <span style={{ fontSize:10, background:'var(--gray-100)', color:'var(--gray-600)', padding:'1px 7px', borderRadius:10 }}>🌍 {sp.nationalitaet}</span>}
                    </div>
                    {sp.notizen && <div style={{ fontSize:11, color:'var(--gray-500)', lineHeight:1.4, marginBottom:8 }}>{sp.notizen.slice(0,80)}{sp.notizen.length>80?'…':''}</div>}
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>openEditSpieler(sp)} className="btn btn-sm btn-outline" style={{ flex:1 }}>Bearb.</button>
                      <button onClick={()=>spielerArchivieren(sp.id)} className="btn btn-sm btn-danger">×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ANALYSE TAB */}
      {tab==='analyse' && (
        <div className="empty-state card">
          <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
          <p style={{ fontWeight:600, marginBottom:4 }}>Gegner-Analyse kommt mit dem Tagging-System</p>
          <p style={{ fontSize:13, color:'var(--gray-400)' }}>Sobald Spiele getaggt sind, erscheinen hier Heatmaps und Statistiken.</p>
        </div>
      )}
    </div>
  )
}

export default function GegnerVerwaltung() {
  return (
    <Routes>
      <Route index element={<GegnerListe />} />
      <Route path=":id" element={<GegnerDetail />} />
    </Routes>
  )
}
