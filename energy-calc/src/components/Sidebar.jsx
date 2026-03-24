const GERMAN_AVG_KWH = 3500;
const EPEX_WHOLESALE_EUR_MWH = 82; // EPEX SPOT DE Day-Ahead avg (2025)
const CONSUMER_PRICE = 0.32; // incl. grid fees, taxes, levies

function BarChart({ userKwh }) {
  const max = Math.max(userKwh, GERMAN_AVG_KWH) * 1.3 || GERMAN_AVG_KWH * 1.3;
  const userPct = (userKwh / max) * 100;
  const avgPct = (GERMAN_AVG_KWH / max) * 100;

  return (
    <div className="bar-chart">
      <div className="bar-row">
        <span className="bar-label">Ihr Haushalt</span>
        <div className="bar-track">
          <div
            className="bar-fill user-bar"
            style={{ width: `${userPct}%` }}
          />
        </div>
        <span className="bar-value">{userKwh > 0 ? userKwh.toLocaleString('de-DE') : '—'} kWh</span>
      </div>
      <div className="bar-row">
        <span className="bar-label">Ø Deutschland</span>
        <div className="bar-track">
          <div
            className="bar-fill avg-bar"
            style={{ width: `${avgPct}%` }}
          />
        </div>
        <span className="bar-value">{GERMAN_AVG_KWH.toLocaleString('de-DE')} kWh</span>
      </div>
      <p className="chart-note">Jahresverbrauch in kWh</p>
    </div>
  );
}

export default function Sidebar({ answers }) {
  const totalKwh = Object.values(answers).reduce((sum, opt) => sum + (opt?.value ?? 0), 0);
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const yearlyCost = (totalKwh * CONSUMER_PRICE).toFixed(0);
  const monthlyCost = (totalKwh * CONSUMER_PRICE / 12).toFixed(0);
  const wholesale = (totalKwh * (EPEX_WHOLESALE_EUR_MWH / 1000)).toFixed(0);

  const diff = totalKwh - GERMAN_AVG_KWH;
  const diffLabel = diff > 0
    ? `${diff.toLocaleString('de-DE')} kWh über dem Durchschnitt`
    : diff < 0
    ? `${Math.abs(diff).toLocaleString('de-DE')} kWh unter dem Durchschnitt`
    : 'Entspricht dem Durchschnitt';
  const diffClass = diff > 0 ? 'diff-above' : diff < 0 ? 'diff-below' : 'diff-equal';

  return (
    <div className="sidebar">
      <div className="sidebar-graph-box">
        <h3 className="sidebar-section-title">Verbrauchsvergleich</h3>
        <BarChart userKwh={totalKwh} />
        {answeredCount > 0 && (
          <p className={`diff-label ${diffClass}`}>{diffLabel}</p>
        )}
      </div>

      <div className="sidebar-info-box">
        <h3 className="sidebar-section-title">Ihre Schätzung</h3>
        {answeredCount === 0 ? (
          <p className="info-placeholder">Bitte beantworten Sie die Fragen, um eine Schätzung zu erhalten.</p>
        ) : (
          <ul className="info-list">
            <li>
              <span className="info-key">Jahresverbrauch</span>
              <span className="info-val">{totalKwh.toLocaleString('de-DE')} kWh</span>
            </li>
            <li>
              <span className="info-key">Monatliche Kosten</span>
              <span className="info-val">ca. {monthlyCost} €</span>
            </li>
            <li>
              <span className="info-key">Jährliche Kosten</span>
              <span className="info-val">ca. {yearlyCost} €</span>
            </li>
            <li>
              <span className="info-key">Großhandelswert*</span>
              <span className="info-val">ca. {wholesale} €</span>
            </li>
          </ul>
        )}
        <p className="info-note">* Basierend auf EPEX SPOT DE Day-Ahead Ø {EPEX_WHOLESALE_EUR_MWH} €/MWh (2025)</p>
      </div>
    </div>
  );
}
