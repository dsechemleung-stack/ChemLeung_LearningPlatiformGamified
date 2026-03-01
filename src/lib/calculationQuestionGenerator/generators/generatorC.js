import { METAL_ACID_REACTIONS, ACID_OXIDE_REACTIONS, CARBONATE_ACID_REACTIONS, MM, RAM, sf } from '../data/chemicals.js';
import {
  randConc, randMass, randVolExcess, randChoice, randAliquot, sfStr, randFloat
} from '../utils/random.js';

const MOLAR_VOL = 24.0; // dm³/mol at r.t.p.

// ============================================================
// GENERATOR C1 — Acid + Insoluble Base/Oxide → Find Salt Mass
// Excess solid added to fixed volume of acid
// ============================================================
export function generateC1(ramOn) {
  const rxn = randChoice(ACID_OXIDE_REACTIONS);
  const volAcid = randAliquot();      // cm³
  const concAcid = randConc(0.10, 1.50);

  // mol acid → mol salt
  const molAcid = concAcid * (volAcid / 1000);
  const molSalt = molAcid * (1 / rxn.acidRatio);
  const massSalt = molSalt * rxn.M_salt;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'C',
    variant: 'C1',
    title: 'Salt Preparation — Acid + Metal Oxide (Find Salt Mass)',
    description: 'Excess insoluble oxide with fixed volume of acid; acid is limiting',
    problemStatement:
      `Excess solid ${rxn.oxideName} (${rxn.oxideFormula}) is added to ${volAcid}.0 cm³ of ` +
      `${rxn.acidName} of concentration ${concAcid} mol/dm³. The mixture is heated until all the ` +
      `black solid dissolves, then filtered to remove any excess solid. ` +
      `The filtrate is evaporated to dryness.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the maximum mass of anhydrous ${rxn.saltName} (${rxn.salt}) that can be obtained.`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Write balanced equation; identify limiting reagent',
        content:
          `${rxn.equation}\n` +
          `The acid is the limiting reagent (oxide is in excess — filtered off).\n` +
          `Mole ratio ${rxn.acidFormula} : ${rxn.salt} = ${rxn.acidRatio} : 1`,
      },
      {
        step: 2,
        title: `Calculate moles of ${rxn.acidFormula}`,
        content:
          `n(${rxn.acidFormula}) = ${concAcid} × ${sf(volAcid / 1000, 4)} = ${sfStr(molAcid, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate moles of ${rxn.salt} formed`,
        content:
          `n(${rxn.salt}) = ${sfStr(molAcid, 4)} × (1/${rxn.acidRatio}) = ${sfStr(molSalt, 4)} mol`,
      },
      {
        step: 4,
        title: `Calculate mass of ${rxn.saltName}`,
        content:
          `M(${rxn.salt}) = ${sfStr(rxn.M_salt, 5)} g/mol\n` +
          `Mass = ${sfStr(molSalt, 4)} × ${sfStr(rxn.M_salt, 5)} = ${sfStr(massSalt, 3)} g`,
      },
    ],
    finalAnswer: `Maximum mass of ${rxn.saltName} = ${sfStr(massSalt, 3)} g`,
    notes: [
      rxn.observation,
      'Filtering removes excess unreacted solid; evaporating the filtrate leaves anhydrous salt.',
      'Since oxide is in excess, ALL the acid reacts → acid is the limiting reagent.',
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR C2 — Metal + Acid with Limiting Reagent (H₂ Gas)
// ============================================================
export function generateC2(ramOn) {
  const rxn = randChoice(METAL_ACID_REACTIONS);
  const massMetal = parseFloat(sfStr(randMass(0.20, 5.00), 4));
  const volAcid = parseFloat(sfStr(randAliquot(), 4));
  const concAcid = randConc(0.10, 2.00);

  const molMetal = massMetal / rxn.M_metal;
  const molAcid = concAcid * (volAcid / 1000);

  // Determine limiting reagent
  // From equation: metalRatio mol metal reacts with acidRatio mol acid
  // mol acid needed for all metal = molMetal * (acidRatio / metalRatio)
  const molAcidNeeded = molMetal * (rxn.acidRatio / rxn.metalRatio);
  const metalIsLimiting = molAcid >= molAcidNeeded;

  const limitingMol = metalIsLimiting ? molMetal : molAcid * (rxn.metalRatio / rxn.acidRatio);
  const molH2 = limitingMol * (rxn.H2Ratio / rxn.metalRatio);
  const volH2_dm3 = molH2 * MOLAR_VOL;
  const volH2_cm3 = volH2_dm3 * 1000;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  const limitingReagent = metalIsLimiting ? rxn.metalName : rxn.acidName;
  const excessReagent = metalIsLimiting ? rxn.acidName : rxn.metalName;

  return {
    category: 'C',
    variant: 'C2',
    title: 'Metal + Acid — Limiting Reagent and H₂ Volume',
    description: 'Determine limiting reagent; calculate volume of hydrogen gas at r.t.p.',
    problemStatement:
      `A student adds ${massMetal} g of ${rxn.metalName} (${rxn.metal}) powder to ` +
      `${volAcid} cm³ of ${rxn.acidName} (${rxn.acidFormula}) of concentration ${concAcid} mol/dm³. ` +
      `The hydrogen gas evolved is collected over water at room temperature and pressure (r.t.p.).` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Determine which reactant is the limiting reagent.` +
      `\n(b) Calculate the volume of hydrogen gas produced at r.t.p. (molar volume = ${MOLAR_VOL} dm³/mol).`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Write balanced equation and mole ratios',
        content:
          `${rxn.equation}\n` +
          `Mole ratio: ${rxn.metal} : ${rxn.acidFormula} : H₂ = ${rxn.metalRatio} : ${rxn.acidRatio} : ${rxn.H2Ratio}`,
      },
      {
        step: 2,
        title: 'Calculate moles of each reactant',
        content:
          `n(${rxn.metal}) = mass / M = ${massMetal} / ${rxn.M_metal} = ${sfStr(molMetal, 4)} mol\n` +
          `n(${rxn.acidFormula}) = ${concAcid} × ${sf(volAcid / 1000, 4)} = ${sfStr(molAcid, 4)} mol`,
      },
      {
        step: 3,
        title: 'Identify the limiting reagent',
        content:
          `For all ${rxn.metal} to react, mol ${rxn.acidFormula} needed = ${sfStr(molMetal, 4)} × ${rxn.acidRatio}/${rxn.metalRatio} = ${sfStr(molAcidNeeded, 4)} mol\n` +
          `Actual mol ${rxn.acidFormula} available = ${sfStr(molAcid, 4)} mol\n\n` +
          (metalIsLimiting
            ? `${sfStr(molAcid, 4)} mol > ${sfStr(molAcidNeeded, 4)} mol required\n∴ ${rxn.metalName} is the LIMITING REAGENT (${rxn.acidName} is in excess).`
            : `${sfStr(molAcid, 4)} mol < ${sfStr(molAcidNeeded, 4)} mol required\n∴ ${rxn.acidName} is the LIMITING REAGENT (${rxn.metalName} is in excess).`),
      },
      {
        step: 4,
        title: 'Calculate moles of H₂ produced',
        content:
          `Based on the limiting reagent (${limitingReagent}):\n` +
          `n(limiting) = ${sfStr(limitingMol, 4)} mol\n` +
          `n(H₂) = ${sfStr(limitingMol, 4)} × (${rxn.H2Ratio}/${rxn.metalRatio}) = ${sfStr(molH2, 4)} mol`,
      },
      {
        step: 5,
        title: 'Calculate volume of H₂ at r.t.p.',
        content:
          `V(H₂) = n × molar volume = ${sfStr(molH2, 4)} × ${MOLAR_VOL} dm³/mol\n` +
          `= ${sfStr(volH2_dm3, 3)} dm³\n` +
          `= ${sfStr(volH2_cm3, 3)} cm³`,
      },
    ],
    finalAnswer:
      `(a) Limiting reagent: ${limitingReagent} (${excessReagent} is in excess)\n` +
      `(b) Volume of H₂ at r.t.p. = ${sfStr(volH2_dm3, 3)} dm³ (${sfStr(volH2_cm3, 3)} cm³)`,
    notes: [
      `Molar volume of any gas at r.t.p. = ${MOLAR_VOL} dm³/mol (HKDSE standard).`,
      'Only metals above hydrogen in the reactivity series react with dilute acids to produce H₂.',
      `The salt formed in solution is ${rxn.saltFormula}, but this question focuses only on H₂ gas volume.`,
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR C3 — Carbonate + Acid (Limiting Reagent and CO₂)
// ============================================================
export function generateC3(ramOn) {
  const rxn = randChoice(CARBONATE_ACID_REACTIONS);
  const massCarbonate = parseFloat(sfStr(randMass(0.50, 8.00), 4));
  const volAcid = parseFloat(sfStr(randAliquot(), 4));
  const concAcid = randConc(0.10, 2.00);

  const molCarbonate = massCarbonate / rxn.M_carbonate;
  const molAcid = concAcid * (volAcid / 1000);

  // mol acid needed for all carbonate = molCarbonate * acidRatio/carbonateRatio
  const molAcidNeeded = molCarbonate * (rxn.acidRatio / rxn.carbonateRatio);
  const carbonateIsLimiting = molAcid >= molAcidNeeded;

  const limitingMolCarbonate = carbonateIsLimiting
    ? molCarbonate
    : molAcid * (rxn.carbonateRatio / rxn.acidRatio);
  const molCO2 = limitingMolCarbonate * (rxn.CO2Ratio / rxn.carbonateRatio);
  const volCO2_dm3 = molCO2 * MOLAR_VOL;
  const volCO2_cm3 = volCO2_dm3 * 1000;

  const limitingName = carbonateIsLimiting ? rxn.carbonateName : rxn.acidName;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'C',
    variant: 'C3',
    title: 'Carbonate + Acid — Limiting Reagent and CO₂ Volume',
    description: 'Determine limiting reagent; calculate volume of CO₂ at r.t.p.',
    problemStatement:
      `A student adds ${massCarbonate} g of ${rxn.carbonateName} (${rxn.carbonate}) to ` +
      `${volAcid} cm³ of ${rxn.acidName} of concentration ${concAcid} mol/dm³. ` +
      `The carbon dioxide gas produced is collected at r.t.p.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Determine the limiting reagent, showing your working clearly.` +
      `\n(b) Calculate the volume of CO₂ produced at r.t.p. (molar volume = ${MOLAR_VOL} dm³/mol).`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Write balanced equation',
        content:
          `${rxn.equation}\n` +
          `Mole ratio: ${rxn.carbonate} : acid : CO₂ = ${rxn.carbonateRatio} : ${rxn.acidRatio} : ${rxn.CO2Ratio}`,
      },
      {
        step: 2,
        title: 'Calculate moles of each reactant',
        content:
          `n(${rxn.carbonate}) = ${massCarbonate} / ${sfStr(rxn.M_carbonate, 4)} = ${sfStr(molCarbonate, 4)} mol\n` +
          `n(acid) = ${concAcid} × ${sf(volAcid / 1000, 4)} = ${sfStr(molAcid, 4)} mol`,
      },
      {
        step: 3,
        title: 'Determine limiting reagent',
        content:
          `For all carbonate to react: n(acid) needed = ${sfStr(molCarbonate, 4)} × ${rxn.acidRatio}/${rxn.carbonateRatio} = ${sfStr(molAcidNeeded, 4)} mol\n` +
          `Actual n(acid) = ${sfStr(molAcid, 4)} mol\n\n` +
          (carbonateIsLimiting
            ? `Acid available (${sfStr(molAcid, 4)}) ≥ acid needed (${sfStr(molAcidNeeded, 4)})\n∴ ${rxn.carbonateName} is the LIMITING REAGENT.`
            : `Acid available (${sfStr(molAcid, 4)}) < acid needed (${sfStr(molAcidNeeded, 4)})\n∴ ${rxn.acidName} is the LIMITING REAGENT.`),
      },
      {
        step: 4,
        title: 'Calculate moles of CO₂ from limiting reagent',
        content:
          `n(${rxn.carbonate})_reacting = ${sfStr(limitingMolCarbonate, 4)} mol\n` +
          `n(CO₂) = ${sfStr(limitingMolCarbonate, 4)} × ${rxn.CO2Ratio}/${rxn.carbonateRatio} = ${sfStr(molCO2, 4)} mol`,
      },
      {
        step: 5,
        title: 'Calculate volume of CO₂ at r.t.p.',
        content:
          `V(CO₂) = ${sfStr(molCO2, 4)} × ${MOLAR_VOL} = ${sfStr(volCO2_dm3, 3)} dm³\n` +
          `= ${sfStr(volCO2_cm3, 3)} cm³`,
      },
    ],
    finalAnswer:
      `(a) Limiting reagent: ${limitingName}\n` +
      `(b) Volume of CO₂ at r.t.p. = ${sfStr(volCO2_dm3, 3)} dm³ (${sfStr(volCO2_cm3, 4)} cm³)`,
    notes: [
      'CO₂ turns limewater milky; can be confirmed by this test.',
      `Molar volume at r.t.p. = ${MOLAR_VOL} dm³/mol applies to all gases.`,
      rxn.note || '',
    ].filter(Boolean),
    ramInfo,
  };
}
