# ChemCity — Phase 0 Handoff Summary

Completed by: Claude (Sonnet 4.6) — Phase 0: Foundation & Data Seeding  
Date: 2026-02-20

---

## What I Built

### Files Created

| File | Purpose |
|---|---|
| `src/lib/chemcity/types.ts` | All TypeScript interfaces: `SlimItemDocument`, `FullItemDocument`, `UserChemCityData`, `UserProgressData`, `ActiveBonuses`, `CacheManifest`, `PlaceDocument`, `CollectionDocument`, `TopicDocument` |
| `src/lib/cache.ts` | `fetchSlimItems()`, `fetchFullItem()`, `fetchPlaces()`, `fetchCollections()`, `fetchTopics()`, `isCacheFresh()`, `getServerCacheVersion()`, `invalidateCache()`, `estimateCacheSize()` |
| `src/lib/chemcity/bonuses.ts` | `computeActiveBonuses()`, all 8 skill formula functions, `computeQuizDiamonds()`, `rollKitchenBonus()`, `rollBeachDouble()`, `getShopPrice()` |
| `src/lib/firebase.ts` | Firebase app init, `db` and `auth` exports |
| `scripts/excel-to-json.ts` | Reads `ChemCity_Items.xlsx` → outputs `/data/items/{placeId}.json` (slim fields only) |
| `scripts/seed-firestore.ts` | Seeds items, places, collections, topics to Firestore; auto-bumps `meta/cacheVersion` |
| `functions/initChemCityUser.ts` | Creates user doc + progress sub-document with starter state |
| `functions/collectPassiveIncome.ts` | Server-side passive income payout using Firestore server timestamp |
| `data/places.json` | All 8 place documents with slots and skill metadata |
| `firestore.rules` | Security rules — static collections read-only; currencies blocked on client writes |
| `.env.example` | Environment variable template |
| `package.json` | Dependencies and npm scripts |

---

## What I Changed from the Master Plan

No deviations from master plan.

All 8 place IDs, slot structures, and skill formulas implemented exactly as specified in Section 2.6 and 2.7.

---

## Known Issues / Incomplete Work

- `vite.config.ts` and `tsconfig.json` not generated — next coder should run `npm create vite@latest` or scaffold manually and merge in the existing `src/` files.
- No starter `ChemCity_Items.xlsx` provided — the project owner needs to create this using the column reference in Section 8.1 of the master plan.
- `data/collections.json` and `data/topics.json` are referenced by the seeder but not seeded yet — create these based on DSE curriculum content.
- Cloud Functions are TypeScript stubs — need `functions/index.ts` to wire them as callable functions and deploy via Firebase CLI.
- No unit tests written yet — Phase 1 task list includes full test coverage for all formulas.

---

## Decisions Future Coders Must Know

1. **Slim field whitelist in `cache.ts`** — The array `SLIM_FIELDS` in `fetchSlimItems()` is the authoritative whitelist of what gets stored in localStorage. If you add a new field to `SlimItemDocument`, you MUST add it to this array or it will silently be excluded from the cache.

2. **`computeActiveBonuses` is pure** — It takes `equipped` + `slimItems` and returns `ActiveBonuses`. No Firestore reads. Safe to call in tests. The result MUST be written to `users/{userId}.activeBonuses` after every equip/unequip.

3. **`passiveBaseCoinsPerHour` already includes the Lab multiplier** — `computeActiveBonuses` pre-multiplies Garden × Lab and stores the result. The Cloud Function just reads `activeBonuses.passiveBaseCoinsPerHour` directly — don't apply Lab multiplier again.

4. **Boutique discount capped at 50%** — enforced in `calcBoutiqueDiscount()`. The cap is also documented in the master plan. Do not remove it.

5. **Beach chance capped at 100%** — enforced in `calcBeachDoubleChance()`. At exactly 100%, every quiz doubles — this is intended behaviour for fully maxed Beach.

6. **Never delete item rows in Excel** — set `deprecated = TRUE` in column Q. The seeder uses `merge:true` so deprecated items are preserved in Firestore.

---

## Files the Next Coder Must Read First

1. `src/lib/chemcity/types.ts` — All interfaces. Read before writing any game logic.
2. `src/lib/cache.ts` — Understand the slim/full split and version check before touching data fetching.
3. `src/lib/chemcity/bonuses.ts` — All 8 skill formulas. Phase 1 extends this with `equipCard` / `unequipCard`.
4. `data/places.json` — All 8 places, slot IDs, and unlock costs. Slot IDs are now locked.
5. `firestore.rules` — Know what clients can and can't write before designing Cloud Functions.

---

## What Must NOT Be Changed (Locked-In Contracts)

These are locked the moment any user data exists in Firestore:

- All Firestore field names in `UserChemCityData` and `UserProgressData`
- All 8 place IDs: `lab`, `kitchen`, `toilet`, `garden`, `gas_station`, `lifestyle_boutique`, `beach`, `school`
- All slot IDs in `data/places.json` (e.g. `lab_bench_1`, `garden_bed_1`)
- Item ID format: must start with `item_` and be snake_case
- `meta/cacheVersion` document path and field name `version`
- `users/{userId}/progress/data` sub-document path

---

## Suggested First Steps for Next Phase (Phase 1)

1. **Scaffold Vite project** — run `npm create vite@latest . -- --template react-ts`, then merge in `src/lib/` files. Verify TypeScript compiles with no errors.
2. **Wire Cloud Functions** — create `functions/index.ts`, export `collectPassiveIncome` and `initChemCityUser` as Firebase callable functions. Deploy to Firebase.
3. **Write `equipCard` / `unequipCard` functions** — validate ownership + slotId, write to Firestore, call `computeActiveBonuses`, persist result to `activeBonuses`. These are Phase 1's core deliverables.

---

## Cache Size Estimate

Based on the slim field structure:
- ~170 bytes per card
- 300 cards (expected v1 catalog) = ~51 KB = **~1% of the 5MB localStorage budget**
- Run `estimateCacheSize()` from any admin screen after cards are seeded to confirm

> `console.log(estimateCacheSize())` — paste actual numbers in Phase 5 handoff.
