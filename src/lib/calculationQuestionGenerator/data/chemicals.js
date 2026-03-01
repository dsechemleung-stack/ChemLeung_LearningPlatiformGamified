// ============================================================
// HKDSE Chemistry Curriculum Data
// All chemicals, RAMs, reactions, and rules from the official syllabus
// ============================================================

// --- RELATIVE ATOMIC MASSES (HKDSE convention) ---
export const RAM = {
  H: 1.0, C: 12.0, N: 14.0, O: 16.0,
  Na: 23.0, Mg: 24.3, Al: 27.0, Si: 28.1, P: 31.0,
  S: 32.1, Cl: 35.5, K: 39.1, Ca: 40.1,
  Cr: 52.0, Mn: 55.0, Fe: 55.8, Cu: 63.5,
  Zn: 65.4, Br: 80.0, Ag: 108, Sn: 119,
  I: 127, Ba: 137, Pb: 207,
};

// Helper: calculate molar mass from atom count map
export function M(atomMap) {
  return Object.entries(atomMap).reduce((s, [el, n]) => s + RAM[el] * n, 0);
}

// --- MOLAR MASSES of common species ---
export const MM = {
  // Acids
  HCl: M({ H: 1, Cl: 1 }),           // 36.5
  HNO3: M({ H: 1, N: 1, O: 3 }),      // 63.0
  H2SO4: M({ H: 2, S: 1, O: 4 }),     // 98.1
  CH3COOH: M({ C: 2, H: 4, O: 2 }),   // 60.0

  // Bases
  NaOH: M({ Na: 1, O: 1, H: 1 }),     // 40.0
  KOH: M({ K: 1, O: 1, H: 1 }),       // 56.1
  CaOH2: M({ Ca: 1, O: 2, H: 2 }),    // 74.1
  NH3: M({ N: 1, H: 3 }),              // 17.0
  MgOH2: M({ Mg: 1, O: 2, H: 2 }),   // 58.3
  CuO: M({ Cu: 1, O: 1 }),            // 79.5
  MgO: M({ Mg: 1, O: 1 }),            // 40.3
  CaCO3: M({ Ca: 1, C: 1, O: 3 }),   // 100.1

  // Salts
  NaCl: M({ Na: 1, Cl: 1 }),          // 58.5
  KCl: M({ K: 1, Cl: 1 }),            // 74.6
  CaCl2: M({ Ca: 1, Cl: 2 }),         // 111.1
  NH4Cl: M({ N: 1, H: 4, Cl: 1 }),   // 53.5
  NaNO3: M({ Na: 1, N: 1, O: 3 }),   // 85.0
  KNO3: M({ K: 1, N: 1, O: 3 }),     // 101.1
  CaNO32: M({ Ca: 1, N: 2, O: 6 }), // 164.1
  NH4NO3: M({ N: 2, H: 4, O: 3 }),   // 80.0
  Na2SO4: M({ Na: 2, S: 1, O: 4 }),  // 142.1
  K2SO4: M({ K: 2, S: 1, O: 4 }),    // 174.3
  CaSO4: M({ Ca: 1, S: 1, O: 4 }),   // 136.2
  NH42SO4: M({ N: 2, H: 8, S: 1, O: 4 }), // 132.1
  CH3COONa: M({ C: 2, H: 3, O: 2, Na: 1 }), // 82.0
  CH3COOK: M({ C: 2, H: 3, O: 2, K: 1 }),   // 98.1
  ZnSO4: M({ Zn: 1, S: 1, O: 4 }),    // 161.5
  FeSO4: M({ Fe: 1, S: 1, O: 4 }),    // 151.9
  CuSO4: M({ Cu: 1, S: 1, O: 4 }),    // 159.6
  MgSO4: M({ Mg: 1, S: 1, O: 4 }),    // 120.4
  ZnCl2: M({ Zn: 1, Cl: 2 }),          // 136.4
  FeCl2: M({ Fe: 1, Cl: 2 }),          // 126.8
  MgCl2: M({ Mg: 1, Cl: 2 }),          // 95.3
  Na2CO3: M({ Na: 2, C: 1, O: 3 }),   // 106.0
  Na2CO3_H2O: M({ Na: 2, C: 1, O: 3 }) + M({ H: 2, O: 1 }), // +18 per x

  // Metals
  Mg: RAM.Mg, Zn: RAM.Zn, Fe: RAM.Fe, Cu: RAM.Cu,
  Al: RAM.Al, Na: RAM.Na, Ca: RAM.Ca, Ag: RAM.Ag, Pb: RAM.Pb,

  // Metal oxides (from displacement)
  MgO: M({ Mg: 1, O: 1 }),
  ZnO: M({ Zn: 1, O: 1 }),
  Fe3O4: M({ Fe: 3, O: 4 }),

  // Precipitates
  AgCl: M({ Ag: 1, Cl: 1 }),          // 143.5
  AgBr: M({ Ag: 1, Br: 1 }),          // 188.0
  AgI: M({ Ag: 1, I: 1 }),            // 235.0
  PbBr2: M({ Pb: 1, Br: 2 }),         // 367.0
  PbI2: M({ Pb: 1, I: 2 }),           // 461.0
  PbSO4: M({ Pb: 1, S: 1, O: 4 }),   // 303.3
  BaSO4: M({ Ba: 1, S: 1, O: 4 }),   // 233.4
  CuCO3: M({ Cu: 1, C: 1, O: 3 }),   // 123.5
  CuOH2: M({ Cu: 1, O: 2, H: 2 }),  // 97.5
  FeOH3: M({ Fe: 1, O: 3, H: 3 }),  // 106.8
  FeOH2: M({ Fe: 1, O: 2, H: 2 }),  // 89.8
  MgOH2: M({ Mg: 1, O: 2, H: 2 }),  // 58.3

  // Combustion products
  CO2: M({ C: 1, O: 2 }),             // 44.0
  H2O: M({ H: 2, O: 1 }),             // 18.0

  // Fuels
  CH4: M({ C: 1, H: 4 }),             // 16.0
  C2H6: M({ C: 2, H: 6 }),            // 30.0
  C3H8: M({ C: 3, H: 8 }),            // 44.0
  C4H10: M({ C: 4, H: 10 }),          // 58.0
  C8H18: M({ C: 8, H: 18 }),          // 114.0
  C2H5OH: M({ C: 2, H: 6, O: 1 }),   // 46.0
  CH3OH: M({ C: 1, H: 4, O: 1 }),    // 32.0

  // Redox reagents
  KMnO4: M({ K: 1, Mn: 1, O: 4 }),   // 158.1
  K2Cr2O7: M({ K: 2, Cr: 2, O: 7 }), // 294.2
  FeSO4_7H2O: M({ Fe: 1, S: 1, O: 4 }) + 7 * M({ H: 2, O: 1 }), // 278.0 approx
  Na2C2O4: M({ Na: 2, C: 2, O: 4 }),  // 134.0 (sodium oxalate)
  H2C2O4: M({ H: 2, C: 2, O: 4 }),   // 90.0 (oxalic acid)

  // Decomposition compounds
  CuCO3_: M({ Cu: 1, C: 1, O: 3 }),  // 123.5
  ZnCO3: M({ Zn: 1, C: 1, O: 3 }),   // 125.4
  NaHCO3: M({ Na: 1, H: 1, C: 1, O: 3 }), // 84.0
  PbNO32: M({ Pb: 1, N: 2, O: 6 }), // 331.2
};

