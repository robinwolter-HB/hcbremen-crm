import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const BADGE_MAP = { 'Zugesagt':'badge-zugesagt','Eingeladen':'badge-eingeladen','Offen':'badge-offen','Absage':'badge-absage','Aktiver Sponsor':'badge-aktiv','Ehemaliger Sponsor':'badge-ehemaliger' }
const ART_LIST = ['Anruf','E-Mail','Meeting','Veranstaltung','WhatsApp','Brief','Sonstiges']
const EMPTY_H = { ansprechpartner:'', art:'Anruf', betreff:'', notiz:'', naechste_aktion:'', faellig_am:'', zustaendig:'', zustaendig_personen:[], erledigt:false }
const EMPTY_AP = { name:'', position:'', email:'', telefon:'', mobil:'', hauptansprechpartner:false, notiz:'' }

export default function KontaktDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [kontakt, setKontakt] = useState(null)
  const [ansprechpartner, setAnsprechpartner] = useState([])
  const [historie, setHistorie] = useState([])
  const [sponsoring, setSponsoring] = useState(null)
  const [events, setEvents] = useState([])
  const [alleEvents, setAlleEvents] = useState([])
  const [personen, setPersonen] = useState([])
  const [tab, setTab] = useState('info')
  const [historieModal, setHistorieModal] = useState(false)
  const [apModal, setApModal] = useState(false)
  const [eventModal, setEventModal] = useState(false)
  const [hForm, setHForm] = useState(EMPTY_H)
  const [apForm, setApForm] = useState(EMPTY_AP)
  const [selectedEvents, setSelectedEvents] = useState([])
  const [saving, setSaving] = useState(false)
  const [notizenText, setNotizenText] = useState('')
  const [notizenSaving, setNotizenSaving] = useState(false)
  const [notizenSaved, setNotizenSaved] = useState(false)
  const [neuePersonInput, setNeuePersonInput] = useState('')
  const notizenTimer = useRef(null)

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: k },{ data: ap },{ data: h },{ data: s },{ data: t },{ data: ev },{ data: p }] = await Promise.all([
      supabase.from('kontakte').select('*').eq('id', id).single(),
      supabase.from('ansprechpartner').select('*').eq('kontakt_id', id).order('hauptansprechpartner', { ascending: false }),
      supabase.from('kontakthistorie').select('*').eq('kontakt_id', id).order('erstellt_am', { ascending: false }),
      supabase.from('sponsoring').select('*,saisons(name),sponsoring_pakete(name)').eq('kontakt_id', id).single(),
      supabase.from('veranstaltung_teilnahme').select('*,veranstaltungen(id,name,datum,ort)').eq('kontakt_id', id),
      supabase.from('veranstaltungen').select('*').order('datum', { ascending: false }),
      supabase.from('personen').select('*').eq('aktiv', true).order('name')
    ])
    setKontakt(k)
    setNotizenText(k?.notizen_text || '')
    setAnsprechpartner(ap || [])
    setHistorie(h || [])
    setSponsoring(s)
    setEvents(t || [])
    setAlleEvents(ev || [])
    setPersonen(p || [])
    setSelectedEvents((t || []).map(x => x.veranstaltung_id))
  }

  // Auto-save Notizen
  function handleNotizenChange(val) {
    setNotizenText(val)
    setNotizenSaved(false)
    if (notizenTimer.current) clearTimeout(notizenTimer.current)
    notizenTimer.current = setTimeout(async () => {
      setNotizenSaving(true)
      await supabase.from('kontakte').update({ notizen_text: val }).eq('id', id)
      setNotizenSaving(false)
      setNotizenSaved(true)
      setTimeout(() => setNotizenSaved(false), 2000)
    }, 800)
  }

  async function saveHistorie() {
    setSaving(true)
    const payload = { ...hForm, kontakt_id: id, erstellt_von: profile?.id }
    if (hForm.id) await supabase.from('kontakthistorie').update(payload).eq('id', hForm.id)
    else await supabase.from('kontakthistorie').insert(payload)
    setHistorieModal(false); setSaving(false); load()
  }

  async function toggleErledigt(h) {
    await supabase.from('kontakthistorie').update({ erledigt: !h.erledigt }).eq('id', h.id)
    load()
  }

  async function deleteHistorie(hid) {
    if (!window.confirm('Eintrag loeschen?')) return
    await supabase.from('kontakthistorie').delete().eq('id', hid); load()
  }

  async function saveAP() {
    setSaving(true)
    const payload = { ...apForm, kontakt_id: id }
    if (apForm.id) await supabase.from('ansprechpartner').update(payload).eq('id', apForm.id)
    else await supabase.from('ansprechpartner').insert(payload)
    setApModal(false); setSaving(false); load()
  }

  async function deleteAP(apid) {
    if (!window.confirm('Ansprechpartner loeschen?')) return
    await supabase.from('ansprechpartner').delete().eq('id', apid); load()
  }

  async function setHauptAP(apid) {
    await supabase.from('ansprechpartner').update({ hauptansprechpartner: false }).eq('kontakt_id', id)
    await supabase.from('ansprechpartner').update({ hauptansprechpartner: true }).eq('id', apid)
    load()
  }

  async function saveEvents() {
    setSaving(true)
    const existing = events.map(e => e.veranstaltung_id)
    const toAdd = selectedEvents.filter(e => !existing.includes(e))
    const toRemove = existing.filter(e => !selectedEvents.includes(e))
    if (toAdd.length > 0) await supabase.from('veranstaltung_teilnahme').insert(toAdd.map(vid => ({ veranstaltung_id: vid, kontakt_id: id, teilgenommen: true })))
    if (toRemove.length > 0) await supabase.from('veranstaltung_teilnahme').delete().eq('kontakt_id', id).in('veranstaltung_id', toRemove)
    setEventModal(false); setSaving(false); load()
  }

  function toggleZustaendig(name) {
    setHForm(f => {
      const current = f.zustaendig_personen || []
      const updated = current.includes(name) ? current.filter(n => n !== name) : [...current, name]
      return { ...f, zustaendig_personen: updated, zustaendig: updated.join(', ') }
    })
  }

  async function addNeuePerson() {
    const name = neuePersonInput.trim()
    if (!name) return
    await supabase.from('personen').upsert({ name }, { onConflict: 'name' })
    setNeuePersonInput('')
    const { data } = await supabase.from('personen').select('*').eq('aktiv', true).order('name')
    setPersonen(data || [])
    toggleZustaendig(name)
  }

  if (!kontakt) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <main className="main">
      <button className="back-btn" onClick={() => navigate('/kontakte')}>&#8592; Zurueck</button>
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:20}}>
            {kontakt.logo_url
              ? <img src={kontakt.logo_url} alt="Logo" style={{width:72,height:72,objectFit:'contain',borderRadius:8,border:'1px solid var(--gray-200)'}} />
              : <div style={{width:72,height:72,background:'var(--gray-100)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color:'var(--gray-400)'}}>{kontakt.firma?.[0]}</div>
            }
            <div>
              <div className="page-title" style={{marginBottom:6}}>{kontakt.firma}</div>
              <span className={'badge '+(BADGE_MAP[kontakt.status]||'')}>{kontakt.status}</span>
              <span style={{marginLeft:8,fontSize:13,color:'var(--gray-600)'}}>{kontakt.kategorie}</span>
            </div>
          </div>
          <button className="btn btn-sm btn-gold" onClick={() => { setHForm({...EMPTY_H, zustaendig_personen: profile?.name?[profile.name]:[], zustaendig: profile?.name||''}); setHistorieModal(true) }}>+ Aktion</button>
        </div>

        <div className="tabs">
          {[['info','Kontaktdaten'],['ansprechpartner','Ansprechpartner ('+ansprechpartner.length+')'],['notizen','Notizen'],['historie','Historie ('+historie.length+')'],['events','Events ('+events.length+')'],['sponsoring','Sponsoring']].map(([key,label]) => (
            <button key={key} className={'tab-btn'+(tab===key?' active':'')} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>

        {tab==='info' && (
          <div className="detail-grid">
            {[['Status',kontakt.status],['Kategorie',kontakt.kategorie],['E-Mail',kontakt.email],['Telefon',kontakt.telefon],['Zustaendig',kontakt.zustaendig]].map(([l,v]) => v ? (
              <div key={l} className="detail-field"><label>{l}</label><span>{v}</span></div>
            ) : null)}
            {kontakt.notiz && <div className="detail-field" style={{gridColumn:'1/-1'}}><label>Notiz</label><span>{kontakt.notiz}</span></div>}
          </div>
        )}

        {tab==='notizen' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div className="section-title" style={{margin:0}}>Notizen</div>
              <span style={{fontSize:12,color:notizenSaved?'var(--green)':notizenSaving?'var(--gray-400)':'transparent'}}>
                {notizenSaving?'Speichern...':notizenSaved?'Gespeichert ✓':''}
              </span>
            </div>
            {/* Toolbar */}
            <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
              {[['bold','B','font-weight:700'],['italic','I','font-style:italic'],['underline','U','text-decoration:underline']].map(([cmd,label]) => (
                <button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd)}}
                  style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,background:'var(--white)',cursor:'pointer',fontWeight:cmd==='bold'?700:400,fontStyle:cmd==='italic'?'italic':'normal',textDecoration:cmd==='underline'?'underline':'none',fontSize:13}}>
                  {label}
                </button>
              ))}
              <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertUnorderedList')}}
                style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,background:'var(--white)',cursor:'pointer',fontSize:13}}>
                Liste
              </button>
              <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertOrderedList')}}
                style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,background:'var(--white)',cursor:'pointer',fontSize:13}}>
                1. Liste
              </button>
              <button onMouseDown={e=>{e.preventDefault();document.execCommand('formatBlock',false,'h3')}}
                style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,background:'var(--white)',cursor:'pointer',fontSize:13}}>
                Ueberschrift
              </button>
              <button onMouseDown={e=>{e.preventDefault();document.execCommand('removeFormat')}}
                style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,background:'var(--white)',cursor:'pointer',fontSize:13,color:'var(--gray-400)'}}>
                Format loeschen
              </button>
            </div>
            <div
              contentEditable
              suppressContentEditableWarning
              onInput={e => handleNotizenChange(e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{__html: notizenText}}
              style={{minHeight:300,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:16,fontSize:14,lineHeight:1.7,outline:'none',background:'var(--white)'}}
            />
            <p style={{fontSize:12,color:'var(--gray-400)',marginTop:8}}>Wird automatisch gespeichert.</p>
          </div>
        )}

        {tab==='ansprechpartner' && (
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button className="btn btn-primary btn-sm" onClick={() => { setApForm(EMPTY_AP); setApModal(true) }}>+ Ansprechpartner</button>
            </div>
            {ansprechpartner.length === 0
              ? <div className="empty-state"><p>Noch keine Ansprechpartner hinterlegt.</p></div>
              : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
                  {ansprechpartner.map(ap => (
                    <div key={ap.id} style={{border:'2px solid '+(ap.hauptansprechpartner?'var(--gold)':'var(--gray-200)'),borderRadius:'var(--radius)',padding:20,position:'relative'}}>
                      {ap.hauptansprechpartner && <span style={{position:'absolute',top:12,right:12,fontSize:11,background:'var(--gold)',color:'var(--navy)',padding:'2px 8px',borderRadius:20,fontWeight:700}}>Hauptkontakt</span>}
                      <div style={{fontFamily:'"DM Serif Display",serif',fontSize:18,color:'var(--navy)',marginBottom:12}}>{ap.name}</div>
                      <div style={{display:'grid',gap:8}}>
                        {ap.position && <div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Position</span>{ap.position}</div>}
                        {ap.email && <div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>E-Mail</span><a href={'mailto:'+ap.email} style={{color:'var(--blue)'}}>{ap.email}</a></div>}
                        {ap.telefon && <div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Telefon</span><a href={'tel:'+ap.telefon} style={{color:'var(--blue)'}}>{ap.telefon}</a></div>}
                        {ap.mobil && <div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Mobil</span><a href={'tel:'+ap.mobil} style={{color:'var(--blue)'}}>{ap.mobil}</a></div>}
                        {ap.notiz && <div style={{fontSize:13,color:'var(--gray-600)'}}><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Notiz</span>{ap.notiz}</div>}
                      </div>
                      <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
                        {!ap.hauptansprechpartner && <button className="btn btn-sm btn-outline" onClick={() => setHauptAP(ap.id)}>Als Hauptkontakt</button>}
                        <button className="btn btn-sm btn-outline" onClick={() => { setApForm(ap); setApModal(true) }}>Bearb.</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteAP(ap.id)}>X</button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {tab==='historie' && (
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button className="btn btn-primary btn-sm" onClick={() => { setHForm({...EMPTY_H, zustaendig_personen: profile?.name?[profile.name]:[], zustaendig: profile?.name||''}); setHistorieModal(true) }}>+ Neue Aktion</button>
            </div>
            {historie.length === 0
              ? <div className="empty-state"><p>Noch keine Eintraege.</p></div>
              : <div className="table-wrap"><table>
                  <thead><tr><th>Datum</th><th>Art</th><th>Betreff</th><th>Naechste Aktion</th><th>Faellig</th><th>Zustaendig</th><th>Done</th><th></th></tr></thead>
                  <tbody>
                    {historie.map(h => (
                      <tr key={h.id} style={{opacity:h.erledigt?0.55:1}}>
                        <td style={{whiteSpace:'nowrap',fontSize:13}}>{new Date(h.erstellt_am).toLocaleDateString('de-DE')}</td>
                        <td><span style={{fontSize:12,background:'var(--gray-100)',padding:'2px 8px',borderRadius:20}}>{h.art}</span></td>
                        <td><strong style={{fontSize:13}}>{h.betreff}</strong>{h.notiz&&<p style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>{h.notiz}</p>}</td>
                        <td style={{fontSize:13}}>{h.naechste_aktion}</td>
                        <td style={{fontSize:13,color:h.faellig_am&&!h.erledigt&&new Date(h.faellig_am)<new Date()?'var(--red)':'inherit'}}>{h.faellig_am?new Date(h.faellig_am).toLocaleDateString('de-DE'):'--'}</td>
                        <td style={{fontSize:12,color:'var(--gray-600)'}}>{(h.zustaendig_personen||[]).join(', ')||h.zustaendig||'--'}</td>
                        <td><button onClick={()=>toggleErledigt(h)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18}}>{h.erledigt?'✅':'⬜'}</button></td>
                        <td style={{whiteSpace:'nowrap'}}>
                          <button className="btn btn-sm btn-outline" onClick={()=>{setHForm({...h,zustaendig_personen:h.zustaendig_personen||[]});setHistorieModal(true)}}>Bearb.</button>
                          {' '}<button className="btn btn-sm btn-danger" onClick={()=>deleteHistorie(h.id)}>X</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
            }
          </div>
        )}

        {tab==='events' && (
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button className="btn btn-primary btn-sm" onClick={()=>setEventModal(true)}>Events verwalten</button>
            </div>
            {events.length===0
              ? <div className="empty-state"><p>Noch mit keinem Event verknuepft.</p></div>
              : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:16}}>
                  {events.map(e => (
                    <div key={e.id} style={{border:'1px solid var(--gray-200)',borderRadius:'var(--radius)',padding:16}}>
                      <div style={{fontWeight:600,marginBottom:4}}>{e.veranstaltungen?.name}</div>
                      <div style={{fontSize:13,color:'var(--gray-600)'}}>{e.veranstaltungen?.datum?new Date(e.veranstaltungen.datum).toLocaleDateString('de-DE'):'--'}{e.veranstaltungen?.ort?' · '+e.veranstaltungen.ort:''}</div>
                      {e.teilgenommen&&<span style={{fontSize:11,background:'#e2efda',color:'#2d6b3a',padding:'2px 8px',borderRadius:20,fontWeight:600,marginTop:8,display:'inline-block'}}>Teilgenommen</span>}
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {tab==='sponsoring' && (
          <div>
            {sponsoring
              ? <div className="detail-grid">
                  {[['Paket',sponsoring.sponsoring_pakete?.name||sponsoring.paket],['Saison',sponsoring.saisons?.name],['Jahresbetrag',sponsoring.jahresbetrag?Number(sponsoring.jahresbetrag).toLocaleString('de-DE')+' EUR':null],['Gesamtwert',sponsoring.gesamtwert?Number(sponsoring.gesamtwert).toLocaleString('de-DE')+' EUR':null],['Vertragsende',sponsoring.vertragsende?new Date(sponsoring.vertragsende).toLocaleDateString('de-DE'):null],['Status',sponsoring.status],['Unterzeichnet',sponsoring.vertrag_unterzeichnet?'Ja':'Nein']].filter(([,v])=>v).map(([l,v])=>(
                    <div key={l} className="detail-field"><label>{l}</label><span>{v}</span></div>
                  ))}
                  {sponsoring.drive_link&&<div className="detail-field"><label>Vertrag</label><span><a href={sponsoring.drive_link} target="_blank" rel="noreferrer" style={{color:'var(--blue)'}}>Oeffnen</a></span></div>}
                  {(sponsoring.sachleistungen||[]).length>0&&<div className="detail-field" style={{gridColumn:'1/-1'}}><label>Sachleistungen</label><div style={{marginTop:4}}>{sponsoring.sachleistungen.map((sl,i)=><div key={i} style={{fontSize:13}}>{sl.typ}: {sl.menge}{sl.wert?' · '+Number(sl.wert).toLocaleString('de-DE')+' EUR':''}</div>)}</div></div>}
                </div>
              : <div className="empty-state"><p>Kein Sponsoring-Vertrag hinterlegt. Im Sponsoring-Tab anlegen.</p></div>
            }
          </div>
        )}
      </div>

      {/* MODAL: AKTION */}
      {historieModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setHistorieModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{hForm.id?'Aktion bearbeiten':'Neue Aktion'}</span>
              <button className="close-btn" onClick={()=>setHistorieModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Art</label>
                  <select value={hForm.art} onChange={e=>setHForm(f=>({...f,art:e.target.value}))}>
                    {ART_LIST.map(a=><option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Ansprechpartner</label>
                  <select value={hForm.ansprechpartner} onChange={e=>setHForm(f=>({...f,ansprechpartner:e.target.value}))}>
                    <option value="">Kein / Allgemein</option>
                    {ansprechpartner.map(ap=><option key={ap.id} value={ap.name}>{ap.name}{ap.position?' ('+ap.position+')':''}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Betreff / Thema</label><input value={hForm.betreff} onChange={e=>setHForm(f=>({...f,betreff:e.target.value}))} /></div>
              <div className="form-group"><label>Notiz / Ergebnis</label><textarea value={hForm.notiz} onChange={e=>setHForm(f=>({...f,notiz:e.target.value}))} /></div>
              <div className="form-row">
                <div className="form-group"><label>Naechste Aktion</label><input value={hForm.naechste_aktion} onChange={e=>setHForm(f=>({...f,naechste_aktion:e.target.value}))} /></div>
                <div className="form-group"><label>Faellig am</label><input type="date" value={hForm.faellig_am} onChange={e=>setHForm(f=>({...f,faellig_am:e.target.value}))} /></div>
              </div>

              {/* Zustaendigkeit */}
              <div className="form-group">
                <label>Zustaendig (Mehrfachauswahl)</label>
                <div style={{border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:10,marginBottom:8,display:'flex',flexWrap:'wrap',gap:8,minHeight:44}}>
                  {personen.length===0
                    ? <span style={{color:'var(--gray-400)',fontSize:13}}>Noch keine Personen – unten hinzufuegen</span>
                    : personen.map(p => {
                        const selected = (hForm.zustaendig_personen||[]).includes(p.name)
                        return (
                          <button key={p.id} type="button" onClick={()=>toggleZustaendig(p.name)}
                            style={{padding:'4px 12px',borderRadius:20,border:'1.5px solid',fontSize:13,cursor:'pointer',
                              background:selected?'var(--navy)':'var(--white)',color:selected?'var(--white)':'var(--gray-600)',
                              borderColor:selected?'var(--navy)':'var(--gray-200)'}}>
                            {p.name}
                          </button>
                        )
                      })
                  }
                </div>
                <div style={{display:'flex',gap:8}}>
                  <input value={neuePersonInput} onChange={e=>setNeuePersonInput(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&addNeuePerson()}
                    placeholder="Person hinzufuegen..." style={{flex:1,padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}} />
                  <button className="btn btn-sm btn-outline" onClick={addNeuePerson}>+ Hinzufuegen</button>
                </div>
              </div>

              <div className="form-group"><label>Erledigt</label>
                <select value={hForm.erledigt?'Ja':'Nein'} onChange={e=>setHForm(f=>({...f,erledigt:e.target.value==='Ja'}))}>
                  <option>Nein</option><option>Ja</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setHistorieModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveHistorie} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ANSPRECHPARTNER */}
      {apModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setApModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{apForm.id?'Ansprechpartner bearbeiten':'Neuer Ansprechpartner'}</span>
              <button className="close-btn" onClick={()=>setApModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input value={apForm.name} onChange={e=>setApForm(f=>({...f,name:e.target.value}))} /></div>
                <div className="form-group"><label>Position / Rolle</label><input value={apForm.position||''} onChange={e=>setApForm(f=>({...f,position:e.target.value}))} placeholder="z.B. Geschaeftsfuehrer" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={apForm.email||''} onChange={e=>setApForm(f=>({...f,email:e.target.value}))} /></div>
                <div className="form-group"><label>Telefon (Buero)</label><input value={apForm.telefon||''} onChange={e=>setApForm(f=>({...f,telefon:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Mobil</label><input value={apForm.mobil||''} onChange={e=>setApForm(f=>({...f,mobil:e.target.value}))} /></div>
                <div className="form-group" style={{display:'flex',alignItems:'center',paddingTop:24}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}>
                    <input type="checkbox" checked={apForm.hauptansprechpartner||false} onChange={e=>setApForm(f=>({...f,hauptansprechpartner:e.target.checked}))} />
                    Hauptansprechpartner
                  </label>
                </div>
              </div>
              <div className="form-group"><label>Notiz</label><textarea value={apForm.notiz||''} onChange={e=>setApForm(f=>({...f,notiz:e.target.value}))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setApModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveAP} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EVENTS */}
      {eventModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEventModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Events verwalten</span>
              <button className="close-btn" onClick={()=>setEventModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <p style={{fontSize:14,color:'var(--gray-600)',marginBottom:16}}>Waehle alle Events bei denen {kontakt.firma} dabei war:</p>
              <div style={{display:'grid',gap:8}}>
                {alleEvents.length===0 ? <p style={{color:'var(--gray-400)'}}>Noch keine Events angelegt.</p>
                  : alleEvents.map(ev => {
                    const selected = selectedEvents.includes(ev.id)
                    return (
                      <label key={ev.id} style={{display:'flex',alignItems:'center',gap:12,padding:12,border:'1.5px solid '+(selected?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:selected?'rgba(15,34,64,0.04)':'var(--white)'}}>
                        <input type="checkbox" checked={selected} onChange={e=>setSelectedEvents(prev=>e.target.checked?[...prev,ev.id]:prev.filter(x=>x!==ev.id))} />
                        <div>
                          <div style={{fontWeight:600,fontSize:14}}>{ev.name}</div>
                          <div style={{fontSize:12,color:'var(--gray-400)'}}>{ev.datum?new Date(ev.datum).toLocaleDateString('de-DE'):'kein Datum'}{ev.ort?' · '+ev.ort:''}</div>
                        </div>
                      </label>
                    )
                  })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setEventModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveEvents} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
