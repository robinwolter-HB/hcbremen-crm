import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const WOCHENTAGE = ['Mo','Di','Mi','Do','Fr','Sa','So']

const EVENT_TYPES = {
  todo: { farbe: '#2d6fa3', label: 'Aufgabe', icon: '✓' },
  meeting: { farbe: '#8b5cf6', label: 'Meeting', icon: '🤝' },
  event: { farbe: '#e07b30', label: 'Veranstaltung', icon: '📅' },
  vertrag_ende: { farbe: '#d94f4f', label: 'Vertragsende', icon: '⚠️' },
  vertrag_start: { farbe: '#3a8a5a', label: 'Vertragsbeginn', icon: '✅' },
}

export default function Kalender() {
  const navigate = useNavigate()
  const today = new Date()
  const [jahr, setJahr] = useState(today.getFullYear())
  const [monat, setMonat] = useState(today.getMonth())
  const [kalenderEvents, setKalenderEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [filter, setFilter] = useState({ todo: true, meeting: true, event: true, vertrag_ende: true, vertrag_start: true })

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: todos }, { data: events }, { data: vertraege }] = await Promise.all([
      supabase.from('kontakthistorie').select('*,kontakte(id,firma)').eq('erledigt', false).not('faellig_am', 'is', null),
      supabase.from('veranstaltungen').select('*').not('datum', 'is', null),
      supabase.from('sponsoring').select('*,kontakte(firma)').not('vertragsende', 'is', null)
    ])

    const alle = []

    // Meetings (moved to after m is loaded)
    // ToDos
    ;(todos || []).forEach(t => {
      alle.push({
        id: 'todo-'+t.id,
        type: 'todo',
        datum: new Date(t.faellig_am),
        titel: t.naechste_aktion || t.betreff || 'Aufgabe',
        untertitel: t.kontakte?.firma || '',
        link: t.kontakte?.id ? '/kontakte/'+t.kontakte.id : null,
        raw: t
      })
    })

    // Events
    ;(events || []).forEach(e => {
      alle.push({
        id: 'event-'+e.id,
        type: 'event',
        datum: new Date(e.datum),
        titel: e.name,
        untertitel: e.ort || '',
        link: '/veranstaltungen',
        raw: e
      })
    })

    // Vertragsenden
    ;(vertraege || []).forEach(v => {
      if (v.vertragsende) {
        alle.push({
          id: 'vende-'+v.id,
          type: 'vertrag_ende',
          datum: new Date(v.vertragsende),
          titel: 'Vertragsende: ' + (v.kontakte?.firma || ''),
          untertitel: v.paket || '',
          link: '/sponsoring',
          raw: v
        })
      }
      if (v.vertragsbeginn) {
        alle.push({
          id: 'vstart-'+v.id,
          type: 'vertrag_start',
          datum: new Date(v.vertragsbeginn),
          titel: 'Vertragsbeginn: ' + (v.kontakte?.firma || ''),
          untertitel: v.paket || '',
          link: '/sponsoring',
          raw: v
        })
      }
    })

    setKalenderEvents(alle)
    setLoading(false)
  }

  function getDaysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate()
  }

  function getFirstDayOfMonth(y, m) {
    let d = new Date(y, m, 1).getDay()
    return d === 0 ? 6 : d - 1 // Mo=0
  }

  function getEventsForDay(day) {
    return kalenderEvents.filter(e => {
      if (!filter[e.type]) return false
      const d = e.datum
      return d.getFullYear() === jahr && d.getMonth() === monat && d.getDate() === day
    })
  }

  function prevMonat() {
    if (monat === 0) { setMonat(11); setJahr(y => y - 1) }
    else setMonat(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonat() {
    if (monat === 11) { setMonat(0); setJahr(y => y + 1) }
    else setMonat(m => m + 1)
    setSelectedDay(null)
  }

  const daysInMonth = getDaysInMonth(jahr, monat)
  const firstDay = getFirstDayOfMonth(jahr, monat)
  const selectedDayEvents = selectedDay ? kalenderEvents.filter(e => {
    if (!filter[e.type]) return false
    const d = e.datum
    return d.getFullYear() === jahr && d.getMonth() === monat && d.getDate() === selectedDay
  }) : []

  // Kommende Events (naechste 30 Tage)
  const kommende = kalenderEvents
    .filter(e => {
      if (!filter[e.type]) return false
      const diff = (e.datum - today) / (1000*60*60*24)
      return diff >= 0 && diff <= 30
    })
    .sort((a,b) => a.datum - b.datum)

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Kalender</div>
      <p className="page-subtitle">Aufgaben, Events und Verträge im Überblick</p>

      {/* Dieser Monat - ÜBER dem Kalender */}
      <div className="card" style={{ marginBottom:16, padding:'14px 20px' }}>
        <div className="section-title" style={{ marginBottom:12, fontSize:16 }}>Dieser Monat</div>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          {Object.entries(EVENT_TYPES).map(([key, t]) => {
            const count = kalenderEvents.filter(e => e.type === key && e.datum.getFullYear() === jahr && e.datum.getMonth() === monat).length
            return (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:20, background:count>0?t.farbe+'15':'var(--gray-100)', border:'1.5px solid '+(count>0?t.farbe:'var(--gray-200)') }}>
                <span style={{ fontSize:14 }}>{t.icon}</span>
                <span style={{ fontSize:13, fontWeight:600, color:count>0?t.farbe:'var(--gray-400)' }}>{t.label}</span>
                <span style={{ fontSize:14, fontWeight:700, color:count>0?t.farbe:'var(--gray-400)' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:24, alignItems:'start' }}>

        {/* KALENDER */}
        <div>
          {/* Filter */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {Object.entries(EVENT_TYPES).map(([key, t]) => (
              <button key={key} onClick={() => setFilter(f => ({...f, [key]: !f[key]}))}
                style={{ padding:'5px 12px', borderRadius:20, border:'1.5px solid '+t.farbe, fontSize:12, fontWeight:600, cursor:'pointer',
                  background: filter[key] ? t.farbe : 'transparent', color: filter[key] ? 'white' : t.farbe }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Monats-Navigation */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--gray-100)', background:'var(--navy)' }}>
              <button onClick={prevMonat} style={{ background:'none', border:'none', color:'white', fontSize:20, cursor:'pointer', padding:'0 8px' }}>‹</button>
              <span style={{ fontFamily:'"DM Serif Display",serif', fontSize:20, color:'white' }}>{MONATE[monat]} {jahr}</span>
              <button onClick={nextMonat} style={{ background:'none', border:'none', color:'white', fontSize:20, cursor:'pointer', padding:'0 8px' }}>›</button>
            </div>

            {/* Wochentage Header */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'var(--gray-100)' }}>
              {WOCHENTAGE.map(w => (
                <div key={w} style={{ padding:'8px', textAlign:'center', fontSize:12, fontWeight:600, color:'var(--gray-600)' }}>{w}</div>
              ))}
            </div>

            {/* Tage */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, background:'var(--gray-200)' }}>
              {/* Leere Felder vor erstem Tag */}
              {Array.from({length: firstDay}).map((_, i) => (
                <div key={'empty-'+i} style={{ background:'var(--gray-100)', minHeight:80 }}/>
              ))}

              {/* Tage */}
              {Array.from({length: daysInMonth}).map((_, i) => {
                const day = i + 1
                const dayEvents = getEventsForDay(day)
                const isToday = today.getFullYear()===jahr && today.getMonth()===monat && today.getDate()===day
                const isSelected = selectedDay === day
                const isWeekend = (firstDay + i) % 7 >= 5

                return (
                  <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                    style={{ background: isSelected ? 'rgba(15,34,64,0.06)' : isWeekend ? 'rgba(0,0,0,0.02)' : 'var(--white)',
                      minHeight:80, padding:'6px', cursor:'pointer', position:'relative',
                      outline: isSelected ? '2px solid var(--navy)' : 'none', outlineOffset:-2 }}>
                    <div style={{ fontWeight: isToday ? 700 : 400, fontSize:13,
                      background: isToday ? 'var(--navy)' : 'transparent',
                      color: isToday ? 'white' : isWeekend ? 'var(--gray-400)' : 'var(--text)',
                      width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 }}>
                      {day}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {dayEvents.slice(0,3).map(e => (
                        <div key={e.id} style={{ fontSize:10, padding:'1px 5px', borderRadius:3, fontWeight:600,
                          background: EVENT_TYPES[e.type].farbe+'22', color: EVENT_TYPES[e.type].farbe,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {EVENT_TYPES[e.type].icon} {e.titel}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div style={{fontSize:10,color:'var(--gray-400)',paddingLeft:4}}>+{dayEvents.length-3} weitere</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ausgewählter Tag Details */}
          {selectedDay && selectedDayEvents.length > 0 && (
            <div className="card" style={{ marginTop:16 }}>
              <div className="section-title" style={{ marginBottom:12 }}>{selectedDay}. {MONATE[monat]} {jahr}</div>
              <div style={{ display:'grid', gap:8 }}>
                {selectedDayEvents.map(e => (
                  <div key={e.id} onClick={() => e.link && navigate(e.link)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                      border:'1.5px solid '+EVENT_TYPES[e.type].farbe+'44',
                      borderLeft:'4px solid '+EVENT_TYPES[e.type].farbe,
                      borderRadius:'var(--radius)', cursor: e.link ? 'pointer' : 'default',
                      background: EVENT_TYPES[e.type].farbe+'08' }}>
                    <span style={{ fontSize:20 }}>{EVENT_TYPES[e.type].icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{e.titel}</div>
                      {e.untertitel && <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{e.untertitel}</div>}
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:EVENT_TYPES[e.type].farbe,
                      background:EVENT_TYPES[e.type].farbe+'22', padding:'2px 8px', borderRadius:20 }}>
                      {EVENT_TYPES[e.type].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedDay && selectedDayEvents.length === 0 && (
            <div className="card" style={{ marginTop:16, textAlign:'center', color:'var(--gray-400)', padding:20 }}>
              <p>Keine Einträge am {selectedDay}. {MONATE[monat]}.</p>
            </div>
          )}
        </div>

      </div>

      {/* Nächste 30 Tage - UNTER dem Kalender */}
      <div className="card" style={{ marginTop:16 }}>
        <div className="section-title" style={{ marginBottom:16 }}>Nächste 30 Tage</div>
        {kommende.length === 0
          ? <p style={{ fontSize:13, color:'var(--gray-400)' }}>Keine anstehenden Termine.</p>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
              {kommende.map(e => {
                const diff = Math.ceil((e.datum - today) / (1000*60*60*24))
                const diffLabel = diff === 0 ? 'Heute' : diff === 1 ? 'Morgen' : 'in '+diff+' Tagen'
                return (
                  <div key={e.id} onClick={() => e.link && navigate(e.link)}
                    style={{ padding:'10px 12px', borderRadius:'var(--radius)',
                      border:'1px solid '+EVENT_TYPES[e.type].farbe+'33',
                      borderLeft:'3px solid '+EVENT_TYPES[e.type].farbe,
                      background:EVENT_TYPES[e.type].farbe+'08', cursor: e.link ? 'pointer' : 'default' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{e.titel}</div>
                        {e.untertitel && <div style={{ fontSize:11, color:'var(--gray-400)' }}>{e.untertitel}</div>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:diff<=3?'var(--red)':diff<=7?'var(--orange)':'var(--gray-400)' }}>{diffLabel}</div>
                        <div style={{ fontSize:10, color:'var(--gray-400)' }}>{e.datum.toLocaleDateString('de-DE')}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </div>
    </main>
  )
}
