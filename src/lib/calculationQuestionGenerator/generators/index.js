// ============================================================
// Generator Registry — All HKDSE Chemistry Problem Types
// ============================================================

import { generateA1, generateA3, generateA5, generateA6 } from './generatorA.js';
import { generateB1, generateB2 } from './generatorB.js';
import { generateC1, generateC2, generateC3 } from './generatorC.js';
import { generateD1, generateE1, generateE2, generateF1, generateF2 } from './generatorDEF.js';
import {
  generateG1, generateG2,
  generateI1, generateI3,
  generateJ1, generateJ2,
  generateM1, generateM2,
} from './generatorGIJM.js';

// New: missing variants for categories A–M
import {
  generateA2, generateA4,
  generateB3,
  generateC4,
  generateD2, generateD3,
  generateE3, generateE4,
  generateF3, generateF5, generateF6,
  generateG3, generateG4,
  generateI2, generateI4,
  generateJ3, generateJ4,
  generateM3, generateM4,
} from './generatorMore.js';

// New: categories H (Metal + Water/Steam), K (Rate), L (Equilibrium), N (Organic)
import {
  generateH1, generateH2,
  generateK1, generateK2,
  generateL1, generateL2,
  generateN1, generateN2,
} from './generatorHKLN.js';

export const CURRICULUM_SUBTOPICS = [
  { id: '01a', topic: '01_Planet Earth', subtopic: '01a_The atmosphere' },
  { id: '01b', topic: '01_Planet Earth', subtopic: '01b_The ocean' },
  { id: '01c', topic: '01_Planet Earth', subtopic: '01c_Rocks and minerals' },
  { id: '02a', topic: '02_Microscopic World I', subtopic: '02a_Atomic structure' },
  { id: '02b', topic: '02_Microscopic World I', subtopic: '02b_The Periodic Table' },
  { id: '02c', topic: '02_Microscopic World I', subtopic: '02c_Metallic bonding' },
  { id: '02d', topic: '02_Microscopic World I', subtopic: '02d_Structures and properties of metals' },
  { id: '02e', topic: '02_Microscopic World I', subtopic: '02e_Ionic and covalent bonds' },
  { id: '02fgh', topic: '02_Microscopic World I', subtopic: '02fgh_Structures and properties' },
  { id: '02i', topic: '02_Microscopic World I', subtopic: '02i_Comparison of different structures' },
  { id: '03a', topic: '03_Metals', subtopic: '03a_Occurrence and extraction of metals' },
  { id: '03b', topic: '03_Metals', subtopic: '03b_Reactivity of metals' },
  { id: '03c', topic: '03_Metals', subtopic: '03c_Reacting masses' },
  { id: '03d', topic: '03_Metals', subtopic: '03d_Corrosion of metals and their protection' },
  { id: '04a', topic: '04_Acids and Bases', subtopic: '04a_Introduction to acids and alkalis' },
  { id: '04b', topic: '04_Acids and Bases', subtopic: '04b_Indicators and pH' },
  { id: '04c', topic: '04_Acids and Bases', subtopic: '04c_Strengths of acids and alkalis' },
  { id: '04d', topic: '04_Acids and Bases', subtopic: '04d_Salts and neutralization' },
  { id: '04e', topic: '04_Acids and Bases', subtopic: '04e_Concentration of solutions' },
  { id: '04f', topic: '04_Acids and Bases', subtopic: '04f_Volumetric analysis (titration)' },
  { id: '05a', topic: '05_Organic I', subtopic: '05a_Hydrocarbons from fossil fuels' },
  { id: '05b', topic: '05_Organic I', subtopic: '05b_Homologous series, structural formulae and naming of carbon compounds' },
  { id: '05c', topic: '05_Organic I', subtopic: '05c_Alkanes and alkenes' },
  { id: '05d', topic: '05_Organic I', subtopic: '05d_Addition polymers' },
  { id: '06a', topic: '06_Microscopic World II', subtopic: '06a_Polarity of bond and molecule' },
  { id: '06b', topic: '06_Microscopic World II', subtopic: '06b_Intermolecule forces' },
  { id: '06c', topic: '06_Microscopic World II', subtopic: '06c_Structure and properties of ice' },
  { id: '06d', topic: '06_Microscopic World II', subtopic: '06d_Simple molecular substances with non-octet structures' },
  { id: '06e', topic: '06_Microscopic World II', subtopic: '06e_Shapes of simple molecules' },
  { id: '07a', topic: '07_Redox', subtopic: '07a_Chemical cells in daily life' },
  { id: '07b', topic: '07_Redox', subtopic: '07b_Reactions in simple chemical cells' },
  { id: '07c', topic: '07_Redox', subtopic: '07c_Redox reactions' },
  { id: '07d', topic: '07_Redox', subtopic: '07d_Redox reactions in chemical cells' },
  { id: '07e', topic: '07_Redox', subtopic: '07e_Electrolysis' },
  { id: '08a', topic: '08_Energetics', subtopic: '08a_Introduction to energetics' },
  { id: '08b', topic: '08_Energetics', subtopic: '08b_Standard enthalpy change of reactions' },
  { id: '08c', topic: '08_Energetics', subtopic: "08c_Hess's law" },
  { id: '09a', topic: '09_Reaction rate', subtopic: '09a_Introduction to reaction rate' },
  { id: '09b', topic: '09_Reaction rate', subtopic: '09b_Factors affecting reaction rate' },
  { id: '09c', topic: '09_Reaction rate', subtopic: '09c_Molar volume of gases at r.t.p.' },
  { id: '10a', topic: '10_Equilibrium', subtopic: '10a_Introduction to chemical equilibria' },
  { id: '10b', topic: '10_Equilibrium', subtopic: '10b_Equilibrium constant Kc' },
  { id: '10c', topic: '10_Equilibrium', subtopic: '10c_Disturbance to chemical equilibria' },
  { id: '11a', topic: '11_Organic II', subtopic: '11a_Introduction to selected homologous series' },
  { id: '11b', topic: '11_Organic II', subtopic: '11b_Isomerism' },
  { id: '11c', topic: '11_Organic II', subtopic: '11c_Typical reactions of selected functional groups' },
  { id: '11d', topic: '11_Organic II', subtopic: '11d_Interconversion of carbon compounds' },
  { id: '11e', topic: '11_Organic II', subtopic: '11e_Important organic substances' },
  { id: '12a', topic: '12_Patterns', subtopic: '12a_Periodic variation in physical properties (Li to Ar)' },
  { id: '12b', topic: '12_Patterns', subtopic: '12b_Bonding, stoichiometric compositon and acid-base properties (Oxides of Na to Cl)' },
  { id: '12c', topic: '12_Patterns', subtopic: '12c_The 3 characteristics of transition metals.' },
];

