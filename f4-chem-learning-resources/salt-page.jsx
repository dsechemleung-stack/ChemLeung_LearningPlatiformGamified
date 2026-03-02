import { useState } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n) => (n > 1 ? SUBS[n] : "");

// ── data ─────────────────────────────────────────────────────────────────────
const CATIONS = [
  { id: "Na",  sym: "Na",  name: "Sodium",      charge: 1, poly: false, alkali: true  },
  { id: "K",   sym: "K",   name: "Potassium",   charge: 1, poly: false, alkali: true  },
  { id: "Ca",  sym: "Ca",  name: "Calcium",     charge: 2, poly: false, alkali: false },
  { id: "Mg",  sym: "Mg",  name: "Magnesium",   charge: 2, poly: false, alkali: false },
  { id: "Al",  sym: "Al",  name: "Aluminium",   charge: 3, poly: false, alkali: false },
  { id: "Zn",  sym: "Zn",  name: "Zinc",        charge: 2, poly: false, alkali: false },
  { id: "Pb",  sym: "Pb",  name: "Lead",        charge: 2, poly: false, alkali: false },
  { id: "Fe2", sym: "Fe",  name: "Iron(II)",    charge: 2, poly: false, alkali: false },
  { id: "Fe3", sym: "Fe",  name: "Iron(III)",   charge: 3, poly: false, alkali: false },
  { id: "Cu",  sym: "Cu",  name: "Copper(II)",  charge: 2, poly: false, alkali: false },
  { id: "Ag",  sym: "Ag",  name: "Silver",      charge: 1, poly: false, alkali: false },
  { id: "NH4", sym: "NH₄", name: "Ammonium",    charge: 1, poly: true,  alkali: true  },
];

const ALL_ANIONS = [
  { id: "NO3",    sym: "NO₃",    name: "Nitrate",            charge: 1, poly: true  },
  { id: "NO2",    sym: "NO₂",    name: "Nitrite",            charge: 1, poly: true  },
  { id: "HCO3",   sym: "HCO₃",  name: "Hydrogen carbonate", charge: 1, poly: true  },
  { id: "CH3COO", sym: "CH₃COO",name: "Ethanoate",          charge: 1, poly: true  },
  { id: "SO4",    sym: "SO₄",   name: "Sulphate",           charge: 2, poly: true  },
  { id: "Cl",     sym: "Cl",    name: "Chloride",           charge: 1, poly: false },
  { id: "Br",     sym: "Br",    name: "Bromide",            charge: 1, poly: false },
  { id: "I",      sym: "I",     name: "Iodide",             charge: 1, poly: false },
  { id: "CO3",    sym: "CO₃",   name: "Carbonate",          charge: 2, poly: true  },
  { id: "OH",     sym: "OH",    name: "Hydroxide",          charge: 1, poly: true  },
  { id: "O",      sym: "O",     name: "Oxide",              charge: 2, poly: false },
];

const SALT_ANIONS = ALL_ANIONS.filter((a) => a.id !== "OH" && a.id !== "O");

// ── chemistry logic ───────────────────────────────────────────────────────────
const isSoluble = (cid, aid) => {
  if (["Na", "K", "NH4"].includes(cid)) return true;
  if (["NO3", "NO2", "HCO3", "CH3COO"].includes(aid)) return true;
  if (aid === "SO4") return !["Ca", "Pb"].includes(cid);
  if (["Cl", "Br", "I"].includes(aid)) return !["Ag", "Pb"].includes(cid);
  return false; // CO3, OH, O → insoluble
};

const getMethod = (cid, aid) => {
  if (!isSoluble(cid, aid)) return "precipitation";
  if (["Na", "K", "NH4"].includes(cid)) return "titration";
  return "crystallisation";
};

const buildFormula = (cat, an) => {
  const g = gcd(cat.charge, an.charge);
  const nCat = an.charge / g;
  const nAn = cat.charge / g;
  const c = cat.poly && nCat > 1 ? `(${cat.sym})${sub(nCat)}` : `${cat.sym}${sub(nCat)}`;
  const a = an.poly && nAn > 1 ? `(${an.sym})${sub(nAn)}` : `${an.sym}${sub(nAn)}`;
  return c + a;
};

