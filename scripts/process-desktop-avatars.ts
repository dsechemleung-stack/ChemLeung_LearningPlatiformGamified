import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

type ProcessOptions = {
  srcDir: string;
  outDir: string;
  maskDir?: string;
  inputPath?: string;
  maskPath?: string;
  outSuffix?: string;
  from?: number;
  to?: number;
  numbers?: number[];
  marginPx: number;
  bgTol: number;
  greenTol: number;
};

function parseArgs(argv: string[]): Partial<ProcessOptions> {
  const out: Partial<ProcessOptions> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (!a) continue;

    if (a === '--src' && next) {
      out.srcDir = next;
      i++;
      continue;
    }
    if (a === '--out' && next) {
      out.outDir = next;
      i++;
      continue;
    }
    if (a === '--mask-dir' && next) {
      out.maskDir = next;
      i++;
      continue;
    }
    if (a === '--input' && next) {
      out.inputPath = next;
      i++;
      continue;
    }
    if (a === '--mask' && next) {
      out.maskPath = next;
      i++;
      continue;
    }
    if (a === '--out-suffix' && next) {
      out.outSuffix = next;
      i++;
      continue;
    }
    if (a === '--from' && next) {
      out.from = Number(next);
      i++;
      continue;
    }
    if (a === '--to' && next) {
      out.to = Number(next);
      i++;
      continue;
    }
    if (a === '--numbers' && next) {
      out.numbers = next
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
      i++;
      continue;
    }
    if (a === '--margin' && next) {
      out.marginPx = Number(next);
      i++;
      continue;
    }
    if (a === '--bg-tol' && next) {
      out.bgTol = Number(next);
      i++;
      continue;
    }
    if (a === '--green-tol' && next) {
      out.greenTol = Number(next);
      i++;
      continue;
    }
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function colorDistSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

function avgCornerColor(data: Buffer, w: number, h: number, channels: number, box: number): [number, number, number] {
  const bx = Math.max(1, Math.min(box, Math.floor(w / 4), Math.floor(h / 4)));
  const corners: Array<{ x0: number; y0: number }> = [
    { x0: 0, y0: 0 },
    { x0: w - bx, y0: 0 },
    { x0: 0, y0: h - bx },
    { x0: w - bx, y0: h - bx },
  ];
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let count = 0;
  for (const c of corners) {
    for (let y = c.y0; y < c.y0 + bx; y++) {
      for (let x = c.x0; x < c.x0 + bx; x++) {
        const idx = (y * w + x) * channels;
        const r = data[idx] ?? 0;
        const g = data[idx + 1] ?? 0;
        const b = data[idx + 2] ?? 0;
        const a = data[idx + 3] ?? 255;
        if (a < 10) continue;
        sr += r;
        sg += g;
        sb += b;
        count++;
      }
    }
  }
  if (count <= 0) return [255, 255, 255];
  return [Math.round(sr / count), Math.round(sg / count), Math.round(sb / count)];
}

async function removeEdgeConnectedBackgroundToAlpha(buf: Buffer, bgTol: number): Promise<Buffer> {
  const img = sharp(buf).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);

  const w = info.width;
  const h = info.height;
  const channels = info.channels;
  if (channels < 4) throw new Error(`Expected RGBA, got channels=${channels}`);

  // Sample background color from corners. This works better than a pure “white key”
  // because it preserves whites inside the costume that are NOT connected to the border.
  const [bgR, bgG, bgB] = avgCornerColor(out, w, h, channels, 12);
  const tol = Math.max(0, bgTol);
  const tolSq = tol * tol * 3;

  const visited = new Uint8Array(w * h);
  const qx: number[] = [];
  const qy: number[] = [];

  function push(x: number, y: number) {
    const p = y * w + x;
    if (visited[p]) return;
    visited[p] = 1;
    qx.push(x);
    qy.push(y);
  }

  function isBg(x: number, y: number): boolean {
    const idx = (y * w + x) * channels;
    const a = out[idx + 3] ?? 255;
    if (a < 10) return true;
    const r = out[idx] ?? 0;
    const g = out[idx + 1] ?? 0;
    const b = out[idx + 2] ?? 0;
    return colorDistSq(r, g, b, bgR, bgG, bgB) <= tolSq;
  }

  // Seed from borders.
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  // Flood fill; only clear pixels that look like background.
  while (qx.length) {
    const x = qx.pop() as number;
    const y = qy.pop() as number;

    if (!isBg(x, y)) continue;

    const idx = (y * w + x) * channels;
    out[idx + 3] = 0;

    if (x > 0) push(x - 1, y);
    if (x + 1 < w) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < h) push(x, y + 1);
  }

  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function processOneImage(
  inputPath: string,
  outDir: string,
  opts: {
    marginPx: number;
    bgTol: number;
    greenTol: number;
    maskPath?: string;
    outSuffix: string;
  },
): Promise<void> {
  if (!fs.existsSync(inputPath)) throw new Error(`Input not found: ${inputPath}`);
  fs.mkdirSync(outDir, { recursive: true });

  const inputBuf = fs.readFileSync(inputPath);
  const meta = await sharp(inputBuf).metadata();
  const w = Number(meta.width);
  const h = Number(meta.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error(`Bad image metadata: ${inputPath}`);
  }

  let outBuf: Buffer;
  if (opts.maskPath && fs.existsSync(opts.maskPath)) {
    try {
      const maskBuf = fs.readFileSync(opts.maskPath);
      const seeds = await extractGreenSeeds(maskBuf, opts.greenTol);
      outBuf = seeds.length
        ? await removeSeededBackgroundToAlpha(inputBuf, seeds, opts.bgTol)
        : await removeEdgeConnectedBackgroundToAlpha(inputBuf, opts.bgTol);
    } catch {
      outBuf = await removeEdgeConnectedBackgroundToAlpha(inputBuf, opts.bgTol);
    }
  } else {
    outBuf = await removeEdgeConnectedBackgroundToAlpha(inputBuf, opts.bgTol);
  }

  try {
    outBuf = await sharp(outBuf).ensureAlpha().trim({ threshold: 0 }).png().toBuffer();
  } catch {
    // ignore
  }
  try {
    outBuf = await addTransparentMargin(outBuf, opts.marginPx);
  } catch {
    // ignore
  }
  try {
    outBuf = await padToCanvas(outBuf, w, h);
  } catch {
    // ignore
  }

  const base = path.basename(inputPath, path.extname(inputPath));
  const outPath = path.join(outDir, `${base}${opts.outSuffix}.png`);
  fs.writeFileSync(outPath, outBuf);
  console.log(`✅ ${path.basename(outPath)}`);
}

