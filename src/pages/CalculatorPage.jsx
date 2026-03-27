import React, { useCallback, useMemo, useState } from 'react';
import { FlaskConical, Sigma, Wand2, Atom, X } from 'lucide-react';
import StoichiometryCalculator from '../components/stoichiometry/StoichiometryCalculator.jsx';
import MultiSelect from '../components/MultiSelect.jsx';
import { RAM } from '../lib/calculationQuestionGenerator/data/chemicals.js';
import {
  CATEGORY_LABELS,
  CURRICULUM_SUBTOPICS,
  QUESTION_TYPES,
  generateQuestion,
} from '../lib/calculationQuestionGenerator/generators/index.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function prettyUnitPreserveOrder(unitRaw) {
  const u = String(unitRaw || '');
  if (!u.trim()) return '';

  const supers = {
    '-1': '⁻¹',
    '-2': '⁻²',
    '-3': '⁻³',
    '1': '¹',
    '2': '²',
    '3': '³',
  };

  // Preserve spaces/order; just prettify exponents.
  return u
    .replace(/[−–—]/g, '-')
    .replace(/\b([A-Za-z]{1,4})\s*\^\s*\(?\s*([+-]?\d+)\s*\)?\b/g, (m, sym, exp) => `${sym}${supers[String(exp)] || `^${exp}`}`)
    .replace(/\b([A-Za-z]{1,4})\s*([+-])\s*(\d+)\b/g, (m, sym, sign, exp) => {
      const key = `${sign}${exp}`;
      return `${sym}${supers[key] || `^${key}`}`;
    })
    .replace(/([⁻¹²³])(?=[A-Za-z])/g, '$1 ');
}

function toSupUnitsHtml(s) {
  if (!s) return '';
  const digitMap = { '¹': '1', '²': '2', '³': '3' };
  const src = escapeHtml(s);
  return src.replace(/\b(dm|cm|mol|s|g|K)\u2060?(⁻?[¹²³])/g, (m, unit, exp) => {
    const negative = exp.startsWith('⁻');
    const d = digitMap[negative ? exp.slice(1) : exp] || '';
    const sign = negative ? '-' : '';
    if (!d) return m;
    return `${unit}<sup>${sign}${d}</sup>`;
  });
}

function FormattedText({ text, className, style }) {
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: toSupUnitsHtml(text) }}
    />
  );
}

function extractElementSymbolsFromFormula(formula) {
  const s = String(formula || '');
  const out = [];
  const re = /([A-Z][a-z]?)/g;
  let m;
  while ((m = re.exec(s))) {
    out.push(m[1]);
  }
  return out;
}

function unitToExponentMap(unit) {
  const norm = normalizeUnit(unit);
  if (!norm) return null;

  const map = {};
  const parts = norm.split('*').filter(Boolean);
  for (const p of parts) {
    const m = p.match(/^([a-z]{1,4})(?:\^([+-]?\d+))?$/i);
    if (!m) continue;
    const sym = m[1].toLowerCase();
    const exp = m[2] != null ? Number(m[2]) : 1;
    if (!Number.isFinite(exp)) continue;
    map[sym] = (map[sym] || 0) + exp;
  }

  // Remove zero-exponent terms
  for (const k of Object.keys(map)) {
    if (!map[k]) delete map[k];
  }

  return map;
}

function unitMapsEqual(a, b) {
  const ak = Object.keys(a || {}).sort();
  const bk = Object.keys(b || {}).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i += 1) {
    if (ak[i] !== bk[i]) return false;
    if (a[ak[i]] !== b[bk[i]]) return false;
  }
  return true;
}

function unitsEquivalent(expectedUnit, userUnit) {
  const a = normalizeUnit(expectedUnit);
  const b = normalizeUnit(userUnit);
  if (!a || !b) return false;
  return a === b;
}

function pickRamElementsFromQuestion(question) {
  if (!question) return [];
  const text = [
    question.problemStatement,
    question.finalAnswer,
    ...(Array.isArray(question.solution) ? question.solution.map((s) => s?.content) : []),
  ]
    .filter(Boolean)
    .join('\n');

  const formulas = [];
  const mRe = /\bM\(([^)]+)\)/g;
  let m;
  while ((m = mRe.exec(text))) {
    formulas.push(m[1]);
  }

  const symbols = new Set();
  for (const f of formulas) {
    for (const sym of extractElementSymbolsFromFormula(f)) {
      if (Object.prototype.hasOwnProperty.call(RAM, sym)) symbols.add(sym);
    }
  }

  return Array.from(symbols);
}

