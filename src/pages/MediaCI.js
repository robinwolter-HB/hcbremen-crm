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
    setShowForm(false); load()
  }

  async function handleFileUpload(e, kat) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    const pfad = `${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('media-ci').upload(pfad, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('media-ci').getPublicUrl(pfad)
      await supabase.from('media_ci_elemente').insert({ kategorie: kat || 'logo', name: file.name.replace(/\.[^.]+$/, ''), datei_url: publicUrl, datei_name: file.name, hochgeladen_von: profile.id })
      load()
    }
    setUploading(false)
  }

  async function loeschen(id) { await supabase.from('media_ci_elemente').delete().eq('id', id); load() }

  const gefiltert = aktiveKat === 'alle' ? elemente : elemente.filter(e => e.kategorie === aktiveKat)
  const grouped = KATEGORIEN.reduce((acc, k) => { acc[k] = gefiltert.filter(e => e.kategorie === k); return acc }, {})

  return (
    <div>
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['alle', ...KATEGORIEN].map(k => (
            <button key={k} onClick={() => setAktiveKat(k)} className={`btn btn-sm ${aktiveKat === k ? 'btn-primary' : 'btn-outline'}`}>
              {k === 'alle' ? 'Alle' : KAT_LABEL[k]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            {uploading ? 'Hochladen…' : '⬆ Datei hochladen'}
            <input type="file" style={{ display: 'none' }} onChange={e => handleFileUpload(e, aktiveKat === 'alle' ? 'logo' : aktiveKat)} />
          </label>
          <button onClick={() => setShowForm(true)} className="btn btn-gold">+ Element</button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--navy)' }}>Neues CI-Element</h3>
          <div className="form-row">
            <div className="form-group"><label>Kategorie</label>
              <select value={form.kategorie} onChange={e=>setForm(p=>({...p,kategorie:e.target.value}))}>
                {KATEGORIEN.map(k => <option key={k} value={k}>{KAT_LABEL[k]}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
          </div>
          <div className="form-group"><label>{form.kategorie === 'farbe' ? 'Hex-Wert (z.B. #C8A84B)' : 'Wert / URL'}</label><input value={form.wert} onChange={e=>setForm(p=>({...p,wert:e.target.value}))} /></div>
          <div className="form-group"><label>Beschreibung</label><input value={form.beschreibung} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={speichern} className="btn btn-primary">Speichern</button>
            <button onClick={() => setShowForm(false)} className="btn btn-outline">Abbrechen</button>
          </div>
        </div>
      )}

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {KATEGORIEN.map(kat => {
            const items = grouped[kat]; if (!items?.length) return null
            return (
              <div key={kat}>
                <h3 style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{KAT_LABEL[kat]}</h3>
                {kat === 'farbe' ? (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {items.map(el => (
                      <div key={el.id} style={{ textAlign: 'center' }}>
                        <div style={{ width: 72, height: 72, borderRadius: 12, background: el.wert || '#ccc', boxShadow: 'var(--shadow)', marginBottom: 6, cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(el.wert||'')} title="Klicken zum Kopieren" />
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{el.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--gray-400)', fontFamily: 'monospace' }}>{el.wert}</div>
                        <button onClick={() => loeschen(el.id)} style={{ fontSize: 10, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>× Löschen</button>
                      </div>
                    ))}
                  </div>
                ) : kat === 'logo' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                    {items.map(el => (
                      <div key={el.id} className="card" style={{ textAlign: 'center', padding: 16, marginBottom: 0 }}>
                        {el.datei_url && <img src={el.datei_url} alt={el.name} style={{ maxWidth: '100%', maxHeight: 70, objectFit: 'contain', marginBottom: 8 }} />}
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{el.name}</div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6 }}>
                          {el.datei_url && <a href={el.datei_url} download style={{ fontSize: 11, color: 'var(--blue)' }}>⬇ Download</a>}
                          <button onClick={() => loeschen(el.id)} style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>× Löschen</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Name</th><th>Beschreibung</th><th>Wert</th><th></th></tr></thead>
                      <tbody>
                        {items.map(el => (
                          <tr key={el.id}>
                            <td style={{ fontWeight: 500 }}>{el.name}</td>
                            <td style={{ color: 'var(--gray-600)' }}>{el.beschreibung}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{el.wert}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {el.datei_url && <a href={el.datei_url} download style={{ fontSize: 12, color: 'var(--blue)' }}>⬇</a>}
                                <button onClick={() => loeschen(el.id)} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
          {gefiltert.length === 0 && <div className="empty-state"><p>Noch keine CI-Elemente. Füge Farben, Logos oder Vorlagen hinzu.</p></div>}
        </div>
      )}
    </div>
  )
}
