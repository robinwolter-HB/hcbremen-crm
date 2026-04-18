import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function MeineAufgaben() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [alle, setAlle] = useState([])
  const [filter, setFilter] = useState('offen')
  const [personFilter, setPersonFilter] = useState(undefined)
  const [nutzer, setNutzer] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: h }, { data: n }] = await Promise.all([
      supabase.from('kontakthistorie')
        .select('*,kontakte(id,firma,logo_url)')
        .order('faellig_am', { ascending: true, nullsFirst: false }),
      supabase.from('profile').select('name,email').order('name')
    ])
    setAlle(h || [])
    setNutzer(n || [])
    setLoading(false)
  }

  async function toggleErledigt(e, h) {
    e.stopPropagation()
    await supabase.from('kontakthistorie').update({ erledigt: !h.erledigt }).eq('id', h.id)
    load()
  }

  const meinName = profile?.name || profile?.email || ''

  const filtered = alle.filter(h => {
    const person = personFilter !== undefined ? personFilter : meinName
    let istZustaendig = true
    if (person) {
      istZustaendig = (h.zustaendig_personen || []).includes(person) ||
        h.zustaendig === person ||
        (h.zustaendig || '').split(',').map(s => s.trim()).includes(person)
    }
    const matchFilter = filter === 'alle' ? true : filter === 'offen' ? !h.erledigt : h.erledigt
    return istZustaendig && matchFilter
  })

  const ueberfaellig = filtered.filter(h => h.faellig_am && !h.erledigt && new Date(h.faellig_am) < new Date())
  const heute = filtered.filter(h => {
    if (!h.faellig_am || h.erledigt) return false
    return new Date(h.faellig_am).toDateString() === new Date().toDateString()
  })
  const spaeter = filtered.filter(h => {
    if (!h.faellig_am || h.erledigt) return false
    return new Date(h.faellig_am) > new Date() && new Date(h.faellig_am).toDateString() !== new Date().toDateString()
  })
  const keinDatum = filtered.filter(h => !h.faellig_am && !h.erledigt)
  const erledigt = filtered.filter(h => h.erledigt)

  function AufgabenListe({ items, title, color, icon }) {
    if (items.length === 0) return null
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <span style={{ fontSize:16 }}>{icon}</span>
          <span style={{ fontWeight:700, fontSize:15, color }}>{title}</span>
          <span style={{ fontSize:12, background:color+'20', color, padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{items.length}</span>
        </div>
        <div style={{ display:'grid', gap:8 }}>
          {items.map(h => {
            const isExpanded = expanded[h.id]
            const isUeberfaellig = h.faellig_am && !h.erledigt && new Date(h.faellig_am) < new Date()
            return (
              <div key={h.id} style={{ background:'var(--white)', borderRadius:'var(--radius)',
                border:'1.5px solid var(--gray-200)', borderLeft:`4px solid ${color}`,
                overflow:'hidden', opacity: h.erledigt ? 0.6 : 1 }}>
                {/* Hauptzeile */}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer' }}
                  onClick={() => setExpanded(e => ({ ...e, [h.id]: !e[h.id] }))}>
                  {/* Logo */}
                  <div style={{ width:32, height:32, flexShrink:0 }}>
                    {h.kontakte?.logo_url
                      ? <img src={h.kontakte.logo_url} alt="" style={{ width:32, height:32, objectFit:'contain', borderRadius:6, border:'1px solid var(--gray-200)' }}/>
                      : <div style={{ width:32, height:32, background:'var(--navy)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white' }}>
                          {h.kontakte?.firma?.[0] || '?'}
                        </div>
                    }
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <strong style={{ fontSize:14 }}>{h.kontakte?.firma || 'Kein Kontakt'}</strong>
                      <span style={{ fontSize:12, background:'var(--gray-100)', padding:'1px 8px', borderRadius:20 }}>{h.art}</span>
                      {isUeberfaellig && <span style={{ fontSize:11, color:'var(--red)', fontWeight:700 }}>ÜBERFÄLLIG</span>}
                    </div>
                    <div style={{ fontSize:13, color:'var(--gray-600)', marginTop:2 }}>{h.betreff}</div>
                    {h.naechste_aktion && (
                      <div style={{ fontSize:12, color:'var(--blue)', marginTop:2 }}>→ {h.naechste_aktion}</div>
                    )}
                  </div>
                  {/* Rechts: Datum + Checkbox */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                    {h.faellig_am && (
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:12, fontWeight:600, color: isUeberfaellig ? 'var(--red)' : 'var(--gray-600)' }}>
                          {new Date(h.faellig_am).toLocaleDateString('de-DE')}
                        </div>
                        {(h.zustaendig_personen?.length > 0 || h.zustaendig) && (
                          <div style={{ fontSize:11, color:'var(--gray-400)' }}>
                            👤 {(h.zustaendig_personen||[]).join(', ') || h.zustaendig}
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={e => toggleErledigt(e, h)}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, flexShrink:0 }}>
                      {h.erledigt ? '✅' : '⬜'}
                    </button>
                    <span style={{ fontSize:12, color:'var(--gray-400)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {/* Ausgeklappt */}
                {isExpanded && (
                  <div style={{ borderTop:'1px solid var(--gray-100)', padding:'12px 16px', background:'var(--gray-100)', display:'grid', gap:8 }}>
                    {h.notiz && (
                      <div style={{ fontSize:13, color:'var(--gray-600)', lineHeight:1.5 }}>
                        <strong>Notiz:</strong> {h.notiz}
                      </div>
                    )}
                    {h.meeting_datum && (
                      <div style={{ fontSize:13 }}>
                        <strong>Meeting:</strong> {new Date(h.meeting_datum).toLocaleDateString('de-DE')}
                        {h.meeting_uhrzeit ? ' um ' + h.meeting_uhrzeit.slice(0,5) : ''}
                        {h.meeting_ort ? ' · ' + h.meeting_ort : ''}
                      </div>
                    )}
                    {h.meeting_teilnehmer?.length > 0 && (
                      <div style={{ fontSize:13 }}>
                        <strong>Teilnehmer:</strong> {h.meeting_teilnehmer.join(', ')}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:8, marginTop:4 }}>
                      <button className="btn btn-sm btn-primary"
                        onClick={() => navigate('/kontakte/' + h.kontakt_id)}>
                        Zum Kontakt →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div className="page-title">Meine Aufgaben</div>
          <p className="page-subtitle">Offene ToDos und Aktionen</p>
        </div>
      </div>

      <div className="toolbar">
        <select value={personFilter !== undefined ? personFilter : meinName}
          onChange={e => setPersonFilter(e.target.value)}>
          <option value={meinName}>Meine Aufgaben ({meinName})</option>
          <option value="">Alle Personen</option>
          {nutzer.filter(n => (n.name||n.email) !== meinName).map(n => (
            <option key={n.email||n.name} value={n.name||n.email}>{n.name||n.email}</option>
          ))}
        </select>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="offen">Offen</option>
          <option value="alle">Alle</option>
          <option value="erledigt">Erledigt</option>
        </select>
        <span style={{ marginLeft:'auto', fontSize:13, color:'var(--gray-600)' }}>{filtered.length} Aufgaben</span>
      </div>

      {filter !== 'erledigt' && (
        <>
          <AufgabenListe items={ueberfaellig} title="Überfällig" color="var(--red)" icon="🚨"/>
          <AufgabenListe items={heute} title="Heute fällig" color="var(--orange)" icon="⏰"/>
          <AufgabenListe items={spaeter} title="Demnächst" color="var(--blue)" icon="📅"/>
          <AufgabenListe items={keinDatum} title="Kein Datum" color="var(--gray-400)" icon="📋"/>
          {filtered.filter(h => !h.erledigt).length === 0 && (
            <div className="empty-state card"><p>Keine offenen Aufgaben. Alles erledigt! 🎉</p></div>
          )}
        </>
      )}
      {filter === 'erledigt' && <AufgabenListe items={erledigt} title="Erledigt" color="var(--green)" icon="✅"/>}
      {filter === 'alle' && (
        <>
          <AufgabenListe items={ueberfaellig} title="Überfällig" color="var(--red)" icon="🚨"/>
          <AufgabenListe items={heute} title="Heute fällig" color="var(--orange)" icon="⏰"/>
          <AufgabenListe items={spaeter} title="Demnächst" color="var(--blue)" icon="📅"/>
          <AufgabenListe items={keinDatum} title="Kein Datum" color="var(--gray-400)" icon="📋"/>
          <AufgabenListe items={erledigt} title="Erledigt" color="var(--green)" icon="✅"/>
        </>
      )}
    </main>
  )
}
