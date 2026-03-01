// ============================================================
// GENERATOR — Missing variants for categories A, B, C, D, E, F, G, I, J, M
// ============================================================
import {
  ACID_BASE_PAIRS, CARBONATE_ACID_REACTIONS, ACID_OXIDE_REACTIONS,
  PRECIPITATION_REACTIONS, DISPLACEMENT_REACTIONS, REDOX_SYSTEMS,
  FUELS, DECOMPOSITIONS, MM, RAM, sf, M,
} from '../data/chemicals.js';
import {
  randTitre, randAliquot, randFlask, randConc, randMass,
  randFloat, randInt, randChoice, sfStr, randGasVol, randTempInitial,
  randTempRise, randWaterVol, randVolExcess,
} from '../utils/random.js';

const MOLAR_VOL = 24.0;

// ============================================================
// A2 — Vinegar Analysis (Dilution + Back-calculate [CH3COOH])
// ============================================================
export function generateA2(ramOn) {
  const vinVol = randChoice([10, 20, 25]);       // cm³ vinegar taken
  const flaskVol = randChoice([100, 250, 500]);  // cm³ volumetric flask
  const aliquot = randChoice([10, 20, 25]);       // cm³ aliquot
  const concNaOH = randConc(0.05, 0.50);
  const titre = randTitre();

  // mol NaOH used → mol CH3COOH in aliquot (1:1)
  const molNaOH = concNaOH * (titre / 1000);
  const molAcid_aliquot = molNaOH;
  // Scale to whole flask
  const molAcid_flask = molAcid_aliquot * (flaskVol / aliquot);
  // Original concentration in vinegar
  const concVinegar_mol = molAcid_flask / (vinVol / 1000);
  const concVinegar_g = concVinegar_mol * MM.CH3COOH;

  // pH consistency (internally aligned to standard ethanoic acid strength, but not given to students)
  // Compare:
  // - pH_strong: incorrect assumption of complete dissociation (treating CH3COOH like a strong acid)
  // - pH_weak: weak-acid approximation [H+] ~ sqrt(Ka * C)
  const PKA_CH3COOH = 4.76;
  const KA_CH3COOH = Math.pow(10, -PKA_CH3COOH);
  const pH_strong = -Math.log10(concVinegar_mol);
  const H_weak = Math.sqrt(KA_CH3COOH * concVinegar_mol);
  const pH_weak = -Math.log10(H_weak);

  // Measured pH: close to weak-acid prediction with tiny noise, but always higher than strong-acid estimate
  const noise = randChoice([-0.1, 0.0, 0.1]);
  const pH_measured_raw = pH_weak + noise;
  const pH_measured = parseFloat(Math.max(pH_measured_raw, pH_strong + 0.2).toFixed(1));

  const ramInfo = ramOn
    ? `(Relative atomic masses: H = 1.0, C = 12.0, O = 16.0)`
    : null;

  return {
    category: 'A',
    variant: 'A2',
    title: 'Acid-Base Titration — Vinegar Analysis with Dilution',
    description: 'Find original [CH3COOH] in vinegar from titration of diluted sample',
    problemStatement:
      `A student pipetted ${vinVol}.0 cm³ of vinegar (containing ethanoic acid, CH₃COOH) ` +
      `into a ${flaskVol}.0 cm³ volumetric flask and made the solution up to the mark with distilled water. ` +
      `A ${aliquot}.0 cm³ aliquot of this diluted solution was pipetted into a conical flask and ` +
      `titrated with sodium hydroxide (NaOH) of concentration ${concNaOH} mol/dm³ using ` +
      `phenolphthalein indicator. The average titre was ${titre} cm³. ` +
      `The pH of the original vinegar was measured as ${pH_measured}.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Calculate the original concentration of ethanoic acid in the vinegar in mol/dm³.` +
      `\n(b) Express this concentration in g/dm³.` +
      `\n(c) Based on the measured pH (${pH_measured}), determine whether CH₃COOH behaves as a strong acid in water.`,
    equation: 'CH₃COOH(aq) + NaOH(aq) → CH₃COONa(aq) + H₂O(l)',
    solution: [
      {
        step: 1,
        title: 'Write equation; identify indicator justification',
        content:
          `CH₃COOH(aq) + NaOH(aq) → CH₃COONa(aq) + H₂O(l)\n` +
          `Mole ratio CH₃COOH : NaOH = 1 : 1\n` +
          `Phenolphthalein is correct: weak acid + strong base → equivalence point is alkaline (pH > 7).`,
      },
      {
        step: 2,
        title: 'Calculate moles of NaOH used (from titre)',
        content:
          `n(NaOH) = ${concNaOH} × ${sf(titre / 1000, 4)} = ${sfStr(molNaOH, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate moles of CH₃COOH in the aliquot',
        content:
          `From ratio 1:1,  n(CH₃COOH) in ${aliquot}.0 cm³ = ${sfStr(molAcid_aliquot, 4)} mol`,
      },
      {
        step: 4,
        title: 'Scale up to whole flask, then back to original vinegar',
        content:
          `n(CH₃COOH) in ${flaskVol}.0 cm³ flask = ${sfStr(molAcid_aliquot, 4)} × (${flaskVol}.0 / ${aliquot}.0)\n` +
          `= ${sfStr(molAcid_flask, 4)} mol\n\n` +
          `This came from ${vinVol}.0 cm³ of vinegar.\n` +
          `[CH₃COOH]_original = ${sfStr(molAcid_flask, 4)} / ${sf(vinVol / 1000, 4)}\n` +
          `= ${sfStr(concVinegar_mol, 3)} mol/dm³`,
      },
      {
        step: 5,
        title: 'Convert to g/dm³',
        content:
          `M(CH₃COOH) = 2(12.0) + 4(1.0) + 2(16.0) = 60.0 g/mol\n` +
          `Concentration in g/dm³ = ${sfStr(concVinegar_mol, 3)} × 60.0\n` +
          `= ${sfStr(concVinegar_g, 3)} g/dm³`,
      },
      {
        step: 6,
        title: `Determine whether CH₃COOH is a strong acid (using pH ${pH_measured})`,
        content:
          `If ethanoic acid dissociated completely (WRONG assumption), then [H⁺] ≈ ${sfStr(concVinegar_mol, 3)} mol/dm³\n` +
          `pH_strong-acid estimate = −log(${sfStr(concVinegar_mol, 3)}) = ${sfStr(pH_strong, 3)}.\n\n` +
          `If CH₃COOH were a strong acid, the measured pH should be close to ${sfStr(pH_strong, 3)}.\n` +
          `But measured pH = ${pH_measured}, which is much higher than ${sfStr(pH_strong, 3)}.\n\n` +
          `Conclusion: CH₃COOH does NOT behave as a strong acid in water (it only partially ionises).`,
      },
    ],
    finalAnswer:
      `(a) [CH₃COOH] in vinegar = ${sfStr(concVinegar_mol, 3)} mol/dm³\n` +
      `(b) Concentration = ${sfStr(concVinegar_g, 3)} g/dm³\n` +
      `(c) Assuming complete dissociation gives pH = ${sfStr(pH_strong, 3)}, but measured pH = ${pH_measured}.\n` +
      `Therefore CH₃COOH does not behave as a strong acid in water (partial ionisation).`,
    notes: [
      'Phenolphthalein must be used for weak acid + strong base titrations — equivalence point pH > 7.',
      'Methyl orange changes colour below pH 4 and would give a premature endpoint here.',
    ],
    ramInfo,
  };
}

// ============================================================
// A4 — Molar Mass of an Unknown Dibasic Acid
// ============================================================
export function generateA4(ramOn) {
  const massSample = parseFloat(sfStr(randMass(0.50, 5.00), 4));
  const flaskVol = randChoice([100, 200, 250]);
  const aliquot = randChoice([10, 20, 25]);
  const concNaOH = randConc(0.05, 0.50);

  // Choose a target M for the dibasic acid (make it realistic)
  const M_acid_target = randFloat(80, 200, 1);
  // mol acid in flask = massSample / M_acid
  const molAcid_flask = massSample / M_acid_target;
  // mol acid in aliquot
  const molAcid_aliquot = molAcid_flask * (aliquot / flaskVol);
  // mol NaOH = 2 × mol acid (dibasic)
  const molNaOH = molAcid_aliquot * 2;
  const titre = sfStr((molNaOH / concNaOH) * 1000, 3);

  const ramInfo = ramOn
    ? `(Relative atomic masses: H = 1.0, C = 12.0, O = 16.0)`
    : null;

  return {
    category: 'A',
    variant: 'A4',
    title: 'Titration — Molar Mass of Unknown Dibasic Acid',
    description: 'Determine molar mass of an unknown dibasic acid from titration data',
    problemStatement:
      `A student dissolved ${massSample} g of an unknown dibasic acid (H₂X) in distilled water ` +
      `and made the solution up to ${flaskVol}.0 cm³ in a volumetric flask. ` +
      `A ${aliquot}.0 cm³ portion of this solution was titrated with sodium hydroxide (NaOH) ` +
      `of concentration ${concNaOH} mol/dm³ using phenolphthalein indicator. ` +
      `The average titre was ${titre} cm³.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the molar mass of the unknown dibasic acid.`,
    equation: 'H₂X(aq) + 2NaOH(aq) → Na₂X(aq) + 2H₂O(l)',
    solution: [
      {
        step: 1,
        title: 'Identify the mole ratio for a dibasic acid',
        content:
          `H₂X(aq) + 2NaOH(aq) → Na₂X(aq) + 2H₂O(l)\n` +
          `Mole ratio H₂X : NaOH = 1 : 2\n` +
          `(A dibasic acid provides 2 mol H⁺ per mol of acid.)`,
      },
      {
        step: 2,
        title: 'Calculate moles of NaOH used',
        content:
          `n(NaOH) = ${concNaOH} × ${sf(parseFloat(titre) / 1000, 4)} = ${sfStr(molNaOH, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate moles of H₂X in the aliquot',
        content:
          `From ratio H₂X : NaOH = 1 : 2\n` +
          `n(H₂X) in ${aliquot}.0 cm³ = ${sfStr(molNaOH, 4)} / 2 = ${sfStr(molAcid_aliquot, 4)} mol`,
      },
      {
        step: 4,
        title: 'Scale up to whole flask',
        content:
          `n(H₂X) in ${flaskVol}.0 cm³ = ${sfStr(molAcid_aliquot, 4)} × (${flaskVol}.0 / ${aliquot}.0)\n` +
          `= ${sfStr(molAcid_flask, 4)} mol`,
      },
      {
        step: 5,
        title: 'Calculate molar mass',
        content:
          `All ${massSample} g dissolved → ${sfStr(molAcid_flask, 4)} mol\n` +
          `M(H₂X) = mass / moles = ${massSample} / ${sfStr(molAcid_flask, 4)}\n` +
          `= ${sfStr(M_acid_target, 4)} g/mol`,
      },
    ],
    finalAnswer: `Molar mass of unknown dibasic acid = ${sfStr(M_acid_target, 4)} g/mol`,
    notes: [
      'Phenolphthalein is suitable as the equivalence point is alkaline (sodium salt of acid formed).',
      'Assumption: the acid is dibasic. If it were monobasic, the calculated M would be halved.',
    ],
    ramInfo,
  };
}

// ============================================================
// B3 — Back Titration: % CaCO₃ in Limestone
// ============================================================
export function generateB3(ramOn) {
  const massSample = parseFloat(sfStr(randMass(0.50, 4.00), 4));
  const volExcessHCl = randVolExcess();
  const concHCl = randConc(0.10, 1.00);
  const flaskVol = randChoice([100, 200, 250]);
  const aliquot = randChoice([10, 20, 25]);
  const concNaOH = randConc(0.05, 0.50);

  // CaCO3 + 2HCl → CaCl2 + H2O + CO2
  const purity = randFloat(55, 98, 1);
  const massCaCO3 = (purity / 100) * massSample;
  const molCaCO3 = massCaCO3 / MM.CaCO3;
  const molHCl_total = concHCl * (volExcessHCl / 1000);
  const molHCl_reacted = molCaCO3 * 2;
  const molHCl_excess = molHCl_total - molHCl_reacted;
  // Guard: if excess is negative, cap
  const safeExcess = Math.max(molHCl_excess, molHCl_total * 0.05);
  const safeMolCaCO3 = (molHCl_total - safeExcess) / 2;
  const safeMassCaCO3 = safeMolCaCO3 * MM.CaCO3;
  const safePurity = (safeMassCaCO3 / massSample) * 100;

  const molNaOH_aliquot = safeExcess * (aliquot / flaskVol);
  const titre = sfStr((molNaOH_aliquot / concNaOH) * 1000, 3);

  const ramInfo = ramOn
    ? `(Relative atomic masses: H = 1.0, C = 12.0, O = 16.0, Na = 23.0, Ca = 40.1, Cl = 35.5)`
    : null;

  return {
    category: 'B',
    variant: 'B3',
    title: 'Back Titration — % CaCO₃ in Limestone',
    description: 'Limestone dissolved in excess HCl; excess titrated with NaOH',
    problemStatement:
      `A ${massSample} g sample of limestone was reacted with ${volExcessHCl}.0 cm³ of ` +
      `hydrochloric acid (HCl) of concentration ${concHCl} mol/dm³ (in excess). ` +
      `After the reaction was complete and CO₂ had been expelled by heating, ` +
      `the mixture was filtered and the filtrate transferred to a ${flaskVol}.0 cm³ volumetric flask ` +
      `and made up to the mark. ` +
      `A ${aliquot}.0 cm³ portion of this solution required ${titre} cm³ of NaOH ` +
      `of concentration ${concNaOH} mol/dm³ for neutralisation using phenolphthalein indicator.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the percentage by mass of calcium carbonate (CaCO₃) in the limestone.`,
    equation:
      `CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + H₂O(l) + CO₂(g)\n` +
      `[Back:] HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)`,
    solution: [
      {
        step: 1,
        title: 'Strategy: total HCl − excess HCl = HCl reacted with CaCO₃',
        content:
          `Reaction 1: CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + H₂O(l) + CO₂(g)\n` +
          `Reaction 2 (back): HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)`,
      },
      {
        step: 2,
        title: 'Calculate total moles of HCl added',
        content:
          `n(HCl)_total = ${concHCl} × ${sf(volExcessHCl / 1000, 4)} = ${sfStr(molHCl_total, 4)} mol`,
      },
      {
        step: 3,
        title: 'Determine moles of excess HCl from back titration',
        content:
          `n(NaOH) in aliquot = ${concNaOH} × ${sf(parseFloat(titre) / 1000, 4)} = ${sfStr(molNaOH_aliquot, 4)} mol\n` +
          `n(HCl)_excess in aliquot = n(NaOH) = ${sfStr(molNaOH_aliquot, 4)} mol  [1:1]\n` +
          `n(HCl)_excess in ${flaskVol}.0 cm³ = ${sfStr(molNaOH_aliquot, 4)} × (${flaskVol}.0 / ${aliquot}.0)\n` +
          `= ${sfStr(safeExcess, 4)} mol`,
      },
      {
        step: 4,
        title: 'Calculate moles of HCl that reacted with CaCO₃',
        content:
          `n(HCl)_reacted = ${sfStr(molHCl_total, 4)} − ${sfStr(safeExcess, 4)} = ${sfStr(safeMolCaCO3 * 2, 4)} mol`,
      },
      {
        step: 5,
        title: 'Calculate moles and mass of CaCO₃',
        content:
          `Ratio HCl : CaCO₃ = 2 : 1\n` +
          `n(CaCO₃) = ${sfStr(safeMolCaCO3 * 2, 4)} / 2 = ${sfStr(safeMolCaCO3, 4)} mol\n` +
          `M(CaCO₃) = 40.1 + 12.0 + 3(16.0) = 100.1 g/mol\n` +
          `Mass of CaCO₃ = ${sfStr(safeMolCaCO3, 4)} × 100.1 = ${sfStr(safeMassCaCO3, 4)} g`,
      },
      {
        step: 6,
        title: '% by mass of CaCO₃',
        content:
          `% CaCO₃ = (${sfStr(safeMassCaCO3, 4)} / ${massSample}) × 100 = ${sfStr(safePurity, 3)}%`,
      },
    ],
    finalAnswer: `% by mass of CaCO₃ in limestone = ${sfStr(safePurity, 3)}%`,
    notes: [
      'CO₂ must be expelled before titration — CO₂(g) dissolves slightly in water as carbonic acid and would interfere.',
      'Phenolphthalein is used for the back titration: excess HCl (strong) vs NaOH (strong) — endpoint is alkaline.',
    ],
    ramInfo,
  };
}

// ============================================================
// C4 — Acid + Metal Oxide: Limiting Reagent & Mass of Salt
// ============================================================
export function generateC4(ramOn) {
  const rxn = randChoice(ACID_OXIDE_REACTIONS);
  const massOxide = parseFloat(sfStr(randMass(0.50, 5.00), 4));
  const volAcid = parseFloat(sfStr(randAliquot(), 4));
  const concAcid = randConc(0.10, 2.00);

  const molOxide = massOxide / rxn.M_oxide;
  const molAcid = concAcid * (volAcid / 1000);

  // mol acid needed for all oxide = molOxide * acidRatio / oxideRatio(=1)
  const molAcidNeeded = molOxide * rxn.acidRatio;
  const oxideLimiting = molAcid >= molAcidNeeded;

  const limitingMolOxide = oxideLimiting ? molOxide : molAcid / rxn.acidRatio;
  const molSalt = limitingMolOxide;
  const massSalt = molSalt * rxn.M_salt;

  const limitingName = oxideLimiting ? rxn.oxideName : rxn.acidName;
  const excessName = oxideLimiting ? rxn.acidName : rxn.oxideName;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'C',
    variant: 'C4',
    title: `Acid + Metal Oxide — Limiting Reagent and Salt Mass`,
    description: 'Both reactant quantities given; identify limiting reagent and mass of salt',
    problemStatement:
      `A student adds ${massOxide} g of ${rxn.oxideName} (${rxn.oxideFormula}) ` +
      `to ${volAcid} cm³ of ${rxn.acidName} of concentration ${concAcid} mol/dm³. ` +
      `The mixture is heated until no further change is observed.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Determine the limiting reagent, showing your working clearly.` +
      `\n(b) Calculate the mass of ${rxn.saltName} (${rxn.salt}) obtained.` +
      `\n(c) Describe what is observed as the reaction proceeds.`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Balanced equation and mole ratios',
        content:
          `${rxn.equation}\n` +
          `Mole ratio ${rxn.oxideFormula} : ${rxn.acidFormula} : ${rxn.salt} = 1 : ${rxn.acidRatio} : 1`,
      },
      {
        step: 2,
        title: 'Calculate moles of each reactant',
        content:
          `n(${rxn.oxideFormula}) = ${massOxide} / ${sfStr(rxn.M_oxide, 4)} = ${sfStr(molOxide, 4)} mol\n` +
          `n(${rxn.acidFormula}) = ${concAcid} × ${sf(volAcid / 1000, 4)} = ${sfStr(molAcid, 4)} mol`,
      },
      {
        step: 3,
        title: 'Determine limiting reagent',
        content:
          `For all ${rxn.oxideFormula} to react: n(${rxn.acidFormula}) needed = ${sfStr(molOxide, 4)} × ${rxn.acidRatio} = ${sfStr(molAcidNeeded, 4)} mol\n` +
          `Actual n(${rxn.acidFormula}) = ${sfStr(molAcid, 4)} mol\n\n` +
          (oxideLimiting
            ? `Acid available (${sfStr(molAcid, 4)}) ≥ acid needed (${sfStr(molAcidNeeded, 4)})\n∴ ${rxn.oxideName} is the LIMITING REAGENT.`
            : `Acid available (${sfStr(molAcid, 4)}) < acid needed (${sfStr(molAcidNeeded, 4)})\n∴ ${rxn.acidName} is the LIMITING REAGENT.`),
      },
      {
        step: 4,
        title: `Calculate moles of ${rxn.salt} formed`,
        content:
          `From ratio, n(${rxn.salt}) = n(limiting oxide) = ${sfStr(limitingMolOxide, 4)} mol`,
      },
      {
        step: 5,
        title: `Calculate mass of ${rxn.saltName}`,
        content:
          `M(${rxn.salt}) = ${sfStr(rxn.M_salt, 4)} g/mol\n` +
          `Mass = ${sfStr(molSalt, 4)} × ${sfStr(rxn.M_salt, 4)} = ${sfStr(massSalt, 3)} g`,
      },
      {
        step: 6,
        title: 'Observations',
        content: rxn.observation,
      },
    ],
    finalAnswer:
      `(a) Limiting reagent: ${limitingName} (${excessName} is in excess)\n` +
      `(b) Mass of ${rxn.saltName} = ${sfStr(massSalt, 3)} g\n` +
      `(c) ${rxn.observation}`,
    notes: [
      `Excess ${excessName} must be filtered / removed before evaporation to avoid contaminating the product.`,
      'The filtrate is then evaporated carefully to obtain the anhydrous salt.',
    ],
    ramInfo,
  };
}