// Round to certain significant figures
export function sf(n, digits = 4) {
  if (n === 0) return '0';
  if (!isFinite(n)) return 'ERROR';
  return parseFloat(n.toPrecision(digits));
}

export function fmt(n, digits = 4) {
  return sf(n, digits).toString();
}

// ============================================================
// ACID-BASE PAIR DATA (curriculum-aligned, chemically feasible)
// ============================================================

export const ACID_BASE_PAIRS = [
  // STRONG ACID + STRONG BASE
  {
    id: 'HCl_NaOH',
    acidFormula: 'HCl', acidName: 'hydrochloric acid', acidStrong: true,
    baseFormula: 'NaOH', baseName: 'sodium hydroxide', baseStrong: true,
    acidRatio: 1, baseRatio: 1,
    saltFormula: 'NaCl', saltName: 'sodium chloride',
    M_acid: MM.HCl, M_base: MM.NaOH, M_salt: MM.NaCl,
    equation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)',
    ionicEq: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    ramElems: 'H = 1.0, O = 16.0, Na = 23.0, Cl = 35.5',
    indicatorOptions: ['methyl orange', 'phenolphthalein'],
  },
  {
    id: 'HCl_KOH',
    acidFormula: 'HCl', acidName: 'hydrochloric acid', acidStrong: true,
    baseFormula: 'KOH', baseName: 'potassium hydroxide', baseStrong: true,
    acidRatio: 1, baseRatio: 1,
    saltFormula: 'KCl', saltName: 'potassium chloride',
    M_acid: MM.HCl, M_base: MM.KOH, M_salt: MM.KCl,
    equation: 'HCl(aq) + KOH(aq) → KCl(aq) + H₂O(l)',
    ionicEq: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    ramElems: 'H = 1.0, O = 16.0, K = 39.1, Cl = 35.5',
    indicatorOptions: ['methyl orange', 'phenolphthalein'],
  },
  {
    id: 'HCl_CaOH2',
    acidFormula: 'HCl', acidName: 'hydrochloric acid', acidStrong: true,
    baseFormula: 'Ca(OH)₂', baseName: 'calcium hydroxide', baseStrong: true,
    acidRatio: 2, baseRatio: 1,
    saltFormula: 'CaCl₂', saltName: 'calcium chloride',
    M_acid: MM.HCl, M_base: MM.CaOH2, M_salt: MM.CaCl2,
    equation: '2HCl(aq) + Ca(OH)₂(aq) → CaCl₂(aq) + 2H₂O(l)',
    ionicEq: '2H⁺(aq) + 2OH⁻(aq) → 2H₂O(l)',
    ramElems: 'H = 1.0, O = 16.0, Ca = 40.1, Cl = 35.5',
    indicatorOptions: ['methyl orange', 'phenolphthalein'],
  },
  {
    id: 'HNO3_NaOH',
    acidFormula: 'HNO₃', acidName: 'nitric acid', acidStrong: true,
    baseFormula: 'NaOH', baseName: 'sodium hydroxide', baseStrong: true,
    acidRatio: 1, baseRatio: 1,
    saltFormula: 'NaNO₃', saltName: 'sodium nitrate',
    M_acid: MM.HNO3, M_base: MM.NaOH, M_salt: MM.NaNO3,
    equation: 'HNO₃(aq) + NaOH(aq) → NaNO₃(aq) + H₂O(l)',
    ionicEq: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    ramElems: 'H = 1.0, N = 14.0, O = 16.0, Na = 23.0',
    indicatorOptions: ['methyl orange', 'phenolphthalein'],
  },
  {
    id: 'HNO3_KOH',
    acidFormula: 'HNO₃', acidName: 'nitric acid', acidStrong: true,
    baseFormula: 'KOH', baseName: 'potassium hydroxide', baseStrong: true,
    acidRatio: 1, baseRatio: 1,
    saltFormula: 'KNO₃', saltName: 'potassium nitrate',
    M_acid: MM.HNO3, M_base: MM.KOH, M_salt: MM.KNO3,
    equation: 'HNO₃(aq) + KOH(aq) → KNO₃(aq) + H₂O(l)',
    ionicEq: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    ramElems: 'H = 1.0, N = 14.0, O = 16.0, K = 39.1',
    indicatorOptions: ['methyl orange', 'phenolphthalein'],
  },
  {
    id: 'H2SO4_NaOH',
    acidFormula: 'H₂SO₄', acidName: 'sulphuric acid', acidStrong: true,
    baseFormula: 'NaOH', baseName: 'sodium hydroxide', baseStrong: true,
    acidRatio: 1, baseRatio: 2,
    saltFormula: 'Na₂SO₄', saltName: 'sodium sulphate',
    M_acid: MM.H2SO4, M_base: MM.NaOH, M_salt: MM.Na2SO4,
    equation: 'H₂SO₄(aq) + 2NaOH(aq) → Na₂SO₄(aq) + 2H₂O(l)',
    ionicEq: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    ramElems: 'H = 1.0, O = 16.0, Na = 23.0, S = 32.1',
    indicatorOptions: ['methyl orange', 'phenolphthalein'],
  },
  {
    id: 'H2SO4_KOH',
    acidFormula: 'H₂SO₄', acidName: 'sulphuric acid', acidStrong: true,
    baseFormula: 'KOH', baseName: 'potassium hydroxide', baseStrong: true,
    acidRatio: 1, baseRatio: 2,
    saltFormula: 'K₂SO₄', saltName: 'potassium sulphate',
    M_acid: MM.H2SO4, M_base: MM.KOH, M_salt: MM.K2SO4,
    equation: 'H₂SO₄(aq) + 2KOH(aq) → K₂SO₄(aq) + 2H₂O(l)',
    ionicEq: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    ramElems: 'H = 1.0, O = 16.0, K = 39.1, S = 32.1',
    indicatorOptions: ['methyl orange', 'phenolphthalein'],
  },
  // STRONG ACID + WEAK BASE (NH3)
  {
    id: 'HCl_NH3',
    acidFormula: 'HCl', acidName: 'hydrochloric acid', acidStrong: true,
    baseFormula: 'NH₃', baseName: 'ammonia solution', baseStrong: false,
    acidRatio: 1, baseRatio: 1,
    saltFormula: 'NH₄Cl', saltName: 'ammonium chloride',
    M_acid: MM.HCl, M_base: MM.NH3, M_salt: MM.NH4Cl,
    equation: 'HCl(aq) + NH₃(aq) → NH₄Cl(aq)',
    ionicEq: 'H⁺(aq) + NH₃(aq) → NH₄⁺(aq)',
    ramElems: 'H = 1.0, N = 14.0, Cl = 35.5',
    indicatorOptions: ['methyl orange'],
  },
  {
    id: 'H2SO4_NH3',
    acidFormula: 'H₂SO₄', acidName: 'sulphuric acid', acidStrong: true,
    baseFormula: 'NH₃', baseName: 'ammonia solution', baseStrong: false,
    acidRatio: 1, baseRatio: 2,
    saltFormula: '(NH₄)₂SO₄', saltName: 'ammonium sulphate',
    M_acid: MM.H2SO4, M_base: MM.NH3, M_salt: MM.NH42SO4,
    equation: 'H₂SO₄(aq) + 2NH₃(aq) → (NH₄)₂SO₄(aq)',
    ionicEq: 'H⁺(aq) + NH₃(aq) → NH₄⁺(aq)',
    ramElems: 'H = 1.0, N = 14.0, O = 16.0, S = 32.1',
    indicatorOptions: ['methyl orange'],
  },
  // WEAK ACID + STRONG BASE
  {
    id: 'CH3COOH_NaOH',
    acidFormula: 'CH₃COOH', acidName: 'ethanoic acid', acidStrong: false,
    baseFormula: 'NaOH', baseName: 'sodium hydroxide', baseStrong: true,
    acidRatio: 1, baseRatio: 1,
    saltFormula: 'CH₃COONa', saltName: 'sodium ethanoate',
    M_acid: MM.CH3COOH, M_base: MM.NaOH, M_salt: MM.CH3COONa,
    equation: 'CH₃COOH(aq) + NaOH(aq) → CH₃COONa(aq) + H₂O(l)',
    ionicEq: 'CH₃COOH(aq) + OH⁻(aq) → CH₃COO⁻(aq) + H₂O(l)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0, Na = 23.0',
    indicatorOptions: ['phenolphthalein'],
  },
  {
    id: 'CH3COOH_KOH',
    acidFormula: 'CH₃COOH', acidName: 'ethanoic acid', acidStrong: false,
    baseFormula: 'KOH', baseName: 'potassium hydroxide', baseStrong: true,
    acidRatio: 1, baseRatio: 1,
    saltFormula: 'CH₃COOK', saltName: 'potassium ethanoate',
    M_acid: MM.CH3COOH, M_base: MM.KOH, M_salt: MM.CH3COOK,
    equation: 'CH₃COOH(aq) + KOH(aq) → CH₃COOK(aq) + H₂O(l)',
    ionicEq: 'CH₃COOH(aq) + OH⁻(aq) → CH₃COO⁻(aq) + H₂O(l)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0, K = 39.1',
    indicatorOptions: ['phenolphthalein'],
  },
];

