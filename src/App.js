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

function Header() {
  const { user, profile, isAdmin } = useAuth()
  const handleLogout = async () => {
    const { supabase } = await import('./lib/supabase')
    await supabase.auth.signOut()
  }
  if (!user) return null
  return (
    <header className="header">
      <NavLink to="/" className="logo">HC <span>Bremen</span> CRM</NavLink>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <span className="user-badge">👤 {profile?.name || user.email}</span>
        <nav className="nav">
          <NavLink to="/" className={({isActive})=>'nav-link'+(isActive?' active':'')} end>Dashboard</NavLink>
          <NavLink to="/kontakte" className={({isActive})=>'nav-link'+(isActive?' active':'')}>Kontakte</NavLink>
          <NavLink to="/historie" className={({isActive})=>'nav-link'+(isActive?' active':'')}>Historie</NavLink>
          <NavLink to="/veranstaltungen" className={({isActive})=>'nav-link'+(isActive?' active':'')}>Events</NavLink>
          <NavLink to="/sponsoring" className={({isActive})=>'nav-link'+(isActive?' active':'')}>Sponsoring</NavLink>
          {isAdmin() && <NavLink to="/benutzer" className={({isActive})=>'nav-link'+(isActive?' active':'')}>🔒 Nutzer</NavLink>}
          <NavLink to="/aufgaben" className={({isActive})=>'nav-link'+(isActive?' active':'')}>✓ Aufgaben</NavLink>
          <NavLink to="/kalender" className={({isActive})=>'nav-link'+(isActive?' active':'')}>📅 Kalender</NavLink>
          <button className="nav-link" onClick={handleLogout}>Abmelden</button>
        </nav>
      </div>
    </header>
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
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
