// ============================================================
// GENERATOR — Categories H, K, L, N
// H: Metal Reactions with Water/Steam
// K: Rate of Reaction
// L: Chemical Equilibrium (Kc)
// N: Organic Preparations
// ============================================================
import { FUELS, MM, RAM, sf, M } from '../data/chemicals.js';
import {
  randConc, randMass, randAliquot, randChoice, randFloat, randInt,
  sfStr, randTempInitial, randTempRise, randWaterVol,
} from '../utils/random.js';

const MOLAR_VOL = 24.0;

// ============================================================
// CATEGORY H: Metal Reactions with Water / Steam
// ============================================================

const WATER_METALS = [
  {
    metal: 'Na', metalName: 'sodium', M_metal: RAM.Na,
    reaction: 'cold water',
    product: 'NaOH', productName: 'sodium hydroxide',
    M_product: RAM.Na + RAM.O + RAM.H,
    H2Ratio: 1, metalRatio: 2,
    equation: '2Na(s) + 2H₂O(l) → 2NaOH(aq) + H₂(g)',
    observation: 'Sodium floats and moves rapidly; effervescence (H₂ gas); phenolphthalein turns from colorless to pink.',
    ramElems: 'H = 1.0, O = 16.0, Na = 23.0',
  },
  {
    metal: 'Ca', metalName: 'calcium', M_metal: RAM.Ca,
    reaction: 'cold water',
    product: 'Ca(OH)₂', productName: 'calcium hydroxide',
    M_product: RAM.Ca + 2 * (RAM.O + RAM.H),
    H2Ratio: 1, metalRatio: 1,
    equation: 'Ca(s) + 2H₂O(l) → Ca(OH)₂(aq) + H₂(g)',
    observation: 'Calcium sinks and reacts steadily; milky suspension of Ca(OH)₂ forms; H₂ gas evolves; phenolphthalein turns from colorless to pink.',
    ramElems: 'H = 1.0, O = 16.0, Ca = 40.1',
  },
];

const STEAM_METALS = [
  {
    metal: 'Mg', metalName: 'magnesium', M_metal: RAM.Mg,
    product: 'MgO', productName: 'magnesium oxide',
    M_product: RAM.Mg + RAM.O,
    H2Ratio: 1, metalRatio: 1,
    equation: 'Mg(s) + H₂O(g) → MgO(s) + H₂(g)',
    observation: 'Magnesium burns brightly; white MgO powder formed; H₂ gas produced.',
    ramElems: 'H = 1.0, O = 16.0, Mg = 24.3',
  },
  {
    metal: 'Zn', metalName: 'zinc', M_metal: RAM.Zn,
    product: 'ZnO', productName: 'zinc oxide',
    M_product: RAM.Zn + RAM.O,
    H2Ratio: 1, metalRatio: 1,
    equation: 'Zn(s) + H₂O(g) → ZnO(s) + H₂(g)',
    observation: 'White ZnO forms (turns yellow when hot, white when cooled); H₂ gas produced.',
    ramElems: 'H = 1.0, O = 16.0, Zn = 65.4',
  },
  {
    metal: 'Fe', metalName: 'iron', M_metal: RAM.Fe,
    product: 'Fe₃O₄', productName: 'iron(II,III) oxide (magnetite)',
    M_product: 3 * RAM.Fe + 4 * RAM.O,
    H2Ratio: 4, metalRatio: 3,
    equation: '3Fe(s) + 4H₂O(g) → Fe₃O₄(s) + 4H₂(g)',
    observation: 'Black Fe₃O₄ (magnetite) forms on the iron surface; H₂ gas produced.',
    ramElems: 'H = 1.0, O = 16.0, Fe = 55.8',
  },
];

