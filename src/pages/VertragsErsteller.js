import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const HC_BREMEN = {
  name: 'HC Bremen e. V.',
  strasse: 'Kattenturmer Heerstrasse 120d',
  plz: '28277',
  stadt: 'Bremen',
  telefon: '+49 (0) 173 2190820',
  vereinsregister: 'VR7466HB',
  steuernummer: '460 / 146 / 11175',
  finanzamt: 'Finanzamt Bremen',
}

const ZAHLUNGSWEISEN = ['Ueberweisung','SEPA-Lastschrift','Barzahlung']
const ZAHLUNGSZIELE = ['14 Tage','30 Tage','sofort nach Rechnungserhalt']
const ZAHLUNGSRHYTHMUS = ['einmalig zu Saisonbeginn','halbjaehrlich','vierteljaehrlich','monatlich']
const KUENDIGUNGSFRISTEN = ['4 Wochen','6 Wochen','3 Monate','6 Monate']
const VERLAENGERUNGSOPTIONEN = ['keine automatische Verlaengerung','automatische Verlaengerung um 1 Jahr','automatische Verlaengerung um 2 Jahre']
const GERICHTSSTAENDE = ['Bremen','Hamburg','Berlin']

function getPreisFuerLiga(leistung, liga) {
  if (!liga || liga === 'Oberliga') return leistung.preis
  if (liga === 'Regionalliga') return leistung.preis_regionalliga ?? leistung.preis
  if (liga === '3. Liga') return leistung.preis_3liga ?? leistung.preis
  if (liga === '2. Liga') return leistung.preis_2liga ?? leistung.preis
  if (liga === '1. Liga') return leistung.preis_1liga ?? leistung.preis
  return leistung.preis
}

