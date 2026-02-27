// ============================================================
// ChemCity — Firestore Seeder
// Usage: npx ts-node scripts/seed-firestore.ts
//
// Uploads all items + places to Firestore, then auto-increments
// meta/cacheVersion so all clients get fresh data next open.
//
// IMPORTANT:
//   - Run AFTER excel-to-json.ts
//   - NEVER delete existing item documents — set deprecated:true
//   - After each run, a cacheVersion bump is printed. All clients
//     will refetch static data on next app open.
// ============================================================

import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import Papa from 'papaparse';

// ─── Firebase Admin Init ─────────────────────────────────────
// Expects GOOGLE_APPLICATION_CREDENTIALS env var pointing to
// your service account JSON, OR running in a GCP environment.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

const envCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const envProjectId =
  process.env.CHEMCITY_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT;

const envStorageBucket =
  process.env.CHEMCITY_STORAGE_BUCKET ||
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.GCLOUD_STORAGE_BUCKET;

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function resolveStorageBucket(projectId?: string): string | undefined {
  const raw = (envStorageBucket || '').trim();
  if (raw) return raw;
  if (!projectId) return undefined;
  return `${projectId}.appspot.com`;
}

function storageDownloadUrl(bucketName: string, objectPath: string, token: string): string {
  const encoded = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
}

function extensionFromContentType(contentType: string | null): string {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/jpeg')) return 'jpg';
  if (ct.includes('image/jpg')) return 'jpg';
  if (ct.includes('image/gif')) return 'gif';
  return 'png';
}

function isFirebaseStorageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes('firebasestorage');
  } catch {
    return false;
  }
}