export const CURRICULUM_SUBTOPIC_BY_ID = Object.fromEntries(
  CURRICULUM_SUBTOPICS.map((x) => [x.id, x])
);

export const QUESTION_TYPES = [
  // ── Category A ──────────────────────────────────────────────
  { id: 'A1', category: 'A', label: 'A1 — Standard Titration: Find Concentration', description: 'Known acid titrated against unknown base. Calculate [base] in mol/dm³ and g/dm³.', fn: generateA1, curriculumSubtopics: ['04f', '04e'] },
  { id: 'A2', category: 'A', label: 'A2 — Vinegar Analysis with Dilution', description: 'Vinegar diluted to volumetric flask; aliquot titrated with NaOH. Find original [CH₃COOH]; comment on pH.', fn: generateA2, curriculumSubtopics: ['04f', '04e', '04b'] },
  { id: 'A3', category: 'A', label: 'A3 — Titration: Mass of Salt After Evaporation', description: 'Identify the salt and calculate mass after evaporation to dryness.', fn: generateA3, curriculumSubtopics: ['04f', '04d'] },
  { id: 'A4', category: 'A', label: 'A4 — Molar Mass of Unknown Dibasic Acid', description: 'Dissolve unknown dibasic acid; titrate aliquot with NaOH; calculate molar mass.', fn: generateA4, curriculumSubtopics: ['04f', '04e'] },
  { id: 'A5', category: 'A', label: 'A5 — Water of Crystallisation (Na₂CO₃·xH₂O)', description: 'Determine x in hydrated salt by back-calculating from titration data.', fn: generateA5, curriculumSubtopics: ['04f', '04d'] },
  { id: 'A6', category: 'A', label: 'A6 — pH Calculation from Acid Concentration', description: 'Calculate the pH of a strong acid solution.', fn: generateA6, curriculumSubtopics: ['04b', '04c'] },

  // ── Category B ──────────────────────────────────────────────
  { id: 'B1', category: 'B', label: 'B1 — Back Titration: % Purity of Insoluble Base', description: 'Insoluble base dissolved in excess acid; excess titrated with alkali.', fn: generateB1, curriculumSubtopics: ['04f', '04d'] },
  { id: 'B2', category: 'B', label: 'B2 — Back Titration: % Nitrogen in Fertilizer', description: 'Ammonium salt boiled with excess NaOH; excess titrated with HCl.', fn: generateB2, curriculumSubtopics: ['04f', '04d'] },
  { id: 'B3', category: 'B', label: 'B3 — Back Titration: % CaCO₃ in Limestone', description: 'Limestone reacted with excess HCl; excess titrated with NaOH after filtering.', fn: generateB3, curriculumSubtopics: ['04f', '04d'] },

  // ── Category C ──────────────────────────────────────────────
  { id: 'C1', category: 'C', label: 'C1 — Acid + Metal Oxide: Mass of Salt Formed', description: 'Excess oxide added to fixed volume of acid; acid is limiting. Find mass of dry salt.', fn: generateC1, curriculumSubtopics: ['03c', '04d'] },
  { id: 'C2', category: 'C', label: 'C2 — Metal + Acid: Limiting Reagent and H₂ Volume', description: 'Both amounts given. Identify limiting reagent and calculate H₂ at r.t.p.', fn: generateC2, curriculumSubtopics: ['03c', '09c'] },
  { id: 'C3', category: 'C', label: 'C3 — Carbonate + Acid: Limiting Reagent and CO₂ Volume', description: 'Both amounts given. Identify limiting reagent and calculate CO₂ at r.t.p.', fn: generateC3, curriculumSubtopics: ['03c', '09c'] },
  { id: 'C4', category: 'C', label: 'C4 — Acid + Metal Oxide: Limiting Reagent and Salt Mass', description: 'Both amounts given for acid + metal oxide. Identify limiting reagent and mass of salt.', fn: generateC4, curriculumSubtopics: ['03c', '04d'] },

  // ── Category D ──────────────────────────────────────────────
  { id: 'D1', category: 'D', label: 'D1 — Precipitation: Limiting Reagent and Yield', description: 'Mix two solutions; find limiting reagent and theoretical yield of precipitate.', fn: generateD1, curriculumSubtopics: ['04d', '03c'] },
  { id: 'D2', category: 'D', label: 'D2 — Precipitation: % Purity of Salt Sample', description: 'Dissolve impure salt; precipitate cation from aliquot; calculate % purity.', fn: generateD2, curriculumSubtopics: ['04d', '03c'] },
  { id: 'D3', category: 'D', label: 'D3 — Precipitation: [Cation] from Precipitate Mass', description: 'Excess anion added to sample; dried precipitate used to find original [cation].', fn: generateD3, curriculumSubtopics: ['04d', '03c'] },

  // ── Category E ──────────────────────────────────────────────
  { id: 'E1', category: 'E', label: 'E1 — Displacement: Mass of Displaced Metal', description: 'Excess reactive metal displaces metal from solution. Calculate mass deposited.', fn: generateE1, curriculumSubtopics: ['07c', '03c'] },
  { id: 'E2', category: 'E', label: 'E2 — Displacement: Mass Used & Remaining', description: 'Metal strip in excess; calculate mass of metal used (dissolved) and remaining, plus mass of displaced metal formed.', fn: generateE2, curriculumSubtopics: ['07c', '03c'] },
  { id: 'E3', category: 'E', label: 'E3 — Displacement: Unknown [Metal Ion] from Mass of Displaced Metal', description: 'Excess active metal; use mass of displaced metal formed to determine original [ion].', fn: generateE3, curriculumSubtopics: ['07c', '03c'] },
  { id: 'E4', category: 'E', label: 'E4 — Displacement: Colour Change + Ionic Equation + Mass', description: 'Write ionic equation; explain colour change; calculate mass of displaced metal.', fn: generateE4, curriculumSubtopics: ['07c', '03c'] },

  // ── Category F ──────────────────────────────────────────────
  { id: 'F1', category: 'F', label: 'F1 — Redox Titration: KMnO₄ or K₂Cr₂O₇', description: 'Acidified oxidising agent vs reducing agent. Calculate concentration of reducer.', fn: generateF1, curriculumSubtopics: ['07c', '04f', '04e'] },
  { id: 'F2', category: 'F', label: 'F2 — Redox Titration: % Purity of Iron Tablet', description: 'Dissolved iron tablet titrated with KMnO₄. Calculate % by mass of FeSO₄.', fn: generateF2, curriculumSubtopics: ['07c', '04f', '04e'] },
  { id: 'F3', category: 'F', label: 'F3 — Redox Titration: Water of Crystallisation in FeSO₄·xH₂O', description: 'Hydrated FeSO₄ dissolved and titrated with KMnO₄ to determine x.', fn: generateF3, curriculumSubtopics: ['07c', '04f', '04e'] },
  { id: 'F5', category: 'F', label: 'F5 — Redox Titration: Hydrogen Peroxide Analysis', description: 'Diluted H₂O₂ titrated with acidified KMnO₄ (ratio 2:5). Find original [H₂O₂].', fn: generateF5, curriculumSubtopics: ['07c', '04f', '04e'] },
  { id: 'F6', category: 'F', label: 'F6 — Redox Titration: [Fe²⁺] by K₂Cr₂O₇', description: 'Iron(II) solution titrated with acidified K₂Cr₂O₇ (orange → green). Find [Fe²⁺].', fn: generateF6, curriculumSubtopics: ['07c', '04f', '04e'] },

  // ── Category G ──────────────────────────────────────────────
  { id: 'G1', category: 'G', label: 'G1 — Metal + Acid: H₂ Volume from Metal Mass', description: 'Known mass of metal in excess acid. Calculate volume of H₂ at r.t.p.', fn: generateG1, curriculumSubtopics: ['03c', '09c'] },
  { id: 'G2', category: 'G', label: 'G2 — Metal Purity from H₂ Volume', description: 'Impure metal in excess acid. Calculate % purity from gas volume.', fn: generateG2, curriculumSubtopics: ['03c', '09c'] },
  { id: 'G3', category: 'G', label: 'G3 — Find Acid Concentration from H₂ Volume', description: 'Excess metal in acid of unknown concentration. Calculate [acid] from H₂ collected.', fn: generateG3, curriculumSubtopics: ['03c', '09c'] },
  { id: 'G4', category: 'G', label: 'G4 — Metal + Acid: Limiting Reagent (H₂ Volume)', description: 'Both amounts given. Identify limiting reagent and calculate H₂ volume at r.t.p.', fn: generateG4, curriculumSubtopics: ['03c', '09c'] },

  // ── Category H ──────────────────────────────────────────────
  { id: 'H1', category: 'H', label: 'H1 — Metal + Cold Water: H₂ Volume and Observations', description: 'Reactive metal (Na or Ca) in cold water; calculate H₂ volume; describe observations.', fn: generateH1, curriculumSubtopics: ['03b', '09c'] },
  { id: 'H2', category: 'H', label: 'H2 — Metal + Steam: Mass of Oxide and H₂ Volume', description: 'Metal (Mg, Zn, Fe) reacts with steam; calculate mass of oxide and H₂ at r.t.p.', fn: generateH2, curriculumSubtopics: ['03b', '03c', '09c'] },

  // ── Category I ──────────────────────────────────────────────
  { id: 'I1', category: 'I', label: 'I1 — Combustion: Volume of CO₂ Produced', description: 'Complete combustion of a fuel. Write equation and calculate CO₂ volume at r.t.p.', fn: generateI1, curriculumSubtopics: ['05a', '03c', '09c'] },
  { id: 'I2', category: 'I', label: 'I2 — Combustion: Mass of Fuel for Given CO₂ Volume', description: 'Reverse: find mass of fuel needed to produce a given volume of CO₂.', fn: generateI2, curriculumSubtopics: ['05a', '03c', '09c'] },
  { id: 'I3', category: 'I', label: 'I3 — Combustion Calorimetry: ΔHc', description: 'Burning fuel heats water. Calculate molar enthalpy of combustion.', fn: generateI3, curriculumSubtopics: ['08a', '05a'] },
  { id: 'I4', category: 'I', label: 'I4 — Combustion: Volume of Air Required', description: 'Calculate minimum volume of air for complete combustion (O₂ = 21% of air).', fn: generateI4, curriculumSubtopics: ['05a', '03c', '09c'] },

  // ── Category J ──────────────────────────────────────────────
  { id: 'J1', category: 'J', label: 'J1 — Thermal Decomp: % Purity from Mass Loss', description: 'Impure carbonate heated; mass loss = CO₂ driven off. Find % purity.', fn: generateJ1, curriculumSubtopics: ['03c', '04d'] },
  { id: 'J2', category: 'J', label: 'J2 — Thermal Decomp: % Purity from Gas Volume', description: 'Mineral heated; CO₂ volume collected at r.t.p. used to find % purity.', fn: generateJ2, curriculumSubtopics: ['03c', '09c'] },
  { id: 'J3', category: 'J', label: 'J3 — Thermal Decomp: Percentage Yield', description: 'Pure compound heated; compare actual vs theoretical yield of solid product.', fn: generateJ3, curriculumSubtopics: ['03c'] },
  { id: 'J4', category: 'J', label: 'J4 — Water of Crystallisation from Heating', description: 'Hydrated salt loses water on heating; calculate value of x from mass lost.', fn: generateJ4, curriculumSubtopics: ['03c'] },

  // ── Category K ──────────────────────────────────────────────
  { id: 'K1', category: 'K', label: 'K1 — Rate: Average Rate from Gas Volume Data', description: 'Volume-time data provided; calculate average rate; discuss initial rate from graph.', fn: generateK1, curriculumSubtopics: ['09a', '09b'] },
  { id: 'K2', category: 'K', label: 'K2 — Rate: Na₂S₂O₃ + HCl Disappearing Cross', description: 'Turbidity method; calculate rate = 1/time; explain effect of concentration.', fn: generateK2, curriculumSubtopics: ['09b'] },

  // ── Category L ──────────────────────────────────────────────
  { id: 'L1', category: 'L', label: 'L1 — Equilibrium: Calculate Kc from Concentrations', description: 'Write Kc expression; substitute equilibrium concentrations; interpret result.', fn: generateL1, curriculumSubtopics: ['10b'] },
  { id: 'L2', category: 'L', label: 'L2 — Equilibrium: ICE Table (Find Equilibrium Concentrations)', description: 'Given Kc and initial amounts, use ICE table to find equilibrium concentrations.', fn: generateL2, curriculumSubtopics: ['10b', '10a'] },

  // ── Category M ──────────────────────────────────────────────
  { id: 'M1', category: 'M', label: 'M1 — Enthalpy of Neutralisation', description: 'Acid + base in polystyrene cup; temperature rise. Calculate ΔHneut in kJ/mol.', fn: generateM1, curriculumSubtopics: ['08a'] },
  { id: 'M2', category: 'M', label: 'M2 — Combustion Calorimetry: Spirit Burner', description: 'Spirit burner heats water. Calculate ΔHc in kJ/mol from temperature rise.', fn: generateM2, curriculumSubtopics: ['08a', '05a'] },
  { id: 'M3', category: 'M', label: "M3 — Hess's Law: ΔHf from Combustion Data", description: "Use combustion enthalpies and Hess's Law to calculate ΔHf°.", fn: generateM3, curriculumSubtopics: ['08c', '08b'] },
  { id: 'M4', category: 'M', label: 'M4 — Enthalpy of Dissolution (Endothermic)', description: 'Dissolve NH₄Cl / KNO₃ in water; temperature drops; calculate +ΔH per mole.', fn: generateM4, curriculumSubtopics: ['08a'] },

  // ── Category N ──────────────────────────────────────────────
  { id: 'N1', category: 'N', label: 'N1 — Ester Preparation: Limiting Reagent and % Yield', description: 'Ethanol + ethanoic acid → ethyl ethanoate; determine limiting reagent and % yield.', fn: generateN1, curriculumSubtopics: ['11c', '03c'] },
  { id: 'N2', category: 'N', label: 'N2 — Oxidation of Ethanol: % Yield of Ethanoic Acid', description: 'Ethanol oxidised by K₂Cr₂O₇; calculate theoretical yield and % yield of ethanoic acid.', fn: generateN2, curriculumSubtopics: ['11d', '07c', '03c'] },
];