// ============================================================
// METAL + ACID REACTION DATA
// ============================================================
export const METAL_ACID_REACTIONS = [
  {
    metal: 'Mg', metalName: 'magnesium', M_metal: RAM.Mg,
    acid: 'HCl', acidFormula: 'HCl', acidName: 'hydrochloric acid',
    saltFormula: 'MgCl₂', saltName: 'magnesium chloride', M_salt: MM.MgCl2,
    acidRatio: 2, metalRatio: 1, H2Ratio: 1,
    equation: 'Mg(s) + 2HCl(aq) → MgCl₂(aq) + H₂(g)',
    ramElems: 'H = 1.0, Mg = 24.3, Cl = 35.5',
  },
  {
    metal: 'Mg', metalName: 'magnesium', M_metal: RAM.Mg,
    acid: 'H2SO4', acidFormula: 'H₂SO₄', acidName: 'dilute sulphuric acid',
    saltFormula: 'MgSO₄', saltName: 'magnesium sulphate', M_salt: MM.MgSO4,
    acidRatio: 1, metalRatio: 1, H2Ratio: 1,
    equation: 'Mg(s) + H₂SO₄(aq) → MgSO₄(aq) + H₂(g)',
    ramElems: 'H = 1.0, O = 16.0, Mg = 24.3, S = 32.1',
  },
  {
    metal: 'Zn', metalName: 'zinc', M_metal: RAM.Zn,
    acid: 'HCl', acidFormula: 'HCl', acidName: 'hydrochloric acid',
    saltFormula: 'ZnCl₂', saltName: 'zinc chloride', M_salt: MM.ZnCl2,
    acidRatio: 2, metalRatio: 1, H2Ratio: 1,
    equation: 'Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g)',
    ramElems: 'H = 1.0, Cl = 35.5, Zn = 65.4',
  },
  {
    metal: 'Zn', metalName: 'zinc', M_metal: RAM.Zn,
    acid: 'H2SO4', acidFormula: 'H₂SO₄', acidName: 'dilute sulphuric acid',
    saltFormula: 'ZnSO₄', saltName: 'zinc sulphate', M_salt: MM.ZnSO4,
    acidRatio: 1, metalRatio: 1, H2Ratio: 1,
    equation: 'Zn(s) + H₂SO₄(aq) → ZnSO₄(aq) + H₂(g)',
    ramElems: 'H = 1.0, O = 16.0, S = 32.1, Zn = 65.4',
  },
  {
    metal: 'Fe', metalName: 'iron', M_metal: RAM.Fe,
    acid: 'HCl', acidFormula: 'HCl', acidName: 'hydrochloric acid',
    saltFormula: 'FeCl₂', saltName: 'iron(II) chloride', M_salt: MM.FeCl2,
    acidRatio: 2, metalRatio: 1, H2Ratio: 1,
    equation: 'Fe(s) + 2HCl(aq) → FeCl₂(aq) + H₂(g)',
    ramElems: 'H = 1.0, Cl = 35.5, Fe = 55.8',
  },
  {
    metal: 'Fe', metalName: 'iron', M_metal: RAM.Fe,
    acid: 'H2SO4', acidFormula: 'H₂SO₄', acidName: 'dilute sulphuric acid',
    saltFormula: 'FeSO₄', saltName: 'iron(II) sulphate', M_salt: MM.FeSO4,
    acidRatio: 1, metalRatio: 1, H2Ratio: 1,
    equation: 'Fe(s) + H₂SO₄(aq) → FeSO₄(aq) + H₂(g)',
    ramElems: 'H = 1.0, O = 16.0, S = 32.1, Fe = 55.8',
  },
];

