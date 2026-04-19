import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STATUS_FARBEN = {
  entwurf:       { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.5)', label: 'Entwurf' },
  zur_freigabe:  { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24',              label: 'Zur Freigabe' },
  freigegeben:   { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80',              label: 'Freigegeben' },
  veroeffentlicht:{ bg: 'rgba(59,130,246,0.15)', text: '#60a5fa',             label: 'Veröffentlicht' },
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

  const [form, setForm] = useState({
    titel: '', gastteam: '', heimtore: '', gasttore: '',
    datum: '', ort: '', rohnotizen: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('media_spielberichte')
      .select('*, ersteller:erstellt_von(name), freigebender:freigegeben_von(name)')
      .order('erstellt_am', { ascending: false })
    setBerichte(data || [])
    setLoading(false)
  }

  async function speichern() {
    if (!form.titel.trim() || !form.gastteam.trim()) return
    const payload = {
      ...form,
      heimtore: form.heimtore !== '' ? parseInt(form.heimtore) : null,
      gasttore: form.gasttore !== '' ? parseInt(form.gasttore) : null,
      datum: form.datum || null,
      erstellt_von: profile.id,
      status: 'entwurf',
    }
    const { data } = await supabase.from('media_spielberichte').insert(payload).select().single()
    setForm({ titel: '', gastteam: '', heimtore: '', gasttore: '', datum: '', ort: '', rohnotizen: '' })
    setShowForm(false)
    await load()
    if (data) setSelected(data)
  }

  async function kiSpielberichtGenerieren() {
    if (!selected) return
    setKiLaeuft(true)
    try {
      const prompt = `Du bist Pressesprecher des HC Bremen (Handball, Bremen). Schreibe einen professionellen, lebendigen Spielbericht auf Deutsch.

Daten:
- Titel: ${selected.titel}
- Heimteam: HC Bremen
- Gastteam: ${selected.gastteam}
- Ergebnis: HC Bremen ${selected.heimtore ?? '?'} : ${selected.gasttore ?? '?'} ${selected.gastteam}
- Datum: ${selected.datum ? new Date(selected.datum).toLocaleDateString('de-DE') : 'unbekannt'}
- Ort: ${selected.ort || 'unbekannt'}
- Notizen vom Team: ${selected.rohnotizen || '(keine Notizen)'}

Schreibe einen Spielbericht von ca. 200-300 Wörtern. Lebhaft, aber sachlich korrekt. Beginne direkt mit dem Bericht ohne Überschrift.`

      const resp = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await resp.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      await supabase.from('media_spielberichte').update({ bericht_text: text }).eq('id', selected.id)
      setSelected(prev => ({ ...prev, bericht_text: text }))
    } catch (err) { console.error(err) }
    setKiLaeuft(false)
  }

  async function kiCaptionsGenerieren() {
    if (!selected?.bericht_text) return
    setCaptionLaeuft(true)
    try {
      const ergebnis = `HC Bremen ${selected.heimtore ?? '?'}:${selected.gasttore ?? '?'} ${selected.gastteam}`
      const prompt = `Du bist Social Media Manager beim HC Bremen (Handball). Basierend auf diesem Spielbericht erstelle drei verschiedene Social-Media-Captions auf Deutsch.

Spielbericht:
${selected.bericht_text}

Erstelle:
1. Instagram Caption: Emotional, mit Emojis, 3-5 Hashtags am Ende, max. 150 Wörter
2. LinkedIn Caption: Professionell, strukturiert, keine oder wenige Emojis, max. 150 Wörter  
3. Facebook Caption: Mittlere Tonalität, etwas länger, community-orientiert, max. 200 Wörter

Antworte NUR mit JSON (kein Markdown):
{
  "instagram": "...",
  "linkedin": "...",
  "facebook": "..."
}`

      const resp = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await resp.json()
      const text = data.content?.find(b => b.type === 'text')?.text || '{}'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

      await supabase.from('media_spielberichte').update({
        caption_instagram: parsed.instagram || '',
        caption_linkedin: parsed.linkedin || '',
        caption_facebook: parsed.facebook || '',
      }).eq('id', selected.id)

      setSelected(prev => ({
        ...prev,
        caption_instagram: parsed.instagram || '',
        caption_linkedin: parsed.linkedin || '',
        caption_facebook: parsed.facebook || '',
      }))
    } catch (err) { console.error(err) }
    setCaptionLaeuft(false)
  }

  async function statusAendern(id, status) {
    const update = { status }
    if (status === 'freigegeben') update.freigegeben_von = profile.id
    await supabase.from('media_spielberichte').update(update).eq('id', id)
    load()
    if (selected?.id === id) setSelected(prev => ({ ...prev, ...update }))
  }

  async function feldSpeichern(feld, wert) {
    await supabase.from('media_spielberichte').update({ [feld]: wert }).eq('id', selected.id)
    setSelected(prev => ({ ...prev, [feld]: wert }))
  }

  function kopieren(text, key) {
    navigator.clipboard.writeText(text)
    setKopiert(key)
    setTimeout(() => setKopiert(''), 2000)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '300px 1fr' : '1fr', gap: 16 }}>
      {/* Linke Seite: Liste */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Spielberichte</h3>
          <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Neu</button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Neuer Spielbericht</h4>
            <input placeholder="Titel (z.B. Heimsieg gegen Kiel)" value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} style={inputStyle} />
            <input placeholder="Gastteam *" value={form.gastteam} onChange={e=>setForm(p=>({...p,gastteam:e.target.value}))} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <input type="number" placeholder="HC Bremen Tore" value={form.heimtore} onChange={e=>setForm(p=>({...p,heimtore:e.target.value}))} style={inputStyle} />
              <input type="number" placeholder={`${form.gastteam || 'Gast'} Tore`} value={form.gasttore} onChange={e=>setForm(p=>({...p,gasttore:e.target.value}))} style={inputStyle} />
            </div>
            <input type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))} style={inputStyle} />
            <input placeholder="Ort / Halle" value={form.ort} onChange={e=>setForm(p=>({...p,ort:e.target.value}))} style={inputStyle} />
            <textarea placeholder="Notizen (Schlüsselmomente, Torschützen, Besonderheiten…)" value={form.rohnotizen} onChange={e=>setForm(p=>({...p,rohnotizen:e.target.value}))} rows={3} style={{...inputStyle,resize:'vertical'}} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={speichern} style={btnPrimary}>Erstellen</button>
              <button onClick={() => setShowForm(false)} style={btnGhost}>Abbrechen</button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.4)' }}>Laden…</div>
        ) : berichte.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 24 }}>Noch keine Berichte.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {berichte.map(b => {
              const st = STATUS_FARBEN[b.status] || STATUS_FARBEN.entwurf
              return (
                <div key={b.id} onClick={() => setSelected(b)} className="card" style={{
                  cursor: 'pointer',
                  border: selected?.id === b.id ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{b.titel}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                    HC Bremen {b.heimtore ?? '?'} : {b.gasttore ?? '?'} {b.gastteam}
                    {b.datum && ` · ${new Date(b.datum).toLocaleDateString('de-DE')}`}
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.text }}>{st.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rechte Seite: Editor */}
      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Header */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17 }}>{selected.titel}</h2>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  HC Bremen {selected.heimtore ?? '?'} : {selected.gasttore ?? '?'} {selected.gastteam}
                  {selected.datum && ` · ${new Date(selected.datum).toLocaleDateString('de-DE')}`}
                  {selected.ort && ` · ${selected.ort}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: STATUS_FARBEN[selected.status]?.bg, color: STATUS_FARBEN[selected.status]?.text }}>
                  {STATUS_FARBEN[selected.status]?.label}
                </span>
                {selected.status === 'entwurf' && <button onClick={() => statusAendern(selected.id, 'zur_freigabe')} style={btnMini}>Zur Freigabe</button>}
                {selected.status === 'zur_freigabe' && isAdmin && (
                  <button onClick={() => statusAendern(selected.id, 'freigegeben')} style={{ ...btnMini, color: '#4ade80' }}>✓ Freigeben</button>
                )}
                {selected.status === 'freigegeben' && <button onClick={() => statusAendern(selected.id, 'veroeffentlicht')} style={{ ...btnMini, color: '#60a5fa' }}>📤 Veröffentlicht</button>}
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            </div>
          </div>

          {/* Rohnotizen */}
          <div className="card">
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Rohnotizen</div>
            <textarea
              value={selected.rohnotizen || ''}
              onChange={e => setSelected(prev => ({ ...prev, rohnotizen: e.target.value }))}
              onBlur={e => feldSpeichern('rohnotizen', e.target.value)}
              placeholder="Torschützen, Schlüsselmomente, Besonderheiten…"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Spielbericht */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Spielbericht</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {selected.bericht_text && (
                  <button onClick={() => kopieren(selected.bericht_text, 'bericht')} style={btnMini}>
                    {kopiert === 'bericht' ? '✓ Kopiert' : '📋 Kopieren'}
                  </button>
                )}
                <button onClick={kiSpielberichtGenerieren} style={{ ...btnMini, color: '#a78bfa' }} disabled={kiLaeuft}>
                  {kiLaeuft ? '🤖 Generiere…' : '🤖 KI-Bericht generieren'}
                </button>
              </div>
            </div>
            <textarea
              value={selected.bericht_text || ''}
              onChange={e => setSelected(prev => ({ ...prev, bericht_text: e.target.value }))}
              onBlur={e => feldSpeichern('bericht_text', e.target.value)}
              placeholder="Spielbericht wird hier erscheinen. Nutze die KI-Generierung oder schreib direkt."
              rows={10}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </div>

          {/* Captions */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Social Media Captions</div>
              <button
                onClick={kiCaptionsGenerieren}
                style={{ ...btnMini, color: '#a78bfa' }}
                disabled={captionLaeuft || !selected.bericht_text}
                title={!selected.bericht_text ? 'Erst Spielbericht generieren' : ''}
              >
                {captionLaeuft ? '🤖 Generiere…' : '🤖 Captions generieren'}
              </button>
            </div>

            {['instagram','linkedin','facebook'].map(plattform => (
              <div key={plattform} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                    {plattform === 'instagram' ? '📸 Instagram' : plattform === 'linkedin' ? '💼 LinkedIn' : '👥 Facebook'}
                  </span>
                  {selected[`caption_${plattform}`] && (
                    <button onClick={() => kopieren(selected[`caption_${plattform}`], plattform)} style={btnMini}>
                      {kopiert === plattform ? '✓ Kopiert' : '📋'}
                    </button>
                  )}
                </div>
                <textarea
                  value={selected[`caption_${plattform}`] || ''}
                  onChange={e => setSelected(prev => ({ ...prev, [`caption_${plattform}`]: e.target.value }))}
                  onBlur={e => feldSpeichern(`caption_${plattform}`, e.target.value)}
                  placeholder={`${plattform.charAt(0).toUpperCase() + plattform.slice(1)} Caption…`}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', fontSize: 12 }}
                />
              </div>
            ))}
          </div>
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
const btnGhost = { padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 13 }
const btnMini = { padding: '5px 10px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontSize: 11 }
