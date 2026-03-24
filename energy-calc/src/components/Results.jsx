import { useState } from 'react';
import { questions, metricsTable } from '../data/questions';

function formatKwh(value) {
  return value.toLocaleString('de-DE') + ' kWh';
}

export default function Results({ answers, onReset }) {
  const total = Object.values(answers).reduce((sum, opt) => sum + opt.value, 0);
  const monthlyKwh = Math.round(total / 12);
  const monthlyCost = ((total / 12) * 0.32).toFixed(2).replace('.', ',');
  const yearlyCost = (total * 0.32).toFixed(2).replace('.', ',');

  const [showTable, setShowTable] = useState(false);

  return (
    <div className="results-card">
      <h2 className="results-title">Ihr geschätzter Stromverbrauch</h2>

      <div className="result-highlight">
        <div className="result-value">{formatKwh(total)}</div>
        <div className="result-label">pro Jahr</div>
      </div>

      <div className="result-secondary">
        <div className="result-item">
          <span className="result-item-value">{formatKwh(monthlyKwh)}</span>
          <span className="result-item-label">pro Monat</span>
        </div>
        <div className="result-divider" />
        <div className="result-item">
          <span className="result-item-value">ca. {monthlyCost} €</span>
          <span className="result-item-label">monatliche Kosten*</span>
        </div>
        <div className="result-divider" />
        <div className="result-item">
          <span className="result-item-value">ca. {yearlyCost} €</span>
          <span className="result-item-label">jährliche Kosten*</span>
        </div>
      </div>

      <p className="cost-note">* Basierend auf einem Durchschnittspreis von 0,32 €/kWh</p>

      <div className="answers-summary">
        <h3>Ihre Angaben</h3>
        <ul>
          {questions.map((q) => (
            <li key={q.id}>
              <span className="summary-q">{q.question}</span>
              <span className="summary-a">{answers[q.id]?.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <button className="toggle-table-btn" onClick={() => setShowTable((v) => !v)}>
        {showTable ? 'Metriktabelle ausblenden ↑' : 'Metriktabelle anzeigen ↓'}
      </button>

      {showTable && (
        <div className="metrics-table-wrapper">
          <h3>Grundlage der Berechnung</h3>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Kategorie</th>
                <th>Option</th>
                <th>kWh / Jahr</th>
              </tr>
            </thead>
            <tbody>
              {metricsTable.map((section) =>
                section.rows.map((row, i) => (
                  <tr key={`${section.category}-${i}`}>
                    {i === 0 && (
                      <td rowSpan={section.rows.length} className="category-cell">
                        {section.category}
                      </td>
                    )}
                    <td>{row.option}</td>
                    <td className={row.kwh < 0 ? 'negative' : ''}>
                      {row.kwh < 0 ? '−' : '+'}{Math.abs(row.kwh).toLocaleString('de-DE')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="table-note">
            Die Werte basieren auf Durchschnittswerten deutscher Haushalte (Bundesnetzagentur, 2024).
          </p>
        </div>
      )}

      <button className="reset-btn" onClick={onReset}>
        Neu berechnen
      </button>
    </div>
  );
}
