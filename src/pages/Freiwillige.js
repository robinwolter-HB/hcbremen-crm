import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const RAENGE = ['Helfer','Teamleiter','Schichtleiter','Koordinator','Verantwortlicher']
const ERFAHRUNG = ['Ja','Erfahren','Experte']
const GROESSEN_T = ['XS','S','M','L','XL','XXL','3XL']
const GROESSEN_HOSE = ['28','30','32','34','36','38','40','42','44','46','48','50']
const GROESSEN_SCHUH = ['36','37','38','39','40','41','42','43','44','45','46','47']
const STATUS = ['Angefragt','Zugesagt','Abgesagt','Erschienen','Nicht erschienen']
const STATUS_COLORS = {
  'Angefragt':{ bg:'#fff3cd',color:'#8a6a00' },
  'Zugesagt':{ bg:'#e2efda',color:'#2d6b3a' },
  'Abgesagt':{ bg:'#fce4d6',color:'#8a3a1a' },
  'Erschienen':{ bg:'#c6efce',color:'#1a5a2a' },
  'Nicht erschienen':{ bg:'#ececec',color:'#555' },
}

function Badge({ label, bg, color }) {
  return <span style={{ fontSize:11, padding:'1px 8px', borderRadius:10, fontWeight:600, background:bg, color }}>{label}</span>
}

