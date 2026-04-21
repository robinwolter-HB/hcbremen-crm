import { useState } from 'react'

// Körperzonen mit SVG-Pfaden (Vorder- und Rückansicht)
const ZONEN_VORDER = [
  { id:'kopf_v',          label:'Kopf',              path:'M 100,18 C 85,18 74,30 74,46 C 74,62 85,74 100,74 C 115,74 126,62 126,46 C 126,30 115,18 100,18 Z' },
  { id:'hals_v',          label:'Hals',              path:'M 90,74 L 110,74 L 112,88 L 88,88 Z' },
  { id:'schulter_links_v',label:'Schulter links',    path:'M 60,88 C 48,88 40,98 40,108 L 40,120 L 68,120 L 68,88 Z' },
  { id:'schulter_rechts_v',label:'Schulter rechts', path:'M 140,88 C 152,88 160,98 160,108 L 160,120 L 132,120 L 132,88 Z' },
  { id:'brust_v',         label:'Brust',             path:'M 68,88 L 132,88 L 132,130 L 68,130 Z' },
  { id:'bauch_v',         label:'Bauch',             path:'M 70,130 L 130,130 L 128,162 L 72,162 Z' },
  { id:'oberarm_links_v', label:'Oberarm links',     path:'M 40,120 L 58,120 L 60,155 L 38,155 Z' },
  { id:'oberarm_rechts_v',label:'Oberarm rechts',    path:'M 160,120 L 142,120 L 140,155 L 162,155 Z' },
  { id:'ellenbogen_links_v',label:'Ellenbogen links',path:'M 38,155 L 58,155 L 59,168 L 37,168 Z' },
  { id:'ellenbogen_rechts_v',label:'Ellenbogen rechts',path:'M 162,155 L 142,155 L 141,168 L 163,168 Z' },
  { id:'unterarm_links_v',label:'Unterarm links',    path:'M 37,168 L 57,168 L 55,200 L 35,200 Z' },
  { id:'unterarm_rechts_v',label:'Unterarm rechts', path:'M 163,168 L 143,168 L 145,200 L 165,200 Z' },
  { id:'hand_links_v',    label:'Hand links',        path:'M 32,200 L 56,200 L 54,218 L 30,218 Z' },
  { id:'hand_rechts_v',   label:'Hand rechts',       path:'M 168,200 L 144,200 L 146,218 L 170,218 Z' },
  { id:'huefte_links_v',  label:'Hüfte links',       path:'M 72,162 L 100,162 L 100,185 L 70,185 Z' },
  { id:'huefte_rechts_v', label:'Hüfte rechts',      path:'M 100,162 L 128,162 L 130,185 L 100,185 Z' },
  { id:'oberschenkel_links_v',label:'Oberschenkel links', path:'M 70,185 L 98,185 L 96,240 L 68,240 Z' },
  { id:'oberschenkel_rechts_v',label:'Oberschenkel rechts',path:'M 102,185 L 130,185 L 132,240 L 104,240 Z' },
  { id:'knie_links_v',    label:'Knie links',        path:'M 68,240 L 96,240 L 95,258 L 67,258 Z' },
  { id:'knie_rechts_v',   label:'Knie rechts',       path:'M 104,240 L 132,240 L 133,258 L 105,258 Z' },
  { id:'unterschenkel_links_v',label:'Unterschenkel links',path:'M 67,258 L 94,258 L 92,310 L 65,310 Z' },
  { id:'unterschenkel_rechts_v',label:'Unterschenkel rechts',path:'M 106,258 L 133,258 L 135,310 L 108,310 Z' },
  { id:'knoechel_links_v',label:'Knöchel links',     path:'M 65,310 L 92,310 L 91,325 L 64,325 Z' },
  { id:'knoechel_rechts_v',label:'Knöchel rechts',  path:'M 109,310 L 135,310 L 136,325 L 110,325 Z' },
  { id:'fuss_links_v',    label:'Fuß links',         path:'M 56,325 L 93,325 L 94,342 L 52,342 Z' },
  { id:'fuss_rechts_v',   label:'Fuß rechts',        path:'M 107,325 L 144,325 L 148,342 L 108,342 Z' },
]