function shouldShowRamForQuestion(question) {
  if (!question) return false;
  const text = [
    question.problemStatement,
    question.finalAnswer,
    ...(Array.isArray(question.solution) ? question.solution.map((s) => s?.content) : []),
  ]
    .filter(Boolean)
    .join('\n');
  return /\bM\(|g\s*\/\s*mol|g\/mol|molar\s+mass|relative\s+formula\s+mass|\bMr\b/i.test(text);
}

function parseScientificTokenToNumber(token) {
  const s = String(token || '').trim();
  if (!s) return null;

  const compact = s.replace(/\s+/g, '');
  const expMatch = compact.match(/^(-?\d+(?:\.\d+)?)(?:[×x\*]10\^(?:\(?(-?\d+)\)?))$/i);
  if (expMatch) {
    const base = Number(expMatch[1]);
    const exp = Number(expMatch[2]);
    if (Number.isFinite(base) && Number.isFinite(exp)) return base * 10 ** exp;
  }

  const n = Number(compact);
  if (Number.isFinite(n)) return n;
  return null;
}

function parseNumericAnswer(finalAnswer) {
  const s = String(finalAnswer || '').trim();
  if (!s) return null;

  const sci = s.match(/(-?\d+(?:\.\d+)?\s*(?:[×x\*]\s*10\s*\^\s*\(?-?\d+\)?))/);
  if (sci) {
    const expectedValue = parseScientificTokenToNumber(sci[1]);
    if (expectedValue == null) return null;
    const expectedUnit = s.slice(sci.index + sci[0].length).trim();
    return { expectedValue, expectedUnit };
  }

  const simple = s.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  if (!simple) return null;
  const expectedValue = parseScientificTokenToNumber(simple[0]);
  if (expectedValue == null) return null;
  const expectedUnit = s.slice(simple.index + simple[0].length).trim();
  return { expectedValue, expectedUnit };
}

function parseMultipartNumericAnswers(finalAnswer) {
  const s = String(finalAnswer || '').trim();
  if (!s) return null;

  const normalized = s.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const parts = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    const m = t.match(/^\(?\s*([a-z])\s*\)?\s*[).:-]\s*(.+)$/i) || t.match(/^\(\s*([a-z])\s*\)\s*(.+)$/i);
    if (!m) continue;

    const label = String(m[1]).toLowerCase();
    const content = String(m[2] || '').trim();
    if (!content) continue;

    const parsed = parseNumericAnswer(content);
    if (!parsed) continue;

    parts.push({ label, ...parsed, raw: content });
  }

  if (parts.length >= 2) return parts;
  return null;
}

function normalizeUnit(s) {
  const src = String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/·/g, '*')
    .replace(/[−–—]/g, '-')
    .trim();

  if (!src) return '';

  // Molarity shorthand
  if (src.length === 1 && src.toUpperCase() === 'M') return 'mol*dm^-3';

  let out = src;

  // Remove invisible Unicode joiners that can appear in copied text (e.g. U+2060 WORD JOINER)
  out = out.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, '');

  // Unicode superscripts -> ASCII exponent tokens
  out = out
    .replace(/⁻/g, '-')
    .replace(/¹/g, '1')
    .replace(/²/g, '2')
    .replace(/³/g, '3');

  out = out
    .replace(/\//g, ' / ')
    .replace(/\*/g, ' * ')
    .replace(/\s+/g, ' ')
    .trim();

  // Treat whitespace-separated unit tokens as multiplication, e.g. "mol dm-3" => "mol*dm^-3"
  out = out.replace(/([a-z]{1,4}(?:\^[+-]?\d+)?)\s+(?=[a-z])/gi, '$1*');

  out = out.replace(/\b([a-z]{1,4})\s*\^\s*\(?\s*([+-]?\d+)\s*\)?\b/gi, '$1^$2');
  out = out.replace(/\b([a-z]{1,4})\s*\(\s*([+-]?\d+)\s*\)\b/gi, '$1^$2');
  out = out.replace(/\b([a-z]{1,4})\s*([+-]?\d+)\b/gi, '$1^$2');

  // Inline exponent form without caret: dm-3 => dm^-3
  out = out.replace(/\b([a-z]{1,4})\s*([+-])\s*(\d+)\b/gi, (m, u, sign, exp) => `${u}^${sign}${exp}`);

  // Common student inputs like dm-3 => dm^-3
  out = out.replace(/\b([a-z]{1,4})\s*\^\s*-(\d+)\b/gi, '$1^-$2');

  out = out
    .replace(/\s+/g, '')
    .toLowerCase();

  // Remove punctuation / invisible chars that commonly appear around units
  // e.g. "mol dm^-3)" or "mol dm^-3." or stray unicode spaces.
  out = out.replace(/[^a-z0-9^*/+\-]/g, '');

  // Collapse accidental duplicated separators and trim.
  out = out.replace(/\*{2,}/g, '*').replace(/^\*|\*$/g, '');

  // Handle concatenated common unit tokens that may appear without spaces (e.g. "moldm^-3", "gdm^-3").
  // Do this after stripping spaces so comparisons are robust.
  out = out
    .replace(/^moldm(\^?[-+]?\d+)?/i, (m, exp) => `mol*dm${exp || ''}`)
    .replace(/^gdm(\^?[-+]?\d+)?/i, (m, exp) => `g*dm${exp || ''}`)
    .replace(/^kgdm(\^?[-+]?\d+)?/i, (m, exp) => `kg*dm${exp || ''}`)
    .replace(/^molcm(\^?[-+]?\d+)?/i, (m, exp) => `mol*cm${exp || ''}`)
    .replace(/^gcm(\^?[-+]?\d+)?/i, (m, exp) => `g*cm${exp || ''}`);

  // Handle other common concatenations like "dm^-3mol" / "cm^-3mol" / "dm^-3g"
  out = out
    .replace(/(dm\^[+-]?\d+)(?=mol\b)/i, '$1*')
    .replace(/(cm\^[+-]?\d+)(?=mol\b)/i, '$1*')
    .replace(/(dm\^[+-]?\d+)(?=g\b)/i, '$1*')
    .replace(/(cm\^[+-]?\d+)(?=g\b)/i, '$1*')
    .replace(/\b(mol)(?=dm\^[+-]?\d+)/i, '$1*')
    .replace(/\b(mol)(?=cm\^[+-]?\d+)/i, '$1*');

  // Normalize separators: mol/dm3 => mol*dm^-3 (dimensionally equivalent)
  if (out.includes('/')) {
    const segs = out.split('/').filter(Boolean);
    if (segs.length === 2) {
      const num = segs[0];
      const den = segs[1];
      // Convert denominator tokens like dm^3 into dm^-3
      const invDen = den.replace(/\b([a-z]{1,4})\^([+-]?\d+)\b/gi, (m, u, e) => {
        const exp = Number(e);
        if (!Number.isFinite(exp)) return m;
        return `${u}^${-exp}`;
      });
      out = `${num}*${invDen}`;
    }
  }

  return out;
}

