import { useState, useMemo, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const AVOGADRO = 6.022e23;
const DEFAULT_MOLAR_VOLUME = 24;

const STATE_OPTIONS = [
  { value: "solid",   label: "Solid",   symbol: "(s)",  color: "#92400E", bg: "#FEF3C7" },
  { value: "liquid",  label: "Liquid",  symbol: "(l)",  color: "#1E40AF", bg: "#DBEAFE" },
  { value: "gas",     label: "Gas",     symbol: "(g)",  color: "#166534", bg: "#DCFCE7" },
  { value: "aqueous", label: "Aqueous", symbol: "(aq)", color: "#155E75", bg: "#CFFAFE" },
];
const STATE_META    = Object.fromEntries(STATE_OPTIONS.map(s => [s.value, s]));
const STATE_SYMBOLS = Object.fromEntries(STATE_OPTIONS.map(s => [s.value, s.symbol]));

// ─────────────────────────────────────────────────────────────────────────────
// Unit helpers
// ─────────────────────────────────────────────────────────────────────────────
function getAvailableUnits(state) {
  if (state === "aqueous") return [
    { value: "mol",       label: "moles (mol) — solute" },
    { value: "g",         label: "mass (g) — solute" },
    { value: "cm3",       label: "volume (cm³) — solution" },
    { value: "dm3",       label: "volume (dm³) — solution" },
    { value: "particles", label: "particles" },
  ];
  if (state === "gas") return [
    { value: "mol",       label: "moles (mol)" },
    { value: "g",         label: "mass (g)" },
    { value: "cm3",       label: "volume (cm³)" },
    { value: "dm3",       label: "volume (dm³)" },
    { value: "particles", label: "particles" },
  ];
  return [
    { value: "mol",       label: "moles (mol)" },
    { value: "g",         label: "mass (g)" },
    { value: "cm3",       label: "volume (cm³)" },
    { value: "dm3",       label: "volume (dm³)" },
    { value: "particles", label: "particles" },
  ];
}
function uLabel(u) { return u === "cm3" ? "cm³" : u === "dm3" ? "dm³" : u; }

function getRequiredProps(state, unit) {
  if (unit === "g" || unit === "particles") return ["molarMass"];
  if (unit === "cm3" || unit === "dm3") {
    if (state === "gas")     return ["molarVolume"];
    if (state === "aqueous") return ["concentration"];
    return ["density", "molarMass"];
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Core maths
// ─────────────────────────────────────────────────────────────────────────────
function parseChem(c) {
  return {
    ...c,
    molarMass:     parseFloat(c.molarMass)     || null,
    density:       parseFloat(c.density)       || null,
    concentration: parseFloat(c.concentration) || null,
    molarVolume:   parseFloat(c.molarVolume)   || DEFAULT_MOLAR_VOLUME,
  };
}

function toMoles(value, unit, chem) {
  const { state, molarMass, density, concentration, concUnit, molarVolume } = chem;
  if (unit === "mol") return value;
  if (unit === "g") {
    if (!molarMass) throw new Error(`Molar mass required for ${chem.label}`);
    return value / molarMass;
  }
  if (unit === "particles") return value / AVOGADRO;
  if (unit === "cm3" || unit === "dm3") {
    const dm3 = unit === "cm3" ? value / 1000 : value;
    if (state === "gas") return dm3 / (molarVolume || DEFAULT_MOLAR_VOLUME);
    if (state === "aqueous") {
      if (!concentration) throw new Error(`Concentration required for ${chem.label}`);
      if (concUnit === "g/dm3") {
        if (!molarMass) throw new Error(`Molar mass required for ${chem.label} (needed for g dm⁻³ → mol)`);
        return (dm3 * concentration) / molarMass;
      }
      return dm3 * concentration;
    }
    if (!density)   throw new Error(`Density required for ${chem.label}`);
    if (!molarMass) throw new Error(`Molar mass required for ${chem.label}`);
    const cm3v = unit === "cm3" ? value : value * 1000;
    return (cm3v * density) / molarMass;
  }
  throw new Error(`Unknown unit: ${unit}`);
}

function fromMoles(moles, unit, chem) {
  const { state, molarMass, density, concentration, concUnit, molarVolume } = chem;
  if (unit === "mol") return moles;
  if (unit === "g") {
    if (!molarMass) throw new Error(`Molar mass required for ${chem.label}`);
    return moles * molarMass;
  }
  if (unit === "particles") return moles * AVOGADRO;
  if (unit === "cm3" || unit === "dm3") {
    if (state === "gas") {
      const dm3 = moles * (molarVolume || DEFAULT_MOLAR_VOLUME);
      return unit === "cm3" ? dm3 * 1000 : dm3;
    }
    if (state === "aqueous") {
      if (!concentration) throw new Error(`Concentration required for ${chem.label}`);
      const dm3 = concUnit === "g/dm3"
        ? (() => { if (!molarMass) throw new Error(`Molar mass required for ${chem.label}`); return (moles * molarMass) / concentration; })()
        : moles / concentration;
      return unit === "cm3" ? dm3 * 1000 : dm3;
    }
    if (!density)   throw new Error(`Density required for ${chem.label}`);
    if (!molarMass) throw new Error(`Molar mass required for ${chem.label}`);
    const cm3v = (moles * molarMass) / density;
    return unit === "cm3" ? cm3v : cm3v / 1000;
  }
  throw new Error(`Unknown unit: ${unit}`);
}

function formatNum(n) {
  if (n === 0) return "0";
  if (Math.abs(n) >= 1e5 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(4);
  return parseFloat(n.toPrecision(5)).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Formula strings for step-by-step
// ─────────────────────────────────────────────────────────────────────────────
function convFormula(numVal, unit, chem) {
  const u = unit;
  if (u === "mol")       return `${numVal} mol  (given directly)`;
  if (u === "g")         return `${numVal} g  ÷  ${chem.molarMass} g mol⁻¹`;
  if (u === "particles") return `${numVal.toExponential(3)}  ÷  6.022 × 10²³`;
  if ((u === "cm3" || u === "dm3") && chem.state === "gas") {
    const dm3 = u === "cm3" ? numVal / 1000 : numVal;
    const mv  = chem.molarVolume || DEFAULT_MOLAR_VOLUME;
    return u === "cm3"
      ? `${numVal} cm³  ÷  1000  =  ${dm3} dm³  ÷  ${mv} dm³ mol⁻¹`
      : `${numVal} dm³  ÷  ${mv} dm³ mol⁻¹`;
  }
  if ((u === "cm3" || u === "dm3") && chem.state === "aqueous") {
    const dm3 = u === "cm3" ? numVal / 1000 : numVal;
    return chem.concUnit === "g/dm3"
      ? `${dm3} dm³  ×  ${chem.concentration} g dm⁻³  ÷  ${chem.molarMass} g mol⁻¹`
      : `${dm3} dm³  ×  ${chem.concentration} mol dm⁻³`;
  }
  const cm3v = u === "cm3" ? numVal : numVal * 1000;
  return `${cm3v} cm³  ×  ${chem.density} g cm⁻³  ÷  ${chem.molarMass} g mol⁻¹`;
}

function finalConvFormula(moles, unit, chem, result) {
  const u = unit, mm = chem.molarMass, mv = chem.molarVolume || DEFAULT_MOLAR_VOLUME;
  const rho = chem.density, conc = chem.concentration;
  if (u === "mol")       return `${formatNum(moles)} mol  →  no unit conversion needed`;
  if (u === "g")         return `${formatNum(moles)} mol  ×  ${mm} g mol⁻¹  =  ${formatNum(result)} g`;
  if (u === "particles") return `${formatNum(moles)} mol  ×  6.022 × 10²³  =  ${formatNum(result)} particles`;
  if ((u === "cm3" || u === "dm3") && chem.state === "gas") {
    const dm3 = moles * mv;
    return u === "cm3"
      ? `${formatNum(moles)} mol  ×  ${mv} dm³ mol⁻¹  =  ${formatNum(dm3)} dm³  ×  1000  =  ${formatNum(result)} cm³`
      : `${formatNum(moles)} mol  ×  ${mv} dm³ mol⁻¹  =  ${formatNum(result)} dm³`;
  }
  if ((u === "cm3" || u === "dm3") && chem.state === "aqueous") {
    return chem.concUnit === "g/dm3"
      ? `${formatNum(moles)} mol  ×  ${mm} g mol⁻¹  =  ${formatNum(moles * mm)} g  ÷  ${conc} g dm⁻³  =  ${formatNum(result)} ${uLabel(u)}`
      : `${formatNum(moles)} mol  ÷  ${conc} mol dm⁻³  =  ${formatNum(result)} ${uLabel(u)}`;
  }
  const mass = moles * mm, cm3v = mass / rho;
  return u === "cm3"
    ? `${formatNum(moles)} mol  ×  ${mm} g mol⁻¹  =  ${formatNum(mass)} g  ÷  ${rho} g cm⁻³  =  ${formatNum(result)} cm³`
    : `${formatNum(moles)} mol  ×  ${mm} g mol⁻¹  =  ${formatNum(mass)} g  ÷  ${rho} g cm⁻³  =  ${formatNum(cm3v)} cm³  ÷  1000  =  ${formatNum(result)} dm³`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Required-info tracker
// ─────────────────────────────────────────────────────────────────────────────
function computeNecessaryInfo(chemicals, given, target) {
  const needed = {};
  const add = (id, p) => { if (!needed[id]) needed[id] = new Set(); needed[id].add(p); };
  Object.entries(given).forEach(([id, gv]) => {
    if (!gv.enabled || gv.value === "" || !chemicals[id]?.enabled) return;
    const c = chemicals[id];
    getRequiredProps(c.state, gv.unit).forEach(p => add(id, p));
    if (c.state === "aqueous" && c.concUnit === "g/dm3" && (gv.unit === "cm3" || gv.unit === "dm3")) add(id, "molarMass");
  });
  if (target.chemId && chemicals[target.chemId]?.enabled) {
    const c = chemicals[target.chemId];
    getRequiredProps(c.state, target.unit).forEach(p => add(target.chemId, p));
    if (c.state === "aqueous" && c.concUnit === "g/dm3" && (target.unit === "cm3" || target.unit === "dm3")) add(target.chemId, "molarMass");
  }
  return needed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Init helpers
// ─────────────────────────────────────────────────────────────────────────────
const CHEM_IDS = ["A","B","C","D","E","F"];
function initChem(id, isReactant) {
  return { id, label: id, enabled: id === "A" || id === "D", isReactant,
    coeff: 1, state: "solid", stateAuto: false, molarMass: "", density: "",
    concentration: "", concUnit: "mol/dm3", molarVolume: String(DEFAULT_MOLAR_VOLUME) };
}
function initChemicals() {
  const o = {};
  ["A","B","C"].forEach(id => { o[id] = initChem(id, true); });
  ["D","E","F"].forEach(id => { o[id] = initChem(id, false); });
  return o;
}
function initGiven() {
  const o = {}; CHEM_IDS.forEach(id => { o[id] = { enabled: false, value: "", unit: "g" }; }); return o;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prop label helpers
// ─────────────────────────────────────────────────────────────────────────────
const PROP_LABELS = {
  molarMass:     { full: "Molar mass",      unit: "g mol⁻¹" },
  density:       { full: "Density",         unit: "g cm⁻³"  },
  concentration: { full: "Concentration",   unit: ""         },
  molarVolume:   { full: "Molar volume",    unit: "dm³ mol⁻¹" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function StoichiometryCalculator() {
  const [chemicals, setChemicals]   = useState(initChemicals);
  const [given, setGiven]           = useState(initGiven);
  const [target, setTarget]         = useState({ chemId: "D", unit: "g", findType: "amount" });
  const [designatedLimiting, setDesignatedLimiting] = useState(null);

  const [equationText, setEquationText] = useState("");

  const [solution, setSolution]     = useState(null);
  const [calcError, setCalcError]   = useState("");
  const [showSol, setShowSol]       = useState(false);
  const [userAns, setUserAns]       = useState("");
  const [feedback, setFeedback]     = useState(null);

  const enabledIds   = CHEM_IDS.filter(id => chemicals[id].enabled);
  const enReactants  = ["A","B","C"].filter(id => chemicals[id].enabled);
  const enProducts   = ["D","E","F"].filter(id => chemicals[id].enabled);

  const resetSolve   = () => { setSolution(null); setCalcError(""); setFeedback(null); setShowSol(false); setUserAns(""); };

  const ELEMENTS_2 = new Set([
    "He","Li","Be","Ne","Na","Mg","Al","Si","Cl","Ar","Ca","Sc","Ti","Cr","Mn","Fe","Co","Ni","Cu","Zn",
    "Ga","Ge","As","Se","Br","Kr","Rb","Sr","Zr","Nb","Mo","Tc","Ru","Rh","Pd","Ag","Cd","In","Sn","Sb",
    "Te","Xe","Cs","Ba","La","Ce","Pr","Nd","Pm","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu","Hf",
    "Ta","Re","Os","Ir","Pt","Au","Hg","Tl","Pb","Bi","Po","At","Rn","Fr","Ra","Ac","Th","Pa","Np","Pu",
    "Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr","Rf","Db","Sg","Bh","Hs","Mt","Ds","Rg","Cn","Fl","Lv",
    "Ts","Og","Nh"
  ]);
  const ELEMENTS_1 = new Set(["H","B","C","N","O","F","P","S","K","V","Y","I","W","U"]);

  const normalizeFormulaCase = (raw) => {
    const s0 = (raw ?? "").toString().trim();
    if (!s0) return "";
    const s = s0.replace(/\s+/g, "");

    let out = "";
    let i = 0;

    while (i < s.length) {
      const ch = s[i];
      if (!/[a-zA-Z]/.test(ch)) {
        out += ch;
        i += 1;
        continue;
      }

      const a = ch;
      const b = s[i + 1];
      const one = a.toUpperCase();
      const two = b && /[a-zA-Z]/.test(b) ? (a + b).toLowerCase() : null;
      const twoCap = two ? two[0].toUpperCase() + two[1].toLowerCase() : null;

      if (twoCap && ELEMENTS_2.has(twoCap)) {
        if ((twoCap === "Nh" || twoCap === "No") && ELEMENTS_1.has(one) && ELEMENTS_1.has(b.toUpperCase())) {
          out += one;
          i += 1;
        } else {
          out += twoCap;
          i += 2;
        }
      } else {
        out += one;
        i += 1;
      }
    }

    return out;
  };

  const parseStateSymbol = (sym) => {
    const s = (sym ?? "").toString().trim().toLowerCase();
    if (s === "(s)") return "solid";
    if (s === "(l)") return "liquid";
    if (s === "(g)") return "gas";
    if (s === "(aq)") return "aqueous";
    return null;
  };

  const guessStateForFormula = (formula, prevState) => {
    const f = (formula ?? "").toString();
    const up = f.toUpperCase();

    if (up === "H2O") return "liquid";
    if (/\(AQ\)$/.test(up)) return "aqueous";
    if (/[\+\-]/.test(f) || /\^\d*[\+\-]/.test(f)) return "aqueous";
    if (["H2","N2","O2","F2","CL2","BR2","I2","CO2","CO","NH3","HCL","SO2","NO","NO2"].includes(up)) return "gas";

    return prevState || "solid";
  };

  const applyEquationText = useCallback(() => {
    const raw = (equationText ?? "").toString().trim();
    if (!raw) return;

    const parts = raw.split(/\s*(?:->|⟶|→)\s*/);
    if (parts.length !== 2) {
      setCalcError("Equation must contain an arrow like '->'.");
      return;
    }

    const splitSide = (side) => side
      .split(/\s\+\s/g)
      .map(x => x.trim())
      .filter(Boolean);

    const rcts = splitSide(parts[0]);
    const prds = splitSide(parts[1]);
    if (rcts.length > 3 || prds.length > 3) {
      setCalcError("Supports up to 3 reactants and 3 products.");
      return;
    }

    const parseSpecies = (token) => {
      let t = token.trim();
      let stateSym = null;
      const mState = t.match(/\((aq|s|l|g)\)\s*$/i);
      if (mState) {
        stateSym = `(${mState[1]})`;
        t = t.slice(0, mState.index).trim();
      }

      let coeff = 1;
      const mCoeff = t.match(/^\s*(\d+)\s*/);
      if (mCoeff) {
        coeff = Math.max(1, Math.min(9, parseInt(mCoeff[1], 10) || 1));
        t = t.slice(mCoeff[0].length).trim();
      }

      const label = normalizeFormulaCase(t);
      const state = stateSym ? parseStateSymbol(stateSym) : null;
      return { coeff, label, stateProvided: Boolean(state), state: state || null };
    };

    const rData = rcts.map(parseSpecies);
    const pData = prds.map(parseSpecies);
    if (rData.some(x => !x.label) || pData.some(x => !x.label)) {
      setCalcError("Could not parse one of the formulas. Example: 2H2(g) + O2(g) -> 2H2O(l)");
      return;
    }

    setChemicals(prev => {
      const next = { ...prev };

      ["A","B","C"].forEach((id, idx) => {
        if (idx < rData.length) {
          const spec = rData[idx];
          const prevState = prev[id]?.state;
          const state = spec.stateProvided ? spec.state : guessStateForFormula(spec.label, prevState);
          next[id] = {
            ...prev[id],
            enabled: true,
            isReactant: true,
            coeff: spec.coeff,
            label: spec.label,
            state,
            stateAuto: !spec.stateProvided,
          };
        } else {
          next[id] = { ...prev[id], enabled: false };
        }
      });

      ["D","E","F"].forEach((id, idx) => {
        if (idx < pData.length) {
          const spec = pData[idx];
          const prevState = prev[id]?.state;
          const state = spec.stateProvided ? spec.state : guessStateForFormula(spec.label, prevState);
          next[id] = {
            ...prev[id],
            enabled: true,
            isReactant: false,
            coeff: spec.coeff,
            label: spec.label,
            state,
            stateAuto: !spec.stateProvided,
          };
        } else {
          next[id] = { ...prev[id], enabled: false };
        }
      });

      return next;
    });

    setCalcError("");
    resetSolve();
  }, [equationText]);

  const updC = (id, f, v) => {
    setChemicals(p => {
      const prev = p[id];
      if (!prev) return p;

      let patch;
      if (typeof f === "object" && f) {
        patch = f;
      } else {
        patch = { [f]: v };
      }

      const nextChem = { ...prev, ...patch };

      if (Object.prototype.hasOwnProperty.call(patch, "label")) {
        nextChem.label = normalizeFormulaCase(patch.label);
      }

      if (typeof f === "string" && f === "state") nextChem.stateAuto = false;
      if (typeof f === "object" && Object.prototype.hasOwnProperty.call(f, "state")) {
        if (!Object.prototype.hasOwnProperty.call(f, "stateAuto")) nextChem.stateAuto = false;
      }
      return { ...p, [id]: nextChem };
    });
    resetSolve();
  };
  const updG = (id, f, v) => { setGiven(p => ({ ...p, [id]: { ...p[id], [f]: v } })); resetSolve(); };

  const necInfo = useMemo(() => computeNecessaryInfo(chemicals, given, target), [chemicals, given, target]);
  const missingArr = useMemo(() => {
    const m = [];
    Object.entries(necInfo).forEach(([id, props]) => {
      const c = chemicals[id];
      [...props].forEach(p => {
        const v = p === "molarVolume" ? c.molarVolume : c[p];
        if (!v || v === "") {
          const pl = PROP_LABELS[p];
          m.push(`${c.label || id}: ${pl.full}${pl.unit ? " (" + pl.unit + ")" : ""}`);
        }
      });
    });
    return m;
  }, [necInfo, chemicals]);

  // ── Calculate ─────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    setCalcError(""); setSolution(null); setShowSol(false); setFeedback(null);
    try {
      const activeGiven = Object.entries(given).filter(
        ([id, gv]) => gv.enabled && gv.value !== "" && chemicals[id]?.enabled
      );
      if (!activeGiven.length) { setCalcError("Please enable and enter at least one given quantity."); return; }
      if (!chemicals[target.chemId]?.enabled) { setCalcError("Please select a valid target chemical."); return; }

      // Step 1: convert to moles
      const steps = [], molesMap = {};
      activeGiven.forEach(([id, gv]) => {
        const nv = parseFloat(gv.value);
        if (isNaN(nv) || nv <= 0) throw new Error(`Invalid value for ${id}: must be a positive number`);
        const cp = parseChem({ ...chemicals[id] });
        const mol = toMoles(nv, gv.unit, cp);
        molesMap[id] = mol;
        steps.push({ id, state: chemicals[id].state, isReactant: chemicals[id].isReactant,
          label: chemicals[id].label || id, original: `${nv} ${uLabel(gv.unit)}`,
          moles: mol, formula: convFormula(nv, gv.unit, cp) });
      });

      // Step 2: reaction units
      const rxnUnitsAll = {};
      activeGiven.forEach(([id]) => { rxnUnitsAll[id] = molesMap[id] / chemicals[id].coeff; });

      let limitId, maxRU, limitMode;
      if (designatedLimiting && molesMap[designatedLimiting] !== undefined) {
        limitId   = designatedLimiting;
        maxRU     = rxnUnitsAll[designatedLimiting];
        limitMode = "designated";
      } else {
        const sortedEntries = Object.entries(rxnUnitsAll).sort((a, b) => a[1] - b[1]);
        limitId   = sortedEntries[0][0];
        maxRU     = sortedEntries[0][1];
        limitMode = "auto";
      }

      const sorted     = Object.entries(rxnUnitsAll).sort((a, b) => a[1] - b[1]);
      const limitIsProd = !chemicals[limitId].isReactant;
      const givenRcts   = activeGiven.filter(([id]) =>  chemicals[id].isReactant).map(([id]) => id);
      const givenPrds   = activeGiven.filter(([id]) => !chemicals[id].isReactant).map(([id]) => id);
      const tgtIsProd   = !chemicals[target.chemId].isReactant;
      const mode = givenPrds.length > 0 && !tgtIsProd ? "retro"
                 : givenRcts.length > 0 &&  tgtIsProd ? "forward"
                 : givenRcts.length > 0 && !tgtIsProd ? "fwd-rct" : "fwd";

      // Step 3: moles of target
      const tCoeff   = chemicals[target.chemId].coeff;
      const findType = target.findType || "amount";
      let moleTarget, stepExpl, findLabel;

      if (findType === "remaining") {
        if (molesMap[target.chemId] === undefined)
          throw new Error(`To find "remaining ${chemicals[target.chemId].label || target.chemId}", you must also enter its initial quantity in the Given Quantities section.`);
        const molesGiven = molesMap[target.chemId];
        const molesUsed  = maxRU * tCoeff;
        const raw        = molesGiven - molesUsed;
        moleTarget = Math.max(0, raw);
        const clamp = raw < 0 ? " (clamped to 0 — fully consumed as limiting reagent)" : "";
        stepExpl   = `Remaining = initial amount − amount consumed\n= ${formatNum(molesGiven)} mol  −  (${formatNum(maxRU)} rxn units × ${tCoeff})\n= ${formatNum(molesGiven)} mol  −  ${formatNum(molesUsed)} mol  =  ${formatNum(moleTarget)} mol${clamp}`;
        findLabel  = "remaining (excess)";
      } else if (findType === "used") {
        moleTarget = maxRU * tCoeff;
        stepExpl   = `Amount used = ${formatNum(maxRU)} rxn units × ${tCoeff} (stoichiometric coefficient)  =  ${formatNum(moleTarget)} mol`;
        findLabel  = chemicals[target.chemId].isReactant ? "consumed in reaction" : "produced in reaction";
      } else {
        if (target.chemId === limitId && molesMap[target.chemId] !== undefined) {
          moleTarget = molesMap[target.chemId];
          stepExpl   = `${target.chemId} is itself the controlling quantity  →  amount = ${formatNum(moleTarget)} mol`;
        } else {
          moleTarget = maxRU * tCoeff;
          stepExpl   = `${formatNum(maxRU)} rxn units  ×  ${tCoeff} (coefficient of ${chemicals[target.chemId].label || target.chemId})  =  ${formatNum(moleTarget)} mol`;
        }
        findLabel = chemicals[target.chemId].isReactant ? "consumed" : "produced";
      }

      // Step 4: convert to target unit
      const tcp    = parseChem({ ...chemicals[target.chemId] });
      const result = fromMoles(moleTarget, target.unit, tcp);

      setSolution({ steps, rxnUnitsAll, sorted, limitId, maxRU, limitIsProd,
        moleTarget, result, targetUnit: target.unit, targetId: target.chemId,
        tCoeff, stepExpl, finalF: finalConvFormula(moleTarget, target.unit, tcp, result),
        mode, findType, findLabel, limitMode, designatedLimiting });
    } catch (e) { setCalcError(e.message); }
  }, [chemicals, given, target, designatedLimiting]);

  function checkAnswer() {
    if (!solution) return;
    const ua  = parseFloat(userAns);
    if (isNaN(ua)) { setFeedback({ ok: false, msg: "Please enter a valid number." }); return; }
    const tol = Math.max(Math.abs(solution.result) * 0.01, 1e-9);
    setFeedback(Math.abs(ua - solution.result) <= tol
      ? { ok: true,  msg: `✓ Correct! The answer is ${formatNum(solution.result)} ${uLabel(solution.targetUnit)}` }
      : { ok: false, msg: `✗ Not quite. Expected ≈ ${formatNum(solution.result)} ${uLabel(solution.targetUnit)}` });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="rounded-2xl border-2 border-[#DDE8DD] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-slate-900 font-extrabold text-lg">Stoichiometry Calculator (DIY)</div>
            <div className="text-slate-600 font-semibold text-sm">Type an equation or build A–F · step-by-step solutions</div>
          </div>
        </div>
      </div>

      {/* ── Step 1: Reaction Builder ── */}
      <Section number="1" title="Build Your Reaction" icon="🔬">
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm mb-4">
          <div className="text-sm font-extrabold text-slate-800 mb-2">Type full equation</div>
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <input
              style={inputStyle({ fontWeight: 700 })}
              placeholder="e.g. 2h2(g) + o2(g) -> 2h2o(l)"
              value={equationText}
              onChange={(e) => setEquationText(e.target.value)}
            />
            <button
              type="button"
              onClick={applyEquationText}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-slate-900 text-white font-extrabold hover:opacity-90 active:scale-[0.99]"
            >
              Apply
            </button>
          </div>
          <div className="text-xs text-slate-500 font-semibold mt-2">
            Use <span className="font-mono">-&gt;</span> for arrow. States optional: <span className="font-mono">(s)</span> <span className="font-mono">(l)</span> <span className="font-mono">(g)</span> <span className="font-mono">(aq)</span>
          </div>
        </div>

        <div className="flex items-start gap-2 flex-wrap">
          {["A","B","C"].map((id, i) => (
            <div key={id} className="flex items-start gap-2">
              {i > 0 && chemicals[id].enabled && (
                <div className="text-xl font-extrabold text-slate-400 pt-7 select-none">+</div>
              )}
              <ChemCard id={id} chem={chemicals[id]} updC={updC} />
            </div>
          ))}
          <div className="text-3xl font-extrabold text-slate-600 self-center pt-7 select-none">⟶</div>
          {["D","E","F"].map((id, i) => (
            <div key={id} className="flex items-start gap-2">
              {i > 0 && chemicals[id].enabled && (
                <div className="text-xl font-extrabold text-slate-400 pt-7 select-none">+</div>
              )}
              <ChemCard id={id} chem={chemicals[id]} updC={updC} />
            </div>
          ))}
        </div>

        {enReactants.length > 0 && enProducts.length > 0 && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, fontFamily: "'Courier New', monospace", fontSize: 15, fontWeight: 700, color: "#1E3A5F" }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 }}>Balanced equation preview</span>
            {enReactants.map((id, i) => (
              <span key={id}>
                {i > 0 ? " + " : ""}
                {chemicals[id].coeff > 1 ? chemicals[id].coeff : ""}
                <FormulaText text={chemicals[id].label || id} />
                <span style={{ fontSize: 10, verticalAlign: "sub" }}>{STATE_SYMBOLS[chemicals[id].state]}</span>
              </span>
            ))}
            <span>  ⟶  </span>
            {enProducts.map((id, i) => (
              <span key={id}>
                {i > 0 ? " + " : ""}
                {chemicals[id].coeff > 1 ? chemicals[id].coeff : ""}
                <FormulaText text={chemicals[id].label || id} />
                <span style={{ fontSize: 10, verticalAlign: "sub" }}>{STATE_SYMBOLS[chemicals[id].state]}</span>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* ── Step 2: Chemical Properties ── */}
      <Section number="2" title="Chemical Properties" icon="📊">
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748B" }}>
          Fill in the properties needed for unit conversions.
          <span style={{ color: "#EF4444", fontWeight: 700 }}> ★ </span>marks fields required by your current question.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {enabledIds.map(id => (
            <PropsCard key={id} id={id} chem={chemicals[id]} updC={updC} necInfo={necInfo[id]} />
          ))}
        </div>
      </Section>

      {/* ── Step 3: Given Quantities ── */}
      <Section number="3" title="Given Quantities" icon="📥">
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748B" }}>
          Tick each chemical whose quantity is known. Works for <strong>reactants</strong> (forward calculation) or <strong>products</strong> (retro / back-calculation), or a mix of both.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {enabledIds.map(id => (
            <GivenCard key={id} id={id} chem={chemicals[id]} given={given[id]}
              updG={updG} isTarget={id === target.chemId}
              isLimiting={designatedLimiting === id}
              onSetLimiting={chemicals[id].isReactant
                ? () => { setDesignatedLimiting(p => p === id ? null : id); resetSolve(); }
                : null}
            />
          ))}
        </div>
        {designatedLimiting && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#9A3412" }}>
              🎯 <strong>{chemicals[designatedLimiting]?.label || designatedLimiting}</strong> is designated as the limiting reagent — all other reactants are treated as excess.
            </span>
            <button onClick={() => { setDesignatedLimiting(null); resetSolve(); }}
              style={{ padding: "4px 12px", border: "1px solid #FDBA74", borderRadius: 20, background: "#FFF", color: "#C2410C", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Clear
            </button>
          </div>
        )}
      </Section>

      {/* ── Step 4: Find ── */}
      <Section number="4" title="Find" icon="🎯">
        <div className="flex gap-3 items-end flex-wrap">
          <FieldGroup label="Chemical">
            <select className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" value={target.chemId}
              onChange={e => { setTarget(t => ({ ...t, chemId: e.target.value })); resetSolve(); }}>
              {enabledIds.map(id => (
                <option key={id} value={id}>
                  {chemicals[id].label || id}  {STATE_SYMBOLS[chemicals[id].state]}  ({chemicals[id].isReactant ? "reactant" : "product"})
                </option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Quantity type">
            <select className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-extrabold shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              style={{
                background: target.findType === "remaining" ? "#FAF5FF" : target.findType === "used" ? "#FFFBEB" : "#F0FDF4",
                color:      target.findType === "remaining" ? "#7E22CE" : target.findType === "used" ? "#B45309" : "#166534",
              }}
              value={target.findType}
              onChange={e => { setTarget(t => ({ ...t, findType: e.target.value })); resetSolve(); }}>
              <option value="amount">{chemicals[target.chemId]?.isReactant ? "Amount consumed" : "Amount produced"}</option>
              <option value="used">Amount used (explicit label)</option>
              <option value="remaining">Remaining / excess amount</option>
            </select>
          </FieldGroup>

          <FieldGroup label="Output unit">
            <select className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" value={target.unit}
              onChange={e => { setTarget(t => ({ ...t, unit: e.target.value })); resetSolve(); }}>
              {getAvailableUnits(chemicals[target.chemId]?.state).map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </FieldGroup>
        </div>
      </Section>
      {target.findType === "remaining" && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-600">
          ⚠️ <strong>Remaining</strong> requires <em>{chemicals[target.chemId]?.label || target.chemId}</em> to also be entered in <strong>Given Quantities</strong> above — the calculator needs to know the initial amount.

        </div>
      )}

      {/* ── Required constants ── */}
      {Object.keys(necInfo).length > 0 && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-extrabold text-blue-800">📋 Required Constants for This Question</div>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            These values must be filled in for the calculation to work. Unfilled fields are highlighted in red.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(necInfo).map(([id, props]) =>
              [...props].map(p => {
                const c  = chemicals[id];
                const v  = p === "molarVolume" ? c.molarVolume : c[p];
                const ok = v && v !== "";
                const pl = PROP_LABELS[p];
                const concSuffix = p === "concentration" ? (c.concUnit === "g/dm3" ? " g dm⁻³" : " mol dm⁻³") : "";
                const display = ok
                  ? `${c.label || id}: ${pl.full} = ${v} ${pl.unit}${concSuffix}`.trim()
                  : `${c.label || id}: ${pl.full} — not set`;
                return (
                  <span
                    key={`${id}-${p}`}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold border ${
                      ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    <span>{ok ? '✓' : '✗'}</span>
                    <span className="font-bold">{display}</span>
                  </span>
                );
              })
            )}
          </div>
          {missingArr.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              <span className="font-extrabold">⚠ Missing:</span> {missingArr.join('  ·  ')}
            </div>
          )}
        </div>
      )}

      {/* ── Calculate ── */}
      <div className="flex gap-3 flex-wrap items-center">
        <button
          type="button"
          onClick={calculate}
          className="px-6 py-3 rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 text-white font-extrabold shadow-sm hover:opacity-95 active:scale-[0.99]"
        >
          ⚡ Calculate
        </button>
        {solution && (
          <button
            type="button"
            onClick={() => setShowSol(s => !s)}
            className={`px-5 py-3 rounded-xl text-white font-extrabold shadow-sm hover:opacity-95 active:scale-[0.99] ${
              showSol ? 'bg-slate-800' : 'bg-slate-600'
            }`}
          >
            {showSol ? "▲ Hide Step-by-Step" : "▼ Show Step-by-Step"}
          </button>
        )}
      </div>
      {calcError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          ❌ {calcError}
        </div>
      )}

      {/* ── Your Answer ── */}
      {solution && (
        <Section number="5" title="Your Answer" icon="✏️">
          <div className="flex gap-3 items-center flex-wrap">
            <input
              type="number"
              placeholder="Enter your answer here…"
              value={userAns}
              onChange={e => { setUserAns(e.target.value); setFeedback(null); }}
              className="w-[220px] max-w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <span className="font-extrabold text-slate-700">{uLabel(solution.targetUnit)}</span>
            <button
              type="button"
              onClick={checkAnswer}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-extrabold shadow-sm hover:bg-emerald-700 active:scale-[0.99]"
            >
              Check Answer
            </button>
          </div>
          {feedback && (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-extrabold border ${
                feedback.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {feedback.msg}
            </div>
          )}
        </Section>
      )}

      {/* ── Solution ── */}
      {solution && showSol && <SolutionPanel sol={solution} chemicals={chemicals} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI primitives
// ─────────────────────────────────────────────────────────────────────────────
function inputStyle(extra = {}) {
  return { border: "1px solid #CBD5E1", borderRadius: 8, padding: "7px 10px", fontSize: 13,
    width: "100%", boxSizing: "border-box", background: "#fff", outline: "none", ...extra };
}

function renderFormulaNodes(formula) {
  const s = (formula ?? "").toString();
  if (!s) return "";

  const nodes = [];
  let i = 0;
  let k = 0;

  while (i < s.length) {
    const ch = s[i];

    if (ch === "^") {
      i++;
      let sup = "";
      while (i < s.length && /[0-9+\-]/.test(s[i])) sup += s[i++];
      if (sup) nodes.push(<sup key={`sup-${k++}`}>{sup}</sup>);
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let num = "";
      while (i < s.length && /[0-9]/.test(s[i])) num += s[i++];

      const next = s[i];
      if (next === "+" || next === "-") {
        nodes.push(<sup key={`sup-${k++}`}>{num + next}</sup>);
        i++;
      } else {
        nodes.push(<sub key={`sub-${k++}`}>{num}</sub>);
      }
      continue;
    }

    if (ch === "+" || ch === "-") {
      nodes.push(<sup key={`sup-${k++}`}>{ch}</sup>);
      i++;
      continue;
    }

    nodes.push(ch);
    i++;
  }

  return nodes;
}

function FormulaText({ text, className, style }) {
  return (
    <span className={className} style={style}>
      {renderFormulaNodes(text)}
    </span>
  );
}

function Section({ number, title, icon, children }) {
  return (
    <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-sm font-extrabold text-blue-700 flex-shrink-0">
          {number}
        </div>
        <div className="text-base font-extrabold text-slate-900">
          {icon} {title}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-2 min-w-[180px]">
      <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChemCard
// ─────────────────────────────────────────────────────────────────────────────
function ChemCard({ id, chem, updC }) {
  const rctColor = chem.isReactant ? "#1D4ED8" : "#059669";
  const sm = STATE_META[chem.state];

  return (
    <div style={{
      border: `2px solid ${chem.enabled ? rctColor + "55" : "#E2E8F0"}`,
      borderRadius: 12, padding: 12, minWidth: 130,
      background: chem.enabled ? (chem.isReactant ? "#F0F7FF" : "#F0FDF4") : "#F8FAFC",
      opacity: chem.enabled ? 1 : 0.45,
      transition: "all .15s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: rctColor }}>{id}</span>
        <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B" }}>
          <input type="checkbox" checked={chem.enabled} onChange={e => updC(id, "enabled", e.target.checked)}
            style={{ width: 14, height: 14, accentColor: rctColor }} />
          Active
        </label>
      </div>

      {chem.enabled && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Formula</div>
          <input
            style={inputStyle({ marginBottom: 10, fontWeight: 700 })}
            placeholder="e.g. Ca(OH)2, NH3, SO4^2-"
            value={chem.label}
            onChange={e => updC(id, "label", e.target.value)}
          />

          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Coefficient</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <CoeffBtn onClick={() => updC(id, "coeff", Math.max(1, chem.coeff - 1))}>−</CoeffBtn>
            <span style={{ fontWeight: 800, fontSize: 17, minWidth: 20, textAlign: "center", color: "#1E293B" }}>{chem.coeff}</span>
            <CoeffBtn onClick={() => updC(id, "coeff", Math.min(9, chem.coeff + 1))}>+</CoeffBtn>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>State</div>
            {chem.stateAuto && (
              <span style={{ fontSize: 10, fontWeight: 800, color: "#64748B", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 999, padding: "2px 8px" }}>
                Auto
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {STATE_OPTIONS.map(s => (
              <button key={s.value} onClick={() => updC(id, "state", s.value)}
                title={s.label}
                style={{
                  padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  border: `1px solid ${chem.state === s.value ? s.color : "#E2E8F0"}`,
                  background: chem.state === s.value ? s.bg : "#fff",
                  color: chem.state === s.value ? s.color : "#94A3B8",
                  cursor: "pointer",
                }}>
                {s.symbol}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CoeffBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="w-7 h-7 rounded-xl border border-slate-300 bg-slate-50 hover:bg-white active:scale-[0.98] font-extrabold text-sm flex items-center justify-center text-slate-700"
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PropsCard
// ─────────────────────────────────────────────────────────────────────────────
function PropsCard({ id, chem, updC, necInfo }) {
  const req  = necInfo || new Set();
  const star = p => req.has(p) ? <span style={{ color: "#EF4444", marginLeft: 3 }}>★</span> : null;
  const sm   = STATE_META[chem.state];

  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, background: "#FAFAFA" }}>
      {/* Chemical header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #F1F5F9" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: sm?.bg || "#EEE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: sm?.color || "#333" }}>
          <FormulaText text={chem.label || id} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}><FormulaText text={chem.label || id} /></div>
          <div style={{ fontSize: 11, color: sm?.color || "#888", fontWeight: 600 }}>{sm?.symbol} {sm?.label} · {chem.isReactant ? "reactant" : "product"}</div>
        </div>
      </div>

      <PropField label="Name / Label" star={null}>
        <input style={inputStyle()} placeholder={`e.g. HCl`} value={chem.label}
          onChange={e => updC(id, "label", e.target.value)} />
      </PropField>

      <PropField label="Molar mass (g mol⁻¹)" star={star("molarMass")}>
        <input style={inputStyle()} type="number" placeholder="e.g. 36.46" value={chem.molarMass}
          onChange={e => updC(id, "molarMass", e.target.value)} />
      </PropField>

      {(chem.state === "solid" || chem.state === "liquid") && (
        <PropField label="Density (g cm⁻³)" star={star("density")}>
          <input style={inputStyle()} type="number" placeholder="e.g. 2.16" value={chem.density}
            onChange={e => updC(id, "density", e.target.value)} />
        </PropField>
      )}

      {chem.state === "gas" && (
        <PropField label="Molar volume (dm³ mol⁻¹)" star={star("molarVolume")}>
          <input style={inputStyle()} type="number" placeholder="24.0" value={chem.molarVolume}
            onChange={e => updC(id, "molarVolume", e.target.value)} />
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>Default: 24.0 dm³ mol⁻¹ at RTP</div>
        </PropField>
      )}

      {chem.state === "aqueous" && (
        <PropField label="Concentration" star={star("concentration")}>
          <div style={{ display: "flex", gap: 6 }}>
            <input style={{ ...inputStyle(), flex: 1 }} type="number" placeholder="e.g. 1.00" value={chem.concentration}
              onChange={e => updC(id, "concentration", e.target.value)} />
            <select style={{ ...inputStyle(), width: "auto", flex: "0 0 auto" }} value={chem.concUnit}
              onChange={e => updC(id, "concUnit", e.target.value)}>
              <option value="mol/dm3">mol dm⁻³</option>
              <option value="g/dm3">g dm⁻³</option>
            </select>
          </div>
        </PropField>
      )}
    </div>
  );
}

function PropField({ label, star, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
        {label}{star}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GivenCard
// ─────────────────────────────────────────────────────────────────────────────
function GivenCard({ id, chem, given, updG, isTarget, isLimiting, onSetLimiting }) {
  const units     = getAvailableUnits(chem.state);
  const rctColor  = chem.isReactant ? "#1D4ED8" : "#059669";
  const sm        = STATE_META[chem.state];
  const active    = given.enabled;

  return (
    <div style={{
      border: `1.5px solid ${isLimiting ? "#F97316" : active ? rctColor + "66" : "#E2E8F0"}`,
      borderRadius: 12, padding: 14,
      background: isLimiting ? "#FFF7ED" : active ? (chem.isReactant ? "#F0F7FF" : "#F0FDF4") : "#FAFAFA",
      transition: "all .15s",
    }}>
      {/* Row 1: toggle + name + limiting button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1, minWidth: 0 }}>
          <input type="checkbox" checked={active} onChange={e => updG(id, "enabled", e.target.checked)}
            style={{ width: 15, height: 15, accentColor: rctColor, flexShrink: 0 }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: rctColor }}><FormulaText text={chem.label || id} /></span>
              <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 20, background: sm?.bg, color: sm?.color, fontWeight: 600 }}>
                {sm?.symbol} {sm?.label}
              </span>
              {isTarget && (
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, background: "#FEF3C7", color: "#92400E", fontWeight: 700 }}>target</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{chem.isReactant ? "Reactant" : "Product"}</div>
          </div>
        </label>

        {onSetLimiting && (
          <button onClick={onSetLimiting}
            title={isLimiting ? "Click to unset" : "Designate as limiting reactant"}
            style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", flexShrink: 0, marginLeft: 6,
              background: isLimiting ? "#F97316" : "#F1F5F9",
              color:      isLimiting ? "#fff"     : "#64748B",
            }}>
            {isLimiting ? "🎯 Limiting" : "Set limiting"}
          </button>
        )}
      </div>

      {/* Row 2: value + unit */}
      {active && (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 3 }}>Value</label>
            <input style={inputStyle()} type="number" placeholder="e.g. 25.0"
              value={given.value} onChange={e => updG(id, "value", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 3 }}>Unit</label>
            <select style={inputStyle()} value={given.unit} onChange={e => updG(id, "unit", e.target.value)}>
              {units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SolutionPanel
// ─────────────────────────────────────────────────────────────────────────────
function SolutionPanel({ sol, chemicals }) {
  const { steps, rxnUnitsAll, sorted, limitId, maxRU, limitIsProd,
    moleTarget, result, targetUnit, targetId,
    stepExpl, finalF, mode, findType, findLabel, limitMode, designatedLimiting } = sol;

  const modeMap = {
    forward:   { label: "▶  Forward — reactant → product",          bg: "#F0FDF4", color: "#166534", border: "#86EFAC" },
    retro:     { label: "◀  Retro — product → reactant (back-calc)", bg: "#FAF5FF", color: "#6B21A8", border: "#D8B4FE" },
    "fwd-rct": { label: "↔  Reactant → reactant",                   bg: "#FFFBEB", color: "#92400E", border: "#FCD34D" },
    fwd:       { label: "↔  Stoichiometric conversion",             bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
  };
  const modeInfo = modeMap[mode] || modeMap.fwd;
  const ansColor = findType === "remaining" ? "#7E22CE" : findType === "used" ? "#C2410C" : "#1D4ED8";
  const ansBg    = findType === "remaining" ? "linear-gradient(135deg,#6B21A8,#9333EA)"
                 : findType === "used"       ? "linear-gradient(135deg,#9A3412,#EA580C)"
                                             : "linear-gradient(135deg,#1E3A5F,#2563EB)";

  const StepBox = ({ color, children, style = {} }) => (
    <div style={{ background: color + "14", borderLeft: `4px solid ${color}`, borderRadius: 8, padding: "10px 14px", margin: "6px 0", fontSize: 13, ...style }}>
      {children}
    </div>
  );

  const StepHeading = ({ n, text }) => (
    <div style={{ fontWeight: 700, fontSize: 14, color: "#1E3A5F", margin: "16px 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 24, height: 24, borderRadius: 6, background: "#EFF6FF", border: "1px solid #BFDBFE", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#1D4ED8", flexShrink: 0 }}>{n}</span>
      {text}
    </div>
  );

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,.07)", borderTop: `4px solid ${ansColor}` }}>
      <div style={{ fontWeight: 800, fontSize: 17, color: "#1E3A5F", marginBottom: 14 }}>📐 Step-by-Step Solution</div>

      {/* Mode + limiting badges */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <span style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 700,
          background: modeInfo.bg, color: modeInfo.color, border: `1px solid ${modeInfo.border}` }}>
          {modeInfo.label}
        </span>
        {limitMode === "designated" && (
          <span style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 700, background: "#FFF7ED", color: "#9A3412", border: "1px solid #FED7AA" }}>
            🎯 Limiting reagent manually set: {chemicals[designatedLimiting]?.label || designatedLimiting}
          </span>
        )}
      </div>

      {/* Step 1 */}
      <StepHeading n="1" text="Convert all given quantities to moles" />
      {steps.map((s, i) => {
        const sm = STATE_META[s.state];
        return (
          <StepBox key={i} color={s.isReactant ? "#22C55E" : "#3B82F6"}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}><FormulaText text={s.label} /></span>
              <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 20, background: sm?.bg, color: sm?.color, fontWeight: 600 }}>{sm?.symbol} {sm?.label}</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{s.isReactant ? "reactant" : "product"}</span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12.5, color: "#334155", background: "#F8FAFC", borderRadius: 6, padding: "5px 9px", margin: "4px 0" }}>
              {s.original}  →  {s.formula}
            </div>
            <div style={{ fontWeight: 700, color: "#1E293B" }}>= {formatNum(s.moles)} mol</div>
          </StepBox>
        );
      })}

      {/* Step 2 */}
      <StepHeading n="2" text={
        <span>Reaction units <span style={{ fontSize: 12, fontWeight: 500, color: "#64748B" }}>(moles ÷ stoichiometric coefficient)</span>
          <span style={{ fontSize: 11.5, marginLeft: 8, fontWeight: 500, color: "#64748B" }}>
            {limitMode === "designated" ? "— user-designated limiting reagent" : limitIsProd ? "— product controls (retro calculation)" : "— smallest value = limiting reagent"}
          </span>
        </span>
      } />
      {sorted.map(([id, ru]) => (
        <StepBox key={id} color={id === limitId ? "#F59E0B" : "#A3E635"}
          style={{ background: id === limitId ? "#FFFBEB" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontFamily: "monospace", fontSize: 13 }}>
              <FormulaText text={chemicals[id].label || id} />:  {formatNum(rxnUnitsAll[id])} mol  ÷  {chemicals[id].coeff}  =  <strong>{formatNum(ru)} reaction units</strong>
            </span>
            <div style={{ display: "flex", gap: 5 }}>
              {id === limitId && (
                <span style={{ padding: "2px 10px", background: "#F59E0B", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                  {limitMode === "designated" ? "🎯 DESIGNATED" : limitIsProd ? "CONTROLLING" : "LIMITING"}
                </span>
              )}
              {limitMode === "designated" && id !== limitId && chemicals[id].isReactant && (
                <span style={{ padding: "2px 10px", background: "#F1F5F9", color: "#94A3B8", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>excess</span>
              )}
            </div>
          </div>
        </StepBox>
      ))}
      <div style={{ padding: "9px 14px", background: limitIsProd ? "#FAF5FF" : "#EFF6FF", border: `1px solid ${limitIsProd ? "#D8B4FE" : "#BFDBFE"}`, borderRadius: 8, fontSize: 13, color: limitIsProd ? "#6B21A8" : "#1E40AF", margin: "6px 0" }}>
        {limitMode === "designated"
          ? <><strong>🎯 Designated limiting reagent: {chemicals[limitId].label || limitId}</strong> — reaction proceeds with {formatNum(maxRU)} reaction units</>
          : limitIsProd
            ? <><strong>◀ Retro calculation:</strong> product {chemicals[limitId].label || limitId} controls the calculation — {formatNum(maxRU)} reaction units</>
            : <><strong>Limiting reagent: {chemicals[limitId].label || limitId}</strong> — {formatNum(maxRU)} reaction units available</>
        }
      </div>

      {/* Step 3 */}
      <StepHeading n="3" text={
        <span>Moles of {chemicals[targetId].label || targetId}
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
            background: findType === "remaining" ? "#FAF5FF" : findType === "used" ? "#FFF7ED" : "#F0FDF4",
            color: findType === "remaining" ? "#7E22CE" : findType === "used" ? "#9A3412" : "#166534" }}>
            {findLabel}
          </span>
        </span>
      } />
      <StepBox color={findType === "remaining" ? "#9333EA" : findType === "used" ? "#F97316" : "#22C55E"}>
        {stepExpl.split("\n").map((line, i) => (
          <div key={i} style={{ fontFamily: "monospace", fontSize: 12.5, color: "#334155", background: "#F8FAFC", borderRadius: 6, padding: "5px 9px", margin: "3px 0" }}>{line}</div>
        ))}
        <div style={{ fontWeight: 700, color: "#1E293B", marginTop: 4 }}>= {formatNum(moleTarget)} mol</div>
      </StepBox>

      {/* Step 4 */}
      <StepHeading n="4" text={`Convert moles to ${uLabel(targetUnit)}`} />
      <StepBox color="#3B82F6">
        <div style={{ fontFamily: "monospace", fontSize: 12.5, color: "#334155", background: "#F8FAFC", borderRadius: 6, padding: "5px 9px" }}>{finalF}</div>
      </StepBox>

      {/* Final answer */}
      <div style={{ background: ansBg, color: "#fff", borderRadius: 12, padding: "20px 24px", marginTop: 20, textAlign: "center", boxShadow: `0 4px 16px ${ansColor}44` }}>
        <div style={{ fontSize: 12, opacity: 0.75, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{findLabel}</div>
        <div style={{ fontSize: 34, fontWeight: 800, margin: "2px 0", letterSpacing: "-0.5px" }}>
          {formatNum(result)} <span style={{ fontSize: 20, fontWeight: 600 }}>{uLabel(targetUnit)}</span>
        </div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
          of {chemicals[targetId].label || targetId} {STATE_SYMBOLS[chemicals[targetId].state]}
        </div>
      </div>
    </div>
  );
}
