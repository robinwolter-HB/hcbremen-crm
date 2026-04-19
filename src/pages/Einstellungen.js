import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

function FarbPicker({ value, onChange }) {
  const farben = ['#0f2240','#2d6fa3','#3a8a5a','#c8a84b','#d94f4f','#e07b30','#8b5cf6','#9a9590','#5a5650','#1a3a6b','#e8c96b','#c6efce']
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
      {farben.map(f => (
        <div key={f} onClick={() => onChange(f)} style={{
          width:24, height:24, borderRadius:'50%', background:f, cursor:'pointer',
          border: value===f ? '3px solid var(--text)' : '2px solid transparent', boxSizing:'border-box'
        }}/>
      ))}
      <input type="color" value={value||'#2d6fa3'} onChange={e=>onChange(e.target.value)}
        style={{ width:28, height:28, border:'none', borderRadius:4, cursor:'pointer', padding:0 }}/>
    </div>
  )
}

function VerwaltungsBlock({ titel, items, onSave, onDelete, onToggle, felder }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  function openNew() { setForm({ name:'', farbe:'#2d6fa3', reihenfolge: items.length }); setModal(true) }
  function openEdit(item) { setForm(item); setModal(true) }

  async function save() {
    if (!form.name?.trim()) { alert('Bitte einen Namen eingeben.'); return }
    setSaving(true)
    await onSave(form)
    setModal(false); setSaving(false)
  }

  return (
    <div className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div className="section-title" style={{ margin:0 }}>{titel}</div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Neu</button>
      </div>
      <div style={{ display:'grid', gap:8 }}>
        {items.length === 0 && <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Eintraege.</p>}
        {[...items].sort((a,b)=>(a.reihenfolge||0)-(b.reihenfolge||0)).map(item => (
          <div key={item.id} style={{
            display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
            border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)',
            opacity: item.aktiv ? 1 : 0.5, background:'var(--white)'
          }}>
            {item.farbe && <div style={{ width:14, height:14, borderRadius:'50%', background:item.farbe, flexShrink:0 }}/>}
            <span style={{ flex:1, fontWeight:500, fontSize:14 }}>{item.name}</span>
            {item.einheit && <span style={{ fontSize:12, color:'var(--gray-400)' }}>{item.einheit}</span>}
            <div style={{ display:'flex', gap:6 }}>
              <button className="btn btn-sm btn-outline" onClick={() => onToggle(item)}>
                {item.aktiv ? 'Deaktivieren' : 'Aktivieren'}
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => openEdit(item)}>Bearb.</button>
              <button className="btn btn-sm btn-danger" onClick={() => {
                if (window.confirm(item.name+' wirklich loeschen?')) onDelete(item.id)
              }}>X</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:480 }}>
            <div className="modal-header">
              <span className="modal-title">{form.id?'Bearbeiten':'Neu anlegen'}</span>
              <button className="close-btn" onClick={()=>setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus/>
              </div>
              {felder?.includes('farbe') && (
                <div className="form-group">
                  <label>Farbe</label>
                  <FarbPicker value={form.farbe||'#2d6fa3'} onChange={farbe=>setForm(f=>({...f,farbe}))}/>
                </div>
              )}
              {felder?.includes('einheit') && (
                <div className="form-group">
                  <label>Einheit</label>
                  <select value={form.einheit||'Stk'} onChange={e=>setForm(f=>({...f,einheit:e.target.value}))}>
                    {['Stk','Std','Tag','Pauschal','m²','lfd. m','kg','Liter'].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              )}
              {felder?.includes('kategorie') && (
                <div className="form-group">
                  <label>Kategorie</label>
                  <input value={form.kategorie||''} onChange={e=>setForm(f=>({...f,kategorie:e.target.value}))} placeholder="z.B. Catering, Technik..."/>
                </div>
              )}
              {felder?.includes('beschreibung') && (
                <div className="form-group">
                  <label>Beschreibung</label>
                  <textarea value={form.beschreibung||''} onChange={e=>setForm(f=>({...f,beschreibung:e.target.value}))}/>
                </div>
              )}
              <div className="form-group">
                <label>Reihenfolge</label>
                <input type="number" value={form.reihenfolge||0} onChange={e=>setForm(f=>({...f,reihenfolge:parseInt(e.target.value)||0}))}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KlauselnVerwaltung() {
  const [klauseln, setKlauseln] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('vertragsklauseln').select('*').order('reihenfolge')
    setKlauseln(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.titel?.trim() || !form.text?.trim()) return
    setSaving(true)
    const payload = { titel:form.titel, text:form.text, reihenfolge:form.reihenfolge||0, aktiv:form.aktiv!==false, ist_standard:form.ist_standard||false }
    if (form.id) await supabase.from('vertragsklauseln').update(payload).eq('id', form.id)
    else await supabase.from('vertragsklauseln').insert(payload)
    setModal(false); setSaving(false); load()
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div className="section-title" style={{ margin:0 }}>Vertragsklauseln</div>
          <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>Standard-Klauseln werden im Vertragsersteller automatisch vorausgewaehlt.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>{ setForm({ aktiv:true, ist_standard:false, reihenfolge:klauseln.length+1 }); setModal(true) }}>+ Neue Klausel</button>
      </div>
      <div style={{ display:'grid', gap:10 }}>
        {klauseln.map(k => (
          <div key={k.id} style={{ border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', padding:16, opacity:k.aktiv?1:0.5 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <strong style={{ fontSize:14 }}>{k.titel}</strong>
                  {k.ist_standard && <span style={{ fontSize:11, background:'#e2efda', color:'#2d6b3a', padding:'1px 8px', borderRadius:10, fontWeight:600 }}>Standard</span>}
                  {!k.aktiv && <span style={{ fontSize:11, background:'var(--gray-200)', color:'var(--gray-600)', padding:'1px 8px', borderRadius:10 }}>Inaktiv</span>}
                </div>
                <p style={{ fontSize:12, color:'var(--gray-500)', lineHeight:1.6 }}>{k.text.slice(0,120)}...</p>
              </div>
              <div style={{ display:'flex', gap:6, marginLeft:12, flexShrink:0 }}>
                <button className="btn btn-sm btn-outline" onClick={async()=>{ await supabase.from('vertragsklauseln').update({ ist_standard:!k.ist_standard }).eq('id',k.id); load() }}>
                  {k.ist_standard?'Kein Standard':'Standard'}
                </button>
                <button className="btn btn-sm btn-outline" onClick={async()=>{ await supabase.from('vertragsklauseln').update({ aktiv:!k.aktiv }).eq('id',k.id); load() }}>
                  {k.aktiv?'Deaktiv.':'Aktivieren'}
                </button>
                <button className="btn btn-sm btn-outline" onClick={()=>{ setForm({...k}); setModal(true) }}>Bearb.</button>
                <button className="btn btn-sm btn-danger" onClick={async()=>{ if(window.confirm('Loeschen?')){ await supabase.from('vertragsklauseln').delete().eq('id',k.id); load() } }}>X</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:640 }}>
            <div className="modal-header">
              <span className="modal-title">{form.id?'Klausel bearbeiten':'Neue Klausel'}</span>
              <button className="close-btn" onClick={()=>setModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Titel *</label><input value={form.titel||''} onChange={e=>setForm(f=>({...f,titel:e.target.value}))} autoFocus/></div>
              <div className="form-group"><label>Klauseltext *</label><textarea value={form.text||''} onChange={e=>setForm(f=>({...f,text:e.target.value}))} style={{ minHeight:160 }}/></div>
              <div className="form-row">
                <div className="form-group"><label>Reihenfolge</label><input type="number" value={form.reihenfolge||0} onChange={e=>setForm(f=>({...f,reihenfolge:parseInt(e.target.value)||0}))}/></div>
              </div>
              <div style={{ display:'flex', gap:24 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.aktiv!==false} onChange={e=>setForm(f=>({...f,aktiv:e.target.checked}))}/>Aktiv
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.ist_standard||false} onChange={e=>setForm(f=>({...f,ist_standard:e.target.checked}))}/>Als Standard vorauswaehlen
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── NEUE PANELS ────────────────────────────────────────────

function MannschaftenPanel() {
  const [liste, setListe] = useState([])
  const [form, setForm] = useState({ name:'', kuerzel:'', farbe:'#0f2240' })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('mannschaften').select('*').order('reihenfolge')
    setListe(data||[])
    setLoading(false)
  }

  function startEdit(m) {
    setForm({ name:m.name, kuerzel:m.kuerzel||'', farbe:m.farbe||'#0f2240' })
    setEditId(m.id)
  }

  async function speichern() {
    if(!form.name.trim()) return
    const payload = { name:form.name.trim(), kuerzel:form.kuerzel.trim()||null, farbe:form.farbe }
    if (editId) {
      await supabase.from('mannschaften').update(payload).eq('id', editId)
    } else {
      await supabase.from('mannschaften').insert({ ...payload, reihenfolge: liste.length })
    }
    setForm({ name:'', kuerzel:'', farbe:'#0f2240' })
    setEditId(null)
    load()
  }

  async function toggleAktiv(id, aktiv) {
    await supabase.from('mannschaften').update({ aktiv: !aktiv }).eq('id', id)
    load()
  }

  async function loeschen(id) {
    if(!window.confirm('Mannschaft wirklich löschen?')) return
    await supabase.from('mannschaften').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="section-title" style={{ marginBottom:14 }}>{editId ? 'Mannschaft bearbeiten' : 'Neue Mannschaft'}</div>
        <div className="form-row-3">
          <div className="form-group">
            <label>Name *</label>
            <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="z.B. 1. Herren" />
          </div>
          <div className="form-group">
            <label>Kürzel</label>
            <input value={form.kuerzel} onChange={e=>setForm(p=>({...p,kuerzel:e.target.value}))} placeholder="H1" maxLength={4} />
          </div>
          <div className="form-group">
            <label>Farbe</label>
            <FarbPicker value={form.farbe} onChange={farbe=>setForm(p=>({...p,farbe}))} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={speichern} className="btn btn-primary">{editId?'Aktualisieren':'Speichern'}</button>
          {editId && <button onClick={()=>{ setEditId(null); setForm({name:'',kuerzel:'',farbe:'#0f2240'}) }} className="btn btn-outline">Abbrechen</button>}
        </div>
      </div>

      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Farbe</th><th>Name</th><th>Kürzel</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {liste.map(m=>(
                <tr key={m.id} style={{ opacity:m.aktiv?1:0.5 }}>
                  <td><div style={{ width:20, height:20, borderRadius:4, background:m.farbe||'#ccc', border:'1px solid var(--gray-200)' }} /></td>
                  <td style={{ fontWeight:600 }}>{m.name}</td>
                  <td><span style={{ fontFamily:'monospace', fontSize:12, background:'var(--gray-100)', padding:'2px 8px', borderRadius:4 }}>{m.kuerzel||'–'}</span></td>
                  <td><span className={`badge ${m.aktiv?'badge-aktiv':'badge-ehemaliger'}`}>{m.aktiv?'Aktiv':'Inaktiv'}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>startEdit(m)} className="btn btn-sm btn-outline">Bearb.</button>
                      <button onClick={()=>toggleAktiv(m.id,m.aktiv)} className="btn btn-sm btn-outline">{m.aktiv?'Deaktivieren':'Aktivieren'}</button>
                      <button onClick={()=>loeschen(m.id)} className="btn btn-sm btn-danger">Löschen</button>
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
}

function MediaKategorienPanel() {
  const TYPEN = ['foto','bericht','aufgabe','posting','allgemein']
  const TYP_LABEL = { foto:'📷 Foto', bericht:'📝 Bericht', aufgabe:'✓ Aufgabe', posting:'📱 Posting', allgemein:'📎 Allgemein' }
  const [liste, setListe] = useState([])
  const [form, setForm] = useState({ name:'', typ:'allgemein', farbe:'#2d6fa3' })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('media_kategorien').select('*').order('typ').order('name')
    setListe(data||[])
    setLoading(false)
  }

  function startEdit(k) {
    setForm({ name:k.name, typ:k.typ, farbe:k.farbe||'#2d6fa3' })
    setEditId(k.id)
  }

  async function speichern() {
    if(!form.name.trim()) return
    const payload = { name:form.name.trim(), typ:form.typ, farbe:form.farbe, aktiv:true }
    if (editId) await supabase.from('media_kategorien').update(payload).eq('id', editId)
    else await supabase.from('media_kategorien').insert(payload)
    setForm({ name:'', typ:'allgemein', farbe:'#2d6fa3' })
    setEditId(null)
    load()
  }

  async function toggleAktiv(id, aktiv) {
    await supabase.from('media_kategorien').update({ aktiv: !aktiv }).eq('id', id)
    load()
  }

  async function loeschen(id) {
    await supabase.from('media_kategorien').delete().eq('id', id)
    load()
  }

  // Gruppiert nach Typ
  const grouped = TYPEN.reduce((acc, t) => { acc[t] = liste.filter(k=>k.typ===t); return acc }, {})

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="section-title" style={{ marginBottom:14 }}>{editId ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</div>
        <div className="form-row-3">
          <div className="form-group">
            <label>Name *</label>
            <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="z.B. Spielfoto" />
          </div>
          <div className="form-group">
            <label>Typ</label>
            <select value={form.typ} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
              {TYPEN.map(t=><option key={t} value={t}>{TYP_LABEL[t]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Farbe</label>
            <FarbPicker value={form.farbe} onChange={farbe=>setForm(p=>({...p,farbe}))} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={speichern} className="btn btn-primary">{editId?'Aktualisieren':'Speichern'}</button>
          {editId && <button onClick={()=>{ setEditId(null); setForm({name:'',typ:'allgemein',farbe:'#2d6fa3'}) }} className="btn btn-outline">Abbrechen</button>}
        </div>
      </div>

      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {TYPEN.map(typ => {
            const items = grouped[typ]
            if (!items?.length) return null
            return (
              <div key={typ}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{TYP_LABEL[typ]}</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Farbe</th><th>Name</th><th>Typ</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {items.map(k=>(
                        <tr key={k.id} style={{ opacity:k.aktiv?1:0.5 }}>
                          <td><div style={{ width:20, height:20, borderRadius:4, background:k.farbe||'#ccc', border:'1px solid var(--gray-200)' }} /></td>
                          <td style={{ fontWeight:600 }}>{k.name}</td>
                          <td><span style={{ fontSize:12, background:'var(--gray-100)', padding:'2px 8px', borderRadius:10 }}>{k.typ}</span></td>
                          <td><span className={`badge ${k.aktiv?'badge-aktiv':'badge-ehemaliger'}`}>{k.aktiv?'Aktiv':'Inaktiv'}</span></td>
                          <td>
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={()=>startEdit(k)} className="btn btn-sm btn-outline">Bearb.</button>
                              <button onClick={()=>toggleAktiv(k.id,k.aktiv)} className="btn btn-sm btn-outline">{k.aktiv?'Deaktiv.':'Aktivieren'}</button>
                              <button onClick={()=>loeschen(k.id)} className="btn btn-sm btn-danger">Löschen</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
          {liste.length === 0 && <div className="empty-state"><p>Noch keine Kategorien.</p></div>}
        </div>
      )}
    </div>
  )
}

function HCTeamsPanel() {
  const [liste, setListe] = useState([])
  const [form, setForm] = useState({ name:'', beschreibung:'' })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('hc_teams').select('*').order('name')
    setListe(data||[])
    setLoading(false)
  }

  function startEdit(t) {
    setForm({ name:t.name, beschreibung:t.beschreibung||'' })
    setEditId(t.id)
  }

  async function speichern() {
    if(!form.name.trim()) return
    const payload = { name:form.name.trim(), beschreibung:form.beschreibung||null, aktiv:true }
    if (editId) await supabase.from('hc_teams').update(payload).eq('id', editId)
    else await supabase.from('hc_teams').insert(payload)
    setForm({ name:'', beschreibung:'' })
    setEditId(null)
    load()
  }

  async function toggleAktiv(id, aktiv) {
    await supabase.from('hc_teams').update({ aktiv: !aktiv }).eq('id', id)
    load()
  }

  async function loeschen(id) {
    if(!window.confirm('Team wirklich löschen?')) return
    await supabase.from('hc_teams').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="section-title" style={{ marginBottom:14 }}>{editId ? 'Team bearbeiten' : 'Neues Team'}</div>
        <div className="form-row">
          <div className="form-group">
            <label>Name *</label>
            <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="z.B. Trainerteam" />
          </div>
          <div className="form-group">
            <label>Beschreibung</label>
            <input value={form.beschreibung} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} placeholder="Kurze Beschreibung" />
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={speichern} className="btn btn-primary">{editId?'Aktualisieren':'Speichern'}</button>
          {editId && <button onClick={()=>{ setEditId(null); setForm({name:'',beschreibung:''}) }} className="btn btn-outline">Abbrechen</button>}
        </div>
      </div>

      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Beschreibung</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {liste.map(t=>(
                <tr key={t.id} style={{ opacity:t.aktiv?1:0.5 }}>
                  <td style={{ fontWeight:600 }}>{t.name}</td>
                  <td style={{ color:'var(--gray-600)' }}>{t.beschreibung||'–'}</td>
                  <td><span className={`badge ${t.aktiv?'badge-aktiv':'badge-ehemaliger'}`}>{t.aktiv?'Aktiv':'Inaktiv'}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>startEdit(t)} className="btn btn-sm btn-outline">Bearb.</button>
                      <button onClick={()=>toggleAktiv(t.id,t.aktiv)} className="btn btn-sm btn-outline">{t.aktiv?'Deaktiv.':'Aktivieren'}</button>
                      <button onClick={()=>loeschen(t.id)} className="btn btn-sm btn-danger">Löschen</button>
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
}

// ─── HAUPT-KOMPONENTE ────────────────────────────────────────

export default function Einstellungen() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState('kategorien')
  const [loading, setLoading] = useState(true)

  const [kategorien, setKategorien] = useState([])
  const [status, setStatus] = useState([])
  const [eventArten, setEventArten] = useState([])
  const [eventStatus, setEventStatus] = useState([])
  const [dlTypen, setDlTypen] = useState([])
  const [dlArtikel, setDlArtikel] = useState([])
  const [fkKategorien, setFkKategorien] = useState([])
  const [posKategorien, setPosKategorien] = useState([])
  const [raenge, setRaenge] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const [
      {data:k},{data:s},{data:ea},{data:es},
      {data:dt},{data:da},{data:fkk},{data:pk},{data:rg}
    ] = await Promise.all([
      supabase.from('kontakt_kategorien').select('*').order('reihenfolge'),
      supabase.from('crm_status').select('*').order('reihenfolge'),
      supabase.from('event_arten').select('*').order('reihenfolge'),
      supabase.from('event_status_liste').select('*').order('reihenfolge'),
      supabase.from('dienstleister_typen').select('*').order('reihenfolge'),
      supabase.from('dienstleistungsartikel').select('*').order('reihenfolge'),
      supabase.from('freiwillige_faehigkeit_kategorien').select('*').order('reihenfolge'),
      supabase.from('event_position_kategorien').select('*').order('reihenfolge'),
      supabase.from('freiwillige_raenge').select('*').order('reihenfolge'),
    ])
    setKategorien(k||[]); setStatus(s||[]); setEventArten(ea||[])
    setEventStatus(es||[]); setDlTypen(dt||[]); setDlArtikel(da||[])
    setFkKategorien(fkk||[]); setPosKategorien(pk||[]); setRaenge(rg||[])
    setLoading(false)
  }

  function makeCRUD(table, allowedFields = []) {
    return {
      save: async (form) => {
        const payload = { name:form.name.trim(), reihenfolge:form.reihenfolge||0, aktiv:form.aktiv!==false }
        if (allowedFields.includes('farbe')) payload.farbe = form.farbe || '#2d6fa3'
        if (allowedFields.includes('einheit')) payload.einheit = form.einheit || 'Stk'
        if (allowedFields.includes('kategorie')) payload.kategorie = form.kategorie || null
        if (allowedFields.includes('beschreibung')) payload.beschreibung = form.beschreibung || null
        let error
        if (form.id) { const r = await supabase.from(table).update(payload).eq('id', form.id); error=r.error }
        else { const r = await supabase.from(table).insert(payload); error=r.error }
        if (error) { alert('Fehler: ' + error.message); return }
        load()
      },
      delete: async (id) => {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) { alert('Fehler: ' + error.message); return }
        load()
      },
      toggle: async (item) => {
        await supabase.from(table).update({ aktiv:!item.aktiv }).eq('id', item.id)
        load()
      },
    }
  }

  const katCRUD    = makeCRUD('kontakt_kategorien', ['farbe'])
  const statusCRUD = makeCRUD('crm_status', ['farbe'])
  const eArtenCRUD = makeCRUD('event_arten', ['farbe'])
  const eStatusCRUD= makeCRUD('event_status_liste', ['farbe'])
  const dlTypenCRUD= makeCRUD('dienstleister_typen', [])
  const dlArtikelCRUD = makeCRUD('dienstleistungsartikel', ['einheit','kategorie','beschreibung'])
  const fkKatCRUD  = makeCRUD('freiwillige_faehigkeit_kategorien', [])
  const posKatCRUD = makeCRUD('event_position_kategorien', [])
  const raengeCRUD = makeCRUD('freiwillige_raenge', [])

  if (!isAdmin()) return (
    <main className="main">
      <div className="card"><p style={{color:'var(--red)'}}>Nur Admins koennen Einstellungen bearbeiten.</p></div>
    </main>
  )

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  const TABS = [
    ['kategorien',    '👥 Kontakt-Kategorien'],
    ['status',        '🔵 Kontakt-Status'],
    ['event-arten',   '📅 Event-Arten'],
    ['event-status',  '🔄 Event-Status'],
    ['dl-typen',      '🏢 Dienstleister-Typen'],
    ['dl-artikel',    '📦 Dienstleistungsartikel'],
    ['raenge',        '⭐ Ränge'],
    ['fk-kategorien', '🏷️ Fähigkeits-Kat.'],
    ['pos-kategorien','📍 Positions-Kat.'],
    ['klauseln',      '📋 Vertragsklauseln'],
    ['mannschaften',  '🏅 Mannschaften'],
    ['media-kat',     '🎨 Media Kategorien'],
    ['hc-teams',      '🤝 HC Teams'],
    ['info',          'ℹ️ Info'],
  ]

  return (
    <main className="main">
      <div className="page-title">⚙️ Einstellungen</div>
      <p className="page-subtitle">Kategorien, Status, Event-Arten und weitere Konfigurationen</p>

      <div className="tabs" style={{ overflowX:'auto', flexWrap:'nowrap' }}>
        {TABS.map(([key,label]) => (
          <button key={key} className={'tab-btn'+(tab===key?' active':'')} onClick={()=>setTab(key)} style={{ whiteSpace:'nowrap' }}>{label}</button>
        ))}
      </div>

      {tab==='kategorien'   && <VerwaltungsBlock titel="Kontakt-Kategorien"   items={kategorien}   onSave={katCRUD.save}    onDelete={katCRUD.delete}    onToggle={katCRUD.toggle}    felder={['farbe']}/>}
      {tab==='status'       && <VerwaltungsBlock titel="Kontakt-Status"        items={status}       onSave={statusCRUD.save} onDelete={statusCRUD.delete} onToggle={statusCRUD.toggle} felder={['farbe']}/>}
      {tab==='event-arten'  && <VerwaltungsBlock titel="Event-Arten"           items={eventArten}   onSave={eArtenCRUD.save} onDelete={eArtenCRUD.delete} onToggle={eArtenCRUD.toggle} felder={['farbe']}/>}
      {tab==='event-status' && <VerwaltungsBlock titel="Event-Status"          items={eventStatus}  onSave={eStatusCRUD.save} onDelete={eStatusCRUD.delete} onToggle={eStatusCRUD.toggle} felder={['farbe']}/>}
      {tab==='dl-typen'     && <VerwaltungsBlock titel="Dienstleister-Typen"   items={dlTypen}      onSave={dlTypenCRUD.save} onDelete={dlTypenCRUD.delete} onToggle={dlTypenCRUD.toggle} felder={[]}/>}
      {tab==='dl-artikel'   && (
        <div>
          <VerwaltungsBlock titel="Dienstleistungsartikel" items={dlArtikel} onSave={dlArtikelCRUD.save} onDelete={dlArtikelCRUD.delete} onToggle={dlArtikelCRUD.toggle} felder={['einheit','kategorie','beschreibung']}/>
          <div className="card" style={{marginTop:16,background:'#f8f5ef',border:'1.5px solid #e0ddd6'}}>
            <div style={{fontSize:13,color:'var(--gray-600)'}}>
              <strong>Hinweis:</strong> Preise pro Dienstleister werden im Dienstleister-Tab unter Events eingetragen.
            </div>
          </div>
        </div>
      )}
      {tab==='raenge'        && <VerwaltungsBlock titel="Ränge" items={raenge} onSave={raengeCRUD.save} onDelete={raengeCRUD.delete} onToggle={raengeCRUD.toggle} felder={[]}/>}
      {tab==='fk-kategorien' && <VerwaltungsBlock titel="Fähigkeits-Kategorien (Freiwillige)" items={fkKategorien} onSave={fkKatCRUD.save} onDelete={fkKatCRUD.delete} onToggle={fkKatCRUD.toggle} felder={[]}/>}
      {tab==='pos-kategorien'&& <VerwaltungsBlock titel="Positions-Kategorien (Events)" items={posKategorien} onSave={posKatCRUD.save} onDelete={posKatCRUD.delete} onToggle={posKatCRUD.toggle} felder={[]}/>}
      {tab==='klauseln'      && <KlauselnVerwaltung/>}
      {tab==='mannschaften'  && <MannschaftenPanel/>}
      {tab==='media-kat'     && <MediaKategorienPanel/>}
      {tab==='hc-teams'      && <HCTeamsPanel/>}

      {tab==='info' && (
        <div className="card">
          <div className="section-title" style={{marginBottom:16}}>System-Information</div>
          <div style={{display:'grid',gap:12}}>
            {[
              ['CRM Version','2.2'],
              ['Datenbank','Supabase (PostgreSQL)'],
              ['Hosting','Vercel'],
              ['Verein','HC Bremen'],
              ['Media Hub','aktiv'],
            ].map(([label,value]) => (
              <div key={label} style={{display:'flex',gap:16,padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                <span style={{fontSize:13,color:'var(--gray-600)',width:160,flexShrink:0}}>{label}</span>
                <span style={{fontSize:13,fontWeight:500}}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