function unitToDisplay(unit) {
  const n = normalizeUnit(unit);
  if (!n) return '';
  return n
    .replace(/\*/g, '·')
    .replace(/\^([+-]?\d+)/g, '^$1');
}

function unitToPrettyUnicode(unit) {
  const n = normalizeUnit(unit);
  if (!n) return '';

  const supers = {
    '-1': '⁻¹',
    '-2': '⁻²',
    '-3': '⁻³',
    '1': '¹',
    '2': '²',
    '3': '³',
  };

  const withSupers = n
    .replace(/\*/g, ' ')
    .replace(/\bmol\s*dm\^-3\b/g, 'mol dm⁻³')
    .replace(/\b([a-z]{1,4})\^([+-]?\d+)\b/gi, (m, u, e) => `${u}${supers[String(e)] || `^${e}`}`);

  // If units were originally concatenated, ensure a readable space after superscripts.
  return withSupers.replace(/([⁻¹²³])(?=[A-Za-z])/g, '$1 ');
}

function suggestUnitConversion(raw) {
  const s = String(raw || '');
  const parsed = parseUserNumericInput(s);
  if (!parsed) return null;

  const unit = String(parsed.unit || '').trim();
  if (!unit) return null;

  // Special-case: user typed "m" (common mistake). Suggest converting to molarity "M".
  if (unit.length === 1 && unit.toLowerCase() === 'm') {
    return { targetUnit: 'M' };
  }

  const pretty = prettyUnitPreserveOrder(unit);
  // Only show suggestion if it meaningfully changes what they typed.
  const typedCompact = unit.replace(/\s+/g, '').toLowerCase();
  const prettyCompact = pretty.replace(/\s+/g, '').toLowerCase();
  if (!pretty || typedCompact === prettyCompact) return null;

  return { targetUnit: pretty };
}

function preferDisplayUnitForTypedUnit(typedUnit) {
  const u = String(typedUnit || '').trim();
  if (u.length === 1 && u.toUpperCase() === 'M') return 'M';
  return unitToPrettyUnicode(u);
}

function applyUnitConversionToNumericInput(raw, targetUnit) {
  const s = String(raw || '');
  const parsed = parseUserNumericInput(s);
  if (!parsed) return s;

  const sci = s.match(/(-?\d+(?:\.\d+)?\s*(?:[×x\*]\s*10\s*\^\s*\(?-?\d+\)?))/);
  const simple = s.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  const numToken = sci?.[0] || simple?.[0] || '';
  if (!numToken) return s;

  return `${numToken.trim()} ${String(targetUnit || '').trim()}`.trim();
}

function prettyFormatUnitInPlace(rawInput) {
  const s = String(rawInput || '');
  if (!s.trim()) return s;

  const sci = s.match(/(-?\d+(?:\.\d+)?\s*(?:[×x\*]\s*10\s*\^\s*\(?-?\d+\)?))/);
  const simple = s.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  const numMatch = sci || simple;
  if (!numMatch) return s;

  const unitStart = (numMatch.index ?? 0) + numMatch[0].length;
  const unitRaw = s.slice(unitStart);
  if (!unitRaw.trim()) return s;

  // Preserve the user's exact spacing/casing; only rewrite exponent patterns.
  let unit = unitRaw;

  // Convert common exponent notations into unicode superscripts, preserving token order.
  const supers = {
    '-1': '⁻¹',
    '-2': '⁻²',
    '-3': '⁻³',
    '1': '¹',
    '2': '²',
    '3': '³',
  };

  unit = unit
    .replace(/[−–—]/g, '-')
    // dm^-3 / dm^ -3 / dm^(-3)
    .replace(/\b([A-Za-z]{1,4})\s*\^\s*\(?\s*([+-]?\d+)\s*\)?\b/g, (m, u, e) => `${u}${supers[String(e)] || `^${e}`}`)
    // dm-3 (no caret)
    .replace(/\b([A-Za-z]{1,4})\s*([+-])\s*(\d+)\b/g, (m, u, sign, e) => {
      const key = `${sign}${e}`;
      return `${u}${supers[key] || `^${key}`}`;
    })
    // If the user typed without a space (e.g. dm-3mol), make it readable: dm⁻³ mol
    .replace(/([⁻¹²³])(?=[A-Za-z])/g, '$1 ');

  if (unit === unitRaw) return s;
  return s.slice(0, unitStart) + unit;
}

function parseUserNumericInput(input) {
  const s = String(input || '').trim();
  if (!s) return null;

  const sci = s.match(/(-?\d+(?:\.\d+)?\s*(?:[×x\*]\s*10\s*\^\s*\(?-?\d+\)?))/);
  if (sci) {
    const value = parseScientificTokenToNumber(sci[1]);
    if (value == null) return null;
    const unit = s.slice(sci.index + sci[0].length).trim();
    return { value, unit };
  }

  const simple = s.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  if (!simple) return null;
  const value = parseScientificTokenToNumber(simple[0]);
  if (value == null) return null;
  const unit = s.slice(simple.index + simple[0].length).trim();
  return { value, unit };
}