// ============================================================
// METAL DISPLACEMENT REACTIONS (Reactivity series)
// ============================================================
export const DISPLACEMENT_REACTIONS = [
  {
    activeMetal: 'Zn', activeMetalName: 'zinc', M_active: RAM.Zn,
    ionSource: 'CuSO₄', ionName: 'copper(II) sulphate', ionFormula: 'Cu²⁺',
    displaced: 'Cu', displacedName: 'copper', M_displaced: RAM.Cu,
    activeRatio: 1, ionRatio: 1,
    equation: 'Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s)',
    ionicEq: 'Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)',
    colourChange: 'Blue colour of CuSO₄ solution fades; brown/reddish copper solid deposits on zinc.',
    massNote: '',
    ramElems: 'O = 16.0, S = 32.1, Cu = 63.5, Zn = 65.4',
  },
  {
    activeMetal: 'Fe', activeMetalName: 'iron', M_active: RAM.Fe,
    ionSource: 'CuSO₄', ionName: 'copper(II) sulphate', ionFormula: 'Cu²⁺',
    displaced: 'Cu', displacedName: 'copper', M_displaced: RAM.Cu,
    activeRatio: 1, ionRatio: 1,
    equation: 'Fe(s) + CuSO₄(aq) → FeSO₄(aq) + Cu(s)',
    ionicEq: 'Fe(s) + Cu²⁺(aq) → Fe²⁺(aq) + Cu(s)',
    colourChange: 'Blue solution turns pale green (Fe²⁺); brown copper deposits on iron.',
    massNote: '',
    ramElems: 'O = 16.0, S = 32.1, Fe = 55.8, Cu = 63.5',
  },
  {
    activeMetal: 'Mg', activeMetalName: 'magnesium', M_active: RAM.Mg,
    ionSource: 'CuSO₄', ionName: 'copper(II) sulphate', ionFormula: 'Cu²⁺',
    displaced: 'Cu', displacedName: 'copper', M_displaced: RAM.Cu,
    activeRatio: 1, ionRatio: 1,
    equation: 'Mg(s) + CuSO₄(aq) → MgSO₄(aq) + Cu(s)',
    ionicEq: 'Mg(s) + Cu²⁺(aq) → Mg²⁺(aq) + Cu(s)',
    colourChange: 'Blue solution decolourises; brown copper deposits on magnesium.',
    massNote: '',
    ramElems: 'O = 16.0, Mg = 24.3, S = 32.1, Cu = 63.5',
  },
  {
    activeMetal: 'Cu', activeMetalName: 'copper', M_active: RAM.Cu,
    ionSource: 'AgNO₃', ionName: 'silver nitrate', ionFormula: 'Ag⁺',
    displaced: 'Ag', displacedName: 'silver', M_displaced: RAM.Ag,
    activeRatio: 1, ionRatio: 2,
    equation: 'Cu(s) + 2AgNO₃(aq) → Cu(NO₃)₂(aq) + 2Ag(s)',
    ionicEq: 'Cu(s) + 2Ag⁺(aq) → Cu²⁺(aq) + 2Ag(s)',
    colourChange: 'Colourless solution turns blue (Cu²⁺); shiny silver crystals form.',
    massNote: '',
    ramElems: 'N = 14.0, O = 16.0, Cu = 63.5, Ag = 108',
  },
  {
    activeMetal: 'Zn', activeMetalName: 'zinc', M_active: RAM.Zn,
    ionSource: 'Pb(NO₃)₂', ionName: 'lead(II) nitrate', ionFormula: 'Pb²⁺',
    displaced: 'Pb', displacedName: 'lead', M_displaced: RAM.Pb,
    activeRatio: 1, ionRatio: 1,
    equation: 'Zn(s) + Pb(NO₃)₂(aq) → Zn(NO₃)₂(aq) + Pb(s)',
    ionicEq: 'Zn(s) + Pb²⁺(aq) → Zn²⁺(aq) + Pb(s)',
    colourChange: 'Colourless solution remains colourless; grey lead deposits on zinc.',
    massNote: '',
    ramElems: 'N = 14.0, O = 16.0, Zn = 65.4, Pb = 207',
  },
];

