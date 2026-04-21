import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// ── KONSTANTEN ────────────────────────────────────────────────
const EVENT_TYPEN = [
  { typ:'tor',                 label:'Tor',           icon:'⚽', farbe:'#d94f4f', bg:'#fce4d6', brauchtPosition:true },
  { typ:'sieben_meter',        label:'7m Tor',        icon:'🎯', farbe:'#d94f4f', bg:'#fce4d6', brauchtPosition:true },
  { typ:'fehlwurf',            label:'Fehlwurf',      icon:'❌', farbe:'#e07b30', bg:'#fff3e0', brauchtPosition:true },
  { typ:'sieben_meter_fehl',   label:'7m Fehl',       icon:'💨', farbe:'#e07b30', bg:'#fff3e0', brauchtPosition:false },
  { typ:'parade_gegner',       label:'Parade',        icon:'🛡️', farbe:'#2d6fa3', bg:'#ddeaff', brauchtPosition:false },
  { typ:'zeitstrafe',          label:'2 Minuten',     icon:'⏱️', farbe:'#8b5cf6', bg:'#f0ebff', brauchtPosition:false },
  { typ:'technischer_fehler',  label:'Tech. Fehler',  icon:'⚠️', farbe:'#9a9590', bg:'var(--gray-100)', brauchtPosition:false },
  { typ:'sonstiges',           label:'Sonstiges',     icon:'📎', farbe:'#9a9590', bg:'var(--gray-100)', brauchtPosition:false },
]
const TYP_META = Object.fromEntries(EVENT_TYPEN.map(t=>[t.typ,t]))

const TOR_BEREICHE = [
  { id:'links_oben',    label:'LO', x:15, y:15 },
  { id:'mitte_oben',    label:'MO', x:50, y:15 },
  { id:'rechts_oben',   label:'RO', x:85, y:15 },
  { id:'links_unten',   label:'LU', x:15, y:75 },
  { id:'mitte_unten',   label:'MU', x:50, y:75 },
  { id:'rechts_unten',  label:'RU', x:85, y:75 },
]

function extractYoutubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  return m?.[1] || null
}

