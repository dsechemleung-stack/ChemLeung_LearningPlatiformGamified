// ==============================
// FILE: src/components/chemcity/PlaceView.tsx
// ==============================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChemCityStore } from '../../store/chemcityStore';
import { ChemCard } from './ChemCard';

function needsAnonymousCrossOrigin(url?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes('drive.google.com') || u.includes('googleusercontent.com');
}

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
      school_student_desk_1: { leftPct: 44.8, topPct: 82.9 },
      school_teacher_desk: { leftPct: 39.7, topPct: 48.3 },
      school_blackboard: { leftPct: 24.1, topPct: 34.8 },
      school_science_corner: { leftPct: 92.4, topPct: 29.2 },
      school_poster: { leftPct: 39.5, topPct: 33.1 },
      school_window_side_table: { leftPct: 66.3, topPct: 43.2 },
      school_student_desk_2: { leftPct: 88.5, topPct: 68.3 },
    },
    slotLabels: {
      school_student_desk_1: 'Student Desk 1',
      school_teacher_desk: 'Teacher Desk',
      school_blackboard: 'Blackboard',
      school_science_corner: 'Science Corner',
      school_poster: 'Poster',
      school_window_side_table: 'Window-side Table',
      school_student_desk_2: 'Student Desk 2',
    },
    slotSizesPx: {
      school_student_desk_1: 64,
    },
  },
  gas_station: {
    slotPositions: {
      gas_station_car_1: { leftPct: 24.1, topPct: 61.9 },
      gas_station_construction_site: { leftPct: 87.9, topPct: 79.1 },
      gas_station_factory: { leftPct: 63.7, topPct: 32.1 },
      gas_station_petrol_pump: { leftPct: 61.5, topPct: 57.8 },
      gas_station_car_2: { leftPct: 51.8, topPct: 61 },
      gas_station_motel: { leftPct: 38.5, topPct: 48.4 },
      gas_station_street_light: { leftPct: 78.4, topPct: 37.2 },
      gas_station_firework: { leftPct: 85.1, topPct: 17.1 },
    },
    slotLabels: {
      gas_station_car_1: 'Car 1',
      gas_station_construction_site: 'Construction Site',
      gas_station_factory: 'Factory',
      gas_station_petrol_pump: 'Petrol Pump',
      gas_station_car_2: 'Car 2',
      gas_station_motel: 'Motel',
      gas_station_street_light: 'Street Light',
      gas_station_firework: 'Firework',
    },
  },
  lab: {
    slotPositions: {
      lab_bench: { leftPct: 50.7, topPct: 51.3 },
      lab_fume_hood: { leftPct: 28.7, topPct: 36 },
      lab_acid_alkali_cabinet: { leftPct: 46.4, topPct: 32.2 },
      lab_apparatus_1: { leftPct: 75.3, topPct: 78.9 },
      lab_metal_shelf: { leftPct: 81.4, topPct: 10.9 },
      lab_salt_shelf: { leftPct: 92.2, topPct: 21.3 },
      lab_hazardous_chemical_shelf: { leftPct: 60.4, topPct: 31.5 },
      lab_apparatus_2: { leftPct: 50.1, topPct: 84.1 },
      lab_chemical_shelf: { leftPct: 80.5, topPct: 36.7 },
      lab_gas_tank: { leftPct: 9.5, topPct: 46.9 },
    },
    slotLabels: {
      lab_bench: 'Bench',
      lab_fume_hood: 'Fume Hood',
      lab_acid_alkali_cabinet: 'Acid & Alkali Cabinet',
      lab_apparatus_1: 'Apparatus 1',
      lab_metal_shelf: 'Metal Shelf',
      lab_salt_shelf: 'Salt Shelf',
      lab_hazardous_chemical_shelf: 'Hazardous Chemical Shelf',
      lab_apparatus_2: 'Apparatus 2',
      lab_chemical_shelf: 'Chemical Shelf',
      lab_gas_tank: 'Gas Tank',
    },
  },
  kitchen: {
    slotPositions: {
      kitchen_cutlery_drawer: { leftPct: 60.5, topPct: 72.4 },
      kitchen_pantry_1: { leftPct: 12.6, topPct: 40.2 },
      kitchen_stove_oven: { leftPct: 67, topPct: 44.4 },
      kitchen_dinette: { leftPct: 28.3, topPct: 88.8 },
      kitchen_fridge: { leftPct: 42.3, topPct: 41.2 },
      kitchen_pantry_2: { leftPct: 12.6, topPct: 17.4 },
      kitchen_base_cabinet: { leftPct: 88.1, topPct: 87.8 },
      kitchen_countertop: { leftPct: 89.6, topPct: 41.2 },
    },
    slotLabels: {
      kitchen_cutlery_drawer: 'Cutlery Drawer',
      kitchen_pantry_1: 'Pantry 1',
      kitchen_stove_oven: 'Stove & Oven',
      kitchen_dinette: 'Dinette',
      kitchen_fridge: 'Fridge',
      kitchen_pantry_2: 'Pantry 2',
      kitchen_base_cabinet: 'Base Cabinet',
      kitchen_countertop: 'Countertop',
    },
  },
  toilet: {
    slotPositions: {
      toilet_faucet: { leftPct: 24.1, topPct: 47.6 },
      toilet_vanity_cabinet: { leftPct: 40.8, topPct: 83.8 },
      toilet_bathtub: { leftPct: 80.3, topPct: 51.1 },
      toilet_mirror_cabinet_1: { leftPct: 21.3, topPct: 15.4 },
      toilet_toilet: { leftPct: 58.1, topPct: 63.3 },
      toilet_vanity_top: { leftPct: 37.4, topPct: 48.4 },
      toilet_mirror_cabinet_2: { leftPct: 45.5, topPct: 14.6 },
    },
    slotLabels: {
      toilet_faucet: 'Faucet',
      toilet_vanity_cabinet: 'Vanity Cabinet',
      toilet_bathtub: 'Bathtub',
      toilet_mirror_cabinet_1: 'Mirror Cabinet 1',
      toilet_toilet: 'Toilet',
      toilet_vanity_top: 'Vanity Top',
      toilet_mirror_cabinet_2: 'Mirror Cabinet 2',
    },
  },
  garden: {
    slotPositions: {
      garden_shed_1: { leftPct: 20.6, topPct: 47.6 },
      garden_lawn: { leftPct: 65.2, topPct: 85.8 },
      garden_greenhouse: { leftPct: 56.8, topPct: 40.7 },
      garden_flower_bed: { leftPct: 76.7, topPct: 45.6 },
      garden_mole_hill: { leftPct: 22.3, topPct: 79.1 },
      garden_broadcast_spreader: { leftPct: 48.6, topPct: 68.2 },
      garden_shed_2: { leftPct: 20.7, topPct: 18.6 },
    },
    slotLabels: {
      garden_shed_1: 'Shed 1',
      garden_lawn: 'Lawn',
      garden_greenhouse: 'Greenhouse',
      garden_flower_bed: 'Flower Bed',
      garden_mole_hill: 'Mole Hill',
      garden_broadcast_spreader: 'Broadcast Spreader',
      garden_shed_2: 'Shed 2',
    },
  },
  lifestyle_boutique: {
    slotPositions: {
      lifestyle_boutique_poseur_table_1: { leftPct: 40.1, topPct: 82.6 },
      lifestyle_boutique_service_desk: { leftPct: 29.1, topPct: 43.7 },
      lifestyle_boutique_jewellery_display: { leftPct: 77.6, topPct: 54.8 },
      lifestyle_boutique_power_essentials: { leftPct: 85.7, topPct: 82.4 },
      lifestyle_boutique_apparel_gallery: { leftPct: 86.8, topPct: 27.8 },
      lifestyle_boutique_poseur_table_2: { leftPct: 52.8, topPct: 82.6 },
    },
    slotLabels: {
      lifestyle_boutique_poseur_table_1: 'Poseur Table 1',
      lifestyle_boutique_service_desk: 'Service Desk',
      lifestyle_boutique_jewellery_display: 'Jewellery Display',
      lifestyle_boutique_power_essentials: 'Power Essentials',
      lifestyle_boutique_apparel_gallery: 'Apparel Gallery',
      lifestyle_boutique_poseur_table_2: 'Poseur Table 2',
    },
  },
  beach: {
    slotPositions: {
      beach_sky: { leftPct: 60.1, topPct: 14.6 },
      beach_sea: { leftPct: 81.7, topPct: 37.2 },
      beach_rock_1: { leftPct: 13.2, topPct: 40.7 },
      beach_dry_sand: { leftPct: 33.7, topPct: 76.6 },
      beach_strandline: { leftPct: 72.3, topPct: 68.2 },
      beach_rock_2: { leftPct: 36.1, topPct: 44.6 },
      beach_cliffside: { leftPct: 27.7, topPct: 23.3 },
    },
    slotLabels: {
      beach_sky: 'Sky',
      beach_sea: 'Sea',
      beach_rock_1: 'Rock 1',
      beach_dry_sand: 'Dry Sand',
      beach_strandline: 'Strandline',
      beach_rock_2: 'Rock 2',
      beach_cliffside: 'Cliffside',
    },
  },
};

