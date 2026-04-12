import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_LIST = ['Anfrage','In Verhandlung','Aktiv','Ausgelaufen','Gekuendigt']

export default function Sponsoring() {
  const [tab, setTab] = useState('vertraege')
  const [vertraege, setVertraege] = useState([])
  const [saisons, setSaisons] = useState([])
  const [pakete, setPakete] = useState([])
  const [sachleistungenTypen, setSachleistungenTypen] = useState([])
  const [kontakte, setKontakte] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saisonFilter, setSaisonFilter] = useState('')
  const [selectedSaison, setSelectedSaison] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: v }, { data: s }, { data: p }, { data: st }, { data: k }] = await Promise.all([
      supabase.from('sponsoring').select('*,kontakte(firma,logo_url),saisons(name),sponsoring_pakete(name)').order('erstellt_am', { ascending: false }),
      supabase.from('saisons').select('*').order('beginn', { ascending: false }),
      supabase.from('sponsoring_pakete').select('*').eq('aktiv', true),
      supabase.from('sachleistungen_typen').select('*').eq('aktiv', true),
      supabase.from('kontakte').select('id,firma').order('firma')
    ])
    setVertraege(v || [])
    setSaisons(s || [])
    setPakete(p || [])
    setSachleistungenTypen(st || [])
    setKontakte(k || [])
    const aktiv = s?.find(x => x.aktiv)
    if (aktiv) setSelectedSaison(aktiv.id)
    setLoading(false)
  }

  function openNew() {
    const aktiveSaison = saisons.find(s => s.aktiv)
    setForm({
      kontakt_id:'', saison_id: aktiveSaison?.id||'', paket_id:'',
      jahresbetrag:'', gesamtwert:'', status:'Anfrage',
      vertragsbeginn:'', vertragsende:'', laufzeit_jahre:'',
      verlaengerung_besprochen:'Offen', auto_verlaengerung:false,
      vertrag_unterzeichnet:false, vertrag_unterzeichnet_am:'',
      kuendigungsfrist_tage:30, drive_link:'', notizen:'',
      individuelle_leistungen:[], sachleistungen:[]
    })
    setModal(true)
  }

  function openEdit(v) {
    setForm({ ...v, saison_id:v.saison_id||'', paket_id:v.paket_id||'', sachleistungen:v.sachleistungen||[], individuelle_leistungen:v.individuelle_leistungen||[] })
    setModal(true)
  }

  async function save() {
    if (!form.kontakt_id) return
    setSaving(true)
    const payload = {
      kontakt_id:form.kontakt_id, saison_id:form.saison_id||null, paket_id:form.paket_id||null,
      jahresbetrag:form.jahresbetrag||null, gesamtwert:form.gesamtwert||null, status:form.status,
      vertragsbeginn:form.vertragsbeginn||null, vertragsende:form.vertragsende||null,
      laufzeit_jahre:form.laufzeit_jahre||null, verlaengerung_besprochen:form.verlaengerung_besprochen,
      auto_verlaengerung:form.auto_verlaengerung, vertrag_unterzeichnet:form.vertrag_unterzeichnet,
      vertrag_unterzeichnet_am:form.vertrag_unterzeichnet_am||null,
      kuendigungsfrist_tage:form.kuendigungsfrist_tage||30,
      drive_link:form.drive_link||null, notizen:form.notizen||null,
      individuelle_leistungen:form.individuelle_leistungen||[],
      sachleistungen:form.sachleistungen||[], geaendert_am:new Date().toISOString()
    }
    if (form.id) await supabase.from('sponsoring').update(payload).eq('id', form.id)
    else await supabase.from('sponsoring').insert(payload)
    setModal(false); setSaving(false); loadAll()
  }

  async function deleteVertrag(id) {
    if (!window.confirm('Vertrag wirklich löschen?')) return
    await supabase.from('sponsoring').delete().eq('id', id)
    loadAll()
  }

  function addSachleistung() { setForm(f => ({ ...f, sachleistungen: [...(f.sachleistungen||[]), {typ:'',menge:'',wert:''}] })) }
  function updateSl(idx, field, val) { setForm(f => { const sl=[...(f.sachleistungen||[])]; sl[idx]={...sl[idx],[field]:val}; return {...f,sachleistungen:sl} }) }
  function removeSl(idx) { setForm(f => ({...f, sachleistungen:f.sachleistungen.filter((_,i)=>i!==idx)})) }
  function addLeistung() { setForm(f => ({...f, individuelle_leistungen:[...(f.individuelle_leistungen||[]),'']})) }
  function updateLeistung(idx, val) { setForm(f => { const l=[...(f.individuelle_leistungen||[])]; l[idx]=val; return {...f,individuelle_leistungen:l} }) }
  function removeLeistung(idx) { setForm(f => ({...f, individuelle_leistungen:f.individuelle_leistungen.filter((_,i)=>i!==idx)})) }

  const filteredBySaison = vertraege.filter(v => !selectedSaison || v.saison_id === selectedSaison)
  const gesamtGeld = filteredBySaison.reduce((s,v) => s+(Number(v.jahresbetrag)||0), 0)
  const gesamtWert = filteredBySaison.reduce((s,v) => s+(Number(v.gesamtwert)||0), 0)
  const auslaufend = vertraege.filter(v => { if(!v.vertragsende) return false; const diff=(new Date(v.vertragsende)-new Date())/(1000*60*60*24); return diff>=0&&diff<60 })
  const filtered = vertraege.filter(v => !saisonFilter || v.saison_id === saisonFilter)

  const saisonStats = saisons.map(s => {
    const sv = vertraege.filter(v => v.saison_id === s.id)
    return { name:s.name, id:s.id, anzahl:sv.length, geld:sv.reduce((sum,v)=>sum+(Number(v.jahresbetrag)||0),0), wert:sv.reduce((sum,v)=>sum+(Number(v.gesamtwert)||0),0) }
  }).filter(s => s.anzahl > 0)

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Sponsoring</div>
      <p className="page-subtitle">Vertragsverwaltung & Auswertung</p>

      {auslaufend.length > 0 && (
        <div className="alert alert-error" style={{marginBottom:20}}>
          ⚠️ {auslaufend.length} Vertrag{auslaufend.length>1?'e laufen':' läuft'} in weniger als 60 Tagen aus: {auslaufend.map(v=>v.kontakte?.firma).join(', ')}
        </div>
      )}

      <div className="tabs">
        {[['vertraege','Verträge'],['uebersicht','Saisonübersicht'],['auswertung','Auswertung & Vergleich']].map(([key,label])=>(
          <button key={key} className={`tab-btn${tab===key?' active':''}`} onClick={()=>setTab(key)}>{label}</button>
        ))}
      </div>

      {tab==='vertraege' && (
        <div>
          <div className="toolbar">
            <select value={saisonFilter} onChange={e=>setSaisonFilter(e.target.value)}>
              <option value="">Alle Saisons</option>
              {saisons.map(s=><option key={s.id} value={s.id}>{s.name}{s.aktiv?' (aktuell)':''}</option>)}
            </select>
            <button className="btn btn-primary" onClick={openNew}>+ Neuer Vertrag</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Firma</th><th>Saison</th><th>Paket</th><th>Jahresbetrag</th><th>Gesamtwert</th><th>Vertragsende</th><th>Status</th><th>✓</th><th></th></tr></thead>
              <tbody>
                {filtered.length===0 ? <tr><td colSpan="9"><div className="empty-state"><p>Keine Verträge.</p></div></td></tr>
                  : filtered.map(v => {
                    const istAuslaufend = auslaufend.find(a=>a.id===v.id)
                    return (
                      <tr key={v.id} style={{background:istAuslaufend?'#fff8f8':'inherit'}}>
                        <td><strong>{v.kontakte?.firma}</strong></td>
                        <td style={{fontSize:13}}>{v.saisons?.name||'—'}</td>
                        <td style={{fontSize:13}}>{v.sponsoring_pakete?.name||'—'}</td>
                        <td style={{fontWeight:600}}>{v.jahresbetrag?`${Number(v.jahresbetrag).toLocaleString('de-DE')} €`:'—'}</td>
                        <td style={{fontSize:13}}>{v.gesamtwert?`${Number(v.gesamtwert).toLocaleString('de-DE')} €`:'—'}</td>
                        <td style={{fontSize:13,color:istAuslaufend?'var(--red)':'inherit',fontWeight:istAuslaufend?600:400}}>{v.vertragsende?new Date(v.vertragsende).toLocaleDateString('de-DE'):'—'}</td>
                        <td><span style={{fontSize:12,padding:'2px 8px',borderRadius:20,fontWeight:600,background:v.status==='Aktiv'?'#e2efda':v.status==='In Verhandlung'?'#ddeaff':'#ececec',color:v.status==='Aktiv'?'#2d6b3a':'#555'}}>{v.status}</span></td>
                        <td>{v.vertrag_unterzeichnet?'✅':'⬜'}</td>
                        <td style={{whiteSpace:'nowrap'}}>
                          <button className="btn btn-sm btn-outline" onClick={()=>openEdit(v)}>Bearb.</button>{' '}
                          <button className="btn btn-sm btn-danger" onClick={()=>deleteVertrag(v.id)}>✕</button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='uebersicht' && (
        <div>
          <div className="toolbar">
            <select value={selectedSaison} onChange={e=>setSelectedSaison(e.target.value)}>
              {saisons.map(s=><option key={s.id} value={s.id}>{s.name}{s.aktiv?' (aktuell)':''}</option>)}
            </select>
          </div>
          <div className="stats-row">
            <div className="stat-card green"><div className="stat-num">{filteredBySaison.filter(v=>v.status==='Aktiv').length}</div><div className="stat-label">Aktive Sponsoren</div></div>
            <div className="stat-card gold"><div className="stat-num" style={{fontSize:24}}>{gesamtGeld.toLocaleString('de-DE')} €</div><div className="stat-label">Geldsponsoring</div></div>
            <div className="stat-card blue"><div className="stat-num" style={{fontSize:24}}>{gesamtWert.toLocaleString('de-DE')} €</div><div className="stat-label">Gesamtwert</div></div>
            <div className="stat-card orange"><div className="stat-num">{filteredBySaison.length}</div><div className="stat-label">Verträge gesamt</div></div>
          </div>
          <div className="card">
            <div className="section-title">Sponsoren {saisons.find(s=>s.id===selectedSaison)?.name}</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Firma</th><th>Paket</th><th>Jahresbetrag</th><th>Sachleistungen</th><th>Gesamtwert</th><th>Laufzeit</th><th>Auto-Verlängerung</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredBySaison.length===0 ? <tr><td colSpan="8"><div className="empty-state"><p>Keine Verträge für diese Saison.</p></div></td></tr>
                    : filteredBySaison.map(v=>(
                      <tr key={v.id}>
                        <td><strong>{v.kontakte?.firma}</strong></td>
                        <td style={{fontSize:13}}>{v.sponsoring_pakete?.name||'—'}</td>
                        <td style={{fontWeight:600}}>{v.jahresbetrag?`${Number(v.jahresbetrag).toLocaleString('de-DE')} €`:'—'}</td>
                        <td style={{fontSize:12,maxWidth:200}}>{(v.sachleistungen||[]).length>0?v.sachleistungen.map((sl,i)=><div key={i}>{sl.typ}: {sl.menge}{sl.wert?` (${Number(sl.wert).toLocaleString('de-DE')} €)`:''}</div>):'—'}</td>
                        <td>{v.gesamtwert?`${Number(v.gesamtwert).toLocaleString('de-DE')} €`:'—'}</td>
                        <td style={{fontSize:13}}>{v.laufzeit_jahre?`${v.laufzeit_jahre} J.`:'—'}</td>
                        <td>{v.auto_verlaengerung?'✅':'—'}</td>
                        <td><span style={{fontSize:12,padding:'2px 8px',borderRadius:20,fontWeight:600,background:v.status==='Aktiv'?'#e2efda':'#ececec',color:v.status==='Aktiv'?'#2d6b3a':'#555'}}>{v.status}</span></td>
                      </tr>
                    ))}
                </tbody>
                {filteredBySaison.length>0&&<tfoot><tr style={{background:'var(--gray-100)',fontWeight:700}}><td colSpan="2">Gesamt</td><td>{gesamtGeld.toLocaleString('de-DE')} €</td><td></td><td>{gesamtWert.toLocaleString('de-DE')} €</td><td colSpan="3"></td></tr></tfoot>}
              </table>
            </div>
          </div>
        </div>
      )}

      {tab==='auswertung' && (
        <div>
          <div className="card">
            <div className="section-title">Saisonvergleich</div>
            {saisonStats.length<2 ? <div className="empty-state"><p>Mindestens 2 Saisons mit Verträgen nötig.</p></div>
              : <div className="table-wrap"><table>
                  <thead><tr><th>Saison</th><th>Sponsoren</th><th>Geldsponsoring</th><th>Gesamtwert</th><th>Ø pro Sponsor</th><th>Veränderung</th></tr></thead>
                  <tbody>
                    {saisonStats.map((s,i)=>{
                      const prev=saisonStats[i+1]
                      const delta=prev?s.geld-prev.geld:null
                      const deltaP=prev&&prev.geld>0?((s.geld-prev.geld)/prev.geld*100).toFixed(1):null
                      return <tr key={s.name}>
                        <td><strong>{s.name}</strong></td>
                        <td>{s.anzahl}</td>
                        <td style={{fontWeight:600}}>{s.geld.toLocaleString('de-DE')} €</td>
                        <td>{s.wert.toLocaleString('de-DE')} €</td>
                        <td>{s.anzahl>0?Math.round(s.geld/s.anzahl).toLocaleString('de-DE')+' €':'—'}</td>
                        <td>{delta!==null?<span style={{color:delta>=0?'var(--green)':'var(--red)',fontWeight:600}}>{delta>=0?'+':''}{delta.toLocaleString('de-DE')} € ({deltaP}%)</span>:'—'}</td>
                      </tr>
                    })}
                  </tbody>
                </table></div>}
          </div>
          <div className="card">
            <div className="section-title">Sachleistungen-Übersicht</div>
            {(()=>{
              const allSl=vertraege.flatMap(v=>(v.sachleistungen||[]).map(sl=>({...sl,firma:v.kontakte?.firma})))
              if(allSl.length===0) return <div className="empty-state"><p>Noch keine Sachleistungen erfasst.</p></div>
              const byTyp=allSl.reduce((acc,sl)=>{if(!acc[sl.typ])acc[sl.typ]=[];acc[sl.typ].push(sl);return acc},{})
              return <div className="table-wrap"><table>
                <thead><tr><th>Typ</th><th>Anzahl</th><th>Firmen</th><th>Gesamtwert</th></tr></thead>
                <tbody>{Object.entries(byTyp).map(([typ,items])=>(
                  <tr key={typ}><td><strong>{typ}</strong></td><td>{items.length}</td>
                  <td style={{fontSize:13,color:'var(--gray-600)'}}>{items.map(i=>i.firma).join(', ')}</td>
                  <td style={{fontWeight:600}}>{items.reduce((s,i)=>s+(Number(i.wert)||0),0).toLocaleString('de-DE')} €</td></tr>
                ))}</tbody>
              </table></div>
            })()}
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{maxWidth:760}}>
            <div className="modal-header">
              <span className="modal-title">{form.id?'Vertrag bearbeiten':'Neuer Vertrag'}</span>
              <button className="close-btn" onClick={()=>setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Firma *</label>
                  <select value={form.kontakt_id} onChange={e=>setForm(f=>({...f,kontakt_id:e.target.value}))}>
                    <option value="">Bitte wählen...</option>
                    {kontakte.map(k=><option key={k.id} value={k.id}>{k.firma}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Saison</label>
                  <select value={form.saison_id} onChange={e=>setForm(f=>({...f,saison_id:e.target.value}))}>
                    <option value="">Keine</option>
                    {saisons.map(s=><option key={s.id} value={s.id}>{s.name}{s.aktiv?' (aktuell)':''}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Paket</label>
                  <select value={form.paket_id} onChange={e=>{const p=pakete.find(p=>p.id===e.target.value);setForm(f=>({...f,paket_id:e.target.value,jahresbetrag:p?.basispreis||f.jahresbetrag}))}}>
                    <option value="">Individuell</option>
                    {pakete.map(p=><option key={p.id} value={p.id}>{p.name}{p.basispreis?` (${Number(p.basispreis).toLocaleString('de-DE')} €)`:''}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {STATUS_LIST.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Jahresbetrag (€)</label><input type="number" value={form.jahresbetrag||''} onChange={e=>setForm(f=>({...f,jahresbetrag:e.target.value}))}/></div>
                <div className="form-group"><label>Gesamtwert inkl. Sachleistungen (€)</label><input type="number" value={form.gesamtwert||''} onChange={e=>setForm(f=>({...f,gesamtwert:e.target.value}))}/></div>
              </div>
              <div className="form-row-3">
                <div className="form-group"><label>Vertragsbeginn</label><input type="date" value={form.vertragsbeginn||''} onChange={e=>setForm(f=>({...f,vertragsbeginn:e.target.value}))}/></div>
                <div className="form-group"><label>Vertragsende</label><input type="date" value={form.vertragsende||''} onChange={e=>setForm(f=>({...f,vertragsende:e.target.value}))}/></div>
                <div className="form-group"><label>Laufzeit (Jahre)</label><input type="number" value={form.laufzeit_jahre||''} onChange={e=>setForm(f=>({...f,laufzeit_jahre:e.target.value}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Verlängerung besprochen</label>
                  <select value={form.verlaengerung_besprochen} onChange={e=>setForm(f=>({...f,verlaengerung_besprochen:e.target.value}))}>
                    {['Offen','Ja','Nein'].map(v=><option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Kündigungsfrist (Tage)</label><input type="number" value={form.kuendigungsfrist_tage||30} onChange={e=>setForm(f=>({...f,kuendigungsfrist_tage:e.target.value}))}/></div>
              </div>
              <div className="form-row" style={{marginBottom:16}}>
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                  <input type="checkbox" checked={form.auto_verlaengerung||false} onChange={e=>setForm(f=>({...f,auto_verlaengerung:e.target.checked}))}/>Auto-Verlängerung
                </label>
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                  <input type="checkbox" checked={form.vertrag_unterzeichnet||false} onChange={e=>setForm(f=>({...f,vertrag_unterzeichnet:e.target.checked}))}/>Vertrag unterzeichnet
                </label>
              </div>
              {form.vertrag_unterzeichnet&&<div className="form-group"><label>Unterzeichnet am</label><input type="date" value={form.vertrag_unterzeichnet_am||''} onChange={e=>setForm(f=>({...f,vertrag_unterzeichnet_am:e.target.value}))}/></div>}
              <div className="form-group"><label>Drive-Link (Vertrag)</label><input type="url" placeholder="https://..." value={form.drive_link||''} onChange={e=>setForm(f=>({...f,drive_link:e.target.value}))}/></div>

              <div style={{marginBottom:18}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--gray-600)',textTransform:'uppercase',letterSpacing:'0.3px'}}>Sachleistungen</label>
                  <button className="btn btn-sm btn-outline" onClick={addSachleistung}>+ Hinzufügen</button>
                </div>
                {(form.sachleistungen||[]).map((sl,idx)=>(
                  <div key={idx} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:8,marginBottom:8,alignItems:'center'}}>
                    <select value={sl.typ||''} onChange={e=>updateSl(idx,'typ',e.target.value)} style={{padding:'8px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}>
                      <option value="">Typ wählen...</option>
                      {sachleistungenTypen.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                    <input placeholder="Menge" value={sl.menge||''} onChange={e=>updateSl(idx,'menge',e.target.value)} style={{padding:'8px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
                    <input placeholder="Wert (€)" type="number" value={sl.wert||''} onChange={e=>updateSl(idx,'wert',e.target.value)} style={{padding:'8px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
                    <button onClick={()=>removeSl(idx)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:18}}>✕</button>
                  </div>
                ))}
              </div>

              <div style={{marginBottom:18}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--gray-600)',textTransform:'uppercase',letterSpacing:'0.3px'}}>Individuelle Leistungen</label>
                  <button className="btn btn-sm btn-outline" onClick={addLeistung}>+ Hinzufügen</button>
                </div>
                {(form.individuelle_leistungen||[]).map((l,idx)=>(
                  <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:8}}>
                    <input value={l} onChange={e=>updateLeistung(idx,e.target.value)} placeholder="z.B. Naming Right Heimspiel" style={{padding:'8px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
                    <button onClick={()=>removeLeistung(idx)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:18}}>✕</button>
                  </div>
                ))}
              </div>

              <div className="form-group"><label>Notizen</label><textarea value={form.notizen||''} onChange={e=>setForm(f=>({...f,notizen:e.target.value}))}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
