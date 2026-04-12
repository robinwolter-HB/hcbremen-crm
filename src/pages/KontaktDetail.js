import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const BADGE_MAP = { 'Zugesagt':'badge-zugesagt','Eingeladen':'badge-eingeladen','Offen':'badge-offen','Absage':'badge-absage','Aktiver Sponsor':'badge-aktiv','Ehemaliger Sponsor':'badge-ehemaliger' }
const ART_LIST = ['Anruf','E-Mail','Meeting','Veranstaltung','WhatsApp','Brief','Sonstiges']
const EMPTY_H = { ansprechpartner:'', art:'Anruf', betreff:'', notiz:'', naechste_aktion:'', faellig_am:'', zustaendig:'', erledigt: false }

export default function KontaktDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [kontakt, setKontakt] = useState(null)
  const [historie, setHistorie] = useState([])
  const [sponsoring, setSponsoring] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_H)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('info')

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: k }, { data: h }, { data: s }] = await Promise.all([
      supabase.from('kontakte').select('*').eq('id', id).single(),
      supabase.from('kontakthistorie').select('*').eq('kontakt_id', id).order('erstellt_am', { ascending: false }),
      supabase.from('sponsoring').select('*').eq('kontakt_id', id).single()
    ])
    setKontakt(k)
    setHistorie(h || [])
    setSponsoring(s)
  }

  async function saveHistorie() {
    setSaving(true)
    const payload = { ...form, kontakt_id: id, erstellt_von: profile?.id }
    if (form.id) {
      await supabase.from('kontakthistorie').update(payload).eq('id', form.id)
    } else {
      await supabase.from('kontakthistorie').insert(payload)
    }
    setModal(false)
    setSaving(false)
    load()
  }

  async function toggleErledigt(h) {
    await supabase.from('kontakthistorie').update({ erledigt: !h.erledigt }).eq('id', h.id)
    load()
  }

  async function deleteHistorie(hid) {
    if (!window.confirm('Eintrag löschen?')) return
    await supabase.from('kontakthistorie').delete().eq('id', hid)
    load()
  }

  if (!kontakt) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <main className="main">
      <button className="back-btn" onClick={() => navigate('/kontakte')}>← Zurück zur Liste</button>

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:20}}>
            {kontakt.logo_url
              ? <img src={kontakt.logo_url} alt="Logo" style={{width:72,height:72,objectFit:'contain',borderRadius:8,border:'1px solid var(--gray-200)'}} />
              : <div style={{width:72,height:72,background:'var(--gray-100)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color:'var(--gray-400)'}}>{kontakt.firma?.[0]}</div>
            }
            <div>
              <div className="page-title" style={{marginBottom:6}}>{kontakt.firma}</div>
              <span className={`badge ${BADGE_MAP[kontakt.status]||''}`}>{kontakt.status}</span>
              <span style={{marginLeft:8,fontSize:13,color:'var(--gray-600)'}}>{kontakt.kategorie}</span>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/kontakte')}>✎ Bearbeiten</button>
        </div>

        <div className="tabs">
          {['info','historie','sponsoring'].map(t => (
            <button key={t} className={`tab-btn${tab===t?' active':''}`} onClick={() => setTab(t)}>
              {t==='info'?'Kontaktdaten':t==='historie'?`Historie (${historie.length})`:'Sponsoring'}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="detail-grid">
            {[['Person 1',kontakt.person_1],['Person 2',kontakt.person_2],['Person 3',kontakt.person_3],['E-Mail',kontakt.email],['Telefon',kontakt.telefon],['Zuständig',kontakt.zustaendig]].map(([l,v]) => v ? (
              <div key={l} className="detail-field"><label>{l}</label><span>{v}</span></div>
            ) : null)}
            {kontakt.notiz && <div className="detail-field" style={{gridColumn:'1/-1'}}><label>Notiz</label><span>{kontakt.notiz}</span></div>}
          </div>
        )}

        {tab === 'historie' && (
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button className="btn btn-primary btn-sm" onClick={() => { setForm({...EMPTY_H, zustaendig: profile?.name || ''}); setModal(true) }}>+ Neue Aktion</button>
            </div>
            {historie.length === 0
              ? <div className="empty-state"><p>Noch keine Einträge.</p></div>
              : <div className="table-wrap">
                  <table>
                    <thead><tr><th>Datum</th><th>Art</th><th>Betreff</th><th>Nächste Aktion</th><th>Fällig</th><th>Erledigt</th><th></th></tr></thead>
                    <tbody>
                      {historie.map(h => (
                        <tr key={h.id} style={{opacity: h.erledigt ? 0.6 : 1}}>
                          <td style={{whiteSpace:'nowrap'}}>{new Date(h.erstellt_am).toLocaleDateString('de-DE')}</td>
                          <td><span style={{fontSize:12,background:'var(--gray-100)',padding:'2px 8px',borderRadius:20}}>{h.art}</span></td>
                          <td><strong style={{fontSize:13}}>{h.betreff}</strong>{h.notiz && <p style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>{h.notiz}</p>}</td>
                          <td style={{fontSize:13}}>{h.naechste_aktion}</td>
                          <td style={{fontSize:13,color: h.faellig_am && !h.erledigt && new Date(h.faellig_am) < new Date() ? 'var(--red)' : 'inherit', fontWeight: h.faellig_am && !h.erledigt && new Date(h.faellig_am) < new Date() ? 600 : 400}}>
                            {h.faellig_am ? new Date(h.faellig_am).toLocaleDateString('de-DE') : '—'}
                          </td>
                          <td>
                            <button onClick={() => toggleErledigt(h)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18}}>
                              {h.erledigt ? '✅' : '⬜'}
                            </button>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline" onClick={() => { setForm(h); setModal(true) }}>Bearb.</button>
                            {' '}
                            <button className="btn btn-sm btn-danger" onClick={() => deleteHistorie(h.id)}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}

        {tab === 'sponsoring' && (
          <div>
            {sponsoring
              ? <div className="detail-grid">
                  {[['Paket',sponsoring.paket],['Jahresbetrag',sponsoring.jahresbetrag ? `${sponsoring.jahresbetrag.toLocaleString('de-DE')} €` : ''],['Vertragsbeginn',sponsoring.vertragsbeginn ? new Date(sponsoring.vertragsbeginn).toLocaleDateString('de-DE') : ''],['Vertragsende',sponsoring.vertragsende ? new Date(sponsoring.vertragsende).toLocaleDateString('de-DE') : ''],['Laufzeit',sponsoring.laufzeit_jahre ? `${sponsoring.laufzeit_jahre} Jahre` : ''],['Status',sponsoring.status],['Verlängerung',sponsoring.verlaengerung_besprochen]].map(([l,v]) => v ? (
                    <div key={l} className="detail-field"><label>{l}</label><span>{v}</span></div>
                  ) : null)}
                  {sponsoring.drive_link && <div className="detail-field"><label>Vertrag</label><span><a href={sponsoring.drive_link} target="_blank" rel="noreferrer" style={{color:'var(--blue)'}}>Öffnen</a></span></div>}
                  {sponsoring.notizen && <div className="detail-field" style={{gridColumn:'1/-1'}}><label>Notizen</label><span>{sponsoring.notizen}</span></div>}
                </div>
              : <div className="empty-state"><p>Kein Sponsoring-Vertrag hinterlegt. Im Tab Sponsoring anlegen.</p></div>
            }
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{form.id ? 'Aktion bearbeiten' : 'Neue Aktion'}</span>
              <button className="close-btn" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Art</label>
                  <select value={form.art} onChange={e=>setForm(f=>({...f,art:e.target.value}))}>
                    {ART_LIST.map(a=><option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Ansprechpartner</label><input value={form.ansprechpartner} onChange={e=>setForm(f=>({...f,ansprechpartner:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Betreff / Thema</label><input value={form.betreff} onChange={e=>setForm(f=>({...f,betreff:e.target.value}))} /></div>
              <div className="form-group"><label>Notiz / Ergebnis</label><textarea value={form.notiz} onChange={e=>setForm(f=>({...f,notiz:e.target.value}))} /></div>
              <div className="form-row">
                <div className="form-group"><label>Nächste Aktion</label><input value={form.naechste_aktion} onChange={e=>setForm(f=>({...f,naechste_aktion:e.target.value}))} /></div>
                <div className="form-group"><label>Fällig am</label><input type="date" value={form.faellig_am} onChange={e=>setForm(f=>({...f,faellig_am:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Zuständig (intern)</label><input value={form.zustaendig} onChange={e=>setForm(f=>({...f,zustaendig:e.target.value}))} /></div>
                <div className="form-group"><label>Erledigt</label>
                  <select value={form.erledigt ? 'Ja' : 'Nein'} onChange={e=>setForm(f=>({...f,erledigt:e.target.value==='Ja'}))}>
                    <option>Nein</option><option>Ja</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveHistorie} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
