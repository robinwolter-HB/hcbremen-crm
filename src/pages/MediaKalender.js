import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const WOCHENTAGE = ['Mo','Di','Mi','Do','Fr','Sa','So']
const PL_ICONS = { instagram:'📸', linkedin:'💼', facebook:'👥', tiktok:'🎵' }
const STATUS_STIL = { geplant:{bg:'#fff3cd',text:'#8a6a00',label:'Geplant'}, veroeffentlicht:{bg:'#e2efda',text:'#2d6b3a',label:'Veröffentlicht'}, abgebrochen:{bg:'#fce4d6',text:'#8a3a1a',label:'Abgebrochen'} }

export default function MediaKalender() {
  const { profile } = useAuth()
  const [heute] = useState(new Date())
  const [anzeige, setAnzeige] = useState(new Date())
  const [postings, setPostings] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titel:'', inhalt:'', plattformen:[], geplant_am:'', geplant_uhrzeit:'12:00' })

  useEffect(() => { load() }, [anzeige])

  async function load() {
    setLoading(true)
    const jahr = anzeige.getFullYear(), monat = anzeige.getMonth()
    const von = new Date(jahr, monat, 1).toISOString()
    const bis = new Date(jahr, monat+1, 0, 23, 59).toISOString()
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from('media_postings').select('*, ersteller:erstellt_von(name)').gte('geplant_am', von).lte('geplant_am', bis).order('geplant_am'),
      supabase.from('events').select('id, titel, datum_start').gte('datum_start', von).lte('datum_start', bis),
    ])
    setPostings(p||[]); setEvents(e||[]); setLoading(false)
  }

  async function speichern() {
    if(!form.titel.trim()||!form.geplant_am) return
    const dt = new Date(`${form.geplant_am}T${form.geplant_uhrzeit}`)
    await supabase.from('media_postings').insert({ titel:form.titel, inhalt:form.inhalt||null, plattformen:form.plattformen, geplant_am:dt.toISOString(), status:'geplant', erstellt_von:profile.id })
    setForm({titel:'',inhalt:'',plattformen:[],geplant_am:selected?selected.toISOString().split('T')[0]:'',geplant_uhrzeit:'12:00'})
    setShowForm(false); load()
  }

  async function statusToggle(id, status) { await supabase.from('media_postings').update({status}).eq('id',id); load() }
  async function loeschen(id) { await supabase.from('media_postings').delete().eq('id',id); load() }

  const jahr = anzeige.getFullYear(), monat = anzeige.getMonth()
  const startWT = (new Date(jahr, monat, 1).getDay()+6)%7
  const tage = new Date(jahr, monat+1, 0).getDate()
  const zellen = [...Array(startWT).fill(null), ...Array.from({length:tage},(_,i)=>new Date(jahr,monat,i+1))]

  const postingsAmTag = d => { if(!d) return []; const ds=d.toISOString().split('T')[0]; return postings.filter(p=>p.geplant_am?.startsWith(ds)) }
  const eventsAmTag = d => { if(!d) return []; const ds=d.toISOString().split('T')[0]; return events.filter(e=>e.datum_start?.startsWith(ds)) }
  const istHeute = d => d && d.toDateString()===heute.toDateString()
  const istSel = d => d && selected && d.toDateString()===selected.toDateString()

  const selPost = selected ? postingsAmTag(selected) : []
  const selEv = selected ? eventsAmTag(selected) : []

  return (
    <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap:20, alignItems:'flex-start' }}>
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <button onClick={()=>setAnzeige(new Date(jahr,monat-1,1))} className="btn btn-outline btn-sm">‹</button>
          <h2 style={{ margin:0, fontSize:20, color:'var(--navy)', fontFamily:'DM Serif Display, serif' }}>{MONATE[monat]} {jahr}</h2>
          <button onClick={()=>setAnzeige(new Date(jahr,monat+1,1))} className="btn btn-outline btn-sm">›</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
          {WOCHENTAGE.map(w=><div key={w} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'var(--gray-400)', padding:'4px 0' }}>{w}</div>)}
        </div>

        {loading ? <div className="loading-center"><div className="spinner"/></div> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {zellen.map((d,i)=>{
              const tp=postingsAmTag(d), te=eventsAmTag(d)
              return (
                <div key={i} onClick={()=>d&&setSelected(d)} style={{ minHeight:72, padding:'6px 5px', borderRadius:'var(--radius)', cursor:d?'pointer':'default', background:d?(istSel(d)?'#ddeaff':istHeute(d)?'#fff3cd':'var(--white)'):'transparent', border:d?(istSel(d)?'2px solid var(--blue)':istHeute(d)?'2px solid var(--gold)':'1px solid var(--gray-200)'):'none', transition:'all 0.1s' }}>
                  {d && (<>
                    <div style={{ fontSize:12, fontWeight:istHeute(d)?700:400, color:istHeute(d)?'var(--navy)':'var(--text)', marginBottom:3 }}>{d.getDate()}</div>
                    {te.slice(0,1).map(e=><div key={e.id} style={{ fontSize:9, padding:'1px 4px', borderRadius:3, background:'#e2efda', color:'#2d6b3a', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', marginBottom:2 }}>🏐 {e.titel}</div>)}
                    {tp.slice(0,2).map(p=><div key={p.id} style={{ fontSize:9, padding:'1px 4px', borderRadius:3, background:STATUS_STIL[p.status]?.bg, color:STATUS_STIL[p.status]?.text, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', marginBottom:2 }}>{(p.plattformen||[]).map(pl=>PL_ICONS[pl]||'📱').join('')} {p.titel}</div>)}
                    {(tp.length+te.length)>3 && <div style={{ fontSize:9, color:'var(--gray-400)' }}>+{tp.length+te.length-3} weitere</div>}
                  </>)}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
          {[['#e2efda','Event'],['#fff3cd','Geplant'],['#c6efce','Veröffentlicht']].map(([c,l])=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray-600)' }}>
              <div style={{ width:12, height:12, borderRadius:3, background:c }} />{l}
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div>
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ margin:0, fontSize:15, color:'var(--navy)' }}>{selected.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})}</h3>
              <button onClick={()=>setSelected(null)} className="close-btn">×</button>
            </div>
            {selEv.length>0 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Events</div>
                {selEv.map(e=><div key={e.id} className="badge badge-aktiv" style={{ display:'block', marginBottom:4 }}>🏐 {e.titel}</div>)}
              </div>
            )}
            <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>Postings</div>
            {selPost.length===0 ? <p style={{ fontSize:13, color:'var(--gray-400)', marginBottom:8 }}>Keine Postings geplant</p> : selPost.map(p=>(
              <div key={p.id} style={{ background:'var(--gray-100)', borderRadius:'var(--radius)', padding:'10px 12px', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>{p.titel}</span>
                  <span className="badge" style={{ background:STATUS_STIL[p.status]?.bg, color:STATUS_STIL[p.status]?.text }}>{STATUS_STIL[p.status]?.label}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--gray-600)', marginBottom:6 }}>{new Date(p.geplant_am).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr{(p.plattformen||[]).length>0&&` · ${p.plattformen.map(pl=>PL_ICONS[pl]||pl).join(' ')}`}</div>
                <div style={{ display:'flex', gap:6 }}>
                  {p.status==='geplant' && <button onClick={()=>statusToggle(p.id,'veroeffentlicht')} className="btn btn-sm" style={{ background:'#e2efda', color:'#2d6b3a', border:'none' }}>✓ Veröffentlicht</button>}
                  <button onClick={()=>loeschen(p.id)} className="btn btn-sm btn-danger">× Löschen</button>
                </div>
              </div>
            ))}
            <button onClick={()=>{ setForm(p=>({...p,geplant_am:selected.toISOString().split('T')[0]})); setShowForm(true) }} className="btn btn-gold" style={{ width:'100%', marginTop:4 }}>+ Posting planen</button>
          </div>

          {showForm && (
            <div className="card">
              <h4 style={{ fontSize:14, color:'var(--navy)', marginBottom:12 }}>Neues Posting</h4>
              <div className="form-group"><label>Titel *</label><input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} /></div>
              <div className="form-group"><label>Caption / Inhalt</label><textarea value={form.inhalt} onChange={e=>setForm(p=>({...p,inhalt:e.target.value}))} rows={3} /></div>
              <div className="form-row">
                <div className="form-group"><label>Datum</label><input type="date" value={form.geplant_am} onChange={e=>setForm(p=>({...p,geplant_am:e.target.value}))} /></div>
                <div className="form-group"><label>Uhrzeit</label><input type="time" value={form.geplant_uhrzeit} onChange={e=>setForm(p=>({...p,geplant_uhrzeit:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Plattformen</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {['instagram','linkedin','facebook','tiktok'].map(p=>(
                    <button key={p} onClick={()=>setForm(prev=>({...prev,plattformen:prev.plattformen.includes(p)?prev.plattformen.filter(x=>x!==p):[...prev.plattformen,p]}))}
                      className={`btn btn-sm ${form.plattformen.includes(p)?'btn-primary':'btn-outline'}`}>{PL_ICONS[p]} {p}</button>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={speichern} className="btn btn-primary">Speichern</button>
                <button onClick={()=>setShowForm(false)} className="btn btn-outline">Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
