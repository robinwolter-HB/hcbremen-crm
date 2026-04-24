import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const TYP_META = {
  manuell:    { label:'✍️ Manuell',      farbe:'#9a9590' },
  sponsor:    { label:'🤝 Sponsoren',    farbe:'#2d6fa3' },
  event:      { label:'📅 Event',        farbe:'#e07b30' },
  mannschaft: { label:'🏐 Mannschaft',   farbe:'#3a8a5a' },
}

export default function EmailListen() {
  const { profile } = useAuth()
  const [listen, setListen]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [aktive, setAktive]         = useState(null)
  const [mitglieder, setMitglieder] = useState([])
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ name:'', beschreibung:'', typ:'manuell' })
  const [addEmail, setAddEmail]     = useState('')
  const [addName, setAddName]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [copied, setCopied]         = useState(null) // 'plain'|'name'
  const [showImport, setShowImport] = useState(false)
  const [importQuelle, setImportQuelle] = useState('sponsoren') // 'sponsoren'|'veranstaltung'
  const [importDaten, setImportDaten]   = useState([])
  const [importSelected, setImportSelected] = useState([])
  const [veranstaltungen, setVeranstaltungen] = useState([])
  const [aktiveVeranst, setAktiveVeranst]     = useState('')
  const [suche, setSuche]           = useState('')
  const [editName, setEditName]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('email_listen')
      .select('*, mitglieder:email_listen_mitglieder(count)')
      .order('erstellt_am', { ascending: false })
    setListen(data||[])
    setLoading(false)
  }

  async function listeLaden(liste) {
    setAktive(liste)
    const { data } = await supabase.from('email_listen_mitglieder')
      .select('*').eq('liste_id', liste.id).order('name')
    setMitglieder(data||[])
    setSuche('')
  }

  async function listeAnlegen() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('email_listen')
      .insert({ ...form, erstellt_von: profile.id }).select().single()
    setSaving(false); setShowForm(false)
    setForm({ name:'', beschreibung:'', typ:'manuell' })
    load()
    if (data) listeLaden(data)
  }

  async function listeLoeschen(id) {
    if (!window.confirm('Liste löschen?')) return
    await supabase.from('email_listen').delete().eq('id', id)
    if (aktive?.id===id) { setAktive(null); setMitglieder([]) }
    load()
  }

  async function emailHinzufuegen() {
    if (!addEmail.trim() || !aktive) return
    setSaving(true)
    await supabase.from('email_listen_mitglieder').upsert(
      { liste_id:aktive.id, email:addEmail.trim().toLowerCase(), name:addName.trim()||null },
      { onConflict:'liste_id,email' }
    )
    setSaving(false); setAddEmail(''); setAddName('')
    listeLaden(aktive); load()
  }

  async function emailEntfernen(id) {
    await supabase.from('email_listen_mitglieder').delete().eq('id', id)
    listeLaden(aktive); load()
  }

  async function alleEntfernen() {
    if (!window.confirm('Alle Adressen aus der Liste entfernen?')) return
    await supabase.from('email_listen_mitglieder').delete().eq('liste_id', aktive.id)
    listeLaden(aktive); load()
  }

  // Import vorbereiten
  async function importOeffnen() {
    // Veranstaltungen laden für Dropdown
    const { data: ve } = await supabase.from('veranstaltungen')
      .select('id,name,datum').order('datum', { ascending:false }).limit(30)
    setVeranstaltungen(ve||[])
    setImportQuelle('sponsoren')
    setImportDaten([])
    setImportSelected([])
    setAktiveVeranst('')
    setShowImport(true)
    await ladeImportDaten('sponsoren', '')
  }

  async function ladeImportDaten(quelle, veranstId) {
    if (quelle==='sponsoren') {
      const { data } = await supabase.from('ansprechpartner')
        .select('id,name,email,kontakt:kontakt_id(firma)')
        .not('email','is',null).neq('email','')
      setImportDaten(data||[])
    } else if (quelle==='veranstaltung' && veranstId) {
      // Teilnehmer der Veranstaltung mit Email
      const { data } = await supabase.from('event_teilnahmen')
        .select('id,ansprechpartner_name,email,kontakt:kontakt_id(firma),ansprechpartner:ansprechpartner_id(id,name,email)')
        .eq('event_id', veranstId)
        .not('email','is',null)
      // Auch Ansprechpartner-Emails wenn keine direkte Email
      const { data: ap } = await supabase.from('event_teilnahmen')
        .select('id,ansprechpartner_name,ansprechpartner:ansprechpartner_id(id,name,email),kontakt:kontakt_id(firma)')
        .eq('event_id', veranstId)
        .is('email', null)
      const merged = [
        ...(data||[]).map(t=>({ id:t.id, name:t.ansprechpartner_name||t.ansprechpartner?.name||'', email:t.email, firma:t.kontakt?.firma })),
        ...(ap||[]).filter(t=>t.ansprechpartner?.email).map(t=>({ id:t.id, name:t.ansprechpartner?.name||t.ansprechpartner_name||'', email:t.ansprechpartner?.email, firma:t.kontakt?.firma })),
      ].filter(t=>t.email)
      setImportDaten(merged)
    }
    setImportSelected([])
  }

  async function importSpeichern() {
    if (!aktive || !importSelected.length) return
    setSaving(true)
    const inserts = importSelected.map(ap=>({
      liste_id: aktive.id,
      email: ap.email.toLowerCase(),
      name: ap.name||ap.email,
    }))
    await supabase.from('email_listen_mitglieder')
      .upsert(inserts, { onConflict:'liste_id,email' })
    setSaving(false); setShowImport(false)
    listeLaden(aktive); load()
  }

  function kopieren(modus) {
    const text = modus==='name'
      ? mitglieder.filter(m=>!suche||m.email.includes(suche)||m.name?.toLowerCase().includes(suche.toLowerCase())).map(m=>m.name?`${m.name} <${m.email}>`:m.email).join('; ')
      : mitglieder.filter(m=>!suche||m.email.includes(suche)||m.name?.toLowerCase().includes(suche.toLowerCase())).map(m=>m.email).join('; ')
    navigator.clipboard.writeText(text).then(()=>{ setCopied(modus); setTimeout(()=>setCopied(null),2500) })
  }

  const gefilterteMitglieder = suche
    ? mitglieder.filter(m=>m.email.toLowerCase().includes(suche.toLowerCase())||(m.name||'').toLowerCase().includes(suche.toLowerCase()))
    : mitglieder

  return (
    <div className="main">
      <div style={{ marginBottom:20 }}>
        <div className="page-title">📧 Email-Listen</div>
        <p className="page-subtitle">Email-Verteiler anlegen, befüllen und per Knopfdruck kopieren</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20, alignItems:'flex-start' }}>

        {/* ── LINKE SEITE: Listen ── */}
        <div>
          <button onClick={()=>setShowForm(!showForm)} className="btn btn-primary" style={{ width:'100%', marginBottom:12 }}>+ Neue Liste</button>

          {showForm && (
            <div className="card" style={{ marginBottom:12 }}>
              <div className="form-group"><label>Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} autoFocus placeholder="z.B. Sponsoren Newsletter" onKeyDown={e=>e.key==='Enter'&&listeAnlegen()} /></div>
              <div className="form-group"><label>Typ</label>
                <select value={form.typ} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
                  {Object.entries(TYP_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Beschreibung</label><input value={form.beschreibung} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} /></div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={listeAnlegen} className="btn btn-primary btn-sm" disabled={saving||!form.name.trim()}>{saving?'…':'Anlegen'}</button>
                <button onClick={()=>setShowForm(false)} className="btn btn-outline btn-sm">Abbrechen</button>
              </div>
            </div>
          )}

          {loading ? <div className="loading-center"><div className="spinner"/></div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {listen.length===0 && <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Listen angelegt.</p>}
              {listen.map(l=>{
                const meta = TYP_META[l.typ]||TYP_META.manuell
                const istAktiv = aktive?.id===l.id
                return (
                  <div key={l.id} onClick={()=>listeLaden(l)}
                    style={{ padding:'12px 14px', borderRadius:'var(--radius)', border:`2px solid ${istAktiv?meta.farbe:'var(--gray-200)'}`, background:istAktiv?meta.farbe+'11':'var(--white)', cursor:'pointer', transition:'all 0.15s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:istAktiv?meta.farbe:'var(--navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.name}</div>
                        <div style={{ display:'flex', gap:8, marginTop:4, alignItems:'center' }}>
                          <span style={{ fontSize:11, padding:'1px 7px', borderRadius:10, background:meta.farbe+'22', color:meta.farbe, fontWeight:600 }}>{meta.label}</span>
                          <span style={{ fontSize:12, color:'var(--gray-400)' }}>{l.mitglieder?.[0]?.count||0} Adressen</span>
                        </div>
                      </div>
                      <button onClick={e=>{ e.stopPropagation(); listeLoeschen(l.id) }} style={{ background:'none', border:'none', color:'var(--gray-300)', cursor:'pointer', fontSize:18, padding:'0 4px', flexShrink:0 }}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RECHTE SEITE: Aktive Liste ── */}
        {aktive ? (
          <div>
            {/* Header */}
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, gap:12, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:20, color:'var(--navy)' }}>{aktive.name}</div>
                  <div style={{ fontSize:13, color:'var(--gray-400)', marginTop:4 }}>
                    {TYP_META[aktive.typ]?.label} · {mitglieder.length} Adressen
                    {aktive.beschreibung && ` · ${aktive.beschreibung}`}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button onClick={importOeffnen} className="btn btn-sm btn-outline">📥 Importieren</button>
                  {mitglieder.length>0 && <>
                    <button onClick={()=>kopieren('plain')} className={`btn btn-sm ${copied==='plain'?'btn-primary':'btn-outline'}`}>
                      {copied==='plain'?'✓ Kopiert!':'📋 Emails kopieren'}
                    </button>
                    <button onClick={()=>kopieren('name')} className={`btn btn-sm ${copied==='name'?'btn-primary':'btn-outline'}`} title="Format: Name <email>">
                      {copied==='name'?'✓ Kopiert!':'👤 Mit Namen'}
                    </button>
                  </>}
                </div>
              </div>

              {/* Kopier-Box */}
              {mitglieder.length>0 && (
                <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:'12px 16px', marginBottom:16, cursor:'pointer' }}
                  onClick={()=>kopieren('plain')}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1 }}>📋 Klicken zum Kopieren</span>
                    <span style={{ fontSize:11, color:'var(--gray-400)' }}>{mitglieder.length} Adressen</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--gray-600)', lineHeight:1.7, wordBreak:'break-all', maxHeight:72, overflow:'hidden' }}>
                    {mitglieder.slice(0,8).map(m=>m.email).join('; ')}
                    {mitglieder.length>8 && <span style={{ color:'var(--gray-400)' }}> … +{mitglieder.length-8} weitere</span>}
                  </div>
                </div>
              )}

              {/* Email hinzufügen */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <input value={addName} onChange={e=>setAddName(e.target.value)} placeholder="Name (optional)" style={{ flex:'1 1 140px' }} />
                <input value={addEmail} onChange={e=>setAddEmail(e.target.value)} placeholder="email@beispiel.de" type="email" style={{ flex:'2 1 200px' }}
                  onKeyDown={e=>e.key==='Enter'&&emailHinzufuegen()} />
                <button onClick={emailHinzufuegen} className="btn btn-primary" disabled={!addEmail.trim()||saving}>+ Hinzufügen</button>
              </div>
            </div>

            {/* Mitglieder */}
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, gap:8 }}>
                <div className="search-wrap" style={{ flex:1 }}>
                  <span className="search-icon">🔍</span>
                  <input placeholder="Suchen…" value={suche} onChange={e=>setSuche(e.target.value)} />
                </div>
                {mitglieder.length>0 && <button onClick={alleEntfernen} className="btn btn-sm btn-danger" style={{ flexShrink:0 }}>Alle löschen</button>}
              </div>

              {gefilterteMitglieder.length===0 ? (
                <div className="empty-state"><p>{suche?'Keine Treffer.':'Noch keine Adressen. Füge Emails hinzu oder importiere.'}</p></div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {gefilterteMitglieder.map(m=>(
                    <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, fontWeight:700, flexShrink:0 }}>
                        {(m.name||m.email)[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        {m.name && <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>}
                        <div style={{ fontSize:12, color:'var(--gray-500)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.email}</div>
                      </div>
                      <button onClick={()=>emailEntfernen(m.id)} style={{ background:'none', border:'none', color:'var(--gray-300)', cursor:'pointer', fontSize:18, flexShrink:0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state card" style={{ minHeight:300, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
            <div style={{ fontWeight:700, fontSize:18, color:'var(--navy)', marginBottom:8 }}>Liste auswählen</div>
            <p style={{ fontSize:14, color:'var(--gray-400)', textAlign:'center', maxWidth:280 }}>Wähle links eine bestehende Liste oder lege eine neue an.</p>
          </div>
        )}
      </div>

      {/* ── IMPORT MODAL ── */}
      {showImport && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowImport(false)}>
          <div className="modal" style={{ maxWidth:640 }}>
            <div className="modal-header">
              <span className="modal-title">📥 Adressen importieren</span>
              <button className="close-btn" onClick={()=>setShowImport(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Quelle wählen */}
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                {[['sponsoren','🤝 Sponsoren-Ansprechpartner'],['veranstaltung','📅 Veranstaltungs-Teilnehmer']].map(([k,l])=>(
                  <button key={k} onClick={async()=>{ setImportQuelle(k); await ladeImportDaten(k, aktiveVeranst) }}
                    className={`btn btn-sm ${importQuelle===k?'btn-primary':'btn-outline'}`}>{l}</button>
                ))}
              </div>

              {/* Veranstaltung wählen */}
              {importQuelle==='veranstaltung' && (
                <div className="form-group" style={{ marginBottom:16 }}>
                  <label>Veranstaltung wählen</label>
                  <select value={aktiveVeranst} onChange={async e=>{ setAktiveVeranst(e.target.value); await ladeImportDaten('veranstaltung', e.target.value) }}>
                    <option value="">Wählen…</option>
                    {veranstaltungen.map(v=>(
                      <option key={v.id} value={v.id}>{v.name}{v.datum?` (${new Date(v.datum+'T00:00:00').toLocaleDateString('de-DE')})`:''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Auswahl-Toolbar */}
              <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
                <span style={{ fontSize:13, color:'var(--gray-500)', flex:1 }}>{importSelected.length} von {importDaten.length} ausgewählt</span>
                <button onClick={()=>setImportSelected([...importDaten])} className="btn btn-sm btn-outline">Alle</button>
                <button onClick={()=>setImportSelected([])} className="btn btn-sm btn-outline">Keine</button>
              </div>

              {/* Liste */}
              <div style={{ maxHeight:360, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                {importDaten.length===0 && <p style={{ fontSize:13, color:'var(--gray-400)' }}>{importQuelle==='veranstaltung'?'Veranstaltung wählen oder keine Emails vorhanden.':'Keine Einträge.'}</p>}
                {importDaten.map((ap,i)=>{
                  const sel = importSelected.some(s=>s.email===ap.email)
                  return (
                    <div key={i} onClick={()=>setImportSelected(p=>sel?p.filter(s=>s.email!==ap.email):[...p,ap])}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:'var(--radius)', border:`1.5px solid ${sel?'var(--navy)':'var(--gray-200)'}`, background:sel?'#eef2fa':'var(--white)', cursor:'pointer', transition:'all 0.1s' }}>
                      <input type="checkbox" checked={sel} readOnly style={{ flexShrink:0, width:16, height:16 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{ap.name||ap.email}</div>
                        <div style={{ fontSize:11, color:'var(--gray-400)' }}>{ap.email}{ap.firma?` · ${ap.firma}`:''}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setShowImport(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={importSpeichern} className="btn btn-primary" disabled={!importSelected.length||saving}>
                {saving?'Importieren…':`${importSelected.length} Adresse${importSelected.length!==1?'n':''} importieren`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
