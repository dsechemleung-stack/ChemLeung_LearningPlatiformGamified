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

// ─── Seed Places ──────────────────────────────────────────────

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

  try {
    // 1. Seed items
    console.log('📦 Seeding items...');
    const itemCount = await seedItems();

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
