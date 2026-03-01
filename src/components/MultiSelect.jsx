import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function MultiSelect({
  id,
  label,
  options,
  value,
  onChange,
  openId,
  setOpenId,
  allLabel = 'All',
  enableRange = false,
  rangeType = 'order',
  rangeLabel = 'Range',
  rangeFromLabel = 'From',
  rangeToLabel = 'To',
  rangeApplyLabel = 'Apply',
  buttonClassName,
  listClassName,
}) {
  const selected = Array.isArray(value) ? value : [];
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const isOpen = openId === id;
  const rootRef = useRef(null);

  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const extractLeadingNumber = (s) => {
    const m = String(s ?? '').match(/^\s*(\d+)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };

  const pad2 = (n) => String(n).padStart(2, '0');

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e) => {
      const el = rootRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setOpenId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen, setOpenId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!enableRange) return;
    if (!options.length) {
      setRangeFrom('');
      setRangeTo('');
      return;
    }

    if (rangeType === 'numeric_prefix') {
      const nums = options
        .map((o) => extractLeadingNumber(o.label ?? o.value))
        .filter((x) => x !== null);
      if (!nums.length) {
        setRangeFrom('');
        setRangeTo('');
        return;
      }
      const lo = Math.min(...nums);
      const hi = Math.max(...nums);
      setRangeFrom(pad2(lo));
      setRangeTo(pad2(hi));
      return;
    }

    const values = options.map((o) => String(o.value));
    setRangeFrom(values[0]);
    setRangeTo(values[values.length - 1]);
  }, [enableRange, isOpen, options]);

  const display = useMemo(() => {
    if (!selected.length) return allLabel;
    if (selected.length === 1) {
      const only = options.find((o) => o.value === selected[0]);
      return only?.label || selected[0];
    }
    return `${selected.length} selected`;
  }, [allLabel, options, selected]);

  const toggle = (v) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
    setOpenId(null);
  };

  const applyRange = () => {
    if (!enableRange) return;

    if (rangeType === 'numeric_prefix') {
      const fromN = extractLeadingNumber(rangeFrom);
      const toN = extractLeadingNumber(rangeTo);
      if (fromN === null || toN === null) return;
      const lo = Math.min(fromN, toN);
      const hi = Math.max(fromN, toN);

      const next = options
        .filter((o) => {
          const n = extractLeadingNumber(o.label ?? o.value);
          return n !== null && n >= lo && n <= hi;
        })
        .map((o) => o.value);
      onChange(next);
      setOpenId(null);
      return;
    }

    const idxFrom = options.findIndex((o) => String(o.value) === String(rangeFrom));
    const idxTo = options.findIndex((o) => String(o.value) === String(rangeTo));
    if (idxFrom < 0 || idxTo < 0) return;

    const lo = Math.min(idxFrom, idxTo);
    const hi = Math.max(idxFrom, idxTo);
    const next = options.slice(lo, hi + 1).map((o) => o.value);
    onChange(next);
    setOpenId(null);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpenId(isOpen ? null : id)}
        className={
          buttonClassName ||
          'w-full rounded-xl border-2 border-[#DDE8DD] bg-white text-slate-900 font-extrabold px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6F8F7B]/15'
        }
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between">
          <span className="truncate">{display}</span>
          <span className={`flex-shrink-0 ml-2 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {isOpen && (
        <div
          className={
            listClassName ||
            'absolute z-20 mt-2 w-full max-h-64 overflow-auto rounded-2xl border-2 border-[#DDE8DD] bg-white shadow-xl p-2'
          }
          role="listbox"
          aria-label={label}
        >
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                onChange([]);
                setOpenId(null);
              }}
              className="w-full text-left px-3 py-2 rounded-xl font-extrabold text-slate-700 hover:bg-slate-50"
            >
              {allLabel}
            </button>

            {enableRange && options.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-extrabold text-slate-500 whitespace-nowrap">{rangeLabel}:</div>
                  {rangeType === 'numeric_prefix' ? (
                    <>
                      <input
                        className="w-14 sm:w-16 px-2 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-xs"
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(e.target.value)}
                        placeholder={rangeFromLabel}
                        inputMode="numeric"
                        aria-label={rangeFromLabel}
                      />
                      <div className="text-xs font-extrabold text-slate-500">to</div>
                      <input
                        className="w-14 sm:w-16 px-2 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-xs"
                        value={rangeTo}
                        onChange={(e) => setRangeTo(e.target.value)}
                        placeholder={rangeToLabel}
                        inputMode="numeric"
                        aria-label={rangeToLabel}
                      />
                    </>
                  ) : (
                    <>
                      <select
                        className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-xs max-w-[10rem]"
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(e.target.value)}
                        aria-label={rangeFromLabel}
                      >
                        {options.map((o) => (
                          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                        ))}
                      </select>
                      <div className="text-xs font-extrabold text-slate-500">to</div>
                      <select
                        className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-xs max-w-[10rem]"
                        value={rangeTo}
                        onChange={(e) => setRangeTo(e.target.value)}
                        aria-label={rangeToLabel}
                      >
                        {options.map((o) => (
                          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                        ))}
                      </select>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={applyRange}
                    className="px-3 py-2 rounded-xl font-extrabold whitespace-nowrap border border-slate-900 bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]"
                  >
                    {rangeApplyLabel}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-slate-200" />

          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="w-full text-left px-3 py-2 rounded-xl font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-2"
              title={label}
            >
              <input type="checkbox" readOnly checked={selectedSet.has(opt.value)} className="h-4 w-4" />
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
