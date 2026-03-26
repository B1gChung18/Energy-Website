import { useState } from 'react';
import { ALL_QUESTIONS } from '../data/questions';
import { calcPvErtrag, getSonneneinstrahlung, GLOBALSTRAHLUNG_DRESDEN, WIRKUNGSGRAD_PV } from '../data/pvData';
import { avgEpexPrice, chargingKwh, findOptimalStart, HOURLY_EPEX } from '../data/epexData';
import {
  besteTarif, getLastprofilKey, getUWert,
  TARIF_A, TARIF_B1,
  AUFSCHLAG, NETZ_AP, ABGABEN_FIX, PREISADDER,
  GP_BASIS, GP_NETZ, IMSYS_NORMAL, IMSYS_SVE,
  KONZ, KWKG, PAR19, OFFSHORE, STROMSTEUER,
  T_AUSSEN_MONAT, TAGE_MONAT,
} from '../data/tarifData';

// Fallback cost display when 8760 data not loaded
const ARBEITSPREIS_FALLBACK = 0.3571;
const GRUNDPREIS_FALLBACK   = 122.96;

function formatAnswer(q, val) {
  if (val == null || val === '') return '—';
  if (q.type === 'yesno') return val === 'ja' ? 'Ja' : 'Nein';
  return q.unit ? `${val} ${q.unit}` : val;
}