// ============================================================
// INSOLUBLE BASE BACK TITRATION DATA
// ============================================================
export const INSOLUBLE_BASES = [
  {
    formula: 'Mg(OH)₂', name: 'magnesium hydroxide', M: MM.MgOH2,
    context: 'antacid tablet',
    acidRatio: 2, baseRatio: 1,
    withHCl: {
      equation: 'Mg(OH)₂(s) + 2HCl(aq) → MgCl₂(aq) + 2H₂O(l)',
    },
    withH2SO4: null, // less common in HKDSE
    ramElems: 'H = 1.0, O = 16.0, Mg = 24.3, Cl = 35.5',
  },
  {
    formula: 'CaCO₃', name: 'calcium carbonate', M: MM.CaCO3,
    context: 'limestone sample',
    acidRatio: 2, baseRatio: 1,
    withHCl: {
      equation: 'CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + H₂O(l) + CO₂(g)',
    },
    ramElems: 'H = 1.0, C = 12.0, O = 16.0, Ca = 40.1, Cl = 35.5',
  },
  {
    formula: 'MgO', name: 'magnesium oxide', M: MM.MgO,
    context: 'antacid sample',
    acidRatio: 2, baseRatio: 1,
    withHCl: {
      equation: 'MgO(s) + 2HCl(aq) → MgCl₂(aq) + H₂O(l)',
    },
    ramElems: 'H = 1.0, O = 16.0, Mg = 24.3, Cl = 35.5',
    note: 'Ratio is 1:2 (MgO:HCl)',
  },
  {
    formula: 'CuO', name: 'copper(II) oxide', M: MM.CuO,
    context: 'sample',
    acidRatio: 2, baseRatio: 1,
    withHCl: {
      equation: 'CuO(s) + 2HCl(aq) → CuCl₂(aq) + H₂O(l)',
    },
    ramElems: 'H = 1.0, O = 16.0, Cu = 63.5, Cl = 35.5',
  },
];