const getRule = (cid, aid) => {
  const cat = CATIONS.find((c) => c.id === cid);
  const an = ALL_ANIONS.find((a) => a.id === aid);
  const soluble = isSoluble(cid, aid);

  if (["Na", "K", "NH4"].includes(cid))
    return `Cation Rule — All K⁺, Na⁺, and NH₄⁺ compounds are soluble. ${cat.name} (${cat.sym}⁺) belongs to this group, so this compound is always soluble.`;
  if (["NO3", "NO2", "HCO3", "CH3COO"].includes(aid))
    return `Anion Rule — All NO₃⁻, NO₂⁻, HCO₃⁻, and CH₃COO⁻ compounds are soluble. The anion here is ${an.name}, so this compound is soluble regardless of the cation.`;
  if (aid === "SO4")
    return soluble
      ? `Sulphate Rule — All sulphates are soluble except CaSO₄, PbSO₄, and BaSO₄. This compound is not among the exceptions, so it is soluble.`
      : `Sulphate Rule — All sulphates are soluble except CaSO₄, PbSO₄, and BaSO₄. This compound is one of the named exceptions, so it is insoluble.`;
  if (["Cl", "Br", "I"].includes(aid)) {
    const nm = { Cl: "Chloride", Br: "Bromide", I: "Iodide" };
    return soluble
      ? `${nm[aid]} Rule — All chlorides are soluble except AgCl and PbCl₂. The same pattern applies to bromides and iodides. This compound is not an exception, so it is soluble.`
      : `${nm[aid]} Rule — All chlorides are soluble except AgCl and PbCl₂. The same pattern applies to bromides and iodides. This compound is one of the exceptions, so it is insoluble.`;
  }
  if (aid === "CO3")
    return `Carbonate Rule — All carbonates are insoluble except those of K⁺, Na⁺, and NH₄⁺. ${cat.name} is not in that group, so this carbonate is insoluble.`;
  if (aid === "OH") {
    if (cid === "Ca")
      return `Hydroxide Rule — All hydroxides are insoluble except those of K⁺, Na⁺, and NH₄⁺. Ca(OH)₂ is slightly soluble (known as limewater) but is treated as insoluble in this context.`;
    return `Hydroxide Rule — All hydroxides are insoluble except those of K⁺, Na⁺, and NH₄⁺. ${cat.name} does not belong to that group, so this hydroxide is insoluble.`;
  }
  if (aid === "O")
    return `Oxide Rule — All oxides are insoluble except those of K⁺, Na⁺, and NH₄⁺. ${cat.name} does not belong to that group, so this oxide is insoluble.`;
  return "";
};

const getMethodNote = (cid, aid) => {
  const m = getMethod(cid, aid);
  if (m === "precipitation")
    return `Preparation — Precipitation: Mix two soluble solutions whose ions combine to form this insoluble precipitate, then filter and dry.`;
  if (m === "titration")
    return `Preparation — Titration + Crystallisation: Because this involves Na⁺, K⁺, or NH₄⁺ (no excess reactant can be filtered off), an acid-alkali titration is used to determine exact volumes, then the solution is evaporated and crystallised.`;
  return `Preparation — Crystallisation: React an excess of the appropriate metal/oxide/hydroxide/carbonate with a dilute acid. Filter off excess solid, then evaporate and crystallise the filtrate.`;
};

// ── question generator ────────────────────────────────────────────────────────
const EXCLUDED = [["Ag", "SO4"]];
const EXCLUDED_MODE2 = [["NH4", "CO3"], ["Na", "CO3"], ["K", "CO3"]];

const genQ = (mode) => {
  const pool = mode === 2 ? SALT_ANIONS.filter((a) => a.id !== "HCO3") : ALL_ANIONS;
  let cat, an;
  do {
    cat = CATIONS[Math.floor(Math.random() * CATIONS.length)];
    const valid =
      cat.id === "NH4" ? pool.filter((a) => a.id !== "OH" && a.id !== "O") : pool;
    an = valid[Math.floor(Math.random() * valid.length)];
  } while (
    EXCLUDED.some(([c, a]) => cat.id === c && an.id === a) ||
    (mode === 2 && EXCLUDED_MODE2.some(([c, a]) => cat.id === c && an.id === a))
  );
  const soluble = isSoluble(cat.id, an.id);
  const method = getMethod(cat.id, an.id);
  const baseRule = getRule(cat.id, an.id);
  const rule = mode === 2 ? baseRule + "\n" + getMethodNote(cat.id, an.id) : baseRule;
  return { cat, an, formula: buildFormula(cat, an), soluble, method, rule };
};