function fmt(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// §14a applicability
function getModules(formData) {
  const modul1 = formData.pv_anlage === 'ja';
  const modul2 = formData.hat_WP === 'ja' || formData.e_auto === 'ja';
  const modul3 = modul1 || modul2;
  return { modul1, modul2, modul3 };
}

const TARIF_ORDER = ['A', 'B', 'B1', 'B2', 'B3'];
const TARIF_COLORS = { A: '#6B7280', B: '#2563EB', B1: '#16A34A', B2: '#D97706', B3: '#7C3AED' };

export default function Results({ formData, jahresverbrauch, jahreskosten, onReset }) {
  const [showCalc,    setShowCalc]    = useState(false);
  const [showAngaben, setShowAngaben] = useState(false);
  const [moduleOptOut, setModuleOptOut] = useState({ B1: false, B2: false, B3: false });

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
  const loadProfile = getLastprofilKey(formData);

  // ── Tariff costs ──────────────────────────────────────────────
  // Use real 8760-based numbers if available; else fall back to flat rate
  const hasRealCosts = !!jahreskosten;

  const festCostFallback = Math.round(GRUNDPREIS_FALLBACK + jahresverbrauch * ARBEITSPREIS_FALLBACK);

  // Build display tariffs, respecting module opt-outs
  const enabledTarifs = TARIF_ORDER.filter(id => {
    if (!moduleOptOut[id]) return true;
    return false; // opted out
  });

  // Get displayed cost for a tariff
  function getTarifCost(id) {
    if (hasRealCosts && jahreskosten[id]) return jahreskosten[id].kosten;
    if (id === 'A') return festCostFallback;
    return null; // no estimate available for dynamic tariffs without data
  }

  function getTarifLabel(id) {
    const labels = {
      A:  'Festtarif (A)',
      B:  'Dynamischer Tarif (B)',
      B1: 'Dyn. + §14a M1 – PV (B1)',
      B2: 'Dyn. + §14a M2 – WP/Wallbox (B2)',
      B3: 'Dyn. + §14a M3 – Zeitvariabel (B3)',
    };
    return labels[id] || id;
  }

  // Applicability of each tariff
  function isTarifApplicable(id) {
    if (id === 'B1') return formData.pv_anlage === 'ja';
    if (id === 'B2') return formData.hat_WP === 'ja' || formData.e_auto === 'ja';
    return true;
  }

  const bestId = hasRealCosts
    ? besteTarif(jahreskosten, enabledTarifs.filter(id => isTarifApplicable(id)))
    : 'A';

  const festCost = getTarifCost('A') || festCostFallback;
  const bestCost = getTarifCost(bestId) || festCost;
  const savings  = Math.round(festCost - bestCost);

  // Chart max
  const allCosts = TARIF_ORDER.map(id => getTarifCost(id)).filter(Boolean);
  const chartMax = allCosts.length ? Math.max(...allCosts) * 1.15 : festCost * 1.25;

  // ── Answers summary ───────────────────────────────────────────
  const summaryRows = ALL_QUESTIONS.filter(q => {
    const val = formData[q.id];
    return val != null && val !== '';
  });

  return (
    <div className="results-card">
      <h2 className="results-title">BeING Inside 2026 — Tarifvergleich &amp; Empfehlung</h2>

      {/* ── 2×2 Overview Grid ── */}
      <div className="results-overview-grid">

        {/* Top-left: Kosten & Einsparpotenzial */}
        <div className="result-panel">
          <div className="result-panel-title">Kosten &amp; Einsparpotenzial</div>

          {savings > 0 && bestId !== 'A' && (
            <div className="rp-savings-hero">
              <span className="rp-savings-label">Einsparpotenzial vs. Festtarif</span>
              <span className="rp-savings-value">ca. {savings.toLocaleString('de-DE')} € / Jahr</span>
            </div>
          )}

          <ul className="rp-cost-list">
            {TARIF_ORDER.map(id => {
              const cost = getTarifCost(id);
              const applicable = isTarifApplicable(id);
              const optedOut   = moduleOptOut[id];
              const b3fehlt    = id === 'B3' && jahreskosten?.B3?.fehlt;
              if (!cost && id !== 'A') return (
                <li key={id} className="rp-cost-item rp-cost-na">
                  <span className="rp-cost-key" style={{ color: TARIF_COLORS[id] }}>
                    {getTarifLabel(id)}
                  </span>
                  <span className="rp-cost-val rp-note">
                    {b3fehlt ? 'M3-Preise fehlen noch' : applicable ? '—' : 'nicht anwendbar'}
                  </span>
                </li>
              );
              return (
                <li key={id} className={`rp-cost-item${id === bestId ? ' rp-cost-best' : ''}${optedOut ? ' rp-cost-optout' : ''}`}>
                  <span className="rp-cost-key" style={{ color: TARIF_COLORS[id] }}>
                    {id === bestId && '★ '}{getTarifLabel(id)}
                  </span>
                  <span className="rp-cost-val">
                    {cost ? `${fmt(cost)} €` : '—'}
                  </span>
                  {(id === 'B1' || id === 'B2' || id === 'B3') && (
                    <button
                      className={`rp-optout-btn${optedOut ? ' active' : ''}`}
                      title={optedOut ? 'Opt-out aufheben' : 'Opt-out (§14a)'}
                      onClick={() => setModuleOptOut(prev => ({ ...prev, [id]: !prev[id] }))}
                    >
                      {optedOut ? 'Opt-out ✓' : 'Opt-out'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {!hasRealCosts && (
            <p className="rp-note">Berechnungen auf Basis von 8760-Datenpunkten werden geladen …</p>
          )}

          {hasPv && pvErtrag > 0 && (
            <div className="rp-extra-row">
              <span className="rp-cost-key rp-green">PV-Jahresertrag</span>
              <span className="rp-cost-val rp-green">ca. {pvErtrag.toLocaleString('de-DE')} kWh</span>
            </div>
          )}
        </div>

        {/* Top-right: Empfehlung */}
        <div className={`result-panel ${bestId !== 'A' ? 'result-panel-green' : 'result-panel-gray'}`}>
          <div className="result-panel-title">Empfehlung von Tarif</div>

          <div className="rp-rec-badge" style={{ background: TARIF_COLORS[bestId] || '#16A34A' }}>
            ★ {getTarifLabel(bestId)}
          </div>

          <div className="rp-vars">
            <div className="rp-var-row">
              <span className="rp-var-key">Jahresverbrauch</span>
              <span className="rp-var-val">{jahresverbrauch.toLocaleString('de-DE')} kWh</span>
            </div>
            <div className="rp-var-row">
              <span className="rp-var-key">Lastprofil</span>
              <span className="rp-var-val rp-badge-profile">{loadProfile}</span>
            </div>
            {hasRealCosts && (
              <div className="rp-var-row">
                <span className="rp-var-key">Empfohlene Jahreskost.</span>
                <span className="rp-var-val">{bestCost ? fmt(bestCost) : '—'} €</span>
              </div>
            )}
            {savings > 0 && bestId !== 'A' && (
              <div className="rp-var-row">
                <span className="rp-var-key">Einsparung vs. Festtarif</span>
                <span className="rp-var-val rp-green">ca. {savings.toLocaleString('de-DE')} €</span>
              </div>
            )}
          </div>

          <p className="rp-explanation">
            {bestId === 'A'
              ? 'Auf Basis Ihrer Angaben ist der klassische Festtarif aktuell die günstigste Option.'
              : `Der ${getTarifLabel(bestId)} ist basierend auf Ihrem Lastprofil (${loadProfile}) und den EPEX SPOT-Preisen 2025 die günstigste Option. Ein intelligentes Messsystem (iMSys) ist empfehlenswert.`
            }
          </p>
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
                <li className={`rp-module-item${moduleOptOut.B1 ? ' rp-module-optout' : ' rp-module-active'}`}>
                  <div className="rp-module-header">
                    <span className="rp-module-badge" style={{ background: TARIF_COLORS.B1 }}>M1</span>
                    <span className="rp-module-name">Steuerbare Erzeugungsanlagen (PV)</span>
                  </div>
                  <div className="rp-module-vars">
                    Einspeisevergütung: 162,95 €/Jahr · Fläche: {pvFlaeche} m²
                    {moduleOptOut.B1 && <span className="rp-optout-tag">Opt-out aktiv</span>}
                  </div>
                </li>
              )}
              {modul2 && (
                <li className={`rp-module-item${moduleOptOut.B2 ? ' rp-module-optout' : ' rp-module-active'}`}>
                  <div className="rp-module-header">
                    <span className="rp-module-badge" style={{ background: TARIF_COLORS.B2 }}>M2</span>
                    <span className="rp-module-name">Steuerbare Verbrauchseinr. (§14a)</span>
                  </div>
                  <div className="rp-module-vars">
                    60% Netzentgelt für:{formData.hat_WP === 'ja' ? ' Wärmepumpe' : ''}{formData.hat_WP === 'ja' && hasWallbox ? ' &' : ''}{hasWallbox ? ' Wallbox' : ''}
                    {moduleOptOut.B2 && <span className="rp-optout-tag">Opt-out aktiv</span>}
                  </div>
                </li>
              )}
              {modul3 && (
                <li className={`rp-module-item${moduleOptOut.B3 ? ' rp-module-optout' : ' rp-module-available'}`}>
                  <div className="rp-module-header">
                    <span className="rp-module-badge" style={{ background: TARIF_COLORS.B3 }}>M3</span>
                    <span className="rp-module-name">Zeitvariable Netzentgelte</span>
                  </div>
                  <div className="rp-module-vars">
                    HT (6–22 Uhr) / NT (22–6 Uhr) unterschiedliche Netzentgelte
                    {moduleOptOut.B3 && <span className="rp-optout-tag">Opt-out aktiv</span>}
                  </div>
                </li>
              )}
            </ul>
          )}
          <p className="rp-note" style={{ marginTop: 12 }}>
            Opt-out per Knopf in der Kostentabelle (links). Automatisch empfohlen nach §14a EnWG.
          </p>
        </div>

        {/* Bottom-right: Graphiken */}
        <div className="result-panel">
          <div className="result-panel-title">Relevante Graphiken</div>

          <div className="rp-chart">
            {TARIF_ORDER.map(id => {
              const cost = getTarifCost(id);
              if (!cost) return null;
              const pct = Math.round((cost / chartMax) * 100);
              return (
                <div key={id} className="rp-bar-row">
                  <span className="rp-bar-label" style={{ color: TARIF_COLORS[id] }}>
                    {id === bestId && '★ '}{id}
                  </span>
                  <div className="rp-bar-track">
                    <div
                      className="rp-bar-fill"
                      style={{ width: `${pct}%`, background: TARIF_COLORS[id] }}
                    />
                  </div>
                  <span className="rp-bar-value">{fmt(cost)} €</span>
                </div>
              );
            })}
            {savings > 0 && bestId !== 'A' && (
              <div className="rp-savings-bar">
                <span className="rp-savings-bar-label">Einsparpotenzial</span>
                <span className="rp-savings-bar-value">ca. {savings.toLocaleString('de-DE')} €</span>
              </div>
            )}
          </div>

          {hasPv && pvErtrag > 0 && (
            <div className="rp-chart" style={{ marginTop: 16 }}>
              <div className="rp-bar-row">
                <span className="rp-bar-label rp-green">PV-Ertrag</span>
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
            Preisbasis: EPEX SPOT DE 2025 · Lastprofil: {loadProfile} · Grundpreis: 122,96 €/Jahr
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
            <div className="lade-card lade-card-current">
              <div className="lade-card-label">Aktuelle Ladezeit</div>
              <div className="lade-card-time">{ladeBeginn} – {(ladeBeginn + Math.round(ladeDauer)) % 24} Uhr</div>
              <ul className="lade-stats">
                <li><span>Verbrauch</span><span>{ladeKwh.toFixed(2).replace('.', ',')} kWh</span></li>
                <li><span>Ø Börsenpreis</span><span>{(ladePrice * 100).toFixed(1).replace('.', ',')} ct/kWh</span></li>
                <li><span>Kosten</span><span className="lade-cost-val">{ladeKosten.toFixed(2).replace('.', ',')} €</span></li>
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

            <div className="lade-card lade-card-optimal">
              <div className="lade-card-label">Empfohlene Ladezeit</div>
              <div className="lade-card-time">{optimal.hour} – {(optimal.hour + Math.round(ladeDauer)) % 24} Uhr</div>
              <ul className="lade-stats">
                <li><span>Verbrauch</span><span>{ladeKwh.toFixed(2).replace('.', ',')} kWh</span></li>
                <li><span>Ø Börsenpreis</span><span>{(optimal.avgPrice * 100).toFixed(1).replace('.', ',')} ct/kWh</span></li>
                <li><span>Kosten</span><span className="lade-cost-val lade-cost-green">{optimal.cost.toFixed(2).replace('.', ',')} €</span></li>
              </ul>
              {ladeSaving > 0.01 && (
                <div className="lade-saving-note">
                  Einsparung: <strong>{ladeSaving.toFixed(2).replace('.', ',')} €</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Energieberechnung collapsible ── */}
      <button className="rp-collapsible-btn" onClick={() => setShowCalc(v => !v)}>
        <span>Energieberechnung</span>
        <span>{showCalc ? '↑' : '↓'}</span>
      </button>

      {showCalc && (() => {
        // ── Pre-compute heating detail for display ──
        const hat14a  = formData.hat_WP === 'ja' || formData.e_auto === 'ja' || formData.speicher === 'ja';
        const imsys   = hat14a ? IMSYS_SVE : IMSYS_NORMAL;
        const gpDyn   = GP_BASIS + GP_NETZ + imsys;
        const tInnen  = parseFloat(formData.t_innen) || 20;
        const uWert   = getUWert(formData.baujahr);
        const flaeche = parseFloat(formData.grundflaeche) || 0;
        const HEIZGRENZE = 15;
        const COP = 3.5;
        const MONATSNAMEN = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
        const heizMonate = T_AUSSEN_MONAT.map((t, i) => ({
          name: MONATSNAMEN[i],
          tAussen: t,
          aktiv: t < HEIZGRENZE,
          deltaT: t < HEIZGRENZE ? tInnen - t : 0,
          gradstunden: t < HEIZGRENZE ? (tInnen - t) * TAGE_MONAT[i] * 24 : 0,
        }));
        const gradstundenGes = heizMonate.reduce((s, m) => s + m.gradstunden, 0);
        const qHeizTherm = flaeche > 0 ? uWert * flaeche * gradstundenGes / 1000 : 0;
        const qHeizElekt = Math.round(qHeizTherm / COP);

        // M2 saving detail
        const m2Saving = jahresverbrauch * NETZ_AP * 0.40;

        return (
          <div className="rp-collapsible-content">

            {/* ── 1. Jahresverbrauch ── */}
            <h4 className="rp-section-heading">1. Jahresverbrauch</h4>
            <table className="metrics-table">
              <thead><tr><th>Parameter</th><th>Wert</th><th>Quelle</th></tr></thead>
              <tbody>
                <tr>
                  <td>Jahresverbrauch (jv)</td>
                  <td><strong>{jahresverbrauch.toLocaleString('de-DE')} kWh</strong></td>
                  <td>Direkte Nutzereingabe</td>
                </tr>
                <tr>
                  <td>Lastprofil-Zuordnung</td>
                  <td><strong>{loadProfile}</strong></td>
                  <td>
                    {loadProfile === 'H25' && 'H25 — Haushalt ohne PV'}
                    {loadProfile === 'P25' && 'P25 — Haushalt mit PV, ohne Speicher'}
                    {loadProfile === 'S25' && 'S25 — Haushalt mit PV und Batteriespeicher'}
                  </td>
                </tr>
                <tr>
                  <td>Normierter Jahreswert (Profil)</td>
                  <td>
                    {loadProfile === 'H25' && '1.003.681 kWh / 1 Mio.'}
                    {loadProfile === 'P25' && '948.994 kWh / 1 Mio.'}
                    {loadProfile === 'S25' && '887.009 kWh / 1 Mio.'}
                  </td>
                  <td>BDEW Repräsentative Profile 2025</td>
                </tr>
              </tbody>
            </table>

            {/* ── 2. Tarif A ── */}
            <h4 className="rp-section-heading" style={{ marginTop: 24 }}>2. Tarif A — Festtarif (SachsenEnergie Grundversorgung)</h4>
            <p className="calc-formula">Jahreskosten(A) = Grundpreis + Jahresverbrauch × Arbeitspreis</p>
            <table className="metrics-table">
              <thead><tr><th>Bestandteil</th><th>Wert</th><th>Einheit</th></tr></thead>
              <tbody>
                <tr><td>Grundpreis</td><td>{fmt(TARIF_A.grundpreis)}</td><td>€ / Jahr</td></tr>
                <tr><td>Arbeitspreis</td><td>{TARIF_A.arbeitspreis.toFixed(4).replace('.', ',')}</td><td>€ / kWh</td></tr>
                <tr><td>Jahresverbrauch</td><td>{jahresverbrauch.toLocaleString('de-DE')}</td><td>kWh</td></tr>
                <tr className="total-row">
                  <td><strong>Jahreskosten (A)</strong></td>
                  <td><strong>{fmt(festCost)}</strong></td>
                  <td><strong>€</strong></td>
                </tr>
                <tr><td colSpan={3} className="calc-detail">
                  = {fmt(TARIF_A.grundpreis)} + ({jahresverbrauch.toLocaleString('de-DE')} × {TARIF_A.arbeitspreis.toFixed(4).replace('.', ',')})
                  = {fmt(TARIF_A.grundpreis)} + {fmt(jahresverbrauch * TARIF_A.arbeitspreis)} = <strong>{fmt(festCost)} €</strong>
                </td></tr>
              </tbody>
            </table>

            {/* ── 3. Tarif B ── */}
            {hasRealCosts && (
              <>
                <h4 className="rp-section-heading" style={{ marginTop: 24 }}>3. Tarif B — Dynamischer Tarif</h4>
                <p className="calc-formula">Jahreskosten(B) = Grundpreis + Σ [ Last(h) × (spotpreis(h) + Preisadder) ]</p>

                <p className="calc-subheading">3a. Grundpreis (Jahresfixkosten)</p>
                <table className="metrics-table">
                  <thead><tr><th>Bestandteil</th><th>Wert</th><th>Einheit</th></tr></thead>
                  <tbody>
                    <tr><td>GP_basis — Basisgrundpreis</td><td>{fmt(GP_BASIS)}</td><td>€ / Jahr</td></tr>
                    <tr><td>GP_netz — Netzentgelt-Grundpreis</td><td>{fmt(GP_NETZ)}</td><td>€ / Jahr</td></tr>
                    <tr>
                      <td>iMSys — Messstellenbetrieb {hat14a ? '(mit §14a-Gerät)' : '(≤ 6.000 kWh)'}</td>
                      <td>{fmt(imsys)}</td>
                      <td>€ / Jahr</td>
                    </tr>
                    <tr className="total-row">
                      <td><strong>Grundpreis gesamt</strong></td>
                      <td><strong>{fmt(gpDyn)}</strong></td>
                      <td><strong>€ / Jahr</strong></td>
                    </tr>
                    <tr><td colSpan={3} className="calc-detail">
                      = {fmt(GP_BASIS)} + {fmt(GP_NETZ)} + {fmt(imsys)} = <strong>{fmt(gpDyn)} €</strong>
                    </td></tr>
                  </tbody>
                </table>

                <p className="calc-subheading" style={{ marginTop: 12 }}>3b. Preisadder (fixer Aufschlag auf EPEX je kWh)</p>
                <table className="metrics-table">
                  <thead><tr><th>Bestandteil</th><th>Formelname</th><th>ct / kWh</th><th>€ / kWh</th></tr></thead>
                  <tbody>
                    <tr><td>Basisverbrauchspreis (Aufschlag)</td><td>aufschlag</td><td>{(AUFSCHLAG * 100).toFixed(2).replace('.', ',')}</td><td>{AUFSCHLAG.toFixed(4).replace('.', ',')}</td></tr>
                    <tr><td>Netzentgelt-AP NSSLP</td><td>netz_AP</td><td>{(NETZ_AP * 100).toFixed(2).replace('.', ',')}</td><td>{NETZ_AP.toFixed(4).replace('.', ',')}</td></tr>
                    <tr><td>Konzessionsabgabe Dresden</td><td>konz</td><td>{(KONZ * 100).toFixed(2).replace('.', ',')}</td><td>{KONZ.toFixed(4).replace('.', ',')}</td></tr>
                    <tr><td>KWKG-Umlage</td><td>kwkg</td><td>{(KWKG * 100).toFixed(2).replace('.', ',')}</td><td>{KWKG.toFixed(4).replace('.', ',')}</td></tr>
                    <tr><td>§19 StromNEV-Aufschlag</td><td>par19</td><td>{(PAR19 * 100).toFixed(2).replace('.', ',')}</td><td>{PAR19.toFixed(4).replace('.', ',')}</td></tr>
                    <tr><td>Offshore-Netzumlage</td><td>offshore</td><td>{(OFFSHORE * 100).toFixed(2).replace('.', ',')}</td><td>{OFFSHORE.toFixed(4).replace('.', ',')}</td></tr>
                    <tr><td>Stromsteuer</td><td>stromsteuer</td><td>{(STROMSTEUER * 100).toFixed(2).replace('.', ',')}</td><td>{STROMSTEUER.toFixed(4).replace('.', ',')}</td></tr>
                    <tr><td>Σ Abgaben &amp; Steuern</td><td>abgaben_fix</td><td>{(ABGABEN_FIX * 100).toFixed(2).replace('.', ',')}</td><td>{ABGABEN_FIX.toFixed(4).replace('.', ',')}</td></tr>
                    <tr className="total-row">
                      <td><strong>Preisadder gesamt</strong></td><td></td>
                      <td><strong>{(PREISADDER * 100).toFixed(2).replace('.', ',')} ct</strong></td>
                      <td><strong>{PREISADDER.toFixed(4).replace('.', ',')} €</strong></td>
                    </tr>
                    <tr><td colSpan={4} className="calc-detail">
                      = {(AUFSCHLAG*100).toFixed(2).replace('.',',')} + {(NETZ_AP*100).toFixed(2).replace('.',',')} + {(ABGABEN_FIX*100).toFixed(2).replace('.',',')} = <strong>{(PREISADDER*100).toFixed(2).replace('.',',')} ct/kWh</strong>
                    </td></tr>
                  </tbody>
                </table>

                <p className="calc-subheading" style={{ marginTop: 12 }}>3c. Jahreskosten Tarif B</p>
                <table className="metrics-table">
                  <thead><tr><th>Bestandteil</th><th>Wert</th><th>Einheit</th></tr></thead>
                  <tbody>
                    <tr><td>Grundpreis</td><td>{fmt(gpDyn)}</td><td>€ / Jahr</td></tr>
                    <tr><td>EPEX Spot DE Ø 2025</td><td>variabel (stündlich)</td><td>€ / kWh</td></tr>
                    <tr><td>Preisadder (fix)</td><td>{PREISADDER.toFixed(4).replace('.', ',')}</td><td>€ / kWh</td></tr>
                    <tr><td>Lastprofil</td><td>{loadProfile}</td><td>BDEW 2025</td></tr>
                    <tr className="total-row">
                      <td><strong>Jahreskosten (B)</strong></td>
                      <td><strong>{jahreskosten.B ? fmt(jahreskosten.B.kosten) : '—'}</strong></td>
                      <td><strong>€</strong></td>
                    </tr>
                  </tbody>
                </table>

                {/* ── 4. Tarif B1 ── */}
                {jahreskosten.B1 && (
                  <>
                    <h4 className="rp-section-heading" style={{ marginTop: 24 }}>4. Tarif B1 — §14a Modul 1 (PV-Einspeisevergütung)</h4>
                    <p className="calc-formula">Jahreskosten(B1) = Jahreskosten(B) − modul1_rabatt</p>
                    <table className="metrics-table">
                      <thead><tr><th>Bestandteil</th><th>Wert</th><th>Einheit</th></tr></thead>
                      <tbody>
                        <tr><td>Jahreskosten Tarif B</td><td>{jahreskosten.B ? fmt(jahreskosten.B.kosten) : '—'}</td><td>€</td></tr>
                        <tr><td>modul1_rabatt (§14a M1)</td><td>− {fmt(TARIF_B1.m1_rabatt)}</td><td>€ / Jahr</td></tr>
                        <tr><td>Anwendbar</td><td>{jahreskosten.B1.m1Anwendbar ? 'Ja — PV-Anlage vorhanden' : 'Nein — kein Rabatt'}</td><td>—</td></tr>
                        <tr className="total-row">
                          <td><strong>Jahreskosten (B1)</strong></td>
                          <td><strong>{fmt(jahreskosten.B1.kosten)}</strong></td>
                          <td><strong>€</strong></td>
                        </tr>
                        {jahreskosten.B1.m1Anwendbar && (
                          <tr><td colSpan={3} className="calc-detail">
                            = {jahreskosten.B ? fmt(jahreskosten.B.kosten) : '—'} − {fmt(TARIF_B1.m1_rabatt)} = <strong>{fmt(jahreskosten.B1.kosten)} €</strong>
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </>
                )}

                {/* ── 5. Tarif B2 ── */}
                {jahreskosten.B2 && (
                  <>
                    <h4 className="rp-section-heading" style={{ marginTop: 24 }}>5. Tarif B2 — §14a Modul 2 (60% Netzentgelt)</h4>
                    <p className="calc-formula">Jahreskosten(B2) = Jahreskosten(B) − (jv × netz_AP × 40%)</p>
                    <table className="metrics-table">
                      <thead><tr><th>Bestandteil</th><th>Wert</th><th>Einheit</th></tr></thead>
                      <tbody>
                        <tr><td>Jahreskosten Tarif B</td><td>{jahreskosten.B ? fmt(jahreskosten.B.kosten) : '—'}</td><td>€</td></tr>
                        <tr><td>netz_AP</td><td>{NETZ_AP.toFixed(4).replace('.', ',')}</td><td>€ / kWh</td></tr>
                        <tr><td>Reduktion (40% Rabatt auf netz_AP)</td><td>40 %</td><td>—</td></tr>
                        <tr><td>Jahresverbrauch</td><td>{jahresverbrauch.toLocaleString('de-DE')}</td><td>kWh</td></tr>
                        <tr><td>Netzentgelt-Einsparung</td><td>− {fmt(m2Saving)}</td><td>€ / Jahr</td></tr>
                        <tr><td>Anwendbar</td><td>{jahreskosten.B2.m2Anwendbar ? `Ja — ${formData.hat_WP === 'ja' ? 'Wärmepumpe' : ''}${formData.hat_WP === 'ja' && hasWallbox ? ' & ' : ''}${hasWallbox ? 'Wallbox' : ''}` : 'Nein'}</td><td>—</td></tr>
                        <tr className="total-row">
                          <td><strong>Jahreskosten (B2)</strong></td>
                          <td><strong>{fmt(jahreskosten.B2.kosten)}</strong></td>
                          <td><strong>€</strong></td>
                        </tr>
                        {jahreskosten.B2.m2Anwendbar && (
                          <tr><td colSpan={3} className="calc-detail">
                            = {jahreskosten.B ? fmt(jahreskosten.B.kosten) : '—'} − ({jahresverbrauch.toLocaleString('de-DE')} × {NETZ_AP.toFixed(4).replace('.', ',')} × 0,40)
                            = {jahreskosten.B ? fmt(jahreskosten.B.kosten) : '—'} − {fmt(m2Saving)} = <strong>{fmt(jahreskosten.B2.kosten)} €</strong>
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </>
                )}

                {/* ── 6. Tarif B3 ── */}
                <h4 className="rp-section-heading" style={{ marginTop: 24 }}>6. Tarif B3 — §14a Modul 3 (zeitvariable Netzentgelte)</h4>
                <p className="calc-formula">Jahreskosten(B3) = Grundpreis + Σ [ Last(h) × (spotpreis(h) + adder(h)) ]</p>
                <table className="metrics-table">
                  <tbody>
                    <tr><td>M3_HT_preis (6–22 Uhr)</td><td colSpan={2} style={{ color: '#DC2626' }}>■ fehlt — nicht von SachsenEnergie veröffentlicht</td></tr>
                    <tr><td>M3_NT_preis (22–6 Uhr)</td><td colSpan={2} style={{ color: '#DC2626' }}>■ fehlt — nicht von SachsenEnergie veröffentlicht</td></tr>
                    <tr><td>Status</td><td colSpan={2}>B3-Berechnung deaktiviert bis Preise vorliegen</td></tr>
                  </tbody>
                </table>
              </>
            )}

            {/* ── 7. PV-Anlage ── */}
            {hasPv && pvFlaeche > 0 && (
              <>
                <h4 className="rp-section-heading" style={{ marginTop: 24 }}>7. PV-Anlage — Jahresertrag</h4>
                <p className="calc-formula">E = G × A × η × f(α, β)</p>
                <table className="metrics-table">
                  <thead><tr><th>Symbol</th><th>Bedeutung</th><th>Wert</th><th>Quelle</th></tr></thead>
                  <tbody>
                    <tr><td>G</td><td>Globalstrahlung Dresden</td><td>{GLOBALSTRAHLUNG_DRESDEN} kWh/m²/Jahr</td><td>Fraunhofer ISE / DWD</td></tr>
                    <tr><td>A</td><td>Modulfläche</td><td>{pvFlaeche} m²</td><td>Nutzereingabe</td></tr>
                    <tr><td>η</td><td>Wirkungsgrad</td><td>{(WIRKUNGSGRAD_PV * 100).toFixed(0)} % (mono-kristallin)</td><td>Fraunhofer ISE</td></tr>
                    <tr><td>α</td><td>Ausrichtung (0° = Süd)</td><td>{pvAusrichtung}°</td><td>Nutzereingabe</td></tr>
                    <tr><td>β</td><td>Neigungswinkel</td><td>{pvWinkel}°</td><td>Nutzereingabe</td></tr>
                    <tr><td>f(α,β)</td><td>Korrekturfaktor</td><td>{pvKorrektur?.toFixed(3)}</td><td>Kennwerttabelle (Spreadsheet)</td></tr>
                    <tr className="total-row">
                      <td colSpan={2}><strong>Jahresertrag E</strong></td>
                      <td><strong>ca. {pvErtrag.toLocaleString('de-DE')} kWh</strong></td>
                      <td></td>
                    </tr>
                    <tr><td colSpan={4} className="calc-detail">
                      = {GLOBALSTRAHLUNG_DRESDEN} × {pvFlaeche} × {WIRKUNGSGRAD_PV} × {pvKorrektur?.toFixed(3)} = <strong>{pvErtrag.toLocaleString('de-DE')} kWh</strong>
                    </td></tr>
                  </tbody>
                </table>
              </>
            )}

            {/* ── 8. Wärmepumpe ── */}
            {formData.hat_WP === 'ja' && flaeche > 0 && (
              <>
                <h4 className="rp-section-heading" style={{ marginTop: 24 }}>8. Wärmepumpe — Heizenergiebedarf</h4>
                <p className="calc-formula">Q_heiz = U × A × Σ(ΔT × Tage × 24 h) / 1000 &nbsp;|&nbsp; W_el = Q_heiz / COP</p>
                <table className="metrics-table">
                  <thead><tr><th>Parameter</th><th>Wert</th><th>Quelle</th></tr></thead>
                  <tbody>
                    <tr><td>U-Wert (Baujahr {formData.baujahr || '—'})</td><td>{uWert.toFixed(2)} W/(m²·K)</td><td>U-Wert-Tabelle (Transferprotokoll)</td></tr>
                    <tr><td>Grundfläche A</td><td>{flaeche} m²</td><td>Nutzereingabe</td></tr>
                    <tr><td>Innentemperatur T_innen</td><td>{tInnen} °C</td><td>Nutzereingabe</td></tr>
                    <tr><td>Heizgrenze</td><td>15 °C</td><td>DIN 4108 / VDI 2067</td></tr>
                    <tr><td>COP Wärmepumpe</td><td>{COP}</td><td>Transferprotokoll</td></tr>
                  </tbody>
                </table>
                <table className="metrics-table" style={{ marginTop: 8 }}>
                  <thead><tr><th>Monat</th><th>T_außen</th><th>ΔT</th><th>Tage</th><th>Gradstunden</th></tr></thead>
                  <tbody>
                    {heizMonate.map(m => (
                      <tr key={m.name} style={{ opacity: m.aktiv ? 1 : 0.4 }}>
                        <td>{m.name}</td>
                        <td>{m.tAussen.toFixed(1)} °C</td>
                        <td>{m.aktiv ? `${m.deltaT.toFixed(1)} K` : '—'}</td>
                        <td>{TAGE_MONAT[MONATSNAMEN.indexOf(m.name)]}</td>
                        <td>{m.aktiv ? m.gradstunden.toLocaleString('de-DE', { maximumFractionDigits: 0 }) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={4}><strong>Σ Gradstunden</strong></td>
                      <td><strong>{gradstundenGes.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</strong></td>
                    </tr>
                  </tbody>
                </table>
                <table className="metrics-table" style={{ marginTop: 8 }}>
                  <tbody>
                    <tr><td>Wärmebedarf Q_heiz (thermisch)</td><td>{Math.round(qHeizTherm).toLocaleString('de-DE')} kWh</td><td>= {uWert.toFixed(2)} × {flaeche} × {gradstundenGes.toFixed(0)} / 1000</td></tr>
                    <tr className="total-row">
                      <td><strong>Strombedarf W_el</strong></td>
                      <td><strong>{qHeizElekt.toLocaleString('de-DE')} kWh</strong></td>
                      <td>= {Math.round(qHeizTherm).toLocaleString('de-DE')} / {COP}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            {/* ── 9. E-Auto ── */}
            {hasWallbox && kmJahr > 0 && (
              <>
                <h4 className="rp-section-heading" style={{ marginTop: 24 }}>9. E-Auto — Wallbox-Jahresverbrauch</h4>
                <p className="calc-formula">W_wallbox = km_Jahr × Verbrauch_pro_km</p>
                <table className="metrics-table">
                  <thead><tr><th>Parameter</th><th>Wert</th><th>Quelle</th></tr></thead>
                  <tbody>
                    <tr><td>Jährliche Fahrleistung</td><td>{kmJahr.toLocaleString('de-DE')} km / Jahr</td><td>Nutzereingabe</td></tr>
                    <tr><td>Ø Verbrauch E-Auto</td><td>18 kWh / 100 km (0,18 kWh/km)</td><td>ADAC Reallasttest 2023</td></tr>
                    <tr className="total-row">
                      <td><strong>Wallbox-Jahresverbrauch</strong></td>
                      <td><strong>{(kmJahr * 0.18).toLocaleString('de-DE', { maximumFractionDigits: 0 })} kWh</strong></td>
                      <td>= {kmJahr.toLocaleString('de-DE')} × 0,18</td>
                    </tr>
                  </tbody>
                </table>
                {hasLadeData && (
                  <>
                    <p className="calc-subheading" style={{ marginTop: 10 }}>Ladekosten pro Ladesitzung</p>
                    <p className="calc-formula">Kosten = Lademenge × Ø EPEX-Preis &nbsp;|&nbsp; Lademenge = Dauer × 4 × 0,575 kWh</p>
                    <table className="metrics-table">
                      <tbody>
                        <tr><td>Ladedauer</td><td>{ladeDauer} h</td><td>Nutzereingabe</td></tr>
                        <tr><td>kWh / 15-min-Intervall</td><td>0,575 kWh</td><td>Transferprotokoll</td></tr>
                        <tr><td>Lademenge pro Sitzung</td><td>{ladeKwh.toFixed(2).replace('.', ',')} kWh</td><td>= {ladeDauer} × 4 × 0,575</td></tr>
                        <tr><td>Ø EPEX-Preis ({ladeBeginn}–{(ladeBeginn + Math.round(ladeDauer)) % 24} Uhr)</td><td>{(ladePrice * 100).toFixed(2).replace('.', ',')} ct/kWh</td><td>EPEX-Tagesprofil</td></tr>
                        <tr className="total-row"><td><strong>Kosten (aktuell)</strong></td><td><strong>{ladeKosten.toFixed(2).replace('.', ',')} €</strong></td><td>= {ladeKwh.toFixed(2).replace('.', ',')} × {(ladePrice * 100).toFixed(2).replace('.', ',')} ct</td></tr>
                        <tr><td>Optimale Ladezeit</td><td>{optimal?.hour} Uhr</td><td>Günstigstes Fenster (24-h-Profil)</td></tr>
                        <tr><td>Kosten (optimal)</td><td>{optimal?.cost.toFixed(2).replace('.', ',')} €</td><td></td></tr>
                        <tr><td>Einsparung pro Sitzung</td><td className={ladeSaving > 0 ? 'rp-green' : ''}>{ladeSaving > 0.01 ? `${ladeSaving.toFixed(2).replace('.', ',')} €` : 'bereits optimal'}</td><td></td></tr>
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}

            {/* ── 10. Datenquellen ── */}
            <h4 className="rp-section-heading" style={{ marginTop: 24 }}>10. Datenquellen</h4>
            <table className="metrics-table">
              <thead><tr><th>Datensatz</th><th>Quelle</th></tr></thead>
              <tbody>
                <tr><td>EPEX Spot DE Day-Ahead 2025 (Jan–Sep real, Okt–Dez Monatsmittel)</td><td>energy-charts.de</td></tr>
                <tr><td>BDEW Lastprofile H25, P25, S25</td><td>BDEW Repräsentative Profile 2025 (XLSX)</td></tr>
                <tr><td>Grundpreis, Arbeitspreis, Aufschläge, Netzentgelt</td><td>SachsenEnergie AG — Tarifinformationen Ökostrom Dynamisch, 24.03.2026</td></tr>
                <tr><td>§14a M1-Rabatt (162,95 €/Jahr)</td><td>Transferprotokoll BeING Inside 2026</td></tr>
                <tr><td>PV-Globalstrahlung Dresden, Kennwerttabelle f(α,β)</td><td>Fraunhofer ISE / Spreadsheet BeING Inside 2026</td></tr>
                <tr><td>U-Werte nach Baujahr</td><td>Transferprotokoll BeING Inside 2026</td></tr>
                <tr><td>Klimadaten Dresden (T_außen monatlich)</td><td>DWD — Deutscher Wetterdienst (historische Mittelwerte)</td></tr>
                <tr><td>COP = 3,5</td><td>Transferprotokoll BeING Inside 2026</td></tr>
                <tr><td>E-Auto Verbrauch (18 kWh/100 km)</td><td>ADAC Reallasttest 2023 (Flottenø)</td></tr>
                <tr><td>Haushaltsstrom nach Personenzahl</td><td>BDEW Stromverbrauch privater Haushalte 2023</td></tr>
                <tr><td>M3 HT/NT-Preise</td><td style={{ color: '#DC2626' }}>■ Noch nicht veröffentlicht (SachsenEnergie)</td></tr>
              </tbody>
            </table>

            <p className="rp-note" style={{ marginTop: 12 }}>
              Alle Werte brutto inkl. 19 % MwSt. · Berechnung auf Basis 8.760 Stundenwerte 2025 ·
              BeING Inside 2026 — TU Dresden × SachsenEnergie AG
            </p>
          </div>
        );
      })()}

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
