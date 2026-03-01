import { INSOLUBLE_BASES, MM, RAM, sf } from '../data/chemicals.js';
import {
  randTitre, randAliquot, randFlask, randConc, randMass,
  randVolExcess, randChoice, sfStr
} from '../utils/random.js';

// ============================================================
// GENERATOR B1 — Back Titration: Insoluble Base (Antacid)
// Excess HCl added to insoluble base; excess HCl titrated back with NaOH
// ============================================================
export function generateB1(ramOn) {
  const base = randChoice(INSOLUBLE_BASES);
  const massSample = sfStr(randMass(0.50, 4.00), 4);
  const volExcessHCl = randVolExcess();   // cm³ of excess HCl added
  const concHCl = randConc(0.10, 1.00);
  const flaskVol = randChoice([100, 200, 250]);
  const aliquot = randChoice([10, 20, 25]);
  const concNaOH = randConc(0.05, 0.50);

  // Work out titre from the chemistry
  // mol HCl initially = concHCl * volExcessHCl/1000
  const molHCl_total = concHCl * (volExcessHCl / 1000);
  // mol base = massSample / M_base
  const molBase = parseFloat(massSample) / base.M;
  // mol HCl reacted with base
  const molHCl_reacted = molBase * base.acidRatio; // e.g. 2 for Mg(OH)2
  // mol HCl excess
  const molHCl_excess = molHCl_total - molHCl_reacted;
  // If negative, means insufficient acid - guard: pick a mass that makes sense
  // Ensure molHCl_excess > 0 by capping mass
  const maxMolBase = molHCl_total * 0.8 / base.acidRatio;
  const safeMolBase = Math.min(molBase, maxMolBase);
  const safeMass = sfStr(safeMolBase * base.M, 4);
  const safeHClExcess = molHCl_total - safeMolBase * base.acidRatio;
  // mol HCl in aliquot
  const molHCl_aliquot = safeHClExcess * (aliquot / flaskVol);
  // mol NaOH = mol HCl in aliquot (1:1)
  const molNaOH = molHCl_aliquot;
  const titre = sfStr((molNaOH / concNaOH) * 1000, 3);

  // Actual purity calc
  const purity = (safeMolBase * base.M / parseFloat(massSample)) * 100;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${base.ramElems})`
    : null;

  return {
    category: 'B',
    variant: 'B1',
    title: `Back Titration — % Purity of ${base.name}`,
    description: `Insoluble base in ${base.context}; excess acid titrated with alkali`,
    problemStatement:
      `A student crushed a ${base.context} containing ${base.formula} of mass ${safeMass} g ` +
      `and added it to ${volExcessHCl}.0 cm³ of hydrochloric acid (HCl) of concentration ${concHCl} mol/dm³. ` +
      `The mixture was warmed to ensure complete reaction. ` +
      `The resulting solution was transferred to a ${flaskVol}.0 cm³ volumetric flask and made up to the mark. ` +
      `A ${aliquot}.0 cm³ portion of this solution required ${titre} cm³ of sodium hydroxide (NaOH) ` +
      `of concentration ${concNaOH} mol/dm³ for neutralisation using phenolphthalein indicator.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the percentage by mass of ${base.formula} in the ${base.context}.`,
    equation: `${base.withHCl.equation}\nHCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)  [back titration step]`,
    solution: [
      {
        step: 1,
        title: 'Identify the two reactions',
        content:
          `Reaction 1 (forward): ${base.withHCl.equation}\n` +
          `Reaction 2 (back): HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)\n\n` +
          `Strategy: Find mol HCl excess → subtract from total HCl → find mol ${base.formula}`,
      },
      {
        step: 2,
        title: 'Calculate total moles of HCl added',
        content:
          `n(HCl)_total = ${concHCl} × ${sf(volExcessHCl / 1000, 4)} = ${sfStr(molHCl_total, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate moles of NaOH used in back titration',
        content:
          `n(NaOH) = ${concNaOH} × ${sf(parseFloat(titre) / 1000, 4)} = ${sfStr(molNaOH, 4)} mol`,
      },
      {
        step: 4,
        title: 'Calculate moles of excess HCl in the whole flask',
        content:
          `n(HCl)_excess in aliquot = n(NaOH) = ${sfStr(molNaOH, 4)} mol  [1:1 ratio]\n` +
          `n(HCl)_excess in ${flaskVol}.0 cm³ = ${sfStr(molNaOH, 4)} × (${flaskVol}.0 / ${aliquot}.0)\n` +
          `= ${sfStr(safeHClExcess, 4)} mol`,
      },
      {
        step: 5,
        title: `Calculate moles of HCl that reacted with ${base.formula}`,
        content:
          `n(HCl)_reacted = n(HCl)_total − n(HCl)_excess\n` +
          `= ${sfStr(molHCl_total, 4)} − ${sfStr(safeHClExcess, 4)}\n` +
          `= ${sfStr(safeMolBase * base.acidRatio, 4)} mol`,
      },
      {
        step: 6,
        title: `Calculate moles of ${base.formula}`,
        content:
          `From the equation, ratio HCl : ${base.formula} = ${base.acidRatio} : 1\n` +
          `n(${base.formula}) = ${sfStr(safeMolBase * base.acidRatio, 4)} / ${base.acidRatio} = ${sfStr(safeMolBase, 4)} mol`,
      },
      {
        step: 7,
        title: `Calculate mass and percentage of ${base.formula}`,
        content:
          `M(${base.formula}) = ${sfStr(base.M, 4)} g/mol\n` +
          `Mass of ${base.formula} = ${sfStr(safeMolBase, 4)} × ${sfStr(base.M, 4)} = ${sfStr(safeMolBase * base.M, 4)} g\n\n` +
          `% purity = (mass of ${base.formula} / mass of sample) × 100\n` +
          `= (${sfStr(safeMolBase * base.M, 4)} / ${safeMass}) × 100\n` +
          `= ${sfStr(purity, 3)}%`,
      },
    ],
    finalAnswer: `Percentage by mass of ${base.formula} in the ${base.context} = ${sfStr(purity, 3)}%`,
    notes: [
      'Back titration is used here because the base is insoluble and reacts slowly with acid — direct titration would not give a sharp endpoint.',
      'Phenolphthalein is used for the back titration (strong acid excess vs strong base NaOH) — equivalence point is alkaline.',
      'The flask must be made up to exactly the volumetric flask volume to allow accurate scaling.',
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR B2 — Ammonium Salt Determination (Fertilizer N content)
// Boil with excess NaOH; ammonia driven off; excess NaOH titrated with HCl
// ============================================================
export function generateB2(ramOn) {
  const massSample = sfStr(randMass(1.0, 8.0), 4);
  const concNaOH = randConc(0.10, 1.50);
  const volExcessNaOH = randVolExcess();
  const concHCl = randConc(0.05, 0.50);

  // (NH4)2SO4 + 2NaOH → Na2SO4 + 2NH3 + 2H2O
  // Mol ratio: NH4+ : NaOH = 1 : 1
  // If the fertilizer is (NH4)2SO4, M = 132.1
  const M_NH4_2SO4 = 2 * (RAM.N + 4 * RAM.H) + RAM.S + 4 * RAM.O; // 132.1
  const percent_N_target = randChoice([15, 18, 20, 21, 25]); // % nitrogen target
  // mass of N in sample
  const massN = (percent_N_target / 100) * parseFloat(massSample);
  const molN = massN / RAM.N;
  const molNH3 = molN; // 1 mol N per mol NH3
  const molNaOH_total = concNaOH * (volExcessNaOH / 1000);
  // NaOH reacted with NH4+ = molNH3 (1:1 ratio)
  const molNaOH_reacted = molNH3;
  const molNaOH_excess = molNaOH_total - molNaOH_reacted;
  if (molNaOH_excess < 0) {
    // Safeguard: use smaller N%
    const safeN = 10;
    return generateB2(ramOn); // recurse if values don't work — production would clamp
  }
  const titre = sfStr((molNaOH_excess / concHCl) * 1000, 3);

  const ramInfo = ramOn
    ? `(Relative atomic masses: H = 1.0, N = 14.0, O = 16.0, Na = 23.0, Cl = 35.5)`
    : null;

  return {
    category: 'B',
    variant: 'B2',
    title: 'Back Titration — % Nitrogen in Fertilizer',
    description: 'Ammonium salt determined by boiling with excess NaOH; excess titrated with HCl',
    problemStatement:
      `A ${sfStr(parseFloat(massSample), 4)} g sample of fertilizer containing ammonium sulphate ` +
      `was boiled with ${volExcessNaOH}.0 cm³ of sodium hydroxide (NaOH) of concentration ${concNaOH} mol/dm³. ` +
      `The ammonia gas evolved was driven off completely by heating. ` +
      `The excess base remaining required ${titre} cm³ of hydrochloric acid of concentration ${concHCl} mol/dm³ ` +
      `for neutralisation using methyl orange indicator.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the percentage by mass of nitrogen in the fertilizer.`,
    equation:
      `(NH₄)₂SO₄(aq) + 2NaOH(aq) → Na₂SO₄(aq) + 2NH₃(g) + 2H₂O(l)\n` +
      `[Back:] HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)`,
    solution: [
      {
        step: 1,
        title: 'Calculate total moles of NaOH added',
        content:
          `n(NaOH)_total = ${concNaOH} × ${sf(volExcessNaOH / 1000, 4)} = ${sfStr(molNaOH_total, 4)} mol`,
      },
      {
        step: 2,
        title: 'Calculate moles of excess NaOH (from back titration)',
        content:
          `n(HCl) used = ${concHCl} × ${sf(parseFloat(titre) / 1000, 4)} = ${sfStr(molNaOH_excess, 4)} mol\n` +
          `n(NaOH)_excess = n(HCl) = ${sfStr(molNaOH_excess, 4)} mol  [1:1 ratio]`,
      },
      {
        step: 3,
        title: 'Calculate moles of NaOH that reacted with NH₄⁺',
        content:
          `n(NaOH)_reacted = n(NaOH)_total − n(NaOH)_excess\n` +
          `= ${sfStr(molNaOH_total, 4)} − ${sfStr(molNaOH_excess, 4)}\n` +
          `= ${sfStr(molNaOH_reacted, 4)} mol`,
      },
      {
        step: 4,
        title: 'Calculate moles of NH₃ produced = moles of N',
        content:
          `NH₄⁺(aq) + OH⁻(aq) → NH₃(g) + H₂O(l)  [ratio 1:1]\n` +
          `n(NH₃) = n(NaOH)_reacted = ${sfStr(molNaOH_reacted, 4)} mol\n` +
          `n(N) = n(NH₃) = ${sfStr(molN, 4)} mol  [1 N atom per NH₃]`,
      },
      {
        step: 5,
        title: 'Calculate mass and percentage of nitrogen',
        content:
          `M(N) = ${RAM.N} g/mol\n` +
          `Mass of N = ${sfStr(molN, 4)} × ${RAM.N} = ${sfStr(massN, 4)} g\n\n` +
          `% N = (${sfStr(massN, 4)} / ${sfStr(parseFloat(massSample), 4)}) × 100\n` +
          `= ${sfStr(percent_N_target, 3)}%`,
      },
    ],
    finalAnswer: `Percentage of nitrogen in the fertilizer = ${sfStr(percent_N_target, 3)}%`,
    notes: [
      'Methyl orange is used in the back titration because excess NaOH (strong base) is titrated with HCl (strong acid) — equivalence point is acidic.',
      'The ammonia must be completely driven off by boiling; incomplete removal leads to error.',
      'In fertilizer analysis, % N determines quality: e.g. ammonium sulphate contains ~21.2% N by mass.',
    ],
    ramInfo,
  };
}
