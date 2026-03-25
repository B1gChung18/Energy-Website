import { useState } from 'react';
import { ALL_QUESTIONS, JAHRESVERBRAUCH_Q } from '../data/questions';
import { calcPvErtrag } from '../data/pvData';

const GRUNDPREIS    = 122.96; // EUR/Jahr (SachsenEnergie Grundversorgung ab 01.01.2026)
const ARBEITSPREIS  = 0.3571; // EUR/kWh
const DYNAMIC_PRICE = 0.22;   // Dynamischer Tarif — Platzhalterwert

function formatAnswer(q, val) {
  if (val == null || val === '') return '—';
  if (q.type === 'yesno') return val === 'ja' ? 'Ja' : 'Nein';
  return q.unit ? `${val} ${q.unit}` : val;
}

export default function Results({ formData, jahresverbrauch, onReset }) {
  const festCost = Math.round(GRUNDPREIS + jahresverbrauch * ARBEITSPREIS);
  const dynCost  = Math.round(jahresverbrauch * DYNAMIC_PRICE);
  const savings  = festCost - dynCost;

  const hasPv = formData.pv_anlage === 'ja';
  const pvFlaeche     = hasPv ? (parseFloat(formData.pv_flaeche)     || 0) : 0;
  const pvAusrichtung = hasPv ? (parseFloat(formData.pv_ausrichtung) ?? 0) : 0;
  const pvWinkel      = hasPv ? (parseFloat(formData.pv_winkel)      ?? 30) : 0;
  const pvErtrag      = hasPv ? Math.round(calcPvErtrag(pvFlaeche, pvAusrichtung, pvWinkel)) : 0;

  const [showTable, setShowTable] = useState(false);

  const summaryRows = ALL_QUESTIONS.filter((q) => {
    const val = formData[q.id];
    return val != null && val !== '';
  });

  return (
    <div className="results-card">
      <h2 className="results-title">Geschätztes Einsparpotenzial — Dynamischer Stromtarif</h2>

      <div className="result-highlight">
        <div className="result-value">{jahresverbrauch.toLocaleString('de-DE')} kWh</div>
        <div className="result-label">Jahresverbrauch</div>
      </div>

      <div className="result-cost-grid">
        <div className="result-cost-item">
          <span className="result-cost-label">Kosten (Festtarif)</span>
          <span className="result-cost-value">
            ca. {festCost.toLocaleString('de-DE')} €
            <span className="result-cost-unit"> / Jahr</span>
          </span>
        </div>
        <div className="result-cost-item">
          <span className="result-cost-label">Kosten (Dynamischer Tarif)*</span>
          <span className="result-cost-value">
            ca. {dynCost.toLocaleString('de-DE')} €
            <span className="result-cost-unit"> / Jahr</span>
          </span>
        </div>
        <div className="result-cost-item result-savings-item">
          <span className="result-cost-label result-savings-label">Einsparpotenzial</span>
          <span className="result-cost-value result-savings-value">
            ca. {savings.toLocaleString('de-DE')} €
            <span className="result-cost-unit"> / Jahr</span>
          </span>
        </div>
      </div>

      {hasPv && (
        <div className="result-cost-item">
          <span className="result-cost-label">PV-Jahresertrag (geschätzt)</span>
          <span className="result-cost-value">
            ca. {pvErtrag.toLocaleString('de-DE')} kWh
            <span className="result-cost-unit"> / Jahr</span>
          </span>
        </div>
      )}

      <p className="cost-note">
        * Basierend auf Platzhalterwerten. Wird mit echten EPEX SPOT Daten aktualisiert.
      </p>

      <div className={`recommendation-box ${savings > 0 ? 'recommendation-yes' : 'recommendation-no'}`}>
        <h3 className="recommendation-title">Empfehlung</h3>
        {savings > 0 ? (
          <div className="recommendation-text">
            <p><strong>Wir empfehlen Ihnen den dynamischen Stromtarif.</strong></p>
            <p>
              Bei einem dynamischen Vertrag erfolgt die Strombelieferung durch einen Energielieferanten,
              wobei sich der Arbeitspreis pro kWh an dem Börsenpreis orientiert und sich damit mehrmals
              täglich ändern kann.
            </p>
            <p>
              Für eine optimale Nutzung empfehlen wir Ihnen sich ein intelligentes Messsystem anzulegen
              und dies mit ihren Geräten zu koppeln. Dadurch wird versichert, dass der Strom dann genutzt
              wird, wenn der Börsenstrompreis niedrig liegt.
            </p>
          </div>
        ) : (
          <p className="recommendation-text"><strong>Nicht empfohlen</strong></p>
        )}
      </div>

      {summaryRows.length > 0 && (
        <div className="answers-summary">
          <h3>Ihre Angaben</h3>
          <ul>
            {summaryRows.map((q) => (
              <li key={q.id}>
                <span className="summary-q">
                  {q.id === JAHRESVERBRAUCH_Q.id ? q.question : (q.parent ? '→ ' : '') + q.question}
                </span>
                <span className="summary-a">{formatAnswer(q, formData[q.id])}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="toggle-table-btn" onClick={() => setShowTable((v) => !v)}>
        {showTable ? 'Metriktabelle ausblenden ↑' : 'Metriktabelle anzeigen ↓'}
      </button>

      {showTable && (
        <div className="metrics-table-wrapper">
          <h3>Grundlage der Berechnung</h3>
          <table className="metrics-table">
            <thead>
              <tr><th>Bestandteil</th><th>Wert</th></tr>
            </thead>
            <tbody>
              <tr><td>Grundpreis</td><td>122,96 € / Jahr</td></tr>
              <tr><td>Arbeitspreis (Festtarif)</td><td>0,3571 € / kWh</td></tr>
              <tr><td>Jahresverbrauch</td><td>{jahresverbrauch.toLocaleString('de-DE')} kWh</td></tr>
              <tr className="total-row">
                <td><strong>Jahreskosten (Festtarif)</strong></td>
                <td><strong>{festCost.toLocaleString('de-DE')} €</strong></td>
              </tr>
            </tbody>
          </table>
          {hasPv && (
            <>
              <h3 style={{ marginTop: '1rem' }}>PV-Anlage</h3>
              <table className="metrics-table">
                <thead>
                  <tr><th>Bestandteil</th><th>Wert</th></tr>
                </thead>
                <tbody>
                  <tr><td>Modulfläche</td><td>{pvFlaeche} m²</td></tr>
                  <tr><td>Ausrichtung (0° = Süd)</td><td>{pvAusrichtung}°</td></tr>
                  <tr><td>Neigungswinkel</td><td>{pvWinkel}°</td></tr>
                  <tr><td>Globalstrahlung Dresden</td><td>1.161 kWh/m²/Jahr</td></tr>
                  <tr><td>Wirkungsgrad (η)</td><td>22 %</td></tr>
                  <tr className="total-row">
                    <td><strong>Geschätzter Jahresertrag</strong></td>
                    <td><strong>ca. {pvErtrag.toLocaleString('de-DE')} kWh</strong></td>
                  </tr>
                </tbody>
              </table>
              <p className="table-note">
                Formel: E = G × A × η × f(α, β) — Korrekturfaktor f aus Fraunhofer/Dresden Kennwerttabelle.
              </p>
            </>
          )}
          <p className="table-note">
            Festtarif: SachsenEnergie Grundversorgung ab 01.01.2026. Dynamischer Tarif: Platzhalterwert basierend auf EPEX SPOT Ø.
          </p>
        </div>
      )}

      <button className="reset-btn" onClick={onReset}>Neu berechnen</button>
    </div>
  );
}
