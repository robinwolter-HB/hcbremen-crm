import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const ALLE_BEREICHE = [
  { key: 'kontakte',             label: 'Kontakte',              gruppe: 'crm' },
  { key: 'historie',             label: 'Kontakthistorie',       gruppe: 'crm' },
  { key: 'veranstaltungen',      label: 'Veranstaltungen',       gruppe: 'events' },
  { key: 'sponsoring',           label: 'Sponsoring',            gruppe: 'crm' },
  { key: 'aufgaben',             label: 'Aufgaben',              gruppe: 'crm' },
  { key: 'berichte',             label: 'Berichte',              gruppe: 'crm' },
  { key: 'media',                label: 'Media Hub',             gruppe: 'media' },
  { key: 'mannschaft',           label: 'Mannschaft',            gruppe: 'mannschaft' },
  { key: 'mannschaft_manager',   label: 'Mannschaft Manager',    gruppe: 'mannschaft', info: 'Sieht Vertrags- und Gehaltsdaten' },
]

const GRUPPEN_LABEL = { crm:'👥 CRM', events:'📅 Events', media:'📸 Media', mannschaft:'🏐 Mannschaft' }

const ROLLEN = [
  { key: 'admin',      label: 'Admin',        beschreibung: 'Voller Zugriff inkl. Benutzerverwaltung' },
  { key: 'mitarbeiter',label: 'Mitarbeiter',  beschreibung: 'Zugriff auf ausgewählte Bereiche' },
  { key: 'media',      label: 'Media',        beschreibung: 'Zugriff nur auf den Media Hub' },
  { key: 'readonly',   label: 'Nur Lesen',    beschreibung: 'Kann nur lesen, nichts bearbeiten' },
]

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{ width:44, height:24, borderRadius:12, flexShrink:0, cursor:'pointer', position:'relative', background:checked?'var(--navy)':'var(--gray-200)', transition:'background 0.2s' }}>
      <div style={{ position:'absolute', top:2, width:20, height:20, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s', left:checked?22:2 }}/>
    </div>
  )
}

