import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export function useQuizData(url) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: 'greedy',
      newline: '',
      complete: (results) => {
        try {
          const formattedData = results.data
            .filter(row => Object.values(row).join('').trim().length > 0)
            .map((row, index) => {
              const getVal = (name) => {
                const key = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase());
                return row[key] ? row[key] : "";
              };

              // Convert any type of line break to <br>
              const nl2br = (text) => {
                if (!text) return "";
                const normalized = String(text)
                  .replace(/\\\\r\\\\n/g, '\n')
                  .replace(/\\\\n/g, '\n')
                  .replace(/\\\\r/g, '\n')
                  .replace(/\\r\\n/g, '\n')
                  .replace(/\\n/g, '\n')
                  .replace(/\\r/g, '\n')
                  .replace(/\r\n/g, '\n')
                  .replace(/\n/g, '\n')
                  .replace(/\r/g, '\n');
                return normalized.split(/\r\n|\r|\n/).join('<br>');
              };

              const stripWrappingQuotes = (text) => {
                if (text === null || text === undefined) return "";
                const s = String(text);
                if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
                  return s.slice(1, -1);
                }
                return s;
              };

              // Convert {image:URL} or (image:URL) into <img> tags for rendering via dangerouslySetInnerHTML
              const embedImages = (text, variant = 'large') => {
                if (!text) return "";
                const s = String(text);
                const imgRegexGlobal = /[\{\(]\s*image\s*:\s*([^\}\)]+?)\s*[\}\)]/gi;
                return s.replace(imgRegexGlobal, (_m, url) => {
                  const safeUrl = String(url || '').trim();
                  if (!safeUrl) return '';
                  const escaped = safeUrl.replace(/"/g, '&quot;');

                  const sizeClass =
                    variant === 'option'
                      ? 'max-h-[160px]'
                      : 'max-h-[320px]';

                  const minHeightStyle =
                    variant === 'option'
                      ? 'min-height:120px;'
                      : 'min-height:200px;';

                  const wrapperStyle = `${minHeightStyle}align-items:flex-start;`;
                  const imgStyle = `${minHeightStyle}display:block;`;

                  return `
                    <span class="inline-flex items-center gap-2 align-middle" style="${wrapperStyle}">
                      <img
                        src="${escaped}"
                        alt="Question diagram"
                        loading="lazy"
                        decoding="async"
                        referrerpolicy="no-referrer"
                        data-quiz-image="true"
                        style="${imgStyle}"
                        class="max-w-[calc(100%-3rem)] h-auto ${sizeClass} object-contain rounded-lg border border-slate-200 my-3"
                      />
                      <button
                        type="button"
                        aria-label="Enlarge image"
                        title="Enlarge"
                        data-enlarge-image="true"
                        data-image-src="${escaped}"
                        class="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M15 3h6v6" />
                          <path d="M9 21H3v-6" />
                          <path d="M21 3l-7 7" />
                          <path d="M3 21l7-7" />
                        </svg>
                      </button>
                    </span>
                  `.trim();
                });
              };

              // Remove option prefix (A. B. C. D.) from the beginning
              const removePrefix = (text) => {
                if (!text) return "";
                // Remove patterns like "A. ", "B. ", "C. ", "D. " from the start
                return text.replace(/^[A-D]\.\s*/i, '');
              };

              const stripLatexTextCommands = (expr) => {
                if (!expr) return '';
                return String(expr)
                  .replace(/\\mathrm\{([^}]*)\}/g, '$1')
                  .replace(/\\text\{([^}]*)\}/g, '$1')
                  .replace(/\\,/g, ' ')
                  .replace(/\\;/g, ' ');
              };

              const parseLatexScript = (s, i) => {
                if (i >= s.length) return { value: '', next: i };
                if (s[i] === '{') {
                  let depth = 0;
                  let j = i;
                  for (; j < s.length; j++) {
                    const ch = s[j];
                    if (ch === '{') depth++;
                    if (ch === '}') depth--;
                    if (depth === 0) break;
                  }
                  const inner = s.slice(i + 1, j);
                  return { value: inner, next: Math.min(j + 1, s.length) };
                }
                return { value: s[i], next: i + 1 };
              };

              const renderIsotopeLatex = (rawExpr) => {
                const expr = stripLatexTextCommands(rawExpr).trim();
                const s = expr;

                let i = 0;
                let leftSup = '';
                let leftSub = '';

                if (s[i] === '^') {
                  const parsed = parseLatexScript(s, i + 1);
                  leftSup = parsed.value;
                  i = parsed.next;
                }
                if (s[i] === '_') {
                  const parsed = parseLatexScript(s, i + 1);
                  leftSub = parsed.value;
                  i = parsed.next;
                }

                let base = '';
                while (i < s.length) {
                  const ch = s[i];
                  if (ch === '^' || ch === '_') break;
                  base += ch;
                  i++;
                }
                base = base.trim();

                let rightSup = '';
                let rightSub = '';
                while (i < s.length) {
                  const op = s[i];
                  if (op !== '^' && op !== '_') {
                    i++;
                    continue;
                  }
                  const parsed = parseLatexScript(s, i + 1);
                  if (op === '^' && !rightSup) rightSup = parsed.value;
                  if (op === '_' && !rightSub) rightSub = parsed.value;
                  i = parsed.next;
                }

                if (!base) return null;

                const hasLeft = Boolean(leftSup || leftSub);
                const baseEsc = base.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const supEsc = (leftSup || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const subEsc = (leftSub || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const rSupEsc = (rightSup || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const rSubEsc = (rightSub || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

                if (hasLeft) {
                  const rightScripts = `${rSubEsc ? `<sub style="font-size:0.7em; line-height:0; vertical-align:-0.2em;">${rSubEsc}</sub>` : ''}${rSupEsc ? `<sup style="font-size:0.7em; line-height:0; vertical-align:0.6em;">${rSupEsc}</sup>` : ''}`;
                  return `
                    <span style="display:inline-grid; grid-template-columns:auto auto; grid-template-rows:auto auto; column-gap:2px; vertical-align:middle;">
                      <span style="grid-column:1; grid-row:1; font-size:0.7em; line-height:1; justify-self:end;">${supEsc}</span>
                      <span style="grid-column:1; grid-row:2; font-size:0.7em; line-height:1; justify-self:end;">${subEsc}</span>
                      <span style="grid-column:2; grid-row:1 / span 2; align-self:center;">${baseEsc}${rightScripts}</span>
                    </span>
                  `.trim();
                }

                const rightScripts = `${rSubEsc ? `<sub style="font-size:0.7em; line-height:0; vertical-align:-0.2em;">${rSubEsc}</sub>` : ''}${rSupEsc ? `<sup style="font-size:0.7em; line-height:0; vertical-align:0.6em;">${rSupEsc}</sup>` : ''}`;
                return `<span>${baseEsc}${rightScripts}</span>`;
              };

              const renderInlineLatex = (html) => {
                if (!html) return '';
                const s = String(html);
                const renderExpr = (expr) => {
                  const rendered = renderIsotopeLatex(expr);
                  return rendered || `(${stripLatexTextCommands(expr)})`;
                };
                return s
                  .replace(/\\\(([\s\S]+?)\\\)/g, (_m, expr) => renderExpr(expr))
                  .replace(/\\\[([\s\S]+?)\\\]/g, (_m, expr) => renderExpr(expr));
              };

              const rawQuestion = stripWrappingQuotes(getVal('Question') || getVal('QuestionText'));

              // CRITICAL FIX: Ensure truly unique IDs
              // Use the spreadsheet ID if available AND unique, otherwise use index
              const rawId = getVal('ID');
              const uniqueId = rawId && rawId.trim() !== "" 
                ? `${rawId}-${index}` // Combine ID with index for guaranteed uniqueness
                : `q-${index}`; // Fallback to index-based ID

              return {
                ID: uniqueId,
                Topic: getVal('Topic') || "Uncategorized",
                Subtopic: getVal('Subtopic') || "",
                Question: renderInlineLatex(embedImages(nl2br(rawQuestion), 'large')),
                OptionA: renderInlineLatex(embedImages(nl2br(removePrefix(stripWrappingQuotes(getVal('OptionA')))), 'option')),
                OptionB: renderInlineLatex(embedImages(nl2br(removePrefix(stripWrappingQuotes(getVal('OptionB')))), 'option')),
                OptionC: renderInlineLatex(embedImages(nl2br(removePrefix(stripWrappingQuotes(getVal('OptionC')))), 'option')),
                OptionD: renderInlineLatex(embedImages(nl2br(removePrefix(stripWrappingQuotes(getVal('OptionD')))), 'option')),
                CorrectOption: getVal('CorrectOption').toUpperCase().trim(),
                Explanation: renderInlineLatex(embedImages(nl2br(stripWrappingQuotes(getVal('Explanation'))), 'large')),
                ChineseExplanation: renderInlineLatex(embedImages(nl2br(stripWrappingQuotes(getVal('ChineseExplanation'))), 'large')),
                DSEcode: getVal('DSEcode') || getVal('DSECode')
              };
            });

          setQuestions(formattedData);
          setLoading(false);
        } catch (err) {
          setError("Failed to process data.");
          setLoading(false);
        }
      }
    });
  }, [url]);

  return { questions, loading, error };
}