import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STATUS = {
  offen:          { bg: '#fff3cd', text: '#8a6a00', label: 'Offen' },
  in_bearbeitung: { bg: '#ddeaff', text: '#1a4a8a', label: 'In Bearbeitung' },
  zur_freigabe:   { bg: '#fce4d6', text: '#8a3a1a', label: 'Zur Freigabe' },
  freigegeben:    { bg: '#e2efda', text: '#2d6b3a', label: 'Freigegeben' },
  abgelehnt:      { bg: '#fce4d6', text: '#8a3a1a', label: 'Abgelehnt' },
}

const PRIO = {
  niedrig:  { color: 'var(--gray-400)', label: '↓ Niedrig' },
  normal:   { color: 'var(--gray-600)', label: '→ Normal' },
  hoch:     { color: 'var(--orange)',   label: '↑ Hoch' },
  dringend: { color: 'var(--red)',      label: '⚡ Dringend' },
}

export default function MediaAufgaben() {
  const { profile } = useAuth()
  const [aufgaben, setAufgaben] = useState([])
  const [mitglieder, setMitglieder] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('alle')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [kommentare, setKommentare] = useState([])
  const [neuerKommentar, setNeuerKommentar] = useState('')
  const [form, setForm] = useState({ titel: '', beschreibung: '', prioritaet: 'normal', zugewiesen_an: '', faellig_am: '' })
  const isAdmin = profile?.rolle === 'admin'

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: a }, { data: m }] = await Promise.all([
      supabase.from('media_aufgaben')
        .select('*, ersteller:erstellt_von(name), zugewiesener:zugewiesen_an(name), freigebender:freigegeben_von(name)')
        .order('erstellt_am', { ascending: false }),
      supabase.from('profile').select('id, name').in('rolle', ['admin', 'media'])
    ])
    setAufgaben(a || [])
    setMitglieder(m || [])
    setLoading(false)
  }

  async function loadKommentare(id) {
    const { data } = await supabase.from('media_aufgaben_kommentare')
      .select('*, autor:autor_id(name)').eq('aufgabe_id', id).order('erstellt_am')
    setKommentare(data || [])
  }

  async function selectAufgabe(a) { setSelected(a); await loadKommentare(a.id) }

  async function speichern() {
    if (!form.titel.trim()) return
    await supabase.from('media_aufgaben').insert({ ...form, zugewiesen_an: form.zugewiesen_an || null, faellig_am: form.faellig_am || null, erstellt_von: profile.id })
    setForm({ titel: '', beschreibung: '', prioritaet: 'normal', zugewiesen_an: '', faellig_am: '' })
    setShowForm(false)
    load()
  }

  async function statusAendern(id, status) {
    const update = { status }
    if (status === 'freigegeben' || status === 'abgelehnt') update.freigegeben_von = profile.id
    await supabase.from('media_aufgaben').update(update).eq('id', id)
    load()
    if (selected?.id === id) setSelected(p => ({ ...p, status, ...update }))
  }

  async function kommentarSenden() {
    if (!neuerKommentar.trim() || !selected) return
    await supabase.from('media_aufgaben_kommentare').insert({ aufgabe_id: selected.id, autor_id: profile.id, inhalt: neuerKommentar.trim() })
    setNeuerKommentar('')
    loadKommentare(selected.id)
  }

  const gefiltert = aufgaben.filter(a => {
    if (filter === 'meine') return a.zugewiesen_an === profile?.id
    if (filter === 'freigabe') return a.status === 'zur_freigabe'
    if (filter !== 'alle') return a.status === filter
    return true
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: 20, alignItems: 'flex-start' }}>
      <div>
        {/* Toolbar */}
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['alle','meine','offen','in_bearbeitung','zur_freigabe','freigegeben'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>
                {f === 'alle' ? 'Alle' : f === 'meine' ? 'Meine' : STATUS[f]?.label || f}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-gold">+ Neue Aufgabe</button>
        </div>

        {showForm && (
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--navy)' }}>Neue Aufgabe</h3>
            <div className="form-group"><label>Titel *</label><input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} placeholder="Aufgabentitel" /></div>
            <div className="form-group"><label>Beschreibung</label><textarea value={form.beschreibung} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} rows={3} /></div>
            <div className="form-row">
              <div className="form-group"><label>Priorität</label>
                <select value={form.prioritaet} onChange={e=>setForm(p=>({...p,prioritaet:e.target.value}))}>
                  <option value="niedrig">↓ Niedrig</option><option value="normal">→ Normal</option>
                  <option value="hoch">↑ Hoch</option><option value="dringend">⚡ Dringend</option>
                </select>
              </div>
              <div className="form-group"><label>Zuweisen an</label>
                <select value={form.zugewiesen_an} onChange={e=>setForm(p=>({...p,zugewiesen_an:e.target.value}))}>
                  <option value="">Nicht zugewiesen</option>
                  {mitglieder.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label>Fällig am</label><input type="date" value={form.faellig_am} onChange={e=>setForm(p=>({...p,faellig_am:e.target.value}))} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={speichern} className="btn btn-primary">Speichern</button>
              <button onClick={() => setShowForm(false)} className="btn btn-outline">Abbrechen</button>
            </div>
          </div>
        )}

        {loading ? <div className="loading-center"><div className="spinner" /></div> : gefiltert.length === 0 ? (
          <div className="empty-state"><p>Keine Aufgaben gefunden.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gefiltert.map(a => {
              const st = STATUS[a.status] || STATUS.offen
              const pr = PRIO[a.prioritaet] || PRIO.normal
              return (
                <div key={a.id} onClick={() => selectAufgabe(a)} className="card" style={{ cursor: 'pointer', marginBottom: 0, border: selected?.id === a.id ? '2px solid var(--navy)' : '2px solid transparent', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>{a.titel}</div>
                      {a.beschreibung && <div style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 6 }}>{a.beschreibung.slice(0, 80)}{a.beschreibung.length > 80 ? '…' : ''}</div>}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                        <span style={{ fontSize: 12, color: pr.color, fontWeight: 500 }}>{pr.label}</span>
                        {a.zugewiesener && <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>→ {a.zugewiesener.name}</span>}
                        {a.faellig_am && <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>📅 {new Date(a.faellig_am).toLocaleDateString('de-DE')}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {a.status === 'offen' && <button onClick={() => statusAendern(a.id,'in_bearbeitung')} className="btn btn-sm btn-outline">Start</button>}
                      {a.status === 'in_bearbeitung' && <button onClick={() => statusAendern(a.id,'zur_freigabe')} className="btn btn-sm btn-outline">Freigabe →</button>}
                      {a.status === 'zur_freigabe' && isAdmin && <>
                        <button onClick={() => statusAendern(a.id,'freigegeben')} className="btn btn-sm" style={{ background: '#e2efda', color: '#2d6b3a', border: 'none' }}>✓</button>
                        <button onClick={() => statusAendern(a.id,'abgelehnt')} className="btn btn-sm btn-danger">✗</button>
                      </>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="card" style={{ position: 'sticky', top: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, color: 'var(--navy)' }}>{selected.titel}</h3>
            <button onClick={() => setSelected(null)} className="close-btn">×</button>
          </div>
          {selected.beschreibung && <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>{selected.beschreibung}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              ['Status', <span className="badge" style={{ background: STATUS[selected.status]?.bg, color: STATUS[selected.status]?.text }}>{STATUS[selected.status]?.label}</span>],
              ['Priorität', <span style={{ color: PRIO[selected.prioritaet]?.color, fontWeight: 500 }}>{PRIO[selected.prioritaet]?.label}</span>],
              selected.zugewiesener && ['Zugewiesen', selected.zugewiesener.name],
              selected.ersteller && ['Erstellt von', selected.ersteller.name],
              selected.faellig_am && ['Fällig', new Date(selected.faellig_am).toLocaleDateString('de-DE')],
            ].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--gray-400)' }}>{label}</span>
                <span>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {selected.status === 'offen' && <button onClick={() => statusAendern(selected.id,'in_bearbeitung')} className="btn btn-sm btn-primary">In Bearbeitung</button>}
            {selected.status === 'in_bearbeitung' && <button onClick={() => statusAendern(selected.id,'zur_freigabe')} className="btn btn-sm btn-outline">Zur Freigabe</button>}
            {selected.status === 'zur_freigabe' && isAdmin && <>
              <button onClick={() => statusAendern(selected.id,'freigegeben')} className="btn btn-sm" style={{ background: '#e2efda', color: '#2d6b3a', border: 'none' }}>✓ Freigeben</button>
              <button onClick={() => statusAendern(selected.id,'abgelehnt')} className="btn btn-sm btn-danger">✗ Ablehnen</button>
            </>}
          </div>
          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Kommentare</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 240, overflowY: 'auto' }}>
              {kommentare.length === 0 ? <p style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center' }}>Noch keine Kommentare</p> :
                kommentare.map(k => (
                  <div key={k.id} style={{ background: 'var(--gray-100)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)' }}>{k.autor?.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>{new Date(k.erstellt_am).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{k.inhalt}</div>
                  </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={neuerKommentar} onChange={e => setNeuerKommentar(e.target.value)} onKeyDown={e => e.key === 'Enter' && kommentarSenden()} placeholder="Kommentar…" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontFamily: 'inherit', fontSize: 13 }} />
              <button onClick={kommentarSenden} className="btn btn-primary btn-sm">↑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