// ── H1: Metal + Cold Water ────────────────────────────────────
export function generateH1(ramOn) {
  const rxn = randChoice(WATER_METALS);
  const mass = parseFloat(sfStr(randMass(0.10, 2.00), 4));

  const molMetal = mass / rxn.M_metal;
  const molH2 = molMetal * (rxn.H2Ratio / rxn.metalRatio);
  const volH2_dm3 = molH2 * MOLAR_VOL;
  const volH2_cm3 = volH2_dm3 * 1000;
  const molProduct = molMetal * (1 / rxn.metalRatio);  // 1 mol product per metalRatio mol metal
  const massProduct = molProduct * rxn.M_product;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'H',
    variant: 'H1',
    title: `Metal + Cold Water — ${rxn.metalName}`,
    description: 'Reactive metal reacts with cold water; calculate H₂ volume and describe observations',
    problemStatement:
      `A small piece of ${rxn.metalName} (${rxn.metal}) of mass ${mass} g is added to ` +
      `a trough of water containing a few drops of phenolphthalein indicator. ` +
      `The hydrogen gas evolved is collected at r.t.p.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the balanced equation for the reaction.` +
      `\n(b) Calculate the volume of hydrogen gas produced at r.t.p. (molar volume = ${MOLAR_VOL} dm³/mol).` +
      `\n(c) Describe what you would observe during and after this reaction.`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Balanced equation and mole ratio',
        content:
          `${rxn.equation}\n` +
          `Mole ratio ${rxn.metal} : H₂ = ${rxn.metalRatio} : ${rxn.H2Ratio}`,
      },
      {
        step: 2,
        title: `Calculate moles of ${rxn.metal}`,
        content:
          `n(${rxn.metal}) = ${mass} / ${rxn.M_metal} = ${sfStr(molMetal, 4)} mol`,
      },
      {
        step: 3,
        title: 'Calculate moles and volume of H₂',
        content:
          `n(H₂) = ${sfStr(molMetal, 4)} × (${rxn.H2Ratio}/${rxn.metalRatio}) = ${sfStr(molH2, 4)} mol\n` +
          `V(H₂) = ${sfStr(molH2, 4)} × ${MOLAR_VOL} = ${sfStr(volH2_dm3, 3)} dm³ = ${sfStr(volH2_cm3, 3)} cm³`,
      },
    ],
    finalAnswer:
      `(a) ${rxn.equation}\n` +
      `(b) V(H₂) = ${sfStr(volH2_dm3, 3)} dm³ (= ${sfStr(volH2_cm3, 3)} cm³)\n` +
      `(c) Observations: ${rxn.observation}`,
    notes: [
      'Only metals above calcium in the reactivity series react vigorously with cold water.',
      `Mass of ${rxn.productName} formed = ${sfStr(massProduct, 3)} g`,
      'Phenolphthalein turns pink because the reaction produces an alkali (OH⁻ ions).',
    ],
    ramInfo,
  };
}

// ── H2: Metal + Steam ─────────────────────────────────────────
export function generateH2(ramOn) {
  const rxn = randChoice(STEAM_METALS);
  const mass = parseFloat(sfStr(randMass(0.20, 3.00), 4));

  const molMetal = mass / rxn.M_metal;
  const molH2 = molMetal * (rxn.H2Ratio / rxn.metalRatio);
  const volH2_dm3 = molH2 * MOLAR_VOL;
  const volH2_cm3 = volH2_dm3 * 1000;
  const molOxide = molMetal * (1 / rxn.metalRatio);
  const massOxide = molOxide * rxn.M_product;

  const ramInfo = ramOn
    ? `(Relative atomic masses: ${rxn.ramElems})`
    : null;

  return {
    category: 'H',
    variant: 'H2',
    title: `Metal + Steam — ${rxn.metalName}`,
    description: 'Metal reacts with steam; calculate mass of oxide and volume of H₂ produced',
    problemStatement:
      `Steam is passed over ${mass} g of heated ${rxn.metalName} (${rxn.metal}) powder ` +
      `until the reaction is complete.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the balanced equation for the reaction.` +
      `\n(b) Calculate the mass of ${rxn.productName} (${rxn.product}) formed.` +
      `\n(c) Calculate the volume of hydrogen gas produced at r.t.p. (molar volume = ${MOLAR_VOL} dm³/mol).`,
    equation: rxn.equation,
    solution: [
      {
        step: 1,
        title: 'Balanced equation and mole ratios',
        content:
          `${rxn.equation}\n` +
          `Mole ratio ${rxn.metal} : ${rxn.product} : H₂ = ${rxn.metalRatio} : 1 : ${rxn.H2Ratio}`,
      },
      {
        step: 2,
        title: `Calculate moles of ${rxn.metal}`,
        content:
          `n(${rxn.metal}) = ${mass} / ${rxn.M_metal} = ${sfStr(molMetal, 4)} mol`,
      },
      {
        step: 3,
        title: `Calculate mass of ${rxn.product} formed`,
        content:
          `n(${rxn.product}) = ${sfStr(molMetal, 4)} × (1/${rxn.metalRatio}) = ${sfStr(molOxide, 4)} mol\n` +
          `M(${rxn.product}) = ${sfStr(rxn.M_product, 4)} g/mol\n` +
          `Mass = ${sfStr(molOxide, 4)} × ${sfStr(rxn.M_product, 4)} = ${sfStr(massOxide, 3)} g`,
      },
      {
        step: 4,
        title: 'Calculate volume of H₂ at r.t.p.',
        content:
          `n(H₂) = ${sfStr(molMetal, 4)} × (${rxn.H2Ratio}/${rxn.metalRatio}) = ${sfStr(molH2, 4)} mol\n` +
          `V(H₂) = ${sfStr(molH2, 4)} × ${MOLAR_VOL} = ${sfStr(volH2_dm3, 3)} dm³ = ${sfStr(volH2_cm3, 3)} cm³`,
      },
    ],
    finalAnswer:
      `(a) ${rxn.equation}\n` +
      `(b) Mass of ${rxn.productName} = ${sfStr(massOxide, 3)} g\n` +
      `(c) V(H₂) at r.t.p. = ${sfStr(volH2_dm3, 3)} dm³`,
    notes: [
      `${rxn.observation}`,
      'Steam (not liquid water) is needed because the temperature is high — liquid water would flash to steam anyway.',
      `The product ${rxn.product} is a metal oxide (${rxn.metalName} is oxidised; water is reduced).`,
    ],
    ramInfo,
  };
}

