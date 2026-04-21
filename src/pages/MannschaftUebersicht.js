import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STATUS_STIL = {
  aktiv:       { bg:'#e2efda', text:'#2d6b3a', label:'Aktiv' },
  verletzt:    { bg:'#fce4d6', text:'#8a3a1a', label:'Verletzt' },
  gesperrt:    { bg:'#fff3cd', text:'#8a6a00', label:'Gesperrt' },
  inaktiv:     { bg:'#ececec', text:'#555',    label:'Inaktiv' },
  ausgeliehen: { bg:'#ddeaff', text:'#1a4a8a', label:'Ausgeliehen' },
}

export default function MannschaftUebersicht() {
  const { profile } = useAuth()
  const isManager = profile?.ist_manager || profile?.rolle === 'admin'
  const [mannschaften, setMannschaften] = useState([])
  const [spieler, setSpieler] = useState([])
  const [verletzungen, setVerletzungen] = useState([])
  const [spieltage, setSpieltage] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: mn }, { data: sp }, { data: vl }, { data: st }] = await Promise.all([
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('spieler').select('*, mannschaft:mannschaft_id(name,farbe)').eq('aktiv', true).order('nachname'),
      supabase.from('spieler_verletzungen')
        .select('*, spieler(vorname, nachname, mannschaft:mannschaft_id(name,farbe))')
        .is('datum_genesung', null)
        .order('datum_verletzung', { ascending: false }),
      supabase.from('veranstaltungen')
        .select('id, name, datum, status')
        .in('art', ['Heimspiel', 'Auswärtsspiel', 'Turnier'])
        .gte('datum', new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0])
        .order('datum', { ascending: false })
        .limit(5),
    ])
    setMannschaften(mn || [])
    setSpieler(sp || [])
    setVerletzungen(vl || [])
    setSpieltage(st || [])
    setLoading(false)
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  const aktive = spieler.filter(s => s.status === 'aktiv')
  const verletzte = spieler.filter(s => s.status === 'verletzt')

  return (
    <div>
      {/* KPI */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        {[
          ['👥', 'Spieler gesamt',    spieler.length,    'var(--navy)',   'blue'],
          ['✅', 'Aktiv',             aktive.length,     'var(--green)',  'green'],
          ['🏥', 'Verletzt',          verletzte.length,  'var(--red)',    'red'],
          ['🏆', 'Mannschaften',      mannschaften.length,'var(--gold)',  'gold'],
        ].map(([icon, label, wert, color, cls]) => (
          <div key={label} className={`stat-card ${cls}`}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
            <div className="stat-num" style={{ color }}>{wert}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Mannschaften */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Mannschaften</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mannschaften.map(m => {
              const mSpieler = spieler.filter(s => s.mannschaft_id === m.id)
              const mVerletzt = mSpieler.filter(s => s.status === 'verletzt')
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', borderLeft: `4px solid ${m.farbe||'var(--navy)'}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                      {mSpieler.length} Spieler
                      {mVerletzt.length > 0 && <span style={{ color: 'var(--red)', marginLeft: 8 }}>· {mVerletzt.length} verletzt</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Object.entries(STATUS_STIL).map(([key, st]) => {
                      const n = mSpieler.filter(s => s.status === key).length
                      if (n === 0) return null
                      return <span key={key} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: st.bg, color: st.text, fontWeight: 600 }}>{st.label}: {n}</span>
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Aktuelle Verletzungen */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>🏥 Aktuelle Verletzungen ({verletzungen.length})</div>
          {verletzungen.length === 0 ? (
            <div className="empty-state"><p>Keine aktiven Verletzungen.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {verletzungen.slice(0, 8).map(v => {
                const schwer = { leicht:'#e2efda', mittel:'#fff3cd', schwer:'#fce4d6', kritisch:'#fce4d6' }
                const schwerText = { leicht:'#2d6b3a', mittel:'#8a6a00', schwer:'#8a3a1a', kritisch:'#d94f4f' }
                return (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: 'var(--gray-100)', borderRadius: 'var(--radius)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{v.spieler?.vorname} {v.spieler?.nachname}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                        {v.spieler?.mannschaft?.name} · {v.diagnose}
                        {v.koerperteil && ` (${v.koerperteil})`}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                        seit {new Date(v.datum_verletzung).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700, background: schwer[v.schweregrad], color: schwerText[v.schweregrad] }}>
                      {v.schweregrad}
                    </span>
                  </div>
                )
              })}
              {verletzungen.length > 8 && <div style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center' }}>+{verletzungen.length - 8} weitere</div>}
            </div>
          )}
        </div>
      </div>

      {/* Letzte Spieltage */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 14 }}>🏐 Letzte Spieltage</div>
        {spieltage.length === 0 ? (
          <div className="empty-state"><p>Keine Spieltage in den letzten 30 Tagen.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Datum</th><th>Spiel</th><th>Status</th></tr></thead>
              <tbody>
                {spieltage.map(s => (
                  <tr key={s.id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{s.datum ? new Date(s.datum+'T00:00:00').toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'2-digit' }) : '–'}</td>
                    <td>{s.name}</td>
                    <td><span className="badge badge-aktiv">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