// Props: vorgeladenerVertragId (optional, wenn aus Vertraege-Tab geöffnet)
export default function VertragsErsteller({ vorgeladenerVertragId }) {
  const [vertraege, setVertraege] = useState([])
  const [katalog, setKatalog] = useState([])
  const [kategorien, setKategorien] = useState([])
  const [pakete, setPakete] = useState([])
  const [klauseln, setKlauseln] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedVertragId, setSelectedVertragId] = useState(vorgeladenerVertragId || '')
  const [vertragsDaten, setVertragsDaten] = useState(null)
  const [festgeschrieben, setFestgeschrieben] = useState(false)
  const [saving, setSaving] = useState(false)

  // Bausteine
  const [vertragsNr, setVertragsNr] = useState('')
  const [ausstellungsDatum, setAusstellungsDatum] = useState(new Date().toISOString().slice(0,10))
  const [ausgewaehlteLeistungen, setAusgewaehlteLeistungen] = useState([])
  const [selectedPaketId, setSelectedPaketId] = useState('')
  const [individuelleLeistungen, setIndividuelleLeistungen] = useState([])
  const [zahlungsweise, setZahlungsweise] = useState('Ueberweisung')
  const [zahlungsziel, setZahlungsziel] = useState('30 Tage')
  const [zahlungsrhythmus, setZahlungsrhythmus] = useState('einmalig zu Saisonbeginn')
  const [kuendigungsfrist, setKuendigungsfrist] = useState('3 Monate')
  const [verlaengerung, setVerlaengerung] = useState('automatische Verlaengerung um 1 Jahr')
  const [gerichtsstand, setGerichtsstand] = useState('Bremen')
  const [ausgewaehlteKlauseln, setAusgewaehlteKlauseln] = useState([])
  const [sonderklausel, setSonderklausel] = useState('')
  const [rabattProzent, setRabattProzent] = useState('')
  const [rabattBetrag, setRabattBetrag] = useState('')
  const [rabattBezeichnung, setRabattBezeichnung] = useState('')
  const [ansprechpartnerHCB, setAnsprechpartnerHCB] = useState('')
  const [ansprechpartnerSponsor, setAnsprechpartnerSponsor] = useState('')

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (vorgeladenerVertragId && vertraege.length > 0) {
      onVertragWaehlen(vorgeladenerVertragId)
    }
  }, [vorgeladenerVertragId, vertraege])

  async function loadAll() {
    const [{ data: v }, { data: k }, { data: kat }, { data: p }, { data: kl }] = await Promise.all([
      supabase.from('sponsoring').select('*,kontakte(*),saisons(*),sponsoring_pakete(name),sponsoring_leistungen(*,leistungen_katalog(*,leistungen_kategorien(name,farbe)))').order('erstellt_am', { ascending: false }),
      supabase.from('leistungen_katalog').select('*,leistungen_kategorien(name,farbe)').order('erstellt_am'),
      supabase.from('leistungen_kategorien').select('*').order('reihenfolge'),
      supabase.from('sponsoring_pakete').select('*').eq('aktiv', true).order('basispreis'),
      supabase.from('vertragsklauseln').select('*').eq('aktiv', true).order('reihenfolge'),
    ])
    setVertraege(v || [])
    setKatalog(k || [])
    setKategorien(kat || [])
    setPakete(p || [])
    const kld = kl || []
    setKlauseln(kld)
    // Alle Standard-Klauseln vorauswählen
    setAusgewaehlteKlauseln(kld.filter(k => k.ist_standard).map(k => k.id))
    setLoading(false)

    // Falls vorgeladener Vertrag, direkt laden
    if (vorgeladenerVertragId && v) {
      const vertrag = v.find(x => x.id === vorgeladenerVertragId)
      if (vertrag) ladeVertrag(vertrag, kld)
    }
  }

  function ladeVertrag(v, kld) {
    // Leistungen automatisch aus sponsoring_leistungen übernehmen
    const vLeistungIds = (v.sponsoring_leistungen || []).map(sl => sl.leistung_id).filter(Boolean)
    setAusgewaehlteLeistungen(vLeistungIds)
    setIndividuelleLeistungen(v.individuelle_leistungen || [])
    setFestgeschrieben(v.vertrag_festgeschrieben || false)
    setSelectedPaketId(v.paket_id || '')

    // Vertragsnummer generieren
    const saison = v.saisons?.name?.replace('/', '-') || new Date().getFullYear()
    const firma = v.kontakte?.firma?.slice(0, 3).toUpperCase() || 'SPO'
    setVertragsNr(v.vertragsnummer || `HCB-${saison}-${firma}`)
    setRabattProzent(v.rabatt_prozent || '')
    setRabattBetrag(v.rabatt_betrag || '')
    setRabattBezeichnung(v.rabatt_bezeichnung || '')

    // Klauseln aus DB vorauswählen (Standard)
    if (kld && kld.length > 0) {
      setAusgewaehlteKlauseln(kld.filter(k => k.ist_standard).map(k => k.id))
    }

    setVertragsDaten(v)
    setSelectedVertragId(v.id)
  }

  function onVertragWaehlen(id) {
    const v = vertraege.find(v => v.id === id)
    if (!v) { setVertragsDaten(null); setSelectedVertragId(''); return }
    ladeVertrag(v, klauseln)
  }

  function toggleLeistung(id) {
    setAusgewaehlteLeistungen(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    )
  }

  function onPaketWaehlen(paketId) {
    setSelectedPaketId(paketId)
    // Wenn Paket gewählt: Leistungen des Pakets aus paket_leistungen laden
    // Für jetzt: Paket-Auswahl merken, wird im PDF gezeigt
  }

  function toggleKlausel(id) {
    setAusgewaehlteKlauseln(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    )
  }

  async function toggleFestschreiben() {
    if (!selectedVertragId) return
    const neu = !festgeschrieben
    setSaving(true)
    await supabase.from('sponsoring').update({
      vertrag_festgeschrieben: neu,
      vertragsnummer: vertragsNr || null
    }).eq('id', selectedVertragId)
    setFestgeschrieben(neu)
    setSaving(false)
  }

  function exportPDF() {
    if (!vertragsDaten) return
    const v = vertragsDaten
    const kontakt = v.kontakte || {}
    const saison = v.saisons || {}
    const liga = saison.liga || 'Oberliga'

    const rAdresse = kontakt.rechnung_strasse
      ? { firma: kontakt.rechnung_firma || kontakt.firma, strasse: kontakt.rechnung_strasse, plz: kontakt.rechnung_plz, stadt: kontakt.rechnung_stadt, land: kontakt.rechnung_land || 'Deutschland' }
      : { firma: kontakt.firma, strasse: kontakt.adresse_strasse, plz: kontakt.adresse_plz, stadt: kontakt.adresse_stadt, land: 'Deutschland' }

    const gewaehlt = katalog.filter(l => ausgewaehlteLeistungen.includes(l.id))
    const gesamtbetrag = v.jahresbetrag || gewaehlt.reduce((s, l) => s + (Number(getPreisFuerLiga(l, liga)) || 0), 0)
    const selectedPaket = pakete.find(p => p.id === (selectedPaketId || v.paket_id))

    const fmt = d => d ? new Date(d).toLocaleDateString('de-DE') : '-'
    const heute = new Date().toLocaleDateString('de-DE')
    const ausstellung = new Date(ausstellungsDatum).toLocaleDateString('de-DE')

    const aktivKlauseln = klauseln.filter(k => ausgewaehlteKlauseln.includes(k.id))

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Sponsoringvertrag - ${kontakt.firma}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.6; color: #1a1816; background: white; }
  @page { margin: 20mm 20mm 25mm 20mm; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #0f2240; margin-bottom: 24px; }
  .header-logo { font-size: 22pt; font-weight: 900; color: #0f2240; font-family: Georgia, serif; }
  .header-logo span { color: #c8a84b; }
  .header-sub { font-size: 8pt; color: #9a9590; margin-top: 3px; font-family: Arial, sans-serif; }
  .header-right { text-align: right; font-size: 8.5pt; color: #5a5650; font-family: Arial, sans-serif; line-height: 1.7; }

  .meta-row { display: flex; gap: 48px; margin-bottom: 32px; }
  .empfaenger { flex: 1; }
  .empfaenger-label { font-size: 7pt; color: #9a9590; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; font-family: Arial, sans-serif; }
  .empfaenger-block { font-size: 10.5pt; line-height: 1.8; }
  .vertrag-meta { font-family: Arial, sans-serif; font-size: 9pt; color: #5a5650; min-width: 200px; }
  .vertrag-meta table { width: 100%; border-collapse: collapse; }
  .vertrag-meta td { padding: 3px 0; }
  .vertrag-meta td:first-child { color: #9a9590; padding-right: 12px; white-space: nowrap; }
  .vertrag-meta td:last-child { font-weight: 600; color: #0f2240; }

  .vertrag-titel { text-align: center; margin: 28px 0 24px; }
  .vertrag-titel h1 { font-size: 16pt; font-weight: 700; color: #0f2240; font-family: Georgia, serif; margin-bottom: 6px; }
  .vertrag-titel .untertitel { font-size: 10pt; color: #5a5650; font-family: Arial, sans-serif; }

  .parteien { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f8f5ef; border-radius: 4px; padding: 16px; border: 1px solid #e0ddd6; }
  .partei-label { font-size: 8pt; font-weight: 700; color: #9a9590; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-family: Arial, sans-serif; }
  .partei-name { font-size: 11pt; font-weight: 700; color: #0f2240; margin-bottom: 4px; }
  .partei-detail { font-size: 9.5pt; color: #5a5650; line-height: 1.6; }

  .paragraph { margin-bottom: 20px; page-break-inside: avoid; }
  .paragraph-titel { font-size: 11pt; font-weight: 700; color: #0f2240; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e0ddd6; font-family: Arial, sans-serif; }
  .paragraph-text { font-size: 10.5pt; line-height: 1.7; text-align: justify; }
  .paragraph-text p { margin-bottom: 6px; }

  .leistungen-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-family: Arial, sans-serif; font-size: 9.5pt; }
  .leistungen-table thead tr { background: #0f2240; color: white; }
  .leistungen-table th { padding: 8px 10px; text-align: left; font-weight: 600; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .leistungen-table td { padding: 7px 10px; border-bottom: 1px solid #f0ede8; vertical-align: top; }
  .leistungen-table tbody tr:nth-child(even) { background: #fafaf8; }
  .leistungen-table tfoot td { padding: 10px; font-weight: 700; border-top: 2px solid #0f2240; background: #f8f5ef; }
  .kat-badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 8pt; font-weight: 600; color: white; }

  .paket-box { background: #f0f7ff; border: 1px solid #2d6fa3; border-radius: 4px; padding: 12px 16px; margin: 10px 0; font-family: Arial, sans-serif; }
  .paket-box-label { font-size: 8pt; color: #2d6fa3; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .paket-box-name { font-size: 13pt; font-weight: 700; color: #0f2240; }

  .betrag-box { background: #0f2240; color: white; border-radius: 4px; padding: 14px 20px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; font-family: Arial, sans-serif; }
  .betrag-label { font-size: 10pt; opacity: 0.7; }
  .betrag-wert { font-size: 18pt; font-weight: 700; color: #c8a84b; }
  .betrag-sub { font-size: 8.5pt; opacity: 0.6; margin-top: 2px; }

  .aufstieg-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9.5pt; margin: 10px 0; }
  .aufstieg-table th { background: #f8f5ef; padding: 7px 10px; text-align: left; font-size: 8pt; color: #5a5650; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #e0ddd6; }
  .aufstieg-table td { padding: 7px 10px; border: 1px solid #e0ddd6; }
  .gold { color: #c8a84b; font-weight: 700; }

  .unterschriften { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; page-break-inside: avoid; }
  .unterschrift-linie { border-bottom: 1.5px solid #1a1816; margin-bottom: 6px; height: 48px; }
  .unterschrift-label { font-family: Arial, sans-serif; font-size: 8.5pt; color: #5a5650; line-height: 1.6; }

  .doc-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0ddd6; font-family: Arial, sans-serif; font-size: 7.5pt; color: #9a9590; display: flex; justify-content: space-between; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="header-logo">HC <span>Bremen</span></div>
    <div class="header-sub">HANDBALLCLUB - SPONSORINGVERTRAG</div>
  </div>
  <div class="header-right">
    ${HC_BREMEN.name}<br>
    ${HC_BREMEN.strasse}<br>
    ${HC_BREMEN.plz} ${HC_BREMEN.stadt}<br>
    ${HC_BREMEN.telefon}<br>
    Vereinsregister: ${HC_BREMEN.vereinsregister}<br>
    St.-Nr.: ${HC_BREMEN.steuernummer}
  </div>
</div>

<div class="meta-row">
  <div class="empfaenger">
    <div class="empfaenger-label">Vertragspartner / Sponsor</div>
    <div class="empfaenger-block">
      <strong>${rAdresse.firma}</strong><br>
      ${rAdresse.strasse ? rAdresse.strasse + '<br>' : ''}
      ${rAdresse.plz || ''} ${rAdresse.stadt || ''}<br>
      ${rAdresse.land || 'Deutschland'}
      ${kontakt.ust_id ? '<br>USt-ID: ' + kontakt.ust_id : ''}
    </div>
  </div>
  <div class="vertrag-meta">
    <table>
      <tr><td>Vertragsnummer:</td><td>${vertragsNr || '-'}</td></tr>
      <tr><td>Ausstellungsdatum:</td><td>${ausstellung}</td></tr>
      <tr><td>Saison:</td><td>${saison.name || '-'}</td></tr>
      <tr><td>Liga:</td><td>${liga}</td></tr>
      ${v.vertragsbeginn ? `<tr><td>Laufzeit:</td><td>${fmt(v.vertragsbeginn)} - ${fmt(v.vertragsende)}</td></tr>` : ''}
      ${selectedPaket ? `<tr><td>Paket:</td><td>${selectedPaket.name}</td></tr>` : ''}
    </table>
  </div>
</div>

<div class="vertrag-titel">
  <h1>Sponsoringvertrag</h1>
  <div class="untertitel">zwischen dem HC Bremen e. V. und ${kontakt.firma} fuer die Saison ${saison.name || ''}</div>
</div>

<div class="parteien">
  <div>
    <div class="partei-label">Auftraggeber (Sponsor)</div>
    <div class="partei-name">${kontakt.firma}</div>
    <div class="partei-detail">
      ${rAdresse.strasse || ''}<br>
      ${rAdresse.plz || ''} ${rAdresse.stadt || ''}<br>
      - nachfolgend <strong>"Sponsor"</strong> genannt -
    </div>
  </div>
  <div>
    <div class="partei-label">Auftragnehmer (Verein)</div>
    <div class="partei-name">${HC_BREMEN.name}</div>
    <div class="partei-detail">
      ${HC_BREMEN.strasse}<br>
      ${HC_BREMEN.plz} ${HC_BREMEN.stadt}<br>
      - nachfolgend <strong>"Verein"</strong> genannt -
    </div>
  </div>
</div>

<div class="paragraph">
  <div class="paragraph-titel">Paragraph 1 - Praembel und Vertragsgegenstand</div>
  <div class="paragraph-text">
    <p>Der HC Bremen e. V. ist ein eingetragener Handballverein mit Sitz in Bremen (Vereinsregister ${HC_BREMEN.vereinsregister}). Gegenstand dieses Vertrages ist die Begruendung einer Sponsoringpartnerschaft zwischen dem Sponsor und dem Verein fuer die Spielzeit ${saison.name || ''}${liga !== 'Oberliga' ? ' (' + liga + ')' : ''}.</p>
    <p>Der Verein verpflichtet sich, dem Sponsor die in Paragraph 3 aufgefuehrten Gegenleistungen zu erbringen. Der Sponsor verpflichtet sich, die in Paragraph 4 genannte Sponsoringsumme zu entrichten.</p>
  </div>
</div>

<div class="paragraph">
  <div class="paragraph-titel">Paragraph 2 - Laufzeit und Kuendigung</div>
  <div class="paragraph-text">
    <p>Dieser Vertrag tritt mit Unterzeichnung durch beide Parteien in Kraft${v.vertragsbeginn ? ' und gilt fuer den Zeitraum vom ' + fmt(v.vertragsbeginn) + ' bis zum ' + fmt(v.vertragsende) : ''}.</p>
    <p><strong>Verlaengerung:</strong> ${verlaengerung === 'keine automatische Verlaengerung' ? 'Der Vertrag endet automatisch zum Ablauf der vereinbarten Laufzeit.' : 'Wird der Vertrag nicht mit einer Frist von ' + kuendigungsfrist + ' zum Vertragsende gekuendigt, verlaengert er sich ' + (verlaengerung.includes('1 Jahr') ? 'um ein weiteres Jahr' : 'um zwei weitere Jahre') + '.'}</p>
    <p><strong>Ordentliche Kuendigung:</strong> Die ordentliche Kuendigung ist mit einer Frist von ${kuendigungsfrist} zum Ende der jeweiligen Vertragslaufzeit moeglich. Die Kuendigung bedarf der Schriftform.</p>
    <p><strong>Ausserordentliche Kuendigung:</strong> Das Recht zur ausserordentlichen Kuendigung aus wichtigem Grund bleibt unberuehrt.</p>
  </div>
</div>

<div class="paragraph">
  <div class="paragraph-titel">Paragraph 3 - Leistungen des Vereins</div>
  <div class="paragraph-text">
    <p>Der Verein erbringt dem Sponsor fuer die Dauer der Vertragslaufzeit die folgenden Sponsoringmassnahmen:</p>
  </div>

  ${selectedPaket ? `
  <div class="paket-box">
    <div class="paket-box-label">Sponsoring-Paket</div>
    <div class="paket-box-name">${selectedPaket.name}${selectedPaket.basispreis ? ' - ' + Number(selectedPaket.basispreis).toLocaleString('de-DE') + ' EUR' : ''}</div>
    ${selectedPaket.beschreibung ? '<div style="font-size:10pt;color:#5a5650;margin-top:4px">' + selectedPaket.beschreibung + '</div>' : ''}
  </div>` : ''}

  ${gewaehlt.length > 0 ? `
  <table class="leistungen-table">
    <thead>
      <tr>
        <th style="width:45%">Leistung</th>
        <th style="width:20%">Kategorie</th>
        <th style="width:10%;text-align:center">Menge</th>
        <th style="width:25%;text-align:right">Wert (${liga})</th>
      </tr>
    </thead>
    <tbody>
      ${gewaehlt.map(l => {
        const preis = getPreisFuerLiga(l, liga)
        return `<tr>
          <td>
            <strong>${l.name}</strong>
            ${l.beschreibung ? '<br><span style="font-size:8.5pt;color:#9a9590">' + l.beschreibung + '</span>' : ''}
            ${l.exklusiv ? '<br><span style="font-size:8pt;background:#0f2240;color:white;padding:1px 6px;border-radius:10px">EXKLUSIV</span>' : ''}
          </td>
          <td>${l.leistungen_kategorien ? '<span class="kat-badge" style="background:' + (l.leistungen_kategorien.farbe || '#9a9590') + '">' + l.leistungen_kategorien.name + '</span>' : '-'}</td>
          <td style="text-align:center">${l.max_anzahl || 1}x</td>
          <td style="text-align:right;font-weight:600">${preis ? Number(preis).toLocaleString('de-DE') + ' EUR' : '-'}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>` : '<p style="color:#9a9590;font-size:10pt;margin-top:8px">Keine Einzelleistungen ausgewaehlt.</p>'}

  ${(individuelleLeistungen || []).filter(Boolean).length > 0 ? `
  <p style="margin-top:12px;font-size:10pt;font-weight:600">Zusaetzlich vereinbarte individuelle Leistungen:</p>
  <ul style="margin:6px 0 0 20px;font-size:10pt;line-height:1.8">
    ${individuelleLeistungen.filter(Boolean).map(l => `<li>${l}</li>`).join('')}
  </ul>` : ''}

  <div class="paragraph-text" style="margin-top:12px">
    <p>Der Verein sichert zu, alle vereinbarten Leistungen mit der gebotenen Sorgfalt zu erbringen. Geringfuegige Abweichungen aus dem Spielbetrieb berechtigen nicht zur Minderung der Sponsoringsumme.</p>
  </div>
</div>

<div class="paragraph">
  <div class="paragraph-titel">Paragraph 4 - Sponsoringsumme und Zahlungsmodalitaeten</div>
  ${(rabattProzent||rabattBetrag) ? `
  <div style="background:#f8f5ef;border:1.5px solid #e0ddd6;border-radius:4px;padding:12px 16px;margin:12px 0;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:10pt;color:#9a9590;font-family:Arial">${rabattBezeichnung||'Rabatt'}</div>
      ${rabattProzent?`<div style="font-size:9pt;color:#d94f4f;font-family:Arial">${rabattProzent}% Nachlass</div>`:''}
      ${rabattBetrag?`<div style="font-size:9pt;color:#d94f4f;font-family:Arial">Festbetrag: ${Number(rabattBetrag).toLocaleString('de-DE')} EUR</div>`:''}
    </div>
    <div style="text-align:right;font-family:Arial">
      ${rabattProzent&&!rabattBetrag?`<div style="font-size:14pt;font-weight:700;color:#d94f4f">-${Number(gesamtbetrag*rabattProzent/100).toLocaleString('de-DE')} EUR</div>`:''}
      ${rabattBetrag&&!rabattProzent?`<div style="font-size:14pt;font-weight:700;color:#d94f4f">-${Number(rabattBetrag).toLocaleString('de-DE')} EUR</div>`:''}
      ${rabattProzent&&rabattBetrag?`<div style="font-size:14pt;font-weight:700;color:#d94f4f">-${Number(gesamtbetrag*rabattProzent/100+Number(rabattBetrag)).toLocaleString('de-DE')} EUR</div>`:''}
    </div>
  </div>` : ''}
  <div class="betrag-box">
    <div>
      <div class="betrag-label">Gesamte Sponsoringsumme (${liga})</div>
      <div class="betrag-sub">zzgl. gesetzlicher Mehrwertsteuer, sofern anwendbar</div>
    </div>
    <div style="text-align:right">
      <div class="betrag-wert">${(() => {
      let final = Number(gesamtbetrag)
      if (rabattProzent) final -= final * Number(rabattProzent) / 100
      if (rabattBetrag) final -= Number(rabattBetrag)
      return final.toLocaleString('de-DE')
    })()} EUR</div>
    ${(rabattProzent||rabattBetrag)?`<div style="font-size:8.5pt;opacity:0.6;text-decoration:line-through">${Number(gesamtbetrag).toLocaleString('de-DE')} EUR (vor Rabatt)</div>`:''}
      <div class="betrag-sub">${zahlungsrhythmus}</div>
    </div>
  </div>

  ${(v.betrag_regionalliga || v.betrag_3liga || v.betrag_2liga || v.betrag_1liga) ? `
  <p style="font-size:10pt;margin:12px 0 8px;font-weight:600">Aufstiegskonditionen (vertraglich vereinbart):</p>
  <table class="aufstieg-table">
    <thead><tr><th>Liga</th><th>Jahresbetrag</th><th>Aenderung</th></tr></thead>
    <tbody>
      <tr><td>Oberliga (aktuell)</td><td>${Number(v.jahresbetrag || 0).toLocaleString('de-DE')} EUR</td><td>Basis</td></tr>
      ${v.betrag_regionalliga ? `<tr><td>Regionalliga</td><td class="gold">${Number(v.betrag_regionalliga).toLocaleString('de-DE')} EUR</td><td style="color:#3a8a5a">+${Number(v.betrag_regionalliga - v.jahresbetrag).toLocaleString('de-DE')} EUR</td></tr>` : ''}
      ${v.betrag_3liga ? `<tr><td>3. Liga</td><td class="gold">${Number(v.betrag_3liga).toLocaleString('de-DE')} EUR</td><td style="color:#3a8a5a">+${Number(v.betrag_3liga - v.jahresbetrag).toLocaleString('de-DE')} EUR</td></tr>` : ''}
      ${v.betrag_2liga ? `<tr><td>2. Liga</td><td class="gold">${Number(v.betrag_2liga).toLocaleString('de-DE')} EUR</td><td style="color:#3a8a5a">+${Number(v.betrag_2liga - v.jahresbetrag).toLocaleString('de-DE')} EUR</td></tr>` : ''}
      ${v.betrag_1liga ? `<tr><td>1. Liga</td><td class="gold">${Number(v.betrag_1liga).toLocaleString('de-DE')} EUR</td><td style="color:#3a8a5a">+${Number(v.betrag_1liga - v.jahresbetrag).toLocaleString('de-DE')} EUR</td></tr>` : ''}
    </tbody>
  </table>` : ''}

  <div class="paragraph-text" style="margin-top:12px">
    <p><strong>Zahlungsweise:</strong> ${zahlungsweise}</p>
    <p><strong>Zahlungsziel:</strong> ${zahlungsziel} nach Rechnungsstellung</p>
    <p><strong>Zahlungsrhythmus:</strong> ${zahlungsrhythmus}</p>
    <p>Bei Zahlungsverzug sind Verzugszinsen in Hoehe von 5 Prozentpunkten ueber dem Basiszinssatz p. a. gemaess BGB faellig.</p>
  </div>
</div>

<div class="paragraph">
  <div class="paragraph-titel">Paragraph 5 - Nutzungsrechte und Werbemittel</div>
  <div class="paragraph-text">
    <p>Der Sponsor raeumt dem Verein das Recht ein, Namen, Logo und Marke des Sponsors im Rahmen der vereinbarten Sponsoringmassnahmen zu verwenden. Der Verein verpflichtet sich, die Marke des Sponsors nur in einer dem Ansehen des Sponsors zutraeglichen Weise zu verwenden.</p>
    <p>Druckfertige Vorlagen sind vom Sponsor innerhalb von 14 Tagen nach Vertragsabschluss zu liefern.</p>
  </div>
</div>

${aktivKlauseln.map((k, i) => `
<div class="paragraph">
  <div class="paragraph-titel">Paragraph ${6 + i} - ${k.titel}</div>
  <div class="paragraph-text"><p>${k.text}</p></div>
</div>
`).join('')}

${sonderklausel.trim() ? `
<div class="paragraph">
  <div class="paragraph-titel">Paragraph ${6 + aktivKlauseln.length} - Individuelle Vereinbarungen</div>
  <div class="paragraph-text"><p>${sonderklausel}</p></div>
</div>` : ''}

<div class="paragraph">
  <div class="paragraph-titel">Paragraph ${6 + aktivKlauseln.length + (sonderklausel.trim() ? 1 : 0)} - Schlussbestimmungen</div>
  <div class="paragraph-text">
    <p><strong>Anwendbares Recht:</strong> Es gilt das Recht der Bundesrepublik Deutschland.</p>
    <p><strong>Gerichtsstand:</strong> Fuer alle Streitigkeiten ist, soweit gesetzlich zulaessig, ${gerichtsstand} vereinbart.</p>
    <p>Dieser Vertrag wurde in zwei gleichlautenden Exemplaren ausgefertigt.</p>
  </div>
</div>

<div class="unterschriften">
  <div>
    <div class="unterschrift-linie"></div>
    <div class="unterschrift-label">
      <strong>Bremen, den _______________</strong><br>
      ${HC_BREMEN.name}<br>
      ${ansprechpartnerHCB || 'Abteilungsleitung Sponsoring'}<br>
      (rechtsverbindliche Unterschrift)
    </div>
  </div>
  <div>
    <div class="unterschrift-linie"></div>
    <div class="unterschrift-label">
      <strong>_______________, den _______________</strong><br>
      ${kontakt.firma}<br>
      ${ansprechpartnerSponsor || 'Geschaeftsfuehrung'}<br>
      (rechtsverbindliche Unterschrift)
    </div>
  </div>
</div>

<div class="doc-footer">
  <div>HC Bremen e. V. - Kattenturmer Heerstrasse 120d - 28277 Bremen - Vereinsregister VR7466HB</div>
  <div>Vertragsnummer: ${vertragsNr || '-'} - Erstellt am: ${heute}</div>
</div>

</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.onload = () => { setTimeout(() => { win.print(); setTimeout(() => URL.revokeObjectURL(url), 1000) }, 600) }
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = `Sponsoringvertrag-${kontakt.firma?.replace(/\s/g, '-')}-${saison.name?.replace('/', '-')}.html`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div>
      <div className="card" style={{marginBottom:16}}>
        <div className="section-title" style={{marginBottom:12}}>Vertrag auswaehlen</div>
        <select value={selectedVertragId} onChange={e => onVertragWaehlen(e.target.value)}
          style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:14}}>
          <option value="">-- Vertrag auswaehlen --</option>
          {vertraege.map(v => (
            <option key={v.id} value={v.id}>
              {v.kontakte?.firma} - {v.saisons?.name} {v.vertrag_festgeschrieben ? '[gesperrt]' : ''}
            </option>
          ))}
        </select>
      </div>

      {!vertragsDaten && (
        <div className="empty-state card"><p>Waehle einen Vertrag aus um den Vertragsersteller zu oeffnen.</p></div>
      )}

      {vertragsDaten && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,alignItems:'start'}}>

          <div>
            {festgeschrieben && (
              <div style={{background:'#fff8f0',border:'2px solid #c8a84b',borderRadius:'var(--radius)',padding:'12px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:700,color:'#8a6a00',fontSize:14}}>Vertrag festgeschrieben</div>
                  <div style={{fontSize:12,color:'#a08040'}}>Haken entfernen um zu bearbeiten.</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={toggleFestschreiben} disabled={saving}
                  style={{borderColor:'#c8a84b',color:'#8a6a00'}}>Entsperren</button>
              </div>
            )}

            {/* Vertragskopf */}
            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:12}}>Vertragskopf</div>
              <div className="form-row">
                <div className="form-group"><label>Vertragsnummer</label>
                  <input value={vertragsNr} onChange={e=>setVertragsNr(e.target.value)} placeholder="HCB-2026-27-SPO"/>
                </div>
                <div className="form-group"><label>Ausstellungsdatum</label>
                  <input type="date" value={ausstellungsDatum} onChange={e=>setAusstellungsDatum(e.target.value)}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Unterzeichner HC Bremen</label>
                  <input value={ansprechpartnerHCB} onChange={e=>setAnsprechpartnerHCB(e.target.value)} placeholder="Name, Funktion"/>
                </div>
                <div className="form-group"><label>Unterzeichner Sponsor</label>
                  <input value={ansprechpartnerSponsor} onChange={e=>setAnsprechpartnerSponsor(e.target.value)} placeholder="Name, Funktion"/>
                </div>
              </div>
            </div>

            {/* Paket */}
            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:8}}>Sponsoring-Paket</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8}}>
                <label style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',border:'1.5px solid '+(selectedPaketId===''?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:selectedPaketId===''?'rgba(15,34,64,0.05)':'var(--white)'}}>
                  <input type="radio" name="paket" checked={selectedPaketId===''} onChange={()=>onPaketWaehlen('')}/>
                  <span style={{fontSize:13}}>Individuell</span>
                </label>
                {pakete.map(p => (
                  <label key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',border:'1.5px solid '+(selectedPaketId===p.id?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:selectedPaketId===p.id?'rgba(15,34,64,0.05)':'var(--white)'}}>
                    <input type="radio" name="paket" checked={selectedPaketId===p.id} onChange={()=>onPaketWaehlen(p.id)}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:600}}>{p.name}</div>
                      {p.basispreis&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{Number(p.basispreis).toLocaleString('de-DE')} EUR</div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Leistungen */}
            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:4}}>Leistungen auswaehlen</div>
              <p style={{fontSize:12,color:'var(--gray-400)',marginBottom:12}}>
                {ausgewaehlteLeistungen.length > 0 ? `${ausgewaehlteLeistungen.length} Leistungen aus dem Vertrag vorausgewaehlt.` : 'Keine Leistungen im Vertrag hinterlegt.'}
              </p>
              {kategorien.map(kat => {
                const katL = katalog.filter(l => l.kategorie_id === kat.id && l.aktiv)
                if (katL.length === 0) return null
                return (
                  <div key={kat.id} style={{marginBottom:14}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:kat.farbe||'#ccc'}}/>
                      <strong style={{fontSize:13,color:'var(--navy)'}}>{kat.name}</strong>
                    </div>
                    <div style={{display:'grid',gap:6}}>
                      {katL.map(l => {
                        const aktiv = ausgewaehlteLeistungen.includes(l.id)
                        const liga = vertragsDaten.saisons?.liga || 'Oberliga'
                        const preis = getPreisFuerLiga(l, liga)
                        return (
                          <label key={l.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',
                            border:'1.5px solid '+(aktiv?(kat.farbe||'var(--navy)'):'var(--gray-200)'),
                            borderRadius:'var(--radius)',cursor:'pointer',
                            background:aktiv?(kat.farbe||'#0f2240')+'18':'var(--white)'}}>
                            <input type="checkbox" checked={aktiv} onChange={()=>toggleLeistung(l.id)} style={{width:16,height:16,flexShrink:0}}/>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:aktiv?600:400}}>{l.name}</div>
                              {l.beschreibung&&<div style={{fontSize:11,color:'var(--gray-400)'}}>{l.beschreibung}</div>}
                            </div>
                            <div style={{fontSize:12,color:'var(--gray-500)',whiteSpace:'nowrap'}}>{preis ? Number(preis).toLocaleString('de-DE') + ' EUR' : '-'}</div>
                            {l.exklusiv&&<span style={{fontSize:10,background:'#0f2240',color:'white',padding:'1px 5px',borderRadius:8}}>EX</span>}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {(individuelleLeistungen||[]).filter(Boolean).length > 0 && (
                <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--gray-100)'}}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--gray-500)',marginBottom:8}}>Individuelle Leistungen aus dem Vertrag:</div>
                  {individuelleLeistungen.filter(Boolean).map((l,i) => (
                    <div key={i} style={{fontSize:13,padding:'4px 0',color:'var(--navy)'}}>{l}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Laufzeit & Zahlung */}
            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:12}}>Laufzeit & Kuendigung</div>
              <div className="form-row">
                <div className="form-group"><label>Verlaengerungsoption</label>
                  <select value={verlaengerung} onChange={e=>setVerlaengerung(e.target.value)}>
                    {VERLAENGERUNGSOPTIONEN.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Kuendigungsfrist</label>
                  <select value={kuendigungsfrist} onChange={e=>setKuendigungsfrist(e.target.value)}>
                    {KUENDIGUNGSFRISTEN.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:12}}>Zahlungsmodalitaeten</div>
              <div className="form-row">
                <div className="form-group"><label>Zahlungsweise</label>
                  <select value={zahlungsweise} onChange={e=>setZahlungsweise(e.target.value)}>
                    {ZAHLUNGSWEISEN.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Zahlungsziel</label>
                  <select value={zahlungsziel} onChange={e=>setZahlungsziel(e.target.value)}>
                    {ZAHLUNGSZIELE.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{border:'1.5px solid #e0ddd6',borderRadius:'var(--radius)',marginBottom:12,overflow:'hidden'}}>
              <div style={{background:'#f8f5ef',padding:'8px 14px',fontWeight:600,fontSize:13,color:'var(--navy)'}}>Rabatt (optional)</div>
              <div style={{padding:'14px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                <div className="form-group" style={{margin:0}}><label style={{fontSize:12}}>Rabatt %</label><input type="number" min="0" max="100" step="0.5" value={rabattProzent} onChange={e=>setRabattProzent(e.target.value)} placeholder="z.B. 10"/></div>
                <div className="form-group" style={{margin:0}}><label style={{fontSize:12}}>Festbetrag (EUR)</label><input type="number" min="0" value={rabattBetrag} onChange={e=>setRabattBetrag(e.target.value)} placeholder="z.B. 500"/></div>
                <div className="form-group" style={{margin:0}}><label style={{fontSize:12}}>Bezeichnung</label><input value={rabattBezeichnung} onChange={e=>setRabattBezeichnung(e.target.value)} placeholder="z.B. Treuerabatt"/></div>
              </div>
            </div>
            <div className="form-group"><label>Zahlungsrhythmus</label>
                <select value={zahlungsrhythmus} onChange={e=>setZahlungsrhythmus(e.target.value)}>
                  {ZAHLUNGSRHYTHMUS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Klauseln */}
            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:4}}>Vertragsklauseln</div>
              <p style={{fontSize:12,color:'var(--gray-400)',marginBottom:12}}>Standard-Klauseln sind vorausgewaehlt. Klauseln koennen in Einstellungen bearbeitet werden.</p>
              <div style={{display:'grid',gap:8}}>
                {klauseln.map(k => {
                  const aktiv = ausgewaehlteKlauseln.includes(k.id)
                  return (
                    <label key={k.id} style={{display:'flex',gap:10,padding:'10px 12px',
                      border:'1.5px solid '+(aktiv?'var(--navy)':'var(--gray-200)'),
                      borderRadius:'var(--radius)',cursor:'pointer',
                      background:aktiv?'rgba(15,34,64,0.04)':'var(--white)'}}>
                      <input type="checkbox" checked={aktiv} onChange={()=>toggleKlausel(k.id)} style={{width:16,height:16,flexShrink:0,marginTop:2}}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{k.titel}{k.ist_standard&&<span style={{marginLeft:6,fontSize:10,background:'#e2efda',color:'#2d6b3a',padding:'1px 6px',borderRadius:10}}>Standard</span>}</div>
                        <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2,lineHeight:1.5}}>{k.text.slice(0,100)}...</div>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="form-group" style={{marginTop:16}}>
                <label>Individuelle Vereinbarung (optional)</label>
                <textarea value={sonderklausel} onChange={e=>setSonderklausel(e.target.value)}
                  placeholder="z.B. Der Sponsor erhaelt exklusives Vorkaufsrecht fuer Logen-Plaetze bei Aufstieg..."
                  style={{minHeight:80}}/>
              </div>
              <div className="form-group">
                <label>Gerichtsstand</label>
                <select value={gerichtsstand} onChange={e=>setGerichtsstand(e.target.value)}>
                  {GERICHTSSTAENDE.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Rechte Spalte */}
          <div style={{position:'sticky',top:80}}>
            <div className="card" style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:10}}>Vertragspartner</div>
              <div style={{fontWeight:700,fontSize:15,color:'var(--navy)',marginBottom:4}}>{vertragsDaten.kontakte?.firma}</div>
              <div style={{fontSize:12,color:'var(--gray-500)',lineHeight:1.7}}>
                Saison: <strong>{vertragsDaten.saisons?.name}</strong><br/>
                Liga: <strong>{vertragsDaten.saisons?.liga || 'Oberliga'}</strong><br/>
                Paket: <strong>{pakete.find(p=>p.id===selectedPaketId)?.name || 'Individuell'}</strong><br/>
                {vertragsDaten.vertragsbeginn&&<>Laufzeit: <strong>{new Date(vertragsDaten.vertragsbeginn).toLocaleDateString('de-DE')} - {new Date(vertragsDaten.vertragsende).toLocaleDateString('de-DE')}</strong><br/></>}
              </div>
            </div>

            <div className="card" style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:10}}>Zusammenfassung</div>
              <div style={{display:'grid',gap:6,fontSize:13}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--gray-500)'}}>Leistungen:</span><strong>{ausgewaehlteLeistungen.length} ausgewaehlt</strong></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--gray-500)'}}>Klauseln:</span><strong>{ausgewaehlteKlauseln.length} aktiv</strong></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--gray-500)'}}>Zahlung:</span><strong>{zahlungsweise}</strong></div>
                <div style={{paddingTop:8,borderTop:'1px solid var(--gray-100)',display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'var(--gray-500)'}}>Betrag:</span>
                  <strong style={{color:'var(--navy)',fontSize:15}}>{Number(vertragsDaten.jahresbetrag||0).toLocaleString('de-DE')} EUR</strong>
                </div>
              </div>
            </div>

            <div className="card" style={{display:'grid',gap:10}}>
              <button className="btn btn-primary" onClick={exportPDF} style={{width:'100%',justifyContent:'center'}}>
                Vertrag als PDF exportieren
              </button>
              <button onClick={toggleFestschreiben} disabled={saving}
                style={{width:'100%',padding:'10px',borderRadius:'var(--radius)',border:'1.5px solid',cursor:'pointer',fontWeight:600,fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  background:festgeschrieben?'#fff8f0':'#f0f9f4',
                  borderColor:festgeschrieben?'#c8a84b':'#3a8a5a',
                  color:festgeschrieben?'#8a6a00':'#2d6b3a'}}>
                {festgeschrieben ? 'Vertrag entsperren' : 'Vertrag festschreiben'}
              </button>
              {festgeschrieben && (
                <div style={{fontSize:11,color:'#8a6a00',background:'#fffbf0',padding:'8px 10px',borderRadius:6,textAlign:'center',lineHeight:1.5}}>
                  Festgeschriebene Vertraege koennen nicht bearbeitet werden.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
