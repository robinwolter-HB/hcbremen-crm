import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import './index.css'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Kontakte from './pages/Kontakte'
import KontaktDetail from './pages/KontaktDetail'
import Historie from './pages/Historie'
import Events from './pages/Events'
import Sponsoring from './pages/Sponsoring'
import Benutzer from './pages/Benutzer'
import MeineAufgaben from './pages/MeineAufgaben'
import Kalender from './pages/Kalender'
import EmailModal from './components/EmailModal'
import Einstellungen from './pages/Einstellungen'
import GegnerVerwaltung from './pages/GegnerVerwaltung'
import Freiwillige from './pages/Freiwillige'
import Inbox from './pages/Inbox'
import EV from './pages/EV'
import MediaHub from './pages/MediaHub'
import MannschaftHub from './pages/MannschaftHub'

function PrivateRoute({ children, bereich }) {
  const { user, loading, canAccess } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" />
  if (bereich && !canAccess(bereich)) return (
    <div className="main"><div className="card">
      <p style={{color:'var(--red)'}}>Kein Zugriff auf diesen Bereich.</p>
    </div></div>
  )
  return children
}

function DropdownMenu({ label, items, onEmail, onLogout, onClose }) {
  const [open, setOpen] = useState(false)
  function close() { setOpen(false); onClose && onClose() }
  return (
    <div style={{position:'relative'}}>
      <button
        className={`nav-link${items.some(i => i.active) ? ' active' : ''}`}
        style={{display:'flex',alignItems:'center',gap:4}}
        onClick={()=>setOpen(o=>!o)}>
        {label} <span style={{fontSize:10,opacity:0.7}}>{open?'▾':'▾'}</span>
      </button>
      {open && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:199}} onClick={()=>setOpen(false)}/>
          <div style={{position:'absolute',top:'100%',left:0,background:'var(--navy)',borderRadius:'var(--radius)',
            boxShadow:'0 8px 24px rgba(0,0,0,0.3)',minWidth:200,zIndex:200,padding:'6px 0',
            border:'1px solid rgba(255,255,255,0.1)'}}>
            {items.map(item => (
              <NavLink key={item.to} to={item.to} onClick={close}
                style={({isActive})=>({display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'10px 16px',fontSize:14,fontWeight:500,textDecoration:'none',
                  color:isActive?'var(--gold)':'rgba(255,255,255,0.85)',
                  background:isActive?'rgba(200,168,75,0.15)':'transparent'})}>
                {item.label}
                {item.badge>0 && <span style={{background:'var(--red)',color:'white',borderRadius:'50%',
                  width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:10,fontWeight:700}}>{item.badge}</span>}
              </NavLink>
            ))}
            {onEmail && (
              <button onClick={()=>{close();onEmail()}} style={{display:'flex',alignItems:'center',gap:8,
                padding:'10px 16px',fontSize:14,fontWeight:500,color:'rgba(255,255,255,0.85)',
                background:'transparent',border:'none',cursor:'pointer',width:'100%',textAlign:'left'}}>
                📧 E-Mail senden
              </button>
            )}
            {onLogout && (
              <button onClick={()=>{close();onLogout()}} style={{display:'flex',alignItems:'center',gap:8,
                padding:'10px 16px',fontSize:14,fontWeight:500,color:'rgba(255,100,100,0.9)',
                background:'transparent',border:'none',borderTop:'1px solid rgba(255,255,255,0.1)',
                cursor:'pointer',width:'100%',textAlign:'left',marginTop:4}}>
                Abmelden
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Header() {
  const { user, profile, isAdmin, canAccess } = useAuth()
  const [emailModal, setEmailModal] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (user) loadUnread()
    const interval = setInterval(() => { if(user) loadUnread() }, 60000)
    return () => clearInterval(interval)
  }, [user])

  async function loadUnread() {
    const { supabase } = await import('./lib/supabase')
    const { data: profileData } = await supabase.from('profile').select('id').eq('email', user.email).single()
    if (!profileData) return
    const { count } = await supabase.from('benachrichtigungen').select('*', { count: 'exact', head: true }).eq('empfaenger_id', profileData.id).eq('gelesen', false)
    setUnreadCount(count || 0)
  }

  const handleLogout = async () => {
    const { supabase } = await import('./lib/supabase')
    await supabase.auth.signOut()
  }

  const canAccessMannschaft = () => {
    if (!profile) return false
    return profile.rolle === 'admin' || (profile.bereiche || []).includes('mannschaft')
  }

  const canAccessMedia = () => {
    if (!profile) return false
    return profile.rolle === 'admin' || profile.rolle === 'media' || (profile.bereiche || []).includes('media')
  }

  if (!user) return null

  const crmItems = [
    ...(canAccess('kontakte') ? [{ to:'/kontakte', label:'👥 Kontakte' }] : []),
    ...(canAccess('sponsoring') ? [{ to:'/sponsoring', label:'🤝 Sponsoring' }] : []),
    ...(isAdmin() ? [{ to:'/ev', label:'🏛️ e.V.' }] : []),
  ]

  const eventsItems = [
    ...(canAccess('events') ? [{ to:'/events', label:'📅 Events' }] : []),
    ...(canAccess('events') ? [{ to:'/freiwillige', label:'🙋 Freiwillige' }] : []),
  ]

  const aktivItems = [
    ...(canAccess('historie') ? [{ to:'/historie', label:'📋 Historie' }] : []),
    { to:'/aufgaben', label:'✓ Aufgaben' },
    { to:'/kalender', label:'📅 Kalender' },
    { to:'/inbox', label:'📬 Inbox', badge: unreadCount },
  ]

  const verwaltungItems = [
    ...(isAdmin() ? [{ to:'/benutzer', label:'👥 Nutzer' }, { to:'/einstellungen', label:'⚙️ Einstellungen' }] : []),
  ]

  return (
    <>
    <header className="header">
      <NavLink to="/" className="logo" onClick={() => setNavOpen(false)}>HC <span>Bremen</span> CRM</NavLink>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <button className="hamburger" onClick={() => setNavOpen(o => !o)} aria-label="Menue">
          <span/><span/><span/>
        </button>
        <span className="user-badge">{profile?.name || user.email}</span>
        <nav className={`nav${navOpen ? ' open' : ''}`} onClick={e => { if(e.target===e.currentTarget) setNavOpen(false) }}>
          <NavLink to="/" className={({isActive})=>'nav-link'+(isActive?' active':'')} end onClick={()=>setNavOpen(false)}>🏠 Dashboard</NavLink>

          {crmItems.length > 0 && (
            <DropdownMenu label="👥 CRM" onClose={()=>setNavOpen(false)} items={crmItems} />
          )}

          {eventsItems.length > 0 && (
            <DropdownMenu label="📅 Events" onClose={()=>setNavOpen(false)} items={eventsItems} />
          )}

          {canAccessMannschaft() && (
            <NavLink to="/mannschaft" className={({isActive})=>'nav-link'+(isActive?' active':'')} onClick={()=>setNavOpen(false)}>🏐 Mannschaft</NavLink>
          )}
          {canAccessMedia() && (
            <NavLink to="/media" className={({isActive})=>'nav-link'+(isActive?' active':'')} onClick={()=>setNavOpen(false)}>📸 Media</NavLink>
          )}

          <DropdownMenu label="📋 Aktivitäten" onClose={()=>setNavOpen(false)} items={aktivItems} onEmail={()=>setEmailModal(true)} />

          {verwaltungItems.length > 0 && (
            <DropdownMenu label="⚙️ Einstellungen" onClose={()=>setNavOpen(false)} items={verwaltungItems} onLogout={handleLogout} />
          )}

          {verwaltungItems.length === 0 && (
            <DropdownMenu label="⚙️" onClose={()=>setNavOpen(false)} items={[]} onLogout={handleLogout} />
          )}
        </nav>
      </div>
    </header>
    {emailModal && <EmailModal onClose={() => setEmailModal(false)} />}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="layout">
          <Header />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/kontakte" element={<PrivateRoute bereich="kontakte"><Kontakte /></PrivateRoute>} />
            <Route path="/kontakte/:id" element={<PrivateRoute bereich="kontakte"><KontaktDetail /></PrivateRoute>} />
            <Route path="/historie" element={<PrivateRoute bereich="historie"><Historie /></PrivateRoute>} />
            <Route path="/events" element={<PrivateRoute bereich="events"><Events /></PrivateRoute>} />
            <Route path="/sponsoring" element={<PrivateRoute bereich="sponsoring"><Sponsoring /></PrivateRoute>} />
            <Route path="/benutzer" element={<PrivateRoute><Benutzer /></PrivateRoute>} />
            <Route path="/aufgaben" element={<PrivateRoute><MeineAufgaben /></PrivateRoute>} />
            <Route path="/kalender" element={<PrivateRoute><Kalender /></PrivateRoute>} />
            <Route path="/einstellungen" element={<PrivateRoute><Einstellungen /></PrivateRoute>} />
            <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
            <Route path="/ev" element={<PrivateRoute><EV /></PrivateRoute>} />
            <Route path="/freiwillige" element={<PrivateRoute bereich="events"><Freiwillige /></PrivateRoute>} />
            <Route path="/media/*" element={<PrivateRoute bereich="media"><MediaHub /></PrivateRoute>} />
            <Route path="/mannschaft/*" element={<PrivateRoute bereich="mannschaft"><MannschaftHub /></PrivateRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
