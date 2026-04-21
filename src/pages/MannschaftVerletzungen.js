import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SCHWER = {
  leicht:   { bg:'#e2efda', text:'#2d6b3a' },
  mittel:   { bg:'#fff3cd', text:'#8a6a00' },
  schwer:   { bg:'#fce4d6', text:'#8a3a1a' },
  kritisch: { bg:'#fce4d6', text:'#d94f4f' },
}

export default function MannschaftVerletzungen() {
  const [verletzungen, setVerletzungen] = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [filter, setFilter] = useState('aktiv')
  const [mannschaftFilter, setMannschaftFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: vl }, { data: mn }] = await Promise.all([
      supabase.from('spieler_verletzungen')
        .select('*, spieler(id, vorname, nachname, foto_url, mannschaft:mannschaft_id(id, name, farbe))')
        .order('datum_verletzung', { ascending: false }),
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setVerletzungen(vl || [])
    setMannschaften(mn || [])
    setLoading(false)
  }

  async function heilen(id, spielerId) {
    await supabase.from('spieler_verletzungen').update({ datum_genesung: new Date().toISOString().split('T')[0] }).eq('id', id)
    const { data } = await supabase.from('spieler_verletzungen').select('id').eq('spieler_id', spielerId).is('datum_genesung', null)
    if (!data?.length) await supabase.from('spieler').update({ status: 'aktiv' }).eq('id', spielerId)
    load()
  }

  const gefiltert = verletzungen.filter(v => {
    const matchStatus = filter === 'alle' || (filter === 'aktiv' ? !v.datum_genesung : !!v.datum_genesung)
    const matchMannschaft = !mannschaftFilter || v.spieler?.mannschaft?.id === mannschaftFilter
    return matchStatus && matchMannschaft
  })

  const aktiveAnzahl = verletzungen.filter(v => !v.datum_genesung).length

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div>
      {/* KPI */}
      {aktiveAnzahl > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          🏥 <strong>{aktiveAnzahl} aktive Verletzung{aktiveAnzahl !== 1 ? 'en' : ''}</strong> im Kader
        </div>
      )}

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['aktiv','Aktuell'],['abgeheilt','Abgeheilt'],['alle','Alle']].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`btn btn-sm ${filter===k?'btn-primary':'btn-outline'}`}>{l}</button>
          ))}
        </div>
        <select value={mannschaftFilter} onChange={e => setMannschaftFilter(e.target.value)}
          style={{ padding:'6px 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13 }}>
          <option value="">Alle Mannschaften</option>
          {mannschaften.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {gefiltert.length === 0 ? (
        <div className="empty-state card"><p>{filter === 'aktiv' ? 'Keine aktiven Verletzungen. 🎉' : 'Keine Verletzungen gefunden.'}</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Spieler</th>
                <th>Mannschaft</th>
                <th>Diagnose</th>
                <th>Körperteil</th>
                <th>Schweregrad</th>
                <th>Seit</th>
                <th>Genesen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gefiltert.map(v => {
                const aktiv = !v.datum_genesung
                const tage = aktiv
                  ? Math.floor((Date.now() - new Date(v.datum_verletzung)) / (1000*60*60*24))
                  : Math.floor((new Date(v.datum_genesung) - new Date(v.datum_verletzung)) / (1000*60*60*24))
                return (
                  <tr key={v.id} style={{ opacity: aktiv ? 1 : 0.6 }}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{v.spieler?.vorname} {v.spieler?.nachname}</div>
                    </td>
                    <td>
                      {v.spieler?.mannschaft && (
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: (v.spieler.mannschaft.farbe||'#ccc')+'20', color: v.spieler.mannschaft.farbe||'var(--navy)', fontWeight: 600 }}>
                          {v.spieler.mannschaft.name}
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{v.diagnose}</td>
                    <td style={{ color: 'var(--gray-600)', fontSize: 13 }}>{v.koerperteil || '–'}</td>
                    <td>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: SCHWER[v.schweregrad]?.bg, color: SCHWER[v.schweregrad]?.text }}>
                        {v.schweregrad}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {new Date(v.datum_verletzung).toLocaleDateString('de-DE')}
                      <div style={{ fontSize: 11, color: aktiv ? 'var(--red)' : 'var(--gray-400)' }}>{tage} Tage</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                      {v.datum_genesung ? new Date(v.datum_genesung).toLocaleDateString('de-DE') : <span style={{ color: 'var(--red)', fontWeight: 600 }}>Noch verletzt</span>}
                    </td>
                    <td>
                      {aktiv && (
                        <button onClick={() => heilen(v.id, v.spieler?.id)} className="btn btn-sm" style={{ background: '#e2efda', color: '#2d6b3a', border: 'none' }}>
                          ✓ Genesen
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
