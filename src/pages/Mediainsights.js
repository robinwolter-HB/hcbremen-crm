import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const PLATTFORMEN = ['instagram','linkedin','facebook','tiktok','sonstiges']
const PLATTFORM_LABEL = { instagram:'📸 Instagram', linkedin:'💼 LinkedIn', facebook:'👥 Facebook', tiktok:'🎵 TikTok', sonstiges:'🌐 Sonstiges' }
const ZEITRAUM_LABEL = { taeglich:'Täglich', woechentlich:'Wöchentlich', monatlich:'Monatlich' }

export default function MediaInsights() {
  const { profile } = useAuth()
  const [importe, setImporte] = useState([])
  const [metriken, setMetriken] = useState([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [aktivePlattform, setAktivePlattform] = useState('alle')
  const [importForm, setImportForm] = useState({
    plattform: 'instagram', zeitraum_typ: 'monatlich',
    zeitraum_von: '', zeitraum_bis: '',
  })
  const [csvVorschau, setCsvVorschau] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: imp }, { data: met }] = await Promise.all([
      supabase.from('media_insights_importe').select('*').order('importiert_am', { ascending: false }),
      supabase.from('media_insights_metriken').select('*').order('datum', { ascending: true }),
    ])
    setImporte(imp || [])
    setMetriken(met || [])
    setLoading(false)
  }

  function parseCsv(text) {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
      return headers.reduce((obj, h, i) => { obj[h] = vals[i] || ''; return obj }, {})
    })
  }

  // CSV-Spalten-Mapping (flexibel für verschiedene Export-Formate)
  function mapRow(row, plattform) {
    const get = (...keys) => {
      for (const k of keys) {
        const found = Object.keys(row).find(rk => rk.includes(k))
        if (found && row[found]) return parseInt(row[found].replace(/[^\d]/g, '')) || 0
      }
      return 0
    }
    const getDate = () => {
      const dateKey = Object.keys(row).find(k => k.includes('datum') || k.includes('date') || k.includes('tag'))
      return row[dateKey] || ''
    }
    return {
      plattform,
      datum: getDate(),
      reichweite: get('reichweite','reach','reichw'),
      impressionen: get('impression','impres'),
      interaktionen: get('interak','engag','interact'),
      neue_follower: get('neue_follower','new_follower','follower_wachstum','gained'),
      follower_gesamt: get('follower_gesamt','total_follower','follower'),
      profilbesuche: get('profilbesuche','profile_visit','besuche'),
      klicks: get('klick','click','link'),
      beitraege_anzahl: get('beiträge','beitrag','posts','content'),
    }
  }

  async function handleCsvUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    const rows = parseCsv(text)
    setCsvVorschau({ rows, raw: text, dateiname: file.name })
  }

  async function importBestaetigen() {
    if (!csvVorschau || !importForm.zeitraum_von || !importForm.zeitraum_bis) return
    setImporting(true)

    const { data: importRecord } = await supabase.from('media_insights_importe').insert({
      plattform: importForm.plattform,
      zeitraum_typ: importForm.zeitraum_typ,
      zeitraum_von: importForm.zeitraum_von,
      zeitraum_bis: importForm.zeitraum_bis,
      rohdaten: csvVorschau.rows,
      importiert_von: profile.id,
    }).select().single()

    if (importRecord) {
      const metriken = csvVorschau.rows
        .map(row => ({ ...mapRow(row, importForm.plattform), import_id: importRecord.id }))
        .filter(m => m.datum)

      if (metriken.length > 0) {
        await supabase.from('media_insights_metriken').insert(metriken)
      }
    }

    setCsvVorschau(null)
    setShowImport(false)
    setImporting(false)
    load()
  }

  // Aggregierte Daten für Anzeige
  const gefilterteMetriken = aktivePlattform === 'alle'
    ? metriken
    : metriken.filter(m => m.plattform === aktivePlattform)

  const summen = gefilterteMetriken.reduce((acc, m) => ({
    reichweite: acc.reichweite + (m.reichweite || 0),
    impressionen: acc.impressionen + (m.impressionen || 0),
    interaktionen: acc.interaktionen + (m.interaktionen || 0),
    neue_follower: acc.neue_follower + (m.neue_follower || 0),
    follower_gesamt: Math.max(acc.follower_gesamt, m.follower_gesamt || 0),
  }), { reichweite: 0, impressionen: 0, interaktionen: 0, neue_follower: 0, follower_gesamt: 0 })

  // Einfache Balken-Visualisierung (kein externes Chart-Paket nötig)
  const letzten30 = gefilterteMetriken.slice(-30)
  const maxReichweite = Math.max(...letzten30.map(m => m.reichweite || 0), 1)

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['alle', ...PLATTFORMEN].map(p => (
            <button key={p} onClick={() => setAktivePlattform(p)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 500,
              background: aktivePlattform === p ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
              color: aktivePlattform === p ? '#0a0a1a' : 'rgba(255,255,255,0.7)',
            }}>
              {p === 'alle' ? 'Alle Kanäle' : PLATTFORM_LABEL[p]}
            </button>
          ))}
        </div>
        <button onClick={() => setShowImport(true)} style={btnPrimary}>⬆ CSV importieren</button>
      </div>

      {/* Import-Formular */}
      {showImport && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>CSV-Import</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 8 }}>
            <select value={importForm.plattform} onChange={e=>setImportForm(p=>({...p,plattform:e.target.value}))} style={inputStyle}>
              {PLATTFORMEN.map(p => <option key={p} value={p}>{PLATTFORM_LABEL[p]}</option>)}
            </select>
            <select value={importForm.zeitraum_typ} onChange={e=>setImportForm(p=>({...p,zeitraum_typ:e.target.value}))} style={inputStyle}>
              <option value="taeglich">Täglich</option>
              <option value="woechentlich">Wöchentlich</option>
              <option value="monatlich">Monatlich</option>
            </select>
            <input type="date" placeholder="Von" value={importForm.zeitraum_von} onChange={e=>setImportForm(p=>({...p,zeitraum_von:e.target.value}))} style={inputStyle} />
            <input type="date" placeholder="Bis" value={importForm.zeitraum_bis} onChange={e=>setImportForm(p=>({...p,zeitraum_bis:e.target.value}))} style={inputStyle} />
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
            💡 CSV sollte Spalten enthalten wie: datum, reichweite, impressionen, interaktionen, follower_gesamt, neue_follower
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ ...btnGhost, cursor: 'pointer' }}>
              📁 CSV-Datei wählen
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
            </label>
            <button onClick={() => setShowImport(false)} style={btnGhost}>Abbrechen</button>
          </div>

          {/* CSV Vorschau */}
          {csvVorschau && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Vorschau: {csvVorschau.dateiname} ({csvVorschau.rows.length} Zeilen)
              </div>
              <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8, marginBottom: 10 }}>
                <table style={{ fontSize: 11, borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr>
                      {Object.keys(csvVorschau.rows[0] || {}).map(h => (
                        <th key={h} style={{ padding: '4px 8px', color: 'var(--gold)', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvVorschau.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} style={{ padding: '4px 8px', color: 'rgba(255,255,255,0.7)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvVorschau.rows.length > 5 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '4px 8px' }}>… und {csvVorschau.rows.length - 5} weitere Zeilen</div>}
              </div>
              <button onClick={importBestaetigen} style={btnPrimary} disabled={importing}>
                {importing ? 'Importiere…' : `✓ ${csvVorschau.rows.length} Zeilen importieren`}
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>Laden…</div>
      ) : metriken.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Noch keine Daten importiert</div>
          <div style={{ fontSize: 13 }}>Exportiere deine Insights von Instagram, LinkedIn oder Facebook als CSV und importiere sie hier.</div>
        </div>
      ) : (
        <>
          {/* KPI Kacheln */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Gesamtreichweite', wert: summen.reichweite.toLocaleString('de-DE'), icon: '👁' },
              { label: 'Impressionen', wert: summen.impressionen.toLocaleString('de-DE'), icon: '📣' },
              { label: 'Interaktionen', wert: summen.interaktionen.toLocaleString('de-DE'), icon: '❤️' },
              { label: 'Neue Follower', wert: `+${summen.neue_follower.toLocaleString('de-DE')}`, icon: '📈' },
              { label: 'Follower Gesamt', wert: summen.follower_gesamt.toLocaleString('de-DE'), icon: '👥' },
            ].map(kpi => (
              <div key={kpi.label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{kpi.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{kpi.wert}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Reichweiten-Diagramm */}
          {letzten30.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'rgba(255,255,255,0.6)' }}>
                📊 Reichweite (letzte {letzten30.length} Einträge)
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                {letzten30.map((m, i) => (
                  <div key={i} title={`${m.datum}: ${(m.reichweite||0).toLocaleString('de-DE')}`}
                    style={{
                      flex: 1, background: 'var(--gold)',
                      height: `${Math.max(4, ((m.reichweite || 0) / maxReichweite) * 80)}px`,
                      borderRadius: '2px 2px 0 0', opacity: 0.7, cursor: 'default',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => e.target.style.opacity = 1}
                    onMouseLeave={e => e.target.style.opacity = 0.7}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                <span>{letzten30[0]?.datum}</span>
                <span>{letzten30[letzten30.length - 1]?.datum}</span>
              </div>
            </div>
          )}

          {/* Import-Verlauf */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Import-Verlauf</div>
            {importe.length === 0 ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Keine Importe</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {importe.map(imp => (
                  <div key={imp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{PLATTFORM_LABEL[imp.plattform]}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>{ZEITRAUM_LABEL[imp.zeitraum_typ]}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
                        {new Date(imp.zeitraum_von).toLocaleDateString('de-DE')} – {new Date(imp.zeitraum_bis).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(imp.importiert_am).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  color: 'white', fontSize: 13, marginBottom: 0, boxSizing: 'border-box', outline: 'none',
}
const btnPrimary = { padding: '8px 16px', background: 'var(--gold)', color: '#0a0a1a', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
const btnGhost = { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 13, display: 'inline-block' }
