import fs from 'node:fs';
import path from 'node:path';

type MapEntry = {
  avatarNumber: number;
  srcFile: string;
  dstFile: string;
  theme: string;
  rarity: string;
  rarityCode: string;
  collection: string;
};

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
    if (a.startsWith('--')) {
      out[a] = true;
    }
  }
  return out;
}

function buildNumbers(from: number, to: number): number[] {
  const nums: number[] = [];
  for (let i = from; i <= to; i++) nums.push(i);
  return nums;
}

function safeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function readLabelMap(mapPath: string): Record<string, string> {
  const raw = fs.readFileSync(mapPath, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, string>;
  return parsed;
}

function writeTemplate(mapPath: string, from: number, to: number): void {
  const nums = buildNumbers(from, to);
  const tpl: Record<string, string> = {};
  for (const n of nums) tpl[String(n)] = 'Theme,1,basic';
  fs.writeFileSync(mapPath, JSON.stringify(tpl, null, 2));
}

function rarityFromCode(codeRaw: string): { rarity: string; rarityCode: string } {
  const code = String(codeRaw || '').trim().toLowerCase();
  if (code === 'event') return { rarity: 'event', rarityCode: 'event' };
  if (code === '1') return { rarity: 'common', rarityCode: '1' };
  if (code === '2') return { rarity: 'uncommon', rarityCode: '2' };
  if (code === '3') return { rarity: 'rare', rarityCode: '3' };
  if (code === '4') return { rarity: 'epic', rarityCode: '4' };
  if (code === '5') return { rarity: 'legendary', rarityCode: '5' };
  return { rarity: 'common', rarityCode: code || '1' };
}

function inferCollection(themeRaw: string): string {
  const t = String(themeRaw || '').trim().toLowerCase();
  if (!t) return 'basic';
  const marvel = ['ironman', 'spiderman', 'antman', 'dr strange', 'dr_strange', 'drstrange', 'superhero', 'groot'];
  if (marvel.some((k) => t.includes(k.replace(/_/g, ' ')))) return 'marvel';
  const festive = ['chinese new year', 'easter'];
  if (festive.some((k) => t.includes(k))) return 'festival';
  const anime = ['attackontitan', 'doraemon', 'pikachu', 'hello kitty'];
  if (anime.some((k) => t.includes(k))) return 'anime';
  const games = ['minecraft', 'mario', 'squid game'];
  if (games.some((k) => t.includes(k))) return 'games';
  const science = ['lab', 'astronaut', 'planet'];
  if (science.some((k) => t.includes(k))) return 'science';
  return 'basic';
}

function parseThemeRarityCollection(value: string): { theme: string; rarityCode: string; collection?: string } {
  const raw = String(value || '').trim();
  if (!raw) return { theme: '', rarityCode: '' };
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const theme = parts[0] ?? '';
  const rarityCode = parts[1] ?? '';
  const collection = parts[2];
  return { theme, rarityCode, collection };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const srcDir =
    (args['--src'] as string) ??
    '/Users/Hugo/Desktop/Chem Image/Chem custome_theme_trimmed_1-85';
  const outDir =
    (args['--out'] as string) ??
    '/Users/Hugo/Desktop/Chem Image/Chem custome_theme_named_1-85';

  const srcSuffix = (args['--src-suffix'] as string) ?? '_theme';

  const mapPathArg = args['--map'] as string | undefined;
  const generateTemplate = Boolean(args['--generate-template']);

  const from = Number((args['--from'] as string) ?? '1');
  const to = Number((args['--to'] as string) ?? '85');

  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to < from) {
    throw new Error(`Bad range: from=${from} to=${to}`);
  }

  fs.mkdirSync(outDir, { recursive: true });

  if (generateTemplate) {
    const tplPath = path.join(outDir, 'cosplay_label_map.template.json');
    writeTemplate(tplPath, from, to);
    console.log(`Generated template: ${tplPath}`);
    return;
  }

  if (!mapPathArg) {
    throw new Error('Missing --map <path-to-json>. Or use --generate-template first.');
  }

  const labelMap = readLabelMap(mapPathArg);

  const mapping: MapEntry[] = [];
  const nums = buildNumbers(from, to);

  for (const n of nums) {
    const srcFile = `Avator_${n}${srcSuffix}.png`;
    const srcPath = path.join(srcDir, srcFile);
    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️ Missing: ${srcPath}`);
      continue;
    }

    const parsed = parseThemeRarityCollection(labelMap[String(n)] ?? '');
    const themeRaw = parsed.theme || 'unknown';
    const theme = safeName(themeRaw) || 'unknown';
    const { rarity, rarityCode } = rarityFromCode(parsed.rarityCode);
    const collectionRaw = parsed.collection || inferCollection(themeRaw);
    const collection = safeName(collectionRaw) || 'basic';
    const dstFile = `Avator_${n}_${theme}_${rarity}.png`;
    const dstPath = path.join(outDir, dstFile);

    fs.copyFileSync(srcPath, dstPath);
    console.log(`✅ ${dstFile}`);

    mapping.push({ avatarNumber: n, srcFile, dstFile, theme: themeRaw, rarity, rarityCode, collection });
  }

  const outMapPath = path.join(outDir, 'cosplay_label_map.applied.json');
  fs.writeFileSync(outMapPath, JSON.stringify(mapping, null, 2));
  console.log(`Saved applied mapping: ${outMapPath}`);

  const manifestPath = path.join(outDir, 'avatars_theme_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(mapping, null, 2));
  console.log(`Saved manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
