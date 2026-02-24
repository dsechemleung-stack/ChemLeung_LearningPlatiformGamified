import React, { useEffect, useMemo, useState } from 'react';
import { useChemCityStore } from '../../../store/chemcityStore';
import type { Cosmetic, FaceCropMeta } from '../../../lib/chemcity/types';
import { getAvatarTuning, getGlobalFaceCrop, getAvatarFaceCrop, shouldForceNoSplit, TUNER_UPDATED_EVENT } from './AvatarTuner';

const EMPTY_EQUIPPED: { avatarId?: string; backgroundId?: string; iconId?: string } = {};
const EMPTY_MAP: Map<string, any> = new Map();

type CardSize = 'sm' | 'md' | 'lg' | 'xl';

const CARD_DIMS: Record<CardSize, { w: number; h: number; textSize: string }> = {
  sm: { w: 80, h: 110, textSize: 'text-[10px]' },
  md: { w: 120, h: 165, textSize: 'text-xs' },
  lg: { w: 180, h: 248, textSize: 'text-sm' },
  xl: { w: 280, h: 385, textSize: 'text-base' },
};

// ── Hook: re-render when AvatarTuner saves new config ────────────────────────
// Used by ProfileCard and ProfileIcon so live tuner adjustments are reflected
// immediately without a page reload.
function useTunerVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const handler = () => setV((n) => n + 1);
    window.addEventListener(TUNER_UPDATED_EVENT, handler);
    return () => window.removeEventListener(TUNER_UPDATED_EVENT, handler);
  }, []);
  return v;
}

// ─── Shared face-crop style helper ───────────────────────────────────────────
function faceCropStyle(
  faceCrop: FaceCropMeta,
  imageUrl: string,
): React.CSSProperties {
  const { x, y, w, h } = faceCrop;
  const scale = Math.max(1 / w, 1 / h);
  const posX = (0.5 - (x + w / 2) * scale) / (1 - scale) * 100;
  const posY = (0.5 - (y + h / 2) * scale) / (1 - scale) * 100;
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: `${scale * 100}%`,
    backgroundPosition: `${posX}% ${posY}%`,
  };
}

interface ProfileCardProps {
  displayName?: string;
  avatarId?: string;
  backgroundId?: string;
  gender?: 'boy' | 'girl' | null;
  cosmeticsMap?: Map<string, Cosmetic>;
  size?: CardSize;
  className?: string;
  style?: React.CSSProperties;
}