export const CATEGORY_LABELS = {
  A: 'A — Acid-Base Titration',
  B: 'B — Back Titration',
  C: 'C — Salt Preparation',
  D: 'D — Precipitation',
  E: 'E — Metal Displacement',
  F: 'F — Redox Titration',
  G: 'G — Metal + Acid (Gas)',
  H: 'H — Metal + Water / Steam',
  I: 'I — Combustion',
  J: 'J — Thermal Decomposition',
  K: 'K — Rate of Reaction',
  L: 'L — Chemical Equilibrium',
  M: 'M — Enthalpy Changes',
  N: 'N — Organic Preparations',
};

function normalizeUnitsInText(s) {
  if (!s) return s;
  const out = String(s)
    // Concentration units
    .replace(/\bmol\s*\/\s*dm\s*³/g, 'mol dm⁻³')
    .replace(/\bmol\s*\/\s*dm\^3/g, 'mol dm⁻³')
    .replace(/\bmol\s*\/\s*dm3/g, 'mol dm⁻³')
    .replace(/\bg\s*\/\s*dm\s*³/g, 'g dm⁻³')
    .replace(/\bg\s*\/\s*dm\^3/g, 'g dm⁻³')
    .replace(/\bg\s*\/\s*dm3/g, 'g dm⁻³')
    // Molar volume
    .replace(/\bdm\s*³\s*\/\s*mol/g, 'dm³ mol⁻¹')
    .replace(/\bdm\^3\s*\/\s*mol/g, 'dm³ mol⁻¹')
    .replace(/\bdm3\s*\/\s*mol/g, 'dm³ mol⁻¹')
    // Rates
    .replace(/\bcm\s*³\s*\/\s*s/g, 'cm³ s⁻¹')
    .replace(/\bcm\^3\s*\/\s*s/g, 'cm³ s⁻¹')
    .replace(/\bcm3\s*\/\s*s/g, 'cm³ s⁻¹');

  // Prevent awkward line breaks between the unit and its exponent in HTML rendering.
  // U+2060 WORD JOINER discourages wrapping without adding visible spacing.
  return out
    .replace(/dm³/g, 'dm\u2060³')
    .replace(/dm⁻³/g, 'dm\u2060⁻³')
    .replace(/cm³/g, 'cm\u2060³')
    .replace(/mol⁻¹/g, 'mol\u2060⁻¹')
    .replace(/s⁻¹/g, 's\u2060⁻¹');
}

