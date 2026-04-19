import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TEILNAHME_STATUS = ['Eingeladen','Zugesagt','Abgesagt','Offen','Erschienen','Nicht erschienen']
const STATUS_COLORS = {
  'Eingeladen':{ bg:'#ddeaff', color:'#1a4a8a' },
  'Zugesagt':{ bg:'#e2efda', color:'#2d6b3a' },
  'Abgesagt':{ bg:'#fce4d6', color:'#8a3a1a' },
  'Offen':{ bg:'#fff3cd', color:'#8a6a00' },
  'Erschienen':{ bg:'#c6efce', color:'#1a5a2a' },
  'Nicht erschienen':{ bg:'#ececec', color:'#555' },
}
const EVENT_TYPEN = ['Networking-Event','Heimspiel','Sponsoren-Abend','Sponsoren-Meeting','Kontor 8','Turnier','Training','Pressekonferenz','Praesentation','Sonstiges']
const EVENT_STATUS = ['Planung','Bestaetigt','Laufend','Abgeschlossen','Abgesagt']
const TODO_STATUS = ['Offen','In Bearbeitung','Erledigt']
const TODO_PRIO = ['Niedrig','Normal','Hoch','Dringend']
const KOSTEN_KAT = ['Location','Catering','Technik','Marketing','Personal','Transport','Druck','Sonstiges']
const DATEI_TYPEN = ['Google Drive','Dropbox','Praesentation','Dokument','Bild','Extern','Sonstiges']
const DL_TYPEN = ['Catering','Location','Technik','Marketing','Druck','Personal','Transport','Reinigung','Security','Fotografie','Sonstiges']

function fmt(d) { return d ? new Date(d).toLocaleDateString('de-DE') : '-' }
function fmtLang(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'long', year:'numeric' })
}
function prioColor(p) { return { 'Niedrig':'#9a9590','Normal':'#2d6fa3','Hoch':'#e07b30','Dringend':'#d94f4f' }[p] || '#555' }
function todoColor(s) { return { 'Offen':{ bg:'#ddeaff',color:'#1a4a8a' },'In Bearbeitung':{ bg:'#fff3cd',color:'#8a6a00' },'Erledigt':{ bg:'#e2efda',color:'#2d6b3a' } }[s] || { bg:'#ececec',color:'#555' } }
function evColor(s) { return { 'Planung':{ bg:'#ddeaff',color:'#1a4a8a' },'Bestaetigt':{ bg:'#e2efda',color:'#2d6b3a' },'Laufend':{ bg:'#fff3cd',color:'#8a6a00' },'Abgeschlossen':{ bg:'#ececec',color:'#555' },'Abgesagt':{ bg:'#fce4d6',color:'#8a3a1a' } }[s] || { bg:'#ececec',color:'#555' } }

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

