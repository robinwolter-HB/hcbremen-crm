import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const BLOCK_LABEL = { aufwaermen:'🔥 Aufwärmen', hauptteil:'💪 Hauptteil', abwaermen:'🧊 Abkühlen', sonstiges:'📎 Sonstiges' }
const STATUS_STIL = {
  geplant:       { bg:'#fff3cd', text:'#8a6a00', label:'Geplant' },
  aktiv:         { bg:'#ddeaff', text:'#1a4a8a', label:'Aktiv' },
  abgeschlossen: { bg:'#e2efda', text:'#2d6b3a', label:'Abgeschlossen' },
  abgesagt:      { bg:'#fce4d6', text:'#8a3a1a', label:'Abgesagt' },
}
const RUECK_STIL = {
  zugesagt:   { bg:'#e2efda', text:'#2d6b3a', label:'✓ Zugesagt',   icon:'✓' },
  abgesagt:   { bg:'#fce4d6', text:'#8a3a1a', label:'✗ Abgesagt',   icon:'✗' },
  ausstehend: { bg:'#fff3cd', text:'#8a6a00', label:'? Ausstehend', icon:'?' },
}

// ─── TRAININGSLISTE ──────────────────────────────────────────
function TrainingsListe() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isStaff = profile?.rolle === 'admin' || (profile?.bereiche||[]).includes('mannschaft')
  const isSpieler = profile?.rolle === 'spieler'

  const [einheiten, setEinheiten]     = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [typen, setTypen]             = useState([])
  const [aktiveMn, setAktiveMn]       = useState('')
  const [ansicht, setAnsicht]         = useState('liste')  // 'liste' | 'kalender'
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [form, setForm] = useState({
    mannschaft_id:'', typ_id:'', titel:'', datum:'',
    uhrzeit_start:'17:00', uhrzeit_ende:'19:00', treffzeit:'16:45',
    ort:'', beschreibung:'', ziele:'',
  })

  // Spieler-Eigenschaft
  const [spielerProfil, setSpielerProfil] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: mn }, { data: ty }] = await Promise.all([
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('trainingstypen').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setMannschaften(mn||[])
    setTypen(ty||[])

    // Spieler: eigene Mannschaft finden
    let mnId = ''
    if (isSpieler) {
      const { data: sp } = await supabase.from('spieler').select('mannschaft_id').eq('profile_id', profile.id).single()
      if (sp) { mnId = sp.mannschaft_id; setSpielerProfil(sp) }
    } else if (mn?.length) {
      mnId = mn[0].id
    }
    setAktiveMn(mnId)

    // Einheiten laden
    if (mnId) await ladeEinheiten(mnId)
    setLoading(false)
  }

  async function ladeEinheiten(mnId) {
    const { data } = await supabase.from('trainingseinheiten')
      .select('*, typ:typ_id(name,farbe), mannschaft:mannschaft_id(name,farbe)')
      .eq('mannschaft_id', mnId)
      .order('datum', { ascending: false })
      .order('uhrzeit_start', { ascending: true })
    setEinheiten(data||[])
  }

  async function mannschaftWechsel(id) {
    setAktiveMn(id)
    setEinheiten([])
    setLoading(true)
    await ladeEinheiten(id)
    setLoading(false)
  }

  async function speichern() {
    if (!form.titel.trim() || !form.datum || !form.mannschaft_id) return
    setSaving(true)
    const { data: einheit } = await supabase.from('trainingseinheiten').insert({
      ...form,
      typ_id: form.typ_id || null,
      treffzeit: form.treffzeit || null,
      erstellt_von: profile.id,
    }).select().single()

    // Anwesenheits-Einträge für alle Spieler der Mannschaft anlegen
    if (einheit) {
      const { data: spieler } = await supabase.from('spieler').select('id').eq('mannschaft_id', form.mannschaft_id).eq('aktiv', true).eq('typ', 'kader')
      if (spieler?.length) {
        await supabase.from('training_anwesenheit').insert(
          spieler.map(s => ({ einheit_id: einheit.id, spieler_id: s.id, rueckmeldung: 'ausstehend' }))
        )
      }
    }
    setSaving(false); setShowForm(false)
    if (aktiveMn) await ladeEinheiten(aktiveMn)
  }

  // Kalender-Ansicht: Wochen-Gruppierung
  const heute = new Date().toISOString().split('T')[0]
  const kommend = einheiten.filter(e => e.datum >= heute && e.status !== 'abgesagt').sort((a,b) => a.datum.localeCompare(b.datum))
  const vergangen = einheiten.filter(e => e.datum < heute || e.status === 'abgesagt').sort((a,b) => b.datum.localeCompare(a.datum))

  // Kalender: Einheiten nach KW gruppieren
  function getKW(datum) {
    const d = new Date(datum)
    d.setHours(0); const jan1 = new Date(d.getFullYear(),0,1)
    return Math.ceil(((d-jan1)/86400000 + jan1.getDay()+1)/7)
  }

  return (
    <div>
      {/* Mannschaft Tabs */}
      {!isSpieler && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16, justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {mannschaften.map(m=>(
              <button key={m.id} onClick={()=>mannschaftWechsel(m.id)}
                style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
                  background: aktiveMn===m.id ? (m.farbe||'var(--navy)') : 'var(--gray-100)',
                  color: aktiveMn===m.id ? 'white' : 'var(--gray-600)' }}>
                {m.name}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ display:'flex', gap:4, background:'var(--gray-100)', padding:4, borderRadius:20 }}>
              {[['liste','☰ Liste'],['kalender','📅 Kalender']].map(([k,l])=>(
                <button key={k} onClick={()=>setAnsicht(k)}
                  style={{ padding:'4px 12px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:12,
                    background:ansicht===k?'var(--white)':'transparent', color:ansicht===k?'var(--navy)':'var(--gray-500)',
                    boxShadow:ansicht===k?'var(--shadow)':'none' }}>
                  {l}
                </button>
              ))}
            </div>
            {isStaff && <button onClick={()=>{ setForm(p=>({...p,mannschaft_id:aktiveMn})); setShowForm(true) }} className="btn btn-primary">+ Einheit anlegen</button>}
          </div>
        </div>
      )}

      {/* Formular */}
      {showForm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal" style={{ maxWidth:620 }}>
            <div className="modal-header">
              <span className="modal-title">Trainingseinheit anlegen</span>
              <button className="close-btn" onClick={()=>setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Mannschaft *</label>
                  <select value={form.mannschaft_id} onChange={e=>setForm(p=>({...p,mannschaft_id:e.target.value}))}>
                    <option value="">Wählen…</option>
                    {mannschaften.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Typ</label>
                  <select value={form.typ_id} onChange={e=>setForm(p=>({...p,typ_id:e.target.value}))}>
                    <option value="">Kein Typ</option>
                    {typen.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Titel *</label><input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} autoFocus placeholder="z.B. Dienstags-Training" /></div>
              <div className="form-row">
                <div className="form-group"><label>Datum *</label><input type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))} /></div>
                <div className="form-group"><label>Treffzeit</label><input type="time" value={form.treffzeit} onChange={e=>setForm(p=>({...p,treffzeit:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Start</label><input type="time" value={form.uhrzeit_start} onChange={e=>setForm(p=>({...p,uhrzeit_start:e.target.value}))} /></div>
                <div className="form-group"><label>Ende</label><input type="time" value={form.uhrzeit_ende} onChange={e=>setForm(p=>({...p,uhrzeit_ende:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Ort</label><input value={form.ort} onChange={e=>setForm(p=>({...p,ort:e.target.value}))} placeholder="z.B. Halle Ronzelenstraße" /></div>
              <div className="form-group"><label>Beschreibung</label><textarea value={form.beschreibung} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} rows={2} /></div>
              <div className="form-group"><label>Trainingsziele</label><textarea value={form.ziele} onChange={e=>setForm(p=>({...p,ziele:e.target.value}))} rows={2} placeholder="Was soll heute erreicht werden?" /></div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setShowForm(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={speichern} className="btn btn-primary" disabled={saving}>{saving?'Anlegen…':'Einheit anlegen'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div>
          {/* Kommende Einheiten */}
          {kommend.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
                Kommende Einheiten ({kommend.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {kommend.map(e => <EinheitKarte key={e.id} einheit={e} onOpen={()=>navigate(`/mannschaft/training/${e.id}`)} isSpieler={isSpieler} profile={profile} />)}
              </div>
            </div>
          )}

          {/* Vergangene */}
          {vergangen.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
                Vergangene Einheiten ({vergangen.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, opacity:0.7 }}>
                {vergangen.slice(0,10).map(e => <EinheitKarte key={e.id} einheit={e} onOpen={()=>navigate(`/mannschaft/training/${e.id}`)} isSpieler={isSpieler} profile={profile} />)}
              </div>
            </div>
          )}

          {einheiten.length === 0 && (
            <div className="empty-state card"><p>Noch keine Trainingseinheiten für diese Mannschaft.</p></div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── EINHEIT KARTE ───────────────────────────────────────────
function EinheitKarte({ einheit: e, onOpen, isSpieler, profile }) {
  const [eigeneAnwesenheit, setEigeneAnwesenheit] = useState(null)
  const [loadingRueck, setLoadingRueck] = useState(false)

  useEffect(() => {
    if (isSpieler) ladeEigene()
  }, [e.id])

  async function ladeEigene() {
    const { data: sp } = await supabase.from('spieler').select('id').eq('profile_id', profile.id).single()
    if (!sp) return
    const { data } = await supabase.from('training_anwesenheit').select('*').eq('einheit_id', e.id).eq('spieler_id', sp.id).maybeSingle()
    setEigeneAnwesenheit(data)
  }

  async function rueckmeldung(wert, grund='') {
    if (!eigeneAnwesenheit) return
    setLoadingRueck(true)
    await supabase.from('training_anwesenheit').update({
      rueckmeldung: wert,
      abmelde_grund: grund || null,
      abmeldung_am: new Date().toISOString(),
    }).eq('id', eigeneAnwesenheit.id)
    await ladeEigene()
    setLoadingRueck(false)
  }

  const st = STATUS_STIL[e.status] || STATUS_STIL.geplant
  const typ = e.typ
  const istHeute = e.datum === new Date().toISOString().split('T')[0]
  const rueckSt = eigeneAnwesenheit ? RUECK_STIL[eigeneAnwesenheit.rueckmeldung] : null

  return (
    <div className="card" style={{ padding:16, marginBottom:0, cursor:'pointer', borderLeft:`4px solid ${typ?.farbe||'var(--navy)'}`, position:'relative' }}
      onClick={onOpen}
      onMouseEnter={e2=>e2.currentTarget.style.boxShadow='var(--shadow-lg)'}
      onMouseLeave={e2=>e2.currentTarget.style.boxShadow='var(--shadow)'}>

      {istHeute && <div style={{ position:'absolute', top:10, right:10, fontSize:11, padding:'2px 10px', borderRadius:20, background:'var(--navy)', color:'white', fontWeight:700 }}>HEUTE</div>}

      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
        {/* Datum Block */}
        <div style={{ flexShrink:0, textAlign:'center', width:52 }}>
          <div style={{ fontSize:22, fontWeight:900, color:'var(--navy)', lineHeight:1 }}>
            {new Date(e.datum+'T00:00:00').getDate()}
          </div>
          <div style={{ fontSize:11, color:'var(--gray-400)', fontWeight:600 }}>
            {new Date(e.datum+'T00:00:00').toLocaleDateString('de-DE', { month:'short' }).toUpperCase()}
          </div>
          <div style={{ fontSize:11, color:'var(--gray-400)' }}>
            {new Date(e.datum+'T00:00:00').toLocaleDateString('de-DE', { weekday:'short' })}
          </div>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
            {typ && <span style={{ fontSize:11, padding:'1px 8px', borderRadius:10, fontWeight:700, background:(typ.farbe||'#ccc')+'22', color:typ.farbe||'var(--navy)' }}>{typ.name}</span>}
            <span style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>{e.titel}</span>
            <span style={{ fontSize:11, padding:'1px 8px', borderRadius:10, fontWeight:600, background:st.bg, color:st.text }}>{st.label}</span>
          </div>
          <div style={{ fontSize:13, color:'var(--gray-600)', display:'flex', gap:14, flexWrap:'wrap' }}>
            {e.treffzeit && <span>🕐 Treff: {e.treffzeit.slice(0,5)}</span>}
            {e.uhrzeit_start && <span>⏱ {e.uhrzeit_start.slice(0,5)}{e.uhrzeit_ende?`–${e.uhrzeit_ende.slice(0,5)}`:''}</span>}
            {e.ort && <span>📍 {e.ort}</span>}
          </div>
        </div>

        {/* Spieler: Rückmeldung direkt */}
        {isSpieler && eigeneAnwesenheit && (
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }} onClick={ev=>ev.stopPropagation()}>
            <div style={{ fontSize:11, fontWeight:700, background:rueckSt?.bg, color:rueckSt?.text, padding:'2px 10px', borderRadius:20 }}>
              {rueckSt?.label}
            </div>
            {eigeneAnwesenheit.rueckmeldung !== 'zugesagt' && (
              <button onClick={()=>rueckmeldung('zugesagt')} className="btn btn-sm" style={{ background:'#e2efda', color:'#2d6b3a', border:'none', fontSize:11 }} disabled={loadingRueck}>✓ Zusagen</button>
            )}
            {eigeneAnwesenheit.rueckmeldung !== 'abgesagt' && (
              <button onClick={()=>{ const grund=prompt('Abmeldegrund (optional):'); rueckmeldung('abgesagt',grund||'') }} className="btn btn-sm btn-outline" style={{ fontSize:11, color:'var(--red)' }} disabled={loadingRueck}>✗ Absagen</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── EINHEIT DETAIL ──────────────────────────────────────────
function EinheitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isStaff = profile?.rolle === 'admin' || (profile?.bereiche||[]).includes('mannschaft')
  const isSpieler = profile?.rolle === 'spieler'

  const [einheit, setEinheit]     = useState(null)
  const [inhalte, setInhalte]     = useState([])
  const [anwesenheit, setAnwesenheit] = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('info')
  const [showInhaltForm, setShowInhaltForm] = useState(false)
  const [showEditForm, setShowEditForm]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [typen, setTypen]         = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [eigeneAnwesenheit, setEigeneAnwesenheit] = useState(null)
  const [spielerInfo, setSpielerInfo] = useState(null)

  const [editForm, setEditForm] = useState({})
  const [inhaltForm, setInhaltForm] = useState({ block:'hauptteil', titel:'', beschreibung:'', dauer_minuten:'', material:'', reihenfolge:0 })

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: e }, { data: i }, { data: a }, { data: ty }, { data: mn }] = await Promise.all([
      supabase.from('trainingseinheiten').select('*, typ:typ_id(name,farbe), mannschaft:mannschaft_id(name,farbe)').eq('id', id).single(),
      supabase.from('training_inhalte').select('*').eq('einheit_id', id).order('reihenfolge'),
      supabase.from('training_anwesenheit')
        .select('*, spieler:spieler_id(id,vorname,nachname,trikotnummer,position,status,foto_url)')
        .eq('einheit_id', id)
        .order('spieler(nachname)'),
      supabase.from('trainingstypen').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('mannschaften').select('*').eq('aktiv', true),
    ])
    setEinheit(e); setEditForm(e||{})
    setInhalte(i||[]); setAnwesenheit(a||[])
    setTypen(ty||[]); setMannschaften(mn||[])

    // Spieler: eigene Anwesenheit
    if (isSpieler) {
      const { data: sp } = await supabase.from('spieler').select('*').eq('profile_id', profile.id).single()
      if (sp) {
        setSpielerInfo(sp)
        const eigen = (a||[]).find(x=>x.spieler_id===sp.id)
        setEigeneAnwesenheit(eigen||null)
      }
    }
    setLoading(false)
  }

  async function statusAendern(status) {
    await supabase.from('trainingseinheiten').update({ status }).eq('id', id); load()
  }

  async function editSpeichern() {
    setSaving(true)
    await supabase.from('trainingseinheiten').update({ ...editForm, typ_id:editForm.typ_id||null }).eq('id', id)
    setSaving(false); setShowEditForm(false); load()
  }

  async function inhaltSpeichern() {
    if (!inhaltForm.titel.trim()) return
    setSaving(true)
    await supabase.from('training_inhalte').insert({ ...inhaltForm, einheit_id: id, dauer_minuten: inhaltForm.dauer_minuten?parseInt(inhaltForm.dauer_minuten):null, reihenfolge: inhalte.length })
    setInhaltForm({ block:'hauptteil', titel:'', beschreibung:'', dauer_minuten:'', material:'', reihenfolge:0 })
    setSaving(false); setShowInhaltForm(false); load()
  }

  async function anwesenheitSetzen(anwId, erschienen) {
    await supabase.from('training_anwesenheit').update({ erschienen, erfasst_am: new Date().toISOString(), erfasst_von: profile.id }).eq('id', anwId)
    load()
  }

  async function eigeneRueckmeldung(wert) {
    if (!eigeneAnwesenheit) return
    const grund = wert === 'abgesagt' ? prompt('Abmeldegrund (optional):') : null
    await supabase.from('training_anwesenheit').update({ rueckmeldung: wert, abmelde_grund: grund||null, abmeldung_am: new Date().toISOString() }).eq('id', eigeneAnwesenheit.id)
    load()
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!einheit) return null

  const st = STATUS_STIL[einheit.status] || STATUS_STIL.geplant
  const zugesagt = anwesenheit.filter(a=>a.rueckmeldung==='zugesagt').length
  const abgesagt = anwesenheit.filter(a=>a.rueckmeldung==='abgesagt').length
  const erschienen = anwesenheit.filter(a=>a.erschienen===true).length
  const quote = anwesenheit.filter(a=>a.erschienen!==null).length
    ? Math.round(erschienen / anwesenheit.filter(a=>a.erschienen!==null).length * 100) : null

  // Inhalte nach Block gruppieren
  const bloecke = ['aufwaermen','hauptteil','abwaermen','sonstiges']
  const inhaltNachBlock = (b) => inhalte.filter(i=>i.block===b)

  return (
    <div>
      <button onClick={()=>navigate('/mannschaft/training')} className="back-btn">← Zurück zum Trainingsplan</button>

      {/* HEADER */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
              {einheit.typ && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:700, background:(einheit.typ.farbe||'#ccc')+'22', color:einheit.typ.farbe||'var(--navy)' }}>{einheit.typ.name}</span>}
              <h2 style={{ fontSize:20, color:'var(--navy)', margin:0, fontFamily:'"DM Serif Display",serif' }}>{einheit.titel}</h2>
              <span style={{ fontSize:12, padding:'2px 9px', borderRadius:20, fontWeight:700, background:st.bg, color:st.text }}>{st.label}</span>
              {einheit.mannschaft && <span style={{ fontSize:12, color:'var(--gray-400)' }}>🏐 {einheit.mannschaft.name}</span>}
            </div>
            <div style={{ fontSize:13, color:'var(--gray-600)', display:'flex', gap:16, flexWrap:'wrap' }}>
              <span>📅 {new Date(einheit.datum+'T00:00:00').toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</span>
              {einheit.treffzeit && <span>🕐 Treff: <strong>{einheit.treffzeit.slice(0,5)}</strong></span>}
              {einheit.uhrzeit_start && <span>⏱ <strong>{einheit.uhrzeit_start.slice(0,5)}{einheit.uhrzeit_ende?`–${einheit.uhrzeit_ende.slice(0,5)}`:''}</strong></span>}
              {einheit.ort && <span>📍 {einheit.ort}</span>}
            </div>
            {einheit.ziele && <div style={{ marginTop:8, fontSize:13, color:'var(--gray-600)', fontStyle:'italic' }}>🎯 {einheit.ziele}</div>}

            {/* Spieler: Rückmeldung */}
            {isSpieler && eigeneAnwesenheit && (
              <div style={{ marginTop:12, display:'flex', gap:8, alignItems:'center', padding:'10px 14px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Deine Rückmeldung:</span>
                <span style={{ fontSize:12, padding:'2px 10px', borderRadius:20, fontWeight:700, background:RUECK_STIL[eigeneAnwesenheit.rueckmeldung]?.bg, color:RUECK_STIL[eigeneAnwesenheit.rueckmeldung]?.text }}>{RUECK_STIL[eigeneAnwesenheit.rueckmeldung]?.label}</span>
                {eigeneAnwesenheit.rueckmeldung !== 'zugesagt' && <button onClick={()=>eigeneRueckmeldung('zugesagt')} className="btn btn-sm" style={{ background:'#e2efda', color:'#2d6b3a', border:'none' }}>✓ Zusagen</button>}
                {eigeneAnwesenheit.rueckmeldung !== 'abgesagt' && <button onClick={()=>eigeneRueckmeldung('abgesagt')} className="btn btn-sm btn-outline" style={{ color:'var(--red)' }}>✗ Absagen</button>}
                {eigeneAnwesenheit.abmelde_grund && <span style={{ fontSize:12, color:'var(--gray-400)' }}>Grund: {eigeneAnwesenheit.abmelde_grund}</span>}
              </div>
            )}
          </div>

          {isStaff && (
            <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
              <select value={einheit.status} onChange={e=>statusAendern(e.target.value)}
                style={{ fontSize:12, padding:'6px 10px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontWeight:600 }}>
                {Object.entries(STATUS_STIL).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={()=>setShowEditForm(!showEditForm)} className={`btn btn-sm ${showEditForm?'btn-primary':'btn-outline'}`}>✏️ Bearbeiten</button>
            </div>
          )}
        </div>

        {/* Edit Form */}
        {showEditForm && isStaff && (
          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--gray-200)' }}>
            <div className="form-row">
              <div className="form-group"><label>Titel</label><input value={editForm.titel||''} onChange={e=>setEditForm(p=>({...p,titel:e.target.value}))} /></div>
              <div className="form-group"><label>Typ</label>
                <select value={editForm.typ_id||''} onChange={e=>setEditForm(p=>({...p,typ_id:e.target.value}))}>
                  <option value="">Kein Typ</option>
                  {typen.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Datum</label><input type="date" value={editForm.datum||''} onChange={e=>setEditForm(p=>({...p,datum:e.target.value}))} /></div>
              <div className="form-group"><label>Treffzeit</label><input type="time" value={editForm.treffzeit||''} onChange={e=>setEditForm(p=>({...p,treffzeit:e.target.value}))} /></div>
              <div className="form-group"><label>Start</label><input type="time" value={editForm.uhrzeit_start||''} onChange={e=>setEditForm(p=>({...p,uhrzeit_start:e.target.value}))} /></div>
              <div className="form-group"><label>Ende</label><input type="time" value={editForm.uhrzeit_ende||''} onChange={e=>setEditForm(p=>({...p,uhrzeit_ende:e.target.value}))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Ort</label><input value={editForm.ort||''} onChange={e=>setEditForm(p=>({...p,ort:e.target.value}))} /></div>
            </div>
            <div className="form-group"><label>Trainingsziele</label><textarea value={editForm.ziele||''} onChange={e=>setEditForm(p=>({...p,ziele:e.target.value}))} rows={2} /></div>
            <div className="form-group"><label>Beschreibung</label><textarea value={editForm.beschreibung||''} onChange={e=>setEditForm(p=>({...p,beschreibung:e.target.value}))} rows={2} /></div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={editSpeichern} className="btn btn-primary btn-sm" disabled={saving}>{saving?'Speichern…':'Speichern'}</button>
              <button onClick={()=>setShowEditForm(false)} className="btn btn-outline btn-sm">Abbrechen</button>
            </div>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="tabs" style={{ marginBottom:16 }}>
        <button className={`tab-btn${tab==='info'?' active':''}`} onClick={()=>setTab('info')}>ℹ️ Info & Inhalte</button>
        <button className={`tab-btn${tab==='anwesenheit'?' active':''}`} onClick={()=>setTab('anwesenheit')}>
          👥 Anwesenheit ({zugesagt}✓ {abgesagt}✗)
        </button>
        {isStaff && <button className={`tab-btn${tab==='statistik'?' active':''}`} onClick={()=>setTab('statistik')}>📊 Auswertung</button>}
      </div>

      {/* TAB: INFO & INHALTE */}
      {tab==='info' && (
        <div>
          {isStaff && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
              <button onClick={()=>setShowInhaltForm(true)} className="btn btn-primary">+ Trainingsinhalt</button>
            </div>
          )}

          {showInhaltForm && isStaff && (
            <div className="card" style={{ marginBottom:16, borderLeft:'4px solid var(--navy)' }}>
              <h4 style={{ fontSize:14, color:'var(--navy)', marginBottom:14 }}>Neuer Trainingsinhalt</h4>
              <div className="form-row">
                <div className="form-group"><label>Block</label>
                  <select value={inhaltForm.block} onChange={e=>setInhaltForm(p=>({...p,block:e.target.value}))}>
                    {bloecke.map(b=><option key={b} value={b}>{BLOCK_LABEL[b]}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Dauer (Min.)</label><input type="number" value={inhaltForm.dauer_minuten} onChange={e=>setInhaltForm(p=>({...p,dauer_minuten:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Titel *</label><input value={inhaltForm.titel} onChange={e=>setInhaltForm(p=>({...p,titel:e.target.value}))} autoFocus placeholder="z.B. Passspiel 4-gegen-4" /></div>
              <div className="form-group"><label>Beschreibung / Anweisung</label><textarea value={inhaltForm.beschreibung} onChange={e=>setInhaltForm(p=>({...p,beschreibung:e.target.value}))} rows={3} /></div>
              <div className="form-group"><label>Material</label><input value={inhaltForm.material} onChange={e=>setInhaltForm(p=>({...p,material:e.target.value}))} placeholder="z.B. 6 Bälle, Hütchen" /></div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={inhaltSpeichern} className="btn btn-primary" disabled={saving}>{saving?'Speichern…':'Speichern'}</button>
                <button onClick={()=>setShowInhaltForm(false)} className="btn btn-outline">Abbrechen</button>
              </div>
            </div>
          )}

          {inhalte.length===0 ? (
            <div className="empty-state card"><p>Noch keine Trainingsinhalte geplant.</p></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {bloecke.map(b => {
                const block = inhaltNachBlock(b)
                if (!block.length) return null
                return (
                  <div key={b}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{BLOCK_LABEL[b]}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {block.map(i => (
                        <div key={i.id} className="card" style={{ padding:14, marginBottom:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div style={{ flex:1 }}>
                              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                                <span style={{ fontWeight:700, fontSize:14 }}>{i.titel}</span>
                                {i.dauer_minuten && <span style={{ fontSize:11, background:'var(--gray-100)', color:'var(--gray-600)', padding:'1px 8px', borderRadius:10 }}>⏱ {i.dauer_minuten} Min.</span>}
                              </div>
                              {i.beschreibung && <div style={{ fontSize:13, color:'var(--gray-600)', lineHeight:1.5, marginBottom:4 }}>{i.beschreibung}</div>}
                              {i.material && <div style={{ fontSize:12, color:'var(--gray-400)' }}>📦 {i.material}</div>}
                            </div>
                            {isStaff && <button onClick={async()=>{ await supabase.from('training_inhalte').delete().eq('id',i.id); load() }} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:16 }}>×</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: ANWESENHEIT */}
      {tab==='anwesenheit' && (
        <div>
          {/* KPI */}
          <div className="stats-row" style={{ marginBottom:16 }}>
            {[
              ['✓', 'Zugesagt',   zugesagt,   '#e2efda', '#2d6b3a'],
              ['✗', 'Abgesagt',   abgesagt,   '#fce4d6', '#8a3a1a'],
              ['?', 'Ausstehend', anwesenheit.filter(a=>a.rueckmeldung==='ausstehend').length, '#fff3cd', '#8a6a00'],
              ['👥','Erschienen', erschienen,  'var(--gray-100)', 'var(--navy)'],
            ].map(([i,l,w,bg,c])=>(
              <div key={l} className="stat-card" style={{ background:bg }}>
                <div style={{ fontSize:20 }}>{i}</div>
                <div className="stat-num" style={{ fontSize:22, color:c }}>{w}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {anwesenheit.map(a => {
              const sp = a.spieler
              if (!sp) return null
              const rs = RUECK_STIL[a.rueckmeldung] || RUECK_STIL.ausstehend
              return (
                <div key={a.id} className="card" style={{ padding:'10px 14px', marginBottom:0, display:'flex', alignItems:'center', gap:12 }}>
                  {/* Avatar */}
                  {sp.foto_url
                    ? <img src={sp.foto_url} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                    : <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:13, flexShrink:0 }}>{sp.vorname[0]}{sp.nachname[0]}</div>
                  }

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{sp.vorname} {sp.nachname}</div>
                    <div style={{ fontSize:11, color:'var(--gray-400)', display:'flex', gap:8 }}>
                      {sp.trikotnummer && <span>#{sp.trikotnummer}</span>}
                      {sp.position && <span>{sp.position}</span>}
                      {a.abmelde_grund && <span style={{ color:'var(--orange)' }}>Grund: {a.abmelde_grund}</span>}
                    </div>
                  </div>

                  {/* Rückmeldung Badge */}
                  <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, fontWeight:700, background:rs.bg, color:rs.text, flexShrink:0 }}>{rs.label}</span>

                  {/* Trainer: Erschienen setzen */}
                  {isStaff && (
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={()=>anwesenheitSetzen(a.id, true)}
                        style={{ width:32, height:32, borderRadius:6, border:`2px solid ${a.erschienen===true?'#3a8a5a':'var(--gray-300)'}`, background:a.erschienen===true?'#3a8a5a':'var(--white)', cursor:'pointer', fontSize:14, color:a.erschienen===true?'white':'var(--gray-400)' }}>
                        ✓
                      </button>
                      <button onClick={()=>anwesenheitSetzen(a.id, false)}
                        style={{ width:32, height:32, borderRadius:6, border:`2px solid ${a.erschienen===false?'#d94f4f':'var(--gray-300)'}`, background:a.erschienen===false?'#d94f4f':'var(--white)', cursor:'pointer', fontSize:14, color:a.erschienen===false?'white':'var(--gray-400)' }}>
                        ✗
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB: STATISTIK */}
      {tab==='statistik' && isStaff && (
        <div className="card">
          <div className="section-title" style={{ marginBottom:16 }}>Anwesenheitsauswertung</div>
          {quote !== null && (
            <div style={{ marginBottom:16, padding:'12px 16px', background:'var(--gray-100)', borderRadius:'var(--radius)', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ fontSize:36, fontWeight:900, color:'var(--navy)' }}>{quote}%</div>
              <div>
                <div style={{ fontWeight:600 }}>Erschienen-Quote</div>
                <div style={{ fontSize:13, color:'var(--gray-400)' }}>{erschienen} von {anwesenheit.filter(a=>a.erschienen!==null).length} erfassten Spielern</div>
              </div>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Spieler</th><th>Rückmeldung</th><th>Erschienen</th><th>Entschuldigt</th><th>Grund</th></tr></thead>
              <tbody>
                {anwesenheit.map(a=>{
                  const sp=a.spieler; if(!sp) return null
                  return (
                    <tr key={a.id}>
                      <td style={{ fontWeight:600 }}>{sp.vorname} {sp.nachname}</td>
                      <td><span style={{ fontSize:11, padding:'1px 8px', borderRadius:10, fontWeight:700, background:RUECK_STIL[a.rueckmeldung]?.bg, color:RUECK_STIL[a.rueckmeldung]?.text }}>{RUECK_STIL[a.rueckmeldung]?.label}</span></td>
                      <td>{a.erschienen===true?<span style={{ color:'var(--green)' }}>✓</span>:a.erschienen===false?<span style={{ color:'var(--red)' }}>✗</span>:'–'}</td>
                      <td>{a.entschuldigt?'✓':'–'}</td>
                      <td style={{ fontSize:12, color:'var(--gray-400)' }}>{a.abmelde_grund||'–'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MannschaftTraining() {
  return (
    <Routes>
      <Route index element={<TrainingsListe />} />
      <Route path=":id" element={<EinheitDetail />} />
    </Routes>
  )
}
