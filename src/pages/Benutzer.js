import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const ALLE_BEREICHE = [
  { key: 'kontakte', label: 'Kontakte' },
  { key: 'historie', label: 'Kontakthistorie' },
  { key: 'veranstaltungen', label: 'Veranstaltungen' },
  { key: 'sponsoring', label: 'Sponsoring' },
  { key: 'aufgaben', label: 'Aufgaben' },
  { key: 'berichte', label: 'Berichte' },
]

const ROLLEN = [
  { key: 'admin', label: 'Admin', beschreibung: 'Voller Zugriff auf alles inkl. Benutzerverwaltung' },
  { key: 'mitarbeiter', label: 'Mitarbeiter', beschreibung: 'Zugriff auf ausgewaehlte Bereiche' },
  { key: 'readonly', label: 'Nur Lesen', beschreibung: 'Kann nur lesen, nichts bearbeiten' },
]

export default function Benutzer() {
  const { isAdmin, profile: currentProfile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', password: '', rolle: 'mitarbeiter', bereiche: ['kontakte','historie','veranstaltungen','sponsoring','aufgaben'] })
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profile').select('*').order('erstellt_am')
    setUsers(data || [])
    setLoading(false)
  }

  async function createUser() {
    if (!form.email || !form.password) { setError('E-Mail und Passwort erforderlich'); return }
    if (form.password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben'); return }
    setSaving(true); setError('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        name: form.name,
        rolle: form.rolle,
        bereiche: form.rolle === 'admin' ? null : form.bereiche
      })
    })

    const result = await res.json()
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(`Benutzer ${form.email} erfolgreich angelegt!`)
      setModal(false)
      setForm({ email:'', name:'', password:'', rolle:'mitarbeiter', bereiche:['kontakte','historie','veranstaltungen','sponsoring','aufgaben'] })
      load()
      setTimeout(() => setSuccess(''), 4000)
    }
    setSaving(false)
  }

  async function updateUser() {
    setSaving(true)
    await supabase.from('profile').update({
      name: editForm.name,
      rolle: editForm.rolle,
      bereiche: editForm.rolle === 'admin' ? ['kontakte','historie','veranstaltungen','sponsoring','aufgaben','berichte'] : editForm.bereiche
    }).eq('id', editForm.id)
    setEditModal(false)
    setSaving(false)
    load()
  }

  async function deactivateUser(userId) {
    if (!window.confirm('Benutzer wirklich deaktivieren?')) return
    await supabase.from('profile').update({ rolle: 'readonly', bereiche: [] }).eq('id', userId)
    load()
  }

  function toggleBereich(key, inForm, setInForm) {
    setInForm(f => {
      const current = f.bereiche || []
      const updated = current.includes(key) ? current.filter(b => b !== key) : [...current, key]
      return { ...f, bereiche: updated }
    })
  }

  if (!isAdmin()) return (
    <main className="main">
      <div className="card"><p style={{color:'var(--red)'}}>Nur Admins koennen Benutzer verwalten.</p></div>
    </main>
  )

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Benutzerverwaltung</div>
      <p className="page-subtitle">Nutzer anlegen und Zugriffsrechte verwalten</p>

      {success && <div className="alert alert-success" style={{marginBottom:20}}>{success}</div>}

      <div className="alert alert-info" style={{marginBottom:24}}>
        Neue Nutzer erhalten eine Einladungs-E-Mail und koennen sich mit dem gesetzten Passwort einloggen. Passwort kann nach dem ersten Login geaendert werden.
      </div>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => { setForm({ email:'', name:'', password:'', rolle:'mitarbeiter', bereiche:['kontakte','historie','veranstaltungen','sponsoring','aufgaben'] }); setError(''); setModal(true) }}>+ Neuer Benutzer</button>
      </div>

      {/* Benutzerliste */}
      <div style={{display:'grid',gap:16}}>
        {users.map(u => {
          const isMe = u.id === currentProfile?.id
          return (
            <div key={u.id} className="card" style={{padding:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:14}}>
                      {(u.name||u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:600,fontSize:15}}>{u.name || '(Kein Name)'} {isMe && <span style={{fontSize:11,background:'var(--gold)',color:'var(--navy)',padding:'1px 8px',borderRadius:20,fontWeight:700,marginLeft:6}}>Du</span>}</div>
                      <div style={{fontSize:13,color:'var(--gray-400)'}}>{u.email}</div>
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:12,padding:'3px 10px',borderRadius:20,fontWeight:600,
                    background:u.rolle==='admin'?'#fce4d6':u.rolle==='mitarbeiter'?'#ddeaff':'#ececec',
                    color:u.rolle==='admin'?'#8a3a1a':u.rolle==='mitarbeiter'?'#1a4a8a':'#555'}}>
                    {u.rolle==='admin'?'Admin':u.rolle==='mitarbeiter'?'Mitarbeiter':'Nur Lesen'}
                  </span>
                  {!isMe && <button className="btn btn-sm btn-outline" onClick={() => { setEditForm({...u, bereiche: u.bereiche||[]}); setEditModal(true) }}>Bearbeiten</button>}
                  {!isMe && u.rolle !== 'readonly' && <button className="btn btn-sm btn-danger" onClick={() => deactivateUser(u.id)}>Deaktivieren</button>}
                </div>
              </div>

              {/* Berechtigungen */}
              <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--gray-100)'}}>
                <div style={{fontSize:12,color:'var(--gray-400)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.3px'}}>Zugriffsrechte</div>
                {u.rolle === 'admin'
                  ? <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {ALLE_BEREICHE.map(b => (
                        <span key={b.key} style={{fontSize:12,padding:'2px 10px',borderRadius:20,background:'#e2efda',color:'#2d6b3a',fontWeight:600}}>✓ {b.label}</span>
                      ))}
                    </div>
                  : <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {ALLE_BEREICHE.map(b => {
                        const hat = (u.bereiche||[]).includes(b.key)
                        return (
                          <span key={b.key} style={{fontSize:12,padding:'2px 10px',borderRadius:20,fontWeight:600,
                            background:hat?'#e2efda':'var(--gray-100)',
                            color:hat?'#2d6b3a':'var(--gray-400)'}}>
                            {hat?'✓':'✕'} {b.label}
                          </span>
                        )
                      })}
                    </div>
                }
              </div>

              <div style={{fontSize:12,color:'var(--gray-400)',marginTop:12}}>Angelegt: {new Date(u.erstellt_am).toLocaleDateString('de-DE')}</div>
            </div>
          )
        })}
      </div>

      {/* MODAL: NEUER BENUTZER */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{maxWidth:680}}>
            <div className="modal-header">
              <span className="modal-title">Neuer Benutzer</span>
              <button className="close-btn" onClick={()=>setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error" style={{marginBottom:16}}>{error}</div>}

              <div className="form-row">
                <div className="form-group"><label>Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Vor- und Nachname"/></div>
                <div className="form-group"><label>E-Mail *</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="name@email.de"/></div>
              </div>
              <div className="form-group"><label>Passwort * (mind. 6 Zeichen)</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Temporaeres Passwort"/></div>

              <div className="form-group">
                <label>Rolle</label>
                <div style={{display:'grid',gap:8,marginTop:4}}>
                  {ROLLEN.map(r => (
                    <label key={r.key} style={{display:'flex',alignItems:'flex-start',gap:12,padding:14,border:'1.5px solid '+(form.rolle===r.key?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:form.rolle===r.key?'rgba(15,34,64,0.03)':'var(--white)',width:'100%',boxSizing:'border-box'}}>
                      <input type="radio" name="rolle" value={r.key} checked={form.rolle===r.key} onChange={()=>setForm(f=>({...f,rolle:r.key}))} style={{marginTop:2}}/>
                      <div>
                        <div style={{fontWeight:600,fontSize:14}}>{r.label}</div>
                        <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>{r.beschreibung}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {form.rolle !== 'admin' && (
                <div className="form-group">
                  <label>Zugriffsrechte</label>
                  <div style={{border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',overflow:'hidden'}}>
                    {ALLE_BEREICHE.map((b, i) => {
                      const hat = form.bereiche.includes(b.key)
                      return (
                        <label key={b.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:i<ALLE_BEREICHE.length-1?'1px solid var(--gray-100)':'none',cursor:'pointer',background:hat?'rgba(15,34,64,0.02)':'var(--white)'}}>
                          <div>
                            <div style={{fontWeight:500,fontSize:14}}>{b.label}</div>
                          </div>
                          <div style={{position:'relative',width:44,height:24,flexShrink:0}}>
                            <input type="checkbox" checked={hat} onChange={()=>toggleBereich(b.key,form,setForm)} style={{opacity:0,width:0,height:0,position:'absolute'}}/>
                            <div onClick={()=>toggleBereich(b.key,form,setForm)} style={{position:'absolute',inset:0,borderRadius:12,background:hat?'var(--navy)':'var(--gray-200)',transition:'background 0.2s',cursor:'pointer'}}>
                              <div style={{position:'absolute',top:2,left:hat?22:2,width:20,height:20,borderRadius:'50%',background:'white',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}></div>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
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

      {/* MODAL: BENUTZER BEARBEITEN */}
      {editModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditModal(false)}>
          <div className="modal" style={{maxWidth:580}}>
            <div className="modal-header">
              <span className="modal-title">Benutzer bearbeiten</span>
              <button className="close-btn" onClick={()=>setEditModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Name</label><input value={editForm.name||''} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/></div>
                <div className="form-group"><label>E-Mail</label><input value={editForm.email||''} disabled style={{background:'var(--gray-100)',color:'var(--gray-400)'}}/></div>
              </div>

              <div className="form-group">
                <label>Rolle</label>
                <div style={{display:'grid',gap:8,marginTop:4}}>
                  {ROLLEN.map(r => (
                    <label key={r.key} style={{display:'flex',alignItems:'flex-start',gap:12,padding:14,border:'1.5px solid '+(editForm.rolle===r.key?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:editForm.rolle===r.key?'rgba(15,34,64,0.03)':'var(--white)',width:'100%',boxSizing:'border-box'}}>
                      <input type="radio" name="edit-rolle" value={r.key} checked={editForm.rolle===r.key} onChange={()=>setEditForm(f=>({...f,rolle:r.key}))} style={{marginTop:2}}/>
                      <div>
                        <div style={{fontWeight:600,fontSize:14}}>{r.label}</div>
                        <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>{r.beschreibung}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {editForm.rolle !== 'admin' && (
                <div className="form-group">
                  <label>Zugriffsrechte</label>
                  <div style={{border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',overflow:'hidden'}}>
                    {ALLE_BEREICHE.map((b, i) => {
                      const hat = (editForm.bereiche||[]).includes(b.key)
                      return (
                        <label key={b.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:i<ALLE_BEREICHE.length-1?'1px solid var(--gray-100)':'none',cursor:'pointer',background:hat?'rgba(15,34,64,0.02)':'var(--white)'}}>
                          <div style={{fontWeight:500,fontSize:14}}>{b.label}</div>
                          <div style={{position:'relative',width:44,height:24,flexShrink:0}}>
                            <div onClick={()=>toggleBereich(b.key,editForm,setEditForm)} style={{position:'absolute',inset:0,borderRadius:12,background:hat?'var(--navy)':'var(--gray-200)',transition:'background 0.2s',cursor:'pointer'}}>
                              <div style={{position:'absolute',top:2,left:hat?22:2,width:20,height:20,borderRadius:'50%',background:'white',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}></div>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setEditModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={updateUser} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