export default function CalculatorPage() {
  const [mode, setMode] = useState('exercise');

  const [openSelectId, setOpenSelectId] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(QUESTION_TYPES.map((t) => t.category));
    return Array.from(set).sort();
  }, []);

  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState([]);
  const [selectedContexts, setSelectedContexts] = useState([]);

  const topics = useMemo(() => {
    const set = new Set(CURRICULUM_SUBTOPICS.map((x) => x.topic));
    return Array.from(set);
  }, []);

  const subtopicsForTopic = useMemo(() => {
    if (!selectedTopics.length) return CURRICULUM_SUBTOPICS;
    const allowedTopics = new Set(selectedTopics);
    return CURRICULUM_SUBTOPICS.filter((x) => allowedTopics.has(x.topic));
  }, [selectedTopics]);

  const [selectedTypeIds, setSelectedTypeIds] = useState(() => {
    const first = QUESTION_TYPES[0];
    return first ? [first.id] : [];
  });

  const [ramOn, setRamOn] = useState(true);
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);
  const [question, setQuestion] = useState(null);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showEquation, setShowEquation] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const [userFinalAnswer, setUserFinalAnswer] = useState('');
  const [answerCheckResult, setAnswerCheckResult] = useState(null);
  const [userSubAnswers, setUserSubAnswers] = useState({});
  const [subAnswerCheck, setSubAnswerCheck] = useState(null);

  const [unitHint, setUnitHint] = useState('');
  const [subUnitHints, setSubUnitHints] = useState({});
  const [unitSuggestion, setUnitSuggestion] = useState(null);
  const [subUnitSuggestions, setSubUnitSuggestions] = useState({});

  React.useEffect(() => {
    setRamOn(true);
  }, []);

  const resetDropdowns = useCallback(() => {
    setShowEquation(false);
    setShowSteps(false);
    setShowAnswer(false);
  }, []);

  const filteredTypes = useMemo(() => {
    let list = QUESTION_TYPES;

    if (selectedContexts.length) {
      const allowed = new Set(selectedContexts);
      list = list.filter((t) => allowed.has(t.category));
    }

    if (selectedTopics.length) {
      const allowedTopicIds = new Set(
        CURRICULUM_SUBTOPICS.filter((x) => selectedTopics.includes(x.topic)).map((x) => x.id)
      );
      list = list.filter((t) => (t.curriculumSubtopics || []).some((id) => allowedTopicIds.has(id)));
    }

    if (selectedSubtopics.length) {
      const allowed = new Set(selectedSubtopics);
      list = list.filter((t) => (t.curriculumSubtopics || []).some((id) => allowed.has(id)));
    }

    return list;
  }, [selectedContexts, selectedTopics, selectedSubtopics]);

  React.useEffect(() => {
    const allowed = new Set(filteredTypes.map((t) => t.id));
    setSelectedTypeIds((prev) => {
      if (!prev.length) return prev;
      const next = prev.filter((id) => allowed.has(id));
      return next;
    });
  }, [filteredTypes]);

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    setError(null);
    try {
      const pool = selectedTypeIds.length ? selectedTypeIds : filteredTypes.map((t) => t.id);
      if (!pool.length) throw new Error('No question types match the selected filters.');
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      const q = generateQuestion(chosen, ramOn);
      setQuestion(q);
      setUserFinalAnswer('');
      setAnswerCheckResult(null);
      setUserSubAnswers({});
      setSubAnswerCheck(null);
      setUnitHint('');
      setSubUnitHints({});
      setUnitSuggestion(null);
      setSubUnitSuggestions({});
      resetDropdowns();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setGenerating(false);
    }
  }, [selectedTypeIds, filteredTypes, ramOn, resetDropdowns]);

  const numericExpected = useMemo(() => {
    if (!question?.finalAnswer) return null;
    return parseNumericAnswer(question.finalAnswer);
  }, [question]);

  const multipartExpected = useMemo(() => {
    if (!question?.finalAnswer) return null;
    return parseMultipartNumericAnswers(question.finalAnswer);
  }, [question]);

  const checkUserAnswer = useCallback(() => {
    if (!numericExpected) return;
    const parsed = parseUserNumericInput(userFinalAnswer);
    if (!parsed) {
      setAnswerCheckResult({ ok: false, message: 'Please enter a number with an appropriate unit.' });
      return;
    }

    const expectedValue = numericExpected.expectedValue;
    const expectedUnit = numericExpected.expectedUnit;
    const value = parsed.value;
    const userUnit = parsed.unit;

    const absTol = 1e-6;
    const relTol = 1e-3;
    const diff = Math.abs(value - expectedValue);
    const tol = Math.max(absTol, Math.abs(expectedValue) * relTol);
    const valueOk = diff <= tol;

    let unitOk = true;
    const expectedUnitNorm = normalizeUnit(expectedUnit);
    const userUnitNorm = normalizeUnit(userUnit);
    const expectedUnitMap = unitToExponentMap(expectedUnit);
    const userUnitMap = unitToExponentMap(userUnit);

    if (String(userUnit || '').trim()) {
      unitOk = unitsEquivalent(expectedUnit, userUnit);
    } else if (expectedUnitNorm) {
      unitOk = false;
    }

    if (valueOk && unitOk) {
      setAnswerCheckResult({ ok: true, message: 'Correct!' });
    } else if (valueOk && !unitOk && expectedUnitNorm && !String(userUnit || '').trim()) {
      setAnswerCheckResult({ ok: false, message: 'The value is correct, but missing a correct unit.' });
    } else if (!valueOk) {
      setAnswerCheckResult({ ok: false, message: 'Not quite. Check your calculation / rounding.' });
    } else {
      // eslint-disable-next-line no-console
      console.debug('[Calculator] Unit mismatch', {
        expectedUnit,
        userUnit,
        expectedUnitNorm,
        userUnitNorm,
        expectedUnitMap,
        userUnitMap,
      });
      setAnswerCheckResult({ ok: false, message: 'Numeric value looks right, but the unit does not match.' });
    }
  }, [numericExpected, userFinalAnswer]);

  const checkUserSubAnswers = useCallback(() => {
    if (!multipartExpected?.length) return;

    const absTol = 1e-6;
    const relTol = 1e-3;

    const perPart = {};
    let allOk = true;

    for (const part of multipartExpected) {
      const input = userSubAnswers?.[part.label] || '';
      const parsed = parseUserNumericInput(input);
      if (!parsed) {
        perPart[part.label] = { ok: false, message: 'Enter a number with an appropriate unit.' };
        allOk = false;
        continue;
      }

      const diff = Math.abs(parsed.value - part.expectedValue);
      const tol = Math.max(absTol, Math.abs(part.expectedValue) * relTol);
      const valueOk = diff <= tol;

      let unitOk = true;
      const expectedUnitNorm = normalizeUnit(part.expectedUnit);
      const userUnitNorm = normalizeUnit(parsed.unit);
      const expectedUnitMap = unitToExponentMap(part.expectedUnit);
      const userUnitMap = unitToExponentMap(parsed.unit);
      if (String(parsed.unit || '').trim()) {
        unitOk = unitsEquivalent(part.expectedUnit, parsed.unit);
      } else if (expectedUnitNorm) {
        unitOk = false;
      }

      if (valueOk && unitOk) {
        perPart[part.label] = { ok: true, message: 'Correct' };
      } else if (valueOk && !unitOk && expectedUnitNorm && !String(parsed.unit || '').trim()) {
        perPart[part.label] = { ok: false, message: 'Missing unit' };
        allOk = false;
      } else if (!valueOk) {
        perPart[part.label] = { ok: false, message: 'Incorrect' };
        allOk = false;
      } else {
        // eslint-disable-next-line no-console
        console.debug('[Calculator] Unit mismatch (sub)', {
          label: part.label,
          expectedUnit: part.expectedUnit,
          userUnit: parsed.unit,
          expectedUnitNorm,
          userUnitNorm,
          expectedUnitMap,
          userUnitMap,
        });
        perPart[part.label] = { ok: false, message: 'Unit mismatch' };
        allOk = false;
      }
    }

    setSubAnswerCheck({ allOk, perPart });
  }, [multipartExpected, userSubAnswers]);

  const plainText = useMemo(() => {
    if (!question) return '';
    return [
      `=== ${question.typeLabel} ===\n`,
      `QUESTION\n${'─'.repeat(60)}\n${question.problemStatement}`,
      question.equation ? `\n\nEQUATION\n${'─'.repeat(60)}\n${question.equation}` : '',
      question.ionicEquation ? `\n\nIONIC EQUATION\n${'─'.repeat(60)}\n${question.ionicEquation}` : '',
      `\n\nSOLUTION\n${'─'.repeat(60)}`,
      ...(question.solution || []).map((s) => `\nStep ${s.step}: ${s.title}\n${s.content}`),
      `\n\nFINAL ANSWER\n${'─'.repeat(60)}\n${question.finalAnswer}`,
    ].join('');
  }, [question]);

  const ModeToggle = (
    <div className="w-[260px] inline-flex rounded-2xl border-2 border-[#DDE8DD] bg-[#F6FAF6] p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setMode('exercise')}
        className={`w-1/2 px-3 py-2 rounded-xl font-extrabold flex items-center justify-center gap-2 transition ${
          mode === 'exercise'
            ? 'bg-[#6F8F7B] text-white shadow-sm'
            : 'text-slate-700 hover:bg-white'
        }`}
      >
        <Sigma size={18} />
        <span>Exercise</span>
      </button>
      <button
        type="button"
        onClick={() => setMode('diy')}
        className={`w-1/2 px-3 py-2 rounded-xl font-extrabold flex items-center justify-center gap-2 transition ${
          mode === 'diy'
            ? 'bg-[#6F8F7B] text-white shadow-sm'
            : 'text-slate-700 hover:bg-white'
        }`}
      >
        <FlaskConical size={18} />
        <span>DIY</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#F4F8F4]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="rounded-[28px] border-2 border-[#DDE8DD] bg-white/85 backdrop-blur overflow-hidden shadow-xl">
          <div className="px-6 sm:px-8 py-7 flex flex-col gap-5 md:flex-row md:items-center md:justify-between bg-gradient-to-br from-[#F6FAF6] to-white border-b border-[#DDE8DD]">
            <div>
              <div className="inline-flex items-center rounded-full border border-[#DDE8DD] bg-[#EEF5EE] px-4 py-1.5 text-xs font-extrabold tracking-wider text-[#2E4A3F] uppercase">
                Chemistry Learning Platform
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Calculator</h1>
              <p className="mt-2 text-slate-600 font-semibold">Exercise generator & DIY stoichiometry calculator</p>
            </div>

            <div className="flex items-center gap-3">
              {ModeToggle}
            </div>
          </div>

        {mode === 'exercise' ? (
          <>
            <div className="px-6 sm:px-8 py-6">
              <div className="rounded-2xl border-2 border-[#DDE8DD] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-slate-900 font-extrabold text-lg">Calculation Problem Generator</div>
                    <div className="text-slate-600 font-semibold text-sm">HKDSE Chemistry · curriculum-aligned · step-by-step solutions</div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <button
                      type="button"
                      onClick={() => setShowPeriodicTable(true)}
                      className="px-4 py-2 rounded-xl border-2 font-extrabold flex items-center gap-2 transition active:scale-[0.99] border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      <FlaskConical size={18} />
                      <span>Periodic Table</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRamOn((v) => !v)}
                      className={`px-4 py-2 rounded-xl border-2 font-extrabold flex items-center gap-2 transition active:scale-[0.99] ${
                        ramOn
                          ? 'border-[#DDE8DD] bg-[#F6FAF6] text-[#2E4A3F] hover:bg-[#EEF5EE]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      aria-pressed={ramOn}
                    >
                      <Atom size={18} />
                      <span>Include RAM</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      className="px-5 py-2.5 rounded-xl font-extrabold text-white disabled:opacity-60 flex items-center gap-2 shadow-sm active:scale-[0.99]"
                      style={{ background: 'linear-gradient(135deg, #6F8F7B, #83A291)' }}
                    >
                      <Wand2 size={18} />
                      <span>{generating ? 'Generating…' : 'Generate'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border-2 border-[#DDE8DD] bg-white p-5 shadow-sm">
                  <label className="block text-xs font-extrabold tracking-wider text-slate-600 mb-2">TOPIC</label>
                  <MultiSelect
                    id="topic"
                    label="TOPIC"
                    allLabel="All"
                    enableRange
                    rangeType="numeric_prefix"
                    options={topics.map((topic) => ({ value: topic, label: topic }))}
                    value={selectedTopics}
                    openId={openSelectId}
                    setOpenId={setOpenSelectId}
                    onChange={(vals) => {
                      setSelectedTopics(vals);
                      setSelectedSubtopics([]);
                      setQuestion(null);
                      setError(null);
                      resetDropdowns();
                    }}
                  />
                </div>

                <div className="rounded-2xl border-2 border-[#DDE8DD] bg-white p-5 shadow-sm">
                  <label className="block text-xs font-extrabold tracking-wider text-slate-600 mb-2">BY TOPIC (SUBTOPIC)</label>
                  <MultiSelect
                    id="subtopic"
                    label="BY TOPIC (SUBTOPIC)"
                    allLabel="All"
                    options={subtopicsForTopic.map((x) => ({ value: x.id, label: x.subtopic }))}
                    value={selectedSubtopics}
                    openId={openSelectId}
                    setOpenId={setOpenSelectId}
                    onChange={(vals) => {
                      setSelectedSubtopics(vals);
                      setQuestion(null);
                      setError(null);
                      resetDropdowns();
                    }}
                  />
                </div>

                <div className="rounded-2xl border-2 border-[#DDE8DD] bg-white p-5 shadow-sm">
                  <label className="block text-xs font-extrabold tracking-wider text-slate-600 mb-2">CONTEXT</label>
                  <MultiSelect
                    id="context"
                    label="CONTEXT"
                    allLabel="All"
                    options={categories.map((c) => ({ value: c, label: CATEGORY_LABELS[c] || c }))}
                    value={selectedContexts}
                    openId={openSelectId}
                    setOpenId={setOpenSelectId}
                    onChange={(vals) => {
                      setSelectedContexts(vals);
                      setQuestion(null);
                      setError(null);
                      resetDropdowns();
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1">
                <div className="rounded-2xl border-2 border-[#DDE8DD] bg-white p-5 shadow-sm">
                  <label className="block text-xs font-extrabold tracking-wider text-slate-600 mb-2">QUESTION TYPE</label>
                  <MultiSelect
                    id="questionType"
                    label="QUESTION TYPE"
                    allLabel="All"
                    options={filteredTypes.map((t) => ({ value: t.id, label: t.label }))}
                    value={selectedTypeIds}
                    openId={openSelectId}
                    setOpenId={setOpenSelectId}
                    onChange={(vals) => {
                      setSelectedTypeIds(vals);
                      setQuestion(null);
                      setError(null);
                      setUserFinalAnswer('');
                      setAnswerCheckResult(null);
                      setUserSubAnswers({});
                      setSubAnswerCheck(null);
                      setUnitHint('');
                      setSubUnitHints({});
                      setUnitSuggestion(null);
                      setSubUnitSuggestions({});
                      resetDropdowns();
                    }}
                  />
                  <div className="mt-2 text-sm font-semibold text-slate-600">
                    {selectedTypeIds.length === 1
                      ? QUESTION_TYPES.find((t) => t.id === selectedTypeIds[0])?.description || ''
                      : `${selectedTypeIds.length} selected`
                    }
                  </div>
                </div>
              </div>

              <div className="mt-6">
          {error && (
            <div className="mb-4 p-4 rounded-2xl border-2 border-red-200 bg-red-50 text-red-800 font-extrabold">
              {error}
            </div>
          )}

          {!question && !error && (
            <div className="text-center py-16">
              <div className="text-slate-900 text-xl font-black">Ready to generate</div>
              <div className="mt-2 text-slate-600 font-semibold">Pick a category and type, then press Generate.</div>
            </div>
          )}

          {question && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-500">{question.typeLabel}</div>
                  <div className="text-2xl font-black text-slate-900">{question.title}</div>
                  <div className="text-slate-600 font-semibold">{question.description}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(plainText);
                      } catch {
                        // ignore
                      }
                    }}
                    className="px-4 py-2 rounded-xl font-extrabold bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <section className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-black tracking-wider text-slate-500 mb-3">PROBLEM</div>
                <FormattedText
                  text={question.problemStatement}
                  className="whitespace-pre-line text-slate-900 text-lg leading-relaxed"
                  style={{ fontFamily: 'Times New Roman, Times, serif' }}
                />
                {(() => {
                  const hasRamInStatement = /relative\s+atomic\s+masses?/i.test(question.problemStatement || '');
                  if (!ramOn) return null;
                  if (hasRamInStatement) return null;
                  if (!question.ramInfo) return null;
                  if (!shouldShowRamForQuestion(question)) return null;

                  const elems = pickRamElementsFromQuestion(question);
                  const content = elems.length
                    ? `(Relative atomic masses: ${elems.map((e) => `${e} = ${RAM[e]}`).join(', ')})`
                    : question.ramInfo;
                  return (
                    <FormattedText
                      text={content}
                      className="mt-4 p-3 rounded-xl border-2 border-[#DDE8DD] bg-[#F6FAF6] text-[#2E4A3F] text-sm font-bold"
                      style={{ fontFamily: 'Times New Roman, Times, serif' }}
                    />
                  );
                })()}
              </section>

              {multipartExpected?.length ? (
                <section className="rounded-2xl border-2 border-[#DDE8DD] bg-white p-5 shadow-sm">
                  <div className="text-xs font-black tracking-wider text-slate-500 mb-3">YOUR ANSWERS</div>

                  <div className="space-y-3">
                    {multipartExpected.map((p) => {
                      const key = p.label;
                      const res = subAnswerCheck?.perPart?.[key];
                      const ring = res
                        ? res.ok
                          ? 'border-[#DDE8DD] focus:ring-[#6F8F7B]/40'
                          : 'border-red-200 focus:ring-red-200'
                        : 'border-slate-200 focus:ring-[#6F8F7B]/40';

                      return (
                        <div key={key}>
                          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                            <div className="w-14 flex items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-3 font-black text-slate-700">
                              ({key})
                            </div>
                            <input
                              value={userSubAnswers?.[key] || ''}
                              onChange={(e) => {
                                const v = prettyFormatUnitInPlace(e.target.value);
                                setUserSubAnswers((prev) => ({ ...prev, [key]: v }));
                                setSubAnswerCheck(null);

                                const parsed = parseUserNumericInput(v);
                                const hint = parsed?.unit ? preferDisplayUnitForTypedUnit(parsed.unit) : '';
                                setSubUnitHints((prev) => ({ ...prev, [key]: hint }));

                                const sug = suggestUnitConversion(v);
                                setSubUnitSuggestions((prev) => ({ ...prev, [key]: sug }));
                              }}
                              placeholder={p.expectedUnit ? `e.g. 0.25 ${p.expectedUnit}` : 'e.g. 0.25'}
                              className={`w-full sm:flex-1 px-4 py-3 rounded-xl border-2 font-extrabold text-slate-900 focus:outline-none focus:ring-2 ${ring}`}
                            />
                            {res && (
                              <div
                                className={`sm:w-32 text-center px-3 py-3 rounded-xl border-2 font-extrabold ${
                                  res.ok
                                    ? 'border-[#DDE8DD] bg-[#F6FAF6] text-[#2E4A3F]'
                                    : 'border-red-200 bg-red-50 text-red-800'
                                }`}
                              >
                                {res.message}
                              </div>
                            )}
                          </div>
                          {subUnitSuggestions?.[key]?.targetUnit && (
                            <div className="sm:pl-[4.5rem] mt-2">
                              <button
                                type="button"
                                className="text-xs font-extrabold px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                                onClick={() => {
                                  const current = userSubAnswers?.[key] || '';
                                  const nextValue = applyUnitConversionToNumericInput(
                                    current,
                                    subUnitSuggestions[key].targetUnit
                                  );
                                  setUserSubAnswers((prev) => ({ ...prev, [key]: nextValue }));

                                  const parsed = parseUserNumericInput(nextValue);
                                  const hint = parsed?.unit ? preferDisplayUnitForTypedUnit(parsed.unit) : '';
                                  setSubUnitHints((prev) => ({ ...prev, [key]: hint }));
                                  setSubUnitSuggestions((prev) => ({ ...prev, [key]: null }));
                                }}
                              >
                                Convert unit to {subUnitSuggestions[key].targetUnit}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <button
                      type="button"
                      onClick={checkUserSubAnswers}
                      className="px-5 py-3 rounded-xl font-extrabold text-white shadow-sm active:scale-[0.99]"
                      style={{ background: 'linear-gradient(135deg, #6F8F7B, #83A291)' }}
                    >
                      Check Answers
                    </button>

                    {subAnswerCheck && (
                      <div
                        className={`px-4 py-3 rounded-xl border-2 font-extrabold ${
                          subAnswerCheck.allOk
                            ? 'border-[#DDE8DD] bg-[#F6FAF6] text-[#2E4A3F]'
                            : 'border-red-200 bg-red-50 text-red-800'
                        }`}
                      >
                        {subAnswerCheck.allOk ? 'All correct!' : 'Some answers are incorrect.'}
                      </div>
                    )}
                  </div>
                </section>
              ) : numericExpected ? (
                <section className="rounded-2xl border-2 border-[#DDE8DD] bg-white p-5 shadow-sm">
                  <div className="text-xs font-black tracking-wider text-slate-500 mb-3">YOUR ANSWER</div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <input
                      value={userFinalAnswer}
                      onChange={(e) => {
                        const v = prettyFormatUnitInPlace(e.target.value);
                        setUserFinalAnswer(v);
                        setAnswerCheckResult(null);

                        const parsed = parseUserNumericInput(v);
                        setUnitHint(parsed?.unit ? preferDisplayUnitForTypedUnit(parsed.unit) : '');
                        setUnitSuggestion(suggestUnitConversion(v));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') checkUserAnswer();
                      }}
                      placeholder={numericExpected.expectedUnit ? `e.g. 0.25 ${numericExpected.expectedUnit}` : 'e.g. 0.25'}
                      className="w-full sm:flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6F8F7B]/40"
                    />
                    <button
                      type="button"
                      onClick={checkUserAnswer}
                      className="px-5 py-3 rounded-xl font-extrabold text-white shadow-sm active:scale-[0.99]"
                      style={{ background: 'linear-gradient(135deg, #6F8F7B, #83A291)' }}
                    >
                      Check Answer
                    </button>
                  </div>

                  {unitSuggestion?.targetUnit && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="text-xs font-extrabold px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                        onClick={() => {
                          const nextValue = applyUnitConversionToNumericInput(userFinalAnswer, unitSuggestion.targetUnit);
                          setUserFinalAnswer(nextValue);
                          const parsed = parseUserNumericInput(nextValue);
                          setUnitHint(parsed?.unit ? preferDisplayUnitForTypedUnit(parsed.unit) : '');
                          setUnitSuggestion(null);
                        }}
                      >
                        Convert unit to {unitSuggestion.targetUnit}
                      </button>
                    </div>
                  )}

                  {answerCheckResult && (
                    <div
                      className={`mt-3 p-3 rounded-xl border-2 font-extrabold ${
                        answerCheckResult.ok
                          ? 'border-[#DDE8DD] bg-[#F6FAF6] text-[#2E4A3F]'
                          : 'border-red-200 bg-red-50 text-red-800'
                      }`}
                    >
                      {answerCheckResult.message}
                    </div>
                  )}
                </section>
              ) : null}

              <section className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
                <div className="flex flex-col">
                  {question.equation && (
                    <button
                      type="button"
                      onClick={() => setShowEquation((v) => !v)}
                      className="w-full px-5 py-4 flex items-center justify-between font-extrabold text-slate-900 hover:bg-slate-50"
                    >
                      <span>Balanced equation</span>
                      <span className="text-slate-500">{showEquation ? '▾' : '▸'}</span>
                    </button>
                  )}

                  {question.equation && showEquation && (
                    <div className="px-5 pb-5">
                      <FormattedText
                        text={question.equation}
                        className="whitespace-pre-wrap break-words bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm"
                        style={{ whiteSpace: 'pre-wrap' }}
                      />

                      {question.ionicEquation && (
                        <>
                          <div className="text-xs font-black tracking-wider text-slate-500 mt-5 mb-3">IONIC EQUATION</div>
                          <FormattedText
                            text={question.ionicEquation}
                            className="whitespace-pre-wrap break-words bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm"
                            style={{ whiteSpace: 'pre-wrap' }}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {question.solution?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSteps((v) => !v)}
                      className="w-full px-5 py-4 flex items-center justify-between font-extrabold text-slate-900 hover:bg-slate-50 border-t border-slate-200"
                    >
                      <span>Step-by-step solution</span>
                      <span className="text-slate-500">{showSteps ? '▾' : '▸'}</span>
                    </button>
                  )}

                  {question.solution?.length > 0 && showSteps && (
                    <div className="px-5 pb-5 border-t border-slate-200 bg-amber-50">
                      <div className="pt-5 space-y-4">
                        {question.solution.map((s) => (
                          <div key={s.step} className="bg-white border border-amber-200 rounded-2xl p-4">
                            <div className="font-black text-slate-900">
                              Step {s.step}: {s.title}
                            </div>
                            <FormattedText
                              text={s.content}
                              className="mt-2 whitespace-pre-wrap break-words bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm"
                              style={{ whiteSpace: 'pre-wrap' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {question.finalAnswer && (
                    <button
                      type="button"
                      onClick={() => setShowAnswer((v) => !v)}
                      className="w-full px-5 py-4 flex items-center justify-between font-extrabold text-slate-900 hover:bg-slate-50 border-t border-slate-200"
                    >
                      <span>Final answer</span>
                      <span className="text-slate-500">{showAnswer ? '▾' : '▸'}</span>
                    </button>
                  )}

                  {question.finalAnswer && showAnswer && (
                    <div className="px-5 pb-5 border-t border-slate-200 bg-slate-900">
                      <div className="pt-5">
                        <FormattedText
                          text={question.finalAnswer}
                          className="whitespace-pre-wrap break-words text-white font-mono text-sm"
                          style={{ whiteSpace: 'pre-wrap' }}
                        />
                      </div>
                    </div>
                  )}

                </div>
              </section>
            </div>
          )}
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 sm:px-8 pb-8">
            <div className="rounded-2xl border-2 border-[#DDE8DD] bg-white p-5 shadow-sm">
              <StoichiometryCalculator />
            </div>
          </div>
        )}

        {showPeriodicTable && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPeriodicTable(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Periodic Table of Elements</h3>
                <button
                  onClick={() => setShowPeriodicTable(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-4">
                <img src="/PeriodicTable.jpg" alt="Periodic Table" className="w-full h-auto" />
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
