import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import MediaAufgaben from './MediaAufgaben'
import MediaFotos from './MediaFotos'
import MediaCI from './MediaCI'
import MediaSpielberichte from './MediaSpielberichte'
import MediaInsights from './MediaInsights'
import MediaPostings from './MediaPostings'

const TABS = [
  { path: 'aufgaben',  label: '✓ Aufgaben'        },
  { path: 'postings',  label: '📱 Postings'        },
  { path: 'fotos',     label: '📷 Fotos'           },
  { path: 'ci',        label: '🎨 CI-Hub'          },
  { path: 'berichte',  label: '📝 Spielberichte'   },
  { path: 'insights',  label: '📊 Insights'        },
]

export default function MediaHub() {
  return (
    <div className="main">
      <div style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ fontSize: 28 }}>📸 Media Hub</div>
        <p className="page-subtitle">HC Bremen · Medien & Kommunikation</p>
      </div>

      <div className="tabs">
        {TABS.map(tab => (
          <NavLink key={tab.path} to={tab.path}
            className={({ isActive }) => `tab-btn${isActive ? ' active' : ''}`}>
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<Navigate to="aufgaben" replace />} />
        <Route path="aufgaben"  element={<MediaAufgaben />} />
        <Route path="postings"  element={<MediaPostings />} />
        <Route path="fotos"     element={<MediaFotos />} />
        <Route path="ci"        element={<MediaCI />} />
        <Route path="berichte"  element={<MediaSpielberichte />} />
        <Route path="insights"  element={<MediaInsights />} />
      </Routes>
    </div>
  )
}