// ============================================================
// CATEGORY K: Rate of Reaction (Calculations)
// ============================================================

// ── K1: Average Rate from Gas Volume Data ─────────────────────
export function generateK1(ramOn) {
  const reactions = [
    { metal: 'Mg', acid: 'HCl', gas: 'H₂', context: 'magnesium ribbon and hydrochloric acid' },
    { metal: 'CaCO₃', acid: 'HCl', gas: 'CO₂', context: 'calcium carbonate chips and hydrochloric acid' },
  ];
  const rxn = randChoice(reactions);

  // Generate a plausible volume-time data set (cumulative, plateauing)
  const maxVol = randFloat(80, 250, 0);  // cm³ total gas
  const totalTime = randChoice([120, 180, 240]);
  // Volumes at t = 0, 30, 60, 90, 120 ... seconds
  const times = [];
  const vols = [];
  let t = 0;
  while (t <= totalTime) {
    times.push(t);
    // Logistic-ish growth curve
    const frac = 1 - Math.exp(-3.5 * t / totalTime);
    vols.push(parseFloat(sfStr(maxVol * frac, 3)));
    t += 30;
  }
  // Make last few values plateau at maxVol
  for (let i = vols.length - 2; i < vols.length; i++) vols[i] = maxVol;

  // Average rate in first 60 seconds
  const avgRate_60 = sfStr((vols[2] - vols[0]) / 60, 3);
  // Average rate overall (0 to time when plateau starts ~ 2/3 through)
  const halfIdx = Math.floor(vols.length * 0.5);
  const avgRateOverall = sfStr((vols[halfIdx] - 0) / times[halfIdx], 3);

  const tableRows = times.map((t, i) => `${t} s: ${vols[i]} cm³`).join('\n');

  return {
    category: 'K',
    variant: 'K1',
    title: `Rate of Reaction — Gas Volume vs Time`,
    description: 'Calculate average rate and initial rate from volume-time data',
    problemStatement:
      `In an experiment to study the rate of reaction between ${rxn.context}, ` +
      `the volume of ${rxn.gas} gas produced was recorded every 30 seconds:\n\n` +
      tableRows +
      `\n\n(a) Calculate the average rate of reaction over the first 60 seconds in cm³/s.` +
      `\n(b) Suggest what the initial rate of reaction is, and how you would determine it from a graph.` +
      `\n(c) Explain why the rate decreases as time progresses.`,
    equation: rxn.gas === 'H₂'
      ? 'Mg(s) + 2HCl(aq) → MgCl₂(aq) + H₂(g)'
      : 'CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + H₂O(l) + CO₂(g)',
    solution: [
      {
        step: 1,
        title: 'Average rate in first 60 seconds',
        content:
          `Average rate = ΔV / Δt = (${vols[2]} − ${vols[0]}) / (60 − 0)\n` +
          `= ${vols[2]} / 60\n` +
          `= ${avgRate_60} cm³/s`,
      },
      {
        step: 2,
        title: 'Initial rate',
        content:
          `The initial rate is the rate at t = 0.\n` +
          `To find it from a graph: draw a tangent to the volume-time curve at t = 0.\n` +
          `The gradient of this tangent = initial rate.\n` +
          `Approximate initial rate ≈ ${sfStr(parseFloat(avgRate_60) * 1.5, 3)} cm³/s (steeper than average).`,
      },
      {
        step: 3,
        title: 'Why rate decreases',
        content:
          `As the reaction proceeds:\n` +
          `• The concentration of the acid (HCl) decreases — fewer successful collisions per unit time.\n` +
          `• The rate of reaction is proportional to reactant concentration.\n` +
          `• Eventually one reactant is used up completely and the rate falls to zero.`,
      },
    ],
    finalAnswer:
      `(a) Average rate in first 60 s = ${avgRate_60} cm³/s\n` +
      `(b) Initial rate > average rate; found by drawing tangent to curve at t = 0\n` +
      `(c) Rate decreases as acid concentration decreases (fewer collisions per unit time)`,
    notes: [
      'Rate = ΔV / Δt  (gradient of volume-time graph)',
      'Instantaneous rate = gradient of tangent at that point on the graph.',
    ],
    ramInfo: null,
  };
}

