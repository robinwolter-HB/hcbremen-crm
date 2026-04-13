import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import './index.css'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Kontakte from './pages/Kontakte'
import KontaktDetail from './pages/KontaktDetail'
import Historie from './pages/Historie'
import Veranstaltungen from './pages/Veranstaltungen'
import Sponsoring from './pages/Sponsoring'
import Benutzer from './pages/Benutzer'
import MeineAufgaben from './pages/MeineAufgaben'
import Kalender from './pages/Kalender'
import EmailModal from './components/EmailModal'
import Einstellungen from './pages/Einstellungen'
import Inbox from './pages/Inbox'
import EV from './pages/EV'

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

function DropdownMenu({ label, items, extra }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{position:'relative'}} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
      <button className="nav-link" style={{display:'flex',alignItems:'center',gap:4}}
        onClick={()=>setOpen(o=>!o)}>
        {label} <span style={{fontSize:10,opacity:0.7}}>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div style={{position:'absolute',top:'100%',left:0,background:'var(--navy)',borderRadius:'var(--radius)',
          boxShadow:'0 8px 24px rgba(0,0,0,0.3)',minWidth:180,zIndex:200,padding:'6px 0',
          border:'1px solid rgba(255,255,255,0.1)'}}>
          {items.map(item => (
            <NavLink key={item.to} to={item.to} onClick={()=>setOpen(false)}
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
        </div>
      )}
    </div>
  )
}

function Header() {
  const { user, profile, isAdmin } = useAuth()
  const [emailModal, setEmailModal] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [navOpen, setNavOpen] = useState(false)
  useEffect(() => {
    if (user) loadUnread()
    // Alle 60 Sekunden aktualisieren
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
  if (!user) return null
  return (
    <>
    <header className="header">
      <NavLink to="/" className="logo" onClick={() => setNavOpen(false)}>HC <span>Bremen</span> CRM</NavLink>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <button className="hamburger" onClick={() => setNavOpen(o => !o)} aria-label="Menü">
          <span/><span/><span/>
        </button>
        <span className="user-badge">👤 {profile?.name || user.email}</span>
        <nav className={`nav${navOpen ? ' open' : ''}`} onClick={e => { if(e.target===e.currentTarget) setNavOpen(false) }}>
          <NavLink to="/" className={({isActive})=>'nav-link'+(isActive?' active':'')} end onClick={()=>setNavOpen(false)}>Dashboard</NavLink>
          <NavLink to="/kontakte" className={({isActive})=>'nav-link'+(isActive?' active':'')} onClick={()=>setNavOpen(false)}>Kontakte</NavLink>
          <NavLink to="/veranstaltungen" className={({isActive})=>'nav-link'+(isActive?' active':'')} onClick={()=>setNavOpen(false)}>Events</NavLink>
          <NavLink to="/sponsoring" className={({isActive})=>'nav-link'+(isActive?' active':'')} onClick={()=>setNavOpen(false)}>Sponsoring</NavLink>
          <NavLink to="/ev" className={({isActive})=>'nav-link'+(isActive?' active':'')} onClick={()=>setNavOpen(false)}>🏛️ e.V.</NavLink>
          <DropdownMenu label="Aktivitäten" onClose={()=>setNavOpen(false)} items={[
            { to:'/historie', label:'📋 Historie' },
            { to:'/aufgaben', label:'✓ Aufgaben' },
            { to:'/kalender', label:'📅 Kalender' },
            { to:'/inbox', label:'📬 Inbox', badge: unreadCount },
          ]} onEmail={()=>setEmailModal(true)}/>
          {isAdmin() && <DropdownMenu label="⚙️ Verwaltung" onClose={()=>setNavOpen(false)} items={[
            { to:'/benutzer', label:'👥 Nutzer' },
            { to:'/einstellungen', label:'⚙️ Einstellungen' },
          ]}/>}
          <button className="nav-link" onClick={handleLogout}>Abmelden</button>
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
            <Route path="/veranstaltungen" element={<PrivateRoute bereich="veranstaltungen"><Veranstaltungen /></PrivateRoute>} />
            <Route path="/sponsoring" element={<PrivateRoute bereich="sponsoring"><Sponsoring /></PrivateRoute>} />
            <Route path="/benutzer" element={<PrivateRoute><Benutzer /></PrivateRoute>} />
            <Route path="/aufgaben" element={<PrivateRoute><MeineAufgaben /></PrivateRoute>} />
            <Route path="/kalender" element={<PrivateRoute><Kalender /></PrivateRoute>} />
            <Route path="/einstellungen" element={<PrivateRoute><Einstellungen /></PrivateRoute>} />
            <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
            <Route path="/ev" element={<PrivateRoute><EV /></PrivateRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
