// ============================================================
// ChemCity — Excel to JSON Converter
// Usage: npx ts-node scripts/excel-to-json.ts
//
// Reads ChemCity_Items.xlsx and outputs slim-compatible JSON
// files to /data/items/{placeId}.json
//
// Slim fields written:  id, name, chemicalFormula, emoji,
//   rarity, rarityValue, placeId, validSlots, shopData,
//   skillContribution, collections, deprecated
//
// NOT written to slim JSON (Firestore-only):
//   displayName (col D), topicIds (col J), category (col M),
//   funFact (col N), flavorText (col O), everydayUses (col P)
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

// ─── Config ──────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_PATH = path.resolve(__dirname, '../ChemCity_Items.xlsx');
const OUTPUT_DIR = path.resolve(__dirname, '../data/items');

const RARITY_VALUES: Record<string, 1 | 2 | 3 | 4> = {
  common: 1,
  uncommon: 2,
  rare: 2,
  epic: 3,
  legendary: 4,
};

const VALID_PLACE_IDS = new Set([
  'lab', 'kitchen', 'toilet', 'garden',
  'gas_station', 'lifestyle_boutique', 'beach', 'school',
]);

function normalizeImageUrl(raw: string): string | undefined {
  const s0 = String(raw || '').trim();
  const s = s0.replace(/^['\"]|['\"]$/g, '').trim();
  if (!s) return undefined;
  const upper = s.toUpperCase();
  if (upper === 'N/A' || upper === 'NA' || upper === 'NULL') return undefined;

  const toDriveThumbnail = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w512`;
  const isGoogleUserContentDirect = (url: string): boolean => {
    return /^https?:\/\/lh3\.googleusercontent\.com\/d\/[^\/\?]+\/?$/i.test(url.trim());
  };
  const driveIdFrom = (url: string): string | null => {
    // file/d/<id>/view
    const m1 = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)\//i);
    if (m1?.[1]) return m1[1];
    // open?id=<id>
    const m2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/i);
    if (m2?.[1]) return m2[1];
    // uc?export=view&id=<id>
    const m3 = url.match(/drive\.google\.com\/uc\?[^#]*\bid=([^&]+)/i);
    if (m3?.[1]) return m3[1];
    return null;
  };

  const normalizeUrl = (url: string): string => {
    if (isGoogleUserContentDirect(url)) return url;
    const driveId = driveIdFrom(url);
    if (driveId) return toDriveThumbnail(driveId);
    return url;
  };

  // Supports formats like:
  // - (image:https://example.com/foo.png)
  // - image:https://example.com/foo.png
  // - https://example.com/foo.png
  const m = s.match(/\(\s*image\s*:\s*([^\)\s]+)\s*\)/i);
  if (m?.[1]) return normalizeUrl(m[1].trim());

  const m2 = s.match(/^image\s*:\s*(\S+)$/i);
  if (m2?.[1]) return normalizeUrl(m2[1].trim());

  return normalizeUrl(s);
}

// ─── Column mapping (0-indexed) ───────────────────────────────
// A=0  B=1  C=2  D=3  E=4  F=5  G=6  H=7  I=8  J=9
// K=10 L=11 M=12 N=13 O=14 P=15 Q=16

interface ExcelRow {
  id: string;             // A
  baseId?: string;        // (new schema)
  name: string;           // B
  chemicalFormula: string;// C
  displayName: string;    // D  (full only)
  description?: string;   // (new schema, full only)
  emoji: string;          // E
  cardBackground?: string;// (new schema, full only)
  imageUrl?: string;      // (optional)
  rarity: string;         // F
  placeId: string;        // G
  validSlots: string;     // H  (comma-separated)
  collections: string;    // I  (comma-separated)
  topicIds: string;       // J  (full only)
  coinCost: string;       // K
  diamondCost: string;    // L
  category: string;       // M  (full only)
  funFact: string;        // N  (full only)
  flavorText: string;     // O  (full only)
  everydayUses: string;   // P  (full only)
  deprecated: string;     // Q
}

function buildRowsFromGridLegacy(grid: unknown[][]): ExcelRow[] {
  const rows: ExcelRow[] = [];

  for (const raw of grid) {
    if (!Array.isArray(raw)) continue;
    const get = (idx: number) => String((raw[idx] ?? '')).trim();

    const id = get(0);
    const idNorm = id.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!id || idNorm === 'id' || idNorm.startsWith('id ')) continue;

    rows.push({
      id,
      name: get(1),
      chemicalFormula: get(2),
      displayName: get(3),
      emoji: get(4),
      imageUrl: get(17) || undefined,
      rarity: get(5),
      placeId: get(6),
      validSlots: get(7),
      collections: get(8),
      topicIds: get(9),
      coinCost: get(10),
      diamondCost: get(11),
      category: get(12),
      funFact: get(13),
      flavorText: get(14),
      everydayUses: get(15),
      deprecated: get(16),
    });
  }

  return rows;
}

function normalizeHeaderCell(cell: unknown): string {
  const raw = String(cell ?? '').trim();
  // Google Sheets CSV often includes helpful notes on new lines or in parentheses.
  // Example: "rarity\n↓ pick from list" or "id\n(unique, no spaces)".
  // We want the base header key only.
  const base = raw.split(/\r?\n|\(/, 1)[0]?.trim() ?? '';
  return base
    .toLowerCase()
    .replace(/[\s\n\r]+/g, '')
    .replace(/[^a-z0-9_]/g, '');
}

function buildRowsFromHeaderMappedGrid(grid: unknown[][]): ExcelRow[] {
  // Find first non-empty row to use as header
  let headerRowIndex = -1;
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];
    if (!Array.isArray(row)) continue;
    const first = String(row[0] ?? '').trim();
    if (!first) continue;
    headerRowIndex = i;
    break;
  }
  if (headerRowIndex < 0) return [];

  const headerRaw = grid[headerRowIndex] as unknown[];
  const header = headerRaw.map(normalizeHeaderCell);
  const idx = (key: string) => header.indexOf(key);
  const hasChemCityHeader = header.includes('primaryplaceid') && header.includes('rarity');

  if (!hasChemCityHeader) {
    // Not the new schema; fall back to fixed indexing
    return buildRowsFromGridLegacy(grid.slice(headerRowIndex + 1));
  }

  const getCell = (row: unknown[], key: string) => {
    const i = idx(key);
    return i >= 0 ? String((row[i] ?? '')).trim() : '';
  };

  const rows: ExcelRow[] = [];
  const dataRows = grid.slice(headerRowIndex + 1);

  for (const raw of dataRows) {
    if (!Array.isArray(raw)) continue;

    const id = getCell(raw, 'id');
    const idNorm = id.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!id || idNorm === 'id' || idNorm.startsWith('id ')) continue;
    if (id.includes('←') || id.includes('Copy this row')) continue;

    const baseIdRaw = getCell(raw, 'baseid') || getCell(raw, 'chemicalgroupid');

    // Map new schema → legacy ExcelRow shape used by the rest of this script
    rows.push({
      id,
      baseId: baseIdRaw || undefined,
      name: getCell(raw, 'name'),
      chemicalFormula: getCell(raw, 'chemicalformula'),
      displayName: getCell(raw, 'displayname'),
      description: getCell(raw, 'description') || undefined,
      emoji: getCell(raw, 'emoji'),
      cardBackground: getCell(raw, 'cardbackground') || undefined,
      imageUrl: normalizeImageUrl(getCell(raw, 'imageurl')),
      rarity: getCell(raw, 'rarity'),
      placeId: getCell(raw, 'primaryplaceid'),
      // In the new sheet, “primarySubPlaceId” corresponds to slot IDs like lab_acid_cabinet
      validSlots: [getCell(raw, 'primarysubplaceid'), getCell(raw, 'additionalplaceids')]
        .filter(Boolean)
        .join(','),
      collections: getCell(raw, 'collectionids'),
      topicIds: getCell(raw, 'topicids'),
      coinCost: getCell(raw, 'tokencost'),
      diamondCost: getCell(raw, 'diamondcost'),
      category: getCell(raw, 'category'),
      funFact: getCell(raw, 'funfact'),
      flavorText: getCell(raw, 'flavortext'),
      everydayUses: getCell(raw, 'everydayuses'),
      deprecated: 'FALSE',
    });
  }

  return rows;
}

async function loadRowsFromCsvUrl(csvUrl: string): Promise<ExcelRow[]> {
  const res = await fetch(csvUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch CSV (${res.status}): ${await res.text()}`);
  }
  const csvText = await res.text();

  const parsed = Papa.parse(csvText, {
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse error: ${first.message}`);
  }

  const grid = parsed.data as unknown[][];
  return buildRowsFromHeaderMappedGrid(grid);
}

async function loadRowsFromExcelFile(excelPath: string): Promise<ExcelRow[]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
    header: [
      'id', 'name', 'chemicalFormula', 'displayName', 'emoji',
      'rarity', 'placeId', 'validSlots', 'collections', 'topicIds',
      'coinCost', 'diamondCost', 'category', 'funFact',
      'flavorText', 'everydayUses', 'deprecated',
    ],
    defval: '',
    range: 1,
  });
}

// ─── Main ─────────────────────────────────────────────────────

async function run() {
  console.log('📊 ChemCity Excel → JSON converter');
  const csvUrl = process.argv[2] || process.env.CHEMCITY_ITEMS_CSV_URL;

  let rows: ExcelRow[] = [];

  if (csvUrl) {
    console.log(`   Reading CSV URL: ${csvUrl}\n`);
    rows = await loadRowsFromCsvUrl(csvUrl);
  } else {
    console.log(`   Reading: ${EXCEL_PATH}\n`);

    if (!fs.existsSync(EXCEL_PATH)) {
      console.error(`❌ File not found: ${EXCEL_PATH}`);
      console.error('   Create ChemCity_Items.xlsx in the project root first, or pass a CSV URL.');
      process.exit(1);
    }

    rows = await loadRowsFromExcelFile(EXCEL_PATH);
  }

  console.log(`   Found ${rows.length} item rows\n`);

  // Validate and transform
  const errors: string[] = [];
  const byPlace: Record<string, object[]> = {};
  let skippedDeprecated = 0;
  let processedCount = 0;

  for (const row of rows) {
    const id = String(row.id || '').trim();
    if (!id || id === 'id') continue; // skip blank / re-header rows

    // Deprecated check
    const deprecated = String(row.deprecated || '').trim().toUpperCase() === 'TRUE';

    // Validate required fields
    const rarity = String(row.rarity || '').trim().toLowerCase();
    const placeId = String(row.placeId || '').trim().toLowerCase();

    if (!RARITY_VALUES[rarity]) {
      errors.push(`  Row "${id}": invalid rarity "${rarity}" — must be common/uncommon/rare/epic/legendary`);
    }
    if (!VALID_PLACE_IDS.has(placeId)) {
      errors.push(`  Row "${id}": invalid placeId "${placeId}" — must be one of the 8 place IDs`);
    }
    if (!id.startsWith('item_')) {
      errors.push(`  Row "${id}": id must start with "item_"`);
    }

    if (deprecated) {
      skippedDeprecated++;
      // Still include in output — the slim doc stores deprecated:true
      // so the client can hide them without needing a Firestore re-read
    }

    // Build slim document
    const validSlots = String(row.validSlots || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const collections = String(row.collections || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const coinCost = row.coinCost ? parseInt(String(row.coinCost), 10) : undefined;
    const diamondCost = row.diamondCost ? parseInt(String(row.diamondCost), 10) : undefined;

    // skillContribution = rarityValue (can be overridden in full doc later)
    const rarityValue = RARITY_VALUES[rarity] ?? 1;

    const slim = {
      id,
      ...(row.baseId ? { baseId: String(row.baseId).trim() } : {}),
      name: String(row.name || '').trim(),
      chemicalFormula: String(row.chemicalFormula || '').trim(),
      emoji: String(row.emoji || '').trim(),
      ...(row.imageUrl ? { imageUrl: String(row.imageUrl).trim() } : {}),
      rarity,
      rarityValue,
      placeId,
      validSlots,
      shopData: {
        ...(coinCost !== undefined && { coinCost }),
        ...(diamondCost !== undefined && { diamondCost }),
      },
      skillContribution: rarityValue, // default: rarity value
      collections,
      deprecated,
    };

    // Group by place
    if (!byPlace[placeId]) byPlace[placeId] = [];
    byPlace[placeId].push(slim);
    processedCount++;
  }

  // Report validation errors
  if (errors.length > 0) {
    console.error('❌ Validation errors found:\n');
    errors.forEach((e) => console.error(e));
    console.error('\n   Fix the above errors in ChemCity_Items.xlsx and re-run.\n');
    process.exit(1);
  }

  // Write output files
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [placeId, items] of Object.entries(byPlace)) {
    const outPath = path.join(OUTPUT_DIR, `${placeId}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf-8');
    console.log(`   ✅ ${outPath}  (${items.length} cards)`);
  }

  // Summary
  const estimatedKB = ((processedCount * 170) / 1024).toFixed(1);
  const pct5MB = ((processedCount * 170) / (5 * 1024 * 1024) * 100).toFixed(2);

  console.log(`
✅ Done!
   ${processedCount} items processed across ${Object.keys(byPlace).length} places
   ${skippedDeprecated} deprecated (included with deprecated:true)

📦 Estimated slim cache size: ~${estimatedKB} KB (${pct5MB}% of 5MB localStorage budget)
   — well within safe limits

⏭️  Next step: run the seeder
   npx ts-node scripts/seed-firestore.ts
`);
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
