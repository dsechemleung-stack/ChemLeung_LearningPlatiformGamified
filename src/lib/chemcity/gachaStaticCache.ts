import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Cosmetic, GachaBanner } from './types';
import { getServerCacheVersion } from '../cache';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../../firebase/config';

const COSMETICS_CACHE_PREFIX = 'cc_cosmetics_v';

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function entriesCacheKey(bannerId: string, version: number) {
  return `cc_gacha_entries_${bannerId}_v${version}`;
}

function looksLikeHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function looksLikeStoragePath(s: string): boolean {
  // Typical Firestore value (should be) https://firebasestorage.googleapis.com/...
  // But if it is mistakenly stored as an object path, it looks like:
  //   chemcity/cosmetics/avatars_themed_gendered_v2/foo.png
  // In that case, resolve via getDownloadURL(ref(storage, path)).
  if (!s) return false;
  if (looksLikeHttpUrl(s)) return false;
  if (s.startsWith('data:')) return false;
  if (s.startsWith('gs://')) return true;
  return s.includes('/') && !s.includes(' ') && !s.includes('\n');
}

async function resolveMaybeStorageUrl(raw: unknown): Promise<string | undefined> {
  const s = String(raw ?? '').trim();
  if (!s) return undefined;
  if (looksLikeHttpUrl(s) || s.startsWith('data:')) return s;
  if (!looksLikeStoragePath(s)) return s;

  // Support both gs://bucket/path and plain objectPath.
  const objectPath = s.startsWith('gs://') ? s.replace(/^gs:\/\//, '').split('/').slice(1).join('/') : s;
  try {
    return await getDownloadURL(ref(storage, objectPath));
  } catch {
    // If resolution fails, fall back to original string so UI can still attempt to load it.
    return s;
  }
}

async function normalizeCosmetic(c: Cosmetic): Promise<Cosmetic> {
  const [imageUrl, imageUrlBoy, imageUrlGirl] = await Promise.all([
    resolveMaybeStorageUrl((c as any).imageUrl),
    resolveMaybeStorageUrl((c as any).imageUrlBoy),
    resolveMaybeStorageUrl((c as any).imageUrlGirl),
  ]);

  return {
    ...c,
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageUrlBoy ? { imageUrlBoy } : {}),
    ...(imageUrlGirl ? { imageUrlGirl } : {}),
  };
}

export async function getCosmeticsMap(): Promise<Map<string, Cosmetic>> {
  const version = await getServerCacheVersion();
  const COSMETICS_CACHE_KEY = `${COSMETICS_CACHE_PREFIX}${version}`;

  const cached = safeGet<Cosmetic[]>(COSMETICS_CACHE_KEY);
  if (cached) {
    return new Map(cached.map((c) => [c.id, c]));
  }

  const snap = await getDocs(collection(db, 'cosmetics'));
  const rawCosmetics: Cosmetic[] = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) } as Cosmetic))
    .filter((c) => !c.deprecated);

  const cosmetics = await Promise.all(rawCosmetics.map((c) => normalizeCosmetic(c)));

  safeSet(COSMETICS_CACHE_KEY, cosmetics);
  return new Map(cosmetics.map((c) => [c.id, c]));
}

export function invalidateCosmeticsCache() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(COSMETICS_CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export async function getActiveBanners(): Promise<GachaBanner[]> {
  const snap = await getDocs(collection(db, 'gachaBanners'));
  const now = new Date();

  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) } as GachaBanner))
    .filter((b) => {
      if (!b.active) return false;

      if (b.startAt) {
        const start = typeof (b.startAt as any)?.toDate === 'function'
          ? (b.startAt as any).toDate()
          : new Date(b.startAt as any);
        if (now < start) return false;
      }

      if (b.endAt) {
        const end = typeof (b.endAt as any)?.toDate === 'function'
          ? (b.endAt as any).toDate()
          : new Date(b.endAt as any);
        if (now > end) return false;
      }

      return true;
    });
}

export async function getBannerEntries(
  bannerId: string,
  cacheVersion: number,
): Promise<Array<{ cosmeticId: string } & Record<string, unknown>>> {
  const key = entriesCacheKey(bannerId, cacheVersion);
  const cached = safeGet<Array<{ cosmeticId: string } & Record<string, unknown>>>(key);
  if (cached) return cached;

  const snap = await getDocs(collection(db, 'gachaBanners', bannerId, 'entries'));
  const entries = snap.docs
    .map((d) => ({ cosmeticId: d.id, ...(d.data() as any) }))
    .filter((e) => e.enabled);

  safeSet(key, entries);
  return entries;
}

export async function getBanner(bannerId: string): Promise<GachaBanner | null> {
  const snap = await getDoc(doc(db, 'gachaBanners', bannerId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as GachaBanner;
}
