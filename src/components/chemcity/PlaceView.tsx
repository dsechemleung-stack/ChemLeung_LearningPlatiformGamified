import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';
import { ChemCard } from './ChemCard';

const FIXED_SLOT_LAYOUTS: Record<
  string,
  {
    slotPositions?: Record<string, { leftPct: number; topPct: number }>;
    slotLabels?: Record<string, string>;
    slotSizesPx?: Record<string, number>;
  }
> = {
  school: {
    slotPositions: {
      school_desk_1: { leftPct: 44.8, topPct: 82.9 },
      school_desk_2: { leftPct: 39.7, topPct: 48.3 },
      school_desk_3: { leftPct: 24.1, topPct: 34.8 },
      school_desk_4: { leftPct: 92.4, topPct: 29.2 },
      school_desk_5: { leftPct: 39.5, topPct: 33.1 },
      school_locker_1: { leftPct: 66.3, topPct: 43.2 },
      school_locker_2: { leftPct: 88.5, topPct: 68.3 },
    },
    slotLabels: {
      school_desk_1: 'Student Desk 1',
      school_desk_2: 'Teacher Desk',
      school_desk_3: 'Blackboard',
      school_desk_4: 'Science Corner',
      school_desk_5: 'Poster',
      school_locker_1: 'Window-side Table',
      school_locker_2: 'Student Desk 2',
    },
    slotSizesPx: {
      school_desk_1: 64,
    },
  },
  gas_station: {
    slotPositions: {
      gas_pump_1: { leftPct: 24.1, topPct: 61.9 },
      gas_pump_2: { leftPct: 87.9, topPct: 79.1 },
      gas_pump_3: { leftPct: 63.7, topPct: 32.1 },
      gas_pump_4: { leftPct: 61.5, topPct: 57.8 },
      gas_shelf_1: { leftPct: 51.8, topPct: 61 },
      gas_shelf_2: { leftPct: 38.5, topPct: 48.4 },
      gas_shelf_3: { leftPct: 78.4, topPct: 37.2 },
      gas_shelf_4: { leftPct: 85.1, topPct: 17.1 },
    },
    slotLabels: {
      gas_pump_1: 'Car 1',
      gas_pump_2: 'Construction Site',
      gas_pump_3: 'Factory',
      gas_pump_4: 'Petrol Pump',
      gas_shelf_1: 'Car 2',
      gas_shelf_2: 'Motel',
      gas_shelf_3: 'Street Light',
      gas_shelf_4: 'Firework',
    },
  },
  lab: {
    slotPositions: {
      lab_bench_1: { leftPct: 50.7, topPct: 51.3 },
      lab_bench_2: { leftPct: 28.7, topPct: 36 },
      lab_bench_3: { leftPct: 46.4, topPct: 32.2 },
      lab_bench_4: { leftPct: 75.3, topPct: 78.9 },
      lab_bench_5: { leftPct: 81.4, topPct: 10.9 },
      lab_bench_6: { leftPct: 92.2, topPct: 21.3 },
      lab_premium_1: { leftPct: 60.4, topPct: 31.5 },
      lab_premium_2: { leftPct: 50.1, topPct: 84.1 },
      lab_premium_3: { leftPct: 80.5, topPct: 36.7 },
      lab_premium_4: { leftPct: 9.5, topPct: 46.9 },
    },
    slotLabels: {
      lab_bench_1: 'Bench',
      lab_bench_2: 'Fume Hood',
      lab_bench_3: 'Acid & Alkali Cabinet',
      lab_bench_4: 'Apparatus 1',
      lab_bench_5: 'Metal Shelf',
      lab_bench_6: 'Salt Shelf',
      lab_premium_1: 'Hazardous Chemical Shelf',
      lab_premium_2: 'Apparatus 2',
      lab_premium_3: 'Chemical Shelf',
      lab_premium_4: 'Gas Tank',
      lab_premium_5: 'Apparatus 3',
      lab_premium_6: 'Apparatus 4',
    },
  },
  kitchen: {
    slotPositions: {
      kitchen_counter_1: { leftPct: 60.5, topPct: 72.4 },
      kitchen_counter_2: { leftPct: 12.6, topPct: 40.2 },
      kitchen_counter_3: { leftPct: 67, topPct: 44.4 },
      kitchen_counter_4: { leftPct: 28.3, topPct: 88.8 },
      kitchen_shelf_1: { leftPct: 42.3, topPct: 41.2 },
      kitchen_shelf_2: { leftPct: 12.6, topPct: 17.4 },
      kitchen_shelf_3: { leftPct: 88.1, topPct: 87.8 },
      kitchen_shelf_4: { leftPct: 89.6, topPct: 41.2 },
    },
    slotLabels: {
      kitchen_counter_1: 'Cutlery Drawer',
      kitchen_counter_2: 'Pantry 1',
      kitchen_counter_3: 'Stove & Oven',
      kitchen_counter_4: 'Dinette',
      kitchen_shelf_1: 'Fridge',
      kitchen_shelf_2: 'Pantry 2',
      kitchen_shelf_3: 'Base Cabinet',
      kitchen_shelf_4: 'Countertop',
    },
  },
  toilet: {
    slotPositions: {
      toilet_tank_1: { leftPct: 24.1, topPct: 47.6 },
      toilet_tank_2: { leftPct: 40.8, topPct: 83.8 },
      toilet_tank_3: { leftPct: 80.3, topPct: 51.1 },
      toilet_tank_4: { leftPct: 21.3, topPct: 15.4 },
      toilet_cabinet_1: { leftPct: 58.1, topPct: 63.3 },
      toilet_cabinet_2: { leftPct: 37.4, topPct: 48.4 },
      toilet_cabinet_3: { leftPct: 45.5, topPct: 14.6 },
    },
    slotLabels: {
      toilet_tank_1: 'Faucet',
      toilet_tank_2: 'Vanity Cabinet',
      toilet_tank_3: 'Bathtub',
      toilet_tank_4: 'Mirror Cabinet 1',
      toilet_cabinet_1: 'Toilet',
      toilet_cabinet_2: 'Vanity Top',
      toilet_cabinet_3: 'Mirror Cabinet 2',
      toilet_cabinet_4: 'Mirror Cabinet 3',
    },
  },
  garden: {
    slotPositions: {
      garden_bed_1: { leftPct: 20.6, topPct: 47.6 },
      garden_bed_2: { leftPct: 65.2, topPct: 85.8 },
      garden_bed_3: { leftPct: 56.8, topPct: 40.7 },
      garden_bed_4: { leftPct: 76.7, topPct: 45.6 },
      garden_plot_1: { leftPct: 22.3, topPct: 79.1 },
      garden_plot_2: { leftPct: 48.6, topPct: 68.2 },
      garden_plot_3: { leftPct: 20.7, topPct: 18.6 },
    },
    slotLabels: {
      garden_bed_1: 'Shed 1',
      garden_bed_2: 'Lawn',
      garden_bed_3: 'Greenhouse',
      garden_bed_4: 'Flower Bed',
      garden_plot_1: 'Mole Hill',
      garden_plot_2: 'Broadcast Spreader',
      garden_plot_3: 'Shed 2',
      garden_plot_4: 'Garden Plot',
    },
  },
  lifestyle_boutique: {
    slotPositions: {
      boutique_shelf_1: { leftPct: 40.1, topPct: 82.6 },
      boutique_shelf_2: { leftPct: 29.1, topPct: 43.7 },
      boutique_shelf_3: { leftPct: 77.6, topPct: 54.8 },
      boutique_shelf_4: { leftPct: 85.7, topPct: 82.4 },
      boutique_display_1: { leftPct: 86.8, topPct: 27.8 },
      boutique_display_2: { leftPct: 52.8, topPct: 82.6 },
    },
    slotLabels: {
      boutique_shelf_1: 'Poseur Table 1',
      boutique_shelf_2: 'Service Desk',
      boutique_shelf_3: 'Jewellery Display',
      boutique_shelf_4: 'Power Essentials',
      boutique_display_1: 'Apparel Gallery',
      boutique_display_2: 'Poseur Table 2',
    },
  },
  beach: {
    slotPositions: {
      beach_sand_1: { leftPct: 60.1, topPct: 14.6 },
      beach_sand_2: { leftPct: 81.7, topPct: 37.2 },
      beach_sand_3: { leftPct: 13.2, topPct: 40.7 },
      beach_sand_4: { leftPct: 33.7, topPct: 76.6 },
      beach_pier_1: { leftPct: 72.3, topPct: 68.2 },
      beach_pier_2: { leftPct: 36.1, topPct: 44.6 },
      beach_pier_3: { leftPct: 27.7, topPct: 23.3 },
    },
    slotLabels: {
      beach_sand_1: 'Sky',
      beach_sand_2: 'Sea',
      beach_sand_3: 'Rock 1',
      beach_sand_4: 'Dry Sand',
      beach_pier_1: 'Strandline',
      beach_pier_2: 'Rock 2',
      beach_pier_3: 'Cliffside',
      beach_pier_4: 'Pier',
    },
  },
};

