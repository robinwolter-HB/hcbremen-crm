import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Historie() {
  const [items, setItems] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [erledigtF, setErledigtF] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])
  useEffect(() => {
    let r = items
    if (search) { const q = search.toLowerCase(); r = r.filter(h => h.kontakte?.firma?.toLowerCase().includes(q) || h.naechste_aktion?.toLowerCase().includes(q) || h.betreff?.toLowerCase().includes(q)) }
    if (erledigtF !== '') r = r.filter(h => h.erledigt === (erledigtF === 'true'))
    setFiltered(r)
  }, [items, search, erledigtF])

  async function load() {
    const { data } = await supabase.from('kontakthistorie').select('*,kontakte(id,firma)').order('erstellt_am', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function toggleErledigt(h) {
    await supabase.from('kontakthistorie').update({ erledigt: !h.erledigt }).eq('id', h.id)
    load()
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <main className="main">
      <div className="page-title">Kontakthistorie</div>
      <p className="page-subtitle">Alle Gespräche, Meetings und Aktionen</p>
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input placeholder="Firma oder Aktion suchen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={erledigtF} onChange={e => setErledigtF(e.target.value)}>
          <option value="">Alle</option>
          <option value="false">Offen</option>
          <option value="true">Erledigt</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Datum</th><th>Firma</th><th>Art</th><th>Betreff</th><th>Nächste Aktion</th><th>Fällig</th><th>Zuständig</th><th>✓</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan="8"><div className="empty-state"><p>Keine Einträge.</p></div></td></tr>
              : filtered.map(h => (
                <tr key={h.id} style={{opacity:h.erledigt?0.55:1, cursor:'pointer'}} onClick={() => h.kontakte?.id && navigate('/kontakte/'+h.kontakte.id)}>
                  <td style={{whiteSpace:'nowrap',fontSize:13}}>{new Date(h.erstellt_am).toLocaleDateString('de-DE')}</td>
                  <td><strong>{h.kontakte?.firma}</strong></td>
                  <td><span style={{fontSize:12,background:'var(--gray-100)',padding:'2px 8px',borderRadius:20}}>{h.art}</span></td>
                  <td style={{fontSize:13}}>{h.betreff}</td>
                  <td style={{fontSize:13}}>{h.naechste_aktion}</td>
                  <td style={{fontSize:13,color:h.faellig_am&&!h.erledigt&&new Date(h.faellig_am)<new Date()?'var(--red)':'inherit'}}>
                    {h.faellig_am?new Date(h.faellig_am).toLocaleDateString('de-DE'):'—'}
                  </td>
                  <td style={{fontSize:12,color:'var(--gray-600)'}}>{(h.zustaendig_personen||[]).join(', ')||h.zustaendig||'—'}</td>
                  <td onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>toggleErledigt(h)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16}}>{h.erledigt?'✅':'⬜'}</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </main>
  )
}
