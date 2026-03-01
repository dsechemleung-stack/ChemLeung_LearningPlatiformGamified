// ============================================================
// GENERATOR D — Precipitation Reactions (Insoluble Salts)
// ============================================================
import { PRECIPITATION_REACTIONS, MM, RAM, sf } from '../data/chemicals.js';
import { randConc, randAliquot, randChoice, sfStr, randFloat } from '../utils/random.js';

export function generateD1(ramOn) {
  const rxn = randChoice(PRECIPITATION_REACTIONS);
  const vol1 = randAliquot();  // cm³ cation source
  const conc1 = randConc(0.05, 1.00);
  const vol2 = randAliquot();  // cm³ anion source
  const conc2 = randConc(0.05, 1.00);

  const mol1 = conc1 * (vol1 / 1000); // mol cation source
  const mol2 = conc2 * (vol2 / 1000); // mol anion source

  // cationRatio : anionRatio
  // e.g. for PbI2: Pb2+ : I- = 1 : 2
  const mol1Needed = mol2 * (rxn.cationRatio / rxn.anionRatio);
  const cationLimiting = mol1 <= mol1Needed;

  const limitingMolCation = cationLimiting ? mol1 : mol1Needed;
  const molPpt = limitingMolCation * (1 / rxn.cationRatio);
  const massPpt = molPpt * rxn.M_ppt;

  const limitingReagent = cationLimiting ? rxn.cationSource : rxn.anionSource;
  const excessReagent = cationLimiting ? rxn.anionSource : rxn.cationSource;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'D',
    variant: 'D1',
    title: `Precipitation — Theoretical Yield of ${rxn.precipitateName}`,
    description: 'Mix two solutions; determine limiting reagent and mass of precipitate',
    problemStatement:
      `A student mixes ${vol1}.0 cm³ of ${rxn.cationSource} solution of concentration ${conc1} mol/dm³ ` +
      `with ${vol2}.0 cm³ of ${rxn.anionSource} solution of concentration ${conc2} mol/dm³. ` +
      `A ${rxn.precipitateColour} precipitate of ${rxn.precipitateName} (${rxn.precipitate}) forms immediately. ` +
      `The precipitate is filtered, washed, and dried.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the ionic equation for the precipitation reaction.` +
      `\n(b) Determine the limiting reagent.` +
      `\n(c) Calculate the theoretical yield (mass) of ${rxn.precipitateName}.`,
    equation: rxn.equation,
    ionicEquation: rxn.ionicEq,
    solution: [
      {
        step: 1,
        title: 'Ionic equation',
        content: `${rxn.ionicEq}\nThe ${rxn.precipitateColour} precipitate is ${rxn.precipitateName} (${rxn.precipitate}).`,
      },
      {
        step: 2,
        title: 'Calculate moles of each reactant',
        content:
          `n(${rxn.cationFormula}) = ${conc1} × ${sf(vol1 / 1000, 4)} = ${sfStr(mol1, 4)} mol\n` +
          `n(${rxn.anionFormula}) = ${conc2} × ${sf(vol2 / 1000, 4)} = ${sfStr(mol2, 4)} mol`,
      },
      {
        step: 3,
        title: 'Determine limiting reagent',
        content:
          `From ionic equation: ratio ${rxn.cationFormula} : ${rxn.anionFormula} = ${rxn.cationRatio} : ${rxn.anionRatio}\n` +
          `For all ${rxn.cationFormula} to react: n(${rxn.anionFormula}) needed = ${sfStr(mol1, 4)} × ${rxn.anionRatio}/${rxn.cationRatio} = ${sfStr(mol1 * rxn.anionRatio / rxn.cationRatio, 4)} mol\n` +
          `Actual n(${rxn.anionFormula}) = ${sfStr(mol2, 4)} mol\n\n` +
          (cationLimiting
            ? `Anion available ≥ anion needed → ${rxn.cationSource} is the LIMITING REAGENT.`
            : `Anion available < anion needed → ${rxn.anionSource} is the LIMITING REAGENT.`),
      },
      {
        step: 4,
        title: `Calculate moles of ${rxn.precipitate} formed`,
        content:
          `From ionic equation, ratio ${rxn.cationFormula} : ${rxn.precipitate} = ${rxn.cationRatio} : 1\n` +
          `n(${rxn.precipitate}) = ${sfStr(limitingMolCation, 4)} × (1/${rxn.cationRatio}) = ${sfStr(molPpt, 4)} mol`,
      },
      {
        step: 5,
        title: `Calculate mass of ${rxn.precipitateName}`,
        content:
          `M(${rxn.precipitate}) = ${sfStr(rxn.M_ppt, 5)} g/mol\n` +
          `Mass = ${sfStr(molPpt, 4)} × ${sfStr(rxn.M_ppt, 5)} = ${sfStr(massPpt, 3)} g`,
      },
    ],
    finalAnswer:
      `(a) Ionic equation: ${rxn.ionicEq}\n` +
      `(b) Limiting reagent: ${limitingReagent} (${excessReagent} is in excess)\n` +
      `(c) Theoretical yield of ${rxn.precipitateName} = ${sfStr(massPpt, 3)} g`,
    notes: [
      `${rxn.precipitate} is insoluble in water — it forms as a solid precipitate immediately upon mixing.`,
      `Colour of precipitate: ${rxn.precipitateColour}.`,
      'In practice, actual yield is less than theoretical due to losses during filtration and washing.',
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR E — Metal Displacement Reactions
// ============================================================
import { DISPLACEMENT_REACTIONS } from '../data/chemicals.js';
import { randMass, randVolExcess } from '../utils/random.js';

export function generateE1(ramOn) {
  const rxn = randChoice(DISPLACEMENT_REACTIONS);
  const vol = parseFloat(sfStr(randAliquot(), 4));  // cm³ of metal ion solution
  const conc = randConc(0.05, 1.00);

  const molIon = conc * (vol / 1000);
  // mol displaced metal = molIon * (1/ionRatio) (based on ionic equation)
  const molDisplaced = molIon * (1 / rxn.ionRatio);
  const massDisplaced = molDisplaced * rxn.M_displaced;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'E',
    variant: 'E1',
    title: `Metal Displacement — Mass of ${rxn.displacedName} Formed`,
    description: 'Excess reactive metal displaces less reactive metal from solution',
    problemStatement:
      `Excess ${rxn.activeMetalName} (${rxn.activeMetal}) powder is added to ${vol} cm³ of ` +
      `${rxn.ionSource} solution of concentration ${conc} mol/dm³. ` +
      `After the reaction is complete, the solid mixture is filtered, washed with water, dried, and weighed.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the ionic equation for this displacement reaction.` +
      `\n(b) Explain the colour change observed.` +
      `\n(c) Calculate the expected mass of ${rxn.displacedName} (${rxn.displaced}) formed.`,
    equation: rxn.equation,
    ionicEquation: rxn.ionicEq,
    solution: [
      {
        step: 1,
        title: 'Ionic equation and feasibility',
        content:
          `${rxn.ionicEq}\n` +
          `${rxn.activeMetal} is above ${rxn.displaced} in the reactivity series → displacement is feasible.`,
      },
      {
        step: 2,
        title: 'Colour change observed',
        content: rxn.colourChange,
      },
      {
        step: 3,
        title: `Calculate moles of ${rxn.ionFormula} ions`,
        content:
          `n(${rxn.ionFormula}) = ${conc} × ${sf(vol / 1000, 4)} = ${sfStr(molIon, 4)} mol`,
      },
      {
        step: 4,
        title: `Calculate moles of ${rxn.displaced} formed`,
        content:
          `From ionic equation, ${rxn.ionRatio} ${rxn.ionFormula} → ${1} ${rxn.displaced}\n` +
          `n(${rxn.displaced}) = ${sfStr(molIon, 4)} × (1/${rxn.ionRatio}) = ${sfStr(molDisplaced, 4)} mol`,
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
      `(a) Ionic equation: ${rxn.ionicEq}\n` +
      `(b) ${rxn.colourChange}\n` +
      `(c) Mass of ${rxn.displacedName} = ${sfStr(massDisplaced, 3)} g`,
    notes: [
      `Feasibility check: ${rxn.activeMetal} > ${rxn.displaced} in reactivity series → reaction occurs.`,
    ],
    ramInfo,
  };
}

export function generateE2(ramOn) {
  const rxn = randChoice(DISPLACEMENT_REACTIONS);
  const vol = parseFloat(sfStr(randAliquot(), 4));  // cm³
  const conc = randConc(0.05, 0.80);

  const molIon = conc * (vol / 1000);
  const molActiveUsed = molIon * (rxn.activeRatio / rxn.ionRatio);
  const massActiveUsed = molActiveUsed * rxn.M_active;

  const molDisplaced = molIon * (1 / rxn.ionRatio);
  const massDisplaced = molDisplaced * rxn.M_displaced;

  // Ensure metal strip is in excess so “remaining mass” is meaningful
  const initialMass = parseFloat(sfStr(Math.max(randMass(2.00, 10.00), massActiveUsed * 1.6 + 0.3), 4));
  const massRemaining = initialMass - massActiveUsed;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'E',
    variant: 'E2',
    title: `Metal Displacement — Mass Used, Remaining & Formed`,
    description: 'Find mass of active metal used and remaining, and mass of displaced metal formed (no mass-change concept)',
    problemStatement:
      `A strip of ${rxn.activeMetalName} (${rxn.activeMetal}) metal weighing ${initialMass} g is placed into ` +
      `${vol} cm³ of ${rxn.ionSource} solution of concentration ${conc} mol/dm³. ` +
      `Assume the ${rxn.ionFormula} solution is the limiting reagent and the ${rxn.activeMetal} strip is in excess. ` +
      (ramInfo ? `${ramInfo} ` : '') +
      `\n\n(a) Calculate the mass of ${rxn.activeMetal} used (dissolved into solution).` +
      `\n(b) Calculate the mass of ${rxn.activeMetal} remaining in the strip.` +
      `\n(c) Calculate the mass of ${rxn.displacedName} (${rxn.displaced}) formed.`,
    equation: rxn.equation,
    ionicEquation: rxn.ionicEq,
    solution: [
      {
        step: 1,
        title: 'Ionic equation and mole ratios',
        content:
          `${rxn.ionicEq}\n` +
          `From ionic equation: ${rxn.activeMetal} : ${rxn.ionFormula} : ${rxn.displaced} = ${rxn.activeRatio} : ${rxn.ionRatio} : 1`,
      },
      {
        step: 2,
        title: `Calculate moles of ${rxn.ionFormula} (limiting reagent)`,
        content:
          `n(${rxn.ionFormula}) = ${conc} × ${sf(vol / 1000, 4)} = ${sfStr(molIon, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate mass of ${rxn.activeMetal} used`,
        content:
          `n(${rxn.activeMetal}) used = ${sfStr(molIon, 4)} × ${rxn.activeRatio}/${rxn.ionRatio} = ${sfStr(molActiveUsed, 4)} mol\n` +
          `Mass used = ${sfStr(molActiveUsed, 4)} × ${rxn.M_active} = ${sfStr(massActiveUsed, 4)} g`,
      },
      {
        step: 4,
        title: `Calculate mass of ${rxn.activeMetal} remaining`,
        content:
          `Mass remaining = initial mass − mass used\n` +
          `= ${initialMass} − ${sfStr(massActiveUsed, 4)}\n` +
          `= ${sfStr(massRemaining, 4)} g`,
      },
      {
        step: 5,
        title: `Calculate mass of ${rxn.displacedName} formed`,
        content:
          `n(${rxn.displaced}) = ${sfStr(molIon, 4)} × (1/${rxn.ionRatio}) = ${sfStr(molDisplaced, 4)} mol\n` +
          `Mass formed = ${sfStr(molDisplaced, 4)} × ${rxn.M_displaced} = ${sfStr(massDisplaced, 4)} g`,
      },
    ],
    finalAnswer:
      `(a) Mass of ${rxn.activeMetal} used = ${sfStr(massActiveUsed, 4)} g\n` +
      `(b) Mass of ${rxn.activeMetal} remaining = ${sfStr(massRemaining, 4)} g\n` +
      `(c) Mass of ${rxn.displacedName} formed = ${sfStr(massDisplaced, 4)} g`,
    notes: [
      rxn.colourChange,
      'The ionic equation shows electron transfer: the active metal is oxidised and the metal ion is reduced.',
    ],
    ramInfo,
  };
}

// ============================================================
// GENERATOR F — Redox Titrations (KMnO4 / K2Cr2O7)
// ============================================================
import { REDOX_SYSTEMS } from '../data/chemicals.js';
import { randTitre, randFlask } from '../utils/random.js';

export function generateF1(ramOn) {
  const rxn = randChoice(REDOX_SYSTEMS);
  const volSample = parseFloat(sfStr(randAliquot(), 4));  // cm³ of reducing agent
  const concOxidiser = randConc(0.01, 0.10);
  const titre = randTitre();

  // mol oxidiser from titre → mol reducer
  const molOxidiser = concOxidiser * (titre / 1000);
  const molReducer = molOxidiser * (rxn.reducerRatio / rxn.oxidiserRatio);
  const concReducer = molReducer / (volSample / 1000);
  const concReducerG = concReducer * rxn.M_reducer;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'F',
    variant: 'F1',
    title: `Redox Titration — Concentration of ${rxn.reducerName}`,
    description: `${rxn.oxidiser} titrated against reducing agent; self-indicating`,
    problemStatement:
      `To determine the concentration of a ${rxn.reducerName} (${rxn.reducerFormula}) solution, ` +
      `${volSample} cm³ of the solution was acidified with dilute sulphuric acid and ` +
      `titrated with ${rxn.oxidiserName} of concentration ${concOxidiser} mol/dm³. ` +
      `The average titre was ${titre} cm³. ` +
      `The endpoint was detected when ${rxn.endpoint}.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the ionic half-equations for the oxidising agent and the reducing agent.` +
      `\n(b) Calculate the concentration of the ${rxn.reducerName} solution in mol/dm³ and g/dm³.`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Half-equations and overall equation',
        content:
          rxn.oxidiser === 'KMnO₄'
            ? `Reduction (oxidising agent): MnO₄⁻(aq) + 8H⁺(aq) + 5e⁻ → Mn²⁺(aq) + 4H₂O(l)\n` +
              (rxn.reducerIon === 'Fe²⁺'
                ? `Oxidation (reducing agent): Fe²⁺(aq) → Fe³⁺(aq) + e⁻\nMultiply × 5 and add:\n`
                : `Oxidation (reducing agent): C₂O₄²⁻(aq) → 2CO₂(g) + 2e⁻\nMultiply × 5/2 and add:\n`) +
              `Overall: ${rxn.equation}`
            : `Reduction (oxidising agent): Cr₂O₇²⁻(aq) + 14H⁺(aq) + 6e⁻ → 2Cr³⁺(aq) + 7H₂O(l)\n` +
              `Oxidation (reducing agent): Fe²⁺(aq) → Fe³⁺(aq) + e⁻  (×6)\n` +
              `Overall: ${rxn.equation}`,
      },
      {
        step: 2,
        title: `Mole ratio: ${rxn.oxidiser} : ${rxn.reducerFormula} = ${rxn.oxidiserRatio} : ${rxn.reducerRatio}`,
        content:
          `From the balanced ionic equation:\n` +
          `${rxn.oxidiserRatio} mol ${rxn.oxidiser} reacts with ${rxn.reducerRatio} mol ${rxn.reducerFormula}`,
      },
      {
        step: 3,
        title: `Calculate moles of ${rxn.oxidiser} used`,
        content:
          `n(${rxn.oxidiser}) = ${concOxidiser} × ${sf(titre / 1000, 4)} = ${sfStr(molOxidiser, 4)} mol`,
      },
      {
        step: 4,
        title: `Calculate moles of ${rxn.reducerFormula}`,
        content:
          `n(${rxn.reducerFormula}) = ${sfStr(molOxidiser, 4)} × (${rxn.reducerRatio}/${rxn.oxidiserRatio}) = ${sfStr(molReducer, 4)} mol`,
      },
      {
        step: 5,
        title: `Calculate concentration of ${rxn.reducerName}`,
        content:
          `Volume of sample = ${volSample} cm³ = ${sf(volSample / 1000, 4)} dm³\n` +
          `Concentration = ${sfStr(molReducer, 4)} / ${sf(volSample / 1000, 4)} = ${sfStr(concReducer, 3)} mol/dm³\n\n` +
          `In g/dm³: M(${rxn.reducerFormula}) = ${sfStr(rxn.M_reducer, 4)} g/mol\n` +
          `Concentration = ${sfStr(concReducer, 3)} × ${sfStr(rxn.M_reducer, 4)}\n` +
          `= ${sfStr(concReducerG, 3)} g/dm³`,
      },
    ],
    finalAnswer:
      `(b) Concentration of ${rxn.reducerName} = ${sfStr(concReducer, 3)} mol/dm³ = ${sfStr(concReducerG, 3)} g/dm³`,
    notes: [
      `Colour change: ${rxn.colourChange}`,
      `${rxn.oxidiser} acts as its own indicator — no external indicator is needed.`,
      'The solution must be acidified (dilute H₂SO₄) to provide H⁺ ions for the reduction half-equation. HCl is not used as Cl⁻ can also be oxidised by KMnO₄.',
    ],
    ramInfo,
  };
}

