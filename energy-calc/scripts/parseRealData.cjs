/**
 * Parses real source data files and generates:
 *   - public/data/spotpreise_2025_8760.json   (real EPEX, Oct-Dec filled with monthly mean)
 *   - public/data/lastprofile_8760.json        (real BDEW H25 / P25 / S25, 8760 hourly values)
 *
 * BDEW format: 96 quarter-hours × 36 columns (12 months × 3 day types: SA FT WT)
 * Reconstruction: map each hour of 2025 → (month, dayType) → sum 4 quarter-hours
 *
 * Run: node scripts/parseRealData.cjs
 */

const fs   = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const SRC = path.join(__dirname, '..', 'source-data');
const OUT = path.join(__dirname, '..', 'public', 'data');
fs.mkdirSync(OUT, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// 1. EPEX spot prices (CSV → 8760 €/kWh, missing months filled with monthly mean)
// ─────────────────────────────────────────────────────────────────────────────

const epexFile = path.join(SRC,
  'energy-charts_Stromproduktion_und_Börsenstrompreise_in_Deutschland_2025.csv');
const lines = fs.readFileSync(epexFile, 'utf8')
  .split('\n')
  .filter(l => l.startsWith('2025'));

const epexParsed = lines.map(line => {
  const comma = line.indexOf(',');
  const iso   = line.substring(0, comma).trim();
  const raw   = line.substring(comma + 1).trim();
  const eurMwh = raw !== '' ? parseFloat(raw) : null;
  return { iso, eurMwh };
});

console.log(`EPEX rows: ${epexParsed.length}, with price: ${epexParsed.filter(r => r.eurMwh !== null).length}`);

// €/kWh, floor negative prices at 0
const withPrice = epexParsed.map(r => ({
  ...r,
  eurkwh: r.eurMwh !== null ? Math.max(0, r.eurMwh / 1000) : null,
}));

// Compute monthly means for gap-filling (Oct-Dec missing)
const mSum = new Array(12).fill(0), mCount = new Array(12).fill(0);
for (const r of withPrice) {
  if (r.eurkwh === null) continue;
  const m = parseInt(r.iso.substring(5, 7)) - 1;
  mSum[m] += r.eurkwh; mCount[m]++;
}
const mMean = mSum.map((s, i) => mCount[i] > 0 ? s / mCount[i] : null);
const overall = mMean.filter(Boolean).reduce((s, v, _, a) => s + v / a.length, 0);

console.log('Monthly means (€/kWh):');
mMean.forEach((v, i) => console.log(`  ${String(i+1).padStart(2)}: ${v ? v.toFixed(5) : 'MISSING (filled with '+overall.toFixed(5)+')'}`));

const spot8760 = withPrice.map(r => {
  if (r.eurkwh !== null) return Math.round(r.eurkwh * 100000) / 100000;
  const m = parseInt(r.iso.substring(5, 7)) - 1;
  return Math.round((mMean[m] ?? overall) * 100000) / 100000;
});

if (spot8760.length !== 8760) { console.error('ERROR: wrong count', spot8760.length); process.exit(1); }
console.log(`Final spot mean: ${(spot8760.reduce((s,v)=>s+v,0)/8760).toFixed(5)} €/kWh`);

fs.writeFileSync(path.join(OUT, 'spotpreise_2025_8760.json'), JSON.stringify(spot8760));
console.log('✓ spotpreise_2025_8760.json\n');

// ─────────────────────────────────────────────────────────────────────────────
// 2. BDEW load profiles → 8760 hourly kWh
// ─────────────────────────────────────────────────────────────────────────────

// German public holidays 2025 (Sachsen, format: 'YYYY-MM-DD')
const FEIERTAGE_2025 = new Set([
  '2025-01-01','2025-04-18','2025-04-21','2025-05-01','2025-05-29',
  '2025-06-09','2025-06-19','2025-10-03','2025-10-31','2025-11-19',
  '2025-12-25','2025-12-26',
]);

function dayTypeOf(dateStr) {
  // dateStr: 'YYYY-MM-DD'
  if (FEIERTAGE_2025.has(dateStr)) return 'FT';
  const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay(); // 0=Sun,6=Sat
  if (dow === 0) return 'FT'; // Sunday
  if (dow === 6) return 'SA';
  return 'WT';
}

// Column layout: col 2 = Jan-SA, col 3 = Jan-FT, col 4 = Jan-WT,
//                col 5 = Feb-SA, col 6 = Feb-FT, col 7 = Feb-WT, ...
// month (0-11) → col offset for SA = 2 + month*3
function colIdx(month0, dayType) {
  const base = 2 + month0 * 3;
  if (dayType === 'SA') return base;
  if (dayType === 'FT') return base + 1;
  return base + 2; // WT
}

function buildProfile(sheetName) {
  const ws   = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // rows 4–99 = 96 quarter-hours (index 0–95)
  const qhRows = data.slice(4, 100); // 96 rows

  const hourly = [];

  // Iterate through every hour of 2025 (not a leap year = 8760 h)
  const start = new Date('2025-01-01T00:00:00Z');
  for (let h = 0; h < 8760; h++) {
    const d    = new Date(start.getTime() + h * 3600000);
    const dateStr = d.toISOString().substring(0, 10);
    const month0  = d.getUTCMonth();
    const dt      = dayTypeOf(dateStr);
    const col     = colIdx(month0, dt);

    // hour-of-day * 4 = first quarter-hour row index for this hour
    const hourOfDay = d.getUTCHours();
    let sum = 0;
    for (let q = 0; q < 4; q++) {
      const row = qhRows[hourOfDay * 4 + q];
      const v   = row ? row[col] : 0;
      sum += (typeof v === 'number' && isFinite(v)) ? v : 0;
    }
    hourly.push(Math.round(sum * 1000) / 1000);
  }

  const annual = hourly.reduce((s,v)=>s+v, 0);
  console.log(`  ${sheetName}: annual sum = ${Math.round(annual).toLocaleString()} (normalised to 1M kWh)`);
  return hourly;
}

const wb = xlsx.readFile(path.join(SRC,
  'Kopie_von_Repräsentative_Profile_BDEW_H25_G25_L25_P25_S25_Veröffentlichung.xlsx'));

console.log('Building BDEW profiles…');
const H25 = buildProfile('H25');
const P25 = buildProfile('P25');
const S25 = buildProfile('S25');

if (H25.length !== 8760 || P25.length !== 8760 || S25.length !== 8760) {
  console.error('ERROR: profile length mismatch'); process.exit(1);
}

fs.writeFileSync(path.join(OUT, 'lastprofile_8760.json'), JSON.stringify({ H25, P25, S25 }));
console.log('✓ lastprofile_8760.json');
console.log('\nDone. Real data is now in public/data/');
