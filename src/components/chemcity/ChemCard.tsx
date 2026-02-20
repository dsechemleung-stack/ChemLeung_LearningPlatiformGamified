import React from 'react';
import type { SlimItemDocument } from '../../lib/chemcity/types';

const RARITY_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  common: { bg: 'from-slate-700 to-slate-600', border: 'border-slate-500', badge: 'bg-slate-500 text-white' },
  rare: { bg: 'from-blue-700 to-indigo-600', border: 'border-blue-400', badge: 'bg-blue-500 text-white' },
  epic: { bg: 'from-purple-700 to-pink-600', border: 'border-purple-400', badge: 'bg-purple-500 text-white' },
  legendary: { bg: 'from-amber-600 to-yellow-400', border: 'border-yellow-300', badge: 'bg-yellow-400 text-slate-900' },
};

interface ChemCardProps {
  item: SlimItemDocument;
  isEquipped?: boolean;
  isOwned?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showDetailHint?: boolean;
}

export const ChemCard: React.FC<ChemCardProps> = ({
  item,
  isEquipped = false,
  isOwned = true,
  size = 'md',
  onClick,
}) => {
  const style = RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common;

  const sizeClasses = {
    sm: 'w-20 h-28 text-xs',
    md: 'w-28 h-40 text-sm',
    lg: 'w-36 h-52 text-base',
  }[size];

  const emojiSize = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl' }[size];
  const formulaSize = { sm: 'text-xs', md: 'text-xs', lg: 'text-sm' }[size];
  const imageSize = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-16 h-16' }[size];

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-between ${sizeClasses} bg-gradient-to-b ${style.bg} border-2 ${style.border} rounded-xl p-2 cursor-pointer transition-transform duration-150 active:scale-95 ${
        isEquipped ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-slate-900' : ''
      } ${!isOwned ? 'opacity-50 grayscale' : ''} ${size === 'lg' ? 'shadow-lg' : 'shadow-md'}`}
      aria-label={`${item.name} card`}
    >
      <span className={`absolute top-1 right-1 text-xs font-bold rounded px-1 py-0.5 ${style.badge} ${size === 'sm' ? 'hidden' : ''}`}>
        {item.rarityValue === 4 ? '★★★' : item.rarityValue === 3 ? '★★' : item.rarityValue === 2 ? '★' : '·'}
      </span>

      {isEquipped && (
        <span className="absolute top-1 left-1 bg-green-400 text-slate-900 text-xs font-bold rounded px-1">
          ✓
        </span>
      )}

      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className={`${imageSize} mt-2 object-contain rounded-lg shadow-sm`}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span className={`${emojiSize} mt-2`}>{item.emoji}</span>
      )}

      <div className="text-center mt-auto w-full">
        <p className="text-white font-semibold leading-tight truncate px-1">{item.name}</p>
        <p className={`${formulaSize} text-white/70 font-mono`}>{item.chemicalFormula}</p>
      </div>
    </button>
  );
};
