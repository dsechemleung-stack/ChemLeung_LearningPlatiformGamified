// ============================================================
// Random Number Utilities — aligned with HKDSE curriculum ranges
// ============================================================

/** Integer in [min, max] inclusive */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Float in [min, max] rounded to `decimals` decimal places */
export function randFloat(min, max, decimals = 2) {
  const raw = Math.random() * (max - min) + min;
  const factor = Math.pow(10, decimals);
  return Math.round(raw * factor) / factor;
}

/** Value snapped to nearest increment, within [min, max] */
export function randIncrement(min, max, increment) {
  const steps = Math.floor((max - min) / increment);
  const n = randInt(0, steps);
  const val = min + n * increment;
  // Round to avoid floating point issues
  const decimals = increment.toString().includes('.') ? increment.toString().split('.')[1].length : 0;
  return parseFloat(val.toFixed(decimals));
}

/** Pick a random element from an array */
export function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick multiple unique items from array */
export function randChoiceN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ============================================================
// Curriculum-Specific Ranges (HKDSE Problem Generator)
// ============================================================

/** Titre volume: 10.0 – 45.0 cm³, 0.5 increments */
export function randTitre() {
  return randIncrement(10.0, 45.0, 0.5);
}

/** Aliquot volume: 10.0 – 50.0 cm³, 0.5 increments */
export function randAliquot() {
  return randIncrement(10.0, 50.0, 0.5);
}

/** Flask volume: 100, 150, 200, 250, 500 cm³ */
export function randFlask() {
  return randChoice([100, 150, 200, 250, 500]);
}

/** Standard concentration: 0.05 – 1.50 mol/dm³, 2 dp */
export function randConc(min = 0.05, max = 1.50) {
  return randFloat(min, max, 2);
}

/** Mass of solid sample: 0.50 – 8.00 g, 2 dp */
export function randMass(min = 0.50, max = 8.00) {
  return randFloat(min, max, 2);
}

/** Volume of acid/base added: 20 – 100 cm³, 5 increments */
export function randVolExcess() {
  return randIncrement(20, 100, 5);
}

/** Gas volume: 20 – 500 cm³ */
export function randGasVol() {
  return randIncrement(20, 500, 10);
}

/** Temperature: initial 15.0 – 25.0 °C */
export function randTempInitial() {
  return randFloat(15.0, 25.0, 1);
}

/** Temperature rise: 2.0 – 25.0 °C */
export function randTempRise() {
  return randFloat(2.0, 25.0, 1);
}

/** Volume of water in calorimetry: 50, 100, 150, 200, 250 cm³ */
export function randWaterVol() {
  return randChoice([50, 100, 150, 200, 250]);
}

// ============================================================
// Number Formatting
// ============================================================

/** Format to n significant figures */
export function sf(n, digits = 4) {
  if (n === 0) return '0';
  if (!isFinite(n)) return 'N/A';
  return parseFloat(n.toPrecision(digits));
}

/** Format to n significant figures as string */
export function sfStr(n, digits = 3) {
  if (n === 0) return '0';
  if (!isFinite(n)) return 'N/A';
  return parseFloat(n.toPrecision(digits)).toString();
}

/** Format to fixed decimal places */
export function fix(n, decimals = 4) {
  return parseFloat(n.toFixed(decimals));
}

/** Display: "23.5 cm³ = 0.0235 dm³" */
export function cmToDm(vol_cm3) {
  return `${vol_cm3} cm³ = ${sf(vol_cm3 / 1000, 4)} dm³`;
}

/** Express moles calculation: "0.150 × 0.0235 = 0.003525 mol" */
export function molesCalc(conc, vol_dm3) {
  const moles = conc * vol_dm3;
  return { moles, display: `${conc} × ${sf(vol_dm3, 4)} = ${sf(moles, 4)} mol` };
}