// ============================================================
// PRECIPITATION REACTION DATA (Insoluble salts)
// ============================================================
export const PRECIPITATION_REACTIONS = [
  {
    cationSource: 'Pb(NO₃)₂', cationName: 'lead(II) nitrate', cationFormula: 'Pb²⁺',
    cationConc: null,
    anionSource: 'KI', anionName: 'potassium iodide', anionFormula: 'I⁻',
    precipitate: 'PbI₂', precipitateName: 'lead(II) iodide', precipitateColour: 'bright yellow',
    M_ppt: MM.PbI2, cationRatio: 1, anionRatio: 2,
    equation: 'Pb(NO₃)₂(aq) + 2KI(aq) → PbI₂(s) + 2KNO₃(aq)',
    ionicEq: 'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)',
    ramElems: 'N = 14.0, O = 16.0, K = 39.1, I = 127, Pb = 207',
  },
  {
    cationSource: 'AgNO₃', cationName: 'silver nitrate', cationFormula: 'Ag⁺',
    anionSource: 'NaCl', anionName: 'sodium chloride', anionFormula: 'Cl⁻',
    precipitate: 'AgCl', precipitateName: 'silver chloride', precipitateColour: 'white',
    M_ppt: MM.AgCl, cationRatio: 1, anionRatio: 1,
    equation: 'AgNO₃(aq) + NaCl(aq) → AgCl(s) + NaNO₃(aq)',
    ionicEq: 'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)',
    ramElems: 'N = 14.0, O = 16.0, Na = 23.0, Cl = 35.5, Ag = 108',
  },
  {
    cationSource: 'BaCl₂', cationName: 'barium chloride', cationFormula: 'Ba²⁺',
    anionSource: 'Na₂SO₄', anionName: 'sodium sulphate', anionFormula: 'SO₄²⁻',
    precipitate: 'BaSO₄', precipitateName: 'barium sulphate', precipitateColour: 'white',
    M_ppt: MM.BaSO4, cationRatio: 1, anionRatio: 1,
    equation: 'BaCl₂(aq) + Na₂SO₄(aq) → BaSO₄(s) + 2NaCl(aq)',
    ionicEq: 'Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)',
    ramElems: 'O = 16.0, Na = 23.0, S = 32.1, Cl = 35.5, Ba = 137',
  },
  {
    cationSource: 'Pb(NO₃)₂', cationName: 'lead(II) nitrate', cationFormula: 'Pb²⁺',
    anionSource: 'Na₂SO₄', anionName: 'sodium sulphate', anionFormula: 'SO₄²⁻',
    precipitate: 'PbSO₄', precipitateName: 'lead(II) sulphate', precipitateColour: 'white',
    M_ppt: MM.PbSO4, cationRatio: 1, anionRatio: 1,
    equation: 'Pb(NO₃)₂(aq) + Na₂SO₄(aq) → PbSO₄(s) + 2NaNO₃(aq)',
    ionicEq: 'Pb²⁺(aq) + SO₄²⁻(aq) → PbSO₄(s)',
    ramElems: 'N = 14.0, O = 16.0, Na = 23.0, S = 32.1, Pb = 207',
  },
  {
    cationSource: 'AgNO₃', cationName: 'silver nitrate', cationFormula: 'Ag⁺',
    anionSource: 'KBr', anionName: 'potassium bromide', anionFormula: 'Br⁻',
    precipitate: 'AgBr', precipitateName: 'silver bromide', precipitateColour: 'pale yellow',
    M_ppt: MM.AgBr, cationRatio: 1, anionRatio: 1,
    equation: 'AgNO₃(aq) + KBr(aq) → AgBr(s) + KNO₃(aq)',
    ionicEq: 'Ag⁺(aq) + Br⁻(aq) → AgBr(s)',
    ramElems: 'N = 14.0, O = 16.0, K = 39.1, Br = 80.0, Ag = 108',
  },
  {
    cationSource: 'Pb(NO₃)₂', cationName: 'lead(II) nitrate', cationFormula: 'Pb²⁺',
    anionSource: 'KBr', anionName: 'potassium bromide', anionFormula: 'Br⁻',
    precipitate: 'PbBr₂', precipitateName: 'lead(II) bromide', precipitateColour: 'white',
    M_ppt: MM.PbBr2, cationRatio: 1, anionRatio: 2,
    equation: 'Pb(NO₃)₂(aq) + 2KBr(aq) → PbBr₂(s) + 2KNO₃(aq)',
    ionicEq: 'Pb²⁺(aq) + 2Br⁻(aq) → PbBr₂(s)',
    ramElems: 'N = 14.0, O = 16.0, K = 39.1, Br = 80.0, Pb = 207',
  },
];

// ============================================================
// REDOX TITRATION DATA (Manganate & Dichromate)
// ============================================================
export const REDOX_SYSTEMS = [
  {
    oxidiser: 'KMnO₄', oxidiserName: 'acidified potassium manganate(VII)',
    reducerFormula: 'FeSO₄', reducerName: 'iron(II) sulphate', reducerIon: 'Fe²⁺',
    M_reducer: MM.FeSO4, M_reducerIon: RAM.Fe,
    // MnO4- + 8H+ + 5e- -> Mn2+ + 4H2O  | Fe2+ -> Fe3+ + e-
    oxidiserRatio: 1, reducerRatio: 5,
    equation: 'MnO₄⁻(aq) + 5Fe²⁺(aq) + 8H⁺(aq) → Mn²⁺(aq) + 5Fe³⁺(aq) + 4H₂O(l)',
    fullEquation: 'KMnO₄(aq) + 5FeSO₄(aq) + 8H₂SO₄(aq) → MnSO₄(aq) + ...',
    indicator: 'self-indicating (KMnO₄)',
    endpoint: 'permanent pale pink colour',
    colourChange: 'purple → colourless (one drop excess = pale pink)',
    ramElems: 'O = 16.0, S = 32.1, K = 39.1, Mn = 55.0, Fe = 55.8',
  },
  {
    oxidiser: 'KMnO₄', oxidiserName: 'acidified potassium manganate(VII)',
    reducerFormula: 'H₂C₂O₄', reducerName: 'ethanedioic acid (oxalic acid)', reducerIon: 'C₂O₄²⁻',
    M_reducer: MM.H2C2O4, M_reducerIon: null,
    // MnO4- + 8H+ + 5e- -> Mn2+ + 4H2O  | C2O42- -> 2CO2 + 2e-
    oxidiserRatio: 2, reducerRatio: 5,
    equation: '2MnO₄⁻(aq) + 5C₂O₄²⁻(aq) + 16H⁺(aq) → 2Mn²⁺(aq) + 10CO₂(g) + 8H₂O(l)',
    indicator: 'self-indicating (KMnO₄)',
    endpoint: 'permanent pale pink colour',
    colourChange: 'purple → colourless (one drop excess = pale pink)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0, K = 39.1, Mn = 55.0',
  },
  {
    oxidiser: 'K₂Cr₂O₇', oxidiserName: 'acidified potassium dichromate(VI)',
    reducerFormula: 'FeSO₄', reducerName: 'iron(II) sulphate', reducerIon: 'Fe²⁺',
    M_reducer: MM.FeSO4, M_reducerIon: RAM.Fe,
    // Cr2O72- + 14H+ + 6e- -> 2Cr3+ + 7H2O  | Fe2+ -> Fe3+ + e-
    oxidiserRatio: 1, reducerRatio: 6,
    equation: 'Cr₂O₇²⁻(aq) + 6Fe²⁺(aq) + 14H⁺(aq) → 2Cr³⁺(aq) + 6Fe³⁺(aq) + 7H₂O(l)',
    indicator: 'diphenylamine / self-indicating',
    endpoint: 'orange turns green',
    colourChange: 'orange → green',
    ramElems: 'O = 16.0, S = 32.1, K = 39.1, Cr = 52.0, Fe = 55.8',
  },
];

