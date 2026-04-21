import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div className="card" style={{ padding:20, color:'var(--red)' }}>
        <strong>Fehler:</strong> {this.state.error.message}
        <pre style={{ fontSize:11, marginTop:8, overflow:'auto' }}>{this.state.error.stack?.slice(0,300)}</pre>
      </div>
    )
    return this.props.children
  }
}


// ── KONSTANTEN ───────────────────────────────────────────────
const EREIGNIS_GRUPPEN = [
  {
    label: '⚽ Eigene Tore',
    farbe: '#3a8a5a',
    bg: '#e2efda',
    typen: [
      { typ:'tor',       label:'Tor',      icon:'⚽', shortcut:'T' },
      { typ:'tor_7m',    label:'7m Tor',   icon:'🎯', shortcut:'7' },
    ]
  },
  {
    label: '🛡️ Torwart',
    farbe: '#2d6fa3',
    bg: '#ddeaff',
    typen: [
      { typ:'parade',    label:'Parade',   icon:'🛡️', shortcut:'P' },
      { typ:'parade_7m', label:'7m Parade',icon:'✋', shortcut:'M' },
    ]
  },
  {
    label: '❌ Fehler',
    farbe: '#e07b30',
    bg: '#fff3e0',
    typen: [
      { typ:'fehlwurf',        label:'Fehlwurf',  icon:'❌', shortcut:'F' },
      { typ:'fehlwurf_7m',     label:'7m Fehl',   icon:'💨', shortcut:'J' },
      { typ:'technischer_fehler', label:'Tech. Fehler', icon:'⚠️', shortcut:'E' },
      { typ:'ballverlust',     label:'Ballverlust',icon:'🔄', shortcut:'B' },
    ]
  },
  {
    label: '🟨 Strafen',
    farbe: '#d94f4f',
    bg: '#fce4d6',
    typen: [
      { typ:'zeitstrafe_2min', label:'2 Minuten',  icon:'⏱️', shortcut:'2' },
      { typ:'gelbe_karte',     label:'Gelbe K.',   icon:'🟨', shortcut:'G' },
      { typ:'rote_karte',      label:'Rote K.',    icon:'🟥', shortcut:'R' },
    ]
  },
  {
    label: '🔵 Gegner',
    farbe: '#8b5cf6',
    bg: '#f0ebff',
    typen: [
      { typ:'tor_gegner',      label:'Gegner Tor', icon:'🔵', shortcut:'D' },
      { typ:'tor_gegner_7m',   label:'Gegner 7m',  icon:'🔮', shortcut:'8' },
      { typ:'zeitstrafe_gegner',label:'G. 2 Min',  icon:'⌛', shortcut:'Q' },
    ]
  },
  {
    label: '🔀 Wechsel',
    farbe: '#9a9590',
    bg: 'var(--gray-100)',
    typen: [
      { typ:'einwechslung',    label:'Einwechsl.', icon:'⬆️', shortcut:'' },
      { typ:'auswechslung',    label:'Auswechsl.', icon:'⬇️', shortcut:'' },
      { typ:'timeout_eigen',   label:'Timeout',    icon:'⏸️', shortcut:'' },
    ]
  },
]

const TYP_META = Object.fromEntries(EREIGNIS_GRUPPEN.flatMap(g => g.typen.map(t => [t.typ, { ...t, farbe: g.farbe, bg: g.bg }])))

const POSITIONEN = ['Torwart','Linksaußen','Rechtsaußen','Rückraum Links','Rückraum Mitte','Rückraum Rechts','Kreisläufer']

// Handball-Torabschnitte für schnelle Auswahl
const TOR_BEREICHE = [
  { id:'links_oben',    label:'LO', x:20, y:20 },
  { id:'mitte_oben',   label:'MO', x:50, y:20 },
  { id:'rechts_oben',  label:'RO', x:80, y:20 },
  { id:'links_unten',  label:'LU', x:20, y:75 },
  { id:'mitte_unten',  label:'MU', x:50, y:75 },
  { id:'rechts_unten', label:'RU', x:80, y:75 },
]

function extractYoutubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  return m?.[1] || null
}

// ── OFFLINE QUEUE ─────────────────────────────────────────────
const QUEUE_KEY = 'hcb_tracking_queue'
function getQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]') } catch { return [] } }
function addToQueue(item) { const q = getQueue(); q.push(item); localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) }
function clearQueue() { localStorage.removeItem(QUEUE_KEY) }



