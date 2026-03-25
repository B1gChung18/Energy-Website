/**
 * Simplified EPEX SPOT hourly price profile (€/kWh)
 * Placeholder — typical German day-ahead profile shape.
 * Index = hour of day (0 = 0:00–0:59, 17 = 17:00–17:59, …)
 * Source: BeING Inside 2026 / EPEX SPOT DE Day-Ahead reference shape
 */
export const HOURLY_EPEX = [
  0.065, // 0 Uhr
  0.060, // 1 Uhr
  0.055, // 2 Uhr
  0.052, // 3 Uhr
  0.050, // 4 Uhr — günstigstes Fenster
  0.058, // 5 Uhr
  0.072, // 6 Uhr
  0.085, // 7 Uhr
  0.092, // 8 Uhr
  0.090, // 9 Uhr
  0.088, // 10 Uhr
  0.085, // 11 Uhr
  0.082, // 12 Uhr (Mittagstief PV)
  0.078, // 13 Uhr
  0.083, // 14 Uhr
  0.088, // 15 Uhr
  0.093, // 16 Uhr
  0.095, // 17 Uhr — Abendspitze
  0.093, // 18 Uhr
  0.088, // 19 Uhr
  0.080, // 20 Uhr
  0.073, // 21 Uhr
  0.068, // 22 Uhr
  0.065, // 23 Uhr
];

/** kWh consumed per 15-minute charging interval */
export const KWH_PER_INTERVAL = 0.575;

/**
 * Average EPEX price over a charging window (handles midnight wrap).
 * @param {number} startHour  – 0–23
 * @param {number} durationH  – hours
 */
export function avgEpexPrice(startHour, durationH) {
  const hours = Math.max(1, Math.round(durationH));
  let sum = 0;
  for (let i = 0; i < hours; i++) {
    sum += HOURLY_EPEX[(startHour + i) % 24];
  }
  return sum / hours;
}

/**
 * Total consumption for a charging session.
 * @param {number} durationH – hours
 */
export function chargingKwh(durationH) {
  return Math.round(durationH * 4 * KWH_PER_INTERVAL * 100) / 100;
  // durationH × 4 intervals/h × 0.575 kWh/interval
}

/**
 * Find the cheapest starting hour for a given duration.
 * Returns { hour, avgPrice, cost }.
 */
export function findOptimalStart(durationH) {
  let bestHour  = 0;
  let bestPrice = Infinity;
  for (let h = 0; h < 24; h++) {
    const price = avgEpexPrice(h, durationH);
    if (price < bestPrice) { bestPrice = price; bestHour = h; }
  }
  const kwh  = chargingKwh(durationH);
  return { hour: bestHour, avgPrice: bestPrice, cost: bestPrice * kwh };
}