async function extractGreenSeeds(
  maskPng: Buffer,
  greenTol: number,
): Promise<Array<{ x: number; y: number }>> {
  const img = sharp(maskPng).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const channels = info.channels;
  const seeds: Array<{ x: number; y: number }> = [];

  // Treat “sharp green” as background marker.
  // We accept pixels close to (0,255,0) with some tolerance, alpha > 0.
  // Subsample to avoid huge queues if user paints large areas.
  const step = 2;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const idx = (y * w + x) * channels;
      const r = data[idx] ?? 0;
      const g = data[idx + 1] ?? 0;
      const b = data[idx + 2] ?? 0;
      const a = data[idx + 3] ?? 255;
      if (a < 10) continue;
      if (isGreenish(r, g, b, greenTol)) {
        seeds.push({ x, y });
      }
    }
  }
  return seeds;
}

function isGreenish(r: number, g: number, b: number, greenTol: number): boolean {
  const tol = Math.max(0, greenTol);
  const tolSq = tol * tol * 3;
  return colorDistSq(r, g, b, 0, 255, 0) <= tolSq;
}

function avgSeedColorFromImage(
  image: Buffer,
  info: { width: number; height: number; channels: number },
  seeds: Array<{ x: number; y: number }>,
): [number, number, number] {
  const { width: w, height: h, channels } = info;
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let count = 0;
  for (const s of seeds) {
    const x = clamp(s.x, 0, w - 1);
    const y = clamp(s.y, 0, h - 1);
    const idx = (y * w + x) * channels;
    const r = image[idx] ?? 0;
    const g = image[idx + 1] ?? 0;
    const b = image[idx + 2] ?? 0;
    const a = image[idx + 3] ?? 255;
    if (a < 10) continue;
    sr += r;
    sg += g;
    sb += b;
    count++;
  }
  if (count <= 0) return [255, 255, 255];
  return [Math.round(sr / count), Math.round(sg / count), Math.round(sb / count)];
}

