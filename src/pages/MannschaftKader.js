import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import VerletzungsAkte from './VerletzungsAkte'

const POSITIONEN = ['Torwart','Linksaußen','Rechtsaußen','Rückraum Links','Rückraum Mitte','Rückraum Rechts','Kreisläufer']
const STATUS_OPTS = ['aktiv','verletzt','gesperrt','inaktiv','ausgeliehen']
const TYP_OPTS = ['kader','scouting','ehemalig']
const SCOUTING_PRIO = {
  heiss:       { bg:'#fce4d6', text:'#d94f4f', label:'🔥 Heiss' },
  interessant: { bg:'#fff3cd', text:'#8a6a00', label:'⭐ Interessant' },
  beobachten:  { bg:'#ddeaff', text:'#1a4a8a', label:'👁 Beobachten' },
  abgehakt:    { bg:'#ececec', text:'#555',    label:'✗ Abgehakt' },
}
const STATUS_STIL = {
  aktiv:       { bg:'#e2efda', text:'#2d6b3a' },
  verletzt:    { bg:'#fce4d6', text:'#8a3a1a' },
  gesperrt:    { bg:'#fff3cd', text:'#8a6a00' },
  inaktiv:     { bg:'#ececec', text:'#555' },
  ausgeliehen: { bg:'#ddeaff', text:'#1a4a8a' },
}