async function fetchImageBuffer(url: string): Promise<{ buf: Buffer; contentType: string | null }> {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      // Helps some hosts that behave differently on unknown UA
      'user-agent': 'ChemCitySeeder/1.0',
      // Avoid referrer restrictions
      'referer': '',
    },
  } as any);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} when fetching image`);
  }
  const contentType = res.headers.get('content-type');
  const arr = await res.arrayBuffer();
  return { buf: Buffer.from(arr), contentType };
}

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf-8'),
  ) as ServiceAccountJson;
  console.log(
    `[Seeder Auth] Using service-account.json (projectId=${serviceAccount.project_id ?? 'unknown'}, email=${serviceAccount.client_email ?? 'unknown'})`,
  );
  const bucket = resolveStorageBucket(serviceAccount.project_id);
  if (bucket) console.log(`[Seeder Storage] bucket=${bucket}`);
  initializeApp({
    credential: cert(serviceAccount as unknown as Record<string, unknown>),
    projectId: serviceAccount.project_id,
    ...(bucket ? { storageBucket: bucket } : {}),
  });
} else if (envCredPath && fs.existsSync(envCredPath)) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(envCredPath, 'utf-8'),
  ) as ServiceAccountJson;
  console.log(
    `[Seeder Auth] Using GOOGLE_APPLICATION_CREDENTIALS (projectId=${serviceAccount.project_id ?? 'unknown'}, email=${serviceAccount.client_email ?? 'unknown'})`,
  );
  const bucket = resolveStorageBucket(serviceAccount.project_id);
  if (bucket) console.log(`[Seeder Storage] bucket=${bucket}`);
  initializeApp({
    credential: cert(serviceAccount as unknown as Record<string, unknown>),
    projectId: serviceAccount.project_id,
    ...(bucket ? { storageBucket: bucket } : {}),
  });
} else {
  // Fall back to Application Default Credentials (CI/cloud)
  console.log('[Seeder Auth] Using applicationDefault()');
  if (!envProjectId) {
    throw new Error(
      'Seeder is using applicationDefault(), but no project id was detected. ' +
        'Set CHEMCITY_FIREBASE_PROJECT_ID (recommended) or GCLOUD_PROJECT / GOOGLE_CLOUD_PROJECT.',
    );
  }
  console.log(`[Seeder Auth] Using projectId=${envProjectId}`);
  const bucket = resolveStorageBucket(envProjectId);
  if (bucket) console.log(`[Seeder Storage] bucket=${bucket}`);
  initializeApp({
    credential: applicationDefault(),
    projectId: envProjectId,
    ...(bucket ? { storageBucket: bucket } : {}),
  });
}

const db = getFirestore();
const storage = getStorage();

// ─── Config ──────────────────────────────────────────────────

const DATA_DIR = path.resolve(__dirname, '../data/items');
const PLACES_FILE = path.resolve(__dirname, '../data/places.json');
const COLLECTIONS_FILE = path.resolve(__dirname, '../data/collections.json');
const TOPICS_FILE = path.resolve(__dirname, '../data/topics.json');

const BATCH_SIZE = 400; // Firestore batch limit is 500 ops

const SHOULD_SEED_GACHA_FLAG = '--seed-gacha';
const SHOULD_UPLOAD_COSMETICS_FLAG = '--upload-cosmetics';
const SHOULD_UPLOAD_BACKGROUNDS_ONLY_FLAG = '--upload-backgrounds-only';
const SHOULD_UPLOAD_RAW_AVATARS_FLAG = '--upload-raw-avatars';
const SHOULD_UPLOAD_THEMED_AVATARS_FLAG = '--upload-themed-avatars';
const SHOULD_HARD_REFRESH_FLAG = '--hard-refresh';
const SHOULD_PURGE_NON_THEMED_V2_FLAG = '--purge-non-themed-v2';
const SHOULD_PURGE_UNUSED_STORAGE_FLAG = '--purge-unused-storage';

const SHOULD_SEED_ITEMS_FROM_CSV_FLAG = '--seed-items-from-csv';

const DEFAULT_ITEMS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT1y1TCVk0zDqeO8V58ZN-Dj3M3rqJZFSLUEjWWTW6f-jlzSpqc8UEl3MGmTw78qOZHJNVEEbJYGojc/pub?gid=0&single=true&output=csv';

// ─── Helpers ─────────────────────────────────────────────────

async function batchWrite(
  collectionName: string,
  docs: Array<{ id: string; [key: string]: unknown }>,
): Promise<void> {
  console.log(`   Uploading ${docs.length} docs to "${collectionName}"...`);
  let batch = db.batch();
  let opCount = 0;
  let totalDocs = 0;

  for (const docData of docs) {
    const { id, ...data } = docData;
    const ref = db.collection(collectionName).doc(id);
    batch.set(ref, data, { merge: true }); // merge:true preserves unlocked fields on user docs
    opCount++;
    totalDocs++;

    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`   ✅ ${totalDocs} docs written to "${collectionName}"`);
}

function readJsonFile<T>(filePath: string, label: string): T[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`   ⚠️  ${label} file not found at ${filePath} — skipping`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T[];
}

function titleCaseFromId(id: string): string {
  return id
    .replace(/^col_/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function safeId(s: string): string {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function cosmeticIdFromFilename(prefix: 'avatar' | 'bg', filename: string): string {
  const normalized = filename.replace(/\.png\.png$/i, '.png');
  const base = normalized
    .replace(/_bg_removed\.png$/i, '')
    .replace(/_bg_removed$/i, '')
    .replace(/\.[^.]+$/, '')
    .replace(/^avator[_-]?/i, '')
    .replace(/^avatar[_-]?/i, '')
    .replace(/^background[_-]?/i, '')
    .trim();

  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

  return `${prefix}_${slug || randomUUID().slice(0, 8)}`;
}

function contentTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

async function uploadLocalFileToStorage(bucketName: string, objectPath: string, localPath: string): Promise<string> {
  const bucket = storage.bucket();
  const token = randomUUID();
  const buf = fs.readFileSync(localPath);
  const file = bucket.file(objectPath);

  await file.save(buf, {
    resumable: false,
    metadata: {
      contentType: contentTypeFromPath(localPath),
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  return storageDownloadUrl(bucketName, objectPath, token);
}

async function uploadBufferToStorage(
  bucketName: string,
  objectPath: string,
  buf: Buffer,
  contentType: string,
): Promise<string> {
  const bucket = storage.bucket();
  const token = randomUUID();
  const file = bucket.file(objectPath);

  await file.save(buf, {
    resumable: false,
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  return storageDownloadUrl(bucketName, objectPath, token);
}

async function padToCanvas(
  buf: Buffer,
  targetW: number,
  targetH: number,
): Promise<Buffer> {
  const img = sharp(buf).ensureAlpha();
  const meta = await img.metadata();
  const w = Number(meta.width);
  const h = Number(meta.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return buf;
  if (w > targetW || h > targetH) return buf;

  const left = Math.floor((targetW - w) / 2);
  const right = targetW - w - left;
  const top = targetH - h;
  const bottom = 0;

  if (left === 0 && right === 0 && top === 0 && bottom === 0) return buf;

  return img
    .extend({
      top,
      bottom,
      left,
      right,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function addTransparentMargin(buf: Buffer, marginPx: number): Promise<Buffer> {
  if (!marginPx || marginPx <= 0) return buf;
  return sharp(buf)
    .ensureAlpha()
    .extend({
      top: marginPx,
      bottom: marginPx,
      left: marginPx,
      right: marginPx,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

const AVATAR_BOY_CROP_RIGHT_PX: Record<string, number> = {
  avatar_26_antman: 18,
};

async function cropRightPx(buf: Buffer, cropPx: number): Promise<Buffer> {
  if (!cropPx || cropPx <= 0) return buf;
  const img = sharp(buf).ensureAlpha();
  const meta = await img.metadata();
  const w = Number(meta.width);
  const h = Number(meta.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 2 || h <= 2) return buf;
  if (cropPx >= w - 1) return buf;
  return img
    .extract({ left: 0, top: 0, width: w - cropPx, height: h })
    .png()
    .toBuffer();
}

// ─── Seed Gacha (Cosmetics + Banners + Events) ───────────────

type SeedCosmetic = {
  id: string;
  [key: string]: unknown;
};

type SeedBanner = {
  id: string;
  entries: Array<{ cosmeticId: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

type SeedEvent = {
  id: string;
  [key: string]: unknown;
};

const GACHA_SEED = {
  cosmetics: [
    {
      id: 'avatar_chemist_01',
      type: 'avatar',
      name: 'Lab Chemist',
      rarity: 'common',
      imageUrl: 'https://storage.example.com/chemcity/cosmetics/avatars/chemist_01.png',
      availability: { channels: { gacha: true, shop: true } },
      shopData: { coinCost: 500 },
      faceCrop: { x: 0.2, y: 0.05, w: 0.6, h: 0.3 },
      tags: ['lab', 'science'],
    },
    {
      id: 'avatar_alchemist_rare',
      type: 'avatar',
      name: 'Dark Alchemist',
      rarity: 'rare',
      imageUrl: 'https://storage.example.com/chemcity/cosmetics/avatars/alchemist_rare.png',
      availability: { channels: { gacha: true, shop: false } },
      faceCrop: { x: 0.15, y: 0.03, w: 0.7, h: 0.35 },
      tags: ['alchemy', 'dark'],
    },
    {
      id: 'avatar_archmage_epic',
      type: 'avatar',
      name: 'Archmage of Elements',
      rarity: 'epic',
      imageUrl: 'https://storage.example.com/chemcity/cosmetics/avatars/archmage_epic.png',
      availability: { channels: { gacha: true, shop: false } },
      faceCrop: { x: 0.2, y: 0.04, w: 0.6, h: 0.32 },
      tags: ['magic', 'elements'],
    },
    {
      id: 'avatar_godchemist_legendary',
      type: 'avatar',
      name: 'God of Chemistry',
      rarity: 'legendary',
      imageUrl: 'https://storage.example.com/chemcity/cosmetics/avatars/godchemist_legendary.png',
      availability: { channels: { gacha: true, shop: false } },
      faceCrop: { x: 0.18, y: 0.02, w: 0.64, h: 0.3 },
      tags: ['legendary', 'divine'],
    },
    {
      id: 'bg_lab_common',
      type: 'background',
      name: 'Chem Lab',
      rarity: 'common',
      imageUrl: 'https://storage.example.com/chemcity/cosmetics/backgrounds/lab_common.png',
      availability: { channels: { gacha: true, shop: true } },
      shopData: { coinCost: 250, ticketCost: 1 },
      tags: ['lab', 'indoor'],
    },
    {
      id: 'bg_volcano_uncommon',
      type: 'background',
      name: 'Volcano Lab',
      rarity: 'uncommon',
      imageUrl: 'https://storage.example.com/chemcity/cosmetics/backgrounds/volcano_uncommon.png',
      availability: { channels: { gacha: true, shop: true } },
      shopData: { coinCost: 600, ticketCost: 2 },
      tags: ['outdoor', 'fire'],
    },
    {
      id: 'bg_crystal_rare',
      type: 'background',
      name: 'Crystal Cavern',
      rarity: 'rare',
      imageUrl: 'https://storage.example.com/chemcity/cosmetics/backgrounds/crystal_rare.png',
      availability: { channels: { gacha: true, shop: false } },
      tags: ['cave', 'magic'],
    },
    {
      id: 'bg_nebula_epic',
      type: 'background',
      name: 'Nebula Observatory',
      rarity: 'epic',
      imageUrl: 'https://storage.example.com/chemcity/cosmetics/backgrounds/nebula_epic.png',
      availability: { channels: { gacha: true, shop: false } },
      tags: ['space', 'epic'],
    },
    {
      id: 'bg_godforge_legendary',
      type: 'background',
      name: 'Godforge',
      rarity: 'legendary',
      imageUrl: 'https://storage.example.com/chemcity/cosmetics/backgrounds/godforge_legendary.png',
      availability: { channels: { gacha: true, shop: false } },
      tags: ['legendary', 'forge'],
    },
    {
      id: 'avatar_neon_event',
      type: 'avatar',
      name: 'Neon Scientist',
      rarity: 'epic',
      imageUrl: 'https://storage.example.com/chemcity/cosmetics/avatars/neon_event.png',
      availability: {
        channels: { gacha: true, shop: false },
        eventKey: 'event_neon_2025',
        startAt: '2025-12-01T00:00:00Z',
        endAt: '2025-12-31T23:59:59Z',
      },
      faceCrop: { x: 0.2, y: 0.04, w: 0.6, h: 0.32 },
      tags: ['neon', 'event', 'limited'],
    },
  ] as const satisfies ReadonlyArray<SeedCosmetic>,
  banners: [
    {
      id: 'banner_standard',
      name: 'Standard Pool',
      active: true,
      rarityRates: { common: 0.5, uncommon: 0.28, rare: 0.15, epic: 0.05, legendary: 0.02 },
      duplicateRefundCoinsByRarity: { common: 24, uncommon: 42, rare: 80, epic: 240, legendary: 600 },
      pityRules: { epicEvery: 20, legendaryEvery: 40 },
      cacheVersion: 1,
      entries: [
        { cosmeticId: 'avatar_chemist_01', rarity: 'common', type: 'avatar', weight: 1, enabled: true },
        { cosmeticId: 'avatar_alchemist_rare', rarity: 'rare', type: 'avatar', weight: 1, enabled: true },
        { cosmeticId: 'avatar_archmage_epic', rarity: 'epic', type: 'avatar', weight: 1, enabled: true },
        { cosmeticId: 'avatar_godchemist_legendary', rarity: 'legendary', type: 'avatar', weight: 1, enabled: true },
        { cosmeticId: 'bg_lab_common', rarity: 'common', type: 'background', weight: 1, enabled: true },
        { cosmeticId: 'bg_volcano_uncommon', rarity: 'uncommon', type: 'background', weight: 1, enabled: true },
        { cosmeticId: 'bg_crystal_rare', rarity: 'rare', type: 'background', weight: 1, enabled: true },
        { cosmeticId: 'bg_nebula_epic', rarity: 'epic', type: 'background', weight: 1, enabled: true },
        { cosmeticId: 'bg_godforge_legendary', rarity: 'legendary', type: 'background', weight: 1, enabled: true },
      ],
    },
  ] as const satisfies ReadonlyArray<SeedBanner>,
  events: [
    {
      id: 'event_neon_2025',
      name: 'Neon Science Fair',
      description: 'Limited neon-themed cosmetics for the science fair season!',
      startAt: '2025-12-01T00:00:00Z',
      endAt: '2025-12-31T23:59:59Z',
      isActive: true,
      bannerIds: ['banner_neon_event'],
    },
  ] as const satisfies ReadonlyArray<SeedEvent>,
};

async function seedGacha(): Promise<void> {
  console.log('\n🎟️  Seeding gacha (cosmetics, banners, entries, events)...');

  // IMPORTANT:
  // If you've already uploaded real cosmetics (with Firebase Storage URLs),
  // do NOT overwrite them with the demo placeholders from GACHA_SEED.
  // Instead, we build banner entries from whatever cosmetics exist in Firestore.
  const cosmeticsSnap = await db.collection('cosmetics').get();
  const existingCosmetics = cosmeticsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((c) => c?.deprecated !== true);

  const hasAnyCosmetics = existingCosmetics.length > 0;
  const hasRealUploadedCosmetics = existingCosmetics.some((c) => typeof c?.imageUrl === 'string' && isFirebaseStorageUrl(c.imageUrl));

  if (!hasAnyCosmetics) {
    await batchWrite('cosmetics', GACHA_SEED.cosmetics.map((c) => ({ ...c })) as any);
  } else if (!hasRealUploadedCosmetics) {
    console.log('   ℹ️  Cosmetics exist but none look like Firebase Storage URLs. Leaving cosmetics unchanged.');
  } else {
    console.log(`   ✅ Found ${existingCosmetics.length} existing cosmetics (with Firebase Storage URLs). Skipping demo cosmetics seed.`);

    // Clean up any old demo cosmetics so they don't leak into UI or future pools.
    const demoCosmetics = existingCosmetics.filter(
      (c) => typeof c?.imageUrl === 'string' && String(c.imageUrl).includes('storage.example.com'),
    );
    if (demoCosmetics.length > 0) {
      console.log(`   🧹 Deprecating ${demoCosmetics.length} demo cosmetics (storage.example.com)...`);
      let demoBatch = db.batch();
      let demoOps = 0;
      for (const c of demoCosmetics) {
        const ref = db.collection('cosmetics').doc(String(c.id));
        demoBatch.set(
          ref,
          {
            deprecated: true,
            availability: { channels: { gacha: false, shop: false } },
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
        demoOps++;
        if (demoOps >= BATCH_SIZE) {
          await demoBatch.commit();
          demoBatch = db.batch();
          demoOps = 0;
        }
      }
      if (demoOps > 0) await demoBatch.commit();
    }
  }

  // Banners + entries use a nested subcollection; batchWrite() only handles top-level collections.
  console.log(`   Uploading ${GACHA_SEED.banners.length} docs to "gachaBanners" + entries...`);

  let batch = db.batch();
  let opCount = 0;
  let totalOps = 0;

  const bannerDoc = GACHA_SEED.banners[0];
  const bannerId = bannerDoc?.id || 'banner_standard';
  const { id: _ignoredId, entries: _ignoredEntries, ...bannerData } = bannerDoc;

  batch.set(db.collection('gachaBanners').doc(bannerId), bannerData, { merge: true });
  opCount++;
  totalOps++;

  // Build entries from existing cosmetics when available.
  const gachaEnabledCosmetics = hasAnyCosmetics
    ? existingCosmetics.filter((c) => c?.availability?.channels?.gacha === true)
    : [];

  // Prefer only real uploaded cosmetics (Firebase Storage URLs) to avoid demo placeholders.
  const realGachaCosmetics = gachaEnabledCosmetics.filter(
    (c) => typeof c?.imageUrl === 'string' && isFirebaseStorageUrl(String(c.imageUrl)),
  );

  const cosmeticsForEntries = realGachaCosmetics.length > 0
    ? realGachaCosmetics
    : gachaEnabledCosmetics;

  const entrySource = hasAnyCosmetics
    ? cosmeticsForEntries.map((c) => ({
      cosmeticId: String(c.id),
      rarity: String(c.gachaRarity || c.rarity || 'common'),
      type: String(c.type || 'avatar'),
      weight: Number.isFinite(Number(c.gachaWeight)) && Number(c.gachaWeight) > 0 ? Number(c.gachaWeight) : 1,
      enabled: true,
    }))
    : bannerDoc.entries;

  // Remove stale entry docs from previous seeds (e.g. demo entries) so they can't be drawn.
  const desiredEntryIds = new Set(entrySource.map((e) => String((e as any).cosmeticId)));
  const existingEntriesSnap = await db.collection('gachaBanners').doc(bannerId).collection('entries').get();
  const staleEntries = existingEntriesSnap.docs.filter((d) => !desiredEntryIds.has(d.id));
  if (staleEntries.length > 0) {
    console.log(`   🧹 Deleting ${staleEntries.length} stale banner entries...`);
    for (const docSnap of staleEntries) {
      batch.delete(docSnap.ref);
      opCount++;
      totalOps++;
      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }
  }

  for (const entry of entrySource) {
    const { cosmeticId, ...entryData } = entry;
    batch.set(
      db.collection('gachaBanners').doc(bannerId).collection('entries').doc(cosmeticId),
      entryData,
      { merge: true },
    );
    opCount++;
    totalOps++;

    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`   ✅ ${totalOps} ops written for banners + entries`);

  await batchWrite('events', GACHA_SEED.events.map((e) => ({ ...e })) as any);
}

// ─── Seed Items ───────────────────────────────────────────────

async function seedItems(): Promise<number> {
  if (!fs.existsSync(DATA_DIR)) {
    console.warn(`   ⚠️  Items data directory not found: ${DATA_DIR} — skipping items seed`);
    return 0;
  }

  const jsonFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  if (jsonFiles.length === 0) {
    console.warn(`   ⚠️  No item JSON files found in ${DATA_DIR} — skipping items seed`);
    return 0;
  }

  const allItems: Array<{ id: string; [key: string]: unknown }> = [];

  for (const file of jsonFiles) {
    const items = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'),
    ) as Array<{ id: string }>;
    allItems.push(...items);
  }

  await batchWrite('items', allItems);
  return allItems.length;
}

function splitList(raw: unknown): string[] {
  const s = String(raw ?? '').trim();
  if (!s) return [];
  return s
    .split(/\s*[|,]\s*/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function propagateCollectionsByBaseId(
  docs: Array<{ id: string; baseId?: unknown; collections?: unknown }>,
): Array<{ id: string; baseId?: unknown; collections?: unknown }> {
  const baseToCollections = new Map<string, Set<string>>();

  for (const d of docs) {
    const baseId = String((d as any)?.baseId ?? '').trim();
    if (!baseId) continue;
    const set = baseToCollections.get(baseId) ?? new Set<string>();
    const curr = Array.isArray((d as any)?.collections) ? ((d as any).collections as unknown[]) : [];
    for (const c of curr) {
      const v = String(c ?? '').trim();
      if (v) set.add(v);
    }
    baseToCollections.set(baseId, set);
  }

  if (baseToCollections.size === 0) return docs;

  return docs.map((d) => {
    const baseId = String((d as any)?.baseId ?? '').trim();
    if (!baseId) return d;
    const set = baseToCollections.get(baseId);
    if (!set || set.size === 0) return d;
    const merged = Array.from(set).sort();
    const curr = Array.isArray((d as any)?.collections) ? ((d as any).collections as unknown[]) : [];
    const currSet = new Set(curr.map((x) => String(x ?? '').trim()).filter(Boolean));
    if (currSet.size === merged.length && merged.every((x) => currSet.has(x))) return d;
    return { ...(d as any), collections: merged } as any;
  });
}

function parseBoolean(raw: unknown): boolean {
  const s = String(raw ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

async function seedItemsFromCsv(csvUrl: string): Promise<number> {
  console.log(`\n🧾 Seeding items from CSV: ${csvUrl}`);
  const res = await fetch(csvUrl, { redirect: 'follow' } as any);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} when fetching items CSV`);
  }
  const csvText = await res.text();
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors?.length) {
    const msg = parsed.errors[0]?.message || 'Unknown CSV parse error';
    throw new Error(`CSV parse error: ${msg}`);
  }

  const docs: Array<{ id: string; [key: string]: unknown }> = [];

  for (const row of parsed.data || []) {
    const id = String((row as any)?.id ?? '').trim();
    if (!id) continue;

    const coinCostRaw = String((row as any)?.coinCost ?? '').trim();
    const diamondCostRaw = String((row as any)?.diamondCost ?? '').trim();
    const coinCost = Number(coinCostRaw);
    const diamondCost = Number(diamondCostRaw);

    const shopData: Record<string, unknown> = {};
    if (Number.isFinite(coinCost) && coinCost > 0) shopData.coinCost = coinCost;
    if (Number.isFinite(diamondCost) && diamondCost > 0) shopData.diamondCost = diamondCost;

    const collections = splitList((row as any)?.collections ?? (row as any)?.collectionIds ?? '');

    docs.push({
      id,
      name: String((row as any)?.name ?? '').trim(),
      chemicalFormula: String((row as any)?.chemicalFormula ?? '').trim(),
      chemicalKey: String((row as any)?.chemicalKey ?? '').trim(),
      baseId: String((row as any)?.baseId ?? '').trim(),
      placeId: String((row as any)?.placeId ?? '').trim(),
      validSlots: splitList((row as any)?.validSlots ?? ''),
      imageUrl: String((row as any)?.imageUrl ?? '').trim(),
      imageKey: String((row as any)?.imageKey ?? '').trim(),
      imageFile: String((row as any)?.imageFile ?? '').trim(),
      spriteFile: String((row as any)?.spriteFile ?? '').trim(),
      rarity: String((row as any)?.rarity ?? '').trim() || 'common',
      rarityValue: Number(String((row as any)?.rarityValue ?? '').trim() || 0) || undefined,
      deprecated: parseBoolean((row as any)?.deprecated ?? ''),
      topicId: String((row as any)?.topicId ?? '').trim(),
      description: String((row as any)?.description ?? '').trim(),
      funFact: String((row as any)?.funFact ?? '').trim(),
      collections,
      ...(Object.keys(shopData).length ? { shopData } : {}),
    });
  }

  const mergedDocs = propagateCollectionsByBaseId(
    docs as Array<{ id: string; baseId?: unknown; collections?: unknown }>,
  ) as Array<{ id: string; [key: string]: unknown }>;

  if (docs.length === 0) {
    console.warn('   ⚠️  No rows parsed from CSV — skipping');
    return 0;
  }

  await batchWrite('items', mergedDocs);
  return mergedDocs.length;
}

