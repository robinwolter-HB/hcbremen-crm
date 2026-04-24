// ══════════════════════════════════════════════════════════════
// PATCH für KontaktDetail.js — Geburtsdatum Ansprechpartner
// Drei Änderungen notwendig:
// ══════════════════════════════════════════════════════════════

// ── ÄNDERUNG 1: Zeile ~14 ──────────────────────────────────────
// Suche: const EMPTY_AP = { name:'', position:'', email:'', telefon:'', mobil:'', hauptansprechpartner:false, notiz:'' }
// Ersetze mit:
const EMPTY_AP = { name:'', position:'', email:'', telefon:'', mobil:'', geburtsdatum:'', hauptansprechpartner:false, notiz:'' }

// ── ÄNDERUNG 2: In der Ansprechpartner-Karte ──────────────────
// Suche: {ap.mobil&&<div style={{fontSize:13}}><span ...>Mobil</span><a href={'tel:'+ap.mobil}...
// Direkt DANACH einfügen:
{ap.geburtsdatum&&(
  <div style={{fontSize:13}}>
    <span style={{color:'var(--gray-400)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.3px',display:'block'}}>Geburtstag</span>
    <span>
      🎂 {new Date(ap.geburtsdatum+'T00:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'long'})}
      {(()=>{
        const [,mm,dd] = ap.geburtsdatum.split('-')
        const heute = new Date()
        const naechster = new Date(heute.getFullYear(), parseInt(mm)-1, parseInt(dd))
        if (naechster < heute) naechster.setFullYear(heute.getFullYear()+1)
        const diff = Math.ceil((naechster-heute)/(1000*60*60*24))
        return diff <= 30
          ? <span style={{marginLeft:8,fontSize:11,background:'#fce4d6',color:'#d94f4f',padding:'1px 7px',borderRadius:10,fontWeight:700}}>🎉 in {diff} Tagen</span>
          : null
      })()}
    </span>
  </div>
)}

// ── ÄNDERUNG 3: Im MODAL für Ansprechpartner ─────────────────
// Suche: <div className="form-group"><label>Notiz</label><textarea value={apForm.notiz||''}
// Direkt DAVOR einfügen:
<div className="form-row">
  <div className="form-group">
    <label>Geburtsdatum</label>
    <input type="date" value={apForm.geburtsdatum||''} onChange={e=>setApForm(f=>({...f,geburtsdatum:e.target.value}))}/>
  </div>
  <div className="form-group">{/* Spacer */}</div>
</div>

// ── ÄNDERUNG 4: In saveAP() ───────────────────────────────────
// Die Funktion übergibt bereits { ...apForm, kontakt_id: id }
// Das geburtsdatum wird automatisch mitgesendet — KEINE Änderung nötig
// Stelle nur sicher dass die DB-Spalte existiert (SQL wurde bereits ausgeführt)
