import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const POSITIONEN = ['Torwart','Linksaußen','Rechtsaußen','Rückraum Links','Rückraum Mitte','Rückraum Rechts','Kreisläufer']
const STATUS_OPTS = ['aktiv','verletzt','gesperrt','inaktiv','ausgeliehen']
const STATUS_STIL = {
  aktiv:       { bg:'#e2efda', text:'#2d6b3a' },
  verletzt:    { bg:'#fce4d6', text:'#8a3a1a' },
  gesperrt:    { bg:'#fff3cd', text:'#8a6a00' },
  inaktiv:     { bg:'#ececec', text:'#555' },
  ausgeliehen: { bg:'#ddeaff', text:'#1a4a8a' },
}

// ─── Spieler Liste ───────────────────────────────────────────
function KaderListe() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isManager = profile?.ist_manager || profile?.rolle === 'admin'
  const [mannschaften, setMannschaften] = useState([])
  const [spieler, setSpieler] = useState([])
  const [aktiveMannschaft, setAktiveMannschaft] = useState('')
  const [statusFilter, setStatusFilter] = useState('aktiv')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ vorname:'', nachname:'', mannschaft_id:'', position:'', trikotnummer:'', status:'aktiv', geburtsdatum:'', nationalitaet:'', wurfhand:'Rechts', email:'', telefon:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: mn }, { data: sp }] = await Promise.all([
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('spieler').select('*, mannschaft:mannschaft_id(name,farbe,kuerzel)').eq('aktiv', true).order('nachname'),
    ])
    setMannschaften(mn || [])
    setSpieler(sp || [])
    if (mn?.length && !aktiveMannschaft) setAktiveMannschaft(mn[0].id)
    setLoading(false)
  }

  async function speichern() {
    if (!form.vorname.trim() || !form.nachname.trim() || !form.mannschaft_id) return
    setSaving(true)
    const payload = {
      ...form,
      trikotnummer: form.trikotnummer ? parseInt(form.trikotnummer) : null,
      geburtsdatum: form.geburtsdatum || null,
    }
    await supabase.from('spieler').insert(payload)
    setSaving(false)
    setShowForm(false)
    setForm({ vorname:'', nachname:'', mannschaft_id:'', position:'', trikotnummer:'', status:'aktiv', geburtsdatum:'', nationalitaet:'', wurfhand:'Rechts', email:'', telefon:'' })
    load()
  }

  const gefiltert = spieler.filter(s =>
    (!aktiveMannschaft || s.mannschaft_id === aktiveMannschaft) &&
    (!statusFilter || statusFilter === 'alle' || s.status === statusFilter)
  )

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div>
      {/* Mannschafts-Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {mannschaften.map(m => (
            <button key={m.id} onClick={() => setAktiveMannschaft(m.id)}
              style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
                background: aktiveMannschaft === m.id ? (m.farbe || 'var(--navy)') : 'var(--gray-100)',
                color: aktiveMannschaft === m.id ? 'white' : 'var(--gray-600)',
              }}>
              {m.name}
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>
                ({spieler.filter(s => s.mannschaft_id === m.id && s.status === 'aktiv').length})
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Spieler anlegen</button>
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['alle', ...STATUS_OPTS].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}>
            {s === 'alle' ? 'Alle' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Spieler Form */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">Neuer Spieler</span>
              <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Vorname *</label><input value={form.vorname} onChange={e=>setForm(p=>({...p,vorname:e.target.value}))} autoFocus /></div>
                <div className="form-group"><label>Nachname *</label><input value={form.nachname} onChange={e=>setForm(p=>({...p,nachname:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Mannschaft *</label>
                  <select value={form.mannschaft_id} onChange={e=>setForm(p=>({...p,mannschaft_id:e.target.value}))}>
                    <option value="">Wählen…</option>
                    {mannschaften.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Position</label>
                  <select value={form.position} onChange={e=>setForm(p=>({...p,position:e.target.value}))}>
                    <option value="">–</option>
                    {POSITIONEN.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Trikotnummer</label><input type="number" value={form.trikotnummer} onChange={e=>setForm(p=>({...p,trikotnummer:e.target.value}))} /></div>
                <div className="form-group"><label>Wurfhand</label>
                  <select value={form.wurfhand} onChange={e=>setForm(p=>({...p,wurfhand:e.target.value}))}>
                    <option>Rechts</option><option>Links</option><option>Beidhändig</option>
                  </select>
                </div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Geburtsdatum</label><input type="date" value={form.geburtsdatum} onChange={e=>setForm(p=>({...p,geburtsdatum:e.target.value}))} /></div>
                <div className="form-group"><label>Nationalität</label><input value={form.nationalitaet} onChange={e=>setForm(p=>({...p,nationalitaet:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
                <div className="form-group"><label>Telefon</label><input value={form.telefon} onChange={e=>setForm(p=>({...p,telefon:e.target.value}))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowForm(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={speichern} className="btn btn-primary" disabled={saving}>{saving ? 'Speichern…' : 'Spieler anlegen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Spieler Grid */}
      {gefiltert.length === 0 ? (
        <div className="empty-state card"><p>Keine Spieler gefunden.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {gefiltert.map(s => {
            const st = STATUS_STIL[s.status] || STATUS_STIL.inaktiv
            const alter = s.geburtsdatum ? Math.floor((Date.now() - new Date(s.geburtsdatum)) / (365.25*24*60*60*1000)) : null
            return (
              <div key={s.id} onClick={() => navigate(`/mannschaft/kader/${s.id}`)}
                className="card" style={{ cursor: 'pointer', padding: 16, marginBottom: 0, transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  {/* Avatar */}
                  {s.foto_url
                    ? <img src={s.foto_url} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gray-200)', flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, borderRadius: '50%', background: s.mannschaft?.farbe || 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                        {s.trikotnummer || (s.vorname[0] + s.nachname[0])}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.vorname} {s.nachname}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      {s.position || '–'}{alter ? ` · ${alter} Jahre` : ''}
                    </div>
                  </div>
                  {s.trikotnummer && (
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gray-300)', fontFamily: 'monospace' }}>
                      #{s.trikotnummer}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: st.bg, color: st.text }}>
                    {s.status}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{s.wurfhand}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Spieler Detail ──────────────────────────────────────────
function SpielerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isManager = profile?.ist_manager || profile?.rolle === 'admin'
  const [spieler, setSpieler] = useState(null)
  const [mannschaften, setMannschaften] = useState([])
  const [verletzungen, setVerletzungen] = useState([])
  const [statistiken, setStatistiken] = useState([])
  const [berater, setBerater] = useState([])
  const [dokumente, setDokumente] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stamm')
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [showVerletzungForm, setShowVerletzungForm] = useState(false)
  const [verletzungForm, setVerletzungForm] = useState({ diagnose:'', koerperteil:'', schweregrad:'leicht', datum_verletzung:'', behandlung:'' })
  const [showBeraterForm, setShowBeraterForm] = useState(false)
  const [beraterForm, setBeraterForm] = useState({ name:'', agentur:'', email:'', telefon:'' })
  const fileRef = useRef()

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: sp }, { data: mn }, { data: vl }, { data: st }, { data: br }, { data: dok }] = await Promise.all([
      supabase.from('spieler').select('*, mannschaft:mannschaft_id(name,farbe)').eq('id', id).single(),
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('spieler_verletzungen').select('*').eq('spieler_id', id).order('datum_verletzung', { ascending: false }),
      supabase.from('spieler_statistiken').select('*, event:event_id(name)').eq('spieler_id', id).order('datum', { ascending: false }),
      supabase.from('spieler_berater').select('*').eq('spieler_id', id),
      supabase.from('spieler_dokumente').select('*').eq('spieler_id', id).order('erstellt_am', { ascending: false }),
    ])
    setSpieler(sp)
    setForm(sp || {})
    setMannschaften(mn || [])
    setVerletzungen(vl || [])
    setStatistiken(st || [])
    setBerater(br || [])
    setDokumente(dok || [])
    setLoading(false)
  }

  async function speichern() {
    setSaving(true)
    const payload = { ...form, mannschaft_id: form.mannschaft_id, trikotnummer: form.trikotnummer ? parseInt(form.trikotnummer) : null }
    delete payload.mannschaft
    await supabase.from('spieler').update(payload).eq('id', id)
    setSaving(false)
    setEditMode(false)
    load()
  }

  async function verletzungSpeichern() {
    if (!verletzungForm.diagnose.trim() || !verletzungForm.datum_verletzung) return
    await supabase.from('spieler_verletzungen').insert({ ...verletzungForm, spieler_id: id })
    // Status auf verletzt setzen
    await supabase.from('spieler').update({ status: 'verletzt' }).eq('id', id)
    setShowVerletzungForm(false)
    setVerletzungForm({ diagnose:'', koerperteil:'', schweregrad:'leicht', datum_verletzung:'', behandlung:'' })
    load()
  }

  async function verletzungHeilen(vid) {
    await supabase.from('spieler_verletzungen').update({ datum_genesung: new Date().toISOString().split('T')[0] }).eq('id', vid)
    // Prüfen ob noch andere aktive Verletzungen
    const { data } = await supabase.from('spieler_verletzungen').select('id').eq('spieler_id', id).is('datum_genesung', null)
    if (!data?.length) await supabase.from('spieler').update({ status: 'aktiv' }).eq('id', id)
    load()
  }

  async function beraterSpeichern() {
    if (!beraterForm.name.trim()) return
    await supabase.from('spieler_berater').insert({ ...beraterForm, spieler_id: id })
    setShowBeraterForm(false)
    setBeraterForm({ name:'', agentur:'', email:'', telefon:'' })
    load()
  }

  async function fotoHochladen(e) {
    const file = e.target.files[0]; if (!file) return
    const pfad = `spieler/${id}/foto.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('spieler-daten').upload(pfad, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('spieler-daten').getPublicUrl(pfad)
      await supabase.from('spieler').update({ foto_url: publicUrl }).eq('id', id)
      load()
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!spieler) return <div className="main"><div className="card"><p style={{ color:'var(--red)' }}>Spieler nicht gefunden.</p></div></div>

  const alter = spieler.geburtsdatum ? Math.floor((Date.now() - new Date(spieler.geburtsdatum)) / (365.25*24*60*60*1000)) : null
  const st = STATUS_STIL[spieler.status] || STATUS_STIL.inaktiv

  // Statistik-Summen
  const statSummen = statistiken.reduce((acc, s) => ({
    spiele: acc.spiele + (s.gespielt ? 1 : 0),
    tore: acc.tore + (s.tore || 0),
    assists: acc.assists + (s.assists || 0),
    gelbe: acc.gelbe + (s.gelbe_karten || 0),
    rote: acc.rote + (s.rote_karten || 0),
  }), { spiele: 0, tore: 0, assists: 0, gelbe: 0, rote: 0 })

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate('/mannschaft/kader')} className="back-btn">← Zurück zur Kaderliste</button>

      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          {/* Foto */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {spieler.foto_url
              ? <img src={spieler.foto_url} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--gray-200)' }} />
              : <div style={{ width: 80, height: 80, borderRadius: '50%', background: spieler.mannschaft?.farbe || 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 24 }}>
                  {spieler.trikotnummer || spieler.vorname[0]+spieler.nachname[0]}
                </div>
            }
            <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow)', fontSize: 12, border: '1px solid var(--gray-200)' }}>
              📷<input type="file" accept="image/*" style={{ display: 'none' }} ref={fileRef} onChange={fotoHochladen} />
            </label>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontSize: 24, color: 'var(--navy)', margin: 0, fontFamily: '"DM Serif Display", serif' }}>
                {spieler.vorname} {spieler.nachname}
              </h1>
              {spieler.trikotnummer && <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--gray-300)', fontFamily: 'monospace' }}>#{spieler.trikotnummer}</span>}
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: st.bg, color: st.text }}>{spieler.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--gray-600)' }}>
              {spieler.mannschaft?.name && <span>🏐 {spieler.mannschaft.name}</span>}
              {spieler.position && <span>📍 {spieler.position}</span>}
              {alter && <span>🎂 {alter} Jahre</span>}
              {spieler.nationalitaet && <span>🌍 {spieler.nationalitaet}</span>}
              {spieler.wurfhand && <span>✋ {spieler.wurfhand}</span>}
            </div>
            {/* Schnell-Stats */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13 }}>
              <span>⚽ <strong>{statSummen.tore}</strong> Tore</span>
              <span>🎯 <strong>{statSummen.assists}</strong> Assists</span>
              <span>🎮 <strong>{statSummen.spiele}</strong> Spiele</span>
              {verletzungen.filter(v => !v.datum_genesung).length > 0 && <span style={{ color: 'var(--red) '}}>🏥 Verletzt</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditMode(!editMode)} className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-outline'}`}>
              {editMode ? 'Abbrechen' : 'Bearbeiten'}
            </button>
            {editMode && <button onClick={speichern} className="btn btn-sm btn-gold" disabled={saving}>{saving ? '…' : 'Speichern'}</button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          ['stamm',      'Stammdaten'],
          ['verletzung', `🏥 Verletzungen (${verletzungen.length})`],
          ['statistik',  `📈 Statistiken (${statistiken.length})`],
          ...(isManager ? [
            ['vertrag',  '💼 Vertrag'],
            ['berater',  `🤝 Berater (${berater.length})`],
          ] : []),
          ['dokumente',  `📎 Dokumente (${dokumente.length})`],
        ].map(([k, l]) => (
          <button key={k} className={`tab-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* Stammdaten */}
      {tab === 'stamm' && (
        <div className="card">
          {editMode ? (
            <div>
              <div className="form-row">
                <div className="form-group"><label>Vorname</label><input value={form.vorname||''} onChange={e=>setForm(p=>({...p,vorname:e.target.value}))} /></div>
                <div className="form-group"><label>Nachname</label><input value={form.nachname||''} onChange={e=>setForm(p=>({...p,nachname:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Mannschaft</label>
                  <select value={form.mannschaft_id||''} onChange={e=>setForm(p=>({...p,mannschaft_id:e.target.value}))}>
                    {mannschaften.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Position</label>
                  <select value={form.position||''} onChange={e=>setForm(p=>({...p,position:e.target.value}))}>
                    <option value="">–</option>
                    {POSITIONEN.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Trikotnummer</label><input type="number" value={form.trikotnummer||''} onChange={e=>setForm(p=>({...p,trikotnummer:e.target.value}))} /></div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status||'aktiv'} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Wurfhand</label>
                  <select value={form.wurfhand||'Rechts'} onChange={e=>setForm(p=>({...p,wurfhand:e.target.value}))}>
                    <option>Rechts</option><option>Links</option><option>Beidhändig</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Geburtsdatum</label><input type="date" value={form.geburtsdatum||''} onChange={e=>setForm(p=>({...p,geburtsdatum:e.target.value}))} /></div>
                <div className="form-group"><label>Nationalität</label><input value={form.nationalitaet||''} onChange={e=>setForm(p=>({...p,nationalitaet:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Größe (cm)</label><input type="number" value={form.groesse_cm||''} onChange={e=>setForm(p=>({...p,groesse_cm:e.target.value}))} /></div>
                <div className="form-group"><label>Gewicht (kg)</label><input type="number" value={form.gewicht_kg||''} onChange={e=>setForm(p=>({...p,gewicht_kg:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={form.email||''} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
                <div className="form-group"><label>Telefon</label><input value={form.telefon||''} onChange={e=>setForm(p=>({...p,telefon:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Adresse</label><input value={form.adresse||''} onChange={e=>setForm(p=>({...p,adresse:e.target.value}))} /></div>
              <div className="form-row">
                <div className="form-group"><label>Notfallkontakt Name</label><input value={form.notfall_kontakt_name||''} onChange={e=>setForm(p=>({...p,notfall_kontakt_name:e.target.value}))} /></div>
                <div className="form-group"><label>Notfallkontakt Tel.</label><input value={form.notfall_kontakt_telefon||''} onChange={e=>setForm(p=>({...p,notfall_kontakt_telefon:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Eintrittsdatum</label><input type="date" value={form.eintrittsdatum||''} onChange={e=>setForm(p=>({...p,eintrittsdatum:e.target.value}))} /></div>
                <div className="form-group"><label>Lizenznummer</label><input value={form.lizenznummer||''} onChange={e=>setForm(p=>({...p,lizenznummer:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Notizen</label><textarea value={form.notizen||''} onChange={e=>setForm(p=>({...p,notizen:e.target.value}))} rows={3} /></div>
            </div>
          ) : (
            <div className="detail-grid">
              {[
                ['Mannschaft', spieler.mannschaft?.name],
                ['Position', spieler.position],
                ['Trikotnummer', spieler.trikotnummer ? `#${spieler.trikotnummer}` : null],
                ['Wurfhand', spieler.wurfhand],
                ['Geburtsdatum', spieler.geburtsdatum ? `${new Date(spieler.geburtsdatum).toLocaleDateString('de-DE')} (${alter} Jahre)` : null],
                ['Nationalität', spieler.nationalitaet],
                ['Größe', spieler.groesse_cm ? `${spieler.groesse_cm} cm` : null],
                ['Gewicht', spieler.gewicht_kg ? `${spieler.gewicht_kg} kg` : null],
                ['E-Mail', spieler.email],
                ['Telefon', spieler.telefon],
                ['Adresse', spieler.adresse],
                ['Notfallkontakt', spieler.notfall_kontakt_name ? `${spieler.notfall_kontakt_name} · ${spieler.notfall_kontakt_telefon||''}` : null],
                ['Eintritt', spieler.eintrittsdatum ? new Date(spieler.eintrittsdatum).toLocaleDateString('de-DE') : null],
                ['Lizenz', spieler.lizenznummer],
              ].filter(([,v]) => v).map(([label, wert]) => (
                <div key={label} className="detail-field">
                  <label>{label}</label>
                  <span>{wert}</span>
                </div>
              ))}
              {spieler.notizen && (
                <div className="detail-field" style={{ gridColumn: '1/-1' }}>
                  <label>Notizen</label>
                  <span>{spieler.notizen}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Verletzungen */}
      {tab === 'verletzung' && (
        <div>
          <div className="toolbar">
            <button onClick={() => setShowVerletzungForm(true)} className="btn btn-primary">+ Verletzung eintragen</button>
          </div>
          {showVerletzungForm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-title" style={{ marginBottom: 14 }}>Neue Verletzung</div>
              <div className="form-row">
                <div className="form-group"><label>Diagnose *</label><input value={verletzungForm.diagnose} onChange={e=>setVerletzungForm(p=>({...p,diagnose:e.target.value}))} autoFocus /></div>
                <div className="form-group"><label>Körperteil</label><input value={verletzungForm.koerperteil} onChange={e=>setVerletzungForm(p=>({...p,koerperteil:e.target.value}))} placeholder="z.B. Knie, Schulter" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Datum *</label><input type="date" value={verletzungForm.datum_verletzung} onChange={e=>setVerletzungForm(p=>({...p,datum_verletzung:e.target.value}))} /></div>
                <div className="form-group"><label>Schweregrad</label>
                  <select value={verletzungForm.schweregrad} onChange={e=>setVerletzungForm(p=>({...p,schweregrad:e.target.value}))}>
                    <option value="leicht">Leicht</option><option value="mittel">Mittel</option>
                    <option value="schwer">Schwer</option><option value="kritisch">Kritisch</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Behandlung / Arzt</label><textarea value={verletzungForm.behandlung} onChange={e=>setVerletzungForm(p=>({...p,behandlung:e.target.value}))} rows={2} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={verletzungSpeichern} className="btn btn-primary">Speichern</button>
                <button onClick={() => setShowVerletzungForm(false)} className="btn btn-outline">Abbrechen</button>
              </div>
            </div>
          )}
          {verletzungen.length === 0 ? <div className="empty-state card"><p>Keine Verletzungen eingetragen.</p></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {verletzungen.map(v => {
                const aktiv = !v.datum_genesung
                const schwCol = { leicht:'#e2efda', mittel:'#fff3cd', schwer:'#fce4d6', kritisch:'#fce4d6' }
                const schwTxt = { leicht:'#2d6b3a', mittel:'#8a6a00', schwer:'#8a3a1a', kritisch:'#d94f4f' }
                return (
                  <div key={v.id} className="card" style={{ padding: 14, marginBottom: 0, borderLeft: `4px solid ${aktiv ? 'var(--red)' : 'var(--green)'}`, opacity: aktiv ? 1 : 0.7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{v.diagnose}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>
                          {v.koerperteil && `${v.koerperteil} · `}
                          seit {new Date(v.datum_verletzung).toLocaleDateString('de-DE')}
                          {v.datum_genesung && ` · Genesen: ${new Date(v.datum_genesung).toLocaleDateString('de-DE')}`}
                        </div>
                        {v.behandlung && <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{v.behandlung}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: schwCol[v.schweregrad], color: schwTxt[v.schweregrad] }}>{v.schweregrad}</span>
                        {aktiv && <button onClick={() => verletzungHeilen(v.id)} className="btn btn-sm" style={{ background: '#e2efda', color: '#2d6b3a', border: 'none' }}>✓ Genesen</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Statistiken */}
      {tab === 'statistik' && (
        <div>
          <div className="stats-row" style={{ marginBottom: 16 }}>
            {[['⚽','Tore',statSummen.tore],['🎯','Assists',statSummen.assists],['🎮','Spiele',statSummen.spiele],['🟨','Gelbe',statSummen.gelbe],['🟥','Rote',statSummen.rote]].map(([i,l,w]) => (
              <div key={l} className="stat-card"><div style={{ fontSize:18 }}>{i}</div><div className="stat-num" style={{ fontSize:22 }}>{w}</div><div className="stat-label">{l}</div></div>
            ))}
          </div>
          {statistiken.length === 0 ? <div className="empty-state card"><p>Noch keine Statistiken.</p></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Datum</th><th>Spiel</th><th>Gespielt</th><th>Tore</th><th>Assists</th><th>7m</th><th>Karten</th><th>Bewertung</th></tr></thead>
                <tbody>
                  {statistiken.map(s => (
                    <tr key={s.id}>
                      <td style={{ whiteSpace:'nowrap' }}>{s.datum ? new Date(s.datum).toLocaleDateString('de-DE') : '–'}</td>
                      <td>{s.event?.name || s.gegner || '–'}</td>
                      <td>{s.gespielt ? <span style={{ color:'var(--green)' }}>✓</span> : '–'}</td>
                      <td style={{ fontWeight:600 }}>{s.tore || 0}</td>
                      <td>{s.assists || 0}</td>
                      <td>{s.sieben_meter_tore || 0}/{s.sieben_meter_versuche || 0}</td>
                      <td>{s.gelbe_karten ? <span style={{ color:'var(--orange)' }}>🟨{s.gelbe_karten}</span> : ''}{s.rote_karten ? <span style={{ color:'var(--red)' }}>🟥{s.rote_karten}</span> : ''}</td>
                      <td>{s.bewertung ? `${s.bewertung}/10` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vertrag (nur Manager) */}
      {tab === 'vertrag' && isManager && (
        <div className="card">
          {editMode ? (
            <div>
              <div className="form-row">
                <div className="form-group"><label>Vertragsbeginn</label><input type="date" value={form.vertragsbeginn||''} onChange={e=>setForm(p=>({...p,vertragsbeginn:e.target.value}))} /></div>
                <div className="form-group"><label>Vertragsende</label><input type="date" value={form.vertragsende||''} onChange={e=>setForm(p=>({...p,vertragsende:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Gehalt monatlich (EUR)</label><input type="number" value={form.gehalt_monatlich||''} onChange={e=>setForm(p=>({...p,gehalt_monatlich:e.target.value}))} /></div>
              <div className="form-group"><label>Vertragsnotizen</label><textarea value={form.vertragsnotizen||''} onChange={e=>setForm(p=>({...p,vertragsnotizen:e.target.value}))} rows={4} /></div>
            </div>
          ) : (
            <div className="detail-grid">
              {[
                ['Vertragsbeginn', spieler.vertragsbeginn ? new Date(spieler.vertragsbeginn).toLocaleDateString('de-DE') : null],
                ['Vertragsende', spieler.vertragsende ? new Date(spieler.vertragsende).toLocaleDateString('de-DE') : null],
                ['Gehalt mtl.', spieler.gehalt_monatlich ? `${Number(spieler.gehalt_monatlich).toLocaleString('de-DE')} EUR` : null],
              ].filter(([,v]) => v).map(([l,v]) => (
                <div key={l} className="detail-field"><label>{l}</label><span>{v}</span></div>
              ))}
              {spieler.vertragsnotizen && <div className="detail-field" style={{ gridColumn:'1/-1' }}><label>Notizen</label><span>{spieler.vertragsnotizen}</span></div>}
              {!spieler.vertragsbeginn && !spieler.vertragsende && <p style={{ color:'var(--gray-400)', fontSize:13 }}>Keine Vertragsdaten hinterlegt. Klicke "Bearbeiten" um sie einzutragen.</p>}
            </div>
          )}
        </div>
      )}

      {/* Berater (nur Manager) */}
      {tab === 'berater' && isManager && (
        <div>
          <div className="toolbar">
            <button onClick={() => setShowBeraterForm(true)} className="btn btn-primary">+ Berater hinzufügen</button>
          </div>
          {showBeraterForm && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input value={beraterForm.name} onChange={e=>setBeraterForm(p=>({...p,name:e.target.value}))} autoFocus /></div>
                <div className="form-group"><label>Agentur</label><input value={beraterForm.agentur} onChange={e=>setBeraterForm(p=>({...p,agentur:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={beraterForm.email} onChange={e=>setBeraterForm(p=>({...p,email:e.target.value}))} /></div>
                <div className="form-group"><label>Telefon</label><input value={beraterForm.telefon} onChange={e=>setBeraterForm(p=>({...p,telefon:e.target.value}))} /></div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={beraterSpeichern} className="btn btn-primary">Speichern</button>
                <button onClick={() => setShowBeraterForm(false)} className="btn btn-outline">Abbrechen</button>
              </div>
            </div>
          )}
          {berater.length === 0 ? <div className="empty-state card"><p>Kein Berater hinterlegt.</p></div> : (
            <div style={{ display: 'grid', gap: 10 }}>
              {berater.map(b => (
                <div key={b.id} className="card" style={{ padding: 14, marginBottom: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</div>
                  {b.agentur && <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 2 }}>{b.agentur}</div>}
                  <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13 }}>
                    {b.email && <a href={`mailto:${b.email}`} style={{ color: 'var(--navy)', textDecoration: 'none' }}>✉ {b.email}</a>}
                    {b.telefon && <a href={`tel:${b.telefon}`} style={{ color: 'var(--navy)', textDecoration: 'none' }}>📞 {b.telefon}</a>}
                  </div>
                  <button onClick={async () => { await supabase.from('spieler_berater').delete().eq('id', b.id); load() }} className="btn btn-sm btn-danger" style={{ marginTop: 8 }}>Entfernen</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dokumente */}
      {tab === 'dokumente' && (
        <div>
          <div className="toolbar">
            <button onClick={async () => {
              const name = prompt('Dokument-Name:'); if (!name) return
              const url = prompt('URL (Google Drive, etc.):'); if (!url) return
              await supabase.from('spieler_dokumente').insert({ spieler_id: id, typ: 'sonstiges', name, datei_url: url, hochgeladen_von: profile.id })
              load()
            }} className="btn btn-primary">+ Dokument hinzufügen</button>
          </div>
          {dokumente.length === 0 ? <div className="empty-state card"><p>Keine Dokumente vorhanden.</p></div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {dokumente.map(d => (
                <div key={d.id} className="card" style={{ padding: 14, marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                    <span style={{ fontSize: 11, background: 'var(--gray-100)', color: 'var(--gray-600)', padding: '1px 8px', borderRadius: 10 }}>{d.typ}</span>
                  </div>
                  {d.gueltig_bis && <div style={{ fontSize: 12, color: new Date(d.gueltig_bis) < new Date() ? 'var(--red)' : 'var(--gray-400)' }}>Gültig bis: {new Date(d.gueltig_bis).toLocaleDateString('de-DE')}</div>}
                  {d.datei_url && <a href={d.datei_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ marginTop: 8, display: 'inline-block' }}>⬇ Öffnen</a>}
                  <button onClick={async () => { await supabase.from('spieler_dokumente').delete().eq('id', d.id); load() }} className="btn btn-sm btn-danger" style={{ marginTop: 8, marginLeft: 6 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MannschaftKader() {
  return (
    <Routes>
      <Route index element={<KaderListe />} />
      <Route path=":id" element={<SpielerDetail />} />
    </Routes>
  )
}
