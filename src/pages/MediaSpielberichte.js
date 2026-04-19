import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STATUS = {
  entwurf:        { bg: 'var(--gray-100)', text: 'var(--gray-600)', label: 'Entwurf' },
  zur_freigabe:   { bg: '#fff3cd', text: '#8a6a00', label: 'Zur Freigabe' },
  freigegeben:    { bg: '#e2efda', text: '#2d6b3a', label: 'Freigegeben' },
  veroeffentlicht:{ bg: '#ddeaff', text: '#1a4a8a', label: 'Veröffentlicht' },
}

export default function MediaSpielberichte() {
  const { profile } = useAuth()
  const isAdmin = profile?.rolle === 'admin'
  const [berichte, setBerichte] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [kiLaeuft, setKiLaeuft] = useState(false)
  const [captionLaeuft, setCaptionLaeuft] = useState(false)
  const [kopiert, setKopiert] = useState('')
  const [form, setForm] = useState({ titel: '', gastteam: '', heimtore: '', gasttore: '', datum: '', ort: '', rohnotizen: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('media_spielberichte').select('*, ersteller:erstellt_von(name)').order('erstellt_am', { ascending: false })
    setBerichte(data || [])
    setLoading(false)
  }

  async function speichern() {
    if (!form.titel.trim() || !form.gastteam.trim()) return
    const { data } = await supabase.from('media_spielberichte').insert({ ...form, heimtore: form.heimtore !== '' ? parseInt(form.heimtore) : null, gasttore: form.gasttore !== '' ? parseInt(form.gasttore) : null, datum: form.datum || null, erstellt_von: profile.id, status: 'entwurf' }).select().single()
    setForm({ titel: '', gastteam: '', heimtore: '', gasttore: '', datum: '', ort: '', rohnotizen: '' })
    setShowForm(false); await load(); if (data) setSelected(data)
  }

  async function kiGenerieren(typ) {
    if (!selected) return
    if (typ === 'bericht') setKiLaeuft(true); else setCaptionLaeuft(true)
    try {
      let prompt
      if (typ === 'bericht') {
        prompt = `Du bist Pressesprecher des HC Bremen (Handball). Schreibe einen professionellen Spielbericht auf Deutsch.\n\nDaten:\n- HC Bremen ${selected.heimtore ?? '?'} : ${selected.gasttore ?? '?'} ${selected.gastteam}\n- Datum: ${selected.datum ? new Date(selected.datum).toLocaleDateString('de-DE') : 'unbekannt'}\n- Ort: ${selected.ort || 'unbekannt'}\n- Notizen: ${selected.rohnotizen || '(keine)'}\n\nCa. 200-300 Wörter, ohne Überschrift.`
      } else {
        prompt = `Du bist Social Media Manager beim HC Bremen. Erstelle drei Captions auf Deutsch basierend auf diesem Spielbericht:\n\n${selected.bericht_text}\n\nAntworte NUR mit JSON (kein Markdown):\n{"instagram": "...", "linkedin": "...", "facebook": "..."}`
      }
      const resp = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }) })
      const data = await resp.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      if (typ === 'bericht') {
        await supabase.from('media_spielberichte').update({ bericht_text: text }).eq('id', selected.id)
        setSelected(p => ({ ...p, bericht_text: text }))
      } else {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
        await supabase.from('media_spielberichte').update({ caption_instagram: parsed.instagram||'', caption_linkedin: parsed.linkedin||'', caption_facebook: parsed.facebook||'' }).eq('id', selected.id)
        setSelected(p => ({ ...p, caption_instagram: parsed.instagram||'', caption_linkedin: parsed.linkedin||'', caption_facebook: parsed.facebook||'' }))
      }
    } catch(err) { console.error(err) }
    if (typ === 'bericht') setKiLaeuft(false); else setCaptionLaeuft(false)
  }

  async function statusAendern(id, status) {
    const update = { status }; if (status === 'freigegeben') update.freigegeben_von = profile.id
    await supabase.from('media_spielberichte').update(update).eq('id', id)
    load(); if (selected?.id === id) setSelected(p => ({ ...p, ...update }))
  }

  async function feldSpeichern(feld, wert) {
    await supabase.from('media_spielberichte').update({ [feld]: wert }).eq('id', selected.id)
  }

  function kopieren(text, key) { navigator.clipboard.writeText(text); setKopiert(key); setTimeout(() => setKopiert(''), 2000) }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap: 20, alignItems: 'flex-start' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--navy)' }}>Spielberichte</h3>
          <button onClick={() => setShowForm(true)} className="btn btn-gold btn-sm">+ Neu</button>
        </div>

        {showForm && (
          <div className="card">
            <div className="form-group"><label>Titel *</label><input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} placeholder="z.B. Heimsieg gegen Kiel" /></div>
            <div className="form-group"><label>Gastteam *</label><input value={form.gastteam} onChange={e=>setForm(p=>({...p,gastteam:e.target.value}))} /></div>
            <div className="form-row">
              <div className="form-group"><label>HC Bremen Tore</label><input type="number" value={form.heimtore} onChange={e=>setForm(p=>({...p,heimtore:e.target.value}))} /></div>
              <div className="form-group"><label>Gast Tore</label><input type="number" value={form.gasttore} onChange={e=>setForm(p=>({...p,gasttore:e.target.value}))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Datum</label><input type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))} /></div>
              <div className="form-group"><label>Ort / Halle</label><input value={form.ort} onChange={e=>setForm(p=>({...p,ort:e.target.value}))} /></div>
            </div>
            <div className="form-group"><label>Notizen</label><textarea value={form.rohnotizen} onChange={e=>setForm(p=>({...p,rohnotizen:e.target.value}))} rows={3} placeholder="Torschützen, Highlights…" /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={speichern} className="btn btn-primary">Erstellen</button>
              <button onClick={() => setShowForm(false)} className="btn btn-outline">Abbrechen</button>
            </div>
          </div>
        )}

        {loading ? <div className="loading-center"><div className="spinner" /></div> : berichte.length === 0 ? (
          <div className="empty-state"><p>Noch keine Berichte.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {berichte.map(b => (
              <div key={b.id} onClick={() => setSelected(b)} className="card" style={{ cursor: 'pointer', padding: 14, marginBottom: 0, border: selected?.id === b.id ? '2px solid var(--navy)' : '2px solid transparent' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{b.titel}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 6 }}>HC Bremen {b.heimtore??'?'} : {b.gasttore??'?'} {b.gastteam}{b.datum && ` · ${new Date(b.datum).toLocaleDateString('de-DE')}`}</div>
                <span className="badge" style={{ background: STATUS[b.status]?.bg, color: STATUS[b.status]?.text }}>{STATUS[b.status]?.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h2 style={{ fontSize: 18, color: 'var(--navy)', margin: 0 }}>{selected.titel}</h2>
                <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 4 }}>HC Bremen {selected.heimtore??'?'} : {selected.gasttore??'?'} {selected.gastteam}{selected.datum && ` · ${new Date(selected.datum).toLocaleDateString('de-DE')}`}{selected.ort && ` · ${selected.ort}`}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="badge" style={{ background: STATUS[selected.status]?.bg, color: STATUS[selected.status]?.text }}>{STATUS[selected.status]?.label}</span>
                {selected.status === 'entwurf' && <button onClick={() => statusAendern(selected.id,'zur_freigabe')} className="btn btn-sm btn-outline">Zur Freigabe</button>}
                {selected.status === 'zur_freigabe' && isAdmin && <button onClick={() => statusAendern(selected.id,'freigegeben')} className="btn btn-sm" style={{ background: '#e2efda', color: '#2d6b3a', border: 'none' }}>✓ Freigeben</button>}
                {selected.status === 'freigegeben' && <button onClick={() => statusAendern(selected.id,'veroeffentlicht')} className="btn btn-sm btn-outline">📤 Veröffentlicht</button>}
                <button onClick={() => setSelected(null)} className="close-btn">×</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="form-group"><label>Rohnotizen</label><textarea value={selected.rohnotizen||''} onChange={e=>setSelected(p=>({...p,rohnotizen:e.target.value}))} onBlur={e=>feldSpeichern('rohnotizen',e.target.value)} rows={3} placeholder="Torschützen, Schlüsselmomente…" /></div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Spielbericht</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {selected.bericht_text && <button onClick={() => kopieren(selected.bericht_text,'bericht')} className="btn btn-sm btn-outline">{kopiert==='bericht'?'✓ Kopiert':'📋 Kopieren'}</button>}
                <button onClick={() => kiGenerieren('bericht')} className="btn btn-sm btn-outline" disabled={kiLaeuft}>{kiLaeuft?'🤖 Generiere…':'🤖 KI-Bericht'}</button>
              </div>
            </div>
            <textarea value={selected.bericht_text||''} onChange={e=>setSelected(p=>({...p,bericht_text:e.target.value}))} onBlur={e=>feldSpeichern('bericht_text',e.target.value)} rows={10} placeholder="Spielbericht wird hier erscheinen…" style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontFamily:'inherit', fontSize:14, lineHeight:1.6, resize:'vertical' }} />
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Social Media Captions</label>
              <button onClick={() => kiGenerieren('captions')} className="btn btn-sm btn-outline" disabled={captionLaeuft || !selected.bericht_text} title={!selected.bericht_text?'Erst Spielbericht generieren':''}>{captionLaeuft?'🤖 Generiere…':'🤖 Captions generieren'}</button>
            </div>
            {['instagram','linkedin','facebook'].map(pl => (
              <div key={pl} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>{pl==='instagram'?'📸 Instagram':pl==='linkedin'?'💼 LinkedIn':'👥 Facebook'}</label>
                  {selected[`caption_${pl}`] && <button onClick={() => kopieren(selected[`caption_${pl}`],pl)} className="btn btn-sm btn-outline">{kopiert===pl?'✓ Kopiert':'📋'}</button>}
                </div>
                <textarea value={selected[`caption_${pl}`]||''} onChange={e=>setSelected(p=>({...p,[`caption_${pl}`]:e.target.value}))} onBlur={e=>feldSpeichern(`caption_${pl}`,e.target.value)} rows={4} placeholder={`${pl.charAt(0).toUpperCase()+pl.slice(1)} Caption…`} style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontFamily:'inherit', fontSize:13, resize:'vertical' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
