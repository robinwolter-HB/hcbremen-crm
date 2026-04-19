import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import MediaAufgaben from './MediaAufgaben'
import MediaFotos from './MediaFotos'
import MediaCI from './MediaCI'
import MediaSpielberichte from './MediaSpielberichte'
import MediaInsights from './MediaInsights'
import MediaKalender from './MediaKalender'

const TABS = [
  { path: 'aufgaben',     label: '✓ Aufgaben',      icon: '✓' },
  { path: 'fotos',        label: '📷 Foto-Bibliothek', icon: '📷' },
  { path: 'ci',           label: '🎨 CI-Hub',         icon: '🎨' },
  { path: 'berichte',     label: '📝 Spielberichte',  icon: '📝' },
  { path: 'insights',     label: '📊 Insights',       icon: '📊' },
  { path: 'kalender',     label: '📅 Kalender',       icon: '📅' },
]

export default function MediaHub() {
  const location = useLocation()
  const navigate = useNavigate()

  // Redirect /media to /media/aufgaben
  if (location.pathname === '/media' || location.pathname === '/media/') {
    navigate('/media/aufgaben', { replace: true })
    return null
  }

  return (
    <div className="main">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', margin: 0 }}>
          📸 Media Hub
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
          HC Bremen · Medien & Kommunikation
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 24,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 'var(--radius)',
        padding: 4,
        flexWrap: 'wrap',
      }}>
        {TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={`/media/${tab.path}`}
            style={({ isActive }) => ({
              padding: '8px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.15s',
              background: isActive ? 'var(--gold)' : 'transparent',
              color: isActive ? '#0a0a1a' : 'rgba(255,255,255,0.7)',
              whiteSpace: 'nowrap',
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Sub-Routes */}
      <Routes>
        <Route path="aufgaben" element={<MediaAufgaben />} />
        <Route path="fotos" element={<MediaFotos />} />
        <Route path="ci" element={<MediaCI />} />
        <Route path="berichte" element={<MediaSpielberichte />} />
        <Route path="insights" element={<MediaInsights />} />
        <Route path="kalender" element={<MediaKalender />} />
      </Routes>
    </div>
  )
}
