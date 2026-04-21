import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const BERICHT_TYPEN = {
  erstdiagnose: { label: 'Erstdiagnose',  farbe: '#d94f4f', icon: '🏥' },
  untersuchung: { label: 'Untersuchung',  farbe: '#2d6fa3', icon: '🔍' },
  behandlung:   { label: 'Behandlung',    farbe: '#3a8a5a', icon: '💊' },
  reha:         { label: 'Reha',          farbe: '#e07b30', icon: '🏃' },
  kontrolle:    { label: 'Kontrolle',     farbe: '#8b5cf6', icon: '📋' },
  entlassung:   { label: 'Entlassung',    farbe: '#3a8a5a', icon: '✅' },
  sonstiges:    { label: 'Sonstiges',     farbe: '#9a9590', icon: '📎' },
}

const SCHWER_STIL = {
  leicht:   { bg: '#e2efda', text: '#2d6b3a' },
  mittel:   { bg: '#fff3cd', text: '#8a6a00' },
  schwer:   { bg: '#fce4d6', text: '#8a3a1a' },
  kritisch: { bg: '#fce4d6', text: '#d94f4f' },
}

const DATEI_TYPEN = ['mrt','roentgen','ultraschall','pdf','bild','sonstiges']
const DATEI_ICONS = { mrt:'🧲', roentgen:'☢️', ultraschall:'〰️', pdf:'📄', bild:'🖼️', sonstiges:'📎' }

