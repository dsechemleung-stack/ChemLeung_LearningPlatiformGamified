import { ACID_BASE_PAIRS, INDICATORS, MM, RAM, sf, fmt } from '../data/chemicals.js';
import {
  randTitre, randAliquot, randFlask, randConc, randMass,
  randFloat, randInt, randChoice, sfStr, cmToDm
} from '../utils/random.js';

// ============================================================
// GENERATOR A1 — Standard Acid-Base Titration (Find Concentration)
// Acid in burette (known conc) → Base in flask (unknown conc)
// ============================================================
export function generateA1(ramOn) {
  const pair = randChoice(ACID_BASE_PAIRS);
  const indicator = randChoice(pair.indicatorOptions);
  const indData = INDICATORS[indicator];

  const titre = randTitre();          // cm³ acid used
  const concAcid = randConc(0.05, 1.20);
  const volBase = randAliquot();      // cm³ base in flask

  // Calculate
  const molAcid = concAcid * (titre / 1000);
  const molBase = molAcid * (pair.baseRatio / pair.acidRatio);
  const concBase = molBase / (volBase / 1000);
  const concBaseG = concBase * pair.M_base;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${pair.ramElems})`
    : null;

  const indicatorNote = pair.acidStrong && pair.baseStrong
    ? `${indicator.charAt(0).toUpperCase() + indicator.slice(1)} is suitable as both acid and alkali are strong — a sharp pH change occurs at the equivalence point (near pH 7).`
    : pair.baseStrong === false
    ? `Methyl orange is suitable because the equivalence point is acidic (weak base, NH₃, fully reacted → solution is slightly acidic); phenolphthalein would not give a sharp endpoint.`
    : `Phenolphthalein is suitable because the equivalence point is alkaline (weak acid CH₃COOH forms alkaline salt upon neutralisation); methyl orange changes colour below pH 4 and would miss the endpoint.`;

  return {
    category: 'A',
    variant: 'A1',
    title: 'Acid-Base Titration — Find Concentration of Base',
    description: 'Direct titration: acid (known) titrated against base (unknown)',
    problemStatement:
      `In a titration experiment, a student finds that ${titre} cm³ of ${pair.acidName} ` +
      `(${pair.acidFormula}) of concentration ${concAcid} mol/dm³ is required to completely ` +
      `neutralise ${volBase} cm³ of a solution containing ${pair.baseName} (${pair.baseFormula}) ` +
      `using ${indicator} as indicator.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Calculate the concentration of the ${pair.baseName} solution in mol/dm³.` +
      `\n(b) Express this concentration in g/dm³.`,
    equation: pair.equation,
    ionicEquation: pair.ionicEq,
    solution: [
      {
        step: 1,
        title: 'Write balanced equation and identify mole ratio',
        content:
          `${pair.equation}\n` +
          `Mole ratio  ${pair.acidFormula} : ${pair.baseFormula} = ${pair.acidRatio} : ${pair.baseRatio}`,
      },
      {
        step: 2,
        title: `Calculate moles of ${pair.acidFormula} used`,
        content:
          `Volume of ${pair.acidFormula} (titre) = ${titre} cm³ = ${sf(titre / 1000, 4)} dm³\n` +
          `Concentration of ${pair.acidFormula} = ${concAcid} mol/dm³\n` +
          `n(${pair.acidFormula}) = concentration × volume\n` +
          `n(${pair.acidFormula}) = ${concAcid} × ${sf(titre / 1000, 4)} = ${sfStr(molAcid, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate moles of ${pair.baseFormula}`,
        content:
          `From the equation, ${pair.acidRatio} mol ${pair.acidFormula} reacts with ${pair.baseRatio} mol ${pair.baseFormula}\n` +
          `n(${pair.baseFormula}) = ${sfStr(molAcid, 4)} × (${pair.baseRatio}/${pair.acidRatio}) = ${sfStr(molBase, 4)} mol`,
      },
      {
        step: 4,
        title: `Calculate concentration of ${pair.baseFormula}`,
        content:
          `Volume of ${pair.baseFormula} solution = ${volBase} cm³ = ${sf(volBase / 1000, 4)} dm³\n` +
          `Concentration = n / V = ${sfStr(molBase, 4)} / ${sf(volBase / 1000, 4)}\n` +
          `Concentration = ${sfStr(concBase, 3)} mol/dm³`,
      },
      {
        step: 5,
        title: 'Convert to g/dm³',
        content:
          `M(${pair.baseFormula}) = ${sfStr(pair.M_base, 4)} g/mol\n` +
          `Concentration in g/dm³ = ${sfStr(concBase, 3)} × ${sfStr(pair.M_base, 4)}\n` +
          `= ${sfStr(concBaseG, 3)} g/dm³`,
      },
    ],
    finalAnswer:
      `(a) Concentration of ${pair.baseName} = ${sfStr(concBase, 3)} mol/dm³\n` +
      `(b) Concentration of ${pair.baseName} = ${sfStr(concBaseG, 3)} g/dm³`,
    notes: [
      indicatorNote,
      `The ionic equation for this neutralisation is: ${pair.ionicEq}`,
      ramOn ? 'RAM values were provided in the question.' : 'RAM values must be looked up from the Periodic Table.',
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR A3 — Mass of Salt Obtained After Evaporation
// ============================================================
export function generateA3(ramOn) {
  const pair = randChoice(ACID_BASE_PAIRS);
  const indicator = randChoice(pair.indicatorOptions);

  const volAcid = randAliquot();
  const concAcid = randConc(0.05, 1.00);
  const concBase = randConc(0.05, 1.00);

  // Work out how much base is needed for complete neutralisation
  const molAcid = concAcid * (volAcid / 1000);
  const molBase = molAcid * (pair.baseRatio / pair.acidRatio);
  const volBase = (molBase / concBase) * 1000; // cm³

  // Mass of salt produced
  const molSalt = molAcid * (1 / pair.acidRatio); // 1 mol salt per acidRatio mol acid
  const massSalt = molSalt * pair.M_salt;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${pair.ramElems}, ${pair.saltFormula.includes('Na') && !pair.ramElems.includes('Na') ? 'Na = 23.0, ' : ''})`
    : null;

  return {
    category: 'A',
    variant: 'A3',
    title: 'Acid-Base Titration — Mass of Salt Obtained',
    description: 'Calculate mass of dry salt after evaporation to dryness',
    problemStatement:
      `A student titrated ${volAcid} cm³ of ${pair.acidName} (${pair.acidFormula}) ` +
      `of concentration ${concAcid} mol/dm³ with ${pair.baseName} (${pair.baseFormula}) ` +
      `of concentration ${concBase} mol/dm³. At the endpoint (using ${indicator} indicator), ` +
      `the solution was evaporated to dryness.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Calculate the volume of ${pair.baseName} solution required to reach the endpoint.` +
      `\n(b) Identify the salt formed and calculate the maximum mass of dry salt obtained.`,
    equation: pair.equation,
    solution: [
      {
        step: 1,
        title: 'Identify the salt formed',
        content:
          `${pair.equation}\n` +
          `The salt formed is ${pair.saltName} (${pair.saltFormula}).`,
      },
      {
        step: 2,
        title: `Calculate moles of ${pair.acidFormula}`,
        content:
          `n(${pair.acidFormula}) = ${concAcid} × ${sf(volAcid / 1000, 4)} = ${sfStr(molAcid, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate moles of ${pair.baseFormula} needed`,
        content:
          `Ratio ${pair.acidFormula} : ${pair.baseFormula} = ${pair.acidRatio} : ${pair.baseRatio}\n` +
          `n(${pair.baseFormula}) = ${sfStr(molAcid, 4)} × ${pair.baseRatio}/${pair.acidRatio} = ${sfStr(molBase, 4)} mol`,
      },
      {
        step: 4,
        title: 'Calculate volume of base required',
        content:
          `V(${pair.baseFormula}) = n / c = ${sfStr(molBase, 4)} / ${concBase}\n` +
          `V = ${sfStr(volBase, 3)} cm³`,
      },
      {
        step: 5,
        title: 'Calculate moles of salt formed',
        content:
          `From equation, ratio ${pair.acidFormula} : ${pair.saltFormula} = ${pair.acidRatio} : 1\n` +
          `n(${pair.saltFormula}) = ${sfStr(molAcid, 4)} / ${pair.acidRatio} = ${sfStr(molSalt, 4)} mol`,
      },
      {
        step: 6,
        title: 'Calculate mass of salt',
        content:
          `M(${pair.saltFormula}) = ${sfStr(pair.M_salt, 5)} g/mol\n` +
          `Mass = ${sfStr(molSalt, 4)} × ${sfStr(pair.M_salt, 5)} = ${sfStr(massSalt, 3)} g`,
      },
    ],
    finalAnswer:
      `(a) Volume of ${pair.baseName} = ${sfStr(volBase, 3)} cm³\n` +
      `(b) Salt formed: ${pair.saltName} (${pair.saltFormula})\n` +
      `    Mass of dry salt = ${sfStr(massSalt, 3)} g`,
    notes: [
      `The water of neutralisation evaporates upon heating — only the anhydrous salt remains.`,
      `${pair.acidName} + ${pair.baseName} → ${pair.saltName} + water`,
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR A5 — Water of Crystallisation (Na₂CO₃·xH₂O)
// ============================================================
export function generateA5(ramOn) {
  // Na2CO3.xH2O titrated with HCl, using methyl orange
  // Na2CO3 + 2HCl → 2NaCl + H2O + CO2
  const M_Na2CO3 = MM.Na2CO3;
  const M_Na2CO3_actual = 2 * RAM.Na + RAM.C + 3 * RAM.O; // 106.0
  const M_H2O = 2 * RAM.H + RAM.O; // 18.0

  // Pick x (water molecules) randomly 2-10
  const x = randInt(2, 10);
  const M_hydrated = M_Na2CO3_actual + x * M_H2O;

  const massSample = randMass(1.0, 6.0);
  const flaskVol = randChoice([100, 200, 250]);
  const aliquot = randChoice([10, 20, 25]);
  const concHCl = randConc(0.05, 0.50);

  // Back-calculate titre to be consistent
  // mol Na2CO3 in whole flask = massSample / M_hydrated
  // mol Na2CO3 in aliquot = (massSample / M_hydrated) * (aliquot / flaskVol)
  // mol HCl = mol Na2CO3 * 2 (1:2 ratio Na2CO3:HCl)
  const molNa2CO3_flask = massSample / M_hydrated;
  const molNa2CO3_aliquot = molNa2CO3_flask * (aliquot / flaskVol);
  const molHCl = molNa2CO3_aliquot * 2;
  const titre = sf((molHCl / concHCl) * 1000, 3); // cm³, round to 3 sf

  const ramInfo = ramOn
    ? `(Relative atomic masses: H = 1.0, C = 12.0, O = 16.0, Na = 23.0, Cl = 35.5)`
    : null;

  return {
    category: 'A',
    variant: 'A5',
    title: 'Water of Crystallisation — Na₂CO₃·xH₂O',
    description: 'Determine x by titrating dissolved hydrated salt with acid',
    problemStatement:
      `A student dissolved ${sfStr(massSample, 4)} g of hydrated sodium carbonate (Na₂CO₃·xH₂O) ` +
      `in water and made the solution up to ${flaskVol}.0 cm³ in a volumetric flask. ` +
      `A ${aliquot}.0 cm³ portion of this solution required ${titre} cm³ of hydrochloric acid ` +
      `of concentration ${concHCl} mol/dm³ for neutralisation using methyl orange indicator.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nDetermine the value of x in Na₂CO₃·xH₂O.`,
    equation: 'Na₂CO₃(aq) + 2HCl(aq) → 2NaCl(aq) + H₂O(l) + CO₂(g)',
    solution: [
      {
        step: 1,
        title: 'Write balanced equation and mole ratio',
        content:
          `Na₂CO₃(aq) + 2HCl(aq) → 2NaCl(aq) + H₂O(l) + CO₂(g)\n` +
          `Mole ratio  Na₂CO₃ : HCl = 1 : 2`,
      },
      {
        step: 2,
        title: 'Calculate moles of HCl used in titration',
        content:
          `n(HCl) = ${concHCl} × ${sf(titre / 1000, 4)} = ${sfStr(molHCl, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate moles of Na₂CO₃ in the aliquot',
        content:
          `From ratio 1:2,\nn(Na₂CO₃) in ${aliquot}.0 cm³ = ${sfStr(molHCl, 4)} / 2 = ${sfStr(molNa2CO3_aliquot, 4)} mol`,
      },
      {
        step: 4,
        title: 'Scale up to find moles of Na₂CO₃ in whole flask',
        content:
          `n(Na₂CO₃) in ${flaskVol}.0 cm³ = ${sfStr(molNa2CO3_aliquot, 4)} × (${flaskVol}.0 / ${aliquot}.0)\n` +
          `= ${sfStr(molNa2CO3_flask, 4)} mol`,
      },
      {
        step: 5,
        title: 'Calculate M(Na₂CO₃·xH₂O)',
        content:
          `M(hydrated salt) = mass / moles = ${sfStr(massSample, 4)} / ${sfStr(molNa2CO3_flask, 4)}\n` +
          `= ${sfStr(M_hydrated, 4)} g/mol`,
      },
      {
        step: 6,
        title: 'Determine x',
        content:
          `M(Na₂CO₃) = 2(23.0) + 12.0 + 3(16.0) = 106.0 g/mol\n` +
          `M(H₂O) = 2(1.0) + 16.0 = 18.0 g/mol\n` +
          `Mass of water of crystallisation = ${sfStr(M_hydrated, 4)} – 106.0 = ${sfStr(M_hydrated - M_Na2CO3_actual, 4)} g/mol\n` +
          `x = ${sfStr(M_hydrated - M_Na2CO3_actual, 4)} / 18.0 = ${sfStr(x, 2)}\n` +
          `∴ x = ${x}`,
      },
    ],
    finalAnswer: `x = ${x} (i.e., Na₂CO₃·${x}H₂O)`,
    notes: [
      'Methyl orange is used because Na₂CO₃ is a salt of a strong base and weak acid — equivalence point is slightly acidic, suitable for methyl orange.',
      `Molar mass of Na₂CO₃·${x}H₂O = 106.0 + ${x} × 18.0 = ${sfStr(M_hydrated, 4)} g/mol`,
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR A6 — pH Calculation from Concentration
// ============================================================
export function generateA6(ramOn) {
  const acids = [
    { formula: 'HCl', name: 'hydrochloric acid', strong: true, mono: true },
    { formula: 'HNO₃', name: 'nitric acid', strong: true, mono: true },
    { formula: 'H₂SO₄', name: 'sulphuric acid', strong: true, mono: false, H_per_mol: 2 },
  ];
  const acid = randChoice(acids);
  const conc = randFloat(0.001, 0.500, 3);
  const H_conc = acid.mono ? conc : conc * (acid.H_per_mol || 1);
  const pH = -Math.log10(H_conc);

  const ramInfo = ramOn ? `(Relative atomic masses: H = 1.0, O = 16.0)` : null;

  const monoNote = acid.mono
    ? `${acid.formula} is a strong monobasic acid. It dissociates completely:\n${acid.formula}(aq) → H⁺(aq) + ${acid.formula.replace('H', '')}⁻(aq)\n[H⁺] = [${acid.formula}] = ${conc} mol/dm³`
    : `${acid.formula} is a strong dibasic acid. It dissociates completely in two steps:\n${acid.formula}(aq) → 2H⁺(aq) + SO₄²⁻(aq)\n[H⁺] = 2 × [${acid.formula}] = 2 × ${conc} = ${sfStr(H_conc, 3)} mol/dm³`;

  return {
    category: 'A',
    variant: 'A6',
    title: 'pH Calculation from Acid Concentration',
    description: 'Calculate pH of a strong acid solution',
    problemStatement:
      `A solution of ${acid.name} (${acid.formula}) has a concentration of ${conc} mol/dm³. ` +
      `Assume complete dissociation.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the pH of this ${acid.name} solution.`,
    equation: acid.mono
      ? `${acid.formula}(aq) → H⁺(aq) + ${acid.formula.slice(1)}⁻(aq)`
      : `${acid.formula}(aq) → 2H⁺(aq) + SO₄²⁻(aq)`,
    solution: [
      {
        step: 1,
        title: 'Dissociation of acid',
        content: monoNote,
      },
      {
        step: 2,
        title: 'Apply pH formula',
        content:
          `pH = −log[H⁺(aq)]\n` +
          `pH = −log(${sfStr(H_conc, 3)})\n` +
          `pH = ${sfStr(pH, 3)}`,
      },
      {
        step: 3,
        title: 'Check result is in range 0–14',
        content:
          `pH = ${sfStr(pH, 3)}  ✓ (within 0–14 scale)\n` +
          (pH < 3 ? 'The solution is strongly acidic (pH < 3).'
            : pH < 7 ? 'The solution is weakly/moderately acidic (pH 3–7).'
            : 'Unexpected — check concentration.'),
      },
    ],
    finalAnswer: `pH of ${acid.name} solution = ${sfStr(pH, 3)}`,
    notes: [
      'pH = −log[H⁺(aq)] applies to strong acids which dissociate completely.',
      'pH scale runs from 0 to 14 in the HKDSE curriculum.',
      `Classification: pH ${sfStr(pH, 3)} → ${pH < 3 ? 'strongly acidic' : 'weakly acidic'}`,
    ],
    ramInfo,
  };
}
