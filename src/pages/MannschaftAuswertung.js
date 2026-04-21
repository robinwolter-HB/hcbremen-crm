import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// ── HILFSFUNKTIONEN ──────────────────────────────────────────
function NoteCircle({ note, size = 44 }) {
  if (!note) return <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--gray-100)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.28, color:'var(--gray-400)' }}>–</div>
  const n = parseFloat(note)
  const farbe = n >= 8 ? '#3a8a5a' : n >= 6 ? '#2d6fa3' : n >= 4 ? '#e07b30' : '#d94f4f'
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:farbe+'22', border:`2.5px solid ${farbe}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.3, fontWeight:900, color:farbe }}>
      {n.toFixed(1)}
    </div>
  )
}

function TrendBadge({ werte }) {
  if (!werte || werte.length < 2) return null
  const letzt = werte.slice(-3)
  const trend = letzt[letzt.length-1] - letzt[0]
  if (Math.abs(trend) < 0.3) return <span style={{ fontSize:11, color:'var(--gray-400)' }}>→</span>
  return <span style={{ fontSize:13, color: trend > 0 ? 'var(--green)' : 'var(--red)' }}>{trend > 0 ? '↗' : '↘'}</span>
}

// Mini Sparkline SVG
function Sparkline({ werte, breite=80, hoehe=28 }) {
  if (!werte || werte.length < 2) return null
  const min = 1, max = 10
  const pts = werte.map((v,i) => {
    const x = (i/(werte.length-1))*(breite-6)+3
    const y = hoehe-3 - ((v-min)/(max-min))*(hoehe-6)
    return `${x},${y}`
  }).join(' ')
  const letzt = werte[werte.length-1]
  const farbe = letzt >= 8 ? '#3a8a5a' : letzt >= 6 ? '#2d6fa3' : letzt >= 4 ? '#e07b30' : '#d94f4f'
  return (
    <svg width={breite} height={hoehe} style={{ display:'block' }}>
      <polyline points={pts} fill="none" stroke={farbe} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {werte.map((v,i) => {
        const x = (i/(werte.length-1))*(breite-6)+3
        const y = hoehe-3 - ((v-min)/(max-min))*(hoehe-6)
        return <circle key={i} cx={x} cy={y} r={i===werte.length-1?3:1.5} fill={farbe}/>
      })}
    </svg>
  )
}

// ── BEWERTUNGS-MODAL ─────────────────────────────────────────
function BewertungsModal({ spieler, kontext, onSave, onClose }) {
  // kontext: { typ: 'training'|'spiel', id, datum, label }
  const { profile } = useAuth()
  const [form, setForm] = useState({
    note_gesamt:'', note_einsatz:'', note_technik:'',
    note_taktik:'', note_fitness:'', note_mental:'',
    staerken:'', schwaechen:'', notiz:'', intern_notiz:'',
  })
  const [saving, setSaving] = useState(false)

  // Vorhandene Bewertung laden falls schon bewertet
  useEffect(() => {
    async function load() {
      const query = supabase.from('spieler_bewertungen')
        .select('*').eq('spieler_id', spieler.id)
      if (kontext.typ === 'training') query.eq('einheit_id', kontext.id)
      else query.eq('spiel_id', kontext.id)
      const { data } = await query.maybeSingle()
      if (data) setForm({
        note_gesamt: data.note_gesamt||'', note_einsatz: data.note_einsatz||'',
        note_technik: data.note_technik||'', note_taktik: data.note_taktik||'',
        note_fitness: data.note_fitness||'', note_mental: data.note_mental||'',
        staerken: data.staerken||'', schwaechen: data.schwaechen||'',
        notiz: data.notiz||'', intern_notiz: data.intern_notiz||'',
        _id: data.id,
      })
    }
    load()
  }, [spieler.id, kontext.id])

  async function speichern() {
    setSaving(true)
    const payload = {
      spieler_id: spieler.id,
      datum: kontext.datum,
      einheit_id: kontext.typ==='training' ? kontext.id : null,
      spiel_id:   kontext.typ==='spiel'    ? kontext.id : null,
      bewertet_von: profile.id,
      note_gesamt:  form.note_gesamt  ? parseFloat(form.note_gesamt)  : null,
      note_einsatz: form.note_einsatz ? parseFloat(form.note_einsatz) : null,
      note_technik: form.note_technik ? parseFloat(form.note_technik) : null,
      note_taktik:  form.note_taktik  ? parseFloat(form.note_taktik)  : null,
      note_fitness: form.note_fitness ? parseFloat(form.note_fitness) : null,
      note_mental:  form.note_mental  ? parseFloat(form.note_mental)  : null,
      staerken:     form.staerken  || null,
      schwaechen:   form.schwaechen|| null,
      notiz:        form.notiz     || null,
      intern_notiz: form.intern_notiz || null,
    }
    if (form._id) {
      await supabase.from('spieler_bewertungen').update(payload).eq('id', form._id)
    } else {
      await supabase.from('spieler_bewertungen').insert(payload)
    }
    setSaving(false); onSave(); onClose()
  }

  const noteInput = (field, label) => (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n=>(
          <button key={n} type="button" onClick={()=>setForm(p=>({...p,[field]:n}))}
            style={{ width:32, height:32, borderRadius:6, border:'2px solid',
              borderColor: form[field]==n ? (n>=8?'#3a8a5a':n>=6?'#2d6fa3':n>=4?'#e07b30':'#d94f4f') : 'var(--gray-200)',
              background:  form[field]==n ? (n>=8?'#3a8a5a':n>=6?'#2d6fa3':n>=4?'#e07b30':'#d94f4f') : 'var(--white)',
              color: form[field]==n ? 'white' : 'var(--gray-600)',
              cursor:'pointer', fontWeight:700, fontSize:12 }}>
            {n}
          </button>
        ))}
        {form[field] && <button type="button" onClick={()=>setForm(p=>({...p,[field]:''}))} style={{ background:'none',border:'none',color:'var(--gray-300)',cursor:'pointer',fontSize:16 }}>×</button>}
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:580 }}>
        <div className="modal-header">
          <span className="modal-title">
            Bewertung: #{spieler.trikotnummer} {spieler.vorname} {spieler.nachname}
          </span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize:12, color:'var(--gray-400)', marginBottom:14 }}>
            {kontext.typ==='training'?'🏃 Training':'🎯 Spiel'}: {kontext.label} · {new Date(kontext.datum+'T00:00:00').toLocaleDateString('de-DE')}
          </div>

          {noteInput('note_gesamt',  '⭐ Gesamtnote')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>{noteInput('note_einsatz', '💪 Einsatz')}</div>
            <div>{noteInput('note_technik', '🎯 Technik')}</div>
            <div>{noteInput('note_taktik',  '🧠 Taktik')}</div>
            <div>{noteInput('note_fitness', '🏃 Fitness')}</div>
            <div>{noteInput('note_mental',  '🧘 Mental')}</div>
          </div>

          <div className="form-group"><label>💚 Stärken</label><textarea value={form.staerken} onChange={e=>setForm(p=>({...p,staerken:e.target.value}))} rows={2} placeholder="Was hat gut funktioniert?" /></div>
          <div className="form-group"><label>📈 Entwicklungsfelder</label><textarea value={form.schwaechen} onChange={e=>setForm(p=>({...p,schwaechen:e.target.value}))} rows={2} placeholder="Woran soll gearbeitet werden?" /></div>
          <div className="form-group"><label>📝 Notiz (für Spieler sichtbar)</label><textarea value={form.notiz} onChange={e=>setForm(p=>({...p,notiz:e.target.value}))} rows={2} /></div>
          <div className="form-group"><label>🔒 Interne Notiz (nur Trainer)</label><textarea value={form.intern_notiz} onChange={e=>setForm(p=>({...p,intern_notiz:e.target.value}))} rows={2} /></div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Abbrechen</button>
          <button onClick={speichern} className="btn btn-primary" disabled={saving}>{saving?'Speichern…':'Bewertung speichern'}</button>
        </div>
      </div>
    </div>
  )
}

// ── SCHNELL-BEWERTUNG (alle Spieler einer Einheit) ────────────
function SchnellBewertung({ einheitId, einheitLabel, datum, spieler, onClose, onSaved }) {
  const { profile } = useAuth()
  const [noten, setNoten] = useState({}) // spielerId → note_gesamt
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Vorhandene laden
    supabase.from('spieler_bewertungen').select('spieler_id,note_gesamt').eq('einheit_id', einheitId).then(({data}) => {
      if (data) {
        const n = {}; data.forEach(b => { n[b.spieler_id] = b.note_gesamt }); setNoten(n)
      }
    })
  }, [einheitId])

  async function speichern() {
    setSaving(true)
    for (const sp of spieler) {
      if (!noten[sp.id]) continue
      const { data: existing } = await supabase.from('spieler_bewertungen').select('id').eq('spieler_id',sp.id).eq('einheit_id',einheitId).maybeSingle()
      if (existing) {
        await supabase.from('spieler_bewertungen').update({ note_gesamt: noten[sp.id], datum, bewertet_von: profile.id }).eq('id', existing.id)
      } else {
        await supabase.from('spieler_bewertungen').insert({ spieler_id:sp.id, einheit_id:einheitId, datum, note_gesamt:noten[sp.id], bewertet_von:profile.id })
      }
    }
    setSaving(false); onSaved(); onClose()
  }

  const farbe = (n) => !n ? 'var(--gray-200)' : n>=8?'#3a8a5a':n>=6?'#2d6fa3':n>=4?'#e07b30':'#d94f4f'

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:600 }}>
        <div className="modal-header">
          <span className="modal-title">⚡ Schnellbewertung: {einheitLabel}</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize:12, color:'var(--gray-400)', marginBottom:16 }}>Gesamtnote pro Spieler — für Detailbewertung einzeln öffnen.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto' }}>
            {spieler.map(sp=>(
              <div key={sp.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:13, fontFamily:'monospace', flexShrink:0 }}>#{sp.trikotnummer||'?'}</div>
                <div style={{ flex:1, fontWeight:600, fontSize:13 }}>{sp.vorname} {sp.nachname}<div style={{ fontSize:11, color:'var(--gray-400)' }}>{sp.position}</div></div>
                <div style={{ display:'flex', gap:4 }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                    <button key={n} onClick={()=>setNoten(p=>({...p,[sp.id]: p[sp.id]===n ? null : n}))}
                      style={{ width:28, height:28, borderRadius:5, border:'none', background: noten[sp.id]===n ? farbe(n) : 'var(--white)', color: noten[sp.id]===n ? 'white' : 'var(--gray-400)', cursor:'pointer', fontWeight:700, fontSize:11, boxShadow:'var(--shadow)' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Abbrechen</button>
          <button onClick={speichern} className="btn btn-gold" disabled={saving}>{saving?'Speichern…':'Bewertungen speichern'}</button>
        </div>
      </div>
    </div>
  )
}

// ── HAUPTKOMPONENTE ──────────────────────────────────────────
export default function MannschaftAuswertung() {
  const { profile } = useAuth()
  const isStaff = profile?.rolle==='admin' || (profile?.bereiche||[]).includes('mannschaft')
  const isSpieler = profile?.rolle==='spieler'

  const [aktiveSektion, setAktiveSektion] = useState('uebersicht')
  const [mannschaften, setMannschaften]   = useState([])
  const [saisons, setSaisons]             = useState([])
  const [aktiveMn, setAktiveMn]           = useState('')
  const [aktiveSaison, setAktiveSaison]   = useState('')
  const [loading, setLoading]             = useState(true)

  // Daten
  const [spiele, setSpiele]               = useState([])
  const [ereignisse, setEreignisse]       = useState([])
  const [spieler, setSpieler]             = useState([])
  const [bewertungen, setBewertungen]     = useState([])
  const [einheiten, setEinheiten]         = useState([])
  const [anwesenheit, setAnwesenheit]     = useState([])

  // Modals
  const [showBewertung, setShowBewertung]         = useState(null)   // { spieler, kontext }
  const [showSchnell, setShowSchnell]             = useState(null)   // { einheitId, label, datum }

  useEffect(() => { loadMeta() }, [])

  async function loadMeta() {
    const [{ data: mn }, { data: sa }] = await Promise.all([
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('saisons').select('*').order('name'),
    ])
    setMannschaften(mn||[]); setSaisons(sa||[])
    const mnId = mn?.[0]?.id||''
    const saId = sa?.find(s=>s.aktiv)?.id || sa?.[0]?.id || ''
    setAktiveMn(mnId); setAktiveSaison(saId)
    if (mnId) await loadDaten(mnId, saId)
    setLoading(false)
  }

  async function loadDaten(mnId, saId) {
    setLoading(true)
    const [{ data: sp }, { data: spiele_d }, { data: bew }, { data: ein }, { data: anw }] = await Promise.all([
      supabase.from('spieler').select('id,vorname,nachname,trikotnummer,position,foto_url,status').eq('mannschaft_id', mnId).eq('aktiv',true).eq('typ','kader').order('nachname'),
      supabase.from('spiele').select('*').eq('mannschaft_id', mnId).eq('saison_id', saId||'00000000-0000-0000-0000-000000000000').order('datum'),
      supabase.from('spieler_bewertungen').select('*').in('spieler_id', (await supabase.from('spieler').select('id').eq('mannschaft_id',mnId).eq('aktiv',true)).data?.map(s=>s.id)||[]).order('datum', { ascending:false }),
      supabase.from('trainingseinheiten').select('id,titel,datum,typ:typ_id(name,farbe)').eq('mannschaft_id', mnId).order('datum', { ascending:false }).limit(20),
      supabase.from('training_anwesenheit').select('*').in('einheit_id', (await supabase.from('trainingseinheiten').select('id').eq('mannschaft_id',mnId)).data?.map(e=>e.id)||[]),
    ])
    setSpieler(sp||[]); setSpiele(spiele_d||[]); setBewertungen(bew||[]); setEinheiten(ein||[]); setAnwesenheit(anw||[])

    // Ereignisse für alle Spiele
    const spielIds = (spiele_d||[]).map(s=>s.id)
    if (spielIds.length) {
      const { data: eig } = await supabase.from('spiel_ereignisse').select('*').in('spiel_id', spielIds)
      setEreignisse(eig||[])
    } else setEreignisse([])

    setLoading(false)
  }

  async function mnWechsel(id) { setAktiveMn(id); await loadDaten(id, aktiveSaison) }
  async function saisonWechsel(id) { setAktiveSaison(id); await loadDaten(aktiveMn, id) }

  // ── BERECHNUNGEN ─────────────────────────────────────────
  const siege = spiele.filter(s=>s.status==='beendet'&&s.endstand_eigene>s.endstand_gegner).length
  const niederlagen = spiele.filter(s=>s.status==='beendet'&&s.endstand_eigene<s.endstand_gegner).length
  const unentschieden = spiele.filter(s=>s.status==='beendet'&&s.endstand_eigene===s.endstand_gegner).length
  const gespielt = siege+niederlagen+unentschieden
  const tore_gesamt = spiele.reduce((a,s)=>a+(s.endstand_eigene||0),0)
  const gegentore_gesamt = spiele.reduce((a,s)=>a+(s.endstand_gegner||0),0)

  // Torschützenliste
  const torschuetzen = spieler.map(sp=>({
    ...sp,
    tore:    ereignisse.filter(e=>e.spieler_id===sp.id&&['tor','tor_7m'].includes(e.typ)).length,
    assists: ereignisse.filter(e=>e.assist_spieler_id===sp.id).length,
    paraden: ereignisse.filter(e=>e.spieler_id===sp.id&&['parade','parade_7m'].includes(e.typ)).length,
    fehlwuerfe: ereignisse.filter(e=>e.spieler_id===sp.id&&['fehlwurf','fehlwurf_7m'].includes(e.typ)).length,
    strafen: ereignisse.filter(e=>e.spieler_id===sp.id&&e.typ==='zeitstrafe_2min').length,
  })).sort((a,b)=>b.tore-a.tore)

  // Anwesenheitsquote pro Spieler
  const anwQuote = spieler.map(sp=>{
    const einh = anwesenheit.filter(a=>a.spieler_id===sp.id)
    const erschienen = einh.filter(a=>a.erschienen===true).length
    const gesamt = einh.filter(a=>a.erschienen!==null).length
    return { ...sp, quote: gesamt>0?Math.round(erschienen/gesamt*100):null, erschienen, gesamt }
  })

  // Bewertungen pro Spieler
  const spielerBewertungen = (sp) => bewertungen.filter(b=>b.spieler_id===sp.id)
  const schnittNote = (bew) => {
    const mit = bew.filter(b=>b.note_gesamt)
    return mit.length ? (mit.reduce((a,b)=>a+parseFloat(b.note_gesamt),0)/mit.length).toFixed(1) : null
  }

  // Spiele-Trend (letzte 5)
  const letzteSpiele = spiele.filter(s=>s.status==='beendet').slice(-5)

  return (
    <div>
      {/* Filter */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20, alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {mannschaften.map(m=>(
            <button key={m.id} onClick={()=>mnWechsel(m.id)}
              style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
                background:aktiveMn===m.id?(m.farbe||'var(--navy)'):'var(--gray-100)',
                color:aktiveMn===m.id?'white':'var(--gray-600)' }}>
              {m.name}
            </button>
          ))}
        </div>
        <select value={aktiveSaison} onChange={e=>saisonWechsel(e.target.value)}
          style={{ padding:'6px 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13, fontWeight:600 }}>
          <option value="">Alle Saisons</option>
          {saisons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Sektion Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20, borderBottom:'2px solid var(--gray-200)', paddingBottom:0 }}>
        {[
          ['uebersicht',  '📊 Übersicht'],
          ['spiele',      '🎯 Spiele'],
          ['spieler',     '👥 Spieler'],
          ['bewertungen', '⭐ Bewertungen'],
        ].map(([k,l])=>(
          <button key={k} onClick={()=>setAktiveSektion(k)}
            style={{ padding:'8px 16px', border:'none', borderBottom:`3px solid ${aktiveSektion===k?'var(--navy)':'transparent'}`, background:'none', cursor:'pointer', fontWeight:aktiveSektion===k?700:400, color:aktiveSektion===k?'var(--navy)':'var(--gray-500)', fontSize:14, marginBottom:-2 }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-center"><div className="spinner"/></div> : (

      <div>

      {/* ══ ÜBERSICHT ══ */}
      {aktiveSektion==='uebersicht' && (
        <div>
          {/* Saison-KPI */}
          <div className="stats-row" style={{ marginBottom:20 }}>
            {[
              ['🏆','Siege',siege,'var(--green)'],
              ['😐','Unentschieden',unentschieden,'var(--orange)'],
              ['❌','Niederlagen',niederlagen,'var(--red)'],
              ['⚽','Tore',tore_gesamt,'var(--navy)'],
              ['🔵','Gegentore',gegentore_gesamt,'#8b5cf6'],
              ['±','Differenz',(tore_gesamt-gegentore_gesamt>0?'+':'')+(tore_gesamt-gegentore_gesamt), tore_gesamt>=gegentore_gesamt?'var(--green)':'var(--red)'],
            ].map(([i,l,w,c])=>(
              <div key={l} className="stat-card">
                <div style={{ fontSize:18 }}>{i}</div>
                <div className="stat-num" style={{ fontSize:22, color:c }}>{w}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>

          {/* Siege-Quote */}
          {gespielt>0 && (
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div className="section-title" style={{ margin:0 }}>Saisonbilanz</div>
                <div style={{ fontWeight:900, fontSize:22, color:'var(--navy)' }}>{Math.round(siege/gespielt*100)}% Siegquote</div>
              </div>
              <div style={{ height:14, background:'var(--gray-100)', borderRadius:7, overflow:'hidden', display:'flex' }}>
                {siege>0 && <div style={{ width:`${siege/gespielt*100}%`, background:'var(--green)', transition:'width 0.5s' }}/>}
                {unentschieden>0 && <div style={{ width:`${unentschieden/gespielt*100}%`, background:'var(--orange)' }}/>}
                {niederlagen>0 && <div style={{ width:`${niederlagen/gespielt*100}%`, background:'var(--red)' }}/>}
              </div>
              <div style={{ display:'flex', gap:16, marginTop:8, fontSize:12 }}>
                <span style={{ color:'var(--green)' }}>■ {siege} Siege</span>
                <span style={{ color:'var(--orange)' }}>■ {unentschieden} Unentschieden</span>
                <span style={{ color:'var(--red)' }}>■ {niederlagen} Niederlagen</span>
              </div>
            </div>
          )}

          {/* Letzte 5 Spiele */}
          {letzteSpiele.length>0 && (
            <div className="card" style={{ marginBottom:16 }}>
              <div className="section-title" style={{ marginBottom:12 }}>Letzte Spiele</div>
              <div style={{ display:'flex', gap:8 }}>
                {letzteSpiele.map(s=>{
                  const gew = s.endstand_eigene>s.endstand_gegner
                  const ver = s.endstand_eigene<s.endstand_gegner
                  return (
                    <div key={s.id} style={{ flex:1, textAlign:'center', padding:'10px 6px', borderRadius:'var(--radius)', background:gew?'#e2efda':ver?'#fce4d6':'#fff3cd' }}>
                      <div style={{ fontWeight:900, fontSize:16, color:gew?'var(--green)':ver?'var(--red)':'var(--orange)' }}>{gew?'S':ver?'N':'U'}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--navy)' }}>{s.endstand_eigene}:{s.endstand_gegner}</div>
                      <div style={{ fontSize:10, color:'var(--gray-400)', marginTop:2 }}>{s.gegner.split(' ').slice(-1)[0]}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Anwesenheits-Übersicht */}
          <div className="card">
            <div className="section-title" style={{ marginBottom:12 }}>Trainings-Anwesenheit Top/Flop</div>
            {anwQuote.filter(s=>s.quote!==null).length===0
              ? <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Anwesenheitsdaten.</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {anwQuote.filter(s=>s.quote!==null).sort((a,b)=>b.quote-a.quote).slice(0,8).map(sp=>(
                    <div key={sp.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, fontSize:12, fontWeight:700, color:'var(--gray-400)', flexShrink:0 }}>#{sp.trikotnummer||'?'}</div>
                      <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{sp.vorname} {sp.nachname}</div>
                      <div style={{ width:140, height:8, background:'var(--gray-100)', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:`${sp.quote}%`, height:'100%', background:sp.quote>=80?'var(--green)':sp.quote>=60?'var(--orange)':'var(--red)', borderRadius:4, transition:'width 0.5s' }}/>
                      </div>
                      <div style={{ width:40, textAlign:'right', fontSize:13, fontWeight:700, color:sp.quote>=80?'var(--green)':sp.quote>=60?'var(--orange)':'var(--red)', flexShrink:0 }}>{sp.quote}%</div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* ══ SPIELE ══ */}
      {aktiveSektion==='spiele' && (
        <div>
          {spiele.filter(s=>s.status==='beendet').length===0
            ? <div className="empty-state card"><p>Noch keine abgeschlossenen Spiele in dieser Saison.</p></div>
            : (
            <div>
              {/* Torschützenliste */}
              <div className="card" style={{ marginBottom:16 }}>
                <div className="section-title" style={{ marginBottom:14 }}>🏆 Torschützenliste</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Spieler</th><th>Tore</th><th>Assists</th><th>Paraden</th><th>Fehlwürfe</th><th>2 Min.</th></tr></thead>
                    <tbody>
                      {torschuetzen.filter(s=>s.tore>0||s.assists>0||s.paraden>0).map((sp,i)=>(
                        <tr key={sp.id} style={{ background:i<3?'#fffdf0':'inherit' }}>
                          <td style={{ fontWeight:700, color:i<3?'var(--gold)':'var(--gray-400)', fontSize:15 }}>{i+1}</td>
                          <td style={{ fontWeight:600 }}>{sp.vorname} {sp.nachname}<div style={{ fontSize:11, color:'var(--gray-400)' }}>{sp.position}</div></td>
                          <td style={{ fontWeight:900, fontSize:16, color:'var(--green)' }}>{sp.tore||'–'}</td>
                          <td>{sp.assists||'–'}</td>
                          <td style={{ color:'#2d6fa3' }}>{sp.paraden||'–'}</td>
                          <td style={{ color:sp.fehlwuerfe>3?'var(--orange)':'inherit' }}>{sp.fehlwuerfe||'–'}</td>
                          <td style={{ color:sp.strafen>0?'var(--red)':'inherit' }}>{sp.strafen||'–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Spiele-Tabelle */}
              <div className="card">
                <div className="section-title" style={{ marginBottom:14 }}>Alle Spiele</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Datum</th><th>Gegner</th><th>H/A</th><th>Ergebnis</th><th></th></tr></thead>
                    <tbody>
                      {[...spiele].sort((a,b)=>b.datum.localeCompare(a.datum)).map(s=>{
                        const gew=s.endstand_eigene>s.endstand_gegner, ver=s.endstand_eigene<s.endstand_gegner
                        return (
                          <tr key={s.id}>
                            <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{new Date(s.datum+'T00:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}</td>
                            <td style={{ fontWeight:600 }}>{s.gegner}</td>
                            <td style={{ fontSize:12 }}>{s.heim_auswaerts==='heim'?'🏠':s.heim_auswaerts==='auswaerts'?'✈️':'⚖️'}</td>
                            <td>
                              {s.status==='beendet'
                                ? <span style={{ fontWeight:900, fontSize:14, color:gew?'var(--green)':ver?'var(--red)':'var(--orange)' }}>{s.endstand_eigene}:{s.endstand_gegner}</span>
                                : <span style={{ fontSize:12, color:'var(--gray-400)' }}>{s.status}</span>
                              }
                            </td>
                            <td>{s.status==='beendet' && <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, background:gew?'#e2efda':ver?'#fce4d6':'#fff3cd', color:gew?'var(--green)':ver?'var(--red)':'var(--orange)' }}>{gew?'SIEG':ver?'NIEDERLAGE':'UNENTSCHIEDEN'}</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ SPIELER ══ */}
      {aktiveSektion==='spieler' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
            {spieler.map(sp=>{
              const bew = spielerBewertungen(sp)
              const schnitt = schnittNote(bew)
              const notenVerlauf = bew.filter(b=>b.note_gesamt).map(b=>parseFloat(b.note_gesamt)).reverse()
              const anw = anwQuote.find(a=>a.id===sp.id)
              const spTore = torschuetzen.find(t=>t.id===sp.id)
              return (
                <div key={sp.id} className="card" style={{ padding:16, marginBottom:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                    {sp.foto_url
                      ? <img src={sp.foto_url} alt="" style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                      : <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:15, fontFamily:'monospace', flexShrink:0 }}>#{sp.trikotnummer||'?'}</div>
                    }
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{sp.vorname} {sp.nachname}</div>
                      <div style={{ fontSize:12, color:'var(--gray-400)' }}>{sp.position}</div>
                    </div>
                    <NoteCircle note={schnitt} size={42}/>
                  </div>

                  {/* Mini Stats */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:10 }}>
                    {[
                      ['⚽',spTore?.tore||0,'Tore'],
                      ['🎯',spTore?.assists||0,'Assists'],
                      [anw?.quote!=null?`${anw.quote}%`:'–','','Anwesenheit'],
                    ].map(([w,_,l],i)=>(
                      <div key={l} style={{ textAlign:'center', padding:'6px 4px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>{i<2?w:w}</div>
                        <div style={{ fontSize:10, color:'var(--gray-400)' }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Sparkline */}
                  {notenVerlauf.length>1 && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <span style={{ fontSize:11, color:'var(--gray-400)' }}>Note-Trend</span>
                      <Sparkline werte={notenVerlauf}/>
                      <TrendBadge werte={notenVerlauf}/>
                    </div>
                  )}

                  {/* Letzte Bewertung */}
                  {bew.length>0 && (
                    <div style={{ fontSize:11, color:'var(--gray-500)', borderTop:'1px solid var(--gray-100)', paddingTop:8, marginTop:4 }}>
                      Letzte Bewertung: {new Date(bew[0].datum+'T00:00:00').toLocaleDateString('de-DE')}
                      {bew[0].staerken && <div style={{ marginTop:3 }}>💚 {bew[0].staerken.slice(0,60)}{bew[0].staerken.length>60?'…':''}</div>}
                    </div>
                  )}

                  {isStaff && (
                    <button onClick={()=>setShowBewertung({ spieler:sp, kontext:{ typ:'spiel', id:null, datum:new Date().toISOString().split('T')[0], label:'Freitext' } })}
                      className="btn btn-sm btn-outline" style={{ width:'100%', marginTop:10, fontSize:11 }}>
                      + Bewertung hinzufügen
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ BEWERTUNGEN ══ */}
      {aktiveSektion==='bewertungen' && (
        <div>
          {/* Schnellbewertung nach Training */}
          {isStaff && einheiten.length>0 && (
            <div className="card" style={{ marginBottom:16 }}>
              <div className="section-title" style={{ marginBottom:12 }}>⚡ Schnellbewertung nach Training</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {einheiten.slice(0,8).map(e=>{
                  const bew = bewertungen.filter(b=>b.einheit_id===e.id)
                  const bewertet = bew.length
                  return (
                    <div key={e.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)' }}>
                      {e.typ && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:700, background:(e.typ.farbe||'#ccc')+'22', color:e.typ.farbe||'var(--navy)' }}>{e.typ.name}</span>}
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{e.titel}</div>
                        <div style={{ fontSize:12, color:'var(--gray-400)' }}>{new Date(e.datum+'T00:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})}</div>
                      </div>
                      {bewertet>0 && <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✓ {bewertet} bewertet</span>}
                      <button onClick={()=>setShowSchnell({ einheitId:e.id, label:e.titel, datum:e.datum })} className="btn btn-sm btn-outline">⚡ Bewerten</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bewertungs-Tabelle */}
          <div className="card">
            <div className="section-title" style={{ marginBottom:14 }}>Alle Bewertungen</div>
            {bewertungen.length===0
              ? <div className="empty-state"><p>Noch keine Bewertungen.</p></div>
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Datum</th><th>Spieler</th><th>Kontext</th><th>Gesamt</th><th>Einsatz</th><th>Technik</th><th>Taktik</th><th>Fitness</th><th>Mental</th></tr>
                    </thead>
                    <tbody>
                      {bewertungen.slice(0,30).map(b=>{
                        const sp = spieler.find(s=>s.id===b.spieler_id)
                        if (!sp) return null
                        const note = (n) => n ? <span style={{ fontWeight:700, color:n>=8?'var(--green)':n>=6?'#2d6fa3':n>=4?'var(--orange)':'var(--red)' }}>{n}</span> : <span style={{ color:'var(--gray-300)' }}>–</span>
                        return (
                          <tr key={b.id}>
                            <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{new Date(b.datum+'T00:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}</td>
                            <td style={{ fontWeight:600 }}>{sp.vorname?.[0]}. {sp.nachname}</td>
                            <td style={{ fontSize:11, color:'var(--gray-400)' }}>{b.einheit_id?'🏃 Training':b.spiel_id?'🎯 Spiel':'✍️ Freitext'}</td>
                            <td>{note(b.note_gesamt)}</td>
                            <td>{note(b.note_einsatz)}</td>
                            <td>{note(b.note_technik)}</td>
                            <td>{note(b.note_taktik)}</td>
                            <td>{note(b.note_fitness)}</td>
                            <td>{note(b.note_mental)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </div>
      )}

      </div>
      )}

      {/* Modals */}
      {showBewertung && (
        <BewertungsModal
          spieler={showBewertung.spieler}
          kontext={showBewertung.kontext}
          onSave={()=>loadDaten(aktiveMn, aktiveSaison)}
          onClose={()=>setShowBewertung(null)}
        />
      )}

      {showSchnell && (
        <SchnellBewertung
          einheitId={showSchnell.einheitId}
          einheitLabel={showSchnell.label}
          datum={showSchnell.datum}
          spieler={spieler}
          onClose={()=>setShowSchnell(null)}
          onSaved={()=>loadDaten(aktiveMn, aktiveSaison)}
        />
      )}
    </div>
  )
}
