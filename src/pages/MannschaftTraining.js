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
  zugesagt:   { bg:'#e2efda', text:'#2d6b3a', label:'✓ Zugesagt' },
  abgesagt:   { bg:'#fce4d6', text:'#8a3a1a', label:'✗ Abgesagt' },
  ausstehend: { bg:'#fff3cd', text:'#8a6a00', label:'? Ausstehend' },
}
const WOCHENTAGE = ['Mo','Di','Mi','Do','Fr','Sa','So']
const FREQUENZ_LABEL = { taeglich:'Täglich', woechentlich:'Wöchentlich', zweimal_woechentlich:'2x wöchentlich', zweiswoechentlich:'Zweiwöchentlich' }

// ─── EINHEIT KARTE ───────────────────────────────────────────
function EinheitKarte({ einheit: e, onOpen, isSpieler, profile }) {
  const [eigene, setEigene] = useState(null)
  const [busy, setBusy]     = useState(false)

  useEffect(() => { if (isSpieler) ladeEigene() }, [e.id])

  async function ladeEigene() {
    const { data: sp } = await supabase.from('spieler').select('id').eq('profile_id', profile.id).single()
    if (!sp) return
    const { data } = await supabase.from('training_anwesenheit').select('*').eq('einheit_id', e.id).eq('spieler_id', sp.id).maybeSingle()
    setEigene(data)
  }

  async function rueckmeldung(wert) {
    if (!eigene) return
    setBusy(true)
    const grund = wert === 'abgesagt' ? prompt('Abmeldegrund (optional):') : null
    await supabase.from('training_anwesenheit').update({ rueckmeldung: wert, abmelde_grund: grund||null, abmeldung_am: new Date().toISOString() }).eq('id', eigene.id)
    await ladeEigene()
    setBusy(false)
  }

  const st   = STATUS_STIL[e.status] || STATUS_STIL.geplant
  const typ  = e.typ
  const ort  = e.ort_obj
  const istHeute = e.datum === new Date().toISOString().split('T')[0]
  const rs   = eigene ? RUECK_STIL[eigene.rueckmeldung] : null

  return (
    <div className="card" style={{ padding:16, marginBottom:0, cursor:'pointer', borderLeft:`4px solid ${typ?.farbe||'var(--navy)'}`, position:'relative' }}
      onClick={onOpen}
      onMouseEnter={ev=>ev.currentTarget.style.boxShadow='var(--shadow-lg)'}
      onMouseLeave={ev=>ev.currentTarget.style.boxShadow='var(--shadow)'}>

      {istHeute && <div style={{ position:'absolute', top:10, right:10, fontSize:11, padding:'2px 10px', borderRadius:20, background:'var(--navy)', color:'white', fontWeight:700 }}>HEUTE</div>}
      {e.serie_id && <div style={{ position:'absolute', top:10, right: istHeute ? 72 : 10, fontSize:10, padding:'2px 8px', borderRadius:20, background:'var(--gray-100)', color:'var(--gray-500)', fontWeight:600 }}>🔄 Serie</div>}

      <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
        <div style={{ flexShrink:0, textAlign:'center', width:52 }}>
          <div style={{ fontSize:22, fontWeight:900, color:'var(--navy)', lineHeight:1 }}>{new Date(e.datum+'T00:00:00').getDate()}</div>
          <div style={{ fontSize:11, color:'var(--gray-400)', fontWeight:600 }}>{new Date(e.datum+'T00:00:00').toLocaleDateString('de-DE',{month:'short'}).toUpperCase()}</div>
          <div style={{ fontSize:11, color:'var(--gray-400)' }}>{new Date(e.datum+'T00:00:00').toLocaleDateString('de-DE',{weekday:'short'})}</div>
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
            {(e.ort || ort?.name) && <span>📍 {ort?.name || e.ort}</span>}
          </div>
        </div>

        {isSpieler && eigene && (
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }} onClick={ev=>ev.stopPropagation()}>
            <div style={{ fontSize:11, fontWeight:700, background:rs?.bg, color:rs?.text, padding:'2px 10px', borderRadius:20 }}>{rs?.label}</div>
            {eigene.rueckmeldung !== 'zugesagt' && <button onClick={()=>rueckmeldung('zugesagt')} className="btn btn-sm" style={{ background:'#e2efda', color:'#2d6b3a', border:'none', fontSize:11 }} disabled={busy}>✓ Zusagen</button>}
            {eigene.rueckmeldung !== 'abgesagt' && <button onClick={()=>rueckmeldung('abgesagt')} className="btn btn-sm btn-outline" style={{ fontSize:11, color:'var(--red)' }} disabled={busy}>✗ Absagen</button>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SERIEN-FORMULAR ─────────────────────────────────────────
function SerienFormular({ mannschaften, typen, orte, onSaved, onClose, aktiveMn }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    mannschaft_id: aktiveMn||'', typ_id:'', ort_id:'', titel:'', beschreibung:'', ziele:'',
    frequenz:'woechentlich', wochentage:[], datum_von:'', datum_bis:'',
    uhrzeit_start:'17:00', uhrzeit_ende:'19:00', treffzeit:'16:45',
  })
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState([])

  function toggleWT(n) {
    setForm(p => ({ ...p, wochentage: p.wochentage.includes(n) ? p.wochentage.filter(x=>x!==n) : [...p.wochentage, n].sort() }))
  }

  // Vorschau der Termine berechnen
  useEffect(() => { berechnVorschau() }, [form.datum_von, form.datum_bis, form.frequenz, form.wochentage])

  function berechnVorschau() {
    if (!form.datum_von) { setPreview([]); return }
    const termine = []
    const von = new Date(form.datum_von + 'T00:00:00')
    const bis = form.datum_bis ? new Date(form.datum_bis + 'T00:00:00') : new Date(von.getTime() + 90*24*60*60*1000)
    let cur = new Date(von)
    let safetyCounter = 0

    while (cur <= bis && termine.length < 60 && safetyCounter < 500) {
      safetyCounter++
      const wt = cur.getDay() === 0 ? 7 : cur.getDay() // 1=Mo...7=So
      let add = false
      if (form.frequenz === 'taeglich') add = true
      else if (form.frequenz === 'woechentlich' && form.wochentage.includes(wt)) add = true
      else if (form.frequenz === 'zweimal_woechentlich' && form.wochentage.includes(wt)) add = true
      else if (form.frequenz === 'zweiswoechentlich') {
        const diff = Math.floor((cur - von) / (7*24*60*60*1000))
        if (diff % 2 === 0 && form.wochentage.includes(wt)) add = true
      }
      if (add) termine.push(new Date(cur))
      cur = new Date(cur.getTime() + 24*60*60*1000)
    }
    setPreview(termine)
  }

  async function speichern() {
    if (!form.titel.trim() || !form.datum_von || !form.mannschaft_id || preview.length === 0) return
    setSaving(true)

    // Serie anlegen
    const { data: serie } = await supabase.from('trainingsserien').insert({
      mannschaft_id: form.mannschaft_id, typ_id: form.typ_id||null, ort_id: form.ort_id||null,
      titel: form.titel, beschreibung: form.beschreibung||null, ziele: form.ziele||null,
      frequenz: form.frequenz, wochentage: form.wochentage,
      uhrzeit_start: form.uhrzeit_start||null, uhrzeit_ende: form.uhrzeit_ende||null,
      treffzeit: form.treffzeit||null, datum_von: form.datum_von, datum_bis: form.datum_bis||null,
      erstellt_von: profile.id,
    }).select().single()

    if (serie) {
      // Alle Einheiten der Serie anlegen
      const einheitenData = preview.map(d => ({
        mannschaft_id: form.mannschaft_id, typ_id: form.typ_id||null, ort_id: form.ort_id||null,
        titel: form.titel, datum: d.toISOString().split('T')[0],
        uhrzeit_start: form.uhrzeit_start||null, uhrzeit_ende: form.uhrzeit_ende||null,
        treffzeit: form.treffzeit||null, beschreibung: form.beschreibung||null,
        ziele: form.ziele||null, serie_id: serie.id, erstellt_von: profile.id,
      }))

      const { data: einheiten } = await supabase.from('trainingseinheiten').insert(einheitenData).select('id,mannschaft_id')

      // Anwesenheit für alle Kader-Spieler anlegen
      if (einheiten?.length) {
        const { data: spieler } = await supabase.from('spieler').select('id').eq('mannschaft_id', form.mannschaft_id).eq('aktiv', true).eq('typ', 'kader')
        if (spieler?.length) {
          const anwData = einheiten.flatMap(e => spieler.map(s => ({ einheit_id: e.id, spieler_id: s.id, rueckmeldung:'ausstehend' })))
          await supabase.from('training_anwesenheit').insert(anwData)
        }
      }
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:700 }}>
        <div className="modal-header">
          <span className="modal-title">🔄 Trainings-Serie anlegen</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label>Mannschaft *</label>
              <select value={form.mannschaft_id} onChange={e=>setForm(p=>({...p,mannschaft_id:e.target.value}))}>
                <option value="">Wählen…</option>
                {mannschaften.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Trainingstyp</label>
              <select value={form.typ_id} onChange={e=>setForm(p=>({...p,typ_id:e.target.value}))}>
                <option value="">Kein Typ</option>
                {typen.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label>Serientitel *</label><input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} autoFocus placeholder="z.B. Dienstags-Training Herren" /></div>

          <div className="form-row">
            <div className="form-group"><label>Ort</label>
              <select value={form.ort_id} onChange={e=>setForm(p=>({...p,ort_id:e.target.value}))}>
                <option value="">Kein Ort</option>
                {orte.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Frequenz *</label>
              <select value={form.frequenz} onChange={e=>setForm(p=>({...p,frequenz:e.target.value}))}>
                {Object.entries(FREQUENZ_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Wochentage */}
          <div className="form-group">
            <label>Wochentage *</label>
            <div style={{ display:'flex', gap:6, marginTop:4 }}>
              {WOCHENTAGE.map((tag,i) => {
                const n = i+1
                const sel = form.wochentage.includes(n)
                return (
                  <button key={n} type="button" onClick={()=>toggleWT(n)}
                    style={{ width:40, height:40, borderRadius:8, border:'2px solid', cursor:'pointer', fontWeight:700, fontSize:13,
                      borderColor: sel?'var(--navy)':'var(--gray-200)',
                      background: sel?'var(--navy)':'var(--white)',
                      color: sel?'white':'var(--gray-500)' }}>
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group"><label>Startdatum *</label><input type="date" value={form.datum_von} onChange={e=>setForm(p=>({...p,datum_von:e.target.value}))} /></div>
            <div className="form-group"><label>Enddatum</label><input type="date" value={form.datum_bis} onChange={e=>setForm(p=>({...p,datum_bis:e.target.value}))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Treffzeit</label><input type="time" value={form.treffzeit} onChange={e=>setForm(p=>({...p,treffzeit:e.target.value}))} /></div>
            <div className="form-group"><label>Start</label><input type="time" value={form.uhrzeit_start} onChange={e=>setForm(p=>({...p,uhrzeit_start:e.target.value}))} /></div>
            <div className="form-group"><label>Ende</label><input type="time" value={form.uhrzeit_ende} onChange={e=>setForm(p=>({...p,uhrzeit_ende:e.target.value}))} /></div>
          </div>
          <div className="form-group"><label>Trainingsziele</label><textarea value={form.ziele} onChange={e=>setForm(p=>({...p,ziele:e.target.value}))} rows={2} /></div>

          {/* Vorschau */}
          {preview.length > 0 && (
            <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--navy)', marginBottom:8 }}>
                📅 Vorschau: {preview.length} Termine
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', maxHeight:120, overflowY:'auto' }}>
                {preview.map((d,i)=>(
                  <span key={i} style={{ fontSize:11, padding:'2px 8px', background:'var(--white)', borderRadius:6, color:'var(--navy)', fontWeight:500 }}>
                    {d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Abbrechen</button>
          <button onClick={speichern} className="btn btn-gold" disabled={saving||preview.length===0}>
            {saving ? 'Anlegen…' : `🔄 ${preview.length} Einheiten anlegen`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ÜBUNGS-BIBLIOTHEK PICKER ────────────────────────────────
function UebungsBibliothekPicker({ typen, onSelect, onClose }) {
  const [liste, setListe] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('uebungs_bibliothek').select('*, typ:typ_id(name,farbe)').eq('aktiv', true).order('titel').then(({ data }) => { setListe(data||[]); setLoading(false) })
  }, [])

  const gefiltert = liste.filter(u => !filter || u.titel.toLowerCase().includes(filter.toLowerCase()) || (u.beschreibung||'').toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:600 }}>
        <div className="modal-header"><span className="modal-title">📚 Übungsbibliothek</span><button className="close-btn" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <input placeholder="Suchen…" value={filter} onChange={e=>setFilter(e.target.value)} style={{ width:'100%', marginBottom:12 }} autoFocus />
          {loading ? <div className="loading-center"><div className="spinner"/></div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto' }}>
              {gefiltert.length===0 && <p style={{ color:'var(--gray-400)', fontSize:13 }}>Keine Übungen gefunden.</p>}
              {gefiltert.map(u=>(
                <div key={u.id} onClick={()=>onSelect(u)} className="card" style={{ padding:12, marginBottom:0, cursor:'pointer', transition:'box-shadow 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-lg)'}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow)'}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                    {u.typ && <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, fontWeight:700, background:(u.typ.farbe||'#ccc')+'22', color:u.typ.farbe }}>{u.typ.name}</span>}
                    <span style={{ fontWeight:600, fontSize:13 }}>{u.titel}</span>
                    <span style={{ fontSize:10, background:'var(--gray-100)', color:'var(--gray-500)', padding:'1px 7px', borderRadius:10 }}>{BLOCK_LABEL[u.block]}</span>
                  </div>
                  {u.beschreibung && <div style={{ fontSize:12, color:'var(--gray-500)', lineHeight:1.4 }}>{u.beschreibung.slice(0,100)}{u.beschreibung.length>100?'…':''}</div>}
                  <div style={{ display:'flex', gap:10, marginTop:4, fontSize:11, color:'var(--gray-400)' }}>
                    {u.dauer_minuten && <span>⏱ {u.dauer_minuten} Min.</span>}
                    {u.material && <span>📦 {u.material}</span>}
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

// ─── TRAININGSLISTE ──────────────────────────────────────────
function TrainingsListe() {
  const navigate  = useNavigate()
  const { profile } = useAuth()
  const isStaff   = profile?.rolle === 'admin' || (profile?.bereiche||[]).includes('mannschaft')
  const isSpieler = profile?.rolle === 'spieler'

  const [einheiten, setEinheiten]     = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [typen, setTypen]             = useState([])
  const [orte, setOrte]               = useState([])
  const [aktiveMn, setAktiveMn]       = useState('')
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [showSerie, setShowSerie]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [form, setForm] = useState({ mannschaft_id:'', typ_id:'', ort_id:'', titel:'', datum:'', uhrzeit_start:'17:00', uhrzeit_ende:'19:00', treffzeit:'16:45', beschreibung:'', ziele:'' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: mn }, { data: ty }, { data: or }] = await Promise.all([
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('trainingstypen').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('trainings_orte').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setMannschaften(mn||[]); setTypen(ty||[]); setOrte(or||[])
    let mnId = ''
    if (isSpieler) {
      const { data: sp } = await supabase.from('spieler').select('mannschaft_id').eq('profile_id', profile.id).single()
      if (sp) mnId = sp.mannschaft_id
    } else if (mn?.length) mnId = mn[0].id
    setAktiveMn(mnId)
    if (mnId) await ladeEinheiten(mnId)
    setLoading(false)
  }

  async function ladeEinheiten(mnId) {
    const { data } = await supabase.from('trainingseinheiten')
      .select('*, typ:typ_id(name,farbe), ort_obj:ort_id(name)')
      .eq('mannschaft_id', mnId)
      .order('datum', { ascending: false })
      .order('uhrzeit_start', { ascending: true })
    setEinheiten(data||[])
  }

  async function mnWechsel(id) {
    setAktiveMn(id); setEinheiten([]); setLoading(true)
    await ladeEinheiten(id); setLoading(false)
  }

  async function einzelnSpeichern() {
    if (!form.titel.trim() || !form.datum || !form.mannschaft_id) return
    setSaving(true)
    const { data: e } = await supabase.from('trainingseinheiten').insert({ ...form, typ_id:form.typ_id||null, ort_id:form.ort_id||null, treffzeit:form.treffzeit||null, erstellt_von:profile.id }).select().single()
    if (e) {
      const { data: sp } = await supabase.from('spieler').select('id').eq('mannschaft_id', form.mannschaft_id).eq('aktiv', true).eq('typ', 'kader')
      if (sp?.length) await supabase.from('training_anwesenheit').insert(sp.map(s=>({ einheit_id:e.id, spieler_id:s.id, rueckmeldung:'ausstehend' })))
    }
    setSaving(false); setShowForm(false)
    await ladeEinheiten(aktiveMn)
  }

  const heute = new Date().toISOString().split('T')[0]
  const kommend  = einheiten.filter(e=>e.datum>=heute && e.status!=='abgesagt').sort((a,b)=>a.datum.localeCompare(b.datum))
  const vergangen = einheiten.filter(e=>e.datum<heute || e.status==='abgesagt').sort((a,b)=>b.datum.localeCompare(a.datum))

  return (
    <div>
      {!isSpieler && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16, justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {mannschaften.map(m=>(
              <button key={m.id} onClick={()=>mnWechsel(m.id)}
                style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
                  background: aktiveMn===m.id ? (m.farbe||'var(--navy)') : 'var(--gray-100)',
                  color: aktiveMn===m.id ? 'white' : 'var(--gray-600)' }}>
                {m.name}
              </button>
            ))}
          </div>
          {isStaff && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{ setForm(p=>({...p,mannschaft_id:aktiveMn})); setShowForm(true) }} className="btn btn-outline">+ Einzeln</button>
              <button onClick={()=>setShowSerie(true)} className="btn btn-primary">🔄 Als Serie</button>
            </div>
          )}
        </div>
      )}

      {/* Einzeln-Formular */}
      {showForm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal" style={{ maxWidth:600 }}>
            <div className="modal-header"><span className="modal-title">Einzelne Trainingseinheit</span><button className="close-btn" onClick={()=>setShowForm(false)}>×</button></div>
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
              <div className="form-group"><label>Titel *</label><input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} autoFocus /></div>
              <div className="form-row">
                <div className="form-group"><label>Datum *</label><input type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))} /></div>
                <div className="form-group"><label>Ort</label>
                  <select value={form.ort_id} onChange={e=>setForm(p=>({...p,ort_id:e.target.value}))}>
                    <option value="">Kein Ort</option>
                    {orte.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Treffzeit</label><input type="time" value={form.treffzeit} onChange={e=>setForm(p=>({...p,treffzeit:e.target.value}))} /></div>
                <div className="form-group"><label>Start</label><input type="time" value={form.uhrzeit_start} onChange={e=>setForm(p=>({...p,uhrzeit_start:e.target.value}))} /></div>
                <div className="form-group"><label>Ende</label><input type="time" value={form.uhrzeit_ende} onChange={e=>setForm(p=>({...p,uhrzeit_ende:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Trainingsziele</label><textarea value={form.ziele} onChange={e=>setForm(p=>({...p,ziele:e.target.value}))} rows={2} /></div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setShowForm(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={einzelnSpeichern} className="btn btn-primary" disabled={saving}>{saving?'Anlegen…':'Einheit anlegen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Serien-Formular */}
      {showSerie && (
        <SerienFormular
          mannschaften={mannschaften} typen={typen} orte={orte} aktiveMn={aktiveMn}
          onSaved={()=>ladeEinheiten(aktiveMn)}
          onClose={()=>setShowSerie(false)}
        />
      )}

      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div>
          {kommend.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Kommende ({kommend.length})</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {kommend.map(e=><EinheitKarte key={e.id} einheit={e} onOpen={()=>navigate(`/mannschaft/training/${e.id}`)} isSpieler={isSpieler} profile={profile} />)}
              </div>
            </div>
          )}
          {vergangen.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Vergangene ({vergangen.length})</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, opacity:0.7 }}>
                {vergangen.slice(0,15).map(e=><EinheitKarte key={e.id} einheit={e} onOpen={()=>navigate(`/mannschaft/training/${e.id}`)} isSpieler={isSpieler} profile={profile} />)}
              </div>
            </div>
          )}
          {einheiten.length===0 && <div className="empty-state card"><p>Noch keine Trainingseinheiten.</p></div>}
        </div>
      )}
    </div>
  )
}

// ─── EINHEIT DETAIL ──────────────────────────────────────────
function EinheitDetail() {
  const { id } = useParams()
  const navigate  = useNavigate()
  const { profile } = useAuth()
  const isStaff   = profile?.rolle === 'admin' || (profile?.bereiche||[]).includes('mannschaft')
  const isSpieler = profile?.rolle === 'spieler'

  const [einheit, setEinheit]         = useState(null)
  const [inhalte, setInhalte]         = useState([])
  const [anwesenheit, setAnwesenheit] = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('info')
  const [showInhaltForm, setShowInhaltForm] = useState(false)
  const [showEditForm, setShowEditForm]     = useState(false)
  const [showBiblio, setShowBiblio]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [typen, setTypen]             = useState([])
  const [orte, setOrte]               = useState([])
  const [eigeneAnwesenheit, setEigeneAnwesenheit] = useState(null)

  const [editForm, setEditForm] = useState({})
  const [inhaltForm, setInhaltForm] = useState({ block:'hauptteil', titel:'', beschreibung:'', dauer_minuten:'', material:'' })

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: e }, { data: i }, { data: a }, { data: ty }, { data: or }] = await Promise.all([
      supabase.from('trainingseinheiten').select('*, typ:typ_id(name,farbe), ort_obj:ort_id(name,adresse)').eq('id', id).single(),
      supabase.from('training_inhalte').select('*').eq('einheit_id', id).order('reihenfolge'),
      supabase.from('training_anwesenheit')
        .select('*, spieler:spieler_id(id,vorname,nachname,trikotnummer,position,status,foto_url)')
        .eq('einheit_id', id),
      supabase.from('trainingstypen').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('trainings_orte').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setEinheit(e); setEditForm(e||{}); setInhalte(i||[]); setAnwesenheit(a||[])
    setTypen(ty||[]); setOrte(or||[])
    if (isSpieler) {
      const { data: sp } = await supabase.from('spieler').select('id').eq('profile_id', profile.id).single()
      if (sp) setEigeneAnwesenheit((a||[]).find(x=>x.spieler_id===sp.id)||null)
    }
    setLoading(false)
  }

  async function editSpeichern() {
    setSaving(true)
    await supabase.from('trainingseinheiten').update({ ...editForm, typ_id:editForm.typ_id||null, ort_id:editForm.ort_id||null }).eq('id', id)
    setSaving(false); setShowEditForm(false); load()
  }

  async function inhaltSpeichern() {
    if (!inhaltForm.titel.trim()) return
    setSaving(true)
    await supabase.from('training_inhalte').insert({ ...inhaltForm, einheit_id:id, dauer_minuten:inhaltForm.dauer_minuten?parseInt(inhaltForm.dauer_minuten):null, reihenfolge:inhalte.length })
    setInhaltForm({ block:'hauptteil', titel:'', beschreibung:'', dauer_minuten:'', material:'' })
    setSaving(false); setShowInhaltForm(false); load()
  }

  async function ausLibliothekHinzufuegen(uebung) {
    await supabase.from('training_inhalte').insert({ einheit_id:id, block:uebung.block, titel:uebung.titel, beschreibung:uebung.beschreibung||null, dauer_minuten:uebung.dauer_minuten||null, material:uebung.material||null, reihenfolge:inhalte.length })
    setShowBiblio(false); load()
  }

  async function anwesenheitSetzen(anwId, erschienen) {
    await supabase.from('training_anwesenheit').update({ erschienen, erfasst_am:new Date().toISOString(), erfasst_von:profile.id }).eq('id', anwId)
    load()
  }

  async function eigeneRueckmeldung(wert) {
    if (!eigeneAnwesenheit) return
    const grund = wert==='abgesagt' ? prompt('Abmeldegrund (optional):') : null
    await supabase.from('training_anwesenheit').update({ rueckmeldung:wert, abmelde_grund:grund||null, abmeldung_am:new Date().toISOString() }).eq('id', eigeneAnwesenheit.id)
    load()
  }

  async function inhaltInBibliothek(inhalt) {
    await supabase.from('uebungs_bibliothek').insert({ titel:inhalt.titel, beschreibung:inhalt.beschreibung||null, block:inhalt.block, dauer_minuten:inhalt.dauer_minuten||null, material:inhalt.material||null, erstellt_von:profile.id })
    alert('✓ In Bibliothek gespeichert')
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!einheit) return null

  const st  = STATUS_STIL[einheit.status] || STATUS_STIL.geplant
  const zugesagt  = anwesenheit.filter(a=>a.rueckmeldung==='zugesagt').length
  const abgesagt  = anwesenheit.filter(a=>a.rueckmeldung==='abgesagt').length
  const erschienen = anwesenheit.filter(a=>a.erschienen===true).length
  const quote = anwesenheit.filter(a=>a.erschienen!==null).length ? Math.round(erschienen/anwesenheit.filter(a=>a.erschienen!==null).length*100) : null
  const bloecke = ['aufwaermen','hauptteil','abwaermen','sonstiges']

  return (
    <div>
      <button onClick={()=>navigate('/mannschaft/training')} className="back-btn">← Zurück</button>

      {/* Header */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
              {einheit.typ && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:700, background:(einheit.typ.farbe||'#ccc')+'22', color:einheit.typ.farbe||'var(--navy)' }}>{einheit.typ.name}</span>}
              <h2 style={{ fontSize:20, color:'var(--navy)', margin:0, fontFamily:'"DM Serif Display",serif' }}>{einheit.titel}</h2>
              <span style={{ fontSize:12, padding:'2px 9px', borderRadius:20, fontWeight:700, background:st.bg, color:st.text }}>{st.label}</span>
              {einheit.serie_id && <span style={{ fontSize:11, background:'var(--gray-100)', color:'var(--gray-500)', padding:'2px 8px', borderRadius:10 }}>🔄 Serientraining</span>}
            </div>
            <div style={{ fontSize:13, color:'var(--gray-600)', display:'flex', gap:14, flexWrap:'wrap' }}>
              <span>📅 {new Date(einheit.datum+'T00:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
              {einheit.treffzeit && <span>🕐 Treff: <strong>{einheit.treffzeit.slice(0,5)}</strong></span>}
              {einheit.uhrzeit_start && <span>⏱ <strong>{einheit.uhrzeit_start.slice(0,5)}{einheit.uhrzeit_ende?`–${einheit.uhrzeit_ende.slice(0,5)}`:''}</strong></span>}
              {einheit.ort_obj?.name && <span>📍 {einheit.ort_obj.name}{einheit.ort_obj.adresse?` · ${einheit.ort_obj.adresse}`:''}</span>}
            </div>
            {einheit.ziele && <div style={{ marginTop:8, fontSize:13, color:'var(--gray-600)', fontStyle:'italic' }}>🎯 {einheit.ziele}</div>}

            {/* Spieler Rückmeldung */}
            {isSpieler && eigeneAnwesenheit && (
              <div style={{ marginTop:12, display:'flex', gap:8, alignItems:'center', padding:'10px 14px', background:'var(--gray-100)', borderRadius:'var(--radius)' }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Deine Rückmeldung:</span>
                <span style={{ fontSize:12, padding:'2px 10px', borderRadius:20, fontWeight:700, background:RUECK_STIL[eigeneAnwesenheit.rueckmeldung]?.bg, color:RUECK_STIL[eigeneAnwesenheit.rueckmeldung]?.text }}>{RUECK_STIL[eigeneAnwesenheit.rueckmeldung]?.label}</span>
                {eigeneAnwesenheit.rueckmeldung!=='zugesagt' && <button onClick={()=>eigeneRueckmeldung('zugesagt')} className="btn btn-sm" style={{ background:'#e2efda', color:'#2d6b3a', border:'none' }}>✓ Zusagen</button>}
                {eigeneAnwesenheit.rueckmeldung!=='abgesagt' && <button onClick={()=>eigeneRueckmeldung('abgesagt')} className="btn btn-sm btn-outline" style={{ color:'var(--red)' }}>✗ Absagen</button>}
              </div>
            )}
          </div>

          {isStaff && (
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              <select value={einheit.status} onChange={e=>{ supabase.from('trainingseinheiten').update({status:e.target.value}).eq('id',id).then(()=>load()) }}
                style={{ fontSize:12, padding:'6px 10px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontWeight:600 }}>
                {Object.entries(STATUS_STIL).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={()=>setShowEditForm(!showEditForm)} className={`btn btn-sm ${showEditForm?'btn-primary':'btn-outline'}`}>✏️</button>
            </div>
          )}
        </div>

        {showEditForm && isStaff && (
          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--gray-200)' }}>
            <div className="form-row">
              <div className="form-group"><label>Titel</label><input value={editForm.titel||''} onChange={e=>setEditForm(p=>({...p,titel:e.target.value}))} /></div>
              <div className="form-group"><label>Typ</label>
                <select value={editForm.typ_id||''} onChange={e=>setEditForm(p=>({...p,typ_id:e.target.value}))}>
                  <option value="">Kein Typ</option>{typen.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Ort</label>
                <select value={editForm.ort_id||''} onChange={e=>setEditForm(p=>({...p,ort_id:e.target.value}))}>
                  <option value="">Kein Ort</option>{orte.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Datum</label><input type="date" value={editForm.datum||''} onChange={e=>setEditForm(p=>({...p,datum:e.target.value}))} /></div>
              <div className="form-group"><label>Treffzeit</label><input type="time" value={editForm.treffzeit||''} onChange={e=>setEditForm(p=>({...p,treffzeit:e.target.value}))} /></div>
              <div className="form-group"><label>Start</label><input type="time" value={editForm.uhrzeit_start||''} onChange={e=>setEditForm(p=>({...p,uhrzeit_start:e.target.value}))} /></div>
              <div className="form-group"><label>Ende</label><input type="time" value={editForm.uhrzeit_ende||''} onChange={e=>setEditForm(p=>({...p,uhrzeit_ende:e.target.value}))} /></div>
            </div>
            <div className="form-group"><label>Ziele</label><textarea value={editForm.ziele||''} onChange={e=>setEditForm(p=>({...p,ziele:e.target.value}))} rows={2} /></div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={editSpeichern} className="btn btn-primary btn-sm" disabled={saving}>{saving?'…':'Speichern'}</button>
              <button onClick={()=>setShowEditForm(false)} className="btn btn-outline btn-sm">Abbrechen</button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:16 }}>
        <button className={`tab-btn${tab==='info'?' active':''}`} onClick={()=>setTab('info')}>ℹ️ Inhalte ({inhalte.length})</button>
        <button className={`tab-btn${tab==='anwesenheit'?' active':''}`} onClick={()=>setTab('anwesenheit')}>👥 Anwesenheit ({zugesagt}✓ {abgesagt}✗)</button>
        {isStaff && <button className={`tab-btn${tab==='statistik'?' active':''}`} onClick={()=>setTab('statistik')}>📊 Auswertung</button>}
      </div>

      {/* TAB: INHALTE */}
      {tab==='info' && (
        <div>
          {isStaff && (
            <div style={{ display:'flex', gap:8, marginBottom:14, justifyContent:'flex-end' }}>
              <button onClick={()=>setShowBiblio(true)} className="btn btn-outline">📚 Aus Bibliothek</button>
              <button onClick={()=>setShowInhaltForm(true)} className="btn btn-primary">+ Inhalt hinzufügen</button>
            </div>
          )}

          {showBiblio && <UebungsBibliothekPicker typen={typen} onSelect={ausLibliothekHinzufuegen} onClose={()=>setShowBiblio(false)} />}

          {showInhaltForm && isStaff && (
            <div className="card" style={{ marginBottom:16, borderLeft:'4px solid var(--navy)' }}>
              <h4 style={{ fontSize:14, color:'var(--navy)', marginBottom:14 }}>Neuer Inhalt</h4>
              <div className="form-row">
                <div className="form-group"><label>Block</label>
                  <select value={inhaltForm.block} onChange={e=>setInhaltForm(p=>({...p,block:e.target.value}))}>
                    {bloecke.map(b=><option key={b} value={b}>{BLOCK_LABEL[b]}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Dauer (Min.)</label><input type="number" value={inhaltForm.dauer_minuten} onChange={e=>setInhaltForm(p=>({...p,dauer_minuten:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Titel *</label><input value={inhaltForm.titel} onChange={e=>setInhaltForm(p=>({...p,titel:e.target.value}))} autoFocus /></div>
              <div className="form-group"><label>Beschreibung</label><textarea value={inhaltForm.beschreibung} onChange={e=>setInhaltForm(p=>({...p,beschreibung:e.target.value}))} rows={3} /></div>
              <div className="form-group"><label>Material</label><input value={inhaltForm.material} onChange={e=>setInhaltForm(p=>({...p,material:e.target.value}))} /></div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={inhaltSpeichern} className="btn btn-primary" disabled={saving}>{saving?'…':'Speichern'}</button>
                <button onClick={()=>setShowInhaltForm(false)} className="btn btn-outline">Abbrechen</button>
              </div>
            </div>
          )}

          {inhalte.length===0 ? <div className="empty-state card"><p>Noch keine Trainingsinhalte.</p></div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {bloecke.map(b => {
                const block = inhalte.filter(i=>i.block===b)
                if (!block.length) return null
                return (
                  <div key={b}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{BLOCK_LABEL[b]}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {block.map(i=>(
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
                            {isStaff && (
                              <div style={{ display:'flex', gap:6 }}>
                                <button onClick={()=>inhaltInBibliothek(i)} title="In Bibliothek speichern" style={{ background:'none', border:'1px solid var(--gray-200)', borderRadius:6, cursor:'pointer', padding:'4px 8px', fontSize:12, color:'var(--gray-500)' }}>📚</button>
                                <button onClick={async()=>{ await supabase.from('training_inhalte').delete().eq('id',i.id); load() }} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:18 }}>×</button>
                              </div>
                            )}
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
          <div className="stats-row" style={{ marginBottom:16 }}>
            {[['✓','Zugesagt',zugesagt,'#e2efda','#2d6b3a'],['✗','Abgesagt',abgesagt,'#fce4d6','#8a3a1a'],['?','Ausstehend',anwesenheit.filter(a=>a.rueckmeldung==='ausstehend').length,'#fff3cd','#8a6a00'],['👥','Erschienen',erschienen,'var(--gray-100)','var(--navy)']].map(([i,l,w,bg,c])=>(
              <div key={l} className="stat-card" style={{ background:bg }}>
                <div style={{ fontSize:20 }}>{i}</div><div className="stat-num" style={{ fontSize:22, color:c }}>{w}</div><div className="stat-label">{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {anwesenheit.map(a=>{
              const sp=a.spieler; if(!sp) return null
              const rs=RUECK_STIL[a.rueckmeldung]||RUECK_STIL.ausstehend
              return (
                <div key={a.id} className="card" style={{ padding:'10px 14px', marginBottom:0, display:'flex', alignItems:'center', gap:12 }}>
                  {sp.foto_url ? <img src={sp.foto_url} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} /> : <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:13, flexShrink:0 }}>{sp.vorname[0]}{sp.nachname[0]}</div>}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{sp.vorname} {sp.nachname}</div>
                    <div style={{ fontSize:11, color:'var(--gray-400)', display:'flex', gap:8 }}>
                      {sp.trikotnummer && <span>#{sp.trikotnummer}</span>}
                      {sp.position && <span>{sp.position}</span>}
                      {a.abmelde_grund && <span style={{ color:'var(--orange)' }}>"{a.abmelde_grund}"</span>}
                    </div>
                  </div>
                  <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, fontWeight:700, background:rs.bg, color:rs.text, flexShrink:0 }}>{rs.label}</span>
                  {isStaff && (
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={()=>anwesenheitSetzen(a.id, true)} style={{ width:32, height:32, borderRadius:6, border:`2px solid ${a.erschienen===true?'#3a8a5a':'var(--gray-300)'}`, background:a.erschienen===true?'#3a8a5a':'var(--white)', cursor:'pointer', fontSize:14, color:a.erschienen===true?'white':'var(--gray-400)' }}>✓</button>
                      <button onClick={()=>anwesenheitSetzen(a.id, false)} style={{ width:32, height:32, borderRadius:6, border:`2px solid ${a.erschienen===false?'#d94f4f':'var(--gray-300)'}`, background:a.erschienen===false?'#d94f4f':'var(--white)', cursor:'pointer', fontSize:14, color:a.erschienen===false?'white':'var(--gray-400)' }}>✗</button>
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
          <div className="section-title" style={{ marginBottom:16 }}>Auswertung</div>
          {quote!==null && (
            <div style={{ marginBottom:16, padding:'12px 16px', background:'var(--gray-100)', borderRadius:'var(--radius)', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ fontSize:36, fontWeight:900, color:'var(--navy)' }}>{quote}%</div>
              <div><div style={{ fontWeight:600 }}>Erschienen-Quote</div><div style={{ fontSize:13, color:'var(--gray-400)' }}>{erschienen} von {anwesenheit.filter(a=>a.erschienen!==null).length} erfasst</div></div>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Spieler</th><th>Rückmeldung</th><th>Erschienen</th><th>Grund</th></tr></thead>
              <tbody>
                {anwesenheit.map(a=>{ const sp=a.spieler; if(!sp) return null; return (
                  <tr key={a.id}>
                    <td style={{ fontWeight:600 }}>{sp.vorname} {sp.nachname}</td>
                    <td><span style={{ fontSize:11, padding:'1px 8px', borderRadius:10, fontWeight:700, background:RUECK_STIL[a.rueckmeldung]?.bg, color:RUECK_STIL[a.rueckmeldung]?.text }}>{RUECK_STIL[a.rueckmeldung]?.label}</span></td>
                    <td>{a.erschienen===true?<span style={{ color:'var(--green)' }}>✓</span>:a.erschienen===false?<span style={{ color:'var(--red)' }}>✗</span>:'–'}</td>
                    <td style={{ fontSize:12, color:'var(--gray-400)' }}>{a.abmelde_grund||'–'}</td>
                  </tr>
                )})}
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
