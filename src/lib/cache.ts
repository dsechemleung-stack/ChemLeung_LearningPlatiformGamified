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

const SLIM_ITEMS_CSV_URL =
  String((import.meta as any).env?.VITE_CHEMCITY_SLIM_ITEMS_CSV_URL ?? '').trim() ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT1y1TCVk0zDqeO8V58ZN-Dj3M3rqJZFSLUEjWWTW6f-jlzSpqc8UEl3MGmTw78qOZHJNVEEbJYGojc/pub?gid=0&single=true&output=csv';

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

  const unwrapped = unwrap(s);
  // Allow filenames with spaces (e.g. "/chemcard/water_greenhouse gas.png")
  // by encoding the URL. encodeURI keeps "/" intact.
  try {
    return encodeURI(unwrapped);
  } catch {
    return unwrapped;
  }
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

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ',') {
      pushField();
      continue;
    }

    if (c === '\n') {
      pushField();
      pushRow();
      continue;
    }

    if (c === '\r') {
      continue;
    }

    field += c;
  }

  pushField();
  if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) pushRow();
  return rows;
}

function normHeaderKey(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[_\-]+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseBoolish(raw: unknown): boolean {
  const s = String(raw ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}

function parseNumberish(raw: unknown): number | undefined {
  const s0 = String(raw ?? '').trim();
  if (!s0) return undefined;
  const s = s0.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function splitList(raw: unknown): string[] {
  const s = String(raw ?? '').trim();
  if (!s) return [];
  return s
    .split(/\s*[|,]\s*/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

function rarityToValue(rarity: SlimItemDocument['rarity']): SlimItemDocument['rarityValue'] {
  if (rarity === 'legendary') return 4;
  if (rarity === 'epic') return 3;
  if (rarity === 'rare') return 2;
  return 1;
}

function propagateCollectionsByBaseId(items: SlimItemDocument[]): SlimItemDocument[] {
  const baseToCollections = new Map<string, Set<string>>();

  for (const it of items) {
    const baseId = String(it.baseId ?? '').trim();
    if (!baseId) continue;
    const set = baseToCollections.get(baseId) ?? new Set<string>();
    for (const c of Array.isArray(it.collections) ? it.collections : []) {
      const v = String(c ?? '').trim();
      if (v) set.add(v);
    }
    baseToCollections.set(baseId, set);
  }

  if (baseToCollections.size === 0) return items;

  return items.map((it) => {
    const baseId = String(it.baseId ?? '').trim();
    if (!baseId) return it;
    const set = baseToCollections.get(baseId);
    if (!set || set.size === 0) return it;
    const merged = Array.from(set);
    const curr = Array.isArray(it.collections) ? it.collections : [];
    if (curr.length === merged.length && curr.every((v) => set.has(v))) return it;
    return { ...it, collections: merged };
  });
}

async function fetchSlimItemsFromCsv(url: string): Promise<SlimItemDocument[]> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`[ChemCity Cache] Failed to fetch slim items CSV (${res.status})`);
  const csvText = await res.text();
  const head = csvText.slice(0, 120).trim().toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) {
    throw new Error('[ChemCity Cache] Slim items CSV fetch returned HTML. Check the published URL / permissions.');
  }
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map(normHeaderKey);
  const idx = (k: string) => {
    const key = normHeaderKey(k);
    const exact = header.indexOf(key);
    if (exact >= 0) return exact;
    return header.findIndex((h) => h.startsWith(key));
  };

  if (idx('id') < 0 && idx('itemid') < 0) {
    throw new Error('[ChemCity Cache] Slim items CSV is missing an "id" column.');
  }

  const get = (r: string[], k: string): string => {
    const i = idx(k);
    if (i < 0) return '';
    return String(r[i] ?? '').trim();
  };

  const items: SlimItemDocument[] = [];
  const seenIds = new Set<string>();
  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri];
    const id = get(r, 'id') || get(r, 'itemid');
    if (!id) continue;

    if (seenIds.has(id)) {
      console.warn(`[ChemCity Cache] Duplicate slim item id in CSV: "${id}" (row ${ri + 1}). Keeping first occurrence.`);
      continue;
    }
    seenIds.add(id);

    const rarityRaw = (get(r, 'rarity') || 'common').toLowerCase();
    const rarity =
      rarityRaw === 'legendary'
        ? 'legendary'
        : rarityRaw === 'epic'
          ? 'epic'
          : rarityRaw === 'rare'
            ? 'rare'
            : rarityRaw === 'uncommon'
              ? 'uncommon'
              : 'common';

    const rarityValueRaw = parseNumberish(get(r, 'rarityvalue'));
    const rarityValue =
      rarityValueRaw === 4 || rarityValueRaw === 3 || rarityValueRaw === 2 || rarityValueRaw === 1
        ? (rarityValueRaw as 1 | 2 | 3 | 4)
        : rarityToValue(rarity);

    const coinCost =
      parseNumberish(get(r, 'tokencost')) ??
      parseNumberish(get(r, 'coincost')) ??
      parseNumberish(get(r, 'shopcoincost'));
    const diamondCost =
      parseNumberish(get(r, 'diamondcost')) ?? parseNumberish(get(r, 'shopdiamondcost'));

    const item: SlimItemDocument = {
      id,
      baseId: get(r, 'baseid') || undefined,
      name: get(r, 'name') || id,
      chemicalFormula: get(r, 'chemicalformula') || get(r, 'formula') || '',
      emoji: get(r, 'emoji') || '🧪',
      imageUrl: normalizeImageUrl(get(r, 'imageurl') || get(r, 'imgurl')),
      rarity,
      rarityValue,
      placeId: (get(r, 'primaryplaceid') as any) || (get(r, 'placeid') as any) || 'lab',
      validSlots: splitList(get(r, 'primarysubplaceid') || get(r, 'validslots')),
      shopData: {
        ...(coinCost != null ? { coinCost } : {}),
        ...(diamondCost != null ? { diamondCost } : {}),
      },
      skillContribution: Number(parseNumberish(get(r, 'skillcontribution')) ?? 0),
      collections: splitList(get(r, 'collectionids') || get(r, 'collections')),
      deprecated: parseBoolish(get(r, 'deprecated')),
    };

    if (!item.imageUrl) delete (item as any).imageUrl;
    items.push(item);
  }

  if (items.length === 0) {
    throw new Error(
      '[ChemCity Cache] Slim items CSV parsed 0 items. Check column headers and that rows contain an id.',
    );
  }

  return propagateCollectionsByBaseId(items);
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

  const version = await (async () => {
    try {
      return serverVersion ?? (await getServerCacheVersion());
    } catch {
      return 0;
    }
  })();

  if (
    manifest &&
    cached &&
    Array.isArray(cached) &&
    cached.length > 0 &&
    !isCacheExpired(manifest) &&
    manifest.version === version
  ) {
    return cached;
  }

  const items = await fetchSlimItemsFromCsv(SLIM_ITEMS_CSV_URL);

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