// ─── Migrate Item Images to Firebase Storage (optional) ───────

async function migrateItemImagesToStorage(): Promise<void> {
  const bucket = storage.bucket();
  const bucketName = bucket.name;
  if (!bucketName) {
    throw new Error(
      'Firebase Storage bucket is not configured. Set CHEMCITY_STORAGE_BUCKET (recommended) or ensure admin app has storageBucket.',
    );
  }

  console.log(`\n🖼️  Migrating item images to Firebase Storage (bucket=${bucketName})...`);

  const itemsSnap = await db.collection('items').get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Array<{
    id: string;
    imageUrl?: unknown;
  }>;

  const candidates = items
    .map((it) => ({ id: it.id, imageUrl: typeof it.imageUrl === 'string' ? it.imageUrl.trim() : '' }))
    .filter((it) => !!it.imageUrl && !isFirebaseStorageUrl(it.imageUrl));

  console.log(`   Found ${candidates.length} items with non-Storage imageUrl.`);
  if (candidates.length === 0) return;

  let batch = db.batch();
  let opCount = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const it of candidates) {
    const itemId = it.id;
    const srcUrl = it.imageUrl;
    const docRef = db.collection('items').doc(itemId);

    try {
      const { buf, contentType } = await fetchImageBuffer(srcUrl);
      const ext = extensionFromContentType(contentType);
      const objectPath = `chemcity/items/${itemId}.${ext}`;

      const token = randomUUID();
      const file = bucket.file(objectPath);

      await file.save(buf, {
        resumable: false,
        metadata: {
          contentType: contentType || undefined,
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: {
            firebaseStorageDownloadTokens: token,
          },
        },
      });

      const nextUrl = storageDownloadUrl(bucketName, objectPath, token);

      batch.set(docRef, { imageUrl: nextUrl }, { merge: true });
      opCount++;
      migrated++;

      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    } catch (err: any) {
      failed++;
      console.warn(`   ⚠️  Failed to migrate image for item=${itemId}: ${err?.message ?? String(err)}`);
      // Keep going
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`   ✅ Image migration complete. migrated=${migrated}, skipped=${skipped}, failed=${failed}`);
}