// ── VORBEREITUNG TAB ─────────────────────────────────────────
function VorbereitungsTab({ spiel, spieler, aufstellung, onUpdate, isStaff }) {
  const { profile } = useAuth()
  const [videos, setVideos]     = useState([])
  const [dateien, setDateien]   = useState([])
  const [editNotizen, setEditNotizen] = useState(false)
  const [notizForm, setNotizForm] = useState({ spielidee: spiel?.spielidee||'', agenda: spiel?.agenda||'', taktische_hinweise: spiel?.taktische_hinweise||'' })
  const [showVideoForm, setShowVideoForm] = useState(false)
  const [videoForm, setVideoForm] = useState({ typ:'vorbereitung', titel:'', youtube_url:'', beschreibung:'' })
  const [showStarting, setShowStarting] = useState(false)
  const [startingSeven, setStartingSeven] = useState(spiel?.starting_seven||[])
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const uploadRef = useRef()

  useEffect(() => { loadMedia() }, [spiel?.id])

  async function loadMedia() {
    const [{ data: v }, { data: d }] = await Promise.all([
      supabase.from('spiel_videos').select('*').eq('spiel_id', spiel.id).order('reihenfolge'),
      supabase.from('spiel_dateien').select('*').eq('spiel_id', spiel.id).order('erstellt_am'),
    ])
    setVideos(v||[]); setDateien(d||[])
  }

  async function notizSpeichern() {
    setSaving(true)
    await supabase.from('spiele').update({ spielidee: notizForm.spielidee||null, agenda: notizForm.agenda||null, taktische_hinweise: notizForm.taktische_hinweise||null }).eq('id', spiel.id)
    setSaving(false); setEditNotizen(false); onUpdate()
  }

  async function videoHinzufuegen() {
    if (!videoForm.titel.trim()||!videoForm.youtube_url) return
    setSaving(true)
    const ytId = extractYoutubeId(videoForm.youtube_url)
    await supabase.from('spiel_videos').insert({ ...videoForm, spiel_id:spiel.id, youtube_id:ytId||null, erstellt_von:profile.id, reihenfolge:videos.length })
    setSaving(false); setShowVideoForm(false); setVideoForm({ typ:'vorbereitung', titel:'', youtube_url:'', beschreibung:'' }); loadMedia()
  }

  async function videoLoeschen(id) { await supabase.from('spiel_videos').delete().eq('id', id); loadMedia() }

  async function dateiHochladen(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    const pfad = `spiele/${spiel.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('spiel-dateien').upload(pfad, file)
    if (!error) {
      const { data:{ publicUrl } } = supabase.storage.from('spiel-dateien').getPublicUrl(pfad)
      const ext = file.name.split('.').pop().toLowerCase()
      const typ = ext==='pdf'?'praesentation':'sonstiges'
      await supabase.from('spiel_dateien').insert({ spiel_id:spiel.id, typ, name:file.name, datei_url:publicUrl, datei_groesse:file.size, sichtbar_fuer_spieler:true, hochgeladen_von:profile.id })
      loadMedia()
    }
    setUploading(false)
  }

  async function dateiLoeschen(id) { await supabase.from('spiel_dateien').delete().eq('id', id); loadMedia() }

  async function startingSpeichern() {
    setSaving(true)
    await supabase.from('spiele').update({ starting_seven: startingSeven }).eq('id', spiel.id)
    setSaving(false); setShowStarting(false); onUpdate()
  }

  const TYPEN = { vorbereitung:'🎬 Vorbereitung', spiel:'🏐 Spiel', analyse:'📊 Analyse', sonstiges:'📎 Sonstiges' }
  const DATEI_ICONS = { praesentation:'📊', spielplan:'📋', taktik:'🎯', sonstiges:'📎' }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'flex-start' }}>

      {/* LINKE SEITE */}
      <div>
        {/* Spielidee & Agenda */}
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>📋 Spielvorbereitung</div>
            {isStaff && <button onClick={()=>{ setNotizForm({ spielidee:spiel?.spielidee||'', agenda:spiel?.agenda||'', taktische_hinweise:spiel?.taktische_hinweise||'' }); setEditNotizen(!editNotizen) }} className={`btn btn-sm ${editNotizen?'btn-primary':'btn-outline'}`}>{editNotizen?'Abbrechen':'Bearbeiten'}</button>}
          </div>

          {editNotizen && isStaff ? (
            <div>
              <div className="form-group"><label>💡 Spielidee / Taktik</label><textarea value={notizForm.spielidee} onChange={e=>setNotizForm(p=>({...p,spielidee:e.target.value}))} rows={4} placeholder="Welche taktische Idee verfolgen wir? Welches System spielen wir?" /></div>
              <div className="form-group"><label>📅 Agenda / Ablauf</label><textarea value={notizForm.agenda} onChange={e=>setNotizForm(p=>({...p,agenda:e.target.value}))} rows={4} placeholder="z.B. 17:30 Treff, 18:00 Einwärmen, 18:15 Besprechung, 18:30 Spiel" /></div>
              <div className="form-group"><label>🎯 Taktische Hinweise</label><textarea value={notizForm.taktische_hinweise} onChange={e=>setNotizForm(p=>({...p,taktische_hinweise:e.target.value}))} rows={4} placeholder="Stärken/Schwächen des Gegners, besondere Hinweise..." /></div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={notizSpeichern} className="btn btn-primary btn-sm" disabled={saving}>{saving?'Speichern…':'Speichern'}</button>
                <button onClick={()=>setEditNotizen(false)} className="btn btn-outline btn-sm">Abbrechen</button>
              </div>
            </div>
          ) : (
            <div>
              {spiel?.spielidee ? (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>💡 Spielidee</div>
                  <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{spiel.spielidee}</div>
                </div>
              ) : null}
              {spiel?.agenda ? (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>📅 Agenda</div>
                  <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{spiel.agenda}</div>
                </div>
              ) : null}
              {spiel?.taktische_hinweise ? (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>🎯 Taktische Hinweise</div>
                  <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{spiel.taktische_hinweise}</div>
                </div>
              ) : null}
              {!spiel?.spielidee && !spiel?.agenda && !spiel?.taktische_hinweise && (
                <p style={{ fontSize:13, color:'var(--gray-400)' }}>{isStaff ? 'Noch keine Vorbereitung eingetragen.' : 'Spielvorbereitung folgt.'}</p>
              )}
            </div>
          )}
        </div>

        {/* Dateien */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>📁 Dateien & Präsentationen</div>
            {isStaff && (
              <label className="btn btn-sm btn-outline" style={{ cursor:'pointer' }}>
                {uploading ? 'Hochladen…' : '+ Datei'}
                <input type="file" accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png" style={{ display:'none' }} onChange={dateiHochladen} />
              </label>
            )}
          </div>
          {dateien.length===0 ? <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Dateien.</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {dateien.map(d=>(
                <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{DATEI_ICONS[d.typ]||'📎'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <a href={d.datei_url} target="_blank" rel="noreferrer" style={{ fontSize:13, fontWeight:600, color:'var(--navy)', textDecoration:'none', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</a>
                    <div style={{ fontSize:11, color:'var(--gray-400)' }}>{d.datei_groesse ? Math.round(d.datei_groesse/1024)+'KB' : ''}</div>
                  </div>
                  <a href={d.datei_url} target="_blank" rel="noreferrer" style={{ fontSize:11, background:'#ddeaff', color:'#1a4a8a', padding:'3px 8px', borderRadius:4, textDecoration:'none', flexShrink:0 }}>⬇ Öffnen</a>
                  {isStaff && <button onClick={()=>dateiLoeschen(d.id)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:16, flexShrink:0 }}>×</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECHTE SEITE */}
      <div>
        {/* Starting Seven */}
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>🏐 Starting Seven</div>
            {isStaff && <button onClick={()=>setShowStarting(!showStarting)} className={`btn btn-sm ${showStarting?'btn-primary':'btn-outline'}`}>{showStarting?'Abbrechen':'Bearbeiten'}</button>}
          </div>

          {showStarting && isStaff ? (
            <div>
              <p style={{ fontSize:12, color:'var(--gray-400)', marginBottom:10 }}>Wähle 7 Spieler für die Startaufstellung (klicken = togglen)</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:12 }}>
                {spieler.map(sp=>{
                  const istStarting = startingSeven.includes(sp.id)
                  return (
                    <button key={sp.id} onClick={()=>setStartingSeven(p=>p.includes(sp.id)?p.filter(x=>x!==sp.id):[...p,sp.id])}
                      style={{ padding:'8px 6px', borderRadius:'var(--radius)', border:`2px solid ${istStarting?'var(--gold)':'var(--gray-200)'}`, background:istStarting?'#fff8e8':'var(--white)', cursor:'pointer', fontWeight:istStarting?700:400, fontSize:11, textAlign:'center' }}>
                      <div style={{ fontWeight:700, color:istStarting?'var(--gold)':'var(--gray-300)', fontFamily:'monospace' }}>#{sp.trikotnummer||'?'}</div>
                      <div style={{ fontSize:10 }}>{sp.vorname?.[0]}. {sp.nachname}</div>
                    </button>
                  )
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:12, color:startingSeven.length===7?'var(--green)':'var(--orange)', fontWeight:600 }}>{startingSeven.length}/7 gewählt</span>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setStartingSeven([])} className="btn btn-sm btn-outline" style={{ fontSize:11 }}>Leeren</button>
                  <button onClick={startingSpeichern} className="btn btn-sm btn-gold" disabled={saving}>{saving?'…':'Speichern'}</button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {startingSeven.length===0 ? (
                <p style={{ fontSize:13, color:'var(--gray-400)' }}>{isStaff ? 'Noch keine Starting Seven definiert.' : 'Startaufstellung folgt.'}</p>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))', gap:8 }}>
                  {spieler.filter(sp=>startingSeven.includes(sp.id)).map(sp=>(
                    <div key={sp.id} style={{ textAlign:'center', padding:'10px 6px', background:'#fff8e8', borderRadius:'var(--radius)', border:'2px solid var(--gold)' }}>
                      {sp.foto_url
                        ? <img src={sp.foto_url} alt="" style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', margin:'0 auto 4px', display:'block', border:'2px solid var(--gold)' }} />
                        : <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:14, fontFamily:'monospace', margin:'0 auto 4px' }}>#{sp.trikotnummer||'?'}</div>
                      }
                      <div style={{ fontSize:11, fontWeight:700 }}>{sp.vorname?.[0]}. {sp.nachname}</div>
                      <div style={{ fontSize:10, color:'var(--gray-400)' }}>{sp.position?.split(' ').pop()||''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Videos */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>📹 Videos</div>
            {isStaff && <button onClick={()=>setShowVideoForm(!showVideoForm)} className={`btn btn-sm ${showVideoForm?'btn-primary':'btn-outline'}`}>+ Video</button>}
          </div>

          {showVideoForm && isStaff && (
            <div style={{ marginBottom:12, padding:12, background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
              <div className="form-group"><label>Typ</label>
                <select value={videoForm.typ} onChange={e=>setVideoForm(p=>({...p,typ:e.target.value}))}>
                  {Object.entries(TYPEN).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Titel *</label><input value={videoForm.titel} onChange={e=>setVideoForm(p=>({...p,titel:e.target.value}))} placeholder="z.B. Taktikbesprechung" autoFocus /></div>
              <div className="form-group"><label>YouTube URL *</label>
                <input value={videoForm.youtube_url} onChange={e=>setVideoForm(p=>({...p,youtube_url:e.target.value}))} placeholder="https://www.youtube.com/watch?v=…" />
                {videoForm.youtube_url && extractYoutubeId(videoForm.youtube_url) && <div style={{ fontSize:11, color:'var(--green)', marginTop:3 }}>✓ Video erkannt</div>}
                {videoForm.youtube_url && !extractYoutubeId(videoForm.youtube_url) && <div style={{ fontSize:11, color:'var(--red)', marginTop:3 }}>⚠️ Ungültige URL</div>}
              </div>
              <div className="form-group"><label>Beschreibung</label><textarea value={videoForm.beschreibung} onChange={e=>setVideoForm(p=>({...p,beschreibung:e.target.value}))} rows={2} /></div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={videoHinzufuegen} className="btn btn-sm btn-primary" disabled={saving||!videoForm.titel||!videoForm.youtube_url}>{saving?'…':'Hinzufügen'}</button>
                <button onClick={()=>setShowVideoForm(false)} className="btn btn-sm btn-outline">Abbrechen</button>
              </div>
            </div>
          )}

          {videos.length===0 ? <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Videos.</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {videos.map(v=>{
                const thumb = v.youtube_id ? `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg` : null
                return (
                  <div key={v.id} style={{ borderRadius:'var(--radius)', overflow:'hidden', border:'1px solid var(--gray-200)' }}>
                    {thumb && (
                      <div style={{ position:'relative', paddingBottom:'56.25%', background:'#000' }}>
                        <img src={thumb} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.8 }} />
                        <a href={v.youtube_url} target="_blank" rel="noreferrer"
                          style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none' }}>
                          <div style={{ width:50, height:50, borderRadius:'50%', background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:20 }}>▶</div>
                        </a>
                      </div>
                    )}
                    <div style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase' }}>{TYPEN[v.typ]}</div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{v.titel}</div>
                        {v.beschreibung && <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>{v.beschreibung}</div>}
                      </div>
                      <a href={v.youtube_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ fontSize:11, flexShrink:0 }}>▶ Öffnen</a>
                      {isStaff && <button onClick={()=>videoLoeschen(v.id)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:16, flexShrink:0 }}>×</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── VIDEO TAB ────────────────────────────────────────────────
function VideoTab({ spiel, onUpdate, isStaff: isStaffProp }) {
  const { profile } = useAuth()
  const isStaff = isStaffProp || profile?.rolle==='admin' || (profile?.bereiche||[]).includes('mannschaft')
  const isSpieler = profile?.rolle === 'spieler'
  const [url, setUrl] = useState(spiel?.youtube_url || '')
  const [saving, setSaving] = useState(false)
  const [editUrl, setEditUrl] = useState(false)
  const playerDivRef = useRef(null)
  const playerRef = useRef(null)
  const [playerReady, setPlayerReady] = useState(false)

  const ytId = spiel?.youtube_id || extractYoutubeId(spiel?.youtube_url)

  // YouTube Player init
  useEffect(() => {
    if (!ytId) return
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'yt-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
    const poll = setInterval(() => {
      if (window.YT?.Player && playerDivRef.current && !playerRef.current) {
        clearInterval(poll)
        try {
          playerRef.current = new window.YT.Player(playerDivRef.current, {
            width: '100%', height: '100%',
            videoId: ytId,
            playerVars: { rel:0, modestbranding:1, origin: window.location.origin },
            events: { onReady: () => setPlayerReady(true) }
          })
        } catch(e) {}
      }
    }, 200)
    return () => {
      clearInterval(poll)
      try { if (playerRef.current) playerRef.current.destroy() } catch(e) {}
      playerRef.current = null
    }
  }, [ytId])

  async function urlSpeichern() {
    setSaving(true)
    const id = extractYoutubeId(url)
    await supabase.from('spiele').update({ youtube_url: url||null, youtube_id: id||null }).eq('id', spiel.id)
    setSaving(false); setEditUrl(false); onUpdate()
  }

  return (
    <div>
      {/* URL Management (nur Staff) */}
      {isStaff && (
        <div className="card" style={{ marginBottom:12, padding:'12px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--navy)' }}>📹 Spielvideo</span>
            {!editUrl ? (
              <>
                {ytId
                  ? <span style={{ fontSize:12, color:'var(--green)' }}>✓ Video verknüpft</span>
                  : <span style={{ fontSize:12, color:'var(--gray-400)' }}>Noch kein Video hinterlegt</span>
                }
                <button onClick={()=>setEditUrl(true)} className="btn btn-sm btn-outline">{ytId?'URL ändern':'+ Video hinzufügen'}</button>
              </>
            ) : (
              <div style={{ display:'flex', gap:8, flex:1, flexWrap:'wrap' }}>
                <input
                  value={url}
                  onChange={e=>setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=… oder Livestream-URL"
                  style={{ flex:1, minWidth:240, padding:'6px 10px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13 }}
                  autoFocus
                />
                {url && extractYoutubeId(url) && <span style={{ fontSize:11, color:'var(--green)', alignSelf:'center' }}>✓</span>}
                {url && !extractYoutubeId(url) && <span style={{ fontSize:11, color:'var(--red)', alignSelf:'center' }}>⚠️ Ungültige URL</span>}
                <button onClick={urlSpeichern} className="btn btn-sm btn-primary" disabled={saving}>{saving?'…':'Speichern'}</button>
                <button onClick={()=>{ setUrl(spiel?.youtube_url||''); setEditUrl(false) }} className="btn btn-sm btn-outline">Abbrechen</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Player */}
      {ytId ? (
        <div>
          <div style={{ position:'relative', paddingBottom:'56.25%', background:'#000', borderRadius:'var(--radius)', overflow:'hidden' }}>
            <div ref={playerDivRef} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }}/>
            {!playerReady && (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, color:'white' }}>
                <div style={{ fontSize:40 }}>▶</div>
                <div style={{ fontSize:13, opacity:0.7 }}>Video lädt…</div>
              </div>
            )}
          </div>
          <div style={{ marginTop:10, fontSize:12, color:'var(--gray-400)', textAlign:'center' }}>
            {spiel.gegner && `HC Bremen vs. ${spiel.gegner}`}
            {spiel.datum && ` · ${new Date(spiel.datum+'T00:00:00').toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})}`}
          </div>
        </div>
      ) : (
        <div className="empty-state card">
          <div style={{ fontSize:40, marginBottom:12 }}>📹</div>
          <p style={{ fontWeight:600, marginBottom:4 }}>Noch kein Video hinterlegt</p>
          {isStaff
            ? <p style={{ fontSize:13, color:'var(--gray-400)' }}>Füge eine YouTube-URL hinzu um das Spielvideo für alle Spieler sichtbar zu machen.</p>
            : <p style={{ fontSize:13, color:'var(--gray-400)' }}>Das Video wird nach dem Spiel hier verfügbar sein.</p>
          }
        </div>
      )}
    </div>
  )
}

// ── SPIEL LISTE ───────────────────────────────────────────────
function SpielListe() {
  const navigate   = useNavigate()
  const { profile } = useAuth()
  const [spiele, setSpiele]     = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [saisons, setSaisons]   = useState([])
  const [aktiveMn, setAktiveMn] = useState('')
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [dbFehler, setDbFehler] = useState(null)
  const [form, setForm] = useState({ mannschaft_id:'', gegner:'', datum:'', anstoss:'', heim_auswaerts:'heim', saison_id:'' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [{ data: mn }, { data: sa }] = await Promise.all([
        supabase.from('mannschaften').select('*').eq('aktiv',true).order('reihenfolge'),
        supabase.from('saisons').select('*').order('name'),
      ])
      setMannschaften(mn||[])
      setSaisons(sa||[])
      const mnId = mn?.[0]?.id||''
      setAktiveMn(mnId)
      if (mnId) await ladeSpiele(mnId)
    } catch(err) {
      console.error('SpielTracking load error:', err)
    }
    setLoading(false)
  }

  async function ladeSpiele(mnId) {
    const { data, error } = await supabase.from('spiele')
      .select('*, mannschaft:mannschaft_id(name,farbe), saison:saison_id(name)')
      .eq('mannschaft_id', mnId)
      .order('datum', { ascending: false })
    if (error) {
      setDbFehler('Tabelle "spiele" nicht gefunden. Bitte spieltracking_migration.sql in Supabase ausführen. Fehler: ' + error.message)
      return
    }
    setSpiele(data||[])
  }

  async function speichern() {
    if (!form.gegner.trim()||!form.datum||!form.mannschaft_id) return
    setSaving(true)
    const { data } = await supabase.from('spiele').insert({ ...form, saison_id:form.saison_id||null, anstoss:form.anstoss||null, erstellt_von:profile.id }).select().single()
    setSaving(false); setShowForm(false)
    if (data) navigate(`/mannschaft/spieltracking/${data.id}`)
  }

  const geplant   = spiele.filter(s=>s.status==='geplant')
  const laufend   = spiele.filter(s=>['laufend','halbzeit'].includes(s.status))
  const beendet   = spiele.filter(s=>s.status==='beendet')

  return (
    <div>
      {dbFehler && (
        <div style={{ background:'#fce4d6', border:'1px solid var(--red)', borderRadius:'var(--radius)', padding:'14px 18px', marginBottom:16 }}>
          <div style={{ fontWeight:700, color:'var(--red)', marginBottom:6 }}>⚠️ Datenbank-Fehler</div>
          <div style={{ fontSize:13, color:'#8a3a1a' }}>{dbFehler}</div>
          <div style={{ fontSize:12, color:'#8a3a1a', marginTop:8 }}>
            Führe <strong>spieltracking_migration.sql</strong> im Supabase SQL Editor aus und lade die Seite neu.
          </div>
        </div>
      )}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16, justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {mannschaften.map(m=>(
            <button key={m.id} onClick={async()=>{ setAktiveMn(m.id); setLoading(true); await ladeSpiele(m.id); setLoading(false) }}
              style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
                background:aktiveMn===m.id?(m.farbe||'var(--navy)'):'var(--gray-100)',
                color:aktiveMn===m.id?'white':'var(--gray-600)' }}>
              {m.name}
            </button>
          ))}
        </div>
        <button onClick={()=>{ setForm(p=>({...p,mannschaft_id:aktiveMn})); setShowForm(true) }} className="btn btn-primary">+ Spiel anlegen</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal" style={{ maxWidth:540 }}>
            <div className="modal-header"><span className="modal-title">Spiel anlegen</span><button className="close-btn" onClick={()=>setShowForm(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Mannschaft *</label>
                  <select value={form.mannschaft_id} onChange={e=>setForm(p=>({...p,mannschaft_id:e.target.value}))}>
                    <option value="">Wählen…</option>
                    {mannschaften.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Saison</label>
                  <select value={form.saison_id} onChange={e=>setForm(p=>({...p,saison_id:e.target.value}))}>
                    <option value="">–</option>
                    {saisons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Gegner *</label><input value={form.gegner} onChange={e=>setForm(p=>({...p,gegner:e.target.value}))} autoFocus placeholder="Gegnerteam" /></div>
              <div className="form-row">
                <div className="form-group"><label>Datum *</label><input type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))} /></div>
                <div className="form-group"><label>Anwurf</label><input type="time" value={form.anstoss} onChange={e=>setForm(p=>({...p,anstoss:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Heim / Auswärts</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[['heim','🏠 Heim'],['auswaerts','✈️ Auswärts'],['neutral','⚖️ Neutral']].map(([k,l])=>(
                    <button key={k} type="button" onClick={()=>setForm(p=>({...p,heim_auswaerts:k}))}
                      className={`btn btn-sm ${form.heim_auswaerts===k?'btn-primary':'btn-outline'}`}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setShowForm(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={speichern} className="btn btn-primary" disabled={saving}>{saving?'Anlegen…':'Spiel anlegen'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div>
          {laufend.length>0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--red)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>🔴 Live ({laufend.length})</div>
              {laufend.map(s=><SpielKarte key={s.id} spiel={s} onClick={()=>navigate(`/mannschaft/spieltracking/${s.id}`)} />)}
            </div>
          )}
          {geplant.length>0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Geplant ({geplant.length})</div>
              {geplant.map(s=><SpielKarte key={s.id} spiel={s} onClick={()=>navigate(`/mannschaft/spieltracking/${s.id}`)} />)}
            </div>
          )}
          {beendet.length>0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Beendet ({beendet.length})</div>
              {beendet.slice(0,10).map(s=><SpielKarte key={s.id} spiel={s} onClick={()=>navigate(`/mannschaft/spieltracking/${s.id}`)} />)}
            </div>
          )}
          {spiele.length===0 && <div className="empty-state card"><p>Noch keine Spiele für diese Mannschaft.</p></div>}
        </div>
      )}
    </div>
  )
}

function SpielKarte({ spiel: s, onClick }) {
  const isLive = ['laufend','halbzeit'].includes(s.status)
  const gewon  = s.status==='beendet' && s.endstand_eigene > s.endstand_gegner
  const verlor = s.status==='beendet' && s.endstand_eigene < s.endstand_gegner
  return (
    <div className="card" style={{ padding:16, marginBottom:8, cursor:'pointer', borderLeft:`4px solid ${isLive?'var(--red)':gewon?'var(--green)':verlor?'var(--red)':'var(--gray-200)'}` }}
      onClick={onClick}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-lg)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow)'}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
            {isLive && <span style={{ fontSize:11, background:'var(--red)', color:'white', padding:'2px 8px', borderRadius:20, fontWeight:700, animation:'pulse 1.5s infinite' }}>● LIVE</span>}
            <span style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>vs. {s.gegner}</span>
            <span style={{ fontSize:11, color:'var(--gray-400)' }}>{s.heim_auswaerts==='heim'?'🏠':s.heim_auswaerts==='auswaerts'?'✈️':'⚖️'}</span>
          </div>
          <div style={{ fontSize:12, color:'var(--gray-500)', display:'flex', gap:12 }}>
            <span>{s.datum ? new Date(s.datum+'T00:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}) : '–'}</span>
            {s.anstoss && <span>⏱ {s.anstoss.slice(0,5)}</span>}
            {s.saison && <span>📅 {s.saison.name}</span>}
          </div>
        </div>
        {s.status!=='geplant' && (
          <div style={{ textAlign:'center', flexShrink:0 }}>
            <div style={{ fontSize:26, fontWeight:900, color:'var(--navy)', fontFamily:'monospace', lineHeight:1 }}>
              {s.endstand_eigene}:{s.endstand_gegner}
            </div>
            {s.status==='beendet' && (
              <div style={{ fontSize:11, fontWeight:700, color: gewon?'var(--green)':verlor?'var(--red)':'var(--gray-400)' }}>
                {gewon?'SIEG':verlor?'NIEDERLAGE':'UNENTSCHIEDEN'}
              </div>
            )}
          </div>
        )}
        {s.status==='geplant' && <span style={{ fontSize:13, color:'var(--gray-400)' }}>→ Starten</span>}
      </div>
    </div>
  )
}

// ── LIVE TRACKING ─────────────────────────────────────────────
function SpielDetail() {
  const { id } = useParams()
  const navigate   = useNavigate()
  const { profile } = useAuth()

  const [spiel, setSpiel]           = useState(null)
  const [ereignisse, setEreignisse] = useState([])
  const [aufstellung, setAufstellung] = useState([])
  const [alleSpieler, setAlleSpieler] = useState([])
  const [loading, setLoading]       = useState(true)
  const [fehler, setFehler]         = useState(null)
  const [tab, setTab]               = useState('tracking')
  const [isOnline, setIsOnline]     = useState(navigator.onLine)
  const [offlineQueue, setOfflineQueue] = useState(getQueue())

  // Edit form
  const [showEdit, setShowEdit]     = useState(false)
  const [editForm, setEditForm]     = useState({})
  const [mannschaften, setMannschaften] = useState([])
  const [saisons, setSaisons]       = useState([])
  const [saving, setSaving]         = useState(false)

  // Tracking
  const [aktiverSpieler, setAktiverSpieler] = useState(null)
  const [minute, setMinute]         = useState(1)
  const [halbzeit, setHalbzeit]     = useState(1)
  const [showSpielerPicker, setShowSpielerPicker] = useState(false)
  const [pendingTyp, setPendingTyp] = useState(null)
  const [showTorBereich, setShowTorBereich]   = useState(false)
  const [pendingEreignis, setPendingEreignis] = useState(null)
  const [timerLaeuft, setTimerLaeuft]         = useState(false)
  const [timerSekunden, setTimerSekunden]     = useState(0)
  const minuteTimer = useRef(null)

  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) syncQueue()
  }, [isOnline])

  useEffect(() => {
    if (timerLaeuft) {
      minuteTimer.current = setInterval(() => {
        setTimerSekunden(s => { if (s >= 59) { setMinute(m => m+1); return 0 }; return s+1 })
      }, 1000)
    } else clearInterval(minuteTimer.current)
    return () => clearInterval(minuteTimer.current)
  }, [timerLaeuft])

  useEffect(() => { load() }, [id])

  async function syncQueue() {
    const q = getQueue()
    if (!q.length) return
    for (const item of q) {
      try { await supabase.from('spiel_ereignisse').insert(item) } catch(e) {}
    }
    clearQueue(); setOfflineQueue([])
    await ladeEreignisse()
  }

  async function load() {
    setLoading(true); setFehler(null)
    try {
      // Load Spiel
      const { data: s, error: se } = await supabase
        .from('spiele')
        .select('*')
        .eq('id', id)
        .single()

      if (se || !s) { setFehler(se?.message || 'Spiel nicht gefunden'); setLoading(false); return }
      setSpiel(s); setEditForm(s)

      // Load parallel
      const [{ data: e }, { data: a }, { data: sp }, { data: mn }, { data: sa }] = await Promise.all([
        supabase.from('spiel_ereignisse')
          .select('*, spieler:spieler_id(vorname,nachname,trikotnummer,position), assist:assist_spieler_id(vorname,nachname,trikotnummer)')
          .eq('spiel_id', id)
          .order('erstellt_am', { ascending: true }),
        supabase.from('spiel_aufstellung')
          .select('*, spieler:spieler_id(id,vorname,nachname,trikotnummer,position,foto_url)')
          .eq('spiel_id', id),
        supabase.from('spieler')
          .select('id,vorname,nachname,trikotnummer,position,foto_url')
          .eq('mannschaft_id', s.mannschaft_id)
          .eq('aktiv', true)
          .eq('typ', 'kader')
          .order('trikotnummer'),
        supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
        supabase.from('saisons').select('*').order('name'),
      ])

      setEreignisse(e||[]); setAufstellung(a||[])
      setAlleSpieler(sp||[]); setMannschaften(mn||[]); setSaisons(sa||[])
    } catch(err) {
      setFehler('Unerwarteter Fehler: ' + err.message)
    }
    setLoading(false)
  }

  async function ladeEreignisse() {
    const { data } = await supabase.from('spiel_ereignisse')
      .select('*, spieler:spieler_id(vorname,nachname,trikotnummer,position), assist:assist_spieler_id(vorname,nachname,trikotnummer)')
      .eq('spiel_id', id)
      .order('erstellt_am', { ascending: true })
    setEreignisse(data||[])
  }

  async function editSpeichern() {
    setSaving(true)
    const { error } = await supabase.from('spiele').update({
      gegner: editForm.gegner,
      datum: editForm.datum,
      anstoss: editForm.anstoss || null,
      heim_auswaerts: editForm.heim_auswaerts,
      mannschaft_id: editForm.mannschaft_id,
      saison_id: editForm.saison_id || null,
      notizen: editForm.notizen || null,
    }).eq('id', id)
    setSaving(false)
    if (!error) { setShowEdit(false); load() }
  }

  async function spielStatusAendern(status) {
    await supabase.from('spiele').update({ status }).eq('id', id)
    if (status === 'laufend') setTimerLaeuft(true)
    if (['halbzeit','beendet'].includes(status)) setTimerLaeuft(false)
    load()
  }

  async function aufstellungHinzufuegen(spielerId) {
    await supabase.from('spiel_aufstellung').upsert(
      { spiel_id: id, spieler_id: spielerId },
      { onConflict: 'spiel_id,spieler_id' }
    )
    load()
  }

  async function scoreAnpassen(seite, delta) {
    const field = seite === 'eigen' ? 'endstand_eigene' : 'endstand_gegner'
    const neu = Math.max(0, (spiel?.[field]||0) + delta)
    await supabase.from('spiele').update({ [field]: neu }).eq('id', id)
    setSpiel(p => ({ ...p, [field]: neu }))
  }

  function ereignisStarten(typ) {
    const brauchtSpieler = !['tor_gegner','tor_gegner_7m','zeitstrafe_gegner','karte_gegner','timeout_eigen','timeout_gegner'].includes(typ)
    const istTor = ['tor','tor_7m'].includes(typ)

    if (brauchtSpieler && !aktiverSpieler) {
      setPendingTyp(typ); setShowSpielerPicker(true); return
    }

    if (istTor) {
      setPendingEreignis({ typ, spieler_id: aktiverSpieler?.id||null })
      setShowTorBereich(true); return
    }

    erfassenMitDaten({ typ, spieler_id: aktiverSpieler?.id||null, torbereich: null })
  }

  async function erfassenMitDaten(daten) {
    const ereignis = {
      spiel_id: id, minute, sekunde: timerSekunden, halbzeit,
      ...daten, offline_id: `offline_${Date.now()}`,
    }

    const istEigen  = ['tor','tor_7m'].includes(daten.typ)
    const istGegner = ['tor_gegner','tor_gegner_7m'].includes(daten.typ)
    if (istEigen || istGegner) {
      const field = istEigen ? 'endstand_eigene' : 'endstand_gegner'
      const neu = (spiel?.[field]||0) + 1
      await supabase.from('spiele').update({ [field]: neu }).eq('id', id)
      setSpiel(p => ({ ...p, [field]: neu }))
    }

    if (isOnline) {
      try {
        await supabase.from('spiel_ereignisse').insert(ereignis)
        await ladeEreignisse()
      } catch(err) {
        addToQueue(ereignis); setOfflineQueue(getQueue())
        setEreignisse(prev => [...prev, { ...ereignis, id:`local_${Date.now()}`, spieler:aktiverSpieler }])
      }
    } else {
      addToQueue(ereignis); setOfflineQueue(getQueue())
      setEreignisse(prev => [...prev, { ...ereignis, id:`local_${Date.now()}`, spieler:aktiverSpieler }])
    }
  }

  function spielerGewaehlt(sp) {
    setAktiverSpieler(sp); setShowSpielerPicker(false)
    if (pendingTyp) {
      const typ = pendingTyp; setPendingTyp(null)
      if (['tor','tor_7m'].includes(typ)) {
        setPendingEreignis({ typ, spieler_id: sp.id }); setShowTorBereich(true)
      } else {
        erfassenMitDaten({ typ, spieler_id: sp.id, torbereich: null })
      }
    }
  }

  async function ereignisLoeschen(eid) {
    if (eid.startsWith('local_')) return
    // Score zurückrechnen
    const e = ereignisse.find(x=>x.id===eid)
    if (e) {
      const istEigen  = ['tor','tor_7m'].includes(e.typ)
      const istGegner = ['tor_gegner','tor_gegner_7m'].includes(e.typ)
      if (istEigen || istGegner) {
        const field = istEigen ? 'endstand_eigene' : 'endstand_gegner'
        const neu = Math.max(0, (spiel?.[field]||0) - 1)
        await supabase.from('spiele').update({ [field]: neu }).eq('id', id)
        setSpiel(p => ({ ...p, [field]: neu }))
      }
    }
    await supabase.from('spiel_ereignisse').delete().eq('id', eid)
    ladeEreignisse()
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  if (fehler) return (
    <div>
      <button onClick={()=>navigate('/mannschaft/spieltracking')} className="back-btn">← Zurück</button>
      <div className="card" style={{ padding:20 }}>
        <div style={{ color:'var(--red)', fontWeight:700, marginBottom:8 }}>Fehler beim Laden</div>
        <div style={{ fontSize:13 }}>{fehler}</div>
        <button onClick={load} className="btn btn-outline" style={{ marginTop:12 }}>Erneut versuchen</button>
      </div>
    </div>
  )

  if (!spiel) return null

  const isLive    = ['laufend','halbzeit'].includes(spiel.status)
  const isBeendet = spiel.status === 'beendet'

  const tore       = ereignisse.filter(e=>['tor','tor_7m'].includes(e.typ)).length
  const paraden    = ereignisse.filter(e=>['parade','parade_7m'].includes(e.typ)).length
  const fehlwuerfe = ereignisse.filter(e=>['fehlwurf','fehlwurf_7m'].includes(e.typ)).length
  const strafen    = ereignisse.filter(e=>e.typ==='zeitstrafe_2min').length
  const gegnerTore = ereignisse.filter(e=>['tor_gegner','tor_gegner_7m'].includes(e.typ)).length
  const wuerfe     = ereignisse.filter(e=>['tor','tor_7m','fehlwurf','fehlwurf_7m'].includes(e.typ)).length
  const quote      = wuerfe > 0 ? Math.round(tore/wuerfe*100) : null

  const spielerStats = alleSpieler.map(sp => ({
    ...sp,
    tore:    ereignisse.filter(e=>e.spieler_id===sp.id && ['tor','tor_7m'].includes(e.typ)).length,
    assists: ereignisse.filter(e=>e.assist_spieler_id===sp.id).length,
    fehl:    ereignisse.filter(e=>e.spieler_id===sp.id && ['fehlwurf','fehlwurf_7m'].includes(e.typ)).length,
    strafen: ereignisse.filter(e=>e.spieler_id===sp.id && e.typ==='zeitstrafe_2min').length,
    paraden: ereignisse.filter(e=>e.spieler_id===sp.id && ['parade','parade_7m'].includes(e.typ)).length,
  })).filter(sp=>sp.tore+sp.assists+sp.fehl+sp.strafen+sp.paraden>0).sort((a,b)=>b.tore-a.tore)

  return (
    <div>
      <button onClick={()=>navigate('/mannschaft/spieltracking')} className="back-btn">← Zurück</button>

      {/* Offline Banner */}
      {!isOnline && (
        <div style={{ background:'#fff3cd', border:'1px solid #f0b429', borderRadius:'var(--radius)', padding:'10px 16px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>📵</span>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'#8a6a00' }}>Offline-Modus</div>
            <div style={{ fontSize:12, color:'#8a6a00' }}>{offlineQueue.length} Ereignisse ausstehend – werden beim nächsten Online-Gang synchronisiert.</div>
          </div>
        </div>
      )}

      {/* SCOREBOARD */}
      <div className="card" style={{ marginBottom:12, background:'var(--navy)', color:'white', padding:'16px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
          {/* Info links */}
          <div style={{ flex:1, minWidth:160 }}>
            <div style={{ fontSize:12, opacity:0.7, marginBottom:4, textTransform:'uppercase', letterSpacing:1 }}>
              HC Bremen {spiel.heim_auswaerts==='heim'?'🏠':spiel.heim_auswaerts==='auswaerts'?'✈️':'⚖️'} {spiel.gegner}
            </div>
            <div style={{ fontSize:11, opacity:0.6 }}>
              {spiel.datum ? new Date(spiel.datum+'T00:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'}) : ''}
              {spiel.anstoss ? ' · '+spiel.anstoss.slice(0,5) : ''}
            </div>
            <button onClick={()=>setShowEdit(!showEdit)} style={{ marginTop:8, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'var(--radius)', padding:'4px 10px', color:'white', fontSize:11, cursor:'pointer' }}>
              ✏️ Bearbeiten
            </button>
          </div>

          {/* Score Mitte */}
          <div style={{ textAlign:'center', flex:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {/* Minus eigen */}
              <button onClick={()=>scoreAnpassen('eigen',-1)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:6, color:'white', width:28, height:28, cursor:'pointer', fontSize:16, fontWeight:700 }}>−</button>
              <div style={{ fontSize:42, fontWeight:900, fontFamily:'monospace', lineHeight:1, letterSpacing:4 }}>
                {spiel.endstand_eigene||0}:{spiel.endstand_gegner||0}
              </div>
              {/* Plus gegner */}
              <button onClick={()=>scoreAnpassen('gegner',1)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:6, color:'white', width:28, height:28, cursor:'pointer', fontSize:16, fontWeight:700 }}>+</button>
            </div>
            <div style={{ fontSize:11, opacity:0.7, marginTop:4, display:'flex', gap:12, justifyContent:'center', alignItems:'center' }}>
              <button onClick={()=>scoreAnpassen('eigen',1)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:4, color:'white', padding:'2px 8px', cursor:'pointer', fontSize:11 }}>+HC</button>
              {isLive && <span style={{ background:'var(--red)', padding:'2px 8px', borderRadius:10, fontWeight:700 }}>● {halbzeit}.HZ {String(minute).padStart(2,'0')}:{String(timerSekunden).padStart(2,'0')}</span>}
              {!isLive && <span>{spiel.status==='geplant'?'Geplant':spiel.status==='halbzeit'?'Halbzeit':'Beendet'}</span>}
              <button onClick={()=>scoreAnpassen('gegner',-1)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:4, color:'white', padding:'2px 8px', cursor:'pointer', fontSize:11 }}>-Geg</button>
            </div>
          </div>

          {/* Buttons rechts */}
          <div style={{ flex:1, display:'flex', gap:8, justifyContent:'flex-end', flexWrap:'wrap', alignItems:'flex-start' }}>
            {spiel.status==='geplant'    && <button onClick={()=>spielStatusAendern('laufend')} style={{ background:'var(--green)', color:'white', border:'none', borderRadius:'var(--radius)', padding:'8px 16px', fontWeight:700, cursor:'pointer' }}>▶ Starten</button>}
            {spiel.status==='laufend'    && <>
              <button onClick={()=>setTimerLaeuft(p=>!p)} style={{ background:timerLaeuft?'#e07b30':'var(--green)', color:'white', border:'none', borderRadius:'var(--radius)', padding:'8px 12px', fontWeight:700, cursor:'pointer' }}>{timerLaeuft?'⏸':'▶'}</button>
              <button onClick={()=>{ spielStatusAendern('halbzeit'); setHalbzeit(2); setMinute(1); setTimerSekunden(0) }} style={{ background:'var(--gold)', color:'var(--navy)', border:'none', borderRadius:'var(--radius)', padding:'8px 12px', fontWeight:700, cursor:'pointer' }}>HZ</button>
              <button onClick={()=>spielStatusAendern('beendet')} style={{ background:'var(--red)', color:'white', border:'none', borderRadius:'var(--radius)', padding:'8px 12px', fontWeight:700, cursor:'pointer' }}>Ende</button>
            </>}
            {spiel.status==='halbzeit'   && <button onClick={()=>{ spielStatusAendern('laufend'); setTimerLaeuft(true) }} style={{ background:'var(--green)', color:'white', border:'none', borderRadius:'var(--radius)', padding:'8px 16px', fontWeight:700, cursor:'pointer' }}>▶ 2. HZ</button>}
            {spiel.status==='beendet'    && <button onClick={()=>spielStatusAendern('laufend')} style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:'var(--radius)', padding:'8px 12px', fontSize:12, cursor:'pointer' }}>Nacherfassen</button>}
          </div>
        </div>

        {/* Edit Form */}
        {showEdit && (
          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
              <div className="form-group"><label style={{ color:'rgba(255,255,255,0.7)' }}>Gegner</label><input value={editForm.gegner||''} onChange={e=>setEditForm(p=>({...p,gegner:e.target.value}))} /></div>
              <div className="form-group"><label style={{ color:'rgba(255,255,255,0.7)' }}>Datum</label><input type="date" value={editForm.datum||''} onChange={e=>setEditForm(p=>({...p,datum:e.target.value}))} /></div>
              <div className="form-group"><label style={{ color:'rgba(255,255,255,0.7)' }}>Anwurf</label><input type="time" value={editForm.anstoss||''} onChange={e=>setEditForm(p=>({...p,anstoss:e.target.value}))} /></div>
              <div className="form-group"><label style={{ color:'rgba(255,255,255,0.7)' }}>Heim/Auswärts</label>
                <select value={editForm.heim_auswaerts||'heim'} onChange={e=>setEditForm(p=>({...p,heim_auswaerts:e.target.value}))} >
                  <option value="heim">🏠 Heim</option><option value="auswaerts">✈️ Auswärts</option><option value="neutral">⚖️ Neutral</option>
                </select>
              </div>
              <div className="form-group"><label style={{ color:'rgba(255,255,255,0.7)' }}>Mannschaft</label>
                <select value={editForm.mannschaft_id||''} onChange={e=>setEditForm(p=>({...p,mannschaft_id:e.target.value}))}>
                  {mannschaften.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label style={{ color:'rgba(255,255,255,0.7)' }}>Saison</label>
                <select value={editForm.saison_id||''} onChange={e=>setEditForm(p=>({...p,saison_id:e.target.value}))}>
                  <option value="">–</option>
                  {saisons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label style={{ color:'rgba(255,255,255,0.7)' }}>Notizen</label><textarea value={editForm.notizen||''} onChange={e=>setEditForm(p=>({...p,notizen:e.target.value}))} rows={2} /></div>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button onClick={editSpeichern} className="btn btn-sm" style={{ background:'var(--gold)', color:'var(--navy)', border:'none', fontWeight:700 }} disabled={saving}>{saving?'Speichern…':'Speichern'}</button>
              <button onClick={()=>setShowEdit(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'var(--radius)', padding:'6px 12px', color:'white', cursor:'pointer', fontSize:12 }}>Abbrechen</button>
            </div>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="tabs" style={{ marginBottom:12 }}>
        <button className={`tab-btn${tab==='tracking'?'  active':''}`} onClick={()=>setTab('tracking')}>📊 Live-Tracking</button>
        <button className={`tab-btn${tab==='aufstellung'?' active':''}`} onClick={()=>setTab('aufstellung')}>👥 Aufstellung ({aufstellung.length})</button>
        <button className={`tab-btn${tab==='timeline'?' active':''}`} onClick={()=>setTab('timeline')}>📋 Timeline ({ereignisse.length})</button>
        <button className={`tab-btn${tab==='auswertung'?' active':''}`} onClick={()=>setTab('auswertung')}>📈 Auswertung</button>
      </div>

      {/* Spieler Picker */}
      {showSpielerPicker && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowSpielerPicker(false)}>
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header"><span className="modal-title">Spieler auswählen</span><button className="close-btn" onClick={()=>setShowSpielerPicker(false)}>×</button></div>
            <div className="modal-body" style={{ maxHeight:420, overflowY:'auto' }}>
              {alleSpieler.length===0 && <p style={{ color:'var(--gray-400)', fontSize:13 }}>Keine Spieler in der Aufstellung. Füge zuerst Spieler unter "Aufstellung" hinzu.</p>}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {alleSpieler.map(sp=>(
                  <button key={sp.id} onClick={()=>spielerGewaehlt(sp)}
                    style={{ padding:'10px 8px', borderRadius:'var(--radius)', border:`2px solid ${aktiverSpieler?.id===sp.id?'var(--navy)':'var(--gray-200)'}`, background:aktiverSpieler?.id===sp.id?'var(--navy)':'var(--white)', color:aktiverSpieler?.id===sp.id?'white':'var(--text)', cursor:'pointer', textAlign:'center', fontWeight:600, fontSize:12 }}>
                    <div style={{ fontSize:18, fontWeight:900, color:aktiverSpieler?.id===sp.id?'white':'var(--gray-300)', fontFamily:'monospace' }}>#{sp.trikotnummer||'?'}</div>
                    <div>{(sp.vorname||'')?.[0]}. {sp.nachname||''}</div>
                    <div style={{ fontSize:10, opacity:0.7 }}>{sp.position?.split(' ').pop()||''}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Torbereich Picker */}
      {showTorBereich && pendingEreignis && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowTorBereich(false)}>
          <div className="modal" style={{ maxWidth:320 }}>
            <div className="modal-header"><span className="modal-title">Torbereich wählen</span><button className="close-btn" onClick={()=>setShowTorBereich(false)}>×</button></div>
            <div className="modal-body">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:8 }}>
                {TOR_BEREICHE.map(b=>(
                  <button key={b.id} onClick={()=>{ setShowTorBereich(false); erfassenMitDaten({...pendingEreignis,torbereich:b.id}); setPendingEreignis(null) }}
                    style={{ padding:'20px 8px', borderRadius:'var(--radius)', border:'2px solid var(--navy)', background:'var(--navy)', color:'white', cursor:'pointer', fontWeight:800, fontSize:14 }}>
                    {b.label}
                  </button>
                ))}
              </div>
              <button onClick={()=>{ setShowTorBereich(false); erfassenMitDaten({...pendingEreignis,torbereich:null}); setPendingEreignis(null) }}
                className="btn btn-outline btn-sm" style={{ width:'100%', color:'var(--gray-400)' }}>Ohne Bereich</button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TRACKING */}
      {tab==='tracking' && (
        <div>
          <div className="card" style={{ marginBottom:12, padding:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ fontSize:12, color:'var(--gray-400)', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Aktiver Spieler:</div>
              {aktiverSpieler
                ? <><span style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>#{aktiverSpieler.trikotnummer} {aktiverSpieler.vorname} {aktiverSpieler.nachname}</span>
                    <button onClick={()=>setAktiverSpieler(null)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:18 }}>×</button></>
                : <span style={{ fontSize:13, color:'var(--gray-400)' }}>Keiner gewählt</span>
              }
              <button onClick={()=>setShowSpielerPicker(true)} className="btn btn-sm btn-outline">Spieler wählen</button>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto' }}>
                <button onClick={()=>setMinute(m=>Math.max(1,m-1))} style={{ width:28,height:28,border:'1px solid var(--gray-200)',borderRadius:4,cursor:'pointer',background:'var(--white)',fontSize:14 }}>−</button>
                <span style={{ fontWeight:700,fontSize:14,minWidth:40,textAlign:'center' }}>{String(minute).padStart(2,'0')}'</span>
                <button onClick={()=>setMinute(m=>m+1)} style={{ width:28,height:28,border:'1px solid var(--gray-200)',borderRadius:4,cursor:'pointer',background:'var(--white)',fontSize:14 }}>+</button>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {EREIGNIS_GRUPPEN.map(gruppe=>(
              <div key={gruppe.label}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:1,marginBottom:6 }}>{gruppe.label}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8 }}>
                  {gruppe.typen.map(t=>(
                    <button key={t.typ} onClick={()=>ereignisStarten(t.typ)}
                      style={{ padding:'14px 8px',borderRadius:'var(--radius)',border:`2px solid ${gruppe.farbe}44`,background:gruppe.bg,cursor:'pointer',fontWeight:700,fontSize:13,color:gruppe.farbe,display:'flex',flexDirection:'column',alignItems:'center',gap:4,transition:'all 0.1s',touchAction:'manipulation' }}
                      onMouseEnter={e=>{ e.currentTarget.style.background=gruppe.farbe; e.currentTarget.style.color='white' }}
                      onMouseLeave={e=>{ e.currentTarget.style.background=gruppe.bg; e.currentTarget.style.color=gruppe.farbe }}>
                      <span style={{ fontSize:22 }}>{t.icon}</span>
                      <span style={{ fontSize:11,fontWeight:700 }}>{t.label}</span>
                      {t.shortcut && <span style={{ fontSize:10,opacity:0.6 }}>[{t.shortcut}]</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="stats-row" style={{ marginTop:16 }}>
            {[
              ['⚽','Tore',tore,'var(--green)'],
              ['🛡️','Paraden',paraden,'#2d6fa3'],
              ['❌','Fehlwürfe',fehlwuerfe,'var(--orange)'],
              ['⏱️','Strafen',strafen,'var(--red)'],
              ['🔵','Gegner',gegnerTore,'#8b5cf6'],
              ...(quote!==null?[['🎯','Wurfquote',`${quote}%`,'var(--navy)']]:[]),
            ].map(([i,l,w,c])=>(
              <div key={l} className="stat-card"><div style={{ fontSize:18 }}>{i}</div><div className="stat-num" style={{ fontSize:20,color:c }}>{w}</div><div className="stat-label">{l}</div></div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: AUFSTELLUNG */}
      {tab==='aufstellung' && (
        <div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:1,marginBottom:8 }}>Spieler hinzufügen</div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {alleSpieler.filter(sp=>!aufstellung.some(a=>a.spieler_id===sp.id)).map(sp=>(
                <button key={sp.id} onClick={()=>aufstellungHinzufuegen(sp.id)} className="btn btn-sm btn-outline">
                  #{sp.trikotnummer||'?'} {(sp.vorname||'')?.[0]}. {sp.nachname}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10 }}>
            {aufstellung.map(a=>{
              const sp=a.spieler; if(!sp) return null
              const istAktiv=aktiverSpieler?.id===sp.id
              return (
                <div key={a.id} onClick={()=>setAktiverSpieler(istAktiv?null:sp)}
                  className="card" style={{ padding:12,marginBottom:0,cursor:'pointer',border:`2px solid ${istAktiv?'var(--navy)':'transparent'}`,background:istAktiv?'var(--navy)':undefined }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <div style={{ width:36,height:36,borderRadius:'50%',background:istAktiv?'white':'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',color:istAktiv?'var(--navy)':'white',fontWeight:900,fontSize:14,fontFamily:'monospace' }}>
                      #{sp.trikotnummer||'?'}
                    </div>
                    <div>
                      <div style={{ fontWeight:700,fontSize:12,color:istAktiv?'white':'var(--navy)' }}>{(sp.vorname||'')?.[0]}. {sp.nachname}</div>
                      <div style={{ fontSize:10,color:istAktiv?'rgba(255,255,255,0.7)':'var(--gray-400)' }}>{sp.position||''}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB: TIMELINE */}
      {tab==='timeline' && (
        <div>
          {ereignisse.length===0 ? <div className="empty-state card"><p>Noch keine Ereignisse.</p></div> : (
            <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
              {[...ereignisse].reverse().map(e=>{
                const meta=TYP_META[e.typ]||{icon:'📎',farbe:'#ccc',bg:'var(--gray-100)',label:e.typ}
                const istTor=['tor','tor_7m','tor_gegner','tor_gegner_7m'].includes(e.typ)
                return (
                  <div key={e.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:istTor?meta.bg:'var(--white)',borderRadius:'var(--radius)',border:`1px solid ${istTor?meta.farbe+'44':'var(--gray-200)'}`}}>
                    <span style={{ fontSize:16,flexShrink:0 }}>{meta.icon}</span>
                    <span style={{ fontSize:11,fontWeight:700,color:'var(--gray-400)',flexShrink:0,fontFamily:'monospace',minWidth:36 }}>{e.halbzeit||1}HZ {String(e.minute||0).padStart(2,'0')}'</span>
                    <span style={{ fontSize:13,fontWeight:istTor?700:400,color:meta.farbe }}>{meta.label}</span>
                    {e.spieler?.vorname && <span style={{ fontSize:12,color:'var(--gray-600)' }}>#{e.spieler.trikotnummer} {e.spieler.vorname?.[0]}. {e.spieler.nachname}</span>}
                    {e.assist?.vorname && <span style={{ fontSize:11,color:'var(--gray-400)' }}>↳ {e.assist.vorname?.[0]}. {e.assist.nachname}</span>}
                    {e.torbereich && <span style={{ fontSize:10,background:'var(--gray-100)',padding:'1px 6px',borderRadius:4 }}>{e.torbereich.replace('_',' ')}</span>}
                    {e.id && !e.id.startsWith('local_') && (
                      <button onClick={()=>ereignisLoeschen(e.id)} style={{ marginLeft:'auto',background:'none',border:'none',color:'var(--gray-300)',cursor:'pointer',fontSize:14,flexShrink:0 }}>×</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: VORBEREITUNG */}
      {tab==='vorbereitung' && (
        <VorbereitungsTab spiel={spiel} spieler={alleSpieler} aufstellung={aufstellung} onUpdate={load} isStaff={isStaff} />
      )}

      {/* TAB: VIDEO */}
      {tab==='video' && (
        <VideoTab spiel={spiel} onUpdate={load} isStaff={isStaff} />
      )}

      {/* TAB: AUSWERTUNG */}
      {tab==='auswertung' && (
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="section-title" style={{ marginBottom:14 }}>Team-Statistik</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
              {[
                ['Tore gesamt',`${tore} Feld + ${ereignisse.filter(e=>e.typ==='tor_7m').length} 7m`],
                ['Gegentore',`${gegnerTore}`],
                ['Wurfquote',quote!==null?`${quote}%`:'–'],
                ['Paraden',`${paraden}`],
                ['Fehlwürfe',`${fehlwuerfe}`],
                ['2-Minuten-Strafen',`${strafen}`],
              ].map(([l,v])=>(
                <div key={l} style={{ padding:'10px 12px',background:'var(--gray-100)',borderRadius:'var(--radius)' }}>
                  <div style={{ fontSize:11,color:'var(--gray-400)',marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:16,fontWeight:700,color:'var(--navy)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {spielerStats.length>0 && (
            <div className="card" style={{ marginBottom:16 }}>
              <div className="section-title" style={{ marginBottom:14 }}>Spieler-Statistik</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Spieler</th><th>Tore</th><th>Assists</th><th>Fehlw.</th><th>Paraden</th><th>2 Min.</th></tr></thead>
                  <tbody>
                    {spielerStats.map(sp=>(
                      <tr key={sp.id}>
                        <td style={{ fontWeight:600 }}>#{sp.trikotnummer} {sp.vorname?.[0]}. {sp.nachname}<div style={{ fontSize:11,color:'var(--gray-400)' }}>{sp.position}</div></td>
                        <td style={{ fontWeight:700,color:'var(--green)' }}>{sp.tore||'–'}</td>
                        <td>{sp.assists||'–'}</td>
                        <td style={{ color:sp.fehl>2?'var(--orange)':'inherit' }}>{sp.fehl||'–'}</td>
                        <td style={{ color:'#2d6fa3' }}>{sp.paraden||'–'}</td>
                        <td style={{ color:sp.strafen>0?'var(--red)':'inherit' }}>{sp.strafen||'–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {TOR_BEREICHE.some(b=>ereignisse.some(e=>e.torbereich===b.id)) && (
            <div className="card">
              <div className="section-title" style={{ marginBottom:14 }}>Tor-Verteilung nach Bereich</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,maxWidth:280 }}>
                {['links_oben','mitte_oben','rechts_oben','links_unten','mitte_unten','rechts_unten'].map(b=>{
                  const n=ereignisse.filter(e=>e.torbereich===b&&['tor','tor_7m'].includes(e.typ)).length
                  const max=Math.max(1,...['links_oben','mitte_oben','rechts_oben','links_unten','mitte_unten','rechts_unten'].map(b2=>ereignisse.filter(e=>e.torbereich===b2&&['tor','tor_7m'].includes(e.typ)).length))
                  return (
                    <div key={b} style={{ padding:'10px',borderRadius:'var(--radius)',background:n>0?`rgba(58,138,90,${0.2+0.6*n/max})`:`var(--gray-100)`,textAlign:'center',fontWeight:700 }}>
                      <div style={{ fontSize:20,color:'var(--green)' }}>{n}</div>
                      <div style={{ fontSize:10,color:'var(--gray-400)' }}>{b.replace(/_/g,' ')}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SpielTracking() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route index element={<SpielListe />} />
        <Route path=":id" element={<ErrorBoundary><SpielDetail /></ErrorBoundary>} />
      </Routes>
    </ErrorBoundary>
  )
}
