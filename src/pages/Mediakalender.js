import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const WOCHENTAGE = ['Mo','Di','Mi','Do','Fr','Sa','So']

const STATUS_FARBEN = {
  geplant:       { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24', label: 'Geplant' },
  veroeffentlicht:{ bg: 'rgba(34,197,94,0.2)', text: '#4ade80', label: 'Veröffentlicht' },
  abgebrochen:   { bg: 'rgba(239,68,68,0.2)',  text: '#f87171', label: 'Abgebrochen' },
}

const PLATTFORM_ICONS = { instagram: '📸', linkedin: '💼', facebook: '👥', tiktok: '🎵' }

export default function MediaKalender() {
  const { profile } = useAuth()
  const [heute] = useState(new Date())
  const [anzeigeDatum, setAnzeigeDatum] = useState(new Date())
  const [postings, setPostings] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // ausgewählter Tag
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    titel: '', inhalt: '', plattformen: [],
    geplant_am: '', geplant_uhrzeit: '12:00', status: 'geplant',
  })

  useEffect(() => { load() }, [anzeigeDatum])

  async function load() {
    setLoading(true)
    const monatStart = new Date(anzeigeDatum.getFullYear(), anzeigeDatum.getMonth(), 1).toISOString()
    const monatEnde = new Date(anzeigeDatum.getFullYear(), anzeigeDatum.getMonth() + 1, 0, 23, 59).toISOString()

    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from('media_postings').select('*, ersteller:erstellt_von(name)').gte('geplant_am', monatStart).lte('geplant_am', monatEnde).order('geplant_am'),
      supabase.from('events').select('id, titel, datum_start, datum_ende').gte('datum_start', monatStart).lte('datum_start', monatEnde),
    ])
    setPostings(p || [])
    setEvents(e || [])
    setLoading(false)
  }

  async function speichern() {
    if (!form.titel.trim() || !form.geplant_am) return
    const dt = new Date(`${form.geplant_am}T${form.geplant_uhrzeit}`)
    await supabase.from('media_postings').insert({
      titel: form.titel,
      inhalt: form.inhalt || null,
      plattformen: form.plattformen,
      geplant_am: dt.toISOString(),
      status: form.status,
      erstellt_von: profile.id,
    })
    setForm({ titel: '', inhalt: '', plattformen: [], geplant_am: selected ? selected.toISOString().split('T')[0] : '', geplant_uhrzeit: '12:00', status: 'geplant' })
    setShowForm(false)
    load()
  }

  async function statusToggle(id, status) {
    await supabase.from('media_postings').update({ status }).eq('id', id)
    load()
  }

  async function loeschen(id) {
    await supabase.from('media_postings').delete().eq('id', id)
    load()
  }

  // Kalender-Berechnungen
  const jahr = anzeigeDatum.getFullYear()
  const monat = anzeigeDatum.getMonth()
  const ersterTag = new Date(jahr, monat, 1)
  const letzterTag = new Date(jahr, monat + 1, 0)
  // Wochentag des ersten Tags (Mo=0, So=6)
  const startWochentag = (ersterTag.getDay() + 6) % 7
  const tageImMonat = letzterTag.getDate()

  // Alle Kalender-Zellen (inkl. Padding)
  const zellen = []
  for (let i = 0; i < startWochentag; i++) zellen.push(null)
  for (let d = 1; d <= tageImMonat; d++) zellen.push(new Date(jahr, monat, d))

  function postingsAmTag(datum) {
    if (!datum) return []
    const ds = datum.toISOString().split('T')[0]
    return postings.filter(p => p.geplant_am?.startsWith(ds))
  }

  function eventsAmTag(datum) {
    if (!datum) return []
    const ds = datum.toISOString().split('T')[0]
    return events.filter(e => e.datum_start?.startsWith(ds))
  }

  function istHeute(datum) {
    if (!datum) return false
    return datum.toDateString() === heute.toDateString()
  }

  function istAusgewaehlt(datum) {
    if (!datum || !selected) return false
    return datum.toDateString() === selected.toDateString()
  }

  const selectedPostings = selected ? postingsAmTag(selected) : []
  const selectedEvents = selected ? eventsAmTag(selected) : []

  function plattformToggle(p) {
    setForm(prev => ({
      ...prev,
      plattformen: prev.plattformen.includes(p)
        ? prev.plattformen.filter(x => x !== p)
        : [...prev.plattformen, p]
    }))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 16 }}>
      {/* Kalender */}
      <div>
        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => setAnzeigeDatum(new Date(jahr, monat - 1, 1))} style={navBtn}>‹</button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{MONATE[monat]} {jahr}</h2>
          <button onClick={() => setAnzeigeDatum(new Date(jahr, monat + 1, 1))} style={navBtn}>›</button>
        </div>

        {/* Wochentage Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
          {WOCHENTAGE.map(w => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', padding: '4px 0' }}>{w}</div>
          ))}
        </div>

        {/* Kalender Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {zellen.map((datum, i) => {
            const tagPostings = postingsAmTag(datum)
            const tagEvents = eventsAmTag(datum)
            const hatInhalt = tagPostings.length > 0 || tagEvents.length > 0
            return (
              <div key={i} onClick={() => datum && setSelected(datum)}
                style={{
                  minHeight: 70, padding: '6px 6px', borderRadius: 8,
                  background: datum
                    ? istAusgewaehlt(datum)
                      ? 'rgba(200,168,75,0.15)'
                      : istHeute(datum)
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.03)'
                    : 'transparent',
                  border: istAusgewaehlt(datum)
                    ? '1px solid var(--gold)'
                    : istHeute(datum)
                      ? '1px solid rgba(255,255,255,0.2)'
                      : '1px solid rgba(255,255,255,0.05)',
                  cursor: datum ? 'pointer' : 'default',
                  transition: 'all 0.1s',
                }}>
                {datum && (
                  <>
                    <div style={{
                      fontSize: 12, fontWeight: istHeute(datum) ? 700 : 400,
                      color: istHeute(datum) ? 'var(--gold)' : 'rgba(255,255,255,0.7)',
                      marginBottom: 4,
                    }}>{datum.getDate()}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {tagEvents.slice(0, 1).map(e => (
                        <div key={e.id} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          🏐 {e.titel}
                        </div>
                      ))}
                      {tagPostings.slice(0, 2).map(p => (
                        <div key={p.id} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: STATUS_FARBEN[p.status]?.bg, color: STATUS_FARBEN[p.status]?.text, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {(p.plattformen || []).map(pl => PLATTFORM_ICONS[pl] || '📱').join('')} {p.titel}
                        </div>
                      ))}
                      {(tagPostings.length + tagEvents.length) > 3 && (
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>+{tagPostings.length + tagEvents.length - 3} weitere</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Legende */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          <LegendItem farbe="rgba(99,102,241,0.3)" text="Event" />
          <LegendItem farbe="rgba(245,158,11,0.3)" text="Geplant" />
          <LegendItem farbe="rgba(34,197,94,0.3)" text="Veröffentlicht" />
        </div>
      </div>

      {/* Seitenleiste: Tages-Detail */}
      {selected && (
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>
                {selected.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            {/* Events */}
            {selectedEvents.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Events</div>
                {selectedEvents.map(e => (
                  <div key={e.id} style={{ fontSize: 13, padding: '6px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: 6, color: '#a5b4fc', marginBottom: 4 }}>
                    🏐 {e.titel}
                  </div>
                ))}
              </div>
            )}

            {/* Postings */}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Postings</div>
            {selectedPostings.length === 0 ? (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Keine Postings geplant</div>
            ) : (
              selectedPostings.map(p => (
                <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.titel}</div>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: STATUS_FARBEN[p.status]?.bg, color: STATUS_FARBEN[p.status]?.text }}>
                      {STATUS_FARBEN[p.status]?.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                    {new Date(p.geplant_am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                    {(p.plattformen||[]).length > 0 && ` · ${p.plattformen.map(pl => PLATTFORM_ICONS[pl] || pl).join(' ')}`}
                  </div>
                  {p.inhalt && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>{p.inhalt.slice(0, 80)}{p.inhalt.length > 80 ? '…' : ''}</div>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.status === 'geplant' && (
                      <button onClick={() => statusToggle(p.id, 'veroeffentlicht')} style={{ ...btnMini, color: '#4ade80' }}>✓ Veröffentlicht</button>
                    )}
                    <button onClick={() => loeschen(p.id)} style={{ ...btnMini, color: '#f87171' }}>× Löschen</button>
                  </div>
                </div>
              ))
            )}

            <button onClick={() => {
              setForm(prev => ({ ...prev, geplant_am: selected.toISOString().split('T')[0] }))
              setShowForm(true)
            }} style={{ ...btnPrimary, width: '100%', marginTop: 4 }}>+ Posting planen</button>
          </div>

          {/* Formular */}
          {showForm && (
            <div className="card">
              <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Neues Posting</h4>
              <input placeholder="Titel *" value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} style={inputStyle} />
              <textarea placeholder="Inhalt / Caption (optional)" value={form.inhalt} onChange={e=>setForm(p=>({...p,inhalt:e.target.value}))} rows={3} style={{...inputStyle,resize:'vertical'}} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="date" value={form.geplant_am} onChange={e=>setForm(p=>({...p,geplant_am:e.target.value}))} style={{...inputStyle,flex:1,margin:0}} />
                <input type="time" value={form.geplant_uhrzeit} onChange={e=>setForm(p=>({...p,geplant_uhrzeit:e.target.value}))} style={{...inputStyle,width:100,margin:0}} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Plattformen</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['instagram','linkedin','facebook','tiktok'].map(p => (
                    <button key={p} onClick={() => plattformToggle(p)} style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, border: 'none', cursor: 'pointer',
                      background: form.plattformen.includes(p) ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                      color: form.plattformen.includes(p) ? '#0a0a1a' : 'rgba(255,255,255,0.7)',
                    }}>
                      {PLATTFORM_ICONS[p]} {p}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={speichern} style={btnPrimary}>Speichern</button>
                <button onClick={() => setShowForm(false)} style={btnGhost}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LegendItem({ farbe, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
      <div style={{ width: 12, height: 12, borderRadius: 3, background: farbe }} />
      {text}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  color: 'white', fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none',
}
const btnPrimary = { padding: '8px 16px', background: 'var(--gold)', color: '#0a0a1a', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
const btnGhost = { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 13 }
const btnMini = { padding: '4px 8px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontSize: 11 }
const navBtn = { padding: '6px 14px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 18, fontWeight: 300 }
