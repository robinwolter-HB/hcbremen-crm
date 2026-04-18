import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const HC_BREMEN = {
  name: 'HC Bremen e. V.',
  strasse: 'Kattenturmer Heerstraße 120d',
  plz: '28277',
  stadt: 'Bremen',
  telefon: '+49 (0) 173 2190820',
  vereinsregister: 'VR7466HB',
  steuernummer: '460 / 146 / 11175',
  finanzamt: 'Finanzamt Bremen',
}

const ZAHLUNGSWEISEN = ['Überweisung','SEPA-Lastschrift','Barzahlung']
const ZAHLUNGSZIELE = ['14 Tage','30 Tage','sofort nach Rechnungserhalt']
const ZAHLUNGSRHYTHMUS = ['einmalig zu Saisonbeginn','halbjährlich','vierteljährlich','monatlich']
const KUENDIGUNGSFRISTEN = ['4 Wochen','6 Wochen','3 Monate','6 Monate']
const VERLAENGERUNGSOPTIONEN = ['keine automatische Verlängerung','automatische Verlängerung um 1 Jahr','automatische Verlängerung um 2 Jahre']
const GERICHTSSTAENDE = ['Bremen','Hamburg','Berlin']

// Standard-Klauseln
const STANDARD_KLAUSELN = [
  {
    id: 'vertraulichkeit',
    titel: 'Vertraulichkeit',
    text: 'Beide Parteien verpflichten sich, alle im Rahmen dieses Vertrages erlangten vertraulichen Informationen der jeweils anderen Partei vertraulich zu behandeln und nicht an Dritte weiterzugeben, soweit diese nicht bereits allgemein bekannt sind oder werden.'
  },
  {
    id: 'abtretung',
    titel: 'Abtretungsverbot',
    text: 'Die aus diesem Vertrag resultierenden Rechte und Pflichten können ohne vorherige schriftliche Zustimmung der jeweils anderen Partei nicht auf Dritte übertragen werden.'
  },
  {
    id: 'force_majeure',
    titel: 'Höhere Gewalt',
    text: 'Keine der Vertragsparteien haftet für die Nichterfüllung von Verpflichtungen aus diesem Vertrag, soweit diese auf Ereignisse höherer Gewalt zurückzuführen sind (z. B. Pandemien, Naturkatastrophen, behördliche Anordnungen). Der HC Bremen behält sich vor, bei Ausfall von Spielen oder Veranstaltungen aus diesen Gründen, die betroffenen Leistungen in der darauffolgenden Saison zu erbringen.'
  },
  {
    id: 'aenderungen',
    titel: 'Änderungen und Ergänzungen',
    text: 'Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Dies gilt auch für die Aufhebung dieses Schriftformerfordernisses. Mündliche Nebenabreden bestehen nicht.'
  },
  {
    id: 'salvatorisch',
    titel: 'Salvatorische Klausel',
    text: 'Sollten einzelne Bestimmungen dieses Vertrages ganz oder teilweise unwirksam sein oder werden, so berührt dies die Wirksamkeit der übrigen Bestimmungen nicht. Die unwirksame Bestimmung ist durch eine wirksame zu ersetzen, die dem wirtschaftlichen Zweck der unwirksamen möglichst nahe kommt.'
  },
  {
    id: 'datenschutz',
    titel: 'Datenschutz',
    text: 'Beide Parteien verpflichten sich, die geltenden Datenschutzgesetze, insbesondere die DSGVO, einzuhalten. Personenbezogene Daten werden ausschließlich zur Vertragsabwicklung verwendet und nicht ohne Einwilligung an Dritte weitergegeben.'
  },
]

function getPreisFuerLiga(leistung, liga) {
  if (!liga || liga === 'Oberliga') return leistung.preis
  if (liga === 'Regionalliga') return leistung.preis_regionalliga ?? leistung.preis
  if (liga === '3. Liga') return leistung.preis_3liga ?? leistung.preis
  if (liga === '2. Liga') return leistung.preis_2liga ?? leistung.preis
  if (liga === '1. Liga') return leistung.preis_1liga ?? leistung.preis
  return leistung.preis
}

