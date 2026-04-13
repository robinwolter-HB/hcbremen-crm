import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const EV_COLOR = '#e07b30'
const EV_LIGHT = '#fff3cd'
const EV_TEXT = '#8a4a00'
const STATUS_LIST = ['Anfrage','In Verhandlung','Aktiv','Ausgelaufen','Gekuendigt']

const EMPTY_V = {
  kontakt_id: '', saison_id: '', selected_saisons: [], status: 'Anfrage',
  jahresbetrag: '', vertragsbeginn: '', vertragsende: '',
  vertrag_unterzeichnet: false, notizen: ''
}

export default function EV() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('kontakte')
  const [kontakte, setKontakte] = useState([])
  const [vertraege, setVertraege] = useState([])
  const [saisons, setSaisons] = useState([])
  const [filterSaison, setFilterSaison] = useState('')
  const [loading, setLoading] = useState(true)
  const [kontaktModal, setKontaktModal] = useState(false)
  const [vertragModal, setVertragModal] = useState(false)
  const [kForm, setKForm] = useState({ firma:'', email:'', telefon:'', status:'Offen', notiz:'' })
  const [vForm, setVForm] = useState(EMPTY_V)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: k }, { data: v }, { data: s }] = await Promise.all([
      supabase.from('kontakte').select('*').eq('ist_ev', true).order('firma'),
      supabase.from('sponsoring')
        .select('*, kontakte(id,firma,logo_url), saisons(name), sponsoring_saisons(saison_id, saisons(name))')
        .eq('ist_ev', true)
        .order('erstellt_am', { ascending: false }),
      supabase.from('saisons').select('*').order('beginn', { ascending: false })
    ])
    setKontakte(k || [])
    setVertraege(v || [])
    setSaisons(s || [])
    const aktiv = s?.find(x => x.aktiv)
    if (aktiv) setFilterSaison(aktiv.id)
    setLoading(false)
  }

  function toggleSaison(sid) {
    setVForm(f => {
      const current = f.selected_saisons || []
      const updated = current.includes(sid) ? current.filter(s => s !== sid) : [...current, sid]
      return { ...f, selected_saisons: updated, saison_id: updated[0] || '' }
    })
  }

  async function saveKontakt() {
    if (!kForm.firma?.trim()) { alert('Firma erforderlich'); return }
    setSaving(true)
    const payload = {
      firma: kForm.firma,
      email: kForm.email || null,
      telefon: kForm.telefon || null,
      status: kForm.status || 'Offen',
      notiz: kForm.notiz || null,
      ist_ev: true,
      kategorie: 'Kontakt'
    }
    let result
    if (kForm.id) result = await supabase.from('kontakte').update(payload).eq('id', kForm.id)
    else result = await supabase.from('kontakte').insert(payload)
    if (result.error) { alert('Fehler: ' + result.error.message); setSaving(false); return }
    setKontaktModal(false); setSaving(false); load()
  }

  async function saveVertrag() {
    if (!vForm.kontakt_id) { alert('Bitte eine Organisation wählen'); return }
    setSaving(true)
    const payload = {
      kontakt_id: vForm.kontakt_id,
      saison_id: vForm.selected_saisons?.[0] || vForm.saison_id || null,
      status: vForm.status || 'Anfrage',
      jahresbetrag: vForm.jahresbetrag ? Number(vForm.jahresbetrag) : null,
      vertragsbeginn: vForm.vertragsbeginn || null,
      vertragsende: vForm.vertragsende || null,
      vertrag_unterzeichnet: vForm.vertrag_unterzeichnet || false,
      notizen: vForm.notizen || null,
      ist_ev: true,
      verlaengerung_besprochen: 'Offen',
      auto_verlaengerung: false,
      kuendigungsfrist_tage: 30,
      individuelle_leistungen: [],
      sachleistungen: []
    }
    let result
    if (vForm.id) result = await supabase.from('sponsoring').update(payload).eq('id', vForm.id)
    else result = await supabase.from('sponsoring').insert(payload)
    if (result.error) { alert('Fehler: ' + result.error.message); setSaving(false); return }

    // Mehrfach-Saisons speichern
    const sponsoringId = vForm.id || result.data?.[0]?.id
    if (sponsoringId && vForm.selected_saisons?.length > 0) {
      await supabase.from('sponsoring_saisons').delete().eq('sponsoring_id', sponsoringId)
      await supabase.from('sponsoring_saisons').insert(
        vForm.selected_saisons.map(sid => ({ sponsoring_id: sponsoringId, saison_id: sid }))
      )
    }

    setVertragModal(false); setSaving(false); load()
  }

  async function deleteKontakt(id) {
    if (!window.confirm('Kontakt löschen?')) return
    await supabase.from('kontakte').delete().eq('id', id); load()
  }

  async function deleteVertrag(id) {
    if (!window.confirm('Vertrag löschen?')) return
    await supabase.from('sponsoring').delete().eq('id', id); load()
  }

  const filteredVertraege = vertraege.filter(v => !filterSaison || v.saison_id === filterSaison || (v.sponsoring_saisons||[]).some(ss=>ss.saison_id===filterSaison))
  const gesamtGeld = filteredVertraege.reduce((s, v) => s + (Number(v.jahresbetrag) || 0), 0)
  const aktiveVertraege = filteredVertraege.filter(v => v.status === 'Aktiv')

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${EV_COLOR} 0%, #c8621a 100%)`, borderRadius:'var(--radius)', padding:'24px 28px', marginBottom:24, color:'white' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:'"DM Serif Display",serif', fontSize:28, marginBottom:4 }}>HC Bremen e.V.</div>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14 }}>Vereinskontakte & Verträge – separat vom Sponsoring-Budget</p>
          </div>
          <select value={filterSaison} onChange={e=>setFilterSaison(e.target.value)}
            style={{ padding:'8px 16px', borderRadius:'var(--radius)', border:'none', fontSize:14, fontWeight:600, background:'rgba(255,255,255,0.2)', color:'white', cursor:'pointer' }}>
            <option value="" style={{color:'var(--text)'}}>Alle Saisons</option>
            {saisons.map(s=><option key={s.id} value={s.id} style={{color:'var(--text)'}}>{s.name}{s.aktiv?' (aktuell)':''}</option>)}
          </select>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
          {[['👥','Kontakte',kontakte.length],['✅','Aktive Verträge',aktiveVertraege.length],['💶','Jahressumme',gesamtGeld.toLocaleString('de-DE')+' EUR'],['📄','Verträge',filteredVertraege.length]].map(([icon,label,value])=>(
            <div key={label} style={{ background:'rgba(255,255,255,0.15)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
              <div style={{ fontSize:20 }}>{icon}</div>
              <div style={{ fontFamily:'"DM Serif Display",serif', fontSize:22, marginTop:4 }}>{value}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['kontakte',`Kontakte (${kontakte.length})`],['vertraege',`Verträge (${filteredVertraege.length})`]].map(([key,label])=>(
          <button key={key} className={'tab-btn'+(tab===key?' active':'')} onClick={()=>setTab(key)}
            style={tab===key?{color:EV_COLOR,borderBottomColor:EV_COLOR}:{}}>{label}</button>
        ))}
      </div>

      {/* KONTAKTE */}
      {tab==='kontakte'&&(
        <div>
          <div className="toolbar">
            <button className="btn btn-primary" style={{background:EV_COLOR}} onClick={()=>{setKForm({firma:'',email:'',telefon:'',status:'Offen',notiz:''});setKontaktModal(true)}}>+ Neuer e.V.-Kontakt</button>
          </div>
          {kontakte.length===0
            ? <div className="empty-state card"><p>Noch keine e.V.-Kontakte angelegt.</p></div>
            : <div className="table-wrap"><table>
                <thead><tr><th>Organisation</th><th>E-Mail</th><th>Telefon</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {kontakte.map(k=>(
                    <tr key={k.id} style={{cursor:'pointer',background:'#fff8f0'}} onClick={()=>navigate('/kontakte/'+k.id)}>
                      <td><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:8,height:8,borderRadius:'50%',background:EV_COLOR,flexShrink:0}}/><strong>{k.firma}</strong></div></td>
                      <td style={{fontSize:13}}>{k.email||'--'}</td>
                      <td style={{fontSize:13}}>{k.telefon||'--'}</td>
                      <td><span style={{fontSize:12,padding:'2px 10px',borderRadius:20,fontWeight:600,background:EV_LIGHT,color:EV_TEXT}}>{k.status}</span></td>
                      <td style={{whiteSpace:'nowrap'}}>
                        <button className="btn btn-sm btn-outline" onClick={e=>{e.stopPropagation();setKForm(k);setKontaktModal(true)}}>Bearb.</button>
                        {' '}<button className="btn btn-sm btn-danger" onClick={e=>{e.stopPropagation();deleteKontakt(k.id)}}>X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
          }
        </div>
      )}

      {/* VERTRÄGE */}
      {tab==='vertraege'&&(
        <div>
          <div className="toolbar">
            <button className="btn btn-primary" style={{background:EV_COLOR}} onClick={()=>{setVForm({...EMPTY_V,saison_id:filterSaison||''});setVertragModal(true)}}>+ Neuer e.V.-Vertrag</button>
          </div>
          {filteredVertraege.length===0
            ? <div className="empty-state card"><p>Keine Verträge für diese Auswahl.</p></div>
            : <div className="table-wrap"><table>
                <thead><tr><th>Organisation</th><th>Saison</th><th>Jahresbetrag</th><th>Laufzeit</th><th>Status</th><th>✓</th><th></th></tr></thead>
                <tbody>
                  {filteredVertraege.map(v=>(
                    <tr key={v.id} style={{background:'#fff8f0'}}>
                      <td><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:8,height:8,borderRadius:'50%',background:EV_COLOR,flexShrink:0}}/><strong>{v.kontakte?.firma}</strong></div></td>
                      <td style={{fontSize:13}}>{v.sponsoring_saisons?.length>0?v.sponsoring_saisons.map(ss=>ss.saisons?.name).filter(Boolean).join(', '):v.saisons?.name||'--'}</td>
                      <td style={{fontWeight:600}}>{v.jahresbetrag?Number(v.jahresbetrag).toLocaleString('de-DE')+' EUR':'--'}</td>
                      <td style={{fontSize:13}}>{v.vertragsbeginn?new Date(v.vertragsbeginn).toLocaleDateString('de-DE'):'--'}{v.vertragsende?' – '+new Date(v.vertragsende).toLocaleDateString('de-DE'):''}</td>
                      <td><span style={{fontSize:12,padding:'2px 10px',borderRadius:20,fontWeight:600,background:v.status==='Aktiv'?'#e2efda':EV_LIGHT,color:v.status==='Aktiv'?'#2d6b3a':EV_TEXT}}>{v.status}</span></td>
                      <td>{v.vertrag_unterzeichnet?'✅':'⬜'}</td>
                      <td style={{whiteSpace:'nowrap'}}>
                        <button className="btn btn-sm btn-outline" onClick={()=>{setVForm({...v,saison_id:v.saison_id||'',selected_saisons:(v.sponsoring_saisons||[]).map(ss=>ss.saison_id)});setVertragModal(true)}}>Bearb.</button>
                        {' '}<button className="btn btn-sm btn-danger" onClick={()=>deleteVertrag(v.id)}>X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{background:'var(--gray-100)',fontWeight:700}}><td colSpan="2">Gesamt</td><td>{gesamtGeld.toLocaleString('de-DE')} EUR</td><td colSpan="4"></td></tr></tfoot>
              </table></div>
          }
        </div>
      )}

      {/* MODAL: KONTAKT */}
      {kontaktModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setKontaktModal(false)}>
          <div className="modal" style={{maxWidth:500}}>
            <div className="modal-header" style={{borderBottom:`3px solid ${EV_COLOR}`}}>
              <span className="modal-title">{kForm.id?'e.V.-Kontakt bearbeiten':'Neuer e.V.-Kontakt'}</span>
              <button className="close-btn" onClick={()=>setKontaktModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{background:EV_LIGHT,borderRadius:'var(--radius)',padding:'8px 12px',marginBottom:16,fontSize:13,color:EV_TEXT,fontWeight:600}}>
                🏛️ Läuft nicht ins Sponsoring-Budget.
              </div>
              <div className="form-row">
                <div className="form-group"><label>Organisation *</label><input value={kForm.firma||''} onChange={e=>setKForm(f=>({...f,firma:e.target.value}))} autoFocus/></div>
                <div className="form-group"><label>Status</label>
                  <select value={kForm.status||'Offen'} onChange={e=>setKForm(f=>({...f,status:e.target.value}))}>
                    {['Offen','Eingeladen','Zugesagt','Absage','Aktiver Sponsor','Ehemaliger Sponsor'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={kForm.email||''} onChange={e=>setKForm(f=>({...f,email:e.target.value}))}/></div>
                <div className="form-group"><label>Telefon</label><input value={kForm.telefon||''} onChange={e=>setKForm(f=>({...f,telefon:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label>Notiz</label><textarea value={kForm.notiz||''} onChange={e=>setKForm(f=>({...f,notiz:e.target.value}))}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setKontaktModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" style={{background:EV_COLOR}} onClick={saveKontakt} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VERTRAG */}
      {vertragModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setVertragModal(false)}>
          <div className="modal" style={{maxWidth:580}}>
            <div className="modal-header" style={{borderBottom:`3px solid ${EV_COLOR}`}}>
              <span className="modal-title">{vForm.id?'e.V.-Vertrag bearbeiten':'Neuer e.V.-Vertrag'}</span>
              <button className="close-btn" onClick={()=>setVertragModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{background:EV_LIGHT,borderRadius:'var(--radius)',padding:'8px 12px',marginBottom:16,fontSize:13,color:EV_TEXT,fontWeight:600}}>
                🏛️ Läuft nicht ins reguläre Sponsoring-Budget.
              </div>
              <div className="form-row">
                <div className="form-group"><label>Organisation *</label>
                  <select value={vForm.kontakt_id||''} onChange={e=>setVForm(f=>({...f,kontakt_id:e.target.value}))}>
                    <option value="">Bitte wählen...</option>
                    {kontakte.map(k=><option key={k.id} value={k.id}>{k.firma}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Saisons (Mehrfachauswahl)</label>
                  <div style={{border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',padding:10,display:'flex',flexWrap:'wrap',gap:8,minHeight:44}}>
                    {saisons.map(s => {
                      const selected = (vForm.selected_saisons||[]).includes(s.id)
                      return (
                        <button key={s.id} type="button" onClick={()=>toggleSaison(s.id)}
                          style={{padding:'4px 12px',borderRadius:20,border:'1.5px solid',fontSize:13,cursor:'pointer',
                            background:selected?EV_COLOR:'var(--white)',
                            color:selected?'white':'var(--gray-600)',
                            borderColor:selected?EV_COLOR:'var(--gray-200)'}}>
                          {s.name}{s.aktiv?' ★':''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Jahresbetrag (EUR)</label><input type="number" value={vForm.jahresbetrag||''} onChange={e=>setVForm(f=>({...f,jahresbetrag:e.target.value}))}/></div>
                <div className="form-group"><label>Status</label>
                  <select value={vForm.status||'Anfrage'} onChange={e=>setVForm(f=>({...f,status:e.target.value}))}>
                    {STATUS_LIST.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Vertragsbeginn</label><input type="date" value={vForm.vertragsbeginn||''} onChange={e=>setVForm(f=>({...f,vertragsbeginn:e.target.value}))}/></div>
                <div className="form-group"><label>Vertragsende</label><input type="date" value={vForm.vertragsende||''} onChange={e=>setVForm(f=>({...f,vertragsende:e.target.value}))}/></div>
              </div>
              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:10,textTransform:'none',fontSize:14,cursor:'pointer',padding:'6px 0'}}>
                  <input type="checkbox" style={{width:18,height:18}} checked={vForm.vertrag_unterzeichnet||false} onChange={e=>setVForm(f=>({...f,vertrag_unterzeichnet:e.target.checked}))}/>
                  <span>Vertrag unterzeichnet</span>
                </label>
              </div>
              <div className="form-group"><label>Notizen</label><textarea value={vForm.notizen||''} onChange={e=>setVForm(f=>({...f,notizen:e.target.value}))}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setVertragModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" style={{background:EV_COLOR}} onClick={saveVertrag} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
