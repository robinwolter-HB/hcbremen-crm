import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_LIST = ['Offen','Eingeladen','Zugesagt','Absage','Aktiver Sponsor','Ehemaliger Sponsor']
const KAT_LIST = ['Sponsor','Foerderverein','Freunde des Vereins','Ehemalige','Partner','Medien','Werbeagentur','Kontakt','Sonstige']
const BADGE_MAP = { 'Zugesagt':'badge-zugesagt','Eingeladen':'badge-eingeladen','Offen':'badge-offen','Absage':'badge-absage','Aktiver Sponsor':'badge-aktiv','Ehemaliger Sponsor':'badge-ehemaliger' }
const EMPTY = { firma:'', email:'', telefon:'', website:'', branche:'', status:'Offen', kategorie:'Sponsor', zustaendig:'', notiz:'', adresse_strasse:'', adresse_plz:'', adresse_stadt:'', adresse_land:'Deutschland', logo_url:null, ist_ev:false }

export default function Kontakte() {
  const [kontakte, setKontakte] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [katFilter, setKatFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [mapModal, setMapModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [personen, setPersonen] = useState([])
  const [statusListe, setStatusListe] = useState(['Offen','Eingeladen','Zugesagt','Absage','Aktiver Sponsor','Ehemaliger Sponsor'])
  const [kategorienListe, setKategorienListe] = useState(['Sponsor','Foerderverein','Freunde des Vereins','Ehemalige','Partner','Medien','Werbeagentur','Kontakt','Sonstige'])
  const [branchen, setBranchen] = useState([])
  const [brancheInput, setBrancheInput] = useState('')
  const [brancheSuggestions, setBrancheSuggestions] = useState([])
  const fileRef = useRef()
  const navigate = useNavigate()

  useEffect(() => { loadListen(); load() }, [])

  async function loadListen() {
    const { data: st } = await supabase.from('crm_status').select('name').eq('aktiv', true).order('reihenfolge')
    if (st && st.length > 0) setStatusListe(st.map(s => s.name))
    const { data: kt } = await supabase.from('kontakt_kategorien').select('name').eq('aktiv', true).order('reihenfolge')
    if (kt && kt.length > 0) setKategorienListe(kt.map(k => k.name))
  }
  useEffect(() => { applyFilter() }, [kontakte, search, statusFilter, katFilter])

  async function load() {
    try {
      const [{ data: k },{ data: p }] = await Promise.all([
        supabase.from('kontakte').select('*').order('firma'),
        supabase.from('personen').select('*').eq('aktiv', true).order('name')
      ])
      setKontakte(k || [])
      setPersonen(p || [])
      // Branchen optional laden
      const { data: b } = await supabase.from('branchen').select('*').order('name')
      setBranchen(b || [])
    } catch(e) {
      console.error('Load error:', e)
    }
    setLoading(false)
  }

  function applyFilter() {
    let r = kontakte
    if (search) { const q = search.toLowerCase(); r = r.filter(k => k.firma?.toLowerCase().includes(q) || k.branche?.toLowerCase().includes(q) || k.adresse_stadt?.toLowerCase().includes(q)) }
    if (statusFilter) r = r.filter(k => k.status === statusFilter)
    if (katFilter === '__ev__') r = r.filter(k => k.ist_ev)
    else if (katFilter) r = r.filter(k => k.kategorie === katFilter)
    setFiltered(r)
  }

  function handleBrancheInput(val) {
    setBrancheInput(val)
    setForm(f => ({ ...f, branche: val }))
    if (val.length > 0) {
      setBrancheSuggestions(branchen.filter(b => b.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5))
    } else {
      setBrancheSuggestions([])
    }
  }

  function selectBranche(name) {
    setBrancheInput(name)
    setForm(f => ({ ...f, branche: name }))
    setBrancheSuggestions([])
  }

  function openNew() {
    setForm(EMPTY); setLogoFile(null); setLogoPreview(null)
    setBrancheInput(''); setBrancheSuggestions([])
    setModal(true)
  }

  function openEdit(k, e) {
    e.stopPropagation()
    setForm({ id:k.id, firma:k.firma||'', email:k.email||'', telefon:k.telefon||'', website:k.website||'', branche:k.branche||'', status:k.status||'Offen', kategorie:k.kategorie||'Sponsor', zustaendig:k.zustaendig||'', notiz:k.notiz||'', adresse_strasse:k.adresse_strasse||'', adresse_plz:k.adresse_plz||'', adresse_stadt:k.adresse_stadt||'', adresse_land:k.adresse_land||'Deutschland', logo_url:k.logo_url||null })
    setBrancheInput(k.branche || '')
    setLogoPreview(k.logo_url || null); setLogoFile(null)
    setModal(true)
  }

  function handleLogoChange(e) {
    const f = e.target.files[0]; if (!f) return
    setLogoFile(f); setLogoPreview(URL.createObjectURL(f))
  }

  async function save() {
    if (!form.firma.trim()) return
    setSaving(true)
    let logo_url = form.logo_url || null
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data: up } = await supabase.storage.from('logos').upload(path, logoFile, { upsert: true })
      if (up) { const { data: pub } = supabase.storage.from('logos').getPublicUrl(up.path); logo_url = pub.publicUrl }
    }
    // Branche in Branchen-Tabelle speichern falls neu
    if (form.branche && !branchen.find(b => b.name.toLowerCase() === form.branche.toLowerCase())) {
      await supabase.from('branchen').upsert({ name: form.branche }, { onConflict: 'name', ignoreDuplicates: true })
    }
    const payload = { firma:form.firma, email:form.email||null, telefon:form.telefon||null, website:form.website||null, branche:form.branche||null, status:form.status, kategorie:form.kategorie, zustaendig:form.zustaendig||null, notiz:form.notiz||null, adresse_strasse:form.adresse_strasse||null, adresse_plz:form.adresse_plz||null, adresse_stadt:form.adresse_stadt||null, adresse_land:form.adresse_land||'Deutschland', logo_url, ist_ev:form.ist_ev||false, geaendert_am:new Date().toISOString() }
    if (form.id) await supabase.from('kontakte').update(payload).eq('id', form.id)
    else await supabase.from('kontakte').insert(payload)
    setModal(false); setSaving(false); load()
  }

  async function remove(id, e) {
    e.stopPropagation()
    if (!window.confirm('Kontakt wirklich loeschen?')) return
    await supabase.from('kontakte').delete().eq('id', id); load()
  }

  // Karte URL generieren
  function getMapsUrl(k) {
    const addr = [k.adresse_strasse, k.adresse_plz, k.adresse_stadt, k.adresse_land].filter(Boolean).join(', ')
    if (!addr) return null
    return `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`
  }

  function getGoogleMapsLink(k) {
    const addr = [k.adresse_strasse, k.adresse_plz, k.adresse_stadt, k.adresse_land].filter(Boolean).join(', ')
    if (!addr) return null
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
  }

  // Sponsoren mit Adresse für Übersichtskarte
  const mitAdresse = kontakte.filter(k => k.adresse_stadt || k.adresse_strasse)

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Kontakte</div>
      <p className="page-subtitle">{filtered.length} von {kontakte.length} Kontakten</p>

      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input placeholder="Firma, Branche oder Stadt..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Alle Status</option>
          {statusListe.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={katFilter} onChange={e => setKatFilter(e.target.value)}>
          <option value="">Alle Kategorien</option>
          {kategorienListe.map(k => <option key={k}>{k}</option>)}
        </select>
        <button className="btn btn-outline" onClick={() => setMapModal(true)} title="Übersichtskarte">🗺️</button>
        <button className="btn btn-primary" onClick={openNew}>+ Neuer Kontakt</button>
        <button className="btn btn-outline" style={{borderColor:'#e07b30',color:'#e07b30'}} onClick={()=>setKatFilter(katFilter==='__ev__'?'':'__ev__')}>
          {katFilter==='__ev__'?'✕ ':''}🏛️ e.V.
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Firma</th><th>Branche</th><th>Stadt</th><th>Status</th><th>Kategorie</th><th>Zustaendig</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan="7"><div className="empty-state"><p>Keine Ergebnisse.</p></div></td></tr>
              : filtered.map(k => (
                <tr key={k.id} onClick={() => navigate('/kontakte/'+k.id)} style={{background:k.ist_ev?'#fff8f0':'inherit'}}>
                  <td>
                    <div className="firma-cell">
                      {k.logo_url ? <img src={k.logo_url} alt="" className="firma-logo-sm"/> : <div className="firma-logo-placeholder">{k.firma?.[0]||'?'}</div>}
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <strong>{k.firma}</strong>
                          {k.ist_ev&&<span style={{fontSize:10,background:'#e07b30',color:'white',padding:'1px 6px',borderRadius:10,fontWeight:700,flexShrink:0}}>e.V.</span>}
                        </div>
                        {k.adresse_stadt && <div style={{fontSize:11,color:'var(--gray-400)'}}>📍 {k.adresse_stadt}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{fontSize:13,color:'var(--gray-600)'}}>{k.branche||'--'}</td>
                  <td style={{fontSize:13,color:'var(--gray-600)'}}>{k.adresse_stadt||'--'}</td>
                  <td><span className={'badge '+(BADGE_MAP[k.status]||'')}>{k.status}</span></td>
                  <td style={{fontSize:13,color:'var(--gray-600)'}}>{k.kategorie}</td>
                  <td style={{fontSize:13,color:'var(--gray-600)'}}>{k.zustaendig||'--'}</td>
                  <td style={{whiteSpace:'nowrap'}}>
                    <button className="btn btn-sm btn-outline" onClick={e => openEdit(k, e)}>Bearb.</button>
                    {' '}<button className="btn btn-sm btn-danger" onClick={e => remove(k.id, e)}>X</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* MODAL: KONTAKT BEARBEITEN */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{maxWidth:720}}>
            <div className="modal-header">
              <span className="modal-title">{form.id?'Kontakt bearbeiten':'Neuer Kontakt'}</span>
              <button className="close-btn" onClick={()=>setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Logo */}
              <div className="form-group">
                <label>Firmenlogo</label>
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                  {logoPreview ? <img src={logoPreview} alt="Logo" className="logo-preview"/> : <div className="firma-logo-placeholder" style={{width:64,height:64,fontSize:24}}>{form.firma?.[0]||'?'}</div>}
                  <div>
                    <button className="btn btn-outline btn-sm" onClick={()=>fileRef.current.click()}>{logoPreview?'Logo aendern':'Logo hochladen'}</button>
                    {logoPreview && <button style={{marginLeft:8,color:'var(--red)',background:'none',border:'none',cursor:'pointer',fontSize:14}} onClick={()=>{setLogoPreview(null);setLogoFile(null);setForm(f=>({...f,logo_url:null}))}}>Entfernen</button>}
                    <p style={{fontSize:12,color:'var(--gray-400)',marginTop:6}}>PNG, JPG, SVG – max. 2 MB</p>
                  </div>
                  <input type="file" ref={fileRef} accept="image/*" style={{display:'none'}} onChange={handleLogoChange}/>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>Firma *</label><input value={form.firma} onChange={e=>setForm(f=>({...f,firma:e.target.value}))}/></div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {statusListe.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>Kategorie</label>
                  <select value={form.kategorie} onChange={e=>setForm(f=>({...f,kategorie:e.target.value}))}>
                    {kategorienListe.map(k=><option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{position:'relative'}}>
                  <label>Branche</label>
                  <input value={brancheInput} onChange={e=>handleBrancheInput(e.target.value)} placeholder="z.B. Gesundheit, IT, Handel..." autoComplete="off"/>
                  {brancheSuggestions.length>0&&(
                    <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--white)',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',zIndex:10,boxShadow:'var(--shadow)'}}>
                      {brancheSuggestions.map(b=>(
                        <div key={b.id} onClick={()=>selectBranche(b.name)} style={{padding:'8px 14px',cursor:'pointer',fontSize:14}} onMouseEnter={e=>e.target.style.background='var(--gray-100)'} onMouseLeave={e=>e.target.style.background='transparent'}>{b.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
                <div className="form-group"><label>Telefon</label><input value={form.telefon||''} onChange={e=>setForm(f=>({...f,telefon:e.target.value}))}/></div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>Website</label><input type="url" placeholder="https://..." value={form.website||''} onChange={e=>setForm(f=>({...f,website:e.target.value}))}/></div>
                <div className="form-group"><label>Zustaendig (intern)</label>
                  <select value={form.zustaendig||''} onChange={e=>setForm(f=>({...f,zustaendig:e.target.value}))}>
                    <option value="">-- Bitte waehlen --</option>
                    {personen.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Adresse */}
              <div style={{background:'var(--gray-100)',borderRadius:'var(--radius)',padding:16,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--gray-600)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:12}}>Adresse</div>
                <div className="form-group"><label>Strasse & Hausnummer</label><input value={form.adresse_strasse||''} onChange={e=>setForm(f=>({...f,adresse_strasse:e.target.value}))} placeholder="Musterstrasse 1"/></div>
                <div className="form-row">
                  <div className="form-group"><label>PLZ</label><input value={form.adresse_plz||''} onChange={e=>setForm(f=>({...f,adresse_plz:e.target.value}))} placeholder="28195"/></div>
                  <div className="form-group"><label>Stadt</label><input value={form.adresse_stadt||''} onChange={e=>setForm(f=>({...f,adresse_stadt:e.target.value}))} placeholder="Bremen"/></div>
                </div>
                {(form.adresse_strasse||form.adresse_stadt) && (
                  <div style={{marginTop:8}}>
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent([form.adresse_strasse,form.adresse_plz,form.adresse_stadt].filter(Boolean).join(', '))}&output=embed&zoom=15`}
                      width="100%" height="180" style={{border:'none',borderRadius:'var(--radius)'}} title="Karte" loading="lazy"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:10,textTransform:'none',fontSize:14,cursor:'pointer',padding:'8px 0'}}>
                  <input type="checkbox" style={{width:18,height:18,flexShrink:0}} checked={form.ist_ev||false} onChange={e=>setForm(f=>({...f,ist_ev:e.target.checked}))}/>
                  <span style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{background:'#e07b30',color:'white',padding:'1px 8px',borderRadius:10,fontSize:12,fontWeight:700}}>e.V.</span>
                    HC Bremen e.V. Kontakt (läuft nicht ins Sponsoring-Budget)
                  </span>
                </label>
              </div>
              <div className="form-group"><label>Notiz</label><textarea value={form.notiz||''} onChange={e=>setForm(f=>({...f,notiz:e.target.value}))}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ÜBERSICHTSKARTE */}
      {mapModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setMapModal(false)}>
          <div className="modal" style={{maxWidth:900}}>
            <div className="modal-header">
              <span className="modal-title">Sponsoren-Übersichtskarte</span>
              <button className="close-btn" onClick={()=>setMapModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {mitAdresse.length === 0
                ? <div className="empty-state"><p>Noch keine Adressen hinterlegt. Trage bei Kontakten Adressen ein damit sie hier erscheinen.</p></div>
                : <>
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent('Bremen, Deutschland')}&output=embed&zoom=12`}
                      width="100%" height="400" style={{border:'none',borderRadius:'var(--radius)',marginBottom:16}} title="Übersichtskarte" loading="lazy"
                    />
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10}}>
                      {mitAdresse.map(k=>(
                        <div key={k.id} style={{padding:'10px 14px',border:'1px solid var(--gray-200)',borderRadius:'var(--radius)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div>
                            <div style={{fontWeight:600,fontSize:13}}>{k.firma}</div>
                            <div style={{fontSize:12,color:'var(--gray-400)'}}>{[k.adresse_strasse,k.adresse_plz,k.adresse_stadt].filter(Boolean).join(', ')}</div>
                          </div>
                          {getGoogleMapsLink(k) && <a href={getGoogleMapsLink(k)} target="_blank" rel="noreferrer" style={{fontSize:20,textDecoration:'none'}}>📍</a>}
                        </div>
                      ))}
                    </div>
                  </>
              }
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