export default function VerletzungsAkte({ verletzungId, spielerName, onClose }) {
  const { profile } = useAuth()
  const isBehandler = profile?.rolle === 'behandler'
  const isManager   = profile?.ist_manager || profile?.rolle === 'admin'

  const [verletzung, setVerletzung]         = useState(null)
  const [berichte, setBerichte]             = useState([])
  const [dateien, setDateien]               = useState([])
  const [behandlerListe, setBehandlerListe] = useState([])   // alle Behandler im System
  const [zugeordnet, setZugeordnet]         = useState([])   // dieser Verletzung zugeordnet
  const [loading, setLoading]               = useState(true)
  const [showBerichtForm, setShowBerichtForm] = useState(false)
  const [showBehandlerForm, setShowBehandlerForm] = useState(false)
  const [uploading, setUploading]           = useState(false)
  const [aktiverBericht, setAktiverBericht] = useState(null) // für Datei-Upload
  const fileRef = useRef()

  const [berichtForm, setBerichtForm] = useState({
    typ: 'untersuchung', titel: '', bericht: '', befund: '',
    naechster_termin: '', behandler_id: '', datum: new Date().toISOString().split('T')[0],
  })

  useEffect(() => { load() }, [verletzungId])

  async function load() {
    setLoading(true)
    const [{ data: v }, { data: b }, { data: d }, { data: bl }, { data: z }] = await Promise.all([
      supabase.from('spieler_verletzungen').select('*').eq('id', verletzungId).single(),
      supabase.from('verletzungs_berichte')
        .select('*, behandler:behandler_id(vorname,nachname,rolle), autor:autor_id(name)')
        .eq('verletzung_id', verletzungId)
        .order('datum', { ascending: false }),
      supabase.from('verletzungs_dateien')
        .select('*, hochgeladen_von:hochgeladen_von(name)')
        .eq('verletzung_id', verletzungId)
        .order('erstellt_am', { ascending: false }),
      supabase.from('behandler').select('*').eq('aktiv', true).order('nachname'),
      supabase.from('verletzung_behandler')
        .select('*, behandler:behandler_id(id,vorname,nachname,rolle,spezialisierung,telefon,email)')
        .eq('verletzung_id', verletzungId),
    ])
    setVerletzung(v)
    setBerichte(b || [])
    setDateien(d || [])
    setBehandlerListe(bl || [])
    setZugeordnet(z || [])
    setLoading(false)
  }

  async function berichtSpeichern() {
    if (!berichtForm.titel.trim()) return
    await supabase.from('verletzungs_berichte').insert({
      ...berichtForm,
      verletzung_id: verletzungId,
      autor_id: profile.id,
      behandler_id: berichtForm.behandler_id || null,
      naechster_termin: berichtForm.naechster_termin || null,
    })
    setBerichtForm({ typ:'untersuchung', titel:'', bericht:'', befund:'', naechster_termin:'', behandler_id:'', datum: new Date().toISOString().split('T')[0] })
    setShowBerichtForm(false)
    load()
  }

  async function behandlerZuordnen(behandlerId) {
    await supabase.from('verletzung_behandler').insert({
      verletzung_id: verletzungId,
      behandler_id: behandlerId,
    })
    load()
  }

  async function behandlerEntfernen(id) {
    await supabase.from('verletzung_behandler').delete().eq('id', id)
    load()
  }

  async function dateiHochladen(e, berichtId) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase()
      const pfad = `verletzungen/${verletzungId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('verletzungs-dateien').upload(pfad, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('verletzungs-dateien').getPublicUrl(pfad)
        const dateiTyp = ['pdf'].includes(ext) ? 'pdf' : ['jpg','jpeg','png','webp'].includes(ext) ? 'bild' : 'sonstiges'
        await supabase.from('verletzungs_dateien').insert({
          bericht_id: berichtId,
          verletzung_id: verletzungId,
          datei_url: publicUrl,
          datei_name: file.name,
          datei_typ: dateiTyp,
          datei_groesse: file.size,
          hochgeladen_von: profile.id,
        })
      }
    }
    setUploading(false)
    load()
  }

  async function dateiLoeschen(id) {
    await supabase.from('verletzungs_dateien').delete().eq('id', id)
    load()
  }

  async function verletzungHeilen() {
    if (!window.confirm('Verletzung als geheilt markieren?')) return
    await supabase.from('spieler_verletzungen').update({ datum_genesung: new Date().toISOString().split('T')[0] }).eq('id', verletzungId)
    // Prüfen ob noch aktive Verletzungen
    const { data } = await supabase.from('spieler_verletzungen').select('id').eq('spieler_id', verletzung.spieler_id).is('datum_genesung', null)
    if (!data?.filter(v => v.id !== verletzungId).length) {
      await supabase.from('spieler').update({ status: 'aktiv' }).eq('id', verletzung.spieler_id)
    }
    load()
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!verletzung) return null

  const aktivBehandler = !verletzung.datum_genesung
  const tageSeit = Math.floor((Date.now() - new Date(verletzung.datum_verletzung)) / (1000*60*60*24))
  const dateitenNachBericht = (berichtId) => dateien.filter(d => d.bericht_id === berichtId)
  const schwSt = SCHWER_STIL[verletzung.schweregrad] || SCHWER_STIL.mittel

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontSize: 20, color: 'var(--navy)', margin: 0, fontFamily: '"DM Serif Display",serif' }}>
                {verletzung.diagnose}
              </h2>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: schwSt.bg, color: schwSt.text }}>
                {verletzung.schweregrad}
              </span>
              {aktivBehandler
                ? <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: '#fce4d6', color: '#8a3a1a' }}>🏥 Aktiv</span>
                : <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: '#e2efda', color: '#2d6b3a' }}>✅ Abgeheilt</span>
              }
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray-600)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>👤 {spielerName}</span>
              {verletzung.koerperteil && <span>📍 {verletzung.koerperteil}</span>}
              <span>📅 seit {new Date(verletzung.datum_verletzung).toLocaleDateString('de-DE')} ({tageSeit} Tage)</span>
              {verletzung.datum_genesung && <span>✅ Genesen: {new Date(verletzung.datum_genesung).toLocaleDateString('de-DE')}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {aktivBehandler && !isBehandler && (
              <button onClick={verletzungHeilen} className="btn btn-sm" style={{ background: '#e2efda', color: '#2d6b3a', border: 'none' }}>
                ✓ Als geheilt markieren
              </button>
            )}
            {onClose && <button onClick={onClose} className="close-btn">×</button>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'flex-start' }}>
        {/* Linke Seite: Berichte-Timeline */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, color: 'var(--navy)', margin: 0 }}>📋 Behandlungsakte ({berichte.length} Einträge)</h3>
            <button onClick={() => setShowBerichtForm(true)} className="btn btn-primary">+ Bericht hinzufügen</button>
          </div>

          {/* Bericht-Formular */}
          {showBerichtForm && (
            <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--navy)' }}>
              <h4 style={{ fontSize: 14, color: 'var(--navy)', marginBottom: 14 }}>Neuer Behandlungsbericht</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Typ</label>
                  <select value={berichtForm.typ} onChange={e=>setBerichtForm(p=>({...p,typ:e.target.value}))}>
                    {Object.entries(BERICHT_TYPEN).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Datum</label>
                  <input type="date" value={berichtForm.datum} onChange={e=>setBerichtForm(p=>({...p,datum:e.target.value}))} />
                </div>
              </div>
              <div className="form-group"><label>Titel *</label><input value={berichtForm.titel} onChange={e=>setBerichtForm(p=>({...p,titel:e.target.value}))} placeholder="z.B. MRT-Kontrolle Knie" autoFocus /></div>
              <div className="form-group">
                <label>Behandler</label>
                <select value={berichtForm.behandler_id} onChange={e=>setBerichtForm(p=>({...p,behandler_id:e.target.value}))}>
                  <option value="">Kein Behandler</option>
                  {behandlerListe.map(b => <option key={b.id} value={b.id}>{b.vorname} {b.nachname} ({b.rolle})</option>)}
                </select>
              </div>
              <div className="form-group"><label>Befund</label><textarea value={berichtForm.befund} onChange={e=>setBerichtForm(p=>({...p,befund:e.target.value}))} rows={2} placeholder="Medizinischer Befund / Diagnose…" /></div>
              <div className="form-group"><label>Bericht / Notizen</label><textarea value={berichtForm.bericht} onChange={e=>setBerichtForm(p=>({...p,bericht:e.target.value}))} rows={4} placeholder="Behandlungsverlauf, Empfehlungen, Beobachtungen…" /></div>
              <div className="form-group"><label>Nächster Termin</label><input type="date" value={berichtForm.naechster_termin} onChange={e=>setBerichtForm(p=>({...p,naechster_termin:e.target.value}))} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={berichtSpeichern} className="btn btn-primary">Speichern</button>
                <button onClick={() => setShowBerichtForm(false)} className="btn btn-outline">Abbrechen</button>
              </div>
            </div>
          )}

          {/* Timeline */}
          {berichte.length === 0 ? (
            <div className="empty-state card"><p>Noch keine Berichte. Füge den ersten Behandlungsbericht hinzu.</p></div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertikale Linie */}
              <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: 'var(--gray-200)', zIndex: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {berichte.map((b, idx) => {
                  const bt = BERICHT_TYPEN[b.typ] || BERICHT_TYPEN.sonstiges
                  const bDateien = dateitenNachBericht(b.id)
                  return (
                    <div key={b.id} style={{ display: 'flex', gap: 16, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                      {/* Icon Bullet */}
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: bt.farbe, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '3px solid white' }}>
                        {bt.icon}
                      </div>

                      {/* Inhalt */}
                      <div className="card" style={{ flex: 1, marginBottom: 0, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: bt.farbe+'20', color: bt.farbe }}>{bt.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{b.titel}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--gray-400)', display: 'flex', gap: 10 }}>
                              <span>📅 {new Date(b.datum).toLocaleDateString('de-DE')}</span>
                              {b.behandler && <span>👨‍⚕️ {b.behandler.vorname} {b.behandler.nachname}</span>}
                              {b.autor && !b.behandler && <span>✍️ {b.autor.name}</span>}
                            </div>
                          </div>
                        </div>

                        {b.befund && (
                          <div style={{ background: '#f0f7ff', borderLeft: '3px solid #2d6fa3', padding: '8px 12px', borderRadius: '0 var(--radius) var(--radius) 0', marginBottom: 8, fontSize: 13 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#2d6fa3', marginBottom: 3 }}>BEFUND</div>
                            <div style={{ color: 'var(--text)', lineHeight: 1.5 }}>{b.befund}</div>
                          </div>
                        )}

                        {b.bericht && (
                          <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 8 }}>{b.bericht}</div>
                        )}

                        {b.naechster_termin && (
                          <div style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600 }}>
                            📅 Nächster Termin: {new Date(b.naechster_termin).toLocaleDateString('de-DE')}
                          </div>
                        )}

                        {/* Dateien dieses Berichts */}
                        {bDateien.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
                            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 6 }}>ANHÄNGE ({bDateien.length})</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {bDateien.map(d => (
                                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--gray-100)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                                  <span>{DATEI_ICONS[d.datei_typ] || '📎'}</span>
                                  <a href={d.datei_url} target="_blank" rel="noreferrer" style={{ color: 'var(--navy)', textDecoration: 'none', fontWeight: 500 }}>
                                    {d.datei_name.length > 25 ? d.datei_name.slice(0, 22) + '…' : d.datei_name}
                                  </a>
                                  <button onClick={() => dateiLoeschen(d.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Datei hochladen */}
                        <div style={{ marginTop: 8 }}>
                          <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', fontSize: 11 }}>
                            {uploading ? 'Hochladen…' : '📎 Datei anhängen'}
                            <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
                              onChange={e => dateiHochladen(e, b.id)} />
                          </label>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rechte Seite: Behandlungsteam */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, color: 'var(--navy)', margin: 0 }}>👨‍⚕️ Behandlungsteam</h4>
              <button onClick={() => setShowBehandlerForm(!showBehandlerForm)} className="btn btn-sm btn-outline">+ Hinzufügen</button>
            </div>

            {showBehandlerForm && (
              <div style={{ marginBottom: 12 }}>
                <select style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 6 }}
                  onChange={e => { if (e.target.value) { behandlerZuordnen(e.target.value); setShowBehandlerForm(false) } }}>
                  <option value="">Behandler auswählen…</option>
                  {behandlerListe.filter(b => !zugeordnet.some(z => z.behandler_id === b.id)).map(b => (
                    <option key={b.id} value={b.id}>{b.vorname} {b.nachname} ({b.rolle})</option>
                  ))}
                </select>
              </div>
            )}

            {zugeordnet.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Noch kein Behandler zugeordnet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {zugeordnet.map(z => {
                  const b = z.behandler
                  return (
                    <div key={z.id} style={{ padding: '8px 10px', background: 'var(--gray-100)', borderRadius: 'var(--radius)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{b.vorname} {b.nachname}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                            {b.rolle}{b.spezialisierung ? ` · ${b.spezialisierung}` : ''}
                          </div>
                          {b.telefon && <div style={{ fontSize: 11, color: 'var(--navy)', marginTop: 3 }}>📞 {b.telefon}</div>}
                          {b.email && <div style={{ fontSize: 11, color: 'var(--navy)' }}>✉ {b.email}</div>}
                        </div>
                        <button onClick={() => behandlerEntfernen(z.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Alle Dateien dieser Verletzung */}
          <div className="card">
            <h4 style={{ fontSize: 14, color: 'var(--navy)', margin: '0 0 12px' }}>📁 Alle Dateien ({dateien.length})</h4>
            {dateien.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Noch keine Dateien.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dateien.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--gray-100)', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: 18 }}>{DATEI_ICONS[d.datei_typ] || '📎'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={d.datei_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--navy)', textDecoration: 'none', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.datei_name}
                      </a>
                      <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>
                        {d.datei_typ.toUpperCase()} · {new Date(d.erstellt_am).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <a href={d.datei_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--blue)', padding: '2px 6px', background: '#ddeaff', borderRadius: 4, textDecoration: 'none' }}>⬇</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
