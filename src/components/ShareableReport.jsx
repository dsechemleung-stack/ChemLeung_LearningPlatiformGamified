import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Share2, X, Trophy, Target, Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { HK_TIME_ZONE } from '../utils/hkTime';

const REPORT_ROOT_ID = 'shareable-report-root';

const __colorConvertEl = typeof document !== 'undefined' ? document.createElement('div') : null;
const __styleResolveEl = typeof document !== 'undefined' ? document.createElement('div') : null;

function convertSingleCssColorToRgb(colorValue) {
  if (!__colorConvertEl) return null;
  try {
    __colorConvertEl.style.color = '';
    __colorConvertEl.style.color = colorValue;
    // Attach to DOM so CSS variables inside the color expression can resolve.
    document.body.appendChild(__colorConvertEl);
    const computed = window.getComputedStyle(__colorConvertEl).color;
    __colorConvertEl.remove();
    if (!computed || computed === 'rgba(0, 0, 0, 0)') return computed;
    return computed;
  } catch {
    try {
      __colorConvertEl.remove();
    } catch {
      // ignore
    }
    return null;
  }
}

function replaceModernColorFnsWithRgb(value) {
  if (typeof value !== 'string') return value;

  let out = value;
  out = out.replace(/oklch\([^)]*\)/gi, (m) => convertSingleCssColorToRgb(m) || m);
  out = out.replace(/oklab\([^)]*\)/gi, (m) => convertSingleCssColorToRgb(m) || m);
  out = out.replace(/color-mix\([^)]*\)/gi, (m) => convertSingleCssColorToRgb(m) || m);
  return out;
}

function sanitizeStylesheets(doc) {
  try {
    const sanitizeCss = (css) => {
      if (!css) return css;
      let out = css;
      if (/oklch\(|oklab\(|color-mix\(/i.test(out)) {
        out = out.replace(/oklch\([^)]*\)/gi, (m) => convertSingleCssColorToRgb(m) || 'rgb(15, 23, 42)');
        out = out.replace(/oklab\([^)]*\)/gi, (m) => convertSingleCssColorToRgb(m) || 'rgb(15, 23, 42)');
        out = out.replace(/color-mix\([^)]*\)/gi, (m) => convertSingleCssColorToRgb(m) || 'rgb(15, 23, 42)');
      }
      return out;
    };

    // Aggregate accessible stylesheet rules (covers both <style> and same-origin <link rel="stylesheet">)
    let aggregatedCss = '';
    const sheets = Array.from(doc.styleSheets || []);
    for (const sheet of sheets) {
      try {
        const rules = sheet.cssRules;
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          aggregatedCss += `${rule.cssText}\n`;
        }
      } catch {
        // Cross-origin or inaccessible stylesheet - ignore
      }
    }

    aggregatedCss = sanitizeCss(aggregatedCss);

    // Remove original styles/links so html2canvas doesn't parse oklch from them
    const nodes = doc.querySelectorAll('link[rel="stylesheet"], style');
    nodes.forEach((n) => n.remove());

    // Re-inject sanitized CSS
    if (aggregatedCss && doc.head) {
      const styleEl = doc.createElement('style');
      styleEl.setAttribute('data-export-sanitized', 'true');
      styleEl.textContent = aggregatedCss;
      doc.head.appendChild(styleEl);
    }
  } catch {
    // ignore
  }
}

