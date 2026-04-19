import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const KATEGORIEN = ['farbe','font','logo','vorlage','sonstiges']
const KAT_LABEL = { farbe:'🎨 Farben', font:'✏️ Fonts', logo:'🏷️ Logos', vorlage:'📄 Vorlagen', sonstiges:'📎 Sonstiges' }

export default function MediaCI() {
  const { profile } = useAuth()
  const [elemente, setElemente] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [aktiveKat, setAktiveKat] = useState('alle')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const [form, setForm] = useState({ kategorie: 'farbe', name: '', wert: '', beschreibung: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('media_ci_elemente').select('*').order('kategorie').order('name')
    setElemente(data || [])
    setLoading(false)
  }

  async function speichern() {
    if (!form.name.trim()) return
    await supabase.from('media_ci_elemente').insert({ ...form, hochgeladen_von: profile.id })
    setForm({ kategorie: 'farbe', name: '', wert: '', beschreibung: '' })
    setShowForm(false)
    load()
  }

  async function handleFileUpload(e, kat) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const pfad = `${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('media-ci').upload(pfad, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('media-ci').getPublicUrl(pfad)
      await supabase.from('media_ci_elemente').insert({
        kategorie: kat || 'logo',
        name: file.name.replace(/\.[^.]+$/, ''),
        datei_url: publicUrl,
        datei_name: file.name,
        hochgeladen_von: profile.id,
      })
      load()
    }
    setUploading(false)
  }

  async function loeschen(id) {
    await supabase.from('media_ci_elemente').delete().eq('id', id)
    load()
  }

  const gefiltert = aktiveKat === 'alle' ? elemente : elemente.filter(e => e.kategorie === aktiveKat)
  const grouped = KATEGORIEN.reduce((acc, k) => {
    acc[k] = gefiltert.filter(e => e.kategorie === k)
    return acc
  }, {})

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['alle', ...KATEGORIEN].map(k => (
            <button key={k} onClick={() => setAktiveKat(k)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: aktiveKat === k ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
              color: aktiveKat === k ? '#0a0a1a' : 'rgba(255,255,255,0.7)',
            }}>
              {k === 'alle' ? 'Alle' : KAT_LABEL[k]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ ...btnGhost, cursor: 'pointer' }}>
            {uploading ? 'Hochladen…' : '⬆ Datei hochladen'}
            <input type="file" style={{ display: 'none' }} onChange={e => handleFileUpload(e, aktiveKat === 'alle' ? 'logo' : aktiveKat)} />
          </label>
          <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Element</button>
        </div>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Neues CI-Element</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select value={form.kategorie} onChange={e => setForm(p=>({...p,kategorie:e.target.value}))} style={inputStyle}>
              {KATEGORIEN.map(k => <option key={k} value={k}>{KAT_LABEL[k]}</option>)}
            </select>
            <input placeholder="Name *" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} style={inputStyle} />
          </div>
          <input placeholder={form.kategorie === 'farbe' ? 'Hex-Wert (z.B. #C8A84B)' : 'Wert / URL'} value={form.wert} onChange={e => setForm(p=>({...p,wert:e.target.value}))} style={inputStyle} />
          <input placeholder="Beschreibung (optional)" value={form.beschreibung} onChange={e => setForm(p=>({...p,beschreibung:e.target.value}))} style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={speichern} style={btnPrimary}>Speichern</button>
            <button onClick={() => setShowForm(false)} style={btnGhost}>Abbrechen</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>Laden…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {KATEGORIEN.map(kat => {
            const items = grouped[kat]
            if (!items || items.length === 0) return null
            return (
              <div key={kat}>
                <h3 style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {KAT_LABEL[kat]}
                </h3>

                {/* Farben: Sonderdarstellung */}
                {kat === 'farbe' ? (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {items.map(el => (
                      <div key={el.id} style={{ textAlign: 'center', position: 'relative' }}>
                        <div style={{
                          width: 80, height: 80, borderRadius: 12,
                          background: el.wert || '#888',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          marginBottom: 6,
                        }} />
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{el.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{el.wert}</div>
                        <button onClick={() => { navigator.clipboard.writeText(el.wert || '') }}
                          title="Kopieren"
                          style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: 4, color: 'white', fontSize: 10, cursor: 'pointer', padding: '2px 4px' }}>
                          📋
                        </button>
                        <button onClick={() => loeschen(el.id)} style={{ display: 'block', margin: '4px auto 0', fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                      </div>
                    ))}
                  </div>
                ) : kat === 'logo' ? (
                  /* Logos: Grid mit Vorschau */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {items.map(el => (
                      <div key={el.id} className="card" style={{ textAlign: 'center', position: 'relative', padding: 12 }}>
                        {el.datei_url && (
                          <img src={el.datei_url} alt={el.name} style={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain', marginBottom: 8 }} />
                        )}
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{el.name}</div>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 6 }}>
                          {el.datei_url && (
                            <a href={el.datei_url} download style={{ fontSize: 10, color: 'var(--gold)', textDecoration: 'none' }}>⬇ Download</a>
                          )}
                          <button onClick={() => loeschen(el.id)} style={{ fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>× Löschen</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Rest: Listenansicht */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map(el => (
                      <div key={el.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{el.name}</div>
                          {el.beschreibung && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{el.beschreibung}</div>}
                          {el.wert && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 2 }}>{el.wert}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {el.datei_url && <a href={el.datei_url} download style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>⬇</a>}
                          <button onClick={() => loeschen(el.id)} style={{ fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>× Löschen</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {gefiltert.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 32 }}>
              Noch keine CI-Elemente. Füge Farben, Logos oder Vorlagen hinzu.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  color: 'white', fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none',
}
const btnPrimary = { padding: '8px 16px', background: 'var(--gold)', color: '#0a0a1a', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
const btnGhost = { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 13, display: 'inline-block' }