function normalizeChemNotationInText(s) {
  if (!s) return s;
  let out = String(s);

  // Prefer formula with state symbols for common aqueous reagents
  const aqPairs = [
    ['hydrochloric acid', 'HCl'],
    ['nitric acid', 'HNO₃'],
    ['sulphuric acid', 'H₂SO₄'],
    ['ethanoic acid', 'CH₃COOH'],
    ['sodium hydroxide', 'NaOH'],
    ['potassium hydroxide', 'KOH'],
    ['ammonia solution', 'NH₃'],
    ['potassium manganate\(VII\)', 'KMnO₄'],
    ['potassium dichromate\(VI\)', 'K₂Cr₂O₇'],
    ['silver nitrate', 'AgNO₃'],
    ['barium chloride', 'BaCl₂'],
    ['lead\(II\) nitrate', 'Pb(NO₃)₂'],
    ['potassium iodide', 'KI'],
    ['potassium bromide', 'KBr'],
    ['sodium chloride', 'NaCl'],
    ['sodium sulphate', 'Na₂SO₄'],
  ];

  for (const [namePattern, formula] of aqPairs) {
    // e.g. "sulphuric acid (H₂SO₄)" → "H₂SO₄(aq)"
    const re = new RegExp(`\\b${namePattern}\\s*\\([^)]*${formula.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}[^)]*\\)`, 'gi');
    out = out.replace(re, `${formula}(aq)`);
    // e.g. "a solution containing potassium hydroxide" → "KOH(aq)"
    const re2 = new RegExp(`(solution\\s+containing\\s+)${namePattern}\\b`, 'gi');
    out = out.replace(re2, `$1${formula}(aq)`);
    // e.g. "titrated with sodium hydroxide" → "titrated with NaOH(aq)"
    const re3 = new RegExp(`\\b${namePattern}\\b`, 'gi');
    out = out.replace(re3, `${formula}(aq)`);
  }

  // Common solids (typically used as solids in HKDSE contexts)
  const solidPairs = [
    ['calcium carbonate', 'CaCO₃'],
    ['magnesium oxide', 'MgO'],
    ['copper\(II\) oxide', 'CuO'],
    ['magnesium hydroxide', 'Mg(OH)₂'],
  ];
  for (const [namePattern, formula] of solidPairs) {
    const re = new RegExp(`\\b${namePattern}\\s*\\([^)]*${formula.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}[^)]*\\)`, 'gi');
    out = out.replace(re, `${formula}(s)`);
    const re2 = new RegExp(`\\b${namePattern}\\b`, 'gi');
    out = out.replace(re2, `${formula}(s)`);
  }

  // Metals are solids when used as samples/strips/powders/ribbons
  const metalPairs = [
    ['magnesium', 'Mg'],
    ['zinc', 'Zn'],
    ['iron', 'Fe'],
    ['copper', 'Cu'],
    ['aluminium', 'Al'],
    ['calcium', 'Ca'],
    ['sodium', 'Na'],
  ];
  for (const [namePattern, formula] of metalPairs) {
    const re = new RegExp(`\\b${namePattern}\\s*\\(${formula}\\)`, 'gi');
    out = out.replace(re, `${formula}(s)`);
  }

  return out;
}

