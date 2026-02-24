import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getCosmeticsMap } from '../lib/chemcity/gachaStaticCache';
import { ProfileIcon } from './chemcity/gacha/ProfileCard';
import Avatar from './Avatar';

export default function ChemCityUserProfileIcon({
  userId,
  displayName,
  size = 32,
  className = '',
}) {
  const [loaded, setLoaded] = useState(false);
  const [userDoc, setUserDoc] = useState(null);
  const [cosmeticsMap, setCosmeticsMap] = useState(null);

  useEffect(() => {
    let alive = true;

    // Load cosmetics catalog (once per userId change).
    (async () => {
      try {
        const map = await getCosmeticsMap();
        if (!alive) return;
        setCosmeticsMap(map);
      } catch {
        if (!alive) return;
        setCosmeticsMap(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUserDoc(null);
      setLoaded(true);
      return;
    }

    setLoaded(false);

    const unsub = onSnapshot(
      doc(db, 'users', userId),
      (snap) => {
        setUserDoc(snap.exists() ? snap.data() : null);
        setLoaded(true);
      },
      () => {
        setUserDoc(null);
        setLoaded(true);
      },
    );

    return () => {
      unsub && unsub();
    };
  }, [userId]);

  const resolved = useMemo(() => {
    const genderRaw = userDoc?.gender;
    const gender = genderRaw === 'girl' ? 'girl' : genderRaw === 'boy' ? 'boy' : null;

    const equippedCosmetics = userDoc?.chemcity?.equippedCosmetics || {};
    const avatarId = equippedCosmetics.avatarId;
    const backgroundId = equippedCosmetics.backgroundId;
    const iconId = equippedCosmetics.iconId;

    const hasAnyCosmeticId = Boolean(avatarId || backgroundId || iconId);

    return { gender, avatarId, backgroundId, iconId, hasAnyCosmeticId };
  }, [userDoc]);

  const fallbackAvatar = (
    <div style={{ width: size, height: size }} className={className}>
      <Avatar
        userId={userId}
        displayName={displayName}
        size="sm"
        className="!w-full !h-full"
      />
    </div>
  );

  if (!userId) return fallbackAvatar;

  if (!loaded) {
    return (
      <div
        className={`rounded-full bg-slate-200 animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!cosmeticsMap) {
    return fallbackAvatar;
  }

  // IMPORTANT: Do not render ProfileIcon without explicit cosmetic IDs.
  // ProfileIcon will fall back to the *current user's* ChemCity store equippedCosmetics,
  // which would make other users appear with your icon.
  if (!resolved.hasAnyCosmeticId) {
    return fallbackAvatar;
  }

  return (
    <ProfileIcon
      size={size}
      className={className}
      gender={resolved.gender}
      cosmeticsMap={cosmeticsMap}
      avatarId={resolved.avatarId}
      backgroundId={resolved.backgroundId}
      iconId={resolved.iconId}
    />
  );
}
