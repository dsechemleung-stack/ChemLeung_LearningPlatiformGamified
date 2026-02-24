import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

type ManifestEntry = {
  avatarNumber: number;
  srcFile: string;
  dstFile: string;
  theme: string;
  rarity: string;
  rarityCode: string;
  collection: string;
};

type UploadResult = {
  avatarNumber: number;
  id: string;
  srcFile: string;
  imageUrl?: string;
  imageUrlBoy?: string;
  imageUrlGirl?: string;
  objectPath?: string;
  objectPathBoy?: string;
  objectPathGirl?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveStorageBucket(projectId?: string | null): string | null {
  const manual =
    process.env.CHEMCITY_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.GCLOUD_STORAGE_BUCKET;
  if (manual) return manual;
  if (!projectId) return null;
  return `${projectId}.appspot.com`;
}

function storageDownloadUrl(bucketName: string, objectPath: string, token: string): string {
  const encoded = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
}

function contentTypeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

function safeName(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (!a) continue;
    if (a.startsWith('--') && next && !next.startsWith('--')) {
      out[a] = next;
      i++;
      continue;
    }
    if (a.startsWith('--')) out[a] = true;
  }
  return out;
}

async function uploadBufferToStorage(
  bucketName: string,
  objectPath: string,
  buf: Buffer,
  contentType: string,
): Promise<string> {
  const storage = getStorage();
  const bucket = storage.bucket();
  const token = randomUUID();
  const file = bucket.file(objectPath);

  await file.save(buf, {
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

async function padToCanvas(inputBuf: Buffer, canvasW: number, canvasH: number): Promise<Buffer> {
  const img = sharp(inputBuf).ensureAlpha();
  const meta = await img.metadata();
  const w = Number(meta.width);
  const h = Number(meta.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return inputBuf;

  const left = Math.floor((canvasW - w) / 2);
  const right = canvasW - w - left;
  const top = canvasH - h;
  const bottom = 0;

  return img
    .extend({
      top: Math.max(0, top),
      bottom: Math.max(0, bottom),
      left: Math.max(0, left),
      right: Math.max(0, right),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function addTransparentMargin(inputBuf: Buffer, marginPx: number): Promise<Buffer> {
  if (!Number.isFinite(marginPx) || marginPx <= 0) return inputBuf;
  return sharp(inputBuf)
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

function initFirebaseAdmin(): void {
  const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
  const envCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const envProjectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8')) as ServiceAccountJson;
    const bucket = resolveStorageBucket(serviceAccount.project_id);
    initializeApp({
      credential: cert(serviceAccount as unknown as Record<string, unknown>),
      projectId: serviceAccount.project_id,
      ...(bucket ? { storageBucket: bucket } : {}),
    });
    return;
  }

  if (envCredPath && fs.existsSync(envCredPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(envCredPath, 'utf-8')) as ServiceAccountJson;
    const bucket = resolveStorageBucket(serviceAccount.project_id);
    initializeApp({
      credential: cert(serviceAccount as unknown as Record<string, unknown>),
      projectId: serviceAccount.project_id,
      ...(bucket ? { storageBucket: bucket } : {}),
    });
    return;
  }

  const bucket = resolveStorageBucket(envProjectId);
  initializeApp({
    credential: applicationDefault(),
    projectId: envProjectId,
    ...(bucket ? { storageBucket: bucket } : {}),
  });
}

async function processToGenderedBuffers(
  fullBuf: Buffer,
  marginPx: number,
): Promise<{ fullPng: Buffer; boyPng: Buffer; girlPng: Buffer }> {
  const base = sharp(fullBuf).ensureAlpha();
  const meta = await base.metadata();
  const w = Number(meta.width);
  const h = Number(meta.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 2 || h <= 2) {
    const png = await base.png().toBuffer();
    return { fullPng: png, boyPng: png, girlPng: png };
  }

  const halfW = Math.floor(w / 2);

  let processedFullBuf: Buffer;
  try {
    processedFullBuf = await base.clone().trim({ threshold: 0 }).png().toBuffer();
  } catch {
    processedFullBuf = await base.clone().png().toBuffer();
  }
  try {
    processedFullBuf = await addTransparentMargin(processedFullBuf, marginPx);
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
    boyBuf = await addTransparentMargin(boyBuf, marginPx);
    girlBuf = await addTransparentMargin(girlBuf, marginPx);
  } catch {
    // ignore
  }
  try {
    boyBuf = await padToCanvas(boyBuf, halfW, h);
    girlBuf = await padToCanvas(girlBuf, halfW, h);
  } catch {
    // ignore
  }

  const fullPng = await sharp(processedFullBuf).ensureAlpha().png().toBuffer();
  return { fullPng, boyPng: boyBuf, girlPng: girlBuf };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const srcDir =
    (args['--src'] as string) ??
    '/Users/Hugo/Desktop/Chem Image/Chem custome_transparent_themed';
  const manifestPath =
    (args['--manifest'] as string) ?? path.join(srcDir, 'avatars_theme_manifest.json');

  const objectPrefix = (args['--object-prefix'] as string) ?? 'chemcity/cosmetics/avatars_themed_v1';
  const genderedPrefix =
    (args['--gendered-prefix'] as string) ?? 'chemcity/cosmetics/avatars_themed_gendered_v1';

  const marginPx = Number((args['--margin'] as string) ?? '6');

  if (!fs.existsSync(srcDir)) throw new Error(`srcDir not found: ${srcDir}`);
  if (!fs.existsSync(manifestPath)) throw new Error(`manifest not found: ${manifestPath}`);

  initFirebaseAdmin();

  const storage = getStorage();
  const bucket = storage.bucket();
  const bucketName = bucket.name;
  if (!bucketName) {
    throw new Error(
      'Firebase Storage bucket is not configured. Set CHEMCITY_STORAGE_BUCKET (recommended) or ensure admin app has storageBucket.',
    );
  }

  const entries = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ManifestEntry[];

  const results: UploadResult[] = [];

  for (const e of entries) {
    const n = e.avatarNumber;
    const filePath = path.join(srcDir, e.dstFile);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Missing file: ${filePath}`);
      continue;
    }

    const themeKey = safeName(e.theme) || 'unknown';
    const id = `avatar_${n}_${themeKey}`;

    const buf = fs.readFileSync(filePath);
    const { fullPng, boyPng, girlPng } = await processToGenderedBuffers(buf, marginPx);

    const objectPath = `${objectPrefix}/${id}.png`;
    const objectPathBoy = `${genderedPrefix}/${id}_boy.png`;
    const objectPathGirl = `${genderedPrefix}/${id}_girl.png`;

    const imageUrl = await uploadBufferToStorage(bucketName, objectPath, fullPng, 'image/png');
    const imageUrlBoy = await uploadBufferToStorage(bucketName, objectPathBoy, boyPng, 'image/png');
    const imageUrlGirl = await uploadBufferToStorage(bucketName, objectPathGirl, girlPng, 'image/png');

    console.log(`✅ Uploaded ${id}`);

    results.push({
      avatarNumber: n,
      id,
      srcFile: e.dstFile,
      imageUrl,
      imageUrlBoy,
      imageUrlGirl,
      objectPath,
      objectPathBoy,
      objectPathGirl,
    });
  }

  const outReport = (args['--report'] as string) ?? path.join(srcDir, 'avatars_themed_upload_report.json');
  fs.writeFileSync(outReport, JSON.stringify({ bucketName, objectPrefix, genderedPrefix, results }, null, 2));
  console.log(`Saved report: ${outReport}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
