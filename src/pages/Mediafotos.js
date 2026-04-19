import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function MediaFotos() {
  const { profile } = useAuth()
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [suche, setSuche] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [kiLaeuft, setKiLaeuft] = useState(false)
  const fileRef = useRef()

  const [uploadForm, setUploadForm] = useState({
    fotograf_name: '',
    fotograf_credit: '',
    aufnahme_datum: '',
    tags: '',
    personen: '',
    beschreibung: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('media_fotos')
      .select('*, hochgeladen_von_profil:hochgeladen_von(name)')
      .order('erstellt_am', { ascending: false })
    setFotos(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const pfad = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('media-fotos')
        .upload(pfad, file, { cacheControl: '3600', upsert: false })

      if (storageErr) { console.error(storageErr); continue }

      const { data: { publicUrl } } = supabase.storage.from('media-fotos').getPublicUrl(pfad)

      await supabase.from('media_fotos').insert({
        datei_url: publicUrl,
        datei_name: file.name,
        datei_groesse: file.size,
        fotograf_name: uploadForm.fotograf_name || null,
        fotograf_credit: uploadForm.fotograf_credit || null,
        aufnahme_datum: uploadForm.aufnahme_datum || null,
        tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        personen: uploadForm.personen ? uploadForm.personen.split(',').map(p => p.trim()).filter(Boolean) : [],
        beschreibung: uploadForm.beschreibung || null,
        hochgeladen_von: profile.id,
      })
    }

    setUploading(false)
    setShowUpload(false)
    setUploadForm({ fotograf_name: '', fotograf_credit: '', aufnahme_datum: '', tags: '', personen: '', beschreibung: '' })
    load()
  }

  async function kiTaggen(foto) {
    setKiLaeuft(true)
    try {
      // Bild als base64 laden
      const response = await fetch(foto.datei_url)
      const blob = await response.blob()
      const base64 = await new Promise(res => {
        const reader = new FileReader()
        reader.onloadend = () => res(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
      })

      const aiResp = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: blob.type, data: base64 }
              },
              {
                type: 'text',
                text: `Analysiere dieses Handballspiel-Foto vom HC Bremen und gib mir:
1. Bis zu 8 Tags für Spielsituationen, Motive, Emotionen (z.B. "Tor", "Abwehr", "Jubel", "Fans", "Aufwärmen")
2. Erkennbare Personen wenn möglich (Spieler, Schiedsrichter, Trainer) - nur wenn eindeutig erkennbar
Antworte NUR mit JSON: {"ki_tags": ["tag1","tag2",...], "personen": ["person1",...]}`
              }
            ]
          }]
        })
      })

      const aiData = await aiResp.json()
      const text = aiData.content?.find(b => b.type === 'text')?.text || '{}'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

      await supabase.from('media_fotos').update({
        ki_tags: parsed.ki_tags || [],
        personen: [...new Set([...(foto.personen || []), ...(parsed.personen || [])])]
      }).eq('id', foto.id)

      load()
      if (selected?.id === foto.id) {
        setSelected(prev => ({
          ...prev,
          ki_tags: parsed.ki_tags || [],
          personen: [...new Set([...(prev.personen || []), ...(parsed.personen || [])])]
        }))
      }
    } catch (err) {
      console.error('KI-Tagging fehlgeschlagen:', err)
    }
    setKiLaeuft(false)
  }

  async function tagSpeichern() {
    if (!selected) return
    await supabase.from('media_fotos').update({
      tags: selected.tags,
      personen: selected.personen,
      beschreibung: selected.beschreibung,
      fotograf_name: selected.fotograf_name,
      fotograf_credit: selected.fotograf_credit,
    }).eq('id', selected.id)
    load()
  }

  async function loeschen(id) {
    if (!window.confirm('Foto wirklich löschen?')) return
    await supabase.from('media_fotos').delete().eq('id', id)
    setSelected(null)
    load()
  }

  const gefiltert = fotos.filter(f => {
    const s = suche.toLowerCase()
    const matchSuche = !s ||
      f.datei_name?.toLowerCase().includes(s) ||
      f.fotograf_name?.toLowerCase().includes(s) ||
      f.beschreibung?.toLowerCase().includes(s) ||
      (f.tags || []).some(t => t.toLowerCase().includes(s)) ||
      (f.personen || []).some(p => p.toLowerCase().includes(s)) ||
      (f.ki_tags || []).some(t => t.toLowerCase().includes(s))
    const matchTag = !tagFilter || [...(f.tags||[]), ...(f.ki_tags||[])].includes(tagFilter)
    return matchSuche && matchTag
  })

  // Alle vorhandenen Tags sammeln
  const alleTags = [...new Set(fotos.flatMap(f => [...(f.tags||[]), ...(f.ki_tags||[])]))]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: 16 }}>
      {/* Linke Seite */}
      <div>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="🔍 Suche nach Name, Tag, Person…"
            value={suche}
            onChange={e => setSuche(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 200, margin: 0 }}
          />
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ ...inputStyle, margin: 0, width: 'auto' }}>
            <option value="">Alle Tags</option>
            {alleTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => setShowUpload(true)} style={btnPrimary}>+ Fotos hochladen</button>
        </div>

        {/* Upload Formular */}
        {showUpload && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Fotos hochladen</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input placeholder="Fotograf Name" value={uploadForm.fotograf_name} onChange={e => setUploadForm(p=>({...p,fotograf_name:e.target.value}))} style={inputStyle} />
              <input placeholder="Credit (z.B. © Max Mustermann)" value={uploadForm.fotograf_credit} onChange={e => setUploadForm(p=>({...p,fotograf_credit:e.target.value}))} style={inputStyle} />
              <input type="date" value={uploadForm.aufnahme_datum} onChange={e => setUploadForm(p=>({...p,aufnahme_datum:e.target.value}))} style={inputStyle} />
              <input placeholder="Tags (kommagetrennt)" value={uploadForm.tags} onChange={e => setUploadForm(p=>({...p,tags:e.target.value}))} style={inputStyle} />
            </div>
            <input placeholder="Personen (kommagetrennt)" value={uploadForm.personen} onChange={e => setUploadForm(p=>({...p,personen:e.target.value}))} style={inputStyle} />
            <input placeholder="Beschreibung" value={uploadForm.beschreibung} onChange={e => setUploadForm(p=>({...p,beschreibung:e.target.value}))} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => fileRef.current?.click()} style={btnPrimary} disabled={uploading}>
                {uploading ? 'Wird hochgeladen…' : '📁 Dateien wählen'}
              </button>
              <button onClick={() => setShowUpload(false)} style={btnGhost}>Abbrechen</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
          </div>
        )}

        {/* Foto Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>Laden…</div>
        ) : gefiltert.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 32 }}>
            Keine Fotos gefunden.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {gefiltert.map(f => (
              <div key={f.id} onClick={() => setSelected(f)}
                style={{
                  borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                  border: selected?.id === f.id ? '2px solid var(--gold)' : '2px solid transparent',
                  position: 'relative', background: 'rgba(255,255,255,0.04)',
                  transition: 'border 0.15s',
                }}>
                <img src={f.datei_url} alt={f.datei_name}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '6px 8px' }}>
                  {f.fotograf_credit && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{f.fotograf_credit}</div>
                  )}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {[...(f.tags||[]), ...(f.ki_tags||[])].slice(0, 3).map(t => (
                      <span key={t} style={{ fontSize: 9, padding: '1px 5px', background: 'rgba(200,168,75,0.15)', color: 'var(--gold)', borderRadius: 10 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rechte Seite: Detail */}
      {selected && (
        <div className="card" style={{ position: 'sticky', top: 80, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', wordBreak: 'break-all' }}>{selected.datei_name}</span>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          <img src={selected.datei_url} alt={selected.datei_name}
            style={{ width: '100%', borderRadius: 8, marginBottom: 12, objectFit: 'cover', maxHeight: 240 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Fotograf" value={selected.fotograf_name || ''} onChange={e => setSelected(p=>({...p,fotograf_name:e.target.value}))} style={inputStyle} />
            <input placeholder="Credit" value={selected.fotograf_credit || ''} onChange={e => setSelected(p=>({...p,fotograf_credit:e.target.value}))} style={inputStyle} />
            <input placeholder="Beschreibung" value={selected.beschreibung || ''} onChange={e => setSelected(p=>({...p,beschreibung:e.target.value}))} style={inputStyle} />
            <input
              placeholder="Tags (kommagetrennt)"
              value={(selected.tags||[]).join(', ')}
              onChange={e => setSelected(p=>({...p, tags: e.target.value.split(',').map(t=>t.trim()).filter(Boolean)}))}
              style={inputStyle}
            />
            <input
              placeholder="Personen (kommagetrennt)"
              value={(selected.personen||[]).join(', ')}
              onChange={e => setSelected(p=>({...p, personen: e.target.value.split(',').map(t=>t.trim()).filter(Boolean)}))}
              style={inputStyle}
            />
            {(selected.ki_tags||[]).length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>🤖 KI-Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selected.ki_tags.map(t => (
                    <span key={t} style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderRadius: 10 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={tagSpeichern} style={btnPrimary}>Speichern</button>
            <button onClick={() => kiTaggen(selected)} style={{ ...btnGhost, color: '#60a5fa' }} disabled={kiLaeuft}>
              {kiLaeuft ? '🤖 Analysiere…' : '🤖 KI-Analyse'}
            </button>
            <button onClick={() => loeschen(selected.id)} style={{ ...btnGhost, color: '#f87171' }}>Löschen</button>
          </div>

          {selected.datei_groesse && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
              {(selected.datei_groesse / 1024 / 1024).toFixed(1)} MB
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
  color: 'white', fontSize: 13, marginBottom: 4, boxSizing: 'border-box', outline: 'none',
}
const btnPrimary = { padding: '8px 16px', background: 'var(--gold)', color: '#0a0a1a', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
const btnGhost = { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 13 }
