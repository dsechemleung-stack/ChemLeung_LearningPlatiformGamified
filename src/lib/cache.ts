// ============================================================
// ChemCity — Cache Library
// Manages localStorage for slim items, places, collections,
// and topics. Full item documents are NEVER cached here.
//
// RULES:
//  - Only slim fields go into localStorage
//  - Cache is invalidated by comparing cacheVersion
//  - Falls back to Firestore silently if localStorage fails
//  - estimateCacheSize() must be logged in Phase 5 handoff
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  CacheManifest,
  CollectionDocument,
  FullItemDocument,
  PlaceDocument,
  SlimItemDocument,
  TopicDocument,
} from './chemcity/types';

function normalizeImageUrl(raw: unknown): string | undefined {
  const s0 = String(raw ?? '').trim();
  const s = s0.replace(/^['\"]|['\"]$/g, '').trim();
  if (!s) return undefined;
  const upper = s.toUpperCase();
  if (upper === 'N/A' || upper === 'NA' || upper === 'NULL') return undefined;

  const unwrap = (v: string): string => {
    const m = v.match(/\(\s*image\s*:\s*([^\)\s]+)\s*\)/i);
    if (m?.[1]) return m[1].trim();
    const m2 = v.match(/^image\s*:\s*(\S+)$/i);
    if (m2?.[1]) return m2[1].trim();
    return v;
  };

  return unwrap(s);
}

// ─── Constants ───────────────────────────────────────────────

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const KEYS = {
  SLIM_ITEMS: 'cc_slim_items',
  PLACES: 'cc_places',
  COLLECTIONS: 'cc_collections',
  TOPICS: 'cc_topics',
  MANIFEST: 'cc_manifest',
} as const;

// ─── Helpers ─────────────────────────────────────────────────

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
  } catch (e) {
    // localStorage full or unavailable — fall back to Firestore reads
    console.warn(`[ChemCity Cache] localStorage write failed for key "${key}". Falling back to Firestore.`, e);
  }
}

function isCacheExpired(manifest: CacheManifest): boolean {
  return Date.now() - manifest.fetchedAt > CACHE_TTL_MS;
}

// ─── Version Check ───────────────────────────────────────────

/**
 * Fetches the current cacheVersion from Firestore (meta/cacheVersion).
 * This is a SMALL document read done once per app open.
 * If local version matches, skip all other static fetches.
 */
export async function getServerCacheVersion(): Promise<number> {
  const snap = await getDoc(doc(db, 'meta', 'cacheVersion'));
  if (!snap.exists()) {
    throw new Error('[ChemCity Cache] meta/cacheVersion document not found. Run seed-firestore.ts first.');
  }
  return snap.data().version as number;
}

/**
 * Returns true if the local cache is fresh and version matches.
 * Call this on every app open — cheap (no reads beyond the version doc).
 */
export async function isCacheFresh(): Promise<boolean> {
  const manifest = safeGet<CacheManifest>(KEYS.MANIFEST);
  if (!manifest || isCacheExpired(manifest)) return false;

  const serverVersion = await getServerCacheVersion();
  return manifest.version === serverVersion;
}

// ─── Slim Items ──────────────────────────────────────────────

/**
 * Returns all slim items — from localStorage if fresh, else Firestore.
 * This is the main catalog used for ChemStore listing, inventory,
 * equip picker, and bonus calculation.
 *
 * Reads: 0 if cache is fresh. ~1 batch read if cache is stale.
 */
export async function fetchSlimItems(
  serverVersion?: number,
): Promise<SlimItemDocument[]> {
  const manifest = safeGet<CacheManifest>(KEYS.MANIFEST);
  const cached = safeGet<SlimItemDocument[]>(KEYS.SLIM_ITEMS);

  const version = serverVersion ?? (await getServerCacheVersion());

  if (
    manifest &&
    cached &&
    !isCacheExpired(manifest) &&
    manifest.version === version
  ) {
    return cached;
  }

  // Cache miss — fetch from Firestore
  const snap = await getDocs(
    query(collection(db, 'items'), where('deprecated', '==', false)),
  );

  const SLIM_FIELDS: (keyof SlimItemDocument)[] = [
    'id', 'baseId', 'name', 'chemicalFormula', 'emoji', 'imageUrl', 'rarity', 'rarityValue',
    'placeId', 'validSlots', 'shopData', 'skillContribution',
    'collections', 'deprecated',
  ];

  const items: SlimItemDocument[] = snap.docs.map((d) => {
    const full = d.data();
    // Whitelist only slim fields — never cache full item content
    const slim: Partial<SlimItemDocument> = {};
    for (const field of SLIM_FIELDS) {
      if (field in full) {
        (slim as Record<string, unknown>)[field] = full[field];
      }
    }
    slim.id = d.id;
    if ('imageUrl' in slim) {
      const next = normalizeImageUrl((slim as any).imageUrl);
      if (next) (slim as any).imageUrl = next;
      else delete (slim as any).imageUrl;
    }
    return slim as SlimItemDocument;
  });

  const newManifest: CacheManifest = {
    version,
    fetchedAt: Date.now(),
    itemIds: items.map((i) => i.id),
  };

  safeSet(KEYS.SLIM_ITEMS, items);
  safeSet(KEYS.MANIFEST, newManifest);

  return items;
}

