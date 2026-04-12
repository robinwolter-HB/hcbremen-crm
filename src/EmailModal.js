import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function EmailModal({ onClose, vorausgefuellt = {} }) {
  const [to, setTo] = useState(vorausgefuellt.to || '')
  const [subject, setSubject] = useState(vorausgefuellt.subject || '')
  const [body, setBody] = useState(vorausgefuellt.body || '')
  const [kontaktId, setKontaktId] = useState(vorausgefuellt.kontakt_id || '')
  const [kontaktFirma, setKontaktFirma] = useState(vorausgefuellt.kontakt_firma || '')
  const [kontakte, setKontakte] = useState([])
  const [ansprechpartner, setAnsprechpartner] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [mehrere, setMehrere] = useState(vorausgefuellt.mehrere || false)
  const [selectedKontakte, setSelectedKontakte] = useState(vorausgefuellt.selectedKontakte || [])
  const [kontaktFilter, setKontaktFilter] = useState('')

  useEffect(() => {
    loadKontakte()
    if (kontaktId) loadAnsprechpartner(kontaktId)
  }, [])

  async function loadKontakte() {
    const { data } = await supabase.from('kontakte').select('id,firma,email').order('firma')
    setKontakte(data || [])
  }

  async function loadAnsprechpartner(kid) {
    const { data } = await supabase.from('ansprechpartner').select('*').eq('kontakt_id', kid)
    setAnsprechpartner(data || [])
  }

  async function send() {
    const empfaenger = mehrere
      ? selectedKontakte.map(k => k.email).filter(Boolean)
      : to.split(',').map(e => e.trim()).filter(Boolean)

    if (empfaenger.length === 0) { setError('Bitte mindestens eine E-Mail-Adresse eingeben'); return }
    if (!subject) { setError('Betreff fehlt'); return }
    if (!body) { setError('Nachricht fehlt'); return }

    setSending(true); setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          to: empfaenger,
          subject,
          body,
          kontakt_id: kontaktId || null,
          kontakt_firma: kontaktFirma || null
        })
      })

      const result = await res.json()
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => { setSuccess(false); onClose() }, 2000)
      }
    } catch (e) {
      setError('Verbindungsfehler: ' + e.message)
    }
    setSending(false)
  }

  const gefiltert = kontakte.filter(k =>
    k.firma.toLowerCase().includes(kontaktFilter.toLowerCase()) ||
    (k.email || '').toLowerCase().includes(kontaktFilter.toLowerCase())
  )

  function toggleKontakt(k) {
    setSelectedKontakte(prev =>
      prev.find(p => p.id === k.id) ? prev.filter(p => p.id !== k.id) : [...prev, k]
    )
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <span className="modal-title">E-Mail senden</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ E-Mail erfolgreich gesendet!</div>}
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Einzel oder Mehrfach */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <button onClick={() => setMehrere(false)} className={'btn btn-sm '+(mehrere?'btn-outline':'btn-primary')}>Einzelne E-Mail</button>
            <button onClick={() => setMehrere(true)} className={'btn btn-sm '+(mehrere?'btn-primary':'btn-outline')}>Rundmail / Mehrere</button>
          </div>

          {mehrere ? (
            <div className="form-group">
              <label>Empfaenger auswaehlen ({selectedKontakte.length} ausgewaehlt)</label>
              <input value={kontaktFilter} onChange={e => setKontaktFilter(e.target.value)}
                placeholder="Firma oder E-Mail suchen..."
                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', fontSize:14, marginBottom:8 }}/>
              <div style={{ maxHeight:200, overflowY:'auto', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)' }}>
                {gefiltert.filter(k => k.email).map(k => (
                  <label key={k.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                    borderBottom:'1px solid var(--gray-100)', cursor:'pointer',
                    background: selectedKontakte.find(s => s.id === k.id) ? 'rgba(15,34,64,0.04)' : 'transparent' }}>
                    <input type="checkbox" checked={!!selectedKontakte.find(s => s.id === k.id)} onChange={() => toggleKontakt(k)} style={{ width:16, height:16 }}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{k.firma}</div>
                      <div style={{ fontSize:12, color:'var(--gray-400)' }}>{k.email}</div>
                    </div>
                  </label>
                ))}
                {gefiltert.filter(k => k.email).length === 0 && (
                  <div style={{ padding:16, textAlign:'center', color:'var(--gray-400)', fontSize:13 }}>Keine Kontakte mit E-Mail gefunden.</div>
                )}
              </div>
              {selectedKontakte.length > 0 && (
                <div style={{ marginTop:8, fontSize:12, color:'var(--gray-600)' }}>
                  An: {selectedKontakte.map(k => k.firma).join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="form-group">
                <label>Kontakt (optional)</label>
                <select value={kontaktId} onChange={e => {
                  const k = kontakte.find(k => k.id === e.target.value)
                  setKontaktId(e.target.value)
                  setKontaktFirma(k?.firma || '')
                  if (k?.email) setTo(k.email)
                  if (e.target.value) loadAnsprechpartner(e.target.value)
                }}>
                  <option value="">-- Kein Kontakt --</option>
                  {kontakte.map(k => <option key={k.id} value={k.id}>{k.firma}</option>)}
                </select>
              </div>

              {ansprechpartner.length > 0 && (
                <div className="form-group">
                  <label>Ansprechpartner</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {ansprechpartner.map(ap => ap.email && (
                      <button key={ap.id} onClick={() => setTo(ap.email)} className="btn btn-sm btn-outline"
                        style={{ background: to === ap.email ? 'var(--navy)' : '', color: to === ap.email ? 'white' : '' }}>
                        {ap.name} ({ap.email})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>An (E-Mail) *</label>
                <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="name@firma.de"/>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Betreff *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Betreff der E-Mail"/>
          </div>

          <div className="form-group">
            <label>Nachricht *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} style={{ minHeight:180 }}
              placeholder="Schreibe deine Nachricht hier..."/>
          </div>

          <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:-8 }}>
            Die E-Mail wird automatisch in der Kontakthistorie gespeichert.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={send} disabled={sending}>
            {sending ? 'Senden...' : '✉️ E-Mail senden'}
          </button>
        </div>
      </div>
    </div>
  )
}
