import { useState } from 'react';
import {
  GLOBALSTRAHLUNG_DRESDEN,
  WIRKUNGSGRAD_PV,
  calcPvErtrag,
  getSonneneinstrahlung,
} from '../data/pvData';

const EPEX_PRICE  = 82;     // €/MWh Day-Ahead DE avg 2025
const GRUNDPREIS  = 122.96; // EUR/Jahr
const ARBEITSPREIS = 0.3571; // EUR/kWh

export default function EnergyCalc({ formData = {}, jahresverbrauch = 0 }) {
  const [open, setOpen] = useState(false);

  const hasJV = jahresverbrauch > 0;
  const festCost = hasJV ? Math.round(GRUNDPREIS + jahresverbrauch * ARBEITSPREIS) : null;

  const kmJahr      = parseFloat(formData.km_jahr) || 0;
  const hasWallbox  = formData.e_auto === 'ja';
  const wallboxJahr = hasWallbox ? Math.round(kmJahr * 20 / 100) : 0;

  const hasPv = formData.pv_anlage === 'ja';
  const pvFlaeche     = hasPv ? (parseFloat(formData.pv_flaeche)     || 0) : 0;
  const pvAusrichtung = hasPv ? (parseFloat(formData.pv_ausrichtung) ?? 0) : 0;
  const pvWinkel      = hasPv ? (parseFloat(formData.pv_winkel)      ?? 30) : 0;
  const pvKorrektur   = hasPv && pvFlaeche > 0 ? getSonneneinstrahlung(pvAusrichtung, pvWinkel) : null;
  const pvErtrag      = hasPv && pvFlaeche > 0 ? Math.round(calcPvErtrag(pvFlaeche, pvAusrichtung, pvWinkel)) : null;

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
            <h4>Jahreskosten (Festtarif)</h4>
            <p>
              Die Jahreskosten im Festtarif setzen sich aus einem fixen Grundpreis und einem
              verbrauchsabhängigen Arbeitspreis zusammen.
            </p>
            <table className="calc-table">
              <thead>
                <tr><th>Bestandteil</th><th>Wert</th><th>Berechnung</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Grundpreis</td>
                  <td>122,96 € / Jahr</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Arbeitspreis</td>
                  <td>0,3571 € / kWh</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Jahresverbrauch</td>
                  <td>{hasJV ? `${jahresverbrauch.toLocaleString('de-DE')} kWh` : 'nicht eingegeben'}</td>
                  <td>—</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Jahreskosten</strong></td>
                  <td>
                    <strong>
                      {hasJV
                        ? `${festCost.toLocaleString('de-DE')} €`
                        : '—'}
                    </strong>
                  </td>
                  <td>
                    {hasJV
                      ? `= 122,96 + (${jahresverbrauch.toLocaleString('de-DE')} × 0,3571)`
                      : '= 122,96 + (Verbrauch × 0,3571)'}
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              Quelle: SachsenEnergie Grundversorgung ab 01.01.2026.
            </p>
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
                <tr className="total-row"><td><strong>Gesamt (Endverbraucher)</strong></td><td><strong>≈ 32</strong></td></tr>
              </tbody>
            </table>
          </div>

          <div className="calc-block">
            <h4>Wallbox / E-Auto — Jahresverbrauch</h4>
            <p>
              Der jährliche Ladestromverbrauch eines Elektroautos ergibt sich aus der Fahrleistung
              und dem durchschnittlichen Verbrauch von 20 kWh pro 100 km.
            </p>
            <table className="calc-table">
              <thead>
                <tr><th>Bestandteil</th><th>Wert</th><th>Berechnung</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Jährliche Fahrleistung</td>
                  <td>{hasWallbox && kmJahr > 0 ? `${kmJahr.toLocaleString('de-DE')} km` : 'nicht eingegeben'}</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Ø Verbrauch E-Auto</td>
                  <td>20 kWh / 100 km</td>
                  <td>—</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Wallbox-Jahresverbrauch</strong></td>
                  <td>
                    <strong>
                      {hasWallbox && kmJahr > 0
                        ? `ca. ${wallboxJahr.toLocaleString('de-DE')} kWh`
                        : '—'}
                    </strong>
                  </td>
                  <td>
                    {hasWallbox && kmJahr > 0
                      ? `= ${kmJahr.toLocaleString('de-DE')} × 20 / 100`
                      : 'wallbox_jahr = km_jahr × 20 / 100'}
                  </td>
                </tr>
              </tbody>
            </table>
            <p>Quelle: BeING Inside 2026 Spezifikation — Nutzereingaben §3 Wallbox/E-Auto.</p>
          </div>

          <div className="calc-block">
            <h4>PV-Anlage — Jahresertrag</h4>
            <p>
              Der Jahresertrag einer PV-Anlage hängt von der Modulfläche, dem Wirkungsgrad der
              Module sowie einem Korrekturfaktor für Ausrichtung und Neigungswinkel ab.
              Die Strahlungsdaten basieren auf Referenzwerten für den Raum Dresden (Fraunhofer ISE).
            </p>
            <table className="calc-table">
              <thead>
                <tr><th>Bestandteil</th><th>Wert</th><th>Berechnung</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Globalstrahlung Dresden (G)</td>
                  <td>{GLOBALSTRAHLUNG_DRESDEN} kWh/m²/Jahr</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Wirkungsgrad (η)</td>
                  <td>{(WIRKUNGSGRAD_PV * 100).toFixed(0)} % (monokristallin)</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Modulfläche (A)</td>
                  <td>{hasPv && pvFlaeche > 0 ? `${pvFlaeche} m²` : 'nicht eingegeben'}</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Ausrichtung (α)</td>
                  <td>{hasPv ? `${pvAusrichtung}° (0° = Süd)` : '—'}</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Neigungswinkel (β)</td>
                  <td>{hasPv ? `${pvWinkel}°` : '—'}</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Korrekturfaktor f(α, β)</td>
                  <td>{pvKorrektur !== null ? pvKorrektur.toFixed(3) : '—'}</td>
                  <td>aus Kennwerttabelle</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Jahresertrag E</strong></td>
                  <td>
                    <strong>
                      {pvErtrag !== null
                        ? `ca. ${pvErtrag.toLocaleString('de-DE')} kWh`
                        : hasPv ? 'Fläche fehlt' : '—'}
                    </strong>
                  </td>
                  <td>
                    {pvErtrag !== null
                      ? `= ${GLOBALSTRAHLUNG_DRESDEN} × ${pvFlaeche} × ${WIRKUNGSGRAD_PV} × ${pvKorrektur.toFixed(3)}`
                      : 'E = G × A × η × f(α, β)'}
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              Quelle: Fraunhofer ISE / Kennwerttabelle „PV-Anlage_wirklich_final_(hoffentlich).xlsx".
              Monatliche Strahlungsverteilung Dresden: Jan 37,7 · Feb 61,4 · Mär 95,1 · Apr 129,5 ·
              Mai 144,2 · Jun 152,6 · Jul 146,4 · Aug 138,1 · Sep 107,5 · Okt 74,6 · Nov 44,0 · Dez 29,9 kWh/m².
              Jahressumme: 1.161 kWh/m².
            </p>
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
