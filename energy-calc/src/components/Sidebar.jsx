import { TARIF_A, TARIF_B } from '../data/tarifData';
import { HOURLY_EPEX } from '../data/epexData';

const ARBEITSPREIS = TARIF_A.arbeitspreis;
const GRUNDPREIS   = TARIF_A.grundpreis;
const PREISADDER   = TARIF_B.preisadder;

// Mean EPEX price from placeholder 24-h profile
const EPEX_MEAN = HOURLY_EPEX.reduce((s, v) => s + v, 0) / HOURLY_EPEX.length;

// Compute dynamic tariff cost using spot mean when no 8760 data available
function dynCostEstimate(kwh, spotData) {
  if (spotData && spotData.length === 8760) {
    const mean = spotData.reduce((s, v) => s + v, 0) / 8760;
    return Math.round(GRUNDPREIS + kwh * (mean + PREISADDER));
  }
  return Math.round(GRUNDPREIS + kwh * (EPEX_MEAN + PREISADDER));
}

function CostChart({ jahresverbrauch, spotData }) {
  const kwh      = jahresverbrauch;
  const festCost = kwh > 0 ? Math.round(GRUNDPREIS + kwh * ARBEITSPREIS) : 0;
  const dynCost  = kwh > 0 ? dynCostEstimate(kwh, spotData) : 0;
  const savings  = festCost - dynCost;

  const max     = festCost > 0 ? festCost * 1.25 : 1000;
  const festPct = (festCost / max) * 100;
  const dynPct  = (dynCost  / max) * 100;
  const hasData = kwh > 0;

  return (
    <div className="bar-chart">
      <div className="bar-row">
        <span className="bar-label">Festtarif (A)</span>
        <div className="bar-track">
          <div className="bar-fill user-bar" style={{ width: hasData ? `${festPct}%` : '0%' }} />
        </div>
        <span className="bar-value">{hasData ? festCost.toLocaleString('de-DE') + ' €' : '—'}</span>
      </div>

      <div className="bar-row">
        <span className="bar-label">Dynamischer Tarif (B)</span>
        <div className="bar-track">
          <div className="bar-fill dyn-bar" style={{ width: hasData ? `${dynPct}%` : '0%' }} />
        </div>
        <span className="bar-value">{hasData ? dynCost.toLocaleString('de-DE') + ' €' : '—'}</span>
      </div>

      {hasData && (
        <div className="savings-badge">
          <span className="savings-badge-label">Einsparpotenzial</span>
          <span className="savings-badge-value">ca. {savings.toLocaleString('de-DE')} €</span>
        </div>
      )}

      <p className="chart-note">
        Dynamischer Tarif: EPEX SPOT Ø + Netzentgelt/Umlagen.
        Individuelle Einsparungen können variieren.
      </p>
    </div>
  );
}

export default function Sidebar({ jahresverbrauch, spotData }) {
  const kwh      = jahresverbrauch;
  const festCost = kwh > 0 ? Math.round(GRUNDPREIS + kwh * ARBEITSPREIS) : 0;
  const dynCost  = kwh > 0 ? dynCostEstimate(kwh, spotData) : 0;
  const savings  = festCost - dynCost;
  const hasData  = kwh > 0;

  return (
    <div className="sidebar">
      <div className="sidebar-graph-box">
        <h3 className="sidebar-section-title">Einsparpotenzial — Jahreskosten</h3>
        <CostChart jahresverbrauch={jahresverbrauch} spotData={spotData} />
      </div>

      <div className="sidebar-info-box">
        <h3 className="sidebar-section-title">Ihre Schätzung</h3>
        {!hasData ? (
          <p className="info-placeholder">
            Bitte geben Sie Ihren Jahresverbrauch ein, um eine Schätzung zu erhalten.
          </p>
        ) : (
          <ul className="info-list">
            <li>
              <span className="info-key">Jahresverbrauch</span>
              <span className="info-val">{kwh.toLocaleString('de-DE')} kWh</span>
            </li>
            <li>
              <span className="info-key">Kosten (Festtarif A)</span>
              <span className="info-val">ca. {festCost.toLocaleString('de-DE')} €</span>
            </li>
            <li>
              <span className="info-key">Kosten (Dyn. Tarif B)</span>
              <span className="info-val">ca. {dynCost.toLocaleString('de-DE')} €</span>
            </li>
            <li className="savings-row">
              <span className="info-key info-key-savings">Einsparpotenzial</span>
              <span className="info-val info-val-savings">ca. {savings.toLocaleString('de-DE')} €</span>
            </li>
          </ul>
        )}
        <p className="info-note">
          Schätzung auf Basis EPEX SPOT 2025 Ø + Netzentgelt/Umlagen.
        </p>
      </div>
    </div>
  );
}