export function ProfileCard({
  displayName,
  avatarId: propAvatarId,
  backgroundId: propBgId,
  gender: genderOverride,
  cosmeticsMap: cosmeticsMapOverride,
  size = 'md',
  className = '',
  style,
}: ProfileCardProps) {
  // Re-render whenever the tuner saves so live adjustments are visible immediately.
  const tunerVersion = useTunerVersion();

  const equippedCosmetics = useChemCityStore(
    (s) => ((s.user as any)?.equippedCosmetics as typeof EMPTY_EQUIPPED) || EMPTY_EQUIPPED,
  );
  const userGender = useChemCityStore((s) => (s as any).userGender as 'boy' | 'girl' | null);
  const cosmeticsMapFromStore = useChemCityStore(
    (s) => ((s as any).cosmeticsMap as Map<string, Cosmetic>) || EMPTY_MAP,
  );

  const cosmeticsMap = cosmeticsMapOverride ?? cosmeticsMapFromStore;
  const effectiveGender = genderOverride ?? userGender;
  const resolvedGender: 'boy' | 'girl' = effectiveGender === 'girl' ? 'girl' : 'boy';

  const avatarId = propAvatarId ?? equippedCosmetics.avatarId;
  const backgroundId = propBgId ?? equippedCosmetics.backgroundId;

  const avatar = avatarId ? cosmeticsMap?.get(avatarId) : undefined;
  const background = backgroundId ? cosmeticsMap?.get(backgroundId) : undefined;

  const dims = CARD_DIMS[size];

  // Compute transform from tuner config — re-derives when tunerVersion changes.
  const avatarTransform = useMemo(() => {
    if (!effectiveGender) return 'translateX(-50%)';
    const tune = getAvatarTuning(avatarId, 'profile_card', effectiveGender);
    const ox = tune?.offsetXPercent ?? 0;
    const oy = tune?.offsetYPercent ?? 0;
    const sc = tune?.scale ?? 1;
    return `translateX(calc(-50% + ${ox}%)) translateY(${oy}%) scale(${sc})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId, effectiveGender, tunerVersion]);

  const avatarTransformNoSplit = useMemo(() => {
    if (!effectiveGender) return 'translateX(-50%)';
    const tune = getAvatarTuning(avatarId, 'profile_card', effectiveGender);
    if (!tune) return 'translateX(-50%)';
    const ox = tune.offsetXPercent ?? 0;
    const oy = tune.offsetYPercent ?? 0;
    const sc = tune.scale ?? 1;
    return `translateX(calc(-50% + ${ox}%)) translateY(${oy}%) scale(${sc})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId, effectiveGender, tunerVersion]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl select-none ${className}`}
      style={{ width: dims.w, height: dims.h, ...style }}
    >
      {/* Background layer */}
      {background?.imageUrl ? (
        <img
          src={background.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 to-gray-900" />
      )}

      {/* Avatar layer */}
      {avatar?.imageUrl ? (
        <div className="absolute bottom-0 left-0 right-0 h-[85%] overflow-hidden">
          {(() => {
            const key = resolvedGender === 'girl' ? 'imageUrlGirl' : 'imageUrlBoy';
            const gendered = !shouldForceNoSplit(avatarId)
              ? ((avatar as any)?.[key] as string | undefined)
              : undefined;
            const plain = cosmeticsMap?.get('avatar_1_plain');
            const plainGendered = plain && !shouldForceNoSplit('avatar_1_plain')
              ? ((plain as any)?.[key] as string | undefined)
              : undefined;
            const src = gendered || plainGendered;
            if (!src) return null;
            return (
              <img
                src={src}
                alt={displayName ?? 'Avatar'}
                draggable={false}
                className="absolute bottom-0 left-1/2 h-full w-auto max-w-none"
                style={{
                  transform: shouldForceNoSplit(avatarId)
                    ? avatarTransformNoSplit
                    : avatarTransform,
                }}
              />
            );
          })()}
        </div>
      ) : (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[70%] w-[60%] flex items-end justify-center">
          <span className="text-6xl">🧑</span>
        </div>
      )}

      {/* Name bar */}
      {displayName && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
          <p className={`text-white font-semibold text-center truncate ${dims.textSize}`}>
            {displayName}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── ProfileIcon ──────────────────────────────────────────────────────────────

interface ProfileIconProps {
  size?: number;
  avatarId?: string;
  iconId?: string;
  backgroundId?: string;
  gender?: 'boy' | 'girl' | null;
  cosmeticsMap?: Map<string, Cosmetic>;
  className?: string;
}

export function ProfileIcon({
  size = 40,
  avatarId: propAvatarId,
  iconId: propIconId,
  backgroundId: propBackgroundId,
  gender: genderOverride,
  cosmeticsMap: cosmeticsMapOverride,
  className = '',
}: ProfileIconProps) {
  // Re-render whenever the tuner saves.
  const tunerVersion = useTunerVersion();

  const equippedCosmetics = useChemCityStore(
    (s) => ((s.user as any)?.equippedCosmetics as typeof EMPTY_EQUIPPED) || EMPTY_EQUIPPED,
  );
  const userGender = useChemCityStore((s) => (s as any).userGender as 'boy' | 'girl' | null);
  const cosmeticsMapFromStore = useChemCityStore(
    (s) => ((s as any).cosmeticsMap as Map<string, Cosmetic>) || EMPTY_MAP,
  );

  const cosmeticsMap = cosmeticsMapOverride ?? cosmeticsMapFromStore;
  const effectiveGender = genderOverride ?? userGender;
  const resolvedGender: 'boy' | 'girl' = effectiveGender === 'girl' ? 'girl' : 'boy';

  const iconId = propIconId ?? equippedCosmetics.iconId;
  const avatarId = propAvatarId ?? equippedCosmetics.avatarId;
  const backgroundId = propBackgroundId ?? equippedCosmetics.backgroundId;

  const iconCosmetic = iconId ? cosmeticsMap?.get(iconId) : undefined;
  const avatarCosmetic = !iconCosmetic && avatarId ? cosmeticsMap?.get(avatarId) : undefined;
  const backgroundCosmetic = backgroundId ? cosmeticsMap?.get(backgroundId) : undefined;

  const isNoSplit = shouldForceNoSplit(avatarId);

  const globalFaceCrop =
    effectiveGender && avatarCosmetic?.type === 'avatar' && !isNoSplit
      ? getGlobalFaceCrop(effectiveGender)
      : null;

  // For no-split avatars, check the tuner's per-avatar faceCrop stored in localStorage.
  const tunerPerAvatarCrop =
    avatarCosmetic?.type === 'avatar' && isNoSplit
      ? getAvatarFaceCrop(avatarId)
      : null;

  const faceCrop: FaceCropMeta | undefined =
    iconCosmetic?.faceCrop ??
    avatarCosmetic?.faceCrop ??
    (tunerPerAvatarCrop as FaceCropMeta | null) ??
    (globalFaceCrop as FaceCropMeta | null) ??
    undefined;

  const imageUrl = useMemo(() => {
    if (iconCosmetic?.imageUrl) return iconCosmetic.imageUrl;
    const key = resolvedGender === 'girl' ? 'imageUrlGirl' : 'imageUrlBoy';
    const gendered = avatarCosmetic && !isNoSplit
      ? ((avatarCosmetic as any)?.[key] as string | undefined)
      : undefined;
    const plain = cosmeticsMap?.get('avatar_1_plain');
    const plainGendered = plain && !shouldForceNoSplit('avatar_1_plain')
      ? ((plain as any)?.[key] as string | undefined)
      : undefined;
    return gendered || plainGendered;
  }, [iconCosmetic?.imageUrl, avatarCosmetic, isNoSplit, resolvedGender, cosmeticsMap]);

  const avatarTransform = useMemo(() => {
    if (!effectiveGender) return 'translateX(-50%)';
    const tune = getAvatarTuning(avatarId, 'profile_icon', effectiveGender);
    const ox = tune?.offsetXPercent ?? 0;
    const oy = tune?.offsetYPercent ?? 0;
    const sc = tune?.scale ?? 1;
    return `translateX(calc(-50% + ${ox}%)) translateY(${oy}%) scale(${sc})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId, effectiveGender, tunerVersion]);

  const avatarTransformNoSplit = useMemo(() => {
    if (!effectiveGender) return 'translateX(-50%)';
    const tune = getAvatarTuning(avatarId, 'profile_icon', effectiveGender);
    if (!tune) return 'translateX(-50%)';
    const ox = tune.offsetXPercent ?? 0;
    const oy = tune.offsetYPercent ?? 0;
    const sc = tune.scale ?? 1;
    return `translateX(calc(-50% + ${ox}%)) translateY(${oy}%) scale(${sc})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId, effectiveGender, tunerVersion]);

  // Build crop style — tunerVersion in deps ensures it re-runs on tuner save,
  // including changes to per-avatar crops for no-split avatars.
  const cropStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!faceCrop || !imageUrl) return undefined;
    return faceCropStyle(faceCrop, imageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceCrop, imageUrl, tunerVersion, tunerPerAvatarCrop]);

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size, aspectRatio: '1 / 1', background: 'transparent' }}
    >
      <div className="relative w-full h-full">
        {backgroundCosmetic?.imageUrl ? (
          <img
            src={backgroundCosmetic.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : null}

        {avatarCosmetic?.type === 'avatar' && imageUrl ? (
          <div
            className="absolute overflow-hidden"
            style={{
              bottom: 0,
              left: 0,
              right: 0,
              height: '130%',
              top: '-30%',
            }}
          >
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              className="absolute bottom-0 left-1/2 h-full w-auto max-w-none"
              style={{ transform: isNoSplit ? avatarTransformNoSplit : avatarTransform }}
            />
          </div>
        ) : cropStyle ? (
          <div className="absolute inset-0" style={cropStyle} />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full max-w-none object-cover object-top"
            draggable={false}
            style={
              iconCosmetic?.type === 'avatar'
                ? {
                    width: '200%',
                    maxWidth: '200%',
                    transform: effectiveGender === 'girl' ? 'translateX(-50%)' : 'translateX(0%)',
                  }
                : undefined
            }
          />
        ) : (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ background: 'transparent' }}>
            <span style={{ fontSize: size * 0.5 }}>👤</span>
          </div>
        )}
      </div>
    </div>
  );
}