const GRUNDPREIS    = 122.96; // EUR/Jahr (Festtarif)
const ARBEITSPREIS  = 0.3571; // EUR/kWh  (SachsenEnergie Grundversorgung ab 01.01.2026)
const DYNAMIC_PRICE = 0.22;   // Dynamischer Tarif — Platzhalterwert (EPEX SPOT Ø)

function CostChart({ jahresverbrauch }) {
  const kwh      = jahresverbrauch;
  const festCost = kwh > 0 ? Math.round(GRUNDPREIS + kwh * ARBEITSPREIS) : 0;
  const dynCost  = Math.round(kwh * DYNAMIC_PRICE);
  const savings  = festCost - dynCost;

  const max     = festCost > 0 ? festCost * 1.25 : 1000;
  const festPct = (festCost / max) * 100;
  const dynPct  = (dynCost  / max) * 100;
  const hasData = kwh > 0;

  return (
    <div className="bar-chart">
      <div className="bar-row">
        <span className="bar-label">Festtarif</span>
        <div className="bar-track">
          <div className="bar-fill user-bar" style={{ width: hasData ? `${festPct}%` : '0%' }} />
        </div>
        <span className="bar-value">{hasData ? festCost.toLocaleString('de-DE') + ' €' : '—'}</span>
      </div>

      <div className="bar-row">
        <span className="bar-label">Dynamischer Tarif*</span>
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
        * Dynamischer Tarif basiert auf EPEX SPOT Durchschnittswerten.
        Individuelle Einsparungen können variieren.
      </p>
    </div>
  );
}

export default function Sidebar({ jahresverbrauch }) {
  const kwh      = jahresverbrauch;
  const festCost = kwh > 0 ? Math.round(GRUNDPREIS + kwh * ARBEITSPREIS) : 0;
  const dynCost  = Math.round(kwh * DYNAMIC_PRICE);
  const savings  = festCost - dynCost;
  const hasData  = kwh > 0;

  return (
    <div className="sidebar">
      <div className="sidebar-graph-box">
        <h3 className="sidebar-section-title">Einsparpotenzial — Jahreskosten</h3>
        <CostChart jahresverbrauch={jahresverbrauch} />
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
              <span className="info-key">Kosten (Festtarif)</span>
              <span className="info-val">ca. {festCost.toLocaleString('de-DE')} €</span>
            </li>
            <li>
              <span className="info-key">Kosten (Dyn. Tarif)*</span>
              <span className="info-val">ca. {dynCost.toLocaleString('de-DE')} €</span>
            </li>
            <li className="savings-row">
              <span className="info-key info-key-savings">Einsparpotenzial</span>
              <span className="info-val info-val-savings">ca. {savings.toLocaleString('de-DE')} €</span>
            </li>
          </ul>
        )}
        <p className="info-note">
          * Basierend auf Platzhalterwerten. Wird mit echten EPEX SPOT Daten aktualisiert.
        </p>
      </div>
    </div>
  );
}
