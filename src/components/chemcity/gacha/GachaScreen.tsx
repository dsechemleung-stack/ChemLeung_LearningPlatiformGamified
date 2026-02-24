import { useEffect, useState } from 'react';
import { useChemCityStore } from '../../../store/chemcityStore';
import { GachaResultsModal } from './GachaResultsModal';
import { PityBar } from './PityBar';
import type { GachaBanner } from '../../../lib/chemcity/types';
import { callChemCityGachaDraw } from '../../../lib/chemcity/cloudFunctions';

export function GachaScreen() {
  const user = useChemCityStore((s) => s.user);

  const loadGachaStatic = useChemCityStore((s) => s.loadGachaStatic);

  const activeBanners = useChemCityStore((s) => s.activeBanners);

  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastResults, setLastResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [pendingDraw, setPendingDraw] = useState<{ count: 1 | 10 } | null>(null);
  const [animationDone, setAnimationDone] = useState(false);

  // Fallback default banner if none exist in database
  const defaultBanner: GachaBanner = {
    id: 'banner_standard',
    name: 'Standard Banner',
    active: true,
    cacheVersion: 1,
    rarityRates: { common: 0.6, uncommon: 0.25, rare: 0.1, epic: 0.04, legendary: 0.01 },
    pityRules: { epicEvery: 50, legendaryEvery: 100 },
    duplicateRefundCoinsByRarity: { common: 10, uncommon: 25, rare: 50, epic: 100, legendary: 500 },
  };

  // Use activeBanners if available, otherwise use default
  const effectiveBanners = activeBanners.length > 0 ? activeBanners : [defaultBanner];
  
  const selectedBanner: GachaBanner | undefined =
    effectiveBanners.find((b) => b.id === selectedBannerId) ?? effectiveBanners[0];

  useEffect(() => {
    if (effectiveBanners.length && !selectedBannerId) {
      setSelectedBannerId(effectiveBanners[0].id);
    }
  }, [effectiveBanners, selectedBannerId]);

  useEffect(() => {
    loadGachaStatic();
  }, [loadGachaStatic]);

  useEffect(() => {
    if (pendingDraw) {
      setShowAnimation(true);
      setAnimationDone(false);
      setError(null);
      setIsDrawing(true);
      callChemCityGachaDraw({ bannerId: (selectedBanner as any).id, count: pendingDraw.count, payWith: 'tickets' })
        .then((res) => {
          setLastResults(res.results);
        })
        .catch((err: any) => {
          setError(err?.message ?? 'Draw failed');
        })
        .finally(() => {
          setIsDrawing(false);
        });
    }
  }, [pendingDraw, selectedBanner]);

  useEffect(() => {
    if (!showAnimation && animationDone && lastResults && !isDrawing) {
      setShowResults(true);
    }
  }, [animationDone, isDrawing, lastResults, showAnimation]);

  const currencies = user?.currencies ?? { coins: 0, diamonds: 0, tickets: 0 };

  const gachaState = (user as any)?.gachaState ?? {};
  const pity = selectedBanner ? gachaState[selectedBanner.id] ?? { sinceEpic: 0, sinceLegendary: 0, lifetimePulls: 0 } : null;

  const canPayTickets1x = (currencies as any).tickets >= 1;
  const canPayTickets10x = (currencies as any).tickets >= 10;

  function handleStartDraw(count: 1 | 10) {
    if (!selectedBanner) return;
    if (showAnimation || isDrawing) return;
    setLastResults(null);
    setShowResults(false);
    setPendingDraw({ count });
  }

  function handleCloseResults() {
    setShowResults(false);
    setLastResults(null);
  }

  function handleAnimationEnded() {
    setShowAnimation(false);
    setPendingDraw(null);
    setAnimationDone(true);
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <span className="animate-pulse text-lg">Loading...</span>
      </div>
    );
  }

  // Show gacha machine even while loading static data
  const hasBanner = selectedBanner && pity;

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Background image */}
      <img
        src="/GachaMachine.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/60 pointer-events-none" />

      {/* Animation overlay */}
      {showAnimation ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <video
            src="/Gacha animation.mp4"
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            onEnded={handleAnimationEnded}
          />
        </div>
      ) : null}

      {/* Top bar with tickets/coins */}
      <div className="relative z-30 flex items-center justify-between gap-3 px-4 py-4">
        <div className="flex gap-3">
          <CurrencyBadge emoji="🎟️" label="Tickets" value={(currencies as any).tickets ?? 0} />
          <CurrencyBadge emoji="🪙" label="Coins" value={currencies.coins} />
        </div>
        {effectiveBanners.length > 1 && hasBanner ? (
          <select
            value={selectedBanner.id}
            onChange={(e) => setSelectedBannerId(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
            disabled={showAnimation || isDrawing}
          >
            {effectiveBanners.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {/* Middle spacer */}
      <div className="flex-1" />

      {/* Bottom controls */}
      <div className="relative z-30 flex flex-col items-center gap-3 px-4 pb-8">
        {error ? (
          <div className="w-full max-w-md bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="w-full max-w-md grid grid-cols-2 gap-3">
          <DrawButton
            label="Draw × 1"
            sublabel="1 Ticket"
            emoji="🎟️"
            disabled={!canPayTickets1x || isDrawing || showAnimation || !hasBanner}
            loading={isDrawing && pendingDraw?.count === 1}
            onClick={() => handleStartDraw(1)}
            variant="primary"
          />
          <DrawButton
            label="Draw × 10"
            sublabel="10 Tickets (Rare+)"
            emoji="🎟️"
            disabled={!canPayTickets10x || isDrawing || showAnimation || !hasBanner}
            loading={isDrawing && pendingDraw?.count === 10}
            onClick={() => handleStartDraw(10)}
            variant="secondary"
          />
        </div>

        <div className="w-full max-w-md space-y-2">
          {hasBanner ? (
            <>
              <PityBar label="Epic Pity" current={pity.sinceEpic} max={selectedBanner.pityRules.epicEvery} color="purple" />
              <PityBar label="Legendary Pity" current={pity.sinceLegendary} max={selectedBanner.pityRules.legendaryEvery} color="yellow" />
            </>
          ) : (
            <div className="text-center text-gray-400 text-sm">No active banners available</div>
          )}
        </div>
      </div>

      {showResults && lastResults ? (
        <GachaResultsModal results={lastResults as any} onClose={handleCloseResults} />
      ) : null}
    </div>
  );
}

function CurrencyBadge({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-800 rounded-xl px-3 py-2">
      <span className="text-lg">{emoji}</span>
      <div>
        <p className="text-[10px] text-gray-500 leading-none">{label}</p>
        <p className="text-sm font-bold leading-tight">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function DrawButton({
  label,
  sublabel,
  emoji,
  disabled,
  loading,
  onClick,
  variant,
}: {
  label: string;
  sublabel: string;
  emoji: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  variant: 'primary' | 'secondary';
}) {
  const base =
    'flex flex-col items-center justify-center rounded-2xl py-4 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      {loading ? (
        <span className="animate-spin text-xl">⟳</span>
      ) : (
        <>
          <span className="text-base font-bold">{label}</span>
          <span className="text-xs text-gray-200/70">
            {emoji} {sublabel}
          </span>
        </>
      )}
    </button>
  );
}

function RateTable({ rates }: { rates: Record<string, number> }) {
  const order = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  const colors: Record<string, string> = {
    legendary: 'text-yellow-400',
    epic: 'text-purple-400',
    rare: 'text-blue-400',
    uncommon: 'text-green-400',
    common: 'text-gray-400',
  };

  return (
    <div className="mt-4 bg-gray-800/60 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Drop Rates</p>
      <div className="grid grid-cols-5 gap-1 text-center">
        {order.map((r) => (
          <div key={r} className="flex flex-col items-center">
            <span className={`text-xs font-bold capitalize ${colors[r]}`}>{r}</span>
            <span className="text-[10px] text-gray-400">{((rates[r] ?? 0) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BannerCountdown({ endAt }: { endAt: any }) {
  const end = typeof endAt === 'string' ? new Date(endAt) : typeof endAt?.toDate === 'function' ? endAt.toDate() : new Date(endAt);
  const diff = end.getTime() - Date.now();
  if (diff < 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return (
    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs rounded-full px-3 py-1">
      ⏳ {days}d {hours}h left
    </div>
  );
}
