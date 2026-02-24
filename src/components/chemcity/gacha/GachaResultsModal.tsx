import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useChemCityStore } from '../../../store/chemcityStore';
import type { Cosmetic, GachaDrawResult, Rarity } from '../../../lib/chemcity/types';
import { getAvatarTuning, shouldForceNoSplit, avatarNumberFromId } from './AvatarTuner';

interface Props {
  results: GachaDrawResult[];
  onClose: () => void;
}

function buildAvatarStyle(url: string): CSSProperties {
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: 'contain',
    backgroundPosition: '50% 100%',
    backgroundRepeat: 'no-repeat',
  };
}

// ── Brand palette (matches landing page) ─────────────────────────────────────
const BRAND = {
  bg: '#071412',
  bgCard: '#0d2320',
  teal: '#76A8A5',
  sage: '#C5D7B5',
};

const RARITY_CONFIG: Record<
  Rarity,
  {
    label: string;
    border: string;
    glow: string;
    bg: string;
    badgeBg: string;
    badgeText: string;
    headerGradient: string;
  }
> = {
  common: {
    label: 'Common',
    border: 'rgba(118,168,165,0.3)',
    glow: 'none',
    bg: 'rgba(118,168,165,0.06)',
    badgeBg: 'rgba(118,168,165,0.18)',
    badgeText: '#C5D7B5',
    headerGradient: 'linear-gradient(135deg, rgba(118,168,165,0.25), rgba(118,168,165,0.05))',
  },
  uncommon: {
    label: 'Uncommon',
    border: 'rgba(110,200,120,0.45)',
    glow: '0 0 16px 2px rgba(110,200,120,0.2)',
    bg: 'rgba(30,80,40,0.25)',
    badgeBg: 'rgba(110,200,120,0.2)',
    badgeText: '#90efb0',
    headerGradient: 'linear-gradient(135deg, rgba(60,140,70,0.3), rgba(30,80,40,0.1))',
  },
  rare: {
    label: 'Rare',
    border: 'rgba(100,170,240,0.55)',
    glow: '0 0 20px 4px rgba(100,170,240,0.25)',
    bg: 'rgba(20,50,100,0.3)',
    badgeBg: 'rgba(100,170,240,0.2)',
    badgeText: '#93c5fd',
    headerGradient: 'linear-gradient(135deg, rgba(40,100,200,0.3), rgba(20,50,100,0.1))',
  },
  epic: {
    label: 'Epic',
    border: 'rgba(170,100,230,0.6)',
    glow: '0 0 24px 6px rgba(170,100,230,0.3)',
    bg: 'rgba(50,20,80,0.35)',
    badgeBg: 'rgba(170,100,230,0.2)',
    badgeText: '#d8b4fe',
    headerGradient: 'linear-gradient(135deg, rgba(120,50,180,0.35), rgba(50,20,80,0.1))',
  },
  legendary: {
    label: 'Legendary',
    border: 'rgba(245,185,60,0.7)',
    glow: '0 0 32px 8px rgba(245,185,60,0.35)',
    bg: 'rgba(70,40,0,0.4)',
    badgeBg: 'rgba(245,185,60,0.25)',
    badgeText: '#fde68a',
    headerGradient: 'linear-gradient(135deg, rgba(180,100,10,0.4), rgba(70,40,0,0.1))',
  },
};

// ── Main modal ────────────────────────────────────────────────────────────────