// ─── Upload Cosmetics Assets to Firebase Storage (optional) ───

async function uploadCosmeticsAssets(): Promise<void> {
  const bucket = storage.bucket();
  const bucketName = bucket.name;
  if (!bucketName) {
    throw new Error(
      'Firebase Storage bucket is not configured. Set CHEMCITY_STORAGE_BUCKET (recommended) or ensure admin app has storageBucket.',
    );
  }

  const avatarsDir =
    process.env.CHEMCITY_AVATARS_DIR ||
    path.resolve(process.env.HOME || '', 'Desktop/Chem Image/Chem custome_renamed');
  const backgroundsDir =
    process.env.CHEMCITY_BACKGROUNDS_DIR ||
    path.resolve(process.env.HOME || '', 'Desktop/Chem Image/Chem background');

  console.log(`\n🧑🖼️  Uploading cosmetics assets to Firebase Storage (bucket=${bucketName})...`);
  console.log(`   Avatars dir: ${avatarsDir}`);
  console.log(`   Backgrounds dir: ${backgroundsDir}`);

  if (!fs.existsSync(avatarsDir)) {
    throw new Error(`Avatars directory not found: ${avatarsDir}`);
  }
  if (!fs.existsSync(backgroundsDir)) {
    throw new Error(`Backgrounds directory not found: ${backgroundsDir}`);
  }

  const allAvatarFilenames = fs.readdirSync(avatarsDir);

  const avatarFiles = allAvatarFilenames
    .filter((f) => /_bg_removed\.png(\.png)?$/i.test(f))
    .map((f) => path.join(avatarsDir, f));

  const avatarBgRemovedNums = new Set<string>();
  for (const f of allAvatarFilenames) {
    if (!/_bg_removed\.png(\.png)?$/i.test(f)) continue;
    const m = f.match(/^(?:avator|avatar)[_-]?(\d+)/i);
    if (m?.[1]) avatarBgRemovedNums.add(m[1]);
  }

  const rawAvatarFilesByNum = new Map<string, string>();
  for (const raw of allAvatarFilenames) {
    const normalized = raw.replace(/\.png\.png$/i, '.png');
    if (!/\.(png|webp|jpg|jpeg)$/i.test(normalized)) continue;
    if (/_bg_removed(\.[^.]+)?$/i.test(normalized)) continue;
    if (/_mask(\.[^.]+)?$/i.test(normalized)) continue;

    const m = normalized.match(/^(?:avator|avatar)[_-]?(\d+)/i);
    if (!m?.[1]) continue;
    const num = m[1];
    if (!rawAvatarFilesByNum.has(num)) {
      rawAvatarFilesByNum.set(num, path.join(avatarsDir, raw));
    }
  }

  const avatarBaseByNumber = new Map<string, string>();
  for (const raw of allAvatarFilenames) {
    const normalized = raw.replace(/\.png\.png$/i, '.png');
    if (!/\.(png|webp|jpg|jpeg)$/i.test(normalized)) continue;
    if (/_bg_removed(\.[^.]+)?$/i.test(normalized)) continue;

    const noExt = normalized.replace(/\.[^.]+$/, '');
    const base = noExt.replace(/^avator[_-]?/i, '').trim();
    const m = base.match(/^(\d+)(?:[_-].+)?$/);
    if (!m) continue;
    const num = m[1];
    if (!avatarBaseByNumber.has(num)) {
      avatarBaseByNumber.set(num, base.replace(/\s+/g, '_'));
    }
  }

  const backgroundFiles = fs
    .readdirSync(backgroundsDir)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map((f) => path.join(backgroundsDir, f));

  console.log(`   Found ${avatarFiles.length} avatar files (*_bg_removed.png)`);
  console.log(`   Found ${backgroundFiles.length} background files`);

  if (avatarFiles.length === 0 && backgroundFiles.length === 0) {
    console.log('   Nothing to upload.');
    return;
  }

  const ops: Array<{ id: string; patch: Record<string, unknown> }> = [];

  function avatarRarityFromNumber(numStr?: string): { rarity: string; gachaEnabled: boolean } {
    const n = Number(numStr);
    if (!Number.isFinite(n) || n <= 0) return { rarity: 'common', gachaEnabled: true };
    if (n === 1) return { rarity: 'common', gachaEnabled: false };

    // Rotation of 7 starting from #2:
    // 1-2 common, 3-4 uncommon, 5 rare, 6 epic, 7 legendary
    const offset = (n - 2) % 7;
    if (offset === 0 || offset === 1) return { rarity: 'common', gachaEnabled: true };
    if (offset === 2 || offset === 3) return { rarity: 'uncommon', gachaEnabled: true };
    if (offset === 4) return { rarity: 'rare', gachaEnabled: true };
    if (offset === 5) return { rarity: 'epic', gachaEnabled: true };
    return { rarity: 'legendary', gachaEnabled: true };
  }

  for (const filePath of avatarFiles) {
    const filename = path.basename(filePath);
    const numMatch = filename.match(/^(?:avator|avatar)[_-]?(\d+)/i);
    const num = numMatch?.[1];
    const mappedBase = num ? avatarBaseByNumber.get(num) : undefined;
    const id = mappedBase
      ? cosmeticIdFromFilename('avatar', `avatar_${mappedBase}.png`)
      : cosmeticIdFromFilename('avatar', filename);

    const { rarity, gachaEnabled } = avatarRarityFromNumber(num);
    const objectPath = `chemcity/cosmetics/avatars/${id}.png`;
    const imageUrl = await uploadLocalFileToStorage(bucketName, objectPath, filePath);

    let imageUrlBoy: string | undefined;
    let imageUrlGirl: string | undefined;
    try {
      const base = sharp(fs.readFileSync(filePath)).ensureAlpha();
      const meta = await base.metadata();
      const w = Number(meta.width);
      const h = Number(meta.height);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 2 && h > 2) {
        const halfW = Math.floor(w / 2);

        // IMPORTANT:
        // To make BOY and GIRL halves share the same visual center, we must trim/pad the FULL
        // avatar first (one bounding box), then split. Trimming each half independently causes
        // different padding offsets and breaks "same tuning == same placement".
        let processedFullBuf: Buffer;
        try {
          processedFullBuf = await base.clone().trim({ threshold: 0 }).png().toBuffer();
        } catch {
          processedFullBuf = await base.clone().png().toBuffer();
        }
        try {
          processedFullBuf = await addTransparentMargin(processedFullBuf, 6);
        } catch {
          // ignore
        }
        try {
          processedFullBuf = await padToCanvas(processedFullBuf, w, h);
        } catch {
          // ignore
        }

        const processed = sharp(processedFullBuf).ensureAlpha();
        let boyBuf = await processed
          .clone()
          .extract({ left: 0, top: 0, width: halfW, height: h })
          .png()
          .toBuffer();
        let girlBuf = await processed
          .clone()
          .extract({ left: w - halfW, top: 0, width: halfW, height: h })
          .png()
          .toBuffer();

        // After splitting, re-center EACH half by trimming transparent padding,
        // then padding back to the fixed half canvas. This makes boy/girl
        // halves individually centered so identical tuning values align.
        try {
          boyBuf = await sharp(boyBuf).ensureAlpha().trim({ threshold: 0 }).png().toBuffer();
        } catch {
          // ignore
        }
        try {
          girlBuf = await sharp(girlBuf).ensureAlpha().trim({ threshold: 0 }).png().toBuffer();
        } catch {
          // ignore
        }

        const cropRight = AVATAR_BOY_CROP_RIGHT_PX[id];
        if (cropRight) {
          try {
            boyBuf = await cropRightPx(boyBuf, cropRight);
          } catch {
            // ignore
          }
        }
        try {
          boyBuf = await addTransparentMargin(boyBuf, 6);
          girlBuf = await addTransparentMargin(girlBuf, 6);
        } catch {
          // ignore
        }
        try {
          boyBuf = await padToCanvas(boyBuf, halfW, h);
          girlBuf = await padToCanvas(girlBuf, halfW, h);
        } catch {
          // ignore
        }

        imageUrlBoy = await uploadBufferToStorage(
          bucketName,
          `chemcity/cosmetics/avatars_gendered_v3/${id}_boy.png`,
          boyBuf,
          'image/png',
        );
        imageUrlGirl = await uploadBufferToStorage(
          bucketName,
          `chemcity/cosmetics/avatars_gendered_v3/${id}_girl.png`,
          girlBuf,
          'image/png',
        );
      }
    } catch (err: any) {
      console.warn(`   ⚠️  Failed to generate gendered avatar images for ${id}: ${err?.message ?? String(err)}`);
    }

    ops.push({
      id,
      patch: {
        type: 'avatar',
        name: titleCaseFromId(id),
        rarity,
        imageUrl,
        ...(imageUrlBoy ? { imageUrlBoy } : {}),
        ...(imageUrlGirl ? { imageUrlGirl } : {}),
        availability: { channels: { gacha: gachaEnabled, shop: true } },
        shopData: { coinCost: 500 },
        updatedAt: new Date().toISOString(),
      },
    });
  }

  // Also upload avatars that have NO bg-removed version (by number)
  for (const [num, filePath] of rawAvatarFilesByNum.entries()) {
    if (avatarBgRemovedNums.has(num)) continue;

    const filename = path.basename(filePath);
    const mappedBase = avatarBaseByNumber.get(num);
    const id = mappedBase
      ? cosmeticIdFromFilename('avatar', `avatar_${mappedBase}.png`)
      : cosmeticIdFromFilename('avatar', filename);

    const { rarity, gachaEnabled } = avatarRarityFromNumber(num);
    const objectPath = `chemcity/cosmetics/avatars/${id}.png`;
    const imageUrl = await uploadLocalFileToStorage(bucketName, objectPath, filePath);

    let imageUrlBoy: string | undefined;
    let imageUrlGirl: string | undefined;
    try {
      const base = sharp(fs.readFileSync(filePath)).ensureAlpha();
      const meta = await base.metadata();
      const w = Number(meta.width);
      const h = Number(meta.height);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 2 && h > 2) {
        const halfW = Math.floor(w / 2);
        const boyHalf = base.clone().extract({ left: 0, top: 0, width: halfW, height: h });
        const girlHalf = base.clone().extract({ left: w - halfW, top: 0, width: halfW, height: h });

        let boyBuf: Buffer;
        let girlBuf: Buffer;
        try {
          boyBuf = await boyHalf.clone().trim({ threshold: 1 }).png().toBuffer();
          girlBuf = await girlHalf.clone().trim({ threshold: 1 }).png().toBuffer();
        } catch {
          boyBuf = await boyHalf.clone().png().toBuffer();
          girlBuf = await girlHalf.clone().png().toBuffer();
        }

        const cropRight = AVATAR_BOY_CROP_RIGHT_PX[id];
        if (cropRight) {
          try {
            boyBuf = await cropRightPx(boyBuf, cropRight);
          } catch {
            // ignore
          }
        }

        imageUrlBoy = await uploadBufferToStorage(
          bucketName,
          `chemcity/cosmetics/avatars_gendered/${id}_boy.png`,
          boyBuf,
          'image/png',
        );
        imageUrlGirl = await uploadBufferToStorage(
          bucketName,
          `chemcity/cosmetics/avatars_gendered/${id}_girl.png`,
          girlBuf,
          'image/png',
        );
      }
    } catch (err: any) {
      console.warn(`   ⚠️  Failed to generate gendered avatar images for ${id}: ${err?.message ?? String(err)}`);
    }

    ops.push({
      id,
      patch: {
        type: 'avatar',
        name: titleCaseFromId(id),
        rarity,
        imageUrl,
        ...(imageUrlBoy ? { imageUrlBoy } : {}),
        ...(imageUrlGirl ? { imageUrlGirl } : {}),
        availability: { channels: { gacha: gachaEnabled, shop: true } },
        shopData: { coinCost: 500 },
        updatedAt: new Date().toISOString(),
      },
    });
  }

  for (const filePath of backgroundFiles) {
    const filename = path.basename(filePath);
    const id = cosmeticIdFromFilename('bg', filename);
    const ext = path.extname(filename).toLowerCase().replace('.', '') || 'jpg';
    const objectPath = `chemcity/cosmetics/backgrounds/${id}.${ext}`;
    const imageUrl = await uploadLocalFileToStorage(bucketName, objectPath, filePath);
    ops.push({
      id,
      patch: {
        type: 'background',
        name: titleCaseFromId(id),
        rarity: 'common',
        imageUrl,
        availability: { channels: { gacha: true, shop: true } },
        shopData: { coinCost: 250 },
        updatedAt: new Date().toISOString(),
      },
    });
  }

  console.log(`   Upserting ${ops.length} cosmetics docs to Firestore...`);

  let batch = db.batch();
  let opCount = 0;

  for (const op of ops) {
    const ref = db.collection('cosmetics').doc(op.id);
    batch.set(ref, op.patch, { merge: true });
    opCount++;

    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log('   ✅ Cosmetics upload complete.');
}