// ============================================================
// D2 — Purity of a Salt Sample from Precipitation
// ============================================================
export function generateD2(ramOn) {
  const rxn = randChoice(PRECIPITATION_REACTIONS);
  const massSample = parseFloat(sfStr(randMass(0.50, 5.00), 4));
  const flaskVol = randChoice([100, 200, 250]);
  const aliquot = randChoice([10, 20, 25]);
  // Choose a realistic % purity
  const purity = randFloat(55, 98, 1);
  // Mass of cation compound present
  const massPure = (purity / 100) * massSample;

  // For simplicity, treat cation source as the compound
  // Use a simple 1:1 relationship for cation concentration
  const M_cation_source = MM[rxn.cationSource.replace(/[₁-₉()]/g, '').replace('NO3', 'NO3')]
    || (rxn.cationSource.includes('AgNO₃') ? M({ Ag: 1, N: 1, O: 3 })
      : rxn.cationSource.includes('BaCl₂') ? M({ Ba: 1, Cl: 2 })
      : rxn.cationSource.includes('Pb') ? M({ Pb: 1, N: 2, O: 6 })
      : 200);

  const molCation_flask = massPure / M_cation_source;
  const molCation_aliquot = molCation_flask * (aliquot / flaskVol);
  const molPpt = molCation_aliquot * (1 / rxn.cationRatio);
  const massPpt = parseFloat(sfStr(molPpt * rxn.M_ppt, 4));

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'D',
    variant: 'D2',
    title: `Precipitation — % Purity of Salt Sample`,
    description: 'Determine % purity from mass of precipitate formed from aliquot',
    problemStatement:
      `A ${massSample} g sample of impure ${rxn.cationSource} was dissolved in water ` +
      `and the solution made up to ${flaskVol}.0 cm³ in a volumetric flask. ` +
      `A ${aliquot}.0 cm³ aliquot was treated with excess ${rxn.anionSource} solution, ` +
      `causing a ${rxn.precipitateColour} precipitate of ${rxn.precipitateName} (${rxn.precipitate}) to form. ` +
      `After filtering, washing, and drying, the precipitate had a mass of ${massPpt} g.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the percentage by mass of ${rxn.cationSource} in the original sample.`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Write ionic equation',
        content: `${rxn.ionicEq}`,
      },
      {
        step: 2,
        title: `Calculate moles of ${rxn.precipitate} in the aliquot`,
        content:
          `M(${rxn.precipitate}) = ${sfStr(rxn.M_ppt, 5)} g/mol\n` +
          `n(${rxn.precipitate}) = ${massPpt} / ${sfStr(rxn.M_ppt, 5)} = ${sfStr(molPpt, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate moles of cation (${rxn.cationFormula}) in aliquot`,
        content:
          `From ionic equation, ratio ${rxn.cationFormula} : ${rxn.precipitate} = ${rxn.cationRatio} : 1\n` +
          `n(${rxn.cationFormula}) = ${sfStr(molPpt, 4)} × ${rxn.cationRatio} = ${sfStr(molCation_aliquot, 4)} mol`,
      },
      {
        step: 4,
        title: `Scale up to whole flask`,
        content:
          `n(${rxn.cationFormula}) in ${flaskVol}.0 cm³ = ${sfStr(molCation_aliquot, 4)} × (${flaskVol}.0 / ${aliquot}.0)\n` +
          `= ${sfStr(molCation_flask, 4)} mol`,
      },
      {
        step: 5,
        title: `Calculate mass and % of ${rxn.cationSource}`,
        content:
          `M(${rxn.cationSource}) ≈ ${sfStr(M_cation_source, 4)} g/mol\n` +
          `Mass of pure ${rxn.cationSource} = ${sfStr(molCation_flask, 4)} × ${sfStr(M_cation_source, 4)} = ${sfStr(massPure, 4)} g\n\n` +
          `% purity = (${sfStr(massPure, 4)} / ${massSample}) × 100 = ${sfStr(purity, 3)}%`,
      },
    ],
    finalAnswer: `% by mass of ${rxn.cationSource} in sample = ${sfStr(purity, 3)}%`,
    notes: [
      `The precipitate must be filtered, washed with distilled water, and dried to constant mass for accurate results.`,
      `Excess anion source ensures all cation is precipitated — the anion is the limiting reagent here.`,
    ],
    ramInfo,
  };
}

