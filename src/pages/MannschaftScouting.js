import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function MannschaftScouting() {
  const navigate  = useNavigate()
  const { profile } = useAuth()
  const [spiele, setSpiele]       = useState([])
  const [teams, setTeams]         = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterTeam, setFilterTeam] = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ youtube_url:'', titel:'', datum:'', team_id:'', mannschaft_id:'', notizen:'' })
  const [saving, setSaving]       = useState(false)

  function extractYoutubeId(url) {
    if (!url) return null
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return m?.[1] || null
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: sp }, { data: t }, { data: mn }] = await Promise.all([
      supabase.from('gegner_spiele')
        .select('*, team:team_id(id,name,farbe_primaer,logo_url), events:gegner_events(count)')
        .order('erstellt_am', { ascending: false }),
      supabase.from('gegner_teams').select('*').eq('aktiv', true).order('name'),
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setSpiele(sp||[]); setTeams(t||[]); setMannschaften(mn||[])
    setLoading(false)
  }

  async function anlegen() {
    if (!form.youtube_url || !form.titel || !form.team_id) return
    setSaving(true)
    const ytId = extractYoutubeId(form.youtube_url)
    const { data } = await supabase.from('gegner_spiele').insert({
      team_id: form.team_id, mannschaft_id: form.mannschaft_id||null,
      youtube_url: form.youtube_url, youtube_id: ytId,
      titel: form.titel, datum: form.datum||null, notizen: form.notizen||null,
      erstellt_von: profile.id,
    }).select().single()
    setSaving(false); setShowForm(false)
    if (data) navigate(`/mannschaft/scouting/${data.id}`)
  }

  const gefiltert = spiele.filter(s => !filterTeam || s.team_id===filterTeam)

  return (
    <div>
      <div className="toolbar" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          <select value={filterTeam} onChange={e=>setFilterTeam(e.target.value)}
            style={{ padding:'6px 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13 }}>
            <option value="">Alle Teams</option>
            {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button onClick={()=>setShowForm(true)} className="btn btn-primary">+ Video hinzufügen</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal" style={{ maxWidth:540 }}>
            <div className="modal-header"><span className="modal-title">Gegner-Video zum Taggen</span><button className="close-btn" onClick={()=>setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Gegner-Team *</label>
                <select value={form.team_id} onChange={e=>setForm(p=>({...p,team_id:e.target.value}))}>
                  <option value="">Wählen…</option>
                  {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {teams.length===0 && <div style={{ fontSize:11, color:'var(--orange)', marginTop:4 }}>⚠️ Erst Gegner unter Einstellungen → 🔵 Gegner-Datenbank anlegen</div>}
              </div>
              <div className="form-group"><label>YouTube URL *</label>
                <input value={form.youtube_url} onChange={e=>setForm(p=>({...p,youtube_url:e.target.value}))} placeholder="https://www.youtube.com/watch?v=…" autoFocus />
                {form.youtube_url && !extractYoutubeId(form.youtube_url) && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>⚠️ Keine gültige YouTube-URL</div>}
                {extractYoutubeId(form.youtube_url) && <div style={{ fontSize:11, color:'var(--green)', marginTop:4 }}>✓ Video erkannt</div>}
              </div>
              <div className="form-group"><label>Titel *</label><input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} /></div>
              <div className="form-row">
                <div className="form-group"><label>Datum</label><input type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))} /></div>
                <div className="form-group"><label>Unsere Mannschaft</label>
                  <select value={form.mannschaft_id} onChange={e=>setForm(p=>({...p,mannschaft_id:e.target.value}))}>
                    <option value="">–</option>
                    {mannschaften.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Notizen</label><textarea value={form.notizen} onChange={e=>setForm(p=>({...p,notizen:e.target.value}))} rows={2} /></div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setShowForm(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={anlegen} className="btn btn-primary" disabled={saving||!form.youtube_url||!form.titel||!form.team_id}>{saving?'Anlegen…':'Tagging starten'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="loading-center"><div className="spinner"/></div> : gefiltert.length===0 ? (
        <div className="empty-state card">
          <div style={{ fontSize:32, marginBottom:8 }}>📹</div>
          <p style={{ fontWeight:600, marginBottom:4 }}>Noch keine Gegner-Videos</p>
          <p style={{ fontSize:13, color:'var(--gray-400)', marginBottom:16 }}>Lade ein YouTube-Video hoch um mit dem Tagging zu starten.</p>
          <button onClick={()=>setShowForm(true)} className="btn btn-primary">+ Erstes Video hinzufügen</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
          {gefiltert.map(s=>{
            const ytId = s.youtube_id
            const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null
            const eventCount = s.events?.[0]?.count || 0
            return (
              <div key={s.id} onClick={()=>navigate(`/mannschaft/scouting/${s.id}`)}
                className="card" style={{ padding:0, marginBottom:0, cursor:'pointer', overflow:'hidden', transition:'box-shadow 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-lg)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow)'}>
                {/* Thumbnail */}
                <div style={{ position:'relative', paddingBottom:'56.25%', background:'#000', overflow:'hidden' }}>
                  {thumb
                    ? <img src={thumb} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                    : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:32 }}>▶</div>
                  }
                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s' }}
                    onMouseEnter={e=>e.currentTarget.style.opacity='1'}
                    onMouseLeave={e=>e.currentTarget.style.opacity='0'}>
                    <span style={{ color:'white', fontWeight:700, fontSize:14 }}>🏷️ Tagging öffnen</span>
                  </div>
                  {/* Event-Count Badge */}
                  {eventCount > 0 && (
                    <div style={{ position:'absolute', top:8, right:8, background:'var(--red)', color:'white', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                      {eventCount} Events
                    </div>
                  )}
                  {eventCount===0 && (
                    <div style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.5)', color:'white', fontSize:11, padding:'2px 8px', borderRadius:20 }}>
                      Noch ungetaggt
                    </div>
                  )}
                </div>
                <div style={{ padding:'12px 14px' }}>
                  {/* Team */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    {s.team?.logo_url
                      ? <img src={s.team.logo_url} alt="" style={{ width:20, height:20, objectFit:'contain', flexShrink:0 }} />
                      : <div style={{ width:20, height:20, borderRadius:4, background:s.team?.farbe_primaer+'33', flexShrink:0 }}/>
                    }
                    <span style={{ fontSize:11, fontWeight:700, color:s.team?.farbe_primaer||'var(--gray-500)' }}>{s.team?.name}</span>
                  </div>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:4, lineHeight:1.3 }}>{s.titel}</div>
                  <div style={{ fontSize:11, color:'var(--gray-400)', display:'flex', gap:10 }}>
                    {s.datum && <span>📅 {new Date(s.datum+'T00:00:00').toLocaleDateString('de-DE')}</span>}
                    <span>🏷️ {eventCount} Events</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
