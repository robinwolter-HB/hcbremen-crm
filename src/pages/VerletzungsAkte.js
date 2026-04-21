function RehaBibliothekPicker({ koerperteil, onSelect, onClose }) {
  const [liste, setListe] = useState([])
  const [filter, setFilter] = useState(koerperteil||'')
  const [loading, setLoading] = useState(true)
  const REHA_TYPEN = { uebung:'🏋️', dehnung:'🧘', kraft:'💪', ausdauer:'🏃', koordination:'🎯', sonstiges:'📎' }

  useEffect(() => {
    supabase.from('reha_bibliothek').select('*').eq('aktiv',true).order('titel').then(({data})=>{ setListe(data||[]); setLoading(false) })
  }, [])

  const gefiltert = liste.filter(r => !filter || r.titel.toLowerCase().includes(filter.toLowerCase()) || (r.koerperteil||'').toLowerCase().includes(filter.toLowerCase()) || (r.beschreibung||'').toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:580 }}>
        <div className="modal-header"><span className="modal-title">📚 Reha-Bibliothek</span><button className="close-btn" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <input placeholder="Suchen nach Titel, Körperteil…" value={filter} onChange={e=>setFilter(e.target.value)} style={{ width:'100%', marginBottom:12 }} autoFocus />
          {loading ? <div className="loading-center"><div className="spinner"/></div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:380, overflowY:'auto' }}>
              {gefiltert.length===0 && <p style={{ color:'var(--gray-400)', fontSize:13 }}>Keine Aufgaben gefunden.</p>}
              {gefiltert.map(r=>(
                <div key={r.id} onClick={()=>onSelect(r)} className="card" style={{ padding:12, marginBottom:0, cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-lg)'}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow)'}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                    <span>{REHA_TYPEN[r.typ]||'📎'}</span>
                    <span style={{ fontWeight:600, fontSize:13 }}>{r.titel}</span>
                    {r.koerperteil && <span style={{ fontSize:10, background:'#ddeaff', color:'#1a4a8a', padding:'1px 7px', borderRadius:10 }}>📍 {r.koerperteil}</span>}
                  </div>
                  {r.beschreibung && <div style={{ fontSize:12, color:'var(--gray-500)', lineHeight:1.4 }}>{r.beschreibung.slice(0,100)}{r.beschreibung.length>100?'…':''}</div>}
                  <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--gray-400)', marginTop:4 }}>
                    {r.wiederholungen && <span>🔁 {r.wiederholungen}</span>}
                    {r.haeufigkeit && <span>📅 {r.haeufigkeit}</span>}
                    {r.dauer_wochen && <span>⏱ {r.dauer_wochen} Wo.</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import KoerperVisualisierung from './KoerperVisualisierung'

const BERICHT_TYPEN = {
  erstdiagnose: { label:'Erstdiagnose',  farbe:'#d94f4f', icon:'🏥' },
  untersuchung: { label:'Untersuchung',  farbe:'#2d6fa3', icon:'🔍' },
  behandlung:   { label:'Behandlung',    farbe:'#3a8a5a', icon:'💊' },
  reha:         { label:'Reha',          farbe:'#e07b30', icon:'🏃' },
  kontrolle:    { label:'Kontrolle',     farbe:'#8b5cf6', icon:'📋' },
  entlassung:   { label:'Entlassung',    farbe:'#3a8a5a', icon:'✅' },
  sonstiges:    { label:'Sonstiges',     farbe:'#9a9590', icon:'📎' },
}

const REHA_TYPEN = {
  uebung:       { label:'Übung',        icon:'🏋️' },
  dehnung:      { label:'Dehnung',      icon:'🧘' },
  kraft:        { label:'Kraft',        icon:'💪' },
  ausdauer:     { label:'Ausdauer',     icon:'🏃' },
  koordination: { label:'Koordination', icon:'🎯' },
  sonstiges:    { label:'Sonstiges',    icon:'📎' },
}

const SCHWER_STIL = {
  leicht:   { bg:'#e2efda', text:'#2d6b3a' },
  mittel:   { bg:'#fff3cd', text:'#8a6a00' },
  schwer:   { bg:'#fce4d6', text:'#8a3a1a' },
  kritisch: { bg:'#fce4d6', text:'#d94f4f' },
}

const DATEI_ICONS = { mrt:'🧲', roentgen:'☢️', ultraschall:'〰️', pdf:'📄', bild:'🖼️', sonstiges:'📎', video:'🎥' }

export default function VerletzungsAkte({ verletzungId, spielerId, spielerName, onClose }) {
  const { profile } = useAuth()
  const isBehandler = profile?.rolle === 'behandler'

  const [verletzung, setVerletzung]         = useState(null)
  const [alleVerletzungen, setAlleVerletzungen] = useState([])  // alle des Spielers für Körper
  const [berichte, setBerichte]             = useState([])
  const [dateien, setDateien]               = useState([])
  const [behandlerListe, setBehandlerListe] = useState([])
  const [zugeordnet, setZugeordnet]         = useState([])
  const [statusListe, setStatusListe]       = useState([])
  const [rehaAufgaben, setRehaAufgaben]     = useState([])
  const [rehaDateien, setRehaDateien]       = useState([])
  const [loading, setLoading]               = useState(true)
  const [aktiveTab, setAktiveTab]           = useState('akte')
  const [showBerichtForm, setShowBerichtForm] = useState(false)
  const [showBehandlerForm, setShowBehandlerForm] = useState(false)
  const [showRehaForm, setShowRehaForm]     = useState(false)
  const [showRehaBiblio, setShowRehaBiblio] = useState(false)
  const [showEditForm, setShowEditForm]     = useState(false)
  const [uploading, setUploading]           = useState(false)
  const [saving, setSaving]                 = useState(false)

  const [editForm, setEditForm] = useState({})
  const [berichtForm, setBerichtForm] = useState({
    typ:'untersuchung', titel:'', bericht:'', befund:'',
    naechster_termin:'', behandler_id:'',
    datum: new Date().toISOString().split('T')[0],
  })
  const [rehaForm, setRehaForm] = useState({
    titel:'', beschreibung:'', typ:'uebung',
    wiederholungen:'', haeufigkeit:'', dauer_wochen:'', notizen:'',
  })

  useEffect(() => { load() }, [verletzungId])

  async function load() {
    setLoading(true)
    const sid = spielerId
    const [{ data: v }, { data: av }, { data: b }, { data: d }, { data: bl },
           { data: z }, { data: sl }, { data: ra }, { data: rd }] = await Promise.all([
      supabase.from('spieler_verletzungen').select('*, status:status_id(id,name,farbe), ursache:ursache_verletzung_id(diagnose,datum_verletzung)').eq('id', verletzungId).single(),
      supabase.from('spieler_verletzungen').select('*, status:status_id(name,farbe), ursache:ursache_verletzung_id(diagnose,datum_verletzung)').eq('spieler_id', sid),
      supabase.from('verletzungs_berichte')
        .select('*, behandler:behandler_id(vorname,nachname,rolle), autor:autor_id(name)')
        .eq('verletzung_id', verletzungId).order('datum', { ascending: false }),
      supabase.from('verletzungs_dateien').select('*').eq('verletzung_id', verletzungId).order('erstellt_am', { ascending: false }),
      supabase.from('behandler').select('*').eq('aktiv', true).order('nachname'),
      supabase.from('verletzung_behandler')
        .select('*, behandler:behandler_id(id,vorname,nachname,rolle,spezialisierung,telefon,email)')
        .eq('verletzung_id', verletzungId),
      supabase.from('verletzungs_status').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('verletzungs_reha_aufgaben').select('*').eq('verletzung_id', verletzungId).order('reihenfolge'),
      supabase.from('reha_aufgaben_dateien').select('*').order('erstellt_am'),
    ])
    setVerletzung(v)
    setEditForm(v || {})
    setAlleVerletzungen(av || [])
    setBerichte(b || [])
    setDateien(d || [])
    setBehandlerListe(bl || [])
    setZugeordnet(z || [])
    setStatusListe(sl || [])
    setRehaAufgaben(ra || [])
    setRehaDateien(rd || [])
    setLoading(false)
  }

  async function verletzungUpdate(felder) {
    await supabase.from('spieler_verletzungen').update(felder).eq('id', verletzungId)
    load()
  }

  async function verletzungSpeichern() {
    setSaving(true)
    const payload = {
      diagnose: editForm.diagnose,
      koerperteil: editForm.koerperteil || null,
      schweregrad: editForm.schweregrad,
      datum_verletzung: editForm.datum_verletzung,
      behandlung: editForm.behandlung || null,
      arzt: editForm.arzt || null,
      notizen: editForm.notizen || null,
      ursache_verletzung_id: editForm.ursache_verletzung_id || null,
    }
    await supabase.from('spieler_verletzungen').update(payload).eq('id', verletzungId)
    setSaving(false); setShowEditForm(false); load()
  }

  async function berichtSpeichern() {
    if (!berichtForm.titel.trim()) return
    setSaving(true)
    await supabase.from('verletzungs_berichte').insert({
      ...berichtForm, verletzung_id: verletzungId, autor_id: profile.id,
      behandler_id: berichtForm.behandler_id || null,
      naechster_termin: berichtForm.naechster_termin || null,
    })
    setBerichtForm({ typ:'untersuchung', titel:'', bericht:'', befund:'', naechster_termin:'', behandler_id:'', datum: new Date().toISOString().split('T')[0] })
    setSaving(false); setShowBerichtForm(false); load()
  }

  async function rehaSpeichern() {
    if (!rehaForm.titel.trim()) return
    setSaving(true)
    await supabase.from('verletzungs_reha_aufgaben').insert({
      ...rehaForm, verletzung_id: verletzungId,
      dauer_wochen: rehaForm.dauer_wochen ? parseInt(rehaForm.dauer_wochen) : null,
      reihenfolge: rehaAufgaben.length, erstellt_von: profile.id,
    })
    setRehaForm({ titel:'', beschreibung:'', typ:'uebung', wiederholungen:'', haeufigkeit:'', dauer_wochen:'', notizen:'' })
    setSaving(false); setShowRehaForm(false); load()
  }

  async function rehaToggle(id, erledigt) {
    await supabase.from('verletzungs_reha_aufgaben').update({ erledigt: !erledigt }).eq('id', id); load()
  }

  async function behandlerZuordnen(bid) {
    await supabase.from('verletzung_behandler').insert({ verletzung_id: verletzungId, behandler_id: bid })
    setShowBehandlerForm(false); load()
  }

  async function behandlerEntfernen(id) {
    await supabase.from('verletzung_behandler').delete().eq('id', id); load()
  }

  async function dateiHochladen(e, berichtId) {
    const files = Array.from(e.target.files); if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase()
      const pfad = `verletzungen/${verletzungId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('verletzungs-dateien').upload(pfad, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('verletzungs-dateien').getPublicUrl(pfad)
        const dateiTyp = ext==='pdf'?'pdf':['jpg','jpeg','png','webp','gif'].includes(ext)?'bild':['mp4','mov'].includes(ext)?'video':'sonstiges'
        await supabase.from('verletzungs_dateien').insert({
          bericht_id: berichtId, verletzung_id: verletzungId,
          datei_url: publicUrl, datei_name: file.name,
          datei_typ: dateiTyp, datei_groesse: file.size, hochgeladen_von: profile.id,
        })
      }
    }
    setUploading(false); load()
  }

  async function rehaDateiHochladen(e, aufgabeId) {
    const files = Array.from(e.target.files); if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase()
      const pfad = `reha/${verletzungId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('verletzungs-dateien').upload(pfad, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('verletzungs-dateien').getPublicUrl(pfad)
        const dateiTyp = ext==='pdf'?'pdf':['jpg','jpeg','png','webp'].includes(ext)?'bild':'sonstiges'
        await supabase.from('reha_aufgaben_dateien').insert({
          aufgabe_id: aufgabeId, datei_url: publicUrl, datei_name: file.name,
          datei_typ: dateiTyp, datei_groesse: file.size, hochgeladen_von: profile.id,
        })
      }
    }
    setUploading(false); load()
  }

  async function verletzungHeilen() {
    if (!window.confirm('Verletzung als geheilt markieren?')) return
    await supabase.from('spieler_verletzungen').update({ datum_genesung: new Date().toISOString().split('T')[0] }).eq('id', verletzungId)
    const { data } = await supabase.from('spieler_verletzungen').select('id').eq('spieler_id', verletzung.spieler_id).is('datum_genesung', null)
    if (!data?.filter(v=>v.id!==verletzungId).length) await supabase.from('spieler').update({ status:'aktiv' }).eq('id', verletzung.spieler_id)
    load()
  }

  // Zone geklickt → Koerperteil setzen im Edit-Formular
  function onZoneClick(zone) {
    const label = zone.label.replace(' (hinten)','').replace(' links','').replace(' rechts','')
    setEditForm(p => ({ ...p, koerperteil: zone.label }))
    if (!showEditForm) setShowEditForm(true)
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!verletzung) return null

  const aktiv = !verletzung.datum_genesung
  const tageSeit = Math.floor((Date.now() - new Date(verletzung.datum_verletzung)) / (1000*60*60*24))
  const schwSt = SCHWER_STIL[verletzung.schweregrad] || SCHWER_STIL.mittel
  const dateitenNachBericht = (bid) => dateien.filter(d => d.bericht_id === bid)
  const rehaDateienNachAufgabe = (aid) => rehaDateien.filter(d => d.aufgabe_id === aid)

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
              <h2 style={{ fontSize:20, color:'var(--navy)', margin:0, fontFamily:'"DM Serif Display",serif' }}>{verletzung.diagnose}</h2>
              <span style={{ fontSize:12, padding:'2px 9px', borderRadius:20, fontWeight:700, background:schwSt.bg, color:schwSt.text }}>{verletzung.schweregrad}</span>
              {verletzung.status && (
                <span style={{ fontSize:12, padding:'2px 9px', borderRadius:20, fontWeight:700, background:(verletzung.status.farbe||'#ccc')+'22', color:verletzung.status.farbe||'var(--navy)', border:'1.5px solid '+(verletzung.status.farbe||'#ccc')+'55' }}>
                  {verletzung.status.name}
                </span>
              )}
              {aktiv
                ? <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:700, background:'#fce4d6', color:'#8a3a1a' }}>🏥 Aktiv</span>
                : <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:700, background:'#e2efda', color:'#2d6b3a' }}>✅ Abgeheilt</span>
              }
            </div>

            <div style={{ fontSize:13, color:'var(--gray-600)', display:'flex', gap:14, flexWrap:'wrap', marginBottom:10 }}>
              <span>👤 {spielerName}</span>
              {verletzung.koerperteil && <span>📍 {verletzung.koerperteil}</span>}
              <span>📅 seit {new Date(verletzung.datum_verletzung).toLocaleDateString('de-DE')} ({tageSeit} Tage)</span>
              {verletzung.datum_genesung && <span>✅ Genesen: {new Date(verletzung.datum_genesung).toLocaleDateString('de-DE')}</span>}
              {verletzung.ursache && <span style={{ color:'var(--orange)', fontWeight:600 }}>⚠️ Folgeverletzung von: {verletzung.ursache.diagnose}</span>}
            </div>

            {/* Status + Rückkehr-Datum */}
            {aktiv && (
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12, color:'var(--gray-400)' }}>Status:</span>
                  <select value={verletzung.status_id||''} onChange={e=>verletzungUpdate({ status_id:e.target.value||null })}
                    style={{ fontSize:12, padding:'4px 10px', border:'1.5px solid var(--gray-200)', borderRadius:20, fontWeight:600, background:'var(--white)', cursor:'pointer' }}>
                    <option value="">– Kein Status –</option>
                    {statusListe.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12, color:'var(--gray-400)' }}>Voraussichtlich fit:</span>
                  <input type="date" value={verletzung.voraussichtlich_fit_am||''} onChange={e=>verletzungUpdate({ voraussichtlich_fit_am:e.target.value||null })}
                    style={{ fontSize:12, padding:'4px 10px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)' }} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12, color:'var(--gray-400)' }}>Ausfallzeit:</span>
                  <input type="number" min="0" placeholder="Wochen" value={verletzung.ausfall_wochen||''} onChange={e=>verletzungUpdate({ ausfall_wochen:e.target.value?parseInt(e.target.value):null })}
                    style={{ fontSize:12, padding:'4px 8px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', width:70 }} />
                  <span style={{ fontSize:12, color:'var(--gray-400)' }}>Wochen</span>
                </div>
              </div>
            )}

            {aktiv && verletzung.voraussichtlich_fit_am && (
              <div style={{ marginTop:10, display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', background:'#e2efda', borderRadius:20 }}>
                <span>🎯</span>
                <span style={{ fontSize:13, fontWeight:600, color:'#2d6b3a' }}>
                  Voraussichtlich fit: {new Date(verletzung.voraussichtlich_fit_am).toLocaleDateString('de-DE', { weekday:'short', day:'numeric', month:'long' })}
                  {verletzung.ausfall_wochen ? ` (${verletzung.ausfall_wochen} Wochen)` : ''}
                </span>
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
            <button onClick={()=>setShowEditForm(!showEditForm)} className={`btn btn-sm ${showEditForm?'btn-primary':'btn-outline'}`}>✏️ Bearbeiten</button>
            {aktiv && !isBehandler && <button onClick={verletzungHeilen} className="btn btn-sm" style={{ background:'#e2efda', color:'#2d6b3a', border:'none' }}>✓ Als geheilt markieren</button>}
            {!aktiv && !isBehandler && <button onClick={async()=>{ await supabase.from('spieler_verletzungen').update({ datum_genesung:null }).eq('id',verletzungId); await supabase.from('spieler').update({ status:'verletzt' }).eq('id',verletzung.spieler_id); load() }} className="btn btn-sm btn-outline" style={{ color:'var(--orange)' }}>↩ Genesen rückgängig</button>}
            {onClose && <button onClick={onClose} className="close-btn">×</button>}
          </div>
        </div>

        {/* Edit-Formular (inline) */}
        {showEditForm && (
          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--gray-200)' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Verletzung bearbeiten</div>
            <div className="form-row">
              <div className="form-group"><label>Diagnose *</label><input value={editForm.diagnose||''} onChange={e=>setEditForm(p=>({...p,diagnose:e.target.value}))} /></div>
              <div className="form-group"><label>Körperteil</label><input value={editForm.koerperteil||''} onChange={e=>setEditForm(p=>({...p,koerperteil:e.target.value}))} placeholder="Klicke auf Körper oder tippe" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Datum</label><input type="date" value={editForm.datum_verletzung||''} onChange={e=>setEditForm(p=>({...p,datum_verletzung:e.target.value}))} /></div>
              <div className="form-group"><label>Schweregrad</label>
                <select value={editForm.schweregrad||'leicht'} onChange={e=>setEditForm(p=>({...p,schweregrad:e.target.value}))}>
                  <option value="leicht">Leicht</option><option value="mittel">Mittel</option>
                  <option value="schwer">Schwer</option><option value="kritisch">Kritisch</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label>Erste Behandlungsnotiz</label><textarea value={editForm.behandlung||''} onChange={e=>setEditForm(p=>({...p,behandlung:e.target.value}))} rows={2} /></div>
              <div className="form-group">
                <label>Folgeverletzung von (optional)</label>
                <select value={editForm.ursache_verletzung_id||''} onChange={e=>setEditForm(p=>({...p,ursache_verletzung_id:e.target.value}))}>
                  <option value="">Keine Vorerkrankung</option>
                  {alleVerletzungen.filter(v=>v.id!==verletzungId).map(v=>(
                    <option key={v.id} value={v.id}>{v.diagnose} ({new Date(v.datum_verletzung).toLocaleDateString('de-DE')}){v.datum_genesung?' ✅':' 🏥'}</option>
                  ))}
                </select>
              </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={verletzungSpeichern} className="btn btn-primary btn-sm" disabled={saving}>{saving?'Speichern…':'Speichern'}</button>
              <button onClick={()=>setShowEditForm(false)} className="btn btn-outline btn-sm">Abbrechen</button>
            </div>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div className="tabs" style={{ marginBottom:16 }}>
        <button className={`tab-btn${aktiveTab==='akte'?' active':''}`} onClick={()=>setAktiveTab('akte')}>📋 Behandlungsakte ({berichte.length})</button>
        <button className={`tab-btn${aktiveTab==='reha'?' active':''}`} onClick={()=>setAktiveTab('reha')}>🏃 Reha & Training ({rehaAufgaben.length})</button>
        <button className={`tab-btn${aktiveTab==='koerper'?' active':''}`} onClick={()=>setAktiveTab('koerper')}>🫀 Körper</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, alignItems:'flex-start' }}>
        <div>

          {/* ══ TAB: BEHANDLUNGSAKTE ══ */}
          {aktiveTab==='akte' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <h3 style={{ fontSize:16, color:'var(--navy)', margin:0 }}>Behandlungsberichte</h3>
                <button onClick={()=>setShowBerichtForm(true)} className="btn btn-primary">+ Bericht hinzufügen</button>
              </div>

              {showBerichtForm && (
                <div className="card" style={{ marginBottom:16, borderLeft:'4px solid var(--navy)' }}>
                  <h4 style={{ fontSize:14, color:'var(--navy)', marginBottom:14 }}>Neuer Behandlungsbericht</h4>
                  <div className="form-row">
                    <div className="form-group"><label>Typ</label>
                      <select value={berichtForm.typ} onChange={e=>setBerichtForm(p=>({...p,typ:e.target.value}))}>
                        {Object.entries(BERICHT_TYPEN).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Datum</label><input type="date" value={berichtForm.datum} onChange={e=>setBerichtForm(p=>({...p,datum:e.target.value}))} /></div>
                  </div>
                  <div className="form-group"><label>Titel *</label><input value={berichtForm.titel} onChange={e=>setBerichtForm(p=>({...p,titel:e.target.value}))} placeholder="z.B. MRT-Kontrolle Knie" autoFocus /></div>
                  <div className="form-group"><label>Behandler</label>
                    <select value={berichtForm.behandler_id} onChange={e=>setBerichtForm(p=>({...p,behandler_id:e.target.value}))}>
                      <option value="">Kein Behandler</option>
                      {behandlerListe.map(b=><option key={b.id} value={b.id}>{b.vorname} {b.nachname} ({b.rolle})</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Befund</label><textarea value={berichtForm.befund} onChange={e=>setBerichtForm(p=>({...p,befund:e.target.value}))} rows={2} placeholder="Medizinischer Befund…" /></div>
                  <div className="form-group"><label>Bericht / Notizen</label><textarea value={berichtForm.bericht} onChange={e=>setBerichtForm(p=>({...p,bericht:e.target.value}))} rows={4} placeholder="Behandlungsverlauf, Empfehlungen…" /></div>
                  <div className="form-group"><label>Nächster Termin</label><input type="date" value={berichtForm.naechster_termin} onChange={e=>setBerichtForm(p=>({...p,naechster_termin:e.target.value}))} /></div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={berichtSpeichern} className="btn btn-primary" disabled={saving}>{saving?'Speichern…':'Speichern'}</button>
                    <button onClick={()=>setShowBerichtForm(false)} className="btn btn-outline">Abbrechen</button>
                  </div>
                </div>
              )}

              {berichte.length===0 ? (
                <div className="empty-state card"><p>Noch keine Berichte.</p></div>
              ) : (
                <div style={{ position:'relative' }}>
                  <div style={{ position:'absolute', left:20, top:0, bottom:0, width:2, background:'var(--gray-200)', zIndex:0 }}/>
                  <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                    {berichte.map(b => {
                      const bt = BERICHT_TYPEN[b.typ] || BERICHT_TYPEN.sonstiges
                      const bDateien = dateitenNachBericht(b.id)
                      return (
                        <div key={b.id} style={{ display:'flex', gap:16, marginBottom:16, position:'relative', zIndex:1 }}>
                          <div style={{ width:40, height:40, borderRadius:'50%', background:bt.farbe, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.15)', border:'3px solid white' }}>{bt.icon}</div>
                          <div className="card" style={{ flex:1, marginBottom:0, padding:16 }}>
                            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:700, background:bt.farbe+'20', color:bt.farbe }}>{bt.label}</span>
                              <span style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>{b.titel}</span>
                            </div>
                            <div style={{ fontSize:11, color:'var(--gray-400)', display:'flex', gap:10, marginBottom:8 }}>
                              <span>📅 {new Date(b.datum).toLocaleDateString('de-DE')}</span>
                              {b.behandler && <span>👨‍⚕️ {b.behandler.vorname} {b.behandler.nachname}</span>}
                              {b.autor && !b.behandler && <span>✍️ {b.autor.name}</span>}
                            </div>
                            {b.befund && (
                              <div style={{ background:'#f0f7ff', borderLeft:'3px solid #2d6fa3', padding:'8px 12px', borderRadius:'0 var(--radius) var(--radius) 0', marginBottom:8, fontSize:13 }}>
                                <div style={{ fontSize:11, fontWeight:700, color:'#2d6fa3', marginBottom:3 }}>BEFUND</div>
                                {b.befund}
                              </div>
                            )}
                            {b.bericht && <div style={{ fontSize:13, color:'var(--gray-600)', lineHeight:1.6, marginBottom:8 }}>{b.bericht}</div>}
                            {b.naechster_termin && <div style={{ fontSize:12, color:'var(--orange)', fontWeight:600, marginBottom:8 }}>📅 Nächster Termin: {new Date(b.naechster_termin).toLocaleDateString('de-DE')}</div>}
                            {bDateien.length > 0 && (
                              <div style={{ marginBottom:8, paddingTop:8, borderTop:'1px solid var(--gray-100)' }}>
                                <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:6 }}>ANHÄNGE</div>
                                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                                  {bDateien.map(d=>(
                                    <a key={d.id} href={d.datei_url} target="_blank" rel="noreferrer"
                                      style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:'var(--gray-100)', borderRadius:'var(--radius)', fontSize:12, color:'var(--navy)', textDecoration:'none' }}>
                                      <span>{DATEI_ICONS[d.datei_typ]||'📎'}</span>
                                      <span style={{ maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.datei_name}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            <label className="btn btn-sm btn-outline" style={{ cursor:'pointer', fontSize:11, display:'inline-block' }}>
                              {uploading?'Hochladen…':'📎 Datei anhängen'}
                              <input type="file" accept="image/*,.pdf,video/*" multiple style={{ display:'none' }} onChange={e=>dateiHochladen(e,b.id)} />
                            </label>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: REHA & TRAINING ══ */}
          {aktiveTab==='reha' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <h3 style={{ fontSize:16, color:'var(--navy)', margin:0 }}>Reha & Trainingsaufgaben</h3>
                <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setShowRehaBiblio(true)} className="btn btn-outline">📚 Aus Bibliothek</button>
                <button onClick={()=>setShowRehaForm(true)} className="btn btn-primary">+ Aufgabe hinzufügen</button>
              </div>
              </div>
              {showRehaBiblio && (
                <RehaBibliothekPicker
                  koerperteil={verletzung?.koerperteil}
                  onSelect={async r => {
                    await supabase.from('verletzungs_reha_aufgaben').insert({ titel:r.titel, beschreibung:r.beschreibung||null, typ:r.typ, wiederholungen:r.wiederholungen||null, haeufigkeit:r.haeufigkeit||null, dauer_wochen:r.dauer_wochen||null, verletzung_id:verletzungId, reihenfolge:rehaAufgaben.length, erstellt_von:profile.id })
                    setShowRehaBiblio(false); load()
                  }}
                  onClose={()=>setShowRehaBiblio(false)}
                />
              )}
              {showRehaForm && (
                <div className="card" style={{ marginBottom:16, borderLeft:'4px solid var(--orange)' }}>
                  <h4 style={{ fontSize:14, color:'var(--navy)', marginBottom:14 }}>Neue Reha-Aufgabe</h4>
                  <div className="form-row">
                    <div className="form-group"><label>Titel *</label><input value={rehaForm.titel} onChange={e=>setRehaForm(p=>({...p,titel:e.target.value}))} autoFocus /></div>
                    <div className="form-group"><label>Typ</label>
                      <select value={rehaForm.typ} onChange={e=>setRehaForm(p=>({...p,typ:e.target.value}))}>
                        {Object.entries(REHA_TYPEN).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group"><label>Beschreibung</label><textarea value={rehaForm.beschreibung} onChange={e=>setRehaForm(p=>({...p,beschreibung:e.target.value}))} rows={3} /></div>
                  <div className="form-row">
                    <div className="form-group"><label>Wiederholungen</label><input value={rehaForm.wiederholungen} onChange={e=>setRehaForm(p=>({...p,wiederholungen:e.target.value}))} placeholder="z.B. 3x15" /></div>
                    <div className="form-group"><label>Häufigkeit</label><input value={rehaForm.haeufigkeit} onChange={e=>setRehaForm(p=>({...p,haeufigkeit:e.target.value}))} placeholder="z.B. täglich" /></div>
                    <div className="form-group"><label>Dauer (Wochen)</label><input type="number" min="1" value={rehaForm.dauer_wochen} onChange={e=>setRehaForm(p=>({...p,dauer_wochen:e.target.value}))} /></div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={rehaSpeichern} className="btn btn-primary" disabled={saving}>{saving?'Speichern…':'Speichern'}</button>
                    <button onClick={()=>setShowRehaForm(false)} className="btn btn-outline">Abbrechen</button>
                  </div>
                </div>
              )}
              {rehaAufgaben.length===0 ? <div className="empty-state card"><p>Noch keine Reha-Aufgaben.</p></div> : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {rehaAufgaben.map(a => {
                    const rt = REHA_TYPEN[a.typ]||REHA_TYPEN.sonstiges
                    const aDat = rehaDateienNachAufgabe(a.id)
                    return (
                      <div key={a.id} className="card" style={{ padding:16, marginBottom:0, borderLeft:`4px solid ${a.erledigt?'var(--green)':'var(--orange)'}`, opacity:a.erledigt?0.7:1 }}>
                        <div style={{ display:'flex', gap:12 }}>
                          <button onClick={()=>rehaToggle(a.id,a.erledigt)}
                            style={{ width:28, height:28, borderRadius:6, border:`2px solid ${a.erledigt?'#3a8a5a':'var(--gray-300)'}`, background:a.erledigt?'#3a8a5a':'var(--white)', cursor:'pointer', flexShrink:0, color:a.erledigt?'white':'inherit', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {a.erledigt?'✓':''}
                          </button>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                              <span style={{ fontSize:16 }}>{rt.icon}</span>
                              <span style={{ fontWeight:700, fontSize:14, textDecoration:a.erledigt?'line-through':'none' }}>{a.titel}</span>
                              <span style={{ fontSize:11, background:'var(--gray-100)', color:'var(--gray-600)', padding:'1px 8px', borderRadius:10 }}>{rt.label}</span>
                            </div>
                            {a.beschreibung && <div style={{ fontSize:13, color:'var(--gray-600)', lineHeight:1.5, marginBottom:6 }}>{a.beschreibung}</div>}
                            <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--gray-500)', flexWrap:'wrap' }}>
                              {a.wiederholungen&&<span>🔁 {a.wiederholungen}</span>}
                              {a.haeufigkeit&&<span>📅 {a.haeufigkeit}</span>}
                              {a.dauer_wochen&&<span>⏱ {a.dauer_wochen} Wo.</span>}
                            </div>
                            {aDat.length>0 && (
                              <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap' }}>
                                {aDat.map(d=>(
                                  <a key={d.id} href={d.datei_url} target="_blank" rel="noreferrer"
                                    style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:'#fff8f0', borderRadius:'var(--radius)', fontSize:12, color:'var(--navy)', textDecoration:'none', border:'1px solid #fce4d6' }}>
                                    <span>{DATEI_ICONS[d.datei_typ]||'📎'}</span>
                                    <span style={{ maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.datei_name}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                            <label className="btn btn-sm btn-outline" style={{ cursor:'pointer', fontSize:11, display:'inline-block', marginTop:8 }}>
                              📎 Anweisung anhängen
                              <input type="file" accept="image/*,.pdf" multiple style={{ display:'none' }} onChange={e=>rehaDateiHochladen(e,a.id)} />
                            </label>
                          </div>
                          <button onClick={async()=>{ await supabase.from('reha_bibliothek').insert({ titel:a.titel, beschreibung:a.beschreibung||null, typ:a.typ, wiederholungen:a.wiederholungen||null, haeufigkeit:a.haeufigkeit||null, dauer_wochen:a.dauer_wochen||null, aktiv:true }); alert('✓ In Bibliothek gespeichert') }} title="In Bibliothek speichern" style={{ background:'none', border:'1px solid var(--gray-200)', borderRadius:6, cursor:'pointer', padding:'4px 8px', fontSize:12, color:'var(--gray-500)' }}>📚</button>
                          <button onClick={async()=>{ await supabase.from('verletzungs_reha_aufgaben').delete().eq('id',a.id); load() }}
                            style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:18, flexShrink:0 }}>×</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: KÖRPER ══ */}
          {aktiveTab==='koerper' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                {/* Körper-Visualisierung */}
                <div className="card">
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)', marginBottom:12 }}>
                    🫀 Verletzungsübersicht – {spielerName}
                  </div>
                  <p style={{ fontSize:12, color:'var(--gray-400)', marginBottom:12 }}>
                    Klicke auf eine Körperzone um sie als Verletzungsort zu setzen. Farbige Zonen zeigen bestehende Verletzungen.
                  </p>
                  <KoerperVisualisierung
                    verletzungen={alleVerletzungen}
                    onZoneClick={onZoneClick}
                    readonly={false}
                  />
                </div>

                {/* Alle Verletzungen des Spielers */}
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)', marginBottom:12 }}>Alle Verletzungen</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {alleVerletzungen.length===0 ? (
                      <div className="empty-state"><p>Keine Verletzungen.</p></div>
                    ) : alleVerletzungen.sort((a,b) => new Date(b.datum_verletzung)-new Date(a.datum_verletzung)).map(v => {
                      const aktiv = !v.datum_genesung
                      const schwSt = SCHWER_STIL[v.schweregrad]||SCHWER_STIL.mittel
                      const isAktiv = v.id === verletzungId
                      return (
                        <div key={v.id} className="card" style={{ padding:12, marginBottom:0, borderLeft:`3px solid ${aktiv?'var(--red)':'var(--green)'}`, border: isAktiv?'2px solid var(--navy)':undefined, opacity:aktiv?1:0.7 }}>
                          <div style={{ fontWeight:600, fontSize:13 }}>{v.diagnose} {isAktiv && <span style={{ fontSize:10, background:'var(--navy)', color:'white', padding:'1px 6px', borderRadius:10, marginLeft:4 }}>aktuell</span>}</div>
                          <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:3, display:'flex', gap:8 }}>
                            {v.koerperteil && <span>📍 {v.koerperteil}</span>}
                            <span>📅 {new Date(v.datum_verletzung).toLocaleDateString('de-DE')}</span>
                            <span style={{ padding:'1px 6px', borderRadius:10, fontWeight:600, fontSize:10, background:schwSt.bg, color:schwSt.text }}>{v.schweregrad}</span>
                          </div>
                          {v.datum_genesung && <div style={{ fontSize:10, color:'#2d6b3a', marginTop:2 }}>✅ Genesen: {new Date(v.datum_genesung).toLocaleDateString('de-DE')}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RECHTE SEITE ── */}
        <div>
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h4 style={{ fontSize:14, color:'var(--navy)', margin:0 }}>👨‍⚕️ Behandlungsteam</h4>
              <button onClick={()=>setShowBehandlerForm(!showBehandlerForm)} className="btn btn-sm btn-outline">+ Hinzufügen</button>
            </div>
            {showBehandlerForm && (
              <select style={{ width:'100%', padding:'8px 10px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13, marginBottom:8 }}
                onChange={e=>{ if(e.target.value) behandlerZuordnen(e.target.value) }}>
                <option value="">Behandler auswählen…</option>
                {behandlerListe.filter(b=>!zugeordnet.some(z=>z.behandler_id===b.id)).map(b=>(
                  <option key={b.id} value={b.id}>{b.vorname} {b.nachname} ({b.rolle})</option>
                ))}
              </select>
            )}
            {zugeordnet.length===0 ? <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch kein Behandler.</p> : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {zugeordnet.map(z=>{
                  const b=z.behandler
                  return (
                    <div key={z.id} style={{ padding:'8px 10px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13 }}>{b.vorname} {b.nachname}</div>
                          <div style={{ fontSize:11, color:'var(--gray-500)' }}>{b.rolle}{b.spezialisierung?` · ${b.spezialisierung}`:''}</div>
                          {b.telefon&&<div style={{ fontSize:11, color:'var(--navy)' }}>📞 {b.telefon}</div>}
                        </div>
                        <button onClick={()=>behandlerEntfernen(z.id)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:16 }}>×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <h4 style={{ fontSize:14, color:'var(--navy)', margin:'0 0 12px' }}>📁 Alle Dateien ({dateien.length})</h4>
            {dateien.length===0 ? <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Dateien.</p> : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {dateien.map(d=>(
                  <a key={d.id} href={d.datei_url} target="_blank" rel="noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', background:'var(--gray-100)', borderRadius:'var(--radius)', textDecoration:'none' }}>
                    <span style={{ fontSize:18 }}>{DATEI_ICONS[d.datei_typ]||'📎'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:'var(--navy)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.datei_name}</div>
                      <div style={{ fontSize:10, color:'var(--gray-400)' }}>{d.datei_typ.toUpperCase()} · {new Date(d.erstellt_am).toLocaleDateString('de-DE')}</div>
                    </div>
                    <span style={{ fontSize:12, color:'var(--blue)' }}>⬇</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