// ── K2: Effect of Concentration on Rate (Na₂S₂O₃ + HCl) ──────
export function generateK2(ramOn) {
  const concS2O3 = randFloat(0.05, 0.20, 2);
  const volS2O3 = randChoice([25, 30, 40, 50]);  // cm³
  const volHCl = randChoice([5, 10]);             // cm³
  const time = randInt(20, 200);                  // seconds

  const rate = parseFloat(sfStr(1 / time, 4));
  const totalVol = volS2O3 + volHCl;
  const concS2O3_reacting = concS2O3 * volS2O3 / totalVol;  // diluted concentration

  return {
    category: 'K',
    variant: 'K2',
    title: 'Rate of Reaction — Na₂S₂O₃ + HCl (Disappearing Cross)',
    description: 'Calculate 1/time as a measure of rate; interpret effect of concentration',
    problemStatement:
      `In an experiment to study reaction rate, ${volS2O3} cm³ of sodium thiosulphate (Na₂S₂O₃) ` +
      `of concentration ${concS2O3} mol/dm³ is mixed with ${volHCl} cm³ of dilute HCl (1.0 mol/dm³) ` +
      `in a conical flask placed over a piece of paper marked with a cross. ` +
      `A yellow precipitate of sulfur gradually forms, making the cross invisible. ` +
      `The time for the cross to disappear is ${time} seconds.\n\n` +
      `Na₂S₂O₃(aq) + 2HCl(aq) → 2NaCl(aq) + SO₂(g) + S(s) + H₂O(l)` +
      `\n\n(a) Calculate the rate of reaction (in s⁻¹) as 1/time.` +
      `\n(b) Calculate the actual concentration of Na₂S₂O₃ in the reaction mixture.` +
      `\n(c) Explain why 1/time is used as a measure of rate.`,
    equation: 'Na₂S₂O₃(aq) + 2HCl(aq) → 2NaCl(aq) + SO₂(g) + S(s) + H₂O(l)',
    solution: [
      {
        step: 1,
        title: 'Calculate rate = 1/time',
        content:
          `Rate = 1 / time = 1 / ${time}\n` +
          `= ${sfStr(rate, 3)} s⁻¹`,
      },
      {
        step: 2,
        title: 'Concentration of Na₂S₂O₃ in mixture',
        content:
          `Total volume = ${volS2O3} + ${volHCl} = ${totalVol} cm³\n` +
          `[Na₂S₂O₃] in mixture = ${concS2O3} × ${volS2O3} / ${totalVol}\n` +
          `= ${sfStr(concS2O3_reacting, 3)} mol/dm³`,
      },
      {
        step: 3,
        title: 'Why 1/time is used',
        content:
          `Rate = 1/time because:\n` +
          `• A fixed amount of product (sulfur) must form before the cross disappears.\n` +
          `• Less time → faster rate → 1/time is larger → higher rate.\n` +
          `• This is proportional to the initial rate of the reaction.\n` +
          `• Plotting 1/time vs [Na₂S₂O₃] gives a straight line through the origin (rate ∝ concentration).`,
      },
    ],
    finalAnswer:
      `(a) Rate = 1/${time} = ${sfStr(rate, 3)} s⁻¹\n` +
      `(b) [Na₂S₂O₃] in reaction mixture = ${sfStr(concS2O3_reacting, 3)} mol/dm³\n` +
      `(c) 1/time is proportional to the initial rate — a larger 1/time means the cross disappears faster (reaction is faster).`,
    notes: [
      'The sulfur precipitate (S) is the product being used to measure rate — always the same amount forms when the cross disappears.',
      'Temperature must be controlled — a 10 °C rise approximately doubles the rate.',
    ],
    ramInfo: null,
  };
}

// ============================================================
// CATEGORY L: Chemical Equilibrium (Kc Calculations)
// ============================================================

