import React from 'react';
import type { SlimItemDocument } from '../../lib/chemcity/types';

// ─── Rarity Config ────────────────────────────────────────────
const RARITY_CONFIG: Record<string, {
  borderColor: string;
  glowColor: string;
  bgGradient: string;
  artBg: string;
  badgeColor: string;
  badgeText: string;
  stars: string;
  shimmer: boolean;
}> = {
  common: {
    borderColor: 'rgba(148,163,184,0.5)',
    glowColor: 'rgba(148,163,184,0.2)',
    bgGradient: 'linear-gradient(165deg, #1e293b 0%, #0f172a 100%)',
    artBg: 'rgba(255,255,255,0.04)',
    badgeColor: 'rgba(148,163,184,0.25)',
    badgeText: '#94a3b8',
    stars: '✦',
    shimmer: false,
  },
  rare: {
    borderColor: 'rgba(96,165,250,0.7)',
    glowColor: 'rgba(96,165,250,0.25)',
    bgGradient: 'linear-gradient(165deg, #1e3a5f 0%, #0f172a 100%)',
    artBg: 'rgba(96,165,250,0.06)',
    badgeColor: 'rgba(96,165,250,0.2)',
    badgeText: '#60a5fa',
    stars: '✦✦',
    shimmer: false,
  },
  epic: {
    borderColor: 'rgba(168,85,247,0.7)',
    glowColor: 'rgba(168,85,247,0.3)',
    bgGradient: 'linear-gradient(165deg, #2d1b4e 0%, #0f0a1e 100%)',
    artBg: 'rgba(168,85,247,0.07)',
    badgeColor: 'rgba(168,85,247,0.2)',
    badgeText: '#a855f7',
    stars: '✦✦✦',
    shimmer: false,
  },
  legendary: {
    borderColor: 'rgba(251,191,36,0.85)',
    glowColor: 'rgba(251,191,36,0.4)',
    bgGradient: 'linear-gradient(165deg, #3d2800 0%, #1a0f00 100%)',
    artBg: 'rgba(251,191,36,0.08)',
    badgeColor: 'rgba(251,191,36,0.2)',
    badgeText: '#fbbf24',
    stars: '✦✦✦✦',
    shimmer: true,
  },
};

interface ChemCardProps {
  item: SlimItemDocument;
  isEquipped?: boolean;
  isOwned?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showDetailHint?: boolean;
}

function needsAnonymousCrossOrigin(url?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes('drive.google.com') || u.includes('googleusercontent.com');
}

const SIZE_MAP = {
  sm: { w: 88,  h: 124, art: 64,  namePx: 9,  formulaPx: 8,  badgePx: 7,  pad: 5  },
  md: { w: 110, h: 150, art: 78,  namePx: 11, formulaPx: 9,  badgePx: 8,  pad: 6  },
  lg: { w: 140, h: 190, art: 96,  namePx: 12, formulaPx: 10, badgePx: 9,  pad: 8  },
};

