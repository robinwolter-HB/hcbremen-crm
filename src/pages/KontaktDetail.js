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
  const [katalog, setKatalog] = useState([])
  const [kategorien, setKategorien] = useState([])
  const [gebuchteLeistungen, setGebuchteLeistungen] = useState([])
  const [links, setLinks] = useState([])
  const [linkModal, setLinkModal] = useState(false)
  const [linkForm, setLinkForm] = useState({titel:'',url:'',kategorie:'CI',notiz:''})
  const [saisons, setSaisons] = useState([])
  const [tab, setTab] = useState('info')
  const [historieModal, setHistorieModal] = useState(false)
  const [apModal, setApModal] = useState(false)
  const [eventModal, setEventModal] = useState(false)
  const [leistungModal, setLeistungModal] = useState(false)
  const [hForm, setHForm] = useState(EMPTY_H)
  const [apForm, setApForm] = useState(EMPTY_AP)
  const [lForm, setLForm] = useState({leistung_id:'',saison_id:'',anzahl:1,preis_vereinbart:'',abrechnung:'saison',notiz:''})
  const [selectedEvents, setSelectedEvents] = useState([])
  const [saving, setSaving] = useState(false)
  const [kontaktEditModal, setKontaktEditModal] = useState(false)
  const [kForm, setKForm] = useState({})
  const [kommentare, setKommentare] = useState({})
  const [kommentarText, setKommentarText] = useState({})
  const [kommentarSaving, setKommentarSaving] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState({})
  const [showMentions, setShowMentions] = useState({})
  const [expandedHistorie, setExpandedHistorie] = useState({})
  const [notizenText, setNotizenText] = useState('')
  const [notizenSaving, setNotizenSaving] = useState(false)
  const [notizenSaved, setNotizenSaved] = useState(false)
  const [neuePersonInput, setNeuePersonInput] = useState('')
  const notizenTimer = useRef(null)

  useEffect(() => { if (id && id !== 'undefined') load() }, [id])

  async function saveKontakt() {
    setSaving(true)
    const payload = { 
      firma: kForm.firma, 
      email: kForm.email||null, 
      telefon: kForm.telefon||null, 
      website: kForm.website||null, 
      branche: kForm.branche||null, 
      status: kForm.status, 
      kategorie: kForm.kategorie, 
      zustaendig: kForm.zustaendig||null, 
      notiz: kForm.notiz||null, 
      adresse_strasse: kForm.adresse_strasse||null, 
      adresse_plz: kForm.adresse_plz||null, 
      adresse_stadt: kForm.adresse_stadt||null,
      geaendert_am: new Date().toISOString()
    }
    const { error } = await supabase.from('kontakte').update(payload).eq('id', id)
    if (error) {
      alert('Speichern fehlgeschlagen: ' + error.message)
      setSaving(false)
      return
    }
    setKontaktEditModal(false); setSaving(false); load()
  }

  async function load() {
    if (!id || id === 'undefined') return
    const [{ data: k },{ data: ap },{ data: h },{ data: s },{ data: t },{ data: ev },{ data: p },{ data: kat },{ data: kateg },{ data: gl },{ data: sai },{ data: li }] = await Promise.all([
      supabase.from('kontakte').select('*').eq('id', id).single(),
      supabase.from('ansprechpartner').select('*').eq('kontakt_id', id).order('hauptansprechpartner', { ascending: false }),
      supabase.from('kontakthistorie').select('*').eq('kontakt_id', id).order('erstellt_am', { ascending: false }),
      supabase.from('sponsoring').select('*,saisons(name),sponsoring_pakete(name),sponsoring_saisons(saison_id,saisons(name))').eq('kontakt_id', id).single(),
      supabase.from('veranstaltung_teilnahme').select('*,veranstaltungen(id,name,datum,ort)').eq('kontakt_id', id),
      supabase.from('veranstaltungen').select('*').order('datum', { ascending: false }),
      supabase.from('personen').select('*').eq('aktiv', true).order('name'),
      supabase.from('leistungen_katalog').select('*,leistungen_kategorien(name,farbe)').eq('aktiv', true),
      supabase.from('leistungen_kategorien').select('*').order('reihenfolge'),
      supabase.from('sponsoring_leistungen').select('*,leistungen_katalog(name,leistungen_kategorien(name,farbe)),saisons(name)').eq('kontakt_id', id),
      supabase.from('saisons').select('*').order('beginn', { ascending: false }),
      supabase.from('kontakt_links').select('*').eq('kontakt_id', id).order('erstellt_am')
    ])
    setKontakt(k); setNotizenText(k?.notizen_text||'')
    if (k) setKForm(k)

    // Status und Kategorien laden
    const { data: st } = await supabase.from('crm_status').select('name').eq('aktiv', true).order('reihenfolge')
    if (st && st.length > 0) setStatusListe(st.map(s => s.name))
    const { data: kt } = await supabase.from('kontakt_kategorien').select('name').eq('aktiv', true).order('reihenfolge')
    if (kt && kt.length > 0) setKategorienListe(kt.map(k => k.name))
    setLinks(li || [])
    setAnsprechpartner(ap||[]); setHistorie(h||[])
    setSponsoring(s); setEvents(t||[]); setAlleEvents(ev||[])
    setPersonen(p||[]); setKatalog(kat||[]); setKategorien(kateg||[])
    setGebuchteLeistungen(gl||[]); setSaisons(sai||[])
    setSelectedEvents((t||[]).map(x=>x.veranstaltung_id))
  }

  function handleNotizenChange(val) {
    setNotizenText(val); setNotizenSaved(false)
    if (notizenTimer.current) clearTimeout(notizenTimer.current)
    notizenTimer.current = setTimeout(async () => {
      setNotizenSaving(true)
      await supabase.from('kontakte').update({ notizen_text: val }).eq('id', id)
      setNotizenSaving(false); setNotizenSaved(true)
      setTimeout(() => setNotizenSaved(false), 2000)
    }, 800)
  }

  async function loadKommentare(historieId) {
    const { data } = await supabase
      .from('historie_kommentare')
      .select('*,profile(name,avatar_url)')
      .eq('historie_id', historieId)
      .order('erstellt_am', { ascending: true })
    setKommentare(prev => ({ ...prev, [historieId]: data || [] }))
  }

  async function addKommentar(historieId, kontaktFirma) {
    const text = kommentarText[historieId]?.trim()
    if (!text) return
    setKommentarSaving(true)

    // @mentions extrahieren
    const mentionMatches = text.match(/@([\w\s]+?)(?=[^\w\s]|$)/g) || []
    const mentions = mentionMatches.map(m => m.slice(1).trim()).filter(Boolean)

    const { data: newKommentar } = await supabase.from('historie_kommentare').insert({
      historie_id: historieId,
      autor_id: profile?.id,
      text,
      mentions
    }).select().single()

    // Mentions per Edge Function verarbeiten
    if (mentions.length > 0 && newKommentar) {
      const { data: { session } } = await supabase.auth.getSession()
      fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-mention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          kommentar_id: newKommentar.id,
          mentions,
          autor_name: profile?.name || profile?.email,
          kontakt_firma: kontaktFirma || kontakt?.firma,
          kommentar_text: text,
          kontakt_id: id
        })
      }).catch(e => console.warn('Mention notification failed:', e))
    }

    setKommentarText(prev => ({ ...prev, [historieId]: '' }))
    setKommentarSaving(false)
    loadKommentare(historieId)
  }

  async function deleteKommentar(kommentarId, historieId) {
    await supabase.from('historie_kommentare').delete().eq('id', kommentarId)
    loadKommentare(historieId)
  }

  function toggleHistorie(historieId) {
    setExpandedHistorie(prev => {
      const newState = { ...prev, [historieId]: !prev[historieId] }
      if (newState[historieId] && !kommentare[historieId]) {
        loadKommentare(historieId)
      }
      return newState
    })
  }

  async function saveHistorie() {
    setSaving(true)
    const payload = { ...hForm, kontakt_id: id, erstellt_von: profile?.id }
    if (hForm.id) await supabase.from('kontakthistorie').update(payload).eq('id', hForm.id)
    else await supabase.from('kontakthistorie').insert(payload)
    setHistorieModal(false); setSaving(false); load()
  }

  async function toggleErledigt(h) {
    await supabase.from('kontakthistorie').update({ erledigt: !h.erledigt }).eq('id', h.id); load()
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
    await supabase.from('ansprechpartner').update({ hauptansprechpartner: true }).eq('id', apid); load()
  }

  async function saveEvents() {
    setSaving(true)
    const existing = events.map(e=>e.veranstaltung_id)
    const toAdd = selectedEvents.filter(e=>!existing.includes(e))
    const toRemove = existing.filter(e=>!selectedEvents.includes(e))
    if (toAdd.length>0) await supabase.from('veranstaltung_teilnahme').insert(toAdd.map(vid=>({veranstaltung_id:vid,kontakt_id:id,teilgenommen:true})))
    if (toRemove.length>0) await supabase.from('veranstaltung_teilnahme').delete().eq('kontakt_id',id).in('veranstaltung_id',toRemove)
    setEventModal(false); setSaving(false); load()
  }

  const LINK_KATEGORIEN = [
    { key:'CI', label:'CI & Branding', icon:'🎨' },
    { key:'Vertrag', label:'Vertrag', icon:'📄' },
    { key:'Praesentation', label:'Präsentation', icon:'📊' },
    { key:'Foto', label:'Fotos & Medien', icon:'📷' },
    { key:'Website', label:'Website', icon:'🌐' },
    { key:'Sonstiges', label:'Sonstiges', icon:'🔗' },
  ]

  async function saveLink() {
    if (!linkForm.titel || !linkForm.url) return
    setSaving(true)
    let url = linkForm.url
    if (!url.startsWith('http')) url = 'https://' + url
    const payload = { kontakt_id: id, titel: linkForm.titel, url, kategorie: linkForm.kategorie, notiz: linkForm.notiz||null }
    if (linkForm.id) await supabase.from('kontakt_links').update(payload).eq('id', linkForm.id)
    else await supabase.from('kontakt_links').insert(payload)
    setLinkModal(false); setSaving(false); load()
  }

  async function deleteLink(lid) {
    if (!window.confirm('Link löschen?')) return
    await supabase.from('kontakt_links').delete().eq('id', lid); load()
  }

  async function saveLeistung() {
    setSaving(true)
    const sponsoringId = sponsoring?.id
    if (!sponsoringId) { alert('Bitte zuerst einen Vertrag im Sponsoring-Tab anlegen.'); setSaving(false); return }
    const payload = { ...lForm, kontakt_id: id, sponsoring_id: sponsoringId }
    await supabase.from('sponsoring_leistungen').insert(payload)
    setLeistungModal(false); setSaving(false); load()
  }

  async function deleteLeistungBuchung(lid) {
    if (!window.confirm('Buchung entfernen?')) return
    await supabase.from('sponsoring_leistungen').delete().eq('id', lid); load()
  }

  function toggleZustaendig(name) {
    setHForm(f => {
      const current = f.zustaendig_personen||[]
      const updated = current.includes(name)?current.filter(n=>n!==name):[...current,name]
      return {...f,zustaendig_personen:updated,zustaendig:updated.join(', ')}
    })
  }

  async function addNeuePerson() {
    const name = neuePersonInput.trim()
    if (!name) return
    await supabase.from('personen').upsert({name},{onConflict:'name'})
    setNeuePersonInput('')
    const {data} = await supabase.from('personen').select('*').eq('aktiv',true).order('name')
    setPersonen(data||[]); toggleZustaendig(name)
  }

  if (!kontakt) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <button className="back-btn" style={{margin:0}} onClick={()=>navigate('/kontakte')}>&#8592; Zurueck</button>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-sm btn-outline" onClick={()=>setKontaktEditModal(true)}>✎ Kontakt bearbeiten</button>
          <button className="btn btn-sm btn-gold" onClick={()=>{setHForm({...EMPTY_H,zustaendig_personen:profile?.name?[profile.name]:[],zustaendig:profile?.name||''});setHistorieModal(true)}}>+ Aktion</button>
        </div>
      </div>
      <div className="card">
        <div style={{display:'flex',alignItems:'center',gap:20,marginBottom:20}}>
          {kontakt.logo_url?<img src={kontakt.logo_url} alt="Logo" style={{width:72,height:72,objectFit:'contain',borderRadius:8,border:'1px solid var(--gray-200)'}}/>
            :<div style={{width:72,height:72,background:'var(--gray-100)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color:'var(--gray-400)'}}>{kontakt.firma?.[0]}</div>}
          <div>
            <div className="page-title" style={{marginBottom:6}}>{kontakt.firma}</div>
            <span className={'badge '+(BADGE_MAP[kontakt.status]||'')}>{kontakt.status}</span>
            <span style={{marginLeft:8,fontSize:13,color:'var(--gray-600)'}}>{kontakt.kategorie}</span>
            {kontakt.branche&&<span style={{marginLeft:8,fontSize:13,color:'var(--gray-400)'}}>· {kontakt.branche}</span>}
          </div>
        </div>

        <div className="tabs">
          {[['info','Kontaktdaten'],['ansprechpartner','Ansprechpartner ('+ansprechpartner.length+')'],['notizen','Notizen'],['historie','Historie ('+historie.length+')'],['events','Events ('+events.length+')'],['sponsoring','Sponsoring & Leistungen'],['links','Links & Dateien ('+links.length+')'],['statistiken','Statistiken']].map(([key,label])=>(
            <button key={key} className={'tab-btn'+(tab===key?' active':'')} onClick={()=>setTab(key)}>{label}</button>
          ))}
        </div>

        {tab==='info'&&(
          <div className="detail-grid">
            {[['Status',kontakt.status],['Kategorie',kontakt.kategorie],['E-Mail',kontakt.email],['Telefon',kontakt.telefon],['Zustaendig',kontakt.zustaendig]].map(([l,v])=>v?<div key={l} className="detail-field"><label>{l}</label><span>{v}</span></div>:null)}
            {kontakt.notiz&&<div className="detail-field" style={{gridColumn:'1/-1'}}><label>Notiz</label><span>{kontakt.notiz}</span></div>}
          </div>
        )}

        {tab==='notizen'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div className="section-title" style={{margin:0}}>Notizen</div>
              <span style={{fontSize:12,color:notizenSaved?'var(--green)':notizenSaving?'var(--gray-400)':'transparent'}}>{notizenSaving?'Speichern...':notizenSaved?'Gespeichert ✓':''}</span>
            </div>
            <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
              {[['bold','B'],['italic','I'],['underline','U']].map(([cmd,label])=>(
                <button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd)}} style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,background:'var(--white)',cursor:'pointer',fontWeight:cmd==='bold'?700:400,fontStyle:cmd==='italic'?'italic':'normal',textDecoration:cmd==='underline'?'underline':'none',fontSize:13}}>{label}</button>
              ))}
              <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertUnorderedList')}} style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,background:'var(--white)',cursor:'pointer',fontSize:13}}>Liste</button>
              <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertOrderedList')}} style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,background:'var(--white)',cursor:'pointer',fontSize:13}}>1. Liste</button>
              <button onMouseDown={e=>{e.preventDefault();document.execCommand('formatBlock',false,'h3')}} style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,background:'var(--white)',cursor:'pointer',fontSize:13}}>Ueberschrift</button>
            </div>
            <div contentEditable suppressContentEditableWarning onInput={e=>handleNotizenChange(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{__html:notizenText}} style={{minHeight:300,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:16,fontSize:14,lineHeight:1.7,outline:'none',background:'var(--white)'}}/>
            <p style={{fontSize:12,color:'var(--gray-400)',marginTop:8}}>Wird automatisch gespeichert.</p>
          </div>
        )}

        {tab==='ansprechpartner'&&(
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button className="btn btn-primary btn-sm" onClick={()=>{setApForm(EMPTY_AP);setApModal(true)}}>+ Ansprechpartner</button>
            </div>
            {ansprechpartner.length===0?<div className="empty-state"><p>Noch keine Ansprechpartner hinterlegt.</p></div>
              :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
                {ansprechpartner.map(ap=>(
                  <div key={ap.id} style={{border:'2px solid '+(ap.hauptansprechpartner?'var(--gold)':'var(--gray-200)'),borderRadius:'var(--radius)',padding:20,position:'relative'}}>
                    {ap.hauptansprechpartner&&<span style={{position:'absolute',top:12,right:12,fontSize:11,background:'var(--gold)',color:'var(--navy)',padding:'2px 8px',borderRadius:20,fontWeight:700}}>Hauptkontakt</span>}
                    <div style={{fontFamily:'"DM Serif Display",serif',fontSize:18,color:'var(--navy)',marginBottom:12}}>{ap.name}</div>
                    <div style={{display:'grid',gap:8}}>
                      {ap.position&&<div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Position</span>{ap.position}</div>}
                      {ap.email&&<div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>E-Mail</span><a href={'mailto:'+ap.email} style={{color:'var(--blue)'}}>{ap.email}</a></div>}
                      {ap.telefon&&<div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Telefon</span><a href={'tel:'+ap.telefon} style={{color:'var(--blue)'}}>{ap.telefon}</a></div>}
                      {ap.mobil&&<div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Mobil</span><a href={'tel:'+ap.mobil} style={{color:'var(--blue)'}}>{ap.mobil}</a></div>}
                    </div>
                    <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
                      {!ap.hauptansprechpartner&&<button className="btn btn-sm btn-outline" onClick={()=>setHauptAP(ap.id)}>Als Hauptkontakt</button>}
                      <button className="btn btn-sm btn-outline" onClick={()=>{setApForm(ap);setApModal(true)}}>Bearb.</button>
                      <button className="btn btn-sm btn-danger" onClick={()=>deleteAP(ap.id)}>X</button>
                    </div>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {tab==='historie'&&(
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button className="btn btn-primary btn-sm" onClick={()=>{setHForm({...EMPTY_H,zustaendig_personen:profile?.name?[profile.name]:[],zustaendig:profile?.name||''});setHistorieModal(true)}}>+ Neue Aktion</button>
            </div>
            {historie.length===0?<div className="empty-state"><p>Noch keine Eintraege.</p></div>
              :<div style={{display:'grid',gap:12}}>
                {historie.map(h=>{
                  const isExpanded = expandedHistorie[h.id]
                  const hKommentare = kommentare[h.id] || []
                  const isUeberfaellig = h.faellig_am && !h.erledigt && new Date(h.faellig_am) < new Date()
                  return (
                    <div key={h.id} style={{border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',overflow:'hidden',opacity:h.erledigt?0.7:1}}>
                      {/* Header */}
                      <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 16px',background:isExpanded?'rgba(15,34,64,0.02)':'var(--white)'}}>
                        <button onClick={()=>toggleErledigt(h)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,flexShrink:0,marginTop:2}}>{h.erledigt?'✅':'⬜'}</button>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                            <span style={{fontSize:12,background:'var(--gray-100)',padding:'2px 8px',borderRadius:20,flexShrink:0}}>{h.art}</span>
                            <strong style={{fontSize:14}}>{h.betreff}</strong>
                            {isUeberfaellig&&<span style={{fontSize:11,color:'var(--red)',fontWeight:700,flexShrink:0}}>ÜBERFÄLLIG</span>}
                          </div>
                          {h.notiz&&<p style={{fontSize:13,color:'var(--gray-600)',marginBottom:4}}>{h.notiz}</p>}
                          <div style={{display:'flex',gap:12,fontSize:12,color:'var(--gray-400)',flexWrap:'wrap'}}>
                            <span>{new Date(h.erstellt_am).toLocaleDateString('de-DE')}</span>
                            {h.naechste_aktion&&<span>→ {h.naechste_aktion}</span>}
                            {h.faellig_am&&<span style={{color:isUeberfaellig?'var(--red)':'inherit'}}>Fällig: {new Date(h.faellig_am).toLocaleDateString('de-DE')}</span>}
                            {((h.zustaendig_personen||[]).join(', ')||h.zustaendig)&&<span>👤 {(h.zustaendig_personen||[]).join(', ')||h.zustaendig}</span>}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6,flexShrink:0}}>
                          <button onClick={()=>toggleHistorie(h.id)} style={{background:'none',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:'4px 10px',cursor:'pointer',fontSize:12,color:'var(--gray-600)',display:'flex',alignItems:'center',gap:4}}>
                            💬 {hKommentare.length||''}
                            {isExpanded?' ▲':' ▼'}
                          </button>
                          <button className="btn btn-sm btn-outline" onClick={()=>{setHForm({...h,zustaendig_personen:h.zustaendig_personen||[]});setHistorieModal(true)}}>Bearb.</button>
                          <button className="btn btn-sm btn-danger" onClick={()=>deleteHistorie(h.id)}>X</button>
                        </div>
                      </div>

                      {/* Kommentare */}
                      {isExpanded&&(
                        <div style={{borderTop:'1px solid var(--gray-100)',background:'var(--gray-100)'}}>
                          {hKommentare.length>0&&(
                            <div style={{padding:'12px 16px',display:'grid',gap:10}}>
                              {hKommentare.map(k=>(
                                <div key={k.id} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                                  <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,overflow:'hidden',border:'2px solid var(--gray-200)'}}>
                                    {k.profile?.avatar_url
                                      ? <img src={k.profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                      : <div style={{width:'100%',height:'100%',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:13}}>{(k.profile?.name||'?')[0].toUpperCase()}</div>
                                    }
                                  </div>
                                  <div style={{flex:1,background:'var(--white)',borderRadius:'var(--radius)',padding:'8px 12px',border:'1px solid var(--gray-200)'}}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                                      <span style={{fontWeight:600,fontSize:13}}>{k.profile?.name||'Unbekannt'}</span>
                                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                                        <span style={{fontSize:11,color:'var(--gray-400)'}}>{new Date(k.erstellt_am).toLocaleDateString('de-DE')} {new Date(k.erstellt_am).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</span>
                                        {k.autor_id===profile?.id&&<button onClick={()=>deleteKommentar(k.id,h.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:14,padding:0}}>×</button>}
                                      </div>
                                    </div>
                                    <p style={{fontSize:13,margin:0,lineHeight:1.5}}>
                                      {k.text.split(/(@\w[\w\s]*?)(?=[^\w\s]|$)/g).map((part,i)=>
                                        part.startsWith('@')
                                          ? <span key={i} style={{background:'#ddeaff',color:'#1a4a8a',borderRadius:4,padding:'1px 4px',fontWeight:600}}>{part}</span>
                                          : part
                                      )}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Kommentar schreiben */}
                          <div style={{padding:'10px 16px',display:'flex',gap:10,alignItems:'flex-start'}}>
                            <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,overflow:'hidden',border:'2px solid var(--gray-200)'}}>
                              {profile?.avatar_url
                                ? <img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                : <div style={{width:'100%',height:'100%',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:13}}>{(profile?.name||'?')[0].toUpperCase()}</div>
                              }
                            </div>
                            <div style={{flex:1,display:'flex',gap:8}}>
                              <div style={{flex:1,position:'relative'}}>
                                <input
                                  value={kommentarText[h.id]||''}
                                  onChange={e=>{
                                    const val = e.target.value
                                    setKommentarText(prev=>({...prev,[h.id]:val}))
                                    // @ detection
                                    const atMatch = val.match(/@(\w*)$/)
                                    if (atMatch) {
                                      const query = atMatch[1].toLowerCase()
                                      const sugg = personen.filter(p=>p.name.toLowerCase().includes(query)).slice(0,4)
                                      setMentionSuggestions(prev=>({...prev,[h.id]:sugg}))
                                      setShowMentions(prev=>({...prev,[h.id]:true}))
                                    } else {
                                      setShowMentions(prev=>({...prev,[h.id]:false}))
                                    }
                                  }}
                                  onKeyDown={e=>{
                                    if(e.key==='Enter'&&!e.shiftKey&&!showMentions[h.id]){
                                      e.preventDefault()
                                      addKommentar(h.id, kontakt?.firma)
                                    }
                                    if(e.key==='Escape') setShowMentions(prev=>({...prev,[h.id]:false}))
                                  }}
                                  placeholder="Kommentar... @Name zum Erwähnen, Enter zum Senden"
                                  style={{width:'100%',padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13,background:'var(--white)',boxSizing:'border-box'}}
                                />
                                {showMentions[h.id]&&(mentionSuggestions[h.id]||[]).length>0&&(
                                  <div style={{position:'absolute',bottom:'100%',left:0,right:0,background:'var(--white)',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',boxShadow:'var(--shadow)',zIndex:10,marginBottom:4}}>
                                    {(mentionSuggestions[h.id]||[]).map(p=>(
                                      <div key={p.id} onClick={()=>{
                                        const val = kommentarText[h.id]||''
                                        const newVal = val.replace(/@\w*$/, '@'+p.name+' ')
                                        setKommentarText(prev=>({...prev,[h.id]:newVal}))
                                        setShowMentions(prev=>({...prev,[h.id]:false}))
                                      }} style={{padding:'8px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,fontSize:13}}
                                      onMouseEnter={e=>e.currentTarget.style.background='var(--gray-100)'}
                                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                        <div style={{width:24,height:24,borderRadius:'50%',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:11,fontWeight:700,flexShrink:0}}>{p.name[0]}</div>
                                        {p.name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button className="btn btn-sm btn-primary" onClick={()=>addKommentar(h.id,kontakt?.firma)} disabled={kommentarSaving||!kommentarText[h.id]?.trim()}>
                                Senden
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>}
          </div>
        )}

        {tab==='events'&&(
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button className="btn btn-primary btn-sm" onClick={()=>setEventModal(true)}>Events verwalten</button>
            </div>
            {events.length===0?<div className="empty-state"><p>Noch mit keinem Event verknuepft.</p></div>
              :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:16}}>
                {events.map(e=>(
                  <div key={e.id} style={{border:'1px solid var(--gray-200)',borderRadius:'var(--radius)',padding:16}}>
                    <div style={{fontWeight:600,marginBottom:4}}>{e.veranstaltungen?.name}</div>
                    <div style={{fontSize:13,color:'var(--gray-600)'}}>{e.veranstaltungen?.datum?new Date(e.veranstaltungen.datum).toLocaleDateString('de-DE'):'--'}{e.veranstaltungen?.ort?' · '+e.veranstaltungen.ort:''}</div>
                    {e.teilgenommen&&<span style={{fontSize:11,background:'#e2efda',color:'#2d6b3a',padding:'2px 8px',borderRadius:20,fontWeight:600,marginTop:8,display:'inline-block'}}>Teilgenommen</span>}
                  </div>
                ))}
              </div>}
          </div>
        )}

        {tab==='sponsoring'&&(
          <div>
            {/* Vertragsinfo */}
            {sponsoring?(
              <div style={{background:'var(--gray-100)',borderRadius:'var(--radius)',padding:16,marginBottom:20,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
                {[['Paket',sponsoring.sponsoring_pakete?.name||'Individuell'],['Status',sponsoring.status],['Jahresbetrag',sponsoring.jahresbetrag?Number(sponsoring.jahresbetrag).toLocaleString('de-DE')+' EUR':null],['Vertragsende',sponsoring.vertragsende?new Date(sponsoring.vertragsende).toLocaleDateString('de-DE'):null],['Unterzeichnet',sponsoring.vertrag_unterzeichnet?'Ja':'Nein']].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l}><div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--gray-400)',marginBottom:2}}>{l}</div><div style={{fontSize:14,fontWeight:500}}>{v}</div></div>
                ))}
                {sponsoring.drive_link&&<div><div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--gray-400)',marginBottom:2}}>Vertrag</div><a href={sponsoring.drive_link} target="_blank" rel="noreferrer" style={{color:'var(--blue)',fontSize:14}}>Oeffnen</a></div>}
              </div>
            ):(
              <div className="alert alert-info" style={{marginBottom:20}}>Noch kein Sponsoring-Vertrag hinterlegt. Bitte zuerst im Sponsoring-Bereich einen Vertrag anlegen.</div>
            )}

            {/* Gebuchte Leistungen */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div className="section-title" style={{margin:0}}>Gebuchte Leistungen ({gebuchteLeistungen.length})</div>
              {sponsoring&&<button className="btn btn-primary btn-sm" onClick={()=>{setLForm({leistung_id:'',saison_id:saisons.find(s=>s.aktiv)?.id||'',anzahl:1,preis_vereinbart:'',abrechnung:'saison',notiz:''});setLeistungModal(true)}}>+ Leistung buchen</button>}
            </div>

            {gebuchteLeistungen.length===0?<div className="empty-state"><p>Noch keine Leistungen gebucht.</p></div>
              :<div>
                {kategorien.map(kat=>{
                  const katGL = gebuchteLeistungen.filter(gl=>gl.leistungen_katalog?.leistungen_kategorien?.name===kat.name)
                  if(katGL.length===0) return null
                  return <div key={kat.id} style={{marginBottom:20}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:kat.farbe}}></div>
                      <strong style={{fontSize:14}}>{kat.name}</strong>
                    </div>
                    <div style={{display:'grid',gap:8}}>
                      {katGL.map(gl=>(
                        <div key={gl.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',background:'var(--white)'}}>
                          <div>
                            <div style={{fontWeight:600,fontSize:13}}>{gl.leistungen_katalog?.name}</div>
                            <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>{gl.saisons?.name||'--'} · {gl.anzahl>1?gl.anzahl+'x · ':''}{gl.abrechnung==='saison'?'pro Saison':'pro Vertrag'}{gl.preis_vereinbart?' · '+Number(gl.preis_vereinbart).toLocaleString('de-DE')+' EUR':''}</div>
                            {gl.notiz&&<div style={{fontSize:12,color:'var(--gray-600)',marginTop:2}}>{gl.notiz}</div>}
                          </div>
                          <button onClick={()=>deleteLeistungBuchung(gl.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:16,padding:'4px 8px'}}>X</button>
                        </div>
                      ))}
                    </div>
                  </div>
                })}
                {/* Leistungen ohne Kategorie */}
                {gebuchteLeistungen.filter(gl=>!gl.leistungen_katalog?.leistungen_kategorien).length>0&&(
                  <div style={{marginBottom:20}}>
                    <strong style={{fontSize:14,color:'var(--gray-400)'}}>Sonstige</strong>
                    {gebuchteLeistungen.filter(gl=>!gl.leistungen_katalog?.leistungen_kategorien).map(gl=>(
                      <div key={gl.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',background:'var(--white)',marginTop:8}}>
                        <div><div style={{fontWeight:600,fontSize:13}}>{gl.leistungen_katalog?.name}</div></div>
                        <button onClick={()=>deleteLeistungBuchung(gl.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:16}}>X</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            }
          </div>
        )}
      </div>

      {/* MODAL: AKTION */}
      {historieModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setHistorieModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">{hForm.id?'Aktion bearbeiten':'Neue Aktion'}</span><button className="close-btn" onClick={()=>setHistorieModal(false)}>x</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Art</label><select value={hForm.art} onChange={e=>setHForm(f=>({...f,art:e.target.value}))}>{ART_LIST.map(a=><option key={a}>{a}</option>)}</select></div>
                <div className="form-group"><label>Ansprechpartner</label>
                  <select value={hForm.ansprechpartner} onChange={e=>setHForm(f=>({...f,ansprechpartner:e.target.value}))}>
                    <option value="">Kein / Allgemein</option>
                    {ansprechpartner.map(ap=><option key={ap.id} value={ap.name}>{ap.name}{ap.position?' ('+ap.position+')':''}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Betreff / Thema</label><input value={hForm.betreff} onChange={e=>setHForm(f=>({...f,betreff:e.target.value}))}/></div>
              <div className="form-group"><label>Notiz / Ergebnis</label><textarea value={hForm.notiz} onChange={e=>setHForm(f=>({...f,notiz:e.target.value}))}/></div>
              <div className="form-row">
                <div className="form-group"><label>Naechste Aktion</label><input value={hForm.naechste_aktion} onChange={e=>setHForm(f=>({...f,naechste_aktion:e.target.value}))}/></div>
                <div className="form-group"><label>Faellig am</label><input type="date" value={hForm.faellig_am} onChange={e=>setHForm(f=>({...f,faellig_am:e.target.value}))}/></div>
              </div>
              <div className="form-group">
                <label>Zustaendig (Mehrfachauswahl)</label>
                <div style={{border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:10,marginBottom:8,display:'flex',flexWrap:'wrap',gap:8,minHeight:44}}>
                  {personen.length===0?<span style={{color:'var(--gray-400)',fontSize:13}}>Unten Person hinzufuegen</span>
                    :personen.map(p=>{const selected=(hForm.zustaendig_personen||[]).includes(p.name);return(
                      <button key={p.id} type="button" onClick={()=>toggleZustaendig(p.name)} style={{padding:'4px 12px',borderRadius:20,border:'1.5px solid',fontSize:13,cursor:'pointer',background:selected?'var(--navy)':'var(--white)',color:selected?'var(--white)':'var(--gray-600)',borderColor:selected?'var(--navy)':'var(--gray-200)'}}>{p.name}</button>
                    )})}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <input value={neuePersonInput} onChange={e=>setNeuePersonInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addNeuePerson()} placeholder="Person hinzufuegen..." style={{flex:1,padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
                  <button className="btn btn-sm btn-outline" onClick={addNeuePerson}>+ Hinzufuegen</button>
                </div>
              </div>
              <div className="form-group"><label>Erledigt</label><select value={hForm.erledigt?'Ja':'Nein'} onChange={e=>setHForm(f=>({...f,erledigt:e.target.value==='Ja'}))}><option>Nein</option><option>Ja</option></select></div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setHistorieModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveHistorie} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div>
          </div>
        </div>
      )}

      {/* MODAL: ANSPRECHPARTNER */}
      {apModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setApModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">{apForm.id?'Ansprechpartner bearbeiten':'Neuer Ansprechpartner'}</span><button className="close-btn" onClick={()=>setApModal(false)}>x</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input value={apForm.name} onChange={e=>setApForm(f=>({...f,name:e.target.value}))}/></div>
                <div className="form-group"><label>Position / Rolle</label><input value={apForm.position||''} onChange={e=>setApForm(f=>({...f,position:e.target.value}))} placeholder="z.B. Geschaeftsfuehrer"/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={apForm.email||''} onChange={e=>setApForm(f=>({...f,email:e.target.value}))}/></div>
                <div className="form-group"><label>Telefon (Buero)</label><input value={apForm.telefon||''} onChange={e=>setApForm(f=>({...f,telefon:e.target.value}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Mobil</label><input value={apForm.mobil||''} onChange={e=>setApForm(f=>({...f,mobil:e.target.value}))}/></div>
                <div className="form-group" style={{display:'flex',alignItems:'center',paddingTop:24}}><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}><input type="checkbox" checked={apForm.hauptansprechpartner||false} onChange={e=>setApForm(f=>({...f,hauptansprechpartner:e.target.checked}))}/>Hauptansprechpartner</label></div>
              </div>
              <div className="form-group"><label>Notiz</label><textarea value={apForm.notiz||''} onChange={e=>setApForm(f=>({...f,notiz:e.target.value}))}/></div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setApModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveAP} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div>
          </div>
        </div>
      )}

      {/* MODAL: EVENTS */}
      {eventModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEventModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">Events verwalten</span><button className="close-btn" onClick={()=>setEventModal(false)}>x</button></div>
            <div className="modal-body">
              <p style={{fontSize:14,color:'var(--gray-600)',marginBottom:16}}>Waehle alle Events bei denen {kontakt.firma} dabei war:</p>
              <div style={{display:'grid',gap:8}}>
                {alleEvents.length===0?<p style={{color:'var(--gray-400)'}}>Noch keine Events angelegt.</p>
                  :alleEvents.map(ev=>{const selected=selectedEvents.includes(ev.id);return(
                    <label key={ev.id} style={{display:'flex',alignItems:'center',gap:12,padding:12,border:'1.5px solid '+(selected?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:selected?'rgba(15,34,64,0.04)':'var(--white)'}}>
                      <input type="checkbox" checked={selected} onChange={e=>setSelectedEvents(prev=>e.target.checked?[...prev,ev.id]:prev.filter(x=>x!==ev.id))}/>
                      <div><div style={{fontWeight:600,fontSize:14}}>{ev.name}</div><div style={{fontSize:12,color:'var(--gray-400)'}}>{ev.datum?new Date(ev.datum).toLocaleDateString('de-DE'):'kein Datum'}{ev.ort?' · '+ev.ort:''}</div></div>
                    </label>
                  )})}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setEventModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveEvents} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div>
          </div>
        </div>
      )}

      {/* MODAL: LEISTUNG BUCHEN */}
      {leistungModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setLeistungModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">Leistung buchen</span><button className="close-btn" onClick={()=>setLeistungModal(false)}>x</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Leistung *</label>
                <select value={lForm.leistung_id} onChange={e=>{ const l=katalog.find(k=>k.id===e.target.value); setLForm(f=>({...f,leistung_id:e.target.value,preis_vereinbart:l?.preis||'',abrechnung:l?.abrechnung||'saison'})) }}>
                  <option value="">Bitte waehlen...</option>
                  {kategorien.map(kat=>{
                    const katL=katalog.filter(l=>l.kategorie_id===kat.id)
                    if(katL.length===0) return null
                    return <optgroup key={kat.id} label={kat.name}>{katL.map(l=><option key={l.id} value={l.id}>{l.name}{l.preis?' ('+Number(l.preis).toLocaleString('de-DE')+' EUR)':''}</option>)}</optgroup>
                  })}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Saison</label>
                  <select value={lForm.saison_id} onChange={e=>setLForm(f=>({...f,saison_id:e.target.value}))}>
                    <option value="">Keine</option>
                    {saisons.map(s=><option key={s.id} value={s.id}>{s.name}{s.aktiv?' (aktuell)':''}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Anzahl</label><input type="number" min="1" value={lForm.anzahl} onChange={e=>setLForm(f=>({...f,anzahl:parseInt(e.target.value)||1}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Vereinbarter Preis (EUR)</label><input type="number" value={lForm.preis_vereinbart||''} onChange={e=>setLForm(f=>({...f,preis_vereinbart:e.target.value}))}/></div>
                <div className="form-group"><label>Abrechnung</label>
                  <select value={lForm.abrechnung} onChange={e=>setLForm(f=>({...f,abrechnung:e.target.value}))}>
                    <option value="saison">Pro Saison</option>
                    <option value="vertrag">Pro Vertrag</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Notiz</label><textarea value={lForm.notiz||''} onChange={e=>setLForm(f=>({...f,notiz:e.target.value}))}/></div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setLeistungModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveLeistung} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div>
          </div>
        </div>
      )}

      {tab==='links'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
            <button className="btn btn-primary btn-sm" onClick={()=>{setLinkForm({titel:'',url:'',kategorie:'CI',notiz:''});setLinkModal(true)}}>+ Link hinzufügen</button>
          </div>

          {links.length === 0
            ? <div className="empty-state card"><p>Noch keine Links hinterlegt. Füge Links zu CI-Dateien, Verträgen, Präsentationen etc. hinzu.</p></div>
            : <div>
                {['CI','Vertrag','Praesentation','Foto','Website','Sonstiges'].map(kat => {
                  const katLinks = links.filter(l => l.kategorie === kat)
                  if (katLinks.length === 0) return null
                  const katInfo = [{key:'CI',label:'CI & Branding',icon:'🎨'},{key:'Vertrag',label:'Vertrag',icon:'📄'},{key:'Praesentation',label:'Präsentation',icon:'📊'},{key:'Foto',label:'Fotos & Medien',icon:'📷'},{key:'Website',label:'Website',icon:'🌐'},{key:'Sonstiges',label:'Sonstiges',icon:'🔗'}].find(k=>k.key===kat)
                  return (
                    <div key={kat} className="card" style={{marginBottom:12}}>
                      <div style={{fontSize:14,fontWeight:600,marginBottom:12,color:'var(--gray-600)'}}>{katInfo?.icon} {katInfo?.label}</div>
                      <div style={{display:'grid',gap:8}}>
                        {katLinks.map(l => (
                          <div key={l.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',background:'var(--white)'}}>
                            <a href={l.url} target="_blank" rel="noreferrer" style={{flex:1,minWidth:0,textDecoration:'none'}}
                              onClick={e=>e.stopPropagation()}>
                              <div style={{fontWeight:600,fontSize:14,color:'var(--navy)',marginBottom:2}}>{l.titel}</div>
                              <div style={{fontSize:12,color:'var(--blue)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.url}</div>
                              {l.notiz&&<div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>{l.notiz}</div>}
                            </a>
                            <div style={{display:'flex',gap:6,flexShrink:0}}>
                              <a href={l.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" onClick={e=>e.stopPropagation()}>Öffnen</a>
                              <button className="btn btn-sm btn-outline" onClick={()=>{setLinkForm(l);setLinkModal(true)}}>Bearb.</button>
                              <button className="btn btn-sm btn-danger" onClick={()=>deleteLink(l.id)}>X</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}

      {tab==='statistiken'&&(
        <div>
          {/* Beziehungsdauer */}
          {(() => {
            const ersterKontakt = historie.length > 0 ? new Date(Math.min(...historie.map(h=>new Date(h.erstellt_am)))) : null
            const ersterVertrag = sponsoring ? new Date(sponsoring.vertragsbeginn || sponsoring.erstellt_am) : null
            const heute = new Date()
            const beziehungTage = ersterKontakt ? Math.floor((heute-ersterKontakt)/(1000*60*60*24)) : null
            const beziehungJahre = beziehungTage ? (beziehungTage/365).toFixed(1) : null
            const aktivSeit = ersterVertrag ? Math.floor((heute-ersterVertrag)/(1000*60*60*24)) : null
            const aktivJahre = aktivSeit ? (aktivSeit/365).toFixed(1) : null
            const gesamtGeld = sponsoring?.jahresbetrag ? Number(sponsoring.jahresbetrag) : 0
            const gesamtWert = sponsoring?.gesamtwert ? Number(sponsoring.gesamtwert) : 0
            const eventCount = events.length
            const erschienen = events.filter(e=>e.teilgenommen).length

            return (
              <div>
                <div className="stats-row" style={{marginBottom:20}}>
                  <div className="stat-card blue">
                    <div className="stat-num">{beziehungJahre||'--'}</div>
                    <div className="stat-label">Jahre in Kontakt{ersterKontakt?' · seit '+ersterKontakt.toLocaleDateString('de-DE'):''}</div>
                  </div>
                  <div className="stat-card green">
                    <div className="stat-num">{aktivJahre||'--'}</div>
                    <div className="stat-label">Jahre aktiver Sponsor{ersterVertrag?' · seit '+ersterVertrag.toLocaleDateString('de-DE'):''}</div>
                  </div>
                  <div className="stat-card gold">
                    <div className="stat-num" style={{fontSize:20}}>{gesamtGeld.toLocaleString('de-DE')} EUR</div>
                    <div className="stat-label">Aktueller Jahresbetrag</div>
                  </div>
                  <div className="stat-card orange">
                    <div className="stat-num">{eventCount}</div>
                    <div className="stat-label">Events{erschienen>0?' · '+erschienen+' erschienen':''}</div>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div className="card">
                    <div className="section-title" style={{marginBottom:16}}>Kontakt-Aktivität</div>
                    {[
                      ['Erster Kontakt', ersterKontakt?ersterKontakt.toLocaleDateString('de-DE'):'--'],
                      ['Kontakteinträge gesamt', historie.length],
                      ['Davon erledigt', historie.filter(h=>h.erledigt).length],
                      ['Davon offen', historie.filter(h=>!h.erledigt).length],
                      ['Ansprechpartner', ansprechpartner.length],
                    ].map(([label,value])=>(
                      <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                        <span style={{fontSize:13,color:'var(--gray-600)'}}>{label}</span>
                        <span style={{fontSize:13,fontWeight:600}}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <div className="section-title" style={{marginBottom:16}}>Sponsoring-Übersicht</div>
                    {sponsoring ? [
                      ['Status', sponsoring.status],
                      ['Paket', sponsoring.sponsoring_pakete?.name||'Individuell'],
                      ['Jahresbetrag', sponsoring.jahresbetrag?Number(sponsoring.jahresbetrag).toLocaleString('de-DE')+' EUR':'--'],
                      ['Gesamtwert', sponsoring.gesamtwert?Number(sponsoring.gesamtwert).toLocaleString('de-DE')+' EUR':'--'],
                      ['Vertragsbeginn', sponsoring.vertragsbeginn?new Date(sponsoring.vertragsbeginn).toLocaleDateString('de-DE'):'--'],
                      ['Vertragsende', sponsoring.vertragsende?new Date(sponsoring.vertragsende).toLocaleDateString('de-DE'):'--'],
                      ['Unterzeichnet', sponsoring.vertrag_unterzeichnet?'Ja':'Nein'],
                      ['Gebuchte Leistungen', gebuchteLeistungen.length],
                    ].map(([label,value])=>(
                      <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                        <span style={{fontSize:13,color:'var(--gray-600)'}}>{label}</span>
                        <span style={{fontSize:13,fontWeight:600}}>{value}</span>
                      </div>
                    )) : <p style={{fontSize:13,color:'var(--gray-400)'}}>Noch kein Sponsoring-Vertrag.</p>}
                  </div>
                </div>

                {/* Event-Teilnahme */}
                {events.length > 0 && (
                  <div className="card" style={{marginTop:16}}>
                    <div className="section-title" style={{marginBottom:16}}>Event-Teilnahme</div>
                    <div style={{display:'grid',gap:8}}>
                      {events.map(e=>(
                        <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 14px',background:'var(--gray-100)',borderRadius:'var(--radius)'}}>
                          <div>
                            <div style={{fontWeight:600,fontSize:13}}>{e.veranstaltungen?.name}</div>
                            <div style={{fontSize:12,color:'var(--gray-400)'}}>{e.veranstaltungen?.datum?new Date(e.veranstaltungen.datum).toLocaleDateString('de-DE'):'--'}</div>
                          </div>
                          <span style={{fontSize:12,fontWeight:600,padding:'2px 10px',borderRadius:20,background:e.status==='Erschienen'?'#e2efda':e.status==='Zugesagt'?'#ddeaff':e.status==='Abgesagt'?'#fce4d6':'#ececec',color:e.status==='Erschienen'?'#2d6b3a':e.status==='Zugesagt'?'#1a4a8a':e.status==='Abgesagt'?'#8a3a1a':'#555'}}>
                            {e.status||'Eingeladen'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* MODAL: LINK */}
      {linkModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setLinkModal(false)}>
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header">
              <span className="modal-title">{linkForm.id?'Link bearbeiten':'Neuer Link'}</span>
              <button className="close-btn" onClick={()=>setLinkModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Kategorie</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[{key:'CI',icon:'🎨'},{key:'Vertrag',icon:'📄'},{key:'Praesentation',icon:'📊'},{key:'Foto',icon:'📷'},{key:'Website',icon:'🌐'},{key:'Sonstiges',icon:'🔗'}].map(k=>(
                    <button key={k.key} type="button" onClick={()=>setLinkForm(f=>({...f,kategorie:k.key}))}
                      style={{padding:'6px 14px',borderRadius:20,border:'1.5px solid',fontSize:13,cursor:'pointer',
                        background:linkForm.kategorie===k.key?'var(--navy)':'var(--white)',
                        color:linkForm.kategorie===k.key?'white':'var(--gray-600)',
                        borderColor:linkForm.kategorie===k.key?'var(--navy)':'var(--gray-200)'}}>
                      {k.icon} {k.key}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group"><label>Titel *</label><input value={linkForm.titel||''} onChange={e=>setLinkForm(f=>({...f,titel:e.target.value}))} placeholder="z.B. CI-Handbuch, Logopaket"/></div>
              <div className="form-group"><label>URL *</label><input type="url" value={linkForm.url||''} onChange={e=>setLinkForm(f=>({...f,url:e.target.value}))} placeholder="https://drive.google.com/..."/></div>
              <div className="form-group"><label>Notiz (optional)</label><input value={linkForm.notiz||''} onChange={e=>setLinkForm(f=>({...f,notiz:e.target.value}))} placeholder="z.B. Zugriff für alle, zuletzt aktualisiert 2024"/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setLinkModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveLink} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONTAKT BEARBEITEN */}
      {kontaktEditModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setKontaktEditModal(false)}>
          <div className="modal" style={{maxWidth:600}}>
            <div className="modal-header">
              <span className="modal-title">Kontakt bearbeiten</span>
              <button className="close-btn" onClick={()=>setKontaktEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Firma *</label><input value={kForm.firma||''} onChange={e=>setKForm(f=>({...f,firma:e.target.value}))}/></div>
                <div className="form-group"><label>Status</label>
                  <select value={kForm.status||'Offen'} onChange={e=>setKForm(f=>({...f,status:e.target.value}))}>
                    {statusListe.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Kategorie</label>
                  <select value={kForm.kategorie||'Sponsor'} onChange={e=>setKForm(f=>({...f,kategorie:e.target.value}))}>
                    {kategorienListe.map(k=><option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Branche</label><input value={kForm.branche||''} onChange={e=>setKForm(f=>({...f,branche:e.target.value}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={kForm.email||''} onChange={e=>setKForm(f=>({...f,email:e.target.value}))}/></div>
                <div className="form-group"><label>Telefon</label><input value={kForm.telefon||''} onChange={e=>setKForm(f=>({...f,telefon:e.target.value}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Website</label><input type="url" value={kForm.website||''} onChange={e=>setKForm(f=>({...f,website:e.target.value}))}/></div>
                <div className="form-group"><label>Zustaendig</label><input value={kForm.zustaendig||''} onChange={e=>setKForm(f=>({...f,zustaendig:e.target.value}))}/></div>
              </div>
              <div style={{background:'var(--gray-100)',borderRadius:'var(--radius)',padding:14,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--gray-600)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:10}}>Adresse</div>
                <div className="form-group"><label>Strasse</label><input value={kForm.adresse_strasse||''} onChange={e=>setKForm(f=>({...f,adresse_strasse:e.target.value}))}/></div>
                <div className="form-row">
                  <div className="form-group"><label>PLZ</label><input value={kForm.adresse_plz||''} onChange={e=>setKForm(f=>({...f,adresse_plz:e.target.value}))}/></div>
                  <div className="form-group"><label>Stadt</label><input value={kForm.adresse_stadt||''} onChange={e=>setKForm(f=>({...f,adresse_stadt:e.target.value}))}/></div>
                </div>
              </div>
              <div className="form-group"><label>Notiz</label><textarea value={kForm.notiz||''} onChange={e=>setKForm(f=>({...f,notiz:e.target.value}))}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setKontaktEditModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveKontakt} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