// ── L1: Calculate Kc from Equilibrium Concentrations ──────────
export function generateL1(ramOn) {
  const systems = [
    {
      name: 'esterification',
      equation: 'CH₃COOH(l) + C₂H₅OH(l) ⇌ CH₃COOC₂H₅(l) + H₂O(l)',
      reactants: ['CH₃COOH', 'C₂H₅OH'],
      products: ['CH₃COOC₂H₅', 'H₂O'],
      expression: 'Kc = [CH₃COOC₂H₅][H₂O] / ([CH₃COOH][C₂H₅OH])',
      calcKc: (c) => (c[2] * c[3]) / (c[0] * c[1]),
    },
    {
      name: 'hydrogen iodide equilibrium',
      equation: 'H₂(g) + I₂(g) ⇌ 2HI(g)',
      reactants: ['H₂', 'I₂'],
      products: ['HI'],
      expression: 'Kc = [HI]² / ([H₂][I₂])',
      calcKc: (c) => (c[2] * c[2]) / (c[0] * c[1]),
    },
    {
      name: 'nitrogen dioxide equilibrium',
      equation: 'N₂O₄(g) ⇌ 2NO₂(g)',
      reactants: ['N₂O₄'],
      products: ['NO₂'],
      expression: 'Kc = [NO₂]² / [N₂O₄]',
      calcKc: (c) => (c[1] * c[1]) / c[0],
    },
  ];
  const sys = randChoice(systems);

  // Generate realistic concentrations
  const c = [
    randFloat(0.10, 1.50, 2),
    randFloat(0.10, 1.50, 2),
    randFloat(0.10, 2.00, 2),
    randFloat(0.10, 1.50, 2),
  ].slice(0, sys.reactants.length + sys.products.length);

  const Kc = sys.calcKc(c);
  const KcStr = sfStr(Kc, 3);

  return {
    category: 'L',
    variant: 'L1',
    title: `Chemical Equilibrium — Calculate Kc`,
    description: 'Calculate equilibrium constant Kc from measured equilibrium concentrations',
    problemStatement:
      `At a certain temperature, the following equilibrium is established:\n\n` +
      `${sys.equation}\n\n` +
      `At equilibrium, the following concentrations were measured:\n` +
      sys.reactants.map((r, i) => `[${r}] = ${c[i]} mol/dm³`).join('\n') + '\n' +
      sys.products.map((p, i) => `[${p}] = ${c[sys.reactants.length + i]} mol/dm³`).join('\n') +
      `\n\n(a) Write the expression for Kc for this reaction.` +
      `\n(b) Calculate the value of Kc at this temperature.` +
      `\n(c) Comment on the position of equilibrium based on the value of Kc.`,
    equation: sys.equation,
    solution: [
      {
        step: 1,
        title: 'Write the expression for Kc',
        content:
          `${sys.expression}\n` +
          `(Products over reactants, each raised to the power of their stoichiometric coefficient)`,
      },
      {
        step: 2,
        title: 'Substitute equilibrium concentrations',
        content:
          `${sys.expression}\n` +
          `= ${sys.products.map((p, i) => `(${c[sys.reactants.length + i]})`).join(' × ')} / ` +
          `${sys.reactants.map((r, i) => `(${c[i]})`).join(' × ')}\n` +
          `= ${KcStr}`,
      },
      {
        step: 3,
        title: 'Comment on position of equilibrium',
        content:
          Kc > 10
            ? `Kc = ${KcStr} >> 1 → Equilibrium lies to the RIGHT (products favoured).\nAt equilibrium, there are more products than reactants.`
            : Kc < 0.1
            ? `Kc = ${KcStr} << 1 → Equilibrium lies to the LEFT (reactants favoured).\nAt equilibrium, there are more reactants than products.`
            : `Kc = ${KcStr} ≈ 1 → Equilibrium is roughly midway; significant amounts of both reactants and products are present.`,
      },
    ],
    finalAnswer:
      `(a) ${sys.expression}\n` +
      `(b) Kc = ${KcStr}\n` +
      `(c) ${Kc > 10 ? 'Equilibrium lies to the right (products favoured).' : Kc < 0.1 ? 'Equilibrium lies to the left (reactants favoured).' : 'Equilibrium is roughly central.'}`,
    notes: [
      'Kc is dimensionless when written in terms of concentrations (mol/dm³) with the standard state.',
      'Kc depends only on temperature — changing concentration, pressure, or adding a catalyst does NOT change Kc.',
    ],
    ramInfo: null,
  };
}

