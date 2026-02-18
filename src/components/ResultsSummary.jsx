import React, { useState } from 'react';
import { CheckCircle2, XCircle, BarChart3, RotateCcw, Info, Clock, Share2, MessageSquare } from 'lucide-react';
import ShareableReport from './ShareableReport';
import QuestionForum from './QuestionForum';

export default function ResultsSummary({ questions, userAnswers, questionTimes, onRestart }) {
  const [showShareReport, setShowShareReport] = useState(false);
  const [forumQuestion, setForumQuestion] = useState(null);
  const [showChineseExplanation, setShowChineseExplanation] = useState(() => ({}));

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
      {/* Hero Score Section */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-lab-blue p-8 text-center text-white">
          <h2 className="text-xl opacity-90 mb-2">Your Performance</h2>
          <div className="text-6xl font-black mb-2">{percentage}%</div>
          <p className="text-blue-100">
            {correctCount} out of {total} questions correct
          </p>
          {!!totalTime && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-100">
              <div className="bg-blue-700 bg-opacity-50 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock size={18} />
                  <span className="text-sm font-semibold">Total Time</span>
                </div>
                <div className="text-2xl font-bold">{formatTime(totalTime)}</div>
              </div>
              <div className="bg-blue-700 bg-opacity-50 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock size={18} />
                  <span className="text-sm font-semibold">Average per MCQ</span>
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
              <CheckCircle2 size={18} /> Strengths
            </h3>
            {strengths.length > 0 ? (
              strengths.map(s => (
                <div key={s.topic} className="text-sm mb-2 flex justify-between">
                  <span className="truncate mr-2">{s.topic}</span>
                  <span className="font-bold">{s.percent}%</span>
                </div>
              ))
            ) : <p className="text-sm text-slate-400 italic">Keep practicing to build strengths!</p>}
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="flex items-center gap-2 font-bold text-amber-600 mb-3">
              <BarChart3 size={18} /> Needs Focus
            </h3>
            {weaknesses.length > 0 ? (
              weaknesses.map(w => (
                <div key={w.topic} className="text-sm mb-2 flex justify-between">
                  <span className="truncate mr-2">{w.topic}</span>
                  <span className="font-bold text-amber-700">{w.percent}%</span>
                </div>
              ))
            ) : <p className="text-sm text-slate-400 italic">No major weaknesses detected!</p>}
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
          Share Report Card
        </button>

        <button
          onClick={onRestart}
          className="w-full py-4 flex items-center justify-center gap-2 bg-carbon-grey text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
        >
          <RotateCcw size={20} />
          Start New Session
        </button>
      </div>

      {/* Detailed Review List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Info className="text-lab-blue" /> Detailed Review
        </h3>
        {questions.map((q, index) => {
          const isCorrect = userAnswers[q.ID] === q.CorrectOption;
          const timeSpent = questionTimes ? questionTimes[q.ID] : null;
          const showCn = !!showChineseExplanation?.[q.ID];
          
          return (
            <div key={q.ID} className={`p-6 rounded-xl border-l-4 bg-white shadow-sm ${isCorrect ? 'border-chemistry-green' : 'border-red-500'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-slate-700">Question {index + 1}</span>
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
                    title="Discuss this question"
                  >
                    <MessageSquare size={16} />
                    <span className="hidden sm:inline">Discuss</span>
                  </button>
                  
                  {/* Status Icon */}
                  {isCorrect ? 
                    <CheckCircle2 className="text-chemistry-green" size={24} /> : 
                    <XCircle className="text-red-500" size={24} />
                  }
                </div>
              </div>
              
              <div className="prose prose-slate max-w-none mb-4 text-lg" dangerouslySetInnerHTML={{ __html: q.Question }} />
              
              <div className="space-y-2 mb-4">
                {[
                  { key: 'A', html: normalizeLiteralNewlinesToBr(q.OptionA) },
                  { key: 'B', html: normalizeLiteralNewlinesToBr(q.OptionB) },
                  { key: 'C', html: normalizeLiteralNewlinesToBr(q.OptionC) },
                  { key: 'D', html: normalizeLiteralNewlinesToBr(q.OptionD) },
                ].filter(o => o.html).map((opt) => {
                  const isUser = userAnswers[q.ID] === opt.key;
                  const isCorrectOpt = q.CorrectOption === opt.key;

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
                      className={`p-3 rounded-lg border ${finalClass}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-none w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-black">
                          {opt.key}
                        </div>
                        <div className="prose prose-slate max-w-none text-sm" dangerouslySetInnerHTML={{ __html: opt.html }} />
                      </div>
                      {(isUser || isCorrectOpt) && (
                        <div className="mt-2 text-xs font-black">
                          {isCorrectOpt && isUser && <span className="text-green-700">Correct</span>}
                          {isCorrectOpt && !isUser && <span className="text-green-700">Correct answer</span>}
                          {!isCorrectOpt && isUser && <span className="text-red-700">Your answer</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                <div className={`p-3 rounded-lg text-sm border ${userAnswers[q.ID] === q.CorrectOption ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <strong>Your Answer:</strong> {userAnswers[q.ID] || 'None'}
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                  <strong>Correct Answer:</strong> {q.CorrectOption}
                </div>
              </div>

              {q.Explanation && (
                <div className="mt-4 p-4 bg-slate-100 rounded-lg text-sm border border-slate-200">
                  <strong className="block mb-2 text-slate-700 flex items-center gap-1">
                    <Info size={14}/> Explanation:
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
                        {showCn ? 'Hide Chinese explanation' : 'Show Chinese explanation'}
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