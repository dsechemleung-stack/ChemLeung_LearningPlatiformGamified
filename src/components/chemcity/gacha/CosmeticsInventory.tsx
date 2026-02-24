import { useMemo, useState, useEffect } from 'react';
import React from 'react';
import { useChemCityStore } from '../../../store/chemcityStore';
import type { CosmeticType, Rarity, Cosmetic } from '../../../lib/chemcity/types';
import { ProfileCard } from './ProfileCard';
import { callChemCityEquipCosmetics } from '../../../lib/chemcity/cloudFunctions';
import {
  shouldForceNoSplit,
  getGlobalFaceCrop,
  getAvatarFaceCrop,
  getAvatarTuning,
  avatarNumberFromId,
  TUNER_UPDATED_EVENT,
  AvatarTunerButton,
} from './AvatarTuner';
import type { FaceCropMeta } from '../../../lib/chemcity/types';

// ── Hook: re-render when AvatarTuner saves new config to localStorage ────────
function useTunerVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const handler = () => setV((n) => n + 1);
    window.addEventListener(TUNER_UPDATED_EVENT, handler);
    return () => window.removeEventListener(TUNER_UPDATED_EVENT, handler);
  }, []);
  return v;
}

// ── Brand palette ─────────────────────────────────────────────────────────────
const BRAND = {
  bg: '#0a1a18',
  bgPanel: '#0f2825',
  teal: '#76A8A5',
  sage: '#C5D7B5',
  border: 'rgba(118,168,165,0.25)',
};

const RARITY_ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

const RARITY_BAR: Record<Rarity, string> = {
  legendary: 'rgba(245,185,60,0.85)',
  epic:      'rgba(170,100,230,0.85)',
  rare:      'rgba(100,170,240,0.85)',
  uncommon:  'rgba(110,200,120,0.75)',
  common:    'rgba(118,168,165,0.45)',
};

const RARITY_BADGE: Record<Rarity, React.CSSProperties> = {
  legendary: { background: 'rgba(245,185,60,0.18)',  color: '#fde68a', border: '1px solid rgba(245,185,60,0.4)' },
  epic:      { background: 'rgba(170,100,230,0.18)', color: '#d8b4fe', border: '1px solid rgba(170,100,230,0.4)' },
  rare:      { background: 'rgba(100,170,240,0.18)', color: '#93c5fd', border: '1px solid rgba(100,170,240,0.4)' },
  uncommon:  { background: 'rgba(110,200,120,0.18)', color: '#86efac', border: '1px solid rgba(110,200,120,0.4)' },
  common:    { background: 'rgba(118,168,165,0.15)', color: '#C5D7B5', border: '1px solid rgba(118,168,165,0.3)' },
};

type ActiveTab = 'avatars' | 'backgrounds';

// ── CSS background-position math ──────────────────────────────────────────────
function buildCropStyle(crop: FaceCropMeta, url: string): React.CSSProperties {
  const { x, y, w, h } = crop;
  const scale = Math.max(1 / w, 1 / h);
  const px = ((0.5 - (x + w / 2) * scale) / (1 - scale)) * 100;
  const py = ((0.5 - (y + h / 2) * scale) / (1 - scale)) * 100;
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: `${scale * 100}%`,
    backgroundPosition: `${px}% ${py}%`,
    backgroundRepeat: 'no-repeat',
  };
}

// ── AvatarFaceSquare ──────────────────────────────────────────────────────────