export function GachaResultsModal({ results, onClose }: Props) {
  const cosmeticsMap = useChemCityStore((s) => (s as any).cosmeticsMap as Map<string, Cosmetic> | undefined);
  const userGender = useChemCityStore((s) => (s as any).userGender as 'boy' | 'girl' | null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [allRevealed, setAllRevealed] = useState(false);

  useEffect(() => {
    if (allRevealed) return;
    if (revealedCount >= results.length) {
      setAllRevealed(true);
      return;
    }
    const delay = revealedCount === 0 ? 400 : 350;
    const t = setTimeout(() => setRevealedCount((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [revealedCount, results.length, allRevealed]);

  function revealAll() {
    setRevealedCount(results.length);
    setAllRevealed(true);
  }

  const totalRefund = results.reduce((acc, r) => acc + r.refundCoins, 0);
  const newCount = results.filter((r) => r.isNew).length;
  const isSingle = results.length === 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: BRAND.bg, fontFamily: "'Quicksand', sans-serif" }}
    >
      {/* Ambient glow overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(118,168,165,0.08) 0%, transparent 70%)',
      }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-3 shrink-0">
        <div>
          <h2 className="text-2xl font-black" style={{ color: BRAND.sage }}>
            {isSingle ? 'Draw Result' : `${results.length}× Draw`}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            {newCount > 0 && (
              <span className="text-sm font-bold" style={{ color: '#86efac' }}>
                ✦ {newCount} new
              </span>
            )}
            {totalRefund > 0 && (
              <span className="text-sm font-bold" style={{ color: '#fde68a' }}>
                🪙 +{totalRefund} refunded
              </span>
            )}
          </div>
        </div>
        {!allRevealed ? (
          <button
            onClick={revealAll}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'rgba(118,168,165,0.15)', color: BRAND.teal, border: `1px solid rgba(118,168,165,0.3)` }}
          >
            Reveal All
          </button>
        ) : (
          <div style={{ width: 80 }} />
        )}
      </div>

      {/* Cards grid */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-4">
        <div
          className={`grid gap-3 py-2 ${
            isSingle
              ? 'grid-cols-1 max-w-xs mx-auto'
              : results.length <= 4
                ? 'grid-cols-2'
                : 'grid-cols-3 sm:grid-cols-5'
          }`}
        >
          {results.map((r, idx) => (
            <ResultCard
              key={`${idx}_${r.cosmeticId}`}
              result={r}
              cosmetic={cosmeticsMap?.get(r.cosmeticId)}
              cosmeticsMap={cosmeticsMap}
              userGender={userGender}
              revealed={idx < revealedCount}
              isSingle={isSingle}
            />
          ))}
        </div>
      </div>

      {/* Done button */}
      {allRevealed && (
        <div className="relative z-10 px-4 pb-8 pt-2 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl text-lg font-black transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${BRAND.teal}, #5d9190)`,
              color: '#0a1a18',
              boxShadow: `0 4px 24px rgba(118,168,165,0.4)`,
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// ── Individual result card ─────────────────────────────────────────────────────

function ResultCard({
  result,
  cosmetic,
  cosmeticsMap,
  userGender,
  revealed,
  isSingle,
}: {
  result: GachaDrawResult;
  cosmetic: Cosmetic | undefined;
  cosmeticsMap: Map<string, Cosmetic> | undefined;
  userGender: 'boy' | 'girl' | null;
  revealed: boolean;
  isSingle: boolean;
}) {
  const cfg = RARITY_CONFIG[result.rarity];
  const num = cosmetic ? avatarNumberFromId(cosmetic.id) : null;

  const avatarUrl = useMemo(() => {
    if (!cosmetic) return null;
    if (cosmetic.type !== 'avatar') return null;
    const resolvedGender: 'boy' | 'girl' = userGender === 'girl' ? 'girl' : 'boy';
    const key = resolvedGender === 'girl' ? 'imageUrlGirl' : 'imageUrlBoy';
    if (!shouldForceNoSplit(cosmetic.id)) {
      const gendered = (cosmetic as any)?.[key] as string | undefined;
      if (gendered) return gendered;
    }
    const plain = cosmeticsMap?.get('avatar_1_plain') as any;
    const plainGendered = plain?.[key] as string | undefined;
    return plainGendered ?? null;
  }, [cosmetic, userGender, cosmeticsMap]);

  const avatarStyle = useMemo<CSSProperties | null>(() => {
    if (!cosmetic || cosmetic.type !== 'avatar') return null;
    if (!avatarUrl) return null;
    return buildAvatarStyle(avatarUrl);
  }, [cosmetic, avatarUrl]);

  const avatarTransform = useMemo(() => {
    if (!cosmetic || cosmetic.type !== 'avatar') return '';
    if (!userGender) return '';
    const tune = getAvatarTuning(cosmetic.id, 'gacha_result', userGender);
    const ox = tune?.offsetXPercent ?? 0;
    const oy = tune?.offsetYPercent ?? 0;
    const sc = tune?.scale ?? 1;
    if (ox === 0 && oy === 0 && sc === 1) return '';
    return `translate(${ox}%, ${oy}%) scale(${sc})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cosmetic?.id, userGender]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden transition-all duration-500 ${
        isSingle ? 'aspect-[3/4]' : 'aspect-square'
      }`}
      style={
        revealed
          ? {
              border: `2px solid ${cfg.border}`,
              boxShadow: cfg.glow,
              background: cfg.bg,
              opacity: 1,
              transform: 'scale(1)',
            }
          : {
              border: '2px solid rgba(118,168,165,0.1)',
              background: 'rgba(118,168,165,0.04)',
              opacity: 0,
              transform: 'scale(0.9)',
            }
      }
    >
      {revealed ? (
        <>
          {/* Avatar image */}
          {cosmetic?.imageUrl ? (
            cosmetic.type === 'avatar' ? (
              <div className="absolute inset-0 overflow-hidden">
                {avatarStyle && avatarUrl ? (
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: avatarTransform || undefined,
                      transformOrigin: 'center center',
                    }}
                  >
                    <div className="absolute inset-0" style={avatarStyle} />
                  </div>
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={cosmetic.name}
                    className="absolute bottom-0 left-1/2 h-full w-auto max-w-none"
                    style={{ transform: `translateX(-50%) ${avatarTransform || ''}`.trim() }}
                    draggable={false}
                  />
                ) : null}
              </div>
            ) : (
              /* Background image */
              <img
                src={cosmetic.imageUrl}
                alt={cosmetic.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {result.rarity === 'legendary' ? '⭐' : result.rarity === 'epic' ? '💜' : '🎁'}
            </div>
          )}

          {/* Header gradient overlay */}
          <div className="absolute inset-x-0 top-0 h-16 pointer-events-none"
            style={{ background: cfg.headerGradient }} />

          {/* Avatar number badge — top right */}
          {num !== null && (
            <div
              className="absolute top-2 right-2 rounded-md px-1.5 py-0.5"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            >
              <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>
                #{num}
              </span>
            </div>
          )}

          {/* Status badges — top left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {result.pitied && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(100,170,240,0.25)', color: '#93c5fd', border: '1px solid rgba(100,170,240,0.4)' }}
              >
                Pity
              </span>
            )}
            {result.isNew && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(110,200,120,0.25)', color: '#86efac', border: '1px solid rgba(110,200,120,0.4)' }}
              >
                New!
              </span>
            )}
          </div>

          {/* Bottom info bar */}
          <div
            className="absolute inset-x-0 bottom-0 px-3 py-3"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 60%, transparent)' }}
          >
            <p className="text-white font-black text-base leading-tight truncate mb-1.5">
              {cosmetic?.name ?? result.cosmeticId}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: cfg.badgeBg,
                  color: cfg.badgeText,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                {cfg.label}
              </span>
              {!result.isNew && result.refundCoins > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,185,60,0.2)', color: '#fde68a', border: '1px solid rgba(245,185,60,0.35)' }}
                >
                  +{result.refundCoins} 🪙
                </span>
              )}
            </div>
          </div>

          {/* Legendary shimmer */}
          {result.rarity === 'legendary' && (
            <div
              className="absolute inset-0 pointer-events-none animate-pulse"
              style={{ background: 'linear-gradient(135deg, rgba(245,185,60,0.08) 0%, transparent 50%, rgba(245,185,60,0.08) 100%)' }}
            />
          )}
        </>
      ) : (
        /* Unrevealed state */
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: 'rgba(118,168,165,0.06)' }}
        >
          <span className="text-4xl">❓</span>
          <p className="text-xs font-bold" style={{ color: 'rgba(118,168,165,0.5)' }}>Tap reveal all</p>
        </div>
      )}
    </div>
  );
}