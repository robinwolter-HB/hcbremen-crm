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
          border: value===f ? '3px solid var(--text)' : '2px solid transparent',
          boxSizing:'border-box'
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
    if (!form.name?.trim()) return
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
        {items.sort((a,b)=>a.reihenfolge-b.reihenfolge).map(item => (
          <div key={item.id} style={{
            display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
            border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)',
            opacity: item.aktiv ? 1 : 0.5, background:'var(--white)'
          }}>
            {item.farbe && <div style={{ width:14, height:14, borderRadius:'50%', background:item.farbe, flexShrink:0 }}/>}
            <span style={{ flex:1, fontWeight:500, fontSize:14 }}>{item.name}</span>
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
              <button className="close-btn" onClick={()=>setModal(false)}>×</button>
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

export default function Einstellungen() {
  const { isAdmin } = useAuth()
  const [kategorien, setKategorien] = useState([])
  const [status, setStatus] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('kategorien')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: k }, { data: s }] = await Promise.all([
      supabase.from('kontakt_kategorien').select('*').order('reihenfolge'),
      supabase.from('crm_status').select('*').order('reihenfolge')
    ])
    setKategorien(k || [])
    setStatus(s || [])
    setLoading(false)
  }

  // Kategorien CRUD
  async function saveKategorie(form) {
    const payload = { name:form.name, farbe:form.farbe||'#2d6fa3', reihenfolge:form.reihenfolge||0 }
    if (form.id) await supabase.from('kontakt_kategorien').update(payload).eq('id', form.id)
    else await supabase.from('kontakt_kategorien').insert(payload)
    load()
  }
  async function deleteKategorie(id) { await supabase.from('kontakt_kategorien').delete().eq('id', id); load() }
  async function toggleKategorie(item) { await supabase.from('kontakt_kategorien').update({ aktiv: !item.aktiv }).eq('id', item.id); load() }

  // Status CRUD
  async function saveStatus(form) {
    const payload = { name:form.name, farbe:form.farbe||'#9a9590', reihenfolge:form.reihenfolge||0 }
    if (form.id) await supabase.from('crm_status').update(payload).eq('id', form.id)
    else await supabase.from('crm_status').insert(payload)
    load()
  }
  async function deleteStatus(id) { await supabase.from('crm_status').delete().eq('id', id); load() }
  async function toggleStatus(item) { await supabase.from('crm_status').update({ aktiv: !item.aktiv }).eq('id', item.id); load() }

  if (!isAdmin()) return (
    <main className="main">
      <div className="card"><p style={{color:'var(--red)'}}>Nur Admins koennen Einstellungen bearbeiten.</p></div>
    </main>
  )

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div className="page-title">Einstellungen</div>
      <p className="page-subtitle">Kategorien, Status und weitere Konfigurationen</p>

      <div className="tabs">
        {[['kategorien','Kontakt-Kategorien'],['status','Kontakt-Status'],['info','Info & Version']].map(([key,label]) => (
          <button key={key} className={'tab-btn'+(tab===key?' active':'')} onClick={()=>setTab(key)}>{label}</button>
        ))}
      </div>

      {tab==='kategorien' && (
        <VerwaltungsBlock
          titel="Kontakt-Kategorien"
          items={kategorien}
          onSave={saveKategorie}
          onDelete={deleteKategorie}
          onToggle={toggleKategorie}
          felder={['farbe']}
        />
      )}

      {tab==='status' && (
        <VerwaltungsBlock
          titel="Kontakt-Status"
          items={status}
          onSave={saveStatus}
          onDelete={deleteStatus}
          onToggle={toggleStatus}
          felder={['farbe']}
        />
      )}

      {tab==='info' && (
        <div className="card">
          <div className="section-title" style={{marginBottom:16}}>System-Information</div>
          <div style={{display:'grid',gap:12}}>
            {[
              ['CRM Version','2.0'],
              ['Datenbank','Supabase (PostgreSQL)'],
              ['Hosting','Netlify'],
              ['Verein','HC Bremen'],
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