// ─── Compact equip strip slot item ───────────────────────────────────────────
interface StripSlotProps {
  slotId: string;
  label: string;
  isLocked: boolean;
  isUnlocking: boolean;
  canAfford: boolean;
  costLabel: string;
  slimItem: { id: string; name: string; emoji: string; imageUrl?: string } | undefined;
  onEquip: () => void;
  onUnlock: () => void;
  onDetail: (id: string) => void;
}

const StripSlot: React.FC<StripSlotProps> = ({
  slotId,
  label,
  isLocked,
  isUnlocking,
  canAfford,
  costLabel,
  slimItem,
  onEquip,
  onUnlock,
  onDetail,
}) => {
  if (isLocked) {
    return (
      <div className="flex flex-col items-center gap-1 shrink-0">
        <button
          onClick={canAfford ? onUnlock : undefined}
          disabled={!canAfford || isUnlocking}
          className={`
            w-14 h-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95
            ${canAfford && !isUnlocking
              ? 'bg-yellow-500/10 border-yellow-500/60 hover:bg-yellow-500/20 cursor-pointer'
              : 'bg-slate-900/60 border-slate-700 cursor-not-allowed opacity-60'
            }
          `}
          title={`Unlock for ${costLabel}`}
        >
          <span className="text-base leading-none">{isUnlocking ? '⏳' : '🔒'}</span>
          <span className="text-[9px] text-slate-400 leading-none">{costLabel}</span>
        </button>
        <span className="text-[10px] text-slate-600 max-w-[3.5rem] truncate text-center leading-tight">
          {label}
        </span>
      </div>
    );
  }

  if (slimItem) {
    return (
      <div className="flex flex-col items-center gap-1 shrink-0">
        <button
          onClick={() => onDetail(slimItem.id)}
          className="
            w-14 h-14 rounded-xl border-2 border-indigo-500/70
            overflow-hidden bg-slate-800
            hover:border-indigo-400 transition-all active:scale-95
            relative
          "
          title={slimItem.name}
        >
          {slimItem.imageUrl ? (
            <img
              src={slimItem.imageUrl}
              alt={slimItem.name}
              className="w-full h-full object-cover"
              {...(needsAnonymousCrossOrigin(slimItem.imageUrl)
                ? { crossOrigin: 'anonymous' as const, referrerPolicy: 'no-referrer' as const }
                : {})}
              loading="lazy"
              onError={(ev) => {
                (ev.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-2xl flex items-center justify-center w-full h-full">
              {slimItem.emoji}
            </span>
          )}
          {/* Change indicator */}
          <span
            className="
              absolute bottom-0 right-0
              w-4 h-4 rounded-tl-md
              bg-slate-900/80 text-[8px]
              flex items-center justify-center text-indigo-300
            "
            onClick={(e) => { e.stopPropagation(); onEquip(); }}
          >
            ✎
          </span>
        </button>
        <span className="text-[10px] text-slate-400 max-w-[3.5rem] truncate text-center leading-tight">
          {label}
        </span>
      </div>
    );
  }

  // Empty slot
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <button
        onClick={onEquip}
        className="
          w-14 h-14 rounded-xl border-2 border-dashed border-slate-600
          bg-slate-800/60 hover:bg-slate-700/60 hover:border-indigo-500
          flex items-center justify-center
          text-slate-500 hover:text-indigo-400
          transition-all active:scale-95
        "
        title={`Equip card to ${label}`}
      >
        <span className="text-xl font-bold leading-none">+</span>
      </button>
      <span className="text-[10px] text-slate-500 max-w-[3.5rem] truncate text-center leading-tight">
        {label}
      </span>
    </div>
  );
};

// ─── Main PlaceView ───────────────────────────────────────────────────────────
export const PlaceView: React.FC = () => {
  const user = useChemCityStore((s) => s.user);
  const places = useChemCityStore((s) => s.places);
  const slimItems = useChemCityStore((s) => s.slimItems);
  const selectedPlaceId = useChemCityStore((s) => s.selectedPlaceId);
  const openCardPicker = useChemCityStore((s) => s.openCardPicker);
  const openCardDetail = useChemCityStore((s) => s.openCardDetail);
  const unlockSlot = useChemCityStore((s) => s.unlockSlot);
  const navigateToGasStationDistributor = useChemCityStore((s) => s.navigateToGasStationDistributor);

  const [unlockingSlotId, setUnlockingSlotId] = useState<string | null>(null);

  // Dev editor (disabled in production)
  const isDevEditorEnabled = false;
  const [editSlotsMode, setEditSlotsMode] = useState(false);
  const [selectedSlotIdForEdit, setSelectedSlotIdForEdit] = useState<string | null>(null);
  const [slotPositions, setSlotPositions] = useState<Record<string, { leftPct: number; topPct: number }>>({});
  const [slotLabels, setSlotLabels] = useState<Record<string, string>>({});
  const [slotSizesPx, setSlotSizesPx] = useState<Record<string, number>>({});

  const placeImageRef = useRef<HTMLImageElement | null>(null);
  const [placeImageNaturalWidth, setPlaceImageNaturalWidth] = useState<number>(0);
  const [placeImageRenderedWidth, setPlaceImageRenderedWidth] = useState<number>(0);
  const placeStageRef = useRef<HTMLDivElement | null>(null);
  const [placeImageLayout, setPlaceImageLayout] = useState<{ offsetX: number; offsetY: number; w: number; h: number }>(
    { offsetX: 0, offsetY: 0, w: 0, h: 0 },
  );

  const place = useMemo(
    () => places.find((p) => p.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  );

  if (!place || !user) return null;

  const fixedLayout = FIXED_SLOT_LAYOUTS[place.id] ?? null;

  const placeImageSrc = (() => {
    switch (place.id) {
      case 'toilet':           return '/Place1_Toilet.png';
      case 'kitchen':          return '/Place2_Kitchen.png';
      case 'beach':            return '/Place3_Beach.png';
      case 'gas_station':      return '/Place4_GasStation.png';
      case 'lab':              return '/Place5_Lab.png';
      case 'garden':           return '/Place6_Garden.png';
      case 'lifestyle_boutique': return '/Place7_Boutique.png';
      case 'school':           return '/Place8_School.png';
      default:                 return null;
    }
  })();

  // Track rendered image rect for slot sizing + positioning
  useEffect(() => {
    const img = placeImageRef.current;
    const stage = placeStageRef.current;
    if (!img || !stage) return;

    const updateRendered = () => {
      const imgRect = img.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      setPlaceImageRenderedWidth(imgRect.width);
      setPlaceImageLayout({
        offsetX: imgRect.left - stageRect.left,
        offsetY: imgRect.top - stageRect.top,
        w: imgRect.width,
        h: imgRect.height,
      });
    };

    updateRendered();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateRendered());
      ro.observe(stage);
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

  const effectiveSlotPositions =
    (isDevEditorEnabled && editSlotsMode ? slotPositions : fixedLayout?.slotPositions) ?? slotPositions;
  const effectiveSlotLabels =
    (isDevEditorEnabled && editSlotsMode ? slotLabels : fixedLayout?.slotLabels) ?? slotLabels;
  const effectiveSlotSizesPx =
    (isDevEditorEnabled && editSlotsMode ? slotSizesPx : fixedLayout?.slotSizesPx) ?? slotSizesPx;

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
    } catch { /* ignore */ }
  };

  const coins = user.currencies.coins;
  const diamonds = user.currencies.diamonds;
  const isPlaceUnlocked = place.unlockCost === 0 || user.unlockedPlaces.includes(place.id);

  const handleUnlockSlot = async (slotId: string) => {
    const slot = place.slots.find((s) => s.slotId === slotId);
    if (slot?.budgetOnly) {
      navigateToGasStationDistributor();
      return;
    }

    setUnlockingSlotId(slotId);
    try {
      await unlockSlot(place.id, slotId);
    } finally {
      setUnlockingSlotId(null);
    }
  };

  const skillValue = (() => {
    switch (place.id) {
      case 'garden':     return `${user.activeBonuses.passiveBaseCoinsPerHour.toLocaleString()} 🪙/hr`;
      case 'lab':        return `${user.activeBonuses.passiveMultiplier.toFixed(1)}× multiplier`;
      case 'kitchen':    return `+${user.activeBonuses.quizFlatDiamondBonus} 💎 max bonus`;
      case 'school':     return `${user.activeBonuses.quizDiamondMultiplier.toFixed(1)}× quiz diamonds`;
      case 'beach':      return `${user.activeBonuses.quizDoubleChancePercent}% double chance`;
      case 'toilet':     return `${user.activeBonuses.dailyLoginDiamonds} 💎 daily`;
      case 'gas_station': return `${user.activeBonuses.extraSlotsTotal} bonus slots`;
      case 'lifestyle_boutique': return `${user.activeBonuses.shopDiscountPercent}% store discount`;
      default:           return '—';
    }
  })();

  const equippedCount = place.slots.filter((s) => !!user.equipped?.[s.slotId]).length;

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYOUT
  //
  //  The outer wrapper fills the full viewport height.
  //  pt-[76px] pushes content below the fixed main site header.
  //  flex-col + overflow-hidden = no page scroll ever.
  //
  //   ┌───────────────────────────────────┐  ← 76px (main header, behind)
  //   │  IMAGE  (flex-1, maximised)       │
  //   │  ┌── info overlay (bottom) ──┐   │
  //   │  └───────────────────────────┘   │
  //   ├───────────────────────────────────┤
  //   │  EQUIP STRIP (shrink-0, ~90px)    │
  //   └───────────────────────────────────┘
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100vh', paddingTop: 76 }}
    >
      {/* ── Image area (flex-1) ── */}
      {placeImageSrc ? (
        <div className="flex-1 flex justify-center items-stretch overflow-hidden px-3 pt-2 pb-1 min-h-0">
          {/*
            Inner wrapper sizes to the image naturally.
            - h-full: fills flex-1 height
            - width: fit-content + max-w-full: stays inside horizontal bounds
            - Slots and overlay are positioned relative to this wrapper,
              which exactly matches the rendered image dimensions.
          */}
          <div
            ref={placeStageRef}
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => {
              if (!isDevEditorEnabled || !editSlotsMode || !selectedSlotIdForEdit) return;
              const target = e.currentTarget;
              const rect = target.getBoundingClientRect();
              const leftPct = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
              const topPct = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
              setSlotPositions((prev) => ({
                ...prev,
                [selectedSlotIdForEdit]: { leftPct, topPct },
              }));
              console.log(`[PlaceView] ${place.id} set ${selectedSlotIdForEdit}: leftPct=${leftPct}, topPct=${topPct}`);
            }}
          >
            <img
              src={placeImageSrc}
              alt={place.displayName}
              ref={placeImageRef}
              className="max-w-full max-h-full w-auto h-auto rounded-2xl border border-slate-700 bg-slate-950 block"
              loading="lazy"
              onLoad={(e) => {
                const el = e.currentTarget;
                if (el.naturalWidth) setPlaceImageNaturalWidth(el.naturalWidth);
                const rect = el.getBoundingClientRect();
                setPlaceImageRenderedWidth(rect.width);
              }}
            />

            {/* ── Slot overlay buttons ── */}
            {place.slots.map((slot) => {
              const slotId = slot.slotId;
              const pos = effectiveSlotPositions[slotId];
              if (!pos) return null;

              const baseSizePx = effectiveSlotSizesPx[slotId] ?? 64;
              const sizePx = Math.max(38, Math.min(100, Math.round(baseSizePx * tunedSlotSizeScale)));

              const equippedItemId = user.equipped?.[slotId];
              const slimItem = equippedItemId ? slimItems.find((i) => i.id === equippedItemId) : undefined;

              const isFreeSlot = slot.unlockCost == null && !slot.budgetOnly;
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
                  className={`
                    absolute -translate-x-1/2 -translate-y-1/2
                    rounded-full border-2 border-dashed
                    flex items-center justify-center
                    shadow-lg shadow-black/40
                    transition-all active:scale-95
                    ${isLocked
                      ? 'bg-slate-900/70 border-slate-700 text-slate-500 cursor-not-allowed'
                      : isDevEditorEnabled && editSlotsMode && selectedSlotIdForEdit === slotId
                        ? 'bg-indigo-600/60 border-indigo-300 text-white'
                        : 'bg-slate-900/60 border-slate-300/60 text-white hover:border-indigo-300 hover:bg-slate-800/70'
                    }
                  `}
                  style={{
                    left:
                      placeImageLayout.w > 0
                        ? placeImageLayout.offsetX + (pos.leftPct / 100) * placeImageLayout.w
                        : `${pos.leftPct}%`,
                    top:
                      placeImageLayout.h > 0
                        ? placeImageLayout.offsetY + (pos.topPct / 100) * placeImageLayout.h
                        : `${pos.topPct}%`,
                    width: sizePx,
                    height: sizePx,
                  }}
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
                          {...(needsAnonymousCrossOrigin(slimItem.imageUrl)
                            ? { crossOrigin: 'anonymous' as const, referrerPolicy: 'no-referrer' as const }
                            : {})}
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

            {/* ── Place info overlay (bottom of image) ── */}
            <div className="
              absolute bottom-2 left-2 right-2
              flex items-center justify-between gap-2
              bg-slate-900/85 backdrop-blur-md
              rounded-xl px-3 py-2
              border border-slate-700/60
              pointer-events-none
            ">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-2xl leading-none">{place.emoji}</span>
                <div className="min-w-0">
                  <h2 className="text-white font-bold text-sm leading-tight truncate">
                    {place.displayName}
                  </h2>
                  <p className="text-slate-400 text-xs truncate leading-tight">
                    {place.skill.description}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-indigo-300 font-bold text-sm leading-tight">{skillValue}</p>
                <p className="text-slate-500 text-xs leading-tight">
                  {equippedCount}/{place.slots.length} cards
                </p>
              </div>
            </div>

            {/* Locked place notice (overlay) */}
            {!isPlaceUnlocked && (
              <div className="
                absolute inset-0 flex items-center justify-center
                bg-slate-950/60 backdrop-blur-sm rounded-2xl
                pointer-events-none
              ">
                <div className="bg-slate-900/90 border border-slate-600 rounded-xl px-4 py-3 text-center">
                  <p className="text-slate-300 text-sm font-semibold">Place Locked</p>
                  <p className="text-slate-500 text-xs mt-1">Return to the map to unlock it.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Fallback if no image
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          No image available
        </div>
      )}

      {/* ── Dev editor toolbar ── */}
      {isDevEditorEnabled && (
        <div className="shrink-0 px-3 pb-1 flex items-center gap-2">
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
            className={`text-xs font-bold rounded-lg px-3 py-1.5 border transition-colors ${
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
              onClick={exportSlotCoords}
              className="text-xs font-bold rounded-lg px-3 py-1.5 border bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 transition-colors"
            >
              Export coords
            </button>
          )}
          {editSlotsMode && (
            <div className="flex flex-wrap gap-1.5 ml-2">
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
            </div>
          )}
        </div>
      )}

      {/* ── Compact equip strip ── */}
      <div className="
        shrink-0
        flex gap-3 items-end
        px-3 pb-3 pt-1
        overflow-x-auto
        border-t border-slate-800/60
      ">
        {place.slots.map((slot) => {
          const slotId = slot.slotId;
          const equippedItemId = user.equipped?.[slotId];
          const slimItem = equippedItemId ? slimItems.find((i) => i.id === equippedItemId) : undefined;

          const isFreeSlot = slot.unlockCost == null && !slot.budgetOnly;
          const isUnlockedSlot = isFreeSlot || user.unlockedSlots.includes(slotId);
          const isLocked = isPlaceUnlocked && !isUnlockedSlot;

          const canAfford = slot.budgetOnly
            ? (user.extraSlotsBudget ?? 0) > 0
            : slot.unlockCurrency === 'diamonds'
              ? diamonds >= (slot.unlockCost ?? 0)
              : coins >= (slot.unlockCost ?? 0);

          const costLabel = slot.budgetOnly
            ? '1⛽'
            : slot.unlockCurrency === 'diamonds'
              ? `${slot.unlockCost?.toLocaleString() ?? 0}💎`
              : `${slot.unlockCost?.toLocaleString() ?? 0}🪙`;

          const label =
            (effectiveSlotLabels[slotId]?.trim() ? effectiveSlotLabels[slotId] : slotId);

          return (
            <StripSlot
              key={slotId}
              slotId={slotId}
              label={label}
              isLocked={isLocked}
              isUnlocking={unlockingSlotId === slotId}
              canAfford={canAfford}
              costLabel={costLabel}
              slimItem={slimItem}
              onEquip={() => openCardPicker(slotId)}
              onUnlock={() => handleUnlockSlot(slotId)}
              onDetail={(id) => openCardDetail(id)}
            />
          );
        })}
      </div>
    </div>
  );
};