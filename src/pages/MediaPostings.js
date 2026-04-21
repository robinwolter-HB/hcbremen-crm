import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const PL_ICONS = { instagram:'📸', linkedin:'💼', facebook:'👥', tiktok:'🎵' }
const STATUS_STIL = {
  geplant:        { bg:'#fff3cd', text:'#8a6a00', label:'Geplant' },
  veroeffentlicht:{ bg:'#e2efda', text:'#2d6b3a', label:'Veröffentlicht' },
  abgebrochen:    { bg:'#fce4d6', text:'#8a3a1a', label:'Abgebrochen' },
}

export default function MediaPostings() {
  const { profile } = useAuth()
  const [postings, setPostings] = useState([])
  const [events, setEvents] = useState([])
  const [mannschaften, setMannschaften] = useState([])
  const [kategorien, setKategorien] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('alle')
  const [plattformFilter, setPlattformFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editPosting, setEditPosting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titel: '', inhalt: '', plattformen: [],
    geplant_am: '', geplant_uhrzeit: '12:00',
    event_id: '', mannschaft_id: '', kategorie_id: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: e }, { data: mn }, { data: k }] = await Promise.all([
      supabase.from('media_postings')
        .select('*, event:event_id(id,name), mannschaft:mannschaft_id(name,farbe), kategorie:kategorie_id(name)')
        .order('geplant_am', { ascending: false }),
      supabase.from('veranstaltungen').select('id, name, datum').order('datum', { ascending: false }).limit(60),
      supabase.from('mannschaften').select('*').eq('aktiv', true).order('reihenfolge'),
      supabase.from('media_kategorien').select('*').eq('aktiv', true).in('typ', ['posting','allgemein']),
    ])
    setPostings(p || [])
    setEvents(e || [])
    setMannschaften(mn || [])
    setKategorien(k || [])
    setLoading(false)
  }

  function openNeu() {
    setEditPosting(null)
    setForm({ titel:'', inhalt:'', plattformen:[], geplant_am:'', geplant_uhrzeit:'12:00', event_id:'', mannschaft_id:'', kategorie_id:'' })
    setShowForm(true)
  }

  function openEdit(p) {
    setEditPosting(p)
    const dt = p.geplant_am ? new Date(p.geplant_am) : null
    setForm({
      titel: p.titel || '',
      inhalt: p.inhalt || '',
      plattformen: p.plattformen || [],
      geplant_am: dt ? dt.toISOString().split('T')[0] : '',
      geplant_uhrzeit: dt ? dt.toTimeString().slice(0,5) : '12:00',
      event_id: p.event_id || '',
      mannschaft_id: p.mannschaft_id || '',
      kategorie_id: p.kategorie_id || '',
    })
    setShowForm(true)
  }

  async function speichern() {
    if (!form.titel.trim()) return
    setSaving(true)
    const dt = form.geplant_am ? new Date(`${form.geplant_am}T${form.geplant_uhrzeit}`) : null
    const payload = {
      titel: form.titel,
      inhalt: form.inhalt || null,
      plattformen: form.plattformen,
      geplant_am: dt ? dt.toISOString() : null,
      event_id: form.event_id || null,
      mannschaft_id: form.mannschaft_id || null,
      kategorie_id: form.kategorie_id || null,
    }
    if (editPosting) {
      await supabase.from('media_postings').update(payload).eq('id', editPosting.id)
    } else {
      await supabase.from('media_postings').insert({ ...payload, status: 'geplant', erstellt_von: profile.id })
    }
    setSaving(false)
    setShowForm(false)
    setEditPosting(null)
    load()
  }

  async function statusAendern(id, status) {
    await supabase.from('media_postings').update({ status }).eq('id', id)
    load()
  }

  async function loeschen(id) {
    if (!window.confirm('Posting wirklich löschen?')) return
    await supabase.from('media_postings').delete().eq('id', id)
    load()
  }

  function plattformToggle(p) {
    setForm(prev => ({
      ...prev,
      plattformen: prev.plattformen.includes(p)
        ? prev.plattformen.filter(x => x !== p)
        : [...prev.plattformen, p]
    }))
  }

  const gefiltert = postings.filter(p => {
    const matchStatus = filter === 'alle' || p.status === filter
    const matchPl = !plattformFilter || (p.plattformen || []).includes(plattformFilter)
    return matchStatus && matchPl
  })

  // KPI
  const anzGeplant = postings.filter(p => p.status === 'geplant').length
  const anzVeroeffentlicht = postings.filter(p => p.status === 'veroeffentlicht').length
  const anzAbgebrochen = postings.filter(p => p.status === 'abgebrochen').length

  return (
    <div>
      {/* KPI Zeile */}
      <div className="stats-row" style={{ marginBottom: 20 }}>
        {[
          ['📅', 'Geplant',          anzGeplant,          '#fff3cd', '#8a6a00'],
          ['✅', 'Veröffentlicht',   anzVeroeffentlicht,  '#e2efda', '#2d6b3a'],
          ['❌', 'Abgebrochen',      anzAbgebrochen,      '#fce4d6', '#8a3a1a'],
          ['📊', 'Gesamt',           postings.length,     'var(--gray-100)', 'var(--navy)'],
        ].map(([icon, label, wert, bg, color]) => (
          <div key={label} className="stat-card" style={{ background: bg, borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
            <div className="stat-num" style={{ fontSize: 24, color }}>{wert}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['alle', 'geplant', 'veroeffentlicht', 'abgebrochen'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>
              {f === 'alle' ? 'Alle' : STATUS_STIL[f]?.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={plattformFilter} onChange={e => setPlattformFilter(e.target.value)}
            style={{ padding:'6px 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:13 }}>
            <option value="">Alle Plattformen</option>
            {['instagram','linkedin','facebook','tiktok'].map(p => (
              <option key={p} value={p}>{PL_ICONS[p]} {p}</option>
            ))}
          </select>
          <button onClick={openNeu} className="btn btn-gold">+ Neues Posting</button>
        </div>
      </div>

      {/* Formular Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">{editPosting ? 'Posting bearbeiten' : 'Neues Posting'}</span>
              <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Titel *</label><input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} autoFocus /></div>
              <div className="form-group"><label>Caption / Inhalt</label><textarea value={form.inhalt} onChange={e=>setForm(p=>({...p,inhalt:e.target.value}))} rows={4} /></div>

              <div className="form-row">
                <div className="form-group"><label>Datum</label><input type="date" value={form.geplant_am} onChange={e=>setForm(p=>({...p,geplant_am:e.target.value}))} /></div>
                <div className="form-group"><label>Uhrzeit</label><input type="time" value={form.geplant_uhrzeit} onChange={e=>setForm(p=>({...p,geplant_uhrzeit:e.target.value}))} /></div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Event zuordnen</label>
                  <select value={form.event_id} onChange={e=>setForm(p=>({...p,event_id:e.target.value}))}>
                    <option value="">Kein Event</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.name}{e.datum ? ' · '+new Date(e.datum+'T00:00:00').toLocaleDateString('de-DE') : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Mannschaft</label>
                  <select value={form.mannschaft_id} onChange={e=>setForm(p=>({...p,mannschaft_id:e.target.value}))}>
                    <option value="">Keine</option>
                    {mannschaften.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Kategorie</label>
                <select value={form.kategorie_id} onChange={e=>setForm(p=>({...p,kategorie_id:e.target.value}))}>
                  <option value="">Keine</option>
                  {kategorien.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Plattformen</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                  {['instagram','linkedin','facebook','tiktok'].map(p => (
                    <button key={p} type="button" onClick={() => plattformToggle(p)}
                      className={`btn btn-sm ${form.plattformen.includes(p) ? 'btn-primary' : 'btn-outline'}`}>
                      {PL_ICONS[p]} {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowForm(false)} className="btn btn-outline">Abbrechen</button>
              <button onClick={speichern} className="btn btn-primary" disabled={saving}>{saving ? 'Speichern…' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : gefiltert.length === 0 ? (
        <div className="empty-state card"><p>Keine Postings gefunden.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gefiltert.map(p => {
            const st = STATUS_STIL[p.status] || STATUS_STIL.geplant
            const istVergangenheit = p.geplant_am && new Date(p.geplant_am) < new Date() && p.status === 'geplant'
            return (
              <div key={p.id} className="card" style={{ padding: 16, marginBottom: 0, borderLeft: `4px solid ${p.status === 'veroeffentlicht' ? 'var(--green)' : p.status === 'abgebrochen' ? 'var(--red)' : 'var(--gold)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {/* Tags oben */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      {p.mannschaft && (
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: (p.mannschaft.farbe||'#ccc')+'20', color: p.mannschaft.farbe||'var(--navy)', fontWeight: 700, border: '1px solid '+(p.mannschaft.farbe||'#ccc')+'40' }}>
                          {p.mannschaft.name}
                        </span>
                      )}
                      {p.kategorie && (
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--gray-100)', color: 'var(--gray-600)' }}>{p.kategorie.name}</span>
                      )}
                      {p.event && (
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: '#e2efda', color: '#2d6b3a' }}>🏐 {p.event.name}</span>
                      )}
                    </div>

                    {/* Titel */}
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{p.titel}</div>

                    {/* Caption Vorschau */}
                    {p.inhalt && (
                      <div style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 6, lineHeight: 1.5 }}>
                        {p.inhalt.length > 120 ? p.inhalt.slice(0, 120) + '…' : p.inhalt}
                      </div>
                    )}

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="badge" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                      {(p.plattformen||[]).map(pl => (
                        <span key={pl} style={{ fontSize: 12, color: 'var(--gray-600)' }}>{PL_ICONS[pl]||'📱'} {pl}</span>
                      ))}
                      {p.geplant_am && (
                        <span style={{ fontSize: 12, color: istVergangenheit ? 'var(--red)' : 'var(--gray-400)', fontWeight: istVergangenheit ? 600 : 400 }}>
                          📅 {new Date(p.geplant_am).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                          {istVergangenheit && ' ⚠️ überfällig'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0, alignItems: 'flex-end' }}>
                    {p.status === 'geplant' && (
                      <button onClick={() => statusAendern(p.id, 'veroeffentlicht')}
                        className="btn btn-sm" style={{ background: '#e2efda', color: '#2d6b3a', border: 'none', whiteSpace: 'nowrap' }}>
                        ✓ Veröffentlicht
                      </button>
                    )}
                    {p.status === 'veroeffentlicht' && (
                      <button onClick={() => statusAendern(p.id, 'geplant')}
                        className="btn btn-sm btn-outline" style={{ fontSize: 11 }}>
                        ↩ Zurücksetzen
                      </button>
                    )}
                    {p.status === 'geplant' && (
                      <button onClick={() => statusAendern(p.id, 'abgebrochen')}
                        className="btn btn-sm btn-outline" style={{ fontSize: 11, color: 'var(--red)' }}>
                        Abbrechen
                      </button>
                    )}
                    <button onClick={() => openEdit(p)} className="btn btn-sm btn-outline">Bearb.</button>
                    <button onClick={() => loeschen(p.id)} className="btn btn-sm btn-danger">Löschen</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
