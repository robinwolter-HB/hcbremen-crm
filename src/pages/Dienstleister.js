import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DIENSTLEISTER_TYPEN = ['Catering','Location','Technik','Marketing','Druck','Personal','Transport','Reinigung','Security','Fotografie','Sonstiges']
const ZAHLUNGSZIELE = [7, 14, 30, 45, 60]

function fmt(d) { return d ? new Date(d).toLocaleDateString('de-DE') : '-' }

export default function Dienstleister() {
  const [liste, setListe] = useState([])
  const [historie, setHistorie] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [historieModal, setHistorieModal] = useState(false)
  const [hForm, setHForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [typFilter, setTypFilter] = useState('')
  const [detailTab, setDetailTab] = useState('info')

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadHistorie(selected.id) }, [selected])

  async function load() {
    const { data } = await supabase.from('dienstleister').select('*').order('firma')
    setListe(data || [])
    setLoading(false)
  }

  async function loadHistorie(id) {
    const { data } = await supabase.from('dienstleister_historie').select('*').eq('dienstleister_id', id).order('datum', { ascending: false })
    setHistorie(data || [])
  }

  function openNew() {
    setForm({ firma:'', typ:'Sonstiges', ansprechpartner:'', telefon:'', email:'', adresse:'', zahlungsbedingungen:'', zahlungsziel_tage:30, iban:'', notizen:'', aktiv:true })
    setModal(true)
  }

  function openEdit(d) { setForm({ ...d }); setModal(true) }

  async function save() {
    if (!form.firma?.trim()) return
    setSaving(true)
    const payload = { firma:form.firma, typ:form.typ||'Sonstiges', ansprechpartner:form.ansprechpartner||null, telefon:form.telefon||null, email:form.email||null, adresse:form.adresse||null, zahlungsbedingungen:form.zahlungsbedingungen||null, zahlungsziel_tage:form.zahlungsziel_tage||30, iban:form.iban||null, notizen:form.notizen||null, aktiv:form.aktiv!==false }
    if (form.id) {
      await supabase.from('dienstleister').update(payload).eq('id', form.id)
      if (selected?.id === form.id) setSelected(s => ({ ...s, ...payload }))
    } else {
      const { data } = await supabase.from('dienstleister').insert(payload).select().single()
      if (data) setSelected(data)
    }
    setModal(false); setSaving(false); load()
  }

  async function deleteDL(id) {
    if (!window.confirm('Dienstleister wirklich loeschen?')) return
    await supabase.from('dienstleister').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  async function saveHistorie() {
    if (!hForm.beschreibung?.trim() || !selected) return
    setSaving(true)
    const payload = { dienstleister_id:selected.id, event_name:hForm.event_name||null, datum:hForm.datum||null, beschreibung:hForm.beschreibung, betrag:hForm.betrag||null, bezahlt:hForm.bezahlt||false, rechnung_nr:hForm.rechnung_nr||null, notiz:hForm.notiz||null }
    if (hForm.id) await supabase.from('dienstleister_historie').update(payload).eq('id', hForm.id)
    else await supabase.from('dienstleister_historie').insert(payload)
    setHistorieModal(false); setSaving(false); loadHistorie(selected.id)
  }

  async function deleteHistorie(id) {
    await supabase.from('dienstleister_historie').delete().eq('id', id)
    loadHistorie(selected.id)
  }

  async function toggleBezahlt(h) {
    await supabase.from('dienstleister_historie').update({ bezahlt: !h.bezahlt }).eq('id', h.id)
    loadHistorie(selected.id)
  }

  const filtered = liste.filter(d => {
    const matchSearch = !search || d.firma.toLowerCase().includes(search.toLowerCase()) || (d.ansprechpartner||'').toLowerCase().includes(search.toLowerCase())
    const matchTyp = !typFilter || d.typ === typFilter
    return matchSearch && matchTyp
  })

  const gesamtUmsatz = historie.reduce((s,h) => s + Number(h.betrag||0), 0)
  const offen = historie.filter(h => !h.bezahlt).reduce((s,h) => s + Number(h.betrag||0), 0)

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Dienstleister</div>
      <p className="page-subtitle">Externe Partner, Kontakte und Kostenhistorie</p>

      <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:20,alignItems:'start'}}>

        {/* LINKE SPALTE */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <strong style={{fontSize:14,color:'var(--navy)'}}>Alle Dienstleister ({filtered.length})</strong>
            <button className="btn btn-primary btn-sm" onClick={openNew}>+ Neu</button>
          </div>
          <div style={{display:'grid',gap:8,marginBottom:12}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suche..." style={{padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
            <select value={typFilter} onChange={e=>setTypFilter(e.target.value)} style={{padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}>
              <option value="">Alle Typen</option>
              {DIENSTLEISTER_TYPEN.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gap:8}}>
            {filtered.length===0&&<div className="card" style={{textAlign:'center',color:'var(--gray-400)',fontSize:13,padding:24}}>Keine Dienstleister.</div>}
            {filtered.map(d => (
              <div key={d.id} onClick={()=>{ setSelected(d); setDetailTab('info') }}
                style={{padding:14,border:'1.5px solid '+(selected?.id===d.id?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:selected?.id===d.id?'rgba(15,34,64,0.04)':'var(--white)',opacity:d.aktiv?1:0.6}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                  <strong style={{fontSize:13,color:'var(--navy)'}}>{d.firma}</strong>
                  <span style={{fontSize:10,background:'var(--gray-100)',color:'var(--gray-600)',padding:'1px 7px',borderRadius:10,flexShrink:0,marginLeft:6}}>{d.typ}</span>
                </div>
                {d.ansprechpartner&&<div style={{fontSize:11,color:'var(--gray-500)'}}>{d.ansprechpartner}</div>}
                {d.email&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{d.email}</div>}
                {!d.aktiv&&<span style={{fontSize:10,color:'var(--gray-400)'}}>Inaktiv</span>}
              </div>
            ))}
          </div>
        </div>

        {/* RECHTE SPALTE */}
        {!selected ? (
          <div className="card" style={{textAlign:'center',padding:60,color:'var(--gray-400)'}}>
            <p style={{fontSize:16,marginBottom:8}}>Kein Dienstleister ausgewaehlt</p>
            <p style={{fontSize:13}}>Waehle einen Dienstleister oder erstelle einen neuen.</p>
          </div>
        ) : (
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontFamily:'"DM Serif Display",serif',fontSize:22,color:'var(--navy)',marginBottom:4}}>{selected.firma}</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:12,background:'var(--gray-100)',color:'var(--gray-600)',padding:'2px 10px',borderRadius:10,fontWeight:600}}>{selected.typ}</span>
                    {!selected.aktiv&&<span style={{fontSize:12,background:'#fce4d6',color:'#8a3a1a',padding:'2px 10px',borderRadius:10,fontWeight:600}}>Inaktiv</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-sm btn-outline" onClick={()=>openEdit(selected)}>Bearb.</button>
                  <button className="btn btn-sm btn-danger" onClick={()=>deleteDL(selected.id)}>X</button>
                </div>
              </div>

              {/* Schnellkontakt */}
              <div style={{display:'flex',gap:16,marginTop:12,paddingTop:12,borderTop:'1px solid var(--gray-100)',flexWrap:'wrap'}}>
                {selected.ansprechpartner&&<div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,display:'block'}}>Ansprechpartner</span><strong>{selected.ansprechpartner}</strong></div>}
                {selected.telefon&&<div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,display:'block'}}>Telefon</span><a href={'tel:'+selected.telefon} style={{color:'var(--navy)',fontWeight:600,textDecoration:'none'}}>{selected.telefon}</a></div>}
                {selected.email&&<div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,display:'block'}}>E-Mail</span><a href={'mailto:'+selected.email} style={{color:'var(--navy)',fontWeight:600,textDecoration:'none'}}>{selected.email}</a></div>}
                {selected.zahlungsziel_tage&&<div style={{fontSize:13}}><span style={{color:'var(--gray-400)',fontSize:11,display:'block'}}>Zahlungsziel</span><strong>{selected.zahlungsziel_tage} Tage</strong></div>}
              </div>

              {/* Kosten-Schnellinfo */}
              {historie.length>0&&(
                <div style={{display:'flex',gap:16,marginTop:10,paddingTop:10,borderTop:'1px solid var(--gray-100)',fontSize:12}}>
                  <span style={{color:'var(--gray-400)'}}>Gesamt: <strong>{gesamtUmsatz.toLocaleString('de-DE')} EUR</strong></span>
                  {offen>0&&<span style={{color:'var(--gray-400)'}}>Offen: <strong style={{color:'var(--red)'}}>{offen.toLocaleString('de-DE')} EUR</strong></span>}
                  <span style={{color:'var(--gray-400)'}}>{historie.length} Eintraege</span>
                </div>
              )}
            </div>

            <div className="tabs" style={{marginBottom:16}}>
              {[['info','Kontaktdaten'],['historie',`Historie (${historie.length})`]].map(([key,label])=>(
                <button key={key} className={'tab-btn'+(detailTab===key?' active':'')} onClick={()=>setDetailTab(key)}>{label}</button>
              ))}
            </div>

            {/* TAB: INFO */}
            {detailTab==='info'&&(
              <div className="card">
                <div className="section-title" style={{marginBottom:16}}>Kontakt & Konditionen</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  {[
                    ['Firma',selected.firma],
                    ['Typ',selected.typ],
                    ['Ansprechpartner',selected.ansprechpartner],
                    ['Telefon',selected.telefon],
                    ['E-Mail',selected.email],
                    ['Adresse',selected.adresse],
                    ['Zahlungsbedingungen',selected.zahlungsbedingungen],
                    ['Zahlungsziel',selected.zahlungsziel_tage?selected.zahlungsziel_tage+' Tage':null],
                    ['IBAN',selected.iban],
                  ].map(([label,val])=>val?(
                    <div key={label} style={{padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                      <div style={{fontSize:11,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:3}}>{label}</div>
                      <div style={{fontSize:13,fontWeight:500}}>{val}</div>
                    </div>
                  ):null)}
                </div>
                {selected.notizen&&(
                  <div style={{marginTop:16,padding:14,background:'var(--gray-100)',borderRadius:'var(--radius)'}}>
                    <div style={{fontSize:11,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:6}}>Notizen</div>
                    <div style={{fontSize:13,lineHeight:1.7}}>{selected.notizen}</div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: HISTORIE */}
            {detailTab==='historie'&&(
              <div>
                <div className="toolbar">
                  <button className="btn btn-primary" onClick={()=>{ setHForm({ bezahlt:false, datum:new Date().toISOString().slice(0,10) }); setHistorieModal(true) }}>+ Eintrag</button>
                </div>
                {historie.length===0
                  ? <div className="empty-state card"><p>Noch keine Histoirie-Eintraege.</p></div>
                  : <div style={{display:'grid',gap:8}}>
                      {historie.map(h => (
                        <div key={h.id} style={{padding:14,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',background:'var(--white)'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                            <div>
                              <div style={{fontWeight:600,fontSize:14}}>{h.beschreibung}</div>
                              <div style={{fontSize:12,color:'var(--gray-500)',marginTop:2}}>
                                {h.datum&&<span>{fmt(h.datum)}</span>}
                                {h.event_name&&<span style={{marginLeft:8}}>Event: <strong>{h.event_name}</strong></span>}
                                {h.rechnung_nr&&<span style={{marginLeft:8}}>Rg-Nr: {h.rechnung_nr}</span>}
                              </div>
                              {h.notiz&&<div style={{fontSize:12,color:'var(--gray-400)',marginTop:4,fontStyle:'italic'}}>{h.notiz}</div>}
                            </div>
                            <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0,marginLeft:12}}>
                              {h.betrag&&<strong style={{fontSize:15,color:'var(--navy)'}}>{Number(h.betrag).toLocaleString('de-DE')} EUR</strong>}
                              <button onClick={()=>toggleBezahlt(h)}
                                style={{padding:'2px 10px',borderRadius:10,border:'1.5px solid',fontSize:12,fontWeight:600,cursor:'pointer',background:h.bezahlt?'#e2efda':'var(--white)',borderColor:h.bezahlt?'#3a8a5a':'var(--gray-200)',color:h.bezahlt?'#2d6b3a':'var(--gray-500)'}}>
                                {h.bezahlt?'Bezahlt':'Offen'}
                              </button>
                              <button className="btn btn-sm btn-outline" onClick={()=>{ setHForm(h); setHistorieModal(true) }}>Bearb.</button>
                              <button className="btn btn-sm btn-danger" onClick={()=>deleteHistorie(h.id)}>X</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {offen>0&&(
                        <div style={{padding:12,background:'#fff5f5',border:'1.5px solid #f0c0c0',borderRadius:'var(--radius)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontSize:13,color:'#8a3a1a',fontWeight:600}}>Offene Zahlungen</span>
                          <strong style={{color:'var(--red)',fontSize:15}}>{offen.toLocaleString('de-DE')} EUR</strong>
                        </div>
                      )}
                    </div>
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Dienstleister */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header">
              <span className="modal-title">{form.id?'Dienstleister bearbeiten':'Neuer Dienstleister'}</span>
              <button className="close-btn" onClick={()=>setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Firma *</label><input value={form.firma||''} onChange={e=>setForm(f=>({...f,firma:e.target.value}))} autoFocus/></div>
                <div className="form-group"><label>Typ / Art der Dienstleistung</label>
                  <select value={form.typ||'Sonstiges'} onChange={e=>setForm(f=>({...f,typ:e.target.value}))}>
                    {DIENSTLEISTER_TYPEN.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Ansprechpartner</label><input value={form.ansprechpartner||''} onChange={e=>setForm(f=>({...f,ansprechpartner:e.target.value}))}/></div>
                <div className="form-group"><label>Telefon</label><input value={form.telefon||''} onChange={e=>setForm(f=>({...f,telefon:e.target.value}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
                <div className="form-group"><label>Adresse</label><input value={form.adresse||''} onChange={e=>setForm(f=>({...f,adresse:e.target.value}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Zahlungsbedingungen</label><input value={form.zahlungsbedingungen||''} onChange={e=>setForm(f=>({...f,zahlungsbedingungen:e.target.value}))} placeholder="z.B. 30 Tage netto"/></div>
                <div className="form-group"><label>Zahlungsziel (Tage)</label>
                  <select value={form.zahlungsziel_tage||30} onChange={e=>setForm(f=>({...f,zahlungsziel_tage:parseInt(e.target.value)}))}>
                    {ZAHLUNGSZIELE.map(z=><option key={z} value={z}>{z} Tage</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>IBAN</label><input value={form.iban||''} onChange={e=>setForm(f=>({...f,iban:e.target.value}))} placeholder="DE00 0000 0000 0000 0000 00"/></div>
              <div className="form-group"><label>Notizen</label><textarea value={form.notizen||''} onChange={e=>setForm(f=>({...f,notizen:e.target.value}))}/></div>
              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}>
                  <input type="checkbox" checked={form.aktiv!==false} onChange={e=>setForm(f=>({...f,aktiv:e.target.checked}))}/>
                  Aktiv
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Historie */}
      {historieModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setHistorieModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{hForm.id?'Eintrag bearbeiten':'Neuer Historie-Eintrag'}</span>
              <button className="close-btn" onClick={()=>setHistorieModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Beschreibung *</label><input value={hForm.beschreibung||''} onChange={e=>setHForm(f=>({...f,beschreibung:e.target.value}))} placeholder="z.B. Catering Sponsoren-Abend 2026" autoFocus/></div>
              <div className="form-row">
                <div className="form-group"><label>Datum</label><input type="date" value={hForm.datum||''} onChange={e=>setHForm(f=>({...f,datum:e.target.value}))}/></div>
                <div className="form-group"><label>Betrag (EUR)</label><input type="number" value={hForm.betrag||''} onChange={e=>setHForm(f=>({...f,betrag:e.target.value}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Event / Veranstaltung</label><input value={hForm.event_name||''} onChange={e=>setHForm(f=>({...f,event_name:e.target.value}))} placeholder="z.B. Sponsoren-Abend 2026"/></div>
                <div className="form-group"><label>Rechnungsnummer</label><input value={hForm.rechnung_nr||''} onChange={e=>setHForm(f=>({...f,rechnung_nr:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label>Notiz</label><textarea value={hForm.notiz||''} onChange={e=>setHForm(f=>({...f,notiz:e.target.value}))}/></div>
              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}>
                  <input type="checkbox" checked={hForm.bezahlt||false} onChange={e=>setHForm(f=>({...f,bezahlt:e.target.checked}))}/>
                  Bereits bezahlt
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setHistorieModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveHistorie} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
