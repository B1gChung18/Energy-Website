/**
 * Generates synthetic placeholder JSON files for:
 *   - spotpreise_2025_8760.json   (EPEX SPOT €/kWh, 8760 values, mean ≈ 0.08933)
 *   - lastprofile_8760.json       (H25 / P25 / S25 normalized load profiles, 8760 values each)
 *
 * Run once: node scripts/generateData.js
 */

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'data');
fs.mkdirSync(OUT, { recursive: true });

// ── helpers ────────────────────────────────────────────────────────────────

function mod(a, b) { return ((a % b) + b) % b; }

// 24-h EPEX shape (index = hour, arbitrary units; will be scaled)
const SHAPE_24 = [
  0.065, 0.060, 0.055, 0.052, 0.050, 0.058,
  0.072, 0.085, 0.092, 0.090, 0.088, 0.085,
  0.082, 0.078, 0.083, 0.088, 0.093, 0.095,
  0.093, 0.088, 0.080, 0.073, 0.068, 0.065,
];

// Monthly seasonal price multipliers (Jan-Dec)
const MONTHLY_PRICE = [1.25, 1.20, 1.10, 1.00, 0.90, 0.80,
                        0.78, 0.80, 0.90, 1.00, 1.15, 1.30];

// Days per month 2025 (non-leap)
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// ── spot prices ────────────────────────────────────────────────────────────
// Target mean = 0.08933 €/kWh

const TARGET_MEAN = 0.08933;

// Build raw 8760 values using SHAPE_24 × seasonal multiplier
const rawSpot = [];
for (let m = 0; m < 12; m++) {
  for (let d = 0; d < DAYS[m]; d++) {
    for (let h = 0; h < 24; h++) {
      rawSpot.push(SHAPE_24[h] * MONTHLY_PRICE[m]);
    }
  }
}

// Scale so mean matches target
const rawMean = rawSpot.reduce((s, v) => s + v, 0) / rawSpot.length;
const scale   = TARGET_MEAN / rawMean;
const spotData = rawSpot.map(v => Math.round(v * scale * 100000) / 100000);

fs.writeFileSync(
  path.join(OUT, 'spotpreise_2025_8760.json'),
  JSON.stringify(spotData)
);
console.log('spotpreise_2025_8760.json written,',
  'mean =', (spotData.reduce((s,v)=>s+v,0)/spotData.length).toFixed(5));

// ── load profiles ──────────────────────────────────────────────────────────
// Annual sums per million (kWh): H25=1 003 681, P25=948 994, S25=887 009

const TARGET = { H25: 1003681, P25: 948994, S25: 887009 };

// Household 24-h shape (normalized, arbitrary units)
const HH_24 = [
  0.25, 0.22, 0.20, 0.20, 0.22, 0.30,
  0.55, 0.80, 0.90, 0.82, 0.75, 0.78,
  0.85, 0.80, 0.72, 0.70, 0.78, 1.00,
  0.95, 0.88, 0.75, 0.65, 0.50, 0.35,
];

// Monthly load multipliers per profile (seasonal patterns differ)
// H25: high winter, medium summer
const H25_MONTHLY = [1.30,1.25,1.10,0.95,0.85,0.78,0.75,0.76,0.83,0.95,1.10,1.30];
// P25: slightly lower in summer (PV self-consumption reduces apparent load)
const P25_MONTHLY = [1.25,1.20,1.05,0.90,0.80,0.73,0.70,0.71,0.78,0.90,1.05,1.25];
// S25: even lower (battery shifts more load)
const S25_MONTHLY = [1.18,1.13,0.99,0.85,0.76,0.68,0.65,0.66,0.73,0.85,0.99,1.18];

function buildProfile(monthlyMult, targetAnnual) {
  const raw = [];
  for (let m = 0; m < 12; m++) {
    for (let d = 0; d < DAYS[m]; d++) {
      for (let h = 0; h < 24; h++) {
        raw.push(HH_24[h] * monthlyMult[m]);
      }
    }
  }
  const rawSum = raw.reduce((s, v) => s + v, 0);
  const sc = targetAnnual / rawSum;
  return raw.map(v => Math.round(v * sc * 1000) / 1000);
}

const H25 = buildProfile(H25_MONTHLY, TARGET.H25);
const P25 = buildProfile(P25_MONTHLY, TARGET.P25);
const S25 = buildProfile(S25_MONTHLY, TARGET.S25);

const lpData = { H25, P25, S25 };
fs.writeFileSync(
  path.join(OUT, 'lastprofile_8760.json'),
  JSON.stringify(lpData)
);

for (const [k, arr] of Object.entries(lpData)) {
  const sum = arr.reduce((s,v)=>s+v,0);
  console.log(`${k}: annual sum = ${Math.round(sum).toLocaleString()}`);
}

console.log('Done.');
