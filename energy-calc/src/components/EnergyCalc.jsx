import { useState } from 'react';
import { metricsTable } from '../data/questions';

const EPEX_PRICE = 82; // €/MWh Day-Ahead DE avg 2025
const CONSUMER_PRICE = 0.32; // €/kWh end consumer

export default function EnergyCalc() {
  const [open, setOpen] = useState(false);

  return (
    <div className="energy-calc-section">
      <button className="energy-calc-toggle" onClick={() => setOpen((v) => !v)}>
        <span>Energieberechnungen</span>
        <span className="toggle-icon">{open ? '↑' : '↓'}</span>
      </button>

      {open && (
        <div className="energy-calc-content">
          <h3>Grundlage der Berechnung</h3>

          <p>
            Die Stromkostenberechnung basiert auf zwei Preisebenen: dem Großhandelspreis am
            Strommarkt (EPEX SPOT) und dem Endverbraucherpreis, der zusätzlich Netzentgelte,
            Steuern und Abgaben enthält.
          </p>

          <div className="calc-block">
            <h4>Großhandelspreis (EPEX SPOT)</h4>
            <p>
              Der EPEX SPOT Day-Ahead-Markt ist der wichtigste Referenzmarkt für Strom in
              Deutschland. Der Preis spiegelt das Angebot und die Nachfrage für den nächsten Tag wider.
            </p>
            <ul>
              <li>Quelle: <strong>EPEX SPOT DE Day-Ahead Auktion</strong></li>
              <li>Durchschnittspreis 2025: <strong>{EPEX_PRICE} €/MWh ({(EPEX_PRICE / 10).toFixed(1)} ct/kWh)</strong></li>
              <li>Marktdaten: <a href="https://www.epexspot.com/en/market-results" target="_blank" rel="noreferrer">epexspot.com/en/market-results</a></li>
            </ul>
          </div>

          <div className="calc-block">
            <h4>Endverbraucherpreis</h4>
            <p>
              Der Preis, den Haushalte zahlen, setzt sich zusammen aus Großhandelspreis,
              Netzentgelten, Steuern und staatlichen Abgaben.
            </p>
            <table className="calc-table">
              <thead>
                <tr><th>Bestandteil</th><th>ct/kWh</th></tr>
              </thead>
              <tbody>
                <tr><td>EPEX SPOT Großhandelspreis</td><td>{(EPEX_PRICE / 10).toFixed(1)}</td></tr>
                <tr><td>Netzentgelte & Messstellenbetrieb</td><td>8,5</td></tr>
                <tr><td>Steuern & Umlagen (EEG, §19)</td><td>5,3</td></tr>
                <tr><td>Konzessionsabgabe</td><td>1,8</td></tr>
                <tr><td>Umsatzsteuer (19 %)</td><td>ca. 6,1</td></tr>
                <tr className="total-row"><td><strong>Gesamt (Endverbraucher)</strong></td><td><strong>≈ {(CONSUMER_PRICE * 100).toFixed(0)}</strong></td></tr>
              </tbody>
            </table>
          </div>

          <div className="calc-block">
            <h4>Verbrauchswerte je Antwort</h4>
            <p>Folgende Verbrauchswerte fließen in die Berechnung ein (Quelle: Bundesnetzagentur 2024, BDEW):</p>
            <table className="metrics-table">
              <thead>
                <tr><th>Kategorie</th><th>Option</th><th>kWh / Jahr</th></tr>
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
          </div>

          <p className="calc-disclaimer">
            Alle Angaben sind Schätzwerte auf Basis öffentlicher Marktdaten. Der tatsächliche
            Verbrauch und die Kosten können abweichen.
          </p>
        </div>
      )}
    </div>
  );
}