export function generateF2(ramOn) {
  // Percentage purity of FeSO4 tablet
  const rxn = REDOX_SYSTEMS[0]; // KMnO4 / Fe2+
  const massTablet = parseFloat(sfStr(randMass(0.10, 0.80), 4));
  const flaskVol = randFlask();
  const aliquot = randChoice([10, 20, 25]);
  const concKMnO4 = randConc(0.005, 0.050);

  // Back-calculate titre for a realistic purity (60-95%)
  const targetPurity = randFloat(60, 95, 1);
  const massFeSO4_pure = (targetPurity / 100) * massTablet;
  const molFeSO4_flask = massFeSO4_pure / rxn.M_reducer;
  const molFeSO4_aliquot = molFeSO4_flask * (aliquot / flaskVol);
  // From 1:5 ratio (KMnO4:FeSO4), mol KMnO4 = molFeSO4 / 5
  const molKMnO4 = molFeSO4_aliquot / 5;
  const titre = sfStr((molKMnO4 / concKMnO4) * 1000, 3);

  const ramInfo = ramOn
    ? `(Relative atomic masses: O = 16.0, S = 32.1, K = 39.1, Mn = 55.0, Fe = 55.8)`
    : null;

  return {
    category: 'F',
    variant: 'F2',
    title: 'Redox Titration — % Purity of Iron Tablet',
    description: 'Determine the percentage of FeSO₄ in a commercial iron tablet',
    problemStatement:
      `A commercial iron tablet of mass ${massTablet} g was crushed and dissolved in dilute sulphuric acid. ` +
      `The solution was transferred to a ${flaskVol}.0 cm³ volumetric flask and made up to the mark. ` +
      `A ${aliquot}.0 cm³ aliquot of this solution required ${titre} cm³ of acidified potassium manganate(VII) (KMnO₄) ` +
      `of concentration ${concKMnO4} mol/dm³ for complete oxidation of Fe²⁺ ions.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\nCalculate the percentage by mass of iron(II) sulphate (FeSO₄) in the tablet.`,
    equation: 'MnO₄⁻(aq) + 5Fe²⁺(aq) + 8H⁺(aq) → Mn²⁺(aq) + 5Fe³⁺(aq) + 4H₂O(l)',
    solution: [
      {
        step: 1,
        title: 'Write ionic equation and mole ratio',
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
          `n(FeSO₄) in aliquot = ${sfStr(molKMnO4, 4)} × 5 = ${sfStr(molFeSO4_aliquot, 4)} mol`,
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
        title: 'Calculate mass and % purity of FeSO₄',
        content:
          `M(FeSO₄) = ${sfStr(rxn.M_reducer, 4)} g/mol\n` +
          `Mass of FeSO₄ = ${sfStr(molFeSO4_flask, 4)} × ${sfStr(rxn.M_reducer, 4)} = ${sfStr(massFeSO4_pure, 4)} g\n\n` +
          `% purity = (${sfStr(massFeSO4_pure, 4)} / ${massTablet}) × 100 = ${sfStr(targetPurity, 3)}%`,
      },
    ],
    finalAnswer: `Percentage by mass of FeSO₄ in the tablet = ${sfStr(targetPurity, 3)}%`,
    notes: [
      'KMnO₄ is self-indicating: the endpoint is the first permanent pale pink/purple colour.',
      'The tablet must be dissolved in dilute H₂SO₄ (not HCl) because Cl⁻ can be oxidised by KMnO₄, causing error.',
      `M(FeSO₄) = 55.8 + 32.1 + 4(16.0) = ${sfStr(rxn.M_reducer, 4)} g/mol`,
    ],
    ramInfo,
  };
}