function RolleAuswahl({ value, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {ROLLEN.map(r => (
        <div key={r.key} onClick={() => onChange(r.key)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', border:'1.5px solid '+(value===r.key?'var(--navy)':'var(--gray-200)'), borderRadius:'var(--radius)', cursor:'pointer', background:value===r.key?'rgba(15,34,64,0.04)':'var(--white)' }}>
          <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, border:'2px solid', borderColor:value===r.key?'var(--navy)':'var(--gray-300)', background:value===r.key?'var(--navy)':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {value===r.key&&<div style={{ width:7, height:7, borderRadius:'50%', background:'white' }}/>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:14 }}>{r.label}</div>
            <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{r.beschreibung}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function BereicheToggles({ bereiche, onChange, rolle }) {
  // Für Media-Rolle: media ist automatisch aktiv
  const effektiveBereiche = rolle === 'media'
    ? [...new Set([...bereiche, 'media'])]
    : bereiche

  function toggle(key) {
    const updated = effektiveBereiche.includes(key)
      ? effektiveBereiche.filter(b=>b!==key)
      : [...effektiveBereiche, key]
    onChange(updated)
  }

  // Gruppiere nach Bereichen
  const gruppen = ['crm','events','media']

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {gruppen.map(gKey => {
        const items = ALLE_BEREICHE.filter(b=>b.gruppe===gKey)
        return (
          <div key={gKey}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{GRUPPEN_LABEL[gKey]}</div>
            <div style={{ border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', overflow:'hidden' }}>
              {items.map((b, i) => {
                const hat = effektiveBereiche.includes(b.key)
                const isMediaLocked = b.key==='media' && rolle==='media'
                return (
                  <div key={b.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:i<items.length-1?'1px solid var(--gray-100)':'none', background:hat?'rgba(15,34,64,0.02)':'var(--white)' }}>
                    <div>
                      <span style={{ fontSize:14, fontWeight:500 }}>{b.label}</span>
                      {isMediaLocked && <span style={{ fontSize:11, color:'var(--gold)', marginLeft:8 }}>⚡ Standard für Media-Rolle</span>}
                      {b.info && <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2 }}>{b.info}</div>}
                    </div>
                    <Toggle checked={hat} onChange={() => !isMediaLocked && toggle(b.key)} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RollenBadge({ rolle }) {
  const styles = {
    admin:       { background:'#fce4d6', color:'#8a3a1a', label:'Admin' },
    mitarbeiter: { background:'#ddeaff', color:'#1a4a8a', label:'Mitarbeiter' },
    media:       { background:'#fff3cd', color:'#8a6a00', label:'Media' },
    readonly:    { background:'#ececec', color:'#555',    label:'Nur Lesen' },
  }
  const s = styles[rolle] || styles.readonly
  return <span style={{ fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:600, background:s.background, color:s.color }}>{s.label}</span>
}

export default function Benutzer() {
  const { isAdmin, profile: currentProfile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [profilModal, setProfilModal] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [sponsoren, setSponsoren] = useState([])
  const [form, setForm] = useState({ email:'', name:'', password:'', rolle:'mitarbeiter', bereiche:['kontakte','historie','veranstaltungen','sponsoring','aufgaben'] })
  const [editForm, setEditForm] = useState({})
  const [profilForm, setProfilForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileRef = useRef()

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profile').select('*').order('erstellt_am', { ascending: true })
    setUsers(data || [])
    setLoading(false)
  }

  async function loadSponsoren(userName) {
    const { data } = await supabase.from('kontakte').select('id,firma,status,kategorie,logo_url').eq('zustaendig', userName).order('firma')
    setSponsoren(data || [])
  }

  // Standard-Bereiche je nach Rolle
  function standardBereiche(rolle) {
    if (rolle === 'admin') return ALLE_BEREICHE.map(b=>b.key)
    if (rolle === 'media') return ['media']
    if (rolle === 'mannschaft') return ['mannschaft']
    return ['kontakte','historie','veranstaltungen','sponsoring','aufgaben']
  }

  async function createUser() {
    if (!form.email || !form.password) { setError('E-Mail und Passwort erforderlich'); return }
    if (form.password.length < 6) { setError('Passwort mind. 6 Zeichen'); return }
    setSaving(true); setError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) { setError('Bitte neu einloggen'); setSaving(false); return }
      const res = await fetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ email:form.email, password:form.password, name:form.name, rolle:form.rolle, bereiche:form.rolle==='admin'?null:form.bereiche })
      })
      const rawText = await res.text()
      let result
      try { result = JSON.parse(rawText) } catch(e) { setError('Unerwartete Antwort'); setSaving(false); return }
      if (result.error) { setError(result.error) } else {
        setSuccess(`Benutzer ${form.email} erfolgreich angelegt!`)
        setModal(false)
        setForm({ email:'', name:'', password:'', rolle:'mitarbeiter', bereiche:['kontakte','historie','veranstaltungen','sponsoring','aufgaben'] })
        load()
        setTimeout(() => setSuccess(''), 4000)
      }
    } catch(e) { setError('Verbindungsfehler: '+e.message) }
    setSaving(false)
  }

  async function updateUser() {
    setSaving(true)
    const bereiche = editForm.rolle==='admin'
      ? ALLE_BEREICHE.map(b=>b.key)
      : editForm.bereiche
    const { error } = await supabase.from('profile').update({ name:editForm.name, rolle:editForm.rolle, bereiche }).eq('id', editForm.id)
    if (error) { alert('Fehler: '+error.message); setSaving(false); return }
    setEditModal(false); setSaving(false); load()
  }

  async function saveProfil() {
    setSaving(true)
    let avatar_url = profilForm.avatar_url || null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `avatars/${profilForm.id}_${Date.now()}.${ext}`
      const { data: up } = await supabase.storage.from('logos').upload(path, avatarFile, { upsert: true })
      if (up) { const { data: pub } = supabase.storage.from('logos').getPublicUrl(up.path); avatar_url = pub.publicUrl }
    }
    const { error } = await supabase.from('profile').update({ name:profilForm.name, position:profilForm.position||null, telefon:profilForm.telefon||null, avatar_url }).eq('id', profilForm.id)
    if (error) { alert('Fehler: '+error.message) }
    setProfilModal(false); setSaving(false); setAvatarFile(null); setAvatarPreview(null); load()
  }

  async function deactivateUser(userId) {
    if (!window.confirm('Zugriff entziehen?')) return
    await supabase.from('profile').update({ rolle:'readonly', bereiche:[] }).eq('id', userId)
    load()
  }

  function openDetail(u) { setSelectedUser(u); loadSponsoren(u.name||u.email); setDetailModal(true) }
  function openProfil(u) { setProfilForm(u); setAvatarPreview(u.avatar_url||null); setAvatarFile(null); setProfilModal(true) }

  if (!isAdmin()) return (
    <main className="main"><div className="card"><p style={{color:'var(--red)'}}>Nur Admins können Benutzer verwalten.</p></div></main>
  )
  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Benutzerverwaltung</div>
      <p className="page-subtitle">Nutzer anlegen, Rechte verwalten und Profile bearbeiten</p>
      {success && <div className="alert alert-success" style={{marginBottom:20}}>{success}</div>}
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => {
          setForm({ email:'', name:'', password:'', rolle:'mitarbeiter', bereiche:['kontakte','historie','veranstaltungen','sponsoring','aufgaben'] })
          setError(''); setModal(true)
        }}>+ Neuer Benutzer</button>
      </div>

      <div style={{ display:'grid', gap:16 }}>
        {users.map(u => {
          const isMe = u.id === currentProfile?.id
          return (
            <div key={u.id} className="card" style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" style={{ width:48, height:48, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--gray-200)', flexShrink:0 }}/>
                    : <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:18, flexShrink:0 }}>
                        {(u.name||u.email||'?')[0].toUpperCase()}
                      </div>
                  }
                  <div>
                    <div style={{ fontWeight:600, fontSize:15, display:'flex', alignItems:'center', gap:8 }}>
                      {u.name||u.email||'(Kein Name)'}
                      {isMe&&<span style={{ fontSize:11, background:'var(--gold)', color:'var(--navy)', padding:'1px 8px', borderRadius:20, fontWeight:700 }}>Du</span>}
                    </div>
                    <div style={{ fontSize:13, color:'var(--gray-400)' }}>{u.email}</div>
                    {u.position&&<div style={{ fontSize:12, color:'var(--gray-600)', marginTop:2 }}>{u.position}</div>}
                    {u.telefon&&<div style={{ fontSize:12, color:'var(--gray-600)' }}>📞 {u.telefon}</div>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <RollenBadge rolle={u.rolle} />
                  <button className="btn btn-sm btn-outline" onClick={() => openDetail(u)}>Sponsoren</button>
                  <button className="btn btn-sm btn-outline" onClick={() => openProfil(u)}>{isMe?'Mein Profil':'Profil'}</button>
                  {isAdmin()&&<button className="btn btn-sm btn-outline" onClick={() => { setEditForm({...u, bereiche:u.bereiche||[]}); setEditModal(true) }}>Rechte</button>}
                  {!isMe&&isAdmin()&&<button className="btn btn-sm btn-danger" onClick={() => deactivateUser(u.id)}>Deaktivieren</button>}
                </div>
              </div>

              {/* Zugriffsrechte gruppiert */}
              <div style={{ paddingTop:12, borderTop:'1px solid var(--gray-100)' }}>
                <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.3px' }}>Zugriffsrechte</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {['crm','events','media'].map(gKey => {
                    const items = ALLE_BEREICHE.filter(b=>b.gruppe===gKey)
                    const aktive = items.filter(b => u.rolle==='admin' || (u.bereiche||[]).includes(b.key))
                    if (aktive.length===0) return null
                    return (
                      <div key={gKey} style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:11, color:'var(--gray-400)', width:60, flexShrink:0 }}>{GRUPPEN_LABEL[gKey]}</span>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {items.map(b => {
                            const hat = u.rolle==='admin' || (u.bereiche||[]).includes(b.key)
                            return (
                              <span key={b.key} style={{ fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:600, background:hat?'#e2efda':'var(--gray-100)', color:hat?'#2d6b3a':'var(--gray-400)' }}>
                                {hat?'✓':'✕'} {b.label}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL: NEUER BENUTZER */}
      {modal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{maxWidth:620}}>
            <div className="modal-header"><span className="modal-title">Neuer Benutzer</span><button className="close-btn" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              {error&&<div className="alert alert-error" style={{marginBottom:16}}>{error}</div>}
              <div className="form-row">
                <div className="form-group"><label>Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Vor- und Nachname"/></div>
                <div className="form-group"><label>E-Mail *</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="name@email.de"/></div>
              </div>
              <div className="form-group"><label>Passwort * (mind. 6 Zeichen)</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></div>
              <div className="form-group">
                <label>Rolle</label>
                <RolleAuswahl value={form.rolle} onChange={rolle=>setForm(f=>({...f, rolle, bereiche:standardBereiche(rolle)}))}/>
              </div>
              {form.rolle!=='admin'&&(
                <div className="form-group">
                  <label>Zugriffsrechte</label>
                  <BereicheToggles bereiche={form.bereiche} rolle={form.rolle} onChange={bereiche=>setForm(f=>({...f,bereiche}))}/>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={createUser} disabled={saving}>{saving?'Anlegen...':'Benutzer anlegen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECHTE BEARBEITEN */}
      {editModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditModal(false)}>
          <div className="modal" style={{maxWidth:620}}>
            <div className="modal-header"><span className="modal-title">Rechte bearbeiten – {editForm.name||editForm.email}</span><button className="close-btn" onClick={()=>setEditModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label>Rolle</label>
                <RolleAuswahl value={editForm.rolle} onChange={rolle=>setEditForm(f=>({...f, rolle, bereiche:standardBereiche(rolle)}))}/>
              </div>
              {editForm.rolle!=='admin'&&(
                <div className="form-group">
                  <label>Zugriffsrechte</label>
                  <BereicheToggles bereiche={editForm.bereiche||[]} rolle={editForm.rolle} onChange={bereiche=>setEditForm(f=>({...f,bereiche}))}/>
                </div>
              )}
              <div className="form-group" style={{marginTop:8}}>
                <label style={{display:'flex',alignItems:'center',gap:10,textTransform:'none',fontSize:14,cursor:'pointer',fontWeight:600}}>
                  <input type="checkbox" style={{width:18,height:18}} checked={editForm.ist_manager||false} onChange={e=>setEditForm(f=>({...f,ist_manager:e.target.checked}))}/>
                  💼 Manager (sieht Vertrags- und Gehaltsdaten)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setEditModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={updateUser} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROFIL */}
      {profilModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setProfilModal(false)}>
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header"><span className="modal-title">Profil bearbeiten</span><button className="close-btn" onClick={()=>setProfilModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label>Profilbild</label>
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="" style={{width:64,height:64,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--gray-200)'}}/>
                    : <div style={{width:64,height:64,borderRadius:'50%',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:24}}>{(profilForm.name||profilForm.email||'?')[0].toUpperCase()}</div>
                  }
                  <div>
                    <button className="btn btn-sm btn-outline" onClick={()=>fileRef.current.click()}>Bild hochladen</button>
                    {avatarPreview&&<button style={{marginLeft:8,color:'var(--red)',background:'none',border:'none',cursor:'pointer',fontSize:13}} onClick={()=>{setAvatarPreview(null);setAvatarFile(null);setProfilForm(f=>({...f,avatar_url:null}))}}>Entfernen</button>}
                    <input type="file" ref={fileRef} accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setAvatarFile(f);setAvatarPreview(URL.createObjectURL(f))}}}/>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Name</label><input value={profilForm.name||''} onChange={e=>setProfilForm(f=>({...f,name:e.target.value}))}/></div>
                <div className="form-group"><label>Position im Verein</label><input value={profilForm.position||''} onChange={e=>setProfilForm(f=>({...f,position:e.target.value}))} placeholder="z.B. Sponsoring-Manager"/></div>
              </div>
              <div className="form-group"><label>Telefon</label><input value={profilForm.telefon||''} onChange={e=>setProfilForm(f=>({...f,telefon:e.target.value}))} placeholder="+49 421 ..."/></div>
              <div className="form-group"><label>E-Mail</label><input value={profilForm.email||''} disabled style={{background:'var(--gray-100)',color:'var(--gray-400)'}}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setProfilModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveProfil} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SPONSOREN */}
      {detailModal&&selectedUser&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDetailModal(false)}>
          <div className="modal" style={{maxWidth:620}}>
            <div className="modal-header">
              <span className="modal-title">Sponsoren von {selectedUser.name||selectedUser.email}</span>
              <button className="close-btn" onClick={()=>setDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {sponsoren.length===0
                ? <div className="empty-state"><p>Keine Kontakte diesem Benutzer zugeordnet.</p><p style={{fontSize:13,color:'var(--gray-400)',marginTop:8}}>Weise Kontakte unter „Kontakte → Zuständig" zu.</p></div>
                : <>
                    <p style={{fontSize:13,color:'var(--gray-600)',marginBottom:16}}>{sponsoren.length} Kontakt{sponsoren.length!==1?'e':''} zugeordnet</p>
                    <div style={{display:'grid',gap:8}}>
                      {sponsoren.map(k=>(
                        <div key={k.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',background:'var(--white)'}}>
                          {k.logo_url
                            ? <img src={k.logo_url} alt="" style={{width:36,height:36,objectFit:'contain',borderRadius:4,border:'1px solid var(--gray-200)',flexShrink:0}}/>
                            : <div style={{width:36,height:36,background:'var(--gray-100)',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'var(--gray-400)',flexShrink:0}}>{k.firma?.[0]}</div>
                          }
                          <div style={{flex:1}}>
                            <div style={{fontWeight:600,fontSize:14}}>{k.firma}</div>
                            <div style={{fontSize:12,color:'var(--gray-400)'}}>{k.kategorie}</div>
                          </div>
                          <span style={{fontSize:12,fontWeight:600,padding:'2px 10px',borderRadius:20,background:k.status==='Aktiver Sponsor'?'#e2efda':k.status==='In Verhandlung'?'#ddeaff':'#ececec',color:k.status==='Aktiver Sponsor'?'#2d6b3a':k.status==='In Verhandlung'?'#1a4a8a':'#555'}}>{k.status}</span>
                        </div>
                      ))}
                    </div>
                  </>
              }
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setDetailModal(false)}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
