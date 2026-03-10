import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, Info, Share2, BarChart3, MessageSquare } from 'lucide-react';
import ShareableReport from './ShareableReport';
import QuestionForum from './QuestionForum';
import { useLanguage } from '../contexts/LanguageContext';

export default function AttemptDetailModal({ attempt, onClose }) {
  const [showShareReport, setShowShareReport] = useState(false);
  const [forumQuestion, setForumQuestion] = useState(null);

  const { t, tf, isEnglish } = useLanguage();

  const { questions, answers, questionTimes, correctAnswers, totalQuestions, percentage, topics, timestamp, timeSpent } = attempt;

  // If attempt doesn't have questions stored, show a limited view
  const hasFullData = questions && questions.length > 0 && answers;

  const formatTime = (ms) => {
    if (!ms) return t('common.notAvailable');
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);
    if (hrs > 0) return tf('history.timeHrsMins', { h: hrs, m: minutes % 60 });
    if (minutes > 0) return tf('history.timeMinsSecs', { m: minutes, s: seconds % 60 });
    return tf('history.timeSecs', { s: seconds });
  };

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString(isEnglish ? 'en-GB' : 'zh-HK', {
      timeZone: 'Asia/Hong_Kong',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Topic analysis
  const analysis = hasFullData
    ? questions.reduce((acc, q) => {
        if (!acc[q.Topic]) acc[q.Topic] = { total: 0, correct: 0 };
        acc[q.Topic].total += 1;
        if (answers[q.ID] === q.CorrectOption) acc[q.Topic].correct += 1;
        return acc;
      }, {})
    : {};

  const topicResults = Object.entries(analysis).map(([topic, data]) => ({
    topic,
    percent: Math.round((data.correct / data.total) * 100),
    ...data,
  }));

  const strengths = topicResults.filter(t => t.percent >= 70);
  const weaknesses = topicResults.filter(t => t.percent < 70);

  const scoreColor =
    percentage >= 70 ? 'from-emerald-500 to-green-600'
    : percentage >= 50 ? 'from-amber-400 to-orange-500'
    : 'from-red-400 to-rose-600';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b-2 border-slate-200 p-5 rounded-t-2xl z-10 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-800">{t('history.attemptDetailTitle')}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{formatDate(timestamp)}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasFullData && (
                <button
                  onClick={() => setShowShareReport(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all"
                >
                  <Share2 size={16} />
                  {t('history.share')}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Score Banner */}
            <div className={`bg-gradient-to-r ${scoreColor} rounded-2xl p-8 text-white text-center`}>
              <div className="text-6xl font-black mb-1">{percentage}%</div>
              <div className="text-xl opacity-90">{tf('history.correctOutOfTotal', { correct: correctAnswers, total: totalQuestions })}</div>
              {timeSpent && (
                <div className="mt-3 flex items-center justify-center gap-2 text-white/80 text-sm">
                  <Clock size={16} />
                  <span>{t('history.totalTimeLabel')}: {formatTime(timeSpent)}</span>
                  <span>·</span>
                  <span>{t('history.avgTimeLabel')}: {formatTime(timeSpent / totalQuestions)} {t('history.perQuestionUnit')}</span>
                </div>
              )}
              {topics && topics.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {topics.map(t => (
                    <span key={t} className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Strengths / Weaknesses */}
            {hasFullData && topicResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                  <h3 className="flex items-center gap-2 font-bold text-emerald-600 mb-3">
                    <CheckCircle2 size={18} /> {t('history.strengths')}
                  </h3>
                  {strengths.length > 0
                    ? strengths.map(s => (
                        <div key={s.topic} className="text-sm mb-2 flex justify-between">
                          <span className="truncate mr-2">{s.topic}</span>
                          <span className="font-bold text-emerald-700">{s.percent}%</span>
                        </div>
                      ))
                    : <p className="text-sm text-slate-400 italic">{t('history.keepPracticing')}</p>}
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                  <h3 className="flex items-center gap-2 font-bold text-amber-600 mb-3">
                    <BarChart3 size={18} /> {t('history.needsFocus')}
                  </h3>
                  {weaknesses.length > 0
                    ? weaknesses.map(w => (
                        <div key={w.topic} className="text-sm mb-2 flex justify-between">
                          <span className="truncate mr-2">{w.topic}</span>
                          <span className="font-bold text-amber-700">{w.percent}%</span>
                        </div>
                      ))
                    : <p className="text-sm text-slate-400 italic">{t('history.noMajorWeaknesses')}</p>}
                </div>
              </div>
            )}

            {/* No full data notice */}
            {!hasFullData && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-amber-800 text-sm font-semibold">
                {t('history.fullDataNotice')}
              </div>
            )}

            {/* Detailed Q&A */}
            {hasFullData && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Info className="text-lab-blue" /> {t('history.detailedReview')}
                </h3>
                {questions.map((q, index) => {
                  const isCorrect = answers[q.ID] === q.CorrectOption;
                  const timeForQ = questionTimes ? questionTimes[q.ID] : null;
                  const selected = answers[q.ID] || null;
                  const opts = [
                    { key: 'A', text: q.OptionA },
                    { key: 'B', text: q.OptionB },
                    { key: 'C', text: q.OptionC },
                    { key: 'D', text: q.OptionD },
                  ].filter(o => o.text !== null && o.text !== undefined && String(o.text).trim() !== '');
                  return (
                    <div
                      key={q.ID}
                      className={`p-5 rounded-xl border-l-4 bg-white shadow-sm ${isCorrect ? 'border-emerald-500' : 'border-red-500'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black text-slate-700">Q{index + 1}</span>
                          {timeForQ && (
                            <div className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
                              <Clock size={12} />
                              {formatTime(timeForQ)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setForumQuestion(q)}
                            className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200 transition-all"
                          >
                            <MessageSquare size={12} /> {t('history.discuss')}
                          </button>
                          {isCorrect
                            ? <CheckCircle2 className="text-emerald-500" size={22} />
                            : <XCircle className="text-red-500" size={22} />
                          }
                        </div>
                      </div>

                      {(q.Topic || q.Subtopic || q.DSEcode) && (
                        <div className="mb-3 flex flex-wrap gap-2 text-xs">
                          {q.Topic && (
                            <span className="px-2 py-1 rounded-full bg-blue-50 text-lab-blue border border-blue-100 font-bold">
                              {q.Topic}
                            </span>
                          )}
                          {q.Subtopic && (
                            <span className="px-2 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-semibold italic">
                              {q.Subtopic}
                            </span>
                          )}
                          {q.DSEcode && (
                            <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-bold">
                              {q.DSEcode}
                            </span>
                          )}
                        </div>
                      )}

                      <div
                        className="prose prose-slate max-w-none mb-3 text-base"
                        dangerouslySetInnerHTML={{ __html: q.Question }}
                      />
                      {q.Pictureurl && (
                        <div className="mb-3 flex justify-center">
                          <img src={q.Pictureurl} alt={t('history.diagramAlt')} className="max-h-[180px] object-contain rounded-lg border border-slate-200" />
                        </div>
                      )}

                      {opts.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 mb-3">
                          {opts.map((opt) => {
                            const isSelected = selected === opt.key;
                            const isCorrectOpt = q.CorrectOption === opt.key;
                            return (
                              <div
                                key={opt.key}
                                className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                                  isCorrectOpt
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : isSelected
                                      ? 'bg-rose-50 border-rose-200'
                                      : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md font-black bg-slate-100 text-slate-600">
                                  {opt.key}
                                </div>
                                <div
                                  className="flex-1 whitespace-pre-wrap prose prose-slate max-w-none"
                                  dangerouslySetInnerHTML={{ __html: String(opt.text) }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.Explanation && (
                        <div className="p-3 bg-slate-50 rounded-lg text-sm border border-slate-200">
                          <strong className="block mb-1 text-slate-700 flex items-center gap-1">
                            <Info size={13} /> {t('history.explanation')}
                          </strong>
                          <div dangerouslySetInnerHTML={{ __html: q.Explanation }} className="text-slate-600 leading-relaxed" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Report */}
      {showShareReport && hasFullData && (
        <ShareableReport
          questions={questions}
          userAnswers={answers}
          questionTimes={questionTimes}
          onClose={() => setShowShareReport(false)}
        />
      )}

      {/* Forum */}
      {forumQuestion && (
        <QuestionForum
          question={forumQuestion}
          onClose={() => setForumQuestion(null)}
        />
      )}
    </>
  );
}