// ─── Full Item (on-demand) ────────────────────────────────────

/**
 * Fetches a SINGLE full item document from Firestore.
 * Called ONLY when a student taps a card to view its detail.
 * Result is NOT cached in localStorage.
 *
 * Reads: 1 per tap — acceptable (rare action).
 */
export async function fetchFullItem(
  itemId: string,
): Promise<FullItemDocument | null> {
  const snap = await getDoc(doc(db, 'items', itemId));
  if (!snap.exists()) return null;
  const data = { id: snap.id, ...snap.data() } as FullItemDocument;
  const next = normalizeImageUrl((data as any).imageUrl);
  if (next) (data as any).imageUrl = next;
  return data;
}

// ─── Places ──────────────────────────────────────────────────

/**
 * Returns all 8 place documents — from localStorage if fresh, else Firestore.
 */
export async function fetchPlaces(
  serverVersion?: number,
): Promise<PlaceDocument[]> {
  const manifest = safeGet<CacheManifest>(KEYS.MANIFEST);
  const cached = safeGet<PlaceDocument[]>(KEYS.PLACES);

  const version = serverVersion ?? (await getServerCacheVersion());

  if (
    manifest &&
    cached &&
    !isCacheExpired(manifest) &&
    manifest.version === version
  ) {
    return cached;
  }

  const snap = await getDocs(collection(db, 'places'));
  const places = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlaceDocument));

  safeSet(KEYS.PLACES, places);
  return places;
}

// ─── Collections ─────────────────────────────────────────────

/**
 * Returns all collection group documents — from localStorage if fresh.
 */
export async function fetchCollections(
  serverVersion?: number,
): Promise<CollectionDocument[]> {
  const manifest = safeGet<CacheManifest>(KEYS.MANIFEST);
  const cached = safeGet<CollectionDocument[]>(KEYS.COLLECTIONS);

  const version = serverVersion ?? (await getServerCacheVersion());

  if (
    manifest &&
    cached &&
    !isCacheExpired(manifest) &&
    manifest.version === version
  ) {
    return cached;
  }

  const snap = await getDocs(collection(db, 'collections'));
  const cols = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CollectionDocument));

  safeSet(KEYS.COLLECTIONS, cols);
  return cols;
}

// ─── Topics ──────────────────────────────────────────────────

/**
 * Returns DSE curriculum topics — from localStorage if fresh.
 */
export async function fetchTopics(
  serverVersion?: number,
): Promise<TopicDocument[]> {
  const manifest = safeGet<CacheManifest>(KEYS.MANIFEST);
  const cached = safeGet<TopicDocument[]>(KEYS.TOPICS);

  const version = serverVersion ?? (await getServerCacheVersion());

  if (
    manifest &&
    cached &&
    !isCacheExpired(manifest) &&
    manifest.version === version
  ) {
    return cached;
  }

  const snap = await getDocs(collection(db, 'topics'));
  const topics = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TopicDocument));

  safeSet(KEYS.TOPICS, topics);
  return topics;
}

// ─── Cache Invalidation ───────────────────────────────────────

/**
 * Clears all ChemCity localStorage keys.
 * Forces a full Firestore re-fetch on next app open.
 */
export function invalidateCache(): void {
  Object.values(KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });
  console.info('[ChemCity Cache] Cache invalidated — all static data will re-fetch on next open.');
}

// ─── Cache Size Monitor ───────────────────────────────────────

/**
 * Estimates the current localStorage usage for ChemCity keys.
 * Call this from any admin screen or log it in the Phase 5 handoff.
 *
 * The 5MB limit is per domain per device — not shared across students.
 * At 300 cards slim-cached: ~51KB = ~1% of the budget.
 */
export function estimateCacheSize(): {
  breakdown: Record<string, string>;
  totalBytes: number;
  totalKB: string;
  percentOf5MB: string;
  warning: string | null;
} {
  const breakdown: Record<string, string> = {};
  let totalBytes = 0;

  for (const [label, key] of Object.entries(KEYS)) {
    try {
      const raw = localStorage.getItem(key);
      const bytes = raw ? new Blob([raw]).size : 0;
      totalBytes += bytes;
      breakdown[label] = `${(bytes / 1024).toFixed(1)} KB`;
    } catch {
      breakdown[label] = 'unavailable';
    }
  }

  const FIVE_MB = 5 * 1024 * 1024;
  const percentOf5MB = ((totalBytes / FIVE_MB) * 100).toFixed(2);
  const warning =
    totalBytes > FIVE_MB * 0.8
      ? `⚠️  Cache is at ${percentOf5MB}% of 5MB limit. Review slim field whitelist.`
      : null;

  return {
    breakdown,
    totalBytes,
    totalKB: (totalBytes / 1024).toFixed(1),
    percentOf5MB: `${percentOf5MB}%`,
    warning,
  };
}
