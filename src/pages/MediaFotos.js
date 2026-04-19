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
  const [showUpload, setShowUpload] = useState(false)
  const [kiLaeuft, setKiLaeuft] = useState(false)
  const fileRef = useRef()
  const [uploadForm, setUploadForm] = useState({ fotograf_name: '', fotograf_credit: '', aufnahme_datum: '', tags: '', personen: '', beschreibung: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('media_fotos').select('*').order('erstellt_am', { ascending: false })
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
      const { error } = await supabase.storage.from('media-fotos').upload(pfad, file)
      if (error) continue
      const { data: { publicUrl } } = supabase.storage.from('media-fotos').getPublicUrl(pfad)
      await supabase.from('media_fotos').insert({
        datei_url: publicUrl, datei_name: file.name, datei_groesse: file.size,
        fotograf_name: uploadForm.fotograf_name || null, fotograf_credit: uploadForm.fotograf_credit || null,
        aufnahme_datum: uploadForm.aufnahme_datum || null,
        tags: uploadForm.tags ? uploadForm.tags.split(',').map(t=>t.trim()).filter(Boolean) : [],
        personen: uploadForm.personen ? uploadForm.personen.split(',').map(p=>p.trim()).filter(Boolean) : [],
        beschreibung: uploadForm.beschreibung || null, hochgeladen_von: profile.id,
      })
    }
    setUploading(false); setShowUpload(false)
    setUploadForm({ fotograf_name:'', fotograf_credit:'', aufnahme_datum:'', tags:'', personen:'', beschreibung:'' })
    load()
  }

  async function kiTaggen(foto) {
    setKiLaeuft(true)
    try {
      const response = await fetch(foto.datei_url)
      const blob = await response.blob()
      const base64 = await new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result.split(',')[1]); r.readAsDataURL(blob) })
      const aiResp = await fetch('/api/claude', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: blob.type, data: base64 } },
          { type: 'text', text: 'Analysiere dieses Handballspiel-Foto und gib mir bis zu 8 Tags für Spielsituationen, Motive, Emotionen sowie erkennbare Personen. Antworte NUR mit JSON: {"ki_tags": ["tag1","tag2",...], "personen": ["person1",...]}' }
        ]}] })
      })
      const aiData = await aiResp.json()
      const text = aiData.content?.find(b => b.type === 'text')?.text || '{}'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      await supabase.from('media_fotos').update({ ki_tags: parsed.ki_tags || [], personen: [...new Set([...(foto.personen||[]), ...(parsed.personen||[])])] }).eq('id', foto.id)
      load()
      if (selected?.id === foto.id) setSelected(p => ({ ...p, ki_tags: parsed.ki_tags||[], personen: [...new Set([...(p.personen||[]), ...(parsed.personen||[])])] }))
    } catch(err) { console.error(err) }
    setKiLaeuft(false)
  }

  async function tagSpeichern() {
    if (!selected) return
    await supabase.from('media_fotos').update({ tags: selected.tags, personen: selected.personen, beschreibung: selected.beschreibung, fotograf_name: selected.fotograf_name, fotograf_credit: selected.fotograf_credit }).eq('id', selected.id)
    load()
  }

  async function loeschen(id) {
    if (!window.confirm('Foto wirklich löschen?')) return
    await supabase.from('media_fotos').delete().eq('id', id)
    setSelected(null); load()
  }

  const gefiltert = fotos.filter(f => {
    const s = suche.toLowerCase()
    return !s || f.datei_name?.toLowerCase().includes(s) || f.fotograf_name?.toLowerCase().includes(s) || (f.tags||[]).some(t=>t.toLowerCase().includes(s)) || (f.personen||[]).some(p=>p.toLowerCase().includes(s)) || (f.ki_tags||[]).some(t=>t.toLowerCase().includes(s))
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 20, alignItems: 'flex-start' }}>
      <div>
        <div className="toolbar">
          <div className="search-wrap"><span className="search-icon">🔍</span><input placeholder="Suche nach Name, Tag, Person…" value={suche} onChange={e=>setSuche(e.target.value)} /></div>
          <button onClick={() => setShowUpload(true)} className="btn btn-gold">+ Fotos hochladen</button>
        </div>

        {showUpload && (
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--navy)' }}>Fotos hochladen</h3>
            <div className="form-row">
              <div className="form-group"><label>Fotograf</label><input value={uploadForm.fotograf_name} onChange={e=>setUploadForm(p=>({...p,fotograf_name:e.target.value}))} /></div>
              <div className="form-group"><label>Credit</label><input placeholder="© Max Mustermann" value={uploadForm.fotograf_credit} onChange={e=>setUploadForm(p=>({...p,fotograf_credit:e.target.value}))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Aufnahmedatum</label><input type="date" value={uploadForm.aufnahme_datum} onChange={e=>setUploadForm(p=>({...p,aufnahme_datum:e.target.value}))} /></div>
              <div className="form-group"><label>Tags (kommagetrennt)</label><input value={uploadForm.tags} onChange={e=>setUploadForm(p=>({...p,tags:e.target.value}))} /></div>
            </div>
            <div className="form-group"><label>Personen (kommagetrennt)</label><input value={uploadForm.personen} onChange={e=>setUploadForm(p=>({...p,personen:e.target.value}))} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} className="btn btn-primary" disabled={uploading}>{uploading ? 'Hochladen…' : '📁 Dateien wählen'}</button>
              <button onClick={() => setShowUpload(false)} className="btn btn-outline">Abbrechen</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
          </div>
        )}

        {loading ? <div className="loading-center"><div className="spinner" /></div> : gefiltert.length === 0 ? (
          <div className="empty-state"><p>Keine Fotos gefunden.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {gefiltert.map(f => (
              <div key={f.id} onClick={() => setSelected(f)} style={{ borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer', border: selected?.id === f.id ? '2px solid var(--navy)' : '2px solid var(--gray-200)', background: 'var(--white)', boxShadow: 'var(--shadow)' }}>
                <img src={f.datei_url} alt={f.datei_name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '8px 10px' }}>
                  {f.fotograf_credit && <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{f.fotograf_credit}</div>}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {[...(f.tags||[]), ...(f.ki_tags||[])].slice(0,3).map(t => (
                      <span key={t} style={{ fontSize: 9, padding: '1px 5px', background: '#fff3cd', color: '#8a6a00', borderRadius: 10 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="card" style={{ position: 'sticky', top: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--gray-600)', wordBreak: 'break-all' }}>{selected.datei_name}</span>
            <button onClick={() => setSelected(null)} className="close-btn">×</button>
          </div>
          <img src={selected.datei_url} alt={selected.datei_name} style={{ width: '100%', borderRadius: 'var(--radius)', marginBottom: 12, objectFit: 'cover', maxHeight: 200 }} />
          <div className="form-group"><label>Fotograf</label><input value={selected.fotograf_name||''} onChange={e=>setSelected(p=>({...p,fotograf_name:e.target.value}))} /></div>
          <div className="form-group"><label>Credit</label><input value={selected.fotograf_credit||''} onChange={e=>setSelected(p=>({...p,fotograf_credit:e.target.value}))} /></div>
          <div className="form-group"><label>Tags (kommagetrennt)</label><input value={(selected.tags||[]).join(', ')} onChange={e=>setSelected(p=>({...p,tags:e.target.value.split(',').map(t=>t.trim()).filter(Boolean)}))} /></div>
          <div className="form-group"><label>Personen (kommagetrennt)</label><input value={(selected.personen||[]).join(', ')} onChange={e=>setSelected(p=>({...p,personen:e.target.value.split(',').map(t=>t.trim()).filter(Boolean)}))} /></div>
          {(selected.ki_tags||[]).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>🤖 KI-Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selected.ki_tags.map(t => <span key={t} className="badge badge-eingeladen">{t}</span>)}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={tagSpeichern} className="btn btn-primary btn-sm">Speichern</button>
            <button onClick={() => kiTaggen(selected)} className="btn btn-outline btn-sm" disabled={kiLaeuft}>{kiLaeuft ? '🤖 Analysiere…' : '🤖 KI-Analyse'}</button>
            <button onClick={() => loeschen(selected.id)} className="btn btn-danger btn-sm">Löschen</button>
          </div>
        </div>
      )}
    </div>
  )
}
