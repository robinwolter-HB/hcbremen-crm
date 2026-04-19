import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function InterneMeetings() {
  const { profile } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [teams, setTeams] = useState([])
  const [profile_nutzer, setProfileNutzer] = useState([])
  const [freiwillige, setFreiwillige] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [teamFilter, setTeamFilter] = useState('')
  const [form, setForm] = useState({
    titel: '', datum: '', uhrzeit_von: '', uhrzeit_bis: '', ort: '',
    team_id: '', beschreibung: '', protokoll: '',
    teilnehmer_profile: [], teilnehmer_freiwillige: [], teilnehmer_extern: '',
    todos: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: m }, { data: t }, { data: p }, { data: f }] = await Promise.all([
      supabase.from('interne_meetings').select('*, team:team_id(name)').order('datum', { ascending: false }),
      supabase.from('hc_teams').select('*').eq('aktiv', true),
      supabase.from('profile').select('id, name, email').order('name'),
      supabase.from('freiwillige').select('id, vorname, nachname').order('nachname'),
    ])
    setMeetings(m || [])
    setTeams(t || [])
    setProfileNutzer(p || [])
    setFreiwillige(f || [])
    setLoading(false)
  }

  async function speichern() {
    if (!form.titel.trim() || !form.datum) return
    const payload = {
      titel: form.titel, datum: form.datum,
      uhrzeit_von: form.uhrzeit_von || null,
      uhrzeit_bis: form.uhrzeit_bis || null,
      ort: form.ort || null,
      team_id: form.team_id || null,
      beschreibung: form.beschreibung || null,
      protokoll: form.protokoll || null,
      teilnehmer_profile: form.teilnehmer_profile,
      teilnehmer_freiwillige: form.teilnehmer_freiwillige,
      teilnehmer_extern: form.teilnehmer_extern ? form.teilnehmer_extern.split('\n').map(s=>s.trim()).filter(Boolean) : [],
      todos: form.todos ? form.todos.split('\n').map(s=>s.trim()).filter(Boolean) : [],
      erstellt_von: profile.id,
    }
    const { data } = await supabase.from('interne_meetings').insert(payload).select().single()
    setForm({ titel:'', datum:'', uhrzeit_von:'', uhrzeit_bis:'', ort:'', team_id:'', beschreibung:'', protokoll:'', teilnehmer_profile:[], teilnehmer_freiwillige:[], teilnehmer_extern:'', todos:'' })
    setShowForm(false)
    await load()
    if (data) setSelected(data)
  }

  async function protokollSpeichern(id, protokoll) {
    await supabase.from('interne_meetings').update({ protokoll }).eq('id', id)
  }

  function toggleProfileTeilnehmer(id) {
    setForm(p => ({
      ...p,
      teilnehmer_profile: p.teilnehmer_profile.includes(id)
        ? p.teilnehmer_profile.filter(x => x !== id)
        : [...p.teilnehmer_profile, id]
    }))
  }

  function toggleFreiwilligerTeilnehmer(id) {
    setForm(p => ({
      ...p,
      teilnehmer_freiwillige: p.teilnehmer_freiwillige.includes(id)
        ? p.teilnehmer_freiwillige.filter(x => x !== id)
        : [...p.teilnehmer_freiwillige, id]
    }))
  }

  const gefiltert = meetings.filter(m => !teamFilter || m.team_id === teamFilter)

  function getTeilnehmerNamen(m) {
    const pNamen = (m.teilnehmer_profile||[]).map(id => profile_nutzer.find(p=>p.id===id)?.name||'?')
    const fNamen = (m.teilnehmer_freiwillige||[]).map(id => { const f=freiwillige.find(f=>f.id===id); return f?`${f.vorname} ${f.nachname}`:'?' })
    return [...pNamen, ...fNamen, ...(m.teilnehmer_extern||[])]
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 420px':'1fr', gap:20, alignItems:'flex-start' }}>
      <div>
        <div className="toolbar">
          <select value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}>
            <option value="">Alle Teams</option>
            {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={()=>setShowForm(true)} className="btn btn-gold">+ Neues Meeting</button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:16, color:'var(--navy)', marginBottom:16 }}>Neues internes Meeting</h3>
            <div className="form-row">
              <div className="form-group"><label>Titel *</label><input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} /></div>
              <div className="form-group"><label>Team</label>
                <select value={form.team_id} onChange={e=>setForm(p=>({...p,team_id:e.target.value}))}>
                  <option value="">Kein Team</option>
                  {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group"><label>Datum *</label><input type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))} /></div>
              <div className="form-group"><label>Von</label><input type="time" value={form.uhrzeit_von} onChange={e=>setForm(p=>({...p,uhrzeit_von:e.target.value}))} /></div>
              <div className="form-group"><label>Bis</label><input type="time" value={form.uhrzeit_bis} onChange={e=>setForm(p=>({...p,uhrzeit_bis:e.target.value}))} /></div>
            </div>
            <div className="form-group"><label>Ort</label><input value={form.ort} onChange={e=>setForm(p=>({...p,ort:e.target.value}))} placeholder="z.B. Besprechungsraum, Zoom" /></div>
            <div className="form-group"><label>Beschreibung / Agenda</label><textarea value={form.beschreibung} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} rows={2} /></div>

            {/* Teilnehmer: Profile */}
            <div className="form-group">
              <label>Teilnehmer (Team-Mitglieder)</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'8px 0' }}>
                {profile_nutzer.map(p => (
                  <button key={p.id} onClick={()=>toggleProfileTeilnehmer(p.id)}
                    className={`btn btn-sm ${form.teilnehmer_profile.includes(p.id)?'btn-primary':'btn-outline'}`}>
                    {p.name||p.email}
                  </button>
                ))}
              </div>
            </div>

            {/* Teilnehmer: Freiwillige */}
            <div className="form-group">
              <label>Teilnehmer (Freiwillige)</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'8px 0', maxHeight:120, overflowY:'auto' }}>
                {freiwillige.map(f => (
                  <button key={f.id} onClick={()=>toggleFreiwilligerTeilnehmer(f.id)}
                    className={`btn btn-sm ${form.teilnehmer_freiwillige.includes(f.id)?'btn-primary':'btn-outline'}`}>
                    {f.vorname} {f.nachname}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Externe Teilnehmer (ein Name pro Zeile)</label>
              <textarea value={form.teilnehmer_extern} onChange={e=>setForm(p=>({...p,teilnehmer_extern:e.target.value}))} rows={2} placeholder="Max Mustermann&#10;Anna Schmidt" />
            </div>
            <div className="form-group">
              <label>Protokoll / Notizen</label>
              <textarea value={form.protokoll} onChange={e=>setForm(p=>({...p,protokoll:e.target.value}))} rows={3} />
            </div>
            <div className="form-group">
              <label>Todos (ein Todo pro Zeile)</label>
              <textarea value={form.todos} onChange={e=>setForm(p=>({...p,todos:e.target.value}))} rows={3} placeholder="Logo aktualisieren&#10;Sponsoring-PDF senden" />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={speichern} className="btn btn-primary">Speichern</button>
              <button onClick={()=>setShowForm(false)} className="btn btn-outline">Abbrechen</button>
            </div>
          </div>
        )}

        {loading ? <div className="loading-center"><div className="spinner"/></div> : gefiltert.length===0 ? (
          <div className="empty-state"><p>Noch keine Meetings.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Datum</th><th>Titel</th><th>Team</th><th>Teilnehmer</th></tr></thead>
              <tbody>
                {gefiltert.map(m => {
                  const tnamen = getTeilnehmerNamen(m)
                  return (
                    <tr key={m.id} onClick={()=>setSelected(m)} style={{ cursor:'pointer', background:selected?.id===m.id?'rgba(15,34,64,0.04)':'transparent' }}>
                      <td style={{ whiteSpace:'nowrap', fontWeight:600 }}>
                        {new Date(m.datum).toLocaleDateString('de-DE')}
                        {m.uhrzeit_von && <div style={{ fontSize:11, color:'var(--gray-400)', fontWeight:400 }}>{m.uhrzeit_von.slice(0,5)}{m.uhrzeit_bis?' – '+m.uhrzeit_bis.slice(0,5):''}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight:600 }}>{m.titel}</div>
                        {m.ort && <div style={{ fontSize:11, color:'var(--gray-400)' }}>📍 {m.ort}</div>}
                      </td>
                      <td>{m.team?.name || '–'}</td>
                      <td style={{ fontSize:12, color:'var(--gray-600)' }}>{tnamen.slice(0,3).join(', ')}{tnamen.length>3?` +${tnamen.length-3}`:''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail */}
      {selected && (
        <div className="card" style={{ position:'sticky', top:80, maxHeight:'calc(100vh - 120px)', overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <h3 style={{ fontSize:15, color:'var(--navy)', margin:0 }}>{selected.titel}</h3>
            <button onClick={()=>setSelected(null)} className="close-btn">×</button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14, fontSize:13 }}>
            {[
              ['Datum', new Date(selected.datum).toLocaleDateString('de-DE', {weekday:'long',day:'numeric',month:'long',year:'numeric'})],
              selected.uhrzeit_von && ['Uhrzeit', `${selected.uhrzeit_von?.slice(0,5)}${selected.uhrzeit_bis?' – '+selected.uhrzeit_bis.slice(0,5):''}`],
              selected.ort && ['Ort', selected.ort],
              selected.team?.name && ['Team', selected.team.name],
            ].filter(Boolean).map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--gray-400)' }}>{l}</span><span style={{ fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Teilnehmer */}
          {(() => {
            const tnamen = getTeilnehmerNamen(selected)
            if (!tnamen.length) return null
            return (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Teilnehmer ({tnamen.length})</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {tnamen.map((n,i)=><span key={i} className="badge badge-eingeladen">{n}</span>)}
                </div>
              </div>
            )
          })()}

          {/* Beschreibung */}
          {selected.beschreibung && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Agenda / Beschreibung</div>
              <p style={{ fontSize:13, color:'var(--gray-600)', lineHeight:1.5 }}>{selected.beschreibung}</p>
            </div>
          )}

          {/* Protokoll */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Protokoll / Notizen</div>
            <textarea
              defaultValue={selected.protokoll||''}
              onBlur={e=>protokollSpeichern(selected.id, e.target.value)}
              rows={5}
              placeholder="Protokoll hier eingeben…"
              style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontFamily:'inherit', fontSize:13, resize:'vertical' }}
            />
          </div>

          {/* Todos */}
          {(selected.todos||[]).length>0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Todos</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {(selected.todos||[]).map((t,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, padding:'5px 8px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                    <span>□</span><span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
