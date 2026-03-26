/**
 * BeING Inside 2026 – Tariff constants and calculation logic
 * Source: SachsenEnergie AG — Tarifinformationen Ökostrom Dynamisch, Screenshot 24.03.2026
 * All values brutto incl. 19% MwSt.
 */

// ── Per-kWh cost components (dynamic tariff) ───────────────────────────────
// Source: Tarifinformationen Ökostrom Dynamisch, SachsenEnergie 24.03.2026

export const AUFSCHLAG    = 0.0298; // Basisverbrauchspreis (Aufschlag auf Spotpreis)
export const NETZ_AP      = 0.1106; // Netzentgelt-AP NSSLP SachsenNetze
export const KONZ         = 0.0237; // Konzessionsabgabe Dresden (>500k EW)
export const KWKG         = 0.0053; // KWKG-Umlage
export const PAR19        = 0.0186; // §19 StromNEV-Aufschlag
export const OFFSHORE     = 0.0112; // Offshore-Netzumlage
export const STROMSTEUER  = 0.0244; // Stromsteuer
export const ABGABEN_FIX  = 0.0832; // SUMME Abgaben & Steuern Dresden (konz+kwkg+par19+offshore+stromsteuer)

// Total fixed per-kWh adder on top of EPEX spot price:
// aufschlag + netz_AP + abgaben_fix = 0.0298 + 0.1106 + 0.0832
export const PREISADDER   = 0.2236; // €/kWh

// ── Annual fixed costs (dynamic tariff) ───────────────────────────────────
export const GP_BASIS     = 83.82;  // Basisgrundpreis dyn. Tarif, €/Jahr
export const GP_NETZ      = 35.70;  // Netzentgelt-Grundpreis, €/Jahr
export const IMSYS_NORMAL = 30.00;  // iMSys ≤6.000 kWh/Jahr (EFH), €/Jahr
export const IMSYS_SVE    = 50.00;  // iMSys mit §14a-Gerät (WP/Wallbox/Speicher), €/Jahr

// Total dynamic Grundpreis depends on §14a devices:
// No §14a device : GP_BASIS + GP_NETZ + IMSYS_NORMAL = 149.52 €/Jahr
// With §14a device: GP_BASIS + GP_NETZ + IMSYS_SVE   = 169.52 €/Jahr
function dynGrundpreis(hat14a) {
  return GP_BASIS + GP_NETZ + (hat14a ? IMSYS_SVE : IMSYS_NORMAL);
}

/** Tarif A: Klassischer Festtarif (SachsenEnergie Grundversorgung) */
export const TARIF_A = {
  id: 'A',
  name: 'Festtarif (A)',
  grundpreis: 122.96,   // €/Jahr — confirmed by user (Prompt 4)
  arbeitspreis: 0.3571, // €/kWh — confirmed by user
};

/** Tarif B: Dynamischer Tarif (EPEX + alle Aufschläge) */
export const TARIF_B = {
  id: 'B',
  name: 'Dynamischer Tarif (B)',
  preisadder: PREISADDER, // 0.2236 €/kWh on top of EPEX spot
};

/** Tarif B1: Dynamisch + §14a M1 (PV — 162,95 €/Jahr Rabatt) */
export const TARIF_B1 = {
  id: 'B1',
  name: 'Dyn. + §14a M1 (PV)',
  preisadder: PREISADDER,
  m1_rabatt: 162.95, // €/Jahr — source: modul1_rabatt, Tarifinformationen
};

/** Tarif B2: Dynamisch + §14a M2 (60% Netzentgelt für WP/Wallbox) */
export const TARIF_B2 = {
  id: 'B2',
  name: 'Dyn. + §14a M2 (WP/Wallbox)',
  preisadder: PREISADDER,
  netzentgelt_reduction: 0.40, // 40% off netz_AP → effective 60%
  netzentgelt_anteil: NETZ_AP, // 0.1106 €/kWh
};

/** Tarif B3: Dynamisch + §14a M3 (zeitvariable Netzentgelte)
 *  ⚠ M3_HT_preis and M3_NT_preis officially missing ("fehlt") in source document.
 *  B3 calculation is disabled until real values are provided.
 */
export const TARIF_B3 = {
  id: 'B3',
  name: 'Dyn. + §14a M3 (zeitvariabel)',
  preisadder_nt: null, // M3_NT_preis — fehlt (SachsenEnergie Tarifinformationen)
  preisadder_ht: null, // M3_HT_preis — fehlt (SachsenEnergie Tarifinformationen)
};

// ── U-value lookup by build year ───────────────────────────────────────────

