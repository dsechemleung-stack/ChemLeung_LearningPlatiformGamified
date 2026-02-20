import React, { useEffect, useRef, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';
import { PassiveIncomeCollector } from './PassiveIncomeCollector';

export const ChemCityMap: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const places = useChemCityStore((s) => s.places);
  const navigateToPlace = useChemCityStore((s) => s.navigateToPlace);
  const [mapLevel, setMapLevel] = useState<'world' | 'home'>('world');

  const isHotspotEditorEnabled = false;
  const [editMode, setEditMode] = useState(false);
  const [selectedHotspotKey, setSelectedHotspotKey] = useState<string | null>(null);

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
      action?: 'home';
    }>
  >([
    { key: 'school', label: 'School', placeId: 'school', leftPct: 32.372, topPct: 34.495 },
    { key: 'beach', label: 'Beach', placeId: 'beach', leftPct: 44.952, topPct: 74.039 },
    { key: 'boutique', label: 'Boutique', placeId: 'lifestyle_boutique', leftPct: 29.487, topPct: 63.241 },
    { key: 'gas_station', label: 'Gas Station', placeId: 'gas_station', leftPct: 67.147, topPct: 50.761 },
    { key: 'home', label: 'Home', leftPct: 48.958, topPct: 50.06, action: 'home' },
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
    action?: 'home';
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

  const mapSrc = mapLevel === 'world' ? '/Map1.png' : '/Map2.png';

  const activeHotspots = mapLevel === 'world' ? worldHotspots : homeHotspots;

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

  const hotspotScale = (() => {
    if (!mapNaturalWidth || !mapRenderedWidth) return 1;
    const scale = mapRenderedWidth / mapNaturalWidth;
    return Math.max(0.65, Math.min(1.25, scale * 1.1));
  })();

  const exportHotspotCoords = async () => {
    const payload = {
      mapLevel,
      hotspots: activeHotspots.map((h) => ({
        key: h.key,
        label: h.label,
        leftPct: h.leftPct,
        topPct: h.topPct,
      })),
    };

    const text = JSON.stringify(payload, null, 2);
    console.log('[ChemCityMap] Hotspot coords export:\n' + text);

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // ignore clipboard errors
    }
  };

  const HotspotButton: React.FC<{
    label: string;
    leftPct: number;
    topPct: number;
    scale: number;
    onClick: () => void;
    disabled?: boolean;
  }> = ({ label, leftPct, topPct, scale, onClick, disabled }) => {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          onClick();
        }}
        disabled={disabled}
        className={`absolute rounded-full border font-bold shadow-md transition-all px-4 py-2 text-xs ${
          disabled
            ? 'bg-slate-800/80 border-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-indigo-500/90 hover:bg-indigo-400 border-indigo-200 text-white active:scale-95'
        }`}
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="relative w-full h-full flex-1">
      <PassiveIncomeCollector />

      <div className="absolute inset-0 overflow-auto">
        <div
          className="relative w-full"
          onClick={(e) => {
            if (!isHotspotEditorEnabled) return;
            if (!editMode) return;
            if (!selectedHotspotKey) return;

            const target = e.currentTarget;
            const rect = target.getBoundingClientRect();
            const leftPct = ((e.clientX - rect.left) / rect.width) * 100;
            const topPct = ((e.clientY - rect.top) / rect.height) * 100;
            const leftRounded = Math.round(leftPct * 1000) / 1000;
            const topRounded = Math.round(topPct * 1000) / 1000;

            const leftClamped = Math.max(0, Math.min(100, leftRounded));
            const topClamped = Math.max(0, Math.min(100, topRounded));

            if (mapLevel === 'world') {
              setWorldHotspots((hs) =>
                hs.map((h) => (h.key === selectedHotspotKey ? { ...h, leftPct: leftClamped, topPct: topClamped } : h)),
              );
            } else {
              setHomeHotspots((hs) =>
                hs.map((h) => (h.key === selectedHotspotKey ? { ...h, leftPct: leftClamped, topPct: topClamped } : h)),
              );
            }

            console.log(
              `[ChemCityMap] ${mapLevel} set ${selectedHotspotKey}: leftPct=${leftClamped}, topPct=${topClamped}`,
            );
          }}
        >
          <img
            ref={mapImgRef}
            src={mapSrc}
            alt={mapLevel === 'world' ? 'ChemCity world map' : 'ChemCity home map'}
            className="w-full h-auto"
            loading="lazy"
            onLoad={(e) => {
              const el = e.currentTarget;
              if (el.naturalWidth) setMapNaturalWidth(el.naturalWidth);
              const rect = el.getBoundingClientRect();
              setMapRenderedWidth(rect.width);
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
              onClick={() => {
                if (isHotspotEditorEnabled && editMode) {
                  setSelectedHotspotKey(h.key);
                  return;
                }
                if (h.action === 'home') {
                  setMapLevel('home');
                  return;
                }
                if (h.placeId) navigateToPlace(h.placeId);
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
                if (isHotspotEditorEnabled && editMode) {
                  setSelectedHotspotKey(h.key);
                  return;
                }
                navigateToPlace(h.placeId);
              }}
              disabled={!placeById(h.placeId)}
            />
          ))}

        {isHotspotEditorEnabled && (
          <div
            className="absolute left-3 bottom-3 z-20 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditMode((v) => !v);
                  setSelectedHotspotKey(null);
                }}
                className={`text-xs font-bold rounded-xl px-3 py-2 border backdrop-blur transition-colors ${
                  editMode
                    ? 'bg-indigo-600/90 border-indigo-300 text-white'
                    : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {editMode ? 'Editing' : 'Edit hotspots'}
              </button>
              {editMode && (
                <button
                  type="button"
                  onClick={() => exportHotspotCoords()}
                  className="text-xs font-bold rounded-xl px-3 py-2 border bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-200 backdrop-blur transition-colors"
                >
                  Export
                </button>
              )}
            </div>

            {editMode && (
              <div className="mt-2 p-2 rounded-xl bg-slate-900/80 border border-slate-700 backdrop-blur max-w-[86vw]">
                <div className="flex flex-wrap gap-1.5">
                  {activeHotspots.map((h) => (
                    <button
                      key={h.key}
                      type="button"
                      onClick={() => setSelectedHotspotKey(h.key)}
                      className={`text-[11px] font-bold rounded-lg px-2 py-1 border transition-colors ${
                        selectedHotspotKey === h.key
                          ? 'bg-indigo-600 border-indigo-300 text-white'
                          : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-slate-300/80 text-[11px]">
                  {selectedHotspotKey
                    ? `Click map to set: ${selectedHotspotKey}`
                    : 'Select a hotspot, then click on the map'}
                </div>
              </div>
            )}
          </div>
        )}

        {mapLevel === 'home' && (
          <button
            type="button"
            onClick={() => setMapLevel('world')}
            className="absolute left-3 bottom-[4.5rem] z-10 w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 backdrop-blur text-white font-bold"
            aria-label="Back to city map"
            title="Back"
          >
            ←
          </button>
        )}
        </div>
      </div>
    </div>
  );
};