async function uploadBackgroundsOnly(): Promise<void> {
  const bucket = storage.bucket();
  const bucketName = bucket.name;
  if (!bucketName) {
    throw new Error(
      'Firebase Storage bucket is not configured. Set CHEMCITY_STORAGE_BUCKET (recommended) or ensure admin app has storageBucket.',
    );
  }

  const backgroundsDir =
    process.env.CHEMCITY_BACKGROUNDS_DIR ||
    path.resolve(process.env.HOME || '', 'Desktop/Chem Image/Chem background');

  console.log(`\n🖼️  Uploading BACKGROUNDS ONLY to Firebase Storage (bucket=${bucketName})...`);
  console.log(`   Backgrounds dir: ${backgroundsDir}`);

  if (!fs.existsSync(backgroundsDir)) {
    throw new Error(`Backgrounds directory not found: ${backgroundsDir}`);
  }

  const backgroundFiles = fs
    .readdirSync(backgroundsDir)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map((f) => path.join(backgroundsDir, f));

  console.log(`   Found ${backgroundFiles.length} background files`);
  if (backgroundFiles.length === 0) {
    console.log('   Nothing to upload.');
    return;
  }

  const ops: Array<{ id: string; patch: Record<string, unknown> }> = [];
  for (const filePath of backgroundFiles) {
    const filename = path.basename(filePath);
    const id = cosmeticIdFromFilename('bg', filename);
    const ext = path.extname(filename).toLowerCase().replace('.', '') || 'jpg';
    const objectPath = `chemcity/cosmetics/backgrounds/${id}.${ext}`;
    const imageUrl = await uploadLocalFileToStorage(bucketName, objectPath, filePath);
    ops.push({
      id,
      patch: {
        type: 'background',
        name: titleCaseFromId(id),
        rarity: 'common',
        imageUrl,
        availability: { channels: { gacha: true, shop: true } },
        shopData: { coinCost: 250 },
        updatedAt: new Date().toISOString(),
      },
    });
  }

  console.log(`   Upserting ${ops.length} background cosmetics docs to Firestore...`);
  let batch = db.batch();
  let opCount = 0;
  for (const op of ops) {
    const ref = db.collection('cosmetics').doc(op.id);
    batch.set(ref, op.patch, { merge: true });
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) {
    await batch.commit();
  }

  console.log('   ✅ Background cosmetics upsert complete.');
}

