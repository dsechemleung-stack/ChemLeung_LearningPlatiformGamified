# ChemCity — Phase 2 Handoff Summary

Completed by: Claude (Sonnet 4.6) — Phase 2: UI: Map & Card Collection
Date: 2026-02-20

---

## What I Built

### Files Created

| File | Purpose |
|---|---|
| `src/App.tsx` | Vite/React entry point — renders `ChemCityRoot` |
| `src/main.tsx` | ReactDOM mount |
| `src/index.css` | Tailwind directives + dark scrollbar + shimmer keyframe |
| `index.html` | HTML shell with mobile viewport/PWA meta tags |
| `vite.config.ts` | Vite config with React plugin + globalThis shim |
| `tsconfig.json` | Root TS config (references app + node) |
| `tsconfig.app.json` | App TypeScript config (strict, bundler module resolution) |
| `tsconfig.node.json` | Vite config TypeScript config |
| `tailwind.config.js` | Tailwind config (content includes all tsx) |
| `postcss.config.js` | PostCSS with Tailwind + autoprefixer |
| `package.json` | Updated with `zustand`, `@vitejs/plugin-react`, `tailwindcss` |
| `src/lib/firebase.ts` | Firebase app init (idempotent, Vite env vars) |
| `src/lib/cache.ts` | Full slim/full cache implementation with localStorage + version check |
| `src/lib/chemcity/types.ts` | All interfaces (unchanged contracts from Phase 0/1; `imageUrl` confirmed in `FullItemDocument`) |
| `src/lib/chemcity/income.ts` | `estimateUnclaimedCoins()` display ticker |
| `src/lib/chemcity/cloudFunctions.ts` | **NEW** — typed wrappers for all 8 Cloud Functions (Phase 2 first uses them) |
| `src/store/chemcityStore.ts` | **NEW** — Zustand store: user data, view navigation, card picker/detail, passive ticker |
| `src/components/chemcity/ChemCityRoot.tsx` | **NEW** — root component: auth listener, loadAll, view switcher, global overlays |
| `src/components/chemcity/CurrencyBar.tsx` | **NEW** — sticky header with coins/diamonds/inventory button |
| `src/components/chemcity/ChemCityMap.tsx` | **NEW** — 8 place tiles, passive income section, locked overlay + inline unlock |
| `src/components/chemcity/PlaceView.tsx` | **NEW** — slot grid, skill summary header, locked slot tiles with inline unlock button |
| `src/components/chemcity/CardInventory.tsx` | **NEW** — owned card grid, search + place/rarity filters, equipped badge |
| `src/components/chemcity/CardPicker.tsx` | **NEW** — bottom sheet for slot equip: valid owned cards, rarity filter, unequip current |
| `src/components/chemcity/ChemCard.tsx` | **NEW** — reusable card component: rarity gradient bg, formula, emoji, equipped ring |
| `src/components/chemcity/CardDetail.tsx` | **NEW** — full detail overlay: fetchFullItem on open, loading skeleton, imageUrl display |
| `src/components/chemcity/PassiveIncomeCollector.tsx` | **NEW** — cosmetic client ticker + Collect button → server-validated Cloud Function |
| `scripts/excel-to-json.ts` | **UPDATED** — added column R (`imageUrl`) support. Outputs slim JSON + full JSON |
| `scripts/seed-firestore.ts` | **UPDATED** — seeds full items (with `imageUrl`), estimates cache size on completion |

---

## What I Changed from the Master Plan

1. **Zustand for state management** — master plan does not specify a state library. Chose Zustand (tiny bundle, no boilerplate, works perfectly with Firebase onSnapshot). Store is at `src/store/chemcityStore.ts`. If migrating, all component `useChemCityStore` calls must be replaced.

2. **Realtime user listener** — added a Firestore `onSnapshot` on the user doc so currency/equip changes from Cloud Functions reflect in the UI instantly without a manual refresh. This adds 0 reads (it is a listener, not reads). Clean up via `teardown()` on unmount.

3. **imageUrl added to Excel column R** — master plan Section 8.1 has 17 columns (A–Q). Phase 2 adds column R (`imageUrl`) per user request. This field is **full-item only** — it is NOT in slim fields and is NOT cached in localStorage. It is fetched from Firestore only when the card detail overlay opens. `excel-to-json.ts` and `seed-firestore.ts` both updated.

4. **View routing is internal state** — no React Router. The `view` field in the Zustand store drives `map | place | inventory`. If React Router is needed in Phase 4/5 for deep links or PWA back-button support, migrate then.

---

## Known Issues / Incomplete Work

