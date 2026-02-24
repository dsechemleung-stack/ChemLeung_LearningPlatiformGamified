import fs from 'node:fs';
import path from 'node:path';

type Entry = {
  avatarNumber: number;
  srcFile: string;
  dstFile: string;
  theme: string;
  rarity: string;
  rarityCode: string;
  collection: string;
};

function safeReadJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function safeWriteJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function isSingleCharTheme(theme: string): boolean {
  const t = String(theme || '').trim();
  return t.length === 1;
}

async function main() {
  const baseDir =
    process.argv[2] ?? '/Users/Hugo/Desktop/Chem Image/Chem custome_transparent_themed';
  const outDir = process.argv[3] ?? path.join(baseDir, 'single_char');

  if (!fs.existsSync(baseDir)) throw new Error(`Base dir not found: ${baseDir}`);
  fs.mkdirSync(outDir, { recursive: true });

  const manifestPath = path.join(baseDir, 'avatars_theme_manifest.json');
  const appliedPath = path.join(baseDir, 'cosplay_label_map.applied.json');

  const manifest = fs.existsSync(manifestPath) ? safeReadJson<Entry[]>(manifestPath) : [];
  const applied = fs.existsSync(appliedPath) ? safeReadJson<Entry[]>(appliedPath) : [];

  const splitBy = (entries: Entry[]) => {
    const single: Entry[] = [];
    const rest: Entry[] = [];
    for (const e of entries) {
      if (isSingleCharTheme(e.theme)) single.push(e);
      else rest.push(e);
    }
    return { single, rest };
  };

  const mSplit = splitBy(manifest);
  const aSplit = splitBy(applied);

  // Move PNG files for the single-char set, based on dstFile.
  // If dstFile is missing, fall back to number-based glob.
  const moved: string[] = [];
  for (const e of mSplit.single) {
    const srcP = path.join(baseDir, e.dstFile);
    const dstP = path.join(outDir, e.dstFile);
    if (fs.existsSync(srcP)) {
      fs.renameSync(srcP, dstP);
      moved.push(e.dstFile);
    }
  }

  // Write split manifests.
  safeWriteJson(path.join(outDir, 'avatars_theme_manifest.json'), mSplit.single);
  safeWriteJson(path.join(outDir, 'cosplay_label_map.applied.json'), aSplit.single);

  safeWriteJson(manifestPath, mSplit.rest);
  safeWriteJson(appliedPath, aSplit.rest);

  // Summary
  console.log(`Moved ${moved.length} PNG(s) to: ${outDir}`);
  console.log('Moved files:');
  for (const f of moved) console.log(`- ${f}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