async function uploadRawAvatarsAssets(): Promise<void> {
  const bucket = storage.bucket();
  const bucketName = bucket.name;
  if (!bucketName) {
    throw new Error(
      'Firebase Storage bucket is not configured. Set CHEMCITY_STORAGE_BUCKET (recommended) or ensure admin app has storageBucket.',
    );
  }

  const avatarsDir =
    process.env.CHEMCITY_AVATARS_DIR ||
    path.resolve(process.env.HOME || '', 'Desktop/Chem Image/Chem custome_renamed');

  console.log(`\n🧑  Uploading RAW avatars to Firebase Storage (bucket=${bucketName})...`);
  console.log(`   Avatars dir: ${avatarsDir}`);

  if (!fs.existsSync(avatarsDir)) {
    throw new Error(`Avatars directory not found: ${avatarsDir}`);
  }

  const rawFilenames = fs.readdirSync(avatarsDir);
  const rawFiles = rawFilenames
    .filter((f) => /\.(png|webp|jpg|jpeg)$/i.test(f))
    .filter((f) => !/_bg_removed\.(png|webp|jpg|jpeg)(\.png)?$/i.test(f) && !/_bg_removed\b/i.test(f))
    .filter((f) => !/_mask\.(png|webp|jpg|jpeg)$/i.test(f) && !/_mask\b/i.test(f))
    .map((f) => path.join(avatarsDir, f));

  console.log(`   Found ${rawFiles.length} raw avatar files (excluding _bg_removed)`);
  if (rawFiles.length === 0) {
    console.log('   Nothing to upload.');
    return;
  }

  let uploaded = 0;
  for (const filePath of rawFiles) {
    const filename = path.basename(filePath);
    const id = cosmeticIdFromFilename('avatar', filename);
    const objectPath = `chemcity/cosmetics/avatars_raw/${id}${path.extname(filename).toLowerCase() || '.png'}`;
    await uploadLocalFileToStorage(bucketName, objectPath, filePath);
    uploaded++;
  }

  console.log(`   ✅ Raw avatars upload complete. uploaded=${uploaded}`);
}

