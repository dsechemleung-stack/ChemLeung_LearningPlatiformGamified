import React, { useState } from 'react';
import { CheckCircle2, XCircle, BarChart3, RotateCcw, Info, Clock, Share2, MessageSquare } from 'lucide-react';
import ShareableReport from './ShareableReport';
import QuestionForum from './QuestionForum';
import { useLanguage } from '../contexts/LanguageContext';

export default function ResultsSummary({ questions, userAnswers, questionTimes, onRestart }) {
  const [showShareReport, setShowShareReport] = useState(false);
  const [forumQuestion, setForumQuestion] = useState(null);
  const [showChineseExplanation, setShowChineseExplanation] = useState(() => ({}));
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const { t, tf } = useLanguage();

  const decodeHtmlEntities = (input) => {
    if (!input) return '';
    const s = String(input);
    if (!s.includes('&')) return s;

    if (/<[a-zA-Z]/.test(s)) {
      return s
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = s;
      return textarea.value;
    } catch {
      return s;
    }
  };

  const coerceRichOptionHtml = (input) => {
    const decoded = decodeHtmlEntities(input);
    const raw = String(decoded || '');
    if (!raw) return '';
    if (raw.includes('<img') || raw.includes('<button')) return raw;

    const hasImageAttrs = raw.includes('src="') && raw.includes('data-quiz-image');
    if (!hasImageAttrs) return raw;

    // The broken format is attribute-only with lots of newlines.
    // Compact both actual newlines and literal "\\n" sequences so tag parsing works.
    const s = raw
      .replace(/\\r\\n|\\n|\\r/g, ' ')
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const imgEnd = s.indexOf('/>');
    if (imgEnd === -1) return raw;

    const imgAttrs = s.slice(0, imgEnd).trim();
    const remainder = s.slice(imgEnd + 2);

    let repaired = `<img ${imgAttrs} />`;

    const btnStart = remainder.indexOf('type="button"');
    if (btnStart !== -1) {
      const btnChunk = remainder.slice(btnStart);
      const btnEnd = btnChunk.indexOf('>');
      if (btnEnd !== -1) {
        const btnAttrs = btnChunk.slice(0, btnEnd).trim();
        repaired += `<button ${btnAttrs}></button>`;
      }
    }

    return repaired;
  };

  const prepareOptionHtml = (input) => {
    const decoded = decodeHtmlEntities(input);
    const raw = String(decoded || '');
    if (!raw) return '';
    const normalized = raw.replace(/\\"/g, '"');
    if (normalized.includes('<img') || normalized.includes('<span')) {
      return normalized;
    }
    const isAttributeOnlyImage =
      !normalized.includes('<img')
      && /src\s*=\s*("|'|&quot;|&#39;)/i.test(normalized)
      && (
        normalized.includes('data-quiz-image')
        || normalized.toLowerCase().includes('googleusercontent.com')
        || normalized.toLowerCase().includes('question diagram')
      );
    if (isAttributeOnlyImage) {
      return coerceRichOptionHtml(normalized);
    }
    return normalizeLiteralNewlinesToBr(decoded);
  };

  const isAttributeOnlyImageOption = (input) => {
    const decoded = decodeHtmlEntities(input);
    const raw = String(decoded || '').replace(/\\"/g, '"');
    return Boolean(raw)
      && !raw.includes('<img')
      && /src\s*=\s*("|'|&quot;|&#39;)/i.test(raw)
      && (
        raw.includes('data-quiz-image')
        || raw.toLowerCase().includes('googleusercontent.com')
        || raw.toLowerCase().includes('question diagram')
      );
  };

  const extractFirstImageSrc = (input) => {
    const decoded = decodeHtmlEntities(input);
    const raw = String(decoded || '').replace(/\\"/g, '"');

    const m = raw.match(/src\s*=\s*(?:"|'|&quot;|&#39;)([^"'&]+)(?:"|'|&quot;|&#39;)/i);
    if (m?.[1]) return m[1];

    const marker = raw.match(/\((?:image|img)\s*:\s*(https?:\/\/[^)\s]+)\)/i);
    if (marker?.[1]) return marker[1];

    const marker2 = raw.match(/\{(?:image|img)\s*:\s*(https?:\/\/[^}\s]+)\}/i);
    if (marker2?.[1]) return marker2[1];

    return '';
  };

  const normalizeLiteralNewlinesToBr = (html) => {
    if (!html) return '';
    const s = String(html);
    return s
      .replace(/\\r\\n/g, '<br>')
      .replace(/\\n/g, '<br>')
      .replace(/\\r/g, '<br>')
      .replace(/\r\n/g, '<br>')
      .replace(/\n/g, '<br>')
      .replace(/\r/g, '<br>');
  };

  const handleRichContentClick = (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const enlargeBtn = target.closest('[data-enlarge-image="true"]');
    if (enlargeBtn) {
      const src = enlargeBtn.getAttribute('data-image-src');
      if (src) {
        e.preventDefault();
        e.stopPropagation();
        setLightboxSrc(src);
      }
      return;
    }

    const img = target.closest('img[data-quiz-image="true"], img');
    if (img) {
      const src = img.getAttribute('src');
      if (src) {
        e.preventDefault();
        e.stopPropagation();
        setLightboxSrc(src);
      }
    }
  };

  // 1. Calculate Score
  const total = questions.length;
  const correctCount = questions.reduce((acc, q) => {
    return acc + (userAnswers[q.ID] === q.CorrectOption ? 1 : 0);
  }, 0);
  const percentage = Math.round((correctCount / total) * 100);

  // Format time
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);
    if (hrs > 0) {
      return `${hrs}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Calculate total time and average
  const totalTime = questionTimes 
    ? Object.values(questionTimes).reduce((sum, time) => sum + time, 0)
    : null;
  
  const averageTimePerQuestion = questionTimes && total > 0
    ? totalTime / total
    : null;

  // 2. Strength/Weakness Analysis by Topic
  const analysis = questions.reduce((acc, q) => {
    if (!acc[q.Topic]) {
      acc[q.Topic] = { total: 0, correct: 0 };
    }
    acc[q.Topic].total += 1;
    if (userAnswers[q.ID] === q.CorrectOption) {
      acc[q.Topic].correct += 1;
    }
    return acc;
  }, {});

  const topicResults = Object.entries(analysis).map(([topic, data]) => ({
    topic,
    percent: Math.round((data.correct / data.total) * 100),
    ...data
  }));

  const strengths = topicResults.filter(t => t.percent >= 70);
  const weaknesses = topicResults.filter(t => t.percent < 70);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              className="absolute -top-10 right-0 text-white/90 hover:text-white text-sm font-bold"
            >
              {t('common.close')}
            </button>
            <div className="bg-white rounded-2xl p-3 shadow-2xl">
              <img
                src={lightboxSrc}
                alt="Enlarged diagram"
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
      {/* Hero Score Section */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-lab-blue p-8 text-center text-white">
          <h2 className="text-xl opacity-90 mb-2">{t('results.yourPerformance')}</h2>
          <div className="text-6xl font-black mb-2">{percentage}%</div>
          <p className="text-blue-100">
            {tf('results.correctOutOfTotalQuestions', { correct: correctCount, total })}
          </p>
          {!!totalTime && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-100">
              <div className="bg-blue-700 bg-opacity-50 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock size={18} />
                  <span className="text-sm font-semibold">{t('results.totalTime')}</span>
                </div>
                <div className="text-2xl font-bold">{formatTime(totalTime)}</div>
              </div>
              <div className="bg-blue-700 bg-opacity-50 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock size={18} />
                  <span className="text-sm font-semibold">{t('results.averagePerQuestion')}</span>
                </div>
                <div className="text-2xl font-bold">{formatTime(averageTimePerQuestion)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Analytics Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="flex items-center gap-2 font-bold text-chemistry-green mb-3">
              <CheckCircle2 size={18} /> {t('results.strengths')}
            </h3>
            {strengths.length > 0 ? (
              strengths.map(s => (
                <div key={s.topic} className="text-sm mb-2 flex justify-between">
                  <span className="truncate mr-2">{s.topic}</span>
                  <span className="font-bold">{s.percent}%</span>
                </div>
              ))
            ) : <p className="text-sm text-slate-400 italic">{t('results.keepPracticingToBuildStrengths')}</p>}
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="flex items-center gap-2 font-bold text-amber-600 mb-3">
              <BarChart3 size={18} /> {t('results.needsFocus')}
            </h3>
            {weaknesses.length > 0 ? (
              weaknesses.map(w => (
                <div key={w.topic} className="text-sm mb-2 flex justify-between">
                  <span className="truncate mr-2">{w.topic}</span>
                  <span className="font-bold text-amber-700">{w.percent}%</span>
                </div>
              ))
            ) : <p className="text-sm text-slate-400 italic">{t('results.noMajorWeaknessesDetected')}</p>}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setShowShareReport(true)}
          className="w-full py-4 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg"
        >
          <Share2 size={20} />
          {t('results.shareReport')}
        </button>

        <button
          onClick={onRestart}
          className="w-full py-4 flex items-center justify-center gap-2 bg-carbon-grey text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
        >
          <RotateCcw size={20} />
          {t('results.startNewSession')}
        </button>
      </div>

      {/* Detailed Review List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Info className="text-lab-blue" /> {t('results.detailedReview')}
        </h3>
        {questions.map((q, index) => {
          const isCorrect = userAnswers[q.ID] === q.CorrectOption;
          const timeSpent = questionTimes ? questionTimes[q.ID] : null;
          const showCn = !!showChineseExplanation?.[q.ID];
          
          return (
            <div key={q.ID} className={`p-6 rounded-xl border-l-4 bg-white shadow-sm ${isCorrect ? 'border-chemistry-green' : 'border-red-500'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-slate-700">{tf('results.questionNumber', { number: index + 1 })}</span>
                  {timeSpent && (
                    <div className="text-sm text-slate-500 flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                      <Clock size={14} />
                      <span className="font-semibold">{formatTime(timeSpent)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Forum Button */}
                  <button
                    onClick={() => setForumQuestion(q)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-bold hover:bg-purple-200 transition-all"
                    title={t('results.discussThisQuestion')}
                  >
                    <MessageSquare size={16} />
                    <span className="hidden sm:inline">{t('results.discuss')}</span>
                  </button>
                  
                  {/* Status Icon */}
                  {isCorrect ? 
                    <CheckCircle2 className="text-chemistry-green" size={24} /> : 
                    <XCircle className="text-red-500" size={24} />
                  }
                </div>
              </div>
              
              <div
                className="prose prose-slate max-w-none mb-4 text-lg [&_img]:max-h-[220px] [&_img]:max-w-full [&_img]:w-auto [&_img]:object-contain [&_img]:my-2"
                onClick={handleRichContentClick}
                dangerouslySetInnerHTML={{ __html: q.Question }}
              />
              
              <div className="space-y-2 mb-4">
                {[
                  { key: 'A', raw: q.OptionA, html: prepareOptionHtml(q.OptionA) },
                  { key: 'B', raw: q.OptionB, html: prepareOptionHtml(q.OptionB) },
                  { key: 'C', raw: q.OptionC, html: prepareOptionHtml(q.OptionC) },
                  { key: 'D', raw: q.OptionD, html: prepareOptionHtml(q.OptionD) },
                ].filter(o => o.html).map((opt) => {
                  const isUser = userAnswers[q.ID] === opt.key;
                  const isCorrectOpt = q.CorrectOption === opt.key;

                  const rawDecoded = decodeHtmlEntities(opt.raw);
                  const htmlDecoded = decodeHtmlEntities(opt.html);
                  const imageSrc = extractFirstImageSrc(rawDecoded) || extractFirstImageSrc(htmlDecoded);
                  const renderAsImage = Boolean(imageSrc) && !String(rawDecoded || '').includes('<img') && !String(htmlDecoded || '').includes('<img');

                  const base = 'border-slate-200 bg-white text-slate-800';
                  const correctCls = 'border-green-300 bg-green-50 text-green-900';
                  const wrongCls = 'border-red-300 bg-red-50 text-red-900';

                  const finalClass = isCorrectOpt
                    ? correctCls
                    : (isUser && !isCorrectOpt)
                      ? wrongCls
                      : base;

                  return (
                    <div
                      key={opt.key}
                      data-option-render={renderAsImage ? 'image' : 'html'}
                      className={`p-3 rounded-lg border ${finalClass}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-none w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-black">
                          {opt.key}
                        </div>
                        {renderAsImage ? (
                          <span className="inline-flex items-start gap-2 align-middle">
                            <img
                              src={imageSrc}
                              alt="Question diagram"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              data-quiz-image="true"
                              style={{ minHeight: 120, display: 'block' }}
                              className="max-w-[calc(100%-3rem)] h-auto max-h-[160px] object-contain rounded-lg border border-slate-200 my-3"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (imageSrc) setLightboxSrc(imageSrc);
                              }}
                            />
                            <button
                              type="button"
                              aria-label="Enlarge image"
                              title="Enlarge"
                              data-enlarge-image="true"
                              data-image-src={imageSrc}
                              className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (imageSrc) setLightboxSrc(imageSrc);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6" />
                                <path d="M9 21H3v-6" />
                                <path d="M21 3l-7 7" />
                                <path d="M3 21l7-7" />
                              </svg>
                            </button>
                          </span>
                        ) : (
                          <div
                            className="prose prose-slate max-w-none text-sm [&_img]:max-h-[160px] [&_img]:max-w-full [&_img]:w-auto [&_img]:object-contain [&_img]:my-2"
                            onClick={handleRichContentClick}
                            dangerouslySetInnerHTML={{ __html: opt.html }}
                          />
                        )}
                      </div>
                      {(isUser || isCorrectOpt) && (
                        <div className="mt-2 text-xs font-black">
                          {isCorrectOpt && isUser && <span className="text-green-700">{t('results.correct')}</span>}
                          {isCorrectOpt && !isUser && <span className="text-green-700">{t('results.correctAnswer')}</span>}
                          {!isCorrectOpt && isUser && <span className="text-red-700">{t('results.yourAnswer')}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                <div className={`p-3 rounded-lg text-sm border ${userAnswers[q.ID] === q.CorrectOption ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <strong>{t('results.yourAnswer')}:</strong> {userAnswers[q.ID] || t('results.none')}
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                  <strong>{t('results.correctAnswer')}:</strong> {q.CorrectOption}
                </div>
              </div>

              {q.Explanation && (
                <div className="mt-4 p-4 bg-slate-100 rounded-lg text-sm border border-slate-200">
                  <strong className="block mb-2 text-slate-700 flex items-center gap-1">
                    <Info size={14}/> {t('results.explanation')}:
                  </strong>
                  <div dangerouslySetInnerHTML={{ __html: q.Explanation }} className="leading-relaxed text-slate-600" />

                  {q.ChineseExplanation && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowChineseExplanation(prev => ({
                          ...(prev || {}),
                          [q.ID]: !prev?.[q.ID]
                        }))}
                        className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all"
                      >
                        {showCn ? t('results.hideChineseExplanation') : t('results.showChineseExplanation')}
                      </button>

                      {showCn && (
                        <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200">
                          <div dangerouslySetInnerHTML={{ __html: q.ChineseExplanation }} className="leading-relaxed text-slate-700" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Share Report Modal */}
      {showShareReport && (
        <ShareableReport
          questions={questions}
          userAnswers={userAnswers}
          questionTimes={questionTimes}
          onClose={() => setShowShareReport(false)}
        />
      )}

      {/* Forum Modal */}
      {forumQuestion && (
        <QuestionForum
          question={forumQuestion}
          onClose={() => setForumQuestion(null)}
        />
      )}
    </div>
  );
}