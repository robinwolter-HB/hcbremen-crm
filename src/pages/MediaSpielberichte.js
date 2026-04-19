import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STATUS = {
  entwurf:         { bg:'var(--gray-100)', text:'var(--gray-600)', label:'Entwurf' },
  zur_freigabe:    { bg:'#fff3cd',         text:'#8a6a00',         label:'Zur Freigabe' },
  freigegeben:     { bg:'#e2efda',         text:'#2d6b3a',         label:'Freigegeben' },
  veroeffentlicht: { bg:'#ddeaff',         text:'#1a4a8a',         label:'Veröffentlicht' },
}

export default function MediaSpielberichte() {
  const { profile } = useAuth()
  const isAdmin = profile?.rolle === 'admin'
  const [berichte, setBerichte] = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [kategorien, setKategorien] = useState([])
  const [mitglieder, setMitglieder] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [todos, setTodos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showTodoForm, setShowTodoForm] = useState(false)
  const [kiLaeuft, setKiLaeuft] = useState(false)
  const [captionLaeuft, setCaptionLaeuft] = useState(false)
  const [kopiert, setKopiert] = useState('')
  const [todoForm, setTodoForm] = useState({ titel:'', beschreibung:'', zugewiesen_an:'', faellig_am:'' })
  const [form, setForm] = useState({ titel:'', gastteam:'', heimtore:'', gasttore:'', datum:'', ort:'', rohnotizen:'', mannschaft_id:'', kategorie_id:'' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: b }, { data: mn }, { data: k }, { data: m }] = await Promise.all([
      supabase.from('media_spielberichte').select('*, ersteller:erstellt_von(name), mannschaft:mannschaft_id(name,farbe), kategorie:kategorie_id(name)').order('erstellt_am', { ascending: false }),
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('media_kategorien').select('*').eq('aktiv', true).in('typ', ['bericht','allgemein']),
      supabase.from('profile').select('id, name').in('rolle', ['admin','media']),
    ])
    setBerichte(b || [])
    setMannschaften(mn || [])
    setKategorien(k || [])
    setMitglieder(m || [])
    setLoading(false)
  }

  async function loadTodos(berichtId) {
    const { data } = await supabase.from('media_spielbericht_todos').select('*, zugewiesener:zugewiesen_an(name)').eq('spielbericht_id', berichtId).order('erstellt_am')
    setTodos(data || [])
  }

  async function selectBericht(b) {
    setSelected(b)
    await loadTodos(b.id)
  }

  async function speichern() {
    if (!form.titel.trim() || !form.gastteam.trim()) return
    const { data } = await supabase.from('media_spielberichte').insert({
      ...form,
      heimtore: form.heimtore!==''?parseInt(form.heimtore):null,
      gasttore: form.gasttore!==''?parseInt(form.gasttore):null,
      datum: form.datum||null,
      mannschaft_id: form.mannschaft_id||null,
      kategorie_id: form.kategorie_id||null,
      erstellt_von: profile.id, status:'entwurf'
    }).select().single()
    setForm({ titel:'', gastteam:'', heimtore:'', gasttore:'', datum:'', ort:'', rohnotizen:'', mannschaft_id:'', kategorie_id:'' })
    setShowForm(false); await load(); if (data) selectBericht(data)
  }

  async function todoSpeichern() {
    if (!todoForm.titel.trim() || !selected) return
    await supabase.from('media_spielbericht_todos').insert({
      spielbericht_id: selected.id,
      titel: todoForm.titel,
      beschreibung: todoForm.beschreibung||null,
      zugewiesen_an: todoForm.zugewiesen_an||null,
      faellig_am: todoForm.faellig_am||null,
      erstellt_von: profile.id,
    })
    setTodoForm({ titel:'', beschreibung:'', zugewiesen_an:'', faellig_am:'' })
    setShowTodoForm(false)
    await loadTodos(selected.id)
  }

  async function todoToggle(id, status) {
    await supabase.from('media_spielbericht_todos').update({ status: status==='offen'?'erledigt':'offen' }).eq('id', id)
    await loadTodos(selected.id)
  }

  async function kiGenerieren(typ) {
    if (!selected) return
    const mannschaftName = mannschaften.find(m => m.id === selected.mannschaft_id)?.name || ''
    if (typ==='bericht') setKiLaeuft(true); else setCaptionLaeuft(true)
    try {
      let prompt
      if (typ==='bericht') {
        prompt = `Du bist Pressesprecher des HC Bremen (Handball). Schreibe einen professionellen Spielbericht auf Deutsch.

Daten:
- Mannschaft: ${mannschaftName || 'HC Bremen'}
- Ergebnis: ${mannschaftName||'HC Bremen'} ${selected.heimtore??'?'} : ${selected.gasttore??'?'} ${selected.gastteam}
- Datum: ${selected.datum?new Date(selected.datum).toLocaleDateString('de-DE'):'unbekannt'}
- Ort: ${selected.ort||'unbekannt'}
- Notizen: ${selected.rohnotizen||'(keine)'}

Ca. 200-300 Wörter, lebhaft, direkt beginnen ohne Überschrift.`
      } else {
        const tags = selected.ki_tags || []
        prompt = `Du bist Social Media Manager beim HC Bremen (Handball). Erstelle drei Captions auf Deutsch.

Spielbericht:
${selected.bericht_text}

Mannschaft: ${mannschaftName||'HC Bremen'}
Tags: ${tags.join(', ')||'keine'}

Regeln:
- Instagram: emotional, 3-5 Hashtags mit #HCBremen ${mannschaftName?'#'+mannschaftName.replace(/\s/g,''):''}
- LinkedIn: professionell, keine Emojis
- Facebook: community-orientiert, warm

Antworte NUR mit JSON: {"instagram":"...","linkedin":"...","facebook":"..."}`
      }

      const resp = await fetch('/api/claude', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, messages:[{role:'user',content:prompt}] }) })
      const data = await resp.json()
      const text = data.content?.find(b=>b.type==='text')?.text||''

      if (typ==='bericht') {
        await supabase.from('media_spielberichte').update({ bericht_text: text }).eq('id', selected.id)
        setSelected(p=>({...p, bericht_text: text}))
      } else {
        const parsed = JSON.parse(text.replace(/```json|```/g,'').trim())
        await supabase.from('media_spielberichte').update({ caption_instagram:parsed.instagram||'', caption_linkedin:parsed.linkedin||'', caption_facebook:parsed.facebook||'' }).eq('id', selected.id)
        setSelected(p=>({...p, caption_instagram:parsed.instagram||'', caption_linkedin:parsed.linkedin||'', caption_facebook:parsed.facebook||''}))
      }
    } catch(err) { console.error(err) }
    if (typ==='bericht') setKiLaeuft(false); else setCaptionLaeuft(false)
  }

  async function statusAendern(id, status) {
    const update = { status }; if(status==='freigegeben') update.freigegeben_von=profile.id
    await supabase.from('media_spielberichte').update(update).eq('id', id)
    load(); if(selected?.id===id) setSelected(p=>({...p,...update}))
  }

  async function feldSpeichern(feld, wert) {
    await supabase.from('media_spielberichte').update({[feld]:wert}).eq('id', selected.id)
  }

  function kopieren(text, key) { navigator.clipboard.writeText(text); setKopiert(key); setTimeout(()=>setKopiert(''), 2000) }

  return (
    <div style={{ display:'grid', gridTemplateColumns:selected?'260px 1fr':'1fr', gap:20, alignItems:'flex-start' }}>
      {/* Liste */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <h3 style={{ margin:0, fontSize:16, color:'var(--navy)' }}>Spielberichte</h3>
          <button onClick={()=>setShowForm(true)} className="btn btn-gold btn-sm">+ Neu</button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom:12 }}>
            <div className="form-group"><label>Titel *</label><input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} /></div>
            <div className="form-row">
              <div className="form-group"><label>Mannschaft</label>
                <select value={form.mannschaft_id} onChange={e=>setForm(p=>({...p,mannschaft_id:e.target.value}))}>
                  <option value="">Wählen…</option>
                  {mannschaften.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Gastteam *</label><input value={form.gastteam} onChange={e=>setForm(p=>({...p,gastteam:e.target.value}))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Heimtore</label><input type="number" value={form.heimtore} onChange={e=>setForm(p=>({...p,heimtore:e.target.value}))} /></div>
              <div className="form-group"><label>Gasttore</label><input type="number" value={form.gasttore} onChange={e=>setForm(p=>({...p,gasttore:e.target.value}))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Datum</label><input type="date" value={form.datum} onChange={e=>setForm(p=>({...p,datum:e.target.value}))} /></div>
              <div className="form-group"><label>Ort</label><input value={form.ort} onChange={e=>setForm(p=>({...p,ort:e.target.value}))} /></div>
            </div>
            <div className="form-group"><label>Kategorie</label>
              <select value={form.kategorie_id} onChange={e=>setForm(p=>({...p,kategorie_id:e.target.value}))}>
                <option value="">Keine</option>
                {kategorien.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Notizen</label><textarea value={form.rohnotizen} onChange={e=>setForm(p=>({...p,rohnotizen:e.target.value}))} rows={2} placeholder="Torschützen, Highlights…"/></div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={speichern} className="btn btn-primary">Erstellen</button>
              <button onClick={()=>setShowForm(false)} className="btn btn-outline">Abbrechen</button>
            </div>
          </div>
        )}

        {loading ? <div className="loading-center"><div className="spinner"/></div> : berichte.length===0 ? (
          <div className="empty-state"><p>Noch keine Berichte.</p></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {berichte.map(b => (
              <div key={b.id} onClick={()=>selectBericht(b)} className="card"
                style={{ cursor:'pointer', padding:12, marginBottom:0, border:selected?.id===b.id?'2px solid var(--navy)':'2px solid transparent' }}>
                {b.mannschaft && (
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, background:(b.mannschaft.farbe||'#ccc')+'20', color:b.mannschaft.farbe||'var(--navy)', fontWeight:700, marginBottom:4, display:'inline-block' }}>{b.mannschaft.name}</span>
                )}
                <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', marginBottom:3 }}>{b.titel}</div>
                <div style={{ fontSize:12, color:'var(--gray-600)', marginBottom:5 }}>
                  {b.heimtore??'?'} : {b.gasttore??'?'} vs. {b.gastteam}
                  {b.datum && ` · ${new Date(b.datum).toLocaleDateString('de-DE')}`}
                </div>
                <span className="badge" style={{ background:STATUS[b.status]?.bg, color:STATUS[b.status]?.text }}>{STATUS[b.status]?.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      {selected && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Header */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
              <div>
                {selected.mannschaft && (
                  <span style={{ fontSize:11, padding:'2px 9px', borderRadius:10, background:(selected.mannschaft.farbe||'#ccc')+'20', color:selected.mannschaft.farbe||'var(--navy)', fontWeight:700, marginBottom:6, display:'inline-block' }}>{selected.mannschaft.name}</span>
                )}
                <h2 style={{ fontSize:17, color:'var(--navy)', margin:'4px 0' }}>{selected.titel}</h2>
                <div style={{ fontSize:13, color:'var(--gray-600)' }}>
                  {selected.heimtore??'?'} : {selected.gasttore??'?'} vs. {selected.gastteam}
                  {selected.datum && ` · ${new Date(selected.datum).toLocaleDateString('de-DE')}`}
                  {selected.ort && ` · ${selected.ort}`}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                <span className="badge" style={{ background:STATUS[selected.status]?.bg, color:STATUS[selected.status]?.text }}>{STATUS[selected.status]?.label}</span>
                {selected.status==='entwurf' && <button onClick={()=>statusAendern(selected.id,'zur_freigabe')} className="btn btn-sm btn-outline">Zur Freigabe</button>}
                {selected.status==='zur_freigabe' && isAdmin && <button onClick={()=>statusAendern(selected.id,'freigegeben')} className="btn btn-sm" style={{background:'#e2efda',color:'#2d6b3a',border:'none'}}>✓ Freigeben</button>}
                {selected.status==='freigegeben' && <button onClick={()=>statusAendern(selected.id,'veroeffentlicht')} className="btn btn-sm btn-outline">📤 Veröffentlicht</button>}
                <button onClick={()=>setSelected(null)} className="close-btn">×</button>
              </div>
            </div>
          </div>

          {/* Notizen */}
          <div className="card">
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Rohnotizen</label>
              <textarea value={selected.rohnotizen||''} onChange={e=>setSelected(p=>({...p,rohnotizen:e.target.value}))} onBlur={e=>feldSpeichern('rohnotizen',e.target.value)} rows={3} placeholder="Torschützen, Schlüsselmomente…"/>
            </div>
          </div>

          {/* Spielbericht */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--gray-600)', textTransform:'uppercase', letterSpacing:0.3 }}>Spielbericht</label>
              <div style={{ display:'flex', gap:6 }}>
                {selected.bericht_text && <button onClick={()=>kopieren(selected.bericht_text,'bericht')} className="btn btn-sm btn-outline">{kopiert==='bericht'?'✓ Kopiert':'📋 Kopieren'}</button>}
                <button onClick={()=>kiGenerieren('bericht')} className="btn btn-sm btn-outline" disabled={kiLaeuft}>{kiLaeuft?'🤖 Generiere…':'🤖 KI-Bericht'}</button>
              </div>
            </div>
            <textarea value={selected.bericht_text||''} onChange={e=>setSelected(p=>({...p,bericht_text:e.target.value}))} onBlur={e=>feldSpeichern('bericht_text',e.target.value)} rows={9}
              style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontFamily:'inherit', fontSize:14, lineHeight:1.6, resize:'vertical' }}
              placeholder="Spielbericht wird hier erscheinen…"/>
          </div>

          {/* Captions */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--gray-600)', textTransform:'uppercase', letterSpacing:0.3 }}>Social Media Captions</label>
              <button onClick={()=>kiGenerieren('captions')} className="btn btn-sm btn-outline" disabled={captionLaeuft||!selected.bericht_text}>{captionLaeuft?'🤖 Generiere…':'🤖 Captions generieren'}</button>
            </div>
            {['instagram','linkedin','facebook'].map(pl=>(
              <div key={pl} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'var(--gray-600)' }}>{pl==='instagram'?'📸 Instagram':pl==='linkedin'?'💼 LinkedIn':'👥 Facebook'}</label>
                  {selected[`caption_${pl}`] && <button onClick={()=>kopieren(selected[`caption_${pl}`],pl)} className="btn btn-sm btn-outline">{kopiert===pl?'✓ Kopiert':'📋'}</button>}
                </div>
                <textarea value={selected[`caption_${pl}`]||''} onChange={e=>setSelected(p=>({...p,[`caption_${pl}`]:e.target.value}))} onBlur={e=>feldSpeichern(`caption_${pl}`,e.target.value)} rows={4}
                  style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontFamily:'inherit', fontSize:13, resize:'vertical' }}
                  placeholder={`${pl.charAt(0).toUpperCase()+pl.slice(1)} Caption…`}/>
              </div>
            ))}
          </div>

          {/* Todos */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--gray-600)', textTransform:'uppercase', letterSpacing:0.3 }}>Aufgaben zu diesem Bericht</label>
              <button onClick={()=>setShowTodoForm(true)} className="btn btn-sm btn-gold">+ Aufgabe</button>
            </div>
            {showTodoForm && (
              <div style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:12, marginBottom:12 }}>
                <div className="form-group"><label>Titel *</label><input value={todoForm.titel} onChange={e=>setTodoForm(p=>({...p,titel:e.target.value}))} placeholder="z.B. Caption auf Instagram posten" /></div>
                <div className="form-row">
                  <div className="form-group"><label>Zuweisen an</label>
                    <select value={todoForm.zugewiesen_an} onChange={e=>setTodoForm(p=>({...p,zugewiesen_an:e.target.value}))}>
                      <option value="">Nicht zugewiesen</option>
                      {mitglieder.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Fällig am</label><input type="date" value={todoForm.faellig_am} onChange={e=>setTodoForm(p=>({...p,faellig_am:e.target.value}))} /></div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={todoSpeichern} className="btn btn-primary btn-sm">Speichern</button>
                  <button onClick={()=>setShowTodoForm(false)} className="btn btn-outline btn-sm">Abbrechen</button>
                </div>
              </div>
            )}
            {todos.length===0 ? <p style={{ fontSize:13, color:'var(--gray-400)' }}>Keine Aufgaben.</p> : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {todos.map(t=>(
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--gray-100)', borderRadius:'var(--radius)', opacity:t.status==='erledigt'?0.6:1 }}>
                    <button onClick={()=>todoToggle(t.id,t.status)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, flexShrink:0 }}>{t.status==='erledigt'?'✅':'⬜'}</button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, textDecoration:t.status==='erledigt'?'line-through':'none' }}>{t.titel}</div>
                      <div style={{ fontSize:11, color:'var(--gray-400)' }}>
                        {t.zugewiesener && `→ ${t.zugewiesener.name}`}
                        {t.faellig_am && ` · 📅 ${new Date(t.faellig_am).toLocaleDateString('de-DE')}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