function sek2Zeit(s) {
  if (!s && s!==0) return '–'
  const m = Math.floor(s/60), sec = s%60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

// ── HANDBALL-FELD SVG ─────────────────────────────────────────
function HandballFeld({ events, onFeldKlick, highlight }) {
  const svgRef = useRef()

  function handleKlick(e) {
    if (!onFeldKlick) return
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onFeldKlick(x, y)
  }

  // Farbe je nach Typ
  function eventFarbe(typ) {
    return TYP_META[typ]?.farbe || '#ccc'
  }

  return (
    <svg ref={svgRef} viewBox="0 0 100 60" style={{ width:'100%', border:'2px solid var(--gray-200)', borderRadius:'var(--radius)', cursor:onFeldKlick?'crosshair':'default', background:'#e8f4e8' }}
      onClick={handleKlick}>

      {/* Feld-Linien */}
      <rect x="0" y="0" width="100" height="60" fill="#c8e6c8" stroke="#4a8a4a" strokeWidth="0.5"/>
      {/* Mittellinie */}
      <line x1="50" y1="0" x2="50" y2="60" stroke="#4a8a4a" strokeWidth="0.5"/>
      {/* Mittelkreis */}
      <circle cx="50" cy="30" r="6" fill="none" stroke="#4a8a4a" strokeWidth="0.5"/>
      {/* Linkes Tor-Bereich (Angriff = links) */}
      <rect x="0" y="18" width="6" height="24" fill="#b8ddb8" stroke="#4a8a4a" strokeWidth="0.5"/>
      <rect x="0" y="23" width="2" height="14" fill="white" stroke="#333" strokeWidth="0.3"/>
      {/* 6m Linie links */}
      <path d="M 0,18 Q 12,18 12,30 Q 12,42 0,42" fill="none" stroke="#4a8a4a" strokeWidth="0.5"/>
      {/* 9m Linie links */}
      <path d="M 0,12 Q 21,12 21,30 Q 21,48 0,48" fill="none" stroke="#4a8a4a" strokeWidth="0.5" strokeDasharray="2,1"/>
      {/* 7m Punkt links */}
      <circle cx="7" cy="30" r="0.8" fill="#4a8a4a"/>
      {/* Rechtes Tor-Bereich (Abwehr = rechts, kleiner dargestellt) */}
      <rect x="94" y="18" width="6" height="24" fill="#b8ddb8" stroke="#4a8a4a" strokeWidth="0.5"/>
      <rect x="98" y="23" width="2" height="14" fill="white" stroke="#333" strokeWidth="0.3"/>
      <path d="M 100,18 Q 88,18 88,30 Q 88,42 100,42" fill="none" stroke="#4a8a4a" strokeWidth="0.5"/>
      <path d="M 100,12 Q 79,12 79,30 Q 79,48 100,48" fill="none" stroke="#4a8a4a" strokeWidth="0.5" strokeDasharray="2,1"/>
      <circle cx="93" cy="30" r="0.8" fill="#4a8a4a"/>

      {/* Label */}
      <text x="12" y="5" fontSize="3.5" fill="#4a8a4a" textAnchor="middle" fontWeight="bold">ANGRIFF</text>
      <text x="25" y="5" fontSize="2.5" fill="#888" textAnchor="middle">(getaggte Zone)</text>

      {/* Events als Punkte */}
      {events.filter(e=>e.feld_x!=null && e.feld_y!=null).map((e,i)=>{
        const meta = TYP_META[e.typ]||TYP_META.sonstiges
        const isHL = highlight?.id===e.id
        return (
          <g key={e.id}>
            <circle cx={e.feld_x} cy={e.feld_y} r={isHL?4:2.5} fill={meta.farbe} opacity={isHL?1:0.75} stroke="white" strokeWidth="0.5"/>
            {isHL && <circle cx={e.feld_x} cy={e.feld_y} r={6} fill="none" stroke={meta.farbe} strokeWidth="1" opacity="0.5"/>}
          </g>
        )
      })}

      {/* Heatmap-Überlagerung (nur Tore) */}
      {events.filter(e=>['tor','sieben_meter'].includes(e.typ)&&e.feld_x!=null).length>3 && (
        <g opacity="0.15">
          {events.filter(e=>['tor','sieben_meter'].includes(e.typ)&&e.feld_x!=null).map((e,i)=>(
            <circle key={i} cx={e.feld_x} cy={e.feld_y} r={8} fill="#d94f4f"/>
          ))}
        </g>
      )}
    </svg>
  )
}

// ── HEATMAP AUSWERTUNG ────────────────────────────────────────
function HeatmapAuswertung({ events }) {
  const tore = events.filter(e=>['tor','sieben_meter'].includes(e.typ))
  const torNachBereich = TOR_BEREICHE.map(b=>({
    ...b,
    anzahl: events.filter(e=>e.torbereich===b.id&&['tor','sieben_meter'].includes(e.typ)).length
  }))
  const maxBereich = Math.max(1, ...torNachBereich.map(b=>b.anzahl))

  const wurftypes = ['tor','sieben_meter','fehlwurf','sieben_meter_fehl']
  const gesamtWuerfe = events.filter(e=>wurftypes.includes(e.typ)).length
  const toreGesamt  = tore.length
  const quote = gesamtWuerfe>0 ? Math.round(toreGesamt/gesamtWuerfe*100) : null

  return (
    <div>
      {/* Tor-Verteilung Auswertung */}
      <div className="card" style={{ marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)', marginBottom:12 }}>🎯 Tor-Zonen (Torecke)</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, maxWidth:260 }}>
          {['links_oben','mitte_oben','rechts_oben','links_unten','mitte_unten','rechts_unten'].map(bid=>{
            const b = torNachBereich.find(x=>x.id===bid)
            const pct = b ? b.anzahl/maxBereich : 0
            return (
              <div key={bid} style={{ padding:'10px 6px', borderRadius:'var(--radius)', background:`rgba(217,79,79,${0.1+0.7*pct})`, textAlign:'center', border:'1px solid rgba(217,79,79,0.2)' }}>
                <div style={{ fontSize:20, fontWeight:900, color:'#d94f4f' }}>{b?.anzahl||0}</div>
                <div style={{ fontSize:10, color:'var(--gray-500)' }}>{bid.replace('_',' ')}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Wurfquote + Stats */}
      <div className="card" style={{ marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)', marginBottom:10 }}>📊 Wurfstatistik</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
          {[
            ['Tore gesamt', toreGesamt, '#d94f4f'],
            ['Wurfquote', quote!=null?`${quote}%`:'–', '#8b5cf6'],
            ['Fehlwürfe', events.filter(e=>['fehlwurf','sieben_meter_fehl'].includes(e.typ)).length, '#e07b30'],
            ['Paraden', events.filter(e=>e.typ==='parade_gegner').length, '#2d6fa3'],
            ['7m Tore', events.filter(e=>e.typ==='sieben_meter').length, '#d94f4f'],
            ['Strafen', events.filter(e=>e.typ==='zeitstrafe').length, '#8b5cf6'],
          ].map(([l,v,c])=>(
            <div key={l} style={{ padding:'8px 10px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
              <div style={{ fontSize:11, color:'var(--gray-400)' }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:700, color:c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Spieler-Statistik */}
      {events.filter(e=>e.gegner_spieler).length>0 && (
        <div className="card">
          <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)', marginBottom:10 }}>👤 Top-Werfer</div>
          {Object.entries(
            events.filter(e=>['tor','sieben_meter'].includes(e.typ)&&e.gegner_spieler)
              .reduce((acc,e)=>{ const k=e.gegner_spieler_id; acc[k]=(acc[k]||{sp:e.gegner_spieler,n:0}); acc[k].n++; return acc },{})
          ).sort((a,b)=>b[1].n-a[1].n).slice(0,5).map(([k,{sp,n}])=>(
            <div key={k} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid var(--gray-100)' }}>
              <span style={{ fontSize:12, color:'var(--gray-400)', width:30, textAlign:'right' }}>#{sp?.trikotnummer||'?'}</span>
              <span style={{ flex:1, fontSize:13, fontWeight:500 }}>{sp?.vorname} {sp?.nachname}</span>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:Math.round(n*12), height:6, background:'#d94f4f', borderRadius:3 }}/>
                <span style={{ fontWeight:700, color:'#d94f4f', fontSize:13 }}>{n}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── HAUPT-TAGGING SEITE ───────────────────────────────────────
export default function GegnerTagging() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [spiel, setSpiel]       = useState(null)
  const [team, setTeam]         = useState(null)
  const [spieler, setSpieler]   = useState([])
  const [events, setEvents]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('tagging')
  const [highlight, setHighlight] = useState(null)

  // YouTube Player
  const playerRef   = useRef(null)
  const playerDivRef = useRef(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [videoSekunde, setVideoSekunde] = useState(0)
  const [playerInterval, setPlayerInterval] = useState(null)

  // Tagging State
  const [pendingTyp, setPendingTyp]     = useState(null)
  const [pendingPos, setPendingPos]     = useState(null)  // {x,y} auf Feld
  const [showTorBereich, setShowTorBereich] = useState(false)
  const [aktiverSpieler, setAktiverSpieler] = useState(null)
  const [showSpielerPicker, setShowSpielerPicker] = useState(false)
  const [manuelleMinute, setManuelleMinute] = useState('')
  const [halbzeit, setHalbzeit]         = useState(1)
  const [saving, setSaving]             = useState(false)

  // Neues Spiel form
  const [showSpielForm, setShowSpielForm] = useState(false)
  const [spielForm, setSpielForm] = useState({ youtube_url:'', titel:'', datum:'', notizen:'' })
  const [mannschaften, setMannschaften] = useState([])
  const [gegnerTeams, setGegnerTeams]   = useState([])

  useEffect(() => { load() }, [id])

  // YouTube IFrame API laden
  useEffect(() => {
    // Script nur einmal laden
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'yt-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
    // Polling bis API bereit ist
    const poll = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(poll)
        if (spiel?.youtube_id) initPlayer()
      }
    }, 200)
    return () => {
      clearInterval(poll)
      if (playerInterval) clearInterval(playerInterval)
    }
  }, [spiel?.youtube_id])

  async function load() {
    setLoading(true)
    const [{ data: s }, { data: mn }, { data: gt }] = await Promise.all([
      id ? supabase.from('gegner_spiele').select('*, team:team_id(id,name,farbe_primaer,logo_url)').eq('id', id).single() : { data: null },
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('gegner_teams').select('*').eq('aktiv', true).order('name'),
    ])
    setMannschaften(mn||[]); setGegnerTeams(gt||[])

    if (s) {
      setSpiel(s); setTeam(s.team)
      // Spieler des Teams laden
      const { data: sp } = await supabase.from('gegner_spieler').select('*').eq('team_id', s.team_id).eq('aktiv', true).order('trikotnummer')
      setSpieler(sp||[])
      // Events laden
      const { data: ev } = await supabase.from('gegner_events')
        .select('*, gegner_spieler:gegner_spieler_id(vorname,nachname,trikotnummer,position)')
        .eq('spiel_id', id).order('video_sekunde')
      setEvents(ev||[])
      // Player initialisieren wenn Video vorhanden
      if (s.youtube_id && window.YT?.Player) setTimeout(initPlayer, 500)
    } else {
      setShowSpielForm(true)
    }
    setLoading(false)
  }

  function initPlayer() {
    const ytId = spiel?.youtube_id || window._pendingYTId
    if (!ytId || !window.YT?.Player) return
    if (!playerDivRef.current) return
    // Alten Player aufräumen
    try { if (playerRef.current) { playerRef.current.destroy() } } catch(e) {}
    playerRef.current = null
    // Neuen Container div erstellen (YT.Player ersetzt das Element)
    const container = playerDivRef.current
    playerRef.current = new window.YT.Player(container, {
      width: '100%',
      height: '100%',
      videoId: ytId,
      playerVars: { rel:0, modestbranding:1, origin: window.location.origin },
      events: {
        onReady: (event) => {
          setPlayerReady(true)
          const interval = setInterval(() => {
            try {
              if (playerRef.current?.getCurrentTime) {
                setVideoSekunde(Math.floor(playerRef.current.getCurrentTime()))
              }
            } catch(e) {}
          }, 500)
          setPlayerInterval(interval)
        },
        onError: (e) => console.error('YT Player Error:', e.data)
      }
    })
  }

  // initPlayer wird jetzt vom Polling-useEffect ausgelöst

  function getAktuelleZeit() {
    if (manuelleMinute) return parseInt(manuelleMinute) * 60
    return videoSekunde
  }

  async function spielAnlegen() {
    if (!spielForm.youtube_url || !spielForm.titel) return
    setSaving(true)
    const ytId = extractYoutubeId(spielForm.youtube_url)
    const teamId = spielForm.team_id || gegnerTeams[0]?.id
    if (!teamId) { alert('Bitte erst einen Gegner anlegen'); setSaving(false); return }
    const { data } = await supabase.from('gegner_spiele').insert({
      team_id: teamId,
      mannschaft_id: spielForm.mannschaft_id||null,
      youtube_url: spielForm.youtube_url,
      youtube_id: ytId,
      titel: spielForm.titel,
      datum: spielForm.datum||null,
      notizen: spielForm.notizen||null,
      erstellt_von: profile.id,
    }).select().single()
    setSaving(false)
    if (data) { window._pendingYTId = ytId; navigate(`/mannschaft/scouting/${data.id}`) }
  }

  // Event taggen
  function eventButtonKlick(typ) {
    const meta = TYP_META[typ]
    setPendingTyp(typ)
    // Tor/Fehlwurf: erst Position auf Feld wählen
    if (meta.brauchtPosition) {
      // Warte auf Feld-Klick (pendingTyp gesetzt, Feld zeigt Cursor)
    } else {
      // Direkt speichern ohne Positionsklick
      taggenOhnePosition(typ)
    }
  }

  function feldKlick(x, y) {
    if (!pendingTyp) return
    setPendingPos({ x, y })
    const meta = TYP_META[pendingTyp]
    if (['tor','sieben_meter'].includes(pendingTyp)) {
      setShowTorBereich(true)
    } else {
      taggen(pendingTyp, x, y, null)
    }
  }

  async function taggen(typ, feldX, feldY, torbereich) {
    setPendingTyp(null); setPendingPos(null); setShowTorBereich(false)
    const zeit = getAktuelleZeit()
    const min  = manuelleMinute ? parseInt(manuelleMinute) : Math.floor(zeit/60)
    const payload = {
      spiel_id: id, typ,
      feld_x: feldX, feld_y: feldY,
      torbereich,
      video_sekunde: zeit,
      minute: min,
      halbzeit,
      gegner_spieler_id: aktiverSpieler?.id || null,
      notiz: null,
    }
    setSaving(true)
    const { data } = await supabase.from('gegner_events').insert(payload).select('*, gegner_spieler:gegner_spieler_id(vorname,nachname,trikotnummer,position)').single()
    setSaving(false)
    if (data) { setEvents(prev=>[...prev, data]); setHighlight(data) }
  }

  async function taggenOhnePosition(typ) {
    const zeit = getAktuelleZeit()
    const min  = manuelleMinute ? parseInt(manuelleMinute) : Math.floor(zeit/60)
    setPendingTyp(null)
    const payload = {
      spiel_id: id, typ, feld_x:null, feld_y:null, torbereich:null,
      video_sekunde: zeit, minute:min, halbzeit,
      gegner_spieler_id: aktiverSpieler?.id || null,
    }
    setSaving(true)
    const { data } = await supabase.from('gegner_events').insert(payload).select('*, gegner_spieler:gegner_spieler_id(vorname,nachname,trikotnummer,position)').single()
    setSaving(false)
    if (data) { setEvents(prev=>[...prev, data]); setHighlight(data) }
  }

  async function eventLoeschen(eid) {
    await supabase.from('gegner_events').delete().eq('id', eid)
    setEvents(prev=>prev.filter(e=>e.id!==eid))
    if (highlight?.id===eid) setHighlight(null)
  }

  function sprungZuTimestamp(sek) {
    if (playerRef.current?.seekTo) playerRef.current.seekTo(sek, true)
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  // Wenn noch kein Spiel: Spiel anlegen Form
  if (!spiel || showSpielForm) return (
    <div>
      <button onClick={()=>navigate('/mannschaft/scouting')} className="back-btn">← Zurück</button>
      <div className="card" style={{ maxWidth:560 }}>
        <div className="section-title" style={{ marginBottom:16 }}>📹 Neues Gegner-Spiel zum Taggen</div>
        <div className="form-group"><label>Gegner-Team *</label>
          <select value={spielForm.team_id||''} onChange={e=>setSpielForm(p=>({...p,team_id:e.target.value}))}>
            <option value="">Wählen…</option>
            {gegnerTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>YouTube URL *</label>
          <input value={spielForm.youtube_url} onChange={e=>setSpielForm(p=>({...p,youtube_url:e.target.value}))} placeholder="https://www.youtube.com/watch?v=…" autoFocus />
          {spielForm.youtube_url && !extractYoutubeId(spielForm.youtube_url) && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>⚠️ Keine gültige YouTube-URL</div>}
          {extractYoutubeId(spielForm.youtube_url) && <div style={{ fontSize:11, color:'var(--green)', marginTop:4 }}>✓ Video-ID: {extractYoutubeId(spielForm.youtube_url)}</div>}
        </div>
        <div className="form-group"><label>Titel *</label><input value={spielForm.titel} onChange={e=>setSpielForm(p=>({...p,titel:e.target.value}))} placeholder="z.B. ATSV vs. HC Bremen – Hinspiel" /></div>
        <div className="form-row">
          <div className="form-group"><label>Datum</label><input type="date" value={spielForm.datum} onChange={e=>setSpielForm(p=>({...p,datum:e.target.value}))} /></div>
          <div className="form-group"><label>Unsere Mannschaft</label>
            <select value={spielForm.mannschaft_id||''} onChange={e=>setSpielForm(p=>({...p,mannschaft_id:e.target.value}))}>
              <option value="">–</option>
              {mannschaften.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label>Notizen</label><textarea value={spielForm.notizen} onChange={e=>setSpielForm(p=>({...p,notizen:e.target.value}))} rows={2} /></div>
        <button onClick={spielAnlegen} className="btn btn-primary" disabled={saving||!spielForm.youtube_url||!spielForm.titel||!spielForm.team_id}>
          {saving?'Anlegen…':'Spiel anlegen & Tagging starten'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <button onClick={()=>navigate('/mannschaft/scouting')} className="back-btn">← Zurück zur Übersicht</button>

      {/* Header */}
      <div className="card" style={{ marginBottom:12, padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          {team?.logo_url && <img src={team.logo_url} alt="" style={{ width:36, height:36, objectFit:'contain' }} />}
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--navy)' }}>{spiel.titel}</div>
            <div style={{ fontSize:12, color:'var(--gray-400)' }}>
              {team?.name} · {spiel.datum?new Date(spiel.datum+'T00:00:00').toLocaleDateString('de-DE'):'–'} · {events.length} Events getaggt
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {[['tagging','🏷️ Tagging'],['analyse','📊 Analyse'],['timeline','📋 Timeline']].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} className={`btn btn-sm ${tab===k?'btn-primary':'btn-outline'}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ TAGGING ══ */}
      {tab==='tagging' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, alignItems:'flex-start' }}>

          {/* Linke Seite: Video + Feld */}
          <div>
            {/* YouTube Player */}
            <div style={{ position:'relative', paddingBottom:'56.25%', background:'#000', borderRadius:'var(--radius)', overflow:'hidden', marginBottom:12 }}>
              <div ref={playerDivRef} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }}/>
              {!playerReady && (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, color:'white' }}>
                  <div style={{ fontSize:32 }}>▶</div>
                  <div style={{ fontSize:12, opacity:0.7 }}>Video lädt…</div>
                </div>
              )}
            </div>

            {/* Zeitstempel-Steuerung */}
            <div className="card" style={{ marginBottom:12, padding:'10px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                {/* Aktueller Timestamp */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:12, color:'var(--gray-400)' }}>Video-Zeit:</span>
                  <span style={{ fontFamily:'monospace', fontSize:16, fontWeight:700, color:'var(--navy)' }}>{sek2Zeit(videoSekunde)}</span>
                </div>

                {/* Manuelle Minuten-Eingabe */}
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12, color:'var(--gray-400)' }}>Minute:</span>
                  <input type="number" min="0" max="60" placeholder="auto" value={manuelleMinute}
                    onChange={e=>setManuelleMinute(e.target.value)}
                    style={{ width:60, padding:'4px 8px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13 }} />
                  {manuelleMinute && <button onClick={()=>setManuelleMinute('')} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:14 }}>×</button>}
                </div>

                {/* Halbzeit */}
                <div style={{ display:'flex', gap:4 }}>
                  {[1,2].map(h=>(
                    <button key={h} onClick={()=>setHalbzeit(h)} className={`btn btn-sm ${halbzeit===h?'btn-primary':'btn-outline'}`} style={{ fontSize:12 }}>{h}. HZ</button>
                  ))}
                </div>

                {/* Spieler */}
                <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
                  {aktiverSpieler
                    ? <><span style={{ fontSize:12, fontWeight:600 }}>#{aktiverSpieler.trikotnummer} {aktiverSpieler.vorname}</span>
                        <button onClick={()=>setAktiverSpieler(null)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer' }}>×</button></>
                    : <span style={{ fontSize:12, color:'var(--gray-400)' }}>Kein Spieler</span>
                  }
                  <button onClick={()=>setShowSpielerPicker(true)} className="btn btn-sm btn-outline">Spieler</button>
                </div>
              </div>

              {/* Pending Typ Hinweis */}
              {pendingTyp && (
                <div style={{ marginTop:10, padding:'8px 12px', background:'#fff3cd', borderRadius:'var(--radius)', fontSize:13, fontWeight:600, color:'#8a6a00', display:'flex', alignItems:'center', gap:8 }}>
                  {TYP_META[pendingTyp]?.icon} {TYP_META[pendingTyp]?.label} — Klicke auf das Spielfeld um die Position zu markieren
                  <button onClick={()=>setPendingTyp(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'var(--red)' }}>Abbrechen</button>
                </div>
              )}
            </div>

            {/* Handball-Feld */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, color:'var(--gray-400)', marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
                <span>🏟️ Spielfeld-Karte</span>
                {pendingTyp && <span style={{ color:'#8a6a00', fontWeight:600 }}>← Hier klicken für Position</span>}
                <span style={{ marginLeft:'auto', fontSize:11 }}>{events.filter(e=>e.feld_x!=null).length} positionierte Events</span>
              </div>
              <HandballFeld
                events={events}
                onFeldKlick={pendingTyp && TYP_META[pendingTyp]?.brauchtPosition ? feldKlick : null}
                highlight={highlight}
              />
            </div>

            {/* Tor-Bereich Modal */}
            {showTorBereich && (
              <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowTorBereich(false)}>
                <div className="modal" style={{ maxWidth:300 }}>
                  <div className="modal-header"><span className="modal-title">Torbereich</span><button className="close-btn" onClick={()=>setShowTorBereich(false)}>×</button></div>
                  <div className="modal-body">
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:8 }}>
                      {TOR_BEREICHE.map(b=>(
                        <button key={b.id} onClick={()=>taggen(pendingTyp, pendingPos?.x, pendingPos?.y, b.id)}
                          style={{ padding:'18px 8px', borderRadius:'var(--radius)', border:'2px solid #d94f4f', background:'#d94f4f', color:'white', cursor:'pointer', fontWeight:800, fontSize:14 }}>
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={()=>taggen(pendingTyp, pendingPos?.x, pendingPos?.y, null)} className="btn btn-outline btn-sm" style={{ width:'100%' }}>Ohne Bereich</button>
                  </div>
                </div>
              </div>
            )}

            {/* Spieler-Picker */}
            {showSpielerPicker && (
              <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowSpielerPicker(false)}>
                <div className="modal" style={{ maxWidth:420 }}>
                  <div className="modal-header"><span className="modal-title">Spieler auswählen</span><button className="close-btn" onClick={()=>setShowSpielerPicker(false)}>×</button></div>
                  <div className="modal-body" style={{ maxHeight:380, overflowY:'auto' }}>
                    <button onClick={()=>{ setAktiverSpieler(null); setShowSpielerPicker(false) }} className="btn btn-outline btn-sm" style={{ marginBottom:10 }}>Kein Spieler</button>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                      {spieler.map(sp=>(
                        <button key={sp.id} onClick={()=>{ setAktiverSpieler(sp); setShowSpielerPicker(false) }}
                          style={{ padding:'10px 6px', borderRadius:'var(--radius)', border:`2px solid ${aktiverSpieler?.id===sp.id?'var(--navy)':'var(--gray-200)'}`, background:aktiverSpieler?.id===sp.id?'var(--navy)':'var(--white)', color:aktiverSpieler?.id===sp.id?'white':'var(--text)', cursor:'pointer', textAlign:'center', fontSize:12, fontWeight:600 }}>
                          <div style={{ fontSize:16, fontWeight:900, fontFamily:'monospace', color:aktiverSpieler?.id===sp.id?'white':'var(--gray-300)' }}>#{sp.trikotnummer||'?'}</div>
                          <div>{sp.vorname?.[0]}. {sp.nachname}</div>
                          <div style={{ fontSize:10, opacity:0.7 }}>{sp.position?.split(' ').pop()||''}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rechte Seite: Event-Buttons + letzte Events */}
          <div>
            {/* Event-Buttons */}
            <div className="card" style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>🏷️ Event taggen</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
                {EVENT_TYPEN.map(t=>(
                  <button key={t.typ} onClick={()=>eventButtonKlick(t.typ)}
                    style={{ padding:'12px 8px', borderRadius:'var(--radius)', border:`2px solid ${t.farbe}44`, background:pendingTyp===t.typ?t.farbe:t.bg, cursor:'pointer', fontWeight:700, fontSize:12, color:pendingTyp===t.typ?'white':t.farbe, display:'flex', flexDirection:'column', alignItems:'center', gap:3, transition:'all 0.1s', touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}
                    onMouseEnter={e=>{ if(pendingTyp!==t.typ){e.currentTarget.style.background=t.farbe; e.currentTarget.style.color='white'} }}
                    onMouseLeave={e=>{ if(pendingTyp!==t.typ){e.currentTarget.style.background=t.bg; e.currentTarget.style.color=t.farbe} }}>
                    <span style={{ fontSize:20 }}>{t.icon}</span>
                    <span style={{ fontSize:11 }}>{t.label}</span>
                    {t.brauchtPosition && <span style={{ fontSize:9, opacity:0.6 }}>📍 Feld</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Letzte 5 Events */}
            <div className="card">
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Letzte Events</div>
              {events.length===0
                ? <p style={{ fontSize:12, color:'var(--gray-400)' }}>Noch keine Events getaggt.</p>
                : [...events].reverse().slice(0,8).map(e=>{
                    const meta=TYP_META[e.typ]||TYP_META.sonstiges
                    return (
                      <div key={e.id} onClick={()=>{ setHighlight(e); if(e.video_sekunde) sprungZuTimestamp(e.video_sekunde) }}
                        style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:'var(--radius)', marginBottom:4, cursor:'pointer', background:highlight?.id===e.id?'var(--gray-100)':'transparent', transition:'background 0.15s' }}>
                        <span style={{ fontSize:16, flexShrink:0 }}>{meta.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:meta.farbe }}>{meta.label}</div>
                          <div style={{ fontSize:10, color:'var(--gray-400)' }}>
                            {e.halbzeit}HZ {e.minute||0}' · {sek2Zeit(e.video_sekunde)}
                            {e.gegner_spieler && ` · #${e.gegner_spieler.trikotnummer} ${e.gegner_spieler.nachname}`}
                          </div>
                        </div>
                        <button onClick={ev=>{ ev.stopPropagation(); eventLoeschen(e.id) }} style={{ background:'none', border:'none', color:'var(--gray-300)', cursor:'pointer', fontSize:14, flexShrink:0 }}>×</button>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        </div>
      )}

      {/* ══ ANALYSE ══ */}
      {tab==='analyse' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)', marginBottom:8 }}>🏟️ Wurf-Heatmap</div>
            <HandballFeld events={events} onFeldKlick={null} highlight={null} />
            <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap', fontSize:11 }}>
              {Object.entries(TYP_META).map(([k,v])=>{
                const n = events.filter(e=>e.typ===k).length
                if (!n) return null
                return <span key={k} style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:'50%', background:v.farbe, display:'inline-block' }}/>{v.label}: {n}</span>
              })}
            </div>
          </div>
          <HeatmapAuswertung events={events} />
        </div>
      )}

      {/* ══ TIMELINE ══ */}
      {tab==='timeline' && (
        <div className="card">
          {events.length===0
            ? <div className="empty-state"><p>Noch keine Events.</p></div>
            : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Zeit</th><th>Minute</th><th>Event</th><th>Spieler</th><th>Position</th><th>Torbereich</th><th></th></tr></thead>
                  <tbody>
                    {events.map(e=>{
                      const meta=TYP_META[e.typ]||TYP_META.sonstiges
                      return (
                        <tr key={e.id} onClick={()=>{ setHighlight(e); if(e.video_sekunde){sprungZuTimestamp(e.video_sekunde); setTab('tagging')} }} style={{ cursor:'pointer' }}>
                          <td style={{ fontFamily:'monospace', fontSize:12, fontWeight:600, color:'var(--navy)', cursor:'pointer' }} onClick={()=>{setHighlight(e); if(e.video_sekunde){sprungZuTimestamp(e.video_sekunde); setTab('tagging')}}}>{sek2Zeit(e.video_sekunde)}</td>
                          <td style={{ fontSize:12, color:'var(--gray-500)' }}>{e.halbzeit}HZ {e.minute||0}'</td>
                          <td><span style={{ fontSize:12, fontWeight:700, color:meta.farbe }}>{meta.icon} {meta.label}</span></td>
                          <td style={{ fontSize:12 }}>{e.gegner_spieler?`#${e.gegner_spieler.trikotnummer} ${e.gegner_spieler.vorname?.[0]}. ${e.gegner_spieler.nachname}`:'–'}</td>
                          <td style={{ fontSize:11, color:'var(--gray-400)' }}>{e.feld_x!=null?`${Math.round(e.feld_x)}/${Math.round(e.feld_y)}`:'–'}</td>
                          <td style={{ fontSize:11 }}>{e.torbereich?.replace('_',' ')||'–'}</td>
                          <td><button onClick={ev=>{ev.stopPropagation();eventLoeschen(e.id)}} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:14 }}>×</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}
