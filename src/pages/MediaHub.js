import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import MediaAufgaben from './MediaAufgaben'
import MediaFotos from './MediaFotos'
import MediaCI from './MediaCI'
import MediaSpielberichte from './MediaSpielberichte'
import MediaInsights from './MediaInsights'
import MediaKalender from './MediaKalender'

const TABS = [
  { path: 'aufgaben',  label: '✓ Aufgaben'        },
  { path: 'fotos',     label: '📷 Foto-Bibliothek' },
  { path: 'ci',        label: '🎨 CI-Hub'          },
  { path: 'berichte',  label: '📝 Spielberichte'   },
  { path: 'insights',  label: '📊 Insights'        },
  { path: 'kalender',  label: '📅 Kalender'        },
]

export default function MediaHub() {
  return (
    <div className="main">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', margin: 0 }}>
          📸 Media Hub
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
          HC Bremen · Medien & Kommunikation
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 'var(--radius)', padding: 4, flexWrap: 'wrap',
      }}>
        {TABS.map(tab => (
          <NavLink key={tab.path} to={tab.path}
            style={({ isActive }) => ({
              padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              textDecoration: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
              background: isActive ? 'var(--gold)' : 'transparent',
              color: isActive ? '#0a0a1a' : 'rgba(255,255,255,0.7)',
            })}>
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<Navigate to="aufgaben" replace />} />
        <Route path="aufgaben"  element={<MediaAufgaben />} />
        <Route path="fotos"     element={<MediaFotos />} />
        <Route path="ci"        element={<MediaCI />} />
        <Route path="berichte"  element={<MediaSpielberichte />} />
        <Route path="insights"  element={<MediaInsights />} />
        <Route path="kalender"  element={<MediaKalender />} />
      </Routes>
    </div>
  )
}