// ============================================================
// D3 — Concentration from Precipitation (excess anion added)
// ============================================================
export function generateD3(ramOn) {
  const rxn = randChoice(PRECIPITATION_REACTIONS);
  const volSample = parseFloat(sfStr(randAliquot(), 4));
  const massPpt = parseFloat(sfStr(randMass(0.10, 2.00), 4));

  const molPpt = massPpt / rxn.M_ppt;
  const molCation = molPpt * rxn.cationRatio;
  const concCation = molCation / (volSample / 1000);

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'D',
    variant: 'D3',
    title: `Precipitation — Concentration of Cation from Precipitate Mass`,
    description: 'Calculate original [cation] from mass of dried precipitate',
    problemStatement:
      `Excess ${rxn.anionSource} solution is added to ${volSample} cm³ of a solution ` +
      `containing ${rxn.cationFormula} ions. A ${rxn.precipitateColour} precipitate of ` +
      `${rxn.precipitateName} (${rxn.precipitate}) forms immediately. ` +
      `After filtering, washing, and drying, the precipitate has a mass of ${massPpt} g.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the original concentration of ${rxn.cationFormula} ions in mol/dm³.`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Ionic equation',
        content: `${rxn.ionicEq}`,
      },
      {
        step: 2,
        title: `Calculate moles of ${rxn.precipitate}`,
        content:
          `M(${rxn.precipitate}) = ${sfStr(rxn.M_ppt, 5)} g/mol\n` +
          `n(${rxn.precipitate}) = ${massPpt} / ${sfStr(rxn.M_ppt, 5)} = ${sfStr(molPpt, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate moles of ${rxn.cationFormula} in the sample`,
        content:
          `Ratio ${rxn.cationFormula} : ${rxn.precipitate} = ${rxn.cationRatio} : 1\n` +
          `n(${rxn.cationFormula}) = ${sfStr(molPpt, 4)} × ${rxn.cationRatio} = ${sfStr(molCation, 4)} mol`,
      },
      {
        step: 4,
        title: `Calculate concentration of ${rxn.cationFormula}`,
        content:
          `Volume = ${volSample} cm³ = ${sf(volSample / 1000, 4)} dm³\n` +
          `[${rxn.cationFormula}] = ${sfStr(molCation, 4)} / ${sf(volSample / 1000, 4)}\n` +
          `= ${sfStr(concCation, 3)} mol/dm³`,
      },
    ],
    finalAnswer: `[${rxn.cationFormula}] = ${sfStr(concCation, 3)} mol/dm³`,
    notes: [
      'Excess anion source is used to ensure complete precipitation of all cation ions.',
      `Precipitate colour: ${rxn.precipitateColour} — consistent with ${rxn.precipitate}.`,
    ],
    ramInfo,
  };
}

// ============================================================
// E3 — Unknown Concentration from Mass of Displaced Metal (Displacement)
// ============================================================
export function generateE3(ramOn) {
  const rxn = randChoice(DISPLACEMENT_REACTIONS);
  const vol = parseFloat(sfStr(randAliquot(), 4));

  const concActual = randConc(0.05, 0.80);
  const molIon = concActual * (vol / 1000);

  const molDisplaced = molIon * (1 / rxn.ionRatio);
  const massDisplaced = parseFloat(sfStr(molDisplaced * rxn.M_displaced, 3));

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'E',
    variant: 'E3',
    title: `Metal Displacement — Unknown Concentration from Mass of ${rxn.displacedName}`,
    description: 'Determine [metal ion] from the measured mass of displaced metal formed (no mass-change concept)',
    problemStatement:
      `Excess ${rxn.activeMetalName} (${rxn.activeMetal}) powder is added to ${vol} cm³ of ` +
      `${rxn.ionSource} solution of unknown concentration. ` +
      `After the reaction is complete, the solid is filtered, washed with water, dried, and weighed. ` +
      `The mass of ${rxn.displacedName} (${rxn.displaced}) formed is ${sfStr(massDisplaced, 3)} g.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the original concentration of ${rxn.ionFormula} in mol/dm³.`,
    equation: rxn.equation,
    ionicEquation: rxn.ionicEq,
    solution: [
      {
        step: 1,
        title: 'Ionic equation and mole ratio',
        content:
          `${rxn.ionicEq}\n` +
          `From ionic equation: ${rxn.ionRatio} ${rxn.ionFormula} → 1 ${rxn.displaced}`,
      },
      {
        step: 2,
        title: `Calculate moles of ${rxn.displaced} formed`,
        content:
          `M(${rxn.displaced}) = ${rxn.M_displaced} g/mol\n` +
          `n(${rxn.displaced}) = ${sfStr(massDisplaced, 3)} / ${rxn.M_displaced} = ${sfStr(molDisplaced, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate moles of ${rxn.ionFormula} reacted`,
        content:
          `n(${rxn.ionFormula}) = n(${rxn.displaced}) × ${rxn.ionRatio}\n` +
          `= ${sfStr(molDisplaced, 4)} × ${rxn.ionRatio} = ${sfStr(molIon, 4)} mol`,
      },
      {
        step: 4,
        title: 'Calculate concentration',
        content:
          `Volume = ${vol} cm³ = ${sf(vol / 1000, 4)} dm³\n` +
          `[${rxn.ionFormula}] = ${sfStr(molIon, 4)} / ${sf(vol / 1000, 4)}\n` +
          `= ${sfStr(concActual, 3)} mol/dm³`,
      },
    ],
    finalAnswer: `[${rxn.ionFormula}] = ${sfStr(concActual, 3)} mol/dm³`,
    notes: [
      rxn.colourChange,
      'Excess active metal is used to ensure all metal ions are completely displaced.',
    ],
    ramInfo,
  };
}