- **No auth UI** — `ChemCityRoot` calls `onAuthStateChanged` but there is no login screen. Assumes the host platform handles Firebase Auth and the user is already signed in when ChemCity loads. Phase 3 or the integration phase must wire this.
- **`skillContribution` not set from Excel** — The field is always 0 in `excel-to-json.ts` output. Skill contribution values should be filled manually in Firestore or added as Excel column S in a future phase. The bonus engine reads `skillContribution` from slim items — it must be correct before equip bonuses work.
- **`places.json` not included** — this file was a Phase 0 deliverable. `fetchPlaces()` reads from Firestore. Ensure `data/places.json` is seeded before testing.
- **Legendary card shimmer** — CSS keyframe is defined in `index.css` but not yet applied conditionally to legendary `ChemCard` tiles. Add `className="shimmer"` to the legendary card gradient div in a polish pass.
- **Gas Station extra-slot distribution UI** — slots using `extraSlotsBudget` (Gas Station bonus) show an "Unlock" button in `PlaceView` but the affordability check falls back to `extraSlotsBudget > 0` without dedicated UI to show the budget. Full Gas Station distributor UI is a Phase 4 task (master plan P4 task 60).

---

## Decisions Future Coders Must Know

1. **Store is the single source of truth** — `useChemCityStore` is used directly in components. Do not add local state for game data. Update the store only.

2. **`cloudFunctions.ts` is the only client write path** — all currency/equip writes call these typed wrappers. Never use Firestore `setDoc`/`updateDoc` for game data from the client.

3. **`onSnapshot` replaces refresh** — after any Cloud Function call (equip, collect, unlock), the Firestore listener on `users/{userId}` automatically updates the store. No manual re-fetch needed.

4. **`fetchFullItem` is intentionally uncached** — one Firestore read per card detail tap. This is a rare action and the full item (including `imageUrl`) must always be fresh. Do not cache FullItemDocument.

5. **imageUrl is column R in Excel** — it is a `FullItemDocument` field, seeded to Firestore. It does NOT appear in the slim cache. In `CardDetail.tsx`, it is displayed via `<img>` with an `onError` fallback to emoji.

6. **Tailwind is the only styling system** — no CSS modules, no styled-components. All dark-mode classes use `slate-*` palette. Do not add inline styles for colors.

7. **`freeSlotCount` determines free vs. locked slots** — in `PlaceView`, slots at indices `0 .. freeSlotCount-1` are free. All others require unlock. This logic reads `place.freeSlotCount` from `data/places.json`.

---

## Files the Next Coder Must Read First

1. `src/store/chemcityStore.ts` — All state and actions. Understand this before touching any component.
2. `src/lib/chemcity/cloudFunctions.ts` — All Cloud Function wrappers. Any new write operation needs a new wrapper here.
3. `src/components/chemcity/ChemCityRoot.tsx` — Auth flow, view switching, global overlay pattern.
4. `src/lib/chemcity/types.ts` — Locked interfaces. Read before any data modeling.
5. `src/lib/cache.ts` — Slim/full split. Understand before adding any new data fetching.

---

## What Must NOT Be Changed (Locked-In Contracts)

Inherited and still locked:
- All Firestore field names in `UserChemCityData` and `UserProgressData`
- All 8 place IDs: `lab`, `kitchen`, `toilet`, `garden`, `gas_station`, `lifestyle_boutique`, `beach`, `school`
- All slot IDs in `data/places.json`
- Item ID format: `item_` prefix, snake_case
- `meta/cacheVersion` document path
- `users/{userId}/progress/data` sub-document path
- `streaks.lastLoginDate` format: `YYYY-MM-DD` UTC string
- `ActiveBonuses` field names (8 fields)
- Cloud Function names

New in Phase 2:
- `SLIM_FIELDS` array in `src/lib/cache.ts` — do not remove fields; adding fields requires matching `SlimItemDocument` update
- Excel column layout A–R — columns A–Q are locked from the master plan; column R (`imageUrl`) is new from Phase 2
- Zustand store action names used by components — renaming breaks all component callers

---

## Test Results

No new unit tests in Phase 2 (all logic is UI + store integration).
All 35 Phase 1 unit tests still pass: `npm test`

---

## Suggested First Steps for Next Phase (Phase 3 — Quiz Currency Rewards)

1. **Wire quiz completion hook** — find the existing quiz platform's completion callback. Call `callQuizReward()` from `cloudFunctions.ts` with `baseCoins`, `baseDiamonds`, `topicId`, `correctAnswers`, `totalQuestions`.
2. **Build post-quiz reward screen** — animated coin/diamond counter in a modal overlay. Use the `QuizRewardResult` fields (`coinsAwarded`, `diamondsAwarded`, `didDouble`, `breakdown`) for the display.
3. **Build daily login bonus check** — on `ChemCityRoot` mount (after `loadAll`), call `callGetDailyLoginBonus()`. If `!alreadyClaimed`, show a reward modal with the streak count and diamonds earned.