// ── styles ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body { font-family: 'Plus Jakarta Sans', sans-serif; }

  .quiz-root {
    min-height: 100vh;
    background: #0b0f1a;
    color: #e8edf5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    position: relative;
    overflow: hidden;
  }

  .back-btn {
    position: fixed;
    top: 18px;
    left: 18px;
    z-index: 5;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.05);
    color: rgba(232,237,245,0.92);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 800;
    font-size: 0.82rem;
    text-decoration: none;
    transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
    backdrop-filter: blur(12px);
  }
  .back-btn:hover {
    transform: translateY(-1px);
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.24);
  }
  .back-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px rgba(0,220,180,0.25);
  }

  .grid-bg {
    position: fixed; inset: 0; z-index: 0;
    background-image:
      linear-gradient(rgba(0,220,180,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,220,180,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .blob {
    position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0;
  }
  .blob-1 { width: 400px; height: 400px; background: rgba(0,180,140,0.12); top:-100px; left:-100px; }
  .blob-2 { width: 500px; height: 500px; background: rgba(60,100,220,0.08); bottom:-150px; right:-100px; }

  .card {
    position: relative; z-index: 1;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    backdrop-filter: blur(12px);
    padding: 40px;
    width: 100%; max-width: 600px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.4);
  }

  /* LANDING */
  .landing-title {
    font-size: 2.4rem; font-weight: 800; line-height: 1.1;
    background: linear-gradient(135deg, #00dcc0, #4a9fff, #c084fc);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; margin-bottom: 8px;
  }
  .landing-sub {
    font-size: 0.95rem; color: rgba(200,220,240,0.55); margin-bottom: 36px; line-height: 1.6;
  }
  .mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  .mode-btn {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px; padding: 24px 20px;
    cursor: pointer; text-align: left; color: #e8edf5;
    transition: all 0.2s ease; position: relative; overflow: hidden;
  }
  .mode-btn::before {
    content: ''; position: absolute; inset: 0; opacity: 0;
    transition: opacity 0.2s;
  }
  .mode-btn.mode-a::before { background: linear-gradient(135deg, rgba(0,220,180,0.15), rgba(74,159,255,0.1)); }
  .mode-btn.mode-b::before { background: linear-gradient(135deg, rgba(192,132,252,0.15), rgba(74,159,255,0.1)); }
  .mode-btn:hover::before { opacity: 1; }
  .mode-btn:hover { border-color: rgba(255,255,255,0.25); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); }

  .mode-icon { font-size: 2rem; margin-bottom: 12px; display: block; }
  .mode-label { font-size: 1rem; font-weight: 700; margin-bottom: 4px; display: block; }
  .mode-desc { font-size: 0.78rem; color: rgba(200,220,240,0.5); line-height: 1.4; }
  .mode-badge {
    display: inline-block; font-size: 0.65rem; font-weight: 700; padding: 2px 8px;
    border-radius: 99px; margin-top: 10px; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .badge-sol { background: rgba(0,220,180,0.2); color: #00dcc0; border: 1px solid rgba(0,220,180,0.3); }
  .badge-meth { background: rgba(192,132,252,0.2); color: #c084fc; border: 1px solid rgba(192,132,252,0.3); }

  .rules-toggle {
    margin-top: 24px; width: 100%;
    background: none; border: 1px solid rgba(255,255,255,0.08);
    color: rgba(200,220,240,0.45); font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.8rem; padding: 10px; border-radius: 10px; cursor: pointer;
    transition: all 0.2s;
  }
  .rules-toggle:hover { border-color: rgba(255,255,255,0.18); color: rgba(200,220,240,0.7); }

  .rules-box {
    margin-top: 12px; background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 16px;
  }
  .rules-box h4 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #00dcc0; margin-bottom: 10px; }
  .rules-box ul { list-style: none; }
  .rules-box li { font-size: 0.78rem; color: rgba(200,220,240,0.6); padding: 3px 0; padding-left: 14px; position: relative; line-height: 1.5; }
  .rules-box li::before { content: '—'; position: absolute; left: 0; color: rgba(0,220,180,0.5); }

  /* QUIZ */
  .progress-bar {
    height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px;
    margin-bottom: 28px; overflow: hidden;
  }
  .progress-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, #00dcc0, #4a9fff);
    transition: width 0.4s ease;
  }

  .q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .q-num { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(200,220,240,0.4); }
  .q-score {
    font-size: 0.8rem; font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: #00dcc0;
  }

  .formula-box {
    background: rgba(0,0,0,0.25);
    border: 1px solid rgba(0,220,180,0.2);
    border-radius: 16px; padding: 28px 24px; text-align: center;
    margin-bottom: 28px;
  }
  .formula-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(200,220,240,0.35); margin-bottom: 12px; }
  .formula-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.6rem; font-weight: 600; color: #e8edf5; letter-spacing: 0.02em;
  }
  .formula-sub { font-size: 0.82rem; color: rgba(200,220,240,0.4); margin-top: 8px; }

  .q-prompt { font-size: 0.85rem; color: rgba(200,220,240,0.55); margin-bottom: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }

  .btn-group { display: grid; gap: 10px; }
  .btn-group-2 { grid-template-columns: 1fr 1fr; }
  .btn-group-3 { grid-template-columns: 1fr; }

  .ans-btn {
    padding: 14px 20px; border-radius: 12px; font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.9rem; font-weight: 700; cursor: pointer;
    border: 2px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: #e8edf5; transition: all 0.15s ease; text-align: center;
  }
  .ans-btn:hover:not(:disabled) {
    background: rgba(255,255,255,0.09);
    border-color: rgba(255,255,255,0.22);
    transform: translateY(-1px);
  }
  .ans-btn:disabled { cursor: default; }

  .ans-btn.correct {
    background: rgba(0,200,120,0.18);
    border-color: #00c878;
    color: #4dffb0;
    box-shadow: 0 0 20px rgba(0,200,120,0.2);
  }
  .ans-btn.wrong {
    background: rgba(255,60,80,0.15);
    border-color: #ff3c50;
    color: #ff8090;
  }
  .ans-btn.reveal {
    background: rgba(0,200,120,0.1);
    border-color: rgba(0,200,120,0.4);
    color: rgba(100,255,170,0.6);
  }

  .feedback-box {
    margin-top: 20px; padding: 16px 18px;
    border-radius: 12px; font-size: 0.82rem; line-height: 1.65;
    border: 1px solid;
  }
  .feedback-correct {
    background: rgba(0,200,120,0.08); border-color: rgba(0,200,120,0.3); color: rgba(180,255,220,0.85);
  }
  .feedback-wrong {
    background: rgba(255,60,80,0.08); border-color: rgba(255,60,80,0.3); color: rgba(255,180,190,0.85);
  }
  .feedback-title { font-weight: 700; margin-bottom: 6px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; }
  .feedback-rule { white-space: pre-line; color: inherit; opacity: 0.85; }

  .next-btn {
    margin-top: 18px; width: 100%;
    background: linear-gradient(135deg, #00dcc0, #4a9fff);
    border: none; border-radius: 12px; padding: 14px;
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.95rem; font-weight: 700;
    color: #0b0f1a; cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
  }
  .next-btn:hover { opacity: 0.9; transform: translateY(-1px); }

  /* RESULT */
  .result-score {
    font-size: 5rem; font-weight: 800; line-height: 1;
    font-family: 'JetBrains Mono', monospace;
    background: linear-gradient(135deg, #00dcc0, #4a9fff);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; margin: 16px 0 8px;
  }
  .result-msg { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; }
  .result-sub { font-size: 0.85rem; color: rgba(200,220,240,0.5); margin-bottom: 32px; }
  .result-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .btn-outline {
    padding: 13px; border-radius: 12px; font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.88rem; font-weight: 700; cursor: pointer;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14);
    color: #e8edf5; transition: all 0.2s;
  }
  .btn-outline:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.25); }

  .section-sep {
    border: none; border-top: 1px solid rgba(255,255,255,0.07);
    margin: 20px 0;
  }
`;

// ── component ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing"); // landing | quiz | result
  const [mode, setMode] = useState(1);
  const [qs, setQs] = useState([]);
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showRules, setShowRules] = useState(false);

  const start = (m) => {
    setMode(m);
    setQs(Array.from({ length: 10 }, () => genQ(m)));
    setQi(0); setSel(null); setAnswered(false); setScore(0);
    setScreen("quiz");
  };

  const answer = (val) => {
    if (answered) return;
    setSel(val);
    setAnswered(true);
    const q = qs[qi];
    const correct =
      mode === 1
        ? val === (q.soluble ? "soluble" : "insoluble")
        : val === q.method;
    if (correct) setScore((s) => s + 1);
  };

  const next = () => {
    if (qi < 9) { setQi((i) => i + 1); setSel(null); setAnswered(false); }
    else setScreen("result");
  };

  const q = qs[qi] || {};

  const isCorrect = (val) => {
    if (!answered) return false;
    return mode === 1
      ? val === (q.soluble ? "soluble" : "insoluble")
      : val === q.method;
  };

  const getBtnClass = (val) => {
    if (!answered) return "ans-btn";
    if (val === sel) return isCorrect(val) ? "ans-btn correct" : "ans-btn wrong";
    if (isCorrect(val)) return "ans-btn reveal";
    return "ans-btn";
  };

  const resultMsg = () => {
    if (score === 10) return ["🏆 Perfect Score!", "You've mastered salt solubility rules."];
    if (score >= 8) return ["⭐ Excellent!", "Outstanding chemistry knowledge!"];
    if (score >= 6) return ["👍 Good Work!", "A solid understanding — keep it up."];
    return ["📚 Keep Practising", "Review the rules and try again."];
  };

  const mode1Btns = [
    { val: "soluble", label: "Soluble" },
    { val: "insoluble", label: "Insoluble" },
  ];
  const mode2Btns = [
    { val: "precipitation", label: "🧪 Precipitation" },
    { val: "crystallisation", label: "🔬 Crystallisation" },
    { val: "titration", label: "⚗️ Titration + Crystallisation" },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="quiz-root">
        <a className="back-btn" href="index.html" aria-label="Back to landing page">
          ← Back
        </a>
        <div className="grid-bg" />
        <div className="blob blob-1" />
        <div className="blob blob-2" />

        {/* ── LANDING ── */}
        {screen === "landing" && (
          <div className="card">
            <div className="landing-title">Salt Solubility Quiz</div>
            <p className="landing-sub">
              Test your knowledge of solubility rules with randomly generated ionic compounds. Choose a mode to begin.
            </p>

            <div className="mode-grid">
              <button className="mode-btn mode-a" onClick={() => start(1)}>
                <span className="mode-icon">🧂</span>
                <span className="mode-label">Solubility Mode</span>
                <span className="mode-desc">Identify whether each salt is soluble or insoluble in water.</span>
                <span className="mode-badge badge-sol">Soluble / Insoluble</span>
              </button>
              <button className="mode-btn mode-b" onClick={() => start(2)}>
                <span className="mode-icon">⚗️</span>
                <span className="mode-label">Method Mode</span>
                <span className="mode-desc">Also identify the correct preparation method for each salt.</span>
                <span className="mode-badge badge-meth">+ Preparation Method</span>
              </button>
            </div>

            <button className="rules-toggle" onClick={() => setShowRules((v) => !v)}>
              {showRules ? "▲ Hide Solubility Rules" : "▼ View Solubility Rules"}
            </button>

            {showRules && (
              <div className="rules-box">
                <h4>Solubility Rules</h4>
                <ul>
                  <li>All K⁺, Na⁺, NH₄⁺ compounds are <strong>soluble</strong>.</li>
                  <li>All NO₃⁻, NO₂⁻, HCO₃⁻, CH₃COO⁻ compounds are <strong>soluble</strong>.</li>
                  <li>All sulphates are soluble <em>except</em> CaSO₄, PbSO₄, BaSO₄.</li>
                  <li>All chlorides are soluble <em>except</em> AgCl and PbCl₂ (same for Br⁻, I⁻).</li>
                  <li>All carbonates, hydroxides, and oxides are insoluble <em>except</em> K⁺, Na⁺, NH₄⁺.</li>
                  <li>Note: Ca(OH)₂ is slightly soluble (limewater).</li>
                </ul>
                <hr className="section-sep" />
                <h4>Preparation Methods (Mode 2)</h4>
                <ul>
                  <li><strong>Precipitation</strong> — insoluble salts (mix two soluble solutions).</li>
                  <li><strong>Crystallisation</strong> — soluble salts not involving Na⁺/K⁺/NH₄⁺ (excess solid + acid).</li>
                  <li><strong>Titration + Crystallisation</strong> — soluble salts with Na⁺, K⁺, or NH₄⁺.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── QUIZ ── */}
        {screen === "quiz" && qs.length > 0 && (
          <div className="card">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(qi / 10) * 100}%` }} />
            </div>

            <div className="q-header">
              <span className="q-num">Question {qi + 1} / 10</span>
              <span className="q-score">{score} / {qi + (answered ? 1 : 0)}</span>
            </div>

            <div className="formula-box">
              <div className="formula-label">Identify this compound</div>
              <div className="formula-text">{q.formula}</div>
              <div className="formula-sub">
                {q.cat?.name} {q.an?.name}
              </div>
            </div>

            {mode === 1 ? (
              <>
                <div className="q-prompt">Is this salt soluble in water?</div>
                <div className="btn-group btn-group-2">
                  {mode1Btns.map(({ val, label }) => (
                    <button
                      key={val}
                      className={getBtnClass(val)}
                      onClick={() => answer(val)}
                      disabled={answered}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="q-prompt">How is this salt prepared?</div>
                <div className="btn-group btn-group-3">
                  {mode2Btns.map(({ val, label }) => (
                    <button
                      key={val}
                      className={getBtnClass(val)}
                      onClick={() => answer(val)}
                      disabled={answered}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {answered && (
              <>
                <div className={`feedback-box ${isCorrect(sel) ? "feedback-correct" : "feedback-wrong"}`}>
                  <div className="feedback-title">
                    {isCorrect(sel) ? "✓ Correct!" : "✗ Incorrect"}
                    {!isCorrect(sel) && mode === 1 && ` — Answer: ${q.soluble ? "Soluble" : "Insoluble"}`}
                    {!isCorrect(sel) && mode === 2 && ` — Answer: ${
                      { precipitation: "Precipitation", crystallisation: "Crystallisation", titration: "Titration + Crystallisation" }[q.method]
                    }`}
                  </div>
                  <div className="feedback-rule">{q.rule}</div>
                </div>
                <button className="next-btn" onClick={next}>
                  {qi < 9 ? "Next Question →" : "See Results →"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── RESULT ── */}
        {screen === "result" && (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(200,220,240,0.35)", marginBottom: 4 }}>
              Final Score
            </div>
            <div className="result-score">{score}/10</div>
            <div className="result-msg">{resultMsg()[0]}</div>
            <div className="result-sub">{resultMsg()[1]}</div>

            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "16px", marginBottom: 24, textAlign: "left" }}>
              {qs.map((q, i) => {
                const correct =
                  mode === 1
                    ? (q.soluble ? "Soluble" : "Insoluble")
                    : { precipitation: "Precipitation", crystallisation: "Crystallisation", titration: "Titration + Cryst." }[q.method];
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < 9 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.82rem", color: "#e8edf5" }}>{q.formula}</span>
                    <span style={{ fontSize: "0.75rem", color: "rgba(200,220,240,0.45)" }}>{correct}</span>
                  </div>
                );
              })}
            </div>

            <div className="result-actions">
              <button className="btn-outline" onClick={() => start(mode)}>
                Play Again (same mode)
              </button>
              <button className="next-btn" style={{ margin: 0 }} onClick={() => setScreen("landing")}>
                Change Mode
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}