// ============================================================
// COMBUSTION / FUEL DATA
// ============================================================
export const FUELS = [
  {
    formula: 'CH₄', name: 'methane', M: MM.CH4,
    C: 1, H: 4, O_fuel: 0,
    O2needed: 2, // CH4 + 2O2 -> CO2 + 2H2O
    CO2produced: 1, H2Oprduced: 2,
    equation: 'CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(l)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0',
  },
  {
    formula: 'C₂H₆', name: 'ethane', M: MM.C2H6,
    C: 2, H: 6, O_fuel: 0,
    O2needed: 3.5, CO2produced: 2, H2Oprduced: 3,
    equation: 'C₂H₆(g) + 3.5O₂(g) → 2CO₂(g) + 3H₂O(l)',
    equationScaled: '2C₂H₆(g) + 7O₂(g) → 4CO₂(g) + 6H₂O(l)',
    equationDisplay: '2C₂H₆(g) + 7O₂(g) → 4CO₂(g) + 6H₂O(l)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0',
  },
  {
    formula: 'C₃H₈', name: 'propane', M: MM.C3H8,
    C: 3, H: 8, O_fuel: 0,
    O2needed: 5, CO2produced: 3, H2Oprduced: 4,
    equation: 'C₃H₈(g) + 5O₂(g) → 3CO₂(g) + 4H₂O(l)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0',
  },
  {
    formula: 'C₄H₁₀', name: 'butane', M: MM.C4H10,
    C: 4, H: 10, O_fuel: 0,
    O2needed: 6.5, CO2produced: 4, H2Oprduced: 5,
    equation: 'C₄H₁₀(g) + 6.5O₂(g) → 4CO₂(g) + 5H₂O(l)',
    equationScaled: '2C₄H₁₀(g) + 13O₂(g) → 8CO₂(g) + 10H₂O(l)',
    equationDisplay: '2C₄H₁₀(g) + 13O₂(g) → 8CO₂(g) + 10H₂O(l)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0',
  },
  {
    formula: 'C₂H₅OH', name: 'ethanol', M: MM.C2H5OH,
    C: 2, H: 6, O_fuel: 1,
    O2needed: 3, CO2produced: 2, H2Oprduced: 3,
    equation: 'C₂H₅OH(l) + 3O₂(g) → 2CO₂(g) + 3H₂O(l)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0',
  },
  {
    formula: 'CH₃OH', name: 'methanol', M: MM.CH3OH,
    C: 1, H: 4, O_fuel: 1,
    O2needed: 1.5, CO2produced: 1, H2Oprduced: 2,
    equation: 'CH₃OH(l) + 1.5O₂(g) → CO₂(g) + 2H₂O(l)',
    equationScaled: '2CH₃OH(l) + 3O₂(g) → 2CO₂(g) + 4H₂O(l)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0',
  },
];

// ============================================================
// THERMAL DECOMPOSITION DATA
// ============================================================
export const DECOMPOSITIONS = [
  {
    compound: 'CaCO₃', compoundName: 'calcium carbonate', M_compound: MM.CaCO3,
    solidProduct: 'CaO', solidProductName: 'calcium oxide', M_solid: M({ Ca: 1, O: 1 }),
    gasProduct: 'CO₂', M_gas: MM.CO2, gasMoles: 1, context: 'limestone / marble',
    equation: 'CaCO₃(s) → CaO(s) + CO₂(g)',
    compoundRatio: 1, solidRatio: 1, gasRatio: 1,
    observation: 'White solid residue; CO₂ gas produced (turns limewater milky)',
    ramElems: 'C = 12.0, O = 16.0, Ca = 40.1',
  },
  {
    compound: 'CuCO₃', compoundName: 'copper(II) carbonate', M_compound: MM.CuCO3,
    solidProduct: 'CuO', solidProductName: 'copper(II) oxide', M_solid: MM.CuO,
    gasProduct: 'CO₂', M_gas: MM.CO2, gasMoles: 1, context: 'green mineral',
    equation: 'CuCO₃(s) → CuO(s) + CO₂(g)',
    compoundRatio: 1, solidRatio: 1, gasRatio: 1,
    observation: 'Green CuCO₃ turns black (CuO); CO₂ gas produced',
    ramElems: 'C = 12.0, O = 16.0, Cu = 63.5',
  },
  {
    compound: 'ZnCO₃', compoundName: 'zinc carbonate', M_compound: MM.ZnCO3,
    solidProduct: 'ZnO', solidProductName: 'zinc oxide', M_solid: M({ Zn: 1, O: 1 }),
    gasProduct: 'CO₂', M_gas: MM.CO2, gasMoles: 1, context: 'mineral sample',
    equation: 'ZnCO₃(s) → ZnO(s) + CO₂(g)',
    compoundRatio: 1, solidRatio: 1, gasRatio: 1,
    observation: 'White ZnCO₃ → yellow ZnO when hot, white when cool; CO₂ produced',
    ramElems: 'C = 12.0, O = 16.0, Zn = 65.4',
  },
  {
    compound: 'NaHCO₃', compoundName: 'sodium hydrogencarbonate', M_compound: MM.NaHCO3,
    solidProduct: 'Na₂CO₃', solidProductName: 'sodium carbonate', M_solid: M({ Na: 2, C: 1, O: 3 }),
    gasProduct: 'CO₂', M_gas: MM.CO2, gasMoles: 1,
    waterProduct: true, M_water: MM.H2O, waterMoles: 1,
    context: 'baking soda',
    equation: '2NaHCO₃(s) → Na₂CO₃(s) + H₂O(g) + CO₂(g)',
    compoundRatio: 2, solidRatio: 1, gasRatio: 1,
    observation: 'White solid remains; CO₂ and water vapour produced',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0, Na = 23.0',
  },
];

