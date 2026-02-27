import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, MessageSquare } from 'lucide-react';
import QuestionForum from './QuestionForum';

const QuestionCard = React.memo(function QuestionCard({
  question,
  selectedOption,
  onSelect,
  showDiscussButton = false,
  showTopic = true,
  showSubtopic = true,
  showDseCode = true,
}) {
  const [showForum, setShowForum] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const richContentRootRef = useRef(null);

  const normalizeLiteralNewlinesToBr = (html) => {
    if (!html) return '';
    const s = String(html);
    return s
      .replace(/\\\\r\\\\n/g, '<br>')
      .replace(/\\\\n/g, '<br>')
      .replace(/\\\\r/g, '<br>')
      .replace(/\\r\\n/g, '<br>')
      .replace(/\\n/g, '<br>')
      .replace(/\\r/g, '<br>');
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

    const img = target.closest('img[data-quiz-image="true"]');
    if (img) {
      const src = img.getAttribute('src');
      if (src) {
        e.preventDefault();
        e.stopPropagation();
        setLightboxSrc(src);
      }
    }
  };

  // If no question is passed, or if the question object is empty, show nothing.
  if (!question || !question.Question) {
    if (question && !question.Question) {
      return (
        <div className="p-8 text-center bg-white rounded-2xl border-2 border-red-200">
          <p className="text-red-600 font-black mb-2">Question failed to load</p>
          <p className="text-slate-600 font-medium text-sm mb-4">
            This usually means the CSV row was parsed incorrectly (often caused by an extra or unmatched double-quote <code>"</code> in the sheet).
          </p>
          <div className="text-left max-w-2xl mx-auto bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700">
            <div><span className="font-bold">ID:</span> {String(question.ID ?? '')}</div>
            {showTopic && (
              <div><span className="font-bold">Topic:</span> {String(question.Topic ?? '')}</div>
            )}
            {showSubtopic && (
              <div><span className="font-bold">Subtopic:</span> {String(question.Subtopic ?? '')}</div>
            )}
            <div className="mt-2"><span className="font-bold">Fix:</span> remove any manual wrapping quotes like <code>"(image:...)</code> — just use <code>(image:...)</code> directly in the cell.</div>
          </div>
        </div>
      );
    }
    return (
      <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <p className="text-slate-400 font-medium">Loading question content...</p>
      </div>
    );
  }

  // We use the keys defined in our useQuizData.js mapping
  const options = [
    { key: 'A', text: normalizeLiteralNewlinesToBr(question.OptionA) },
    { key: 'B', text: normalizeLiteralNewlinesToBr(question.OptionB) },
    { key: 'C', text: normalizeLiteralNewlinesToBr(question.OptionC) },
    { key: 'D', text: normalizeLiteralNewlinesToBr(question.OptionD) },
  ];

  const questionHtml = useMemo(
    () => normalizeLiteralNewlinesToBr(question.Question),
    [question.Question]
  );

  const optionHtmlKey = useMemo(() => options.map(o => String(o.text || '')).join('||'), [options]);

  useLayoutEffect(() => {
    const root = richContentRootRef.current;
    if (!root) return;

    // Remove previously injected buttons to avoid duplicates
    root.querySelectorAll('[data-injected-enlarge="true"]').forEach((el) => el.remove());

    const imgs = root.querySelectorAll('img');
    imgs.forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;

      const alreadyWrapped = img.parentElement && img.parentElement instanceof HTMLElement
        && img.parentElement.matches('[data-image-wrap="true"]');
      if (alreadyWrapped) return;

      const src = img.getAttribute('src');
      if (!src) return;

      // Ensure our selectors/click handler can find it
      img.setAttribute('data-quiz-image', 'true');

      // If there is already an enlarge button next to it (from embedImages), skip
      const next = img.nextElementSibling;
      if (next && next instanceof HTMLElement && next.matches('[data-enlarge-image="true"]')) {
        return;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-injected-enlarge', 'true');
      btn.setAttribute('data-enlarge-image', 'true');
      btn.setAttribute('data-image-src', src);
      btn.setAttribute('aria-label', 'Enlarge image');
      btn.setAttribute('title', 'Enlarge');
      btn.className = 'inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900';
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>';

      const wrapper = document.createElement('span');
      wrapper.setAttribute('data-image-wrap', 'true');
      wrapper.className = 'inline-flex items-start gap-2 align-middle';
      const parent = img.parentNode;
      if (!parent) return;
      parent.insertBefore(wrapper, img);
      wrapper.appendChild(img);
      wrapper.appendChild(btn);
    });
  }, [question?.ID, questionHtml, optionHtmlKey]);

  // Toggle answer - if clicking the same answer again, deselect it
  const handleOptionClick = (optionKey) => {
    if (selectedOption === optionKey) {
      // Clicking the same answer again deselects it
      onSelect(null);
    } else {
      // Select the new answer
      onSelect(optionKey);
    }
  };

  return (
    <>
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
              Close
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Info Bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
          <div className="flex flex-col">
            {showTopic && (
              <span className="text-[10px] font-black text-lab-blue uppercase tracking-tighter">
                {question.Topic || 'General Chemistry'}
              </span>
            )}
            {showSubtopic && (
              <span className="text-xs text-slate-500 font-medium italic">
                {question.Subtopic}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showDseCode && question.DSEcode && (
              <span className="bg-blue-100 text-lab-blue px-2 py-1 rounded text-[10px] font-bold">
                {question.DSEcode}
              </span>
            )}
            {showDiscussButton && (
              <button
                onClick={() => setShowForum(true)}
                className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold hover:bg-purple-200 transition-all"
                title="Discuss this question"
              >
                <MessageSquare size={12} />
                <span>Discuss</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8" ref={richContentRootRef} style={{ overflowAnchor: 'none' }}>
          {/* Question Text - with whitespace-pre-wrap for line breaks */}
          <div className="mb-8">
            <div 
              className="text-lg md:text-xl leading-relaxed text-slate-800 prose prose-slate max-w-none whitespace-pre-wrap"
              style={{ fontFamily: 'Times New Roman, Times, serif' }}
              onClick={handleRichContentClick}
              dangerouslySetInnerHTML={{ __html: questionHtml }}
            />
          </div>

          {/* MCQ Options Grid */}
          <div className="grid grid-cols-1 gap-3">
            {options.map((opt) => (
              <button
                key={opt.key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleOptionClick(opt.key)}
                className={`group flex items-center text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedOption === opt.key
                    ? 'border-lab-blue bg-blue-50/50 ring-1 ring-lab-blue'
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {/* Option Letter Bubble */}
                <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg font-bold mr-4 transition-colors ${
                  selectedOption === opt.key
                    ? 'bg-lab-blue text-white'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                }`}>
                  {opt.key}
                </div>

                {/* Option Text - with whitespace-pre-wrap for line breaks */}
                <div 
                  className={`text-base md:text-lg whitespace-pre-wrap [&_img]:max-h-[120px] [&_img]:max-w-[calc(100%-3rem)] [&_img]:w-auto [&_img]:object-contain [&_img]:my-2 ${
                    selectedOption === opt.key ? 'text-lab-blue font-medium' : 'text-slate-700'
                  }`}
                  style={{ fontFamily: 'Times New Roman, Times, serif' }}
                  onClick={handleRichContentClick}
                  dangerouslySetInnerHTML={{ __html: opt.text }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Footer Instruction */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
          <HelpCircle size={14} className="text-slate-400" />
          <span className="text-[11px] text-slate-400 font-medium italic">
            Select the most appropriate answer. Click again to deselect. All chemical equations should be assumed to occur at r.t.p. unless stated otherwise.
          </span>
        </div>
      </div>

      {/* Forum Modal */}
      {showForum && (
        <QuestionForum
          question={question}
          onClose={() => setShowForum(false)}
        />
      )}
    </>
  );
});

export default QuestionCard;