export const ChemCard: React.FC<ChemCardProps> = ({
  item,
  isEquipped = false,
  isOwned = true,
  size = 'md',
  onClick,
}) => {
  const cfg = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;
  const dim = SIZE_MAP[size];
  const formulaText = String(item.chemicalFormula ?? '');
  const shouldMarquee = formulaText.length >= 18;

  return (
    <button
      onClick={onClick}
      style={{
        width: dim.w,
        height: dim.h,
        flexShrink: 0,
        position: 'relative',
        borderRadius: 10,
        border: `2px solid ${isEquipped ? '#4ade80' : cfg.borderColor}`,
        background: cfg.bgGradient,
        boxShadow: isEquipped
          ? `0 0 0 2px rgba(74,222,128,0.4), 0 4px 20px rgba(0,0,0,0.5)`
          : `0 0 16px ${cfg.glowColor}, 0 4px 12px rgba(0,0,0,0.5)`,
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: "'Quicksand', sans-serif",
        overflow: 'hidden',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        filter: !isOwned ? 'grayscale(0.7) opacity(0.6)' : 'none',
        padding: 0,
        outline: 'none',
      }}
      className={cfg.shimmer ? 'legendary-card' : ''}
      aria-label={`${item.name} card`}
      onMouseEnter={e => {
        if (onClick) (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.02)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      {/* Shimmer overlay for legendary */}
      {cfg.shimmer && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 8, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(105deg, transparent 30%, rgba(255,215,0,0.12) 50%, transparent 70%)',
          animation: 'shimmerSlide 3s ease-in-out infinite',
        }} />
      )}

      {/* Equipped badge */}
      {isEquipped && (
        <div style={{
          position: 'absolute', top: 4, left: 4, zIndex: 10,
          background: '#4ade80', borderRadius: 4, padding: '1px 5px',
          fontSize: 8, fontWeight: 800, color: '#052e16',
          fontFamily: "'Quicksand', sans-serif",
        }}>✓ EQ</div>
      )}

      {/* Rarity stars - top right */}
      <div style={{
        position: 'absolute', top: 4, right: 4, zIndex: 10,
        color: cfg.badgeText, fontSize: dim.badgePx, fontWeight: 800, letterSpacing: 1,
      }}>{cfg.stars}</div>

      {/* Art section */}
      <div style={{
        width: dim.art, height: dim.art, margin: `${dim.pad}px auto 0`,
        background: cfg.artBg,
        borderRadius: 7,
        border: `1px solid ${cfg.borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
            {...(needsAnonymousCrossOrigin(item.imageUrl)
              ? { crossOrigin: 'anonymous' as const, referrerPolicy: 'no-referrer' as const }
              : {})}
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span style={{ fontSize: dim.art * 0.48, lineHeight: 1 }}>{item.emoji}</span>
        )}
      </div>

      {/* Name + formula */}
      <div style={{
        padding: `${dim.pad - 1}px ${dim.pad}px 0`,
        textAlign: 'center',
      }}>
        <div style={{
          color: '#f1f5f9',
          fontSize: dim.namePx,
          fontWeight: 800,
          lineHeight: 1.2,
          fontFamily: "'Quicksand', sans-serif",
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{item.name}</div>
        {shouldMarquee ? (
          <div className="chemcity-marquee" style={{
            marginTop: 2,
            height: 12,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}>
            <div className="chemcity-marquee__track" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 18,
            }}>
              <span className="chemcity-marquee__text" style={{
                color: 'rgba(255,255,255,0.60)',
                fontSize: Math.max(7, dim.formulaPx - 1),
                fontWeight: 700,
                fontFamily: "'Quicksand', sans-serif",
                lineHeight: '12px',
                paddingBottom: 1,
              }}>{formulaText}</span>
              <span className="chemcity-marquee__text" style={{
                color: 'rgba(255,255,255,0.60)',
                fontSize: Math.max(7, dim.formulaPx - 1),
                fontWeight: 700,
                fontFamily: "'Quicksand', sans-serif",
                lineHeight: '12px',
                paddingBottom: 1,
              }}>{formulaText}</span>
            </div>
          </div>
        ) : (
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: Math.max(7, dim.formulaPx - 1),
            fontWeight: 700,
            fontFamily: "'Quicksand', sans-serif",
            marginTop: 2,
            lineHeight: '12px',
            paddingBottom: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{formulaText}</div>
        )}
      </div>

      {/* Rarity badge footer */}
      <div style={{
        position: 'absolute', bottom: dim.pad, left: dim.pad, right: dim.pad,
        background: cfg.badgeColor,
        borderRadius: 4,
        padding: '2px 0',
        textAlign: 'center',
        fontSize: dim.badgePx,
        fontWeight: 800,
        color: cfg.badgeText,
        fontFamily: "'Quicksand', sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {item.rarity}
      </div>

      <style>{`
        @keyframes shimmerSlide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes chemcityMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .chemcity-marquee__track { animation: chemcityMarquee 10s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .chemcity-marquee__track { animation: none !important; }
        }
        .legendary-card { animation: legendaryPulse 2s ease-in-out infinite; }
        @keyframes legendaryPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(251,191,36,0.4), 0 4px 12px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 32px rgba(251,191,36,0.65), 0 4px 16px rgba(0,0,0,0.6); }
        }
      `}</style>
    </button>
  );
};