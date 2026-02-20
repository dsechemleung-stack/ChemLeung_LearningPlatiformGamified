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
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ─── Firebase Admin Init ─────────────────────────────────────
// Expects GOOGLE_APPLICATION_CREDENTIALS env var pointing to
// your service account JSON, OR running in a GCP environment.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

const envCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf-8'),
  ) as ServiceAccountJson;
  console.log(
    `[Seeder Auth] Using service-account.json (projectId=${serviceAccount.project_id ?? 'unknown'}, email=${serviceAccount.client_email ?? 'unknown'})`,
  );
  initializeApp({
    credential: cert(serviceAccount as unknown as Record<string, unknown>),
    projectId: serviceAccount.project_id,
  });
} else if (envCredPath && fs.existsSync(envCredPath)) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(envCredPath, 'utf-8'),
  ) as ServiceAccountJson;
  console.log(
    `[Seeder Auth] Using GOOGLE_APPLICATION_CREDENTIALS (projectId=${serviceAccount.project_id ?? 'unknown'}, email=${serviceAccount.client_email ?? 'unknown'})`,
  );
  initializeApp({
    credential: cert(serviceAccount as unknown as Record<string, unknown>),
    projectId: serviceAccount.project_id,
  });
} else {
  // Fall back to Application Default Credentials (CI/cloud)
  console.log('[Seeder Auth] Using applicationDefault()');
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

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

// ─── Seed Places ──────────────────────────────────────────────

async function seedPlaces(): Promise<void> {
  const places = readJsonFile<{ id: string }>(PLACES_FILE, 'places');
  if (places.length > 0) {
    await batchWrite('places', places);
  }
}

// ─── Seed Collections ─────────────────────────────────────────

async function seedCollections(): Promise<void> {
  const cols = readJsonFile<{ id: string }>(COLLECTIONS_FILE, 'collections');
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

  try {
    // 1. Seed items
    console.log('📦 Seeding items...');
    const itemCount = await seedItems();

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
