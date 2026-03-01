import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChemCityStore } from '../../store/chemcityStore';
import { PassiveIncomeCollector } from './PassiveIncomeCollector';

export const ChemCityMap: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const places = useChemCityStore((s) => s.places);
  const navigateToPlace = useChemCityStore((s) => s.navigateToPlace);
  const openPlaceUnlockModal = useChemCityStore((s) => s.openPlaceUnlockModal);
  const navigate = useNavigate();
  const [mapLevel, setMapLevel] = useState<'world' | 'home'>('world');

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const mapImgRef = useRef<HTMLImageElement | null>(null);
  const [mapNaturalWidth, setMapNaturalWidth] = useState(0);
  const [mapRenderedWidth, setMapRenderedWidth] = useState(0);
  const [worldHotspots, setWorldHotspots] = useState<
    Array<{
      key: string;
      label: string;
      placeId?: string;
      leftPct: number;
      topPct: number;
      action?: 'home' | 'chemstore';
    }>
  >([
    { key: 'school', label: 'School', placeId: 'school', leftPct: 32.372, topPct: 34.495 },
    { key: 'beach', label: 'Beach', placeId: 'beach', leftPct: 44.952, topPct: 74.039 },
    { key: 'boutique', label: 'Boutique', placeId: 'lifestyle_boutique', leftPct: 29.487, topPct: 63.241 },
    { key: 'gas_station', label: 'Gas Station', placeId: 'gas_station', leftPct: 67.147, topPct: 50.761 },
    { key: 'home', label: 'Home', leftPct: 48.958, topPct: 50.06, action: 'home' },
    { key: 'chemstore', label: 'ChemStore', leftPct: 61.071, topPct: 40.189, action: 'chemstore' },
  ]);

  const [homeHotspots, setHomeHotspots] = useState<
    Array<{
      key: string;
      label: string;
      placeId: string;
      leftPct: number;
      topPct: number;
    }>
  >([
    { key: 'toilet', label: 'Toilet', placeId: 'toilet', leftPct: 29.728, topPct: 49.079 },
    { key: 'kitchen', label: 'Kitchen', placeId: 'kitchen', leftPct: 29.728, topPct: 73.057 },
    { key: 'garden', label: 'Garden', placeId: 'garden', leftPct: 12.26, topPct: 72.496 },
    { key: 'lab', label: 'Lab', placeId: 'lab', leftPct: 73.397, topPct: 49.079 },
  ]);

  const worldHotspotsSnapshot: Array<{
    key: string;
    label: string;
    placeId?: string;
    leftPct: number;
    topPct: number;
    action?: 'home' | 'chemstore';
  }> = worldHotspots;

  const homeHotspotsSnapshot: Array<{
    key: string;
    label: string;
    placeId: string;
    leftPct: number;
    topPct: number;
  }> = homeHotspots;

  if (!user) return null;

  const placeById = (id: string) => places.find((p) => p.id === id) ?? null;
  const isPlaceUnlocked = (placeId: string) => {
    const place = placeById(placeId);
    if (!place) return false;
    return place.unlockCost === 0 || user.unlockedPlaces.includes(placeId as any);
  };

  const mapSrc = mapLevel === 'world' ? '/Map1.png' : '/Map2.png';

  useEffect(() => {
    const img = mapImgRef.current;
    if (!img) return;

    const update = () => {
      const rect = img.getBoundingClientRect();
      setMapRenderedWidth(rect.width);
    };

    update();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update());
      ro.observe(img);
    } else {
      window.addEventListener('resize', update);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', update);
    };
  }, [mapSrc]);

  const centerScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxLeft = el.scrollWidth - el.clientWidth;
    if (maxLeft > 0) el.scrollLeft = maxLeft / 2;
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => centerScroll());
    return () => cancelAnimationFrame(raf);
  }, [mapSrc, mapRenderedWidth]);

  const hotspotScale = (() => {
    if (!mapNaturalWidth || !mapRenderedWidth) return 1;
    const scale = mapRenderedWidth / mapNaturalWidth;
    return Math.max(0.65, Math.min(1.25, scale * 1.1));
  })();

  const HotspotButton: React.FC<{
    label: string;
    leftPct: number;
    topPct: number;
    scale: number;
    onClick: () => void;
    disabled?: boolean;
    locked?: boolean;
    variant?: 'default' | 'store';
  }> = ({ label, leftPct, topPct, scale, onClick, disabled, locked, variant = 'default' }) => {
    const activeTone =
      variant === 'store'
        ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 border-pink-200 text-white'
        : 'bg-indigo-500/90 hover:bg-indigo-400 border-indigo-200 text-white';
    return (
      <button
        type="button"
        aria-label={label}
        title={locked ? `${label} (Locked — tap to unlock)` : label}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          onClick();
        }}
        disabled={disabled}
        className={`absolute z-10 pointer-events-auto rounded-full border font-bold shadow-md transition-all px-4 py-2 text-xs ${
          disabled
            ? 'bg-slate-800/80 border-slate-700 text-slate-500 cursor-not-allowed'
            : locked
            ? 'bg-slate-800/90 hover:bg-slate-700 border-amber-600/80 text-amber-300 active:scale-95'
            : `${activeTone} active:scale-95`
        }`}
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        {locked ? `🔒 ${label}` : label}
      </button>
    );
  };

  return (
    <div className="relative w-full h-full flex-1">
      <PassiveIncomeCollector />

      <div ref={scrollRef} className="absolute inset-0 overflow-auto bg-[#f5f1e6]">
        <div className="min-h-[100vh] w-full flex justify-center items-center py-3 px-2">
          <div
            className="relative inline-block"
          >
            <img
              ref={mapImgRef}
              src={mapSrc}
              alt={mapLevel === 'world' ? 'ChemCity world map' : 'ChemCity home map'}
              className="block w-[min(100vw,1400px)] h-auto"
              loading="lazy"
              onLoad={(e) => {
                const el = e.currentTarget;
                if (el.naturalWidth) setMapNaturalWidth(el.naturalWidth);
                const rect = el.getBoundingClientRect();
                setMapRenderedWidth(rect.width);
                centerScroll();
              }}
            />

          {mapLevel === 'world'
            ? worldHotspotsSnapshot.map((h) => (
              <HotspotButton
                key={h.key}
                label={h.label}
                leftPct={h.leftPct}
                topPct={h.topPct}
                scale={hotspotScale}
                locked={h.placeId ? !isPlaceUnlocked(h.placeId) : false}
                variant={h.action === 'chemstore' ? 'store' : 'default'}
                onClick={() => {
                  if (h.action === 'home') {
                    setMapLevel('home');
                    return;
                  }
                  if (h.action === 'chemstore') {
                    navigate('/store');
                    return;
                  }
                  if (!h.placeId) return;
                  if (!isPlaceUnlocked(h.placeId)) {
                    openPlaceUnlockModal(h.placeId);
                    return;
                  }
                  navigateToPlace(h.placeId);
                }}
                disabled={h.placeId ? !placeById(h.placeId) : false}
              />
            ))
            : homeHotspotsSnapshot.map((h) => (
              <HotspotButton
                key={h.key}
                label={h.label}
                leftPct={h.leftPct}
                topPct={h.topPct}
                scale={hotspotScale}
                onClick={() => {
                  if (!isPlaceUnlocked(h.placeId)) {
                    openPlaceUnlockModal(h.placeId);
                    return;
                  }
                  navigateToPlace(h.placeId);
                }}
                disabled={!placeById(h.placeId)}
                locked={!isPlaceUnlocked(h.placeId)}
              />
            ))}

          {mapLevel === 'home' && (
            <button
              type="button"
              onClick={() => setMapLevel('world')}
              className="absolute left-3 bottom-3 z-10 w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 backdrop-blur text-white font-bold"
              aria-label="Back to city map"
              title="Back"
            >
              ←
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};