export default function VertragsErsteller() {
  const [vertraege, setVertraege] = useState([])
  const [saisons, setSaisons] = useState([])
  const [katalog, setKatalog] = useState([])
  const [kategorien, setKategorien] = useState([])
  const [kontakteMap, setKontakteMap] = useState({})
  const [loading, setLoading] = useState(true)

  // Vertragsersteller State
  const [selectedVertragId, setSelectedVertragId] = useState('')
  const [vertragsDaten, setVertragsDaten] = useState(null)
  const [festgeschrieben, setFestgeschrieben] = useState(false)
  const [saving, setSaving] = useState(false)

  // Bausteine
  const [unterzeichner, setUnterzeichner] = useState('')
  const [vertragsNr, setVertragsNr] = useState('')
  const [ausstellungsDatum, setAusstellungsDatum] = useState(new Date().toISOString().slice(0,10))
  const [ausgewaehlteLeistungen, setAusgewaehlteLeistungen] = useState([])
  const [individuelleLeistungen, setIndividuelleLeistungen] = useState([])
  const [zahlungsweise, setZahlungsweise] = useState('Überweisung')
  const [zahlungsziel, setZahlungsziel] = useState('30 Tage')
  const [zahlungsrhythmus, setZahlungsrhythmus] = useState('einmalig zu Saisonbeginn')
  const [kuendigungsfrist, setKuendigungsfrist] = useState('3 Monate')
  const [verlaengerung, setVerlaengerung] = useState('automatische Verlängerung um 1 Jahr')
  const [gerichtsstand, setGerichtsstand] = useState('Bremen')
  const [ausgewaehlteKlauseln, setAusgewaehlteKlauseln] = useState(['vertraulichkeit','abtretung','force_majeure','aenderungen','salvatorisch','datenschutz'])
  const [sonderklausel, setSonderklausel] = useState('')
  const [ansprechpartnerHCB, setAnsprechpartnerHCB] = useState('')
  const [ansprechpartnerSponsor, setAnsprechpartnerSponsor] = useState('')

  // Gespeicherte Vertragsvorlagen

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: v },{ data: s },{ data: k },{ data: kat },{ data: ko }] = await Promise.all([
      supabase.from('sponsoring').select('*,kontakte(*),saisons(*),sponsoring_pakete(name),sponsoring_leistungen(*,leistungen_katalog(*,leistungen_kategorien(name,farbe)))').order('erstellt_am', { ascending: false }),
      supabase.from('saisons').select('*').order('beginn', { ascending: false }),
      supabase.from('leistungen_katalog').select('*,leistungen_kategorien(name,farbe)').order('erstellt_am'),
      supabase.from('leistungen_kategorien').select('*').order('reihenfolge'),
      supabase.from('kontakte').select('id,firma,rechnung_firma,rechnung_strasse,rechnung_plz,rechnung_stadt,rechnung_land,rechnung_email,adresse_strasse,adresse_plz,adresse_stadt,ust_id').order('firma'),
    ])
    setVertraege(v || [])
    setSaisons(s || [])
    setKatalog(k || [])
    setKategorien(kat || [])
    const km = {}; (ko || []).forEach(k => { km[k.id] = k }); setKontakteMap(km)

    setLoading(false)
  }

  function onVertragWaehlen(id) {
    setSelectedVertragId(id)
    const v = vertraege.find(v => v.id === id)
    if (!v) { setVertragsDaten(null); return }

    // Bestehende Leistungen aus dem Vertrag laden
    const vLeistungen = (v.sponsoring_leistungen || []).map(sl => sl.leistung_id).filter(Boolean)
    setAusgewaehlteLeistungen(vLeistungen)
    setIndividuelleLeistungen(v.individuelle_leistungen || [])
    setFestgeschrieben(v.vertrag_festgeschrieben || false)

    // Vertragsnummer generieren falls leer
    if (!v.vertragsnummer) {
      const saison = v.saisons?.name?.replace('/','-') || new Date().getFullYear()
      const firma = v.kontakte?.firma?.slice(0,3).toUpperCase() || 'SPO'
      setVertragsNr(`HCB-${saison}-${firma}`)
    } else {
      setVertragsNr(v.vertragsnummer || '')
    }

    setVertragsDaten(v)
  }

  function toggleLeistung(id) {
    setAusgewaehlteLeistungen(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    )
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
    loadAll()
  }

  function exportPDF() {
    if (!vertragsDaten) return
    const v = vertragsDaten
    const kontakt = v.kontakte || {}
    const saison = v.saisons || {}
    const liga = saison.liga || 'Oberliga'

    // Rechnungsadresse bestimmen
    const rAdresse = kontakt.rechnung_strasse
      ? { firma: kontakt.rechnung_firma || kontakt.firma, strasse: kontakt.rechnung_strasse, plz: kontakt.rechnung_plz, stadt: kontakt.rechnung_stadt, land: kontakt.rechnung_land || 'Deutschland' }
      : { firma: kontakt.firma, strasse: kontakt.adresse_strasse, plz: kontakt.adresse_plz, stadt: kontakt.adresse_stadt, land: 'Deutschland' }

    // Ausgewählte Leistungen aus Katalog
    const gewaehlt = katalog.filter(l => ausgewaehlteLeistungen.includes(l.id))
    const gesamtbetrag = v.jahresbetrag || gewaehlt.reduce((s,l) => s + (Number(getPreisFuerLiga(l, liga)) || 0), 0)

    // Datum formatieren
    const fmt = d => d ? new Date(d).toLocaleDateString('de-DE') : '–'
    const heute = new Date().toLocaleDateString('de-DE')
    const ausstellung = new Date(ausstellungsDatum).toLocaleDateString('de-DE')

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Sponsoringvertrag – ${kontakt.firma}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.6; color: #1a1816; background: white; }
  @page { margin: 20mm 20mm 25mm 20mm; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display:none; } }

  /* Briefkopf */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #0f2240; margin-bottom: 24px; }
  .header-left { flex: 1; }
  .header-logo { font-size: 22pt; font-weight: 900; color: #0f2240; letter-spacing: -0.5px; font-family: Georgia, serif; }
  .header-logo span { color: #c8a84b; }
  .header-sub { font-size: 8pt; color: #9a9590; margin-top: 3px; font-family: Arial, sans-serif; letter-spacing: 0.5px; }
  .header-right { text-align: right; font-size: 8.5pt; color: #5a5650; font-family: Arial, sans-serif; line-height: 1.7; }

  /* Empfänger & Metadaten */
  .meta-row { display: flex; gap: 48px; margin-bottom: 32px; }
  .empfaenger { flex: 1; }
  .empfaenger-label { font-size: 7pt; color: #9a9590; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; font-family: Arial, sans-serif; }
  .empfaenger-block { font-size: 10.5pt; line-height: 1.8; }
  .vertrag-meta { font-family: Arial, sans-serif; font-size: 9pt; color: #5a5650; min-width: 200px; }
  .vertrag-meta table { width: 100%; border-collapse: collapse; }
  .vertrag-meta td { padding: 3px 0; }
  .vertrag-meta td:first-child { color: #9a9590; padding-right: 12px; white-space: nowrap; }
  .vertrag-meta td:last-child { font-weight: 600; color: #0f2240; }

  /* Titel */
  .vertrag-titel { text-align: center; margin: 28px 0 24px; }
  .vertrag-titel h1 { font-size: 16pt; font-weight: 700; color: #0f2240; font-family: Georgia, serif; margin-bottom: 6px; }
  .vertrag-titel .untertitel { font-size: 10pt; color: #5a5650; font-family: Arial, sans-serif; }

  /* Parteien */
  .parteien { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f8f5ef; border-radius: 4px; padding: 16px; border: 1px solid #e0ddd6; }
  .partei-block { }
  .partei-label { font-size: 8pt; font-weight: 700; color: #9a9590; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-family: Arial, sans-serif; }
  .partei-name { font-size: 11pt; font-weight: 700; color: #0f2240; margin-bottom: 4px; }
  .partei-detail { font-size: 9.5pt; color: #5a5650; line-height: 1.6; }

  /* Paragraphen */
  .paragraph { margin-bottom: 20px; page-break-inside: avoid; }
  .paragraph-titel { font-size: 11pt; font-weight: 700; color: #0f2240; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e0ddd6; font-family: Arial, sans-serif; }
  .paragraph-text { font-size: 10.5pt; line-height: 1.7; text-align: justify; }
  .paragraph-text p { margin-bottom: 6px; }

  /* Leistungstabelle */
  .leistungen-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-family: Arial, sans-serif; font-size: 9.5pt; }
  .leistungen-table thead tr { background: #0f2240; color: white; }
  .leistungen-table th { padding: 8px 10px; text-align: left; font-weight: 600; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .leistungen-table td { padding: 7px 10px; border-bottom: 1px solid #f0ede8; vertical-align: top; }
  .leistungen-table tbody tr:nth-child(even) { background: #fafaf8; }
  .leistungen-table .kat-badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 8pt; font-weight: 600; color: white; }
  .leistungen-table tfoot td { padding: 10px; font-weight: 700; border-top: 2px solid #0f2240; background: #f8f5ef; }

  /* Gesamtbetrag */
  .betrag-box { background: #0f2240; color: white; border-radius: 4px; padding: 14px 20px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; font-family: Arial, sans-serif; }
  .betrag-label { font-size: 10pt; opacity: 0.7; }
  .betrag-wert { font-size: 18pt; font-weight: 700; color: #c8a84b; }
  .betrag-sub { font-size: 8.5pt; opacity: 0.6; margin-top: 2px; }

  /* Aufstiegskonditionen */
  .aufstieg-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9.5pt; margin: 10px 0; }
  .aufstieg-table th { background: #f8f5ef; padding: 7px 10px; text-align: left; font-size: 8pt; color: #5a5650; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #e0ddd6; }
  .aufstieg-table td { padding: 7px 10px; border: 1px solid #e0ddd6; }
  .aufstieg-table .gold { color: #c8a84b; font-weight: 700; }

  /* Unterschriften */
  .unterschriften { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; page-break-inside: avoid; }
  .unterschrift-block { }
  .unterschrift-linie { border-bottom: 1.5px solid #1a1816; margin-bottom: 6px; height: 40px; }
  .unterschrift-label { font-family: Arial, sans-serif; font-size: 8.5pt; color: #5a5650; line-height: 1.5; }

  /* Footer */
  .doc-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0ddd6; font-family: Arial, sans-serif; font-size: 7.5pt; color: #9a9590; display: flex; justify-content: space-between; }

  /* Seitenumbruch */
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- BRIEFKOPF -->
<div class="header">
  <div class="header-left">
    <div class="header-logo">HC <span>Bremen</span></div>
    <div class="header-sub">HANDBALLCLUB · SPONSORINGVERTRAG</div>
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

<!-- EMPFÄNGER & META -->
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
      <tr><td>Vertragsnummer:</td><td>${vertragsNr || '–'}</td></tr>
      <tr><td>Ausstellungsdatum:</td><td>${ausstellung}</td></tr>
      <tr><td>Saison:</td><td>${saison.name || '–'}</td></tr>
      <tr><td>Liga:</td><td>${liga}</td></tr>
      ${v.vertragsbeginn ? `<tr><td>Laufzeit:</td><td>${fmt(v.vertragsbeginn)} – ${fmt(v.vertragsende)}</td></tr>` : ''}
      ${v.sponsoring_pakete?.name ? `<tr><td>Paket:</td><td>${v.sponsoring_pakete.name}</td></tr>` : ''}
    </table>
  </div>
</div>

<!-- TITEL -->
<div class="vertrag-titel">
  <h1>Sponsoringvertrag</h1>
  <div class="untertitel">zwischen dem HC Bremen e. V. und ${kontakt.firma} für die Saison ${saison.name || ''}</div>
</div>

<!-- PARTEIEN -->
<div class="parteien">
  <div class="partei-block">
    <div class="partei-label">§ Auftraggeber (Sponsor)</div>
    <div class="partei-name">${kontakt.firma}</div>
    <div class="partei-detail">
      ${rAdresse.strasse || ''}<br>
      ${rAdresse.plz || ''} ${rAdresse.stadt || ''}<br>
      ${ansprechpartnerSponsor ? '– nachfolgend <strong>„Sponsor"</strong> genannt –' : '– nachfolgend <strong>„Sponsor"</strong> genannt –'}
    </div>
  </div>
  <div class="partei-block">
    <div class="partei-label">§ Auftragnehmer (Verein)</div>
    <div class="partei-name">${HC_BREMEN.name}</div>
    <div class="partei-detail">
      ${HC_BREMEN.strasse}<br>
      ${HC_BREMEN.plz} ${HC_BREMEN.stadt}<br>
      – nachfolgend <strong>„Verein"</strong> genannt –
    </div>
  </div>
</div>

<!-- § 1 PRÄAMBEL -->
<div class="paragraph">
  <div class="paragraph-titel">§ 1 Präambel und Vertragsgegenstand</div>
  <div class="paragraph-text">
    <p>Der HC Bremen e. V. ist ein eingetragener Handballverein mit Sitz in Bremen (Vereinsregister ${HC_BREMEN.vereinsregister}). Der Verein beabsichtigt, im Rahmen seiner sportlichen Aktivitäten in der Saison ${saison.name || ''} Sponsoren zu gewinnen, die den Verein finanziell und/oder durch Sachleistungen unterstützen.</p>
    <p>Gegenstand dieses Vertrages ist die Begründung einer Sponsoringpartnerschaft zwischen dem Sponsor und dem Verein für die Spielzeit ${saison.name || ''}${liga !== 'Oberliga' ? ' (' + liga + ')' : ''}. Der Verein verpflichtet sich, dem Sponsor die in § 3 aufgeführten Gegenleistungen zu erbringen. Der Sponsor verpflichtet sich, die in § 4 genannte Sponsoringsumme zu entrichten.</p>
  </div>
</div>

<!-- § 2 LAUFZEIT -->
<div class="paragraph">
  <div class="paragraph-titel">§ 2 Laufzeit und Kündigung</div>
  <div class="paragraph-text">
    <p>Dieser Vertrag tritt mit Unterzeichnung durch beide Parteien in Kraft${v.vertragsbeginn ? ' und gilt für den Zeitraum vom ' + fmt(v.vertragsbeginn) + ' bis zum ' + fmt(v.vertragsende) : ''}.</p>
    <p><strong>Verlängerung:</strong> ${verlaengerung === 'keine automatische Verlängerung' ? 'Der Vertrag endet automatisch zum Ablauf der vereinbarten Laufzeit ohne dass es einer gesonderten Kündigung bedarf.' : 'Wird der Vertrag nicht mit einer Frist von ' + kuendigungsfrist + ' zum Vertragsende gekündigt, verlängert er sich ' + (verlaengerung.includes('1 Jahr') ? 'um ein weiteres Jahr' : 'um zwei weitere Jahre') + '.'}</p>
    <p><strong>Ordentliche Kündigung:</strong> Die ordentliche Kündigung ist mit einer Frist von ${kuendigungsfrist} zum Ende der jeweiligen Vertragslaufzeit möglich. Die Kündigung bedarf der Schriftform.</p>
    <p><strong>Außerordentliche Kündigung:</strong> Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt insbesondere vor, wenn eine Partei ihre vertraglichen Pflichten schwerwiegend verletzt und trotz schriftlicher Abmahnung nicht innerhalb von 14 Tagen Abhilfe schafft.</p>
  </div>
</div>

<!-- § 3 LEISTUNGEN -->
<div class="paragraph">
  <div class="paragraph-titel">§ 3 Leistungen des Vereins (Gegenleistungen)</div>
  <div class="paragraph-text">
    <p>Der Verein erbringt dem Sponsor für die Dauer der Vertragslaufzeit die folgenden Sponsoringmaßnahmen:</p>
  </div>

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
          <td>
            ${l.leistungen_kategorien ? '<span class="kat-badge" style="background:' + (l.leistungen_kategorien.farbe || '#9a9590') + '">' + l.leistungen_kategorien.name + '</span>' : '–'}
          </td>
          <td style="text-align:center">${l.max_anzahl || 1}x</td>
          <td style="text-align:right;font-weight:600">${preis ? Number(preis).toLocaleString('de-DE') + ' EUR' : '–'}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>` : ''}

  ${individuelleLeistungen.length > 0 ? `
  <p style="margin-top:12px;font-size:10pt;font-weight:600">Zusätzlich vereinbarte individuelle Leistungen:</p>
  <ul style="margin:6px 0 0 20px;font-size:10pt;line-height:1.8">
    ${individuelleLeistungen.filter(Boolean).map(l => `<li>${l}</li>`).join('')}
  </ul>` : ''}

  <div class="paragraph-text" style="margin-top:12px">
    <p>Der Verein sichert zu, alle vereinbarten Leistungen mit der gebotenen Sorgfalt und im vereinbarten Umfang zu erbringen. Geringfügige Abweichungen, die sich aus dem Spielbetrieb ergeben (z. B. Anzahl der Heimspiele), berechtigen nicht zur Minderung der Sponsoringsumme, sofern die Gesamtleistung im Wesentlichen erbracht wurde.</p>
  </div>
</div>

<!-- § 4 SPONSORINGSUMME -->
<div class="paragraph">
  <div class="paragraph-titel">§ 4 Sponsoringsumme und Zahlungsmodalitäten</div>
  <div class="paragraph-text">
    <p>Der Sponsor verpflichtet sich, für die vertraglich vereinbarten Leistungen die nachfolgende Sponsoringsumme zu entrichten:</p>
  </div>

  <div class="betrag-box">
    <div>
      <div class="betrag-label">Gesamte Sponsoringsumme (${liga})</div>
      <div class="betrag-sub">zzgl. gesetzlicher Mehrwertsteuer, sofern anwendbar</div>
    </div>
    <div style="text-align:right">
      <div class="betrag-wert">${Number(gesamtbetrag).toLocaleString('de-DE')} EUR</div>
      <div class="betrag-sub">${zahlungsrhythmus}</div>
    </div>
  </div>

  ${(v.betrag_regionalliga || v.betrag_3liga || v.betrag_2liga || v.betrag_1liga) ? `
  <p style="font-size:10pt;margin:12px 0 8px;font-weight:600">Aufstiegskonditionen (vertraglich vereinbart):</p>
  <table class="aufstieg-table">
    <thead>
      <tr>
        <th>Liga</th>
        <th>Jahresbetrag</th>
        <th>Änderung</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Oberliga (aktuell)</td><td>${Number(v.jahresbetrag||0).toLocaleString('de-DE')} EUR</td><td>Basis</td></tr>
      ${v.betrag_regionalliga ? `<tr><td>Regionalliga</td><td class="gold">${Number(v.betrag_regionalliga).toLocaleString('de-DE')} EUR</td><td style="color:#3a8a5a">+${Number(v.betrag_regionalliga-v.jahresbetrag).toLocaleString('de-DE')} EUR</td></tr>` : ''}
      ${v.betrag_3liga ? `<tr><td>3. Liga</td><td class="gold">${Number(v.betrag_3liga).toLocaleString('de-DE')} EUR</td><td style="color:#3a8a5a">+${Number(v.betrag_3liga-v.jahresbetrag).toLocaleString('de-DE')} EUR</td></tr>` : ''}
      ${v.betrag_2liga ? `<tr><td>2. Liga</td><td class="gold">${Number(v.betrag_2liga).toLocaleString('de-DE')} EUR</td><td style="color:#3a8a5a">+${Number(v.betrag_2liga-v.jahresbetrag).toLocaleString('de-DE')} EUR</td></tr>` : ''}
      ${v.betrag_1liga ? `<tr><td>1. Liga (Bundesliga)</td><td class="gold">${Number(v.betrag_1liga).toLocaleString('de-DE')} EUR</td><td style="color:#3a8a5a">+${Number(v.betrag_1liga-v.jahresbetrag).toLocaleString('de-DE')} EUR</td></tr>` : ''}
    </tbody>
  </table>
  <p style="font-size:9pt;color:#5a5650;margin-top:6px">Die Aufstiegskonditionen gelten jeweils für die erste Saison in der neuen Liga. Die Parteien verpflichten sich, bei Aufstieg einen entsprechenden Nachtrag zu unterzeichnen.</p>
  ` : ''}

  <div class="paragraph-text" style="margin-top:12px">
    <p><strong>Zahlungsweise:</strong> ${zahlungsweise}</p>
    <p><strong>Zahlungsziel:</strong> ${zahlungsziel} nach Rechnungsstellung</p>
    <p><strong>Zahlungsrhythmus:</strong> Die Sponsoringsumme wird ${zahlungsrhythmus} in Rechnung gestellt. Rechnungen werden an folgende Adresse gestellt: ${kontakt.rechnung_email || kontakt.email || rAdresse.firma + ', ' + (rAdresse.strasse||'') + ', ' + (rAdresse.plz||'') + ' ' + (rAdresse.stadt||'')}.</p>
    <p>Bei Zahlungsverzug sind Verzugszinsen in Höhe von 5 Prozentpunkten über dem jeweiligen Basiszinssatz p. a. gemäß § 288 BGB fällig. Der Verein ist berechtigt, bei Zahlungsverzug von mehr als 30 Tagen die vereinbarten Leistungen bis zur vollständigen Zahlung einzustellen.</p>
  </div>
</div>

<!-- § 5 NUTZUNGSRECHTE -->
<div class="paragraph">
  <div class="paragraph-titel">§ 5 Nutzungsrechte und Werbemittel</div>
  <div class="paragraph-text">
    <p>Der Sponsor räumt dem Verein das Recht ein, den Namen, das Logo und die Marke des Sponsors im Rahmen der vereinbarten Sponsoringmaßnahmen zu verwenden. Dies umfasst insbesondere die Darstellung auf Trikots, Banden, Flyern, der Vereinswebsite sowie in sozialen Medien, soweit dies zur Erfüllung der vereinbarten Gegenleistungen erforderlich ist.</p>
    <p>Der Verein verpflichtet sich, die Marke des Sponsors nur in einer dem Ansehen des Sponsors zuträglichen Weise zu verwenden. Druckfertige Vorlagen und Dateien sind vom Sponsor innerhalb von 14 Tagen nach Vertragsabschluss zu liefern. Bei verspäteter Lieferung verschiebt sich die Leistungspflicht des Vereins entsprechend.</p>
    <p>Der Sponsor ist berechtigt, die Partnerschaft mit dem HC Bremen e. V. in eigener Werbung zu kommunizieren und das Vereinslogo für diesen Zweck zu verwenden. Die Nutzung bedarf der vorherigen schriftlichen Zustimmung des Vereins im Einzelfall.</p>
  </div>
</div>

<!-- § 6 STANDARD-KLAUSELN -->
${STANDARD_KLAUSELN.filter(k => ausgewaehlteKlauseln.includes(k.id)).map((k, i) => `
<div class="paragraph">
  <div class="paragraph-titel">§ ${6 + i} ${k.titel}</div>
  <div class="paragraph-text"><p>${k.text}</p></div>
</div>
`).join('')}

<!-- SONDERKLAUSEL -->
${sonderklausel.trim() ? `
<div class="paragraph">
  <div class="paragraph-titel">§ ${6 + ausgewaehlteKlauseln.length} Individuelle Vereinbarungen</div>
  <div class="paragraph-text"><p>${sonderklausel}</p></div>
</div>
` : ''}

<!-- § SCHLUSSBESTIMMUNGEN -->
<div class="paragraph">
  <div class="paragraph-titel">§ ${6 + ausgewaehlteKlauseln.length + (sonderklausel.trim() ? 1 : 0)} Schlussbestimmungen</div>
  <div class="paragraph-text">
    <p><strong>Anwendbares Recht:</strong> Es gilt das Recht der Bundesrepublik Deutschland.</p>
    <p><strong>Gerichtsstand:</strong> Für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist, soweit gesetzlich zulässig, ${gerichtsstand} vereinbart.</p>
    <p>Dieser Vertrag wurde in zwei gleichlautenden Exemplaren ausgefertigt; je ein Exemplar verbleibt bei jeder Partei.</p>
  </div>
</div>

<!-- UNTERSCHRIFTEN -->
<div class="unterschriften">
  <div class="unterschrift-block">
    <div class="unterschrift-linie"></div>
    <div class="unterschrift-label">
      <strong>Bremen, den _______________</strong><br>
      ${HC_BREMEN.name}<br>
      ${ansprechpartnerHCB || 'Abteilungsleitung Sponsoring'}<br>
      (rechtsverbindliche Unterschrift)
    </div>
  </div>
  <div class="unterschrift-block">
    <div class="unterschrift-linie"></div>
    <div class="unterschrift-label">
      <strong>_______________, den _______________</strong><br>
      ${kontakt.firma}<br>
      ${ansprechpartnerSponsor || 'Geschäftsführung / Bevollmächtigte(r)'}<br>
      (rechtsverbindliche Unterschrift)
    </div>
  </div>
</div>

<!-- FOOTER -->
<div class="doc-footer">
  <div>HC Bremen e. V. · Kattenturmer Heerstraße 120d · 28277 Bremen · Vereinsregister VR7466HB</div>
  <div>Vertragsnummer: ${vertragsNr || '–'} · Erstellt am: ${heute}</div>
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
      a.href = url; a.download = `Sponsoringvertrag-${kontakt.firma?.replace(/\s/g,'-')}-${saison.name?.replace('/','-')}.html`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div>
      {/* Vertrag auswählen */}
      <div className="card" style={{marginBottom:16}}>
        <div className="section-title" style={{marginBottom:12}}>Vertrag auswählen</div>
        <select value={selectedVertragId} onChange={e => onVertragWaehlen(e.target.value)} style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--gray-200)',borderRadius:'var(--radius)',fontSize:14}}>
          <option value="">-- Vertrag auswählen --</option>
          {vertraege.map(v => (
            <option key={v.id} value={v.id}>
              {v.kontakte?.firma} - {v.saisons?.name} {v.saisons?.liga && v.saisons.liga !== "Oberliga" ? "(" + v.saisons.liga + ")" : ""} {v.vertrag_festgeschrieben ? "[gesperrt]" : ""}
            </option>
          ))}
        </select>
      </div>

      {!vertragsDaten && (
        <div className="empty-state card"><p>Wähle einen Vertrag aus um den Vertragsersteller zu öffnen.</p></div>
      )}

      {vertragsDaten && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,alignItems:'start'}}>

          {/* LINKE SPALTE: Bausteine */}
          <div>

            {/* Festschreiben-Banner */}
            {festgeschrieben && (
              <div style={{background:'#fff8f0',border:'2px solid #c8a84b',borderRadius:'var(--radius)',padding:'12px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:20}}>[Gesperrt]</span>
                  <div>
                    <div style={{fontWeight:700,color:'#8a6a00',fontSize:14}}>Vertrag festgeschrieben</div>
                    <div style={{fontSize:12,color:'#a08040'}}>Dieser Vertrag ist gesperrt. Haken entfernen um zu bearbeiten.</div>
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={toggleFestschreiben} disabled={saving} style={{borderColor:'#c8a84b',color:'#8a6a00'}}>
                  [Entsperren] Entsperren
                </button>
              </div>
            )}

            {/* § 0 Vertragskopf */}
            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:12}}>Vertragskopf</div>
              <div className="form-row">
                <div className="form-group"><label>Vertragsnummer</label><input value={vertragsNr} onChange={e=>setVertragsNr(e.target.value)} placeholder="HCB-2026-27-SPO"/></div>
                <div className="form-group"><label>Ausstellungsdatum</label><input type="date" value={ausstellungsDatum} onChange={e=>setAusstellungsDatum(e.target.value)}/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Unterzeichner HC Bremen</label><input value={ansprechpartnerHCB} onChange={e=>setAnsprechpartnerHCB(e.target.value)} placeholder="Name, Funktion"/></div>
                <div className="form-group"><label>Unterzeichner Sponsor</label><input value={ansprechpartnerSponsor} onChange={e=>setAnsprechpartnerSponsor(e.target.value)} placeholder="Name, Funktion"/></div>
              </div>
            </div>

            {/* § 3 Leistungen */}
            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:4}}>§ 3 Leistungen auswählen</div>
              <p style={{fontSize:12,color:'var(--gray-400)',marginBottom:12}}>Wähle die Leistungen die in diesem Vertrag enthalten sind.</p>
              {kategorien.map(kat => {
                const katL = katalog.filter(l => l.kategorie_id === kat.id && l.aktiv)
                if (katL.length === 0) return null
                return (
                  <div key={kat.id} style={{marginBottom:14}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:kat.farbe}}/>
                      <strong style={{fontSize:13,color:'var(--navy)'}}>{kat.name}</strong>
                    </div>
                    <div style={{display:'grid',gap:6}}>
                      {katL.map(l => {
                        const aktiv = ausgewaehlteLeistungen.includes(l.id)
                        const liga = vertragsDaten.saisons?.liga || 'Oberliga'
                        const preis = getPreisFuerLiga(l, liga)
                        return (
                          <label key={l.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',border:'1.5px solid '+(aktiv?(kat.farbe||'var(--navy)'):'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:aktiv?(kat.farbe||'#0f2240')+'22':'var(--white)'}}>
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

              {/* Individuelle Leistungen */}
              {(vertragsDaten.individuelle_leistungen||[]).filter(Boolean).length > 0 && (
                <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--gray-100)'}}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--gray-500)',marginBottom:8}}>Individuelle Leistungen aus dem Vertrag:</div>
                  {vertragsDaten.individuelle_leistungen.filter(Boolean).map((l,i) => (
                    <div key={i} style={{fontSize:13,padding:'4px 0',color:'var(--navy)'}}>[OK] {l}</div>
                  ))}
                </div>
              )}
            </div>

            {/* § 2 Laufzeit & Kündigung */}
            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:12}}>§ 2 Laufzeit & Kündigung</div>
              <div className="form-row">
                <div className="form-group"><label>Verlängerungsoption</label>
                  <select value={verlaengerung} onChange={e=>setVerlaengerung(e.target.value)}>
                    {VERLAENGERUNGSOPTIONEN.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Kündigungsfrist</label>
                  <select value={kuendigungsfrist} onChange={e=>setKuendigungsfrist(e.target.value)}>
                    {KUENDIGUNGSFRISTEN.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* § 4 Zahlung */}
            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:12}}>§ 4 Zahlungsmodalitäten</div>
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
              <div className="form-group"><label>Zahlungsrhythmus</label>
                <select value={zahlungsrhythmus} onChange={e=>setZahlungsrhythmus(e.target.value)}>
                  {ZAHLUNGSRHYTHMUS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Klauseln */}
            <div className="card" style={{marginBottom:12,opacity:festgeschrieben?0.7:1,pointerEvents:festgeschrieben?'none':'auto'}}>
              <div className="section-title" style={{marginBottom:4}}>Standard-Klauseln</div>
              <p style={{fontSize:12,color:'var(--gray-400)',marginBottom:12}}>Wähle die Klauseln die in den Vertrag aufgenommen werden sollen.</p>
              <div style={{display:'grid',gap:8}}>
                {STANDARD_KLAUSELN.map(k => {
                  const aktiv = ausgewaehlteKlauseln.includes(k.id)
                  return (
                    <label key={k.id} style={{display:'flex',gap:10,padding:'10px 12px',border:'1.5px solid '+(aktiv?'var(--navy)':'var(--gray-200)'),borderRadius:'var(--radius)',cursor:'pointer',background:aktiv?'rgba(15,34,64,0.04)':'var(--white)'}}>
                      <input type="checkbox" checked={aktiv} onChange={()=>toggleKlausel(k.id)} style={{width:16,height:16,flexShrink:0,marginTop:2}}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{k.titel}</div>
                        <div style={{fontSize:11,color:'var(--gray-400)',marginTop:2,lineHeight:1.5}}>{k.text.slice(0,100)}…</div>
                      </div>
                    </label>
                  )
                })}
              </div>

              {/* Sonderklausel */}
              <div className="form-group" style={{marginTop:16}}>
                <label>Individuelle Vereinbarung (optional)</label>
                <textarea value={sonderklausel} onChange={e=>setSonderklausel(e.target.value)} placeholder="z.B. Der Sponsor erhält exklusives Vorkaufsrecht für Logen-Plätze bei Aufstieg in die Regionalliga..." style={{minHeight:80}}/>
              </div>

              <div className="form-group">
                <label>Gerichtsstand</label>
                <select value={gerichtsstand} onChange={e=>setGerichtsstand(e.target.value)}>
                  {GERICHTSSTAENDE.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* RECHTE SPALTE: Vorschau & Aktionen */}
          <div style={{position:'sticky',top:80}}>
            {/* Sponsor-Info */}
            <div className="card" style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:10}}>Vertragspartner</div>
              <div style={{fontWeight:700,fontSize:15,color:'var(--navy)',marginBottom:4}}>{vertragsDaten.kontakte?.firma}</div>
              <div style={{fontSize:12,color:'var(--gray-500)',lineHeight:1.7}}>
                Saison: <strong>{vertragsDaten.saisons?.name}</strong><br/>
                Liga: <strong>{vertragsDaten.saisons?.liga || 'Oberliga'}</strong><br/>
                Paket: <strong>{vertragsDaten.sponsoring_pakete?.name || 'Individuell'}</strong><br/>
                {vertragsDaten.vertragsbeginn&&<>Laufzeit: <strong>{new Date(vertragsDaten.vertragsbeginn).toLocaleDateString('de-DE')} – {new Date(vertragsDaten.vertragsende).toLocaleDateString('de-DE')}</strong><br/></>}
              </div>
            </div>

            {/* Zusammenfassung */}
            <div className="card" style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'0.3px',marginBottom:10}}>Zusammenfassung</div>
              <div style={{display:'grid',gap:6,fontSize:13}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--gray-500)'}}>Leistungen:</span><strong>{ausgewaehlteLeistungen.length} ausgewählt</strong></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--gray-500)'}}>Klauseln:</span><strong>{ausgewaehlteKlauseln.length} aktiv</strong></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--gray-500)'}}>Verlängerung:</span><strong style={{fontSize:11,textAlign:'right',maxWidth:160}}>{verlaengerung}</strong></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--gray-500)'}}>Zahlung:</span><strong>{zahlungsweise}</strong></div>
                <div style={{paddingTop:8,borderTop:'1px solid var(--gray-100)',display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'var(--gray-500)'}}>Betrag:</span>
                  <strong style={{color:'var(--navy)',fontSize:15}}>{Number(vertragsDaten.jahresbetrag||0).toLocaleString('de-DE')} EUR</strong>
                </div>
              </div>
            </div>

            {/* Aktionen */}
            <div className="card" style={{display:'grid',gap:10}}>
              <button className="btn btn-primary" onClick={exportPDF} style={{width:'100%',justifyContent:'center'}}>
                [PDF] Vertrag als PDF exportieren
              </button>

              <button
                onClick={toggleFestschreiben}
                disabled={saving}
                style={{width:'100%',padding:'10px',borderRadius:'var(--radius)',border:'1.5px solid',cursor:'pointer',fontWeight:600,fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  background:festgeschrieben?'#fff8f0':'#f0f9f4',
                  borderColor:festgeschrieben?'#c8a84b':'#3a8a5a',
                  color:festgeschrieben?'#8a6a00':'#2d6b3a'
                }}
              >
                {festgeschrieben ? '[Entsperren] Entsperren' : '[Gesperrt] Vertrag festschreiben'}
              </button>

              {festgeschrieben && (
                <div style={{fontSize:11,color:'#8a6a00',background:'#fffbf0',padding:'8px 10px',borderRadius:6,textAlign:'center',lineHeight:1.5}}>
                  Festgeschriebene Verträge können nicht bearbeitet werden. Nur entsperren ermöglicht Änderungen.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
