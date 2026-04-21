import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

function FarbPicker({ value, onChange }) {
  const farben = ['#0f2240','#2d6fa3','#3a8a5a','#c8a84b','#d94f4f','#e07b30','#8b5cf6','#9a9590','#5a5650','#1a3a6b','#e8c96b','#c6efce']
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
      {farben.map(f => (
        <div key={f} onClick={() => onChange(f)} style={{ width:24, height:24, borderRadius:'50%', background:f, cursor:'pointer', border: value===f ? '3px solid var(--text)' : '2px solid transparent', boxSizing:'border-box' }}/>
      ))}
      <input type="color" value={value||'#2d6fa3'} onChange={e=>onChange(e.target.value)} style={{ width:28, height:28, border:'none', borderRadius:4, cursor:'pointer', padding:0 }}/>
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
    setSaving(true); await onSave(form); setModal(false); setSaving(false)
  }

  return (
    <div className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div className="section-title" style={{ margin:0 }}>{titel}</div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Neu</button>
      </div>
      <div style={{ display:'grid', gap:8 }}>
        {items.length === 0 && <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Einträge.</p>}
        {[...items].sort((a,b)=>(a.reihenfolge||0)-(b.reihenfolge||0)).map(item => (
          <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', opacity:item.aktiv?1:0.5, background:'var(--white)' }}>
            {item.farbe && <div style={{ width:14, height:14, borderRadius:'50%', background:item.farbe, flexShrink:0 }}/>}
            <span style={{ flex:1, fontWeight:500, fontSize:14 }}>{item.name}</span>
            {item.einheit && <span style={{ fontSize:12, color:'var(--gray-400)' }}>{item.einheit}</span>}
            <div style={{ display:'flex', gap:6 }}>
              <button className="btn btn-sm btn-outline" onClick={() => onToggle(item)}>{item.aktiv?'Deaktivieren':'Aktivieren'}</button>
              <button className="btn btn-sm btn-outline" onClick={() => openEdit(item)}>Bearb.</button>
              <button className="btn btn-sm btn-danger" onClick={() => { if(window.confirm(item.name+' wirklich löschen?')) onDelete(item.id) }}>X</button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:480 }}>
            <div className="modal-header"><span className="modal-title">{form.id?'Bearbeiten':'Neu anlegen'}</span><button className="close-btn" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Name *</label><input value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus/></div>
              {felder?.includes('farbe') && <div className="form-group"><label>Farbe</label><FarbPicker value={form.farbe||'#2d6fa3'} onChange={farbe=>setForm(f=>({...f,farbe}))}/></div>}
              {felder?.includes('einheit') && <div className="form-group"><label>Einheit</label><select value={form.einheit||'Stk'} onChange={e=>setForm(f=>({...f,einheit:e.target.value}))}>{['Stk','Std','Tag','Pauschal','m²','lfd. m','kg','Liter'].map(u=><option key={u}>{u}</option>)}</select></div>}
              {felder?.includes('kategorie') && <div className="form-group"><label>Kategorie</label><input value={form.kategorie||''} onChange={e=>setForm(f=>({...f,kategorie:e.target.value}))} placeholder="z.B. Catering, Technik..."/></div>}
              {felder?.includes('beschreibung') && <div className="form-group"><label>Beschreibung</label><textarea value={form.beschreibung||''} onChange={e=>setForm(f=>({...f,beschreibung:e.target.value}))}/></div>}
              <div className="form-group"><label>Reihenfolge</label><input type="number" value={form.reihenfolge||0} onChange={e=>setForm(f=>({...f,reihenfolge:parseInt(e.target.value)||0}))}/></div>
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
  async function load() { const { data } = await supabase.from('vertragsklauseln').select('*').order('reihenfolge'); setKlauseln(data||[]); setLoading(false) }
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
        <div><div className="section-title" style={{ margin:0 }}>Vertragsklauseln</div><p style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>Standard-Klauseln werden im Vertragsersteller automatisch vorausgewählt.</p></div>
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
                <button className="btn btn-sm btn-outline" onClick={async()=>{ await supabase.from('vertragsklauseln').update({ ist_standard:!k.ist_standard }).eq('id',k.id); load() }}>{k.ist_standard?'Kein Standard':'Standard'}</button>
                <button className="btn btn-sm btn-outline" onClick={async()=>{ await supabase.from('vertragsklauseln').update({ aktiv:!k.aktiv }).eq('id',k.id); load() }}>{k.aktiv?'Deaktiv.':'Aktivieren'}</button>
                <button className="btn btn-sm btn-outline" onClick={()=>{ setForm({...k}); setModal(true) }}>Bearb.</button>
                <button className="btn btn-sm btn-danger" onClick={async()=>{ if(window.confirm('Löschen?')){ await supabase.from('vertragsklauseln').delete().eq('id',k.id); load() } }}>X</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:640 }}>
            <div className="modal-header"><span className="modal-title">{form.id?'Klausel bearbeiten':'Neue Klausel'}</span><button className="close-btn" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Titel *</label><input value={form.titel||''} onChange={e=>setForm(f=>({...f,titel:e.target.value}))} autoFocus/></div>
              <div className="form-group"><label>Klauseltext *</label><textarea value={form.text||''} onChange={e=>setForm(f=>({...f,text:e.target.value}))} style={{ minHeight:160 }}/></div>
              <div className="form-group"><label>Reihenfolge</label><input type="number" value={form.reihenfolge||0} onChange={e=>setForm(f=>({...f,reihenfolge:parseInt(e.target.value)||0}))}/></div>
              <div style={{ display:'flex', gap:24 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer' }}><input type="checkbox" checked={form.aktiv!==false} onChange={e=>setForm(f=>({...f,aktiv:e.target.checked}))}/>Aktiv</label>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer' }}><input type="checkbox" checked={form.ist_standard||false} onChange={e=>setForm(f=>({...f,ist_standard:e.target.checked}))}/>Als Standard vorauswählen</label>
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