function AvatarFaceSquare({
  cosmetic, gender, isEquipped, onClick, disabled,
}: {
  cosmetic: Cosmetic;
  gender: 'boy' | 'girl' | null;
  isEquipped: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const cosmeticsMap = useChemCityStore((s) => (s as any).cosmeticsMap as Map<string, Cosmetic> | undefined);
  const avatarId = cosmetic.id;
  const num = avatarNumberFromId(avatarId);
  const tunerVersion = useTunerVersion();

  const resolvedGender: 'boy' | 'girl' = gender === 'girl' ? 'girl' : 'boy';

  const imageUrl = useMemo(() => {
    if (!shouldForceNoSplit(avatarId)) {
      const key = resolvedGender === 'girl' ? 'imageUrlGirl' : 'imageUrlBoy';
      const gendered = (cosmetic as any)[key] as string | undefined;
      if (gendered) return gendered;
      const plain = cosmeticsMap?.get('avatar_1_plain') as any;
      const plainGendered = plain?.[key] as string | undefined;
      return plainGendered;
    }
    // no-split avatars are not allowed to use the combined image fallback per project rule
    return undefined;
  }, [cosmetic, resolvedGender, avatarId, cosmeticsMap]);

  const cropStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!imageUrl) return undefined;
    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: 'contain',
      backgroundPosition: '50% 100%',
      backgroundRepeat: 'no-repeat',
    };
    // tunerVersion in deps ensures this re-runs whenever the tuner saves new config
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cosmetic, gender, imageUrl, tunerVersion]);

  // Per-avatar inventory context adjustments (offsetX, offsetY, scale).
  // These are applied as a CSS transform ON TOP of the face-crop background,
  // so you can nudge or zoom individual avatars without redefining the global crop.
  const inventoryTransform = useMemo<string>(() => {
    const tune = getAvatarTuning(avatarId, 'inventory', resolvedGender);
    if (!tune && !tunerVersion) return ''; // tunerVersion keeps memo reactive
    const ox = tune?.offsetXPercent ?? 0;
    const oy = tune?.offsetYPercent ?? 0;
    const sc = tune?.scale ?? 1;
    if (ox === 0 && oy === 0 && sc === 1) return '';
    return `translate(${ox}%, ${oy}%) scale(${sc})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId, resolvedGender, tunerVersion]);

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 12,
          overflow: 'hidden',
          border: `2px solid ${isEquipped ? BRAND.teal : 'rgba(118,168,165,0.22)'}`,
          background: 'rgba(13,35,32,0.85)',
          boxShadow: isEquipped
            ? `0 0 0 2px rgba(118,168,165,0.3), inset 0 0 0 1px rgba(118,168,165,0.15)`
            : 'none',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'transform 0.1s, box-shadow 0.15s',
        }}
      >
        {/* Image — wrap in an extra div so transform applies to the image
            without affecting the overlaid badges/rarity bar */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: inventoryTransform || undefined,
            transformOrigin: 'center center',
          }}
        >
          {cropStyle ? (
            <div style={{ position: 'absolute', inset: 0, ...cropStyle }} />
          ) : imageUrl ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: '130%',
                backgroundPosition: '50% 5%',
                backgroundRepeat: 'no-repeat',
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                background: 'rgba(118,168,165,0.08)',
              }}
            >
              🎴
            </div>
          )}
        </div>

        {/* Bottom scrim — outside the transform div so it stays anchored */}
        <div
          style={{
            position: 'absolute',
            inset: '65% 0 0 0',
            background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* #N badge — top right */}
        {num !== null && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1,
              padding: '2px 4px',
              borderRadius: 4,
              background: 'rgba(0,0,0,0.6)',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            #{num}
          </span>
        )}

        {/* Equipped ✓ — top left */}
        {isEquipped && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: BRAND.teal,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>
          </div>
        )}

        {/* Rarity bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: RARITY_BAR[cosmetic.rarity],
          }}
        />
      </button>
    </div>
  );
}

// ── BackgroundSquare ──────────────────────────────────────────────────────────

function BackgroundSquare({
  cosmetic, isEquipped, onClick, disabled,
}: {
  cosmetic: Cosmetic;
  isEquipped: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const numMatch = cosmetic.id.match(/_(\d+)/);
  const num = numMatch?.[1];

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 12,
          overflow: 'hidden',
          border: `2px solid ${isEquipped ? BRAND.teal : 'rgba(118,168,165,0.22)'}`,
          background: 'rgba(13,35,32,0.85)',
          boxShadow: isEquipped ? `0 0 0 2px rgba(118,168,165,0.3)` : 'none',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'transform 0.1s',
        }}
      >
        {cosmetic.imageUrl ? (
          <img
            src={cosmetic.imageUrl}
            alt={cosmetic.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            🖼
          </div>
        )}

        <div style={{ position: 'absolute', inset: '55% 0 0 0', background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)', pointerEvents: 'none' }} />

        {num && (
          <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, fontWeight: 700, padding: '2px 4px', borderRadius: 4, background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)' }}>
            #{num}
          </span>
        )}

        {isEquipped && (
          <div style={{ position: 'absolute', top: 4, left: 4, width: 16, height: 16, borderRadius: '50%', background: BRAND.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 6px 6px' }}>
          <p style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', margin: '0 0 2px' }}>
            {cosmetic.name}
          </p>
          <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 999, ...RARITY_BADGE[cosmetic.rarity] }}>
            {cosmetic.rarity}
          </span>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: RARITY_BAR[cosmetic.rarity] }} />
      </button>
    </div>
  );
}

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value, rarity }: { label: string; value: string; rarity?: Rarity }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(118,168,165,0.08)', border: '1px solid rgba(118,168,165,0.15)' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(118,168,165,0.7)', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#e6f5e6', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value}</span>
        {rarity && (
          <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 999, ...RARITY_BADGE[rarity] }}>
            {rarity}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CosmeticsInventory() {
  const user = useChemCityStore((s) => s.user);
  const userGender = useChemCityStore((s) => (s as any).userGender as 'boy' | 'girl' | null);
  const cosmeticsMap = useChemCityStore((s) => (s as any).cosmeticsMap as Map<string, Cosmetic> | undefined);
  const navigateToGacha = useChemCityStore((s) => s.navigateToGacha);

  const ownedSet = new Set<string>((user as any)?.ownedCosmetics ?? []);
  const equippedCosmetics = (user as any)?.equippedCosmetics ?? {};

  const [activeTab, setActiveTab] = useState<ActiveTab>('avatars');
  const [activeRarity, setActiveRarity] = useState<Rarity | 'all'>('all');
  const [equipping, setEquipping] = useState(false);
  const [equippingId, setEquippingId] = useState<string | null>(null);

  const allOwned = useMemo(
    () => Array.from(cosmeticsMap?.values?.() ?? []).filter((c) => ownedSet.has(c.id)),
    [cosmeticsMap, ownedSet.size],
  );

  const ownedAvatars = useMemo(() =>
    allOwned
      .filter((c) => c.type === 'avatar' && (activeRarity === 'all' || c.rarity === activeRarity))
      .sort((a, b) => {
        const ri = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
        return ri !== 0 ? ri : (avatarNumberFromId(a.id) ?? 999) - (avatarNumberFromId(b.id) ?? 999);
      }),
    [allOwned, activeRarity],
  );

  const ownedBgs = useMemo(() =>
    allOwned
      .filter((c) => c.type === 'background' && (activeRarity === 'all' || c.rarity === activeRarity))
      .sort((a, b) => {
        const ri = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
        return ri !== 0 ? ri : a.name.localeCompare(b.name);
      }),
    [allOwned, activeRarity],
  );

  const activeList = activeTab === 'avatars' ? ownedAvatars : ownedBgs;
  const equippedAvatar = equippedCosmetics.avatarId ? cosmeticsMap?.get(equippedCosmetics.avatarId) : undefined;
  const equippedBg = equippedCosmetics.backgroundId ? cosmeticsMap?.get(equippedCosmetics.backgroundId) : undefined;

  const tunerAvatar = equippedAvatar;

  async function handleEquip(cosmetic: Cosmetic) {
    if (equipping) return;
    setEquipping(true);
    setEquippingId(cosmetic.id);
    try {
      const patch: Record<string, string> = {};
      if (cosmetic.type === 'avatar') patch.avatarId = cosmetic.id;
      else if (cosmetic.type === 'background') patch.backgroundId = cosmetic.id;
      else if (cosmetic.type === 'icon') patch.iconId = cosmetic.id;
      await callChemCityEquipCosmetics(patch);
    } finally {
      setEquipping(false);
      setEquippingId(null);
    }
  }

  const isEquipped = (c: Cosmetic) =>
    c.type === 'avatar' ? equippedCosmetics.avatarId === c.id :
    c.type === 'background' ? equippedCosmetics.backgroundId === c.id :
    c.type === 'icon' ? equippedCosmetics.iconId === c.id : false;

  return (
    <div style={{ width: '100%', minHeight: '100%', background: BRAND.bg, color: '#e6f5e6', display: 'flex', flexDirection: 'column', fontFamily: "'Quicksand', sans-serif" }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${BRAND.border}`, flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: BRAND.sage, margin: 0 }}>My Cosmetics</h1>
        <p style={{ fontSize: 12, color: BRAND.teal, margin: '2px 0 0' }}>{allOwned.length} owned · Tap to equip</p>
      </div>

      {/* Two-column */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* LEFT — profile card */}
        <div style={{
          width: '42%', maxWidth: 260, flexShrink: 0,
          borderRight: `1px solid ${BRAND.border}`,
          background: `linear-gradient(180deg, ${BRAND.bgPanel} 0%, ${BRAND.bg} 100%)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 12, padding: 16, overflowY: 'auto',
        }}>
          <ProfileCard size="xl" className="w-full rounded-2xl shadow-2xl" />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoRow label="Avatar" value={equippedAvatar?.name ?? 'None'} rarity={equippedAvatar?.rarity} />
            <InfoRow label="Background" value={equippedBg?.name ?? 'None'} rarity={equippedBg?.rarity} />
          </div>
          <button
            onClick={navigateToGacha}
            style={{ width: '100%', padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'rgba(118,168,165,0.12)', border: `1.5px solid ${BRAND.border}`, color: BRAND.teal, cursor: 'pointer' }}
          >
            🎟 Get More in Gacha
          </button>
          <AvatarTunerButton
            avatarId={tunerAvatar?.id}
            avatarImageUrl={tunerAvatar?.imageUrl}
            avatarImageUrlBoy={(tunerAvatar as any)?.imageUrlBoy}
            avatarImageUrlGirl={(tunerAvatar as any)?.imageUrlGirl}
            className="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: 'rgba(118,168,165,0.06)',
              border: '1px dashed rgba(118,168,165,0.35)',
              color: 'rgba(118,168,165,0.6)',
              cursor: 'pointer',
              width: '100%',
            } as any}
          />
        </div>

        {/* RIGHT — grid */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, padding: '12px 12px 8px', flexShrink: 0 }}>
            {(['avatars', 'backgrounds'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  background: activeTab === tab ? BRAND.teal : 'rgba(118,168,165,0.1)',
                  color: activeTab === tab ? '#0a1a18' : BRAND.teal,
                  border: activeTab === tab ? 'none' : `1px solid ${BRAND.border}`,
                }}
              >
                {tab === 'avatars' ? `👤 Avatars (${ownedAvatars.length})` : `🖼 Backgrounds (${ownedBgs.length})`}
              </button>
            ))}
          </div>

          {/* Rarity chips */}
          <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', overflowX: 'auto', flexShrink: 0 }}>
            {(['all', ...RARITY_ORDER] as const).map((r) => (
              <button
                key={r}
                onClick={() => setActiveRarity(r)}
                style={{
                  flexShrink: 0, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer', transition: 'all 0.15s',
                  background: activeRarity === r ? BRAND.sage : 'rgba(118,168,165,0.08)',
                  color: activeRarity === r ? '#0a1a18' : 'rgba(197,215,181,0.7)',
                  border: activeRarity === r ? 'none' : `1px solid ${BRAND.border}`,
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 24px' }}>
            {activeList.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
                <span style={{ fontSize: 40 }}>🎁</span>
                <p style={{ fontWeight: 700, fontSize: 14, color: BRAND.teal, margin: 0 }}>No {activeTab} yet</p>
                <p style={{ fontSize: 12, color: 'rgba(118,168,165,0.6)', margin: 0, textAlign: 'center' }}>Pull in the Gacha or browse the Shop!</p>
                <button onClick={navigateToGacha} style={{ marginTop: 4, padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: BRAND.teal, color: '#0a1a18', cursor: 'pointer', border: 'none' }}>
                  Go to Gacha
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
                {activeList.map((cosmetic) => {
                  const equipped = isEquipped(cosmetic);
                  const loading = equippingId === cosmetic.id;
                  return (
                    <div key={cosmetic.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ position: 'relative' }}>
                        {activeTab === 'avatars' ? (
                          <AvatarFaceSquare cosmetic={cosmetic} gender={userGender} isEquipped={equipped} onClick={() => handleEquip(cosmetic)} disabled={equipping || equipped} />
                        ) : (
                          <BackgroundSquare cosmetic={cosmetic} isEquipped={equipped} onClick={() => handleEquip(cosmetic)} disabled={equipping || equipped} />
                        )}
                        {loading && (
                          <div style={{ position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 20, color: BRAND.teal, animation: 'spin 0.8s linear infinite' }}>⟳</span>
                          </div>
                        )}
                      </div>
                      <p style={{ margin: 0, textAlign: 'center', fontSize: 10, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'rgba(197,215,181,0.75)', padding: '0 2px' }}>
                        {cosmetic.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}