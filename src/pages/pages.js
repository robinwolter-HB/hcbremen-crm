import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function Historie() {
  const [items, setItems] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [erledigtF, setErledigtF] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  useEffect(() => {
    let r = items
    if (search) { const q = search.toLowerCase(); r = r.filter(h => h.kontakte?.firma?.toLowerCase().includes(q) || h.naechste_aktion?.toLowerCase().includes(q) || h.betreff?.toLowerCase().includes(q)) }
    if (erledigtF !== '') r = r.filter(h => h.erledigt === (erledigtF === 'true'))
    setFiltered(r)
  }, [items, search, erledigtF])

  async function load() {
    const { data } = await supabase.from('kontakthistorie').select('*,kontakte(firma)').order('erstellt_am', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function toggleErledigt(h) {
    await supabase.from('kontakthistorie').update({ erledigt: !h.erledigt }).eq('id', h.id)
    load()
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <main className="main">
      <div className="page-title">Kontakthistorie</div>
      <p className="page-subtitle">Alle Gespräche, Meetings und Aktionen</p>
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input placeholder="Firma oder Aktion suchen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={erledigtF} onChange={e => setErledigtF(e.target.value)}>
          <option value="">Alle</option>
          <option value="false">Offen</option>
          <option value="true">Erledigt</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Datum</th><th>Firma</th><th>Art</th><th>Betreff</th><th>Nächste Aktion</th><th>Fällig</th><th>Zuständig</th><th>✓</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan="8"><div className="empty-state"><p>Keine Einträge.</p></div></td></tr>
              : filtered.map(h => (
                <tr key={h.id} style={{opacity: h.erledigt ? 0.55 : 1}}>
                  <td style={{whiteSpace:'nowrap',fontSize:13}}>{new Date(h.erstellt_am).toLocaleDateString('de-DE')}</td>
                  <td><strong>{h.kontakte?.firma}</strong></td>
                  <td><span style={{fontSize:12,background:'var(--gray-100)',padding:'2px 8px',borderRadius:20}}>{h.art}</span></td>
                  <td style={{fontSize:13}}>{h.betreff}</td>
                  <td style={{fontSize:13}}>{h.naechste_aktion}</td>
                  <td style={{fontSize:13,color: h.faellig_am && !h.erledigt && new Date(h.faellig_am) < new Date() ? 'var(--red)' : 'inherit'}}>
                    {h.faellig_am ? new Date(h.faellig_am).toLocaleDateString('de-DE') : '—'}
                  </td>
                  <td style={{fontSize:13}}>{h.zustaendig}</td>
                  <td><button onClick={() => toggleErledigt(h)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16}}>{h.erledigt ? '✅' : '⬜'}</button></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </main>
  )
}

export function Veranstaltungen() {
  const [events, setEvents] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', datum:'', ort:'', art:'Networking-Event', notizen:'', zustaendig:'' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('veranstaltungen').select('*').order('datum', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    if (form.id) await supabase.from('veranstaltungen').update(form).eq('id', form.id)
    else await supabase.from('veranstaltungen').insert(form)
    setModal(false); setSaving(false); load()
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <main className="main">
      <div className="page-title">Veranstaltungen</div>
      <p className="page-subtitle">Events und Teilnehmer-Tracking</p>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => { setForm({ name:'', datum:'', ort:'', art:'Networking-Event', notizen:'', zustaendig:'' }); setModal(true) }}>+ Neue Veranstaltung</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Datum</th><th>Ort</th><th>Art</th><th>Notizen</th><th>Zuständig</th><th></th></tr></thead>
          <tbody>
            {events.length === 0
              ? <tr><td colSpan="7"><div className="empty-state"><p>Noch keine Veranstaltungen.</p></div></td></tr>
              : events.map(e => (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong></td>
                  <td>{e.datum ? new Date(e.datum).toLocaleDateString('de-DE') : '—'}</td>
                  <td>{e.ort}</td>
                  <td><span style={{fontSize:12,background:'var(--gray-100)',padding:'2px 8px',borderRadius:20}}>{e.art}</span></td>
                  <td style={{fontSize:13,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.notizen}</td>
                  <td style={{fontSize:13}}>{e.zustaendig}</td>
                  <td><button className="btn btn-sm btn-outline" onClick={() => { setForm(e); setModal(true) }}>Bearb.</button></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{form.id ? 'Event bearbeiten' : 'Neue Veranstaltung'}</span>
              <button className="close-btn" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
              <div className="form-row">
                <div className="form-group"><label>Datum</label><input type="date" value={form.datum} onChange={e=>setForm(f=>({...f,datum:e.target.value}))} /></div>
                <div className="form-group"><label>Ort</label><input value={form.ort} onChange={e=>setForm(f=>({...f,ort:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Art</label>
                  <select value={form.art} onChange={e=>setForm(f=>({...f,art:e.target.value}))}>
                    {['Networking-Event','Heimspiel','Sponsoren-Meeting','Präsentation','Sonstiges'].map(a=><option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Zuständig</label><input value={form.zustaendig} onChange={e=>setForm(f=>({...f,zustaendig:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Notizen</label><textarea value={form.notizen} onChange={e=>setForm(f=>({...f,notizen:e.target.value}))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export function Sponsoring() {
  const [items, setItems] = useState([])
  const [kontakte, setKontakte] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ kontakt_id:'', paket:'', jahresbetrag:'', vertragsbeginn:'', vertragsende:'', laufzeit_jahre:'', verlaengerung_besprochen:'Offen', drive_link:'', status:'Anfrage', notizen:'' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: s }, { data: k }] = await Promise.all([
      supabase.from('sponsoring').select('*,kontakte(firma)').order('erstellt_am', { ascending: false }),
      supabase.from('kontakte').select('id,firma').order('firma')
    ])
    setItems(s || [])
    setKontakte(k || [])
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const payload = { ...form, geaendert_am: new Date().toISOString() }
    if (form.id) await supabase.from('sponsoring').update(payload).eq('id', form.id)
    else await supabase.from('sponsoring').insert(payload)
    setModal(false); setSaving(false); load()
  }

  const auslaufend = items.filter(s => { if (!s.vertragsende) return false; const d = new Date(s.vertragsende); const now = new Date(); const diff = (d - now) / (1000*60*60*24); return diff >= 0 && diff < 60 })

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <main className="main">
      <div className="page-title">Sponsoring</div>
      <p className="page-subtitle">Verträge und Pakete</p>

      {auslaufend.length > 0 && (
        <div className="alert alert-error" style={{marginBottom:20}}>
          ⚠️ {auslaufend.length} Vertrag{auslaufend.length > 1 ? 'e' : ''} laufen in weniger als 60 Tagen aus: {auslaufend.map(s => s.kontakte?.firma).join(', ')}
        </div>
      )}

      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => { setForm({ kontakt_id:'', paket:'', jahresbetrag:'', vertragsbeginn:'', vertragsende:'', laufzeit_jahre:'', verlaengerung_besprochen:'Offen', drive_link:'', status:'Anfrage', notizen:'' }); setModal(true) }}>+ Neuer Vertrag</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Firma</th><th>Paket</th><th>Jahresbetrag</th><th>Laufzeit</th><th>Vertragsende</th><th>Status</th><th>Verlängerung</th><th>Vertrag</th><th></th></tr></thead>
          <tbody>
            {items.length === 0
              ? <tr><td colSpan="9"><div className="empty-state"><p>Noch keine Sponsoring-Verträge.</p></div></td></tr>
              : items.map(s => {
                  const istAuslaufend = auslaufend.find(a => a.id === s.id)
                  return (
                    <tr key={s.id} style={{background: istAuslaufend ? '#fff8f8' : 'inherit'}}>
                      <td><strong>{s.kontakte?.firma}</strong></td>
                      <td>{s.paket}</td>
                      <td>{s.jahresbetrag ? `${Number(s.jahresbetrag).toLocaleString('de-DE')} €` : '—'}</td>
                      <td>{s.laufzeit_jahre ? `${s.laufzeit_jahre} J.` : '—'}</td>
                      <td style={{color: istAuslaufend ? 'var(--red)' : 'inherit', fontWeight: istAuslaufend ? 600 : 400}}>
                        {s.vertragsende ? new Date(s.vertragsende).toLocaleDateString('de-DE') : '—'}
                      </td>
                      <td><span style={{fontSize:12,background:s.status==='Aktiv'?'#e2efda':s.status==='Ausgelaufen'?'#ececec':'#ddeaff',color:s.status==='Aktiv'?'#2d6b3a':'#1a4a8a',padding:'2px 8px',borderRadius:20,fontWeight:600}}>{s.status}</span></td>
                      <td style={{fontSize:13}}>{s.verlaengerung_besprochen}</td>
                      <td>{s.drive_link ? <a href={s.drive_link} target="_blank" rel="noreferrer" style={{color:'var(--blue)',fontSize:13}}>Öffnen</a> : '—'}</td>
                      <td><button className="btn btn-sm btn-outline" onClick={() => { setForm(s); setModal(true) }}>Bearb.</button></td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{form.id ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}</span>
              <button className="close-btn" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Firma *</label>
                  <select value={form.kontakt_id} onChange={e=>setForm(f=>({...f,kontakt_id:e.target.value}))}>
                    <option value="">Bitte wählen...</option>
                    {kontakte.map(k=><option key={k.id} value={k.id}>{k.firma}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {['Aktiv','In Verhandlung','Ausgelaufen','Gekündigt','Anfrage'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Paket</label><input value={form.paket} onChange={e=>setForm(f=>({...f,paket:e.target.value}))} /></div>
                <div className="form-group"><label>Jahresbetrag (€)</label><input type="number" value={form.jahresbetrag} onChange={e=>setForm(f=>({...f,jahresbetrag:e.target.value}))} /></div>
              </div>
              <div className="form-row-3">
                <div className="form-group"><label>Vertragsbeginn</label><input type="date" value={form.vertragsbeginn} onChange={e=>setForm(f=>({...f,vertragsbeginn:e.target.value}))} /></div>
                <div className="form-group"><label>Vertragsende</label><input type="date" value={form.vertragsende} onChange={e=>setForm(f=>({...f,vertragsende:e.target.value}))} /></div>
                <div className="form-group"><label>Laufzeit (Jahre)</label><input type="number" value={form.laufzeit_jahre} onChange={e=>setForm(f=>({...f,laufzeit_jahre:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Verlängerung besprochen</label>
                  <select value={form.verlaengerung_besprochen} onChange={e=>setForm(f=>({...f,verlaengerung_besprochen:e.target.value}))}>
                    {['Offen','Ja','Nein'].map(v=><option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Drive-Link (Vertrag)</label><input type="url" placeholder="https://..." value={form.drive_link} onChange={e=>setForm(f=>({...f,drive_link:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Notizen</label><textarea value={form.notizen} onChange={e=>setForm(f=>({...f,notizen:e.target.value}))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export function Benutzer() {
  const { isAdmin } = require('../lib/AuthContext').useAuth()
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ email:'', name:'', password:'', rolle:'mitarbeiter', bereiche:['kontakte','historie','veranstaltungen','sponsoring'] })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profile').select('*').order('erstellt_am')
    setUsers(data || [])
    setLoading(false)
  }

  async function createUser() {
    setSaving(true); setError('')
    const { error: e } = await supabase.auth.admin.createUser({
      email: form.email, password: form.password, email_confirm: true,
      user_metadata: { name: form.name }
    })
    if (e) { setError(e.message); setSaving(false); return }
    setModal(false); setSaving(false); load()
  }

  async function updateRolle(id, rolle) {
    await supabase.from('profile').update({ rolle }).eq('id', id)
    load()
  }

  async function updateBereiche(id, bereich, checked) {
    const user = users.find(u => u.id === id)
    const current = user?.bereiche || []
    const updated = checked ? [...current, bereich] : current.filter(b => b !== bereich)
    await supabase.from('profile').update({ bereiche: updated }).eq('id', id)
    load()
  }

  const BEREICHE = [{ key:'kontakte',label:'Kontakte' },{ key:'historie',label:'Historie' },{ key:'veranstaltungen',label:'Events' },{ key:'sponsoring',label:'Sponsoring' }]

  if (!isAdmin()) return <div className="main"><div className="card"><p style={{color:'var(--red)'}}>Nur Admins können Benutzer verwalten.</p></div></div>
  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <main className="main">
      <div className="page-title">Benutzerverwaltung</div>
      <p className="page-subtitle">Zugriff und Berechtigungen verwalten</p>

      <div className="alert alert-info" style={{marginBottom:20}}>
        Neue Nutzer erhalten eine E-Mail mit ihrem Passwort. Sie können sich dann unter der Web-App-URL einloggen.
      </div>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => { setForm({ email:'', name:'', password:'', rolle:'mitarbeiter', bereiche:['kontakte','historie','veranstaltungen','sponsoring'] }); setError(''); setModal(true) }}>+ Neuer Benutzer</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Bereiche</th><th>Erstellt</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><strong>{u.name || '—'}</strong></td>
                <td style={{fontSize:13}}>{u.email}</td>
                <td>
                  <select value={u.rolle} onChange={e => updateRolle(u.id, e.target.value)} style={{fontSize:13,padding:'4px 8px'}}>
                    <option value="admin">Admin</option>
                    <option value="mitarbeiter">Mitarbeiter</option>
                    <option value="readonly">Nur Lesen</option>
                  </select>
                </td>
                <td>
                  {u.rolle === 'admin'
                    ? <span style={{fontSize:12,color:'var(--gray-400)'}}>Alle Bereiche</span>
                    : <div className="checkbox-group">
                        {BEREICHE.map(b => (
                          <label key={b.key} className="checkbox-item">
                            <input type="checkbox" checked={u.bereiche?.includes(b.key)} onChange={e => updateBereiche(u.id, b.key, e.target.checked)} />
                            {b.label}
                          </label>
                        ))}
                      </div>
                  }
                </td>
                <td style={{fontSize:13,color:'var(--gray-400)'}}>{new Date(u.erstellt_am).toLocaleDateString('de-DE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Neuer Benutzer</span>
              <button className="close-btn" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-row">
                <div className="form-group"><label>Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
                <div className="form-group"><label>E-Mail *</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Passwort *</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Mind. 6 Zeichen" /></div>
                <div className="form-group"><label>Rolle</label>
                  <select value={form.rolle} onChange={e=>setForm(f=>({...f,rolle:e.target.value}))}>
                    <option value="admin">Admin</option>
                    <option value="mitarbeiter">Mitarbeiter</option>
                    <option value="readonly">Nur Lesen</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={createUser} disabled={saving}>{saving ? 'Erstellen...' : 'Benutzer anlegen'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
