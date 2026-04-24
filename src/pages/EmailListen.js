import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function EmailListen() {
  const { profile } = useAuth()
  const [listen, setListen]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [aktive, setAktive]       = useState(null)
  const [mitglieder, setMitglieder] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ name:'', beschreibung:'', typ:'manuell' })
  const [addEmail, setAddEmail]   = useState('')
  const [addName, setAddName]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [copied, setCopied]       = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importFilter, setImportFilter] = useState({ typ:'sponsoren', status:'' })
  const [importKontakte, setImportKontakte] = useState([])
  const [importSelected, setImportSelected] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('email_listen').select('*, mitglieder:email_listen_mitglieder(count)').order('erstellt_am', { ascending: false })
    setListen(data||[])
    setLoading(false)
  }

  async function listeLaden(liste) {
    setAktive(liste)
    const { data } = await supabase.from('email_listen_mitglieder').select('*').eq('liste_id', liste.id).order('name')
    setMitglieder(data||[])
  }

  async function listeAnlegen() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('email_listen').insert({ ...form, erstellt_von: profile.id }).select().single()
    setSaving(false)
    setShowForm(false)
    setForm({ name:'', beschreibung:'', typ:'manuell' })
    load()
    if (data) listeLaden(data)
  }

  async function listeLoeschen(id) {
    if (!window.confirm('Liste löschen?')) return
    await supabase.from('email_listen').delete().eq('id', id)
    if (aktive?.id === id) { setAktive(null); setMitglieder([]) }
    load()
  }

  async function emailHinzufuegen() {
    if (!addEmail.trim() || !aktive) return
    setSaving(true)
    await supabase.from('email_listen_mitglieder').upsert({ liste_id: aktive.id, email: addEmail.trim().toLowerCase(), name: addName.trim()||null }, { onConflict: 'liste_id,email' })
    setSaving(false)
    setAddEmail(''); setAddName('')
    listeLaden(aktive); load()
  }

  async function emailEntfernen(id) {
    await supabase.from('email_listen_mitglieder').delete().eq('id', id)
    listeLaden(aktive); load()
  }

  async function sponsorenImportieren() {
    // Alle Ansprechpartner mit Email laden
    const { data: ap } = await supabase.from('kontakt_ansprechpartner')
      .select('id,vorname,nachname,email,kontakt:kontakt_id(id,firma,status,paket)')
      .not('email', 'is', null)
      .neq('email', '')
    setImportKontakte(ap||[])
    setImportSelected([])
    setShowImport(true)
  }

  async function importSpeichern() {
    if (!aktive || !importSelected.length) return
    setSaving(true)
    const inserts = importSelected.map(ap => ({
      liste_id: aktive.id,
      email: ap.email.toLowerCase(),
      name: `${ap.vorname||''} ${ap.nachname||''}`.trim() || ap.email,
      kontakt_id: ap.kontakt?.id || null,
      ansprechpartner_id: ap.id,
    }))
    await supabase.from('email_listen_mitglieder').upsert(inserts, { onConflict: 'liste_id,email' })
    setSaving(false); setShowImport(false)
    listeLaden(aktive); load()
  }

  function emailListeKopieren() {
    const text = mitglieder.map(m => m.email).join('; ')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function emailListeMitNameKopieren() {
    const text = mitglieder.map(m => m.name ? `${m.name} <${m.email}>` : m.email).join('; ')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const TYP_LABEL = { manuell:'✍️ Manuell', sponsor:'🤝 Sponsoren', event:'📅 Event', mannschaft:'🏐 Mannschaft' }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'flex-start' }}>

      {/* LINKE SEITE: Listen */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>📧 Email-Listen</div>
          <button onClick={()=>setShowForm(true)} className="btn btn-sm btn-primary">+ Neu</button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom:12 }}>
            <div className="form-group"><label>Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} autoFocus placeholder="z.B. Sponsoren Newsletter" /></div>
            <div className="form-group"><label>Typ</label>
              <select value={form.typ} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
                {Object.entries(TYP_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Beschreibung</label><input value={form.beschreibung} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} /></div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={listeAnlegen} className="btn btn-sm btn-primary" disabled={saving}>{saving?'…':'Anlegen'}</button>
              <button onClick={()=>setShowForm(false)} className="btn btn-sm btn-outline">Abbrechen</button>
            </div>
          </div>
        )}

        {loading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {listen.map(l=>(
              <div key={l.id} onClick={()=>listeLaden(l)}
                style={{ padding:'10px 14px', borderRadius:'var(--radius)', border:`1.5px solid ${aktive?.id===l.id?'var(--navy)':'var(--gray-200)'}`, background:aktive?.id===l.id?'var(--navy)':'var(--white)', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:aktive?.id===l.id?'white':'var(--navy)' }}>{l.name}</div>
                  <div style={{ fontSize:11, color:aktive?.id===l.id?'rgba(255,255,255,0.6)':'var(--gray-400)' }}>
                    {TYP_LABEL[l.typ]} · {l.mitglieder?.[0]?.count||0} Adressen
                  </div>
                </div>
                <button onClick={e=>{ e.stopPropagation(); listeLoeschen(l.id) }} style={{ background:'none', border:'none', color:aktive?.id===l.id?'rgba(255,255,255,0.5)':'var(--red)', cursor:'pointer', fontSize:16 }}>×</button>
              </div>
            ))}
            {listen.length===0 && <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Listen.</p>}
          </div>
        )}
      </div>

      {/* RECHTE SEITE: Aktive Liste */}
      {aktive ? (
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:18, color:'var(--navy)' }}>{aktive.name}</div>
                <div style={{ fontSize:12, color:'var(--gray-400)' }}>{TYP_LABEL[aktive.typ]} · {mitglieder.length} Adressen</div>
                {aktive.beschreibung && <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:4 }}>{aktive.beschreibung}</div>}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={sponsorenImportieren} className="btn btn-sm btn-outline">📥 Aus Kontakten importieren</button>
                <button onClick={emailListeKopieren} className={`btn btn-sm ${copied?'btn-primary':'btn-outline'}`} disabled={mitglieder.length===0}>
                  {copied ? '✓ Kopiert!' : '📋 Emails kopieren'}
                </button>
                <button onClick={emailListeMitNameKopieren} className="btn btn-sm btn-outline" disabled={mitglieder.length===0} title="Kopiert im Format: Name <email>">
                  👤 Mit Namen
                </button>
              </div>
            </div>

            {/* Email hinzufügen */}
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              <input value={addName} onChange={e=>setAddName(e.target.value)} placeholder="Name (optional)" style={{ flex:1, minWidth:140 }} />
              <input value={addEmail} onChange={e=>setAddEmail(e.target.value)} placeholder="email@beispiel.de" type="email" style={{ flex:2, minWidth:200 }} onKeyDown={e=>e.key==='Enter'&&emailHinzufuegen()} />
              <button onClick={emailHinzufuegen} className="btn btn-primary btn-sm" disabled={!addEmail.trim()||saving}>+ Hinzufügen</button>
            </div>

            {/* Kopier-Vorschau */}
            {mitglieder.length > 0 && (
              <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:'10px 14px', marginBottom:16, position:'relative' }}>
                <div style={{ fontSize:11, color:'var(--gray-400)', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
                  📋 Zum Kopieren bereit — {mitglieder.length} Adressen
                </div>
                <div style={{ fontSize:12, color:'var(--gray-600)', lineHeight:1.6, wordBreak:'break-all', maxHeight:80, overflow:'hidden' }}>
                  {mitglieder.map(m=>m.email).join('; ')}
                </div>
                {mitglieder.length > 5 && <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:4 }}>… und {mitglieder.length-5} weitere</div>}
              </div>
            )}

            {/* Mitglieder-Liste */}
            {mitglieder.length===0 ? (
              <div className="empty-state"><p>Noch keine Adressen in dieser Liste.</p></div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {mitglieder.map(m=>(
                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                    <div style={{ flex:1 }}>
                      {m.name && <div style={{ fontWeight:600, fontSize:13 }}>{m.name}</div>}
                      <div style={{ fontSize:12, color:'var(--gray-500)' }}>{m.email}</div>
                    </div>
                    <button onClick={()=>emailEntfernen(m.id)} style={{ background:'none', border:'none', color:'var(--gray-300)', cursor:'pointer', fontSize:16 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state card">
          <div style={{ fontSize:32, marginBottom:8 }}>📧</div>
          <p style={{ fontWeight:600 }}>Liste auswählen</p>
          <p style={{ fontSize:13, color:'var(--gray-400)' }}>Wähle links eine Liste oder lege eine neue an.</p>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowImport(false)}>
          <div className="modal" style={{ maxWidth:600 }}>
            <div className="modal-header">
              <span className="modal-title">📥 Aus Kontakten importieren</span>
              <button className="close-btn" onClick={()=>setShowImport(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom:12, display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:13, color:'var(--gray-500)' }}>{importSelected.length} ausgewählt</span>
                <button onClick={()=>setImportSelected(importKontakte.filter(a=>a.email))} className="btn btn-sm btn-outline">Alle auswählen</button>
                <button onClick={()=>setImportSelected([])} className="btn btn-sm btn-outline">Alle abwählen</button>
              </div>
              <div style={{ maxHeight:400, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                {importKontakte.filter(ap=>ap.email).map(ap=>{
                  const sel = importSelected.some(s=>s.id===ap.id)
                  return (
                    <div key={ap.id} onClick={()=>setImportSelected(p=>sel?p.filter(s=>s.id!==ap.id):[...p,ap])}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:'var(--radius)', border:`1.5px solid ${sel?'var(--navy)':'var(--gray-200)'}`, background:sel?'#eef2fa':'var(--white)', cursor:'pointer' }}>
                      <input type="checkbox" checked={sel} readOnly style={{ flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{ap.vorname} {ap.nachname}</div>
                        <div style={{ fontSize:11, color:'var(--gray-400)' }}>{ap.email} · {ap.kontakt?.firma}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setShowImport(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={importSpeichern} className="btn btn-primary" disabled={!importSelected.length||saving}>{saving?'Importieren…':`${importSelected.length} importieren`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
