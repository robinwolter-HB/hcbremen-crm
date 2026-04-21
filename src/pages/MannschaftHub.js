import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import MannschaftKader from './MannschaftKader'
import MannschaftScouting from './MannschaftScouting'
import GegnerTagging from './GegnerTagging'
import ScoutingBerichte from './ScoutingBerichte'
import MannschaftVerletzungen from './MannschaftVerletzungen'
import MannschaftStatistiken from './MannschaftStatistiken'
import MannschaftUebersicht from './MannschaftUebersicht'
import MannschaftTraining from './MannschaftTraining'
import SpielTracking from './SpielTracking'
import MannschaftAuswertung from './MannschaftAuswertung'

const TABS = [
  { path: 'uebersicht',   label: '📊 Übersicht'     },
  { path: 'kader',        label: '👥 Kader'          },
  { path: 'verletzungen', label: '🏥 Verletzungen'   },
  { path: 'statistiken',  label: '📈 Statistiken'    },
  { path: 'spieltracking', label: '🎯 Spiele'           },
  { path: 'auswertung',    label: '📊 Auswertung'      },
  { path: 'scouting',     label: '🎥 Gegner-Videos'  },
  { path: 'berichte',    label: '📋 Scout-Berichte'  },
  { path: 'training',    label: '🏃 Training'       },
]

export default function MannschaftHub() {
  return (
    <div className="main">
      <div style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ fontSize: 28 }}>🏐 Mannschaft</div>
        <p className="page-subtitle">HC Bremen · Kaderverwaltung, Scouting & Statistiken</p>
      </div>

      <div className="tabs">
        {TABS.map(tab => (
          <NavLink key={tab.path} to={tab.path} end={tab.path === 'uebersicht'}
            className={({ isActive }) => `tab-btn${isActive ? ' active' : ''}`}>
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<Navigate to="uebersicht" replace />} />
        <Route path="uebersicht"   element={<MannschaftUebersicht />} />
        <Route path="kader/*"      element={<MannschaftKader />} />
        <Route path="verletzungen" element={<MannschaftVerletzungen />} />
        <Route path="statistiken"  element={<MannschaftStatistiken />} />
        <Route path="scouting"     element={<MannschaftScouting />} />
        <Route path="scouting/:id"  element={<GegnerTagging />} />
        <Route path="scouting/bericht/*" element={<ScoutingBerichte />} />
        <Route path="training/*"   element={<MannschaftTraining />} />
        <Route path="spieltracking/*" element={<SpielTracking />} />
        <Route path="auswertung"      element={<MannschaftAuswertung />} />
        <Route path="berichte/*"      element={<ScoutingBerichte />} />
      </Routes>
    </div>
  )
}