// ── L2: ICE Table — Find Equilibrium Concentrations ───────────
export function generateL2(ramOn) {
  // Use the esterification equilibrium (Kc ≈ 4 typically)
  const Kc = randFloat(2.0, 8.0, 2);
  const initialMolAcid = randFloat(0.50, 2.00, 2);
  const initialMolAlcohol = randFloat(0.50, 2.00, 2);
  const volume = randChoice([1.0, 2.0]);  // dm³

  const c0_acid = initialMolAcid / volume;
  const c0_alc = initialMolAlcohol / volume;

  // CH3COOH + C2H5OH ⇌ CH3COOC2H5 + H2O
  // ICE: c0, 0, 0, 0 initially (no products)
  // At eq: (c0_acid - x), (c0_alc - x), x, x
  // Kc = x² / ((c0_acid - x)(c0_alc - x))
  // Kc × (c0_acid - x)(c0_alc - x) = x²
  // Solve quadratic: x² - Kc(c0_acid + c0_alc)x + Kc·c0_acid·c0_alc = 0 (after rearranging for Kc ≠ 1)
  // (Kc - 1)x² - Kc(c0_acid + c0_alc)x + Kc·c0_acid·c0_alc = 0
  const a = Kc - 1;
  const b = -Kc * (c0_acid + c0_alc);
  const cc = Kc * c0_acid * c0_alc;
  const discriminant = b * b - 4 * a * cc;
  // Pick the smaller root (x < min(c0_acid, c0_alc))
  let x;
  if (!Number.isFinite(discriminant) || discriminant < 0) {
    return generateL2(ramOn);
  }
  if (Math.abs(a) < 0.001) {
    x = -cc / b;  // linear
  } else {
    x = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (x < 0 || x > Math.min(c0_acid, c0_alc)) {
      x = (-b + Math.sqrt(discriminant)) / (2 * a);
    }
  }
  if (!Number.isFinite(x)) {
    return generateL2(ramOn);
  }
  if (x < 0 || x > Math.min(c0_acid, c0_alc)) {
    return generateL2(ramOn);
  }
  x = Math.max(0, Math.min(x, Math.min(c0_acid, c0_alc) * 0.95));

  const eq_acid = c0_acid - x;
  const eq_alc = c0_alc - x;
  const eq_ester = x;
  const eq_water = x;

  return {
    category: 'L',
    variant: 'L2',
    title: 'Chemical Equilibrium — ICE Table (Esterification)',
    description: 'Find equilibrium concentrations using an ICE table given Kc',
    problemStatement:
      `For the esterification reaction:\n\n` +
      `CH₃COOH(l) + C₂H₅OH(l) ⇌ CH₃COOC₂H₅(l) + H₂O(l)\n\n` +
      `the equilibrium constant Kc = ${Kc} at a given temperature. ` +
      `${initialMolAcid} mol of ethanoic acid (CH₃COOH) and ${initialMolAlcohol} mol of ethanol (C₂H₅OH) ` +
      `are mixed in a flask of volume ${volume} dm³. No products are present initially.\n\n` +
      `(a) Set up an ICE (Initial-Change-Equilibrium) table.` +
      `\n(b) Calculate the equilibrium concentrations of all four species.`,
    equation: 'CH₃COOH(l) + C₂H₅OH(l) ⇌ CH₃COOC₂H₅(l) + H₂O(l)',
    solution: [
      {
        step: 1,
        title: 'Set up ICE table (concentrations in mol/dm³)',
        content:
          `Initial concentrations:\n` +
          `[CH₃COOH]₀ = ${initialMolAcid}/${volume} = ${sfStr(c0_acid, 4)} mol/dm³\n` +
          `[C₂H₅OH]₀ = ${initialMolAlcohol}/${volume} = ${sfStr(c0_alc, 4)} mol/dm³\n` +
          `[CH₃COOC₂H₅]₀ = 0,  [H₂O]₀ = 0\n\n` +
          `Change: let x = amount reacted (mol/dm³)\n\n` +
          `Equilibrium concentrations:\n` +
          `[CH₃COOH] = ${sfStr(c0_acid, 4)} − x\n` +
          `[C₂H₅OH] = ${sfStr(c0_alc, 4)} − x\n` +
          `[CH₃COOC₂H₅] = x\n` +
          `[H₂O] = x`,
      },
      {
        step: 2,
        title: 'Write and solve Kc expression',
        content:
          `Kc = [CH₃COOC₂H₅][H₂O] / ([CH₃COOH][C₂H₅OH])\n` +
          `${Kc} = x² / ((${sfStr(c0_acid, 4)} − x)(${sfStr(c0_alc, 4)} − x))\n\n` +
          `Rearranging → (${Kc} − 1)x² − ${Kc}(${sfStr(c0_acid + c0_alc, 4)})x + ${Kc}(${sfStr(c0_acid * c0_alc, 4)}) = 0\n` +
          `Solving quadratic: x = ${sfStr(x, 4)} mol/dm³`,
      },
      {
        step: 3,
        title: 'Equilibrium concentrations',
        content:
          `[CH₃COOH] = ${sfStr(c0_acid, 4)} − ${sfStr(x, 4)} = ${sfStr(eq_acid, 3)} mol/dm³\n` +
          `[C₂H₅OH] = ${sfStr(c0_alc, 4)} − ${sfStr(x, 4)} = ${sfStr(eq_alc, 3)} mol/dm³\n` +
          `[CH₃COOC₂H₅] = ${sfStr(eq_ester, 3)} mol/dm³\n` +
          `[H₂O] = ${sfStr(eq_water, 3)} mol/dm³`,
      },
      {
        step: 4,
        title: 'Verify',
        content:
          `Check: Kc = (${sfStr(eq_ester, 3)})² / ((${sfStr(eq_acid, 3)})(${sfStr(eq_alc, 3)}))\n` +
          `= ${sfStr(eq_ester * eq_water, 4)} / ${sfStr(eq_acid * eq_alc, 4)}\n` +
          `= ${sfStr((eq_ester * eq_water) / (eq_acid * eq_alc), 3)} ≈ ${Kc} ✓`,
      },
    ],
    finalAnswer:
      `(b) At equilibrium:\n` +
      `[CH₃COOH] = ${sfStr(eq_acid, 3)} mol/dm³\n` +
      `[C₂H₅OH] = ${sfStr(eq_alc, 3)} mol/dm³\n` +
      `[CH₃COOC₂H₅] = ${sfStr(eq_ester, 3)} mol/dm³\n` +
      `[H₂O] = ${sfStr(eq_water, 3)} mol/dm³`,
    notes: [
      'The reaction never reaches 100% conversion because it is reversible.',
      `Kc = ${Kc} means the products are moderately favoured at equilibrium.`,
      'Acid catalyst (H₂SO₄) speeds up equilibrium but does NOT change the value of Kc.',
    ],
    ramInfo: null,
  };
}

// ============================================================
// CATEGORY N: Organic Preparations
// ============================================================

