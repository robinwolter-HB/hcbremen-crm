import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function MeineAufgaben() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [aufgaben, setAufgaben] = useState([])
  const [alle, setAlle] = useState([])
  const [filter, setFilter] = useState('offen')
  const [personFilter, setPersonFilter] = useState('')
  const [nutzer, setNutzer] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: h }, { data: n }] = await Promise.all([
      supabase.from('kontakthistorie').select('*,kontakte(id,firma,logo_url)').order('faellig_am', { ascending: true, nullsFirst: false }),
      supabase.from('profile').select('name,email').order('name')
    ])
    setAlle(h || [])
    setNutzer(n || [])
    setLoading(false)
  }

  async function toggleErledigt(h) {
    await supabase.from('kontakthistorie').update({ erledigt: !h.erledigt }).eq('id', h.id)
    load()
  }

  const meinName = profile?.name || profile?.email || ''

  const filtered = alle.filter(h => {
    const person = personFilter || meinName
    const istZustaendig = (h.zustaendig_personen || []).includes(person) || h.zustaendig === person || (!person && true)
    const matchFilter = filter === 'alle' ? true : filter === 'offen' ? !h.erledigt : h.erledigt
    return istZustaendig && matchFilter
  })

  const ueberfaellig = filtered.filter(h => h.faellig_am && !h.erledigt && new Date(h.faellig_am) < new Date())
  const heute = filtered.filter(h => {
    if (!h.faellig_am || h.erledigt) return false
    const d = new Date(h.faellig_am)
    const t = new Date()
    return d.toDateString() === t.toDateString()
  })
  const spaeter = filtered.filter(h => {
    if (!h.faellig_am || h.erledigt) return false
    return new Date(h.faellig_am) > new Date() && new Date(h.faellig_am).toDateString() !== new Date().toDateString()
  })
  const keinDatum = filtered.filter(h => !h.faellig_am && !h.erledigt)
  const erledigt = filtered.filter(h => h.erledigt)

  function AufgabenTabelle({ items, title, color }) {
    if (items.length === 0) return null
    return (
      <div className="card" style={{borderLeft:`4px solid ${color}`,paddingLeft:24}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <div style={{width:10,height:10,borderRadius:'50%',background:color,flexShrink:0}}></div>
          <div className="section-title" style={{margin:0}}>{title} ({items.length})</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Firma</th><th>Aktion</th><th>Betreff</th><th>Faellig</th><th>Zustaendig</th><th>Done</th></tr></thead>
            <tbody>
              {items.map(h => (
                <tr key={h.id} onClick={() => navigate('/kontakte/'+h.kontakt_id)} style={{cursor:'pointer',opacity:h.erledigt?0.55:1}}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      {h.kontakte?.logo_url
                        ? <img src={h.kontakte.logo_url} alt="" style={{width:24,height:24,objectFit:'contain',borderRadius:4}}/>
                        : <div style={{width:24,height:24,background:'var(--gray-100)',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'var(--gray-400)',flexShrink:0}}>{h.kontakte?.firma?.[0]}</div>
                      }
                      <strong style={{fontSize:13}}>{h.kontakte?.firma}</strong>
                    </div>
                  </td>
                  <td style={{fontSize:13}}>{h.naechste_aktion}</td>
                  <td style={{fontSize:13,color:'var(--gray-600)'}}>{h.betreff}</td>
                  <td style={{fontSize:13,color:color==='var(--red)'?'var(--red)':'inherit',fontWeight:color==='var(--red)'?600:400}}>
                    {h.faellig_am ? new Date(h.faellig_am).toLocaleDateString('de-DE') : '--'}
                  </td>
                  <td style={{fontSize:12,color:'var(--gray-600)'}}>{(h.zustaendig_personen||[]).join(', ')||h.zustaendig||'--'}</td>
                  <td onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>toggleErledigt(h)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18}}>{h.erledigt?'✅':'⬜'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Meine Aufgaben</div>
      <p className="page-subtitle">Offene ToDos und Aktionen</p>

      <div className="toolbar">
        <select value={personFilter} onChange={e=>setPersonFilter(e.target.value)}>
          <option value={meinName}>Meine Aufgaben ({meinName})</option>
          <option value="">Alle Personen</option>
          {nutzer.filter(n=>(n.name||n.email)!==meinName).map(n=>(
            <option key={n.email} value={n.name||n.email}>{n.name||n.email}</option>
          ))}
        </select>
        <select value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="offen">Offen</option>
          <option value="alle">Alle</option>
          <option value="erledigt">Erledigt</option>
        </select>
        <div style={{marginLeft:'auto',display:'flex',gap:12,alignItems:'center'}}>
          <span style={{fontSize:13,color:'var(--gray-600)'}}>{filtered.length} Aufgaben</span>
        </div>
      </div>

      {filter !== 'erledigt' && (
        <>
          <AufgabenTabelle items={ueberfaellig} title="Ueberfaellig" color="var(--red)" />
          <AufgabenTabelle items={heute} title="Heute faellig" color="var(--orange)" />
          <AufgabenTabelle items={spaeter} title="Demnachst" color="var(--blue)" />
          <AufgabenTabelle items={keinDatum} title="Kein Datum" color="var(--gray-400)" />
          {ueberfaellig.length===0&&heute.length===0&&spaeter.length===0&&keinDatum.length===0&&(
            <div className="empty-state card"><p>Keine offenen Aufgaben. Alles erledigt!</p></div>
          )}
        </>
      )}
      {filter === 'erledigt' && <AufgabenTabelle items={erledigt} title="Erledigt" color="var(--green)" />}
      {filter === 'alle' && (
        <>
          <AufgabenTabelle items={ueberfaellig} title="Ueberfaellig" color="var(--red)" />
          <AufgabenTabelle items={heute} title="Heute faellig" color="var(--orange)" />
          <AufgabenTabelle items={spaeter} title="Demnachst" color="var(--blue)" />
          <AufgabenTabelle items={keinDatum} title="Kein Datum" color="var(--gray-400)" />
          <AufgabenTabelle items={erledigt} title="Erledigt" color="var(--green)" />
        </>
      )}
    </main>
  )
}
