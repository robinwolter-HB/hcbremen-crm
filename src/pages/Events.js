import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TEILNAHME_STATUS = ['Eingeladen','Zugesagt','Abgesagt','Offen','Erschienen','Nicht erschienen']
const STATUS_COLORS = {
  'Eingeladen': { bg:'#ddeaff', color:'#1a4a8a' },
  'Zugesagt': { bg:'#e2efda', color:'#2d6b3a' },
  'Abgesagt': { bg:'#fce4d6', color:'#8a3a1a' },
  'Offen': { bg:'#fff3cd', color:'#8a6a00' },
  'Erschienen': { bg:'#c6efce', color:'#1a5a2a' },
  'Nicht erschienen': { bg:'#ececec', color:'#555' },
}
const EVENT_TYPEN = ['Networking-Event','Heimspiel','Sponsoren-Abend','Sponsoren-Meeting','Turnier','Training','Pressekonferenz','Praesentation','Sonstiges']
const EVENT_STATUS = ['Planung','Bestaetigt','Laufend','Abgeschlossen','Abgesagt']
const TODO_STATUS = ['Offen','In Bearbeitung','Erledigt']
const TODO_PRIO = ['Niedrig','Normal','Hoch','Dringend']
const KOSTEN_KAT = ['Location','Catering','Technik','Marketing','Personal','Transport','Druck','Sonstiges']
const DATEI_TYPEN = ['Google Drive','Dropbox','Praesentation','Dokument','Bild','Extern','Sonstiges']

function fmt(d) { return d ? new Date(d).toLocaleDateString('de-DE') : '-' }
function fmtLang(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'long', year:'numeric' })
}
function prioColor(p) { return { 'Niedrig':'#9a9590','Normal':'#2d6fa3','Hoch':'#e07b30','Dringend':'#d94f4f' }[p] || '#555' }
function todoStatusColor(s) { return { 'Offen':{ bg:'#ddeaff',color:'#1a4a8a' },'In Bearbeitung':{ bg:'#fff3cd',color:'#8a6a00' },'Erledigt':{ bg:'#e2efda',color:'#2d6b3a' } }[s] || { bg:'#ececec',color:'#555' } }
function evStatusColor(s) { return { 'Planung':{ bg:'#ddeaff',color:'#1a4a8a' },'Bestaetigt':{ bg:'#e2efda',color:'#2d6b3a' },'Laufend':{ bg:'#fff3cd',color:'#8a6a00' },'Abgeschlossen':{ bg:'#ececec',color:'#555' },'Abgesagt':{ bg:'#fce4d6',color:'#8a3a1a' } }[s] || { bg:'#ececec',color:'#555' } }

