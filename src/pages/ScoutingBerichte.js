import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const EMPFEHLUNG = {
  sofort_verpflichten: { label:'🔥 Sofort verpflichten', farbe:'#d94f4f', bg:'#fce4d6' },
  verpflichten:        { label:'⭐ Verpflichten',         farbe:'#e07b30', bg:'#fff3e0' },
  beobachten:          { label:'👁 Weiter beobachten',   farbe:'#2d6fa3', bg:'#ddeaff' },
  nicht_geeignet:      { label:'✗ Nicht geeignet',       farbe:'#9a9590', bg:'var(--gray-100)' },
}

// ── BERICHT LISTE ─────────────────────────────────────────────
function BerichtListe() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [berichte, setBerichte]     = useState([])
  const [spieler, setSpieler]       = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [kontext, setKontext]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('')
  const [empfFilter, setEmpfFilter] = useState('')
  const [showForm, setShowForm]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: b }, { data: sp }, { data: mn }, { data: kt }] = await Promise.all([
      supabase.from('scouting_berichte')
        .select('*, kontext_typ:kontext_typ_id(name,icon), ziel_mannschaft:ziel_mannschaft_id(name), scout:scout_id(name)')
        .order('datum', { ascending: false }),
      supabase.from('spieler').select('id,vorname,nachname,trikotnummer,mannschaft_id').eq('aktiv', true).in('typ',['kader','scouting']).order('nachname'),
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('scouting_kontext_typen').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setBerichte(b||[]); setSpieler(sp||[]); setMannschaften(mn||[]); setKontext(kt||[])
    setLoading(false)
  }

  const gefiltert = berichte.filter(b=>{
    const matchFilter = !filter || (b.spieler_name||'').toLowerCase().includes(filter.toLowerCase()) || (b.aktueller_verein||'').toLowerCase().includes(filter.toLowerCase())
    const matchEmpf = !empfFilter || b.empfehlung===empfFilter
    return matchFilter && matchEmpf
  })

  return (
    <div>
      <div className="toolbar" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input placeholder="Spieler oder Verein suchen…" value={filter} onChange={e=>setFilter(e.target.value)} />
          </div>
          <select value={empfFilter} onChange={e=>setEmpfFilter(e.target.value)}
            style={{ padding:'6px 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13 }}>
            <option value="">Alle Empfehlungen</option>
            {Object.entries(EMPFEHLUNG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button onClick={()=>navigate('neu')} className="btn btn-primary">+ Scouting-Bericht</button>
      </div>

      {loading ? <div className="loading-center"><div className="spinner"/></div> : gefiltert.length===0 ? (
        <div className="empty-state card">
          <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
          <p style={{ fontWeight:600 }}>Noch keine Scouting-Berichte</p>
          <button onClick={()=>navigate('neu')} className="btn btn-primary" style={{ marginTop:12 }}>+ Ersten Bericht schreiben</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {gefiltert.map(b=>{
            const emp = EMPFEHLUNG[b.empfehlung]||EMPFEHLUNG.beobachten
            return (
              <div key={b.id} onClick={()=>navigate(b.id)}
                className="card" style={{ padding:16, marginBottom:0, cursor:'pointer', borderLeft:`4px solid ${emp.farbe}` }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-lg)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow)'}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>{b.spieler_name}</span>
                      {b.aktueller_verein && <span style={{ fontSize:12, color:'var(--gray-500)' }}>· {b.aktueller_verein}</span>}
                      {b.position && <span style={{ fontSize:11, background:'var(--gray-100)', color:'var(--gray-600)', padding:'1px 7px', borderRadius:10 }}>{b.position}</span>}
                    </div>
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:12, color:'var(--gray-500)' }}>
                      {b.kontext_typ && <span>{b.kontext_typ.icon} {b.kontext_typ.name}</span>}
                      <span>📅 {new Date(b.datum+'T00:00:00').toLocaleDateString('de-DE')}</span>
                      {b.ort && <span>📍 {b.ort}</span>}
                      {b.scout && <span>👤 {b.scout.name}</span>}
                      {b.ziel_mannschaft && <span>→ {b.ziel_mannschaft.name}</span>}
                    </div>
                    {b.zusammenfassung && <div style={{ fontSize:12, color:'var(--gray-600)', marginTop:6, lineHeight:1.4 }}>{b.zusammenfassung.slice(0,120)}{b.zusammenfassung.length>120?'…':''}</div>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700, background:emp.bg, color:emp.farbe }}>{emp.label}</span>
                    {b.gesamtnote && <span style={{ fontSize:20, fontWeight:900, color:parseFloat(b.gesamtnote)>=7?'var(--green)':parseFloat(b.gesamtnote)>=5?'#2d6fa3':'var(--orange)' }}>{parseFloat(b.gesamtnote).toFixed(1)}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── BERICHT FORMULAR ─────────────────────────────────────────
function BerichtFormular() {
  const navigate  = useNavigate()
  const { params } = useParams()
  const { profile } = useAuth()

  const [kategorien, setKategorien]   = useState([])
  const [kontext, setKontext]         = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [spieler, setSpieler]         = useState([])
  const [saving, setSaving]           = useState(false)

  const [form, setForm] = useState({
    spieler_id:'', spieler_name:'', aktueller_verein:'', position:'',
    kontext_typ_id:'', datum:new Date().toISOString().split('T')[0],
    ort:'', gegner:'', youtube_url:'', empfehlung:'beobachten',
    gesamtnote:'', zusammenfassung:'', staerken:'', schwaechen:'',
    intern_notiz:'', ziel_mannschaft_id:'',
  })
  const [bewertungen, setBewertungen] = useState({}) // kategorie_id → {note, text_bewertung}
  const [loading, setLoading]         = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: k }, { data: kt }, { data: mn }, { data: sp }] = await Promise.all([
      supabase.from('scouting_kategorien').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('scouting_kontext_typen').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('spieler').select('id,vorname,nachname,trikotnummer,aktueller_verein,position').eq('aktiv', true).in('typ',['kader','scouting']).order('nachname'),
    ])
    setKategorien(k||[]); setKontext(kt||[]); setMannschaften(mn||[]); setSpieler(sp||[])
    // Initial bewertungen
    const init = {}
    ;(k||[]).forEach(k=>{ init[k.id] = { note:'', text_bewertung:'' } })
    setBewertungen(init)
    setLoading(false)
  }

  function spielerGewaehlt(sp) {
    if (!sp) return
    const found = spieler.find(s=>s.id===sp)
    if (found) setForm(p=>({ ...p, spieler_id:found.id, spieler_name:`${found.vorname} ${found.nachname}`, aktueller_verein:found.aktueller_verein||p.aktueller_verein, position:found.position||p.position }))
  }

  async function speichern() {
    if (!form.spieler_name.trim()) return
    setSaving(true)
    const { data: bericht } = await supabase.from('scouting_berichte').insert({
      spieler_id: form.spieler_id||null,
      spieler_name: form.spieler_name,
      aktueller_verein: form.aktueller_verein||null,
      position: form.position||null,
      kontext_typ_id: form.kontext_typ_id||null,
      datum: form.datum,
      ort: form.ort||null,
      gegner: form.gegner||null,
      youtube_url: form.youtube_url||null,
      empfehlung: form.empfehlung,
      gesamtnote: form.gesamtnote ? parseFloat(form.gesamtnote) : null,
      zusammenfassung: form.zusammenfassung||null,
      staerken: form.staerken||null,
      schwaechen: form.schwaechen||null,
      intern_notiz: form.intern_notiz||null,
      ziel_mannschaft_id: form.ziel_mannschaft_id||null,
      scout_id: profile.id,
    }).select().single()

    if (bericht) {
      // Bewertungen speichern
      const bew = Object.entries(bewertungen)
        .filter(([,v])=>v.note||v.text_bewertung)
        .map(([k,v])=>({ bericht_id:bericht.id, kategorie_id:k, note:v.note?parseFloat(v.note):null, text_bewertung:v.text_bewertung||null }))
      if (bew.length) await supabase.from('scouting_bewertungen').insert(bew)
      navigate(`/mannschaft/scouting/bericht/${bericht.id}`)
    }
    setSaving(false)
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  const noteBtn = (katId, n) => {
    const sel = bewertungen[katId]?.note == n
    const farbe = n>=8?'#3a8a5a':n>=6?'#2d6fa3':n>=4?'#e07b30':'#d94f4f'
    return (
      <button key={n} type="button" onClick={()=>setBewertungen(p=>({...p,[katId]:{...p[katId],note:sel?'':n}}))}
        style={{ width:30, height:30, borderRadius:6, border:'2px solid', borderColor:sel?farbe:'var(--gray-200)', background:sel?farbe:'var(--white)', color:sel?'white':'var(--gray-600)', cursor:'pointer', fontWeight:700, fontSize:11 }}>
        {n}
      </button>
    )
  }

  return (
    <div>
      <button onClick={()=>navigate('/mannschaft/scouting')} className="back-btn">← Zurück</button>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* LINKE SEITE: Stammdaten */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="section-title" style={{ marginBottom:14 }}>👤 Spieler & Kontext</div>
            <div className="form-group">
              <label>Aus Kader wählen (optional)</label>
              <select onChange={e=>spielerGewaehlt(e.target.value)}>
                <option value="">– Oder manuell eingeben –</option>
                {spieler.map(sp=><option key={sp.id} value={sp.id}>{sp.vorname} {sp.nachname}{sp.aktueller_verein?` (${sp.aktueller_verein})`:''}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Spieler-Name *</label><input value={form.spieler_name} onChange={e=>setForm(p=>({...p,spieler_name:e.target.value}))} placeholder="Vor- und Nachname" /></div>
              <div className="form-group"><label>Position</label><input value={form.position} onChange={e=>setForm(p=>({...p,position:e.target.value}))} placeholder="z.B. Kreisläufer" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Aktueller Verein</label><input value={form.aktueller_verein} onChange={e=>setForm(p=>({...p,aktueller_verein:e.target.value}))} /></div>
              <div className="form-group"><label>Ziel-Mannschaft</label>
                <select value={form.ziel_mannschaft_id} onChange={e=>setForm(p=>({...p,ziel_mannschaft_id:e.target.value}))}>
                  <option value="">–</option>
                  {mannschaften.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ borderTop:'1px solid var(--gray-100)', paddingTop:12, marginTop:8 }}>
              <div className="form-row">
                <div className="form-group"><label>Kontext</label>
                  <select value={form.kontext_typ_id} onChange={e=>setForm(p=>({...p,kontext_typ_id:e.target.value}))}>
                    <option value="">Wählen…</option>
                    {kontext.map(k=><option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Datum</label><input type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Ort</label><input value={form.ort} onChange={e=>setForm(p=>({...p,ort:e.target.value}))} placeholder="Sportanlage, Halle…" /></div>
                <div className="form-group"><label>Gegner (bei Spiel)</label><input value={form.gegner} onChange={e=>setForm(p=>({...p,gegner:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>YouTube URL (optional)</label><input value={form.youtube_url} onChange={e=>setForm(p=>({...p,youtube_url:e.target.value}))} placeholder="Video-Referenz" /></div>
            </div>
          </div>

          {/* Empfehlung */}
          <div className="card" style={{ marginBottom:16 }}>
            <div className="section-title" style={{ marginBottom:12 }}>🎯 Empfehlung & Gesamtbewertung</div>
            <div className="form-group">
              <label>Empfehlung *</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {Object.entries(EMPFEHLUNG).map(([k,v])=>(
                  <button key={k} type="button" onClick={()=>setForm(p=>({...p,empfehlung:k}))}
                    style={{ padding:'8px 12px', borderRadius:'var(--radius)', border:`2px solid ${form.empfehlung===k?v.farbe:'var(--gray-200)'}`, background:form.empfehlung===k?v.bg:'var(--white)', color:form.empfehlung===k?v.farbe:'var(--gray-600)', cursor:'pointer', fontWeight:form.empfehlung===k?700:400, fontSize:12 }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Gesamtnote (1–10)</label>
              <div style={{ display:'flex', gap:4 }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n=>{
                  const sel = form.gesamtnote==n
                  const f = n>=8?'#3a8a5a':n>=6?'#2d6fa3':n>=4?'#e07b30':'#d94f4f'
                  return <button key={n} type="button" onClick={()=>setForm(p=>({...p,gesamtnote:sel?'':n}))} style={{ width:34, height:34, borderRadius:6, border:`2px solid ${sel?f:'var(--gray-200)'}`, background:sel?f:'var(--white)', color:sel?'white':'var(--gray-600)', cursor:'pointer', fontWeight:700, fontSize:13 }}>{n}</button>
                })}
              </div>
            </div>
            <div className="form-group"><label>Zusammenfassung</label><textarea value={form.zusammenfassung} onChange={e=>setForm(p=>({...p,zusammenfassung:e.target.value}))} rows={3} placeholder="Kurze Gesamteinschätzung des Spielers…" /></div>
            <div className="form-group"><label>💚 Stärken</label><textarea value={form.staerken} onChange={e=>setForm(p=>({...p,staerken:e.target.value}))} rows={2} /></div>
            <div className="form-group"><label>📈 Entwicklungsfelder</label><textarea value={form.schwaechen} onChange={e=>setForm(p=>({...p,schwaechen:e.target.value}))} rows={2} /></div>
            <div className="form-group"><label>🔒 Interne Notiz (nur Trainer)</label><textarea value={form.intern_notiz} onChange={e=>setForm(p=>({...p,intern_notiz:e.target.value}))} rows={2} /></div>
          </div>
        </div>

        {/* RECHTE SEITE: Kategorien-Bewertungen */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="section-title" style={{ marginBottom:14 }}>📊 Kategorie-Bewertungen</div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {kategorien.map(k=>(
                <div key={k.id} style={{ padding:'12px 14px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)', marginBottom:6 }}>{k.name}</div>
                  {k.beschreibung && <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:8 }}>{k.beschreibung}</div>}
                  {(k.bewertungstyp==='note'||k.bewertungstyp==='note_und_text') && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:k.bewertungstyp==='note_und_text'?8:0 }}>
                      {Array.from({length:(k.max_wert||10)-(k.min_wert||1)+1},(_,i)=>(k.min_wert||1)+i).map(n=>noteBtn(k.id,n))}
                    </div>
                  )}
                  {(k.bewertungstyp==='text'||k.bewertungstyp==='note_und_text') && (
                    <textarea
                      value={bewertungen[k.id]?.text_bewertung||''}
                      onChange={e=>setBewertungen(p=>({...p,[k.id]:{...p[k.id],text_bewertung:e.target.value}}))}
                      rows={2} placeholder="Freitext-Bewertung…"
                      style={{ width:'100%', resize:'vertical', padding:'6px 10px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:12, boxSizing:'border-box' }}
                    />
                  )}
                  {k.bewertungstyp==='ja_nein' && (
                    <div style={{ display:'flex', gap:8 }}>
                      {[true,false].map(v=>(
                        <button key={String(v)} type="button" onClick={()=>setBewertungen(p=>({...p,[k.id]:{...p[k.id],ja_nein:p[k.id]?.ja_nein===v?null:v}}))}
                          style={{ padding:'6px 16px', borderRadius:'var(--radius)', border:`2px solid ${bewertungen[k.id]?.ja_nein===v?(v?'var(--green)':'var(--red)'):'var(--gray-200)'}`, background:bewertungen[k.id]?.ja_nein===v?(v?'#e2efda':'#fce4d6'):'var(--white)', cursor:'pointer', fontWeight:700, fontSize:13, color:bewertungen[k.id]?.ja_nein===v?(v?'var(--green)':'var(--red)'):'var(--gray-500)' }}>
                          {v?'Ja':'Nein'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>navigate('/mannschaft/scouting')} className="btn btn-outline" style={{ flex:1 }}>Abbrechen</button>
            <button onClick={speichern} className="btn btn-primary" style={{ flex:2 }} disabled={saving||!form.spieler_name.trim()}>{saving?'Speichern…':'Bericht speichern'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── BERICHT DETAIL ────────────────────────────────────────────
function BerichtDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bericht, setBericht]     = useState(null)
  const [bewertungen, setBewertungen] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: b }, { data: bw }] = await Promise.all([
      supabase.from('scouting_berichte').select('*, kontext_typ:kontext_typ_id(name,icon), ziel_mannschaft:ziel_mannschaft_id(name), scout:scout_id(name)').eq('id', id).single(),
      supabase.from('scouting_bewertungen').select('*, kategorie:kategorie_id(name,beschreibung,bewertungstyp,min_wert,max_wert)').eq('bericht_id', id).order('kategorie(reihenfolge)'),
    ])
    setBericht(b); setBewertungen(bw||[])
    setLoading(false)
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!bericht) return null

  const emp = EMPFEHLUNG[bericht.empfehlung]||EMPFEHLUNG.beobachten

  return (
    <div>
      <button onClick={()=>navigate('/mannschaft/scouting')} className="back-btn">← Alle Berichte</button>

      {/* Header */}
      <div className="card" style={{ marginBottom:16, borderLeft:`6px solid ${emp.farbe}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
              <h2 style={{ fontSize:22, color:'var(--navy)', margin:0, fontFamily:'"DM Serif Display",serif' }}>{bericht.spieler_name}</h2>
              {bericht.position && <span style={{ fontSize:12, background:'var(--gray-100)', color:'var(--gray-600)', padding:'2px 8px', borderRadius:10 }}>{bericht.position}</span>}
              {bericht.aktueller_verein && <span style={{ fontSize:13, color:'var(--gray-500)' }}>· {bericht.aktueller_verein}</span>}
            </div>
            <div style={{ fontSize:13, color:'var(--gray-500)', display:'flex', gap:14, flexWrap:'wrap' }}>
              {bericht.kontext_typ && <span>{bericht.kontext_typ.icon} {bericht.kontext_typ.name}</span>}
              <span>📅 {new Date(bericht.datum+'T00:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
              {bericht.ort && <span>📍 {bericht.ort}</span>}
              {bericht.gegner && <span>vs. {bericht.gegner}</span>}
              {bericht.scout && <span>Scout: {bericht.scout.name}</span>}
              {bericht.ziel_mannschaft && <span style={{ fontWeight:600, color:'var(--navy)' }}>→ {bericht.ziel_mannschaft.name}</span>}
            </div>
          </div>
          <div style={{ textAlign:'center', flexShrink:0 }}>
            <div style={{ fontSize:36, fontWeight:900, color:bericht.gesamtnote>=8?'var(--green)':bericht.gesamtnote>=6?'#2d6fa3':'var(--orange)' }}>
              {bericht.gesamtnote ? parseFloat(bericht.gesamtnote).toFixed(1) : '–'}
            </div>
            <div style={{ fontSize:11, color:'var(--gray-400)' }}>Gesamtnote</div>
            <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700, background:emp.bg, color:emp.farbe, display:'block', marginTop:6 }}>{emp.label}</span>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Linke Seite */}
        <div>
          {bericht.zusammenfassung && (
            <div className="card" style={{ marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)', marginBottom:8 }}>📝 Zusammenfassung</div>
              <div style={{ fontSize:13, lineHeight:1.6, color:'var(--text)', whiteSpace:'pre-wrap' }}>{bericht.zusammenfassung}</div>
            </div>
          )}
          {(bericht.staerken||bericht.schwaechen) && (
            <div className="card" style={{ marginBottom:12 }}>
              {bericht.staerken && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--green)', marginBottom:6 }}>💚 Stärken</div>
                  <div style={{ fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{bericht.staerken}</div>
                </div>
              )}
              {bericht.schwaechen && (
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--orange)', marginBottom:6 }}>📈 Entwicklungsfelder</div>
                  <div style={{ fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{bericht.schwaechen}</div>
                </div>
              )}
            </div>
          )}
          {bericht.intern_notiz && (
            <div className="card" style={{ background:'#fffdf0', border:'1px solid var(--gold)' }}>
              <div style={{ fontWeight:700, fontSize:12, color:'var(--gold)', marginBottom:6 }}>🔒 Interne Notiz</div>
              <div style={{ fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{bericht.intern_notiz}</div>
            </div>
          )}
          {bericht.youtube_url && (
            <div className="card" style={{ marginTop:12 }}>
              <a href={bericht.youtube_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ display:'block', textAlign:'center' }}>▶ Video ansehen</a>
            </div>
          )}
        </div>

        {/* Rechte Seite: Kategorie-Bewertungen */}
        <div>
          {bewertungen.length>0 && (
            <div className="card">
              <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)', marginBottom:12 }}>📊 Kategorie-Bewertungen</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {bewertungen.map(bw=>{
                  const k = bw.kategorie
                  return (
                    <div key={bw.id} style={{ padding:'10px 12px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:bw.text_bewertung?6:0 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{k.name}</div>
                        {bw.note!=null && (
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            {/* Note als Balken */}
                            <div style={{ width:80, height:6, background:'var(--gray-200)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ width:`${(bw.note/(k.max_wert||10))*100}%`, height:'100%', background:bw.note>=8?'var(--green)':bw.note>=6?'#2d6fa3':bw.note>=4?'var(--orange)':'var(--red)', borderRadius:3 }}/>
                            </div>
                            <span style={{ fontWeight:900, fontSize:15, color:bw.note>=8?'var(--green)':bw.note>=6?'#2d6fa3':bw.note>=4?'var(--orange)':'var(--red)', minWidth:24, textAlign:'right' }}>{bw.note}</span>
                          </div>
                        )}
                        {bw.ja_nein!=null && <span style={{ fontWeight:700, color:bw.ja_nein?'var(--green)':'var(--red)' }}>{bw.ja_nein?'Ja':'Nein'}</span>}
                      </div>
                      {bw.text_bewertung && <div style={{ fontSize:12, color:'var(--gray-600)', lineHeight:1.5 }}>{bw.text_bewertung}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ScoutingBerichte() {
  return (
    <Routes>
      <Route index element={<BerichtListe />} />
      <Route path="neu" element={<BerichtFormular />} />
      <Route path="bericht/:id" element={<BerichtDetail />} />
    </Routes>
  )
}
