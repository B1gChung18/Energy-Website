// PV calculation data from spreadsheet "PV-Anlage_wirklich_final_(hoffentlich).xlsx"
// Fraunhofer / Dresden reference values

export const GLOBALSTRAHLUNG_DRESDEN = 1161; // kWh/m²/a  (Dresden Durchschnitt)
export const WIRKUNGSGRAD_PV         = 0.22; // 22 % (typisch Mono-Kristallin, Recherche 18–22 %)

// Monthly irradiance distribution for Dresden (Ertragskurve/Jahr, kWh/m²)
// Source: representative values from Kennwerttabelle (spreadsheet)
export const MONATLICHE_STRAHLUNG = {
  Januar:    37.73,
  Februar:   61.36,
  März:      95.09,
  April:     129.54,
  Mai:       144.16,
  Juni:      152.61,
  Juli:      146.44,
  August:    138.10,
  September: 107.49,
  Oktober:   74.60,
  November:  44.00,
  Dezember:  29.89,
  // Summe: 1161.00 kWh/m²/a
};

// Sonneneinstrahlung correction factors — Kennwerte lookup table
// Rows (0–18): Ausrichtung in 10° steps → 0° = Süd … 180° = Nord
// Cols (0–9) : Neigungswinkel in 10° steps → 0° = flach … 90° = senkrecht
// Confirmed data point from spreadsheet: f(Ausrichtung=0°, Neigung=30°) = 0.996
// All values at 0° Neigung (horizontal) equal 0.87 (orientation-independent)
// Source: averaged from multiple irradiance reference sources (Kennwerte sheet)
export const SONNENEINSTRAHLUNG_TABLE = [
  //  0°     10°    20°    30°    40°    50°    60°    70°    80°    90°
  [0.870, 0.920, 0.960, 0.996, 0.990, 0.970, 0.930, 0.870, 0.790, 0.680], // 0°  Süd
  [0.870, 0.920, 0.950, 0.985, 0.980, 0.960, 0.920, 0.860, 0.780, 0.670], // 10°
  [0.870, 0.910, 0.940, 0.970, 0.970, 0.940, 0.900, 0.840, 0.760, 0.650], // 20°
  [0.870, 0.900, 0.930, 0.951, 0.940, 0.920, 0.870, 0.810, 0.730, 0.620], // 30°
  [0.870, 0.890, 0.910, 0.930, 0.920, 0.890, 0.840, 0.780, 0.700, 0.590], // 40°
  [0.870, 0.880, 0.890, 0.905, 0.890, 0.860, 0.810, 0.740, 0.660, 0.560], // 50°
  [0.870, 0.870, 0.880, 0.880, 0.860, 0.830, 0.770, 0.710, 0.620, 0.520], // 60°
  [0.870, 0.860, 0.860, 0.855, 0.830, 0.790, 0.740, 0.670, 0.590, 0.490], // 70°
  [0.870, 0.850, 0.840, 0.830, 0.800, 0.760, 0.700, 0.630, 0.550, 0.460], // 80°
  [0.870, 0.840, 0.820, 0.805, 0.770, 0.730, 0.670, 0.600, 0.520, 0.420], // 90°
  [0.870, 0.830, 0.800, 0.780, 0.750, 0.700, 0.640, 0.570, 0.490, 0.400], // 100°
  [0.870, 0.820, 0.790, 0.760, 0.720, 0.680, 0.620, 0.550, 0.470, 0.380], // 110°
  [0.870, 0.810, 0.780, 0.745, 0.700, 0.650, 0.590, 0.520, 0.450, 0.360], // 120°
  [0.870, 0.810, 0.770, 0.730, 0.690, 0.630, 0.570, 0.500, 0.430, 0.340], // 130°
  [0.870, 0.800, 0.760, 0.718, 0.670, 0.620, 0.560, 0.490, 0.410, 0.330], // 140°
  [0.870, 0.800, 0.760, 0.710, 0.660, 0.610, 0.550, 0.480, 0.400, 0.320], // 150°
  [0.870, 0.790, 0.750, 0.705, 0.650, 0.600, 0.540, 0.470, 0.400, 0.320], // 160°
  [0.870, 0.790, 0.750, 0.700, 0.650, 0.600, 0.540, 0.470, 0.390, 0.310], // 170°
  [0.870, 0.790, 0.750, 0.698, 0.640, 0.590, 0.530, 0.460, 0.390, 0.310], // 180° Nord
];

/**
 * Look up the Sonneneinstrahlung correction factor.
 * @param {number} ausrichtung  – degrees from South (0 = Süd, 180 = Nord), step 10
 * @param {number} neigungswinkel – tilt angle 0–90°, step 10
 * @returns {number} correction factor
 */
export function getSonneneinstrahlung(ausrichtung, neigungswinkel) {
  const row = Math.round(ausrichtung / 10);       // 0–18
  const col = Math.round(neigungswinkel / 10);    // 0–9
  const r   = Math.min(18, Math.max(0, row));
  const c   = Math.min(9,  Math.max(0, col));
  return SONNENEINSTRAHLUNG_TABLE[r][c];
}

/**
 * Estimate annual PV yield (complex formula from spreadsheet).
 * E_PV = G × A × η × f(α, β)
 * @param {number} modulfläche      – m²
 * @param {number} ausrichtung      – ° from South (0–180)
 * @param {number} neigungswinkel   – tilt ° (0–90)
 * @returns {number} kWh/Jahr
 */
export function calcPvErtrag(modulfläche, ausrichtung, neigungswinkel) {
  if (modulfläche <= 0) return 0;
  const f = getSonneneinstrahlung(ausrichtung, neigungswinkel);
  return GLOBALSTRAHLUNG_DRESDEN * modulfläche * WIRKUNGSGRAD_PV * f;
}

/**
 * Simplified formula from spreadsheet (Vereinfacht section):
 * E_PV_simplified = A × 1200 × 20% × 90%
 * Assumes G=1200 kWh/m²/a, η=20%, Winkelertrag=90%
 */
export function calcPvErtragSimplified(modulfläche) {
  return modulfläche * 1200 * 0.20 * 0.90;
}