export default function Events() {
  const [events, setEvents] = useState([])
  const [personen, setPersonen] = useState([])
  const [kontakte, setKontakte] = useState([])
  const [orte, setOrte] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [detailTab, setDetailTab] = useState('teilnehmer')
  const [statusFilter, setStatusFilter] = useState('')

  // Event Modal
  const [eventModal, setEventModal] = useState(false)
  const [eventForm, setEventForm] = useState({})
  const [ortSuche, setOrtSuche] = useState('')
  const [zeigOrtSuche, setZeigOrtSuche] = useState(false)
  const [ortModal, setOrtModal] = useState(false)
  const [ortForm, setOrtForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Teilnehmer
  const [teilnahmen, setTeilnahmen] = useState([])
  const [teilnahmeModal, setTeilnahmeModal] = useState(false)
  const [tForm, setTForm] = useState({})
  const [kontaktAnsprechpartner, setKontaktAnsprechpartner] = useState([])

  // Neue Features
  const [todos, setTodos] = useState([])
  const [ablauf, setAblauf] = useState([])
  const [dateien, setDateien] = useState([])
  const [kosten, setKosten] = useState([])

  const [todoModal, setTodoModal] = useState(false)
  const [todoForm, setTodoForm] = useState({})
  const [ablaufModal, setAblaufModal] = useState(false)
  const [ablaufForm, setAblaufForm] = useState({})
  const [dateiModal, setDateiModal] = useState(false)
  const [dateiForm, setDateiForm] = useState({})
  const [kostenModal, setKostenModal] = useState(false)
  const [kostenForm, setKostenForm] = useState({})
  const [dienstleister, setDienstleister] = useState([])
  const [kostenKategorien, setKostenKategorien] = useState([])
  const [alleKosten, setAlleKosten] = useState([])
  const [dlModal, setDlModal] = useState(false)
  const [dlForm, setDlForm] = useState({})
  const [dlHistorieModal, setDlHistorieModal] = useState(false)
  const [dlHForm, setDlHForm] = useState({})
  const [selectedDL, setSelectedDL] = useState(null)
  const [dlHistorie, setDlHistorie] = useState([])
  const [dlSearch, setDlSearch] = useState('')
  const [dlTypFilter, setDlTypFilter] = useState('')
  const [hauptTab, setHauptTab] = useState('events')

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (selectedEvent) loadDetails(selectedEvent.id) }, [selectedEvent])

  async function loadAll() {
    const [{ data: e }, { data: k }, { data: o }, { data: p }, { data: dl }, { data: kkat }, { data: ak }] = await Promise.all([
      supabase.from('veranstaltungen').select('*').order('datum', { ascending: false }),
      supabase.from('kontakte').select('id,firma,ist_ev,logo_url').order('firma'),
      supabase.from('veranstaltungsorte').select('*').order('name'),
      supabase.from('personen').select('*').eq('aktiv', true).order('name'),
      supabase.from('dienstleister').select('id,firma,typ').eq('aktiv', true).order('firma'),
      supabase.from('kosten_kategorien').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('event_kosten').select('*').order('erstellt_am'),
    ])
    setEvents(e || [])
    setKontakte(k || [])
    setOrte(o || [])
    setPersonen(p || [])
    setDienstleister(dl || [])
    setKostenKategorien(kkat || [])
    setAlleKosten(ak || [])
    setLoading(false)
  }

  async function loadDetails(id) {
    const [{ data: t }, { data: ab }, { data: d }, { data: k }] = await Promise.all([
      supabase.from('veranstaltung_teilnahme').select('*,kontakte(id,firma,logo_url)').eq('veranstaltung_id', id),
      supabase.from('event_ablauf').select('*').eq('event_id', id).order('reihenfolge'),
      supabase.from('event_dateien').select('*').eq('event_id', id).order('erstellt_am'),
      supabase.from('event_kosten').select('*').eq('event_id', id).order('erstellt_am'),
    ])
    setTeilnahmen(t || [])
    setAblauf(ab || [])
    setDateien(d || [])
    setKosten(k || [])

    // Todos aus event_todos falls Tabelle existiert
    try {
      const { data: todos } = await supabase.from('event_todos').select('*').eq('event_id', id).order('erstellt_am')
      setTodos(todos || [])
    } catch { setTodos([]) }
  }

  // ---- EVENTS ----
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
      setSelectedEvent(ev => ({ ...ev, ...payload, id: eventForm.id }))
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

  // ---- VERANSTALTUNGSORT ----
  async function saveOrt() {
    if (!ortForm.name?.trim()) return
    setSaving(true)
    const payload = { name:ortForm.name, adresse_strasse:ortForm.adresse_strasse||null, adresse_plz:ortForm.adresse_plz||null, adresse_stadt:ortForm.adresse_stadt||null, kapazitaet:ortForm.kapazitaet||null, notiz:ortForm.notiz||null }
    let savedOrt
    if (ortForm.id) {
      await supabase.from('veranstaltungsorte').update(payload).eq('id', ortForm.id)
      savedOrt = { ...ortForm, ...payload }
    } else {
      const { data } = await supabase.from('veranstaltungsorte').insert(payload).select().single()
      savedOrt = data
    }
    setOrtModal(false); setSaving(false)
    const { data: o } = await supabase.from('veranstaltungsorte').select('*').order('name')
    setOrte(o || [])
    if (savedOrt) { setEventForm(f => ({ ...f, ort: savedOrt.name, ort_id: savedOrt.id })); setZeigOrtSuche(false) }
  }

  // ---- TEILNEHMER ----
  async function loadAnsprechpartner(kontaktId) {
    if (!kontaktId) { setKontaktAnsprechpartner([]); return }
    const { data } = await supabase.from('ansprechpartner').select('*').eq('kontakt_id', kontaktId)
    setKontaktAnsprechpartner(data || [])
    const haupt = data?.find(a => a.hauptansprechpartner)
    if (haupt) setTForm(f => ({ ...f, ansprechpartner_name: haupt.name, ansprechpartner_email: haupt.email||'', ansprechpartner_position: haupt.position||'' }))
    else setTForm(f => ({ ...f, ansprechpartner_name:'', ansprechpartner_email:'', ansprechpartner_position:'' }))
  }

  async function saveTeilnahme() {
    if (!tForm.kontakt_id || !selectedEvent) return
    setSaving(true)
    const payload = { kontakt_id:tForm.kontakt_id, veranstaltung_id:selectedEvent.id, ansprechpartner_name:tForm.ansprechpartner_name||'', ansprechpartner_email:tForm.ansprechpartner_email||'', ansprechpartner_position:tForm.ansprechpartner_position||'', status:tForm.status||'Eingeladen', notiz:tForm.notiz||'', teilgenommen:tForm.status==='Erschienen' }
    if (tForm.id) await supabase.from('veranstaltung_teilnahme').update(payload).eq('id', tForm.id)
    else await supabase.from('veranstaltung_teilnahme').insert(payload)
    setTeilnahmeModal(false); setSaving(false); loadDetails(selectedEvent.id)
  }

  async function updateTeilnahmeStatus(id, status) {
    await supabase.from('veranstaltung_teilnahme').update({ status, teilgenommen: status==='Erschienen' }).eq('id', id)
    loadDetails(selectedEvent.id)
  }

  async function deleteTeilnahme(id) {
    if (!window.confirm('Teilnehmer entfernen?')) return
    await supabase.from('veranstaltung_teilnahme').delete().eq('id', id)
    loadDetails(selectedEvent.id)
  }

  async function saveNotizen(val) {
    if (!selectedEvent) return
    await supabase.from('veranstaltungen').update({ notizen: val }).eq('id', selectedEvent.id)
    setSelectedEvent(e => ({ ...e, notizen: val }))
  }

  async function saveAgenda(val) {
    if (!selectedEvent) return
    await supabase.from('veranstaltungen').update({ agenda: val }).eq('id', selectedEvent.id)
    setSelectedEvent(e => ({ ...e, agenda: val }))
  }

  // ---- TODOS ----
  async function saveTodo() {
    if (!todoForm.titel?.trim()) return
    setSaving(true)
    const payload = { event_id:selectedEvent.id, titel:todoForm.titel, beschreibung:todoForm.beschreibung||null, zugewiesen_an:todoForm.zugewiesen_an||null, faellig_am:todoForm.faellig_am||null, status:todoForm.status||'Offen', prioritaet:todoForm.prioritaet||'Normal' }
    if (todoForm.id) await supabase.from('event_todos').update(payload).eq('id', todoForm.id)
    else await supabase.from('event_todos').insert(payload)
    setTodoModal(false); setSaving(false); loadDetails(selectedEvent.id)
  }

  async function toggleTodoStatus(todo) {
    const next = todo.status==='Offen'?'In Bearbeitung':todo.status==='In Bearbeitung'?'Erledigt':'Offen'
    await supabase.from('event_todos').update({ status: next }).eq('id', todo.id)
    loadDetails(selectedEvent.id)
  }

  // ---- ABLAUF ----
  async function saveAblauf() {
    if (!ablaufForm.titel?.trim()) return
    setSaving(true)
    const payload = { event_id:selectedEvent.id, uhrzeit:ablaufForm.uhrzeit||null, titel:ablaufForm.titel, beschreibung:ablaufForm.beschreibung||null, verantwortlich:ablaufForm.verantwortlich||null, benoetigt:ablaufForm.benoetigt||null, reihenfolge:ablaufForm.reihenfolge||ablauf.length }
    if (ablaufForm.id) await supabase.from('event_ablauf').update(payload).eq('id', ablaufForm.id)
    else await supabase.from('event_ablauf').insert(payload)
    setAblaufModal(false); setSaving(false); loadDetails(selectedEvent.id)
  }

  // ---- DATEIEN ----
  async function saveDatei() {
    if (!dateiForm.name?.trim() || !dateiForm.url?.trim()) return
    setSaving(true)
    const payload = { event_id:selectedEvent.id, name:dateiForm.name, url:dateiForm.url, typ:dateiForm.typ||'Link' }
    if (dateiForm.id) await supabase.from('event_dateien').update(payload).eq('id', dateiForm.id)
    else await supabase.from('event_dateien').insert(payload)
    setDateiModal(false); setSaving(false); loadDetails(selectedEvent.id)
  }

  // ---- KOSTEN ----
  async function saveKosten() {
    if (!kostenForm.bezeichnung?.trim()) return
    setSaving(true)
    const payload = { event_id:selectedEvent.id, kategorie:kostenForm.kategorie||'Sonstiges', kategorie_id:kostenForm.kategorie_id||null, bezeichnung:kostenForm.bezeichnung, betrag_geplant:kostenForm.betrag_geplant||0, betrag_tatsaechlich:kostenForm.betrag_tatsaechlich||null, anbieter:kostenForm.anbieter||null, dienstleister_id:kostenForm.dienstleister_id||null, rechnung_nr:kostenForm.rechnung_nr||null, notiz:kostenForm.notiz||null, bezahlt:kostenForm.bezahlt||false }
    if (kostenForm.id) await supabase.from('event_kosten').update(payload).eq('id', kostenForm.id)
    else await supabase.from('event_kosten').insert(payload)
    setKostenModal(false); setSaving(false); loadDetails(selectedEvent.id)
  }

  // ---- PDF EXPORT ----
  function exportPDF() {
    if (!selectedEvent) return
    const geplanteKosten = kosten.reduce((s,k) => s+Number(k.betrag_geplant||0), 0)
    const tatsaechlicheKosten = kosten.reduce((s,k) => s+Number(k.betrag_tatsaechlich||0), 0)

    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>Ablaufplan - ${selectedEvent.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1816; }
  @page { margin: 15mm; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .header { background: #0f2240; color: white; padding: 24px 32px; margin-bottom: 24px; }
  .header h1 { font-size: 18pt; font-weight: 700; }
  .header-meta { margin-top: 8px; font-size: 10pt; opacity: 0.8; }
  h2 { font-size: 13pt; font-weight: 700; color: #0f2240; margin: 20px 0 10px; padding-bottom: 4px; border-bottom: 2px solid #0f2240; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  thead tr { background: #0f2240; color: white; }
  th { padding: 7px 10px; text-align: left; font-size: 9pt; text-transform: uppercase; }
  td { padding: 7px 10px; border-bottom: 1px solid #e0ddd6; font-size: 10pt; vertical-align: top; }
  tr:nth-child(even) td { background: #f8f5ef; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9pt; font-weight: 600; }
  .stats { display: flex; gap: 16px; margin: 12px 0; flex-wrap: wrap; }
  .stat { text-align: center; padding: 10px 16px; background: #f8f5ef; border-radius: 6px; }
  .stat-num { font-size: 20pt; font-weight: 700; color: #0f2240; }
  .stat-label { font-size: 9pt; color: #9a9590; text-transform: uppercase; }
  .todo-row { display: flex; gap: 10px; padding: 7px 0; border-bottom: 1px solid #f0ede8; }
  .check { width: 16px; height: 16px; border: 2px solid #0f2240; border-radius: 3px; flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center; font-size: 8pt; }
  .check.done { background: #3a8a5a; border-color: #3a8a5a; color: white; }
  .richtext { background: #f8f5ef; padding: 14px; border-radius: 6px; font-size: 10.5pt; line-height: 1.7; }
  .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e0ddd6; font-size: 8pt; color: #9a9590; display: flex; justify-content: space-between; }
</style></head><body>

<div class="header">
  <h1>${selectedEvent.name}</h1>
  <div class="header-meta">
    ${fmtLang(selectedEvent.datum)}
    ${selectedEvent.ort ? ' &middot; ' + selectedEvent.ort : ''}
    ${selectedEvent.zustaendig ? ' &middot; Zustaendig: ' + selectedEvent.zustaendig : ''}
    &middot; Status: ${selectedEvent.status || 'Planung'}
  </div>
</div>

${teilnahmen.length > 0 ? `
<h2>Teilnehmer (${teilnahmen.length})</h2>
<div class="stats">
  ${TEILNAHME_STATUS.map(s => { const c = teilnahmen.filter(t=>t.status===s).length; return c>0?`<div class="stat"><div class="stat-num">${c}</div><div class="stat-label">${s}</div></div>`:'' }).join('')}
</div>
<table>
  <thead><tr><th>Name</th><th>Firma</th><th>Position</th><th>Status</th></tr></thead>
  <tbody>
    ${[...teilnahmen].sort((a,b)=>{ const o=TEILNAHME_STATUS; return o.indexOf(a.status)-o.indexOf(b.status) }).map(t=>`
    <tr><td>${t.ansprechpartner_name||'-'}</td><td>${t.kontakte?.firma||'-'}</td><td>${t.ansprechpartner_position||'-'}</td><td>${t.status}</td></tr>`).join('')}
  </tbody>
</table>` : ''}

${ablauf.length > 0 ? `
<h2>Interner Ablaufplan</h2>
<table>
  <thead><tr><th style="width:70px">Uhrzeit</th><th>Programmpunkt</th><th style="width:130px">Verantwortlich</th><th style="width:140px">Benoetigt</th></tr></thead>
  <tbody>
    ${ablauf.map(a=>`<tr><td style="font-weight:700;color:#0f2240">${a.uhrzeit||''}</td><td><strong>${a.titel}</strong>${a.beschreibung?'<br><span style="font-size:9pt;color:#9a9590">'+a.beschreibung+'</span>':''}</td><td style="color:#2d6fa3">${a.verantwortlich||'-'}</td><td style="font-size:9pt;color:#5a5650">${a.benoetigt||''}</td></tr>`).join('')}
  </tbody>
</table>` : ''}

${todos.length > 0 ? `
<h2>ToDos & Aufgaben</h2>
${todos.map(t=>`<div class="todo-row"><div class="check ${t.status==='Erledigt'?'done':''}">${t.status==='Erledigt'?'OK':''}</div><div style="flex:1"><strong>${t.titel}</strong>${t.beschreibung?'<br><span style="font-size:9pt;color:#9a9590">'+t.beschreibung+'</span>':''}<br><span style="font-size:9pt;color:#9a9590">${t.zugewiesen_an?'Zugewiesen: '+t.zugewiesen_an+' | ':''}${t.faellig_am?'Faellig: '+fmt(t.faellig_am)+' | ':''}Status: ${t.status} | Prioritaet: ${t.prioritaet}</span></div></div>`).join('')}` : ''}

${kosten.length > 0 ? `
<h2>Kostenuebersicht</h2>
<table>
  <thead><tr><th>Kategorie</th><th>Bezeichnung</th><th>Anbieter</th><th style="text-align:right">Geplant</th><th style="text-align:right">Tatsaechlich</th><th>Bezahlt</th></tr></thead>
  <tbody>
    ${kosten.map(k=>`<tr><td style="color:#2d6fa3;font-weight:600">${k.kategorie}</td><td>${k.bezeichnung}</td><td>${k.anbieter||'-'}</td><td style="text-align:right;font-weight:600">${Number(k.betrag_geplant||0).toLocaleString('de-DE')} EUR</td><td style="text-align:right;color:${k.betrag_tatsaechlich>k.betrag_geplant?'#d94f4f':'#3a8a5a'};font-weight:600">${k.betrag_tatsaechlich!==null?Number(k.betrag_tatsaechlich).toLocaleString('de-DE')+' EUR':'-'}</td><td>${k.bezahlt?'Ja':'Nein'}</td></tr>`).join('')}
    <tr style="background:#f8f5ef;font-weight:700"><td colspan="3">Gesamt</td><td style="text-align:right">${geplanteKosten.toLocaleString('de-DE')} EUR</td><td style="text-align:right">${tatsaechlicheKosten.toLocaleString('de-DE')} EUR</td><td></td></tr>
  </tbody>
</table>` : ''}

${selectedEvent.agenda ? `<h2>Agenda</h2><div class="richtext">${selectedEvent.agenda}</div>` : ''}
${selectedEvent.notizen ? `<h2>Notizen & Nachbereitung</h2><div class="richtext">${selectedEvent.notizen}</div>` : ''}

${(selectedEvent.praesentation_link||[1,2,3].some(n=>selectedEvent[`dokument_link_${n}`])) ? `
<h2>Links & Dokumente</h2>
<table><thead><tr><th>Bezeichnung</th><th>Link</th></tr></thead><tbody>
${selectedEvent.praesentation_link?`<tr><td>Praesentation</td><td>${selectedEvent.praesentation_link}</td></tr>`:''}
${[1,2,3].map(n=>selectedEvent[`dokument_link_${n}`]?`<tr><td>${selectedEvent[`dokument_titel_${n}`]||'Dokument '+n}</td><td>${selectedEvent[`dokument_link_${n}`]}</td></tr>`:'').join('')}
</tbody></table>` : ''}

<div class="footer">
  <div>HC Bremen e.V. &middot; ${selectedEvent.name}</div>
  <div>Erstellt am ${new Date().toLocaleDateString('de-DE')} &middot; Vertraulich</div>
</div>
</body></html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 800) }
  }


  // ---- DIENSTLEISTER ----
  async function loadDLHistorie(id) {
    const { data } = await supabase.from('dienstleister_historie').select('*').eq('dienstleister_id', id).order('datum', { ascending: false })
    setDlHistorie(data || [])
  }

  async function saveDL() {
    if (!dlForm.firma?.trim()) return
    setSaving(true)
    const payload = { firma:dlForm.firma, typ:dlForm.typ||'Sonstiges', ansprechpartner:dlForm.ansprechpartner||null, telefon:dlForm.telefon||null, email:dlForm.email||null, adresse:dlForm.adresse||null, zahlungsbedingungen:dlForm.zahlungsbedingungen||null, zahlungsziel_tage:dlForm.zahlungsziel_tage||30, iban:dlForm.iban||null, notizen:dlForm.notizen||null, aktiv:dlForm.aktiv!==false }
    if (dlForm.id) {
      await supabase.from('dienstleister').update(payload).eq('id', dlForm.id)
      if (selectedDL?.id === dlForm.id) setSelectedDL(d => ({ ...d, ...payload }))
    } else {
      const { data } = await supabase.from('dienstleister').insert(payload).select().single()
      if (data) { setSelectedDL(data); loadDLHistorie(data.id) }
    }
    setDlModal(false); setSaving(false); loadAll()
  }

  async function deleteDL(id) {
    if (!window.confirm('Dienstleister wirklich loeschen?')) return
    await supabase.from('dienstleister').delete().eq('id', id)
    if (selectedDL?.id === id) setSelectedDL(null)
    loadAll()
  }

  async function saveDLHistorie() {
    if (!dlHForm.beschreibung?.trim() || !selectedDL) return
    setSaving(true)
    const payload = { dienstleister_id:selectedDL.id, event_name:dlHForm.event_name||null, datum:dlHForm.datum||null, beschreibung:dlHForm.beschreibung, betrag:dlHForm.betrag||null, bezahlt:dlHForm.bezahlt||false, rechnung_nr:dlHForm.rechnung_nr||null, notiz:dlHForm.notiz||null }
    if (dlHForm.id) await supabase.from('dienstleister_historie').update(payload).eq('id', dlHForm.id)
    else await supabase.from('dienstleister_historie').insert(payload)
    setDlHistorieModal(false); setSaving(false); loadDLHistorie(selectedDL.id)
  }

  // ---- BERECHNUNGEN ----
  const geplanteKosten = kosten.reduce((s,k) => s+Number(k.betrag_geplant||0), 0)
  const tatsaechlicheKosten = kosten.reduce((s,k) => s+Number(k.betrag_tatsaechlich||0), 0)
  const budget = Number(selectedEvent?.budget_gesamt||0)
  const filteredTeilnahmen = teilnahmen.filter(t => !statusFilter || t.status === statusFilter)
  const teilnahmeStats = TEILNAHME_STATUS.reduce((acc,s) => { acc[s]=teilnahmen.filter(t=>t.status===s).length; return acc }, {})


  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Events</div>
      <p className="page-subtitle">Veranstaltungen, Kostenkalkulation und Dienstleister</p>
      <div className="tabs" style={{marginBottom:20}}>
        {[['events','Veranstaltungen'],['dashboard','Kosten-Dashboard'],['dienstleister','Dienstleister']].map(([k,l])=>(
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
              {events.map(e=>{
                const sc=evStatusColor(e.status||'Planung')
                return (
                  <div key={e.id} onClick={()=>{setSelectedEvent(e);setDetailTab('teilnehmer')}}
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

          {!selectedEvent ? (
            <div className="card" style={{textAlign:'center',padding:60,color:'var(--gray-400)'}}>
              <p style={{fontSize:15,marginBottom:8}}>Kein Event ausgewaehlt</p>
              <p style={{fontSize:13}}>Waehle ein Event aus der Liste.</p>
            </div>
          ) : (
            <div>
              <div className="card" style={{marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div>
                    <div style={{fontFamily:'"DM Serif Display",serif',fontSize:22,color:'var(--navy)',marginBottom:4}}>{selectedEvent.name}</div>
                    <div style={{fontSize:13,color:'var(--gray-600)',display:'flex',gap:12,flexWrap:'wrap'}}>
                      {selectedEvent.datum&&<span>{fmtLang(selectedEvent.datum)}</span>}
                      {selectedEvent.ort&&<span>{selectedEvent.ort}</span>}
                      {selectedEvent.zustaendig&&<span>Zustaendig: {selectedEvent.zustaendig}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,flexShrink:0}}>
                    <button className="btn btn-sm btn-outline" onClick={exportPDF}>PDF</button>
                    <button className="btn btn-sm btn-outline" onClick={()=>{setEventForm(selectedEvent);setEventModal(true)}}>Bearb.</button>
                    <button className="btn btn-sm btn-danger" onClick={()=>deleteEvent(selectedEvent.id)}>X</button>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
                  {TEILNAHME_STATUS.map(s=>teilnahmeStats[s]>0&&(
                    <span key={s} style={{fontSize:12,padding:'2px 10px',borderRadius:20,fontWeight:600,background:STATUS_COLORS[s].bg,color:STATUS_COLORS[s].color}}>{s}: {teilnahmeStats[s]}</span>
                  ))}
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {selectedEvent.praesentation_link&&<a href={selectedEvent.praesentation_link} target="_blank" rel="noreferrer" style={{fontSize:12,padding:'2px 10px',borderRadius:20,background:'#ddeaff',color:'#1a4a8a',fontWeight:600,textDecoration:'none'}}>Praesentation</a>}
                  {[1,2,3].map(n=>selectedEvent[`dokument_link_${n}`]&&(
                    <a key={n} href={selectedEvent[`dokument_link_${n}`]} target="_blank" rel="noreferrer" style={{fontSize:12,padding:'2px 10px',borderRadius:20,background:'#e2efda',color:'#2d6b3a',fontWeight:600,textDecoration:'none'}}>{selectedEvent[`dokument_titel_${n}`]||'Dokument '+n}</a>
                  ))}
                </div>
                {budget>0&&(
                  <div style={{display:'flex',gap:16,marginTop:10,paddingTop:10,borderTop:'1px solid var(--gray-100)',fontSize:12}}>
                    <span style={{color:'var(--gray-400)'}}>Budget: <strong>{budget.toLocaleString('de-DE')} EUR</strong></span>
                    <span style={{color:'var(--gray-400)'}}>Geplant: <strong style={{color:geplanteKosten>budget?'var(--red)':'inherit'}}>{geplanteKosten.toLocaleString('de-DE')} EUR</strong></span>
                    {tatsaechlicheKosten>0&&<span style={{color:'var(--gray-400)'}}>Tatsaechlich: <strong style={{color:tatsaechlicheKosten>budget?'var(--red)':'var(--green)'}}>{tatsaechlicheKosten.toLocaleString('de-DE')} EUR</strong></span>}
                  </div>
                )}
              </div>

              <div className="tabs" style={{marginBottom:16}}>
                {[['teilnehmer','Teilnehmer ('+teilnahmen.length+')'],['todos','ToDos ('+todos.length+')'],['ablauf','Ablaufplan'],['agenda','Agenda'],['notizen','Notizen'],['dateien','Dateien ('+dateien.length+')'],['kosten','Kosten']].map(([k,l])=>(
                  <button key={k} className={'tab-btn'+(detailTab===k?' active':'')} onClick={()=>setDetailTab(k)}>{l}</button>
                ))}
              </div>

              {detailTab==='teilnehmer'&&(
                <div className="card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                    <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{fontSize:13,padding:'6px 10px'}}>
                      <option value="">Alle Status</option>
                      {TEILNAHME_STATUS.map(s=><option key={s}>{s}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={()=>{setTForm({kontakt_id:'',ansprechpartner_name:'',ansprechpartner_email:'',ansprechpartner_position:'',status:'Eingeladen',notiz:''});setKontaktAnsprechpartner([]);setTeilnahmeModal(true)}}>+ Teilnehmer</button>
                  </div>
                  {filteredTeilnahmen.length===0 ? <div className="empty-state"><p>Noch keine Teilnehmer.</p></div> : (
                    <div style={{display:'grid',gap:8}}>
                      {filteredTeilnahmen.map(t=>{
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
                              <select value={t.status} onChange={e=>updateTeilnahmeStatus(t.id,e.target.value)} style={{fontSize:12,padding:'4px 8px',border:'1.5px solid var(--gray-200)',borderRadius:20,background:sc.bg,color:sc.color,fontWeight:600,cursor:'pointer'}}>
                                {TEILNAHME_STATUS.map(s=><option key={s}>{s}</option>)}
                              </select>
                              <button className="btn btn-sm btn-outline" onClick={()=>{setTForm(t);loadAnsprechpartner(t.kontakt_id);setTeilnahmeModal(true)}}>Bearb.</button>
                              <button className="btn btn-sm btn-danger" onClick={()=>deleteTeilnahme(t.id)}>X</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {detailTab==='todos'&&(
                <div>
                  <div className="toolbar">
                    <span style={{fontSize:13,color:'var(--gray-500)'}}>{todos.filter(t=>t.status==='Erledigt').length}/{todos.length} erledigt</span>
                    <button className="btn btn-primary" onClick={()=>{setTodoForm({status:'Offen',prioritaet:'Normal'});setTodoModal(true)}}>+ ToDo</button>
                  </div>
                  {todos.length===0 ? <div className="empty-state card"><p>Noch keine ToDos.</p></div> : (
                    <div style={{display:'grid',gap:8}}>
                      {todos.map(t=>{
                        const tc=todoStatusColor(t.status)
                        return (
                          <div key={t.id} style={{padding:14,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',display:'flex',gap:12,alignItems:'flex-start',opacity:t.status==='Erledigt'?0.7:1}}>
                            <button onClick={()=>toggleTodoStatus(t)} style={{width:22,height:22,borderRadius:4,border:'2px solid '+(t.status==='Erledigt'?'#3a8a5a':t.status==='In Bearbeitung'?'#e07b30':'var(--gray-300)'),background:t.status==='Erledigt'?'#3a8a5a':t.status==='In Bearbeitung'?'#fff3cd':'var(--white)',cursor:'pointer',flexShrink:0,marginTop:2,fontSize:10,fontWeight:700,color:t.status==='Erledigt'?'white':'inherit'}}>
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
                              <button className="btn btn-sm btn-danger" onClick={async()=>{await supabase.from('event_todos').delete().eq('id',t.id);loadDetails(selectedEvent.id)}}>X</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {detailTab==='ablauf'&&(
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
                            <button className="btn btn-sm btn-danger" onClick={async()=>{await supabase.from('event_ablauf').delete().eq('id',a.id);loadDetails(selectedEvent.id)}}>X</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailTab==='agenda'&&(
                <div className="card">
                  <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                    {[['bold','B'],['italic','I'],['underline','U']].map(([cmd,label])=>(
                      <button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd)}}
                        style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,cursor:'pointer',fontSize:13}}>{label}</button>
                    ))}
                    <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertUnorderedList')}} style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,cursor:'pointer',fontSize:13}}>Liste</button>
                  </div>
                  <div contentEditable suppressContentEditableWarning onBlur={e=>saveAgenda(e.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{__html:selectedEvent.agenda||'<p>Agenda hier eintragen...</p>'}}
                    style={{minHeight:200,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:16,fontSize:14,lineHeight:1.7,outline:'none'}}/>
                  <p style={{fontSize:12,color:'var(--gray-400)',marginTop:8}}>Wird beim Verlassen gespeichert.</p>
                </div>
              )}

              {detailTab==='notizen'&&(
                <div className="card">
                  <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                    {[['bold','B'],['italic','I'],['underline','U']].map(([cmd,label])=>(
                      <button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd)}}
                        style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,cursor:'pointer',fontSize:13}}>{label}</button>
                    ))}
                    <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertUnorderedList')}} style={{padding:'4px 10px',border:'1.5px solid var(--gray-200)',borderRadius:4,cursor:'pointer',fontSize:13}}>Liste</button>
                  </div>
                  <div contentEditable suppressContentEditableWarning onBlur={e=>saveNotizen(e.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{__html:selectedEvent.notizen||'<p>Notizen hier eintragen...</p>'}}
                    style={{minHeight:200,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:16,fontSize:14,lineHeight:1.7,outline:'none'}}/>
                  <p style={{fontSize:12,color:'var(--gray-400)',marginTop:8}}>Wird beim Verlassen gespeichert.</p>
                </div>
              )}

              {detailTab==='dateien'&&(
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
                              <button className="btn btn-sm btn-danger" onClick={async()=>{await supabase.from('event_dateien').delete().eq('id',d.id);loadDetails(selectedEvent.id)}}>X</button>
                            </div>
                          </div>
                          <a href={d.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:'var(--navy)',wordBreak:'break-all',textDecoration:'none',display:'block',padding:'6px 10px',background:'#f0f7ff',borderRadius:4}}>{d.url.length>50?d.url.slice(0,50)+'...':d.url}</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailTab==='kosten'&&(
                <div>
                  <div className="toolbar">
                    <button className="btn btn-primary" onClick={()=>{setKostenForm({kategorie:'',betrag_geplant:'',bezahlt:false});setKostenModal(true)}}>+ Kostenposition</button>
                  </div>
                  {(budget>0||kosten.length>0)&&(
                    <div className="stats-row" style={{marginBottom:16}}>
                      <div className="stat-card blue"><div className="stat-num" style={{fontSize:20}}>{budget.toLocaleString('de-DE')} EUR</div><div className="stat-label">Budget</div></div>
                      <div className="stat-card gold"><div className="stat-num" style={{fontSize:20}}>{geplanteKosten.toLocaleString('de-DE')} EUR</div><div className="stat-label">Geplant</div></div>
                      <div className="stat-card" style={{background:tatsaechlicheKosten>budget?'#fff5f5':'#f0f9f4'}}><div className="stat-num" style={{fontSize:20,color:tatsaechlicheKosten>budget?'var(--red)':'var(--green)'}}>{tatsaechlicheKosten.toLocaleString('de-DE')} EUR</div><div className="stat-label">Tatsaechlich</div></div>
                      <div className="stat-card"><div className="stat-num" style={{fontSize:20,color:budget-geplanteKosten<0?'var(--red)':'var(--green)'}}>{(budget-geplanteKosten).toLocaleString('de-DE')} EUR</div><div className="stat-label">Verbleibend</div></div>
                    </div>
                  )}
                  {kosten.length===0 ? <div className="empty-state card"><p>Noch keine Kostenpositionen.</p></div> : (
                    <div className="card">
                      <div className="table-wrap"><table>
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
                                <td><button onClick={async()=>{await supabase.from('event_kosten').update({bezahlt:!k.bezahlt}).eq('id',k.id);loadDetails(selectedEvent.id)}} style={{padding:'2px 10px',borderRadius:10,border:'1.5px solid',fontSize:12,fontWeight:600,cursor:'pointer',background:k.bezahlt?'#e2efda':'var(--white)',borderColor:k.bezahlt?'#3a8a5a':'var(--gray-200)',color:k.bezahlt?'#2d6b3a':'var(--gray-500)'}}>{k.bezahlt?'Bezahlt':'Offen'}</button></td>
                                <td style={{whiteSpace:'nowrap'}}><button className="btn btn-sm btn-outline" onClick={()=>{setKostenForm(k);setKostenModal(true)}}>Bearb.</button>{' '}<button className="btn btn-sm btn-danger" onClick={async()=>{await supabase.from('event_kosten').delete().eq('id',k.id);loadDetails(selectedEvent.id)}}>X</button></td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot><tr style={{background:'var(--gray-100)',fontWeight:700}}><td colSpan="3">Gesamt</td><td>{geplanteKosten.toLocaleString('de-DE')} EUR</td><td style={{color:tatsaechlicheKosten>budget&&budget>0?'var(--red)':'inherit'}}>{tatsaechlicheKosten.toLocaleString('de-DE')} EUR</td><td colSpan="2">{kosten.filter(k=>k.bezahlt).length}/{kosten.length} bezahlt</td></tr></tfoot>
                      </table></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
        </div>
      )}

      {hauptTab==='dashboard'&&(
        <KostenDashboard events={events} alleKosten={alleKosten} kostenKategorien={kostenKategorien} dienstleister={dienstleister}/>
      )}

      {hauptTab==='dienstleister'&&(
        <DienstleisterTab
          dienstleister={dienstleister} dlSearch={dlSearch} setDlSearch={setDlSearch}
          dlTypFilter={dlTypFilter} setDlTypFilter={setDlTypFilter}
          selectedDL={selectedDL} setSelectedDL={setSelectedDL}
          dlHistorie={dlHistorie} loadDLHistorie={loadDLHistorie}
          setDlForm={setDlForm} setDlModal={setDlModal}
          setDlHForm={setDlHForm} setDlHistorieModal={setDlHistorieModal}
          deleteDL={deleteDL}
        />
      )}

      {eventModal&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEventModal(false)}><div className="modal" style={{maxWidth:680}}><div className="modal-header"><span className="modal-title">{eventForm.id?'Event bearbeiten':'Neues Event'}</span><button className="close-btn" onClick={()=>setEventModal(false)}>x</button></div><div className="modal-body"><div className="form-group"><label>Name *</label><input value={eventForm.name||''} onChange={e=>setEventForm(f=>({...f,name:e.target.value}))} autoFocus/></div><div className="form-row"><div className="form-group"><label>Datum</label><input type="date" value={eventForm.datum||''} onChange={e=>setEventForm(f=>({...f,datum:e.target.value}))}/></div><div className="form-group" style={{position:'relative'}}><label>Ort</label><div style={{display:'flex',gap:8}}><input value={eventForm.ort||''} onChange={e=>{setEventForm(f=>({...f,ort:e.target.value,ort_id:null}));setOrtSuche(e.target.value);setZeigOrtSuche(true)}} onFocus={()=>setZeigOrtSuche(true)} placeholder="Ort eingeben..." style={{flex:1,padding:'10px 14px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:14}}/><button type="button" className="btn btn-sm btn-outline" onClick={()=>{setOrtForm({name:eventForm.ort||''});setOrtModal(true)}}>+</button></div>{zeigOrtSuche&&orte.filter(o=>!ortSuche||o.name.toLowerCase().includes(ortSuche.toLowerCase())).length>0&&(<div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',zIndex:10,boxShadow:'var(--shadow)',maxHeight:200,overflowY:'auto'}}>{orte.filter(o=>!ortSuche||o.name.toLowerCase().includes(ortSuche.toLowerCase())).map(o=>(<div key={o.id} onClick={()=>{setEventForm(f=>({...f,ort:o.name,ort_id:o.id}));setOrtSuche('');setZeigOrtSuche(false)}} style={{padding:'10px 14px',cursor:'pointer',fontSize:14,borderBottom:'1px solid var(--gray-100)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--gray-100)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><div style={{fontWeight:600}}>{o.name}</div></div>))}</div>)}</div></div><div className="form-row"><div className="form-group"><label>Art</label><select value={eventForm.art||'Networking-Event'} onChange={e=>setEventForm(f=>({...f,art:e.target.value}))}>{EVENT_TYPEN.map(t=><option key={t}>{t}</option>)}</select></div><div className="form-group"><label>Status</label><select value={eventForm.status||'Planung'} onChange={e=>setEventForm(f=>({...f,status:e.target.value}))}>{EVENT_STATUS.map(s=><option key={s}>{s}</option>)}</select></div></div><div className="form-row"><div className="form-group"><label>Zustaendig</label><input value={eventForm.zustaendig||''} onChange={e=>setEventForm(f=>({...f,zustaendig:e.target.value}))}/></div><div className="form-group"><label>Budget (EUR)</label><input type="number" value={eventForm.budget_gesamt||''} onChange={e=>setEventForm(f=>({...f,budget_gesamt:e.target.value}))}/></div></div><div className="form-group"><label>Praesentations-Link</label><input type="url" placeholder="https://..." value={eventForm.praesentation_link||''} onChange={e=>setEventForm(f=>({...f,praesentation_link:e.target.value}))}/></div><div style={{background:'var(--gray-100)',borderRadius:'var(--radius)',padding:14,marginBottom:8}}>{[1,2,3].map(n=>(<div key={n} className="form-row" style={{marginBottom:8}}><div className="form-group" style={{margin:0}}><label>Titel {n}</label><input value={eventForm[`dokument_titel_${n}`]||''} onChange={e=>setEventForm(f=>({...f,[`dokument_titel_${n}`]:e.target.value}))}/></div><div className="form-group" style={{margin:0}}><label>Link {n}</label><input type="url" value={eventForm[`dokument_link_${n}`]||''} onChange={e=>setEventForm(f=>({...f,[`dokument_link_${n}`]:e.target.value}))}/></div></div>))}</div><div className="form-group"><label style={{display:'flex',alignItems:'center',gap:10,textTransform:'none',fontSize:14,cursor:'pointer',padding:'8px 0'}}><input type="checkbox" style={{width:18,height:18,flexShrink:0}} checked={eventForm.einladung_versendet||false} onChange={e=>setEventForm(f=>({...f,einladung_versendet:e.target.checked}))}/>Einladung versendet</label></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setEventModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveEvent} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div></div></div>}

      {ortModal&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOrtModal(false)}><div className="modal" style={{maxWidth:520}}><div className="modal-header"><span className="modal-title">Veranstaltungsort</span><button className="close-btn" onClick={()=>setOrtModal(false)}>x</button></div><div className="modal-body"><div className="form-group"><label>Name *</label><input value={ortForm.name||''} onChange={e=>setOrtForm(f=>({...f,name:e.target.value}))} autoFocus/></div><div className="form-group"><label>Strasse</label><input value={ortForm.adresse_strasse||''} onChange={e=>setOrtForm(f=>({...f,adresse_strasse:e.target.value}))}/></div><div className="form-row"><div className="form-group"><label>PLZ</label><input value={ortForm.adresse_plz||''} onChange={e=>setOrtForm(f=>({...f,adresse_plz:e.target.value}))}/></div><div className="form-group"><label>Stadt</label><input value={ortForm.adresse_stadt||''} onChange={e=>setOrtForm(f=>({...f,adresse_stadt:e.target.value}))}/></div></div><div className="form-group"><label>Kapazitaet</label><input type="number" value={ortForm.kapazitaet||''} onChange={e=>setOrtForm(f=>({...f,kapazitaet:e.target.value}))}/></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setOrtModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveOrt} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div></div></div>}

      {teilnahmeModal&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setTeilnahmeModal(false)}><div className="modal"><div className="modal-header"><span className="modal-title">{tForm.id?'Teilnehmer bearbeiten':'Teilnehmer hinzufuegen'}</span><button className="close-btn" onClick={()=>setTeilnahmeModal(false)}>x</button></div><div className="modal-body"><div className="form-row"><div className="form-group"><label>Firma *</label><select value={tForm.kontakt_id||''} onChange={e=>{setTForm(f=>({...f,kontakt_id:e.target.value}));loadAnsprechpartner(e.target.value)}}><option value="">Bitte waehlen...</option>{kontakte.map(k=><option key={k.id} value={k.id}>{k.firma}</option>)}</select></div><div className="form-group"><label>Status</label><select value={tForm.status||'Eingeladen'} onChange={e=>setTForm(f=>({...f,status:e.target.value}))}>{TEILNAHME_STATUS.map(s=><option key={s}>{s}</option>)}</select></div></div>{kontaktAnsprechpartner.length>0&&(<div className="form-group"><label>Ansprechpartner</label><div style={{display:'grid',gap:8}}>{kontaktAnsprechpartner.map(ap=>(<div key={ap.id} onClick={()=>setTForm(f=>({...f,ansprechpartner_name:ap.name,ansprechpartner_email:ap.email||'',ansprechpartner_position:ap.position||''}))} style={{padding:'10px 14px',border:'1.5px solid '+(tForm.ansprechpartner_name===ap.name?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer'}}><div style={{fontWeight:600,fontSize:13}}>{ap.name}</div><div style={{fontSize:12,color:'var(--gray-400)'}}>{ap.position}</div></div>))}</div></div>)}<div className="form-row"><div className="form-group"><label>Name</label><input value={tForm.ansprechpartner_name||''} onChange={e=>setTForm(f=>({...f,ansprechpartner_name:e.target.value}))}/></div><div className="form-group"><label>Position</label><input value={tForm.ansprechpartner_position||''} onChange={e=>setTForm(f=>({...f,ansprechpartner_position:e.target.value}))}/></div></div><div className="form-group"><label>E-Mail</label><input type="email" value={tForm.ansprechpartner_email||''} onChange={e=>setTForm(f=>({...f,ansprechpartner_email:e.target.value}))}/></div><div className="form-group"><label>Notiz</label><textarea value={tForm.notiz||''} onChange={e=>setTForm(f=>({...f,notiz:e.target.value}))}/></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setTeilnahmeModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveTeilnahme} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div></div></div>}

      {todoModal&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setTodoModal(false)}><div className="modal"><div className="modal-header"><span className="modal-title">{todoForm.id?'ToDo bearbeiten':'Neues ToDo'}</span><button className="close-btn" onClick={()=>setTodoModal(false)}>x</button></div><div className="modal-body"><div className="form-group"><label>Titel *</label><input value={todoForm.titel||''} onChange={e=>setTodoForm(f=>({...f,titel:e.target.value}))} autoFocus/></div><div className="form-group"><label>Beschreibung</label><textarea value={todoForm.beschreibung||''} onChange={e=>setTodoForm(f=>({...f,beschreibung:e.target.value}))}/></div><div className="form-row"><div className="form-group"><label>Zugewiesen an</label><select value={todoForm.zugewiesen_an||''} onChange={e=>setTodoForm(f=>({...f,zugewiesen_an:e.target.value}))}><option value="">-- Niemand --</option>{personen.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></div><div className="form-group"><label>Faellig am</label><input type="date" value={todoForm.faellig_am||''} onChange={e=>setTodoForm(f=>({...f,faellig_am:e.target.value}))}/></div></div><div className="form-row"><div className="form-group"><label>Status</label><select value={todoForm.status||'Offen'} onChange={e=>setTodoForm(f=>({...f,status:e.target.value}))}>{TODO_STATUS.map(s=><option key={s}>{s}</option>)}</select></div><div className="form-group"><label>Prioritaet</label><select value={todoForm.prioritaet||'Normal'} onChange={e=>setTodoForm(f=>({...f,prioritaet:e.target.value}))}>{TODO_PRIO.map(p=><option key={p}>{p}</option>)}</select></div></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setTodoModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveTodo} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div></div></div>}

      {ablaufModal&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setAblaufModal(false)}><div className="modal"><div className="modal-header"><span className="modal-title">{ablaufForm.id?'Ablaufpunkt bearbeiten':'Neuer Ablaufpunkt'}</span><button className="close-btn" onClick={()=>setAblaufModal(false)}>x</button></div><div className="modal-body"><div className="form-row"><div className="form-group"><label>Uhrzeit</label><input type="time" value={ablaufForm.uhrzeit||''} onChange={e=>setAblaufForm(f=>({...f,uhrzeit:e.target.value}))}/></div><div className="form-group"><label>Reihenfolge</label><input type="number" value={ablaufForm.reihenfolge||0} onChange={e=>setAblaufForm(f=>({...f,reihenfolge:parseInt(e.target.value)||0}))}/></div></div><div className="form-group"><label>Titel *</label><input value={ablaufForm.titel||''} onChange={e=>setAblaufForm(f=>({...f,titel:e.target.value}))} autoFocus/></div><div className="form-group"><label>Beschreibung</label><textarea value={ablaufForm.beschreibung||''} onChange={e=>setAblaufForm(f=>({...f,beschreibung:e.target.value}))}/></div><div className="form-row"><div className="form-group"><label>Verantwortlich</label><select value={ablaufForm.verantwortlich||''} onChange={e=>setAblaufForm(f=>({...f,verantwortlich:e.target.value}))}><option value="">-- Niemand --</option>{personen.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></div><div className="form-group"><label>Benoetigt</label><input value={ablaufForm.benoetigt||''} onChange={e=>setAblaufForm(f=>({...f,benoetigt:e.target.value}))}/></div></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setAblaufModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveAblauf} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div></div></div>}

      {dateiModal&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDateiModal(false)}><div className="modal"><div className="modal-header"><span className="modal-title">{dateiForm.id?'Link bearbeiten':'Neuer Link'}</span><button className="close-btn" onClick={()=>setDateiModal(false)}>x</button></div><div className="modal-body"><div className="form-row"><div className="form-group"><label>Name *</label><input value={dateiForm.name||''} onChange={e=>setDateiForm(f=>({...f,name:e.target.value}))} autoFocus/></div><div className="form-group"><label>Typ</label><select value={dateiForm.typ||'Link'} onChange={e=>setDateiForm(f=>({...f,typ:e.target.value}))}>{DATEI_TYPEN.map(t=><option key={t}>{t}</option>)}</select></div></div><div className="form-group"><label>URL *</label><input type="url" value={dateiForm.url||''} onChange={e=>setDateiForm(f=>({...f,url:e.target.value}))} placeholder="https://..."/></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setDateiModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveDatei} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div></div></div>}

      {kostenModal&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setKostenModal(false)}><div className="modal"><div className="modal-header"><span className="modal-title">{kostenForm.id?'Kostenposition bearbeiten':'Neue Kostenposition'}</span><button className="close-btn" onClick={()=>setKostenModal(false)}>x</button></div><div className="modal-body"><div className="form-row"><div className="form-group"><label>Kategorie</label><select value={kostenForm.kategorie||''} onChange={e=>{const kat=kostenKategorien.find(k=>k.name===e.target.value);setKostenForm(f=>({...f,kategorie:e.target.value,kategorie_id:kat?.id||null}))}}><option value="">-- Keine --</option>{kostenKategorien.length>0?kostenKategorien.map(k=><option key={k.id} value={k.name}>{k.name}</option>):KOSTEN_KAT.map(k=><option key={k}>{k}</option>)}</select></div><div className="form-group"><label>Bezeichnung *</label><input value={kostenForm.bezeichnung||''} onChange={e=>setKostenForm(f=>({...f,bezeichnung:e.target.value}))} autoFocus/></div></div><div className="form-group"><label>Dienstleister</label><select value={kostenForm.dienstleister_id||''} onChange={e=>{const dl=dienstleister.find(d=>d.id===e.target.value);setKostenForm(f=>({...f,dienstleister_id:e.target.value||null,anbieter:dl?.firma||f.anbieter}))}}><option value="">-- Keiner --</option>{dienstleister.map(d=><option key={d.id} value={d.id}>{d.firma} ({d.typ})</option>)}</select></div><div className="form-row"><div className="form-group"><label>Geplant (EUR)</label><input type="number" value={kostenForm.betrag_geplant||''} onChange={e=>setKostenForm(f=>({...f,betrag_geplant:e.target.value}))}/></div><div className="form-group"><label>Tatsaechlich (EUR)</label><input type="number" value={kostenForm.betrag_tatsaechlich||''} onChange={e=>setKostenForm(f=>({...f,betrag_tatsaechlich:e.target.value}))}/></div></div><div className="form-row"><div className="form-group"><label>Rechnungsnr.</label><input value={kostenForm.rechnung_nr||''} onChange={e=>setKostenForm(f=>({...f,rechnung_nr:e.target.value}))}/></div><div className="form-group"><label>Notiz</label><input value={kostenForm.notiz||''} onChange={e=>setKostenForm(f=>({...f,notiz:e.target.value}))}/></div></div><div className="form-group"><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}><input type="checkbox" checked={kostenForm.bezahlt||false} onChange={e=>setKostenForm(f=>({...f,bezahlt:e.target.checked}))}/>Bereits bezahlt</label></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setKostenModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveKosten} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div></div></div>}

      {dlModal&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDlModal(false)}><div className="modal" style={{maxWidth:640}}><div className="modal-header"><span className="modal-title">{dlForm.id?'Dienstleister bearbeiten':'Neuer Dienstleister'}</span><button className="close-btn" onClick={()=>setDlModal(false)}>x</button></div><div className="modal-body"><div className="form-row"><div className="form-group"><label>Firma *</label><input value={dlForm.firma||''} onChange={e=>setDlForm(f=>({...f,firma:e.target.value}))} autoFocus/></div><div className="form-group"><label>Typ</label><select value={dlForm.typ||'Sonstiges'} onChange={e=>setDlForm(f=>({...f,typ:e.target.value}))}>{['Catering','Location','Technik','Marketing','Druck','Personal','Transport','Reinigung','Security','Fotografie','Sonstiges'].map(t=><option key={t}>{t}</option>)}</select></div></div><div className="form-row"><div className="form-group"><label>Ansprechpartner</label><input value={dlForm.ansprechpartner||''} onChange={e=>setDlForm(f=>({...f,ansprechpartner:e.target.value}))}/></div><div className="form-group"><label>Telefon</label><input value={dlForm.telefon||''} onChange={e=>setDlForm(f=>({...f,telefon:e.target.value}))}/></div></div><div className="form-row"><div className="form-group"><label>E-Mail</label><input type="email" value={dlForm.email||''} onChange={e=>setDlForm(f=>({...f,email:e.target.value}))}/></div><div className="form-group"><label>Adresse</label><input value={dlForm.adresse||''} onChange={e=>setDlForm(f=>({...f,adresse:e.target.value}))}/></div></div><div className="form-row"><div className="form-group"><label>Zahlungsbedingungen</label><input value={dlForm.zahlungsbedingungen||''} onChange={e=>setDlForm(f=>({...f,zahlungsbedingungen:e.target.value}))}/></div><div className="form-group"><label>Zahlungsziel (Tage)</label><select value={dlForm.zahlungsziel_tage||30} onChange={e=>setDlForm(f=>({...f,zahlungsziel_tage:parseInt(e.target.value)}))}>{[7,14,30,45,60].map(z=><option key={z} value={z}>{z} Tage</option>)}</select></div></div><div className="form-group"><label>IBAN</label><input value={dlForm.iban||''} onChange={e=>setDlForm(f=>({...f,iban:e.target.value}))}/></div><div className="form-group"><label>Notizen</label><textarea value={dlForm.notizen||''} onChange={e=>setDlForm(f=>({...f,notizen:e.target.value}))}/></div><div className="form-group"><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}><input type="checkbox" checked={dlForm.aktiv!==false} onChange={e=>setDlForm(f=>({...f,aktiv:e.target.checked}))}/>Aktiv</label></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setDlModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveDL} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div></div></div>}

      {dlHistorieModal&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDlHistorieModal(false)}><div className="modal"><div className="modal-header"><span className="modal-title">{dlHForm.id?'Eintrag bearbeiten':'Neuer Eintrag'}</span><button className="close-btn" onClick={()=>setDlHistorieModal(false)}>x</button></div><div className="modal-body"><div className="form-group"><label>Beschreibung *</label><input value={dlHForm.beschreibung||''} onChange={e=>setDlHForm(f=>({...f,beschreibung:e.target.value}))} autoFocus/></div><div className="form-row"><div className="form-group"><label>Datum</label><input type="date" value={dlHForm.datum||''} onChange={e=>setDlHForm(f=>({...f,datum:e.target.value}))}/></div><div className="form-group"><label>Betrag (EUR)</label><input type="number" value={dlHForm.betrag||''} onChange={e=>setDlHForm(f=>({...f,betrag:e.target.value}))}/></div></div><div className="form-row"><div className="form-group"><label>Event</label><input value={dlHForm.event_name||''} onChange={e=>setDlHForm(f=>({...f,event_name:e.target.value}))}/></div><div className="form-group"><label>Rechnungsnr.</label><input value={dlHForm.rechnung_nr||''} onChange={e=>setDlHForm(f=>({...f,rechnung_nr:e.target.value}))}/></div></div><div className="form-group"><label>Notiz</label><textarea value={dlHForm.notiz||''} onChange={e=>setDlHForm(f=>({...f,notiz:e.target.value}))}/></div><div className="form-group"><label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}><input type="checkbox" checked={dlHForm.bezahlt||false} onChange={e=>setDlHForm(f=>({...f,bezahlt:e.target.checked}))}/>Bereits bezahlt</label></div></div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>setDlHistorieModal(false)}>Abbrechen</button><button className="btn btn-primary" onClick={saveDLHistorie} disabled={saving}>{saving?'Speichern...':'Speichern'}</button></div></div></div>}
    </main>
  )
}

function KostenDashboard({events,alleKosten,kostenKategorien,dienstleister}) {
  const perKat=kostenKategorien.map(kat=>{const items=alleKosten.filter(k=>k.kategorie===kat.name);return{...kat,geplant:items.reduce((s,k)=>s+Number(k.betrag_geplant||0),0),tatsaechlich:items.reduce((s,k)=>s+Number(k.betrag_tatsaechlich||0),0),anzahl:items.length}}).filter(k=>k.anzahl>0)
  const perEvent=events.map(e=>{const items=alleKosten.filter(k=>k.event_id===e.id);return{...e,geplant:items.reduce((s,k)=>s+Number(k.betrag_geplant||0),0),tatsaechlich:items.reduce((s,k)=>s+Number(k.betrag_tatsaechlich||0),0),anzahl:items.length}}).filter(e=>e.anzahl>0).sort((a,b)=>b.geplant-a.geplant)
  const gesamtGeplant=alleKosten.reduce((s,k)=>s+Number(k.betrag_geplant||0),0)
  const gesamtTats=alleKosten.reduce((s,k)=>s+Number(k.betrag_tatsaechlich||0),0)
  const maxBetrag=Math.max(...perEvent.map(e=>e.geplant),1)
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
                  <div style={{height:6,background:'var(--gray-100)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:(e.geplant/maxBetrag*100)+'%',background:'#0f2240',borderRadius:3}}/></div>
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
            <tfoot><tr style={{background:'var(--gray-100)',fontWeight:700}}><td colSpan="4">Gesamt</td><td style={{textAlign:'right'}}>{gesamtGeplant.toLocaleString('de-DE')} EUR</td><td style={{textAlign:'right',color:gesamtTats>gesamtGeplant?'var(--red)':'var(--green)'}}>{gesamtTats.toLocaleString('de-DE')} EUR</td><td>{alleKosten.filter(k=>k.bezahlt).length}/{alleKosten.length} bezahlt</td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
    </div>
    </div>
  )
}

function DienstleisterTab({dienstleister,dlSearch,setDlSearch,dlTypFilter,setDlTypFilter,selectedDL,setSelectedDL,dlHistorie,loadDLHistorie,setDlForm,setDlModal,setDlHForm,setDlHistorieModal,deleteDL}) {
  const filtered=dienstleister.filter(d=>(!dlSearch||d.firma.toLowerCase().includes(dlSearch.toLowerCase()))&&(!dlTypFilter||d.typ===dlTypFilter))
  const gesamtUmsatz=dlHistorie.reduce((s,h)=>s+Number(h.betrag||0),0)
  const offen=dlHistorie.filter(h=>!h.bezahlt).reduce((s,h)=>s+Number(h.betrag||0),0)
  return (
    <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:20,alignItems:'start'}}>
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <strong style={{fontSize:14,color:'var(--navy)'}}>Dienstleister ({filtered.length})</strong>
          <button className="btn btn-primary btn-sm" onClick={()=>{setDlForm({typ:'Sonstiges',aktiv:true,zahlungsziel_tage:30});setDlModal(true)}}>+ Neu</button>
        </div>
        <div style={{display:'grid',gap:6,marginBottom:10}}>
          <input value={dlSearch} onChange={e=>setDlSearch(e.target.value)} placeholder="Suche..." style={{padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
          <select value={dlTypFilter} onChange={e=>setDlTypFilter(e.target.value)} style={{padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}>
            <option value="">Alle Typen</option>
            {['Catering','Location','Technik','Marketing','Druck','Personal','Transport','Reinigung','Security','Fotografie','Sonstiges'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{display:'grid',gap:8}}>
          {filtered.length===0&&<div className="card" style={{textAlign:'center',color:'var(--gray-400)',fontSize:13,padding:24}}>Keine Dienstleister.</div>}
          {filtered.map(d=>(
            <div key={d.id} onClick={()=>{setSelectedDL(d);loadDLHistorie(d.id)}}
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
                <button className="btn btn-sm btn-outline" onClick={()=>{setDlForm(selectedDL);setDlModal(true)}}>Bearb.</button>
                <button className="btn btn-sm btn-danger" onClick={()=>deleteDL(selectedDL.id)}>X</button>
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
                <span style={{color:'var(--gray-400)'}}>Gesamt: <strong>{gesamtUmsatz.toLocaleString('de-DE')} EUR</strong></span>
                {offen>0&&<span style={{color:'var(--gray-400)'}}>Offen: <strong style={{color:'var(--red)'}}>{offen.toLocaleString('de-DE')} EUR</strong></span>}
              </div>
            )}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <strong style={{fontSize:14,color:'var(--navy)'}}>Historie ({dlHistorie.length})</strong>
            <button className="btn btn-primary btn-sm" onClick={()=>{setDlHForm({bezahlt:false,datum:new Date().toISOString().slice(0,10)});setDlHistorieModal(true)}}>+ Eintrag</button>
          </div>
          {dlHistorie.length===0 ? <div className="empty-state card"><p>Noch keine Eintraege.</p></div> : (
            <div style={{display:'grid',gap:8}}>
              {dlHistorie.map(h=>(
                <div key={h.id} style={{padding:14,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{h.beschreibung}</div>
                    <div style={{fontSize:12,color:'var(--gray-500)',marginTop:2}}>
                      {h.datum&&<span>{new Date(h.datum).toLocaleDateString('de-DE')}</span>}
                      {h.event_name&&<span style={{marginLeft:8}}>Event: <strong>{h.event_name}</strong></span>}
                      {h.rechnung_nr&&<span style={{marginLeft:8}}>Rg: {h.rechnung_nr}</span>}
                    </div>
                    {h.notiz&&<div style={{fontSize:12,color:'var(--gray-400)',fontStyle:'italic',marginTop:4}}>{h.notiz}</div>}
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                    {h.betrag&&<strong style={{fontSize:15,color:'var(--navy)'}}>{Number(h.betrag).toLocaleString('de-DE')} EUR</strong>}
                    <span style={{fontSize:11,padding:'2px 10px',borderRadius:10,border:'1.5px solid',fontWeight:600,background:h.bezahlt?'#e2efda':'var(--white)',borderColor:h.bezahlt?'#3a8a5a':'var(--gray-200)',color:h.bezahlt?'#2d6b3a':'var(--gray-500)'}}>{h.bezahlt?'Bezahlt':'Offen'}</span>
                    <button className="btn btn-sm btn-outline" onClick={()=>{setDlHForm(h);setDlHistorieModal(true)}}>Bearb.</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