function normalizeUnits(q) {
  if (!q || typeof q !== 'object') return q;
  const out = { ...q };
  const norm = (x) => normalizeChemNotationInText(normalizeUnitsInText(x));

  out.problemStatement = norm(out.problemStatement);
  out.equation = norm(out.equation);
  out.ionicEquation = norm(out.ionicEquation);
  out.finalAnswer = norm(out.finalAnswer);
  out.ramInfo = norm(out.ramInfo);
  out.notes = Array.isArray(out.notes) ? out.notes.map(norm) : out.notes;
  out.solution = Array.isArray(out.solution)
    ? out.solution.map((s) => ({ ...s, title: norm(s.title), content: norm(s.content) }))
    : out.solution;
  return out;
}

function validateQuestion(q) {
  const equationText = `${q.equation || ''}\n${q.ionicEquation || ''}`;
  if (/\b\d+\.\d+\s*O₂\b/.test(equationText)) {
    throw new Error('Invalid balanced equation: fractional coefficient detected.');
  }

  const text = `${q.problemStatement || ''}\n${q.finalAnswer || ''}`;
  if (/(using\s+litmus\s+as\s+indicator)/i.test(text)) {
    throw new Error('Invalid indicator choice: litmus is not suitable for titration endpoints.');
  }

  const pHMatches = [...text.matchAll(/\bpH\s*(?:=|was\s*measured\s*as)?\s*([0-9]+(?:\.[0-9]+)?)/gi)];
  for (const m of pHMatches) {
    const v = Number(m[1]);
    if (!Number.isFinite(v) || v < 0 || v > 14) {
      throw new Error('Invalid pH value: pH must be within 0–14.');
    }
  }

  // HKDSE convention: molar volume at r.t.p. is 24 dm^3/mol
  const rtpMentioned = /molar\s+volume\s*(?:=|at)\s*r\.t\.p\./i.test(text) || /\br\.t\.p\./i.test(text);
  if (rtpMentioned && /molar\s+volume/i.test(text)) {
    const has24 = /24\s*dm\s*³\s*\/\s*mol|24\s*dm\^3\s*\/\s*mol|24\s*dm3\s*\/\s*mol|24\s*dm\s*\u2060?³\s*mol\s*\u2060?⁻¹|24\s*dm\u2060?³\s*mol\u2060?⁻¹/i.test(text);
    if (!has24) {
      throw new Error('Invalid molar volume at r.t.p.: must use 24 dm³ mol⁻¹.');
    }
  }
}

export function generateQuestion(typeId, ramOn) {
  const type = QUESTION_TYPES.find(t => t.id === typeId);
  if (!type) throw new Error(`Unknown question type: ${typeId}`);
  const raw = {
    ...type.fn(ramOn),
    typeId,
    typeLabel: type.label,
    curriculumSubtopics: type.curriculumSubtopics || [],
    curriculumTags: (type.curriculumSubtopics || [])
      .map((id) => CURRICULUM_SUBTOPIC_BY_ID[id])
      .filter(Boolean),
  };
  const q = normalizeUnits(raw);
  validateQuestion(q);
  return q;
}

export function getTypesByCategory(categoryId) {
  return QUESTION_TYPES.filter(t => t.category === categoryId);
}

export function getRandomType(categoryId = null) {
  const pool = categoryId
    ? QUESTION_TYPES.filter(t => t.category === categoryId)
    : QUESTION_TYPES;
  return pool[Math.floor(Math.random() * pool.length)];
}
