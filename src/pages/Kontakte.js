import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_LIST = ['Offen','Eingeladen','Zugesagt','Absage','Aktiver Sponsor','Ehemaliger Sponsor']
const KAT_LIST = ['Sponsor','Foerderverein','Medien','Werbeagentur','Kontakt','Sonstige']
const BADGE_MAP = { 'Zugesagt':'badge-zugesagt','Eingeladen':'badge-eingeladen','Offen':'badge-offen','Absage':'badge-absage','Aktiver Sponsor':'badge-aktiv','Ehemaliger Sponsor':'badge-ehemaliger' }
const EMPTY = { firma:'', email:'', telefon:'', rolle_position:'', status:'Offen', kategorie:'Sponsor', zustaendig:'', notiz:'' }

export default function Kontakte() {
  const [kontakte, setKontakte] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [katFilter, setKatFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [personen, setPersonen] = useState([])
  const fileRef = useRef()
  const navigate = useNavigate()

  useEffect(() => { load() }, [])
  useEffect(() => { applyFilter() }, [kontakte, search, statusFilter, katFilter])

  async function load() {
    const [{ data: k }, { data: p }] = await Promise.all([
      supabase.from('kontakte').select('*').order('firma'),
      supabase.from('personen').select('*').eq('aktiv', true).order('name')
    ])
    setKontakte(k || [])
    setPersonen(p || [])
    setLoading(false)
  }

  function applyFilter() {
    let r = kontakte
    if (search) { const q = search.toLowerCase(); r = r.filter(k => k.firma?.toLowerCase().includes(q) || k.person_1?.toLowerCase().includes(q) || k.person_2?.toLowerCase().includes(q)) }
    if (statusFilter) r = r.filter(k => k.status === statusFilter)
    if (katFilter) r = r.filter(k => k.kategorie === katFilter)
    setFiltered(r)
  }

  function openNew() { setForm(EMPTY); setLogoFile(null); setLogoPreview(null); setModal(true) }
  function openEdit(k, e) {
    e.stopPropagation()
    setForm({ id:k.id, firma:k.firma||'', email:k.email||'', telefon:k.telefon||'', rolle_position:k.rolle_position||'', status:k.status||'Offen', kategorie:k.kategorie||'Sponsor', zustaendig:k.zustaendig||'', notiz:k.notiz||'', logo_url:k.logo_url||null })
    setLogoPreview(k.logo_url || null)
    setLogoFile(null)
    setModal(true)
  }

  function handleLogoChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  async function save() {
    if (!form.firma.trim()) return
    setSaving(true)
    let logo_url = form.logo_url || null
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data: up } = await supabase.storage.from('logos').upload(path, logoFile, { upsert: true })
      if (up) {
        const { data: pub } = supabase.storage.from('logos').getPublicUrl(up.path)
        logo_url = pub.publicUrl
      }
    }
    const payload = { firma:form.firma, email:form.email||null, telefon:form.telefon||null, rolle_position:form.rolle_position||null, status:form.status, kategorie:form.kategorie, zustaendig:form.zustaendig||null, notiz:form.notiz||null, logo_url, geaendert_am:new Date().toISOString() }
    if (form.id) await supabase.from('kontakte').update(payload).eq('id', form.id)
    else await supabase.from('kontakte').insert(payload)
    setModal(false); setSaving(false); load()
  }

  async function remove(id, e) {
    e.stopPropagation()
    if (!window.confirm('Kontakt wirklich loeschen?')) return
    await supabase.from('kontakte').delete().eq('id', id); load()
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <main className="main">
      <div className="page-title">Kontakte</div>
      <p className="page-subtitle">{filtered.length} von {kontakte.length} Kontakten</p>

      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input placeholder="Firma suchen..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Alle Status</option>
          {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={katFilter} onChange={e => setKatFilter(e.target.value)}>
          <option value="">Alle Kategorien</option>
          {KAT_LIST.map(k => <option key={k}>{k}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openNew}>+ Neuer Kontakt</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Firma</th><th>Status</th><th>Kategorie</th><th>Zustaendig</th><th>Notiz</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan="6"><div className="empty-state"><p>Keine Ergebnisse.</p></div></td></tr>
              : filtered.map(k => (
                <tr key={k.id} onClick={() => navigate('/kontakte/'+k.id)}>
                  <td>
                    <div className="firma-cell">
                      {k.logo_url
                        ? <img src={k.logo_url} alt="" className="firma-logo-sm" />
                        : <div className="firma-logo-placeholder">{k.firma?.[0] || '?'}</div>
                      }
                      <strong>{k.firma}</strong>
                    </div>
                  </td>
                  <td><span className={'badge '+(BADGE_MAP[k.status]||'')}>{k.status}</span></td>
                  <td style={{fontSize:13,color:'var(--gray-600)'}}>{k.kategorie}</td>
                  <td style={{fontSize:13,color:'var(--gray-600)'}}>{k.zustaendig||'--'}</td>
                  <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13,color:'var(--gray-600)'}}>{k.notiz}</td>
                  <td style={{whiteSpace:'nowrap'}}>
                    <button className="btn btn-sm btn-outline" onClick={e => openEdit(k, e)}>Bearb.</button>
                    {' '}
                    <button className="btn btn-sm btn-danger" onClick={e => remove(k.id, e)}>X</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{form.id ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</span>
              <button className="close-btn" onClick={() => setModal(false)}>x</button>
            </div>
            <div className="modal-body">

              {/* Logo */}
              <div className="form-group">
                <label>Firmenlogo</label>
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" className="logo-preview" />
                    : <div className="firma-logo-placeholder" style={{width:64,height:64,fontSize:24}}>{form.firma?.[0] || '?'}</div>
                  }
                  <div>
                    <button className="btn btn-outline btn-sm" onClick={() => fileRef.current.click()}>
                      {logoPreview ? 'Logo aendern' : 'Logo hochladen'}
                    </button>
                    {logoPreview && (
                      <button style={{marginLeft:8,color:'var(--red)',background:'none',border:'none',cursor:'pointer',fontSize:14}}
                        onClick={() => { setLogoPreview(null); setLogoFile(null); setForm(f => ({...f, logo_url: null})) }}>
                        Entfernen
                      </button>
                    )}
                    <p style={{fontSize:12,color:'var(--gray-400)',marginTop:6}}>PNG, JPG, SVG – max. 2 MB</p>
                  </div>
                  <input type="file" ref={fileRef} accept="image/*" style={{display:'none'}} onChange={handleLogoChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>Firma *</label><input value={form.firma} onChange={e=>setForm(f=>({...f,firma:e.target.value}))} /></div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {STATUS_LIST.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>Kategorie</label>
                  <select value={form.kategorie} onChange={e=>setForm(f=>({...f,kategorie:e.target.value}))}>
                    {KAT_LIST.map(k=><option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Zustaendig (intern)</label>
                  <select value={form.zustaendig||''} onChange={e=>setForm(f=>({...f,zustaendig:e.target.value}))}>
                    <option value="">-- Bitte waehlen --</option>
                    {personen.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group"><label>E-Mail</label><input type="email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
                <div className="form-group"><label>Telefon</label><input value={form.telefon||''} onChange={e=>setForm(f=>({...f,telefon:e.target.value}))} /></div>
              </div>

              <div className="form-group"><label>Notiz</label><textarea value={form.notiz||''} onChange={e=>setForm(f=>({...f,notiz:e.target.value}))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