async function removeSeededBackgroundToAlpha(
  buf: Buffer,
  seeds: Array<{ x: number; y: number }>,
  bgTol: number,
): Promise<Buffer> {
  const img = sharp(buf).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);

  const w = info.width;
  const h = info.height;
  const channels = info.channels;
  if (channels < 4) throw new Error(`Expected RGBA, got channels=${channels}`);

  const seedInfo = { width: w, height: h, channels };
  const [bgR, bgG, bgB] = avgSeedColorFromImage(out, seedInfo, seeds);
  const tol = Math.max(0, bgTol);
  const tolSq = tol * tol * 3;

  const visited = new Uint8Array(w * h);
  const qx: number[] = [];
  const qy: number[] = [];

  function push(x: number, y: number) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    visited[p] = 1;
    qx.push(x);
    qy.push(y);
  }

  function isBgLike(x: number, y: number): boolean {
    const idx = (y * w + x) * channels;
    const a = out[idx + 3] ?? 255;
    if (a < 10) return true;
    const r = out[idx] ?? 0;
    const g = out[idx + 1] ?? 0;
    const b = out[idx + 2] ?? 0;
    return colorDistSq(r, g, b, bgR, bgG, bgB) <= tolSq;
  }

  for (const s of seeds) push(s.x, s.y);

  while (qx.length) {
    const x = qx.pop() as number;
    const y = qy.pop() as number;

    if (!isBgLike(x, y)) continue;
    const idx = (y * w + x) * channels;
    out[idx + 3] = 0;

    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function addTransparentMargin(buf: Buffer, marginPx: number): Promise<Buffer> {
  if (marginPx <= 0) return buf;
  const m = await sharp(buf).metadata();
  const w = Number(m.width);
  const h = Number(m.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return buf;
  return sharp(buf)
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

async function padToCanvas(buf: Buffer, targetW: number, targetH: number): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const w = Number(meta.width);
  const h = Number(meta.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return buf;

  if (w === targetW && h === targetH) return buf;

  const left = Math.max(0, Math.floor((targetW - w) / 2));
  const right = Math.max(0, targetW - w - left);
  const top = Math.max(0, targetH - h);
  const bottom = 0;

  return sharp(buf)
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

function buildNumbers(from?: number, to?: number, explicit?: number[]): number[] {
  if (explicit && explicit.length) return Array.from(new Set(explicit)).sort((a, b) => a - b);
  const f = from ?? 1;
  const t = to ?? f;
  const nums: number[] = [];
  for (let i = f; i <= t; i++) nums.push(i);
  return nums;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const opts: ProcessOptions = {
    srcDir: args.srcDir ?? '/Users/Hugo/Desktop/Chem Image/Chem custome',
    outDir: args.outDir ?? '/Users/Hugo/Desktop/Chem Image/Chem custome_transparent_trimmed',
    maskDir: args.maskDir,
    inputPath: args.inputPath,
    maskPath: args.maskPath,
    outSuffix: typeof args.outSuffix === 'string' ? args.outSuffix : '_bg_removed_trimmed',
    from: args.from,
    to: args.to,
    numbers: args.numbers,
    marginPx: Number.isFinite(args.marginPx) ? Number(args.marginPx) : 6,
    bgTol: Number.isFinite(args.bgTol) ? Number(args.bgTol) : 55,
    greenTol: Number.isFinite(args.greenTol) ? Number(args.greenTol) : 40,
  };

  if (opts.inputPath) {
    await processOneImage(opts.inputPath, opts.outDir, {
      marginPx: opts.marginPx,
      bgTol: opts.bgTol,
      greenTol: opts.greenTol,
      maskPath: opts.maskPath,
      outSuffix: opts.outSuffix ?? '_bg_removed_trimmed',
    });
    console.log('Done.');
    return;
  }

  fs.mkdirSync(opts.outDir, { recursive: true });

  const nums = buildNumbers(opts.from, opts.to, opts.numbers);
  console.log(`Processing ${nums.length} avatars...`);
  console.log(`src=${opts.srcDir}`);
  console.log(`out=${opts.outDir}`);

  for (const n of nums) {
    const filename = `Avator_${n}.png`;
    const srcPath = path.join(opts.srcDir, filename);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Missing: ${srcPath}`);
      continue;
    }

    const inputBuf = fs.readFileSync(srcPath);
    const meta = await sharp(inputBuf).metadata();
    const w = Number(meta.width);
    const h = Number(meta.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      console.warn(`Skip (bad meta): ${filename}`);
      continue;
    }

    // Optional user-guided mask. If a mask exists, use green pixels as flood-fill seeds.
    // Mask naming: Avator_<N>_mask.png
    let outBuf: Buffer;
    const maskDir = opts.maskDir ?? opts.srcDir;
    const maskPath = path.join(maskDir, `Avator_${n}_mask.png`);
    if (fs.existsSync(maskPath)) {
      try {
        const maskBuf = fs.readFileSync(maskPath);
        const seeds = await extractGreenSeeds(maskBuf, opts.greenTol);
        if (seeds.length) {
          outBuf = await removeSeededBackgroundToAlpha(inputBuf, seeds, opts.bgTol);
        } else {
          outBuf = await removeEdgeConnectedBackgroundToAlpha(inputBuf, opts.bgTol);
        }
      } catch {
        outBuf = await removeEdgeConnectedBackgroundToAlpha(inputBuf, opts.bgTol);
      }
    } else {
      outBuf = await removeEdgeConnectedBackgroundToAlpha(inputBuf, opts.bgTol);
    }

    try {
      outBuf = await sharp(outBuf).ensureAlpha().trim({ threshold: 0 }).png().toBuffer();
    } catch {
      // ignore
    }

    try {
      outBuf = await addTransparentMargin(outBuf, opts.marginPx);
    } catch {
      // ignore
    }

    try {
      outBuf = await padToCanvas(outBuf, w, h);
    } catch {
      // ignore
    }

    const outName = `Avator_${n}${opts.outSuffix ?? '_bg_removed_trimmed'}.png`;
    const outPath = path.join(opts.outDir, outName);
    fs.writeFileSync(outPath, outBuf);
    console.log(`✅ ${outName}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
