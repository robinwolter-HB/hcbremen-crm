import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({})
  const [offene, setOffene] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: kontakte }, { data: historie }] = await Promise.all([
      supabase.from('kontakte').select('status'),
      supabase.from('kontakthistorie').select('*,kontakte(firma)').eq('erledigt', false).order('faellig_am', { ascending: true }).limit(15)
    ])
    const counts = { Zugesagt:0, Eingeladen:0, Offen:0, Absage:0, 'Aktiver Sponsor':0 }
    kontakte?.forEach(k => { if (counts[k.status] !== undefined) counts[k.status]++ })
    setStats({ ...counts, gesamt: kontakte?.length || 0 })
    setOffene(historie || [])
    setLoading(false)
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <main className="main">
      <div className="page-title">Dashboard</div>
      <p className="page-subtitle">Übersicht Sponsoren & Kontakte</p>

      <div className="stats-row">
        <div className="stat-card green"><div className="stat-num">{stats.Zugesagt}</div><div className="stat-label">Zugesagt</div></div>
        <div className="stat-card blue"><div className="stat-num">{stats.Eingeladen}</div><div className="stat-label">Eingeladen</div></div>
        <div className="stat-card orange"><div className="stat-num">{stats.Offen}</div><div className="stat-label">Offen</div></div>
        <div className="stat-card red"><div className="stat-num">{stats.Absage}</div><div className="stat-label">Absage</div></div>
        <div className="stat-card gold"><div className="stat-num">{stats['Aktiver Sponsor']}</div><div className="stat-label">Aktive Sponsoren</div></div>
        <div className="stat-card"><div className="stat-num">{stats.gesamt}</div><div className="stat-label">Gesamt</div></div>
      </div>

      <div className="card">
        <div className="section-title">Offene Aktionen</div>
        {offene.length === 0
          ? <div className="empty-state"><p>Keine offenen Aktionen. ✓</p></div>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Firma</th><th>Betreff</th><th>Nächste Aktion</th><th>Fällig</th><th>Zuständig</th></tr></thead>
                <tbody>
                  {offene.map(h => (
                    <tr key={h.id} onClick={() => navigate(`/kontakte/${h.kontakt_id}`)}>
                      <td><strong>{h.kontakte?.firma}</strong></td>
                      <td>{h.betreff}</td>
                      <td>{h.naechste_aktion}</td>
                      <td style={{color: h.faellig_am && new Date(h.faellig_am) < new Date() ? 'var(--red)' : 'inherit', fontWeight: h.faellig_am && new Date(h.faellig_am) < new Date() ? 600 : 400}}>
                        {h.faellig_am ? new Date(h.faellig_am).toLocaleDateString('de-DE') : '—'}
                      </td>
                      <td>{h.zustaendig}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </main>
  )
}
