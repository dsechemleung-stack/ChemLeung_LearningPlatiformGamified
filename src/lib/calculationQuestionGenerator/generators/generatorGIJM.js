// ============================================================
// GENERATOR G — Metal Reaction with Acid (Gas Volume)
// ============================================================
import { METAL_ACID_REACTIONS, FUELS, DECOMPOSITIONS, MM, RAM, sf } from '../data/chemicals.js';
import {
  randMass, randConc, randAliquot, randChoice, randFloat, randTitre,
  sfStr, randGasVol, randTempInitial, randTempRise, randWaterVol
} from '../utils/random.js';

const MOLAR_VOL = 24.0;

const DELTA_HC_LIT_KJ_PER_MOL = {
  // standard molar enthalpy of combustion, kJ/mol (298 K, approximate textbook values)
  'CH₄': -890,
  'C₂H₆': -1560,
  'C₃H₈': -2220,
  'C₄H₁₀': -2877,
  'C₂H₅OH': -1367,
  'CH₃OH': -726,
};

const DELTA_H_NEUT_LIT_KJ_PER_MOL = -57.1;

export function generateG1(ramOn) {
  const rxn = randChoice(METAL_ACID_REACTIONS);
  const mass = parseFloat(sfStr(randMass(0.10, 3.00), 4));

  const molMetal = mass / rxn.M_metal;
  const molH2 = molMetal * (rxn.H2Ratio / rxn.metalRatio);
  const volH2_dm3 = molH2 * MOLAR_VOL;
  const volH2_cm3 = volH2_dm3 * 1000;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'G',
    variant: 'G1',
    title: `Metal + Acid — Volume of H₂ from Metal Mass`,
    description: 'Calculate volume of hydrogen at r.t.p. from a known mass of metal (excess acid)',
    problemStatement:
      `A ${mass} g sample of ${rxn.metalName} (${rxn.metal}) ribbon is added to excess ` +
      `${rxn.acidName}. The hydrogen gas evolved is collected at room temperature and pressure (r.t.p.).` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the volume of hydrogen gas produced at r.t.p. (molar volume = ${MOLAR_VOL} dm³/mol).`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Balanced equation and mole ratio',
        content:
          `${rxn.equation}\n` +
          `Mole ratio: ${rxn.metal} : H₂ = ${rxn.metalRatio} : ${rxn.H2Ratio}\n` +
          `(Acid is in excess → all the ${rxn.metal} reacts)`,
      },
      {
        step: 2,
        title: `Calculate moles of ${rxn.metal}`,
        content:
          `n(${rxn.metal}) = mass / M = ${mass} / ${rxn.M_metal}\n` +
          `= ${sfStr(molMetal, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate moles of H₂',
        content:
          `n(H₂) = ${sfStr(molMetal, 4)} × (${rxn.H2Ratio}/${rxn.metalRatio})\n` +
          `= ${sfStr(molH2, 4)} mol`,
      },
      {
        step: 4,
        title: 'Calculate volume at r.t.p.',
        content:
          `V(H₂) = n × molar volume\n` +
          `= ${sfStr(molH2, 4)} × ${MOLAR_VOL}\n` +
          `= ${sfStr(volH2_dm3, 3)} dm³ = ${sfStr(volH2_cm3, 3)} cm³`,
      },
    ],
    finalAnswer: `Volume of H₂ at r.t.p. = ${sfStr(volH2_dm3, 3)} dm³ (= ${sfStr(volH2_cm3, 3)} cm³)`,
    notes: [
      `Only metals above hydrogen in the reactivity series react with dilute acid to give H₂.`,
      `Molar volume of any gas at r.t.p. = ${MOLAR_VOL} dm³/mol.`,
    ],
    ramInfo,
  };
}

