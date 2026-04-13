import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_LIST = ['Eingeladen','Zugesagt','Abgesagt','Offen','Erschienen','Nicht erschienen']
const STATUS_COLORS = {
  'Eingeladen': { bg:'#ddeaff', color:'#1a4a8a' },
  'Zugesagt': { bg:'#e2efda', color:'#2d6b3a' },
  'Abgesagt': { bg:'#fce4d6', color:'#8a3a1a' },
  'Offen': { bg:'#fff3cd', color:'#8a6a00' },
  'Erschienen': { bg:'#c6efce', color:'#1a5a2a' },
  'Nicht erschienen': { bg:'#ececec', color:'#555' },
}
const ART_LIST = ['Networking-Event','Heimspiel','Sponsoren-Meeting','Praesentation','Sonstiges']
const EMPTY_EVENT = { name:'', datum:'', ort:'', art:'Networking-Event', notizen:'', agenda:'', praesentation_link:'', dokument_link_1:'', dokument_link_2:'', dokument_link_3:'', dokument_titel_1:'', dokument_titel_2:'', dokument_titel_3:'', zustaendig:'', einladung_versendet:false }

export default function Veranstaltungen() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [teilnahmen, setTeilnahmen] = useState([])
  const [kontakte, setKontakte] = useState([])
  const [modal, setModal] = useState(false)
  const [teilnahmeModal, setTeilnahmeModal] = useState(false)
  const [form, setForm] = useState(EMPTY_EVENT)
  const [tForm, setTForm] = useState({ kontakt_id:'', ansprechpartner_name:'', ansprechpartner_email:'', ansprechpartner_position:'', status:'Eingeladen', notiz:'' })
  const [kontaktAnsprechpartner, setKontaktAnsprechpartner] = useState([])
  const [saving, setSaving] = useState(false)
  const [orte, setOrte] = useState([])
  const [ortModal, setOrtModal] = useState(false)
  const [ortForm, setOrtForm] = useState({ name:'', adresse_strasse:'', adresse_plz:'', adresse_stadt:'', kapazitaet:'', notiz:'' })
  const [ortSuche, setOrtSuche] = useState('')
  const [zeigOrtSuche, setZeigOrtSuche] = useState(false)
  const [detailTab, setDetailTab] = useState('teilnehmer')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('veranstaltungen').select('*').order('datum', { ascending: false })
    setEvents(data || [])
    const { data: k } = await supabase.from('kontakte').select('id,firma').order('firma')
    setKontakte(k || [])
    const { data: o } = await supabase.from('veranstaltungsorte').select('*').order('name')
    setOrte(o || [])
    setLoading(false)
  }

  async function loadTeilnahmen(eventId) {
    const { data, error } = await supabase.from('veranstaltung_teilnahme').select('*,kontakte(id,firma,logo_url)').eq('veranstaltung_id', eventId)
    if (error) console.error('Teilnahmen Fehler:', error)
    setTeilnahmen(data || [])
  }

  async function saveOrt() {
    if (!ortForm.name.trim()) return
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
    // Direkt im Event-Form übernehmen
    if (savedOrt) {
      setForm(f => ({ ...f, ort: savedOrt.name, ort_id: savedOrt.id }))
      setZeigOrtSuche(false)
    }
  }

  async function deleteOrt(id) {
    if (!window.confirm('Ort löschen?')) return
    await supabase.from('veranstaltungsorte').delete().eq('id', id)
    const { data: o } = await supabase.from('veranstaltungsorte').select('*').order('name')
    setOrte(o || [])
  }

  async function saveEvent() {
    setSaving(true)
    if (form.id) await supabase.from('veranstaltungen').update(form).eq('id', form.id)
    else {
      const { data } = await supabase.from('veranstaltungen').insert(form).select().single()
      if (data) setSelectedEvent(data)
    }
    setModal(false); setSaving(false); load()
  }

  async function deleteEvent(id) {
    if (!window.confirm('Veranstaltung loeschen?')) return
    await supabase.from('veranstaltungen').delete().eq('id', id)
    if (selectedEvent?.id === id) setSelectedEvent(null)
    load()
  }

  async function exportPDF() {
    if (!selectedEvent) return

    const doc = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #1a1816; }
          h1 { color: #0f2240; font-size: 28px; margin-bottom: 4px; }
          .subtitle { color: #9a9590; font-size: 14px; margin-bottom: 32px; }
          h2 { color: #0f2240; font-size: 18px; border-bottom: 2px solid #c8a84b; padding-bottom: 8px; margin-top: 32px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
          .info-item label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9a9590; display: block; margin-bottom: 4px; }
          .info-item span { font-size: 14px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #0f2240; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
          td { padding: 10px 12px; border-bottom: 1px solid #e0ddd6; font-size: 13px; }
          tr:last-child td { border-bottom: none; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
          .badge-erschienen { background: #c6efce; color: #1a5a2a; }
          .badge-zugesagt { background: #e2efda; color: #2d6b3a; }
          .badge-eingeladen { background: #ddeaff; color: #1a4a8a; }
          .badge-abgesagt { background: #fce4d6; color: #8a3a1a; }
          .badge-offen { background: #fff3cd; color: #8a6a00; }
          .badge-nicht { background: #ececec; color: #555; }
          .agenda-box { background: #f8f5ef; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.7; }
          .notizen-box { background: #f8f5ef; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.7; }
          .stats { display: flex; gap: 20px; margin: 16px 0; }
          .stat { text-align: center; padding: 12px 20px; background: #f8f5ef; border-radius: 8px; }
          .stat-num { font-size: 24px; font-weight: 700; color: #0f2240; }
          .stat-label { font-size: 11px; color: #9a9590; text-transform: uppercase; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0ddd6; font-size: 11px; color: #9a9590; }
        </style>
      </head>
      <body>
        <h1>${selectedEvent.name}</h1>
        <div class="subtitle">
          ${selectedEvent.datum ? new Date(selectedEvent.datum).toLocaleDateString('de-DE', {weekday:'long',year:'numeric',month:'long',day:'numeric'}) : ''}
          ${selectedEvent.ort ? ' · ' + selectedEvent.ort : ''}
          ${selectedEvent.zustaendig ? ' · Zuständig: ' + selectedEvent.zustaendig : ''}
        </div>

        <!-- Statistiken -->
        <div class="stats">
          ${['Erschienen','Zugesagt','Eingeladen','Abgesagt','Nicht erschienen','Offen'].map(s => {
            const count = teilnahmen.filter(t => t.status === s).length
            if (count === 0) return ''
            return `<div class="stat"><div class="stat-num">${count}</div><div class="stat-label">${s}</div></div>`
          }).join('')}
          <div class="stat"><div class="stat-num">${teilnahmen.length}</div><div class="stat-label">Gesamt</div></div>
        </div>

        <!-- Teilnehmer -->
        <h2>Teilnehmerliste (${teilnahmen.length})</h2>
        <table>
          <thead>
            <tr><th>Name / Ansprechpartner</th><th>Firma</th><th>Position</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${[...teilnahmen].sort((a,b) => {
              const order = ['Erschienen','Zugesagt','Eingeladen','Offen','Nicht erschienen','Abgesagt']
              return order.indexOf(a.status||'Offen') - order.indexOf(b.status||'Offen')
            }).map(t => {
              const badgeClass = t.status === 'Erschienen' ? 'badge-erschienen' :
                t.status === 'Zugesagt' ? 'badge-zugesagt' :
                t.status === 'Eingeladen' ? 'badge-eingeladen' :
                t.status === 'Abgesagt' ? 'badge-abgesagt' :
                t.status === 'Nicht erschienen' ? 'badge-nicht' : 'badge-offen'
              return `<tr>
                <td>${t.ansprechpartner_name || '-'}</td>
                <td>${t.kontakte?.firma || '-'}</td>
                <td>${t.ansprechpartner_position || '-'}</td>
                <td><span class="badge ${badgeClass}">${t.status || 'Eingeladen'}</span></td>
              </tr>`
            }).join('')}
          </tbody>
        </table>

        ${selectedEvent.agenda ? `
        <h2>Agenda</h2>
        <div class="agenda-box">${selectedEvent.agenda}</div>
        ` : ''}

        ${selectedEvent.notizen ? `
        <h2>Notizen & Nachbereitung</h2>
        <div class="notizen-box">${selectedEvent.notizen}</div>
        ` : ''}

        ${selectedEvent.praesentation_link ? `
        <h2>Links & Dokumente</h2>
        <table>
          <thead><tr><th>Titel</th><th>Link</th></tr></thead>
          <tbody>
            <tr><td>📊 Präsentation</td><td><a href="${selectedEvent.praesentation_link}">${selectedEvent.praesentation_link}</a></td></tr>
            ${[1,2,3].map(n => selectedEvent[`dokument_link_${n}`] ? `<tr><td>📎 ${selectedEvent[`dokument_titel_${n}`]||'Dokument '+n}</td><td><a href="${selectedEvent[`dokument_link_${n}`]}">${selectedEvent[`dokument_link_${n}`]}</a></td></tr>` : '').join('')}
          </tbody>
        </table>
        ` : ([1,2,3].some(n => selectedEvent[`dokument_link_${n}`]) ? `
        <h2>Dokumente</h2>
        <table>
          <thead><tr><th>Titel</th><th>Link</th></tr></thead>
          <tbody>
            ${[1,2,3].map(n => selectedEvent[`dokument_link_${n}`] ? `<tr><td>📎 ${selectedEvent[`dokument_titel_${n}`]||'Dokument '+n}</td><td><a href="${selectedEvent[`dokument_link_${n}`]}">${selectedEvent[`dokument_link_${n}`]}</a></td></tr>` : '').join('')}
          </tbody>
        </table>
        ` : '')}

        <div class="footer">
          HC Bremen CRM · Exportiert am ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'})}
        </div>
      </body>
      </html>
    `

    const blob = new Blob([doc], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank')
    printWindow.onload = () => {
      printWindow.print()
      URL.revokeObjectURL(url)
    }
  }

  async function loadAnsprechpartner(kontaktId) {
    if (!kontaktId) { setKontaktAnsprechpartner([]); return }
    const { data } = await supabase.from('ansprechpartner').select('*').eq('kontakt_id', kontaktId)
    setKontaktAnsprechpartner(data || [])
    // Auto-fill mit Hauptansprechpartner
    const haupt = data?.find(a => a.hauptansprechpartner)
    if (haupt) {
      setTForm(f => ({ ...f, ansprechpartner_name: haupt.name, ansprechpartner_email: haupt.email||'', ansprechpartner_position: haupt.position||'' }))
    } else {
      setTForm(f => ({ ...f, ansprechpartner_name:'', ansprechpartner_email:'', ansprechpartner_position:'' }))
    }
  }

  async function saveTeilnahme() {
    if (!tForm.kontakt_id || !selectedEvent) return
    setSaving(true)
    const payload = {
      kontakt_id: tForm.kontakt_id,
      veranstaltung_id: selectedEvent.id,
      ansprechpartner_name: tForm.ansprechpartner_name || '',
      ansprechpartner_email: tForm.ansprechpartner_email || '',
      ansprechpartner_position: tForm.ansprechpartner_position || '',
      status: tForm.status || 'Eingeladen',
      notiz: tForm.notiz || '',
      teilgenommen: tForm.status === 'Erschienen'
    }
    let result
    if (tForm.id) {
      result = await supabase.from('veranstaltung_teilnahme').update(payload).eq('id', tForm.id)
    } else {
      result = await supabase.from('veranstaltung_teilnahme').insert(payload)
    }
    if (result.error) {
      alert('Fehler beim Speichern: ' + result.error.message)
    } else {
      setTeilnahmeModal(false)
      await loadTeilnahmen(selectedEvent.id)
    }
    setSaving(false)
  }

  async function updateTeilnahmeStatus(id, status) {
    await supabase.from('veranstaltung_teilnahme').update({ status, teilgenommen: status === 'Erschienen' }).eq('id', id)
    loadTeilnahmen(selectedEvent.id)
  }

  async function deleteTeilnahme(id) {
    if (!window.confirm('Teilnehmer entfernen?')) return
    await supabase.from('veranstaltung_teilnahme').delete().eq('id', id)
    loadTeilnahmen(selectedEvent.id)
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

  const filteredTeilnahmen = teilnahmen.filter(t => !statusFilter || t.status === statusFilter)

  const stats = STATUS_LIST.reduce((acc, s) => {
    acc[s] = teilnahmen.filter(t => t.status === s).length
    return acc
  }, {})

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Veranstaltungen</div>
      <p className="page-subtitle">Events, Teilnehmer & Agenda</p>

      <div style={{ display: 'grid', gridTemplateColumns: selectedEvent ? '320px 1fr' : '1fr', gap: 20 }}>

        {/* LINKE SPALTE: Event-Liste */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <strong style={{ fontSize:15 }}>Alle Events ({events.length})</strong>
            <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY_EVENT); setModal(true) }}>+ Neu</button>
          </div>
          <div style={{ display:'grid', gap:10 }}>
            {events.length === 0
              ? <div className="empty-state"><p>Noch keine Events.</p></div>
              : events.map(e => (
                <div key={e.id} onClick={() => { setSelectedEvent(e); setDetailTab('teilnehmer'); loadTeilnahmen(e.id) }}
                  style={{ padding:16, borderRadius:'var(--radius)', border:'2px solid '+(selectedEvent?.id===e.id?'var(--navy)':'var(--gray-200)'), cursor:'pointer', background:selectedEvent?.id===e.id?'rgba(15,34,64,0.03)':'var(--white)' }}>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{e.name}</div>
                  <div style={{ fontSize:12, color:'var(--gray-400)' }}>
                    {e.datum ? new Date(e.datum).toLocaleDateString('de-DE') : 'Kein Datum'}{e.ort ? ' · '+e.ort : ''}
                  </div>
                  <div style={{ fontSize:12, marginTop:6 }}>
                    <span style={{ background:'var(--gray-100)', padding:'1px 8px', borderRadius:20, color:'var(--gray-600)' }}>{e.art}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* RECHTE SPALTE: Event-Detail */}
        {selectedEvent && (
          <div>
            <div className="card" style={{ padding:20, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ fontFamily:'"DM Serif Display",serif', fontSize:24, color:'var(--navy)', marginBottom:4 }}>{selectedEvent.name}</div>
                  <div style={{ fontSize:14, color:'var(--gray-600)' }}>
                    {selectedEvent.datum ? new Date(selectedEvent.datum).toLocaleDateString('de-DE') : 'Kein Datum'}
                    {selectedEvent.ort ? ' · '+selectedEvent.ort : ''}
                    {selectedEvent.zustaendig ? ' · '+selectedEvent.zustaendig : ''}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-sm btn-outline" onClick={exportPDF}>📄 PDF</button>
                  <button className="btn btn-sm btn-outline" onClick={() => { setForm(selectedEvent); setModal(true) }}>Bearbeiten</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteEvent(selectedEvent.id)}>Loeschen</button>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:8 }}>
                {STATUS_LIST.map(s => stats[s] > 0 && (
                  <span key={s} style={{ fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:600, background:STATUS_COLORS[s].bg, color:STATUS_COLORS[s].color }}>
                    {s}: {stats[s]}
                  </span>
                ))}
                {selectedEvent.praesentation_link && (
                  <a href={selectedEvent.praesentation_link} target="_blank" rel="noreferrer"
                    style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'#ddeaff', color:'#1a4a8a', fontWeight:600, textDecoration:'none' }}>
                    📊 Präsentation
                  </a>
                )}
                {[1,2,3].map(n => selectedEvent[`dokument_link_${n}`] && (
                  <a key={n} href={selectedEvent[`dokument_link_${n}`]} target="_blank" rel="noreferrer"
                    style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'#e2efda', color:'#2d6b3a', fontWeight:600, textDecoration:'none' }}>
                    📎 {selectedEvent[`dokument_titel_${n}`] || `Dokument ${n}`}
                  </a>
                ))}
              </div>
            </div>

            <div className="tabs">
              {[['teilnehmer','Teilnehmer ('+teilnahmen.length+')'],['agenda','Agenda'],['notizen','Notizen']].map(([key,label]) => (
                <button key={key} className={'tab-btn'+(detailTab===key?' active':'')} onClick={() => setDetailTab(key)}>{label}</button>
              ))}
            </div>

            {/* TAB: TEILNEHMER */}
            {detailTab === 'teilnehmer' && (
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ fontSize:13, padding:'6px 10px' }}>
                      <option value="">Alle Status</option>
                      {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => {
                    setTForm({ kontakt_id:'', ansprechpartner_name:'', ansprechpartner_email:'', ansprechpartner_position:'', status:'Eingeladen', notiz:'' })
                    setKontaktAnsprechpartner([])
                    setTeilnahmeModal(true)
                  }}>+ Teilnehmer hinzufügen</button>
                </div>

                {filteredTeilnahmen.length === 0
                  ? <div className="empty-state"><p>Noch keine Teilnehmer.</p></div>
                  : <div style={{ display:'grid', gap:10 }}>
                      {filteredTeilnahmen.map(t => {
                        const sc = STATUS_COLORS[t.status] || { bg:'#ececec', color:'#555' }
                        return (
                          <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', background:'var(--white)', flexWrap:'wrap', gap:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                              {t.kontakte?.logo_url
                                ? <img src={t.kontakte.logo_url} alt="" style={{ width:32, height:32, objectFit:'contain', borderRadius:4, border:'1px solid var(--gray-200)' }} />
                                : <div style={{ width:32, height:32, background:'var(--gray-100)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--gray-400)', flexShrink:0 }}>{t.kontakte?.firma?.[0]}</div>
                              }
                              <div>
                                <div style={{ fontWeight:600, fontSize:14 }}>{t.ansprechpartner_name || t.kontakte?.firma}</div>
                                <div style={{ fontSize:12, color:'var(--gray-400)' }}>
                                  {t.kontakte?.firma}{t.ansprechpartner_position ? ' · '+t.ansprechpartner_position : ''}
                                  {t.ansprechpartner_email ? ' · '+t.ansprechpartner_email : ''}
                                </div>
                                {t.notiz && <div style={{ fontSize:12, color:'var(--gray-600)', marginTop:2, fontStyle:'italic' }}>{t.notiz}</div>}
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                              <select value={t.status} onChange={e => updateTeilnahmeStatus(t.id, e.target.value)}
                                style={{ fontSize:12, padding:'4px 8px', border:'1.5px solid var(--gray-200)', borderRadius:20, background:sc.bg, color:sc.color, fontWeight:600, cursor:'pointer' }}>
                                {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
                              </select>
                              <button className="btn btn-sm btn-outline" onClick={() => { setTForm(t); loadAnsprechpartner(t.kontakt_id); setTeilnahmeModal(true) }}>Bearb.</button>
                              <button className="btn btn-sm btn-danger" onClick={() => deleteTeilnahme(t.id)}>X</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                }
              </div>
            )}

            {/* TAB: AGENDA */}
            {detailTab === 'agenda' && (
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div className="section-title" style={{ margin:0 }}>Agenda</div>
                </div>
                <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                  {[['bold','B'],['italic','I'],['underline','U']].map(([cmd,label]) => (
                    <button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd)}}
                      style={{ padding:'4px 10px', border:'1.5px solid var(--gray-200)', borderRadius:4, background:'var(--white)', cursor:'pointer', fontWeight:cmd==='bold'?700:400, fontStyle:cmd==='italic'?'italic':'normal', textDecoration:cmd==='underline'?'underline':'none', fontSize:13 }}>{label}</button>
                  ))}
                  <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertUnorderedList')}}
                    style={{ padding:'4px 10px', border:'1.5px solid var(--gray-200)', borderRadius:4, background:'var(--white)', cursor:'pointer', fontSize:13 }}>Liste</button>
                  <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertOrderedList')}}
                    style={{ padding:'4px 10px', border:'1.5px solid var(--gray-200)', borderRadius:4, background:'var(--white)', cursor:'pointer', fontSize:13 }}>1. Liste</button>
                </div>
                <div contentEditable suppressContentEditableWarning
                  onBlur={e => saveAgenda(e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{ __html: selectedEvent.agenda || '<p>Agenda hier eintragen...</p>' }}
                  style={{ minHeight:200, border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', padding:16, fontSize:14, lineHeight:1.7, outline:'none', background:'var(--white)' }}
                />
                <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:8 }}>Wird beim Verlassen des Feldes gespeichert.</p>
              </div>
            )}

            {/* TAB: NOTIZEN */}
            {detailTab === 'notizen' && (
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div className="section-title" style={{ margin:0 }}>Notizen & Nachbereitung</div>
                </div>
                {selectedEvent.praesentation_link && (
                  <div style={{ marginBottom:16, padding:'10px 14px', background:'#ddeaff', borderRadius:'var(--radius)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, color:'#1a4a8a' }}>📊 Präsentation verknüpft</span>
                    <a href={selectedEvent.praesentation_link} target="_blank" rel="noreferrer" style={{ fontSize:13, color:'#1a4a8a', fontWeight:600 }}>Öffnen →</a>
                  </div>
                )}
                <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                  {[['bold','B'],['italic','I'],['underline','U']].map(([cmd,label]) => (
                    <button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd)}}
                      style={{ padding:'4px 10px', border:'1.5px solid var(--gray-200)', borderRadius:4, background:'var(--white)', cursor:'pointer', fontWeight:cmd==='bold'?700:400, fontStyle:cmd==='italic'?'italic':'normal', textDecoration:cmd==='underline'?'underline':'none', fontSize:13 }}>{label}</button>
                  ))}
                  <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertUnorderedList')}}
                    style={{ padding:'4px 10px', border:'1.5px solid var(--gray-200)', borderRadius:4, background:'var(--white)', cursor:'pointer', fontSize:13 }}>Liste</button>
                </div>
                <div contentEditable suppressContentEditableWarning
                  onBlur={e => saveNotizen(e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{ __html: selectedEvent.notizen || '<p>Notizen hier eintragen...</p>' }}
                  style={{ minHeight:200, border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', padding:16, fontSize:14, lineHeight:1.7, outline:'none', background:'var(--white)' }}
                />
                <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:8 }}>Wird beim Verlassen des Feldes gespeichert.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: EVENT */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{form.id?'Event bearbeiten':'Neue Veranstaltung'}</span>
              <button className="close-btn" onClick={()=>setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Name *</label><input value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div className="form-row">
                <div className="form-group"><label>Datum</label><input type="date" value={form.datum||''} onChange={e=>setForm(f=>({...f,datum:e.target.value}))}/></div>
                <div className="form-group" style={{position:'relative'}}>
                  <label>Ort</label>
                  <div style={{display:'flex',gap:8}}>
                    <input value={form.ort||''} onChange={e=>{setForm(f=>({...f,ort:e.target.value,ort_id:null}));setOrtSuche(e.target.value);setZeigOrtSuche(true)}}
                      onFocus={()=>setZeigOrtSuche(true)}
                      placeholder="Ort eingeben oder auswählen..."
                      style={{flex:1,padding:'10px 14px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:14}}/>
                    <button type="button" className="btn btn-sm btn-outline" onClick={()=>{setOrtForm({name:form.ort||'',adresse_strasse:'',adresse_plz:'',adresse_stadt:'',kapazitaet:'',notiz:''});setOrtModal(true)}} title="Neuen Ort anlegen">+</button>
                  </div>
                  {zeigOrtSuche && orte.filter(o=>!ortSuche||o.name.toLowerCase().includes(ortSuche.toLowerCase())).length > 0 && (
                    <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',zIndex:10,boxShadow:'var(--shadow)',maxHeight:200,overflowY:'auto'}}>
                      {orte.filter(o=>!ortSuche||o.name.toLowerCase().includes(ortSuche.toLowerCase())).map(o=>(
                        <div key={o.id} onClick={()=>{setForm(f=>({...f,ort:o.name,ort_id:o.id}));setOrtSuche('');setZeigOrtSuche(false)}}
                          style={{padding:'10px 14px',cursor:'pointer',fontSize:14,borderBottom:'1px solid var(--gray-100)'}}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--gray-100)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{fontWeight:600}}>{o.name}</div>
                          {(o.adresse_strasse||o.adresse_stadt) && <div style={{fontSize:12,color:'var(--gray-400)'}}>{[o.adresse_strasse,o.adresse_plz,o.adresse_stadt].filter(Boolean).join(', ')}</div>}
                          {o.kapazitaet && <div style={{fontSize:12,color:'var(--gray-400)'}}>Kapazität: {o.kapazitaet} Personen</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Art</label>
                  <select value={form.art||'Networking-Event'} onChange={e=>setForm(f=>({...f,art:e.target.value}))}>
                    {ART_LIST.map(a=><option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Zustaendig</label><input value={form.zustaendig||''} onChange={e=>setForm(f=>({...f,zustaendig:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label>Praesentations-Link (z.B. Google Slides)</label><input type="url" placeholder="https://..." value={form.praesentation_link||''} onChange={e=>setForm(f=>({...f,praesentation_link:e.target.value}))}/></div>
              <div style={{background:'var(--gray-100)',borderRadius:'var(--radius)',padding:14,marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--gray-600)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:12}}>Weitere Dokument-Links</div>
                {[1,2,3].map(n=>(
                  <div key={n} className="form-row" style={{marginBottom:8}}>
                    <div className="form-group" style={{margin:0}}><label>Titel {n}</label><input value={form[`dokument_titel_${n}`]||''} onChange={e=>setForm(f=>({...f,[`dokument_titel_${n}`]:e.target.value}))} placeholder={`z.B. Teilnehmerliste, Sponsorenmappe...`}/></div>
                    <div className="form-group" style={{margin:0}}><label>Link {n}</label><input type="url" value={form[`dokument_link_${n}`]||''} onChange={e=>setForm(f=>({...f,[`dokument_link_${n}`]:e.target.value}))} placeholder="https://drive.google.com/..."/></div>
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:10,textTransform:'none',fontSize:14,cursor:'pointer',padding:'8px 0'}}>
                  <input type="checkbox" style={{width:18,height:18,flexShrink:0}} checked={form.einladung_versendet||false} onChange={e=>setForm(f=>({...f,einladung_versendet:e.target.checked}))}/>
                  <span>Einladung bereits versendet</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveEvent} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TEILNEHMER */}
      {teilnahmeModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setTeilnahmeModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{tForm.id?'Teilnehmer bearbeiten':'Teilnehmer hinzufügen'}</span>
              <button className="close-btn" onClick={()=>setTeilnahmeModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Firma *</label>
                  <select value={tForm.kontakt_id||''} onChange={e=>{setTForm(f=>({...f,kontakt_id:e.target.value}));loadAnsprechpartner(e.target.value)}}>
                    <option value="">Bitte waehlen...</option>
                    {kontakte.map(k=><option key={k.id} value={k.id}>{k.firma}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Status</label>
                  <select value={tForm.status||'Eingeladen'} onChange={e=>setTForm(f=>({...f,status:e.target.value}))}>
                    {STATUS_LIST.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Ansprechpartner aus der Datenbank */}
              {kontaktAnsprechpartner.length > 0 && (
                <div className="form-group">
                  <label>Ansprechpartner auswählen</label>
                  <div style={{ display:'grid', gap:8 }}>
                    {kontaktAnsprechpartner.map(ap => (
                      <div key={ap.id} onClick={() => setTForm(f=>({...f, ansprechpartner_name:ap.name, ansprechpartner_email:ap.email||'', ansprechpartner_position:ap.position||''}))}
                        style={{ padding:'10px 14px', border:'1.5px solid '+(tForm.ansprechpartner_name===ap.name?'var(--navy)':'var(--gray-200)'), borderRadius:'var(--radius)', cursor:'pointer', background:tForm.ansprechpartner_name===ap.name?'rgba(15,34,64,0.04)':'var(--white)' }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{ap.name} {ap.hauptansprechpartner&&<span style={{fontSize:11,color:'var(--gold)',fontWeight:700}}>★ Hauptkontakt</span>}</div>
                        <div style={{ fontSize:12, color:'var(--gray-400)' }}>{ap.position}{ap.email?' · '+ap.email:''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group"><label>Name Ansprechpartner</label><input value={tForm.ansprechpartner_name||''} onChange={e=>setTForm(f=>({...f,ansprechpartner_name:e.target.value}))} placeholder="Manuell eingeben oder oben waehlen"/></div>
                <div className="form-group"><label>Position</label><input value={tForm.ansprechpartner_position||''} onChange={e=>setTForm(f=>({...f,ansprechpartner_position:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label>E-Mail</label><input type="email" value={tForm.ansprechpartner_email||''} onChange={e=>setTForm(f=>({...f,ansprechpartner_email:e.target.value}))}/></div>
              <div className="form-group"><label>Notiz</label><textarea value={tForm.notiz||''} onChange={e=>setTForm(f=>({...f,notiz:e.target.value}))} placeholder="z.B. Begleitung, besondere Hinweise..."/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setTeilnahmeModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveTeilnahme} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORT ANLEGEN */}
      {ortModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setOrtModal(false)}>
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header">
              <span className="modal-title">{ortForm.id?'Ort bearbeiten':'Neuer Veranstaltungsort'}</span>
              <button className="close-btn" onClick={()=>setOrtModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Name *</label><input value={ortForm.name||''} onChange={e=>setOrtForm(f=>({...f,name:e.target.value}))} placeholder="z.B. Sporthalle Ronzelenstraße" autoFocus/></div>
              <div className="form-group"><label>Strasse & Hausnummer</label><input value={ortForm.adresse_strasse||''} onChange={e=>setOrtForm(f=>({...f,adresse_strasse:e.target.value}))} placeholder="Musterstrasse 1"/></div>
              <div className="form-row">
                <div className="form-group"><label>PLZ</label><input value={ortForm.adresse_plz||''} onChange={e=>setOrtForm(f=>({...f,adresse_plz:e.target.value}))} placeholder="28195"/></div>
                <div className="form-group"><label>Stadt</label><input value={ortForm.adresse_stadt||''} onChange={e=>setOrtForm(f=>({...f,adresse_stadt:e.target.value}))} placeholder="Bremen"/></div>
              </div>
              <div className="form-group"><label>Kapazität (Personen)</label><input type="number" value={ortForm.kapazitaet||''} onChange={e=>setOrtForm(f=>({...f,kapazitaet:e.target.value}))} placeholder="z.B. 200"/></div>
              <div className="form-group"><label>Notiz</label><textarea value={ortForm.notiz||''} onChange={e=>setOrtForm(f=>({...f,notiz:e.target.value}))} placeholder="z.B. Parkplätze vorhanden, Catering möglich..."/></div>
              {(ortForm.adresse_strasse||ortForm.adresse_stadt) && (
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent([ortForm.adresse_strasse,ortForm.adresse_plz,ortForm.adresse_stadt].filter(Boolean).join(', '))}&output=embed&zoom=15`}
                  width="100%" height="160" style={{border:'none',borderRadius:'var(--radius)',marginTop:8}} title="Karte" loading="lazy"
                />
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setOrtModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveOrt} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORTE VERWALTEN */}
    </main>
  )
}
