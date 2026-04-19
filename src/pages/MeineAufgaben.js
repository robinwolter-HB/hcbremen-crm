import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STATUS_MEDIA = {
  offen:          { bg:'#ddeaff', text:'#1a4a8a', label:'Offen' },
  in_bearbeitung: { bg:'#fff3cd', text:'#8a6a00', label:'In Bearbeitung' },
  zur_freigabe:   { bg:'#fce4d6', text:'#8a3a1a', label:'Zur Freigabe' },
  freigegeben:    { bg:'#e2efda', text:'#2d6b3a', label:'Freigegeben' },
  abgelehnt:      { bg:'#fce4d6', text:'#8a3a1a', label:'Abgelehnt' },
}

export default function MeineAufgaben() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.rolle === 'admin'
  const canAccessMedia = profile?.rolle==='admin' || profile?.rolle==='media' || (profile?.bereiche||[]).includes('media')

  const [crmAufgaben, setCrmAufgaben] = useState([])
  const [eventTodos, setEventTodos] = useState([])
  const [mediaAufgaben, setMediaAufgaben] = useState([])
  const [mitglieder, setMitglieder] = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('offen')
  const [personFilter, setPersonFilter] = useState(undefined)
  const [aktiveTab, setAktiveTab] = useState('alle')
  const [expanded, setExpanded] = useState({})

  // Neue Aufgabe Form
  const [showNeuForm, setShowNeuForm] = useState(false)
  const [neuTyp, setNeuTyp] = useState('media') // 'media' | 'event'
  const [neuForm, setNeuForm] = useState({ titel:'', beschreibung:'', prioritaet:'normal', zugewiesen_an:'', faellig_am:'', mannschaft_id:'', event_id:'' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const queries = [
      supabase.from('kontakthistorie').select('*,kontakte(id,firma,logo_url)').order('faellig_am', { ascending:true, nullsFirst:false }),
      supabase.from('profile').select('name,email,id').order('name'),
      supabase.from('event_todos').select('*, event:event_id(id,titel)').order('faellig_am', { ascending:true, nullsFirst:false }),
      supabase.from('veranstaltungen').select('id, name').order('name'),
    ]
    if (canAccessMedia) {
      queries.push(supabase.from('media_aufgaben').select('*, zugewiesener:zugewiesen_an(name), ersteller:erstellt_von(name), mannschaft:mannschaft_id(name,farbe)').order('faellig_am', { ascending:true, nullsFirst:false }))
      queries.push(supabase.from('mannschaften').select('*').eq('aktiv',true).order('reihenfolge'))
    }
    const [{ data: crm }, { data: n }, { data: etodos }, { data: evs }, mediaRes, mnRes] = await Promise.all(queries)
    setCrmAufgaben(crm || [])
    setMitglieder(n || [])
    setEventTodos(etodos || [])
    setEvents(evs || [])
    setMediaAufgaben(mediaRes?.data || [])
    setMannschaften(mnRes?.data || [])
    setLoading(false)
  }

  async function toggleCrmErledigt(e, h) {
    e.stopPropagation()
    await supabase.from('kontakthistorie').update({ erledigt: !h.erledigt }).eq('id', h.id)
    load()
  }

  async function toggleEventTodo(e, t) {
    e.stopPropagation()
    await supabase.from('event_todos').update({ erledigt: !t.erledigt }).eq('id', t.id)
    load()
  }

  async function mediaStatusAendern(id, status) {
    const update = { status }
    if (status==='freigegeben' || status==='abgelehnt') update.freigegeben_von = profile.id
    await supabase.from('media_aufgaben').update(update).eq('id', id)
    load()
  }

  async function neueAufgabeSpeichern() {
    if (!neuForm.titel.trim()) return
    if (neuTyp==='media') {
      await supabase.from('media_aufgaben').insert({
        titel: neuForm.titel, beschreibung: neuForm.beschreibung||null,
        prioritaet: neuForm.prioritaet, zugewiesen_an: neuForm.zugewiesen_an||null,
        faellig_am: neuForm.faellig_am||null, mannschaft_id: neuForm.mannschaft_id||null,
        erstellt_von: profile.id, status:'offen',
      })
    } else {
      await supabase.from('event_todos').insert({
        titel: neuForm.titel, beschreibung: neuForm.beschreibung||null,
        zugewiesen_an: neuForm.zugewiesen_an||null,
        faellig_am: neuForm.faellig_am||null,
        event_id: neuForm.event_id||null,
        erledigt: false,
      })
    }
    setNeuForm({ titel:'', beschreibung:'', prioritaet:'normal', zugewiesen_an:'', faellig_am:'', mannschaft_id:'', event_id:'' })
    setShowNeuForm(false)
    load()
  }

  const meinName = profile?.name || profile?.email || ''
  const now = new Date()

  // CRM gefiltert
  const crmGef = crmAufgaben.filter(h => {
    const person = personFilter!==undefined ? personFilter : meinName
    let ok = true
    if (person) ok = (h.zustaendig_personen||[]).includes(person) || h.zustaendig===person || (h.zustaendig||'').split(',').map(s=>s.trim()).includes(person)
    const matchF = filter==='alle'?true:filter==='offen'?!h.erledigt:h.erledigt
    return ok && matchF
  })

  // Event Todos gefiltert
  const eventGef = eventTodos.filter(t => {
    const matchF = filter==='alle'?true:filter==='offen'?!t.erledigt:t.erledigt
    return matchF
  })

  // Media gefiltert
  const mediaGef = mediaAufgaben.filter(a => {
    if (filter==='erledigt') return a.status==='freigegeben'
    if (filter==='offen') return !['freigegeben','abgelehnt'].includes(a.status)
    return true
  })

  // Gruppen CRM
  const ueberfaellig = crmGef.filter(h => h.faellig_am && !h.erledigt && new Date(h.faellig_am)<now)
  const heute = crmGef.filter(h => h.faellig_am && !h.erledigt && new Date(h.faellig_am).toDateString()===now.toDateString())
  const spaeter = crmGef.filter(h => h.faellig_am && !h.erledigt && new Date(h.faellig_am)>now && new Date(h.faellig_am).toDateString()!==now.toDateString())
  const keinDatum = crmGef.filter(h => !h.faellig_am && !h.erledigt)
  const erledigtCrm = crmGef.filter(h => h.erledigt)

  function CRMListe({ items, title, color, icon }) {
    if (!items.length) return null
    return (
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <span style={{ fontSize:16 }}>{icon}</span>
          <span style={{ fontWeight:700, fontSize:15, color }}>{title}</span>
          <span style={{ fontSize:12, background:color+'20', color, padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{items.length}</span>
        </div>
        <div style={{ display:'grid', gap:8 }}>
          {items.map(h => {
            const isExp = expanded[h.id]
            const isUe = h.faellig_am && !h.erledigt && new Date(h.faellig_am)<now
            return (
              <div key={h.id} style={{ background:'var(--white)', borderRadius:'var(--radius)', border:'1.5px solid var(--gray-200)', borderLeft:`4px solid ${color}`, overflow:'hidden', opacity:h.erledigt?0.6:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer' }} onClick={()=>setExpanded(e=>({...e,[h.id]:!e[h.id]}))}>
                  <div style={{ width:32, height:32, flexShrink:0 }}>
                    {h.kontakte?.logo_url
                      ? <img src={h.kontakte.logo_url} alt="" style={{ width:32,height:32,objectFit:'contain',borderRadius:6,border:'1px solid var(--gray-200)'}}/>
                      : <div style={{ width:32,height:32,background:'var(--navy)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white'}}>{h.kontakte?.firma?.[0]||'?'}</div>
                    }
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <strong style={{ fontSize:14 }}>{h.kontakte?.firma||'Kein Kontakt'}</strong>
                      <span style={{ fontSize:12, background:'var(--gray-100)', padding:'1px 8px', borderRadius:20 }}>{h.art}</span>
                      {isUe && <span style={{ fontSize:11, color:'var(--red)', fontWeight:700 }}>ÜBERFÄLLIG</span>}
                    </div>
                    <div style={{ fontSize:13, color:'var(--gray-600)', marginTop:2 }}>{h.betreff}</div>
                    {h.naechste_aktion && <div style={{ fontSize:12, color:'var(--blue)', marginTop:2 }}>→ {h.naechste_aktion}</div>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                    {h.faellig_am && <div style={{ textAlign:'right' }}><div style={{ fontSize:12, fontWeight:600, color:isUe?'var(--red)':'var(--gray-600)' }}>{new Date(h.faellig_am).toLocaleDateString('de-DE')}</div></div>}
                    <button onClick={e=>toggleCrmErledigt(e,h)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:22 }}>{h.erledigt?'✅':'⬜'}</button>
                    <span style={{ fontSize:12, color:'var(--gray-400)' }}>{isExp?'▲':'▼'}</span>
                  </div>
                </div>
                {isExp && (
                  <div style={{ borderTop:'1px solid var(--gray-100)', padding:'12px 16px', background:'var(--gray-100)' }}>
                    {h.notiz && <div style={{ fontSize:13, color:'var(--gray-600)', marginBottom:8 }}><strong>Notiz:</strong> {h.notiz}</div>}
                    <button className="btn btn-sm btn-primary" onClick={()=>navigate('/kontakte/'+h.kontakt_id)}>Zum Kontakt →</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function EventTodoListe({ items }) {
    if (!items.length) return <div className="empty-state"><p>Keine Event-Aufgaben.</p></div>
    return (
      <div style={{ display:'grid', gap:8 }}>
        {items.map(t => (
          <div key={t.id} style={{ background:'var(--white)', borderRadius:'var(--radius)', border:'1.5px solid var(--gray-200)', borderLeft:'4px solid var(--orange)', padding:'12px 16px', display:'flex', alignItems:'center', gap:12, opacity:t.erledigt?0.6:1 }}>
            <button onClick={e=>toggleEventTodo(e,t)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:22,flexShrink:0 }}>{t.erledigt?'✅':'⬜'}</button>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14, marginBottom:2, textDecoration:t.erledigt?'line-through':'none' }}>{t.titel}</div>
              {t.event && <div style={{ fontSize:12, color:'var(--gray-600)' }}>📅 {t.event.titel}</div>}
              {t.beschreibung && <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{t.beschreibung}</div>}
            </div>
            {t.faellig_am && <div style={{ fontSize:12, color:'var(--gray-400)', flexShrink:0 }}>📅 {new Date(t.faellig_am).toLocaleDateString('de-DE')}</div>}
            <button onClick={()=>navigate('/events')} className="btn btn-sm btn-outline" style={{ fontSize:11 }}>→ Event</button>
          </div>
        ))}
      </div>
    )
  }

  function MediaListe({ items }) {
    if (!items.length) return <div className="empty-state"><p>Keine Media-Aufgaben.</p></div>
    return (
      <div style={{ display:'grid', gap:8 }}>
        {items.map(a => {
          const st = STATUS_MEDIA[a.status]||STATUS_MEDIA.offen
          return (
            <div key={a.id} style={{ background:'var(--white)', borderRadius:'var(--radius)', border:'1.5px solid var(--gray-200)', borderLeft:'4px solid #0ea5e9', padding:'12px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <div style={{ flex:1 }}>
                  {a.mannschaft && <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, background:(a.mannschaft.farbe||'#ccc')+'20', color:a.mannschaft.farbe||'var(--navy)', fontWeight:700, marginBottom:4, display:'inline-block' }}>{a.mannschaft.name}</span>}
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{a.titel}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <span className="badge" style={{ background:st.bg, color:st.text }}>{st.label}</span>
                    {a.zugewiesener && <span style={{ fontSize:12, color:'var(--gray-600)' }}>→ {a.zugewiesener.name}</span>}
                    {a.faellig_am && <span style={{ fontSize:12, color:'var(--gray-400)' }}>📅 {new Date(a.faellig_am).toLocaleDateString('de-DE')}</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:4, flexDirection:'column', alignItems:'flex-end', flexShrink:0 }}>
                  {a.status==='offen' && <button onClick={()=>mediaStatusAendern(a.id,'in_bearbeitung')} className="btn btn-sm btn-outline">Start</button>}
                  {a.status==='in_bearbeitung' && <button onClick={()=>mediaStatusAendern(a.id,'zur_freigabe')} className="btn btn-sm btn-outline">Zur Freigabe</button>}
                  {a.status==='zur_freigabe' && isAdmin && <>
                    <button onClick={()=>mediaStatusAendern(a.id,'freigegeben')} className="btn btn-sm" style={{background:'#e2efda',color:'#2d6b3a',border:'none'}}>✓</button>
                    <button onClick={()=>mediaStatusAendern(a.id,'abgelehnt')} className="btn btn-sm btn-danger">✗</button>
                  </>}
                  <button onClick={()=>navigate('/media/aufgaben')} className="btn btn-sm btn-outline" style={{ fontSize:11 }}>→ Media</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  const totalOffen = crmGef.filter(h=>!h.erledigt).length + eventGef.filter(t=>!t.erledigt).length + (canAccessMedia ? mediaGef.filter(a=>!['freigegeben','abgelehnt'].includes(a.status)).length : 0)

  return (
    <main className="main">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <div className="page-title">Aufgaben</div>
          <p className="page-subtitle">CRM, Events{canAccessMedia?' und Media':''} im Überblick</p>
        </div>
        <button onClick={()=>setShowNeuForm(true)} className="btn btn-gold">+ Neue Aufgabe</button>
      </div>

      {/* Neue Aufgabe Form */}
      {showNeuForm && (
        <div className="card" style={{ marginBottom:20 }}>
          <h3 style={{ fontSize:16, color:'var(--navy)', marginBottom:14 }}>Neue Aufgabe anlegen</h3>
          <div className="tabs" style={{ marginBottom:16 }}>
            {canAccessMedia && <button className={`tab-btn${neuTyp==='media'?' active':''}`} onClick={()=>setNeuTyp('media')}>📸 Media-Aufgabe</button>}
            <button className={`tab-btn${neuTyp==='event'?' active':''}`} onClick={()=>setNeuTyp('event')}>📅 Event-Todo</button>
          </div>
          <div className="form-group"><label>Titel *</label><input value={neuForm.titel} onChange={e=>setNeuForm(p=>({...p,titel:e.target.value}))} /></div>
          <div className="form-group"><label>Beschreibung</label><textarea value={neuForm.beschreibung} onChange={e=>setNeuForm(p=>({...p,beschreibung:e.target.value}))} rows={2} /></div>
          <div className="form-row">
            <div className="form-group"><label>Zuweisen an</label>
              <select value={neuForm.zugewiesen_an} onChange={e=>setNeuForm(p=>({...p,zugewiesen_an:e.target.value}))}>
                <option value="">Nicht zugewiesen</option>
                {mitglieder.map(m=><option key={m.id} value={m.id}>{m.name||m.email}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Fällig am</label><input type="date" value={neuForm.faellig_am} onChange={e=>setNeuForm(p=>({...p,faellig_am:e.target.value}))} /></div>
          </div>
          {neuTyp==='media' && (
            <div className="form-row">
              <div className="form-group"><label>Priorität</label>
                <select value={neuForm.prioritaet} onChange={e=>setNeuForm(p=>({...p,prioritaet:e.target.value}))}>
                  <option value="niedrig">↓ Niedrig</option><option value="normal">→ Normal</option>
                  <option value="hoch">↑ Hoch</option><option value="dringend">⚡ Dringend</option>
                </select>
              </div>
              <div className="form-group"><label>Mannschaft</label>
                <select value={neuForm.mannschaft_id} onChange={e=>setNeuForm(p=>({...p,mannschaft_id:e.target.value}))}>
                  <option value="">Keine</option>
                  {mannschaften.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
          )}
          {neuTyp==='event' && (
            <div className="form-group"><label>Event</label>
              <select value={neuForm.event_id} onChange={e=>setNeuForm(p=>({...p,event_id:e.target.value}))}>
                <option value="">Kein Event</option>
                {events.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={neueAufgabeSpeichern} className="btn btn-primary">Speichern</button>
            <button onClick={()=>setShowNeuForm(false)} className="btn btn-outline">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:16 }}>
        {[['alle','📋 Alle',totalOffen],['crm','👥 CRM',crmGef.filter(h=>!h.erledigt).length],['events','📅 Events',eventGef.filter(t=>!t.erledigt).length],...(canAccessMedia?[['media','📸 Media',mediaGef.filter(a=>!['freigegeben','abgelehnt'].includes(a.status)).length]]:[])]
          .map(([key,label,count])=>(
            <button key={key} className={`tab-btn${aktiveTab===key?' active':''}`} onClick={()=>setAktiveTab(key)}>
              {label} {count>0&&<span style={{ marginLeft:4, fontSize:11, background:'var(--red)', color:'white', borderRadius:10, padding:'0 5px' }}>{count}</span>}
            </button>
          ))}
      </div>

      {/* Filter */}
      <div className="toolbar" style={{ marginBottom:16 }}>
        {(aktiveTab==='crm'||aktiveTab==='alle') && (
          <select value={personFilter!==undefined?personFilter:meinName} onChange={e=>setPersonFilter(e.target.value)}>
            <option value={meinName}>Meine ({meinName})</option>
            <option value="">Alle Personen</option>
            {mitglieder.filter(n=>(n.name||n.email)!==meinName).map(n=><option key={n.email||n.name} value={n.name||n.email}>{n.name||n.email}</option>)}
          </select>
        )}
        <select value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="offen">Offen</option>
          <option value="alle">Alle</option>
          <option value="erledigt">Erledigt</option>
        </select>
        <span style={{ marginLeft:'auto', fontSize:13, color:'var(--gray-600)' }}>{totalOffen} offen</span>
      </div>

      {/* CRM */}
      {(aktiveTab==='alle'||aktiveTab==='crm') && (
        <>
          {aktiveTab==='alle' && <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:10, paddingBottom:6, borderBottom:'2px solid var(--gray-200)' }}>👥 CRM Aufgaben</div>}
          {filter!=='erledigt' && <>
            <CRMListe items={ueberfaellig} title="Überfällig" color="var(--red)" icon="🚨"/>
            <CRMListe items={heute} title="Heute fällig" color="var(--orange)" icon="⏰"/>
            <CRMListe items={spaeter} title="Demnächst" color="var(--blue)" icon="📅"/>
            <CRMListe items={keinDatum} title="Kein Datum" color="var(--gray-400)" icon="📋"/>
            {!ueberfaellig.length && !heute.length && !spaeter.length && !keinDatum.length && <div className="empty-state card"><p>Keine offenen CRM-Aufgaben. 🎉</p></div>}
          </>}
          {filter==='erledigt' && <CRMListe items={erledigtCrm} title="Erledigt" color="var(--green)" icon="✅"/>}
          {filter==='alle' && <>
            <CRMListe items={ueberfaellig} title="Überfällig" color="var(--red)" icon="🚨"/>
            <CRMListe items={heute} title="Heute" color="var(--orange)" icon="⏰"/>
            <CRMListe items={spaeter} title="Demnächst" color="var(--blue)" icon="📅"/>
            <CRMListe items={keinDatum} title="Kein Datum" color="var(--gray-400)" icon="📋"/>
            <CRMListe items={erledigtCrm} title="Erledigt" color="var(--green)" icon="✅"/>
          </>}
        </>
      )}

      {/* Events */}
      {(aktiveTab==='alle'||aktiveTab==='events') && (
        <div style={{ marginTop:aktiveTab==='alle'?24:0 }}>
          {aktiveTab==='alle' && <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:10, marginTop:8, paddingBottom:6, borderBottom:'2px solid var(--gray-200)' }}>📅 Event Aufgaben</div>}
          <EventTodoListe items={eventGef} />
        </div>
      )}

      {/* Media */}
      {canAccessMedia && (aktiveTab==='alle'||aktiveTab==='media') && (
        <div style={{ marginTop:aktiveTab==='alle'?24:0 }}>
          {aktiveTab==='alle' && <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:10, marginTop:8, paddingBottom:6, borderBottom:'2px solid var(--gray-200)' }}>📸 Media Aufgaben</div>}
          <MediaListe items={mediaGef} />
        </div>
      )}
    </main>
  )
}