async function uploadThemedAvatarsAssets(): Promise<void> {
  const bucket = storage.bucket();
  const bucketName = bucket.name;
  if (!bucketName) {
    throw new Error(
      'Firebase Storage bucket is not configured. Set CHEMCITY_STORAGE_BUCKET (recommended) or ensure admin app has storageBucket.',
    );
  }

  const themedDir =
    process.env.CHEMCITY_THEMED_AVATARS_DIR ||
    path.resolve(process.env.HOME || '', 'Desktop/Chem Image/Chem custome_transparent_themed');
  const manifestPath =
    process.env.CHEMCITY_THEMED_AVATARS_MANIFEST || path.join(themedDir, 'avatars_theme_manifest.json');

  const objectPrefix =
    process.env.CHEMCITY_THEMED_AVATARS_PREFIX || 'chemcity/cosmetics/avatars_themed_v2';
  const genderedPrefix =
    process.env.CHEMCITY_THEMED_AVATARS_GENDERED_PREFIX || 'chemcity/cosmetics/avatars_themed_gendered_v2';

  console.log(`\n🧑🖼️  Uploading THEMED avatars to Firebase Storage (bucket=${bucketName})...`);
  console.log(`   Themed avatars dir: ${themedDir}`);
  console.log(`   Manifest: ${manifestPath}`);

  if (!fs.existsSync(themedDir)) {
    throw new Error(`Themed avatars directory not found: ${themedDir}`);
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Themed avatars manifest not found: ${manifestPath}`);
  }

  type ThemedManifestEntry = {
    avatarNumber: number;
    dstFile: string;
    theme: string;
    rarity: string;
    rarityCode: string;
    collection: string;
  };

  const entries = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ThemedManifestEntry[];
  console.log(`   Found ${entries.length} themed avatar entries in manifest`);
  if (entries.length === 0) {
    console.log('   Nothing to upload.');
    return;
  }

  const ops: Array<{ id: string; patch: Record<string, unknown> }> = [];

  for (const e of entries) {
    const n = Number(e.avatarNumber);
    if (!Number.isFinite(n) || n <= 0) continue;

    const filePath = path.join(themedDir, e.dstFile);
    if (!fs.existsSync(filePath)) {
      console.warn(`   ⚠️  Missing themed file: ${filePath}`);
      continue;
    }

    const themeKey = safeId(String(e.theme || 'unknown'));
    const id = `avatar_${n}_${themeKey}`;

    const base = sharp(fs.readFileSync(filePath)).ensureAlpha();
    const meta = await base.metadata();
    const w = Number(meta.width);
    const h = Number(meta.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 2 || h <= 2) {
      console.warn(`   ⚠️  Invalid dimensions for ${e.dstFile} (w=${w}, h=${h})`);
      continue;
    }

    const halfW = Math.floor(w / 2);

    let processedFullBuf: Buffer;
    try {
      processedFullBuf = await base.clone().trim({ threshold: 0 }).png().toBuffer();
    } catch {
      processedFullBuf = await base.clone().png().toBuffer();
    }
    try {
      processedFullBuf = await addTransparentMargin(processedFullBuf, 6);
    } catch {
      // ignore
    }
    try {
      processedFullBuf = await padToCanvas(processedFullBuf, w, h);
    } catch {
      // ignore
    }

    const processed = sharp(processedFullBuf).ensureAlpha();
    let boyBuf = await processed
      .clone()
      .extract({ left: 0, top: 0, width: halfW, height: h })
      .png()
      .toBuffer();
    let girlBuf = await processed
      .clone()
      .extract({ left: w - halfW, top: 0, width: halfW, height: h })
      .png()
      .toBuffer();

    try {
      boyBuf = await sharp(boyBuf).ensureAlpha().trim({ threshold: 0 }).png().toBuffer();
    } catch {
      // ignore
    }
    try {
      girlBuf = await sharp(girlBuf).ensureAlpha().trim({ threshold: 0 }).png().toBuffer();
    } catch {
      // ignore
    }
    try {
      boyBuf = await addTransparentMargin(boyBuf, 6);
      girlBuf = await addTransparentMargin(girlBuf, 6);
    } catch {
      // ignore
    }
    try {
      boyBuf = await padToCanvas(boyBuf, halfW, h);
      girlBuf = await padToCanvas(girlBuf, halfW, h);
    } catch {
      // ignore
    }

    const objectPath = `${objectPrefix}/${id}.png`;
    const imageUrl = await uploadBufferToStorage(bucketName, objectPath, processedFullBuf, 'image/png');

    const imageUrlBoy = await uploadBufferToStorage(
      bucketName,
      `${genderedPrefix}/${id}_boy.png`,
      boyBuf,
      'image/png',
    );
    const imageUrlGirl = await uploadBufferToStorage(
      bucketName,
      `${genderedPrefix}/${id}_girl.png`,
      girlBuf,
      'image/png',
    );

    const rarity = typeof e.rarity === 'string' && e.rarity ? e.rarity : 'common';
    const collection = typeof e.collection === 'string' && e.collection ? e.collection : 'basic';

    const tags = Array.from(
      new Set(
        [String(e.theme || '').trim(), collection, rarity]
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t) => safeId(t)),
      ),
    );

    ops.push({
      id,
      patch: {
        type: 'avatar',
        name: String(e.theme || titleCaseFromId(id)),
        rarity,
        imageUrl,
        imageUrlBoy,
        imageUrlGirl,
        tags,
        collection,
        availability: { channels: { gacha: true, shop: true } },
        shopData: { coinCost: 500 },
        updatedAt: new Date().toISOString(),
      },
    });
  }

  console.log(`   Upserting ${ops.length} themed avatar cosmetics docs to Firestore...`);
  let batch = db.batch();
  let opCount = 0;
  for (const op of ops) {
    const ref = db.collection('cosmetics').doc(op.id);
    batch.set(ref, op.patch, { merge: true });
    opCount++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) {
    await batch.commit();
  }

  console.log('   ✅ Themed avatars upload complete.');
}

async function purgeNonThemedCosmeticsV2(): Promise<void> {
  const themedDir =
    process.env.CHEMCITY_THEMED_AVATARS_DIR ||
    path.resolve(process.env.HOME || '', 'Desktop/Chem Image/Chem custome_transparent_themed');
  const manifestPath =
    process.env.CHEMCITY_THEMED_AVATARS_MANIFEST || path.join(themedDir, 'avatars_theme_manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Cannot purge cosmetics: themed manifest not found at ${manifestPath}. ` +
        `Set CHEMCITY_THEMED_AVATARS_MANIFEST or CHEMCITY_THEMED_AVATARS_DIR.`,
    );
  }

  type ThemedManifestEntry = {
    avatarNumber: number;
    dstFile: string;
    theme: string;
  };

  const entries = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ThemedManifestEntry[];
  const allow = new Set<string>();
  for (const e of entries) {
    const n = Number((e as any)?.avatarNumber);
    if (!Number.isFinite(n) || n <= 0) continue;
    const themeKey = safeId(String((e as any)?.theme || 'unknown'));
    allow.add(`avatar_${n}_${themeKey}`);
  }

  console.log(`\n🧨 Purging cosmetics (hard delete) — keeping themed_v2 set only...`);
  console.log(`   Manifest: ${manifestPath}`);
  console.log(`   Allowed themed cosmetics count: ${allow.size}`);

  const snap = await db.collection('cosmetics').get();
  const toDelete = snap.docs.filter((d) => {
    const id = d.id;
    if (allow.has(id)) return false;
    // Always keep backgrounds (and any non-avatar cosmetics) so gacha background cards don't break.
    if (id.startsWith('bg_')) return false;
    const type = (d.data() as any)?.type;
    if (type && String(type) !== 'avatar') return false;
    return true;
  });
  console.log(`   Total cosmetics docs: ${snap.size}`);
  console.log(`   Will delete: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('   Nothing to delete.');
    return;
  }

  let batch = db.batch();
  let opCount = 0;
  let deleted = 0;
  for (const d of toDelete) {
    batch.delete(d.ref);
    opCount++;
    deleted++;
    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`   ✅ Purge complete. deleted=${deleted}`);
}

async function purgeUnusedStorage(): Promise<void> {
  const bucket = storage.bucket();
  const bucketName = bucket.name;
  if (!bucketName) {
    throw new Error('Firebase Storage bucket is not configured.');
  }

  // Prefixes to DELETE (old/unused avatar folders)
  const prefixesToDelete = [
    'chemcity/cosmetics/avatars/',
    'chemcity/cosmetics/avatars_gendered/',
    'chemcity/cosmetics/avatars_gendered_v2/',
    'chemcity/cosmetics/avatars_gendered_v3/',
    'chemcity/cosmetics/avatars_themed_gendered_v1/',
    'chemcity/cosmetics/avatars_themed_v1/',
  ];

  // Prefixes to KEEP (do not delete)
  const protectedPrefixes = [
    'chemcity/cosmetics/avatars_themed_gendered_v2/',
    'chemcity/cosmetics/avatars_themed_v2/',
    'chemcity/cosmetics/backgrounds/',
  ];

  console.log(`\n🗑️  Purging unused Storage objects (bucket=${bucketName})...`);
  console.log('   Protected (will keep):');
  protectedPrefixes.forEach((p) => console.log(`     - ${p}`));
  console.log('   Will delete:');
  prefixesToDelete.forEach((p) => console.log(`     - ${p}`));

  let totalDeleted = 0;

  for (const prefix of prefixesToDelete) {
    try {
      const [files] = await bucket.getFiles({ prefix });
      if (files.length === 0) {
        console.log(`   - ${prefix}: no files`);
        continue;
      }

      console.log(`   - ${prefix}: deleting ${files.length} files...`);
      const deletePromises = files.map((f) => f.delete().catch(() => null));
      await Promise.all(deletePromises);
      totalDeleted += files.length;
    } catch (err: any) {
      console.warn(`   ⚠️  Failed to delete ${prefix}: ${err?.message ?? String(err)}`);
    }
  }

  console.log(`   ✅ Storage purge complete. totalDeleted=${totalDeleted}`);
}

async function seedPlaces(): Promise<void> {
  const places = readJsonFile<{ id: string }>(PLACES_FILE, 'places');
  if (places.length > 0) {
    await batchWrite('places', places);
  }
}

// ─── Seed Collections ─────────────────────────────────────────

async function seedCollections(): Promise<void> {
  let cols = readJsonFile<{ id: string; [key: string]: unknown }>(COLLECTIONS_FILE, 'collections');

  if (cols.length === 0) {
    // Auto-generate collections from item docs if collections.json is missing.
    // This ensures the Collections Album UI can function without a separate file.
    const jsonFiles = fs.existsSync(DATA_DIR)
      ? fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))
      : [];

    const collectionToItemIds: Record<string, string[]> = {};

    for (const file of jsonFiles) {
      const filePath = path.join(DATA_DIR, file);
      const rows = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Array<{
        id?: string;
        collections?: unknown;
      }>;

      for (const row of rows) {
        const itemId = typeof row?.id === 'string' ? row.id : '';
        if (!itemId) continue;
        const cids = Array.isArray(row.collections)
          ? row.collections.map(String).map((s) => s.trim()).filter(Boolean)
          : [];
        for (const cid of cids) {
          if (!collectionToItemIds[cid]) collectionToItemIds[cid] = [];
          collectionToItemIds[cid].push(itemId);
        }
      }
    }

    cols = Object.entries(collectionToItemIds)
      .map(([id, itemIds]) => ({
        id,
        displayName: titleCaseFromId(id),
        description: `Collection: ${titleCaseFromId(id)}`,
        itemIds: Array.from(new Set(itemIds)).sort(),
      }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  if (cols.length > 0) {
    await batchWrite('collections', cols);
  }
}

// ─── Seed Topics ──────────────────────────────────────────────

async function seedTopics(): Promise<void> {
  const topics = readJsonFile<{ id: string }>(TOPICS_FILE, 'topics');
  if (topics.length > 0) {
    await batchWrite('topics', topics);
  }
}

// ─── Bump cacheVersion ────────────────────────────────────────

/**
 * Reads the current version, increments by 1, writes back.
 * All clients compare this on every app open — if it differs
 * from their local manifest, they re-fetch all static data.
 *
 * This is called AUTOMATICALLY by this script.
 * You only need to manually bump if you edit Firestore directly.
 */
async function bumpCacheVersion(): Promise<number> {
  const ref = db.collection('meta').doc('cacheVersion');
  const snap = await ref.get();

  const currentVersion: number = snap.exists ? (snap.data()!.version as number) : 0;
  const newVersion = currentVersion + 1;

  await ref.set({ version: newVersion }, { merge: true });
  return newVersion;
}

// ─── Main ─────────────────────────────────────────────────────

async function run() {
  console.log('🌱 ChemCity Firestore Seeder\n');

  const shouldMigrateImages = process.argv.includes('--migrate-images');
  const shouldHardRefresh = process.argv.includes(SHOULD_HARD_REFRESH_FLAG);
  const shouldPurgeNonThemed = process.argv.includes(SHOULD_PURGE_NON_THEMED_V2_FLAG);
  const shouldPurgeUnusedStorage = process.argv.includes(SHOULD_PURGE_UNUSED_STORAGE_FLAG);
  const shouldUploadBackgroundsOnly = process.argv.includes(SHOULD_UPLOAD_BACKGROUNDS_ONLY_FLAG);
  const shouldSeedItemsFromCsv = process.argv.includes(SHOULD_SEED_ITEMS_FROM_CSV_FLAG);
  const itemsCsvUrl = String(process.env.CHEMCITY_ITEMS_CSV_URL || '').trim() || DEFAULT_ITEMS_CSV_URL;

  const shouldSeedGacha = shouldHardRefresh || process.argv.includes(SHOULD_SEED_GACHA_FLAG);
  // NOTE:
  // Do NOT force base cosmetics upload on hard refresh, because it depends on local folders
  // (Chem custome_renamed / Chem background) that may not exist on all machines.
  // Themed avatar upload already overwrites the relevant cosmetics docs.
  const shouldUploadCosmetics = process.argv.includes(SHOULD_UPLOAD_COSMETICS_FLAG);
  const shouldUploadRawAvatars = process.argv.includes(SHOULD_UPLOAD_RAW_AVATARS_FLAG);
  const shouldUploadThemedAvatars = shouldHardRefresh || process.argv.includes(SHOULD_UPLOAD_THEMED_AVATARS_FLAG);

  if (shouldHardRefresh) {
    console.log(`\n🧹 HARD REFRESH enabled (${SHOULD_HARD_REFRESH_FLAG})`);
    console.log('   - Forces seeding gacha cosmetics + banners');
    console.log('   - Forces themed avatar upload + cosmetics doc overwrite (name + imageUrl* fields)');
    console.log('   - Always bumps meta/cacheVersion so all clients refetch');
    console.log('   - Base cosmetics upload is NOT forced (use --upload-cosmetics if you want it)');
  }

  if (shouldPurgeNonThemed) {
    console.log(`\n🧨 PURGE enabled (${SHOULD_PURGE_NON_THEMED_V2_FLAG})`);
    console.log('   - HARD deletes Firestore cosmetics docs NOT in themed_v2 manifest set');
    console.log('   - Dev-only (can break user inventories/equipped cosmetics)');
  }

  if (shouldPurgeUnusedStorage) {
    console.log(`\n🗑️  STORAGE PURGE enabled (${SHOULD_PURGE_UNUSED_STORAGE_FLAG})`);
    console.log('   - HARD deletes old/unused Firebase Storage avatar folders');
    console.log('   - Keeps: avatars_themed_v2, avatars_themed_gendered_v2, backgrounds');
    console.log('   - Dev-only and IRREVERSIBLE');
  }

  try {
    // 1. Seed items
    console.log('📦 Seeding items...');
    const itemCount = shouldSeedItemsFromCsv
      ? await seedItemsFromCsv(itemsCsvUrl)
      : await seedItems();

    if (shouldMigrateImages) {
      await migrateItemImagesToStorage();
    } else {
      console.log('\n🖼️  Image migration skipped (run with --migrate-images to upload images to Firebase Storage).');
    }

    // 2. Seed places
    console.log('\n🗺️  Seeding places...');
    await seedPlaces();

    // 3. Seed collections
    console.log('\n🏆 Seeding collections...');
    await seedCollections();

    // 4. Seed topics
    console.log('\n📚 Seeding topics...');
    await seedTopics();

    // 4b. Seed gacha (optional)
    if (shouldSeedGacha) {
      await seedGacha();
    } else {
      console.log(`\n🎟️  Gacha seed skipped (run with ${SHOULD_SEED_GACHA_FLAG} to seed cosmetics + banners).`);
    }

    // 4c. Upload cosmetics assets (optional)
    if (shouldUploadCosmetics) {
      await uploadCosmeticsAssets();
    } else {
      console.log(`\n🧑🖼️  Cosmetics upload skipped (run with ${SHOULD_UPLOAD_COSMETICS_FLAG} to upload avatars/backgrounds).`);
    }

    // 4c2. Upload backgrounds only (optional)
    if (shouldUploadBackgroundsOnly) {
      await uploadBackgroundsOnly();
    }

    // 4d. Upload raw (non-bg-removed) avatars to Storage (optional)
    if (shouldUploadRawAvatars) {
      await uploadRawAvatarsAssets();
    } else {
      console.log(`\n🧑  Raw avatars upload skipped (run with ${SHOULD_UPLOAD_RAW_AVATARS_FLAG} to upload original avatar images).`);
    }

    // 4e. Upload themed avatars to Storage + upsert cosmetics docs (optional)
    if (shouldUploadThemedAvatars) {
      await uploadThemedAvatarsAssets();
    } else {
      console.log(
        `\n🧑🖼️  Themed avatars upload skipped (run with ${SHOULD_UPLOAD_THEMED_AVATARS_FLAG} to upload themed avatars from Chem custome_transparent_themed).`,
      );
    }

    // 4f. Purge cosmetics (dev-only)
    if (shouldPurgeNonThemed) {
      await purgeNonThemedCosmeticsV2();
    }

    // 4g. Purge unused Storage folders (dev-only)
    if (shouldPurgeUnusedStorage) {
      await purgeUnusedStorage();
    }

    // 5. Bump cacheVersion — ALWAYS last step
    console.log('\n🔢 Bumping cacheVersion...');
    const newVersion = await bumpCacheVersion();

    // 6. Print cache estimate
    const estimatedKB = ((itemCount * 170) / 1024).toFixed(1);
    const pct5MB = ((itemCount * 170) / (5 * 1024 * 1024) * 100).toFixed(2);

    console.log(`
✅ Seed complete!

   cacheVersion bumped to ${newVersion}
   → All students get fresh data next time they open the app

📦 Estimated slim cache: ~${estimatedKB} KB (${pct5MB}% of 5MB localStorage budget)
   → Safe. Copy this into your HANDOFF summary.

⏭️  Verify in Firebase console that new items appear correctly.
   If you edit Firestore directly after this, manually bump:
   Firebase Console → Firestore → meta → cacheVersion → version
`);
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  }
}

run();