// ── N1: Ester Preparation (Percentage Yield with Limiting Reagent)
export function generateN1(ramOn) {
  const M_CH3COOH = MM.CH3COOH; // 60.0
  const M_C2H5OH = MM.C2H5OH;   // 46.0
  const M_ester = M({ C: 4, H: 8, O: 2 }); // CH3COOC2H5 = 88.0

  const massAcid = parseFloat(sfStr(randMass(3.0, 20.0), 4));
  const massAlcohol = parseFloat(sfStr(randMass(2.0, 15.0), 4));
  const percentYield = randFloat(40, 85, 1);

  const molAcid = massAcid / M_CH3COOH;
  const molAlcohol = massAlcohol / M_C2H5OH;
  const acidLimiting = molAcid <= molAlcohol;
  const limitingMol = Math.min(molAcid, molAlcohol);
  const theoreticalMol = limitingMol;  // 1:1:1 ratio
  const theoreticalYield = theoreticalMol * M_ester;
  const actualYield = parseFloat(sfStr((percentYield / 100) * theoreticalYield, 4));

  const limitingName = acidLimiting ? 'ethanoic acid' : 'ethanol';
  const excessName = acidLimiting ? 'ethanol' : 'ethanoic acid';

  const ramInfo = ramOn
    ? `(Relative atomic masses: H = 1.0, C = 12.0, O = 16.0)`
    : null;

  return {
    category: 'N',
    variant: 'N1',
    title: 'Ester Preparation — Limiting Reagent and Percentage Yield',
    description: 'Determine limiting reagent; calculate theoretical and percentage yield of ethyl ethanoate',
    problemStatement:
      `A student heated ${massAcid} g of ethanoic acid (CH₃COOH) with ${massAlcohol} g of ethanol (C₂H₅OH) ` +
      `in the presence of a few drops of concentrated sulphuric acid as catalyst. ` +
      `After reflux and purification, the mass of ethyl ethanoate (CH₃COOC₂H₅) obtained was ${actualYield} g.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the balanced equation for this esterification reaction.` +
      `\n(b) Determine the limiting reagent, showing your working.` +
      `\n(c) Calculate the theoretical yield of ethyl ethanoate.` +
      `\n(d) Calculate the percentage yield.`,
    equation: 'CH₃COOH(l) + C₂H₅OH(l) ⇌ CH₃COOC₂H₅(l) + H₂O(l)',
    solution: [
      {
        step: 1,
        title: 'Balanced equation',
        content:
          `CH₃COOH(l) + C₂H₅OH(l) ⇌ CH₃COOC₂H₅(l) + H₂O(l)\n` +
          `Mole ratio CH₃COOH : C₂H₅OH : CH₃COOC₂H₅ = 1 : 1 : 1`,
      },
      {
        step: 2,
        title: 'Calculate moles of each reactant',
        content:
          `M(CH₃COOH) = 2(12.0) + 4(1.0) + 2(16.0) = ${sfStr(M_CH3COOH, 4)} g/mol\n` +
          `n(CH₃COOH) = ${massAcid} / ${sfStr(M_CH3COOH, 4)} = ${sfStr(molAcid, 4)} mol\n\n` +
          `M(C₂H₅OH) = 2(12.0) + 6(1.0) + 16.0 = ${sfStr(M_C2H5OH, 4)} g/mol\n` +
          `n(C₂H₅OH) = ${massAlcohol} / ${sfStr(M_C2H5OH, 4)} = ${sfStr(molAlcohol, 4)} mol`,
      },
      {
        step: 3,
        title: 'Determine limiting reagent',
        content:
          `Mole ratio is 1:1, so compare moles directly.\n` +
          `n(CH₃COOH) = ${sfStr(molAcid, 4)} mol\n` +
          `n(C₂H₅OH) = ${sfStr(molAlcohol, 4)} mol\n\n` +
          (acidLimiting
            ? `n(CH₃COOH) < n(C₂H₅OH) → ethanoic acid is the LIMITING REAGENT.`
            : `n(C₂H₅OH) < n(CH₃COOH) → ethanol is the LIMITING REAGENT.`),
      },
      {
        step: 4,
        title: 'Theoretical yield of CH₃COOC₂H₅',
        content:
          `n(CH₃COOC₂H₅)_theoretical = n(limiting) = ${sfStr(limitingMol, 4)} mol\n` +
          `M(CH₃COOC₂H₅) = 4(12.0) + 8(1.0) + 2(16.0) = ${sfStr(M_ester, 4)} g/mol\n` +
          `Theoretical yield = ${sfStr(limitingMol, 4)} × ${sfStr(M_ester, 4)} = ${sfStr(theoreticalYield, 3)} g`,
      },
      {
        step: 5,
        title: 'Percentage yield',
        content:
          `% yield = (actual / theoretical) × 100\n` +
          `= (${actualYield} / ${sfStr(theoreticalYield, 3)}) × 100\n` +
          `= ${sfStr(percentYield, 3)}%`,
      },
    ],
    finalAnswer:
      `(a) CH₃COOH(l) + C₂H₅OH(l) ⇌ CH₃COOC₂H₅(l) + H₂O(l)\n` +
      `(b) Limiting reagent: ${limitingName} (${excessName} is in excess)\n` +
      `(c) Theoretical yield = ${sfStr(theoreticalYield, 3)} g\n` +
      `(d) Percentage yield = ${sfStr(percentYield, 3)}%`,
    notes: [
      'Yield < 100% because: the reaction is reversible (equilibrium), losses during purification (distillation), and side reactions.',
      'Concentrated H₂SO₄ acts as a catalyst AND dehydrating agent — it removes water to drive the equilibrium towards products.',
      'Ethyl ethanoate has a fruity odour; it is used as a solvent and in artificial flavourings.',
    ],
    ramInfo,
  };
}