export default function Freiwillige() {
  const [liste, setListe] = useState([])
  const [faehigkeiten, setFaehigkeiten] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [selectedFaehigkeiten, setSelectedFaehigkeiten] = useState([])
  const [detailTab, setDetailTab] = useState('profil')
  const [search, setSearch] = useState('')
  const [faehigkeitFilter, setFaehigkeitFilter] = useState('')
  const [saving, setSaving] = useState(false)

  // Modals
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [faehigkeitModal, setFaehigkeitModal] = useState(false)
  const [faehigkeitForm, setFaehigkeitForm] = useState({})

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadFaehigkeiten(selected.id) }, [selected])

  async function load() {
    const [{ data: f }, { data: fk }] = await Promise.all([
      supabase.from('freiwillige').select('*').order('nachname'),
      supabase.from('freiwillige_faehigkeiten').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setListe(f || [])
    setFaehigkeiten(fk || [])
    setLoading(false)
  }

  async function loadFaehigkeiten(id) {
    const { data } = await supabase.from('freiwillige_zu_faehigkeiten')
      .select('*,freiwillige_faehigkeiten(name,kategorie)')
      .eq('freiwilliger_id', id)
    setSelectedFaehigkeiten(data || [])
  }

  function openNew() {
    setForm({ aktiv: true })
    setModal(true)
  }

  async function save() {
    if (!form.vorname?.trim() || !form.nachname?.trim()) return
    setSaving(true)
    const p = { vorname:form.vorname, nachname:form.nachname, email:form.email||null, telefon:form.telefon||null, geburtsdatum:form.geburtsdatum||null, t_shirt_groesse:form.t_shirt_groesse||null, jacken_groesse:form.jacken_groesse||null, hosen_groesse:form.hosen_groesse||null, schuh_groesse:form.schuh_groesse||null, notizen:form.notizen||null, aktiv:form.aktiv!==false }
    if (form.id) {
      await supabase.from('freiwillige').update(p).eq('id', form.id)
      if (selected?.id === form.id) setSelected(s => ({ ...s, ...p }))
    } else {
      const { data } = await supabase.from('freiwillige').insert(p).select().single()
      if (data) setSelected(data)
    }
    setModal(false); setSaving(false); load()
  }

  async function toggleFaehigkeit(faehigkeitId) {
    if (!selected) return
    const existing = selectedFaehigkeiten.find(f => f.faehigkeit_id === faehigkeitId)
    if (existing) {
      await supabase.from('freiwillige_zu_faehigkeiten').delete().eq('id', existing.id)
    } else {
      await supabase.from('freiwillige_zu_faehigkeiten').insert({ freiwilliger_id:selected.id, faehigkeit_id:faehigkeitId, erfahrung:'Ja' })
    }
    loadFaehigkeiten(selected.id)
    load()
  }

  async function updateErfahrung(id, erfahrung) {
    await supabase.from('freiwillige_zu_faehigkeiten').update({ erfahrung }).eq('id', id)
    loadFaehigkeiten(selected.id)
  }

  async function saveFaehigkeit() {
    if (!faehigkeitForm.name?.trim()) return
    setSaving(true)
    const p = { name:faehigkeitForm.name, kategorie:faehigkeitForm.kategorie||null, reihenfolge:faehigkeitForm.reihenfolge||faehigkeiten.length, aktiv:true }
    if (faehigkeitForm.id) await supabase.from('freiwillige_faehigkeiten').update(p).eq('id', faehigkeitForm.id)
    else await supabase.from('freiwillige_faehigkeiten').insert(p)
    setFaehigkeitModal(false); setSaving(false); load()
  }

  const kategorien = [...new Set(faehigkeiten.map(f => f.kategorie).filter(Boolean))]

  const filtered = liste.filter(f => {
    const name = (f.vorname + ' ' + f.nachname).toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase()) || (f.email||'').toLowerCase().includes(search.toLowerCase())
    const matchFk = !faehigkeitFilter
    return matchSearch && matchFk
  })

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">👥 Freiwillige & Vereinspersonen</div>
      <p className="page-subtitle">Helfer, Fähigkeiten und Event-Einsätze verwalten</p>

      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:20, alignItems:'start' }}>

        {/* LINKE SPALTE */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <strong style={{ fontSize:14, color:'var(--navy)' }}>Alle Personen ({filtered.length})</strong>
            <button className="btn btn-primary btn-sm" onClick={openNew}>+ Neu</button>
          </div>
          <div style={{ display:'grid', gap:8, marginBottom:12 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Name oder E-Mail..." style={{ padding:'8px 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13 }}/>
            <select value={faehigkeitFilter} onChange={e=>setFaehigkeitFilter(e.target.value)} style={{ padding:'8px 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13 }}>
              <option value="">Alle Fähigkeiten</option>
              {faehigkeiten.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gap:8 }}>
            {filtered.length === 0 && <div className="card" style={{ textAlign:'center', color:'var(--gray-400)', fontSize:13, padding:32 }}>Keine Personen gefunden.</div>}
            {filtered.map(f => {

              return (
                <div key={f.id} onClick={() => { setSelected(f); setDetailTab('profil') }}
                  style={{ padding:14, border:'1.5px solid '+(selected?.id===f.id?'var(--navy)':'var(--gray-200)'), borderRadius:'var(--radius)', cursor:'pointer', background:selected?.id===f.id?'rgba(15,34,64,0.04)':'var(--white)', opacity:f.aktiv?1:0.6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                    <strong style={{ fontSize:13, color:'var(--navy)' }}>{f.vorname} {f.nachname}</strong>
                    {!f.aktiv && <span style={{ fontSize:10, background:'var(--gray-200)', color:'var(--gray-600)', padding:'1px 6px', borderRadius:10 }}>Inaktiv</span>}
                  </div>
                  {f.email && <div style={{ fontSize:11, color:'var(--gray-500)' }}>{f.email}</div>}

                </div>
              )
            })}
          </div>
        </div>

        {/* RECHTE SPALTE */}
        {!selected ? (
          <div className="card" style={{ textAlign:'center', padding:60, color:'var(--gray-400)' }}>
            <p style={{ fontSize:15, marginBottom:8 }}>Person auswaehlen</p>
            <p style={{ fontSize:13 }}>Oder neue Person anlegen.</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontFamily:'"DM Serif Display",serif', fontSize:22, color:'var(--navy)', marginBottom:4 }}>{selected.vorname} {selected.nachname}</div>
                  <div style={{ display:'flex', gap:12, fontSize:13, color:'var(--gray-600)', flexWrap:'wrap' }}>
                    {selected.email && <a href={'mailto:'+selected.email} style={{ color:'var(--navy)', textDecoration:'none' }}>{selected.email}</a>}
                    {selected.telefon && <a href={'tel:'+selected.telefon} style={{ color:'var(--navy)', textDecoration:'none' }}>{selected.telefon}</a>}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                    {selectedFaehigkeiten.map(z => (
                      <span key={z.id} style={{ fontSize:11, background:'#ddeaff', color:'#1a4a8a', padding:'2px 8px', borderRadius:10, fontWeight:600 }}>
                        {z.freiwillige_faehigkeiten?.name}
                        {z.erfahrung !== 'Ja' && <span style={{ marginLeft:4, opacity:0.7 }}>({z.erfahrung})</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => { setForm(selected); setModal(true) }}>Bearb.</button>
                  <button className="btn btn-sm btn-danger" onClick={async () => {
                    if (!window.confirm('Person wirklich loeschen?')) return
                    await supabase.from('freiwillige').delete().eq('id', selected.id)
                    setSelected(null); load()
                  }}>X</button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom:16 }}>
              {[['profil','Profil & Größen'],['faehigkeiten','Fähigkeiten'],['einsaetze','Event-Einsätze']].map(([k,l]) => (
                <button key={k} className={'tab-btn'+(detailTab===k?' active':'')} onClick={() => setDetailTab(k)}>{l}</button>
              ))}
            </div>

            {/* TAB: PROFIL */}
            {detailTab==='profil' && (
              <div className="card">
                <div className="section-title" style={{ marginBottom:16 }}>Persönliche Daten</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  {[
                    ['Vorname', selected.vorname],
                    ['Nachname', selected.nachname],
                    ['E-Mail', selected.email],
                    ['Telefon', selected.telefon],
                    ['Geburtsdatum', selected.geburtsdatum ? new Date(selected.geburtsdatum).toLocaleDateString('de-DE') : null],
                  ].map(([label, val]) => val ? (
                    <div key={label} style={{ padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
                      <div style={{ fontSize:11, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.3px', marginBottom:3 }}>{label}</div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{val}</div>
                    </div>
                  ) : null)}
                </div>

                {(selected.t_shirt_groesse || selected.jacken_groesse || selected.hosen_groesse || selected.schuh_groesse) && (
                  <div style={{ marginTop:20 }}>
                    <div className="section-title" style={{ marginBottom:12 }}>Kleidungsgrößen</div>
                    <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                      {selected.t_shirt_groesse && <div style={{ padding:'10px 20px', background:'var(--gray-100)', borderRadius:'var(--radius)', textAlign:'center' }}><div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:4 }}>T-Shirt</div><strong style={{ fontSize:18 }}>{selected.t_shirt_groesse}</strong></div>}
                      {selected.jacken_groesse && <div style={{ padding:'10px 20px', background:'var(--gray-100)', borderRadius:'var(--radius)', textAlign:'center' }}><div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:4 }}>Jacke</div><strong style={{ fontSize:18 }}>{selected.jacken_groesse}</strong></div>}
                      {selected.hosen_groesse && <div style={{ padding:'10px 20px', background:'var(--gray-100)', borderRadius:'var(--radius)', textAlign:'center' }}><div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:4 }}>Hose</div><strong style={{ fontSize:18 }}>{selected.hosen_groesse}</strong></div>}
                      {selected.schuh_groesse && <div style={{ padding:'10px 20px', background:'var(--gray-100)', borderRadius:'var(--radius)', textAlign:'center' }}><div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:4 }}>Schuhe</div><strong style={{ fontSize:18 }}>{selected.schuh_groesse}</strong></div>}
                    </div>
                  </div>
                )}

                {selected.notizen && (
                  <div style={{ marginTop:16, padding:14, background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                    <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:6, textTransform:'uppercase' }}>Notizen</div>
                    <div style={{ fontSize:13, lineHeight:1.7 }}>{selected.notizen}</div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: FÄHIGKEITEN */}
            {detailTab==='faehigkeiten' && (
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div>
                    <div className="section-title" style={{ margin:0 }}>Fähigkeiten & Bereiche</div>
                    <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>{selectedFaehigkeiten.length} Fähigkeiten ausgewählt</p>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => { setFaehigkeitForm({ reihenfolge:faehigkeiten.length }); setFaehigkeitModal(true) }}>+ Neue Fähigkeit</button>
                </div>
                {kategorien.map(kat => (
                  <div key={kat} style={{ marginBottom:20 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>{kat}</div>
                    <div style={{ display:'grid', gap:6 }}>
                      {faehigkeiten.filter(f => f.kategorie === kat).map(fk => {
                        const zugeordnet = selectedFaehigkeiten.find(z => z.faehigkeit_id === fk.id)
                        return (
                          <div key={fk.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1.5px solid '+(zugeordnet?'var(--navy)':'var(--gray-200)'), borderRadius:'var(--radius)', background:zugeordnet?'rgba(15,34,64,0.04)':'var(--white)', cursor:'pointer' }}
                            onClick={() => toggleFaehigkeit(fk.id)}>
                            <input type="checkbox" checked={!!zugeordnet} onChange={() => {}} style={{ width:18, height:18, flexShrink:0 }}/>
                            <span style={{ flex:1, fontSize:14, fontWeight:zugeordnet?600:400 }}>{fk.name}</span>
                            {zugeordnet && (
                              <select value={zugeordnet.erfahrung} onClick={e=>e.stopPropagation()} onChange={e=>updateErfahrung(zugeordnet.id, e.target.value)}
                                style={{ fontSize:12, padding:'3px 8px', border:'1.5px solid var(--gray-200)', borderRadius:20, cursor:'pointer' }}>
                                {ERFAHRUNG.map(e => <option key={e}>{e}</option>)}
                              </select>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {faehigkeiten.filter(f => !f.kategorie).length > 0 && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Sonstiges</div>
                    <div style={{ display:'grid', gap:6 }}>
                      {faehigkeiten.filter(f => !f.kategorie).map(fk => {
                        const zugeordnet = selectedFaehigkeiten.find(z => z.faehigkeit_id === fk.id)
                        return (
                          <div key={fk.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1.5px solid '+(zugeordnet?'var(--navy)':'var(--gray-200)'), borderRadius:'var(--radius)', background:zugeordnet?'rgba(15,34,64,0.04)':'var(--white)', cursor:'pointer' }}
                            onClick={() => toggleFaehigkeit(fk.id)}>
                            <input type="checkbox" checked={!!zugeordnet} onChange={() => {}} style={{ width:18, height:18, flexShrink:0 }}/>
                            <span style={{ flex:1, fontSize:14 }}>{fk.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: EINSÄTZE */}
            {detailTab==='einsaetze' && (
              <EinsaetzeTab freiwilligerId={selected.id} name={selected.vorname+' '+selected.nachname}/>
            )}
          </div>
        )}
      </div>

      {/* Modal: Person */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:680 }}>
            <div className="modal-header">
              <span className="modal-title">{form.id?'Person bearbeiten':'Neue Person'}</span>
              <button className="close-btn" onClick={()=>setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Vorname *</label><input value={form.vorname||''} onChange={e=>setForm(f=>({...f,vorname:e.target.value}))} autoFocus/></div>
                <div className="form-group"><label>Nachname *</label><input value={form.nachname||''} onChange={e=>setForm(f=>({...f,nachname:e.target.value}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
                <div className="form-group"><label>Telefon</label><input value={form.telefon||''} onChange={e=>setForm(f=>({...f,telefon:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label>Geburtsdatum</label><input type="date" value={form.geburtsdatum||''} onChange={e=>setForm(f=>({...f,geburtsdatum:e.target.value}))}/></div>

              <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:14, marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--gray-600)', textTransform:'uppercase', letterSpacing:'0.3px', marginBottom:12 }}>Kleidungsgrößen</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group" style={{ margin:0 }}>
                    <label>T-Shirt Größe</label>
                    <select value={form.t_shirt_groesse||''} onChange={e=>setForm(f=>({...f,t_shirt_groesse:e.target.value}))}>
                      <option value="">--</option>
                      {GROESSEN_T.map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    <label>Jacken Größe</label>
                    <select value={form.jacken_groesse||''} onChange={e=>setForm(f=>({...f,jacken_groesse:e.target.value}))}>
                      <option value="">--</option>
                      {GROESSEN_T.map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    <label>Hosen Größe</label>
                    <select value={form.hosen_groesse||''} onChange={e=>setForm(f=>({...f,hosen_groesse:e.target.value}))}>
                      <option value="">--</option>
                      {GROESSEN_HOSE.map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    <label>Schuh Größe</label>
                    <select value={form.schuh_groesse||''} onChange={e=>setForm(f=>({...f,schuh_groesse:e.target.value}))}>
                      <option value="">--</option>
                      {GROESSEN_SCHUH.map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-group"><label>Notizen</label><textarea value={form.notizen||''} onChange={e=>setForm(f=>({...f,notizen:e.target.value}))}/></div>
              <div className="form-group">
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer', textTransform:'none' }}>
                  <input type="checkbox" checked={form.aktiv!==false} onChange={e=>setForm(f=>({...f,aktiv:e.target.checked}))}/>Aktiv
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

      {/* Modal: Fähigkeit */}
      {faehigkeitModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setFaehigkeitModal(false)}>
          <div className="modal" style={{ maxWidth:480 }}>
            <div className="modal-header">
              <span className="modal-title">{faehigkeitForm.id?'Fähigkeit bearbeiten':'Neue Fähigkeit'}</span>
              <button className="close-btn" onClick={()=>setFaehigkeitModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Name *</label><input value={faehigkeitForm.name||''} onChange={e=>setFaehigkeitForm(f=>({...f,name:e.target.value}))} autoFocus/></div>
              <div className="form-row">
                <div className="form-group"><label>Kategorie</label><input value={faehigkeitForm.kategorie||''} onChange={e=>setFaehigkeitForm(f=>({...f,kategorie:e.target.value}))} placeholder="z.B. Technik, Service..."/></div>
                <div className="form-group"><label>Reihenfolge</label><input type="number" value={faehigkeitForm.reihenfolge||0} onChange={e=>setFaehigkeitForm(f=>({...f,reihenfolge:parseInt(e.target.value)||0}))}/></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setFaehigkeitModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveFaehigkeit} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function EinsaetzeTab({ freiwilligerId, name }) {
  const [einsaetze, setEinsaetze] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('event_freiwillige')
      .select('*,event_positionen(titel,rang,event_id)')
      .eq('freiwilliger_id', freiwilligerId)
      .order('erstellt_am', { ascending: false })
      .then(({ data }) => { setEinsaetze(data||[]); setLoading(false) })
  }, [freiwilligerId])

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom:16 }}>Event-Einsätze von {name}</div>
      {einsaetze.length === 0 ? <div className="empty-state"><p>Noch keine Einsätze zugeordnet.</p></div> : (
        <div style={{ display:'grid', gap:8 }}>
          {einsaetze.map(e => {
            const sc = STATUS_COLORS[e.status] || { bg:'#ececec', color:'#555' }
            return (
              <div key={e.id} style={{ padding:'12px 16px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{e.event_positionen?.titel || 'Position'}</div>
                    <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:2 }}>
                      Rang: <strong>{e.rang}</strong>
                    </div>
                    {e.notiz && <div style={{ fontSize:12, color:'var(--gray-400)', fontStyle:'italic', marginTop:4 }}>{e.notiz}</div>}
                  </div>
                  <Badge label={e.status} bg={sc.bg} color={sc.color}/>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
