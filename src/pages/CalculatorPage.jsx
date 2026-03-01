import React, { useCallback, useMemo, useState } from 'react';
import { FlaskConical, Sigma, Wand2, Atom } from 'lucide-react';
import StoichiometryCalculator from '../components/stoichiometry/StoichiometryCalculator.jsx';
import MultiSelect from '../components/MultiSelect.jsx';
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
  const [question, setQuestion] = useState(null);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showEquation, setShowEquation] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const resetDropdowns = useCallback(() => {
    setShowEquation(false);
    setShowSteps(false);
    setShowAnswer(false);
    setShowNotes(false);
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
      resetDropdowns();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setGenerating(false);
    }
  }, [selectedTypeIds, filteredTypes, ramOn, resetDropdowns]);

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
      question.notes?.length
        ? `\n\nNOTES\n${'─'.repeat(60)}\n${question.notes
            .filter(Boolean)
            .map((n, i) => `${i + 1}. ${n}`)
            .join('\n')}`
        : '',
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
                  if (!question.ramInfo || hasRamInStatement) return null;
                  return (
                    <FormattedText
                      text={question.ramInfo}
                      className="mt-4 p-3 rounded-xl border-2 border-[#DDE8DD] bg-[#F6FAF6] text-[#2E4A3F] text-sm font-bold"
                      style={{ fontFamily: 'Times New Roman, Times, serif' }}
                    />
                  );
                })()}
              </section>

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

                  {question.notes?.filter(Boolean).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNotes((v) => !v)}
                      className="w-full px-5 py-4 flex items-center justify-between font-extrabold text-slate-900 hover:bg-slate-50 border-t border-slate-200"
                    >
                      <span>Notes</span>
                      <span className="text-slate-500">{showNotes ? '▾' : '▸'}</span>
                    </button>
                  )}

                  {question.notes?.filter(Boolean).length > 0 && showNotes && (
                    <div className="px-5 pb-5 border-t border-slate-200 bg-white">
                      <div className="pt-5 space-y-2">
                        {question.notes
                          .filter(Boolean)
                          .map((n, i) => (
                            <div key={i} className="text-slate-700 font-semibold">
                              {i + 1}. {n}
                            </div>
                          ))}
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
      </div>
      </div>
    </div>
  );
}