// ============================================================
// INDICATOR DATA
// ============================================================
export const INDICATORS = {
  'methyl orange': {
    acidColour: 'red', alkaliColour: 'yellow',
    suitableFor: 'Strong acid / Strong or Weak alkali',
    endpointNote: 'Changes from yellow to red (or red to yellow at endpoint — orange)',
  },
  'phenolphthalein': {
    acidColour: 'colourless', alkaliColour: 'pink',
    suitableFor: 'Strong alkali / Strong or Weak acid',
    endpointNote: 'Changes from colourless to pink',
  },
};

// ============================================================
// ACID-METAL OXIDE REACTIONS (for salt prep Category C)
// ============================================================
export const ACID_OXIDE_REACTIONS = [
  {
    acid: 'HCl', acidName: 'hydrochloric acid', acidFormula: 'HCl',
    oxide: 'CuO', oxideName: 'copper(II) oxide', oxideFormula: 'CuO', M_oxide: MM.CuO,
    salt: 'CuCl₂', saltName: 'copper(II) chloride', M_salt: M({ Cu: 1, Cl: 2 }),
    acidRatio: 2, oxideRatio: 1,
    equation: 'CuO(s) + 2HCl(aq) → CuCl₂(aq) + H₂O(l)',
    observation: 'Black CuO dissolves; blue solution of CuCl₂ forms.',
    ramElems: 'H = 1.0, O = 16.0, Cl = 35.5, Cu = 63.5',
  },
  {
    acid: 'H2SO4', acidName: 'sulphuric acid', acidFormula: 'H₂SO₄',
    oxide: 'CuO', oxideName: 'copper(II) oxide', oxideFormula: 'CuO', M_oxide: MM.CuO,
    salt: 'CuSO₄', saltName: 'copper(II) sulphate', M_salt: MM.CuSO4,
    acidRatio: 1, oxideRatio: 1,
    equation: 'CuO(s) + H₂SO₄(aq) → CuSO₄(aq) + H₂O(l)',
    observation: 'Black CuO dissolves; blue solution of CuSO₄ forms.',
    ramElems: 'H = 1.0, O = 16.0, S = 32.1, Cu = 63.5',
  },
  {
    acid: 'HCl', acidName: 'hydrochloric acid', acidFormula: 'HCl',
    oxide: 'MgO', oxideName: 'magnesium oxide', oxideFormula: 'MgO', M_oxide: MM.MgO,
    salt: 'MgCl₂', saltName: 'magnesium chloride', M_salt: MM.MgCl2,
    acidRatio: 2, oxideRatio: 1,
    equation: 'MgO(s) + 2HCl(aq) → MgCl₂(aq) + H₂O(l)',
    observation: 'White MgO dissolves in excess acid to give colourless solution.',
    ramElems: 'H = 1.0, O = 16.0, Mg = 24.3, Cl = 35.5',
  },
  {
    acid: 'H2SO4', acidName: 'sulphuric acid', acidFormula: 'H₂SO₄',
    oxide: 'ZnO', oxideName: 'zinc oxide', oxideFormula: 'ZnO', M_oxide: M({ Zn: 1, O: 1 }),
    salt: 'ZnSO₄', saltName: 'zinc sulphate', M_salt: MM.ZnSO4,
    acidRatio: 1, oxideRatio: 1,
    equation: 'ZnO(s) + H₂SO₄(aq) → ZnSO₄(aq) + H₂O(l)',
    observation: 'White ZnO dissolves to give colourless ZnSO₄ solution.',
    ramElems: 'H = 1.0, O = 16.0, S = 32.1, Zn = 65.4',
  },
];

// ============================================================
// CARBONATE + ACID REACTIONS (for Category C3)
// ============================================================
export const CARBONATE_ACID_REACTIONS = [
  {
    carbonate: 'CaCO₃', carbonateName: 'calcium carbonate', M_carbonate: MM.CaCO3,
    acid: 'HCl', acidName: 'hydrochloric acid',
    acidRatio: 2, carbonateRatio: 1, CO2Ratio: 1,
    equation: 'CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + H₂O(l) + CO₂(g)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0, Ca = 40.1, Cl = 35.5',
  },
  {
    carbonate: 'Na₂CO₃', carbonateName: 'sodium carbonate', M_carbonate: M({ Na: 2, C: 1, O: 3 }),
    acid: 'HCl', acidName: 'hydrochloric acid',
    acidRatio: 2, carbonateRatio: 1, CO2Ratio: 1,
    equation: 'Na₂CO₃(s) + 2HCl(aq) → 2NaCl(aq) + H₂O(l) + CO₂(g)',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0, Na = 23.0, Cl = 35.5',
  },
  {
    carbonate: 'CaCO₃', carbonateName: 'calcium carbonate', M_carbonate: MM.CaCO3,
    acid: 'H₂SO₄', acidName: 'sulphuric acid',
    acidRatio: 1, carbonateRatio: 1, CO2Ratio: 1,
    equation: 'CaCO₃(s) + H₂SO₄(aq) → CaSO₄(s) + H₂O(l) + CO₂(g)',
    note: 'CaSO₄ is slightly soluble — reaction may slow due to coating.',
    ramElems: 'H = 1.0, C = 12.0, O = 16.0, S = 32.1, Ca = 40.1',
  },
];