export const U_WERT_LOOKUP = [
  { bis: 1969, u: 1.65 },
  { bis: 1989, u: 1.10 },
  { bis: 1999, u: 0.65 },
  { bis: 2019, u: 0.25 },
  { bis: 9999, u: 0.24 }, // ab 2020
];

export function getUWert(baujahr) {
  const year = parseInt(baujahr) || 1990;
  for (const entry of U_WERT_LOOKUP) {
    if (year <= entry.bis) return entry.u;
  }
  return 0.24;
}

// ── Dresden climate data ───────────────────────────────────────────────────

/** Monthly average outdoor temperatures Dresden (°C), Jan–Dec */
export const T_AUSSEN_MONAT = [-0.5, 0.9, 5.0, 9.7, 14.5, 17.8, 19.6, 19.1, 14.5, 9.5, 4.2, 0.5];

/** Days per month (non-leap year) */
export const TAGE_MONAT = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// ── Constants ──────────────────────────────────────────────────────────────

const COP_WP        = 3.5;  // From transfer protocol

// Average EV consumption: ADAC Reallasttest 2023, fleet average ~18 kWh/100 km
// (VW ID.4: 19.1, Tesla Model 3: 16.2, BMW iX: 20.4 → Ø ~18)
const KWH_PRO_100KM = 0.18;

// Standard heating threshold per DIN 4108 / VDI 2067 — used in all German
// Heizgradtag calculations; below 15°C, space heating is assumed active.
const HEIZGRENZE    = 15;

// Base household electricity by occupant count (kWh/year, excl. heating & EV)
// Source: BDEW Stromverbrauch der privaten Haushalte 2023
//   1 P: ~1.500 kWh  |  2 P: ~2.500 kWh  |  3 P: ~3.200 kWh
//   4 P: ~3.700 kWh  |  5+ P: ~4.500 kWh
const BASE_PERSON = [1500, 2500, 3200, 3700, 4500];

// ── Consumption estimator ──────────────────────────────────────────────────

/**
 * Estimate annual electricity consumption from form inputs.
 * Returns { gesamt, heizung, wallbox, pv, netto } all in kWh/year.
 *
 * @param {object} fd – formData
 */
export function schaetzeJahresverbrauch(fd) {
  // 1. Base household consumption
  const personen = Math.min(5, Math.max(1, parseInt(fd.personen) || 2));
  const basis = BASE_PERSON[personen - 1];

  // 2. Heat pump heating demand
  let heizung = 0;
  if (fd.hat_WP === 'ja') {
    const flaeche  = parseFloat(fd.grundflaeche) || 100;
    const tInnen   = parseFloat(fd.t_innen) || 20;
    const uWert    = getUWert(fd.baujahr);

    // Q_heiz = U × A × Σ(T_innen - T_aussen) × Tage × 24h  [kWh/year]
    let gradstunden = 0;
    for (let m = 0; m < 12; m++) {
      if (T_AUSSEN_MONAT[m] < HEIZGRENZE) {
        gradstunden += (tInnen - T_AUSSEN_MONAT[m]) * TAGE_MONAT[m] * 24;
      }
    }
    const qHeiz  = uWert * flaeche * gradstunden / 1000; // kWh thermal
    heizung = Math.round(qHeiz / COP_WP);
  }

  // 3. E-Auto charging demand
  let wallbox = 0;
  if (fd.e_auto === 'ja') {
    const km = parseFloat(fd.km_jahr) || 15000;
    wallbox = Math.round(km * KWH_PRO_100KM);
  }

  // 4. PV generation (subtract from grid consumption)
  let pv = 0;
  if (fd.pv_anlage === 'ja') {
    // Import inline to avoid circular; caller can also pass pvErtrag directly
    // Here we do a simplified calculation
    const flaeche = parseFloat(fd.pv_flaeche) || 20;
    const ausrichtung = parseFloat(fd.pv_ausrichtung) || 0;
    const winkel = parseFloat(fd.pv_winkel) || 30;

    // Simple yield: G × A × η × orientation_factor × tilt_factor
    const G = 1161; // kWh/m²/year Dresden
    const eta = 0.22;
    const orientFactor = 1 - Math.abs(ausrichtung) / 180 * 0.35;
    const tiltFactor   = 0.85 + 0.15 * Math.sin((winkel * Math.PI) / 180);
    pv = Math.round(G * flaeche * eta * orientFactor * tiltFactor);
  }

  const gesamt = Math.max(0, basis + heizung + wallbox - pv);
  return { gesamt, basis, heizung, wallbox, pv };
}

// ── Annual cost calculation ────────────────────────────────────────────────