export function generateG2(ramOn) {
  const rxn = randChoice(METAL_ACID_REACTIONS);
  const mass = parseFloat(sfStr(randMass(0.50, 5.00), 4));
  const purity = randFloat(60, 98, 1);  // %
  const massPure = (purity / 100) * mass;
  const molMetal = massPure / rxn.M_metal;
  const molH2 = molMetal * (rxn.H2Ratio / rxn.metalRatio);
  const volH2_cm3 = sfStr(molH2 * MOLAR_VOL * 1000, 3);

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'G',
    variant: 'G2',
    title: `Metal Purity — From H₂ Volume`,
    description: 'Calculate % purity of a metal sample from volume of H₂ collected',
    problemStatement:
      `When ${mass} g of an impure sample of ${rxn.metalName} (${rxn.metal}) is reacted with ` +
      `excess ${rxn.acidName}, the volume of hydrogen gas collected at r.t.p. is ${volH2_cm3} cm³.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the percentage purity of the ${rxn.metalName} sample.`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Assume only pure metal reacts',
        content:
          `${rxn.equation}\n` +
          `The impurity is assumed to be inert and does not react with the acid.`,
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
        title: `Calculate moles of pure ${rxn.metal}`,
        content:
          `From ratio ${rxn.metal} : H₂ = ${rxn.metalRatio} : ${rxn.H2Ratio}\n` +
          `n(${rxn.metal}) = ${sfStr(molH2, 4)} × (${rxn.metalRatio}/${rxn.H2Ratio})\n` +
          `= ${sfStr(molMetal, 4)} mol`,
      },
      {
        step: 4,
        title: 'Calculate mass of pure metal and % purity',
        content:
          `Mass of pure ${rxn.metal} = ${sfStr(molMetal, 4)} × ${rxn.M_metal} = ${sfStr(massPure, 4)} g\n\n` +
          `% purity = (${sfStr(massPure, 4)} / ${mass}) × 100\n` +
          `= ${sfStr(purity, 3)}%`,
      },
    ],
    finalAnswer: `Percentage purity of ${rxn.metalName} = ${sfStr(purity, 3)}%`,
    notes: [
      'Only the pure metal reacts with acid to produce H₂; impurities are assumed inert.',
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR I — Combustion (Complete)
// ============================================================

export function generateI1(ramOn) {
  const fuel = randChoice(FUELS);
  const mass = parseFloat(sfStr(randMass(0.50, 5.00), 4));
  const molFuel = mass / fuel.M;
  const molCO2 = molFuel * fuel.CO2produced;
  const volCO2_dm3 = molCO2 * MOLAR_VOL;
  const volCO2_cm3 = volCO2_dm3 * 1000;

  const equationToShow = fuel.equationDisplay || fuel.equationScaled || fuel.equation;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${fuel.ramElems})`
    : null;

  return {
    category: 'I',
    variant: 'I1',
    title: `Combustion — Volume of CO₂ Produced`,
    description: 'Calculate volume of CO₂ from complete combustion of a fuel',
    problemStatement:
      `A sample of ${fuel.name} (${fuel.formula}) of mass ${mass} g undergoes complete combustion ` +
      `in a plentiful supply of air at room temperature and pressure (r.t.p.).` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the balanced equation for the complete combustion of ${fuel.name}.` +
      `\n(b) Calculate the volume of carbon dioxide produced at r.t.p. (molar volume = ${MOLAR_VOL} dm³/mol).`,
    equation: equationToShow,
    solution: [
      {
        step: 1,
        title: 'Balanced combustion equation',
        content: `${equationToShow}\nFor every 1 mol ${fuel.formula}, ${fuel.CO2produced} mol CO₂ is produced.`,
      },
      {
        step: 2,
        title: `Calculate moles of ${fuel.formula}`,
        content:
          `M(${fuel.formula}) = ${sfStr(fuel.M, 4)} g/mol\n` +
          `n(${fuel.formula}) = ${mass} / ${sfStr(fuel.M, 4)} = ${sfStr(molFuel, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate moles of CO₂',
        content:
          `n(CO₂) = ${sfStr(molFuel, 4)} × ${fuel.CO2produced} = ${sfStr(molCO2, 4)} mol`,
      },
      {
        step: 4,
        title: 'Calculate volume of CO₂ at r.t.p.',
        content:
          `V(CO₂) = ${sfStr(molCO2, 4)} × ${MOLAR_VOL} = ${sfStr(volCO2_dm3, 3)} dm³\n` +
          `= ${sfStr(volCO2_cm3, 3)} cm³`,
      },
    ],
    finalAnswer:
      `(a) ${equationToShow}\n` +
      `(b) Volume of CO₂ = ${sfStr(volCO2_dm3, 3)} dm³ (= ${sfStr(volCO2_cm3, 3)} cm³)`,
    notes: [
      'Complete combustion requires excess oxygen — produces only CO₂ and H₂O.',
      'Incomplete combustion (insufficient O₂) produces CO and/or carbon (soot) instead.',
    ],
    ramInfo,
  };
}

export function generateI3(ramOn) {
  const fuel = randChoice(FUELS);
  const deltaHc_lit = DELTA_HC_LIT_KJ_PER_MOL[fuel.formula] ?? -1500;

  const equationToShow = fuel.equationDisplay || fuel.equationScaled || fuel.equation;

  const volWater = randWaterVol();
  const tempInitial = randTempInitial();

  // Choose a realistic temperature rise and back-calculate fuel mass from literature ΔHc
  const tempRise = randFloat(5.0, 20.0, 1);
  const tempFinal = parseFloat((tempInitial + tempRise).toFixed(1));

  // q = mcΔT
  const c = 4.18;  // J g-1 K-1
  const rho = 1.00; // g cm-3
  const massWater = volWater * rho;
  const q_J = massWater * c * tempRise;
  const q_kJ = q_J / 1000;

  // Use literature ΔHc to determine moles (and hence mass) of fuel burned
  const molFuel = q_kJ / Math.abs(deltaHc_lit);
  const massFuel = parseFloat(sfStr(molFuel * fuel.M, 4));
  // ΔHc per mol (negative = exothermic)
  const deltaHc = deltaHc_lit;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${fuel.ramElems})`
    : null;

  return {
    category: 'I',
    variant: 'I3',
    title: 'Combustion Calorimetry — Enthalpy of Combustion',
    description: 'Calculate molar enthalpy change of combustion from calorimetry data',
    problemStatement:
      `In a calorimetry experiment, burning ${massFuel} g of ${fuel.name} (${fuel.formula}) ` +
      `raised the temperature of ${volWater} cm³ of water from ${tempInitial} °C to ${tempFinal} °C. ` +
      `(Specific heat capacity of water = 4.18 J g⁻¹ K⁻¹; density of water = 1.00 g cm⁻³)` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the enthalpy change of combustion of ${fuel.name} in kJ/mol. ` +
      `State whether the process is exothermic or endothermic.`,
    equation: equationToShow,
    solution: [
      {
        step: 1,
        title: 'Calculate heat absorbed by water',
        content:
          `Mass of water = ${volWater} cm³ × 1.00 g cm⁻³ = ${massWater} g\n` +
          `Temperature rise, ΔT = ${tempFinal} − ${tempInitial} = ${sfStr(tempRise, 3)} °C (= ${sfStr(tempRise, 3)} K)\n` +
          `q = m × c × ΔT\n` +
          `q = ${massWater} × 4.18 × ${sfStr(tempRise, 3)}\n` +
          `q = ${sfStr(q_J, 4)} J = ${sfStr(q_kJ, 4)} kJ`,
      },
      {
        step: 2,
        title: `Calculate moles of ${fuel.name} burned`,
        content:
          `M(${fuel.formula}) = ${sfStr(fuel.M, 4)} g/mol\n` +
          `n(${fuel.formula}) = ${massFuel} / ${sfStr(fuel.M, 4)} = ${sfStr(molFuel, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate ΔHc per mole',
        content:
          `ΔHc = −q / n  (negative because combustion releases heat to surroundings)\n` +
          `ΔHc = −${sfStr(q_kJ, 4)} / ${sfStr(molFuel, 4)}\n` +
          `ΔHc = ${sfStr(deltaHc, 3)} kJ/mol`,
      },
      {
        step: 4,
        title: 'State whether exothermic or endothermic',
        content:
          `ΔHc = ${sfStr(deltaHc, 3)} kJ/mol (NEGATIVE)\n` +
          `The combustion of ${fuel.name} is EXOTHERMIC — energy is released to the surroundings.\n` +
          `The water temperature increases, confirming this.`,
      },
    ],
    finalAnswer:
      `ΔHc (${fuel.name}) = ${sfStr(deltaHc, 3)} kJ/mol\n` +
      `The reaction is exothermic (ΔHc < 0).`,
    notes: [
      `Standard ΔHc (literature value for ${fuel.name}): approximately ${sfStr(deltaHc_lit, 4)} kJ/mol.`,
      'In real experiments, the calculated ΔHc can deviate from literature due to heat loss, incomplete combustion, and heat absorbed by the apparatus.',
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR J — Thermal Decomposition
// ============================================================

export function generateJ1(ramOn) {
  const decomp = randChoice(DECOMPOSITIONS);
  const massSample = parseFloat(sfStr(randMass(1.0, 8.0), 4));
  const purity = randFloat(55, 98, 1); // %
  const massPure = (purity / 100) * massSample;
  const molCompound = massPure / decomp.M_compound;
  // mass loss = mol CO2 (or gas) × M_gas
  const massLoss = molCompound * (decomp.gasRatio / decomp.compoundRatio) * decomp.M_gas
    + (decomp.waterProduct ? molCompound * (decomp.waterMoles / decomp.compoundRatio) * decomp.M_water : 0);
  const massResidue = sfStr(massSample - massLoss, 4);

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${decomp.ramElems})`
    : null;

  return {
    category: 'J',
    variant: 'J1',
    title: `Thermal Decomposition — % Purity from Mass Loss`,
    description: 'Calculate % purity from mass of residue after heating',
    problemStatement:
      `A ${massSample} g sample of impure ${decomp.compoundName} (${decomp.compound}), ` +
      `obtained from ${decomp.context}, is heated strongly in a crucible until no further change in mass occurs. ` +
      `The mass of the solid residue is found to be ${massResidue} g.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the balanced equation for the thermal decomposition.` +
      `\n(b) Calculate the percentage by mass of ${decomp.compound} in the original sample.`,
    equation: decomp.equation,
    solution: [
      {
        step: 1,
        title: 'Balanced equation for decomposition',
        content:
          `${decomp.equation}\n` +
          `The gaseous product(s) escape, causing mass loss.`,
      },
      {
        step: 2,
        title: 'Calculate mass loss',
        content:
          `Mass loss = ${massSample} − ${massResidue} = ${sfStr(massSample - parseFloat(massResidue), 4)} g\n` +
          `This represents the mass of ${decomp.waterProduct ? 'CO₂ (and H₂O)' : 'CO₂'} driven off.`,
      },
      {
        step: 3,
        title: `Calculate moles of ${decomp.compound}`,
        content:
          `From the equation, ${decomp.compoundRatio} mol ${decomp.compound} produces ${decomp.gasRatio} mol CO₂.\n` +
          `M(CO₂) = ${sfStr(decomp.M_gas, 4)} g/mol\n` +
          `n(CO₂) = ${sfStr(massSample - parseFloat(massResidue), 4)} / ${sfStr(decomp.M_gas, 4)} = ${sfStr(molCompound * decomp.gasRatio / decomp.compoundRatio, 4)} mol\n` +
          `n(${decomp.compound}) = n(CO₂) × (${decomp.compoundRatio}/${decomp.gasRatio}) = ${sfStr(molCompound, 4)} mol`,
      },
      {
        step: 4,
        title: '% purity calculation',
        content:
          `M(${decomp.compound}) = ${sfStr(decomp.M_compound, 4)} g/mol\n` +
          `Mass of ${decomp.compound} = ${sfStr(molCompound, 4)} × ${sfStr(decomp.M_compound, 4)} = ${sfStr(massPure, 4)} g\n\n` +
          `% purity = (${sfStr(massPure, 4)} / ${massSample}) × 100 = ${sfStr(purity, 3)}%`,
      },
    ],
    finalAnswer: `% by mass of ${decomp.compound} = ${sfStr(purity, 3)}%`,
    notes: [
      `Observation: ${decomp.observation}`,
      'Heating must continue until constant mass is achieved (confirming complete decomposition).',
      'The impurities are assumed to be thermally stable and do not decompose.',
    ],
    ramInfo,
  };
}

export function generateJ2(ramOn) {
  const decomp = randChoice(DECOMPOSITIONS.filter(d => d.compound !== 'NaHCO₃')); // simpler ones
  const massSample = parseFloat(sfStr(randMass(1.0, 8.0), 4));
  const purity = randFloat(50, 95, 1);
  const massPure = (purity / 100) * massSample;
  const molCompound = massPure / decomp.M_compound;
  const molCO2 = molCompound * (decomp.gasRatio / decomp.compoundRatio);
  const volCO2_cm3 = sfStr(molCO2 * MOLAR_VOL * 1000, 3);

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${decomp.ramElems})`
    : null;

  return {
    category: 'J',
    variant: 'J2',
    title: `Thermal Decomposition — % Purity from Gas Volume`,
    description: 'Calculate % purity from volume of CO₂ collected at r.t.p.',
    problemStatement:
      `A ${massSample} g sample of a mineral containing ${decomp.compoundName} (${decomp.compound}) ` +
      `is heated strongly. The gas evolved is collected and found to occupy ${volCO2_cm3} cm³ at r.t.p.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the percentage by mass of ${decomp.compound} in the mineral. ` +
      `(Molar volume at r.t.p. = ${MOLAR_VOL} dm³/mol)`,
    equation: decomp.equation,
    solution: [
      {
        step: 1,
        title: 'Write balanced equation',
        content: `${decomp.equation}`,
      },
      {
        step: 2,
        title: 'Calculate moles of CO₂ collected',
        content:
          `V(CO₂) = ${volCO2_cm3} cm³ = ${sf(parseFloat(volCO2_cm3) / 1000, 4)} dm³\n` +
          `n(CO₂) = V / molar volume = ${sf(parseFloat(volCO2_cm3) / 1000, 4)} / ${MOLAR_VOL}\n` +
          `= ${sfStr(molCO2, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate moles of ${decomp.compound}`,
        content:
          `From equation, ${decomp.compoundRatio} mol ${decomp.compound} → ${decomp.gasRatio} mol CO₂\n` +
          `n(${decomp.compound}) = ${sfStr(molCO2, 4)} × (${decomp.compoundRatio}/${decomp.gasRatio})\n` +
          `= ${sfStr(molCompound, 4)} mol`,
      },
      {
        step: 4,
        title: '% purity',
        content:
          `M(${decomp.compound}) = ${sfStr(decomp.M_compound, 4)} g/mol\n` +
          `Mass of ${decomp.compound} = ${sfStr(molCompound, 4)} × ${sfStr(decomp.M_compound, 4)} = ${sfStr(massPure, 4)} g\n\n` +
          `% purity = (${sfStr(massPure, 4)} / ${massSample}) × 100 = ${sfStr(purity, 3)}%`,
      },
    ],
    finalAnswer: `% by mass of ${decomp.compound} in mineral = ${sfStr(purity, 3)}%`,
    notes: [
      `${decomp.observation}`,
      'CO₂ gas is identified by passing through limewater — milky precipitate of CaCO₃ confirms CO₂.',
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR M — Enthalpy Changes (Calorimetry)
// ============================================================

export function generateM1(ramOn) {
  // Neutralisation
  const ACID_BASE_PAIRS_SIMPLE = [
    { acid: 'HCl', acidName: 'hydrochloric acid', base: 'NaOH', baseName: 'sodium hydroxide',
      strong: true, saltName: 'NaCl' },
    { acid: 'HNO₃', acidName: 'nitric acid', base: 'NaOH', baseName: 'sodium hydroxide',
      strong: true, saltName: 'NaNO₃' },
    { acid: 'HCl', acidName: 'hydrochloric acid', base: 'KOH', baseName: 'potassium hydroxide',
      strong: true, saltName: 'KCl' },
  ];
  const pair = randChoice(ACID_BASE_PAIRS_SIMPLE);

  const c = 4.18;

  let volAcid = 0;
  let concAcid = 0;
  let volBase = 0;
  let concBase = 0;
  let tempInitial = 0;
  let tempRise = 0;
  let tempFinal = 0;
  let totalVol = 0;
  let massTotal = 0;
  let q_J = 0;
  let q_kJ = 0;
  let molAcid = 0;
  let molBase = 0;
  let molH2O = 0;

  // Generate conditions from the standard enthalpy of neutralisation so ΔH matches literature
  // Keep ΔT in a reasonable classroom range.
  for (let attempt = 0; attempt < 30; attempt++) {
    volAcid = randAliquot();
    volBase = randAliquot();
    concAcid = randConc(0.10, 1.00);
    concBase = randConc(0.10, 1.00);
    tempInitial = randTempInitial();

    totalVol = volAcid + volBase;
    massTotal = totalVol * 1.00;

    molAcid = concAcid * (volAcid / 1000);
    molBase = concBase * (volBase / 1000);
    molH2O = Math.min(molAcid, molBase);

    q_kJ = Math.abs(DELTA_H_NEUT_LIT_KJ_PER_MOL) * molH2O;
    q_J = q_kJ * 1000;
    tempRise = q_J / (massTotal * c);

    if (tempRise >= 2.0 && tempRise <= 25.0) {
      tempRise = parseFloat(tempRise.toFixed(1));
      tempFinal = parseFloat((tempInitial + tempRise).toFixed(1));
      q_J = massTotal * c * tempRise;
      q_kJ = q_J / 1000;
      break;
    }
  }

  const deltaHneut = DELTA_H_NEUT_LIT_KJ_PER_MOL;

  const ramInfo = ramOn ? `(No RAM needed for this enthalpy calculation)` : null;

  return {
    category: 'M',
    variant: 'M1',
    title: 'Enthalpy of Neutralisation',
    description: 'Calorimetric measurement of ΔHneut using polystyrene cup',
    problemStatement:
      `A student mixed ${volAcid} cm³ of ${pair.acidName} (${pair.acid}) of concentration ${concAcid} mol/dm³ ` +
      `with ${volBase} cm³ of ${pair.baseName} (${pair.base}) of concentration ${concBase} mol/dm³ ` +
      `in a polystyrene cup. The initial temperature of both solutions was ${tempInitial} °C. ` +
      `The maximum temperature reached was ${tempFinal} °C. ` +
      `(Assume specific heat capacity = 4.18 J g⁻¹ K⁻¹, density of all solutions = 1.00 g cm⁻³, ` +
      `and the heat capacity of the polystyrene cup is negligible.)` +
      (ramInfo ? `` : ``) +
      `\n\nCalculate the enthalpy change of neutralisation in kJ/mol.`,
    equation: `${pair.acid}(aq) + ${pair.base}(aq) → ${pair.saltName}(aq) + H₂O(l)`,
    solution: [
      {
        step: 1,
        title: 'Calculate heat released to the solution',
        content:
          `Total volume of solution = ${volAcid} + ${volBase} = ${totalVol} cm³\n` +
          `Mass of solution = ${totalVol} × 1.00 = ${massTotal} g\n` +
          `Temperature rise, ΔT = ${tempFinal} − ${tempInitial} = ${sfStr(tempRise, 3)} K\n` +
          `q = m × c × ΔT = ${massTotal} × 4.18 × ${sfStr(tempRise, 3)}\n` +
          `= ${sfStr(q_J, 4)} J = ${sfStr(q_kJ, 4)} kJ`,
      },
      {
        step: 2,
        title: 'Determine moles of water formed (= limiting reagent)',
        content:
          `n(${pair.acid}) = ${concAcid} × ${sf(volAcid / 1000, 4)} = ${sfStr(molAcid, 4)} mol\n` +
          `n(${pair.base}) = ${concBase} × ${sf(volBase / 1000, 4)} = ${sfStr(molBase, 4)} mol\n` +
          `Limiting reagent: ${molAcid <= molBase ? pair.acidName : pair.baseName}\n` +
          `n(H₂O) formed = ${sfStr(molH2O, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate ΔHneut per mole of water formed',
        content:
          `ΔHneut = −q / n(H₂O)  (negative: exothermic)\n` +
          `= −${sfStr(q_kJ, 4)} / ${sfStr(molH2O, 4)}\n` +
          `= ${sfStr(deltaHneut, 3)} kJ/mol`,
      },
    ],
    finalAnswer: `Enthalpy change of neutralisation = ${sfStr(deltaHneut, 3)} kJ/mol (exothermic)`,
    notes: [
      'The standard enthalpy of neutralisation for strong acid + strong base ≈ −57.1 kJ/mol.',
      'Polystyrene is used as it is a poor heat conductor — minimises heat loss.',
      'Sources of error: heat loss to surroundings and atmosphere; heat capacity of polystyrene cup ignored.',
    ],
    ramInfo: null,
  };
}

export function generateM2(ramOn) {
  const fuel = randChoice(FUELS);
  const deltaHc_lit = DELTA_HC_LIT_KJ_PER_MOL[fuel.formula] ?? -1500;

  const equationToShow = fuel.equationDisplay || fuel.equationScaled || fuel.equation;
  const volWater = randWaterVol();
  const tempInitial = randTempInitial();

  const tempRise = randFloat(5.0, 20.0, 1);
  const tempFinal = parseFloat((tempInitial + tempRise).toFixed(1));

  const massWater = volWater * 1.00;
  const c = 4.18;
  const q_J = massWater * c * tempRise;
  const q_kJ = q_J / 1000;
  const molFuel = q_kJ / Math.abs(deltaHc_lit);
  const massFuel = parseFloat(sfStr(molFuel * fuel.M, 4));
  const deltaHc = deltaHc_lit;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${fuel.ramElems})`
    : null;

  return {
    category: 'M',
    variant: 'M2',
    title: 'Enthalpy of Combustion from Spirit Burner',
    description: 'Calculate ΔHc from temperature rise of water in simple calorimeter',
    problemStatement:
      `A spirit burner containing ${fuel.name} (${fuel.formula}) was used to heat ${volWater} cm³ of water. ` +
      `The initial temperature of the water was ${tempInitial} °C and the final temperature was ${tempFinal} °C. ` +
      `The mass of ${fuel.name} burned was ${massFuel} g. ` +
      `(Specific heat capacity of water = 4.18 J g⁻¹ K⁻¹; density of water = 1.00 g cm⁻³)` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the enthalpy change of combustion of ${fuel.name} in kJ/mol.`,
    equation: equationToShow,
    solution: [
      {
        step: 1,
        title: 'Calculate heat absorbed by water',
        content:
          `Mass of water = ${volWater} × 1.00 = ${massWater} g\n` +
          `ΔT = ${tempFinal} − ${tempInitial} = ${sfStr(tempRise, 3)} °C\n` +
          `q = ${massWater} × 4.18 × ${sfStr(tempRise, 3)} = ${sfStr(q_J, 4)} J\n` +
          `= ${sfStr(q_kJ, 4)} kJ`,
      },
      {
        step: 2,
        title: 'Calculate moles of fuel burned',
        content:
          `M(${fuel.formula}) = ${sfStr(fuel.M, 4)} g/mol\n` +
          `n(${fuel.formula}) = ${massFuel} / ${sfStr(fuel.M, 4)} = ${sfStr(molFuel, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate ΔHc per mole',
        content:
          `ΔHc = −q / n = −${sfStr(q_kJ, 4)} / ${sfStr(molFuel, 4)}\n` +
          `= ${sfStr(deltaHc, 3)} kJ/mol`,
      },
      {
        step: 4,
        title: 'Comment on accuracy',
        content:
          `In real spirit-burner experiments, the calculated ΔHc often deviates from the standard value.\n` +
          `Common reasons: heat loss to surroundings, heat absorbed by the apparatus, and incomplete combustion.`,
      },
    ],
    finalAnswer: `ΔHc (${fuel.name}) = ${sfStr(deltaHc, 3)} kJ/mol`,
    notes: [
      'Combustion is always exothermic — ΔHc is always negative.',
      `Standard ΔHc (literature value for ${fuel.name}): approximately ${sfStr(deltaHc_lit, 4)} kJ/mol.`,
    ],
    ramInfo,
  };
}