const ZONEN_RUECK = [
  { id:'kopf_r',          label:'Kopf (hinten)',     path:'M 100,18 C 85,18 74,30 74,46 C 74,62 85,74 100,74 C 115,74 126,62 126,46 C 126,30 115,18 100,18 Z' },
  { id:'nacken_r',        label:'Nacken',            path:'M 90,74 L 110,74 L 112,88 L 88,88 Z' },
  { id:'schulter_links_r',label:'Schulter links',   path:'M 60,88 C 48,88 40,98 40,108 L 40,120 L 68,120 L 68,88 Z' },
  { id:'schulter_rechts_r',label:'Schulter rechts', path:'M 140,88 C 152,88 160,98 160,108 L 160,120 L 132,120 L 132,88 Z' },
  { id:'ruecken_oben_r',  label:'Oberer Rücken',    path:'M 68,88 L 132,88 L 132,125 L 68,125 Z' },
  { id:'ruecken_mitte_r', label:'Mittlerer Rücken', path:'M 68,125 L 132,125 L 132,150 L 68,150 Z' },
  { id:'lws_r',           label:'LWS / Lendenwirbel',path:'M 70,150 L 130,150 L 128,168 L 72,168 Z' },
  { id:'gesaess_links_r', label:'Gesäß links',      path:'M 72,168 L 100,168 L 100,190 L 70,190 Z' },
  { id:'gesaess_rechts_r',label:'Gesäß rechts',     path:'M 100,168 L 128,168 L 130,190 L 100,190 Z' },
  { id:'oberarm_links_r', label:'Oberarm links',    path:'M 40,120 L 58,120 L 60,155 L 38,155 Z' },
  { id:'oberarm_rechts_r',label:'Oberarm rechts',   path:'M 160,120 L 142,120 L 140,155 L 162,155 Z' },
  { id:'ellenbogen_links_r',label:'Ellenbogen links',path:'M 38,155 L 58,155 L 59,168 L 37,168 Z' },
  { id:'ellenbogen_rechts_r',label:'Ellenbogen rechts',path:'M 162,155 L 142,155 L 141,168 L 163,168 Z' },
  { id:'unterarm_links_r',label:'Unterarm links',   path:'M 37,168 L 57,168 L 55,200 L 35,200 Z' },
  { id:'unterarm_rechts_r',label:'Unterarm rechts', path:'M 163,168 L 143,168 L 145,200 L 165,200 Z' },
  { id:'oberschenkel_links_r',label:'Oberschenkel links (hinten)',path:'M 70,190 L 98,190 L 96,245 L 68,245 Z' },
  { id:'oberschenkel_rechts_r',label:'Oberschenkel rechts (hinten)',path:'M 102,190 L 130,190 L 132,245 L 104,245 Z' },
  { id:'kniekehl_links_r',label:'Kniekehle links',  path:'M 68,245 L 96,245 L 95,262 L 67,262 Z' },
  { id:'kniekehl_rechts_r',label:'Kniekehle rechts',path:'M 104,245 L 132,245 L 133,262 L 105,262 Z' },
  { id:'wade_links_r',    label:'Wade links',        path:'M 67,262 L 94,262 L 92,315 L 65,315 Z' },
  { id:'wade_rechts_r',   label:'Wade rechts',       path:'M 106,262 L 133,262 L 135,315 L 108,315 Z' },
  { id:'achilles_links_r',label:'Achillessehne links',path:'M 65,315 L 91,315 L 90,328 L 64,328 Z' },
  { id:'achilles_rechts_r',label:'Achillessehne rechts',path:'M 110,315 L 134,315 L 135,328 L 111,328 Z' },
  { id:'ferse_links_r',   label:'Ferse links',       path:'M 60,328 L 91,328 L 90,342 L 58,342 Z' },
  { id:'ferse_rechts_r',  label:'Ferse rechts',      path:'M 110,328 L 140,328 L 142,342 L 112,342 Z' },
]

const SCHWER_FARBEN = {
  leicht:   '#3a8a5a',
  mittel:   '#e07b30',
  schwer:   '#d94f4f',
  kritisch: '#8b0000',
}