function AlleBuchungenTab({ inventar }) {
  const [buchungen, setBuchungen] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('alle')

  useEffect(() => {
    supabase.from('inventar_buchungen')
      .select('*,inventar(name,einheit,typ)')
      .order('datum_von', { ascending: false })
      .then(({ data }) => { setBuchungen(data||[]); setLoading(false) })
  }, [])

  const filtered = buchungen.filter(b => {
    if (filter === 'ausstehend') return !b.zurueckgegeben
    if (filter === 'zurueck') return b.zurueckgegeben
    return true
  })

  const geliehen = buchungen.filter(b => !b.zurueckgegeben && b.inventar?.typ === 'Geliehen')

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div>
      {geliehen.length > 0 && (
        <div className="card" style={{marginBottom:16,background:'#fff8f0',border:'1.5px solid #f5c97a'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <span style={{fontSize:16}}>⚠️</span>
            <strong style={{fontSize:14,color:'#8a6a00'}}>Geliehenes Equipment noch nicht zurückgegeben ({geliehen.length})</strong>
          </div>
          <div style={{display:'grid',gap:6}}>
            {geliehen.map(b=>(
              <div key={b.id} style={{fontSize:13,color:'#8a6a00'}}>
                <strong>{b.inventar?.name}</strong> — {b.event_name} ({b.menge} {b.inventar?.einheit})
                {b.datum_bis&&<span style={{marginLeft:8,fontSize:11}}>bis {new Date(b.datum_bis).toLocaleDateString('de-DE')}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[['alle','Alle'],['ausstehend','Ausstehend'],['zurueck','Zurückgegeben']].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)}
            style={{padding:'6px 14px',borderRadius:'var(--radius)',border:'1.5px solid',fontSize:13,fontWeight:600,cursor:'pointer',
              background:filter===k?'var(--navy)':'var(--white)',
              borderColor:filter===k?'var(--navy)':'var(--gray-200)',
              color:filter===k?'white':'var(--gray-600)'}}>
            {l}
          </button>
        ))}
      </div>
      {filtered.length===0 ? <div className="empty-state card"><p>Keine Buchungen gefunden.</p></div> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Equipment</th><th>Typ</th><th>Event</th><th>Menge</th><th>Zeitraum</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map(b=>(
                  <tr key={b.id}>
                    <td><strong style={{fontSize:13}}>{b.inventar?.name||'–'}</strong></td>
                    <td><span style={{fontSize:11,padding:'1px 8px',borderRadius:10,fontWeight:600,background:b.inventar?.typ==='Geliehen'?'#fff3cd':'#e2efda',color:b.inventar?.typ==='Geliehen'?'#8a6a00':'#2d6b3a'}}>{b.inventar?.typ||'–'}</span></td>
                    <td style={{fontSize:13}}>{b.event_name||'–'}</td>
                    <td style={{fontWeight:600}}>{b.menge} {b.inventar?.einheit}</td>
                    <td style={{fontSize:12,color:'var(--gray-500)'}}>
                      {b.datum_von&&new Date(b.datum_von).toLocaleDateString('de-DE')}
                      {b.datum_bis&&b.datum_bis!==b.datum_von&&<span> – {new Date(b.datum_bis).toLocaleDateString('de-DE')}</span>}
                    </td>
                    <td><span style={{fontSize:11,padding:'1px 8px',borderRadius:10,fontWeight:600,background:b.zurueckgegeben?'#e2efda':'#fff3cd',color:b.zurueckgegeben?'#2d6b3a':'#8a6a00'}}>{b.zurueckgegeben?'Zurückgegeben':'Ausstehend'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function PreisVergleichArtikel({ artikel }) {
  const [preise, setPreise] = useState([])
  useEffect(() => {
    supabase.from('dienstleister_artikel')
      .select('*,dienstleister(id,firma,typ)')
      .eq('artikel_id', artikel.id)
      .eq('aktiv', true)
      .order('aktueller_preis')
      .then(({ data }) => setPreise(data||[]))
  }, [artikel.id])

  const mitPreis = preise.filter(p=>p.aktueller_preis)
  const guenstigster = mitPreis.length>0 ? mitPreis.reduce((a,b)=>a.aktueller_preis<b.aktueller_preis?a:b) : null

  return (
    <div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <div style={{fontWeight:700,fontSize:15,color:'var(--navy)'}}>{artikel.name}</div>
          <div style={{fontSize:12,color:'var(--gray-400)'}}>{artikel.einheit}{artikel.kategorie?' · '+artikel.kategorie:''}</div>
        </div>
        <span style={{fontSize:12,color:'var(--gray-500)'}}>{preise.length} Dienstleister</span>
      </div>
      {preise.length===0 ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Noch kein Dienstleister hat diesen Artikel zugeordnet.</p> : (
        <div style={{display:'grid',gap:6}}>
          {preise.map((p,i)=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderRadius:'var(--radius)',background:p.id===guenstigster?.id?'#e2efda':'var(--gray-100)'}}>
              <div style={{flex:1,fontSize:13,fontWeight:500}}>{p.dienstleister?.firma}</div>
              <div style={{fontSize:12,color:'var(--gray-500)'}}>{p.dienstleister?.typ}</div>
              {p.aktueller_preis ? (
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <strong style={{fontSize:14,color:p.id===guenstigster?.id?'#2d6b3a':'var(--navy)'}}>{Number(p.aktueller_preis).toLocaleString('de-DE')} EUR/{artikel.einheit}</strong>
                  {p.id===guenstigster?.id&&<span style={{fontSize:10,background:'#2d6b3a',color:'white',padding:'1px 8px',borderRadius:10,fontWeight:700}}>Guenstigster</span>}
                </div>
              ) : <span style={{fontSize:12,color:'var(--gray-400)'}}>Kein Preis</span>}
              {p.notiz&&<span style={{fontSize:11,color:'var(--gray-400)',fontStyle:'italic'}}>{p.notiz}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DLPreisEditor({ dlId, artikel, onSave }) {
  const [preis, setPreis] = useState('')
  const [kommentar, setKommentar] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('dienstleister_preise').select('*').eq('dienstleister_id', dlId).eq('artikel_id', artikel.id).single()
      .then(({ data }) => {
        if (data) { setPreis(data.preis||''); setKommentar(data.kommentar||'') }
        setLoaded(true)
      })
  }, [dlId, artikel.id])

  async function save() {
    setSaving(true)
    await onSave(dlId, artikel.id, preis, kommentar)
    setSaving(false)
  }

  if (!loaded) return <div style={{fontSize:12,color:'var(--gray-400)'}}>...</div>

  return (
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <input type="number" value={preis} onChange={e=>setPreis(e.target.value)} placeholder="Preis"
          style={{width:90,padding:'6px 10px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
        <span style={{fontSize:12,color:'var(--gray-400)'}}>EUR/{artikel.einheit}</span>
      </div>
      <input value={kommentar} onChange={e=>setKommentar(e.target.value)} placeholder="Kommentar"
        style={{flex:1,padding:'6px 10px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
      <button onClick={save} disabled={saving} className="btn btn-sm btn-outline"
        style={{flexShrink:0,color:'var(--green)',borderColor:'var(--green)'}}>
        {saving?'...':'Speichern'}
      </button>
    </div>
  )
}

const RAENGE = ['Helfer','Teamleiter','Schichtleiter','Koordinator','Verantwortlicher']
const EF_STATUS = ['Angefragt','Zugesagt','Abgesagt','Erschienen','Nicht erschienen']
const EF_STATUS_COLORS = {
  'Angefragt':{ bg:'#fff3cd',color:'#8a6a00' },
  'Zugesagt':{ bg:'#e2efda',color:'#2d6b3a' },
  'Abgesagt':{ bg:'#fce4d6',color:'#8a3a1a' },
  'Erschienen':{ bg:'#c6efce',color:'#1a5a2a' },
  'Nicht erschienen':{ bg:'#ececec',color:'#555' },
}

function PositionenTab({ ev, positionen=[], eventFreiwillige=[], freiwillige=[], faehigkeiten=[], onNewPosition, onEditPosition, onDeletePosition, onOpenPosition, onUpdateFreiwilligerStatus, onRemoveFreiwilliger }) {
  const gesamtBenoetigt = (positionen||[]).reduce((s,p)=>s+(p.anzahl_benoetigt||1),0)
  const gesamtZugeordnet = (eventFreiwillige||[]).filter(ef=>ef.status!=='Abgesagt').length

  return (
    <div>
      <div className="toolbar">
        <div style={{display:'flex',gap:16,fontSize:13,color:'var(--gray-500)'}}>
          <span>Positionen: <strong style={{color:'var(--navy)'}}>{positionen.length}</strong></span>
          <span>Plätze: <strong style={{color:gesamtZugeordnet>=gesamtBenoetigt?'var(--green)':'var(--red)'}}>{gesamtZugeordnet}/{gesamtBenoetigt}</strong></span>
        </div>
        <button className="btn btn-primary" onClick={onNewPosition}>+ Position</button>
      </div>

      {positionen.length===0 ? (
        <div className="empty-state card"><p>Noch keine Positionen angelegt. Füge Positionen hinzu die besetzt werden müssen.</p></div>
      ) : (
        <div style={{display:'grid',gap:12}}>
          {positionen.map(pos=>{
            const zugeordnet = eventFreiwillige.filter(ef=>ef.position_id===pos.id)
            const aktive = zugeordnet.filter(ef=>ef.status!=='Abgesagt')
            const offen = (pos.anzahl_benoetigt||1) - aktive.length
            const fk = faehigkeiten.find(f=>f.id===pos.faehigkeit_id)
            return (
              <div key={pos.id} style={{border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',overflow:'hidden'}}>
                <div style={{padding:'12px 16px',background:offen>0?'#fff8f0':'#f0f9f4',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <strong style={{fontSize:15,color:'var(--navy)'}}>{pos.titel}</strong>
                      <span style={{fontSize:11,background:offen>0?'#fce4d6':'#e2efda',color:offen>0?'#8a3a1a':'#2d6b3a',padding:'1px 8px',borderRadius:10,fontWeight:700}}>
                        {aktive.length}/{pos.anzahl_benoetigt||1} besetzt
                      </span>
                      <span style={{fontSize:11,background:'#ddeaff',color:'#1a4a8a',padding:'1px 8px',borderRadius:10,fontWeight:600}}>{pos.rang||'Helfer'}</span>
                      {fk&&<span style={{fontSize:11,background:'var(--gray-100)',color:'var(--gray-600)',padding:'1px 8px',borderRadius:10}}>{fk.name}</span>}
                      {pos.positionsart&&<span style={{fontSize:11,background:'#f0e8ff',color:'#6b21a8',padding:'1px 8px',borderRadius:10}}>{pos.positionsart}</span>}
                    </div>
                    {pos.beschreibung&&<div style={{fontSize:12,color:'var(--gray-500)',marginTop:3}}>{pos.beschreibung}</div>}
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-primary btn-sm" onClick={()=>onOpenPosition(pos)}>+ Zuordnen</button>
                    <button className="btn btn-sm btn-outline" onClick={()=>onEditPosition(pos)}>Bearb.</button>
                    <button className="btn btn-sm btn-danger" onClick={()=>onDeletePosition(pos.id)}>X</button>
                  </div>
                </div>
                {zugeordnet.length>0&&(
                  <div style={{padding:'8px 16px',display:'grid',gap:6}}>
                    {zugeordnet.sort((a,b)=>{
                      const r=['Verantwortlicher','Koordinator','Schichtleiter','Teamleiter','Helfer']
                      return r.indexOf(a.rang)-r.indexOf(b.rang)
                    }).map(ef=>{
                      const fw=freiwillige.find(f=>f.id===ef.freiwilliger_id)
                      const sc=EF_STATUS_COLORS[ef.status]||{bg:'#ececec',color:'#555'}
                      return (
                        <div key={ef.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'var(--white)',borderRadius:'var(--radius)',border:'1px solid var(--gray-100)'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:28,height:28,borderRadius:'50%',background:'var(--navy)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>
                              {(fw?.vorname?.[0]||'?')+(fw?.nachname?.[0]||'')}
                            </div>
                            <div>
                              <div style={{fontSize:13,fontWeight:600}}>{fw?fw.vorname+' '+fw.nachname:ef.freiwilliger_id}</div>
                              <div style={{fontSize:11,color:'var(--gray-400)'}}>{ef.rang}</div>
                            </div>
                          </div>
                          <div style={{display:'flex',gap:8,alignItems:'center'}}>
                            <select value={ef.status} onChange={e=>onUpdateFreiwilligerStatus(ef.id,e.target.value)}
                              style={{fontSize:11,padding:'3px 8px',border:'1.5px solid var(--gray-200)',borderRadius:20,background:sc.bg,color:sc.color,fontWeight:600,cursor:'pointer'}}>
                              {EF_STATUS.map(s=><option key={s}>{s}</option>)}
                            </select>
                            <button onClick={()=>onRemoveFreiwilliger(ef.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:16,lineHeight:1}}>×</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EventDetail({ ev, teilnahmen=[], todos=[], ablauf=[], dateien=[], kosten=[], dienstleister=[], kostenKategorien=[], personen=[], kontakte=[], positionen=[], eventFreiwillige=[], freiwillige=[], faehigkeiten=[], raenge=[], posKategorien=[], inventar=[], inventarBuchungen: initBuchungen=[], onNewInventarBuchung, onVorlageAnwenden, onDeleteBuchung, loadPositionen, onEdit, onDelete, onReload, loadDetails }) {
  const [tab, setTab] = useState('teilnehmer')
  const [inventarBuchungen, setInventarBuchungen] = useState(initBuchungen)

  useEffect(() => { setInventarBuchungen(initBuchungen) }, [initBuchungen])

  async function toggleZurueck(id, val) {
    await supabase.from('inventar_buchungen').update({ zurueckgegeben: val }).eq('id', id)
    setInventarBuchungen(prev => prev.map(b => b.id === id ? { ...b, zurueckgegeben: val } : b))
  }

  async function deleteBuchung(id) {
    if (!window.confirm('Buchung entfernen?')) return
    await supabase.from('inventar_buchungen').delete().eq('id', id)
    setInventarBuchungen(prev => prev.filter(b => b.id !== id))
  }
  const [positionModal, setPositionModal] = useState(false)
  const [positionForm, setPositionForm] = useState({})
  const [freiwilligerModal, setFreiwilligerModal] = useState(false)
  const [freiwilligerForm, setFreiwilligerForm] = useState({})
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [savingPos, setSavingPos] = useState(false)

  async function savePosition() {
    if (!positionForm.titel?.trim()) { alert('Bitte einen Titel eingeben.'); return }
    setSavingPos(true)
    const p = { event_id:ev.id, titel:positionForm.titel, beschreibung:positionForm.beschreibung||null, anzahl_benoetigt:parseInt(positionForm.anzahl_benoetigt)||1, faehigkeit_id:positionForm.faehigkeit_id||null, rang:positionForm.rang||'Helfer', positionsart:positionForm.positionsart||null, reihenfolge:parseInt(positionForm.reihenfolge)||positionen.length }
    let error
    if (positionForm.id) { const r = await supabase.from('event_positionen').update(p).eq('id', positionForm.id); error = r.error }
    else { const r = await supabase.from('event_positionen').insert(p); error = r.error }
    setSavingPos(false)
    if (error) { alert('Fehler: ' + error.message); return }
    setPositionModal(false)
    if (loadPositionen) loadPositionen(ev.id)
  }

  async function saveFreiwilliger() {
    if (!freiwilligerForm.freiwilliger_id || !selectedPosition) return
    setSavingPos(true)
    const p = { event_id:ev.id, position_id:selectedPosition.id, freiwilliger_id:freiwilligerForm.freiwilliger_id, rang:freiwilligerForm.rang||'Helfer', status:freiwilligerForm.status||'Angefragt', notiz:freiwilligerForm.notiz||null }
    const { error } = await supabase.from('event_freiwillige').upsert(p, { onConflict:'event_id,position_id,freiwilliger_id' })
    setSavingPos(false)
    if (error) { alert('Fehler: ' + error.message); return }
    setFreiwilligerModal(false)
    if (loadPositionen) loadPositionen(ev.id)
  }
  const [statusFilter, setStatusFilter] = useState('')
  const [saving, setSaving] = useState(false)

  const [tModal, setTModal] = useState(false)
  const [tForm, setTForm] = useState({})
  const [apList, setApList] = useState([])

  const [todoModal, setTodoModal] = useState(false)
  const [todoForm, setTodoForm] = useState({})

  const [ablaufModal, setAblaufModal] = useState(false)
  const [ablaufForm, setAblaufForm] = useState({})

  const [dateiModal, setDateiModal] = useState(false)
  const [dateiForm, setDateiForm] = useState({})

  const [kostenModal, setKostenModal] = useState(false)
  const [kostenForm, setKostenForm] = useState({})

  const geplanteKosten = kosten.reduce((s,k) => s+Number(k.betrag_geplant||0), 0)
  const tatsKosten = kosten.reduce((s,k) => s+Number(k.betrag_tatsaechlich||0), 0)
  const budget = Number(ev.budget_gesamt||0)
  const tStats = TEILNAHME_STATUS.reduce((acc,s) => { acc[s]=teilnahmen.filter(t=>t.status===s).length; return acc }, {})
  const filtered = teilnahmen.filter(t => !statusFilter || t.status === statusFilter)

  async function loadAp(kid) {
    if (!kid) { setApList([]); return }
    const { data } = await supabase.from('ansprechpartner').select('*').eq('kontakt_id', kid)
    setApList(data || [])
    const h = (data||[]).find(a=>a.hauptansprechpartner)
    if (h) setTForm(f => ({ ...f, ansprechpartner_name:h.name, ansprechpartner_email:h.email||'', ansprechpartner_position:h.position||'' }))
  }

  async function saveTeilnahme() {
    if (!tForm.kontakt_id) return
    setSaving(true)
    const p = { kontakt_id:tForm.kontakt_id, veranstaltung_id:ev.id, ansprechpartner_name:tForm.ansprechpartner_name||'', ansprechpartner_email:tForm.ansprechpartner_email||'', ansprechpartner_position:tForm.ansprechpartner_position||'', status:tForm.status||'Eingeladen', notiz:tForm.notiz||'', teilgenommen:tForm.status==='Erschienen' }
    if (tForm.id) await supabase.from('veranstaltung_teilnahme').update(p).eq('id', tForm.id)
    else await supabase.from('veranstaltung_teilnahme').insert(p)
    setTModal(false); setSaving(false); loadDetails(ev.id)
  }

  async function updateStatus(id, status) {
    await supabase.from('veranstaltung_teilnahme').update({ status, teilgenommen:status==='Erschienen' }).eq('id', id)
    loadDetails(ev.id)
  }

  async function saveTodo() {
    if (!todoForm.titel?.trim()) return
    setSaving(true)
    const p = { event_id:ev.id, titel:todoForm.titel, beschreibung:todoForm.beschreibung||null, zugewiesen_an:todoForm.zugewiesen_an||null, faellig_am:todoForm.faellig_am||null, status:todoForm.status||'Offen', prioritaet:todoForm.prioritaet||'Normal' }
    if (todoForm.id) await supabase.from('event_todos').update(p).eq('id', todoForm.id)
    else await supabase.from('event_todos').insert(p)
    setTodoModal(false); setSaving(false); loadDetails(ev.id)
  }

  async function toggleTodo(t) {
    const next = t.status==='Offen'?'In Bearbeitung':t.status==='In Bearbeitung'?'Erledigt':'Offen'
    await supabase.from('event_todos').update({ status:next }).eq('id', t.id)
    loadDetails(ev.id)
  }

  async function saveAblauf() {
    if (!ablaufForm.titel?.trim()) return
    setSaving(true)
    const p = { event_id:ev.id, uhrzeit:ablaufForm.uhrzeit||null, titel:ablaufForm.titel, beschreibung:ablaufForm.beschreibung||null, verantwortlich:ablaufForm.verantwortlich||null, benoetigt:ablaufForm.benoetigt||null, reihenfolge:ablaufForm.reihenfolge||ablauf.length }
    if (ablaufForm.id) await supabase.from('event_ablauf').update(p).eq('id', ablaufForm.id)
    else await supabase.from('event_ablauf').insert(p)
    setAblaufModal(false); setSaving(false); loadDetails(ev.id)
  }

  async function saveDatei() {
    if (!dateiForm.name?.trim() || !dateiForm.url?.trim()) return
    setSaving(true)
    const p = { event_id:ev.id, name:dateiForm.name, url:dateiForm.url, typ:dateiForm.typ||'Link' }
    if (dateiForm.id) await supabase.from('event_dateien').update(p).eq('id', dateiForm.id)
    else await supabase.from('event_dateien').insert(p)
    setDateiModal(false); setSaving(false); loadDetails(ev.id)
  }

  async function saveKosten() {
    if (!kostenForm.bezeichnung?.trim()) return
    setSaving(true)
    const kat = kostenKategorien.find(k=>k.name===kostenForm.kategorie)
    const p = { event_id:ev.id, kategorie:kostenForm.kategorie||'', kategorie_id:kat?.id||null, bezeichnung:kostenForm.bezeichnung, betrag_geplant:kostenForm.betrag_geplant||0, betrag_tatsaechlich:kostenForm.betrag_tatsaechlich||null, anbieter:kostenForm.anbieter||null, dienstleister_id:kostenForm.dienstleister_id||null, rechnung_nr:kostenForm.rechnung_nr||null, notiz:kostenForm.notiz||null, bezahlt:kostenForm.bezahlt||false }
    if (kostenForm.id) await supabase.from('event_kosten').update(p).eq('id', kostenForm.id)
    else await supabase.from('event_kosten').insert(p)
    setKostenModal(false); setSaving(false); loadDetails(ev.id)
  }

  function exportPDF() {
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Ablaufplan - ${ev.name}</title>
<style>body{font-family:Arial,sans-serif;font-size:11pt;color:#1a1816}@page{margin:15mm;size:A4}@media print{body{-webkit-print-color-adjust:exact}}
.header{background:#0f2240;color:white;padding:24px 32px;margin-bottom:24px}.header h1{font-size:18pt;font-weight:700}
.header-meta{margin-top:8px;font-size:10pt;opacity:0.8}h2{font-size:13pt;font-weight:700;color:#0f2240;margin:20px 0 10px;padding-bottom:4px;border-bottom:2px solid #0f2240}
table{width:100%;border-collapse:collapse;margin-bottom:12px}thead tr{background:#0f2240;color:white}th{padding:7px 10px;text-align:left;font-size:9pt;text-transform:uppercase}
td{padding:7px 10px;border-bottom:1px solid #e0ddd6;font-size:10pt;vertical-align:top}tr:nth-child(even) td{background:#f8f5ef}
.todo-row{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #f0ede8}.check{width:16px;height:16px;border:2px solid #0f2240;border-radius:3px;flex-shrink:0;margin-top:2px}
.check.done{background:#3a8a5a;border-color:#3a8a5a;color:white;font-size:8pt;display:flex;align-items:center;justify-content:center}
.footer{margin-top:28px;padding-top:10px;border-top:1px solid #e0ddd6;font-size:8pt;color:#9a9590;display:flex;justify-content:space-between}
</style></head><body>
<div class="header"><h1>${ev.name}</h1><div class="header-meta">${fmtLang(ev.datum)}${ev.ort?' &middot; '+ev.ort:''} &middot; Status: ${ev.status||'Planung'}</div></div>
${teilnahmen.length>0?`<h2>Teilnehmer (${teilnahmen.length})</h2><table><thead><tr><th>Name</th><th>Firma</th><th>Position</th><th>Status</th></tr></thead><tbody>${teilnahmen.map(t=>`<tr><td>${t.ansprechpartner_name||'-'}</td><td>${t.kontakte?.firma||'-'}</td><td>${t.ansprechpartner_position||'-'}</td><td>${t.status}</td></tr>`).join('')}</tbody></table>`:''}
${ablauf.length>0?`<h2>Ablaufplan</h2><table><thead><tr><th style="width:70px">Uhrzeit</th><th>Programmpunkt</th><th style="width:130px">Verantwortlich</th><th style="width:140px">Benoetigt</th></tr></thead><tbody>${ablauf.map(a=>`<tr><td style="font-weight:700;color:#0f2240">${a.uhrzeit||''}</td><td><strong>${a.titel}</strong>${a.beschreibung?'<br><span style="font-size:9pt;color:#9a9590">'+a.beschreibung+'</span>':''}</td><td style="color:#2d6fa3">${a.verantwortlich||'-'}</td><td style="font-size:9pt">${a.benoetigt||''}</td></tr>`).join('')}</tbody></table>`:''}
${todos.length>0?`<h2>ToDos</h2>${todos.map(t=>`<div class="todo-row"><div class="check ${t.status==='Erledigt'?'done':''}">${t.status==='Erledigt'?'OK':''}</div><div style="flex:1"><strong>${t.titel}</strong><br><span style="font-size:9pt;color:#9a9590">${t.zugewiesen_an?'Zugewiesen: '+t.zugewiesen_an+' | ':''}Status: ${t.status} | Prioritaet: ${t.prioritaet}</span></div></div>`).join('')}`:''}
${kosten.length>0?`<h2>Kosten</h2><table><thead><tr><th>Kategorie</th><th>Bezeichnung</th><th>Geplant</th><th>Tatsaechlich</th></tr></thead><tbody>${kosten.map(k=>`<tr><td>${k.kategorie||'-'}</td><td>${k.bezeichnung}</td><td>${Number(k.betrag_geplant||0).toLocaleString('de-DE')} EUR</td><td>${k.betrag_tatsaechlich!=null?Number(k.betrag_tatsaechlich).toLocaleString('de-DE')+' EUR':'-'}</td></tr>`).join('')}</tbody></table>`:''}
${ev.agenda?`<h2>Agenda</h2><div style="background:#f8f5ef;padding:14px;border-radius:6px">${ev.agenda}</div>`:''}
${ev.notizen?`<h2>Notizen</h2><div style="background:#f8f5ef;padding:14px;border-radius:6px">${ev.notizen}</div>`:''}
<div class="footer"><div>HC Bremen e.V. &middot; ${ev.name}</div><div>Erstellt am ${new Date().toLocaleDateString('de-DE')}</div></div>
</body></html>`
    const win = window.open('', '_blank', 'width=900,height=700')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 800) }
  }

  async function saveAgenda(val) {
    await supabase.from('veranstaltungen').update({ agenda: val }).eq('id', ev.id)
  }
  async function saveNotizen(val) {
    await supabase.from('veranstaltungen').update({ notizen: val }).eq('id', ev.id)
  }

  return (
    <div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div>
            <div style={{fontFamily:'"DM Serif Display",serif',fontSize:22,color:'var(--navy)',marginBottom:4}}>{ev.name}</div>
            <div style={{fontSize:13,color:'var(--gray-600)',display:'flex',gap:12,flexWrap:'wrap'}}>
              {ev.datum&&<span>{fmtLang(ev.datum)}</span>}
              {ev.ort&&<span>{ev.ort}</span>}
              {ev.zustaendig&&<span>Zustaendig: {ev.zustaendig}</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            <button className="btn btn-sm btn-outline" onClick={exportPDF}>PDF</button>
            <button className="btn btn-sm btn-outline" onClick={onEdit}>Bearb.</button>
            <button className="btn btn-sm btn-danger" onClick={onDelete}>X</button>
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
          {TEILNAHME_STATUS.map(s => tStats[s]>0 && (
            <span key={s} style={{fontSize:12,padding:'2px 10px',borderRadius:20,fontWeight:600,background:STATUS_COLORS[s].bg,color:STATUS_COLORS[s].color}}>{s}: {tStats[s]}</span>
          ))}
        </div>
        {budget>0&&(
          <div style={{display:'flex',gap:16,marginTop:10,paddingTop:10,borderTop:'1px solid var(--gray-100)',fontSize:12}}>
            <span style={{color:'var(--gray-400)'}}>Budget: <strong>{budget.toLocaleString('de-DE')} EUR</strong></span>
            <span style={{color:'var(--gray-400)'}}>Geplant: <strong style={{color:geplanteKosten>budget?'var(--red)':'inherit'}}>{geplanteKosten.toLocaleString('de-DE')} EUR</strong></span>
            {tatsKosten>0&&<span style={{color:'var(--gray-400)'}}>Tatsaechlich: <strong style={{color:tatsKosten>budget?'var(--red)':'var(--green)'}}>{tatsKosten.toLocaleString('de-DE')} EUR</strong></span>}
          </div>
        )}
      </div>

      <div className="tabs" style={{marginBottom:16}}>
        {[['teilnehmer','Teilnehmer ('+teilnahmen.length+')'],['positionen','👥 Positionen'],['todos','ToDos ('+todos.length+')'],['ablauf','Ablaufplan'],['agenda','Agenda'],['notizen','Notizen'],['dateien','Dateien ('+dateien.length+')'],['kosten','Kosten'],['inventar','🗄️ Inventar']].map(([k,l])=>(
          <button key={k} className={'tab-btn'+(tab===k?' active':'')} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==='teilnehmer'&&(
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{fontSize:13,padding:'6px 10px'}}>
              <option value="">Alle Status</option>
              {TEILNAHME_STATUS.map(s=><option key={s}>{s}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={()=>{setTForm({status:'Eingeladen'});setApList([]);setTModal(true)}}>+ Teilnehmer</button>
          </div>
          {filtered.length===0 ? <div className="empty-state"><p>Noch keine Teilnehmer.</p></div> : (
            <div style={{display:'grid',gap:8}}>
              {filtered.map(t=>{
                const sc=STATUS_COLORS[t.status]||{bg:'#ececec',color:'#555'}
                return (
                  <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',flexWrap:'wrap',gap:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:32,height:32,background:'var(--gray-100)',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--gray-400)',flexShrink:0}}>{t.kontakte?.firma?.[0]||'?'}</div>
                      <div>
                        <div style={{fontWeight:600,fontSize:14}}>{t.ansprechpartner_name||t.kontakte?.firma}</div>
                        <div style={{fontSize:12,color:'var(--gray-400)'}}>{t.kontakte?.firma}{t.ansprechpartner_position?' · '+t.ansprechpartner_position:''}</div>
                        {t.notiz&&<div style={{fontSize:12,color:'var(--gray-600)',fontStyle:'italic'}}>{t.notiz}</div>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)} style={{fontSize:12,padding:'4px 8px',border:'1.5px solid var(--gray-200)',borderRadius:20,background:sc.bg,color:sc.color,fontWeight:600,cursor:'pointer'}}>
                        {TEILNAHME_STATUS.map(s=><option key={s}>{s}</option>)}
                      </select>
                      <button className="btn btn-sm btn-outline" onClick={()=>{setTForm(t);loadAp(t.kontakt_id);setTModal(true)}}>Bearb.</button>
                      <button className="btn btn-sm btn-danger" onClick={async()=>{if(window.confirm('Entfernen?')){await supabase.from('veranstaltung_teilnahme').delete().eq('id',t.id);loadDetails(ev.id)}}}>X</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab==='positionen'&&(
        <PositionenTab
          ev={ev}
          positionen={positionen}
          eventFreiwillige={eventFreiwillige}
          freiwillige={freiwillige}
          faehigkeiten={faehigkeiten}
          onNewPosition={()=>{ setPositionForm({anzahl_benoetigt:1,rang:'Helfer',reihenfolge:positionen.length}); setPositionModal(true) }}
          onEditPosition={(pos)=>{ setPositionForm(pos); setPositionModal(true) }}
          onDeletePosition={async(id)=>{ if(!window.confirm('Position loeschen?'))return; await supabase.from('event_positionen').delete().eq('id',id); if(loadPositionen)loadPositionen(ev.id) }}
          onOpenPosition={(pos)=>{ setSelectedPosition(pos); setFreiwilligerForm({status:'Angefragt',rang:'Helfer'}); setFreiwilligerModal(true) }}
          onUpdateFreiwilligerStatus={async(id,status)=>{ await supabase.from('event_freiwillige').update({status}).eq('id',id); if(loadPositionen)loadPositionen(ev.id) }}
          onRemoveFreiwilliger={async(id)=>{ await supabase.from('event_freiwillige').delete().eq('id',id); if(loadPositionen)loadPositionen(ev.id) }}
        />
      )}

      {positionModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setPositionModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{positionForm.id?'Position bearbeiten':'Neue Position'}</span>
              <button className="close-btn" onClick={()=>setPositionModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Titel *</label><input value={positionForm.titel||''} onChange={e=>setPositionForm(f=>({...f,titel:e.target.value}))} autoFocus placeholder="z.B. Einlass, Catering, Ordner..."/></div>
                <div className="form-group"><label>Anzahl benötigt</label><input type="number" min="1" value={positionForm.anzahl_benoetigt||1} onChange={e=>setPositionForm(f=>({...f,anzahl_benoetigt:parseInt(e.target.value)||1}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rang</label>
                  <select value={positionForm.rang||'Helfer'} onChange={e=>setPositionForm(f=>({...f,rang:e.target.value}))}>
                    {(raenge.length>0?raenge.map(r=>r.name):['Helfer','Teamleiter','Schichtleiter','Koordinator','Verantwortlicher']).map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Erforderliche Fähigkeit</label>
                  <select value={positionForm.faehigkeit_id||''} onChange={e=>setPositionForm(f=>({...f,faehigkeit_id:e.target.value||null}))}>
                    <option value="">-- Keine --</option>
                    {faehigkeiten.map(fk=><option key={fk.id} value={fk.id}>{fk.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Positionsart</label>
                <select value={positionForm.positionsart||''} onChange={e=>setPositionForm(f=>({...f,positionsart:e.target.value||null}))}>
                  <option value="">-- Keine --</option>
                  {posKategorien.length>0
                    ? posKategorien.map(pk=><option key={pk.id} value={pk.name}>{pk.name}</option>)
                    : ['Einlass','Catering','Technik','Ordner','VIP','Aufbau','Sonstiges'].map(k=><option key={k}>{k}</option>)
                  }
                </select>
                {posKategorien.length===0&&<p style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>Kategorien in Einstellungen → Positions-Kategorien anlegen</p>}
              </div>
              <div className="form-group"><label>Beschreibung</label><textarea value={positionForm.beschreibung||''} onChange={e=>setPositionForm(f=>({...f,beschreibung:e.target.value}))} style={{minHeight:60}}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setPositionModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={savePosition} disabled={savingPos}>{savingPos?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {freiwilligerModal&&selectedPosition&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setFreiwilligerModal(false)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header">
              <span className="modal-title">Freiwilligen zuordnen: {selectedPosition.titel}</span>
              <button className="close-btn" onClick={()=>setFreiwilligerModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Person *</label>
                <select value={freiwilligerForm.freiwilliger_id||''} onChange={e=>setFreiwilligerForm(f=>({...f,freiwilliger_id:e.target.value}))}>
                  <option value="">-- Person wählen --</option>
                  {freiwillige.filter(fw=>!selectedPosition.faehigkeit_id||(fw.freiwillige_zu_faehigkeiten||[]).some(z=>z.faehigkeit_id===selectedPosition.faehigkeit_id)).map(fw=>(
                    <option key={fw.id} value={fw.id}>{fw.vorname} {fw.nachname}</option>
                  ))}
                </select>
                {selectedPosition.faehigkeit_id&&<p style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>Gefiltert nach Fähigkeit: {faehigkeiten.find(f=>f.id===selectedPosition.faehigkeit_id)?.name}</p>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rang</label>
                  <select value={freiwilligerForm.rang||'Helfer'} onChange={e=>setFreiwilligerForm(f=>({...f,rang:e.target.value}))}>
                    {(raenge.length>0?raenge.map(r=>r.name):['Helfer','Teamleiter','Schichtleiter','Koordinator','Verantwortlicher']).map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={freiwilligerForm.status||'Angefragt'} onChange={e=>setFreiwilligerForm(f=>({...f,status:e.target.value}))}>
                    {['Angefragt','Zugesagt','Abgesagt','Erschienen','Nicht erschienen'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Notiz</label><textarea value={freiwilligerForm.notiz||''} onChange={e=>setFreiwilligerForm(f=>({...f,notiz:e.target.value}))} style={{minHeight:60}}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setFreiwilligerModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveFreiwilliger} disabled={savingPos}>{savingPos?'Speichern...':'Zuordnen'}</button>
            </div>
          </div>
        </div>
      )}

      {tab==='todos'&&(
        <div>
          <div className="toolbar">
            <span style={{fontSize:13,color:'var(--gray-500)'}}>{todos.filter(t=>t.status==='Erledigt').length}/{todos.length} erledigt</span>
            <button className="btn btn-primary" onClick={()=>{setTodoForm({status:'Offen',prioritaet:'Normal'});setTodoModal(true)}}>+ ToDo</button>
          </div>
          {todos.length===0 ? <div className="empty-state card"><p>Noch keine ToDos.</p></div> : (
            <div style={{display:'grid',gap:8}}>
              {todos.map(t=>{
                const tc=todoColor(t.status)
                return (
                  <div key={t.id} style={{padding:14,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',display:'flex',gap:12,alignItems:'flex-start',opacity:t.status==='Erledigt'?0.7:1}}>
                    <button onClick={()=>toggleTodo(t)} style={{width:22,height:22,borderRadius:4,border:'2px solid '+(t.status==='Erledigt'?'#3a8a5a':t.status==='In Bearbeitung'?'#e07b30':'var(--gray-300)'),background:t.status==='Erledigt'?'#3a8a5a':t.status==='In Bearbeitung'?'#fff3cd':'var(--white)',cursor:'pointer',flexShrink:0,marginTop:2,fontSize:10,fontWeight:700,color:t.status==='Erledigt'?'white':'inherit'}}>
                      {t.status==='Erledigt'?'OK':t.status==='In Bearbeitung'?'~':''}
                    </button>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <strong style={{fontSize:14,textDecoration:t.status==='Erledigt'?'line-through':'none'}}>{t.titel}</strong>
                        <div style={{display:'flex',gap:6,marginLeft:8}}>
                          <span style={{fontSize:11,padding:'1px 7px',borderRadius:10,fontWeight:600,background:tc.bg,color:tc.color}}>{t.status}</span>
                          <span style={{fontSize:11,padding:'1px 7px',borderRadius:10,fontWeight:600,background:prioColor(t.prioritaet)+'22',color:prioColor(t.prioritaet)}}>{t.prioritaet}</span>
                        </div>
                      </div>
                      {t.beschreibung&&<p style={{fontSize:12,color:'var(--gray-500)',marginTop:3}}>{t.beschreibung}</p>}
                      <div style={{display:'flex',gap:12,marginTop:6,fontSize:12,color:'var(--gray-400)'}}>
                        {t.zugewiesen_an&&<span>Zugewiesen: <strong style={{color:'var(--navy)'}}>{t.zugewiesen_an}</strong></span>}
                        {t.faellig_am&&<span>Faellig: <strong style={{color:new Date(t.faellig_am)<new Date()&&t.status!=='Erledigt'?'var(--red)':'inherit'}}>{fmt(t.faellig_am)}</strong></span>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-sm btn-outline" onClick={()=>{setTodoForm(t);setTodoModal(true)}}>Bearb.</button>
                      <button className="btn btn-sm btn-danger" onClick={async()=>{await supabase.from('event_todos').delete().eq('id',t.id);loadDetails(ev.id)}}>X</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab==='ablauf'&&(
        <div>
          <div className="toolbar">
            <button className="btn btn-outline" onClick={exportPDF}>PDF exportieren</button>
            <button className="btn btn-primary" onClick={()=>{setAblaufForm({reihenfolge:ablauf.length});setAblaufModal(true)}}>+ Ablaufpunkt</button>
          </div>
          {ablauf.length===0 ? <div className="empty-state card"><p>Noch keine Ablaufpunkte.</p></div> : (
            <div style={{display:'grid',gap:4}}>
              {ablauf.map(a=>(
                <div key={a.id} style={{display:'grid',gridTemplateColumns:'70px 1fr 140px 160px auto',gap:12,padding:'12px 16px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',alignItems:'start'}}>
                  <div style={{fontWeight:700,color:'var(--navy)',fontSize:14}}>{a.uhrzeit||''}</div>
                  <div><div style={{fontWeight:600,fontSize:14}}>{a.titel}</div>{a.beschreibung&&<div style={{fontSize:12,color:'var(--gray-500)',marginTop:2}}>{a.beschreibung}</div>}</div>
                  <div style={{fontSize:12,color:'#2d6fa3',fontWeight:500}}>{a.verantwortlich||'-'}</div>
                  <div style={{fontSize:12,color:'var(--gray-500)'}}>{a.benoetigt||''}</div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-sm btn-outline" onClick={()=>{setAblaufForm(a);setAblaufModal(true)}}>Bearb.</button>
                    <button className="btn btn-sm btn-danger" onClick={async()=>{await supabase.from('event_ablauf').delete().eq('id',a.id);loadDetails(ev.id)}}>X</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==='agenda'&&(
        <div className="card">
          <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
            {[['bold','B'],['italic','I'],['underline','U']].map(([cmd,label])=>(
              <button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd)}} style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,cursor:'pointer',fontSize:13}}>{label}</button>
            ))}
            <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertUnorderedList')}} style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,cursor:'pointer',fontSize:13}}>Liste</button>
          </div>
          <div contentEditable suppressContentEditableWarning onBlur={e=>saveAgenda(e.currentTarget.innerHTML)}
            dangerouslySetInnerHTML={{__html:ev.agenda||'<p>Agenda hier eintragen...</p>'}}
            style={{minHeight:200,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:16,fontSize:14,lineHeight:1.7,outline:'none'}}/>
          <p style={{fontSize:12,color:'var(--gray-400)',marginTop:8}}>Wird beim Verlassen gespeichert.</p>
        </div>
      )}

      {tab==='notizen'&&(
        <div className="card">
          <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
            {[['bold','B'],['italic','I'],['underline','U']].map(([cmd,label])=>(
              <button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd)}} style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,cursor:'pointer',fontSize:13}}>{label}</button>
            ))}
            <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertUnorderedList')}} style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,cursor:'pointer',fontSize:13}}>Liste</button>
          </div>
          <div contentEditable suppressContentEditableWarning onBlur={e=>saveNotizen(e.currentTarget.innerHTML)}
            dangerouslySetInnerHTML={{__html:ev.notizen||'<p>Notizen hier eintragen...</p>'}}
            style={{minHeight:200,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:16,fontSize:14,lineHeight:1.7,outline:'none'}}/>
          <p style={{fontSize:12,color:'var(--gray-400)',marginTop:8}}>Wird beim Verlassen gespeichert.</p>
        </div>
      )}

      {tab==='dateien'&&(
        <div>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={()=>{setDateiForm({typ:'Google Drive'});setDateiModal(true)}}>+ Link/Datei</button>
          </div>
          {dateien.length===0 ? <div className="empty-state card"><p>Noch keine Dateien.</p></div> : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:10}}>
              {dateien.map(d=>(
                <div key={d.id} style={{padding:14,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{d.name}</div>
                      <span style={{fontSize:11,background:'var(--gray-100)',color:'var(--gray-600)',padding:'1px 8px',borderRadius:10}}>{d.typ}</span>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-sm btn-outline" onClick={()=>{setDateiForm(d);setDateiModal(true)}}>Bearb.</button>
                      <button className="btn btn-sm btn-danger" onClick={async()=>{await supabase.from('event_dateien').delete().eq('id',d.id);loadDetails(ev.id)}}>X</button>
                    </div>
                  </div>
                  <a href={d.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:'var(--navy)',wordBreak:'break-all',textDecoration:'none',display:'block',padding:'6px 10px',background:'#f0f7ff',borderRadius:4}}>{d.url.length>50?d.url.slice(0,50)+'...':d.url}</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==='kosten'&&(
        <div>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={()=>{setKostenForm({betrag_geplant:'',bezahlt:false});setKostenModal(true)}}>+ Kostenposition</button>
          </div>
          {(budget>0||kosten.length>0)&&(
            <div className="stats-row" style={{marginBottom:16}}>
              <div className="stat-card blue"><div className="stat-num" style={{fontSize:20}}>{budget.toLocaleString('de-DE')} EUR</div><div className="stat-label">Budget</div></div>
              <div className="stat-card gold"><div className="stat-num" style={{fontSize:20}}>{geplanteKosten.toLocaleString('de-DE')} EUR</div><div className="stat-label">Geplant</div></div>
              <div className="stat-card" style={{background:tatsKosten>budget?'#fff5f5':'#f0f9f4'}}><div className="stat-num" style={{fontSize:20,color:tatsKosten>budget?'var(--red)':'var(--green)'}}>{tatsKosten.toLocaleString('de-DE')} EUR</div><div className="stat-label">Tatsaechlich</div></div>
              <div className="stat-card"><div className="stat-num" style={{fontSize:20,color:budget-geplanteKosten<0?'var(--red)':'var(--green)'}}>{(budget-geplanteKosten).toLocaleString('de-DE')} EUR</div><div className="stat-label">Verbleibend</div></div>
            </div>
          )}
          {kosten.length===0 ? <div className="empty-state card"><p>Noch keine Kostenpositionen.</p></div> : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Kategorie</th><th>Bezeichnung</th><th>Dienstleister</th><th>Geplant</th><th>Tatsaechlich</th><th>Bezahlt</th><th></th></tr></thead>
                  <tbody>
                    {kosten.map(k=>{
                      const dl=dienstleister.find(d=>d.id===k.dienstleister_id)
                      return (
                        <tr key={k.id}>
                          <td><span style={{fontSize:12,fontWeight:600,color:'#2d6fa3',background:'#ddeaff',padding:'2px 8px',borderRadius:10}}>{k.kategorie||'–'}</span></td>
                          <td><strong style={{fontSize:13}}>{k.bezeichnung}</strong>{k.notiz&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{k.notiz}</div>}</td>
                          <td style={{fontSize:12,color:'var(--gray-500)'}}>{dl?.firma||k.anbieter||'–'}</td>
                          <td style={{fontWeight:600}}>{Number(k.betrag_geplant||0).toLocaleString('de-DE')} EUR</td>
                          <td style={{fontWeight:600,color:k.betrag_tatsaechlich>k.betrag_geplant?'var(--red)':'var(--green)'}}>{k.betrag_tatsaechlich!=null?Number(k.betrag_tatsaechlich).toLocaleString('de-DE')+' EUR':'–'}</td>
                          <td>
                            <button onClick={async()=>{await supabase.from('event_kosten').update({bezahlt:!k.bezahlt}).eq('id',k.id);loadDetails(ev.id)}} style={{padding:'2px 10px',borderRadius:10,border:'1.5px solid',fontSize:12,fontWeight:600,cursor:'pointer',background:k.bezahlt?'#e2efda':'var(--white)',borderColor:k.bezahlt?'#3a8a5a':'var(--gray-200)',color:k.bezahlt?'#2d6b3a':'var(--gray-500)'}}>
                              {k.bezahlt?'Bezahlt':'Offen'}
                            </button>
                          </td>
                          <td style={{whiteSpace:'nowrap'}}>
                            <button className="btn btn-sm btn-outline" onClick={()=>{setKostenForm(k);setKostenModal(true)}}>Bearb.</button>
                            {' '}<button className="btn btn-sm btn-danger" onClick={async()=>{await supabase.from('event_kosten').delete().eq('id',k.id);loadDetails(ev.id)}}>X</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot><tr style={{background:'var(--gray-100)',fontWeight:700}}><td colSpan="3">Gesamt</td><td>{geplanteKosten.toLocaleString('de-DE')} EUR</td><td style={{color:tatsKosten>budget&&budget>0?'var(--red)':'inherit'}}>{tatsKosten.toLocaleString('de-DE')} EUR</td><td colSpan="2">{kosten.filter(k=>k.bezahlt).length}/{kosten.length} bezahlt</td></tr></tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='inventar'&&(
        <div>
          <div className="toolbar">
            <span style={{fontSize:13,color:'var(--gray-500)'}}>{inventarBuchungen.length} Positionen eingeplant</span>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-outline" onClick={onVorlageAnwenden}>📋 Vorlage anwenden</button>
              <button className="btn btn-primary" onClick={onNewInventarBuchung}>+ Equipment einplanen</button>
            </div>
          </div>
          {inventarBuchungen.length===0 ? (
            <div className="empty-state card"><p>Noch kein Equipment für dieses Event eingeplant.</p></div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Equipment</th><th>Typ</th><th>Menge</th><th>Zeitraum</th><th>Lagerort</th><th>Notiz</th><th>Zurück</th><th></th></tr></thead>
                  <tbody>
                    {inventarBuchungen.map(b=>{
                      const inv=b.inventar
                      return (
                        <tr key={b.id} style={{opacity:b.zurueckgegeben?0.6:1}}>
                          <td><strong style={{fontSize:13}}>{inv?.name||'–'}</strong></td>
                          <td><span style={{fontSize:11,padding:'1px 8px',borderRadius:10,background:inv?.typ==='Geliehen'?'#fff3cd':'#e2efda',color:inv?.typ==='Geliehen'?'#8a6a00':'#2d6b3a',fontWeight:600}}>{inv?.typ||'Gekauft'}</span></td>
                          <td style={{fontWeight:600}}>{b.menge} {inv?.einheit||'Stk'}</td>
                          <td style={{fontSize:12,color:'var(--gray-500)'}}>
                            {b.datum_von&&new Date(b.datum_von).toLocaleDateString('de-DE')}
                            {b.datum_bis&&b.datum_bis!==b.datum_von&&<span> – {new Date(b.datum_bis).toLocaleDateString('de-DE')}</span>}
                          </td>
                          <td style={{fontSize:12,color:'var(--gray-400)'}}>{inv?.lagerort||'–'}</td>
                          <td style={{fontSize:12,color:'var(--gray-500)'}}>{b.notiz||'–'}</td>
                          <td>
                            <button onClick={()=>toggleZurueck(b.id,!b.zurueckgegeben)}
                              style={{padding:'2px 10px',borderRadius:10,border:'1.5px solid',fontSize:12,fontWeight:600,cursor:'pointer',
                                background:b.zurueckgegeben?'#e2efda':'var(--white)',
                                borderColor:b.zurueckgegeben?'#3a8a5a':'var(--gray-200)',
                                color:b.zurueckgegeben?'#2d6b3a':'var(--gray-500)'}}>
                              {b.zurueckgegeben?'✓ Zurück':'Ausstehend'}
                            </button>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-danger" onClick={()=>deleteBuchung(b.id)}>X</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={tModal} onClose={()=>setTModal(false)} title={tForm.id?'Teilnehmer bearbeiten':'Teilnehmer hinzufuegen'}
        footer={<><button className="btn btn-outline" onClick={()=>setTModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveTeilnahme} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label>Firma *</label><select value={tForm.kontakt_id||''} onChange={e=>{setTForm(f=>({...f,kontakt_id:e.target.value}));loadAp(e.target.value)}}><option value="">Bitte waehlen...</option>{kontakte.map(k=><option key={k.id} value={k.id}>{k.firma}</option>)}</select></div>
          <div className="form-group"><label>Status</label><select value={tForm.status||'Eingeladen'} onChange={e=>setTForm(f=>({...f,status:e.target.value}))}>{TEILNAHME_STATUS.map(s=><option key={s}>{s}</option>)}</select></div>
        </div>
        {apList.length>0&&<div className="form-group"><label>Ansprechpartner</label><div style={{display:'grid',gap:8}}>{apList.map(ap=>(<div key={ap.id} onClick={()=>setTForm(f=>({...f,ansprechpartner_name:ap.name,ansprechpartner_email:ap.email||'',ansprechpartner_position:ap.position||''}))} style={{padding:'10px 14px',border:'1.5px solid '+(tForm.ansprechpartner_name===ap.name?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer'}}><div style={{fontWeight:600,fontSize:13}}>{ap.name}</div><div style={{fontSize:12,color:'var(--gray-400)'}}>{ap.position}</div></div>))}</div></div>}
        <div className="form-row"><div className="form-group"><label>Name</label><input value={tForm.ansprechpartner_name||''} onChange={e=>setTForm(f=>({...f,ansprechpartner_name:e.target.value}))}/></div><div className="form-group"><label>Position</label><input value={tForm.ansprechpartner_position||''} onChange={e=>setTForm(f=>({...f,ansprechpartner_position:e.target.value}))}/></div></div>
        <div className="form-group"><label>E-Mail</label><input type="email" value={tForm.ansprechpartner_email||''} onChange={e=>setTForm(f=>({...f,ansprechpartner_email:e.target.value}))}/></div>
        <div className="form-group"><label>Notiz</label><textarea value={tForm.notiz||''} onChange={e=>setTForm(f=>({...f,notiz:e.target.value}))}/></div>
      </Modal>

      <Modal open={todoModal} onClose={()=>setTodoModal(false)} title={todoForm.id?'ToDo bearbeiten':'Neues ToDo'}
        footer={<><button className="btn btn-outline" onClick={()=>setTodoModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveTodo} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></>}>
        <div className="form-group"><label>Titel *</label><input value={todoForm.titel||''} onChange={e=>setTodoForm(f=>({...f,titel:e.target.value}))} autoFocus/></div>
        <div className="form-group"><label>Beschreibung</label><textarea value={todoForm.beschreibung||''} onChange={e=>setTodoForm(f=>({...f,beschreibung:e.target.value}))}/></div>
        <div className="form-row">
          <div className="form-group"><label>Zugewiesen an</label><select value={todoForm.zugewiesen_an||''} onChange={e=>setTodoForm(f=>({...f,zugewiesen_an:e.target.value}))}><option value="">-- Niemand --</option>{personen.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
          <div className="form-group"><label>Faellig am</label><input type="date" value={todoForm.faellig_am||''} onChange={e=>setTodoForm(f=>({...f,faellig_am:e.target.value}))}/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Status</label><select value={todoForm.status||'Offen'} onChange={e=>setTodoForm(f=>({...f,status:e.target.value}))}>{TODO_STATUS.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="form-group"><label>Prioritaet</label><select value={todoForm.prioritaet||'Normal'} onChange={e=>setTodoForm(f=>({...f,prioritaet:e.target.value}))}>{TODO_PRIO.map(p=><option key={p}>{p}</option>)}</select></div>
        </div>
      </Modal>

      <Modal open={ablaufModal} onClose={()=>setAblaufModal(false)} title={ablaufForm.id?'Ablaufpunkt bearbeiten':'Neuer Ablaufpunkt'}
        footer={<><button className="btn btn-outline" onClick={()=>setAblaufModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveAblauf} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></>}>
        <div className="form-row"><div className="form-group"><label>Uhrzeit</label><input type="time" value={ablaufForm.uhrzeit||''} onChange={e=>setAblaufForm(f=>({...f,uhrzeit:e.target.value}))}/></div><div className="form-group"><label>Reihenfolge</label><input type="number" value={ablaufForm.reihenfolge||0} onChange={e=>setAblaufForm(f=>({...f,reihenfolge:parseInt(e.target.value)||0}))}/></div></div>
        <div className="form-group"><label>Titel *</label><input value={ablaufForm.titel||''} onChange={e=>setAblaufForm(f=>({...f,titel:e.target.value}))} autoFocus/></div>
        <div className="form-group"><label>Beschreibung</label><textarea value={ablaufForm.beschreibung||''} onChange={e=>setAblaufForm(f=>({...f,beschreibung:e.target.value}))}/></div>
        <div className="form-row">
          <div className="form-group"><label>Verantwortlich</label><select value={ablaufForm.verantwortlich||''} onChange={e=>setAblaufForm(f=>({...f,verantwortlich:e.target.value}))}><option value="">-- Niemand --</option>{personen.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
          <div className="form-group"><label>Benoetigt</label><input value={ablaufForm.benoetigt||''} onChange={e=>setAblaufForm(f=>({...f,benoetigt:e.target.value}))}/></div>
        </div>
      </Modal>

      <Modal open={dateiModal} onClose={()=>setDateiModal(false)} title={dateiForm.id?'Link bearbeiten':'Neuer Link'}
        footer={<><button className="btn btn-outline" onClick={()=>setDateiModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveDatei} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></>}>
        <div className="form-row"><div className="form-group"><label>Name *</label><input value={dateiForm.name||''} onChange={e=>setDateiForm(f=>({...f,name:e.target.value}))} autoFocus/></div><div className="form-group"><label>Typ</label><select value={dateiForm.typ||'Link'} onChange={e=>setDateiForm(f=>({...f,typ:e.target.value}))}>{DATEI_TYPEN.map(t=><option key={t}>{t}</option>)}</select></div></div>
        <div className="form-group"><label>URL *</label><input type="url" value={dateiForm.url||''} onChange={e=>setDateiForm(f=>({...f,url:e.target.value}))} placeholder="https://..."/></div>
      </Modal>

      <Modal open={kostenModal} onClose={()=>setKostenModal(false)} title={kostenForm.id?'Kostenposition bearbeiten':'Neue Kostenposition'}
        footer={<><button className="btn btn-outline" onClick={()=>setKostenModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveKosten} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label>Kategorie</label><select value={kostenForm.kategorie||''} onChange={e=>setKostenForm(f=>({...f,kategorie:e.target.value}))}><option value="">-- Keine --</option>{kostenKategorien.length>0?kostenKategorien.map(k=><option key={k.id} value={k.name}>{k.name}</option>):KOSTEN_KAT.map(k=><option key={k}>{k}</option>)}</select></div>
          <div className="form-group"><label>Bezeichnung *</label><input value={kostenForm.bezeichnung||''} onChange={e=>setKostenForm(f=>({...f,bezeichnung:e.target.value}))} autoFocus/></div>
        </div>
        <div className="form-group"><label>Dienstleister</label><select value={kostenForm.dienstleister_id||''} onChange={e=>{const dl=dienstleister.find(d=>d.id===e.target.value);setKostenForm(f=>({...f,dienstleister_id:e.target.value||null,anbieter:dl?.firma||f.anbieter}))}}><option value="">-- Keiner --</option>{dienstleister.map(d=><option key={d.id} value={d.id}>{d.firma} ({d.typ})</option>)}</select></div>
        <div className="form-row"><div className="form-group"><label>Geplant (EUR)</label><input type="number" value={kostenForm.betrag_geplant||''} onChange={e=>setKostenForm(f=>({...f,betrag_geplant:e.target.value}))}/></div><div className="form-group"><label>Tatsaechlich (EUR)</label><input type="number" value={kostenForm.betrag_tatsaechlich||''} onChange={e=>setKostenForm(f=>({...f,betrag_tatsaechlich:e.target.value}))}/></div></div>
        <div className="form-row"><div className="form-group"><label>Rechnungsnr.</label><input value={kostenForm.rechnung_nr||''} onChange={e=>setKostenForm(f=>({...f,rechnung_nr:e.target.value}))}/></div><div className="form-group"><label>Notiz</label><input value={kostenForm.notiz||''} onChange={e=>setKostenForm(f=>({...f,notiz:e.target.value}))}/></div></div>
        <div className="form-group"><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}><input type="checkbox" checked={kostenForm.bezahlt||false} onChange={e=>setKostenForm(f=>({...f,bezahlt:e.target.checked}))}/>Bereits bezahlt</label></div>
      </Modal>
    </div>
  )
}

export default function Events() {
  const [events, setEvents] = useState([])
  const [personen, setPersonen] = useState([])
  const [kontakte, setKontakte] = useState([])
  const [orte, setOrte] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [hauptTab, setHauptTab] = useState('events')
  const [saving, setSaving] = useState(false)

  const [eventModal, setEventModal] = useState(false)
  const [eventForm, setEventForm] = useState({})
  const [ortSuche, setOrtSuche] = useState('')
  const [zeigOrte, setZeigOrte] = useState(false)
  const [ortModal, setOrtModal] = useState(false)
  const [ortForm, setOrtForm] = useState({})

  const [teilnahmen, setTeilnahmen] = useState([])
  const [todos, setTodos] = useState([])
  const [ablauf, setAblauf] = useState([])
  const [dateien, setDateien] = useState([])
  const [kosten, setKosten] = useState([])
  const [alleKosten, setAlleKosten] = useState([])
  const [dienstleister, setDienstleister] = useState([])
  const [kostenKategorien, setKostenKategorien] = useState([])

  const [dlModal, setDlModal] = useState(false)
  const [dlForm, setDlForm] = useState({})
  const [dlHModal, setDlHModal] = useState(false)
  const [dlHForm, setDlHForm] = useState({})
  const [selectedDL, setSelectedDL] = useState(null)
  const [dlHistorie, setDlHistorie] = useState([])
  const [dlSearch, setDlSearch] = useState('')
  const [dlDetailTab, setDlDetailTab] = useState('historie')
  const [artikelTab, setArtikelTab] = useState('liste')
  const [artikelModal, setArtikelModal] = useState(false)
  const [artikelForm, setArtikelForm] = useState({})
  const [dlArtikelZuordnung, setDlArtikelZuordnung] = useState([])
  const [preisHistorie, setPreisHistorie] = useState([])
  const [neuerPreisModal, setNeuerPreisModal] = useState(false)
  const [neuerPreisForm, setNeuerPreisForm] = useState({})
  const [selectedDLArtikel, setSelectedDLArtikel] = useState(null)
  const [freiwillige, setFreiwillige] = useState([])
  const [faehigkeiten, setFaehigkeiten] = useState([])
  const [raenge, setRaenge] = useState([])
  const [posKategorien, setPosKategorien] = useState([])
  const [inventar, setInventar] = useState([])
  const [inventarModal, setInventarModal] = useState(false)
  const [inventarForm, setInventarForm] = useState({})
  const [inventarBuchungen, setInventarBuchungen] = useState([])
  const [inventarBuchungModal, setInventarBuchungModal] = useState(false)
  const [inventarBuchungForm, setInventarBuchungForm] = useState({})
  const [selectedInventar, setSelectedInventar] = useState(null)
  const [inventarTab, setInventarTab] = useState('liste')
  const [vorlagen, setVorlagen] = useState([])
  const [vorlagenModal, setVorlagenModal] = useState(false)
  const [vorlagenForm, setVorlagenForm] = useState({})
  const [vorlagenPositionen, setVorlagenPositionen] = useState([])
  const [vorlagenAnwenden, setVorlagenAnwenden] = useState(false)
  const [positionen, setPositionen] = useState([])
  const [eventFreiwillige, setEventFreiwillige] = useState([])
  const [positionModal, setPositionModal] = useState(false)
  const [positionForm, setPositionForm] = useState({})
  const [freiwilligerModal, setFreiwilligerModal] = useState(false)
  const [freiwilligerForm, setFreiwilligerForm] = useState({})
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [dlTyp, setDlTyp] = useState('')
  const [eventArten, setEventArten] = useState([])
  const [eventStatus, setEventStatus] = useState([])
  const [dlArtikel, setDlArtikel] = useState([])
  const [dlTypen, setDlTypen] = useState([])
  const [preisModal, setPreisModal] = useState(false)
  const [preisVergleich, setPreisVergleich] = useState([])
  const [selectedArtikel, setSelectedArtikel] = useState(null)
  const [dlDokModal, setDlDokModal] = useState(false)
  const [dlDokForm, setDlDokForm] = useState({})
  const [dlDokumente, setDlDokumente] = useState([])

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (selectedEvent) loadDetails(selectedEvent.id) }, [selectedEvent])

  async function loadAll() {
    const [{ data:e },{ data:k },{ data:o },{ data:p },{ data:dl },{ data:kk },{ data:ak },{ data:ea },{ data:es },{ data:dlt },{ data:dla }] = await Promise.all([
      supabase.from('veranstaltungen').select('*').order('datum', { ascending: false }),
      supabase.from('kontakte').select('id,firma,ist_ev,logo_url').order('firma'),
      supabase.from('veranstaltungsorte').select('*').order('name'),
      supabase.from('personen').select('*').eq('aktiv', true).order('name'),
      supabase.from('dienstleister').select('id,firma,typ,ansprechpartner,telefon,email,adresse,zahlungsbedingungen,zahlungsziel_tage,iban,notizen,aktiv').order('firma'),
      supabase.from('kosten_kategorien').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('event_kosten').select('*').order('erstellt_am'),
      supabase.from('event_arten').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('event_status_liste').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('dienstleister_typen').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('dienstleistungsartikel').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setEvents(e||[])
    setKontakte(k||[])
    setOrte(o||[])
    setPersonen(p||[])
    setDienstleister(dl||[])
    setKostenKategorien(kk||[])
    setAlleKosten(ak||[])
    setEventArten(ea||[])
    setEventStatus(es||[])
    setDlTypen(dlt||[])
    setDlArtikel(dla||[])
    setLoading(false)
  }

  async function loadDetails(id) {
    const [{ data:t },{ data:ab },{ data:d },{ data:k }] = await Promise.all([
      supabase.from('veranstaltung_teilnahme').select('*,kontakte(id,firma,logo_url)').eq('veranstaltung_id', id),
      supabase.from('event_ablauf').select('*').eq('event_id', id).order('reihenfolge'),
      supabase.from('event_dateien').select('*').eq('event_id', id).order('erstellt_am'),
      supabase.from('event_kosten').select('*').eq('event_id', id).order('erstellt_am'),
    ])
    setTeilnahmen(t||[])
    setAblauf(ab||[])
    setDateien(d||[])
    setKosten(k||[])
    try {
      const { data:td } = await supabase.from('event_todos').select('*').eq('event_id', id).order('erstellt_am')
      setTodos(td||[])
    } catch { setTodos([]) }
    loadPositionen(id)
    loadEventInventar(id)
  }

  function openNewEvent() {
    setEventForm({ name:'', datum:'', ort:'', art:'Networking-Event', status:'Planung', notizen:'', agenda:'', praesentation_link:'', dokument_link_1:'', dokument_link_2:'', dokument_link_3:'', dokument_titel_1:'', dokument_titel_2:'', dokument_titel_3:'', zustaendig:'', einladung_versendet:false, budget_gesamt:'' })
    setEventModal(true)
  }

  async function saveEvent() {
    if (!eventForm.name?.trim()) return
    setSaving(true)
    const payload = { name:eventForm.name, datum:eventForm.datum||null, ort:eventForm.ort||null, ort_id:eventForm.ort_id||null, art:eventForm.art, status:eventForm.status||'Planung', notizen:eventForm.notizen||null, agenda:eventForm.agenda||null, praesentation_link:eventForm.praesentation_link||null, dokument_link_1:eventForm.dokument_link_1||null, dokument_link_2:eventForm.dokument_link_2||null, dokument_link_3:eventForm.dokument_link_3||null, dokument_titel_1:eventForm.dokument_titel_1||null, dokument_titel_2:eventForm.dokument_titel_2||null, dokument_titel_3:eventForm.dokument_titel_3||null, zustaendig:eventForm.zustaendig||null, einladung_versendet:eventForm.einladung_versendet||false, budget_gesamt:eventForm.budget_gesamt||null }
    if (eventForm.id) {
      await supabase.from('veranstaltungen').update(payload).eq('id', eventForm.id)
      setSelectedEvent(ev => ({ ...ev, ...payload }))
    } else {
      const { data } = await supabase.from('veranstaltungen').insert(payload).select().single()
      if (data) setSelectedEvent(data)
    }
    setEventModal(false); setSaving(false); loadAll()
  }

  async function deleteEvent(id) {
    if (!window.confirm('Event wirklich loeschen?')) return
    await supabase.from('veranstaltungen').delete().eq('id', id)
    if (selectedEvent?.id === id) setSelectedEvent(null)
    loadAll()
  }

  async function saveOrt() {
    if (!ortForm.name?.trim()) return
    setSaving(true)
    const p = { name:ortForm.name, adresse_strasse:ortForm.adresse_strasse||null, adresse_plz:ortForm.adresse_plz||null, adresse_stadt:ortForm.adresse_stadt||null, kapazitaet:ortForm.kapazitaet||null }
    let saved
    if (ortForm.id) { await supabase.from('veranstaltungsorte').update(p).eq('id', ortForm.id); saved = { ...ortForm, ...p } }
    else { const { data } = await supabase.from('veranstaltungsorte').insert(p).select().single(); saved = data }
    setOrtModal(false); setSaving(false)
    const { data:o } = await supabase.from('veranstaltungsorte').select('*').order('name')
    setOrte(o||[])
    if (saved) { setEventForm(f => ({ ...f, ort:saved.name, ort_id:saved.id })); setZeigOrte(false) }
  }

  async function saveDL() {
    if (!dlForm.firma?.trim()) return
    setSaving(true)
    const p = { firma:dlForm.firma, typ:dlForm.typ||'Sonstiges', ansprechpartner:dlForm.ansprechpartner||null, telefon:dlForm.telefon||null, email:dlForm.email||null, adresse:dlForm.adresse||null, zahlungsbedingungen:dlForm.zahlungsbedingungen||null, zahlungsziel_tage:dlForm.zahlungsziel_tage||30, iban:dlForm.iban||null, notizen:dlForm.notizen||null, aktiv:dlForm.aktiv!==false }
    if (dlForm.id) { await supabase.from('dienstleister').update(p).eq('id', dlForm.id); if (selectedDL?.id===dlForm.id) setSelectedDL(d=>({...d,...p})) }
    else { const { data } = await supabase.from('dienstleister').insert(p).select().single(); if (data) { setSelectedDL(data); loadDLHistorie(data.id) } }
    setDlModal(false); setSaving(false); loadAll()
  }

  async function loadInventarBuchungen(inventarId) {
    const { data } = await supabase.from('inventar_buchungen')
      .select('*')
      .eq('inventar_id', inventarId)
      .order('datum_von', { ascending: false })
    setInventarBuchungen(data||[])
  }

  async function saveVorlage() {
    if (!vorlagenForm.name?.trim()) { alert('Bitte einen Namen eingeben.'); return }
    setSaving(true)
    let vorlagenId = vorlagenForm.id
    if (vorlagenId) {
      await supabase.from('inventar_vorlagen').update({ name:vorlagenForm.name, beschreibung:vorlagenForm.beschreibung||null }).eq('id', vorlagenId)
      await supabase.from('inventar_vorlagen_positionen').delete().eq('vorlage_id', vorlagenId)
    } else {
      const { data } = await supabase.from('inventar_vorlagen').insert({ name:vorlagenForm.name, beschreibung:vorlagenForm.beschreibung||null }).select().single()
      if (!data) { setSaving(false); alert('Fehler beim Anlegen der Vorlage'); return }
      vorlagenId = data.id
    }
    for (const pos of vorlagenPositionen.filter(p => p.inventar_id)) {
      await supabase.from('inventar_vorlagen_positionen').insert({ vorlage_id:vorlagenId, inventar_id:pos.inventar_id, menge:parseInt(pos.menge)||1, notiz:pos.notiz||null })
    }
    setSaving(false)
    setVorlagenModal(false)
    loadAll()
  }

  async function vorlageAnwenden(vorlage) {
    if (!selectedEvent) { alert('Bitte zuerst ein Event auswählen.'); return }
    if (!window.confirm('Vorlage "'+vorlage.name+'" für dieses Event einplanen?')) return
    setSaving(true)
    for (const pos of (vorlage.inventar_vorlagen_positionen||[])) {
      await supabase.from('inventar_buchungen').insert({
        inventar_id: pos.inventar_id,
        event_id: selectedEvent.id,
        event_name: selectedEvent.name,
        menge: pos.menge||1,
        datum_von: selectedEvent.datum||null,
        datum_bis: selectedEvent.datum||null,
        notiz: pos.notiz||null,
        zurueckgegeben: false
      })
    }
    setSaving(false)
    loadEventInventar(selectedEvent.id)
    setVorlagenAnwenden(false)
    alert('Vorlage erfolgreich eingeplant!')
  }

  async function saveInventar() {
    if (!inventarForm.name?.trim()) { alert('Bitte einen Namen eingeben.'); return }
    setSaving(true)
    // Build payload carefully - only include non-null values to avoid constraint issues
    const p = { name: inventarForm.name.trim(), aktiv: inventarForm.aktiv!==false }
    if (inventarForm.beschreibung) p.beschreibung = inventarForm.beschreibung
    if (inventarForm.menge) p.menge = parseInt(inventarForm.menge)||1
    if (inventarForm.einheit) p.einheit = inventarForm.einheit
    if (inventarForm.lagerort) p.lagerort = inventarForm.lagerort
    if (inventarForm.typ) p.typ = inventarForm.typ
    if (inventarForm.anschaffungsdatum) p.anschaffungsdatum = inventarForm.anschaffungsdatum
    if (inventarForm.anschaffungspreis) p.anschaffungspreis = parseFloat(inventarForm.anschaffungspreis)
    if (inventarForm.zustand) p.zustand = inventarForm.zustand
    if (inventarForm.notizen) p.notizen = inventarForm.notizen
    console.log('Saving inventar:', p)
    let error, data
    if (inventarForm.id) {
      const r = await supabase.from('inventar').update(p).eq('id', inventarForm.id).select()
      error = r.error; data = r.data
    } else {
      const r = await supabase.from('inventar').insert(p).select()
      error = r.error; data = r.data
    }
    console.log('Result:', { error, data })
    setSaving(false)
    if (error) {
      alert('Fehler: ' + error.message + ' (Code: ' + error.code + ')')
      return
    }
    setInventarModal(false)
    loadAll()
  }

  async function saveInventarBuchung() {
    if (!inventarBuchungForm.inventar_id) { alert('Bitte Inventar auswählen.'); return }
    if (!selectedEvent) { alert('Kein Event ausgewählt.'); return }
    setSaving(true)
    const inv = inventar.find(i => i.id === inventarBuchungForm.inventar_id)
    const p = {
      inventar_id: inventarBuchungForm.inventar_id,
      event_id: selectedEvent.id,
      event_name: selectedEvent.name,
      menge: parseInt(inventarBuchungForm.menge)||1,
      datum_von: inventarBuchungForm.datum_von||selectedEvent.datum||null,
      datum_bis: inventarBuchungForm.datum_bis||selectedEvent.datum||null,
      notiz: inventarBuchungForm.notiz||null,
      zurueckgegeben: false
    }
    const { error } = await supabase.from('inventar_buchungen').insert(p)
    setSaving(false)
    if (error) { alert('Fehler: ' + error.message); return }
    setInventarBuchungModal(false)
    loadEventInventar(selectedEvent.id)
  }

  async function loadEventInventar(eventId) {
    const { data } = await supabase.from('inventar_buchungen')
      .select('*,inventar(id,name,menge,einheit,lagerort,typ)')
      .eq('event_id', eventId)
      .order('erstellt_am')
    setInventarBuchungen(data||[])
  }

  async function loadPositionen(eventId) {
    const [{ data:pos },{ data:efw }] = await Promise.all([
      supabase.from('event_positionen').select('*,freiwillige_faehigkeiten(name)').eq('event_id', eventId).order('reihenfolge'),
      supabase.from('event_freiwillige').select('*,freiwillige(vorname,nachname)').eq('event_id', eventId),
    ])
    setPositionen(pos||[])
    setEventFreiwillige(efw||[])
  }

  async function savePosition() {
    if (!positionForm.titel?.trim()) { alert('Bitte einen Titel eingeben.'); return }
    if (!selectedEvent) { alert('Kein Event ausgewaehlt.'); return }
    setSaving(true)
    const p = { event_id:selectedEvent.id, titel:positionForm.titel, beschreibung:positionForm.beschreibung||null, anzahl_benoetigt:parseInt(positionForm.anzahl_benoetigt)||1, faehigkeit_id:positionForm.faehigkeit_id||null, rang:positionForm.rang||'Helfer', reihenfolge:parseInt(positionForm.reihenfolge)||positionen.length }
    let err
    if (positionForm.id) {
      const { error } = await supabase.from('event_positionen').update(p).eq('id', positionForm.id)
      err = error
    } else {
      const { error } = await supabase.from('event_positionen').insert(p)
      err = error
    }
    setSaving(false)
    if (err) { alert('Fehler: ' + err.message); return }
    setPositionModal(false)
    loadPositionen(selectedEvent.id)
  }

  async function saveFreiwilligerZuordnung() {
    if (!freiwilligerForm.freiwilliger_id || !selectedPosition || !selectedEvent) return
    setSaving(true)
    const p = { event_id:selectedEvent.id, position_id:selectedPosition.id, freiwilliger_id:freiwilligerForm.freiwilliger_id, rang:freiwilligerForm.rang||'Helfer', status:freiwilligerForm.status||'Angefragt', notiz:freiwilligerForm.notiz||null }
    if (freiwilligerForm.id) await supabase.from('event_freiwillige').update(p).eq('id', freiwilligerForm.id)
    else await supabase.from('event_freiwillige').upsert(p, { onConflict:'event_id,position_id,freiwilliger_id' })
    setFreiwilligerModal(false); setSaving(false); loadPositionen(selectedEvent.id)
  }

  async function loadDLArtikelZuordnung(dlId) {
    const { data } = await supabase.from('dienstleister_artikel')
      .select('*,dienstleistungsartikel(*)')
      .eq('dienstleister_id', dlId)
      .order('erstellt_am')
    setDlArtikelZuordnung(data||[])
  }

  async function toggleDLArtikel(dlId, artikelId, aktuellerPreis, einheit, notiz) {
    const existing = dlArtikelZuordnung.find(a => a.artikel_id === artikelId)
    if (existing) {
      await supabase.from('dienstleister_artikel').delete().eq('id', existing.id)
    } else {
      await supabase.from('dienstleister_artikel').insert({ dienstleister_id:dlId, artikel_id:artikelId, aktueller_preis:aktuellerPreis||null, einheit:einheit||null, notiz:notiz||null })
    }
    loadDLArtikelZuordnung(dlId)
  }

  async function updateDLArtikel(id, preis, notiz) {
    await supabase.from('dienstleister_artikel').update({ aktueller_preis:preis||null, notiz:notiz||null }).eq('id', id)
    loadDLArtikelZuordnung(selectedDL.id)
  }

  async function loadPreisHistorie(dlId, artikelId) {
    const { data } = await supabase.from('dienstleister_preis_historie')
      .select('*')
      .eq('dienstleister_id', dlId)
      .eq('artikel_id', artikelId)
      .order('datum', { ascending: false })
    setPreisHistorie(data||[])
  }

  async function saveNeuerPreis() {
    if (!neuerPreisForm.preis || !selectedDLArtikel || !selectedDL) return
    setSaving(true)
    await supabase.from('dienstleister_preis_historie').insert({
      dienstleister_id: selectedDL.id,
      artikel_id: selectedDLArtikel.artikel_id,
      preis: neuerPreisForm.preis,
      menge: neuerPreisForm.menge||1,
      einheit: neuerPreisForm.einheit||selectedDLArtikel.dienstleistungsartikel?.einheit||'Stk',
      kommentar: neuerPreisForm.kommentar||null,
      datum: neuerPreisForm.datum||new Date().toISOString().slice(0,10)
    })
    // Update aktueller_preis
    await supabase.from('dienstleister_artikel').update({ aktueller_preis: neuerPreisForm.preis }).eq('id', selectedDLArtikel.id)
    setNeuerPreisModal(false)
    setSaving(false)
    loadDLArtikelZuordnung(selectedDL.id)
    loadPreisHistorie(selectedDL.id, selectedDLArtikel.artikel_id)
  }

  async function saveArtikel() {
    if (!artikelForm.name?.trim()) return
    setSaving(true)
    const p = { name:artikelForm.name, einheit:artikelForm.einheit||'Stk', kategorie:artikelForm.kategorie||null, beschreibung:artikelForm.beschreibung||null, reihenfolge:artikelForm.reihenfolge||dlArtikel.length, aktiv:artikelForm.aktiv!==false }
    if (artikelForm.id) await supabase.from('dienstleistungsartikel').update(p).eq('id', artikelForm.id)
    else await supabase.from('dienstleistungsartikel').insert(p)
    setArtikelModal(false); setSaving(false); loadAll()
  }

  async function loadDLDokumente(id) {
    const { data } = await supabase.from('dienstleister_dokumente').select('*').eq('dienstleister_id', id).order('erstellt_am')
    setDlDokumente(data||[])
  }

  async function loadPreisVergleich(artikelId) {
    const { data } = await supabase.from('dienstleister_preise').select('*,dienstleister(id,firma,typ)').eq('artikel_id', artikelId).order('preis')
    setPreisVergleich(data||[])
  }

  async function savePreis(dlId, artikelId, preis, kommentar) {
    await supabase.from('dienstleister_preise').upsert({ dienstleister_id:dlId, artikel_id:artikelId, preis:preis||null, kommentar:kommentar||null, zuletzt_aktualisiert:new Date().toISOString().slice(0,10) }, { onConflict:'dienstleister_id,artikel_id' })
    if (selectedArtikel) loadPreisVergleich(selectedArtikel.id)
  }

  async function saveDLDok() {
    if (!dlDokForm.name?.trim() || !dlDokForm.url?.trim() || !selectedDL) return
    setSaving(true)
    const p = { dienstleister_id:selectedDL.id, name:dlDokForm.name, url:dlDokForm.url, typ:dlDokForm.typ||'Dokument', kommentar:dlDokForm.kommentar||null }
    if (dlDokForm.id) await supabase.from('dienstleister_dokumente').update(p).eq('id', dlDokForm.id)
    else await supabase.from('dienstleister_dokumente').insert(p)
    setDlDokModal(false); setSaving(false); loadDLDokumente(selectedDL.id)
  }

  async function loadDLHistorie(id) {
    const { data } = await supabase.from('dienstleister_historie').select('*').eq('dienstleister_id', id).order('datum', { ascending:false })
    setDlHistorie(data||[])
    loadDLDokumente(id)
    loadDLArtikelZuordnung(id)
  }

  async function saveDLHistorie() {
    if (!dlHForm.beschreibung?.trim() || !selectedDL) return
    setSaving(true)
    const p = { dienstleister_id:selectedDL.id, event_name:dlHForm.event_name||null, datum:dlHForm.datum||null, beschreibung:dlHForm.beschreibung, betrag:dlHForm.betrag||null, bezahlt:dlHForm.bezahlt||false, rechnung_nr:dlHForm.rechnung_nr||null, notiz:dlHForm.notiz||null }
    if (dlHForm.id) await supabase.from('dienstleister_historie').update(p).eq('id', dlHForm.id)
    else await supabase.from('dienstleister_historie').insert(p)
    setDlHModal(false); setSaving(false); loadDLHistorie(selectedDL.id)
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  const filteredDL = dienstleister.filter(d => (!dlSearch||d.firma.toLowerCase().includes(dlSearch.toLowerCase())) && (!dlTyp||d.typ===dlTyp))

  return (
    <main className="main">
      <div className="page-title">Events</div>
      <p className="page-subtitle">Veranstaltungen, Kostenkalkulation und Dienstleister</p>

      <div className="tabs" style={{marginBottom:20}}>
        {[['events','Veranstaltungen'],['dashboard','Kosten-Dashboard'],['dienstleister','Dienstleister'],['artikel','📦 Artikel'],['inventar','🗄️ Inventar']].map(([k,l])=>(
          <button key={k} className={'tab-btn'+(hauptTab===k?' active':'')} onClick={()=>setHauptTab(k)}>{l}</button>
        ))}
      </div>

      {hauptTab==='events' && (
        <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:20,alignItems:'start'}}>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <strong style={{fontSize:14,color:'var(--navy)'}}>Alle Events ({events.length})</strong>
              <button className="btn btn-primary btn-sm" onClick={openNewEvent}>+ Neu</button>
            </div>
            <div style={{display:'grid',gap:8}}>
              {events.length===0 && <div className="card" style={{textAlign:'center',color:'var(--gray-400)',fontSize:13,padding:32}}>Noch keine Events.</div>}
              {events.map(e => {
                const sc = evColor(e.status||'Planung')
                return (
                  <div key={e.id} onClick={()=>setSelectedEvent(e)}
                    style={{padding:14,border:'1.5px solid '+(selectedEvent?.id===e.id?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:selectedEvent?.id===e.id?'rgba(15,34,64,0.04)':'var(--white)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                      <strong style={{fontSize:13,color:'var(--navy)',flex:1}}>{e.name}</strong>
                      <span style={{fontSize:10,padding:'1px 7px',borderRadius:10,fontWeight:600,background:sc.bg,color:sc.color,flexShrink:0,marginLeft:6}}>{e.status||'Planung'}</span>
                    </div>
                    <div style={{fontSize:11,color:'var(--gray-500)'}}>
                      {e.datum&&<div>{fmtLang(e.datum)}</div>}
                      {e.ort&&<div>{e.ort}</div>}
                    </div>
                    <span style={{fontSize:10,background:'var(--gray-100)',color:'var(--gray-600)',padding:'1px 7px',borderRadius:10,marginTop:6,display:'inline-block'}}>{e.art}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            {!selectedEvent ? (
              <div className="card" style={{textAlign:'center',padding:60,color:'var(--gray-400)'}}>
                <p style={{fontSize:15,marginBottom:8}}>Kein Event ausgewaehlt</p>
                <p style={{fontSize:13}}>Waehle ein Event aus der Liste.</p>
              </div>
            ) : (
              <EventDetail
                ev={selectedEvent}
                teilnahmen={teilnahmen} todos={todos} ablauf={ablauf} dateien={dateien} kosten={kosten}
                dienstleister={dienstleister} kostenKategorien={kostenKategorien} personen={personen} kontakte={kontakte}
                positionen={positionen} eventFreiwillige={eventFreiwillige} freiwillige={freiwillige} faehigkeiten={faehigkeiten} raenge={raenge} posKategorien={posKategorien}
                inventar={inventar} inventarBuchungen={inventarBuchungen}
                onNewInventarBuchung={()=>{ setInventarBuchungForm({menge:1,datum_von:selectedEvent?.datum||'',datum_bis:selectedEvent?.datum||''}); setInventarBuchungModal(true) }}
                onVorlageAnwenden={()=>setVorlagenAnwenden(true)}

                loadPositionen={loadPositionen}
                onEdit={()=>{ setEventForm(selectedEvent); setEventModal(true) }}
                onDelete={()=>deleteEvent(selectedEvent.id)}
                onReload={loadAll}
                loadDetails={loadDetails}
              />
            )}
          </div>
        </div>
      )}

      {hauptTab==='artikel' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div className="tabs" style={{marginBottom:0}}>
              {[['liste','Artikel-Liste'],['vergleich','Preisvergleich']].map(([k,l])=>(
                <button key={k} className={'tab-btn'+(artikelTab===k?' active':'')} onClick={()=>setArtikelTab(k)}>{l}</button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={()=>{setArtikelForm({einheit:'Stk',aktiv:true});setArtikelModal(true)}}>+ Neuer Artikel</button>
          </div>

          {artikelTab==='liste'&&(
            <div style={{display:'grid',gap:8}}>
              {dlArtikel.length===0&&<div className="empty-state card"><p>Noch keine Artikel angelegt.</p></div>}
              {dlArtikel.map(a=>(
                <div key={a.id} style={{padding:14,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',background:'var(--white)',display:'flex',justifyContent:'space-between',alignItems:'center',opacity:a.aktiv?1:0.6}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{a.name}</div>
                    <div style={{fontSize:12,color:'var(--gray-500)',marginTop:2}}>
                      <span style={{marginRight:12}}>Einheit: <strong>{a.einheit}</strong></span>
                      {a.kategorie&&<span style={{marginRight:12}}>Kategorie: <strong>{a.kategorie}</strong></span>}
                      {a.beschreibung&&<span style={{color:'var(--gray-400)'}}>{a.beschreibung}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn btn-sm btn-outline" onClick={()=>{setArtikelForm(a);setArtikelModal(true)}}>Bearb.</button>
                    <button className="btn btn-sm btn-outline" onClick={async()=>{await supabase.from('dienstleistungsartikel').update({aktiv:!a.aktiv}).eq('id',a.id);loadAll()}}>{a.aktiv?'Deaktiv.':'Aktivieren'}</button>
                    <button className="btn btn-sm btn-danger" onClick={async()=>{if(window.confirm('Artikel loeschen?')){await supabase.from('dienstleistungsartikel').delete().eq('id',a.id);loadAll()}}}>X</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {artikelTab==='vergleich'&&(
            <div>
              <p style={{fontSize:13,color:'var(--gray-500)',marginBottom:16}}>Waehle einen Artikel um alle Dienstleister-Preise zu vergleichen.</p>
              <div style={{display:'grid',gap:20}}>
                {dlArtikel.map(artikel=>(
                  <PreisVergleichArtikel key={artikel.id} artikel={artikel}/>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hauptTab==='inventar' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div className="tabs" style={{marginBottom:0}}>
              {[['liste','Equipment-Liste'],['vorlagen','📋 Vorlagen'],['buchungen','Alle Buchungen']].map(([k,l])=>(
                <button key={k} className={'tab-btn'+(inventarTab===k?' active':'')} onClick={()=>setInventarTab(k)}>{l}</button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={()=>{ setInventarForm({menge:1,einheit:'Stk',typ:'Gekauft',zustand:'Gut',aktiv:true}); setInventarModal(true) }}>+ Neues Equipment</button>
          </div>

          {inventarTab==='liste'&&(
            <div style={{display:'grid',gap:8}}>
              {inventar.length===0&&<div className="empty-state card"><p>Noch kein Equipment angelegt.</p></div>}
              {inventar.map(item=>(
                <div key={item.id} style={{padding:14,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',background:'var(--white)',opacity:item.aktiv?1:0.6}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                        <strong style={{fontSize:15,color:'var(--navy)'}}>{item.name}</strong>
                        <span style={{fontSize:11,padding:'1px 8px',borderRadius:10,fontWeight:600,background:item.typ==='Geliehen'?'#fff3cd':'#e2efda',color:item.typ==='Geliehen'?'#8a6a00':'#2d6b3a'}}>{item.typ}</span>
                        <span style={{fontSize:11,padding:'1px 8px',borderRadius:10,background:'var(--gray-100)',color:'var(--gray-600)'}}>{item.zustand}</span>
                      </div>
                      <div style={{display:'flex',gap:20,fontSize:13,color:'var(--gray-600)',flexWrap:'wrap'}}>
                        <span>Bestand: <strong style={{color:'var(--navy)'}}>{item.menge} {item.einheit}</strong></span>
                        {item.lagerort&&<span>📍 {item.lagerort}</span>}
                        {item.anschaffungspreis&&<span>💶 {Number(item.anschaffungspreis).toLocaleString('de-DE')} EUR</span>}
                        {item.anschaffungsdatum&&<span>📅 {new Date(item.anschaffungsdatum).toLocaleDateString('de-DE')}</span>}
                      </div>
                      {item.beschreibung&&<div style={{fontSize:12,color:'var(--gray-400)',marginTop:4}}>{item.beschreibung}</div>}
                      {item.notizen&&<div style={{fontSize:12,color:'var(--gray-500)',marginTop:4,fontStyle:'italic'}}>{item.notizen}</div>}
                    </div>
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      <button className="btn btn-sm btn-outline" onClick={()=>{ setSelectedInventar(item); loadInventarBuchungen(item.id) }}>Buchungen</button>
                      <button className="btn btn-sm btn-outline" onClick={()=>{ setInventarForm(item); setInventarModal(true) }}>Bearb.</button>
                      <button className="btn btn-sm btn-outline" onClick={async()=>{ await supabase.from('inventar').update({aktiv:!item.aktiv}).eq('id',item.id); loadAll() }}>{item.aktiv?'Deaktiv.':'Aktiv'}</button>
                      <button className="btn btn-sm btn-danger" onClick={async()=>{ if(!window.confirm('Equipment loeschen?'))return; await supabase.from('inventar').delete().eq('id',item.id); loadAll() }}>X</button>
                    </div>
                  </div>
                  {selectedInventar?.id===item.id&&(
                    <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--gray-100)'}}>
                      <div style={{fontSize:12,fontWeight:600,color:'var(--gray-500)',textTransform:'uppercase',marginBottom:8}}>Buchungshistorie</div>
                      {inventarBuchungen.length===0 ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Noch keine Buchungen.</p> : (
                        <div style={{display:'grid',gap:6}}>
                          {inventarBuchungen.map(b=>(
                            <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:b.zurueckgegeben?'#f0f9f4':'#fff8f0',borderRadius:'var(--radius)',fontSize:13}}>
                              <div>
                                <strong>{b.event_name||'Event'}</strong>
                                <span style={{marginLeft:8,color:'var(--gray-500)'}}>{b.menge} {item.einheit} · {b.datum_von?new Date(b.datum_von).toLocaleDateString('de-DE'):''}{b.datum_bis&&b.datum_bis!==b.datum_von?' – '+new Date(b.datum_bis).toLocaleDateString('de-DE'):''}</span>
                                {b.notiz&&<span style={{marginLeft:8,color:'var(--gray-400)',fontStyle:'italic'}}>{b.notiz}</span>}
                              </div>
                              <span style={{fontSize:11,padding:'1px 8px',borderRadius:10,fontWeight:600,background:b.zurueckgegeben?'#e2efda':'#fff3cd',color:b.zurueckgegeben?'#2d6b3a':'#8a6a00'}}>{b.zurueckgegeben?'Zurückgegeben':'Ausgeliehen'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {inventarTab==='buchungen'&&(
            <AlleBuchungenTab inventar={inventar}/>
          )}

          {inventarTab==='vorlagen'&&(
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <p style={{fontSize:13,color:'var(--gray-500)'}}>Lege Vorlagen an um Equipment-Sets schnell für Events einzuplanen.</p>
                <button className="btn btn-primary" onClick={()=>{ setVorlagenForm({}); setVorlagenPositionen([{inventar_id:'',menge:1,notiz:''}]); setVorlagenModal(true) }}>+ Neue Vorlage</button>
              </div>
              {vorlagen.length===0 && <div className="empty-state card"><p>Noch keine Vorlagen angelegt.</p></div>}
              <div style={{display:'grid',gap:10}}>
                {vorlagen.map(v=>(
                  <div key={v.id} className="card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div>
                        <strong style={{fontSize:15,color:'var(--navy)'}}>{v.name}</strong>
                        {v.beschreibung&&<div style={{fontSize:12,color:'var(--gray-500)',marginTop:2}}>{v.beschreibung}</div>}
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-sm btn-outline" onClick={()=>{
                          setVorlagenForm(v)
                          setVorlagenPositionen(v.inventar_vorlagen_positionen?.length>0 ? v.inventar_vorlagen_positionen.map(p=>({inventar_id:p.inventar_id,menge:p.menge,notiz:p.notiz||''})) : [{inventar_id:'',menge:1,notiz:''}])
                          setVorlagenModal(true)
                        }}>Bearb.</button>
                        <button className="btn btn-sm btn-danger" onClick={async()=>{ if(!window.confirm('Vorlage loeschen?'))return; await supabase.from('inventar_vorlagen').delete().eq('id',v.id); loadAll() }}>X</button>
                      </div>
                    </div>
                    <div style={{display:'grid',gap:4,marginBottom:10}}>
                      {(v.inventar_vorlagen_positionen||[]).map((pos,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 10px',background:'var(--gray-100)',borderRadius:'var(--radius)',fontSize:13}}>
                          <span style={{fontWeight:600}}>{pos.menge}x</span>
                          <span>{pos.inventar?.name||'–'}</span>
                          <span style={{fontSize:11,color:'var(--gray-400)'}}>{pos.inventar?.einheit}</span>
                          {pos.notiz&&<span style={{fontSize:11,color:'var(--gray-500)',fontStyle:'italic'}}>· {pos.notiz}</span>}
                        </div>
                      ))}
                      {(!v.inventar_vorlagen_positionen||v.inventar_vorlagen_positionen.length===0)&&<p style={{fontSize:12,color:'var(--gray-400)'}}>Keine Positionen.</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hauptTab==='dashboard' && (
        <KostenDashboard events={events} alleKosten={alleKosten} kostenKategorien={kostenKategorien} dienstleister={dienstleister}/>
      )}

      {hauptTab==='dienstleister' && (
        <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:20,alignItems:'start'}}>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <strong style={{fontSize:14,color:'var(--navy)'}}>Dienstleister ({filteredDL.length})</strong>
              <button className="btn btn-primary btn-sm" onClick={()=>{ setDlForm({typ:'Sonstiges',aktiv:true,zahlungsziel_tage:30}); setDlModal(true) }}>+ Neu</button>
            </div>
            <div style={{display:'grid',gap:6,marginBottom:10}}>
              <input value={dlSearch} onChange={e=>setDlSearch(e.target.value)} placeholder="Suche..." style={{padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
              <select value={dlTyp} onChange={e=>setDlTyp(e.target.value)} style={{padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}>
                <option value="">Alle Typen</option>
                {(dlTypen.length>0?dlTypen.map(d=>d.name):DL_TYPEN).map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gap:8}}>
              {filteredDL.length===0&&<div className="card" style={{textAlign:'center',color:'var(--gray-400)',fontSize:13,padding:24}}>Keine Dienstleister.</div>}
              {filteredDL.map(d=>(
                <div key={d.id} onClick={()=>{ setSelectedDL(d); loadDLHistorie(d.id) }}
                  style={{padding:14,border:'1.5px solid '+(selectedDL?.id===d.id?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:selectedDL?.id===d.id?'rgba(15,34,64,0.04)':'var(--white)',opacity:d.aktiv?1:0.6}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                    <strong style={{fontSize:13,color:'var(--navy)'}}>{d.firma}</strong>
                    <span style={{fontSize:10,background:'var(--gray-100)',color:'var(--gray-600)',padding:'1px 7px',borderRadius:10}}>{d.typ}</span>
                  </div>
                  {d.ansprechpartner&&<div style={{fontSize:11,color:'var(--gray-500)'}}>{d.ansprechpartner}</div>}
                  {d.email&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{d.email}</div>}
                </div>
              ))}
            </div>
          </div>

          <div>
            {!selectedDL ? (
              <div className="card" style={{textAlign:'center',padding:60,color:'var(--gray-400)'}}><p>Dienstleister auswaehlen oder neu anlegen.</p></div>
            ) : (
              <div>
                <div className="card" style={{marginBottom:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <div>
                      <div style={{fontFamily:'"DM Serif Display",serif',fontSize:22,color:'var(--navy)',marginBottom:4}}>{selectedDL.firma}</div>
                      <span style={{fontSize:12,background:'var(--gray-100)',color:'var(--gray-600)',padding:'2px 10px',borderRadius:10,fontWeight:600}}>{selectedDL.typ}</span>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn btn-sm btn-outline" onClick={()=>{ setDlForm(selectedDL); setDlModal(true) }}>Bearb.</button>
                      <button className="btn btn-sm btn-danger" onClick={async()=>{ if(!window.confirm('Loeschen?'))return; await supabase.from('dienstleister').delete().eq('id',selectedDL.id); setSelectedDL(null); loadAll() }}>X</button>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
                    {selectedDL.ansprechpartner&&<div><div style={{fontSize:11,color:'var(--gray-400)',marginBottom:2}}>Ansprechpartner</div><strong style={{fontSize:13}}>{selectedDL.ansprechpartner}</strong></div>}
                    {selectedDL.telefon&&<div><div style={{fontSize:11,color:'var(--gray-400)',marginBottom:2}}>Telefon</div><a href={'tel:'+selectedDL.telefon} style={{fontSize:13,fontWeight:600,color:'var(--navy)',textDecoration:'none'}}>{selectedDL.telefon}</a></div>}
                    {selectedDL.email&&<div><div style={{fontSize:11,color:'var(--gray-400)',marginBottom:2}}>E-Mail</div><a href={'mailto:'+selectedDL.email} style={{fontSize:13,fontWeight:600,color:'var(--navy)',textDecoration:'none'}}>{selectedDL.email}</a></div>}
                    {selectedDL.zahlungsziel_tage&&<div><div style={{fontSize:11,color:'var(--gray-400)',marginBottom:2}}>Zahlungsziel</div><strong style={{fontSize:13}}>{selectedDL.zahlungsziel_tage} Tage</strong></div>}
                  </div>
                  {selectedDL.notizen&&<div style={{marginTop:10,padding:10,background:'var(--gray-100)',borderRadius:'var(--radius)',fontSize:13}}>{selectedDL.notizen}</div>}
                  {dlHistorie.length>0&&(
                    <div style={{display:'flex',gap:16,marginTop:12,paddingTop:12,borderTop:'1px solid var(--gray-100)',fontSize:12}}>
                      <span style={{color:'var(--gray-400)'}}>Gesamt: <strong>{dlHistorie.reduce((s,h)=>s+Number(h.betrag||0),0).toLocaleString('de-DE')} EUR</strong></span>
                    </div>
                  )}
                </div>
                <div className="tabs" style={{marginBottom:12}}>
                  {[['historie','📋 Historie'],['preise','💶 Preisvergleich'],['dokumente','📎 Dokumente']].map(([k,l])=>(
                    <button key={k} className={'tab-btn'+((dlDetailTab||'historie')===k?' active':'')} onClick={()=>setDlDetailTab(k)}>{l}</button>
                  ))}
                </div>

                {(dlDetailTab||'historie')==='historie'&&(
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <strong style={{fontSize:14,color:'var(--navy)'}}>Historie ({dlHistorie.length})</strong>
                  <button className="btn btn-primary btn-sm" onClick={()=>{ setDlHForm({bezahlt:false,datum:new Date().toISOString().slice(0,10)}); setDlHModal(true) }}>+ Eintrag</button>
                </div>)}
                {(dlDetailTab||'historie')==='historie'&&dlHistorie.length===0 && <div className="empty-state card"><p>Noch keine Eintraege.</p></div>}
                {(dlDetailTab||'historie')==='historie'&&dlHistorie.length>0&&(
                  <div style={{display:'grid',gap:8}}>
                    {dlHistorie.map(h=>(
                      <div key={h.id} style={{padding:14,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:14}}>{h.beschreibung}</div>
                          <div style={{fontSize:12,color:'var(--gray-500)',marginTop:2}}>
                            {h.datum&&<span>{new Date(h.datum).toLocaleDateString('de-DE')}</span>}
                            {h.event_name&&<span style={{marginLeft:8}}>Event: <strong>{h.event_name}</strong></span>}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                          {h.betrag&&<strong style={{fontSize:15,color:'var(--navy)'}}>{Number(h.betrag).toLocaleString('de-DE')} EUR</strong>}
                          <span style={{fontSize:11,padding:'2px 10px',borderRadius:10,border:'1.5px solid',fontWeight:600,background:h.bezahlt?'#e2efda':'var(--white)',borderColor:h.bezahlt?'#3a8a5a':'var(--gray-200)',color:h.bezahlt?'#2d6b3a':'var(--gray-500)'}}>{h.bezahlt?'Bezahlt':'Offen'}</span>
                          <button className="btn btn-sm btn-outline" onClick={()=>{ setDlHForm(h); setDlHModal(true) }}>Bearb.</button>
                          <button className="btn btn-sm btn-danger" onClick={async()=>{ await supabase.from('dienstleister_historie').delete().eq('id',h.id); loadDLHistorie(selectedDL.id) }}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(dlDetailTab||'historie')==='preise'&&(
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <div>
                        <strong style={{fontSize:14,color:'var(--navy)'}}>Zugeordnete Artikel</strong>
                        <p style={{fontSize:12,color:'var(--gray-500)',marginTop:2}}>Waehle welche Artikel dieser Dienstleister anbietet.</p>
                      </div>
                      <button className="btn btn-outline btn-sm" onClick={()=>{setSelectedArtikel(null);setPreisModal(true)}}>Preisvergleich</button>
                    </div>

                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:12,fontWeight:600,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:8}}>Alle verfuegbaren Artikel</div>
                      <div style={{display:'grid',gap:6}}>
                        {dlArtikel.map(artikel=>{
                          const zugeordnet = dlArtikelZuordnung.find(a=>a.artikel_id===artikel.id)
                          return (
                            <div key={artikel.id} style={{padding:'10px 14px',border:'1.5px solid '+(zugeordnet?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',background:zugeordnet?'rgba(15,34,64,0.03)':'var(--white)'}}>
                              <div style={{display:'flex',alignItems:'center',gap:12}}>
                                <input type="checkbox" checked={!!zugeordnet} onChange={()=>toggleDLArtikel(selectedDL.id,artikel.id)}
                                  style={{width:18,height:18,cursor:'pointer',flexShrink:0}}/>
                                <div style={{flex:1}}>
                                  <div style={{fontWeight:600,fontSize:13}}>{artikel.name}</div>
                                  <div style={{fontSize:11,color:'var(--gray-400)'}}>{artikel.einheit}{artikel.kategorie?' · '+artikel.kategorie:''}</div>
                                </div>
                                {zugeordnet&&(
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <span style={{fontSize:13,fontWeight:700,color:'var(--navy)'}}>
                                      {zugeordnet.aktueller_preis?Number(zugeordnet.aktueller_preis).toLocaleString('de-DE')+' EUR':'Kein Preis'}
                                    </span>
                                    <button className="btn btn-sm btn-outline" style={{fontSize:11}} onClick={()=>{
                                      setSelectedDLArtikel(zugeordnet)
                                      setNeuerPreisForm({datum:new Date().toISOString().slice(0,10),menge:1,einheit:artikel.einheit})
                                      loadPreisHistorie(selectedDL.id,artikel.id)
                                      setNeuerPreisModal(true)
                                    }}>Preis + Historie</button>
                                  </div>
                                )}
                              </div>
                              {zugeordnet&&zugeordnet.notiz&&(
                                <div style={{fontSize:12,color:'var(--gray-500)',marginTop:6,paddingLeft:30,fontStyle:'italic'}}>{zugeordnet.notiz}</div>
                              )}
                            </div>
                          )
                        })}
                        {dlArtikel.length===0&&<div className="empty-state"><p>Keine Artikel. Im Tab "Artikel" anlegen.</p></div>}
                      </div>
                    </div>
                  </div>
                )}

                {(dlDetailTab||'historie')==='dokumente'&&(
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <strong style={{fontSize:14,color:'var(--navy)'}}>Dokumente & Links ({dlDokumente.length})</strong>
                      <button className="btn btn-primary btn-sm" onClick={()=>{ setDlDokForm({typ:'Dokument'}); setDlDokModal(true) }}>+ Dokument</button>
                    </div>
                    {dlDokumente.length===0 ? <div className="empty-state card"><p>Noch keine Dokumente.</p></div> : (
                      <div style={{display:'grid',gap:8}}>
                        {dlDokumente.map(d=>(
                          <div key={d.id} style={{padding:14,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',background:'var(--white)'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                              <div>
                                <div style={{fontWeight:600,fontSize:14}}>{d.name}</div>
                                <span style={{fontSize:11,background:'var(--gray-100)',color:'var(--gray-600)',padding:'1px 8px',borderRadius:10}}>{d.typ}</span>
                                {d.kommentar&&<div style={{fontSize:12,color:'var(--gray-500)',marginTop:4,fontStyle:'italic'}}>{d.kommentar}</div>}
                              </div>
                              <div style={{display:'flex',gap:6}}>
                                <button className="btn btn-sm btn-outline" onClick={()=>{ setDlDokForm(d); setDlDokModal(true) }}>Bearb.</button>
                                <button className="btn btn-sm btn-danger" onClick={async()=>{ await supabase.from('dienstleister_dokumente').delete().eq('id',d.id); loadDLDokumente(selectedDL.id) }}>X</button>
                              </div>
                            </div>
                            <a href={d.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:'var(--navy)',wordBreak:'break-all',textDecoration:'none',display:'block',padding:'6px 10px',background:'#f0f7ff',borderRadius:4,border:'1px solid #ddeaff'}}>{d.url.length>60?d.url.slice(0,60)+'...':d.url}</a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={eventModal} onClose={()=>setEventModal(false)} title={eventForm.id?'Event bearbeiten':'Neues Event'}
        footer={<><button className="btn btn-outline" onClick={()=>setEventModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveEvent} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></>}>
        <div className="form-group"><label>Name *</label><input value={eventForm.name||''} onChange={e=>setEventForm(f=>({...f,name:e.target.value}))} autoFocus/></div>
        <div className="form-row">
          <div className="form-group"><label>Datum</label><input type="date" value={eventForm.datum||''} onChange={e=>setEventForm(f=>({...f,datum:e.target.value}))}/></div>
          <div className="form-group" style={{position:'relative'}}>
            <label>Ort</label>
            <div style={{display:'flex',gap:8}}>
              <input value={eventForm.ort||''} onChange={e=>{ setEventForm(f=>({...f,ort:e.target.value,ort_id:null})); setOrtSuche(e.target.value); setZeigOrte(true) }}
                onFocus={()=>setZeigOrte(true)} placeholder="Ort eingeben..." style={{flex:1,padding:'10px 14px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:14}}/>
              <button type="button" className="btn btn-sm btn-outline" onClick={()=>{ setOrtForm({name:eventForm.ort||''}); setOrtModal(true) }}>+</button>
            </div>
            {zeigOrte&&orte.filter(o=>!ortSuche||o.name.toLowerCase().includes(ortSuche.toLowerCase())).length>0&&(
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',zIndex:10,boxShadow:'var(--shadow)',maxHeight:200,overflowY:'auto'}}>
                {orte.filter(o=>!ortSuche||o.name.toLowerCase().includes(ortSuche.toLowerCase())).map(o=>(
                  <div key={o.id} onClick={()=>{ setEventForm(f=>({...f,ort:o.name,ort_id:o.id})); setOrtSuche(''); setZeigOrte(false) }}
                    style={{padding:'10px 14px',cursor:'pointer',fontSize:14,borderBottom:'1px solid var(--gray-100)'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--gray-100)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    {o.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Art</label><select value={eventForm.art||'Networking-Event'} onChange={e=>setEventForm(f=>({...f,art:e.target.value}))}>{(eventArten.length>0?eventArten.map(e=>e.name):EVENT_TYPEN).map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label>Status</label><select value={eventForm.status||'Planung'} onChange={e=>setEventForm(f=>({...f,status:e.target.value}))}>{(eventStatus.length>0?eventStatus.map(e=>e.name):EVENT_STATUS).map(s=><option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Zustaendig</label><input value={eventForm.zustaendig||''} onChange={e=>setEventForm(f=>({...f,zustaendig:e.target.value}))}/></div>
          <div className="form-group"><label>Budget (EUR)</label><input type="number" value={eventForm.budget_gesamt||''} onChange={e=>setEventForm(f=>({...f,budget_gesamt:e.target.value}))}/></div>
        </div>
        <div className="form-group"><label>Praesentations-Link</label><input type="url" placeholder="https://..." value={eventForm.praesentation_link||''} onChange={e=>setEventForm(f=>({...f,praesentation_link:e.target.value}))}/></div>
        <div style={{background:'var(--gray-100)',borderRadius:'var(--radius)',padding:14,marginBottom:8}}>
          {[1,2,3].map(n=>(
            <div key={n} className="form-row" style={{marginBottom:8}}>
              <div className="form-group" style={{margin:0}}><label>Titel {n}</label><input value={eventForm[`dokument_titel_${n}`]||''} onChange={e=>setEventForm(f=>({...f,[`dokument_titel_${n}`]:e.target.value}))}/></div>
              <div className="form-group" style={{margin:0}}><label>Link {n}</label><input type="url" value={eventForm[`dokument_link_${n}`]||''} onChange={e=>setEventForm(f=>({...f,[`dokument_link_${n}`]:e.target.value}))}/></div>
            </div>
          ))}
        </div>
        <div className="form-group"><label style={{display:'flex',alignItems:'center',gap:10,textTransform:'none',fontSize:14,cursor:'pointer',padding:'8px 0'}}><input type="checkbox" style={{width:18,height:18,flexShrink:0}} checked={eventForm.einladung_versendet||false} onChange={e=>setEventForm(f=>({...f,einladung_versendet:e.target.checked}))}/>Einladung versendet</label></div>
      </Modal>

      <Modal open={ortModal} onClose={()=>setOrtModal(false)} title="Veranstaltungsort"
        footer={<><button className="btn btn-outline" onClick={()=>setOrtModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveOrt} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></>}>
        <div className="form-group"><label>Name *</label><input value={ortForm.name||''} onChange={e=>setOrtForm(f=>({...f,name:e.target.value}))} autoFocus/></div>
        <div className="form-group"><label>Strasse</label><input value={ortForm.adresse_strasse||''} onChange={e=>setOrtForm(f=>({...f,adresse_strasse:e.target.value}))}/></div>
        <div className="form-row"><div className="form-group"><label>PLZ</label><input value={ortForm.adresse_plz||''} onChange={e=>setOrtForm(f=>({...f,adresse_plz:e.target.value}))}/></div><div className="form-group"><label>Stadt</label><input value={ortForm.adresse_stadt||''} onChange={e=>setOrtForm(f=>({...f,adresse_stadt:e.target.value}))}/></div></div>
        <div className="form-group"><label>Kapazitaet</label><input type="number" value={ortForm.kapazitaet||''} onChange={e=>setOrtForm(f=>({...f,kapazitaet:e.target.value}))}/></div>
      </Modal>

      <Modal open={dlModal} onClose={()=>setDlModal(false)} title={dlForm.id?'Dienstleister bearbeiten':'Neuer Dienstleister'}
        footer={<><button className="btn btn-outline" onClick={()=>setDlModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveDL} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></>}>
        <div className="form-row"><div className="form-group"><label>Firma *</label><input value={dlForm.firma||''} onChange={e=>setDlForm(f=>({...f,firma:e.target.value}))} autoFocus/></div><div className="form-group"><label>Typ</label><select value={dlForm.typ||'Sonstiges'} onChange={e=>setDlForm(f=>({...f,typ:e.target.value}))}>{(dlTypen.length>0?dlTypen.map(d=>d.name):DL_TYPEN).map(t=><option key={t}>{t}</option>)}</select></div></div>
        <div className="form-row"><div className="form-group"><label>Ansprechpartner</label><input value={dlForm.ansprechpartner||''} onChange={e=>setDlForm(f=>({...f,ansprechpartner:e.target.value}))}/></div><div className="form-group"><label>Telefon</label><input value={dlForm.telefon||''} onChange={e=>setDlForm(f=>({...f,telefon:e.target.value}))}/></div></div>
        <div className="form-row"><div className="form-group"><label>E-Mail</label><input type="email" value={dlForm.email||''} onChange={e=>setDlForm(f=>({...f,email:e.target.value}))}/></div><div className="form-group"><label>Adresse</label><input value={dlForm.adresse||''} onChange={e=>setDlForm(f=>({...f,adresse:e.target.value}))}/></div></div>
        <div className="form-row"><div className="form-group"><label>Zahlungsbedingungen</label><input value={dlForm.zahlungsbedingungen||''} onChange={e=>setDlForm(f=>({...f,zahlungsbedingungen:e.target.value}))}/></div><div className="form-group"><label>Zahlungsziel (Tage)</label><select value={dlForm.zahlungsziel_tage||30} onChange={e=>setDlForm(f=>({...f,zahlungsziel_tage:parseInt(e.target.value)}))}>{[7,14,30,45,60].map(z=><option key={z} value={z}>{z} Tage</option>)}</select></div></div>
        <div className="form-group"><label>IBAN</label><input value={dlForm.iban||''} onChange={e=>setDlForm(f=>({...f,iban:e.target.value}))}/></div>
        <div className="form-group"><label>Notizen</label><textarea value={dlForm.notizen||''} onChange={e=>setDlForm(f=>({...f,notizen:e.target.value}))}/></div>
        <div className="form-group"><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}><input type="checkbox" checked={dlForm.aktiv!==false} onChange={e=>setDlForm(f=>({...f,aktiv:e.target.checked}))}/>Aktiv</label></div>
      </Modal>

      {preisModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setPreisModal(false)}>
          <div className="modal" style={{maxWidth:700}}>
            <div className="modal-header">
              <span className="modal-title">Preisvergleich - {selectedArtikel?.name||'Alle Artikel'}</span>
              <button className="close-btn" onClick={()=>setPreisModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Artikel auswaehlen</label>
                <select value={selectedArtikel?.id||''} onChange={e=>{ const a=dlArtikel.find(x=>x.id===e.target.value); setSelectedArtikel(a||null); if(a) loadPreisVergleich(a.id) }}>
                  <option value="">-- Artikel waehlen --</option>
                  {dlArtikel.map(a=><option key={a.id} value={a.id}>{a.name} ({a.einheit})</option>)}
                </select>
              </div>
              {selectedArtikel&&(
                <div>
                  {preisVergleich.length===0 ? <p style={{color:'var(--gray-400)',fontSize:13}}>Noch keine Preise fuer diesen Artikel.</p> : (
                    <div className="table-wrap"><table>
                      <thead><tr><th>Dienstleister</th><th>Typ</th><th style={{textAlign:'right'}}>Preis/{selectedArtikel.einheit}</th><th>Kommentar</th><th>Stand</th></tr></thead>
                      <tbody>
                        {[...preisVergleich].sort((a,b)=>(a.preis||999999)-(b.preis||999999)).map((p,i)=>(
                          <tr key={p.id} style={{background:i===0&&p.preis?'#e2efda':'inherit'}}>
                            <td><strong style={{fontSize:13}}>{p.dienstleister?.firma}</strong></td>
                            <td style={{fontSize:12,color:'var(--gray-500)'}}>{p.dienstleister?.typ}</td>
                            <td style={{textAlign:'right',fontWeight:700,color:i===0&&p.preis?'#2d6b3a':'inherit'}}>{p.preis?Number(p.preis).toLocaleString('de-DE')+' EUR':'–'}{i===0&&p.preis&&<span style={{marginLeft:6,fontSize:10,background:'#2d6b3a',color:'white',padding:'1px 6px',borderRadius:10}}>Guenstigster</span>}</td>
                            <td style={{fontSize:12,color:'var(--gray-500)'}}>{p.kommentar||'–'}</td>
                            <td style={{fontSize:11,color:'var(--gray-400)'}}>{p.zuletzt_aktualisiert?new Date(p.zuletzt_aktualisiert).toLocaleDateString('de-DE'):'–'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setPreisModal(false)}>Schliessen</button></div>
          </div>
        </div>
      )}

      {positionModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setPositionModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{positionForm.id?'Position bearbeiten':'Neue Position'}</span>
              <button className="close-btn" onClick={()=>setPositionModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Titel *</label><input value={positionForm.titel||''} onChange={e=>setPositionForm(f=>({...f,titel:e.target.value}))} autoFocus placeholder="z.B. Einlass, Catering, Ordner..."/></div>
                <div className="form-group"><label>Anzahl benötigt</label><input type="number" min="1" value={positionForm.anzahl_benoetigt||1} onChange={e=>setPositionForm(f=>({...f,anzahl_benoetigt:parseInt(e.target.value)||1}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rang</label>
                  <select value={positionForm.rang||'Helfer'} onChange={e=>setPositionForm(f=>({...f,rang:e.target.value}))}>
                    {RAENGE.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Erforderliche Fähigkeit</label>
                  <select value={positionForm.faehigkeit_id||''} onChange={e=>setPositionForm(f=>({...f,faehigkeit_id:e.target.value||null}))}>
                    <option value="">-- Keine --</option>
                    {faehigkeiten.map(fk=><option key={fk.id} value={fk.id}>{fk.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Beschreibung</label><textarea value={positionForm.beschreibung||''} onChange={e=>setPositionForm(f=>({...f,beschreibung:e.target.value}))} style={{minHeight:60}}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setPositionModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={savePosition} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {freiwilligerModal&&selectedPosition&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setFreiwilligerModal(false)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header">
              <span className="modal-title">Freiwilligen zuordnen: {selectedPosition.titel}</span>
              <button className="close-btn" onClick={()=>setFreiwilligerModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Person *</label>
                <select value={freiwilligerForm.freiwilliger_id||''} onChange={e=>setFreiwilligerForm(f=>({...f,freiwilliger_id:e.target.value}))}>
                  <option value="">-- Person wählen --</option>
                  {freiwillige
                    .filter(fw => {
                      if (!selectedPosition.faehigkeit_id) return true
                      return (fw.freiwillige_zu_faehigkeiten||[]).some(z=>z.faehigkeit_id===selectedPosition.faehigkeit_id)
                    })
                    .map(fw=>(
                      <option key={fw.id} value={fw.id}>{fw.vorname} {fw.nachname}</option>
                    ))}
                </select>
                {selectedPosition.faehigkeit_id&&<p style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>Gefiltert nach Fähigkeit: {faehigkeiten.find(f=>f.id===selectedPosition.faehigkeit_id)?.name}</p>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rang</label>
                  <select value={freiwilligerForm.rang||'Helfer'} onChange={e=>setFreiwilligerForm(f=>({...f,rang:e.target.value}))}>
                    {RAENGE.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={freiwilligerForm.status||'Angefragt'} onChange={e=>setFreiwilligerForm(f=>({...f,status:e.target.value}))}>
                    {EF_STATUS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Notiz</label><textarea value={freiwilligerForm.notiz||''} onChange={e=>setFreiwilligerForm(f=>({...f,notiz:e.target.value}))} style={{minHeight:60}} placeholder="z.B. braucht Einweisung, kommt erst ab 18 Uhr..."/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setFreiwilligerModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveFreiwilligerZuordnung} disabled={saving}>{saving?'Speichern...':'Zuordnen'}</button>
            </div>
          </div>
        </div>
      )}

      {inventarModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setInventarModal(false)}>
          <div className="modal" style={{maxWidth:680}}>
            <div className="modal-header">
              <span className="modal-title">{inventarForm.id?'Equipment bearbeiten':'Neues Equipment'}</span>
              <button className="close-btn" onClick={()=>setInventarModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group" style={{flex:2}}><label>Name *</label><input value={inventarForm.name||''} onChange={e=>setInventarForm(f=>({...f,name:e.target.value}))} autoFocus/></div>
                <div className="form-group"><label>Typ</label>
                  <select value={inventarForm.typ||'Gekauft'} onChange={e=>setInventarForm(f=>({...f,typ:e.target.value}))}>
                    {['Gekauft','Geliehen','Gesponsert','Sonstiges'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Menge</label><input type="number" min="1" value={inventarForm.menge||1} onChange={e=>setInventarForm(f=>({...f,menge:e.target.value}))}/></div>
                <div className="form-group"><label>Einheit</label>
                  <select value={inventarForm.einheit||'Stk'} onChange={e=>setInventarForm(f=>({...f,einheit:e.target.value}))}>
                    {['Stk','Set','Paar','Kiste','Palette','Rolle','m','kg'].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Zustand</label>
                  <select value={inventarForm.zustand||'Gut'} onChange={e=>setInventarForm(f=>({...f,zustand:e.target.value}))}>
                    {['Neu','Gut','Gebraucht','Defekt'].map(z=><option key={z}>{z}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Lagerort</label><input value={inventarForm.lagerort||''} onChange={e=>setInventarForm(f=>({...f,lagerort:e.target.value}))} placeholder="z.B. Keller Sportzentrum, Raum 3..."/></div>
              <div className="form-row">
                <div className="form-group"><label>Anschaffungsdatum</label><input type="date" value={inventarForm.anschaffungsdatum||''} onChange={e=>setInventarForm(f=>({...f,anschaffungsdatum:e.target.value}))}/></div>
                <div className="form-group"><label>Anschaffungspreis (EUR)</label><input type="number" value={inventarForm.anschaffungspreis||''} onChange={e=>setInventarForm(f=>({...f,anschaffungspreis:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label>Beschreibung</label><textarea value={inventarForm.beschreibung||''} onChange={e=>setInventarForm(f=>({...f,beschreibung:e.target.value}))} style={{minHeight:60}}/></div>
              <div className="form-group"><label>Notizen (intern)</label><textarea value={inventarForm.notizen||''} onChange={e=>setInventarForm(f=>({...f,notizen:e.target.value}))} style={{minHeight:60}} placeholder="Interne Notizen zu Zustand, Verleih, etc."/></div>
              <div className="form-group"><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}><input type="checkbox" checked={inventarForm.aktiv!==false} onChange={e=>setInventarForm(f=>({...f,aktiv:e.target.checked}))}/>Aktiv / verfügbar</label></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setInventarModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveInventar} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {vorlagenAnwenden&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setVorlagenAnwenden(false)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header">
              <span className="modal-title">Vorlage anwenden: {selectedEvent?.name}</span>
              <button className="close-btn" onClick={()=>setVorlagenAnwenden(false)}>x</button>
            </div>
            <div className="modal-body">
              {vorlagen.length===0 ? (
                <p style={{color:'var(--gray-400)',fontSize:13}}>Noch keine Vorlagen angelegt. Wechsle zum Inventar-Tab um Vorlagen zu erstellen.</p>
              ) : (
                <div style={{display:'grid',gap:10}}>
                  {vorlagen.map(v=>(
                    <div key={v.id} style={{padding:14,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                        <div>
                          <strong style={{fontSize:14}}>{v.name}</strong>
                          {v.beschreibung&&<div style={{fontSize:12,color:'var(--gray-500)'}}>{v.beschreibung}</div>}
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={()=>vorlageAnwenden(v)} disabled={saving}>
                          {saving?'...':'Anwenden'}
                        </button>
                      </div>
                      <div style={{display:'grid',gap:4}}>
                        {(v.inventar_vorlagen_positionen||[]).map((pos,i)=>(
                          <div key={i} style={{fontSize:12,color:'var(--gray-600)',padding:'4px 8px',background:'var(--gray-100)',borderRadius:4}}>
                            {pos.menge}x {pos.inventar?.name} {pos.notiz&&<span style={{color:'var(--gray-400)'}}>· {pos.notiz}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setVorlagenAnwenden(false)}>Schliessen</button>
            </div>
          </div>
        </div>
      )}

      {vorlagenModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setVorlagenModal(false)}>
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header">
              <span className="modal-title">{vorlagenForm.id?'Vorlage bearbeiten':'Neue Vorlage'}</span>
              <button className="close-btn" onClick={()=>setVorlagenModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Name *</label><input value={vorlagenForm.name||''} onChange={e=>setVorlagenForm(f=>({...f,name:e.target.value}))} autoFocus placeholder="z.B. Standard Heimspiel, Sponsoren-Abend..."/></div>
              <div className="form-group"><label>Beschreibung</label><input value={vorlagenForm.beschreibung||''} onChange={e=>setVorlagenForm(f=>({...f,beschreibung:e.target.value}))}/></div>
              <div style={{marginTop:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <strong style={{fontSize:13,color:'var(--navy)'}}>Equipment-Positionen</strong>
                  <button className="btn btn-sm btn-outline" onClick={()=>setVorlagenPositionen(p=>[...p,{inventar_id:'',menge:1,notiz:''}])}>+ Position</button>
                </div>
                <div style={{display:'grid',gap:8}}>
                  {vorlagenPositionen.map((pos,i)=>(
                    <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 80px 1fr auto',gap:8,alignItems:'center'}}>
                      <select value={pos.inventar_id||''} onChange={e=>setVorlagenPositionen(pp=>pp.map((p,j)=>j===i?{...p,inventar_id:e.target.value}:p))}>
                        <option value="">-- Equipment --</option>
                        {inventar.map(inv=><option key={inv.id} value={inv.id}>{inv.name}</option>)}
                      </select>
                      <input type="number" min="1" value={pos.menge||1} onChange={e=>setVorlagenPositionen(pp=>pp.map((p,j)=>j===i?{...p,menge:e.target.value}:p))} placeholder="Menge" style={{padding:'8px 10px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
                      <input value={pos.notiz||''} onChange={e=>setVorlagenPositionen(pp=>pp.map((p,j)=>j===i?{...p,notiz:e.target.value}:p))} placeholder="Notiz (optional)" style={{padding:'8px 10px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
                      <button onClick={()=>setVorlagenPositionen(pp=>pp.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:18,lineHeight:1,padding:'4px 8px'}}>×</button>
                    </div>
                  ))}
                  {vorlagenPositionen.length===0&&<p style={{fontSize:12,color:'var(--gray-400)'}}>Noch keine Positionen. Klicke "+ Position".</p>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setVorlagenModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveVorlage} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {inventarBuchungModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setInventarBuchungModal(false)}>
          <div className="modal" style={{maxWidth:580}}>
            <div className="modal-header">
              <span className="modal-title">Equipment einplanen für: {selectedEvent?.name}</span>
              <button className="close-btn" onClick={()=>setInventarBuchungModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Equipment *</label>
                <select value={inventarBuchungForm.inventar_id||''} onChange={e=>setInventarBuchungForm(f=>({...f,inventar_id:e.target.value}))}>
                  <option value="">-- Equipment wählen --</option>
                  {inventar.filter(i=>i.aktiv).map(i=>(
                    <option key={i.id} value={i.id}>{i.name} ({i.menge} {i.einheit} verfügbar{i.lagerort?' · '+i.lagerort:''})</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Menge benötigt</label><input type="number" min="1" value={inventarBuchungForm.menge||1} onChange={e=>setInventarBuchungForm(f=>({...f,menge:e.target.value}))}/></div>
                <div className="form-group"><label>Von</label><input type="date" value={inventarBuchungForm.datum_von||''} onChange={e=>setInventarBuchungForm(f=>({...f,datum_von:e.target.value}))}/></div>
                <div className="form-group"><label>Bis</label><input type="date" value={inventarBuchungForm.datum_bis||''} onChange={e=>setInventarBuchungForm(f=>({...f,datum_bis:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label>Notiz</label><textarea value={inventarBuchungForm.notiz||''} onChange={e=>setInventarBuchungForm(f=>({...f,notiz:e.target.value}))} style={{minHeight:60}} placeholder="z.B. Aufbau am Vortag, Abholung durch Thomas..."/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setInventarBuchungModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveInventarBuchung} disabled={saving}>{saving?'Speichern...':'Einplanen'}</button>
            </div>
          </div>
        </div>
      )}

      {artikelModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setArtikelModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{artikelForm.id?'Artikel bearbeiten':'Neuer Artikel'}</span>
              <button className="close-btn" onClick={()=>setArtikelModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input value={artikelForm.name||''} onChange={e=>setArtikelForm(f=>({...f,name:e.target.value}))} autoFocus/></div>
                <div className="form-group"><label>Einheit</label>
                  <select value={artikelForm.einheit||'Stk'} onChange={e=>setArtikelForm(f=>({...f,einheit:e.target.value}))}>
                    {['Stk','Std','Tag','Pauschal','m²','lfd. m','kg','Liter','Portion'].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Kategorie</label><input value={artikelForm.kategorie||''} onChange={e=>setArtikelForm(f=>({...f,kategorie:e.target.value}))} placeholder="z.B. Catering, Technik..."/></div>
                <div className="form-group"><label>Reihenfolge</label><input type="number" value={artikelForm.reihenfolge||0} onChange={e=>setArtikelForm(f=>({...f,reihenfolge:parseInt(e.target.value)||0}))}/></div>
              </div>
              <div className="form-group"><label>Beschreibung</label><textarea value={artikelForm.beschreibung||''} onChange={e=>setArtikelForm(f=>({...f,beschreibung:e.target.value}))}/></div>
              <div className="form-group"><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}><input type="checkbox" checked={artikelForm.aktiv!==false} onChange={e=>setArtikelForm(f=>({...f,aktiv:e.target.checked}))}/>Aktiv</label></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setArtikelModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveArtikel} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {neuerPreisModal&&selectedDLArtikel&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setNeuerPreisModal(false)}>
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header">
              <span className="modal-title">Preis erfassen: {selectedDLArtikel.dienstleistungsartikel?.name}</span>
              <button className="close-btn" onClick={()=>setNeuerPreisModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Preis (EUR) *</label><input type="number" step="0.01" value={neuerPreisForm.preis||''} onChange={e=>setNeuerPreisForm(f=>({...f,preis:e.target.value}))} autoFocus/></div>
                <div className="form-group"><label>Menge</label><input type="number" step="0.5" min="0.5" value={neuerPreisForm.menge||1} onChange={e=>setNeuerPreisForm(f=>({...f,menge:e.target.value}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Einheit</label>
                  <select value={neuerPreisForm.einheit||'Stk'} onChange={e=>setNeuerPreisForm(f=>({...f,einheit:e.target.value}))}>
                    {['Stk','Std','Tag','Pauschal','m²','lfd. m','kg','Liter','Portion'].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Datum</label><input type="date" value={neuerPreisForm.datum||''} onChange={e=>setNeuerPreisForm(f=>({...f,datum:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label>Kommentar</label><textarea value={neuerPreisForm.kommentar||''} onChange={e=>setNeuerPreisForm(f=>({...f,kommentar:e.target.value}))} placeholder="z.B. Staffelpreis ab 100 Stk, inkl. Lieferung..." style={{minHeight:60}}/></div>
              {preisHistorie.length>0&&(
                <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--gray-100)'}}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:8}}>Preishistorie</div>
                  <div style={{display:'grid',gap:6,maxHeight:200,overflowY:'auto'}}>
                    {preisHistorie.map(h=>(
                      <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'var(--gray-100)',borderRadius:'var(--radius)',fontSize:13}}>
                        <div>
                          <strong>{Number(h.preis).toLocaleString('de-DE')} EUR</strong>
                          <span style={{marginLeft:8,color:'var(--gray-500)'}}>fuer {h.menge} {h.einheit}</span>
                          {h.kommentar&&<div style={{fontSize:11,color:'var(--gray-400)',fontStyle:'italic'}}>{h.kommentar}</div>}
                        </div>
                        <div style={{fontSize:11,color:'var(--gray-400)',textAlign:'right'}}>
                          {new Date(h.datum).toLocaleDateString('de-DE')}
                          <button onClick={async()=>{await supabase.from('dienstleister_preis_historie').delete().eq('id',h.id);loadPreisHistorie(selectedDL.id,selectedDLArtikel.artikel_id)}}
                            style={{marginLeft:8,background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:12}}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setNeuerPreisModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveNeuerPreis} disabled={saving}>{saving?'Speichern...':'Preis speichern'}</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={dlDokModal} onClose={()=>setDlDokModal(false)} title={dlDokForm.id?'Dokument bearbeiten':'Neues Dokument'}
        footer={<><button className="btn btn-outline" onClick={()=>setDlDokModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveDLDok} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></>}>
        <div className="form-row"><div className="form-group"><label>Name *</label><input value={dlDokForm.name||''} onChange={e=>setDlDokForm(f=>({...f,name:e.target.value}))} autoFocus/></div><div className="form-group"><label>Typ</label><select value={dlDokForm.typ||'Dokument'} onChange={e=>setDlDokForm(f=>({...f,typ:e.target.value}))}>{['Angebot','Vertrag','Rechnung','Preisliste','Dokument','Bild','Sonstiges'].map(t=><option key={t}>{t}</option>)}</select></div></div>
        <div className="form-group"><label>URL *</label><input type="url" value={dlDokForm.url||''} onChange={e=>setDlDokForm(f=>({...f,url:e.target.value}))} placeholder="https://..."/></div>
        <div className="form-group"><label>Kommentar</label><textarea value={dlDokForm.kommentar||''} onChange={e=>setDlDokForm(f=>({...f,kommentar:e.target.value}))} style={{minHeight:60}}/></div>
      </Modal>

      <Modal open={dlHModal} onClose={()=>setDlHModal(false)} title={dlHForm.id?'Eintrag bearbeiten':'Neuer Eintrag'}
        footer={<><button className="btn btn-outline" onClick={()=>setDlHModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveDLHistorie} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></>}>
        <div className="form-group"><label>Beschreibung *</label><input value={dlHForm.beschreibung||''} onChange={e=>setDlHForm(f=>({...f,beschreibung:e.target.value}))} autoFocus/></div>
        <div className="form-row"><div className="form-group"><label>Datum</label><input type="date" value={dlHForm.datum||''} onChange={e=>setDlHForm(f=>({...f,datum:e.target.value}))}/></div><div className="form-group"><label>Betrag (EUR)</label><input type="number" value={dlHForm.betrag||''} onChange={e=>setDlHForm(f=>({...f,betrag:e.target.value}))}/></div></div>
        <div className="form-row"><div className="form-group"><label>Event</label><input value={dlHForm.event_name||''} onChange={e=>setDlHForm(f=>({...f,event_name:e.target.value}))}/></div><div className="form-group"><label>Rechnungsnr.</label><input value={dlHForm.rechnung_nr||''} onChange={e=>setDlHForm(f=>({...f,rechnung_nr:e.target.value}))}/></div></div>
        <div className="form-group"><label>Notiz</label><textarea value={dlHForm.notiz||''} onChange={e=>setDlHForm(f=>({...f,notiz:e.target.value}))}/></div>
        <div className="form-group"><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}><input type="checkbox" checked={dlHForm.bezahlt||false} onChange={e=>setDlHForm(f=>({...f,bezahlt:e.target.checked}))}/>Bereits bezahlt</label></div>
      </Modal>
    </main>
  )
}

function KostenDashboard({ events, alleKosten, kostenKategorien, dienstleister }) {
  const perKat = kostenKategorien.map(kat => {
    const items = alleKosten.filter(k => k.kategorie === kat.name)
    return { ...kat, geplant: items.reduce((s,k)=>s+Number(k.betrag_geplant||0),0), tatsaechlich: items.reduce((s,k)=>s+Number(k.betrag_tatsaechlich||0),0), anzahl: items.length }
  }).filter(k => k.anzahl > 0)
  const perEvent = events.map(e => {
    const items = alleKosten.filter(k => k.event_id === e.id)
    return { ...e, geplant: items.reduce((s,k)=>s+Number(k.betrag_geplant||0),0), tatsaechlich: items.reduce((s,k)=>s+Number(k.betrag_tatsaechlich||0),0), anzahl: items.length }
  }).filter(e => e.anzahl > 0).sort((a,b) => b.geplant - a.geplant)
  const gesamtGeplant = alleKosten.reduce((s,k)=>s+Number(k.betrag_geplant||0),0)
  const gesamtTats = alleKosten.reduce((s,k)=>s+Number(k.betrag_tatsaechlich||0),0)
  const maxBetrag = Math.max(...perEvent.map(e=>e.geplant), 1)

  return (
    <div>
      <div className="stats-row" style={{marginBottom:20}}>
        <div className="stat-card blue"><div className="stat-num" style={{fontSize:20}}>{perEvent.length}</div><div className="stat-label">Events mit Kosten</div></div>
        <div className="stat-card gold"><div className="stat-num" style={{fontSize:18}}>{gesamtGeplant.toLocaleString('de-DE')} EUR</div><div className="stat-label">Geplant gesamt</div></div>
        <div className="stat-card" style={{background:gesamtTats>gesamtGeplant?'#fff5f5':'#f0f9f4'}}><div className="stat-num" style={{fontSize:18,color:gesamtTats>gesamtGeplant?'var(--red)':'var(--green)'}}>{gesamtTats.toLocaleString('de-DE')} EUR</div><div className="stat-label">Tatsaechlich gesamt</div></div>
        <div className="stat-card"><div className="stat-num" style={{fontSize:20}}>{alleKosten.filter(k=>k.bezahlt).length}/{alleKosten.length}</div><div className="stat-label">Bezahlt</div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <div className="card">
          <div className="section-title" style={{marginBottom:16}}>Kosten pro Event</div>
          {perEvent.length===0 ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Noch keine Daten.</p> : (
            <div style={{display:'grid',gap:10}}>
              {perEvent.map(e=>(
                <div key={e.id} style={{padding:'10px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:600,color:'var(--navy)'}}>{e.name}</span>
                    <span style={{fontSize:13,fontWeight:700}}>{e.geplant.toLocaleString('de-DE')} EUR</span>
                  </div>
                  <div style={{height:6,background:'var(--gray-100)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:(e.geplant/maxBetrag*100)+'%',background:'#0f2240',borderRadius:3}}/>
                  </div>
                  {e.tatsaechlich>0&&<div style={{fontSize:11,color:e.tatsaechlich>e.geplant?'var(--red)':'var(--green)',marginTop:4,textAlign:'right'}}>Tatsaechlich: {e.tatsaechlich.toLocaleString('de-DE')} EUR</div>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="section-title" style={{marginBottom:16}}>Kosten nach Kategorie</div>
          {perKat.length===0 ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Noch keine Daten.</p> : (
            <div style={{display:'grid',gap:8}}>
              {perKat.sort((a,b)=>b.geplant-a.geplant).map(kat=>(
                <div key={kat.id||kat.name} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)'}}>
                  <div style={{width:12,height:12,borderRadius:'50%',background:kat.farbe||'#ccc',flexShrink:0}}/>
                  <div style={{flex:1,fontSize:13,fontWeight:500}}>{kat.name}</div>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--navy)'}}>{kat.geplant.toLocaleString('de-DE')} EUR</div>
                  <div style={{fontSize:11,color:'var(--gray-400)'}}>{kat.anzahl}x</div>
                </div>
              ))}
              <div style={{padding:'10px 12px',background:'#0f2240',color:'white',borderRadius:'var(--radius)',display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:13,fontWeight:600}}>Gesamt</span>
                <span style={{fontSize:13,fontWeight:700,color:'#c8a84b'}}>{gesamtGeplant.toLocaleString('de-DE')} EUR</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="section-title" style={{marginBottom:12}}>Alle Kostenpositionen</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Event</th><th>Kategorie</th><th>Bezeichnung</th><th>Dienstleister</th><th style={{textAlign:'right'}}>Geplant</th><th style={{textAlign:'right'}}>Tatsaechlich</th><th>Bezahlt</th></tr></thead>
            <tbody>
              {alleKosten.length===0&&<tr><td colSpan="7"><div className="empty-state"><p>Keine Daten.</p></div></td></tr>}
              {alleKosten.map(k=>{
                const ev=events.find(e=>e.id===k.event_id)
                const dl=dienstleister.find(d=>d.id===k.dienstleister_id)
                return (
                  <tr key={k.id}>
                    <td style={{fontSize:12,color:'var(--navy)',fontWeight:500}}>{ev?.name||'-'}</td>
                    <td><span style={{fontSize:11,fontWeight:600,background:'var(--gray-100)',color:'var(--gray-600)',padding:'1px 7px',borderRadius:10}}>{k.kategorie||'-'}</span></td>
                    <td style={{fontSize:13}}>{k.bezeichnung}</td>
                    <td style={{fontSize:12,color:'var(--gray-500)'}}>{dl?.firma||k.anbieter||'-'}</td>
                    <td style={{textAlign:'right',fontWeight:600}}>{Number(k.betrag_geplant||0).toLocaleString('de-DE')} EUR</td>
                    <td style={{textAlign:'right',fontWeight:600,color:k.betrag_tatsaechlich>k.betrag_geplant?'var(--red)':'var(--green)'}}>{k.betrag_tatsaechlich!=null?Number(k.betrag_tatsaechlich).toLocaleString('de-DE')+' EUR':'-'}</td>
                    <td><span style={{fontSize:11,padding:'1px 7px',borderRadius:10,fontWeight:600,background:k.bezahlt?'#e2efda':'#fff3cd',color:k.bezahlt?'#2d6b3a':'#8a6a00'}}>{k.bezahlt?'Ja':'Offen'}</span></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{background:'var(--gray-100)',fontWeight:700}}>
                <td colSpan="4">Gesamt</td>
                <td style={{textAlign:'right'}}>{gesamtGeplant.toLocaleString('de-DE')} EUR</td>
                <td style={{textAlign:'right',color:gesamtTats>gesamtGeplant?'var(--red)':'var(--green)'}}>{gesamtTats.toLocaleString('de-DE')} EUR</td>
                <td>{alleKosten.filter(k=>k.bezahlt).length}/{alleKosten.length} bezahlt</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
