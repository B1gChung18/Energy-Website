import { useState } from 'react';
import { ALL_QUESTIONS } from '../data/questions';
import { calcPvErtrag, getSonneneinstrahlung, GLOBALSTRAHLUNG_DRESDEN, WIRKUNGSGRAD_PV } from '../data/pvData';
import { avgEpexPrice, chargingKwh, findOptimalStart, HOURLY_EPEX } from '../data/epexData';

const GRUNDPREIS    = 122.96;
const ARBEITSPREIS  = 0.3571;
const DYNAMIC_PRICE = 0.22;
const EPEX_PRICE    = 82;

function formatAnswer(q, val) {
  if (val == null || val === '') return '—';
  if (q.type === 'yesno') return val === 'ja' ? 'Ja' : 'Nein';
  return q.unit ? `${val} ${q.unit}` : val;
}

function getModules(formData) {
  const modul1 = formData.pv_anlage === 'ja';
  const modul2 = formData.hat_WP === 'ja' || formData.e_auto === 'ja';
  const modul3 = modul1;
  return { modul1, modul2, modul3 };
}

function getLoadProfile(formData) {
  if (formData.pv_anlage !== 'ja') return 'H25';
  if (formData.speicher !== 'ja') return 'P25';
  return 'S25';
}

export default function Results({ formData, jahresverbrauch, onReset }) {
  const [showCalc,    setShowCalc]    = useState(false);
  const [showAngaben, setShowAngaben] = useState(false);

  // ── Cost calculations ──────────────────────────────────────────
  const festCost = Math.round(GRUNDPREIS + jahresverbrauch * ARBEITSPREIS);
  const dynCost  = Math.round(jahresverbrauch * DYNAMIC_PRICE);
  const savings  = festCost - dynCost;

  // ── PV ────────────────────────────────────────────────────────
  const hasPv         = formData.pv_anlage === 'ja';
  const pvFlaeche     = hasPv ? (parseFloat(formData.pv_flaeche)     || 0) : 0;
  const pvAusrichtung = hasPv ? (parseFloat(formData.pv_ausrichtung) ?? 0) : 0;
  const pvWinkel      = hasPv ? (parseFloat(formData.pv_winkel)      ?? 30) : 0;
  const pvKorrektur   = hasPv && pvFlaeche > 0 ? getSonneneinstrahlung(pvAusrichtung, pvWinkel) : null;
  const pvErtrag      = hasPv && pvFlaeche > 0 ? Math.round(calcPvErtrag(pvFlaeche, pvAusrichtung, pvWinkel)) : 0;

  // ── Wallbox ───────────────────────────────────────────────────
  const hasWallbox  = formData.e_auto === 'ja';
  const kmJahr      = parseFloat(formData.km_jahr) || 0;
  const wallboxJahr = hasWallbox ? Math.round(kmJahr * 20 / 100) : 0;

  // ── E-Auto Ladezeit ───────────────────────────────────────────
  const ladeBeginn  = hasWallbox ? (parseInt(formData.lade_beginn) ?? 17) : null;
  const ladeDauer   = hasWallbox ? (parseFloat(formData.lade_dauer) || 0)  : 0;
  const hasLadeData = hasWallbox && ladeDauer > 0 && ladeBeginn !== null;
  const ladeKwh     = hasLadeData ? chargingKwh(ladeDauer) : 0;
  const ladePrice   = hasLadeData ? avgEpexPrice(ladeBeginn, ladeDauer) : 0;
  const ladeKosten  = hasLadeData ? Math.round(ladeKwh * ladePrice * 100) / 100 : 0;
  const optimal     = hasLadeData ? findOptimalStart(ladeDauer) : null;
  const ladeSaving  = hasLadeData ? Math.round((ladeKosten - optimal.cost) * 100) / 100 : 0;
  const currentHourlyPrices = hasLadeData
    ? Array.from({ length: Math.round(ladeDauer) }, (_, i) => HOURLY_EPEX[(ladeBeginn + i) % 24])
    : [];

  // ── §14a + profile ────────────────────────────────────────────
  const { modul1, modul2, modul3 } = getModules(formData);
  const loadProfile = getLoadProfile(formData);

  // ── Chart percentages ─────────────────────────────────────────
  const chartMax  = festCost * 1.25 || 1000;
  const festPct   = Math.round((festCost / chartMax) * 100);
  const dynPct    = Math.round((dynCost  / chartMax) * 100);

  // ── Answers summary ───────────────────────────────────────────
  const summaryRows = ALL_QUESTIONS.filter(q => {
    const val = formData[q.id];
    return val != null && val !== '';
  });

  return (
    <div className="results-card">
      <h2 className="results-title">Geschätztes Einsparpotenzial — Dynamischer Stromtarif</h2>

      {/* ── 2×2 Overview Grid ── */}
      <div className="results-overview-grid">

        {/* Top-left: Kosten & Einsparpotenzial */}
        <div className="result-panel">
          <div className="result-panel-title">Kosten &amp; Einsparpotenzial</div>

          <div className="rp-savings-hero">
            <span className="rp-savings-label">Einsparpotenzial</span>
            <span className="rp-savings-value">ca. {savings.toLocaleString('de-DE')} € / Jahr</span>
          </div>

          <ul className="rp-cost-list">
            <li>
              <span className="rp-cost-key">Festtarif</span>
              <span className="rp-cost-val">{festCost.toLocaleString('de-DE')} €</span>
            </li>
            <li>
              <span className="rp-cost-key">Dynamischer Tarif*</span>
              <span className="rp-cost-val">{dynCost.toLocaleString('de-DE')} €</span>
            </li>
            {hasPv && pvErtrag > 0 && (
              <li>
                <span className="rp-cost-key">PV-Anlage (Ertrag)</span>
                <span className="rp-cost-val rp-green">ca. {pvErtrag.toLocaleString('de-DE')} kWh</span>
              </li>
            )}
            {hasWallbox && kmJahr > 0 && (
              <li>
                <span className="rp-cost-key">Wallbox (Verbrauch)</span>
                <span className="rp-cost-val">ca. {wallboxJahr.toLocaleString('de-DE')} kWh</span>
              </li>
            )}
          </ul>
          <p className="rp-note">* Platzhalterwert · EPEX SPOT Ø</p>
        </div>

        {/* Top-right: Empfehlung von Tarif */}
        <div className={`result-panel ${savings > 0 ? 'result-panel-green' : 'result-panel-gray'}`}>
          <div className="result-panel-title">Empfehlung von Tarif</div>

          <div className="rp-rec-badge">
            {savings > 0 ? '✓ Dynamischer Tarif empfohlen' : '✗ Festtarif günstiger'}
          </div>

          <div className="rp-vars">
            <div className="rp-var-row">
              <span className="rp-var-key">Jahresverbrauch</span>
              <span className="rp-var-val">{jahresverbrauch.toLocaleString('de-DE')} kWh</span>
            </div>
            <div className="rp-var-row">
              <span className="rp-var-key">Arbeitspreis (Fest)</span>
              <span className="rp-var-val">0,3571 €/kWh</span>
            </div>
            <div className="rp-var-row">
              <span className="rp-var-key">Arbeitspreis (Dyn.)*</span>
              <span className="rp-var-val">0,22 €/kWh</span>
            </div>
            <div className="rp-var-row">
              <span className="rp-var-key">Lastprofil</span>
              <span className="rp-var-val rp-badge-profile">{loadProfile}</span>
            </div>
          </div>

          {savings > 0 && (
            <p className="rp-explanation">
              Bei einem dynamischen Vertrag orientiert sich der Arbeitspreis am Börsenpreis (EPEX SPOT)
              und kann sich mehrmals täglich ändern. Für eine optimale Nutzung empfehlen wir ein
              intelligentes Messsystem, das Geräte bei niedrigem Börsenpreis einschaltet.
            </p>
          )}
        </div>

        {/* Bottom-left: Modulempfehlung */}
        <div className="result-panel">
          <div className="result-panel-title">§14a-Modulempfehlung</div>

          {!modul1 && !modul2 ? (
            <p className="rp-note" style={{ marginTop: 8 }}>
              Keine §14a-Module erforderlich basierend auf Ihrer Ausstattung.
            </p>
          ) : (
            <ul className="rp-module-list">
              {modul1 && (
                <li className="rp-module-item rp-module-active">
                  <div className="rp-module-header">
                    <span className="rp-module-badge">Modul 1</span>
                    <span className="rp-module-name">Steuerbare Erzeugungsanlagen</span>
                  </div>
                  <div className="rp-module-vars">
                    Auslöser: PV-Anlage vorhanden · Fläche: {pvFlaeche} m²
                  </div>
                </li>
              )}
              {modul2 && (
                <li className="rp-module-item rp-module-active">
                  <div className="rp-module-header">
                    <span className="rp-module-badge">Modul 2</span>
                    <span className="rp-module-name">Steuerbare Verbrauchseinrichtungen</span>
                  </div>
                  <div className="rp-module-vars">
                    Auslöser:{formData.hat_WP === 'ja' ? ' Wärmepumpe' : ''}{formData.hat_WP === 'ja' && hasWallbox ? ' &' : ''}{hasWallbox ? ' Wallbox/E-Auto' : ''}
                  </div>
                </li>
              )}
              {modul3 && (
                <li className="rp-module-item rp-module-available">
                  <div className="rp-module-header">
                    <span className="rp-module-badge rp-module-badge-gray">Modul 3</span>
                    <span className="rp-module-name">Flexibilitätsmanagement</span>
                  </div>
                  <div className="rp-module-vars">
                    Verfügbar, da Modul 1 aktiv
                  </div>
                </li>
              )}
            </ul>
          )}
          <p className="rp-note" style={{ marginTop: 12 }}>
            Module werden automatisch empfohlen. Widerspruch per Opt-out möglich.
          </p>
        </div>

        {/* Bottom-right: Relevante Graphiken */}
        <div className="result-panel">
          <div className="result-panel-title">Relevante Graphiken</div>

          <div className="rp-chart">
            <div className="rp-bar-row">
              <span className="rp-bar-label">Festtarif</span>
              <div className="rp-bar-track">
                <div className="rp-bar-fill rp-bar-fest" style={{ width: `${festPct}%` }} />
              </div>
              <span className="rp-bar-value">{festCost.toLocaleString('de-DE')} €</span>
            </div>
            <div className="rp-bar-row">
              <span className="rp-bar-label">Dynamischer Tarif*</span>
              <div className="rp-bar-track">
                <div className="rp-bar-fill rp-bar-dyn" style={{ width: `${dynPct}%` }} />
              </div>
              <span className="rp-bar-value">{dynCost.toLocaleString('de-DE')} €</span>
            </div>
            <div className="rp-savings-bar">
              <span className="rp-savings-bar-label">Einsparpotenzial</span>
              <span className="rp-savings-bar-value">ca. {savings.toLocaleString('de-DE')} €</span>
            </div>
          </div>

          {hasPv && pvErtrag > 0 && (
            <div className="rp-chart" style={{ marginTop: 16 }}>
              <div className="rp-bar-row">
                <span className="rp-bar-label">PV-Ertrag</span>
                <div className="rp-bar-track">
                  <div className="rp-bar-fill rp-bar-pv"
                    style={{ width: `${Math.min(100, Math.round((pvErtrag / jahresverbrauch) * 100))}%` }} />
                </div>
                <span className="rp-bar-value">{pvErtrag.toLocaleString('de-DE')} kWh</span>
              </div>
              <div className="rp-bar-row">
                <span className="rp-bar-label">Jahresverbrauch</span>
                <div className="rp-bar-track">
                  <div className="rp-bar-fill rp-bar-fest" style={{ width: '100%' }} />
                </div>
                <span className="rp-bar-value">{jahresverbrauch.toLocaleString('de-DE')} kWh</span>
              </div>
            </div>
          )}
          <p className="rp-note" style={{ marginTop: 10 }}>
            * Dynamischer Tarif basiert auf EPEX SPOT Durchschnittswerten.
          </p>
        </div>
      </div>

      {/* ── E-Auto Ladezeit Optimierung ── */}
      {hasLadeData && (
        <div className="lade-optimierung-box">
          <div className="lade-optimierung-header">
            <span className="lade-optimierung-title">⚡ Optimierung der Ladezeit</span>
            <span className="lade-optimierung-badge">
              {ladeSaving > 0.01
                ? `${ladeSaving.toFixed(2).replace('.', ',')} € sparen`
                : 'Bereits optimal'}
            </span>
          </div>

          <div className="lade-grid">
            {/* Current session */}
            <div className="lade-card lade-card-current">
              <div className="lade-card-label">Aktuelle Ladezeit</div>
              <div className="lade-card-time">{ladeBeginn} – {(ladeBeginn + Math.round(ladeDauer)) % 24} Uhr</div>
              <ul className="lade-stats">
                <li><span>Verbrauch</span><span>{ladeKwh.toFixed(2).replace('.', ',')} kWh</span></li>
                <li><span>Ø Börsenpreis</span><span>{(ladePrice * 100).toFixed(1).replace('.', ',')} ct/kWh</span></li>
                <li><span>Ø Kosten</span><span className="lade-cost-val">{ladeKosten.toFixed(2).replace('.', ',')} €</span></li>
              </ul>
              <div className="lade-hourly">
                {currentHourlyPrices.map((p, i) => (
                  <div key={i} className="lade-hour-chip">
                    <span className="lade-hour-label">{(ladeBeginn + i) % 24} Uhr</span>
                    <span className="lade-hour-price">{(p * 100).toFixed(1).replace('.', ',')} ct</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimal session */}
            <div className="lade-card lade-card-optimal">
              <div className="lade-card-label">Empfohlene Ladezeit</div>
              <div className="lade-card-time">{optimal.hour} – {(optimal.hour + Math.round(ladeDauer)) % 24} Uhr</div>
              <ul className="lade-stats">
                <li><span>Verbrauch</span><span>{ladeKwh.toFixed(2).replace('.', ',')} kWh</span></li>
                <li><span>Ø Börsenpreis</span><span>{(optimal.avgPrice * 100).toFixed(1).replace('.', ',')} ct/kWh</span></li>
                <li><span>Ø Kosten</span><span className="lade-cost-val lade-cost-green">{optimal.cost.toFixed(2).replace('.', ',')} €</span></li>
              </ul>
              {ladeSaving > 0.01 && (
                <div className="lade-saving-note">
                  Einsparung gegenüber aktueller Ladezeit: <strong>{ladeSaving.toFixed(2).replace('.', ',')} €</strong>
                </div>
              )}
            </div>
          </div>

          <p className="rp-note" style={{ marginTop: 10 }}>
            Formel: Kosten = Verbrauch (kWh) × Börsenpreis · {ladeKwh.toFixed(2)} kWh = {ladeDauer} h × 4 × 0,575 kWh/15 min ·
            Preisprofil: Platzhalterwerte (EPEX SPOT DE Day-Ahead Referenzprofil).
          </p>
        </div>
      )}

      {/* ── Energieberechnung collapsible ── */}
      <button className="rp-collapsible-btn" onClick={() => setShowCalc(v => !v)}>
        <span>Energieberechnung</span>
        <span>{showCalc ? '↑' : '↓'}</span>
      </button>

      {showCalc && (
        <div className="rp-collapsible-content">
          {/* Metriktabelle */}
          <h4 className="rp-section-heading">Metriktabelle</h4>
          <table className="metrics-table">
            <thead><tr><th>Bestandteil</th><th>Wert</th><th>Berechnung</th></tr></thead>
            <tbody>
              <tr><td>Grundpreis</td><td>122,96 € / Jahr</td><td>—</td></tr>
              <tr><td>Arbeitspreis (Festtarif)</td><td>0,3571 € / kWh</td><td>—</td></tr>
              <tr><td>Jahresverbrauch</td><td>{jahresverbrauch.toLocaleString('de-DE')} kWh</td><td>—</td></tr>
              <tr className="total-row">
                <td><strong>Jahreskosten (Festtarif)</strong></td>
                <td><strong>{festCost.toLocaleString('de-DE')} €</strong></td>
                <td>= 122,96 + ({jahresverbrauch.toLocaleString('de-DE')} × 0,3571)</td>
              </tr>
            </tbody>
          </table>

          {hasWallbox && (
            <>
              <h4 className="rp-section-heading" style={{ marginTop: 20 }}>Wallbox / E-Auto</h4>
              <table className="metrics-table">
                <thead><tr><th>Bestandteil</th><th>Wert</th><th>Berechnung</th></tr></thead>
                <tbody>
                  <tr><td>Jährliche Fahrleistung</td><td>{kmJahr.toLocaleString('de-DE')} km</td><td>—</td></tr>
                  <tr><td>Ø Verbrauch E-Auto</td><td>20 kWh / 100 km</td><td>—</td></tr>
                  <tr className="total-row">
                    <td><strong>Wallbox-Jahresverbrauch</strong></td>
                    <td><strong>ca. {wallboxJahr.toLocaleString('de-DE')} kWh</strong></td>
                    <td>= {kmJahr.toLocaleString('de-DE')} × 20 / 100</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {hasPv && pvFlaeche > 0 && (
            <>
              <h4 className="rp-section-heading" style={{ marginTop: 20 }}>PV-Anlage</h4>
              <table className="metrics-table">
                <thead><tr><th>Bestandteil</th><th>Wert</th><th>Berechnung</th></tr></thead>
                <tbody>
                  <tr><td>Globalstrahlung Dresden (G)</td><td>{GLOBALSTRAHLUNG_DRESDEN} kWh/m²/Jahr</td><td>—</td></tr>
                  <tr><td>Wirkungsgrad (η)</td><td>{(WIRKUNGSGRAD_PV * 100).toFixed(0)} %</td><td>—</td></tr>
                  <tr><td>Modulfläche (A)</td><td>{pvFlaeche} m²</td><td>—</td></tr>
                  <tr><td>Ausrichtung (α)</td><td>{pvAusrichtung}°</td><td>—</td></tr>
                  <tr><td>Neigungswinkel (β)</td><td>{pvWinkel}°</td><td>—</td></tr>
                  <tr><td>Korrekturfaktor f(α, β)</td><td>{pvKorrektur?.toFixed(3)}</td><td>Kennwerttabelle</td></tr>
                  <tr className="total-row">
                    <td><strong>Jahresertrag E</strong></td>
                    <td><strong>ca. {pvErtrag.toLocaleString('de-DE')} kWh</strong></td>
                    <td>= {GLOBALSTRAHLUNG_DRESDEN} × {pvFlaeche} × {WIRKUNGSGRAD_PV} × {pvKorrektur?.toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* Energieberechnungen explanatory content */}
          <h4 className="rp-section-heading" style={{ marginTop: 20 }}>Großhandelspreis (EPEX SPOT)</h4>
          <table className="metrics-table">
            <thead><tr><th>Bestandteil</th><th>ct/kWh</th></tr></thead>
            <tbody>
              <tr><td>EPEX SPOT Day-Ahead DE (Ø 2025)</td><td>{(EPEX_PRICE / 10).toFixed(1)}</td></tr>
              <tr><td>Netzentgelte &amp; Messstellenbetrieb</td><td>8,5</td></tr>
              <tr><td>Steuern &amp; Umlagen (EEG, §19)</td><td>5,3</td></tr>
              <tr><td>Konzessionsabgabe</td><td>1,8</td></tr>
              <tr><td>Umsatzsteuer (19 %)</td><td>ca. 6,1</td></tr>
              <tr className="total-row"><td><strong>Endverbraucherpreis</strong></td><td><strong>≈ 32</strong></td></tr>
            </tbody>
          </table>
          <p className="table-note" style={{ marginTop: 6 }}>
            Quelle: SachsenEnergie Grundversorgung ab 01.01.2026 · EPEX SPOT DE Day-Ahead ·
            PV-Kennwerte: Fraunhofer ISE / Dresden · BeING Inside 2026.
          </p>
        </div>
      )}

      {/* ── Ihre Angaben collapsible ── */}
      <button className="rp-collapsible-btn" onClick={() => setShowAngaben(v => !v)}
        style={{ marginTop: 8 }}>
        <span>Ihre Angaben</span>
        <span>{showAngaben ? '↑' : '↓'}</span>
      </button>

      {showAngaben && summaryRows.length > 0 && (
        <div className="rp-collapsible-content">
          <ul className="answers-summary-list">
            {summaryRows.map(q => (
              <li key={q.id}>
                <span className="summary-q">
                  {(q.parent ? '→ ' : '') + q.question}
                </span>
                <span className="summary-a">{formatAnswer(q, formData[q.id])}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="reset-btn" style={{ marginTop: 20 }} onClick={onReset}>
        Neu berechnen
      </button>
    </div>
  );
}