// ============================================================
// E4 — Displacement: Colour Change + Ionic Equation + Mass
// ============================================================
export function generateE4(ramOn) {
  // Always use Zn + CuSO4 or similar blue-to-colourless for vivid colour change
  const rxn = DISPLACEMENT_REACTIONS.find(r => r.ionFormula === 'Cu²⁺') || DISPLACEMENT_REACTIONS[0];
  const vol = parseFloat(sfStr(randAliquot(), 4));
  const conc = randConc(0.05, 1.00);

  const molIon = conc * (vol / 1000);
  const molActive = molIon * rxn.activeRatio / rxn.ionRatio;
  const molDisplaced = molIon / rxn.ionRatio;
  const massDisplaced = molDisplaced * rxn.M_displaced;
  const massActiveDissolved = molActive * rxn.M_active;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'E',
    variant: 'E4',
    title: `Metal Displacement — Colour Change, Ionic Equation & Mass`,
    description: 'Calculate mass of displaced metal; explain colour change; write ionic equation',
    problemStatement:
      `Excess ${rxn.activeMetalName} (${rxn.activeMetal}) powder is stirred into ${vol} cm³ of ` +
      `${rxn.ionSource} solution of concentration ${conc} mol/dm³ ` +
      `until the colour of the solution disappears completely.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the ionic equation for this reaction.` +
      `\n(b) Explain the colour change observed during the reaction.` +
      `\n(c) Calculate the mass of ${rxn.displacedName} (${rxn.displaced}) produced.`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Ionic equation',
        content:
          `${rxn.ionicEq}\n` +
          `${rxn.activeMetal} is above ${rxn.displaced} in the reactivity series → displacement is feasible.`,
      },
      {
        step: 2,
        title: 'Colour change explanation',
        content: rxn.colourChange,
      },
      {
        step: 3,
        title: `Calculate moles of ${rxn.ionFormula} (limiting reagent)`,
        content:
          `n(${rxn.ionFormula}) = ${conc} × ${sf(vol / 1000, 4)} = ${sfStr(molIon, 4)} mol`,
      },
      {
        step: 4,
        title: `Calculate moles of ${rxn.displaced} produced`,
        content:
          `Ratio ${rxn.ionFormula} : ${rxn.displaced} = ${rxn.ionRatio} : 1\n` +
          `n(${rxn.displaced}) = ${sfStr(molIon, 4)} / ${rxn.ionRatio} = ${sfStr(molDisplaced, 4)} mol`,
      },
      {
        step: 5,
        title: `Calculate mass of ${rxn.displacedName}`,
        content:
          `M(${rxn.displaced}) = ${rxn.M_displaced} g/mol\n` +
          `Mass = ${sfStr(molDisplaced, 4)} × ${rxn.M_displaced} = ${sfStr(massDisplaced, 3)} g`,
      },
    ],
    finalAnswer:
      `(a) ${rxn.ionicEq}\n` +
      `(b) ${rxn.colourChange}\n` +
      `(c) Mass of ${rxn.displacedName} = ${sfStr(massDisplaced, 3)} g`,
    notes: [
      `${rxn.activeMetal} is oxidised (loses electrons) and ${rxn.ionFormula} is reduced (gains electrons).`,
      `Mass of ${rxn.activeMetal} dissolved = ${sfStr(massActiveDissolved, 3)} g; mass of ${rxn.displaced} deposited = ${sfStr(massDisplaced, 3)} g.`,
    ],
    ramInfo,
  };
}