export default function KoerperVisualisierung({ verletzungen = [], onZoneClick, readonly = false }) {
  const [ansicht, setAnsicht] = useState('vorder')
  const [hoveredZone, setHoveredZone] = useState(null)
  const zonen = ansicht === 'vorder' ? ZONEN_VORDER : ZONEN_RUECK

  // Mappe Körperteil-Namen auf Zonen-IDs
  function getZoneVerletzungen(zoneId) {
    const zone = zonen.find(z => z.id === zoneId)
    if (!zone) return []
    const label = zone.label.toLowerCase()
    return verletzungen.filter(v => {
      const kt = (v.koerperteil || '').toLowerCase()
      return kt && (
        label.includes(kt) || kt.includes(label.split(' ')[0]) ||
        // Fuzzy: knie trifft knie links/rechts
        label.split(' ').some(w => w.length > 3 && kt.includes(w))
      )
    })
  }

  function getZoneFarbe(zoneId) {
    const vl = getZoneVerletzungen(zoneId)
    if (!vl.length) return null
    // Schlimmste aktive Verletzung
    const aktive = vl.filter(v => !v.datum_genesung)
    const quelle = aktive.length ? aktive : vl
    const prio = ['kritisch','schwer','mittel','leicht']
    for (const p of prio) {
      if (quelle.some(v => v.schweregrad === p)) return SCHWER_FARBEN[p]
    }
    return '#ccc'
  }

  const hovered = hoveredZone ? zonen.find(z => z.id === hoveredZone) : null
  const hoveredVl = hoveredZone ? getZoneVerletzungen(hoveredZone) : []

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      {/* Ansicht Toggle */}
      <div style={{ display:'flex', gap:6 }}>
        <button onClick={()=>setAnsicht('vorder')} className={`btn btn-sm ${ansicht==='vorder'?'btn-primary':'btn-outline'}`}>Vorderseite</button>
        <button onClick={()=>setAnsicht('rueck')}  className={`btn btn-sm ${ansicht==='rueck'?'btn-primary':'btn-outline'}`}>Rückseite</button>
      </div>

      {/* Tooltip */}
      <div style={{ height:40, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {hovered ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--navy)' }}>{hovered.label}</div>
            {hoveredVl.length > 0 ? (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center', marginTop:2 }}>
                {hoveredVl.map(v => (
                  <span key={v.id} style={{ fontSize:11, padding:'1px 8px', borderRadius:10, fontWeight:600,
                    background: (v.datum_genesung ? '#e2efda' : (SCHWER_FARBEN[v.schweregrad]||'#ccc')+'22'),
                    color: v.datum_genesung ? '#2d6b3a' : (SCHWER_FARBEN[v.schweregrad]||'#555') }}>
                    {v.diagnose} {v.datum_genesung ? '(geheilt)' : ''}
                  </span>
                ))}
              </div>
            ) : (
              !readonly && <div style={{ fontSize:11, color:'var(--gray-400)' }}>Klicken zum Auswählen</div>
            )}
          </div>
        ) : (
          !readonly && <div style={{ fontSize:12, color:'var(--gray-400)' }}>Über Körperzone hovern oder klicken</div>
        )}
      </div>

      {/* SVG Körper */}
      <svg viewBox="0 0 200 360" width={180} height={324}
        style={{ cursor: readonly ? 'default' : 'pointer', filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}>

        {/* Körper-Silhouette Hintergrund */}
        <ellipse cx="100" cy="46" rx="26" ry="28" fill="#e8e4dc" stroke="#ccc" strokeWidth="0.5"/>
        <rect x="68" y="74" width="64" height="16" rx="4" fill="#e8e4dc" stroke="#ccc" strokeWidth="0.5"/>
        <path d="M 40,88 L 160,88 L 158,168 L 42,168 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="0.5"/>
        <path d="M 30,88 L 68,88 L 66,210 L 28,210 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="0.5"/>
        <path d="M 170,88 L 132,88 L 134,210 L 172,210 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="0.5"/>
        <path d="M 70,162 L 100,162 L 98,345 L 55,345 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="0.5"/>
        <path d="M 130,162 L 100,162 L 102,345 L 145,345 Z" fill="#e8e4dc" stroke="#ccc" strokeWidth="0.5"/>

        {/* Klickbare Zonen */}
        {zonen.map(zone => {
          const farbe = getZoneFarbe(zone.id)
          const isHovered = hoveredZone === zone.id
          return (
            <path key={zone.id} d={zone.path}
              fill={farbe ? farbe + (isHovered ? 'dd' : '88') : (isHovered ? '#0f224022' : 'transparent')}
              stroke={farbe ? farbe : (isHovered ? '#0f2240' : 'transparent')}
              strokeWidth={isHovered ? 1.5 : 1}
              style={{ transition:'all 0.15s' }}
              onMouseEnter={() => setHoveredZone(zone.id)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => !readonly && onZoneClick && onZoneClick(zone)}
            />
          )
        })}

        {/* Legende Punkte für aktive Verletzungen */}
        {verletzungen.filter(v => !v.datum_genesung).map((v, i) => null)}
      </svg>

      {/* Legende */}
      <div style={{ display:'flex', gap:12, fontSize:11, flexWrap:'wrap', justifyContent:'center' }}>
        {Object.entries(SCHWER_FARBEN).map(([k,f]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:f }}/>
            <span style={{ color:'var(--gray-600)', textTransform:'capitalize' }}>{k}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#3a8a5a', opacity:0.5 }}/>
          <span style={{ color:'var(--gray-600)' }}>geheilt</span>
        </div>
      </div>
    </div>
  )
}
