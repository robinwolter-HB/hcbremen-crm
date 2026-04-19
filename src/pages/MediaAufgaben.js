import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STATUS_FARBEN = {
  offen:           { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.6)',  label: 'Offen' },
  in_bearbeitung:  { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa',               label: 'In Bearbeitung' },
  zur_freigabe:    { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24',               label: 'Zur Freigabe' },
  freigegeben:     { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80',               label: 'Freigegeben' },
  abgelehnt:       { bg: 'rgba(239,68,68,0.15)',   text: '#f87171',               label: 'Abgelehnt' },
}

const PRIO_FARBEN = {
  niedrig:  { text: 'rgba(255,255,255,0.4)', label: '↓ Niedrig' },
  normal:   { text: 'rgba(255,255,255,0.7)', label: '→ Normal' },
  hoch:     { text: '#fbbf24',               label: '↑ Hoch' },
  dringend: { text: '#f87171',               label: '⚡ Dringend' },
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
  const [form, setForm] = useState({
    titel: '', beschreibung: '', prioritaet: 'normal',
    zugewiesen_an: '', faellig_am: ''
  })
  const isAdmin = profile?.rolle === 'admin'

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: a }, { data: m }] = await Promise.all([
      supabase.from('media_aufgaben')
        .select('*, ersteller:erstellt_von(name), zugewiesener:zugewiesen_an(name), freigebender:freigegeben_von(name)')
        .order('erstellt_am', { ascending: false }),
      supabase.from('profile')
        .select('id, name')
        .in('rolle', ['admin', 'media'])
    ])
    setAufgaben(a || [])
    setMitglieder(m || [])
    setLoading(false)
  }

  async function loadKommentare(aufgabeId) {
    const { data } = await supabase
      .from('media_aufgaben_kommentare')
      .select('*, autor:autor_id(name)')
      .eq('aufgabe_id', aufgabeId)
      .order('erstellt_am', { ascending: true })
    setKommentare(data || [])
  }

  async function selectAufgabe(a) {
    setSelected(a)
    await loadKommentare(a.id)
  }

  async function speichern() {
    if (!form.titel.trim()) return
    const payload = {
      ...form,
      zugewiesen_an: form.zugewiesen_an || null,
      faellig_am: form.faellig_am || null,
      erstellt_von: profile.id,
    }
    await supabase.from('media_aufgaben').insert(payload)
    setForm({ titel: '', beschreibung: '', prioritaet: 'normal', zugewiesen_an: '', faellig_am: '' })
    setShowForm(false)
    load()
  }

  async function statusAendern(id, status, kommentar = null) {
    const update = { status }
    if (status === 'freigegeben' || status === 'abgelehnt') {
      update.freigegeben_von = profile.id
      if (kommentar) update.freigabe_kommentar = kommentar
    }
    await supabase.from('media_aufgaben').update(update).eq('id', id)
    load()
    if (selected?.id === id) setSelected(prev => ({ ...prev, status, ...update }))
  }

  async function kommentarSenden() {
    if (!neuerKommentar.trim() || !selected) return
    await supabase.from('media_aufgaben_kommentare').insert({
      aufgabe_id: selected.id,
      autor_id: profile.id,
      inhalt: neuerKommentar.trim(),
    })
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
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 16 }}>
      {/* Linke Seite: Liste */}
      <div>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['alle','meine','offen','in_bearbeitung','zur_freigabe','freigegeben'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer',
                background: filter === f ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                color: filter === f ? '#0a0a1a' : 'rgba(255,255,255,0.7)',
              }}>
                {f === 'alle' ? 'Alle' : f === 'meine' ? 'Meine' : STATUS_FARBEN[f]?.label || f}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} style={{
            padding: '8px 16px', background: 'var(--gold)', color: '#0a0a1a',
            border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer', fontSize: 13,
          }}>+ Neue Aufgabe</button>
        </div>

        {/* Neues Aufgaben Formular */}
        {showForm && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Neue Aufgabe</h3>
            <input
              placeholder="Titel *"
              value={form.titel}
              onChange={e => setForm(p => ({ ...p, titel: e.target.value }))}
              style={inputStyle}
            />
            <textarea
              placeholder="Beschreibung"
              value={form.beschreibung}
              onChange={e => setForm(p => ({ ...p, beschreibung: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <select value={form.prioritaet} onChange={e => setForm(p => ({ ...p, prioritaet: e.target.value }))} style={inputStyle}>
                <option value="niedrig">↓ Niedrig</option>
                <option value="normal">→ Normal</option>
                <option value="hoch">↑ Hoch</option>
                <option value="dringend">⚡ Dringend</option>
              </select>
              <select value={form.zugewiesen_an} onChange={e => setForm(p => ({ ...p, zugewiesen_an: e.target.value }))} style={inputStyle}>
                <option value="">Nicht zugewiesen</option>
                {mitglieder.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input
                type="date"
                value={form.faellig_am}
                onChange={e => setForm(p => ({ ...p, faellig_am: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={speichern} style={btnPrimary}>Speichern</button>
              <button onClick={() => setShowForm(false)} style={btnGhost}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Aufgaben Liste */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>Laden…</div>
        ) : gefiltert.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 32 }}>
            Keine Aufgaben gefunden.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gefiltert.map(a => {
              const st = STATUS_FARBEN[a.status] || STATUS_FARBEN.offen
              const pr = PRIO_FARBEN[a.prioritaet] || PRIO_FARBEN.normal
              const isSelected = selected?.id === a.id
              return (
                <div key={a.id} onClick={() => selectAufgabe(a)}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    border: isSelected ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.06)',
                    transition: 'border 0.15s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.titel}</div>
                      {a.beschreibung && (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                          {a.beschreibung.length > 80 ? a.beschreibung.slice(0, 80) + '…' : a.beschreibung}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ ...tagStyle, background: st.bg, color: st.text }}>{st.label}</span>
                        <span style={{ fontSize: 11, color: pr.text }}>{pr.label}</span>
                        {a.zugewiesener && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>→ {a.zugewiesener.name}</span>}
                        {a.faellig_am && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>📅 {new Date(a.faellig_am).toLocaleDateString('de-DE')}</span>}
                      </div>
                    </div>
                    {/* Quick Status Actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      {a.status === 'offen' && (
                        <button onClick={() => statusAendern(a.id, 'in_bearbeitung')} style={{ ...btnMini, background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>Start</button>
                      )}
                      {a.status === 'in_bearbeitung' && (
                        <button onClick={() => statusAendern(a.id, 'zur_freigabe')} style={{ ...btnMini, background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>Freigabe</button>
                      )}
                      {a.status === 'zur_freigabe' && isAdmin && (
                        <>
                          <button onClick={() => statusAendern(a.id, 'freigegeben')} style={{ ...btnMini, background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>✓</button>
                          <button onClick={() => statusAendern(a.id, 'abgelehnt')} style={{ ...btnMini, background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>✗</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rechte Seite: Detail & Kommentare */}
      {selected && (
        <div className="card" style={{ position: 'sticky', top: 80, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, flex: 1 }}>{selected.titel}</h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
          </div>

          {selected.beschreibung && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>{selected.beschreibung}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <InfoRow label="Status" value={<span style={{ ...tagStyle, background: STATUS_FARBEN[selected.status]?.bg, color: STATUS_FARBEN[selected.status]?.text }}>{STATUS_FARBEN[selected.status]?.label}</span>} />
            <InfoRow label="Priorität" value={<span style={{ color: PRIO_FARBEN[selected.prioritaet]?.text }}>{PRIO_FARBEN[selected.prioritaet]?.label}</span>} />
            {selected.zugewiesener && <InfoRow label="Zugewiesen" value={selected.zugewiesener.name} />}
            {selected.ersteller && <InfoRow label="Erstellt von" value={selected.ersteller.name} />}
            {selected.faellig_am && <InfoRow label="Fällig am" value={new Date(selected.faellig_am).toLocaleDateString('de-DE')} />}
            {selected.freigebender && <InfoRow label="Freigegeben von" value={selected.freigebender.name} />}
            {selected.freigabe_kommentar && <InfoRow label="Kommentar" value={selected.freigabe_kommentar} />}
          </div>

          {/* Status-Aktionen */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {selected.status === 'offen' && (
              <button onClick={() => statusAendern(selected.id, 'in_bearbeitung')} style={{ ...btnMini, fontSize: 12, padding: '6px 12px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>In Bearbeitung</button>
            )}
            {selected.status === 'in_bearbeitung' && (
              <button onClick={() => statusAendern(selected.id, 'zur_freigabe')} style={{ ...btnMini, fontSize: 12, padding: '6px 12px', background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>Zur Freigabe senden</button>
            )}
            {selected.status === 'zur_freigabe' && isAdmin && (
              <>
                <button onClick={() => statusAendern(selected.id, 'freigegeben')} style={{ ...btnMini, fontSize: 12, padding: '6px 12px', background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>✓ Freigeben</button>
                <button onClick={() => statusAendern(selected.id, 'abgelehnt')} style={{ ...btnMini, fontSize: 12, padding: '6px 12px', background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>✗ Ablehnen</button>
              </>
            )}
            {selected.status === 'abgelehnt' && (
              <button onClick={() => statusAendern(selected.id, 'offen')} style={{ ...btnMini, fontSize: 12, padding: '6px 12px' }}>Wieder öffnen</button>
            )}
          </div>

          {/* Kommentare */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Kommentare</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {kommentare.length === 0 ? (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px 0' }}>Noch keine Kommentare</div>
              ) : kommentare.map(k => (
                <div key={k.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)' }}>{k.autor?.name}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{new Date(k.erstellt_am).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{k.inhalt}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                placeholder="Kommentar schreiben…"
                value={neuerKommentar}
                onChange={e => setNeuerKommentar(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && kommentarSenden()}
                style={{ ...inputStyle, flex: 1, margin: 0 }}
              />
              <button onClick={kommentarSenden} style={{ ...btnPrimary, padding: '8px 12px', margin: 0 }}>↑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <span style={{ color: 'rgba(255,255,255,0.85)' }}>{value}</span>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  color: 'white', fontSize: 13, marginBottom: 8, boxSizing: 'border-box',
  outline: 'none',
}
const btnPrimary = {
  padding: '8px 16px', background: 'var(--gold)', color: '#0a0a1a',
  border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
}
const btnGhost = {
  padding: '8px 16px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
  border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 13,
}
const btnMini = {
  padding: '4px 8px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
  border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontSize: 11,
}
const tagStyle = {
  display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
}
