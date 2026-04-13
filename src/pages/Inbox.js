import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Inbox() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [benachrichtigungen, setBenachrichtigungen] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ungelesen')

  useEffect(() => { if (profile?.id) load() }, [profile])

  async function load() {
    const query = supabase
      .from('benachrichtigungen')
      .select('*')
      .eq('empfaenger_id', profile.id)
      .order('erstellt_am', { ascending: false })
    
    if (filter === 'ungelesen') query.eq('gelesen', false)
    
    const { data } = await query
    setBenachrichtigungen(data || [])
    setLoading(false)
  }

  useEffect(() => { if (profile?.id) load() }, [filter])

  async function markiereGelesen(id) {
    await supabase.from('benachrichtigungen').update({ gelesen: true }).eq('id', id)
    load()
  }

  async function alleGelesenMarkieren() {
    await supabase.from('benachrichtigungen').update({ gelesen: true }).eq('empfaenger_id', profile.id).eq('gelesen', false)
    load()
  }

  async function loeschen(id) {
    await supabase.from('benachrichtigungen').delete().eq('id', id)
    load()
  }

  function handleKlick(b) {
    markiereGelesen(b.id)
    if (b.link) navigate(b.link)
  }

  const ungelesen = benachrichtigungen.filter(b => !b.gelesen).length

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <main className="main">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <div>
          <div className="page-title">Inbox</div>
          <p className="page-subtitle">{ungelesen > 0 ? `${ungelesen} ungelesene Benachrichtigung${ungelesen!==1?'en':''}` : 'Alles gelesen'}</p>
        </div>
        {ungelesen > 0 && (
          <button className="btn btn-outline btn-sm" onClick={alleGelesenMarkieren}>Alle als gelesen markieren</button>
        )}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {[['ungelesen','Ungelesen'],['alle','Alle']].map(([key,label])=>(
          <button key={key} onClick={()=>setFilter(key)}
            style={{padding:'6px 16px',borderRadius:20,border:'1.5px solid',fontSize:13,fontWeight:600,cursor:'pointer',
              background:filter===key?'var(--navy)':'transparent',
              color:filter===key?'white':'var(--gray-600)',
              borderColor:filter===key?'var(--navy)':'var(--gray-200)'}}>
            {label}
          </button>
        ))}
      </div>

      {benachrichtigungen.length === 0
        ? <div className="empty-state card">
            <p style={{fontSize:32,marginBottom:12}}>📬</p>
            <p>{filter==='ungelesen'?'Keine ungelesenen Benachrichtigungen.':'Noch keine Benachrichtigungen.'}</p>
          </div>
        : <div style={{display:'grid',gap:10}}>
            {benachrichtigungen.map(b=>(
              <div key={b.id} onClick={()=>handleKlick(b)}
                style={{display:'flex',alignItems:'flex-start',gap:14,padding:'14px 18px',
                  border:'1.5px solid '+(b.gelesen?'var(--gray-200)':'var(--navy)'),
                  borderLeft:'4px solid '+(b.gelesen?'var(--gray-200)':'var(--navy)'),
                  borderRadius:'var(--radius)',cursor:b.link?'pointer':'default',
                  background:b.gelesen?'var(--white)':'rgba(15,34,64,0.03)'}}>
                <div style={{fontSize:24,flexShrink:0}}>{b.typ==='mention'?'💬':'🔔'}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:b.gelesen?400:700,fontSize:14,marginBottom:4}}>{b.titel}</div>
                  {b.text&&<p style={{fontSize:13,color:'var(--gray-600)',margin:'0 0 4px 0'}}>{b.text}</p>}
                  <div style={{fontSize:12,color:'var(--gray-400)'}}>
                    {new Date(b.erstellt_am).toLocaleDateString('de-DE')} {new Date(b.erstellt_am).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  {!b.gelesen&&<button onClick={e=>{e.stopPropagation();markiereGelesen(b.id)}} className="btn btn-sm btn-outline">✓ Gelesen</button>}
                  <button onClick={e=>{e.stopPropagation();loeschen(b.id)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)',fontSize:18,padding:'0 4px'}}>×</button>
                </div>
              </div>
            ))}
          </div>
      }
    </main>
  )
}