export const PlaceView: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const places = useChemCityStore((s) => s.places);
  const slimItems = useChemCityStore((s) => s.slimItems);
  const selectedPlaceId = useChemCityStore((s) => s.selectedPlaceId);
  const openCardPicker = useChemCityStore((s) => s.openCardPicker);
  const openCardDetail = useChemCityStore((s) => s.openCardDetail);
  const unlockSlot = useChemCityStore((s) => s.unlockSlot);

  const [unlockingSlotId, setUnlockingSlotId] = useState<string | null>(null);
  const [editSlotsMode, setEditSlotsMode] = useState(false);
  const [selectedSlotIdForEdit, setSelectedSlotIdForEdit] = useState<string | null>(null);
  const [slotPositions, setSlotPositions] = useState<Record<string, { leftPct: number; topPct: number }>>({});
  const [slotLabels, setSlotLabels] = useState<Record<string, string>>({});
  const [slotSizesPx, setSlotSizesPx] = useState<Record<string, number>>({});

  const placeImageRef = useRef<HTMLImageElement | null>(null);
  const [placeImageNaturalWidth, setPlaceImageNaturalWidth] = useState<number>(0);
  const [placeImageRenderedWidth, setPlaceImageRenderedWidth] = useState<number>(0);

  const place = useMemo(() => places.find((p) => p.id === selectedPlaceId) ?? null, [places, selectedPlaceId]);
  if (!place || !user) return null;

  const fixedLayout = FIXED_SLOT_LAYOUTS[place.id] ?? null;
  const isDevEditorEnabled = false;

  const placeImageSrc = (() => {
    switch (place.id) {
      case 'toilet':
        return '/Place1_Toilet.png';
      case 'kitchen':
        return '/Place2_Kitchen.png';
      case 'beach':
        return '/Place3_Beach.png';
      case 'gas_station':
        return '/Place4_GasStation.png';
      case 'lab':
        return '/Place5_Lab.png';
      case 'garden':
        return '/Place6_Garden.png';
      case 'lifestyle_boutique':
        return '/Place7_Boutique.png';
      case 'school':
        return '/Place8_School.png';
      default:
        return null;
    }
  })();

  useEffect(() => {
    const img = placeImageRef.current;
    if (!img) return;

    const updateRendered = () => {
      const rect = img.getBoundingClientRect();
      setPlaceImageRenderedWidth(rect.width);
    };

    updateRendered();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateRendered());
      ro.observe(img);
    } else {
      window.addEventListener('resize', updateRendered);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', updateRendered);
    };
  }, [placeImageSrc, selectedPlaceId]);

  const slotSizeScale =
    placeImageNaturalWidth > 0 && placeImageRenderedWidth > 0
      ? placeImageRenderedWidth / placeImageNaturalWidth
      : 1;

  const tunedSlotSizeScale = slotSizeScale * 1.35;

  const effectiveSlotPositions = (isDevEditorEnabled && editSlotsMode ? slotPositions : fixedLayout?.slotPositions) ?? slotPositions;
  const effectiveSlotLabels = (isDevEditorEnabled && editSlotsMode ? slotLabels : fixedLayout?.slotLabels) ?? slotLabels;
  const effectiveSlotSizesPx = (isDevEditorEnabled && editSlotsMode ? slotSizesPx : fixedLayout?.slotSizesPx) ?? slotSizesPx;

  const exportSlotCoords = async () => {
    const payload = {
      placeId: place.id,
      slots: place.slots.map((s) => ({
        slotId: s.slotId,
        label: slotLabels[s.slotId] || undefined,
        sizePx: slotSizesPx[s.slotId] || undefined,
        ...(slotPositions[s.slotId] ? slotPositions[s.slotId] : {}),
      })),
    };

    const text = JSON.stringify(payload, null, 2);
    console.log('[PlaceView] Slot coords export:\n' + text);

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // ignore clipboard errors
    }
  };

  const coins = user.currencies.coins;
  const diamonds = user.currencies.diamonds;

  const isPlaceUnlocked = place.unlockCost === 0 || user.unlockedPlaces.includes(place.id);

  const handleUnlockSlot = async (slotId: string) => {
    setUnlockingSlotId(slotId);
    try {
      await unlockSlot(place.id, slotId);
    } finally {
      setUnlockingSlotId(null);
    }
  };

  const skillValue = (() => {
    switch (place.id) {
      case 'garden':
        return `${user.activeBonuses.passiveBaseCoinsPerHour.toLocaleString()} 🪙/hr`;
      case 'lab':
        return `${user.activeBonuses.passiveMultiplier.toFixed(1)}× multiplier`;
      case 'kitchen':
        return `+${user.activeBonuses.quizFlatDiamondBonus} 💎 max bonus`;
      case 'school':
        return `${user.activeBonuses.quizDiamondMultiplier.toFixed(1)}× quiz diamonds`;
      case 'beach':
        return `${user.activeBonuses.quizDoubleChancePercent}% double chance`;
      case 'toilet':
        return `${user.activeBonuses.dailyLoginDiamonds} 💎 daily`;
      case 'gas_station':
        return `${user.activeBonuses.extraSlotsTotal} bonus slots`;
      case 'lifestyle_boutique':
        return `${user.activeBonuses.shopDiscountPercent}% store discount`;
      default:
        return '—';
    }
  })();

  return (
    <div className="flex flex-col min-h-0">
      <div className="mx-4 mt-3 mb-2 bg-slate-800 border border-slate-600 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{place.emoji}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-white font-bold text-base leading-tight">{place.displayName}</h2>
            <p className="text-slate-400 text-xs">{place.skill.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-indigo-300 font-bold text-sm">{skillValue}</p>
            <p className="text-slate-500 text-xs">
              {place.slots.filter((s) => !!user.equipped?.[s.slotId]).length}/{place.slots.length} cards
            </p>
          </div>
        </div>

        {isDevEditorEnabled && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setEditSlotsMode((v) => !v);
                setSelectedSlotIdForEdit(null);
                if (!editSlotsMode) {
                  setSlotPositions(fixedLayout?.slotPositions ?? {});
                  setSlotLabels(fixedLayout?.slotLabels ?? {});
                  setSlotSizesPx(fixedLayout?.slotSizesPx ?? {});
                }
              }}
              className={`text-xs font-bold rounded-lg px-3 py-2 border transition-colors ${
                editSlotsMode
                  ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-300 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {editSlotsMode ? 'Editing Slots' : 'Edit slots'}
            </button>

            {editSlotsMode && (
              <button
                type="button"
                onClick={() => exportSlotCoords()}
                className="text-xs font-bold rounded-lg px-3 py-2 border bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 transition-colors"
              >
                Export coords
              </button>
            )}
          </div>
        )}

        {isDevEditorEnabled && editSlotsMode && (
          <div className="mt-2 flex flex-wrap gap-2">
            {place.slots.map((s) => (
              <button
                key={s.slotId}
                type="button"
                onClick={() => setSelectedSlotIdForEdit(s.slotId)}
                className={`text-[11px] font-bold rounded-lg px-2 py-1 border transition-colors ${
                  selectedSlotIdForEdit === s.slotId
                    ? 'bg-indigo-600 border-indigo-300 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {s.slotId}
              </button>
            ))}
            <div className="ml-auto text-slate-400 text-xs">
              {selectedSlotIdForEdit
                ? `Click image to set ${selectedSlotIdForEdit}`
                : 'Select a slotId to place'}
            </div>
          </div>
        )}

        {isDevEditorEnabled && editSlotsMode && selectedSlotIdForEdit && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-slate-400 text-xs shrink-0">Label</span>
            <input
              value={slotLabels[selectedSlotIdForEdit] ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setSlotLabels((prev) => ({ ...prev, [selectedSlotIdForEdit]: value }));
              }}
              placeholder="e.g. Front desk"
              className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-400"
            />
          </div>
        )}

        {isDevEditorEnabled && editSlotsMode && selectedSlotIdForEdit && (
          <div className="mt-2 flex items-center gap-3">
            <span className="text-slate-400 text-xs shrink-0">Size</span>
            <input
              type="range"
              min={32}
              max={120}
              value={slotSizesPx[selectedSlotIdForEdit] ?? 64}
              onChange={(e) => {
                const v = Number(e.target.value || 64);
                setSlotSizesPx((prev) => ({ ...prev, [selectedSlotIdForEdit]: v }));
              }}
              className="flex-1"
            />
            <span className="text-slate-400 text-xs w-10 text-right">
              {slotSizesPx[selectedSlotIdForEdit] ?? 64}px
            </span>
          </div>
        )}
      </div>

      {placeImageSrc && (
        <div className="mx-4 mb-3">
          <div
            className="relative w-full max-w-5xl mx-auto"
            onClick={(e) => {
              if (!isDevEditorEnabled) return;
              if (!editSlotsMode) return;
              if (!selectedSlotIdForEdit) return;

              const target = e.currentTarget;
              const rect = target.getBoundingClientRect();
              const leftPct = ((e.clientX - rect.left) / rect.width) * 100;
              const topPct = ((e.clientY - rect.top) / rect.height) * 100;
              const leftRounded = Math.round(leftPct * 10) / 10;
              const topRounded = Math.round(topPct * 10) / 10;

              setSlotPositions((prev) => ({
                ...prev,
                [selectedSlotIdForEdit]: { leftPct: leftRounded, topPct: topRounded },
              }));

              console.log(
                `[PlaceView] ${place.id} set ${selectedSlotIdForEdit}: leftPct=${leftRounded}, topPct=${topRounded}`,
              );
            }}
          >
            <img
              src={placeImageSrc}
              alt={place.displayName}
              ref={placeImageRef}
              className="w-full h-auto rounded-2xl border border-slate-700 bg-slate-950"
              loading="lazy"
              onLoad={(e) => {
                const el = e.currentTarget;
                if (el.naturalWidth) setPlaceImageNaturalWidth(el.naturalWidth);
              }}
            />

            {place.slots.map((slot) => {
              const slotId = slot.slotId;
              const pos = effectiveSlotPositions[slotId];
              if (!pos) return null;

              const baseSizePx = effectiveSlotSizesPx[slotId] ?? 64;
              const sizePx = Math.max(44, Math.min(110, Math.round(baseSizePx * tunedSlotSizeScale)));
              const equippedItemId = user.equipped?.[slotId];
              const slimItem = equippedItemId ? slimItems.find((i) => i.id === equippedItemId) : undefined;

              const isFreeSlot = slot.unlockCost == null;
              const isUnlockedSlot = isFreeSlot || user.unlockedSlots.includes(slotId);
              const isLocked = isPlaceUnlocked && !isUnlockedSlot;

              const label = effectiveSlotLabels[slotId]?.trim() ? effectiveSlotLabels[slotId] : slotId;

              return (
                <button
                  key={slotId}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDevEditorEnabled && editSlotsMode) {
                      setSelectedSlotIdForEdit(slotId);
                      return;
                    }
                    if (isLocked) return;
                    openCardPicker(slotId);
                  }}
                  title={label}
                  aria-label={label}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed flex items-center justify-center shadow transition-all active:scale-95 ${
                    isLocked
                      ? 'bg-slate-900/70 border-slate-700 text-slate-500 cursor-not-allowed'
                      : isDevEditorEnabled && editSlotsMode && selectedSlotIdForEdit === slotId
                        ? 'bg-indigo-600/60 border-indigo-300 text-white'
                        : 'bg-slate-900/60 border-slate-300/60 text-white hover:border-indigo-300'
                  }`}
                  style={{ left: `${pos.leftPct}%`, top: `${pos.topPct}%`, width: sizePx, height: sizePx }}
                >
                  {isLocked ? (
                    <span className="text-xs font-bold">🔒</span>
                  ) : slimItem ? (
                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                      {slimItem.imageUrl ? (
                        <img
                          src={slimItem.imageUrl}
                          alt={slimItem.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(ev) => {
                            (ev.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-2xl">{slimItem.emoji}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-3xl font-bold leading-none">+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isPlaceUnlocked && (
        <div className="mx-4 mb-3 bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-400 text-sm">
          This place is locked. Return to the map to unlock it.
        </div>
      )}

      <div className="flex flex-wrap gap-3 px-4 pb-4 overflow-y-auto justify-center">
        {place.slots.map((slot) => {
          const slotId = slot.slotId;
          const equippedItemId = user.equipped?.[slotId];
          const slimItem = equippedItemId ? slimItems.find((i) => i.id === equippedItemId) : undefined;

          const isFreeSlot = slot.unlockCost == null;
          const isUnlockedSlot = isFreeSlot || user.unlockedSlots.includes(slotId);
          const isLocked = isPlaceUnlocked && !isUnlockedSlot;

          const canAfford = slot.unlockCurrency === 'diamonds'
            ? diamonds >= (slot.unlockCost ?? 0)
            : coins >= (slot.unlockCost ?? 0);

          if (isLocked) {
            const costLabel = slot.unlockCurrency === 'diamonds'
              ? `${slot.unlockCost?.toLocaleString() ?? 0} 💎`
              : `${slot.unlockCost?.toLocaleString() ?? 0} 🪙`;

            return (
              <div key={slotId} className="flex flex-col items-center gap-1">
                <div className="w-28 h-40 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 p-2">
                  <span className="text-2xl">🔒</span>
                  <p className="text-slate-500 text-xs text-center">{costLabel}</p>
                  <button
                    onClick={() => handleUnlockSlot(slotId)}
                    disabled={!canAfford || unlockingSlotId === slotId}
                    className={`text-xs font-bold rounded-lg px-2 py-1 transition-all ${
                      canAfford && unlockingSlotId !== slotId
                        ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {unlockingSlotId === slotId ? '...' : 'Unlock'}
                  </button>
                </div>
                <span className="text-slate-600 text-xs truncate max-w-[7rem]">{slotId}</span>
              </div>
            );
          }

          if (slimItem) {
            return (
              <div key={slotId} className="flex flex-col items-center gap-1">
                <ChemCard
                  item={slimItem}
                  size="md"
                  isEquipped
                  onClick={() => openCardDetail(slimItem.id)}
                />
                <button
                  onClick={() => openCardPicker(slotId)}
                  className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
                >
                  Change
                </button>
              </div>
            );
          }

          return (
            <div key={slotId} className="flex flex-col items-center gap-1">
              <button
                onClick={() => openCardPicker(slotId)}
                className="w-28 h-40 rounded-xl bg-slate-800 border-2 border-dashed border-slate-600 hover:border-indigo-500 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-400 transition-all active:scale-95"
              >
                <span className="text-3xl">+</span>
                <span className="text-xs">Equip</span>
              </button>
              <span className="text-slate-500 text-xs truncate max-w-[7rem]">{slotId}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