// ============================================================
// F3 — Water of Crystallisation: FeSO₄·xH₂O via KMnO₄
// ============================================================
export function generateF3(ramOn) {
  const rxn = REDOX_SYSTEMS[0]; // KMnO4 / FeSO4
  const M_FeSO4 = MM.FeSO4;
  const M_H2O = 2 * RAM.H + RAM.O;
  const x = randInt(4, 9);
  const M_hydrated = M_FeSO4 + x * M_H2O;

  const massSample = parseFloat(sfStr(randMass(1.0, 6.0), 4));
  const flaskVol = randChoice([100, 200, 250]);
  const aliquot = randChoice([10, 20, 25]);
  const concKMnO4 = randConc(0.005, 0.050);

  const molFeSO4_flask = massSample / M_hydrated;
  const molFeSO4_aliquot = molFeSO4_flask * (aliquot / flaskVol);
  // KMnO4 : FeSO4 = 1 : 5
  const molKMnO4 = molFeSO4_aliquot / 5;
  const titre = sfStr((molKMnO4 / concKMnO4) * 1000, 3);

  const ramInfo = ramOn
    ? `(Relative atomic masses: H = 1.0, O = 16.0, S = 32.1, K = 39.1, Mn = 55.0, Fe = 55.8)`
    : null;

  return {
    category: 'F',
    variant: 'F3',
    title: 'Redox Titration — Water of Crystallisation in FeSO₄·xH₂O',
    description: 'Titrate hydrated iron(II) sulphate with KMnO₄ to find value of x',
    problemStatement:
      `A student dissolved ${massSample} g of hydrated iron(II) sulphate (FeSO₄·xH₂O) ` +
      `in dilute sulphuric acid and made the solution up to ${flaskVol}.0 cm³. ` +
      `A ${aliquot}.0 cm³ aliquot of this solution required ${titre} cm³ of acidified ` +
      `potassium manganate(VII) (KMnO₄) of concentration ${concKMnO4} mol/dm³ for complete reaction. ` +
      `The endpoint was detected when a permanent pale pink colour persisted.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nDetermine the value of x in FeSO₄·xH₂O.`,
    equation: 'MnO₄⁻(aq) + 5Fe²⁺(aq) + 8H⁺(aq) → Mn²⁺(aq) + 5Fe³⁺(aq) + 4H₂O(l)',
    solution: [
      {
        step: 1,
        title: 'Write equation; mole ratio KMnO₄ : FeSO₄ = 1 : 5',
        content:
          `MnO₄⁻(aq) + 5Fe²⁺(aq) + 8H⁺(aq) → Mn²⁺(aq) + 5Fe³⁺(aq) + 4H₂O(l)\n` +
          `Mole ratio KMnO₄ : FeSO₄ = 1 : 5`,
      },
      {
        step: 2,
        title: 'Calculate moles of KMnO₄ used',
        content:
          `n(KMnO₄) = ${concKMnO4} × ${sf(parseFloat(titre) / 1000, 4)} = ${sfStr(molKMnO4, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate moles of FeSO₄ in the aliquot',
        content:
          `n(FeSO₄) in ${aliquot}.0 cm³ = ${sfStr(molKMnO4, 4)} × 5 = ${sfStr(molFeSO4_aliquot, 4)} mol`,
      },
      {
        step: 4,
        title: 'Scale up to whole flask',
        content:
          `n(FeSO₄) in ${flaskVol}.0 cm³ = ${sfStr(molFeSO4_aliquot, 4)} × (${flaskVol}.0 / ${aliquot}.0)\n` +
          `= ${sfStr(molFeSO4_flask, 4)} mol`,
      },
      {
        step: 5,
        title: 'Calculate molar mass of FeSO₄·xH₂O',
        content:
          `M(FeSO₄·xH₂O) = ${massSample} / ${sfStr(molFeSO4_flask, 4)} = ${sfStr(M_hydrated, 4)} g/mol`,
      },
      {
        step: 6,
        title: 'Determine x',
        content:
          `M(FeSO₄) = 55.8 + 32.1 + 4(16.0) = ${sfStr(M_FeSO4, 4)} g/mol\n` +
          `M(H₂O) = 2(1.0) + 16.0 = 18.0 g/mol\n` +
          `Mass of xH₂O = ${sfStr(M_hydrated, 4)} − ${sfStr(M_FeSO4, 4)} = ${sfStr(x * M_H2O, 4)} g/mol\n` +
          `x = ${sfStr(x * M_H2O, 4)} / 18.0 = ${x}\n` +
          `∴ x = ${x}`,
      },
    ],
    finalAnswer: `x = ${x}  (i.e., FeSO₄·${x}H₂O)`,
    notes: [
      `M(FeSO₄·${x}H₂O) = ${sfStr(M_FeSO4, 4)} + ${x} × 18.0 = ${sfStr(M_hydrated, 4)} g/mol`,
      'KMnO₄ is self-indicating — no external indicator needed.',
    ],
    ramInfo,
  };
}

// ============================================================
// F5 — Hydrogen Peroxide Analysis (KMnO₄ titration)
// ============================================================
export function generateF5(ramOn) {
  // 2MnO4- + 5H2O2 + 6H+ → 2Mn2+ + 5O2 + 8H2O
  const volSample = randChoice([10, 20, 25]);   // cm³ H2O2 taken
  const flaskVol = randChoice([100, 250, 500]);
  const aliquot = randChoice([10, 20, 25]);
  const concKMnO4 = randConc(0.005, 0.050);
  const titre = randTitre();

  const molKMnO4 = concKMnO4 * (titre / 1000);
  // ratio KMnO4 : H2O2 = 2 : 5
  const molH2O2_aliquot = molKMnO4 * (5 / 2);
  const molH2O2_flask = molH2O2_aliquot * (flaskVol / aliquot);
  // original H2O2 concentration (before dilution to flask)
  const concH2O2_orig = molH2O2_flask / (volSample / 1000);

  const M_H2O2 = 2 * RAM.H + 2 * RAM.O; // 34.0

  const ramInfo = ramOn
    ? `(Relative atomic masses: H = 1.0, O = 16.0, K = 39.1, Mn = 55.0)`
    : null;

  return {
    category: 'F',
    variant: 'F5',
    title: 'Redox Titration — Hydrogen Peroxide Analysis',
    description: 'Determine original [H₂O₂] from titration of diluted sample with KMnO₄',
    problemStatement:
      `A sample of hydrogen peroxide solution was analysed by pipetting ${volSample}.0 cm³ into ` +
      `a ${flaskVol}.0 cm³ volumetric flask and making up to the mark with distilled water. ` +
      `A ${aliquot}.0 cm³ aliquot of the diluted solution was acidified with dilute sulphuric acid ` +
      `and titrated with potassium manganate(VII) (KMnO₄) of concentration ${concKMnO4} mol/dm³. ` +
      `The average titre was ${titre} cm³.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the original concentration of H₂O₂ in mol/dm³.`,
    equation: '2MnO₄⁻(aq) + 5H₂O₂(aq) + 6H⁺(aq) → 2Mn²⁺(aq) + 5O₂(g) + 8H₂O(l)',
    solution: [
      {
        step: 1,
        title: 'Write ionic equation; identify mole ratio KMnO₄ : H₂O₂ = 2 : 5',
        content:
          `2MnO₄⁻(aq) + 5H₂O₂(aq) + 6H⁺(aq) → 2Mn²⁺(aq) + 5O₂(g) + 8H₂O(l)\n` +
          `Mole ratio KMnO₄ : H₂O₂ = 2 : 5`,
      },
      {
        step: 2,
        title: 'Moles of KMnO₄ used',
        content:
          `n(KMnO₄) = ${concKMnO4} × ${sf(titre / 1000, 4)} = ${sfStr(molKMnO4, 4)} mol`,
      },
      {
        step: 3,
        title: 'Moles of H₂O₂ in the aliquot',
        content:
          `n(H₂O₂) = ${sfStr(molKMnO4, 4)} × (5/2) = ${sfStr(molH2O2_aliquot, 4)} mol`,
      },
      {
        step: 4,
        title: 'Scale up to full flask',
        content:
          `n(H₂O₂) in ${flaskVol}.0 cm³ = ${sfStr(molH2O2_aliquot, 4)} × (${flaskVol}.0 / ${aliquot}.0)\n` +
          `= ${sfStr(molH2O2_flask, 4)} mol`,
      },
      {
        step: 5,
        title: 'Calculate original [H₂O₂]',
        content:
          `These moles came from ${volSample}.0 cm³ of original H₂O₂.\n` +
          `[H₂O₂]_orig = ${sfStr(molH2O2_flask, 4)} / ${sf(volSample / 1000, 4)}\n` +
          `= ${sfStr(concH2O2_orig, 3)} mol/dm³`,
      },
    ],
    finalAnswer: `Original concentration of H₂O₂ = ${sfStr(concH2O2_orig, 3)} mol/dm³`,
    notes: [
      'H₂O₂ acts as a reducing agent here — it is oxidised from −1 to 0 oxidation state (as O₂).',
      'KMnO₄ is self-indicating: endpoint is first permanent pale pink colour.',
      'The acidification must use dilute H₂SO₄ (not HCl) to avoid Cl⁻ interference.',
    ],
    ramInfo,
  };
}

// ============================================================
// F6 — Potassium Dichromate(VI) Titration: [FeSO₄]
// ============================================================
export function generateF6(ramOn) {
  const rxn = REDOX_SYSTEMS[2]; // K2Cr2O7 / FeSO4
  const volSample = parseFloat(sfStr(randAliquot(), 4));
  const concK2Cr2O7 = randConc(0.01, 0.10);
  const titre = randTitre();

  const molCr2O7 = concK2Cr2O7 * (titre / 1000);
  // Cr2O72- : Fe2+ = 1 : 6
  const molFe2 = molCr2O7 * 6;
  const concFe2 = molFe2 / (volSample / 1000);
  const concFe2_g = concFe2 * RAM.Fe;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'F',
    variant: 'F6',
    title: 'Redox Titration — [Fe²⁺] by Potassium Dichromate(VI)',
    description: 'Determine [Fe²⁺] from titration with acidified K₂Cr₂O₇',
    problemStatement:
      `To determine the concentration of an iron(II) sulphate solution, ${volSample} cm³ ` +
      `of the solution was acidified with dilute sulphuric acid and titrated with ` +
      `acidified potassium dichromate(VI) (K₂Cr₂O₇) of concentration ${concK2Cr2O7} mol/dm³. ` +
      `The average titre was ${titre} cm³. ` +
      `The endpoint was detected when the solution changed from orange to green.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the ionic equation for this reaction.` +
      `\n(b) Calculate the concentration of Fe²⁺ in mol/dm³ and g/dm³.`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Ionic equation and half-equations',
        content:
          `Reduction: Cr₂O₇²⁻(aq) + 14H⁺(aq) + 6e⁻ → 2Cr³⁺(aq) + 7H₂O(l)\n` +
          `Oxidation: Fe²⁺(aq) → Fe³⁺(aq) + e⁻  (×6)\n\n` +
          `Overall: ${rxn.equation}\n` +
          `Mole ratio Cr₂O₇²⁻ : Fe²⁺ = 1 : 6`,
      },
      {
        step: 2,
        title: 'Moles of K₂Cr₂O₇ used',
        content:
          `n(K₂Cr₂O₇) = ${concK2Cr2O7} × ${sf(titre / 1000, 4)} = ${sfStr(molCr2O7, 4)} mol`,
      },
      {
        step: 3,
        title: 'Moles of Fe²⁺',
        content:
          `n(Fe²⁺) = ${sfStr(molCr2O7, 4)} × 6 = ${sfStr(molFe2, 4)} mol`,
      },
      {
        step: 4,
        title: 'Concentration of Fe²⁺',
        content:
          `[Fe²⁺] = ${sfStr(molFe2, 4)} / ${sf(volSample / 1000, 4)} = ${sfStr(concFe2, 3)} mol/dm³\n\n` +
          `In g/dm³: M(Fe) = ${RAM.Fe} g/mol\n` +
          `Concentration = ${sfStr(concFe2, 3)} × ${RAM.Fe} = ${sfStr(concFe2_g, 3)} g/dm³`,
      },
    ],
    finalAnswer:
      `(a) ${rxn.equation}\n` +
      `(b) [Fe²⁺] = ${sfStr(concFe2, 3)} mol/dm³ = ${sfStr(concFe2_g, 3)} g/dm³`,
    notes: [
      `Colour change: ${rxn.colourChange}. Cr₂O₇²⁻ (orange) is reduced to Cr³⁺ (green).`,
      'Unlike KMnO₄, K₂Cr₂O₇ is not as clearly self-indicating; a diphenylamine indicator is sometimes used.',
      'The solution must be acidified with H₂SO₄ to provide H⁺ for the reduction half-equation.',
    ],
    ramInfo,
  };
}

// ============================================================
// G3 — Acid Concentration from H₂ Gas Volume
// ============================================================
export function generateG3(ramOn) {
  const METAL_ACID_REACTIONS = [
    { metal: 'Mg', metalName: 'magnesium', M_metal: RAM.Mg, acidFormula: 'HCl', acidName: 'hydrochloric acid', metalRatio: 1, acidRatio: 2, H2Ratio: 1, equation: 'Mg(s) + 2HCl(aq) → MgCl₂(aq) + H₂(g)', ramElems: 'H = 1.0, Mg = 24.3, Cl = 35.5' },
    { metal: 'Zn', metalName: 'zinc', M_metal: RAM.Zn, acidFormula: 'HCl', acidName: 'hydrochloric acid', metalRatio: 1, acidRatio: 2, H2Ratio: 1, equation: 'Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g)', ramElems: 'H = 1.0, Cl = 35.5, Zn = 65.4' },
    { metal: 'Fe', metalName: 'iron', M_metal: RAM.Fe, acidFormula: 'HCl', acidName: 'hydrochloric acid', metalRatio: 1, acidRatio: 2, H2Ratio: 1, equation: 'Fe(s) + 2HCl(aq) → FeCl₂(aq) + H₂(g)', ramElems: 'H = 1.0, Cl = 35.5, Fe = 55.8' },
    { metal: 'Mg', metalName: 'magnesium', M_metal: RAM.Mg, acidFormula: 'H₂SO₄', acidName: 'dilute sulphuric acid', metalRatio: 1, acidRatio: 1, H2Ratio: 1, equation: 'Mg(s) + H₂SO₄(aq) → MgSO₄(aq) + H₂(g)', ramElems: 'H = 1.0, O = 16.0, Mg = 24.3, S = 32.1' },
  ];
  const rxn = randChoice(METAL_ACID_REACTIONS);
  const volAcid = parseFloat(sfStr(randAliquot(), 4));
  const concActual = randConc(0.10, 2.00);
  const molAcid = concActual * (volAcid / 1000);
  const molH2 = molAcid * (rxn.H2Ratio / rxn.acidRatio);
  const volH2_cm3 = sfStr(molH2 * MOLAR_VOL * 1000, 3);

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'G',
    variant: 'G3',
    title: 'Metal + Acid — Find Acid Concentration from H₂ Volume',
    description: 'Excess metal reacts with acid of unknown concentration; [acid] found from H₂ volume',
    problemStatement:
      `Excess ${rxn.metalName} (${rxn.metal}) is added to ${volAcid} cm³ of ${rxn.acidName} ` +
      `of unknown concentration. The hydrogen gas produced occupies ${volH2_cm3} cm³ at r.t.p.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the original concentration of the ${rxn.acidName}.`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Write equation; acid is the limiting reagent (metal is excess)',
        content:
          `${rxn.equation}\n` +
          `Since ${rxn.metal} is in excess, ALL the acid reacts.\n` +
          `Mole ratio ${rxn.acidFormula} : H₂ = ${rxn.acidRatio} : ${rxn.H2Ratio}`,
      },
      {
        step: 2,
        title: 'Calculate moles of H₂ collected',
        content:
          `n(H₂) = V / molar volume = ${sf(parseFloat(volH2_cm3) / 1000, 4)} dm³ / ${MOLAR_VOL}\n` +
          `= ${sfStr(molH2, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate moles of ${rxn.acidFormula}`,
        content:
          `Ratio ${rxn.acidFormula} : H₂ = ${rxn.acidRatio} : ${rxn.H2Ratio}\n` +
          `n(${rxn.acidFormula}) = ${sfStr(molH2, 4)} × (${rxn.acidRatio}/${rxn.H2Ratio}) = ${sfStr(molAcid, 4)} mol`,
      },
      {
        step: 4,
        title: 'Calculate concentration of acid',
        content:
          `[${rxn.acidFormula}] = ${sfStr(molAcid, 4)} / ${sf(volAcid / 1000, 4)}\n` +
          `= ${sfStr(concActual, 3)} mol/dm³`,
      },
    ],
    finalAnswer: `Concentration of ${rxn.acidName} = ${sfStr(concActual, 3)} mol/dm³`,
    notes: [
      'Metal in excess guarantees all acid reacts, making the acid the limiting reagent and the basis for calculation.',
    ],
    ramInfo,
  };
}

// ============================================================
// G4 — Limiting Reagent: Metal + Acid (Combined)
// ============================================================
export function generateG4(ramOn) {
  const METAL_ACID_REACTIONS = [
    { metal: 'Mg', metalName: 'magnesium', M_metal: RAM.Mg, acidFormula: 'HCl', acidName: 'hydrochloric acid', metalRatio: 1, acidRatio: 2, H2Ratio: 1, equation: 'Mg(s) + 2HCl(aq) → MgCl₂(aq) + H₂(g)', ramElems: 'H = 1.0, Mg = 24.3, Cl = 35.5' },
    { metal: 'Zn', metalName: 'zinc', M_metal: RAM.Zn, acidFormula: 'HCl', acidName: 'hydrochloric acid', metalRatio: 1, acidRatio: 2, H2Ratio: 1, equation: 'Zn(s) + 2HCl(aq) → ZnCl₂(aq) + H₂(g)', ramElems: 'H = 1.0, Cl = 35.5, Zn = 65.4' },
    { metal: 'Zn', metalName: 'zinc', M_metal: RAM.Zn, acidFormula: 'H₂SO₄', acidName: 'dilute sulphuric acid', metalRatio: 1, acidRatio: 1, H2Ratio: 1, equation: 'Zn(s) + H₂SO₄(aq) → ZnSO₄(aq) + H₂(g)', ramElems: 'H = 1.0, O = 16.0, S = 32.1, Zn = 65.4' },
  ];
  const rxn = randChoice(METAL_ACID_REACTIONS);
  const massMetal = parseFloat(sfStr(randMass(0.20, 4.00), 4));
  const volAcid = parseFloat(sfStr(randAliquot(), 4));
  const concAcid = randConc(0.10, 2.00);

  const molMetal = massMetal / rxn.M_metal;
  const molAcid = concAcid * (volAcid / 1000);
  const molAcidNeeded = molMetal * (rxn.acidRatio / rxn.metalRatio);
  const metalLimiting = molAcid >= molAcidNeeded;

  const limitingMol = metalLimiting ? molMetal : molAcid * (rxn.metalRatio / rxn.acidRatio);
  const molH2 = limitingMol * (rxn.H2Ratio / rxn.metalRatio);
  const volH2_dm3 = molH2 * MOLAR_VOL;
  const volH2_cm3 = volH2_dm3 * 1000;
  const limitingName = metalLimiting ? rxn.metalName : rxn.acidName;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'G',
    variant: 'G4',
    title: 'Metal + Acid — Limiting Reagent (H₂ Volume)',
    description: 'Both reactant amounts given; identify limiting reagent and H₂ volume',
    problemStatement:
      `A student adds ${massMetal} g of ${rxn.metalName} (${rxn.metal}) powder to ` +
      `${volAcid} cm³ of ${rxn.acidName} of concentration ${concAcid} mol/dm³. ` +
      `The hydrogen gas evolved is collected over water at r.t.p.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Determine the limiting reagent, showing your working.` +
      `\n(b) Calculate the volume of hydrogen gas produced at r.t.p. (molar volume = ${MOLAR_VOL} dm³/mol).`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Mole ratio from balanced equation',
        content:
          `${rxn.equation}\n` +
          `Ratio ${rxn.metal} : ${rxn.acidFormula} : H₂ = ${rxn.metalRatio} : ${rxn.acidRatio} : ${rxn.H2Ratio}`,
      },
      {
        step: 2,
        title: 'Calculate moles of each reactant',
        content:
          `n(${rxn.metal}) = ${massMetal} / ${rxn.M_metal} = ${sfStr(molMetal, 4)} mol\n` +
          `n(${rxn.acidFormula}) = ${concAcid} × ${sf(volAcid / 1000, 4)} = ${sfStr(molAcid, 4)} mol`,
      },
      {
        step: 3,
        title: 'Identify limiting reagent',
        content:
          `For all ${rxn.metal} to react: n(${rxn.acidFormula}) needed = ${sfStr(molMetal, 4)} × ${rxn.acidRatio}/${rxn.metalRatio} = ${sfStr(molAcidNeeded, 4)} mol\n` +
          (metalLimiting
            ? `Actual acid (${sfStr(molAcid, 4)}) ≥ required (${sfStr(molAcidNeeded, 4)}) → ${rxn.metalName} is LIMITING.`
            : `Actual acid (${sfStr(molAcid, 4)}) < required (${sfStr(molAcidNeeded, 4)}) → ${rxn.acidName} is LIMITING.`),
      },
      {
        step: 4,
        title: 'Calculate moles of H₂ from limiting reagent',
        content:
          `n(limiting) = ${sfStr(limitingMol, 4)} mol\n` +
          `n(H₂) = ${sfStr(limitingMol, 4)} × (${rxn.H2Ratio}/${rxn.metalRatio}) = ${sfStr(molH2, 4)} mol`,
      },
      {
        step: 5,
        title: 'Volume of H₂ at r.t.p.',
        content:
          `V(H₂) = ${sfStr(molH2, 4)} × ${MOLAR_VOL} = ${sfStr(volH2_dm3, 3)} dm³ = ${sfStr(volH2_cm3, 3)} cm³`,
      },
    ],
    finalAnswer:
      `(a) Limiting reagent: ${limitingName}\n` +
      `(b) V(H₂) = ${sfStr(volH2_dm3, 3)} dm³ (${sfStr(volH2_cm3, 3)} cm³)`,
    notes: [`Molar volume at r.t.p. = ${MOLAR_VOL} dm³/mol applies to all gases.`],
    ramInfo,
  };
}

// ============================================================
// I2 — Combustion: Mass of Fuel to Produce Given CO₂
// ============================================================
export function generateI2(ramOn) {
  const fuel = randChoice(FUELS);
  const volCO2_dm3 = parseFloat(sfStr(randFloat(1.0, 50.0, 1), 3));
  const molCO2 = volCO2_dm3 / MOLAR_VOL;
  const molFuel = molCO2 / fuel.CO2produced;
  const massFuel = molFuel * fuel.M;

  const equationToShow = fuel.equationDisplay || fuel.equationScaled || fuel.equation;

  const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const getCoeff = (eqn, species) => {
    const re = new RegExp(`(^|\\s)(\\d+(?:\\.\\d+)?)?\\s*${escapeRegExp(species)}\\b`);
    const m = String(eqn).match(re);
    if (!m) return null;
    return m[2] ? Number(m[2]) : 1;
  };
  const coeffFuel = getCoeff(equationToShow, fuel.formula) ?? 1;
  const coeffCO2 = getCoeff(equationToShow, 'CO₂') ?? fuel.CO2produced;
  const ratioFuelToCO2 = coeffCO2 / coeffFuel;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${fuel.ramElems})`
    : null;

  return {
    category: 'I',
    variant: 'I2',
    title: 'Combustion — Mass of Fuel Required for Given CO₂',
    description: 'Reverse calculation: find mass of fuel needed to produce a specified volume of CO₂',
    problemStatement:
      `A process requires ${volCO2_dm3} dm³ of carbon dioxide at r.t.p. ` +
      `This gas is to be obtained by the complete combustion of ${fuel.name} (${fuel.formula}).` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the balanced equation for the complete combustion of ${fuel.name}.` +
      `\n(b) Calculate the mass of ${fuel.name} required. (Molar volume at r.t.p. = ${MOLAR_VOL} dm³/mol)`,
    equation: equationToShow,
    solution: [
      {
        step: 1,
        title: 'Balanced combustion equation',
        content:
          `${equationToShow}\n` +
          `For each mol ${fuel.formula} burned: ${sfStr(ratioFuelToCO2, 4)} mol CO₂ produced.`,
      },
      {
        step: 2,
        title: 'Calculate moles of CO₂ needed',
        content:
          `n(CO₂) = V / molar volume = ${volCO2_dm3} / ${MOLAR_VOL}\n` +
          `= ${sfStr(molCO2, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate moles of ${fuel.formula} required`,
        content:
          `From equation, ratio ${fuel.formula} : CO₂ = 1 : ${sfStr(ratioFuelToCO2, 4)}\n` +
          `n(${fuel.formula}) = ${sfStr(molCO2, 4)} × (1/${sfStr(ratioFuelToCO2, 4)}) = ${sfStr(molFuel, 4)} mol`,
      },
      {
        step: 4,
        title: `Calculate mass of ${fuel.name}`,
        content:
          `M(${fuel.formula}) = ${sfStr(fuel.M, 4)} g/mol\n` +
          `Mass = ${sfStr(molFuel, 4)} × ${sfStr(fuel.M, 4)} = ${sfStr(massFuel, 3)} g`,
      },
    ],
    finalAnswer:
      `(a) ${equationToShow}\n` +
      `(b) Mass of ${fuel.name} required = ${sfStr(massFuel, 3)} g`,
    notes: ['Complete combustion is assumed — insufficient oxygen leads to CO and carbon (soot).'],
    ramInfo,
  };
}

// ============================================================
// I4 — Combustion: Volume of Air Required
// ============================================================
export function generateI4(ramOn) {
  const fuel = randChoice(FUELS);
  const massFuel = parseFloat(sfStr(randMass(0.50, 5.00), 4));
  const molFuel = massFuel / fuel.M;
  const molO2 = molFuel * fuel.O2needed;
  const volO2_dm3 = molO2 * MOLAR_VOL;
  const volAir_dm3 = volO2_dm3 / 0.21;  // O2 = 21% by volume of air

  const equationToShow = fuel.equationDisplay || fuel.equationScaled || fuel.equation;

  const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const getCoeff = (eqn, species) => {
    const re = new RegExp(`(^|\\s)(\\d+(?:\\.\\d+)?)?\\s*${escapeRegExp(species)}\\b`);
    const m = String(eqn).match(re);
    if (!m) return null;
    return m[2] ? Number(m[2]) : 1;
  };
  const coeffFuel = getCoeff(equationToShow, fuel.formula) ?? 1;
  const coeffO2 = getCoeff(equationToShow, 'O₂') ?? fuel.O2needed;
  const ratioFuelToO2 = coeffO2 / coeffFuel;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${fuel.ramElems})`
    : null;

  return {
    category: 'I',
    variant: 'I4',
    title: 'Combustion — Volume of Air Required',
    description: 'Calculate volume of air needed for complete combustion of a fuel (O₂ = 21% of air)',
    problemStatement:
      `A student burns ${massFuel} g of ${fuel.name} (${fuel.formula}) completely in air. ` +
      `Oxygen makes up 21% by volume of air.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the minimum volume of air required at r.t.p. for complete combustion. ` +
      `(Molar volume at r.t.p. = ${MOLAR_VOL} dm³/mol)`,
    equation: equationToShow,
    solution: [
      {
        step: 1,
        title: 'Balanced equation and O₂ needed per mol fuel',
        content:
          `${equationToShow}\n` +
          `Mole ratio ${fuel.formula} : O₂ = 1 : ${sfStr(ratioFuelToO2, 4)}`,
      },
      {
        step: 2,
        title: `Calculate moles of ${fuel.formula}`,
        content:
          `n(${fuel.formula}) = ${massFuel} / ${sfStr(fuel.M, 4)} = ${sfStr(molFuel, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate moles and volume of O₂ needed',
        content:
          `n(O₂) = ${sfStr(molFuel, 4)} × ${fuel.O2needed} = ${sfStr(molO2, 4)} mol\n` +
          `V(O₂) = ${sfStr(molO2, 4)} × ${MOLAR_VOL} = ${sfStr(volO2_dm3, 3)} dm³`,
      },
      {
        step: 4,
        title: 'Calculate volume of air (O₂ = 21% by volume)',
        content:
          `V(air) = V(O₂) / 0.21 = ${sfStr(volO2_dm3, 3)} / 0.21\n` +
          `= ${sfStr(volAir_dm3, 3)} dm³`,
      },
    ],
    finalAnswer: `Minimum volume of air required = ${sfStr(volAir_dm3, 3)} dm³`,
    notes: [
      'This is the theoretical minimum — in practice, excess air is used to ensure complete combustion.',
      'Incomplete combustion (insufficient O₂) produces toxic CO and/or carbon (soot).',
    ],
    ramInfo,
  };
}

// ============================================================
// J3 — Thermal Decomposition: Percentage Yield
// ============================================================
export function generateJ3(ramOn) {
  const decomp = randChoice(DECOMPOSITIONS);
  const massPure = parseFloat(sfStr(randMass(1.0, 6.0), 4));

  const molCompound = massPure / decomp.M_compound;
  const molSolid = molCompound * (decomp.solidRatio / decomp.compoundRatio);
  const theoreticalYield = molSolid * decomp.M_solid;
  const percentYield = randFloat(65, 99, 1);
  const actualYield = parseFloat(sfStr((percentYield / 100) * theoreticalYield, 4));

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${decomp.ramElems})`
    : null;

  return {
    category: 'J',
    variant: 'J3',
    title: 'Thermal Decomposition — Percentage Yield',
    description: 'Calculate theoretical yield of solid product and percentage yield',
    problemStatement:
      `A student heated ${massPure} g of pure ${decomp.compoundName} (${decomp.compound}) ` +
      `in a crucible until decomposition was complete. ` +
      `After cooling, the mass of the solid residue was ${actualYield} g.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the balanced equation for the decomposition.` +
      `\n(b) Calculate the theoretical yield of ${decomp.solidProductName} (${decomp.solidProduct}).` +
      `\n(c) Calculate the percentage yield.`,
    equation: decomp.equation,
    solution: [
      {
        step: 1,
        title: 'Balanced equation',
        content:
          `${decomp.equation}\n` +
          `Ratio ${decomp.compound} : ${decomp.solidProduct} = ${decomp.compoundRatio} : ${decomp.solidRatio}`,
      },
      {
        step: 2,
        title: `Calculate moles of ${decomp.compound}`,
        content:
          `M(${decomp.compound}) = ${sfStr(decomp.M_compound, 4)} g/mol\n` +
          `n(${decomp.compound}) = ${massPure} / ${sfStr(decomp.M_compound, 4)} = ${sfStr(molCompound, 4)} mol`,
      },
      {
        step: 3,
        title: `Theoretical yield of ${decomp.solidProduct}`,
        content:
          `n(${decomp.solidProduct}) = ${sfStr(molCompound, 4)} × (${decomp.solidRatio}/${decomp.compoundRatio}) = ${sfStr(molSolid, 4)} mol\n` +
          `M(${decomp.solidProduct}) = ${sfStr(decomp.M_solid, 4)} g/mol\n` +
          `Theoretical yield = ${sfStr(molSolid, 4)} × ${sfStr(decomp.M_solid, 4)} = ${sfStr(theoreticalYield, 3)} g`,
      },
      {
        step: 4,
        title: 'Percentage yield',
        content:
          `% yield = (actual yield / theoretical yield) × 100\n` +
          `= (${actualYield} / ${sfStr(theoreticalYield, 3)}) × 100\n` +
          `= ${sfStr(percentYield, 3)}%`,
      },
    ],
    finalAnswer:
      `(a) ${decomp.equation}\n` +
      `(b) Theoretical yield of ${decomp.solidProduct} = ${sfStr(theoreticalYield, 3)} g\n` +
      `(c) Percentage yield = ${sfStr(percentYield, 3)}%`,
    notes: [
      'Percentage yield < 100% because some product is lost during transfer, or the reaction is incomplete.',
      decomp.observation,
    ],
    ramInfo,
  };
}

// ============================================================
// J4 — Water of Crystallisation from Decomposition
// ============================================================
export function generateJ4(ramOn) {
  // Hydrated compound loses water on heating: compound·xH2O → compound + xH2O
  const compounds = [
    { formula: 'Na₂CO₃', name: 'sodium carbonate', M: 2 * RAM.Na + RAM.C + 3 * RAM.O, ramElems: 'H = 1.0, C = 12.0, O = 16.0, Na = 23.0' },
    { formula: 'CuSO₄', name: 'copper(II) sulphate', M: RAM.Cu + RAM.S + 4 * RAM.O, ramElems: 'H = 1.0, O = 16.0, S = 32.1, Cu = 63.5' },
    { formula: 'MgSO₄', name: 'magnesium sulphate', M: RAM.Mg + RAM.S + 4 * RAM.O, ramElems: 'H = 1.0, O = 16.0, Mg = 24.3, S = 32.1' },
    { formula: 'FeSO₄', name: 'iron(II) sulphate', M: RAM.Fe + RAM.S + 4 * RAM.O, ramElems: 'H = 1.0, O = 16.0, S = 32.1, Fe = 55.8' },
  ];
  const compound = randChoice(compounds);
  const M_H2O = 2 * RAM.H + RAM.O;
  const x = randInt(4, 10);
  const M_hydrated = compound.M + x * M_H2O;

  const massSample = parseFloat(sfStr(randMass(1.0, 6.0), 4));
  const molCompound = massSample / M_hydrated;
  const massLost = parseFloat(sfStr(molCompound * x * M_H2O, 4));

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${compound.ramElems})`
    : null;

  return {
    category: 'J',
    variant: 'J4',
    title: `Water of Crystallisation — Determined by Heating`,
    description: 'Calculate x in a hydrated salt from the mass of water lost on heating',
    problemStatement:
      `On strong heating, ${massSample} g of hydrated ${compound.name} (${compound.formula}·xH₂O) ` +
      `lost ${massLost} g of water of crystallisation.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nDetermine the value of x.`,
    equation: `${compound.formula}·xH₂O(s) → ${compound.formula}(s) + xH₂O(g)`,
    solution: [
      {
        step: 1,
        title: 'Identify the mass of anhydrous salt',
        content:
          `Mass of ${compound.formula}·xH₂O = ${massSample} g\n` +
          `Mass of water lost = ${massLost} g\n` +
          `Mass of anhydrous ${compound.formula} = ${massSample} − ${massLost} = ${sfStr(massSample - massLost, 4)} g`,
      },
      {
        step: 2,
        title: `Calculate moles of ${compound.formula}`,
        content:
          `M(${compound.formula}) = ${sfStr(compound.M, 4)} g/mol\n` +
          `n(${compound.formula}) = ${sfStr(massSample - massLost, 4)} / ${sfStr(compound.M, 4)} = ${sfStr(molCompound, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate moles of H₂O lost',
        content:
          `M(H₂O) = 2(1.0) + 16.0 = 18.0 g/mol\n` +
          `n(H₂O) = ${massLost} / 18.0 = ${sfStr(molCompound * x, 4)} mol`,
      },
      {
        step: 4,
        title: 'Calculate x',
        content:
          `x = n(H₂O) / n(${compound.formula})\n` +
          `x = ${sfStr(molCompound * x, 4)} / ${sfStr(molCompound, 4)}\n` +
          `x = ${x}\n` +
          `∴ Formula = ${compound.formula}·${x}H₂O`,
      },
    ],
    finalAnswer: `x = ${x}  (Formula: ${compound.formula}·${x}H₂O)`,
    notes: [
      'Heating must continue to constant mass to ensure all water of crystallisation is removed.',
      `M(${compound.formula}·${x}H₂O) = ${sfStr(compound.M, 4)} + ${x} × 18.0 = ${sfStr(M_hydrated, 4)} g/mol`,
    ],
    ramInfo,
  };
}

// ============================================================
// M3 — Hess's Law: ΔHf from Combustion Data
// ============================================================
export function generateM3(ramOn) {
  // Compounds for which combustion enthalpy can be used to find ΔHf
  const targets = [
    {
      formula: 'C₂H₅OH', name: 'ethanol',
      // C2H5OH + 3O2 → 2CO2 + 3H2O
      // ΔHf = 2×ΔHc(C) + 3×ΔHc(H2) - ΔHc(C2H5OH)
      C: 2, H2: 3,
      dHc_fuel: -1367, dHc_C: -394, dHc_H2: -286,
      ramElems: 'H = 1.0, C = 12.0, O = 16.0',
    },
    {
      formula: 'C₂H₆', name: 'ethane',
      C: 2, H2: 3,
      dHc_fuel: -1560, dHc_C: -394, dHc_H2: -286,
      ramElems: 'H = 1.0, C = 12.0',
    },
    {
      formula: 'CH₃OH', name: 'methanol',
      C: 1, H2: 2,
      dHc_fuel: -726, dHc_C: -394, dHc_H2: -286,
      ramElems: 'H = 1.0, C = 12.0, O = 16.0',
    },
  ];
  const t = randChoice(targets);
  // ΔHf = n(C) × ΔHc(C) + n(H2) × ΔHc(H2) - ΔHc(fuel)
  const dHf = t.C * t.dHc_C + t.H2 * t.dHc_H2 - t.dHc_fuel;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${t.ramElems})`
    : null;

  return {
    category: 'M',
    variant: 'M3',
    title: "Hess's Law — Enthalpy of Formation from Combustion Data",
    description: 'Use combustion enthalpies and Hess\'s Law to calculate ΔHf°',
    problemStatement:
      `Given the following standard enthalpy changes of combustion:\n` +
      `ΔHc°[C(s)] = ${t.dHc_C} kJ/mol\n` +
      `ΔHc°[H₂(g)] = ${t.dHc_H2} kJ/mol\n` +
      `ΔHc°[${t.formula}] = ${t.dHc_fuel} kJ/mol` +
      (ramInfo ? `\n${ramInfo}` : '') +
      `\n\nUse Hess's Law to calculate the standard enthalpy change of formation of ${t.name} (${t.formula}).`,
    equation: `${t.C}C(s) + ${t.H2}H₂(g) → ${t.formula}`,
    solution: [
      {
        step: 1,
        title: 'Write the target equation (formation of compound from elements)',
        content:
          `${t.C}C(s) + ${t.H2}H₂(g) → ${t.formula}\n` +
          `This is the formation reaction. ΔHf° = ?`,
      },
      {
        step: 2,
        title: "Construct the Hess's Law cycle",
        content:
          `Using:  ΔHf° + ΔHc°[${t.formula}] = ${t.C} × ΔHc°[C] + ${t.H2} × ΔHc°[H₂]\n\n` +
          `Rearranging:\n` +
          `ΔHf° = ${t.C} × ΔHc°[C] + ${t.H2} × ΔHc°[H₂] − ΔHc°[${t.formula}]`,
      },
      {
        step: 3,
        title: 'Substitute values',
        content:
          `ΔHf° = ${t.C}(${t.dHc_C}) + ${t.H2}(${t.dHc_H2}) − (${t.dHc_fuel})\n` +
          `= ${t.C * t.dHc_C} + ${t.H2 * t.dHc_H2} − (${t.dHc_fuel})\n` +
          `= ${sfStr(dHf, 4)} kJ/mol`,
      },
      {
        step: 4,
        title: 'Interpret result',
        content:
          `ΔHf° = ${sfStr(dHf, 4)} kJ/mol  (${dHf < 0 ? 'exothermic' : 'endothermic'})\n` +
          `Formation of ${t.name} from its elements ${dHf < 0 ? 'releases' : 'requires'} energy.`,
      },
    ],
    finalAnswer: `ΔHf° [${t.formula}] = ${sfStr(dHf, 4)} kJ/mol`,
    notes: [
      "Hess's Law: enthalpy change is path-independent — it depends only on initial and final states.",
      "ΔHf° = Σ n × ΔHc°(elements) − ΔHc°(compound)",
    ],
    ramInfo,
  };
}

// ============================================================
// M4 — Dissolution Enthalpy (Endothermic: NH₄Cl or KNO₃)
// ============================================================
export function generateM4(ramOn) {
  const salts = [
    { formula: 'NH₄Cl', name: 'ammonium chloride', M: RAM.N + 4 * RAM.H + RAM.Cl, ramElems: 'H = 1.0, N = 14.0, Cl = 35.5' },
    { formula: 'KNO₃', name: 'potassium nitrate', M: RAM.K + RAM.N + 3 * RAM.O, ramElems: 'N = 14.0, O = 16.0, K = 39.1' },
    { formula: 'NH₄NO₃', name: 'ammonium nitrate', M: 2 * RAM.N + 4 * RAM.H + 3 * RAM.O, ramElems: 'H = 1.0, N = 14.0, O = 16.0' },
  ];
  const salt = randChoice(salts);
  const massSalt = parseFloat(sfStr(randMass(1.0, 5.0), 4));
  const volWater = randChoice([50, 100, 150, 200]);
  const tempInitial = randTempInitial();
  const tempDrop = randFloat(3.0, 20.0, 1);  // negative ΔT for endothermic
  const tempFinal = parseFloat((tempInitial - tempDrop).toFixed(1));

  const massWater = volWater * 1.00;
  const c = 4.18;
  const q_J = massWater * c * tempDrop;  // heat absorbed by surroundings is released by water
  const q_kJ = q_J / 1000;
  const molSalt = massSalt / salt.M;
  const deltaH_sol = q_kJ / molSalt;  // positive: endothermic

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${salt.ramElems})`
    : null;

  return {
    category: 'M',
    variant: 'M4',
    title: `Enthalpy of Dissolution — ${salt.name} (Endothermic)`,
    description: 'Calculate ΔH of solution for an ionic salt that dissolves endothermically',
    problemStatement:
      `A student dissolved ${massSalt} g of ${salt.name} (${salt.formula}) in ${volWater} cm³ ` +
      `of water at ${tempInitial} °C in a polystyrene cup. ` +
      `The temperature of the solution fell to ${tempFinal} °C after dissolving. ` +
      `(Specific heat capacity = 4.18 J g⁻¹ K⁻¹; density of water = 1.00 g cm⁻³; ` +
      `heat capacity of polystyrene cup is negligible.)` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Calculate the enthalpy change of dissolution of ${salt.name} in kJ/mol.` +
      `\n(b) State whether the process is exothermic or endothermic and explain why the temperature fell.`,
    equation: `${salt.formula}(s) → ${salt.formula.replace('₄', '⁴⁺').replace('Cl', 'Cl⁻').replace('NO₃', 'NO₃⁻')}(aq)`,
    solution: [
      {
        step: 1,
        title: 'Calculate heat absorbed from the water',
        content:
          `Temperature change, ΔT = ${tempFinal} − ${tempInitial} = −${tempDrop} °C\n` +
          `(Temperature fell, so water lost heat to the dissolving salt)\n\n` +
          `q = m × c × |ΔT| = ${massWater} × 4.18 × ${tempDrop}\n` +
          `= ${sfStr(q_J, 4)} J = ${sfStr(q_kJ, 4)} kJ  [absorbed by salt]`,
      },
      {
        step: 2,
        title: `Calculate moles of ${salt.formula}`,
        content:
          `M(${salt.formula}) = ${sfStr(salt.M, 4)} g/mol\n` +
          `n(${salt.formula}) = ${massSalt} / ${sfStr(salt.M, 4)} = ${sfStr(molSalt, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate ΔH of dissolution per mole',
        content:
          `ΔH_sol = +q / n  (positive because heat was absorbed from surroundings)\n` +
          `= +${sfStr(q_kJ, 4)} / ${sfStr(molSalt, 4)}\n` +
          `= +${sfStr(deltaH_sol, 3)} kJ/mol`,
      },
      {
        step: 4,
        title: 'Interpretation',
        content:
          `ΔH_sol = +${sfStr(deltaH_sol, 3)} kJ/mol (POSITIVE → ENDOTHERMIC)\n` +
          `The dissolution absorbs heat energy from the water, causing the temperature to fall.\n` +
          `The ionic lattice energy required to break the crystal exceeds the hydration enthalpy released.`,
      },
    ],
    finalAnswer:
      `(a) ΔH of dissolution of ${salt.name} = +${sfStr(deltaH_sol, 3)} kJ/mol\n` +
      `(b) The process is ENDOTHERMIC — heat is absorbed from the water, so temperature falls.`,
    notes: [
      'Sign convention: ΔH > 0 is endothermic (absorbs heat from surroundings).',
      'This contrasts with dissolution of NaOH or H₂SO₄ in water, which are exothermic (temperature rises).',
    ],
    ramInfo,
  };
}
