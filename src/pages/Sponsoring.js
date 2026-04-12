import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_LIST = ['Anfrage','In Verhandlung','Aktiv','Ausgelaufen','Gekuendigt']
const ABRECHNUNG_LIST = ['saison','vertrag']

export default function Sponsoring() {
  const [tab, setTab] = useState('vertraege')
  const [vertraege, setVertraege] = useState([])
  const [saisons, setSaisons] = useState([])
  const [pakete, setPakete] = useState([])
  const [katalog, setKatalog] = useState([])
  const [kategorien, setKategorien] = useState([])
  const [gebuchteLeistungen, setGebuchteLeistungen] = useState([])
  const [sachleistungenTypen, setSachleistungenTypen] = useState([])
  const [kontakte, setKontakte] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [paketModal, setPaketModal] = useState(false)
  const [katModal, setKatModal] = useState(false)
  const [leistungModal, setLeistungModal] = useState(false)
  const [form, setForm] = useState({})
  const [paketForm, setPaketForm] = useState({name:'',beschreibung:'',basispreis:'',leistungen:[],aktiv:true})
  const [katForm, setKatForm] = useState({name:'',farbe:'#2d6fa3',reihenfolge:0})
  const [leistungForm, setLeistungForm] = useState({name:'',beschreibung:'',preis:'',exklusiv:false,max_anzahl:1,abrechnung:'saison',aktiv:true,kategorie_id:''})
  const [saving, setSaving] = useState(false)
  const [saisonFilter, setSaisonFilter] = useState('')
  const [selectedSaison, setSelectedSaison] = useState('')
  const [uebersichtKat, setUebersichtKat] = useState('')
  const [uebersichtSaison, setUebersichtSaison] = useState('')
  const [neueLeistungPaket, setNeueLeistungPaket] = useState('')
  const [paketLeistungen, setPaketLeistungen] = useState({})
  const [saisonModal, setSaisonModal] = useState(false)
  const [saisonForm, setSaisonForm] = useState({name:'',beginn:'',ende:'',aktiv:false})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: v },{ data: s },{ data: p },{ data: k },{ data: kat },{ data: gl },{ data: st },{ data: ko },{ data: plRaw }] = await Promise.all([
      supabase.from('sponsoring').select('*,kontakte(firma,logo_url),saisons(name),sponsoring_pakete(name),sponsoring_saisons(saison_id,saisons(name))').order('erstellt_am', { ascending: false }),
      supabase.from('saisons').select('*').order('beginn', { ascending: false }),
      supabase.from('sponsoring_pakete').select('*').order('basispreis', { ascending: true, nullsFirst: false }),
      supabase.from('leistungen_katalog').select('*,leistungen_kategorien(name,farbe)').order('erstellt_am'),
      supabase.from('leistungen_kategorien').select('*').order('reihenfolge'),
      supabase.from('sponsoring_leistungen').select('*,leistungen_katalog(name,exklusiv,max_anzahl,leistungen_kategorien(name,farbe)),kontakte(firma),saisons(name)').order('erstellt_am'),
      supabase.from('sachleistungen_typen').select('*').eq('aktiv', true),
      supabase.from('kontakte').select('id,firma').order('firma'),
      supabase.from('paket_leistungen').select('*,leistungen_katalog(id,name,leistungen_kategorien(name,farbe))').order('erstellt_am')
    ])
    setVertraege(v || [])
    setSaisons(s || [])
    setPakete(p || [])
    setKatalog(k || [])
    setKategorien(kat || [])
    setGebuchteLeistungen(gl || [])
    setSachleistungenTypen(st || [])
    setKontakte(ko || [])
    // Paket-Leistungen gruppiert nach Paket-ID
    const plByPaket = (plRaw || []).reduce((acc, pl) => {
      if (!acc[pl.paket_id]) acc[pl.paket_id] = []
      acc[pl.paket_id].push(pl)
      return acc
    }, {})
    setPaketLeistungen(plByPaket)
    const aktiv = s?.find(x => x.aktiv)
    if (aktiv) { setSelectedSaison(aktiv.id); setUebersichtSaison(aktiv.id) }
    setLoading(false)
  }

  // ---- VERTRÄGE ----
  function openNew() {
    const aktiveSaison = saisons.find(s => s.aktiv)
    setForm({ kontakt_id:'', saison_id:aktiveSaison?.id||'', selected_saisons:aktiveSaison?[aktiveSaison.id]:[], paket_id:'', jahresbetrag:'', gesamtwert:'', status:'Anfrage', vertragsbeginn:'', vertragsende:'', laufzeit_jahre:'', verlaengerung_besprochen:'Offen', auto_verlaengerung:false, vertrag_unterzeichnet:false, vertrag_unterzeichnet_am:'', kuendigungsfrist_tage:30, drive_link:'', notizen:'', individuelle_leistungen:[], sachleistungen:[] })
    setModal(true)
  }

  function openEdit(v) {
    const selectedSaisons = (v.sponsoring_saisons || []).map(ss => ss.saison_id)
    setForm({ ...v, saison_id:v.saison_id||'', paket_id:v.paket_id||'', sachleistungen:v.sachleistungen||[], individuelle_leistungen:v.individuelle_leistungen||[], selected_saisons: selectedSaisons.length > 0 ? selectedSaisons : (v.saison_id ? [v.saison_id] : []) })
    setModal(true)
  }

  function toggleSaison(sid) {
    setForm(f => {
      const current = f.selected_saisons || []
      const updated = current.includes(sid) ? current.filter(s => s !== sid) : [...current, sid]
      return { ...f, selected_saisons: updated, saison_id: updated[0] || '' }
    })
  }

  async function save() {
    if (!form.kontakt_id) return
    setSaving(true)
    const payload = { kontakt_id:form.kontakt_id, saison_id:form.selected_saisons?.[0]||null, paket_id:form.paket_id||null, jahresbetrag:form.jahresbetrag||null, gesamtwert:form.gesamtwert||null, status:form.status, vertragsbeginn:form.vertragsbeginn||null, vertragsende:form.vertragsende||null, laufzeit_jahre:form.laufzeit_jahre||null, verlaengerung_besprochen:form.verlaengerung_besprochen, auto_verlaengerung:form.auto_verlaengerung, vertrag_unterzeichnet:form.vertrag_unterzeichnet, vertrag_unterzeichnet_am:form.vertrag_unterzeichnet_am||null, kuendigungsfrist_tage:form.kuendigungsfrist_tage||30, drive_link:form.drive_link||null, notizen:form.notizen||null, individuelle_leistungen:form.individuelle_leistungen||[], sachleistungen:form.sachleistungen||[], geaendert_am:new Date().toISOString() }
    let sponsoringId = form.id
    if (form.id) {
      await supabase.from('sponsoring').update(payload).eq('id', form.id)
    } else {
      const { data } = await supabase.from('sponsoring').insert(payload).select().single()
      sponsoringId = data?.id
    }
    if (sponsoringId && form.selected_saisons) {
      await supabase.from('sponsoring_saisons').delete().eq('sponsoring_id', sponsoringId)
      if (form.selected_saisons.length > 0) {
        await supabase.from('sponsoring_saisons').insert(form.selected_saisons.map(sid => ({ sponsoring_id: sponsoringId, saison_id: sid })))
      }
    }
    setModal(false); setSaving(false); loadAll()
  }

  async function deleteVertrag(id) {
    if (!window.confirm('Vertrag wirklich loeschen?')) return
    await supabase.from('sponsoring').delete().eq('id', id); loadAll()
  }

  // ---- PAKETE ----
  async function savePaket() {
    setSaving(true)
    const payload = { name:paketForm.name, beschreibung:paketForm.beschreibung||null, basispreis:paketForm.basispreis||null, leistungen:paketForm.leistungen||[], aktiv:paketForm.aktiv }
    if (paketForm.id) await supabase.from('sponsoring_pakete').update(payload).eq('id', paketForm.id)
    else await supabase.from('sponsoring_pakete').insert(payload)
    setPaketModal(false); setSaving(false); loadAll()
  }

  async function deletePaket(id) {
    if (!window.confirm('Paket loeschen?')) return
    await supabase.from('sponsoring_pakete').delete().eq('id', id); loadAll()
  }

  // ---- SAISONS ----
  async function saveSaison() {
    setSaving(true)
    const payload = { name:saisonForm.name, beginn:saisonForm.beginn||null, ende:saisonForm.ende||null, aktiv:saisonForm.aktiv }
    if (saisonForm.id) {
      if (saisonForm.aktiv) await supabase.from('saisons').update({ aktiv: false }).neq('id', saisonForm.id)
      await supabase.from('saisons').update(payload).eq('id', saisonForm.id)
    } else {
      if (saisonForm.aktiv) await supabase.from('saisons').update({ aktiv: false }).gt('id', '0')
      await supabase.from('saisons').insert(payload)
    }
    setSaisonModal(false); setSaving(false); loadAll()
  }

  async function deleteSaison(id) {
    if (!window.confirm('Saison loeschen? Alle Verknuepfungen bleiben erhalten.')) return
    await supabase.from('saisons').delete().eq('id', id); loadAll()
  }

  async function savePaketLeistung(paketId, leistungId, anzahl) {
    if (!leistungId) return
    const { error } = await supabase.from('paket_leistungen').upsert({ paket_id: paketId, leistung_id: leistungId, anzahl: anzahl || 1 }, { onConflict: 'paket_id,leistung_id' })
    if (!error) loadAll()
  }

  async function deletePaketLeistung(paketId, leistungId) {
    await supabase.from('paket_leistungen').delete().eq('paket_id', paketId).eq('leistung_id', leistungId)
    loadAll()
  }

  // Beim Waehlen eines Pakets im Vertrag: Leistungen automatisch vorschlagen
  async function onPaketChange(paketId) {
    const p = pakete.find(p => p.id === paketId)
    setForm(f => ({ ...f, paket_id: paketId, jahresbetrag: p?.basispreis || f.jahresbetrag }))
  }

  // ---- KATEGORIEN ----
  async function saveKat() {
    setSaving(true)
    const payload = { name:katForm.name, farbe:katForm.farbe, reihenfolge:katForm.reihenfolge||0 }
    if (katForm.id) await supabase.from('leistungen_kategorien').update(payload).eq('id', katForm.id)
    else await supabase.from('leistungen_kategorien').insert(payload)
    setKatModal(false); setSaving(false); loadAll()
  }

  async function deleteKat(id) {
    if (!window.confirm('Kategorie loeschen?')) return
    await supabase.from('leistungen_kategorien').delete().eq('id', id); loadAll()
  }

  // ---- LEISTUNGEN KATALOG ----
  async function saveLeistung() {
    setSaving(true)
    const payload = { name:leistungForm.name, beschreibung:leistungForm.beschreibung||null, preis:leistungForm.preis||null, exklusiv:leistungForm.exklusiv, max_anzahl:leistungForm.max_anzahl||1, abrechnung:leistungForm.abrechnung, aktiv:leistungForm.aktiv, kategorie_id:leistungForm.kategorie_id||null }
    if (leistungForm.id) await supabase.from('leistungen_katalog').update(payload).eq('id', leistungForm.id)
    else await supabase.from('leistungen_katalog').insert(payload)
    setLeistungModal(false); setSaving(false); loadAll()
  }

  async function deleteLeistung(id) {
    if (!window.confirm('Leistung loeschen?')) return
    await supabase.from('leistungen_katalog').delete().eq('id', id); loadAll()
  }

  // ---- HELPERS ----
  function addSl() { setForm(f => ({ ...f, sachleistungen: [...(f.sachleistungen||[]), {typ:'',menge:'',wert:''}] })) }
  function updateSl(idx, field, val) { setForm(f => { const sl=[...(f.sachleistungen||[])]; sl[idx]={...sl[idx],[field]:val}; return {...f,sachleistungen:sl} }) }
  function removeSl(idx) { setForm(f => ({...f, sachleistungen:f.sachleistungen.filter((_,i)=>i!==idx)})) }
  function addIL() { setForm(f => ({...f, individuelle_leistungen:[...(f.individuelle_leistungen||[]),'']})) }
  function updateIL(idx, val) { setForm(f => { const l=[...(f.individuelle_leistungen||[])]; l[idx]=val; return {...f,individuelle_leistungen:l} }) }
  function removeIL(idx) { setForm(f => ({...f, individuelle_leistungen:f.individuelle_leistungen.filter((_,i)=>i!==idx)})) }

  const auslaufend = vertraege.filter(v => { if(!v.vertragsende) return false; const diff=(new Date(v.vertragsende)-new Date())/(1000*60*60*24); return diff>=0&&diff<60 })
  const filtered = vertraege.filter(v => !saisonFilter || v.saison_id === saisonFilter || (v.sponsoring_saisons||[]).some(ss=>ss.saison_id===saisonFilter))
  const filteredBySaison = vertraege.filter(v => !selectedSaison || v.saison_id === selectedSaison || (v.sponsoring_saisons||[]).some(ss=>ss.saison_id===selectedSaison))
  const gesamtGeld = filteredBySaison.reduce((s,v) => s+(Number(v.jahresbetrag)||0), 0)
  const gesamtWert = filteredBySaison.reduce((s,v) => s+(Number(v.gesamtwert)||0), 0)
  const saisonStats = saisons.map(s => { const sv=vertraege.filter(v=>v.saison_id===s.id||(v.sponsoring_saisons||[]).some(ss=>ss.saison_id===s.id)); return {name:s.name,id:s.id,anzahl:sv.length,geld:sv.reduce((sum,v)=>sum+(Number(v.jahresbetrag)||0),0),wert:sv.reduce((sum,v)=>sum+(Number(v.gesamtwert)||0),0)} }).filter(s=>s.anzahl>0)

  // Leistungsübersicht
  const filteredGL = gebuchteLeistungen.filter(gl => {
    const katMatch = !uebersichtKat || gl.leistungen_katalog?.leistungen_kategorien?.name === uebersichtKat
    const saisonMatch = !uebersichtSaison || gl.saison_id === uebersichtSaison
    return katMatch && saisonMatch
  })

  function getLeistungStatus(leistung) {
    const buchungen = gebuchteLeistungen.filter(gl => gl.leistung_id === leistung.id && (!uebersichtSaison || gl.saison_id === uebersichtSaison))
    const gebucht = buchungen.reduce((s,b) => s + (b.anzahl||1), 0)
    const max = leistung.max_anzahl || 1
    if (leistung.exklusiv) return gebucht >= max ? 'belegt' : 'frei'
    return gebucht > 0 ? `${gebucht}x gebucht` : 'frei'
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Sponsoring</div>
      <p className="page-subtitle">Vertragsverwaltung, Leistungen & Auswertung</p>
      {auslaufend.length>0&&<div className="alert alert-error" style={{marginBottom:20}}>⚠️ {auslaufend.length} Vertrag{auslaufend.length>1?'e laufen':' laeuft'} in weniger als 60 Tagen aus: {auslaufend.map(v=>v.kontakte?.firma).join(', ')}</div>}

      <div className="tabs">
        {[['vertraege','Vertraege'],['uebersicht','Saisonuebersicht'],['leistungen','Leistungsuebersicht'],['katalog','Leistungskatalog'],['pakete','Pakete'],['saisonverwaltung','Saisons'],['auswertung','Auswertung']].map(([key,label])=>(
          <button key={key} className={'tab-btn'+(tab===key?' active':'')} onClick={()=>setTab(key)}>{label}</button>
        ))}
      </div>

      {/* ====== VERTRÄGE ====== */}
      {tab==='vertraege'&&(
        <div>
          <div className="toolbar">
            <select value={saisonFilter} onChange={e=>setSaisonFilter(e.target.value)}>
              <option value="">Alle Saisons</option>
              {saisons.map(s=><option key={s.id} value={s.id}>{s.name}{s.aktiv?' (aktuell)':''}</option>)}
            </select>
            <button className="btn btn-primary" onClick={openNew}>+ Neuer Vertrag</button>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Firma</th><th>Saisons</th><th>Paket</th><th>Jahresbetrag</th><th>Vertragsende</th><th>Status</th><th>Unterzeichnet</th><th></th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan="8"><div className="empty-state"><p>Keine Vertraege.</p></div></td></tr>
                :filtered.map(v=>{
                  const aus=auslaufend.find(a=>a.id===v.id)
                  const saisonNames = v.sponsoring_saisons?.length > 0 ? v.sponsoring_saisons.map(ss=>ss.saisons?.name).filter(Boolean).join(', ') : v.saisons?.name || '--'
                  return <tr key={v.id} style={{background:aus?'#fff8f8':'inherit'}}>
                    <td><strong>{v.kontakte?.firma}</strong></td>
                    <td style={{fontSize:13}}>{saisonNames}</td>
                    <td style={{fontSize:13}}>{v.sponsoring_pakete?.name||'--'}</td>
                    <td style={{fontWeight:600}}>{v.jahresbetrag?Number(v.jahresbetrag).toLocaleString('de-DE')+' EUR':'--'}</td>
                    <td style={{fontSize:13,color:aus?'var(--red)':'inherit',fontWeight:aus?600:400}}>{v.vertragsende?new Date(v.vertragsende).toLocaleDateString('de-DE'):'--'}</td>
                    <td><span style={{fontSize:12,padding:'2px 8px',borderRadius:20,fontWeight:600,background:v.status==='Aktiv'?'#e2efda':v.status==='In Verhandlung'?'#ddeaff':'#ececec',color:v.status==='Aktiv'?'#2d6b3a':'#555'}}>{v.status}</span></td>
                    <td>{v.vertrag_unterzeichnet?'✅':'⬜'}</td>
                    <td style={{whiteSpace:'nowrap'}}><button className="btn btn-sm btn-outline" onClick={()=>openEdit(v)}>Bearb.</button>{' '}<button className="btn btn-sm btn-danger" onClick={()=>deleteVertrag(v.id)}>X</button></td>
                  </tr>
                })}
            </tbody>
          </table></div>
        </div>
      )}

      {/* ====== SAISONÜBERSICHT ====== */}
      {tab==='uebersicht'&&(
        <div>
          <div className="toolbar">
            <select value={selectedSaison} onChange={e=>setSelectedSaison(e.target.value)}>
              {saisons.map(s=><option key={s.id} value={s.id}>{s.name}{s.aktiv?' (aktuell)':''}</option>)}
            </select>
          </div>
          <div className="stats-row">
            <div className="stat-card green"><div className="stat-num">{filteredBySaison.filter(v=>v.status==='Aktiv').length}</div><div className="stat-label">Aktive Sponsoren</div></div>
            <div className="stat-card gold"><div className="stat-num" style={{fontSize:22}}>{gesamtGeld.toLocaleString('de-DE')} EUR</div><div className="stat-label">Geldsponsoring</div></div>
            <div className="stat-card blue"><div className="stat-num" style={{fontSize:22}}>{gesamtWert.toLocaleString('de-DE')} EUR</div><div className="stat-label">Gesamtwert</div></div>
            <div className="stat-card orange"><div className="stat-num">{filteredBySaison.length}</div><div className="stat-label">Vertraege</div></div>
          </div>
          <div className="card">
            <div className="section-title">Sponsoren {saisons.find(s=>s.id===selectedSaison)?.name}</div>
            <div className="table-wrap"><table>
              <thead><tr><th>Firma</th><th>Paket</th><th>Jahresbetrag</th><th>Gebuchte Leistungen</th><th>Gesamtwert</th><th>Status</th></tr></thead>
              <tbody>
                {filteredBySaison.length===0?<tr><td colSpan="6"><div className="empty-state"><p>Keine Vertraege fuer diese Saison.</p></div></td></tr>
                  :filteredBySaison.map(v=>{
                    const vLeistungen = gebuchteLeistungen.filter(gl=>gl.sponsoring_id===v.id)
                    return <tr key={v.id}>
                      <td><strong>{v.kontakte?.firma}</strong></td>
                      <td style={{fontSize:13}}>{v.sponsoring_pakete?.name||'--'}</td>
                      <td style={{fontWeight:600}}>{v.jahresbetrag?Number(v.jahresbetrag).toLocaleString('de-DE')+' EUR':'--'}</td>
                      <td style={{fontSize:12}}>{vLeistungen.length>0?vLeistungen.map(l=><div key={l.id} style={{marginBottom:2}}><span style={{background:l.leistungen_katalog?.leistungen_kategorien?.farbe||'#ccc',color:'white',padding:'1px 6px',borderRadius:10,fontSize:11,marginRight:4}}>{l.leistungen_katalog?.leistungen_kategorien?.name}</span>{l.leistungen_katalog?.name}</div>):'--'}</td>
                      <td>{v.gesamtwert?Number(v.gesamtwert).toLocaleString('de-DE')+' EUR':'--'}</td>
                      <td><span style={{fontSize:12,padding:'2px 8px',borderRadius:20,fontWeight:600,background:v.status==='Aktiv'?'#e2efda':'#ececec',color:v.status==='Aktiv'?'#2d6b3a':'#555'}}>{v.status}</span></td>
                    </tr>
                  })}
              </tbody>
              {filteredBySaison.length>0&&<tfoot><tr style={{background:'var(--gray-100)',fontWeight:700}}><td colSpan="2">Gesamt</td><td>{gesamtGeld.toLocaleString('de-DE')} EUR</td><td></td><td>{gesamtWert.toLocaleString('de-DE')} EUR</td><td></td></tr></tfoot>}
            </table></div>
          </div>
        </div>
      )}

      {/* ====== LEISTUNGSÜBERSICHT ====== */}
      {tab==='leistungen'&&(
        <div>
          <div className="toolbar">
            <select value={uebersichtSaison} onChange={e=>setUebersichtSaison(e.target.value)}>
              <option value="">Alle Saisons</option>
              {saisons.map(s=><option key={s.id} value={s.id}>{s.name}{s.aktiv?' (aktuell)':''}</option>)}
            </select>
            <select value={uebersichtKat} onChange={e=>setUebersichtKat(e.target.value)}>
              <option value="">Alle Kategorien</option>
              {kategorien.map(k=><option key={k.id} value={k.name}>{k.name}</option>)}
            </select>
          </div>

          {/* Verfügbarkeitsübersicht nach Leistung */}
          <div className="card">
            <div className="section-title">Verfuegbarkeit aller Leistungen</div>
            {kategorien.filter(kat=>!uebersichtKat||kat.name===uebersichtKat).map(kat=>{
              const katLeistungen = katalog.filter(l=>l.kategorie_id===kat.id&&l.aktiv)
              if(katLeistungen.length===0) return null
              return <div key={kat.id} style={{marginBottom:24}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <div style={{width:12,height:12,borderRadius:'50%',background:kat.farbe}}></div>
                  <strong style={{fontSize:15}}>{kat.name}</strong>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:10}}>
                  {katLeistungen.map(l=>{
                    const buchungen = gebuchteLeistungen.filter(gl=>gl.leistung_id===l.id&&(!uebersichtSaison||gl.saison_id===uebersichtSaison))
                    const gebucht = buchungen.reduce((s,b)=>s+(b.anzahl||1),0)
                    const max = l.max_anzahl||1
                    const belegt = l.exklusiv ? gebucht>=max : false
                    const status = l.exklusiv ? (belegt?'Belegt':'Frei') : (gebucht>0?gebucht+'x gebucht':'Frei')
                    const statusColor = belegt?'#d94f4f':(gebucht>0?'#e07b30':'#3a8a5a')
                    return <div key={l.id} style={{border:'1.5px solid '+(belegt?'#d94f4f':gebucht>0?'#e07b30':'var(--gray-200)'),borderRadius:'var(--radius)',padding:14,background:belegt?'#fff8f8':gebucht>0?'#fffbf5':'var(--white)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                        <strong style={{fontSize:13}}>{l.name}</strong>
                        <span style={{fontSize:11,fontWeight:700,color:statusColor,background:statusColor+'22',padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap',marginLeft:8}}>{status}</span>
                      </div>
                      {l.preis&&<div style={{fontSize:12,color:'var(--gray-600)',marginBottom:4}}>{Number(l.preis).toLocaleString('de-DE')} EUR · {l.abrechnung==='saison'?'pro Saison':'pro Vertrag'}</div>}
                      {l.exklusiv&&<div style={{fontSize:11,color:'var(--gray-400)'}}>Exklusiv</div>}
                      {buchungen.length>0&&<div style={{marginTop:8,borderTop:'1px solid var(--gray-100)',paddingTop:8}}>
                        {buchungen.map(b=><div key={b.id} style={{fontSize:12,color:'var(--gray-600)'}}>{b.kontakte?.firma}{b.anzahl>1?' ('+b.anzahl+'x)':''}</div>)}
                      </div>}
                    </div>
                  })}
                </div>
              </div>
            })}
          </div>

          {/* Gebuchte Leistungen Liste */}
          <div className="card">
            <div className="section-title">Gebuchte Leistungen</div>
            {filteredGL.length===0?<div className="empty-state"><p>Keine gebuchten Leistungen fuer diese Auswahl.</p></div>
              :<div className="table-wrap"><table>
                <thead><tr><th>Leistung</th><th>Kategorie</th><th>Sponsor</th><th>Saison</th><th>Anzahl</th><th>Preis</th><th>Abrechnung</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredGL.map(gl=>(
                    <tr key={gl.id}>
                      <td><strong style={{fontSize:13}}>{gl.leistungen_katalog?.name}</strong></td>
                      <td><span style={{fontSize:11,fontWeight:600,color:'white',background:gl.leistungen_katalog?.leistungen_kategorien?.farbe||'#ccc',padding:'2px 8px',borderRadius:20}}>{gl.leistungen_katalog?.leistungen_kategorien?.name||'--'}</span></td>
                      <td style={{fontSize:13}}>{gl.kontakte?.firma}</td>
                      <td style={{fontSize:13}}>{gl.saisons?.name||'--'}</td>
                      <td style={{fontSize:13}}>{gl.anzahl||1}</td>
                      <td style={{fontSize:13,fontWeight:600}}>{gl.preis_vereinbart?Number(gl.preis_vereinbart).toLocaleString('de-DE')+' EUR':'--'}</td>
                      <td style={{fontSize:12,color:'var(--gray-600)'}}>{gl.abrechnung==='saison'?'Pro Saison':'Pro Vertrag'}</td>
                      <td><span style={{fontSize:12,padding:'2px 8px',borderRadius:20,fontWeight:600,background:'#e2efda',color:'#2d6b3a'}}>{gl.status||'Gebucht'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            }
          </div>
        </div>
      )}

      {/* ====== LEISTUNGSKATALOG ====== */}
      {tab==='katalog'&&(
        <div>
          <div className="toolbar">
            <button className="btn btn-outline" onClick={()=>{setKatForm({name:'',farbe:'#2d6fa3',reihenfolge:kategorien.length});setKatModal(true)}}>+ Kategorie</button>
            <button className="btn btn-primary" onClick={()=>{setLeistungForm({name:'',beschreibung:'',preis:'',exklusiv:false,max_anzahl:1,abrechnung:'saison',aktiv:true,kategorie_id:kategorien[0]?.id||''});setLeistungModal(true)}}>+ Leistung</button>
          </div>

          {kategorien.map(kat=>{
            const katLeistungen = katalog.filter(l=>l.kategorie_id===kat.id)
            return <div key={kat.id} className="card" style={{borderLeft:'4px solid '+kat.farbe}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:14,height:14,borderRadius:'50%',background:kat.farbe}}></div>
                  <div className="section-title" style={{margin:0}}>{kat.name}</div>
                  <span style={{fontSize:12,color:'var(--gray-400)'}}>({katLeistungen.length} Leistungen)</span>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-sm btn-outline" onClick={()=>{setKatForm(kat);setKatModal(true)}}>Bearb.</button>
                  <button className="btn btn-sm btn-danger" onClick={()=>deleteKat(kat.id)}>X</button>
                </div>
              </div>
              {katLeistungen.length===0?<p style={{fontSize:13,color:'var(--gray-400)'}}>Noch keine Leistungen in dieser Kategorie.</p>
                :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:10}}>
                  {katLeistungen.map(l=>(
                    <div key={l.id} style={{border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:14,opacity:l.aktiv?1:0.5,background:'var(--white)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                        <strong style={{fontSize:14}}>{l.name}</strong>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          {l.exklusiv&&<span style={{fontSize:10,background:'#fce4d6',color:'#8a3a1a',padding:'1px 6px',borderRadius:10,fontWeight:700}}>EXKLUSIV</span>}
                          {!l.aktiv&&<span style={{fontSize:10,background:'var(--gray-200)',color:'var(--gray-600)',padding:'1px 6px',borderRadius:10}}>INAKTIV</span>}
                        </div>
                      </div>
                      {l.beschreibung&&<p style={{fontSize:12,color:'var(--gray-600)',marginBottom:6}}>{l.beschreibung}</p>}
                      <div style={{display:'flex',gap:12,fontSize:12,color:'var(--gray-600)',flexWrap:'wrap'}}>
                        {l.preis&&<span style={{fontWeight:600,color:'var(--navy)'}}>{Number(l.preis).toLocaleString('de-DE')} EUR</span>}
                        <span>{l.abrechnung==='saison'?'pro Saison':'pro Vertrag'}</span>
                        {!l.exklusiv&&<span>max. {l.max_anzahl}x buchbar</span>}
                      </div>
                      <div style={{display:'flex',gap:8,marginTop:12}}>
                        <button className="btn btn-sm btn-outline" onClick={()=>{setLeistungForm({...l});setLeistungModal(true)}}>Bearb.</button>
                        <button className="btn btn-sm btn-danger" onClick={()=>deleteLeistung(l.id)}>X</button>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          })}
          {kategorien.length===0&&<div className="empty-state card"><p>Noch keine Kategorien. Lege zuerst eine Kategorie an.</p></div>}
        </div>
      )}

      {/* ====== PAKETE ====== */}
      {tab==='pakete'&&(
        <div>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={()=>{setPaketForm({name:'',beschreibung:'',basispreis:'',leistungen:[],aktiv:true});setPaketModal(true)}}>+ Neues Paket</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
            {pakete.map(p=>(
              <div key={p.id} style={{border:'2px solid '+(p.aktiv?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',padding:20,opacity:p.aktiv?1:0.6}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div style={{fontFamily:'"DM Serif Display",serif',fontSize:22,color:'var(--navy)'}}>{p.name}</div>
                  {!p.aktiv&&<span style={{fontSize:11,background:'var(--gray-200)',color:'var(--gray-600)',padding:'2px 8px',borderRadius:20}}>Inaktiv</span>}
                </div>
                {p.beschreibung&&<p style={{fontSize:13,color:'var(--gray-600)',marginBottom:12}}>{p.beschreibung}</p>}
                {p.basispreis&&<div style={{fontSize:20,fontWeight:700,color:'var(--gold)',marginBottom:12}}>{Number(p.basispreis).toLocaleString('de-DE')} EUR</div>}
                {(p.leistungen||[]).length>0&&<ul style={{listStyle:'none',padding:0,margin:'0 0 16px 0'}}>
                  {p.leistungen.map((l,i)=><li key={i} style={{fontSize:13,padding:'3px 0',borderBottom:'1px solid var(--gray-100)',display:'flex',alignItems:'center',gap:6}}><span style={{color:'var(--green)'}}>✓</span>{l}</li>)}
                </ul>}
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-sm btn-outline" onClick={()=>{setPaketForm({...p,leistungen:p.leistungen||[]});setPaketModal(true)}}>Bearbeiten</button>
                  <button className="btn btn-sm btn-danger" onClick={()=>deletePaket(p.id)}>Loeschen</button>
                </div>
              </div>
            ))}
            {pakete.length===0&&<div className="empty-state"><p>Noch keine Pakete.</p></div>}
          </div>
        </div>
      )}

      {/* ====== SAISONS ====== */}
      {tab==='saisonverwaltung'&&(
        <div>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={()=>{setSaisonForm({name:'',beginn:'',ende:'',aktiv:false});setSaisonModal(true)}}>+ Neue Saison</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {saisons.map(s=>(
              <div key={s.id} style={{border:'2px solid '+(s.aktiv?'var(--gold)':'var(--gray-200)'),borderRadius:'var(--radius)',padding:20,position:'relative'}}>
                {s.aktiv&&<span style={{position:'absolute',top:12,right:12,fontSize:11,background:'var(--gold)',color:'var(--navy)',padding:'2px 8px',borderRadius:20,fontWeight:700}}>AKTUELL</span>}
                <div style={{fontFamily:'"DM Serif Display",serif',fontSize:24,color:'var(--navy)',marginBottom:12}}>{s.name}</div>
                <div style={{display:'grid',gap:6,fontSize:13,color:'var(--gray-600)',marginBottom:16}}>
                  {s.beginn&&<div><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Beginn</span>{new Date(s.beginn).toLocaleDateString('de-DE')}</div>}
                  {s.ende&&<div><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Ende</span>{new Date(s.ende).toLocaleDateString('de-DE')}</div>}
                  <div><span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Vertraege</span>{vertraege.filter(v=>v.saison_id===s.id||(v.sponsoring_saisons||[]).some(ss=>ss.saison_id===s.id)).length}</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-sm btn-outline" onClick={()=>{setSaisonForm(s);setSaisonModal(true)}}>Bearbeiten</button>
                  {!s.aktiv&&<button className="btn btn-sm btn-danger" onClick={()=>deleteSaison(s.id)}>Loeschen</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== AUSWERTUNG ====== */}}
      {tab==='auswertung'&&(
        <div>
          <div className="card">
            <div className="section-title">Saisonvergleich</div>
            {saisonStats.length<2?<div className="empty-state"><p>Mindestens 2 Saisons mit Vertraegen noetig.</p></div>
              :<div className="table-wrap"><table>
                <thead><tr><th>Saison</th><th>Sponsoren</th><th>Geldsponsoring</th><th>Gesamtwert</th><th>Durchschnitt</th><th>Veraenderung</th></tr></thead>
                <tbody>{saisonStats.map((s,i)=>{const prev=saisonStats[i+1];const delta=prev?s.geld-prev.geld:null;const deltaP=prev&&prev.geld>0?((s.geld-prev.geld)/prev.geld*100).toFixed(1):null;return<tr key={s.name}><td><strong>{s.name}</strong></td><td>{s.anzahl}</td><td style={{fontWeight:600}}>{s.geld.toLocaleString('de-DE')} EUR</td><td>{s.wert.toLocaleString('de-DE')} EUR</td><td>{s.anzahl>0?Math.round(s.geld/s.anzahl).toLocaleString('de-DE')+' EUR':'--'}</td><td>{delta!==null?<span style={{color:delta>=0?'var(--green)':'var(--red)',fontWeight:600}}>{delta>=0?'+':''}{delta.toLocaleString('de-DE')} EUR ({deltaP}%)</span>:'--'}</td></tr>})}
                </tbody>
              </table></div>}
          </div>
        </div>
      )}

      {/* MODAL: VERTRAG */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{maxWidth:760}}>
            <div className="modal-header">
              <span className="modal-title">{form.id?'Vertrag bearbeiten':'Neuer Vertrag'}</span>
              <button className="close-btn" onClick={()=>setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Firma *</label>
                  <select value={form.kontakt_id} onChange={e=>setForm(f=>({...f,kontakt_id:e.target.value}))}>
                    <option value="">Bitte waehlen...</option>
                    {kontakte.map(k=><option key={k.id} value={k.id}>{k.firma}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {STATUS_LIST.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Mehrfach-Saisons */}
              <div className="form-group">
                <label>Saisons (Mehrfachauswahl)</label>
                <div style={{border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:10,display:'flex',flexWrap:'wrap',gap:8,minHeight:44}}>
                  {saisons.map(s=>{
                    const selected=(form.selected_saisons||[]).includes(s.id)
                    return <button key={s.id} type="button" onClick={()=>toggleSaison(s.id)}
                      style={{padding:'4px 12px',borderRadius:20,border:'1.5px solid',fontSize:13,cursor:'pointer',background:selected?'var(--navy)':'var(--white)',color:selected?'var(--white)':'var(--gray-600)',borderColor:selected?'var(--navy)':'var(--gray-200)'}}>
                      {s.name}{s.aktiv?' ★':''}
                    </button>
                  })}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>Paket</label>
                  <select value={form.paket_id} onChange={e=>{const p=pakete.find(p=>p.id===e.target.value);setForm(f=>({...f,paket_id:e.target.value,jahresbetrag:p?.basispreis||f.jahresbetrag}))}}>
                    <option value="">Individuell</option>
                    {pakete.filter(p=>p.aktiv).map(p=><option key={p.id} value={p.id}>{p.name}{p.basispreis?' ('+Number(p.basispreis).toLocaleString('de-DE')+' EUR)':''}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Jahresbetrag (EUR)</label><input type="number" value={form.jahresbetrag||''} onChange={e=>setForm(f=>({...f,jahresbetrag:e.target.value}))}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Gesamtwert inkl. Sachleistungen (EUR)</label><input type="number" value={form.gesamtwert||''} onChange={e=>setForm(f=>({...f,gesamtwert:e.target.value}))}/></div>
                <div className="form-group"><label>Laufzeit (Jahre)</label><input type="number" value={form.laufzeit_jahre||''} onChange={e=>setForm(f=>({...f,laufzeit_jahre:e.target.value}))}/></div>
              </div>
              <div className="form-row-3">
                <div className="form-group"><label>Vertragsbeginn</label><input type="date" value={form.vertragsbeginn||''} onChange={e=>setForm(f=>({...f,vertragsbeginn:e.target.value}))}/></div>
                <div className="form-group"><label>Vertragsende</label><input type="date" value={form.vertragsende||''} onChange={e=>setForm(f=>({...f,vertragsende:e.target.value}))}/></div>
                <div className="form-group"><label>Kuendigungsfrist (Tage)</label><input type="number" value={form.kuendigungsfrist_tage||30} onChange={e=>setForm(f=>({...f,kuendigungsfrist_tage:e.target.value}))}/></div>
              </div>
              <div className="form-row" style={{marginBottom:16}}>
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                  <input type="checkbox" checked={form.auto_verlaengerung||false} onChange={e=>setForm(f=>({...f,auto_verlaengerung:e.target.checked}))}/>Auto-Verlaengerung
                </label>
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
                  <input type="checkbox" checked={form.vertrag_unterzeichnet||false} onChange={e=>setForm(f=>({...f,vertrag_unterzeichnet:e.target.checked}))}/>Vertrag unterzeichnet
                </label>
              </div>
              <div className="form-group"><label>Drive-Link (Vertrag)</label><input type="url" placeholder="https://..." value={form.drive_link||''} onChange={e=>setForm(f=>({...f,drive_link:e.target.value}))}/></div>

              <div style={{marginBottom:18}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--gray-600)',textTransform:'uppercase',letterSpacing:'0.3px'}}>Individuelle Leistungen</label>
                  <button className="btn btn-sm btn-outline" onClick={addIL}>+ Hinzufuegen</button>
                </div>
                {(form.individuelle_leistungen||[]).map((l,idx)=>(
                  <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:8}}>
                    <input value={l} onChange={e=>updateIL(idx,e.target.value)} placeholder="z.B. Naming Right Heimspiel" style={{padding:'8px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
                    <button onClick={()=>removeIL(idx)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:18}}>X</button>
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

      {/* MODAL: KATEGORIE */}
      {katModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setKatModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{katForm.id?'Kategorie bearbeiten':'Neue Kategorie'}</span>
              <button className="close-btn" onClick={()=>setKatModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input value={katForm.name} onChange={e=>setKatForm(f=>({...f,name:e.target.value}))} placeholder="z.B. Spieltag"/></div>
                <div className="form-group"><label>Farbe</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input type="color" value={katForm.farbe||'#2d6fa3'} onChange={e=>setKatForm(f=>({...f,farbe:e.target.value}))} style={{width:44,height:40,border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',cursor:'pointer',padding:2}}/>
                    <input value={katForm.farbe||''} onChange={e=>setKatForm(f=>({...f,farbe:e.target.value}))} style={{flex:1,padding:'10px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
                  </div>
                </div>
              </div>
              <div className="form-group"><label>Reihenfolge</label><input type="number" value={katForm.reihenfolge||0} onChange={e=>setKatForm(f=>({...f,reihenfolge:parseInt(e.target.value)||0}))}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setKatModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveKat} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LEISTUNG */}
      {leistungModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setLeistungModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{leistungForm.id?'Leistung bearbeiten':'Neue Leistung'}</span>
              <button className="close-btn" onClick={()=>setLeistungModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input value={leistungForm.name} onChange={e=>setLeistungForm(f=>({...f,name:e.target.value}))} placeholder="z.B. Bandenwerbung Position 1"/></div>
                <div className="form-group"><label>Kategorie</label>
                  <select value={leistungForm.kategorie_id||''} onChange={e=>setLeistungForm(f=>({...f,kategorie_id:e.target.value}))}>
                    <option value="">Keine Kategorie</option>
                    {kategorien.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Beschreibung</label><input value={leistungForm.beschreibung||''} onChange={e=>setLeistungForm(f=>({...f,beschreibung:e.target.value}))} placeholder="z.B. Werbebande an der Suedseite der Halle"/></div>
              <div className="form-row">
                <div className="form-group"><label>Preis (EUR)</label><input type="number" value={leistungForm.preis||''} onChange={e=>setLeistungForm(f=>({...f,preis:e.target.value}))}/></div>
                <div className="form-group"><label>Abrechnung</label>
                  <select value={leistungForm.abrechnung} onChange={e=>setLeistungForm(f=>({...f,abrechnung:e.target.value}))}>
                    <option value="saison">Pro Saison</option>
                    <option value="vertrag">Pro Vertrag</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}>
                    <input type="checkbox" checked={leistungForm.exklusiv||false} onChange={e=>setLeistungForm(f=>({...f,exklusiv:e.target.checked,max_anzahl:e.target.checked?1:f.max_anzahl}))}/>
                    Exklusiv (nur einmal buchbar)
                  </label>
                </div>
                {!leistungForm.exklusiv&&<div className="form-group"><label>Max. Anzahl buchbar</label><input type="number" min="1" value={leistungForm.max_anzahl||1} onChange={e=>setLeistungForm(f=>({...f,max_anzahl:parseInt(e.target.value)||1}))}/></div>}
              </div>
              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}>
                  <input type="checkbox" checked={leistungForm.aktiv} onChange={e=>setLeistungForm(f=>({...f,aktiv:e.target.checked}))}/>
                  Aktiv (buchbar)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setLeistungModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveLeistung} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAKET */}
      {paketModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setPaketModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{paketForm.id?'Paket bearbeiten':'Neues Paket'}</span>
              <button className="close-btn" onClick={()=>setPaketModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input value={paketForm.name} onChange={e=>setPaketForm(f=>({...f,name:e.target.value}))} placeholder="z.B. Gold"/></div>
                <div className="form-group"><label>Basispreis (EUR)</label><input type="number" value={paketForm.basispreis||''} onChange={e=>setPaketForm(f=>({...f,basispreis:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label>Beschreibung</label><input value={paketForm.beschreibung||''} onChange={e=>setPaketForm(f=>({...f,beschreibung:e.target.value}))}/></div>
              <div className="form-group">
                <label>Enthaltene Leistungen</label>
                {/* Leistungen aus dem Katalog */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:'var(--gray-400)',marginBottom:8}}>Leistungen aus dem Katalog:</div>
                {paketForm.id && kategorien.map(kat => {
                  const katL = katalog.filter(l => l.kategorie_id === kat.id && l.aktiv)
                  if (katL.length === 0) return null
                  return (
                    <div key={kat.id} style={{marginBottom:12}}>
                      <div style={{fontSize:12,fontWeight:600,color:kat.farbe,marginBottom:6}}>{kat.name}</div>
                      {katL.map(l => {
                        const existing = (paketLeistungen[paketForm.id]||[]).find(pl => pl.leistung_id === l.id)
                        return (
                          <div key={l.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:existing?'rgba(15,34,64,0.04)':'var(--white)',border:'1px solid var(--gray-200)',borderRadius:6,marginBottom:4}}>
                            <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',flex:1}}>
                              <input type="checkbox" checked={!!existing} onChange={e => {
                                if (e.target.checked) savePaketLeistung(paketForm.id, l.id, 1)
                                else deletePaketLeistung(paketForm.id, l.id)
                              }} style={{width:16,height:16}}/>
                              <span style={{fontSize:13}}>{l.name}</span>
                              {l.preis && <span style={{fontSize:12,color:'var(--gray-400)'}}>{Number(l.preis).toLocaleString('de-DE')} EUR</span>}
                            </label>
                            {existing && (
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <span style={{fontSize:12,color:'var(--gray-400)'}}>Anzahl:</span>
                                <input type="number" min="1" value={existing.anzahl||1}
                                  onChange={e => savePaketLeistung(paketForm.id, l.id, parseInt(e.target.value)||1)}
                                  style={{width:50,padding:'2px 6px',border:'1px solid var(--gray-200)',borderRadius:4,fontSize:13}}/>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
                {!paketForm.id && <p style={{fontSize:12,color:'var(--gray-400)'}}>Paket zuerst speichern, dann Leistungen aus dem Katalog zuordnen.</p>}
              </div>

              {/* Freitext Leistungen */}
              <div style={{fontSize:12,color:'var(--gray-400)',marginBottom:8}}>Zusaetzliche Leistungen (Freitext):</div>
              {(paketForm.leistungen||[]).map((l,i)=>(
                  <div key={i} style={{display:'flex',gap:8,marginBottom:6,alignItems:'center'}}>
                    <span style={{fontSize:13,flex:1,padding:'6px 10px',background:'var(--gray-100)',borderRadius:'var(--radius)'}}>{l}</span>
                    <button onClick={()=>setPaketForm(f=>({...f,leistungen:f.leistungen.filter((_,j)=>j!==i)}))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:16}}>X</button>
                  </div>
                ))}
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <input value={neueLeistungPaket} onChange={e=>setNeueLeistungPaket(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&neueLeistungPaket.trim()){setPaketForm(f=>({...f,leistungen:[...(f.leistungen||[]),neueLeistungPaket.trim()]}));setNeueLeistungPaket('')}}} placeholder="Neue Leistung..." style={{flex:1,padding:'8px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:13}}/>
                  <button className="btn btn-sm btn-outline" onClick={()=>{if(neueLeistungPaket.trim()){setPaketForm(f=>({...f,leistungen:[...(f.leistungen||[]),neueLeistungPaket.trim()]}));setNeueLeistungPaket('')}}}>+ Hinzufuegen</button>
                </div>
              </div>
              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:10,fontSize:14,cursor:'pointer',textTransform:'none',padding:'10px 0'}}>
                  <input type="checkbox" style={{width:18,height:18,flexShrink:0}} checked={paketForm.aktiv} onChange={e=>setPaketForm(f=>({...f,aktiv:e.target.checked}))}/>
                  <span>Paket aktiv</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setPaketModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={savePaket} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: SAISON */}
      {saisonModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSaisonModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{saisonForm.id?'Saison bearbeiten':'Neue Saison'}</span>
              <button className="close-btn" onClick={()=>setSaisonModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Name * (z.B. 2026/27)</label><input value={saisonForm.name} onChange={e=>setSaisonForm(f=>({...f,name:e.target.value}))} placeholder="2026/27"/></div>
              <div className="form-row">
                <div className="form-group"><label>Beginn</label><input type="date" value={saisonForm.beginn||''} onChange={e=>setSaisonForm(f=>({...f,beginn:e.target.value}))}/></div>
                <div className="form-group"><label>Ende</label><input type="date" value={saisonForm.ende||''} onChange={e=>setSaisonForm(f=>({...f,ende:e.target.value}))}/></div>
              </div>
              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',textTransform:'none'}}>
                  <input type="checkbox" checked={saisonForm.aktiv||false} onChange={e=>setSaisonForm(f=>({...f,aktiv:e.target.checked}))}/>
                  Als aktuelle Saison markieren (ersetzt die bisherige)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setSaisonModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveSaison} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