// ── N2: Oxidation of Ethanol to Ethanoic Acid ─────────────────
export function generateN2(ramOn) {
  const M_C2H5OH = MM.C2H5OH;       // 46.0
  const M_CH3COOH = MM.CH3COOH;     // 60.0

  const massEthanol = parseFloat(sfStr(randMass(2.0, 12.0), 4));
  const percentYield = randFloat(40, 88, 1);

  const molEthanol = massEthanol / M_C2H5OH;
  const molAcid_theoretical = molEthanol; // 1:1
  const theoreticalYield = molAcid_theoretical * M_CH3COOH;
  const actualYield = parseFloat(sfStr((percentYield / 100) * theoreticalYield, 4));

  const ramInfo = ramOn
    ? `(Relative atomic masses: H = 1.0, C = 12.0, O = 16.0, K = 39.1, Cr = 52.0)`
    : null;

  return {
    category: 'N',
    variant: 'N2',
    title: 'Organic Preparation — Oxidation of Ethanol to Ethanoic Acid',
    description: 'Calculate percentage yield for the oxidation of ethanol using acidified K₂Cr₂O₇',
    problemStatement:
      `A student oxidised ${massEthanol} g of ethanol (C₂H₅OH) using excess acidified ` +
      `potassium dichromate(VI) (K₂Cr₂O₇). The ethanoic acid (CH₃COOH) produced was ` +
      `purified by distillation and found to have a mass of ${actualYield} g.` +
      (ramInfo ? ` ${ramInfo}` : '') +
      `\n\n(a) Write the balanced equation for the oxidation of ethanol to ethanoic acid using [O] to represent the oxidising agent.` +
      `\n(b) Calculate the theoretical yield of ethanoic acid.` +
      `\n(c) Calculate the percentage yield.`,
    equation: 'C₂H₅OH(l) + 2[O] → CH₃COOH(l) + H₂O(l)',
    solution: [
      {
        step: 1,
        title: 'Balanced equation',
        content:
          `C₂H₅OH(l) + 2[O] → CH₃COOH(l) + H₂O(l)\n` +
          `[O] represents the oxygen supplied by the acidified K₂Cr₂O₇ oxidising agent.\n` +
          `Mole ratio C₂H₅OH : CH₃COOH = 1 : 1`,
      },
      {
        step: 2,
        title: 'Calculate moles of ethanol',
        content:
          `M(C₂H₅OH) = 2(12.0) + 6(1.0) + 16.0 = ${sfStr(M_C2H5OH, 4)} g/mol\n` +
          `n(C₂H₅OH) = ${massEthanol} / ${sfStr(M_C2H5OH, 4)} = ${sfStr(molEthanol, 4)} mol`,
      },
      {
        step: 3,
        title: 'Theoretical yield of CH₃COOH',
        content:
          `n(CH₃COOH)_theoretical = n(C₂H₅OH) = ${sfStr(molAcid_theoretical, 4)} mol\n` +
          `M(CH₃COOH) = 2(12.0) + 4(1.0) + 2(16.0) = ${sfStr(M_CH3COOH, 4)} g/mol\n` +
          `Theoretical yield = ${sfStr(molAcid_theoretical, 4)} × ${sfStr(M_CH3COOH, 4)} = ${sfStr(theoreticalYield, 3)} g`,
      },
      {
        step: 4,
        title: 'Percentage yield',
        content:
          `% yield = (${actualYield} / ${sfStr(theoreticalYield, 3)}) × 100 = ${sfStr(percentYield, 3)}%`,
      },
    ],
    finalAnswer:
      `(a) C₂H₅OH(l) + 2[O] → CH₃COOH(l) + H₂O(l)\n` +
      `(b) Theoretical yield = ${sfStr(theoreticalYield, 3)} g\n` +
      `(c) Percentage yield = ${sfStr(percentYield, 3)}%`,
    notes: [
      'The oxidising agent K₂Cr₂O₇ turns from orange (Cr₂O₇²⁻) to green (Cr³⁺) as it oxidises the ethanol.',
      'If temperature is not controlled, over-oxidation can occur: ethanol → ethanal → ethanoic acid.',
      'Excess K₂Cr₂O₇ is used to ensure all ethanol is fully oxidised to the acid (not the aldehyde).',
    ],
    ramInfo,
  };
}