function MannschaftenPanel() {
  const [liste, setListe] = useState([])
  const [form, setForm] = useState({ name:'', kuerzel:'', farbe:'#0f2240' })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() { setLoading(true); const { data } = await supabase.from('mannschaften').select('*').order('reihenfolge'); setListe(data||[]); setLoading(false) }

  function startEdit(m) { setForm({ name:m.name, kuerzel:m.kuerzel||'', farbe:m.farbe||'#0f2240' }); setEditId(m.id) }

  async function speichern() {
    if(!form.name.trim()) return
    const payload = { name:form.name.trim(), kuerzel:form.kuerzel.trim()||null, farbe:form.farbe }
    if (editId) await supabase.from('mannschaften').update(payload).eq('id', editId)
    else await supabase.from('mannschaften').insert({ ...payload, reihenfolge:liste.length })
    setForm({ name:'', kuerzel:'', farbe:'#0f2240' }); setEditId(null); load()
  }

  async function toggleAktiv(id, aktiv) { await supabase.from('mannschaften').update({ aktiv:!aktiv }).eq('id', id); load() }
  async function loeschen(id) { if(!window.confirm('Mannschaft wirklich löschen?')) return; await supabase.from('mannschaften').delete().eq('id', id); load() }

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="section-title" style={{ marginBottom:14 }}>{editId?'Mannschaft bearbeiten':'Neue Mannschaft'}</div>
        <div className="form-row-3">
          <div className="form-group"><label>Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="z.B. 1. Herren"/></div>
          <div className="form-group"><label>Kürzel</label><input value={form.kuerzel} onChange={e=>setForm(p=>({...p,kuerzel:e.target.value}))} placeholder="H1" maxLength={4}/></div>
          <div className="form-group"><label>Farbe</label><FarbPicker value={form.farbe} onChange={farbe=>setForm(p=>({...p,farbe}))}/></div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={speichern} className="btn btn-primary">{editId?'Aktualisieren':'Speichern'}</button>
          {editId && <button onClick={()=>{ setEditId(null); setForm({name:'',kuerzel:'',farbe:'#0f2240'}) }} className="btn btn-outline">Abbrechen</button>}
        </div>
      </div>
      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Farbe</th><th>Name</th><th>Kürzel</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {liste.map(m=>(
                <tr key={m.id} style={{ opacity:m.aktiv?1:0.5 }}>
                  <td><div style={{ width:20, height:20, borderRadius:4, background:m.farbe||'#ccc', border:'1px solid var(--gray-200)' }}/></td>
                  <td style={{ fontWeight:600 }}>{m.name}</td>
                  <td><span style={{ fontFamily:'monospace', fontSize:12, background:'var(--gray-100)', padding:'2px 8px', borderRadius:4 }}>{m.kuerzel||'–'}</span></td>
                  <td><span className={`badge ${m.aktiv?'badge-aktiv':'badge-ehemaliger'}`}>{m.aktiv?'Aktiv':'Inaktiv'}</span></td>
                  <td><div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>startEdit(m)} className="btn btn-sm btn-outline">Bearb.</button>
                    <button onClick={()=>toggleAktiv(m.id,m.aktiv)} className="btn btn-sm btn-outline">{m.aktiv?'Deaktivieren':'Aktivieren'}</button>
                    <button onClick={()=>loeschen(m.id)} className="btn btn-sm btn-danger">Löschen</button>
                  </div></td>
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
  async function load() { setLoading(true); const { data } = await supabase.from('media_kategorien').select('*').order('typ').order('name'); setListe(data||[]); setLoading(false) }

  function startEdit(k) { setForm({ name:k.name, typ:k.typ, farbe:k.farbe||'#2d6fa3' }); setEditId(k.id) }

  async function speichern() {
    if(!form.name.trim()) return
    const payload = { name:form.name.trim(), typ:form.typ, farbe:form.farbe, aktiv:true }
    if (editId) await supabase.from('media_kategorien').update(payload).eq('id', editId)
    else await supabase.from('media_kategorien').insert(payload)
    setForm({ name:'', typ:'allgemein', farbe:'#2d6fa3' }); setEditId(null); load()
  }

  async function toggleAktiv(id, aktiv) { await supabase.from('media_kategorien').update({ aktiv:!aktiv }).eq('id', id); load() }
  async function loeschen(id) { await supabase.from('media_kategorien').delete().eq('id', id); load() }

  const grouped = TYPEN.reduce((acc,t) => { acc[t] = liste.filter(k=>k.typ===t); return acc }, {})

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="section-title" style={{ marginBottom:14 }}>{editId?'Kategorie bearbeiten':'Neue Kategorie'}</div>
        <div className="form-row-3">
          <div className="form-group"><label>Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="z.B. Spielfoto"/></div>
          <div className="form-group"><label>Typ</label><select value={form.typ} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>{TYPEN.map(t=><option key={t} value={t}>{TYP_LABEL[t]}</option>)}</select></div>
          <div className="form-group"><label>Farbe</label><FarbPicker value={form.farbe} onChange={farbe=>setForm(p=>({...p,farbe}))}/></div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={speichern} className="btn btn-primary">{editId?'Aktualisieren':'Speichern'}</button>
          {editId && <button onClick={()=>{ setEditId(null); setForm({name:'',typ:'allgemein',farbe:'#2d6fa3'}) }} className="btn btn-outline">Abbrechen</button>}
        </div>
      </div>
      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {TYPEN.map(typ => {
            const items = grouped[typ]; if(!items?.length) return null
            return (
              <div key={typ}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{TYP_LABEL[typ]}</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Farbe</th><th>Name</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {items.map(k=>(
                        <tr key={k.id} style={{ opacity:k.aktiv?1:0.5 }}>
                          <td><div style={{ width:20, height:20, borderRadius:4, background:k.farbe||'#ccc', border:'1px solid var(--gray-200)' }}/></td>
                          <td style={{ fontWeight:600 }}>{k.name}</td>
                          <td><span className={`badge ${k.aktiv?'badge-aktiv':'badge-ehemaliger'}`}>{k.aktiv?'Aktiv':'Inaktiv'}</span></td>
                          <td><div style={{ display:'flex', gap:6 }}>
                            <button onClick={()=>startEdit(k)} className="btn btn-sm btn-outline">Bearb.</button>
                            <button onClick={()=>toggleAktiv(k.id,k.aktiv)} className="btn btn-sm btn-outline">{k.aktiv?'Deaktiv.':'Aktivieren'}</button>
                            <button onClick={()=>loeschen(k.id)} className="btn btn-sm btn-danger">Löschen</button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
          {liste.length===0 && <div className="empty-state"><p>Noch keine Kategorien.</p></div>}
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
  async function load() { setLoading(true); const { data } = await supabase.from('hc_teams').select('*').order('name'); setListe(data||[]); setLoading(false) }

  function startEdit(t) { setForm({ name:t.name, beschreibung:t.beschreibung||'' }); setEditId(t.id) }

  async function speichern() {
    if(!form.name.trim()) return
    const payload = { name:form.name.trim(), beschreibung:form.beschreibung||null, aktiv:true }
    if (editId) await supabase.from('hc_teams').update(payload).eq('id', editId)
    else await supabase.from('hc_teams').insert(payload)
    setForm({ name:'', beschreibung:'' }); setEditId(null); load()
  }

  async function toggleAktiv(id, aktiv) { await supabase.from('hc_teams').update({ aktiv:!aktiv }).eq('id', id); load() }
  async function loeschen(id) { if(!window.confirm('Team wirklich löschen?')) return; await supabase.from('hc_teams').delete().eq('id', id); load() }

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="section-title" style={{ marginBottom:14 }}>{editId?'Team bearbeiten':'Neues Team'}</div>
        <div className="form-row">
          <div className="form-group"><label>Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="z.B. Trainerteam"/></div>
          <div className="form-group"><label>Beschreibung</label><input value={form.beschreibung} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} placeholder="Kurze Beschreibung"/></div>
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
                  <td><div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>startEdit(t)} className="btn btn-sm btn-outline">Bearb.</button>
                    <button onClick={()=>toggleAktiv(t.id,t.aktiv)} className="btn btn-sm btn-outline">{t.aktiv?'Deaktiv.':'Aktivieren'}</button>
                    <button onClick={()=>loeschen(t.id)} className="btn btn-sm btn-danger">Löschen</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


function SpielerstatusPanel() {
  const STATUS_VORGABEN = ['aktiv','verletzt','gesperrt','inaktiv','ausgeliehen']
  const [liste, setListe] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name:'', farbe:'#2d6fa3' })
  const [saving, setSaving] = useState(false)

  // Spielerstatus wird direkt aus der spieler-Tabelle als CHECK-Constraint verwaltet.
  // Hier zeigen wir die festen Werte an und erlauben Farbkonfiguration für die Darstellung
  // via einer einfachen Konfigurationstabelle (client-seitig als JSON in localStorage).

  const STATUS_BESCHREIBUNG = {
    aktiv:       { farbe:'#3a8a5a', beschreibung:'Spieler ist einsatzbereit' },
    verletzt:    { farbe:'#d94f4f', beschreibung:'Spieler ist verletzt und nicht einsatzbereit' },
    gesperrt:    { farbe:'#e07b30', beschreibung:'Spieler ist gesperrt (z.B. Gelbsperre)' },
    inaktiv:     { farbe:'#9a9590', beschreibung:'Spieler ist derzeit nicht aktiv' },
    ausgeliehen: { farbe:'#2d6fa3', beschreibung:'Spieler ist an anderen Verein ausgeliehen' },
  }

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom:8 }}>Spielerstatus</div>
      <p style={{ fontSize:13, color:'var(--gray-400)', marginBottom:16 }}>
        Die verfügbaren Status sind fest definiert. Sie können den Status eines Spielers direkt in der Spielermappe ändern.
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {Object.entries(STATUS_BESCHREIBUNG).map(([key, s]) => (
          <div key={key} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', background:'var(--white)' }}>
            <div style={{ width:14, height:14, borderRadius:'50%', background:s.farbe, flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14, textTransform:'capitalize' }}>{key}</div>
              <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{s.beschreibung}</div>
            </div>
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:600, background:s.farbe+'20', color:s.farbe }}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


function TrainingsKonfigPanel() {
  const [aktiveSektion, setAktiveSektion] = useState('typen')
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['typen','Trainingstypen'],['orte','Trainingsorte'],['uebungen','Übungsbibliothek'],['reha','Reha-Bibliothek']].map(([k,l])=>(
          <button key={k} onClick={()=>setAktiveSektion(k)} className={`btn btn-sm ${aktiveSektion===k?'btn-primary':'btn-outline'}`}>{l}</button>
        ))}
      </div>
      {aktiveSektion==='typen'   && <TrainingstypenSektion/>}
      {aktiveSektion==='orte'    && <TrainingsOrteSektion/>}
      {aktiveSektion==='uebungen'&& <UebungsBibliothekSektion/>}
      {aktiveSektion==='reha'    && <RehaBibliothekSektion/>}
    </div>
  )
}

function TrainingsOrteSektion() {
  const [liste, setListe] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', adresse:'', beschreibung:'', farbe:'#2d6fa3' })
  const [saving, setSaving] = useState(false)

  useEffect(()=>{ load() },[])
  async function load() { setLoading(true); const { data }=await supabase.from('trainings_orte').select('*').order('reihenfolge'); setListe(data||[]); setLoading(false) }
  async function speichern() {
    if (!form.name.trim()) return; setSaving(true)
    if (form.id) await supabase.from('trainings_orte').update({ name:form.name, adresse:form.adresse, beschreibung:form.beschreibung, farbe:form.farbe }).eq('id', form.id)
    else await supabase.from('trainings_orte').insert({ name:form.name, adresse:form.adresse, beschreibung:form.beschreibung, farbe:form.farbe, aktiv:true })
    setSaving(false); setModal(false); load()
  }
  async function loeschen(id) { if(!window.confirm('Ort löschen?')) return; await supabase.from('trainings_orte').delete().eq('id',id); load() }
  async function toggleAktiv(id, aktiv) { await supabase.from('trainings_orte').update({aktiv:!aktiv}).eq('id',id); load() }

  return (
    <div className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div><div className="section-title" style={{ margin:0 }}>Trainingsorte</div><p style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>Hallen, Plätze und weitere Trainingslocations</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>{ setForm({name:'',adresse:'',beschreibung:'',farbe:'#2d6fa3'}); setModal(true) }}>+ Neu</button>
      </div>
      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {liste.map(o=>(
            <div key={o.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', opacity:o.aktiv?1:0.5 }}>
              <div style={{ width:14, height:14, borderRadius:4, background:o.farbe||'#ccc', flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <strong style={{ fontSize:14 }}>{o.name}</strong>
                {o.adresse && <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{o.adresse}</div>}
                {o.beschreibung && <div style={{ fontSize:12, color:'var(--gray-400)' }}>{o.beschreibung}</div>}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-sm btn-outline" onClick={()=>{ setForm(o); setModal(true) }}>Bearb.</button>
                <button className="btn btn-sm btn-outline" onClick={()=>toggleAktiv(o.id,o.aktiv)}>{o.aktiv?'Deaktiv.':'Aktivieren'}</button>
                <button className="btn btn-sm btn-danger" onClick={()=>loeschen(o.id)}>X</button>
              </div>
            </div>
          ))}
          {liste.length===0 && <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Orte angelegt.</p>}
        </div>
      )}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:440 }}>
            <div className="modal-header"><span className="modal-title">{form.id?'Ort bearbeiten':'Neuer Ort'}</span><button className="close-btn" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group" style={{ flex:1 }}><label>Name *</label><input value={form.name||''} onChange={e=>setForm(p=>({...p,name:e.target.value}))} autoFocus /></div>
                <div className="form-group" style={{ width:80, flexShrink:0 }}><label>Farbe</label><input type="color" value={form.farbe||'#2d6fa3'} onChange={e=>setForm(p=>({...p,farbe:e.target.value}))} style={{ width:'100%', height:38, padding:2, border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', cursor:'pointer' }} /></div>
              </div>
              <div className="form-group"><label>Adresse</label><input value={form.adresse||''} onChange={e=>setForm(p=>({...p,adresse:e.target.value}))} /></div>
              <div className="form-group"><label>Beschreibung</label><input value={form.beschreibung||''} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={speichern} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UebungsBibliothekSektion() {
  const [liste, setListe] = useState([])
  const [loading, setLoading] = useState(true)
  const [typen, setTypen] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ titel:'', beschreibung:'', block:'hauptteil', dauer_minuten:'', material:'', schwierigkeit:'mittel' })
  const [saving, setSaving] = useState(false)

  useEffect(()=>{ load() },[])
  async function load() {
    setLoading(true)
    const [{ data },{ data: ty }] = await Promise.all([
      supabase.from('uebungs_bibliothek').select('*, typ:typ_id(name,farbe)').eq('aktiv', true).order('titel'),
      supabase.from('trainingstypen').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setListe(data||[]); setTypen(ty||[]); setLoading(false)
  }
  async function speichern() {
    if (!form.titel.trim()) return; setSaving(true)
    const payload = { ...form, dauer_minuten:form.dauer_minuten?parseInt(form.dauer_minuten):null, typ_id:form.typ_id||null, aktiv:true }
    if (form.id) await supabase.from('uebungs_bibliothek').update(payload).eq('id', form.id)
    else await supabase.from('uebungs_bibliothek').insert(payload)
    setSaving(false); setModal(false); load()
  }
  async function loeschen(id) { if(!window.confirm('Übung löschen?')) return; await supabase.from('uebungs_bibliothek').update({aktiv:false}).eq('id',id); load() }

  const BLOCK_LABEL_KURZ = { aufwaermen:'🔥 Aufwärmen', hauptteil:'💪 Hauptteil', abwaermen:'🧊 Abkühlen', sonstiges:'📎' }

  return (
    <div className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div><div className="section-title" style={{ margin:0 }}>Übungsbibliothek</div><p style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>Wiederverwendbare Übungen für Trainingseinheiten</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>{ setForm({titel:'',beschreibung:'',block:'hauptteil',dauer_minuten:'',material:'',schwierigkeit:'mittel',typ_id:''}); setModal(true) }}>+ Neu</button>
      </div>
      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {liste.length===0 && <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Übungen in der Bibliothek.</p>}
          {liste.map(u=>(
            <div key={u.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                  <strong style={{ fontSize:14 }}>{u.titel}</strong>
                  <span style={{ fontSize:10, background:'var(--gray-100)', color:'var(--gray-500)', padding:'1px 7px', borderRadius:10 }}>{BLOCK_LABEL_KURZ[u.block]}</span>
                  {u.typ && <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, fontWeight:700, background:(u.typ.farbe||'#ccc')+'22', color:u.typ.farbe }}>{u.typ.name}</span>}
                  {u.dauer_minuten && <span style={{ fontSize:11, color:'var(--gray-400)' }}>⏱ {u.dauer_minuten} Min.</span>}
                </div>
                {u.beschreibung && <div style={{ fontSize:12, color:'var(--gray-500)', lineHeight:1.4 }}>{u.beschreibung.slice(0,120)}{u.beschreibung.length>120?'…':''}</div>}
                {u.material && <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2 }}>📦 {u.material}</div>}
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button className="btn btn-sm btn-outline" onClick={()=>{ setForm({...u,dauer_minuten:u.dauer_minuten||''}); setModal(true) }}>Bearb.</button>
                <button className="btn btn-sm btn-danger" onClick={()=>loeschen(u.id)}>X</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:560 }}>
            <div className="modal-header"><span className="modal-title">{form.id?'Übung bearbeiten':'Neue Übung'}</span><button className="close-btn" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Titel *</label><input value={form.titel||''} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} autoFocus /></div>
              <div className="form-row">
                <div className="form-group"><label>Block</label>
                  <select value={form.block||'hauptteil'} onChange={e=>setForm(p=>({...p,block:e.target.value}))}>
                    {Object.entries(BLOCK_LABEL_KURZ).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Typ</label>
                  <select value={form.typ_id||''} onChange={e=>setForm(p=>({...p,typ_id:e.target.value}))}>
                    <option value="">Kein Typ</option>
                    {typen.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Beschreibung / Anweisung</label><textarea value={form.beschreibung||''} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} rows={3} /></div>
              <div className="form-row">
                <div className="form-group"><label>Dauer (Min.)</label><input type="number" value={form.dauer_minuten||''} onChange={e=>setForm(p=>({...p,dauer_minuten:e.target.value}))} /></div>
                <div className="form-group"><label>Material</label><input value={form.material||''} onChange={e=>setForm(p=>({...p,material:e.target.value}))} /></div>
                <div className="form-group"><label>Schwierigkeit</label>
                  <select value={form.schwierigkeit||'mittel'} onChange={e=>setForm(p=>({...p,schwierigkeit:e.target.value}))}>
                    <option value="leicht">Leicht</option><option value="mittel">Mittel</option><option value="schwer">Schwer</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={speichern} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RehaBibliothekSektion() {
  const [liste, setListe] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ titel:'', beschreibung:'', typ:'uebung', koerperteil:'', wiederholungen:'', haeufigkeit:'', dauer_wochen:'', schwierigkeit:'mittel' })
  const [saving, setSaving] = useState(false)
  const REHA_TYPEN = { uebung:'🏋️ Übung', dehnung:'🧘 Dehnung', kraft:'💪 Kraft', ausdauer:'🏃 Ausdauer', koordination:'🎯 Koordination', sonstiges:'📎 Sonstiges' }

  useEffect(()=>{ load() },[])
  async function load() { setLoading(true); const { data }=await supabase.from('reha_bibliothek').select('*').eq('aktiv',true).order('titel'); setListe(data||[]); setLoading(false) }
  async function speichern() {
    if (!form.titel.trim()) return; setSaving(true)
    const payload = { ...form, dauer_wochen:form.dauer_wochen?parseInt(form.dauer_wochen):null, aktiv:true }
    if (form.id) await supabase.from('reha_bibliothek').update(payload).eq('id', form.id)
    else await supabase.from('reha_bibliothek').insert(payload)
    setSaving(false); setModal(false); load()
  }
  async function loeschen(id) { if(!window.confirm('Aufgabe löschen?')) return; await supabase.from('reha_bibliothek').update({aktiv:false}).eq('id',id); load() }

  return (
    <div className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div><div className="section-title" style={{ margin:0 }}>Reha-Bibliothek</div><p style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>Wiederverwendbare Reha- und Übungsaufgaben für Verletzungsaktivitäten</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>{ setForm({titel:'',beschreibung:'',typ:'uebung',koerperteil:'',wiederholungen:'',haeufigkeit:'',dauer_wochen:'',schwierigkeit:'mittel'}); setModal(true) }}>+ Neu</button>
      </div>
      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {liste.length===0 && <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Einträge in der Reha-Bibliothek.</p>}
          {liste.map(r=>(
            <div key={r.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                  <strong style={{ fontSize:14 }}>{r.titel}</strong>
                  <span style={{ fontSize:10, background:'var(--gray-100)', color:'var(--gray-500)', padding:'1px 7px', borderRadius:10 }}>{REHA_TYPEN[r.typ]}</span>
                  {r.koerperteil && <span style={{ fontSize:10, background:'#ddeaff', color:'#1a4a8a', padding:'1px 7px', borderRadius:10 }}>📍 {r.koerperteil}</span>}
                </div>
                {r.beschreibung && <div style={{ fontSize:12, color:'var(--gray-500)', lineHeight:1.4 }}>{r.beschreibung.slice(0,100)}{r.beschreibung.length>100?'…':''}</div>}
                <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--gray-400)', marginTop:4 }}>
                  {r.wiederholungen && <span>🔁 {r.wiederholungen}</span>}
                  {r.haeufigkeit && <span>📅 {r.haeufigkeit}</span>}
                  {r.dauer_wochen && <span>⏱ {r.dauer_wochen} Wo.</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button className="btn btn-sm btn-outline" onClick={()=>{ setForm({...r,dauer_wochen:r.dauer_wochen||''}); setModal(true) }}>Bearb.</button>
                <button className="btn btn-sm btn-danger" onClick={()=>loeschen(r.id)}>X</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:540 }}>
            <div className="modal-header"><span className="modal-title">{form.id?'Bearbeiten':'Neue Reha-Aufgabe'}</span><button className="close-btn" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Titel *</label><input value={form.titel||''} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} autoFocus /></div>
                <div className="form-group"><label>Typ</label>
                  <select value={form.typ||'uebung'} onChange={e=>setForm(p=>({...p,typ:e.target.value}))}>
                    {Object.entries(REHA_TYPEN).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Beschreibung / Anweisung</label><textarea value={form.beschreibung||''} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} rows={3} /></div>
              <div className="form-row">
                <div className="form-group"><label>Körperteil</label><input value={form.koerperteil||''} onChange={e=>setForm(p=>({...p,koerperteil:e.target.value}))} placeholder="z.B. Knie, Schulter" /></div>
                <div className="form-group"><label>Wiederholungen</label><input value={form.wiederholungen||''} onChange={e=>setForm(p=>({...p,wiederholungen:e.target.value}))} placeholder="z.B. 3x15" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Häufigkeit</label><input value={form.haeufigkeit||''} onChange={e=>setForm(p=>({...p,haeufigkeit:e.target.value}))} placeholder="z.B. täglich" /></div>
                <div className="form-group"><label>Dauer (Wochen)</label><input type="number" value={form.dauer_wochen||''} onChange={e=>setForm(p=>({...p,dauer_wochen:e.target.value}))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={speichern} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function TrainingstypenSektion() { return <TrainingstypenPanel/> }

function TrainingstypenPanel() {
  const [liste, setListe] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', beschreibung:'', farbe:'#2d6fa3', reihenfolge:0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('trainingstypen').select('*').order('reihenfolge')
    setListe(data||[])
    setLoading(false)
  }

  async function speichern() {
    if (!form.name.trim()) return
    setSaving(true)
    if (form.id) await supabase.from('trainingstypen').update({ name:form.name, beschreibung:form.beschreibung, farbe:form.farbe, reihenfolge:form.reihenfolge||0 }).eq('id', form.id)
    else await supabase.from('trainingstypen').insert({ name:form.name, beschreibung:form.beschreibung, farbe:form.farbe, reihenfolge:form.reihenfolge||0, aktiv:true })
    setSaving(false); setModal(false); load()
  }

  async function loeschen(id) {
    if (!window.confirm('Trainingstyp löschen?')) return
    await supabase.from('trainingstypen').delete().eq('id', id); load()
  }

  async function toggleAktiv(id, aktiv) {
    await supabase.from('trainingstypen').update({ aktiv: !aktiv }).eq('id', id); load()
  }

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div className="section-title" style={{ margin:0 }}>Trainingstypen</div>
            <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>Kategorien für Trainingseinheiten (z.B. Kondition, Taktik, Technik)</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={()=>{ setForm({ name:'', beschreibung:'', farbe:'#2d6fa3', reihenfolge:liste.length }); setModal(true) }}>+ Neu</button>
        </div>
        {loading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {liste.map(s => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', opacity:s.aktiv?1:0.5 }}>
                <div style={{ width:16, height:16, borderRadius:4, background:s.farbe, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <strong style={{ fontSize:14 }}>{s.name}</strong>
                  {s.beschreibung && <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{s.beschreibung}</div>}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-sm btn-outline" onClick={()=>{ setForm(s); setModal(true) }}>Bearb.</button>
                  <button className="btn btn-sm btn-outline" onClick={()=>toggleAktiv(s.id,s.aktiv)}>{s.aktiv?'Deaktiv.':'Aktivieren'}</button>
                  <button className="btn btn-sm btn-danger" onClick={()=>loeschen(s.id)}>X</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-header"><span className="modal-title">{form.id?'Bearbeiten':'Neuer Trainingstyp'}</span><button className="close-btn" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group" style={{ flex:1 }}><label>Name *</label><input value={form.name||''} onChange={e=>setForm(p=>({...p,name:e.target.value}))} autoFocus /></div>
                <div className="form-group" style={{ width:110, flexShrink:0 }}>
                  <label>Farbe</label>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="color" value={form.farbe||'#2d6fa3'} onChange={e=>setForm(p=>({...p,farbe:e.target.value}))} style={{ width:44, height:38, padding:2, borderRadius:'var(--radius)', border:'1.5px solid var(--gray-200)', cursor:'pointer' }} />
                  </div>
                </div>
              </div>
              <div className="form-group"><label>Beschreibung</label><input value={form.beschreibung||''} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={speichern} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function VerletzungsstatusPanel() {
  const [liste, setListe] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', beschreibung:'', farbe:'#d94f4f', reihenfolge:0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('verletzungs_status').select('*').order('reihenfolge')
    setListe(data||[])
    setLoading(false)
  }

  async function speichern() {
    if (!form.name.trim()) return
    setSaving(true)
    if (form.id) {
      await supabase.from('verletzungs_status').update({ name:form.name, beschreibung:form.beschreibung, farbe:form.farbe, reihenfolge:form.reihenfolge }).eq('id', form.id)
    } else {
      await supabase.from('verletzungs_status').insert({ name:form.name, beschreibung:form.beschreibung, farbe:form.farbe, reihenfolge:form.reihenfolge||0, aktiv:true })
    }
    setSaving(false); setModal(false); load()
  }

  async function loeschen(id) {
    if (!window.confirm('Status wirklich löschen? Bereits zugeordnete Verletzungen verlieren diesen Status.')) return
    await supabase.from('verletzungs_status').delete().eq('id', id); load()
  }

  async function toggleAktiv(id, aktiv) {
    await supabase.from('verletzungs_status').update({ aktiv: !aktiv }).eq('id', id); load()
  }

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div className="section-title" style={{ margin:0 }}>Verletzungsstatus</div>
            <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>Konfigurierbare Status-Stufen für Verletzungen (z.B. Akut, Reha, Belastungsaufbau)</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={()=>{ setForm({ name:'', beschreibung:'', farbe:'#d94f4f', reihenfolge: liste.length }); setModal(true) }}>+ Neu</button>
        </div>
        {loading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {liste.length===0 && <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Status angelegt.</p>}
            {liste.map((s, i) => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', opacity:s.aktiv?1:0.5, background:'var(--white)' }}>
                <div style={{ width:18, height:18, borderRadius:'50%', background:s.farbe, flexShrink:0, boxShadow:'0 1px 4px rgba(0,0,0,0.15)' }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <strong style={{ fontSize:14 }}>{s.name}</strong>
                    {!s.aktiv && <span style={{ fontSize:11, color:'var(--gray-400)' }}>(inaktiv)</span>}
                  </div>
                  {s.beschreibung && <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{s.beschreibung}</div>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <button onClick={async()=>{ if(i>0){ await supabase.from('verletzungs_status').update({reihenfolge:s.reihenfolge-1}).eq('id',s.id); await supabase.from('verletzungs_status').update({reihenfolge:liste[i-1].reihenfolge+1}).eq('id',liste[i-1].id); load() } }} style={{ background:'none', border:'1px solid var(--gray-200)', borderRadius:4, cursor:'pointer', padding:'2px 6px', fontSize:11, opacity:i===0?0.3:1 }}>↑</button>
                  <button onClick={async()=>{ if(i<liste.length-1){ await supabase.from('verletzungs_status').update({reihenfolge:s.reihenfolge+1}).eq('id',s.id); await supabase.from('verletzungs_status').update({reihenfolge:liste[i+1].reihenfolge-1}).eq('id',liste[i+1].id); load() } }} style={{ background:'none', border:'1px solid var(--gray-200)', borderRadius:4, cursor:'pointer', padding:'2px 6px', fontSize:11, opacity:i===liste.length-1?0.3:1 }}>↓</button>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-sm btn-outline" onClick={()=>{ setForm(s); setModal(true) }}>Bearb.</button>
                  <button className="btn btn-sm btn-outline" onClick={()=>toggleAktiv(s.id,s.aktiv)}>{s.aktiv?'Deaktiv.':'Aktivieren'}</button>
                  <button className="btn btn-sm btn-danger" onClick={()=>loeschen(s.id)}>X</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header">
              <span className="modal-title">{form.id?'Status bearbeiten':'Neuer Status'}</span>
              <button className="close-btn" onClick={()=>setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group" style={{ flex:1 }}><label>Name *</label><input value={form.name||''} onChange={e=>setForm(p=>({...p,name:e.target.value}))} autoFocus placeholder="z.B. Belastungsaufbau" /></div>
                <div className="form-group" style={{ flexShrink:0, width:100 }}>
                  <label>Farbe</label>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="color" value={form.farbe||'#d94f4f'} onChange={e=>setForm(p=>({...p,farbe:e.target.value}))} style={{ width:44, height:38, padding:2, borderRadius:'var(--radius)', border:'1.5px solid var(--gray-200)', cursor:'pointer' }} />
                    <span style={{ fontSize:11, color:'var(--gray-400)' }}>{form.farbe}</span>
                  </div>
                </div>
              </div>
              <div className="form-group"><label>Beschreibung</label><input value={form.beschreibung||''} onChange={e=>setForm(p=>({...p,beschreibung:e.target.value}))} placeholder="Kurze Erklärung des Status" /></div>
              <div className="form-group"><label>Reihenfolge</label><input type="number" value={form.reihenfolge||0} onChange={e=>setForm(p=>({...p,reihenfolge:parseInt(e.target.value)||0}))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={speichern} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function GegnerTabPanel() {
  return (
    <div className="card">
      <div style={{ textAlign:'center', padding:'32px 20px' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🔵</div>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--navy)', marginBottom:8 }}>Gegner-Datenbank</div>
        <p style={{ fontSize:14, color:'var(--gray-500)', maxWidth:400, margin:'0 auto 20px' }}>
          Gegner-Teams mit Logo, Vereinsfarben und vollständigem Kader verwalten. Grundlage für das Analyse- und Tagging-System.
        </p>
        <a href="/einstellungen/gegner" style={{ display:'inline-block' }}>
          <button className="btn btn-primary">→ Zur Gegner-Datenbank</button>
        </a>
      </div>
    </div>
  )
}


function BehandlerPanel() {
  const ROLLEN = ['arzt','physio','athletiktrainer','osteopath','psychologe','sonstiges']
  const ROLLEN_LABEL = { arzt:'🏥 Arzt', physio:'💆 Physio', athletiktrainer:'🏃 Athletiktrainer', osteopath:'🤲 Osteopath', psychologe:'🧠 Psychologe', sonstiges:'📎 Sonstiges' }
  const [liste, setListe] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ vorname:'', nachname:'', rolle:'physio', spezialisierung:'', praxis:'', email:'', telefon:'', adresse:'', notizen:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await supabase.from('behandler').select('*').order('nachname')
    setListe(data||[])
    setLoading(false)
  }

  async function speichern() {
    if (!form.vorname.trim() || !form.nachname.trim()) return
    setSaving(true)
    if (form.id) await supabase.from('behandler').update(form).eq('id', form.id)
    else await supabase.from('behandler').insert({ ...form, aktiv: true })
    setSaving(false); setModal(false); load()
  }

  async function toggleAktiv(id, aktiv) {
    await supabase.from('behandler').update({ aktiv: !aktiv }).eq('id', id); load()
  }
  async function loeschen(id) {
    if(!window.confirm('Behandler wirklich löschen?')) return
    await supabase.from('behandler').delete().eq('id', id); load()
  }

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div className="section-title" style={{ margin:0 }}>Behandler</div>
            <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>Ärzte, Physios, Athletiktrainer und weitere medizinische Betreuer</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={()=>{ setForm({ vorname:'', nachname:'', rolle:'physio', spezialisierung:'', praxis:'', email:'', telefon:'', adresse:'', notizen:'' }); setModal(true) }}>+ Neu</button>
        </div>
        {loading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div style={{ display:'grid', gap:8 }}>
            {liste.length===0 && <p style={{ fontSize:13, color:'var(--gray-400)' }}>Noch keine Behandler.</p>}
            {liste.map(b => (
              <div key={b.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', opacity:b.aktiv?1:0.5, background:'var(--white)' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <strong style={{ fontSize:14 }}>{b.vorname} {b.nachname}</strong>
                    <span style={{ fontSize:11, background:'var(--gray-100)', color:'var(--gray-600)', padding:'1px 8px', borderRadius:10 }}>{ROLLEN_LABEL[b.rolle]||b.rolle}</span>
                    {b.spezialisierung && <span style={{ fontSize:11, color:'var(--gray-400)' }}>{b.spezialisierung}</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--gray-500)', display:'flex', gap:12 }}>
                    {b.praxis && <span>{b.praxis}</span>}
                    {b.email && <a href={"mailto:"+b.email} style={{ color:'var(--navy)' }}>{b.email}</a>}
                    {b.telefon && <a href={"tel:"+b.telefon} style={{ color:'var(--navy)' }}>{b.telefon}</a>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-sm btn-outline" onClick={()=>{ setForm(b); setModal(true) }}>Bearb.</button>
                  <button className="btn btn-sm btn-outline" onClick={()=>toggleAktiv(b.id,b.aktiv)}>{b.aktiv?'Deaktivieren':'Aktivieren'}</button>
                  <button className="btn btn-sm btn-danger" onClick={()=>loeschen(b.id)}>X</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{ maxWidth:560 }}>
            <div className="modal-header">
              <span className="modal-title">{form.id?'Behandler bearbeiten':'Neuer Behandler'}</span>
              <button className="close-btn" onClick={()=>setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Vorname *</label><input value={form.vorname||''} onChange={e=>setForm(p=>({...p,vorname:e.target.value}))} autoFocus /></div>
                <div className="form-group"><label>Nachname *</label><input value={form.nachname||''} onChange={e=>setForm(p=>({...p,nachname:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Rolle</label>
                  <select value={form.rolle||'physio'} onChange={e=>setForm(p=>({...p,rolle:e.target.value}))}>
                    {ROLLEN.map(r=><option key={r} value={r}>{ROLLEN_LABEL[r]}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Spezialisierung</label><input value={form.spezialisierung||''} onChange={e=>setForm(p=>({...p,spezialisierung:e.target.value}))} placeholder="z.B. Sportorthopädie" /></div>
              </div>
              <div className="form-group"><label>Praxis / Institution</label><input value={form.praxis||''} onChange={e=>setForm(p=>({...p,praxis:e.target.value}))} /></div>
              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={form.email||''} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
                <div className="form-group"><label>Telefon</label><input value={form.telefon||''} onChange={e=>setForm(p=>({...p,telefon:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Adresse</label><input value={form.adresse||''} onChange={e=>setForm(p=>({...p,adresse:e.target.value}))} /></div>
              <div className="form-group"><label>Notizen</label><textarea value={form.notizen||''} onChange={e=>setForm(p=>({...p,notizen:e.target.value}))} rows={2} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={speichern} disabled={saving}>{saving?'Speichern...':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── HAUPT-KOMPONENTE ────────────────────────────────────────

const GRUPPEN = [
  {
    key: 'crm', label: '👥 CRM', farbe: '#0f2240',
    tabs: [
      { key:'kategorien',    label:'Kontakt-Kategorien' },
      { key:'status',        label:'Kontakt-Status' },
      { key:'klauseln',      label:'Vertragsklauseln' },
    ]
  },
  {
    key: 'events', label: '📅 Events', farbe: '#e07b30',
    tabs: [
      { key:'event-arten',    label:'Event-Arten' },
      { key:'event-status',   label:'Event-Status' },
      { key:'dl-typen',       label:'Dienstleister-Typen' },
      { key:'dl-artikel',     label:'Dienstleistungsartikel' },
      { key:'raenge',         label:'Ränge' },
      { key:'fk-kategorien',  label:'Fähigkeits-Kat.' },
      { key:'pos-kategorien', label:'Positions-Kat.' },
    ]
  },
  {
    key: 'media', label: '📸 Media', farbe: '#c8a84b',
    tabs: [
      { key:'mannschaften', label:'Mannschaften' },
      { key:'media-kat',    label:'Media Kategorien' },
      { key:'hc-teams',     label:'HC Teams' },
    ]
  },
  {
    key: 'mannschaft', label: '🏐 Mannschaft', farbe: '#0f2240',
    tabs: [
      { key:'mannschaften-verw', label:'🏐 Mannschaften' },
      { key:'training-konf',     label:'🏃 Training' },
      { key:'spielerstatus',     label:'⚡ Spielerstatus' },
      { key:'verletzungsstatus',  label:'🏥 Verletzungsstatus' },
      { key:'behandler',         label:'👨‍⚕️ Behandler' },
      { key:'gegner',            label:'🔵 Gegner-Datenbank' },
    ]
  },
  {
    key: 'system', label: 'ℹ️ System', farbe: '#9a9590',
    tabs: [
      { key:'info', label:'Info' },
    ]
  },
]

export default function Einstellungen() {
  const { isAdmin } = useAuth()
  const [aktivGruppe, setAktivGruppe] = useState('crm')
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

  function makeCRUD(table, allowedFields=[]) {
    return {
      save: async (form) => {
        const payload = { name:form.name.trim(), reihenfolge:form.reihenfolge||0, aktiv:form.aktiv!==false }
        if (allowedFields.includes('farbe')) payload.farbe = form.farbe||'#2d6fa3'
        if (allowedFields.includes('einheit')) payload.einheit = form.einheit||'Stk'
        if (allowedFields.includes('kategorie')) payload.kategorie = form.kategorie||null
        if (allowedFields.includes('beschreibung')) payload.beschreibung = form.beschreibung||null
        if (form.id) await supabase.from(table).update(payload).eq('id', form.id)
        else await supabase.from(table).insert(payload)
        load()
      },
      delete: async (id) => { await supabase.from(table).delete().eq('id', id); load() },
      toggle: async (item) => { await supabase.from(table).update({ aktiv:!item.aktiv }).eq('id', item.id); load() },
    }
  }

  const katCRUD     = makeCRUD('kontakt_kategorien', ['farbe'])
  const statusCRUD  = makeCRUD('crm_status', ['farbe'])
  const eArtenCRUD  = makeCRUD('event_arten', ['farbe'])
  const eStatusCRUD = makeCRUD('event_status_liste', ['farbe'])
  const dlTypenCRUD = makeCRUD('dienstleister_typen', [])
  const dlArtikelCRUD = makeCRUD('dienstleistungsartikel', ['einheit','kategorie','beschreibung'])
  const fkKatCRUD   = makeCRUD('freiwillige_faehigkeit_kategorien', [])
  const posKatCRUD  = makeCRUD('event_position_kategorien', [])
  const raengeCRUD  = makeCRUD('freiwillige_raenge', [])

  function switchGruppe(gKey) {
    setAktivGruppe(gKey)
    const g = GRUPPEN.find(g=>g.key===gKey)
    if (g) setTab(g.tabs[0].key)
  }

  if (!isAdmin()) return (
    <main className="main"><div className="card"><p style={{color:'var(--red)'}}>Nur Admins können Einstellungen bearbeiten.</p></div></main>
  )
  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  const aktiveGruppe = GRUPPEN.find(g=>g.key===aktivGruppe)

  return (
    <main className="main">
      <div className="page-title">⚙️ Einstellungen</div>
      <p className="page-subtitle">Kategorien, Status, Event-Arten und weitere Konfigurationen</p>

      {/* Gruppen-Navigation */}
      <div style={{ display:'flex', gap:8, marginBottom:4, flexWrap:'wrap' }}>
        {GRUPPEN.map(g => (
          <button key={g.key} onClick={()=>switchGruppe(g.key)}
            style={{ padding:'10px 20px', borderRadius:'var(--radius)', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, transition:'all 0.15s',
              background: aktivGruppe===g.key ? g.farbe : 'var(--gray-100)',
              color: aktivGruppe===g.key ? 'white' : 'var(--gray-600)',
              boxShadow: aktivGruppe===g.key ? '0 2px 8px '+g.farbe+'44' : 'none',
            }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Sub-Tabs der aktiven Gruppe */}
      {aktiveGruppe && aktiveGruppe.tabs.length > 1 && (
        <div className="tabs" style={{ marginBottom:20, borderColor: aktiveGruppe.farbe+'33' }}>
          {aktiveGruppe.tabs.map(t => (
            <button key={t.key} className={`tab-btn${tab===t.key?' active':''}`} onClick={()=>setTab(t.key)}
              style={ tab===t.key ? { color:aktiveGruppe.farbe, borderBottomColor:aktiveGruppe.farbe } : {} }>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Panels */}
      <div style={{ marginTop: aktiveGruppe?.tabs.length===1 ? 20 : 0 }}>

        {/* CRM */}
        {tab==='kategorien'   && <VerwaltungsBlock titel="Kontakt-Kategorien"   items={kategorien}   onSave={katCRUD.save}    onDelete={katCRUD.delete}    onToggle={katCRUD.toggle}    felder={['farbe']}/>}
        {tab==='status'       && <VerwaltungsBlock titel="Kontakt-Status"        items={status}       onSave={statusCRUD.save} onDelete={statusCRUD.delete} onToggle={statusCRUD.toggle} felder={['farbe']}/>}
        {tab==='klauseln'     && <KlauselnVerwaltung/>}

        {/* Events */}
        {tab==='event-arten'   && <VerwaltungsBlock titel="Event-Arten"           items={eventArten}   onSave={eArtenCRUD.save}  onDelete={eArtenCRUD.delete}  onToggle={eArtenCRUD.toggle}  felder={['farbe']}/>}
        {tab==='event-status'  && <VerwaltungsBlock titel="Event-Status"          items={eventStatus}  onSave={eStatusCRUD.save} onDelete={eStatusCRUD.delete} onToggle={eStatusCRUD.toggle} felder={['farbe']}/>}
        {tab==='dl-typen'      && <VerwaltungsBlock titel="Dienstleister-Typen"   items={dlTypen}      onSave={dlTypenCRUD.save} onDelete={dlTypenCRUD.delete} onToggle={dlTypenCRUD.toggle} felder={[]}/>}
        {tab==='dl-artikel'    && <VerwaltungsBlock titel="Dienstleistungsartikel" items={dlArtikel}   onSave={dlArtikelCRUD.save} onDelete={dlArtikelCRUD.delete} onToggle={dlArtikelCRUD.toggle} felder={['einheit','kategorie','beschreibung']}/>}
        {tab==='raenge'        && <VerwaltungsBlock titel="Ränge" items={raenge} onSave={raengeCRUD.save} onDelete={raengeCRUD.delete} onToggle={raengeCRUD.toggle} felder={[]}/>}
        {tab==='fk-kategorien' && <VerwaltungsBlock titel="Fähigkeits-Kategorien (Freiwillige)" items={fkKategorien} onSave={fkKatCRUD.save} onDelete={fkKatCRUD.delete} onToggle={fkKatCRUD.toggle} felder={[]}/>}
        {tab==='pos-kategorien'&& <VerwaltungsBlock titel="Positions-Kategorien (Events)" items={posKategorien} onSave={posKatCRUD.save} onDelete={posKatCRUD.delete} onToggle={posKatCRUD.toggle} felder={[]}/>}

        {/* Media */}
        {tab==='mannschaften' && <MannschaftenPanel/>}
        {tab==='media-kat'    && <MediaKategorienPanel/>}
        {tab==='hc-teams'     && <HCTeamsPanel/>}

        {/* System */}
        {tab==='mannschaften-verw' && <MannschaftenPanel/>}
        {tab==='spielerstatus'     && <SpielerstatusPanel/>}
        {tab==='training-konf'      && <TrainingsKonfigPanel/>}
        {tab==='verletzungsstatus'  && <VerletzungsstatusPanel/>}
        {tab==='behandler'         && <BehandlerPanel/>}
        {tab==='gegner'            && <GegnerTabPanel/>}

        {tab==='info' && (
          <div className="card">
            <div className="section-title" style={{marginBottom:16}}>System-Information</div>
            <div style={{display:'grid',gap:12}}>
              {[['CRM Version','2.2'],['Datenbank','Supabase (PostgreSQL)'],['Hosting','Vercel'],['Verein','HC Bremen'],['Media Hub','aktiv']].map(([label,value]) => (
                <div key={label} style={{display:'flex',gap:16,padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                  <span style={{fontSize:13,color:'var(--gray-600)',width:160,flexShrink:0}}>{label}</span>
                  <span style={{fontSize:13,fontWeight:500}}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