function resolveCssPropertyValue(prop, value) {
  if (!__styleResolveEl) return null;
  try {
    __styleResolveEl.style.setProperty(prop, '');
    __styleResolveEl.style.setProperty(prop, value);
    document.body.appendChild(__styleResolveEl);
    const computed = window.getComputedStyle(__styleResolveEl).getPropertyValue(prop);
    __styleResolveEl.remove();
    return computed;
  } catch {
    try {
      __styleResolveEl.remove();
    } catch {
      // ignore
    }
    return null;
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Failed to create image blob'));
        resolve(blob);
      }, type, quality);
    } catch (e) {
      reject(e);
    }
  });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createExportReportNode({
  title,
  dateLabel,
  studentName,
  topicsCovered,
  percentage,
  grade,
  correct,
  incorrect,
  timeUsed,
  topicRows,
  footerLines,
}) {
  const root = document.createElement('div');
  root.setAttribute('data-export-report', 'true');
  root.style.position = 'fixed';
  root.style.left = '-10000px';
  root.style.top = '0';
  root.style.width = '900px';
  root.style.padding = '36px';
  root.style.background = 'linear-gradient(135deg, rgb(248, 250, 252) 0%, rgb(239, 246, 255) 55%, rgb(248, 250, 252) 100%)';
  root.style.color = '#0f172a';
  root.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  root.style.lineHeight = '1.35';
  root.style.borderRadius = '22px';
  root.style.boxShadow = '0 28px 80px rgba(2, 6, 23, 0.18)';

  const rowsHtml = topicRows
    .map((r) => {
      const pct = Math.max(0, Math.min(100, Number(r.percent) || 0));
      return `
        <div style="padding:12px 0;overflow:visible;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
            <div style="font-weight:800;font-size:13px;line-height:1.5;min-width:0;overflow:visible;white-space:normal;word-break:break-word;padding:3px 0;">
              ${escapeHtml(r.topic)}
            </div>
            <div style="font-weight:800;font-size:13px;line-height:1.5;flex-shrink:0;">
              <span style="display:inline-block;padding:3px 0;">${pct}%</span>
            </div>
          </div>
          <div style="margin-top:8px;height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden;border:1px solid #cbd5e1;">
            <div style="height:100%;width:${pct}%;background:#1e3a8a;"></div>
          </div>
          <div style="margin-top:6px;font-size:12px;color:#475569;font-weight:700;line-height:1.35;padding:1px 0;">${escapeHtml(r.detail || '')}</div>
        </div>
      `;
    })
    .join('');

  const footerHtml = footerLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('');

  const iconSvg = {
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    alert: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>`,
    clock: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
    trophy: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v7a5 5 0 0 1-10 0V4"/><path d="M5 5a2 2 0 0 0 2 2"/><path d="M19 5a2 2 0 0 1-2 2"/></svg>`,
    target: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    clockWhite: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  };

  const pct = Math.max(0, Math.min(100, Number(percentage) || 0));
  const gradeSafe = escapeHtml(grade);
  let scoreFrom = '#2563eb';
  let scoreTo = '#1e3a8a';
  if (pct >= 80) {
    scoreFrom = '#16a34a';
    scoreTo = '#059669';
  } else if (pct >= 60) {
    scoreFrom = '#2563eb';
    scoreTo = '#4f46e5';
  } else if (pct >= 40) {
    scoreFrom = '#f59e0b';
    scoreTo = '#ea580c';
  } else {
    scoreFrom = '#ef4444';
    scoreTo = '#f43f5e';
  }

  root.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;">
      <div style="display:flex;align-items:center;justify-content:center;">
        <div style="width:280px;height:56px;background:linear-gradient(135deg, #1e3a8a, #2563eb);border-radius:999px;box-shadow:0 14px 40px rgba(30,58,138,0.28);display:flex;align-items:center;justify-content:center;">
          <div style="color:#ffffff;font-weight:900;font-size:22px;letter-spacing:-0.01em;line-height:1.15;padding-bottom:1px;">ChemLeung</div>
        </div>
      </div>

      <div style="text-align:center;">
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.01em;line-height:1.25;">${escapeHtml(title)}</div>
        <div style="margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:800;color:#475569;line-height:1.2;">
          <span style="display:inline-flex;align-items:center;justify-content:center;line-height:1;">${iconSvg.calendar.replace('<svg ', '<svg style=\"display:block;\" ')}</span>
          <span style="line-height:1.2;">${escapeHtml(dateLabel)}</span>
        </div>
      </div>

      <div style="border:2px solid #e2e8f0;border-radius:16px;padding:18px;display:grid;grid-template-columns:repeat(2,1fr);gap:18px;background:rgba(255,255,255,0.92);box-shadow:0 14px 34px rgba(15,23,42,0.10);">
        <div>
          <div style="font-size:12px;font-weight:800;color:#64748b;">Student Name</div>
          <div style="margin-top:6px;font-size:16px;font-weight:900;color:#0f172a;">${escapeHtml(studentName)}</div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:800;color:#64748b;">Topics Covered</div>
          <div style="margin-top:6px;font-size:16px;font-weight:900;color:#0f172a;">${escapeHtml(topicsCovered)}</div>
        </div>
      </div>

      <div style="border-radius:18px;padding:26px;background:linear-gradient(90deg, ${scoreFrom}, ${scoreTo});box-shadow:0 22px 60px rgba(15,23,42,0.22);color:#ffffff;">
        <div style="text-align:center;">
          <div style="font-size:58px;font-weight:900;line-height:1;margin:0;">${pct}%</div>
          <div style="margin-top:10px;font-size:22px;font-weight:900;line-height:1.25;white-space:normal;word-break:break-word;padding:2px 0;">${gradeSafe}</div>
          <div style="margin-top:12px;font-size:18px;font-weight:800;opacity:0.95;line-height:1.2;">${escapeHtml(correct)} out of&nbsp;${escapeHtml(String(Number(correct) + Number(incorrect)))} correct</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
        <div style="background:rgba(255,255,255,0.96);border-radius:16px;box-shadow:0 14px 34px rgba(15,23,42,0.10);border:2px solid rgba(59,130,246,0.18);padding:16px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="width:34px;height:34px;border-radius:999px;background:#f59e0b;display:flex;align-items:center;justify-content:center;margin:0 auto 10px auto;">${iconSvg.trophy}</div>
          <div style="font-size:26px;font-weight:900;color:#0f172a;line-height:1.2;padding-bottom:1px;">${escapeHtml(correct)}</div>
          <div style="margin-top:6px;font-size:12px;font-weight:800;color:#475569;line-height:1.15;">Correct</div>
        </div>

        <div style="background:rgba(255,255,255,0.96);border-radius:16px;box-shadow:0 14px 34px rgba(15,23,42,0.10);border:2px solid rgba(239,68,68,0.18);padding:16px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="width:34px;height:34px;border-radius:999px;background:#ef4444;display:flex;align-items:center;justify-content:center;margin:0 auto 10px auto;">${iconSvg.target}</div>
          <div style="font-size:26px;font-weight:900;color:#0f172a;line-height:1.2;padding-bottom:1px;">${escapeHtml(incorrect)}</div>
          <div style="margin-top:6px;font-size:12px;font-weight:800;color:#475569;line-height:1.15;">Incorrect</div>
        </div>

        <div style="background:rgba(255,255,255,0.96);border-radius:16px;box-shadow:0 14px 34px rgba(15,23,42,0.10);border:2px solid rgba(168,85,247,0.18);padding:16px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="width:34px;height:34px;border-radius:999px;background:#a855f7;display:flex;align-items:center;justify-content:center;margin:0 auto 10px auto;">${iconSvg.clockWhite}</div>
          <div style="font-size:22px;font-weight:900;color:#0f172a;line-height:1.2;padding-bottom:1px;">${escapeHtml(timeUsed)}</div>
          <div style="margin-top:6px;font-size:12px;font-weight:800;color:#475569;line-height:1.15;">Time Used</div>
        </div>
      </div>

      <div style="border:2px solid #e2e8f0;border-radius:16px;padding:18px;background:rgba(255,255,255,0.96);box-shadow:0 14px 34px rgba(15,23,42,0.10);overflow:visible;">
        <div style="display:flex;align-items:center;gap:10px;font-weight:900;font-size:16px;">
          <span style="display:inline-flex;width:18px;height:18px;border-radius:999px;background:linear-gradient(135deg,#1e3a8a,#2563eb);"></span>
          Topic Breakdown
        </div>
        <div style="margin-top:12px;overflow:visible;padding-top:2px;">${rowsHtml}</div>
      </div>

      <div style="border-top:2px solid #0f172a;padding-top:14px;text-align:center;color:#334155;font-weight:800;font-size:12px;">
        ${footerHtml}
      </div>
    </div>
  `;

  document.body.appendChild(root);
  return root;
}

function stripAllStylesheets(doc) {
  try {
    const nodes = doc.querySelectorAll('link[rel="stylesheet"], style');
    nodes.forEach((n) => n.remove());
  } catch {
    // ignore
  }
}

function inlineComputedStyles(originalRoot, clonedRoot) {
  if (!originalRoot || !clonedRoot) return;

  const originalEls = [originalRoot, ...originalRoot.querySelectorAll('*')];
  const clonedEls = [clonedRoot, ...clonedRoot.querySelectorAll('*')];
  const len = Math.min(originalEls.length, clonedEls.length);

  const hasUnsupportedColorFn = (v) =>
    typeof v === 'string' && /oklch\(|oklab\(|color-mix\(/i.test(v);

  const SAFE_PROPS = new Set([
    // layout
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
    'align-items', 'align-content', 'justify-content', 'justify-items',
    'gap', 'row-gap', 'column-gap',
    'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'box-sizing', 'overflow', 'overflow-x', 'overflow-y',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    // typography
    'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
    'line-height', 'letter-spacing', 'text-align', 'text-transform',
    'white-space', 'word-break', 'overflow-wrap',
    // colors
    'color', 'background-color',
    // borders
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-style', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  ]);

  const clearPropIfSet = (el, prop) => {
    try {
      el.style.removeProperty(prop);
    } catch {
      // ignore
    }
  };

  for (let i = 0; i < len; i += 1) {
    const src = originalEls[i];
    const dst = clonedEls[i];
    const cs = window.getComputedStyle(src);

    for (let k = 0; k < cs.length; k += 1) {
      const prop = cs[k];
      if (!SAFE_PROPS.has(prop)) continue;

      const rawValue = cs.getPropertyValue(prop);
      const value = replaceModernColorFnsWithRgb(rawValue);

      if (hasUnsupportedColorFn(value)) {
        const isColorProp = /color|fill|stroke|border|outline/i.test(prop);
        const isBgColorProp = prop === 'background-color';

        if (isColorProp || isBgColorProp) {
          const resolved = resolveCssPropertyValue(prop, rawValue);
          if (resolved && !hasUnsupportedColorFn(resolved)) {
            dst.style.setProperty(prop, resolved, cs.getPropertyPropertyValue ? cs.getPropertyPriority(prop) : cs.getPropertyPriority(prop));
            continue;
          }
        }

        // Gradients / shadows frequently contain unsupported functions; clear them.
        if (prop === 'background' || prop === 'background-image') {
          dst.style.setProperty('background', 'none');
          dst.style.setProperty('background-image', 'none');
        } else if (prop === 'box-shadow' || prop === 'text-shadow' || prop === 'filter') {
          dst.style.setProperty(prop, 'none');
        } else if (/color|fill|stroke/i.test(prop)) {
          // Keep text/icons visible.
          dst.style.setProperty(prop, 'rgb(15, 23, 42)');
        } else if (/border|outline/i.test(prop)) {
          dst.style.setProperty(prop, 'rgba(15, 23, 42, 0.18)');
        } else if (prop === 'background-color') {
          dst.style.setProperty(prop, 'rgb(255, 255, 255)');
        } else {
          clearPropIfSet(dst, prop);
        }
        continue;
      }

      dst.style.setProperty(prop, value, cs.getPropertyPriority(prop));
    }

    // Always remove complex paint effects (these frequently contain modern color fns)
    dst.style.setProperty('background-image', 'none');
    dst.style.setProperty('box-shadow', 'none');
    dst.style.setProperty('text-shadow', 'none');
    dst.style.setProperty('filter', 'none');
  }
}

function stripUnsupportedInlineStyles(root) {
  if (!root) return;
  const nodes = [root, ...root.querySelectorAll('*')];
  for (const el of nodes) {
    const styleAttr = el.getAttribute('style');
    if (!styleAttr) continue;
    if (!/oklch\(|oklab\(|color-mix\(/i.test(styleAttr)) continue;

    const kept = [];
    for (const decl of styleAttr
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)) {
      if (/color-mix\(/i.test(decl)) continue;
      const converted = replaceModernColorFnsWithRgb(decl);
      if (/oklch\(|oklab\(|color-mix\(/i.test(converted)) continue;
      kept.push(converted);
    }

    if (kept.length === 0) el.removeAttribute('style');
    else el.setAttribute('style', `${kept.join('; ')};`);
  }
}

export default function ShareableReport({ 
  questions, 
  userAnswers, 
  questionTimes,
  onClose 
}) {
  const { currentUser } = useAuth();
  const { isEnglish, t, tf } = useLanguage();
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Calculate stats
  const totalQuestions = questions.length;
  const correctAnswers = questions.reduce((acc, q) => {
    return acc + (userAnswers[q.ID] === q.CorrectOption ? 1 : 0);
  }, 0);
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  const topics = [...new Set(questions.map(q => q.Topic))].filter(Boolean);

  const totalTime = questionTimes 
    ? Object.values(questionTimes).reduce((sum, time) => sum + time, 0)
    : null;

  const formatTime = (ms) => {
    if (!ms) return t('report.na');
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);
    if (hrs > 0) {
      return tf('report.timeHrsMins', { h: hrs, m: minutes % 60 });
    }
    return tf('report.timeMinsSecs', { m: minutes, s: seconds % 60 });
  };

  const formatDate = () => {
    const date = new Date();
    return date.toLocaleDateString(isEnglish ? 'en-GB' : 'zh-HK', {
      timeZone: HK_TIME_ZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Topic analysis
  const topicAnalysis = questions.reduce((acc, q) => {
    if (!acc[q.Topic]) {
      acc[q.Topic] = { total: 0, correct: 0 };
    }
    acc[q.Topic].total += 1;
    if (userAnswers[q.ID] === q.CorrectOption) {
      acc[q.Topic].correct += 1;
    }
    return acc;
  }, {});

  const topicResults = Object.entries(topicAnalysis).map(([topic, data]) => ({
    topic,
    percent: Math.round((data.correct / data.total) * 100),
    ...data
  }));

  const formatDuration = (ms) => {
    if (!ms) return '—';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);
    if (hrs > 0) return `${hrs}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const buildExportNode = () => {
    const dateLabel = formatDate();
    const studentName = currentUser?.displayName || currentUser?.email || 'Student';
    const topicsCovered = `${topics.length || 0} Topics`;
    const correct = String(correctAnswers);
    const incorrect = String(Math.max(0, totalQuestions - correctAnswers));
    const timeUsed = formatDuration(totalTime);
    const grade = getGrade(percentage);
    const topicRows = topicResults
      .slice()
      .sort((a, b) => String(a.topic).localeCompare(String(b.topic)))
      .map((r) => ({
        topic: r.topic,
        percent: r.percent,
        detail: `${r.correct}/${r.total} Correct`,
      }));

    return createExportReportNode({
      title: t('report.hkDsePracticeReport'),
      dateLabel,
      studentName,
      topicsCovered,
      percentage,
      grade,
      correct,
      incorrect,
      timeUsed,
      topicRows,
      footerLines: [
        'Generated by ChemLeung HKDSE MCQ Practice Platform',
        'www.chemleung.com',
      ],
    });
  };

  // IMPROVED: Export as Image with better error handling and proxy for CORS
  const exportAsImage = async () => {
    if (typeof document === 'undefined') return;
    
    setExporting(true);
    setError(null);
    
    try {
      console.log('🔵 Starting image export...');
      
      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create canvas with improved settings
      const exportNode = buildExportNode();
      const canvas = await html2canvas(exportNode, {
        scale: 2, // High quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false, // Changed to false for better CORS handling
        foreignObjectRendering: false,
        imageTimeout: 15000, // Increased timeout
        onclone: (clonedDoc) => {
          // html2canvas parses the whole document's CSS; remove Tailwind (oklch) to avoid crashes.
          stripAllStylesheets(clonedDoc);
        },
      });

      exportNode.remove();
      
      console.log('✅ Canvas created successfully');

      const blob = await canvasToBlob(canvas, 'image/png', 0.95);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${t('report.fileNamePrefix')}-${formatDate().replace(/\s/g, '-')}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Image downloaded successfully');
      setExporting(false);
      
    } catch (error) {
      console.error('❌ Error exporting image:', error);
      setError(t('report.failedExportImageTryPdf'));
      setExporting(false);
    }
  };

  // IMPROVED: Export as PDF with better error handling
  const exportAsPDF = async () => {
    if (typeof document === 'undefined') return;
    
    setExporting(true);
    setError(null);
    
    try {
      console.log('🔵 Starting PDF export...');
      
      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create canvas
      const exportNode = buildExportNode();
      const canvas = await html2canvas(exportNode, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          stripAllStylesheets(clonedDoc);
        },
      });

      exportNode.remove();
      
      console.log('✅ Canvas created for PDF');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const pageHeightPx = Math.floor(canvas.width * (pageHeightMm / pageWidthMm));

      let pageIndex = 0;
      for (let y = 0; y < canvas.height; y += pageHeightPx) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const pageCtx = pageCanvas.getContext('2d');
        pageCtx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        const imgData = pageCanvas.toDataURL('image/png', 0.95);
        const imgHeightMm = (sliceHeight * pageWidthMm) / canvas.width;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidthMm, imgHeightMm, undefined, 'FAST');
        pageIndex += 1;
      }
      
      pdf.save(`${t('report.fileNamePrefix')}-${formatDate().replace(/\s/g, '-')}.pdf`);
      
      console.log('✅ PDF downloaded successfully');
      setExporting(false);
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      setError(t('report.failedExportPdfTryImage'));
      setExporting(false);
    }
  };

  const getGradeColor = (percent) => {
    if (percent >= 80) return 'from-green-500 to-emerald-600';
    if (percent >= 60) return 'from-blue-500 to-indigo-600';
    if (percent >= 40) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const getGrade = (percent) => {
    if (isEnglish) {
      if (percent >= 90) return 'Outstanding!';
      if (percent >= 80) return 'Excellent work!';
      if (percent >= 70) return 'Great job!';
      if (percent >= 60) return 'Good effort!';
      if (percent >= 50) return 'Keep practicing!';
      return "Don't give up — try again!";
    }

    if (percent >= 90) return '超卓表現！';
    if (percent >= 80) return '非常出色！';
    if (percent >= 70) return '做得很好！';
    if (percent >= 60) return '不錯，加油！';
    if (percent >= 50) return '繼續練習！';
    return '不要放棄，再試一次！';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with close and export buttons */}
        <div className="sticky top-0 bg-white border-b-2 border-slate-200 p-4 flex justify-between items-center rounded-t-2xl z-10">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Share2 className="text-lab-blue" size={24} />
            {t('report.shareReportCard')}
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={exportAsImage}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 transition-all"
              title={t('report.downloadPngTitle')}
            >
              <Download size={18} />
              {t('report.image')}
            </button>
            
            <button
              onClick={exportAsPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-chemistry-green text-white rounded-lg font-bold hover:opacity-90 disabled:bg-slate-300 transition-all"
              title={t('report.downloadPdfTitle')}
            >
              <Download size={18} />
              {t('report.pdf')}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              title={t('common.close')}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-red-800 font-semibold">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-red-600 hover:underline mt-1"
              >
                {t('report.dismiss')}
              </button>
            </div>
          </div>
        )}

        {/* Report Card Content - NO EXTERNAL IMAGES to avoid CORS */}
        <div id={REPORT_ROOT_ID} ref={reportRef} className="p-8 bg-gradient-to-br from-slate-50 to-blue-50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block bg-lab-blue px-6 py-2 rounded-full mb-4">
              <h1 className="text-3xl font-black text-white">ChemLeung</h1>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {t('report.hkDsePracticeReport')}
            </h2>
            <div className="flex items-center justify-center gap-4 text-slate-600">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span className="text-sm font-semibold">{formatDate()}</span>
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500 mb-1">
                  {t('report.studentName')}
                </div>
                <div className="text-lg font-bold text-slate-800">
                  {currentUser?.displayName || t('report.student')}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">
                  {t('report.topicsCovered')}
                </div>
                <div className="text-lg font-bold text-slate-800">
                  {topics.length} {t('report.topicsUnit')}
                </div>
              </div>
            </div>
          </div>

          {/* Main Score Display */}
          <div className={`bg-gradient-to-r ${getGradeColor(percentage)} rounded-2xl shadow-2xl p-8 mb-6 text-white`}>
            <div className="text-center">
              <div className="text-6xl font-black mb-2">{percentage}%</div>
              <div className="text-3xl font-bold mb-4">{getGrade(percentage)}</div>
              <div className="text-xl opacity-90">
                {correctAnswers} {t('report.outOf')} {totalQuestions} {t('report.correctLabel')}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-blue-200 text-center">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trophy size={20} className="text-white" />
              </div>
              <div className="text-2xl font-black text-slate-800">{correctAnswers}</div>
              <div className="text-sm text-slate-600">{t('report.correct')}</div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-red-200 text-center">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Target size={20} className="text-white" />
              </div>
              <div className="text-2xl font-black text-slate-800">{totalQuestions - correctAnswers}</div>
              <div className="text-sm text-slate-600">{t('report.incorrect')}</div>
            </div>
            
            {totalTime && (
              <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-purple-200 text-center">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Clock size={20} className="text-white" />
                </div>
                <div className="text-2xl font-black text-slate-800">{formatTime(totalTime)}</div>
                <div className="text-sm text-slate-600">{t('report.timeUsed')}</div>
              </div>
            )}
          </div>

          {/* Topic Breakdown */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <div className="w-5 h-5 bg-lab-blue rounded-full flex items-center justify-center">
                <CheckCircle size={14} className="text-white" />
              </div>
              {t('report.topicBreakdown')}
            </h3>
            
            <div className="space-y-3">
              {topicResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-700">{result.topic}</span>
                      <span className="text-sm font-bold text-slate-800">{result.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          result.percent >= 70 ? 'bg-chemistry-green' :
                          result.percent >= 50 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${result.percent}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {result.correct}/{result.total} {t('dashboard.correct')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2 border-slate-200 text-center text-slate-500 text-sm">
            <p className="font-semibold">
              {t('report.generatedBy')}
            </p>
            <p className="text-xs mt-1">{t('report.website')}</p>
          </div>
        </div>

        {/* Loading Overlay */}
        {exporting && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-lab-blue mx-auto mb-4"></div>
              <p className="text-slate-700 font-semibold">
                {t('report.generating')}
              </p>
              <p className="text-slate-500 text-sm mt-2">
                {t('report.mayTakeSeconds')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}