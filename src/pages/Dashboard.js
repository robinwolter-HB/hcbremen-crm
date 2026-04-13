import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const navigate = useNavigate()
  const [saisons, setSaisons] = useState([])
  const [selectedSaison, setSelectedSaison] = useState(null)
  const [vertraege, setVertraege] = useState([])
  const [alleVertraege, setAlleVertraege] = useState([])
  const [aufgaben, setAufgaben] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [ziel, setZiel] = useState(50000)
  const [zielEdit, setZielEdit] = useState(false)
  const [evSumme, setEvSumme] = useState(0)
  const [evAnzahl, setEvAnzahl] = useState(0)

  useEffect(() => { load() }, [])
  useEffect(() => { if (selectedSaison) filterBySaison() }, [selectedSaison, alleVertraege])

  async function load() {
    const [{ data: s },{ data: v },{ data: a },{ data: e },{ data: ev }] = await Promise.all([
      supabase.from('saisons').select('*').order('beginn', { ascending: false }),
      supabase.from('sponsoring').select('*,kontakte(id,firma,logo_url),saisons(name),sponsoring_pakete(name),sponsoring_saisons(saison_id)').order('erstellt_am', { ascending: false }),
      supabase.from('kontakthistorie').select('*,kontakte(firma)').eq('erledigt', false).not('faellig_am', 'is', null).lte('faellig_am', new Date().toISOString().split('T')[0]),
      supabase.from('veranstaltungen').select('*').order('datum', { ascending: false }).limit(5),
      supabase.from('sponsoring').select('*,kontakte(firma)').eq('ist_ev', true)
    ])
    setSaisons(s || [])
    setAlleVertraege(v || [])
    setEvents(e || [])
    setAufgaben(a || [])
    const evGeld = (ev || []).reduce((s, v) => s + (Number(v.jahresbetrag) || 0), 0)
    setEvSumme(evGeld)
    setEvAnzahl((ev || []).filter(v => v.status === 'Aktiv').length)
    const aktiv = s?.find(x => x.aktiv)
    if (aktiv) setSelectedSaison(aktiv.id)
    setLoading(false)
  }

  function filterBySaison() {
    const filtered = alleVertraege.filter(v =>
      v.saison_id === selectedSaison ||
      (v.sponsoring_saisons || []).some(ss => ss.saison_id === selectedSaison)
    )
    setVertraege(filtered)
  }

  const aktiveSaison = saisons.find(s => s.id === selectedSaison)
  const aktiveVertraege = vertraege.filter(v => v.status === 'Aktiv')
  const inVerhandlung = vertraege.filter(v => v.status === 'In Verhandlung' || v.status === 'Anfrage')
  const gekuendigt = vertraege.filter(v => v.status === 'Ausgelaufen' || v.status === 'Gekuendigt')
  
  // Gesicherte Summe: nur unterzeichnete Verträge
  const gesichertGeld = vertraege.filter(v => v.vertrag_unterzeichnet && v.status === 'Aktiv')
    .reduce((s, v) => s + (Number(v.jahresbetrag) || 0), 0)
  // In Verhandlung: potenzielle Summe
  const potenzielleGeld = inVerhandlung.reduce((s, v) => s + (Number(v.jahresbetrag) || 0), 0)
  // Alle aktiven (inkl. nicht unterzeichnet)
  const gesamtGeld = vertraege.filter(v => v.status === 'Aktiv')
    .reduce((s, v) => s + (Number(v.jahresbetrag) || 0), 0)
  const gesamtWert = vertraege.reduce((s, v) => s + (Number(v.gesamtwert) || 0), 0)
  const gekuendigtGeld = gekuendigt.reduce((s, v) => s + (Number(v.jahresbetrag) || 0), 0)
  const gesamtPotenzial = gesamtGeld + potenzielleGeld
  const zielerreichung = ziel > 0 ? Math.min((gesamtGeld / ziel) * 100, 100) : 0
  const zielerreichungGesichert = ziel > 0 ? Math.min((gesichertGeld / ziel) * 100, 100) : 0
  const auslaufend = alleVertraege.filter(v => {
    if (!v.vertragsende) return false
    const diff = (new Date(v.vertragsende) - new Date()) / (1000*60*60*24)
    return diff >= 0 && diff < 60
  })
  const topSponsoren = [...vertraege].sort((a,b) => (Number(b.jahresbetrag)||0) - (Number(a.jahresbetrag)||0)).slice(0, 5)
  const statusVerteilung = ['Aktiv','In Verhandlung','Anfrage','Ausgelaufen','Gekuendigt'].map(s => ({
    status: s,
    anzahl: vertraege.filter(v => v.status === s).length,
    wert: vertraege.filter(v => v.status === s).reduce((sum,v) => sum+(Number(v.jahresbetrag)||0), 0)
  })).filter(s => s.anzahl > 0)

  const STATUS_COLORS = { 'Aktiv':'#3a8a5a','In Verhandlung':'#2d6fa3','Anfrage':'#e07b30','Ausgelaufen':'#9a9590','Gekuendigt':'#d94f4f' }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <div>
          <div className="page-title">Sponsoring-Dashboard</div>
          <p className="page-subtitle">Übersicht für den Vorstand</p>
        </div>
        <select value={selectedSaison||''} onChange={e=>setSelectedSaison(e.target.value)}
          style={{padding:'8px 16px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:14,fontWeight:600,background:'var(--white)'}}>
          {saisons.map(s=><option key={s.id} value={s.id}>{s.name}{s.aktiv?' (aktuell)':''}</option>)}
        </select>
      </div>

      {/* ZIELERREICHUNG */}
      <div className="card" style={{marginBottom:20,background:'linear-gradient(135deg, var(--navy) 0%, #1a3a6b 100%)',color:'white'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
          <div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Saison {aktiveSaison?.name}</div>
            <div style={{fontFamily:'"DM Serif Display",serif',fontSize:32,marginBottom:4}}>{gesamtGeld.toLocaleString('de-DE')} EUR</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.6)'}}>Geldsponsoring gesichert</div>
          </div>
          <div style={{textAlign:'right'}}>
            {zielEdit ? (
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="number" value={ziel} onChange={e=>setZiel(Number(e.target.value))}
                  style={{width:120,padding:'6px 10px',borderRadius:'var(--radius)',border:'none',fontSize:14,textAlign:'right'}}/>
                <button onClick={()=>setZielEdit(false)} style={{background:'var(--gold)',color:'var(--navy)',border:'none',borderRadius:'var(--radius)',padding:'6px 12px',fontWeight:700,cursor:'pointer'}}>OK</button>
              </div>
            ) : (
              <div onClick={()=>setZielEdit(true)} style={{cursor:'pointer'}}>
                <div style={{fontSize:13,color:'rgba(255,255,255,0.6)',marginBottom:4}}>Saisonziel</div>
                <div style={{fontSize:24,fontWeight:700,color:'var(--gold)'}}>{ziel.toLocaleString('de-DE')} EUR</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Klicken zum Bearbeiten</div>
              </div>
            )}
          </div>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>Zielerreichung</span>
            <span style={{fontSize:13,fontWeight:700,color:'var(--gold)'}}>{zielerreichung.toFixed(1)}%</span>
          </div>
          {/* Doppelter Fortschrittsbalken: gesichert + in Verhandlung */}
          <div style={{height:12,background:'rgba(255,255,255,0.15)',borderRadius:6,overflow:'hidden',position:'relative'}}>
            <div style={{position:'absolute',height:'100%',width:Math.min((gesamtPotenzial/ziel)*100,100)+'%',background:'rgba(45,111,163,0.6)',borderRadius:6}}/>
            <div style={{position:'absolute',height:'100%',width:zielerreichungGesichert+'%',background:'linear-gradient(90deg, var(--gold), #e8c96b)',borderRadius:6,transition:'width 0.5s'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6,flexWrap:'wrap',gap:4}}>
            <div style={{display:'flex',gap:12}}>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.6)',display:'flex',alignItems:'center',gap:4}}><span style={{display:'inline-block',width:10,height:10,borderRadius:2,background:'var(--gold)'}}></span>Gesichert {zielerreichungGesichert.toFixed(0)}%</span>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.6)',display:'flex',alignItems:'center',gap:4}}><span style={{display:'inline-block',width:10,height:10,borderRadius:2,background:'rgba(45,111,163,0.8)'}}></span>Potenzial {Math.min((gesamtPotenzial/ziel)*100,100).toFixed(0)}%</span>
            </div>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{(ziel - gesamtGeld).toLocaleString('de-DE')} EUR fehlen noch</span>
          </div>
        </div>
      </div>

      {/* KENNZAHLEN */}
      <div className="stats-row" style={{marginBottom:12}}>
        <div className="stat-card green">
          <div className="stat-num" style={{fontSize:20}}>{gesichertGeld.toLocaleString('de-DE')} EUR</div>
          <div className="stat-label">Gesichert (unterzeichnet)</div>
          <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>{vertraege.filter(v=>v.vertrag_unterzeichnet&&v.status==='Aktiv').length} Verträge</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-num" style={{fontSize:20}}>{potenzielleGeld.toLocaleString('de-DE')} EUR</div>
          <div className="stat-label">In Verhandlung (potenziell)</div>
          <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>{inVerhandlung.length} Verträge</div>
        </div>
        <div className="stat-card gold">
          <div className="stat-num" style={{fontSize:20}}>{gesamtPotenzial.toLocaleString('de-DE')} EUR</div>
          <div className="stat-label">Gesamtpotenzial</div>
          <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>Gesichert + In Verhandlung</div>
        </div>
        <div className="stat-card red">
          <div className="stat-num" style={{fontSize:20}}>{gekuendigtGeld.toLocaleString('de-DE')} EUR</div>
          <div className="stat-label">Weggefallen (gekündigt/ausgelaufen)</div>
          <div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>{gekuendigt.length} Verträge</div>
        </div>
      </div>
      <div className="stats-row" style={{marginBottom:20}}>
        <div className="stat-card green"><div className="stat-num">{aktiveVertraege.length}</div><div className="stat-label">Aktive Sponsoren</div></div>
        <div className="stat-card blue"><div className="stat-num">{vertraege.length}</div><div className="stat-label">Verträge gesamt</div></div>
        <div className="stat-card gold"><div className="stat-num" style={{fontSize:20}}>{gesamtWert.toLocaleString('de-DE')} EUR</div><div className="stat-label">Gesamtwert inkl. Sachleistungen</div></div>
        <div className="stat-card orange"><div className="stat-num" style={{color:auslaufend.length>0?'var(--red)':'inherit'}}>{auslaufend.length}</div><div className="stat-label">Verträge laufen bald aus</div></div>
      </div>

      {/* e.V. Summe */}
      {evSumme > 0 && (
        <div className="card" style={{marginBottom:20,borderLeft:'4px solid #e07b30',background:'#fff8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:'#e07b30',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>🏛️ HC Bremen e.V. (separat)</div>
              <div style={{fontFamily:'"DM Serif Display",serif',fontSize:28,color:'#8a4a00'}}>{evSumme.toLocaleString('de-DE')} EUR</div>
              <div style={{fontSize:13,color:'#c86a20',marginTop:2}}>{evAnzahl} aktive Verträge · Nicht im Sponsoring-Budget enthalten</div>
            </div>
            <div style={{fontSize:32}}>🏛️</div>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        {/* TOP SPONSOREN */}
        <div className="card">
          <div className="section-title" style={{marginBottom:16}}>Top Sponsoren</div>
          {topSponsoren.length === 0
            ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Keine Verträge für diese Saison.</p>
            : topSponsoren.map((v, i) => (
              <div key={v.id} onClick={() => v.kontakte?.id && navigate('/kontakte/'+v.kontakte.id)}
                style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--gray-100)',cursor:'pointer'}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'var(--navy)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>{i+1}</div>
                {v.kontakte?.logo_url
                  ? <img src={v.kontakte.logo_url} alt="" style={{width:32,height:32,objectFit:'contain',borderRadius:4,border:'1px solid var(--gray-200)',flexShrink:0}}/>
                  : <div style={{width:32,height:32,background:'var(--gray-100)',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--gray-400)',flexShrink:0}}>{v.kontakte?.firma?.[0]}</div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.kontakte?.firma}</div>
                  <div style={{fontSize:12,color:'var(--gray-400)'}}>{v.sponsoring_pakete?.name||'Individuell'}</div>
                </div>
                <div style={{fontWeight:700,fontSize:14,color:'var(--navy)',flexShrink:0}}>
                  {v.jahresbetrag ? Number(v.jahresbetrag).toLocaleString('de-DE')+' EUR' : '--'}
                </div>
              </div>
            ))
          }
        </div>

        {/* STATUS-VERTEILUNG */}
        <div className="card">
          <div className="section-title" style={{marginBottom:16}}>Status-Verteilung</div>
          {statusVerteilung.length === 0
            ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Keine Daten.</p>
            : statusVerteilung.map(s => (
              <div key={s.status} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600,color:STATUS_COLORS[s.status]||'var(--gray-600)'}}>{s.status}</span>
                  <span style={{fontSize:13,color:'var(--gray-600)'}}>{s.anzahl} · {s.wert.toLocaleString('de-DE')} EUR</span>
                </div>
                <div style={{height:6,background:'var(--gray-100)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:(vertraege.length>0?(s.anzahl/vertraege.length*100):0)+'%',background:STATUS_COLORS[s.status]||'var(--gray-300)',borderRadius:3}}/>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        {/* AUSLAUFENDE VERTRÄGE */}
        <div className="card">
          <div className="section-title" style={{marginBottom:16,color:auslaufend.length>0?'var(--red)':'inherit'}}>
            ⚠️ Auslaufende Verträge ({auslaufend.length})
          </div>
          {auslaufend.length === 0
            ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Keine Verträge laufen in den nächsten 60 Tagen aus.</p>
            : auslaufend.sort((a,b)=>new Date(a.vertragsende)-new Date(b.vertragsende)).map(v => {
                const diff = Math.ceil((new Date(v.vertragsende)-new Date())/(1000*60*60*24))
                return (
                  <div key={v.id} onClick={()=>v.kontakte?.id&&navigate('/kontakte/'+v.kontakte.id)}
                    style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--gray-100)',cursor:'pointer'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:14}}>{v.kontakte?.firma}</div>
                      <div style={{fontSize:12,color:'var(--gray-400)'}}>{new Date(v.vertragsende).toLocaleDateString('de-DE')}</div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:diff<=30?'var(--red)':'var(--orange)',background:diff<=30?'#fce4d6':'#fff3cd',padding:'3px 10px',borderRadius:20}}>
                      in {diff} Tagen
                    </span>
                  </div>
                )
              })
          }
        </div>

        {/* OFFENE AUFGABEN */}
        <div className="card">
          <div className="section-title" style={{marginBottom:16}}>Offene Aufgaben ({aufgaben.length})</div>
          {aufgaben.length === 0
            ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Keine fälligen Aufgaben.</p>
            : aufgaben.slice(0,6).map(a => {
                const diff = Math.ceil((new Date()-new Date(a.faellig_am))/(1000*60*60*24))
                return (
                  <div key={a.id} onClick={()=>a.kontakte&&navigate('/kontakte/'+a.kontakte.id)}
                    style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-100)',cursor:'pointer'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.naechste_aktion||a.betreff}</div>
                      <div style={{fontSize:12,color:'var(--gray-400)'}}>{a.kontakte?.firma}</div>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:'var(--red)',marginLeft:8,flexShrink:0}}>
                      {diff===0?'Heute':diff>0?diff+'d überfällig':'heute'}
                    </span>
                  </div>
                )
              })
          }
        </div>
      </div>
    </main>
  )
}