/**
 * Calculate annual costs for all tariffs.
 * Requires the 8760-value arrays from JSON to be loaded externally.
 *
 * @param {number}   jv        – annual consumption kWh
 * @param {number[]} spot8760  – EPEX spot prices €/kWh (8760 values)
 * @param {number[]} lp8760    – matching load profile (8760 values, raw units)
 * @param {object}   fd        – formData
 * @returns {object}           – { A, B, B1, B2, B3 } each { kosten, grundpreis, arbeit }
 */
export function berechneJahreskosten(jv, spot8760, lp8760, fd) {
  if (!jv || jv <= 0) return null;

  // Normalise load profile so it sums to jv
  const lpSum  = lp8760.reduce((s, v) => s + v, 0);
  const factor = jv / lpSum;
  const lp     = lp8760.map(v => v * factor); // kWh/h, sums to jv

  // §14a device check (affects iMSys tier and M2/M3 eligibility)
  const hat14a = fd.hat_WP === 'ja' || fd.e_auto === 'ja' || fd.speicher === 'ja';

  // ── Tarif A ──
  const kostenA = TARIF_A.grundpreis + jv * TARIF_A.arbeitspreis;

  // ── Tarif B: spotpreis[t] + preisadder per hour ──
  const gpB = dynGrundpreis(hat14a);
  let arbeitB = 0;
  for (let h = 0; h < 8760; h++) {
    arbeitB += lp[h] * (spot8760[h] + TARIF_B.preisadder);
  }
  const kostenB = gpB + arbeitB;

  // ── Tarif B1: B + M1 (162,95 €/Jahr PV-Rabatt) ──
  const m1Anwendbar = fd.pv_anlage === 'ja';
  const kostenB1    = m1Anwendbar ? kostenB - TARIF_B1.m1_rabatt : kostenB;

  // ── Tarif B2: B + M2 (40% Rabatt auf netz_AP für §14a-Geräte) ──
  const m2Anwendbar = fd.hat_WP === 'ja' || fd.e_auto === 'ja';
  let kostenB2 = kostenB;
  if (m2Anwendbar) {
    const netzSaving = jv * TARIF_B2.netzentgelt_anteil * TARIF_B2.netzentgelt_reduction;
    kostenB2 = kostenB - netzSaving;
  }

  // ── Tarif B3: zeitvariable Netzentgelte — disabled until M3 prices available ──
  // M3_HT_preis and M3_NT_preis are officially "fehlt" per SachsenEnergie document.
  const b3Available = TARIF_B3.preisadder_ht !== null && TARIF_B3.preisadder_nt !== null;
  let kostenB3 = null;
  if (b3Available) {
    let arbeitB3 = 0;
    for (let h = 0; h < 8760; h++) {
      const stunde = h % 24;
      const adder  = (stunde >= 6 && stunde < 22)
        ? TARIF_B3.preisadder_ht
        : TARIF_B3.preisadder_nt;
      arbeitB3 += lp[h] * (spot8760[h] + adder);
    }
    kostenB3 = dynGrundpreis(hat14a) + arbeitB3;
  }

  return {
    A:  { kosten: Math.round(kostenA  * 100) / 100, label: TARIF_A.name },
    B:  { kosten: Math.round(kostenB  * 100) / 100, label: TARIF_B.name },
    B1: { kosten: Math.round(kostenB1 * 100) / 100, label: TARIF_B1.name, m1Anwendbar },
    B2: { kosten: Math.round(kostenB2 * 100) / 100, label: TARIF_B2.name, m2Anwendbar },
    B3: kostenB3 !== null
      ? { kosten: Math.round(kostenB3 * 100) / 100, label: TARIF_B3.name }
      : { kosten: null, label: TARIF_B3.name, fehlt: true },
  };
}

/**
 * Returns the tariff ID with the lowest cost (among enabled tariffs).
 * @param {object} kosten – result of berechneJahreskosten
 * @param {string[]} enabled – tariff IDs to consider, e.g. ['A','B','B1']
 */
export function besteTarif(kosten, enabled = ['A', 'B', 'B1', 'B2', 'B3']) {
  if (!kosten) return null;
  let best = null;
  let min  = Infinity;
  for (const id of enabled) {
    if (kosten[id] && kosten[id].kosten < min) {
      min  = kosten[id].kosten;
      best = id;
    }
  }
  return best;
}

/**
 * Determines the appropriate load profile key based on form answers.
 * H25 = no PV, P25 = PV without battery, S25 = PV + battery
 */
export function getLastprofilKey(fd) {
  if (fd.pv_anlage === 'ja' && fd.speicher === 'ja') return 'S25';
  if (fd.pv_anlage === 'ja') return 'P25';
  return 'H25';
}