// ─── SPIELER LISTE ──────────────────────────────────────────
function KaderListe() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isManager = profile?.ist_manager || profile?.rolle === 'admin'
  const [mannschaften, setMannschaften] = useState([])
  const [spieler, setSpieler] = useState([])
  const [aktiveMannschaft, setAktiveMannschaft] = useState('alle')
  const [typFilter, setTypFilter] = useState('kader')
  const [statusFilter, setStatusFilter] = useState('')
  const [suche, setSuche] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    vorname:'', nachname:'', typ:'kader', mannschaft_id:'', position:'',
    trikotnummer:'', status:'aktiv', geburtsdatum:'', nationalitaet:'',
    wurfhand:'Rechts', email:'', telefon:'',
    aktueller_verein:'', scouting_prioritaet:'beobachten',
    zweispielrecht: false, zweispielrecht_verein:'', zweispielrecht_person:'',
    berater_name:'', berater_agentur:'', berater_email:'', berater_telefon:'',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: mn }, { data: sp }] = await Promise.all([
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('spieler').select('*, mannschaft:mannschaft_id(name,farbe,kuerzel)').eq('aktiv', true).order('nachname'),
    ])
    setMannschaften(mn || [])
    setSpieler(sp || [])
    setLoading(false)
  }

  async function speichern() {
    if (!form.vorname.trim() || !form.nachname.trim()) return
    if (form.typ === 'kader' && !form.mannschaft_id) { alert('Bitte Mannschaft wählen'); return }
    setSaving(true)
    const payload = {
      ...form,
      trikotnummer: form.trikotnummer ? parseInt(form.trikotnummer) : null,
      geburtsdatum: form.geburtsdatum || null,
      mannschaft_id: form.mannschaft_id || null,
    }
    await supabase.from('spieler').insert(payload)
    setSaving(false); setShowForm(false); load()
    setForm({ vorname:'', nachname:'', typ:'kader', mannschaft_id:'', position:'', trikotnummer:'', status:'aktiv', geburtsdatum:'', nationalitaet:'', wurfhand:'Rechts', email:'', telefon:'', aktueller_verein:'', scouting_prioritaet:'beobachten', zweispielrecht:false, zweispielrecht_verein:'', zweispielrecht_person:'', berater_name:'', berater_agentur:'', berater_email:'', berater_telefon:'' })
  }

  const gefiltert = spieler.filter(s => {
    const matchMn = aktiveMannschaft === 'alle' || s.mannschaft_id === aktiveMannschaft || (aktiveMannschaft === 'scouting' && s.typ === 'scouting')
    const matchTyp = !typFilter || s.typ === typFilter
    const matchStatus = !statusFilter || s.status === statusFilter
    const matchSuche = !suche || `${s.vorname} ${s.nachname} ${s.aktueller_verein || ''}`.toLowerCase().includes(suche.toLowerCase())
    return matchMn && matchTyp && matchStatus && matchSuche
  })

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div>
      {/* Filter Toolbar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setAktiveMannschaft('alle')} style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, background: aktiveMannschaft==='alle' ? 'var(--navy)' : 'var(--gray-100)', color: aktiveMannschaft==='alle' ? 'white' : 'var(--gray-600)' }}>
              Alle ({spieler.length})
            </button>
            {mannschaften.map(m => (
              <button key={m.id} onClick={() => setAktiveMannschaft(m.id)}
                style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, transition:'all 0.15s',
                  background: aktiveMannschaft===m.id ? (m.farbe||'var(--navy)') : 'var(--gray-100)',
                  color: aktiveMannschaft===m.id ? 'white' : 'var(--gray-600)' }}>
                {m.name} ({spieler.filter(s=>s.mannschaft_id===m.id).length})
              </button>
            ))}
            <button onClick={() => setAktiveMannschaft('scouting')} style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, background: aktiveMannschaft==='scouting' ? '#2d6fa3' : 'var(--gray-100)', color: aktiveMannschaft==='scouting' ? 'white' : 'var(--gray-600)' }}>
              🔍 Scouting ({spieler.filter(s=>s.typ==='scouting').length})
            </button>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Spieler anlegen</button>
        </div>

        <div className="toolbar">
          <div style={{ display:'flex', gap:6 }}>
            {['kader','scouting','ehemalig'].map(t => (
              <button key={t} onClick={() => setTypFilter(typFilter===t?'':t)} className={`btn btn-sm ${typFilter===t?'btn-primary':'btn-outline'}`}>
                {t==='kader'?'Kader':t==='scouting'?'Scouting':'Ehemalig'}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {STATUS_OPTS.map(s => (
              <button key={s} onClick={() => setStatusFilter(statusFilter===s?'':s)} className={`btn btn-sm ${statusFilter===s?'btn-primary':'btn-outline'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="search-wrap" style={{ minWidth: 200 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Name suchen…" value={suche} onChange={e=>setSuche(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Formular Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <span className="modal-title">Spieler anlegen</span>
              <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Typ */}
              <div className="form-group">
                <label>Typ *</label>
                <div style={{ display:'flex', gap:8 }}>
                  {TYP_OPTS.map(t => (
                    <button key={t} type="button" onClick={() => setForm(p=>({...p,typ:t}))}
                      className={`btn btn-sm ${form.typ===t?'btn-primary':'btn-outline'}`}>
                      {t==='kader'?'👥 Kader':t==='scouting'?'🔍 Scouting':'🗂 Ehemalig'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>Vorname *</label><input value={form.vorname} onChange={e=>setForm(p=>({...p,vorname:e.target.value}))} autoFocus /></div>
                <div className="form-group"><label>Nachname *</label><input value={form.nachname} onChange={e=>setForm(p=>({...p,nachname:e.target.value}))} /></div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Mannschaft {form.typ==='kader'?'*':''}</label>
                  <select value={form.mannschaft_id} onChange={e=>setForm(p=>({...p,mannschaft_id:e.target.value}))}>
                    <option value="">{form.typ==='scouting'?'Ziel-Mannschaft (optional)':'Wählen…'}</option>
                    {mannschaften.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <select value={form.position} onChange={e=>setForm(p=>({...p,position:e.target.value}))}>
                    <option value="">–</option>
                    {POSITIONEN.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Scouting-spezifisch */}
              {form.typ === 'scouting' && (
                <div style={{ background:'#f0f7ff', borderRadius:'var(--radius)', padding:14, marginBottom:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#2d6fa3', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>🔍 Scouting</div>
                  <div className="form-row">
                    <div className="form-group"><label>Aktueller Verein</label><input value={form.aktueller_verein} onChange={e=>setForm(p=>({...p,aktueller_verein:e.target.value}))} /></div>
                    <div className="form-group">
                      <label>Priorität</label>
                      <select value={form.scouting_prioritaet} onChange={e=>setForm(p=>({...p,scouting_prioritaet:e.target.value}))}>
                        {Object.entries(SCOUTING_PRIO).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group"><label>Video-URL</label><input type="url" value={form.video_url||''} onChange={e=>setForm(p=>({...p,video_url:e.target.value}))} placeholder="YouTube, Vimeo…" /></div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group"><label>Geburtsdatum</label><input type="date" value={form.geburtsdatum} onChange={e=>setForm(p=>({...p,geburtsdatum:e.target.value}))} /></div>
                <div className="form-group"><label>Nationalität</label><input value={form.nationalitaet} onChange={e=>setForm(p=>({...p,nationalitaet:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Trikotnummer</label><input type="number" value={form.trikotnummer} onChange={e=>setForm(p=>({...p,trikotnummer:e.target.value}))} /></div>
                <div className="form-group">
                  <label>Wurfhand</label>
                  <select value={form.wurfhand} onChange={e=>setForm(p=>({...p,wurfhand:e.target.value}))}>
                    <option>Rechts</option><option>Links</option><option>Beidhändig</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
                <div className="form-group"><label>Telefon</label><input value={form.telefon} onChange={e=>setForm(p=>({...p,telefon:e.target.value}))} /></div>
              </div>

              {/* Zweispielrecht */}
              <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:12, marginBottom:12 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer', marginBottom: form.zweispielrecht?10:0 }}>
                  <input type="checkbox" checked={form.zweispielrecht} onChange={e=>setForm(p=>({...p,zweispielrecht:e.target.checked}))} />
                  Zweispielrecht
                </label>
                {form.zweispielrecht && (
                  <div className="form-row" style={{ marginTop:8 }}>
                    <div className="form-group"><label>Verein</label><input value={form.zweispielrecht_verein} onChange={e=>setForm(p=>({...p,zweispielrecht_verein:e.target.value}))} /></div>
                    <div className="form-group"><label>Zuständig</label><input value={form.zweispielrecht_person} onChange={e=>setForm(p=>({...p,zweispielrecht_person:e.target.value}))} placeholder="Ansprechpartner" /></div>
                  </div>
                )}
              </div>

              {/* Berater */}
              <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-600)', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>🤝 Spielerberater</div>
                <div className="form-row">
                  <div className="form-group"><label>Name</label><input value={form.berater_name} onChange={e=>setForm(p=>({...p,berater_name:e.target.value}))} /></div>
                  <div className="form-group"><label>Agentur</label><input value={form.berater_agentur} onChange={e=>setForm(p=>({...p,berater_agentur:e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>E-Mail</label><input type="email" value={form.berater_email} onChange={e=>setForm(p=>({...p,berater_email:e.target.value}))} /></div>
                  <div className="form-group"><label>Telefon</label><input value={form.berater_telefon} onChange={e=>setForm(p=>({...p,berater_telefon:e.target.value}))} /></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowForm(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={speichern} className="btn btn-primary" disabled={saving}>{saving?'Speichern…':'Spieler anlegen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Spieler Grid */}
      {gefiltert.length === 0 ? (
        <div className="empty-state card"><p>Keine Spieler gefunden.</p></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))', gap:12 }}>
          {gefiltert.map(s => {
            const st = STATUS_STIL[s.status] || STATUS_STIL.inaktiv
            const prio = s.typ==='scouting' ? (SCOUTING_PRIO[s.scouting_prioritaet] || SCOUTING_PRIO.beobachten) : null
            const alter = s.geburtsdatum ? Math.floor((Date.now()-new Date(s.geburtsdatum))/(365.25*24*60*60*1000)) : null
            return (
              <div key={s.id} onClick={() => navigate(`/mannschaft/kader/${s.id}`)}
                className="card" style={{ cursor:'pointer', padding:14, marginBottom:0, transition:'box-shadow 0.15s', borderTop:`3px solid ${s.typ==='scouting'?'#2d6fa3':s.mannschaft?.farbe||'var(--navy)'}` }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-lg)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow)'}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  {s.foto_url
                    ? <img src={s.foto_url} alt="" style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--gray-200)', flexShrink:0 }} />
                    : <div style={{ width:44, height:44, borderRadius:'50%', background: s.typ==='scouting'?'#2d6fa3':(s.mannschaft?.farbe||'var(--navy)'), display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:14, flexShrink:0 }}>
                        {s.trikotnummer || (s.vorname[0]+s.nachname[0])}
                      </div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {s.vorname} {s.nachname}
                    </div>
                    <div style={{ fontSize:11, color:'var(--gray-500)' }}>
                      {s.typ==='scouting' ? (s.aktueller_verein||'Scouting') : (s.position||'–')}
                      {alter ? ` · ${alter} J.` : ''}
                    </div>
                  </div>
                  {s.trikotnummer && s.typ==='kader' && <div style={{ fontSize:16, fontWeight:900, color:'var(--gray-300)', fontFamily:'monospace' }}>#{s.trikotnummer}</div>}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:4 }}>
                  <span style={{ fontSize:11, padding:'2px 7px', borderRadius:10, fontWeight:600, background:st.bg, color:st.text }}>{s.status}</span>
                  {prio && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, fontWeight:700, background:prio.bg, color:prio.text }}>{prio.label}</span>}
                  {s.zweispielrecht && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background:'#ddeaff', color:'#1a4a8a', fontWeight:600 }}>2SR</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── SPIELER DETAIL ─────────────────────────────────────────
function SpielerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isManager = profile?.ist_manager || profile?.rolle === 'admin'
  const isBehandler = profile?.rolle === 'behandler'

  const [spieler, setSpieler]       = useState(null)
  const [mannschaften, setMannschaften] = useState([])
  const [verletzungen, setVerletzungen] = useState([])
  const [statistiken, setStatistiken]  = useState([])
  const [dokumente, setDokumente]      = useState([])
  const [loading, setLoading]          = useState(true)
  const [tab, setTab]                  = useState('stamm')
  const [editMode, setEditMode]        = useState(false)
  const [form, setForm]                = useState({})
  const [saving, setSaving]            = useState(false)
  const [aktiveVerletzung, setAktiveVerletzung] = useState(null)
  const [showVerletzungForm, setShowVerletzungForm] = useState(false)
  const [verletzungForm, setVerletzungForm] = useState({ diagnose:'', koerperteil:'', schweregrad:'leicht', datum_verletzung:'', behandlung:'' })
  const fileRef = useRef()

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: sp }, { data: mn }, { data: vl }, { data: st }, { data: dok }] = await Promise.all([
      supabase.from('spieler').select('*, mannschaft:mannschaft_id(name,farbe)').eq('id', id).single(),
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('spieler_verletzungen').select('*').eq('spieler_id', id).order('datum_verletzung', { ascending: false }),
      supabase.from('spieler_statistiken').select('*, event:event_id(name)').eq('spieler_id', id).order('datum', { ascending: false }),
      supabase.from('spieler_dokumente').select('*').eq('spieler_id', id).order('erstellt_am', { ascending: false }),
    ])
    setSpieler(sp); setForm(sp||{})
    setMannschaften(mn||[]); setVerletzungen(vl||[])
    setStatistiken(st||[]); setDokumente(dok||[])
    setLoading(false)
  }

  async function speichern() {
    setSaving(true)
    const payload = { ...form, mannschaft_id: form.mannschaft_id||null, trikotnummer: form.trikotnummer?parseInt(form.trikotnummer):null }
    delete payload.mannschaft
    await supabase.from('spieler').update(payload).eq('id', id)
    setSaving(false); setEditMode(false); load()
  }

  async function verletzungAnlegen() {
    if (!verletzungForm.diagnose.trim() || !verletzungForm.datum_verletzung) return
    await supabase.from('spieler_verletzungen').insert({ ...verletzungForm, spieler_id: id })
    await supabase.from('spieler').update({ status: 'verletzt' }).eq('id', id)
    setShowVerletzungForm(false)
    setVerletzungForm({ diagnose:'', koerperteil:'', schweregrad:'leicht', datum_verletzung:'', behandlung:'' })
    load()
  }

  async function verletzungHeilen(vid) {
    await supabase.from('spieler_verletzungen').update({ datum_genesung: new Date().toISOString().split('T')[0] }).eq('id', vid)
    const { data } = await supabase.from('spieler_verletzungen').select('id').eq('spieler_id', id).is('datum_genesung', null)
    if (!data?.filter(v=>v.id!==vid).length) await supabase.from('spieler').update({ status:'aktiv' }).eq('id', id)
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

  // Verletzungsakte-Overlay
  if (aktiveVerletzung) {
    return (
      <div>
        <button onClick={() => setAktiveVerletzung(null)} className="back-btn">← Zurück zur Spielermappe</button>
        <VerletzungsAkte
          verletzungId={aktiveVerletzung.id}
          spielerId={id}
          spielerName={`${spieler.vorname} ${spieler.nachname}`}
          onClose={() => { setAktiveVerletzung(null); load() }}
        />
      </div>
    )
  }

  const alter = spieler.geburtsdatum ? Math.floor((Date.now()-new Date(spieler.geburtsdatum))/(365.25*24*60*60*1000)) : null
  const st = STATUS_STIL[spieler.status] || STATUS_STIL.inaktiv
  const prio = spieler.typ==='scouting' ? (SCOUTING_PRIO[spieler.scouting_prioritaet]||SCOUTING_PRIO.beobachten) : null
  const statSummen = statistiken.reduce((acc,s) => ({ spiele:acc.spiele+(s.gespielt?1:0), tore:acc.tore+(s.tore||0), assists:acc.assists+(s.assists||0) }), { spiele:0, tore:0, assists:0 })

  const TABS = [
    ['stamm', 'Stammdaten'],
    ['verletzung', `🏥 Verletzungen (${verletzungen.length})`],
    ...(spieler.typ==='scouting' ? [['scouting','🔍 Scouting']] : []),
    ...(!isBehandler ? [['statistik',`📈 Statistiken (${statistiken.length})`]] : []),
    ...(!isBehandler && isManager ? [['vertrag','💼 Vertrag']] : []),
    ['dokumente', `📎 Dokumente (${dokumente.length})`],
  ]

  return (
    <div>
      <button onClick={() => navigate('/mannschaft/kader')} className="back-btn">← Zurück zum Kader</button>

      {/* Header */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:20 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            {spieler.foto_url
              ? <img src={spieler.foto_url} alt="" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'3px solid var(--gray-200)' }} />
              : <div style={{ width:80, height:80, borderRadius:'50%', background:spieler.typ==='scouting'?'#2d6fa3':(spieler.mannschaft?.farbe||'var(--navy)'), display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:24 }}>
                  {spieler.trikotnummer||(spieler.vorname[0]+spieler.nachname[0])}
                </div>
            }
            <label style={{ position:'absolute', bottom:0, right:0, background:'white', borderRadius:'50%', width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'var(--shadow)', fontSize:12, border:'1px solid var(--gray-200)' }}>
              📷<input type="file" accept="image/*" style={{ display:'none' }} onChange={fotoHochladen} />
            </label>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
              <h1 style={{ fontSize:22, color:'var(--navy)', margin:0, fontFamily:'"DM Serif Display",serif' }}>{spieler.vorname} {spieler.nachname}</h1>
              {spieler.trikotnummer && <span style={{ fontSize:18, fontWeight:900, color:'var(--gray-300)', fontFamily:'monospace' }}>#{spieler.trikotnummer}</span>}
              <span style={{ fontSize:12, padding:'2px 8px', borderRadius:10, fontWeight:600, background:st.bg, color:st.text }}>{spieler.status}</span>
              {prio && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:700, background:prio.bg, color:prio.text }}>{prio.label}</span>}
              {spieler.typ==='scouting' && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'#ddeaff', color:'#1a4a8a', fontWeight:700 }}>🔍 Scouting</span>}
              {spieler.typ==='scouting' && isManager && (
                <button onClick={async () => { await supabase.from('spieler').update({ typ:'kader' }).eq('id',id); load() }} className="btn btn-sm btn-gold">→ In Kader übernehmen</button>
              )}
            </div>
            <div style={{ fontSize:13, color:'var(--gray-600)', display:'flex', gap:14, flexWrap:'wrap' }}>
              {spieler.mannschaft?.name && <span>🏐 {spieler.mannschaft.name}</span>}
              {spieler.position && <span>📍 {spieler.position}</span>}
              {alter && <span>🎂 {alter} J.</span>}
              {spieler.nationalitaet && <span>🌍 {spieler.nationalitaet}</span>}
              {spieler.zweispielrecht && <span style={{ color:'#1a4a8a', fontWeight:600 }}>2SR: {spieler.zweispielrecht_verein}</span>}
            </div>
            {!isBehandler && <div style={{ display:'flex', gap:14, marginTop:8, fontSize:13 }}>
              <span>⚽ <strong>{statSummen.tore}</strong> Tore</span>
              <span>🎯 <strong>{statSummen.assists}</strong> Assists</span>
              <span>🎮 <strong>{statSummen.spiele}</strong> Spiele</span>
            </div>}
            {spieler.berater_name && <div style={{ marginTop:6, fontSize:12, color:'var(--gray-600)' }}>🤝 Berater: {spieler.berater_name}{spieler.berater_agentur?` · ${spieler.berater_agentur}`:''}</div>}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {!isBehandler && <button onClick={() => setEditMode(!editMode)} className={`btn btn-sm ${editMode?'btn-primary':'btn-outline'}`}>{editMode?'Abbrechen':'Bearbeiten'}</button>}
            {editMode && <button onClick={speichern} className="btn btn-sm btn-gold" disabled={saving}>{saving?'…':'Speichern'}</button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:16 }}>
        {TABS.map(([k,l]) => <button key={k} className={`tab-btn${tab===k?' active':''}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {/* STAMMDATEN */}
      {tab==='stamm' && (
        <div className="card">
          {editMode ? (
            <div>
              <div className="form-row">
                <div className="form-group"><label>Vorname</label><input value={form.vorname||''} onChange={e=>setForm(p=>({...p,vorname:e.target.value}))} /></div>
                <div className="form-group"><label>Nachname</label><input value={form.nachname||''} onChange={e=>setForm(p=>({...p,nachname:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Typ</label>
                  <select value={form.typ||'kader'} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
                    {TYP_OPTS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Mannschaft</label>
                  <select value={form.mannschaft_id||''} onChange={e=>setForm(p=>({...p,mannschaft_id:e.target.value}))}>
                    <option value="">Keine</option>
                    {mannschaften.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Position</label>
                  <select value={form.position||''} onChange={e=>setForm(p=>({...p,position:e.target.value}))}>
                    <option value="">–</option>{POSITIONEN.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status||'aktiv'} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    {STATUS_OPTS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Trikot</label><input type="number" value={form.trikotnummer||''} onChange={e=>setForm(p=>({...p,trikotnummer:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Geburtsdatum</label><input type="date" value={form.geburtsdatum||''} onChange={e=>setForm(p=>({...p,geburtsdatum:e.target.value}))} /></div>
                <div className="form-group"><label>Nationalität</label><input value={form.nationalitaet||''} onChange={e=>setForm(p=>({...p,nationalitaet:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={form.email||''} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
                <div className="form-group"><label>Telefon</label><input value={form.telefon||''} onChange={e=>setForm(p=>({...p,telefon:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Notfall Name</label><input value={form.notfall_kontakt_name||''} onChange={e=>setForm(p=>({...p,notfall_kontakt_name:e.target.value}))} /></div>
                <div className="form-group"><label>Notfall Tel.</label><input value={form.notfall_kontakt_telefon||''} onChange={e=>setForm(p=>({...p,notfall_kontakt_telefon:e.target.value}))} /></div>
              </div>
              {/* Zweispielrecht */}
              <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:12, marginBottom:12 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer', marginBottom:form.zweispielrecht?10:0 }}>
                  <input type="checkbox" checked={form.zweispielrecht||false} onChange={e=>setForm(p=>({...p,zweispielrecht:e.target.checked}))} />
                  Zweispielrecht
                </label>
                {form.zweispielrecht && (
                  <div className="form-row" style={{ marginTop:8 }}>
                    <div className="form-group"><label>Verein</label><input value={form.zweispielrecht_verein||''} onChange={e=>setForm(p=>({...p,zweispielrecht_verein:e.target.value}))} /></div>
                    <div className="form-group"><label>Zuständig</label><input value={form.zweispielrecht_person||''} onChange={e=>setForm(p=>({...p,zweispielrecht_person:e.target.value}))} /></div>
                  </div>
                )}
              </div>
              {/* Berater */}
              <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-600)', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>🤝 Spielerberater</div>
                <div className="form-row">
                  <div className="form-group"><label>Name</label><input value={form.berater_name||''} onChange={e=>setForm(p=>({...p,berater_name:e.target.value}))} /></div>
                  <div className="form-group"><label>Agentur</label><input value={form.berater_agentur||''} onChange={e=>setForm(p=>({...p,berater_agentur:e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>E-Mail</label><input type="email" value={form.berater_email||''} onChange={e=>setForm(p=>({...p,berater_email:e.target.value}))} /></div>
                  <div className="form-group"><label>Telefon</label><input value={form.berater_telefon||''} onChange={e=>setForm(p=>({...p,berater_telefon:e.target.value}))} /></div>
                </div>
              </div>
              <div className="form-group" style={{ marginTop:12 }}><label>Notizen</label><textarea value={form.notizen||''} onChange={e=>setForm(p=>({...p,notizen:e.target.value}))} rows={3} /></div>
            </div>
          ) : (
            <div>
              <div className="detail-grid">
                {[
                  ['Mannschaft', spieler.mannschaft?.name],
                  ['Position', spieler.position],
                  ['Trikotnummer', spieler.trikotnummer?`#${spieler.trikotnummer}`:null],
                  ['Wurfhand', spieler.wurfhand],
                  ['Geburtsdatum', spieler.geburtsdatum?`${new Date(spieler.geburtsdatum).toLocaleDateString('de-DE')} (${alter} J.)`:null],
                  ['Nationalität', spieler.nationalitaet],
                  ['E-Mail', spieler.email],
                  ['Telefon', spieler.telefon],
                  ['Notfallkontakt', spieler.notfall_kontakt_name?`${spieler.notfall_kontakt_name} · ${spieler.notfall_kontakt_telefon||''}`:null],
                  ['Lizenz', spieler.lizenznummer],
                  ['Eintritt', spieler.eintrittsdatum?new Date(spieler.eintrittsdatum).toLocaleDateString('de-DE'):null],
                ].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} className="detail-field"><label>{l}</label><span>{v}</span></div>
                ))}
              </div>
              {spieler.zweispielrecht && (
                <div style={{ marginTop:12, padding:'10px 14px', background:'#ddeaff', borderRadius:'var(--radius)' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#1a4a8a', marginBottom:4 }}>Zweispielrecht</div>
                  <div style={{ fontSize:13 }}>{spieler.zweispielrecht_verein}{spieler.zweispielrecht_person?` · Zuständig: ${spieler.zweispielrecht_person}`:''}</div>
                </div>
              )}
              {spieler.berater_name && (
                <div style={{ marginTop:12, padding:'10px 14px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-600)', marginBottom:4 }}>🤝 Spielerberater</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{spieler.berater_name}{spieler.berater_agentur?` · ${spieler.berater_agentur}`:''}</div>
                  <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:3, display:'flex', gap:12 }}>
                    {spieler.berater_email&&<a href={`mailto:${spieler.berater_email}`} style={{ color:'var(--navy)' }}>✉ {spieler.berater_email}</a>}
                    {spieler.berater_telefon&&<a href={`tel:${spieler.berater_telefon}`} style={{ color:'var(--navy)' }}>📞 {spieler.berater_telefon}</a>}
                  </div>
                </div>
              )}
              {spieler.notizen && <div style={{ marginTop:12, padding:'10px 14px', background:'var(--gray-100)', borderRadius:'var(--radius)', fontSize:13, color:'var(--gray-600)' }}>{spieler.notizen}</div>}
            </div>
          )}
        </div>
      )}

      {/* VERLETZUNGEN */}
      {tab==='verletzung' && (
        <div>
          <div className="toolbar">
            <button onClick={() => setShowVerletzungForm(true)} className="btn btn-primary">+ Verletzung eintragen</button>
          </div>
          {showVerletzungForm && (
            <div className="card" style={{ marginBottom:16 }}>
              <div className="section-title" style={{ marginBottom:14 }}>Neue Verletzung</div>
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
              <div className="form-group"><label>Erste Behandlungsnotiz</label><textarea value={verletzungForm.behandlung} onChange={e=>setVerletzungForm(p=>({...p,behandlung:e.target.value}))} rows={2} /></div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={verletzungAnlegen} className="btn btn-primary">Verletzung anlegen</button>
                <button onClick={() => setShowVerletzungForm(false)} className="btn btn-outline">Abbrechen</button>
              </div>
            </div>
          )}
          {verletzungen.length===0 ? <div className="empty-state card"><p>Keine Verletzungen.</p></div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {verletzungen.map(v => {
                const aktiv = !v.datum_genesung
                const schwSt = { leicht:'#e2efda', mittel:'#fff3cd', schwer:'#fce4d6', kritisch:'#fce4d6' }
                const schwTxt = { leicht:'#2d6b3a', mittel:'#8a6a00', schwer:'#8a3a1a', kritisch:'#d94f4f' }
                return (
                  <div key={v.id} className="card" style={{ padding:14, marginBottom:0, borderLeft:`4px solid ${aktiv?'var(--red)':'var(--green)'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{v.diagnose}</div>
                        <div style={{ fontSize:12, color:'var(--gray-600)', marginBottom:6 }}>
                          {v.koerperteil&&`${v.koerperteil} · `}
                          seit {new Date(v.datum_verletzung).toLocaleDateString('de-DE')}
                          {v.datum_genesung&&` · Genesen: ${new Date(v.datum_genesung).toLocaleDateString('de-DE')}`}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:700, background:schwSt[v.schweregrad], color:schwTxt[v.schweregrad] }}>{v.schweregrad}</span>
                        <button onClick={() => setAktiveVerletzung(v)} className="btn btn-sm btn-primary">📋 Akte öffnen</button>
                        {aktiv && !isBehandler && <button onClick={() => verletzungHeilen(v.id)} className="btn btn-sm" style={{ background:'#e2efda', color:'#2d6b3a', border:'none' }}>✓ Genesen</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SCOUTING TAB */}
      {tab==='scouting' && spieler.typ==='scouting' && (
        <div className="card">
          {editMode ? (
            <div>
              <div className="form-row">
                <div className="form-group"><label>Aktueller Verein</label><input value={form.aktueller_verein||''} onChange={e=>setForm(p=>({...p,aktueller_verein:e.target.value}))} /></div>
                <div className="form-group"><label>Priorität</label>
                  <select value={form.scouting_prioritaet||'beobachten'} onChange={e=>setForm(p=>({...p,scouting_prioritaet:e.target.value}))}>
                    {Object.entries(SCOUTING_PRIO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Bewertung (1-10)</label><input type="number" min="1" max="10" step="0.5" value={form.scouting_bewertung||''} onChange={e=>setForm(p=>({...p,scouting_bewertung:e.target.value}))} /></div>
                <div className="form-group"><label>Verfügbar ab</label><input type="date" value={form.verfuegbar_ab||''} onChange={e=>setForm(p=>({...p,verfuegbar_ab:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Video-URL</label><input type="url" value={form.video_url||''} onChange={e=>setForm(p=>({...p,video_url:e.target.value}))} /></div>
              <div className="form-group"><label>Scouting-Notizen</label><textarea value={form.scouting_notizen||''} onChange={e=>setForm(p=>({...p,scouting_notizen:e.target.value}))} rows={4} /></div>
            </div>
          ) : (
            <div>
              <div className="detail-grid">
                {[
                  ['Aktueller Verein', spieler.aktueller_verein],
                  ['Priorität', prio ? <span style={{ padding:'2px 8px', borderRadius:10, fontWeight:700, background:prio.bg, color:prio.text }}>{prio.label}</span> : null],
                  ['Bewertung', spieler.scouting_bewertung?`${spieler.scouting_bewertung}/10`:null],
                  ['Verfügbar ab', spieler.verfuegbar_ab?new Date(spieler.verfuegbar_ab).toLocaleDateString('de-DE'):null],
                  ['Kontakt aufgenommen', spieler.kontakt_aufgenommen?'Ja':'Nein'],
                ].filter(([,v])=>v).map(([l,v])=>(<div key={l} className="detail-field"><label>{l}</label><span>{v}</span></div>))}
              </div>
              {spieler.video_url && <a href={spieler.video_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ marginTop:12, display:'inline-block' }}>▶ Video ansehen</a>}
              {spieler.scouting_notizen && <div style={{ marginTop:12, padding:'10px 14px', background:'var(--gray-100)', borderRadius:'var(--radius)', fontSize:13 }}>{spieler.scouting_notizen}</div>}
            </div>
          )}
        </div>
      )}

      {/* STATISTIKEN */}
      {tab==='statistik' && !isBehandler && (
        <div>
          <div className="stats-row" style={{ marginBottom:16 }}>
            {[['⚽','Tore',statSummen.tore],['🎯','Assists',statSummen.assists],['🎮','Spiele',statSummen.spiele]].map(([i,l,w])=>(
              <div key={l} className="stat-card"><div style={{ fontSize:18 }}>{i}</div><div className="stat-num" style={{ fontSize:22 }}>{w}</div><div className="stat-label">{l}</div></div>
            ))}
          </div>
          {statistiken.length===0 ? <div className="empty-state card"><p>Noch keine Statistiken.</p></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Datum</th><th>Spiel</th><th>Gespielt</th><th>Tore</th><th>Assists</th><th>Karten</th><th>Bewertung</th></tr></thead>
                <tbody>
                  {statistiken.map(s=>(
                    <tr key={s.id}>
                      <td>{s.datum?new Date(s.datum).toLocaleDateString('de-DE'):'–'}</td>
                      <td>{s.event?.name||s.gegner||'–'}</td>
                      <td>{s.gespielt?'✓':'–'}</td>
                      <td style={{ fontWeight:600 }}>{s.tore||0}</td>
                      <td>{s.assists||0}</td>
                      <td>{s.gelbe_karten?'🟨':''}{s.rote_karten?'🟥':''}</td>
                      <td>{s.bewertung?`${s.bewertung}/10`:'–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VERTRAG */}
      {tab==='vertrag' && isManager && !isBehandler && (
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
                ['Vertragsbeginn', spieler.vertragsbeginn?new Date(spieler.vertragsbeginn).toLocaleDateString('de-DE'):null],
                ['Vertragsende', spieler.vertragsende?new Date(spieler.vertragsende).toLocaleDateString('de-DE'):null],
                ['Gehalt mtl.', spieler.gehalt_monatlich?`${Number(spieler.gehalt_monatlich).toLocaleString('de-DE')} EUR`:null],
              ].filter(([,v])=>v).map(([l,v])=>(<div key={l} className="detail-field"><label>{l}</label><span>{v}</span></div>))}
              {spieler.vertragsnotizen&&<div className="detail-field" style={{ gridColumn:'1/-1' }}><label>Notizen</label><span>{spieler.vertragsnotizen}</span></div>}
              {!spieler.vertragsbeginn&&!spieler.vertragsende&&<p style={{ color:'var(--gray-400)',fontSize:13 }}>Keine Vertragsdaten. Klicke "Bearbeiten".</p>}
            </div>
          )}
        </div>
      )}

      {/* DOKUMENTE */}
      {tab==='dokumente' && (
        <div>
          <div className="toolbar">
            <button onClick={async () => {
              const name = prompt('Dokument-Name:'); if (!name) return
              const url = prompt('URL (Google Drive etc.):'); if (!url) return
              await supabase.from('spieler_dokumente').insert({ spieler_id:id, typ:'sonstiges', name, datei_url:url, hochgeladen_von:profile.id })
              load()
            }} className="btn btn-primary">+ Dokument</button>
          </div>
          {dokumente.length===0 ? <div className="empty-state card"><p>Keine Dokumente.</p></div> : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
              {dokumente.map(d=>(
                <div key={d.id} className="card" style={{ padding:14, marginBottom:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{d.name}</div>
                    <span style={{ fontSize:11, background:'var(--gray-100)', color:'var(--gray-600)', padding:'1px 8px', borderRadius:10 }}>{d.typ}</span>
                  </div>
                  {d.gueltig_bis&&<div style={{ fontSize:12, color:new Date(d.gueltig_bis)<new Date()?'var(--red)':'var(--gray-400)' }}>Gültig bis: {new Date(d.gueltig_bis).toLocaleDateString('de-DE')}</div>}
                  <div style={{ display:'flex', gap:6, marginTop:8 }}>
                    {d.datei_url&&<a href={d.datei_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">⬇ Öffnen</a>}
                    <button onClick={async()=>{ await supabase.from('spieler_dokumente').delete().eq('id',d.id); load() }} className="btn btn-sm btn-danger">×</button>
                  </div>
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
