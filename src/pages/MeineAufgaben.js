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
  const [alle, setAlle] = useState([])
  const [mediaAufgaben, setMediaAufgaben] = useState([])
  const [filter, setFilter] = useState('offen')
  const [personFilter, setPersonFilter] = useState(undefined)
  const [nutzer, setNutzer] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [aktiveTab, setAktiveTab] = useState('crm') // 'crm' | 'media' | 'alle'

  const canAccessMedia = profile?.rolle === 'admin' || profile?.rolle === 'media' || (profile?.bereiche || []).includes('media')

  useEffect(() => { load() }, [])

  async function load() {
    const queries = [
      supabase.from('kontakthistorie').select('*,kontakte(id,firma,logo_url)').order('faellig_am', { ascending: true, nullsFirst: false }),
      supabase.from('profile').select('name,email').order('name'),
    ]
    if (canAccessMedia) {
      queries.push(supabase.from('media_aufgaben').select('*, zugewiesener:zugewiesen_an(name), ersteller:erstellt_von(name)').order('faellig_am', { ascending: true, nullsFirst: false }))
    }
    const [{ data: h }, { data: n }, mediaRes] = await Promise.all(queries)
    setAlle(h || [])
    setNutzer(n || [])
    setMediaAufgaben(mediaRes?.data || [])
    setLoading(false)
  }

  async function toggleErledigt(e, h) {
    e.stopPropagation()
    await supabase.from('kontakthistorie').update({ erledigt: !h.erledigt }).eq('id', h.id)
    load()
  }

  async function mediaStatusAendern(id, status) {
    await supabase.from('media_aufgaben').update({ status }).eq('id', id)
    load()
  }

  const meinName = profile?.name || profile?.email || ''

  // CRM Aufgaben gefiltert
  const crmGefiltert = alle.filter(h => {
    const person = personFilter !== undefined ? personFilter : meinName
    let zustaendig = true
    if (person) {
      zustaendig = (h.zustaendig_personen||[]).includes(person) || h.zustaendig===person || (h.zustaendig||'').split(',').map(s=>s.trim()).includes(person)
    }
    const matchFilter = filter==='alle' ? true : filter==='offen' ? !h.erledigt : h.erledigt
    return zustaendig && matchFilter
  })

  // Media Aufgaben gefiltert
  const mediaGefiltert = mediaAufgaben.filter(a => {
    if (filter === 'erledigt') return a.status === 'freigegeben'
    if (filter === 'offen') return !['freigegeben','abgelehnt'].includes(a.status)
    return true
  })

  // Gruppen CRM
  const now = new Date()
  const ueberfaellig = crmGefiltert.filter(h => h.faellig_am && !h.erledigt && new Date(h.faellig_am)<now)
  const heute = crmGefiltert.filter(h => { if(!h.faellig_am||h.erledigt) return false; return new Date(h.faellig_am).toDateString()===now.toDateString() })
  const spaeter = crmGefiltert.filter(h => { if(!h.faellig_am||h.erledigt) return false; return new Date(h.faellig_am)>now && new Date(h.faellig_am).toDateString()!==now.toDateString() })
  const keinDatum = crmGefiltert.filter(h => !h.faellig_am && !h.erledigt)
  const erledigt = crmGefiltert.filter(h => h.erledigt)

  function CRMAufgabenListe({ items, title, color, icon }) {
    if (items.length===0) return null
    return (
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <span style={{ fontSize:16 }}>{icon}</span>
          <span style={{ fontWeight:700, fontSize:15, color }}>{title}</span>
          <span style={{ fontSize:12, background:color+'20', color, padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{items.length}</span>
        </div>
        <div style={{ display:'grid', gap:8 }}>
          {items.map(h => {
            const isExpanded = expanded[h.id]
            const isUeberfaellig = h.faellig_am && !h.erledigt && new Date(h.faellig_am)<now
            return (
              <div key={h.id} style={{ background:'var(--white)', borderRadius:'var(--radius)', border:'1.5px solid var(--gray-200)', borderLeft:`4px solid ${color}`, overflow:'hidden', opacity:h.erledigt?0.6:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer' }} onClick={()=>setExpanded(e=>({...e,[h.id]:!e[h.id]}))}>
                  <div style={{ width:32, height:32, flexShrink:0 }}>
                    {h.kontakte?.logo_url
                      ? <img src={h.kontakte.logo_url} alt="" style={{ width:32,height:32,objectFit:'contain',borderRadius:6,border:'1px solid var(--gray-200)' }}/>
                      : <div style={{ width:32,height:32,background:'var(--navy)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white' }}>{h.kontakte?.firma?.[0]||'?'}</div>
                    }
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <strong style={{ fontSize:14 }}>{h.kontakte?.firma||'Kein Kontakt'}</strong>
                      <span style={{ fontSize:12, background:'var(--gray-100)', padding:'1px 8px', borderRadius:20 }}>{h.art}</span>
                      {isUeberfaellig && <span style={{ fontSize:11, color:'var(--red)', fontWeight:700 }}>ÜBERFÄLLIG</span>}
                    </div>
                    <div style={{ fontSize:13, color:'var(--gray-600)', marginTop:2 }}>{h.betreff}</div>
                    {h.naechste_aktion && <div style={{ fontSize:12, color:'var(--blue)', marginTop:2 }}>→ {h.naechste_aktion}</div>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                    {h.faellig_am && (
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:isUeberfaellig?'var(--red)':'var(--gray-600)' }}>{new Date(h.faellig_am).toLocaleDateString('de-DE')}</div>
                        {(h.zustaendig_personen?.length>0||h.zustaendig) && <div style={{ fontSize:11, color:'var(--gray-400)' }}>👤 {(h.zustaendig_personen||[]).join(', ')||h.zustaendig}</div>}
                      </div>
                    )}
                    <button onClick={e=>toggleErledigt(e,h)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22 }}>{h.erledigt?'✅':'⬜'}</button>
                    <span style={{ fontSize:12, color:'var(--gray-400)' }}>{isExpanded?'▲':'▼'}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop:'1px solid var(--gray-100)', padding:'12px 16px', background:'var(--gray-100)', display:'grid', gap:8 }}>
                    {h.notiz && <div style={{ fontSize:13, color:'var(--gray-600)', lineHeight:1.5 }}><strong>Notiz:</strong> {h.notiz}</div>}
                    {h.meeting_datum && <div style={{ fontSize:13 }}><strong>Meeting:</strong> {new Date(h.meeting_datum).toLocaleDateString('de-DE')}{h.meeting_uhrzeit?' um '+h.meeting_uhrzeit.slice(0,5):''}{h.meeting_ort?' · '+h.meeting_ort:''}</div>}
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

  function MediaAufgabenListe({ items }) {
    if (items.length===0) return <div className="empty-state card"><p>Keine Media-Aufgaben.</p></div>
    const isAdmin = profile?.rolle === 'admin'
    return (
      <div style={{ display:'grid', gap:8 }}>
        {items.map(a => {
          const st = STATUS_MEDIA[a.status] || STATUS_MEDIA.offen
          return (
            <div key={a.id} style={{ background:'var(--white)', borderRadius:'var(--radius)', border:'1.5px solid var(--gray-200)', borderLeft:'4px solid #0ea5e9', padding:'12px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{a.titel}</div>
                  {a.beschreibung && <div style={{ fontSize:13, color:'var(--gray-600)', marginBottom:6 }}>{a.beschreibung.slice(0,100)}{a.beschreibung.length>100?'…':''}</div>}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <span className="badge" style={{ background:st.bg, color:st.text }}>{st.label}</span>
                    {a.zugewiesener && <span style={{ fontSize:12, color:'var(--gray-600)' }}>→ {a.zugewiesener.name}</span>}
                    {a.faellig_am && <span style={{ fontSize:12, color:'var(--gray-400)' }}>📅 {new Date(a.faellig_am).toLocaleDateString('de-DE')}</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:4, flexDirection:'column', alignItems:'flex-end' }}>
                  {a.status==='offen' && <button onClick={()=>mediaStatusAendern(a.id,'in_bearbeitung')} className="btn btn-sm btn-outline">Start</button>}
                  {a.status==='in_bearbeitung' && <button onClick={()=>mediaStatusAendern(a.id,'zur_freigabe')} className="btn btn-sm btn-outline">Zur Freigabe</button>}
                  {a.status==='zur_freigabe' && isAdmin && <>
                    <button onClick={()=>mediaStatusAendern(a.id,'freigegeben')} className="btn btn-sm" style={{ background:'#e2efda',color:'#2d6b3a',border:'none' }}>✓ Freigeben</button>
                    <button onClick={()=>mediaStatusAendern(a.id,'abgelehnt')} className="btn btn-sm btn-danger">✗ Ablehnen</button>
                  </>}
                  <button onClick={()=>navigate('/media/aufgaben')} className="btn btn-sm btn-outline" style={{ fontSize:11 }}>→ Media Hub</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  const totalOffen = crmGefiltert.filter(h=>!h.erledigt).length + (canAccessMedia ? mediaGefiltert.filter(a=>!['freigegeben','abgelehnt'].includes(a.status)).length : 0)

  return (
    <main className="main">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div className="page-title">Aufgaben</div>
          <p className="page-subtitle">CRM-Todos{canAccessMedia ? ' und Media-Aufgaben' : ''} im Überblick</p>
        </div>
        <div style={{ fontSize:13, color:'var(--gray-600)', background:'var(--gray-100)', padding:'6px 14px', borderRadius:20, fontWeight:600 }}>
          {totalOffen} offen
        </div>
      </div>

      {/* Tab: CRM / Media / Alle */}
      {canAccessMedia && (
        <div className="tabs" style={{ marginBottom:20 }}>
          {[['alle','📋 Alle'],['crm','👥 CRM'],['media','📸 Media']].map(([key,label])=>(
            <button key={key} className={`tab-btn${aktiveTab===key?' active':''}`} onClick={()=>setAktiveTab(key)}>{label}</button>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="toolbar" style={{ marginBottom:16 }}>
        {(aktiveTab==='crm'||aktiveTab==='alle') && (
          <select value={personFilter!==undefined?personFilter:meinName} onChange={e=>setPersonFilter(e.target.value)}>
            <option value={meinName}>Meine Aufgaben ({meinName})</option>
            <option value="">Alle Personen</option>
            {nutzer.filter(n=>(n.name||n.email)!==meinName).map(n=><option key={n.email||n.name} value={n.name||n.email}>{n.name||n.email}</option>)}
          </select>
        )}
        <select value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="offen">Offen</option>
          <option value="alle">Alle</option>
          <option value="erledigt">Erledigt</option>
        </select>
      </div>

      {/* CRM Aufgaben */}
      {(aktiveTab==='crm'||aktiveTab==='alle') && (
        <>
          {filter!=='erledigt' && <>
            <CRMAufgabenListe items={ueberfaellig} title="Überfällig" color="var(--red)" icon="🚨"/>
            <CRMAufgabenListe items={heute} title="Heute fällig" color="var(--orange)" icon="⏰"/>
            <CRMAufgabenListe items={spaeter} title="Demnächst" color="var(--blue)" icon="📅"/>
            <CRMAufgabenListe items={keinDatum} title="Kein Datum" color="var(--gray-400)" icon="📋"/>
            {crmGefiltert.filter(h=>!h.erledigt).length===0 && aktiveTab==='crm' && <div className="empty-state card"><p>Keine offenen CRM-Aufgaben. 🎉</p></div>}
          </>}
          {filter==='erledigt' && <CRMAufgabenListe items={erledigt} title="Erledigt" color="var(--green)" icon="✅"/>}
          {filter==='alle' && <>
            <CRMAufgabenListe items={ueberfaellig} title="Überfällig" color="var(--red)" icon="🚨"/>
            <CRMAufgabenListe items={heute} title="Heute fällig" color="var(--orange)" icon="⏰"/>
            <CRMAufgabenListe items={spaeter} title="Demnächst" color="var(--blue)" icon="📅"/>
            <CRMAufgabenListe items={keinDatum} title="Kein Datum" color="var(--gray-400)" icon="📋"/>
            <CRMAufgabenListe items={erledigt} title="Erledigt" color="var(--green)" icon="✅"/>
          </>}
        </>
      )}

      {/* Media Aufgaben */}
      {canAccessMedia && (aktiveTab==='media'||aktiveTab==='alle') && (
        <div style={{ marginTop: aktiveTab==='alle' ? 32 : 0 }}>
          {aktiveTab==='alle' && (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <span style={{ fontSize:16 }}>📸</span>
              <span style={{ fontWeight:700, fontSize:15, color:'#0ea5e9' }}>Media Aufgaben</span>
              <span style={{ fontSize:12, background:'#0ea5e915', color:'#0ea5e9', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{mediaGefiltert.length}</span>
            </div>
          )}
          <MediaAufgabenListe items={mediaGefiltert} />
        </div>
      )}
    </main>
  )
}
