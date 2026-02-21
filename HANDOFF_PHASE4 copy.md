# ChemCity — Phase 4 Handoff Summary

Completed by: Claude (Sonnet 4.6) — Phase 4: ChemStore & Unlocks
Date: 2026-02-21

---

## What I Built

### Files Created / Modified

| File | Status | Purpose |
|---|---|---|
| `src/lib/chemcity/dailyStore.ts` | **NEW** | Seeded PRNG, rarity-weighted daily item selection, UTC date utilities, slot unlock costs |
| `src/lib/chemcity/shop.ts` | **NEW** | `getEffectiveCoinPrice()`, `getDisplayPrice()`, `canAffordItem()` — display utilities only |
| `src/lib/chemcity/cloudFunctions.ts` | **UPDATED** | Added `callPurchaseCard`, `callUnlockPlace`, `callUnlockStoreSlot` |
| `src/store/chemcityStore.ts` | **UPDATED** | Added `dailyStoreItems`, `storeSlotCount`, `computeDailyStore`, `unlockStoreSlot`, `purchaseCard`, `unlockPlace`, store/unlock modal state and actions, `navigateToStore`, `navigateToGasStationDistributor` |
| `src/components/chemcity/ChemStore.tsx` | **NEW** | Daily rotating shop: N rarity-weighted items, countdown timer, slot unlock button. No filters. |
| `src/components/chemcity/PurchaseConfirmModal.tsx` | **NEW** | Full card detail + coin/diamond purchase confirmation, Boutique discount display |
| `src/components/chemcity/PlaceUnlockModal.tsx` | **NEW** | Confirmation modal for unlocking a city place from the map |
| `src/components/chemcity/GasStationDistributor.tsx` | **NEW** | Spend `extraSlotsBudget` on locked slots across all places |
| `src/components/chemcity/ChemCityRoot.tsx` | **UPDATED** | Added `store` + `gas_station_distributor` views; `PlaceUnlockModal` + `PurchaseConfirmModal` as global overlays |
| `src/components/chemcity/CurrencyBar.tsx` | **UPDATED** | Added 🏪 Store button; conditional ⛽ Gas Station distributor shortcut |
| `src/components/chemcity/ChemCityMap.tsx` | **UPDATED** | Locked place hotspots now show 🔒 and tap → `openPlaceUnlockModal` |
| `tests/chemcity/phase4.test.ts` | **NEW** | 30 tests across daily store, rarity weighting, shop utilities, date helpers |

---

## What I Changed from the Master Plan

1. **Daily rotating store — not a full browsable catalog** — the owner requested the store show only 3 rarity-weighted random cards per day (expandable to 6), rather than the full filterable catalog described in the Phase 4 task list. All filtering UI was removed. This is a significant UX redesign that makes the store a daily habit loop rather than a catalog browser.

2. **Store slot count is a new user doc field** — `user.storeSlotCount` (integer, default 3) was added to the user document. The server increments this field via `callUnlockStoreSlot`. The client reads it from `onSnapshot` and recomputes `dailyStoreItems` whenever it changes. This field is **not in the original master plan types** — the server-side `initChemCityUser` function and `UserChemCityData` type must be updated to include `storeSlotCount: 3` as a default.

3. **Daily store selection is client-side, not server-side** — the rarity-weighted daily item list is computed in `getDailyStoreItems()` using a deterministic seeded PRNG (mulberry32, seeded by `userId + YYYY-MM-DD UTC`). This requires **0 extra Firestore reads**. The same user always sees the same items on the same day. A server-side implementation would be more tamper-proof but adds reads on every store open — not worth it for a collectible card game.

4. **Store slot unlock costs defined in `dailyStore.ts`** — the master plan does not specify store slot unlock costs. Phase 4 defines: slot 4 = 🪙 1,000, slot 5 = 🪙 2,500, slot 6 = 🪙 5,000. These are exported as `STORE_SLOT_UNLOCK_COSTS` from `dailyStore.ts`. Change these values there if the owner wants to rebalance.

5. **`callPurchaseCard` sends `{ itemId, currency }`** — the server must compute the effective price independently using `activeBonuses.shopDiscountPercent`. The client never sends a price — this prevents price spoofing.

---

## Known Issues / Incomplete Work

- **Three new Cloud Functions must be written server-side before testing:**
  - `callUnlockStoreSlot` — reads `user.storeSlotCount` (default 3), validates < 6, charges correct coin cost from `STORE_SLOT_UNLOCK_COSTS`, increments `storeSlotCount`
  - `callPurchaseCard` — validates item exists + not deprecated + user owns enough currency + not already owned; applies Boutique discount server-side for coin purchases; adds to `ownedItems`
  - `callUnlockPlace` — validates placeId, charges `place.unlockCost` in coins, adds to `unlockedPlaces`

- **`UserChemCityData` type and `initChemCityUser` must add `storeSlotCount: 3`** — this new field needs to be added to the TypeScript interface in `types.ts` and to the default user doc created by `initChemCityUser`. Without it, existing users will have `undefined` which falls back to `STORE_MIN_SLOTS` (3) in the store.

- **Gas Station Distributor slot identification relies on `slot.slotIndex` and `place.freeSlotCount`** — if `PlaceDocument`/`SlotDocument` in `types.ts` do not have these fields, the distributor will show no slots. Add or verify these fields in `data/places.json` and `types.ts`.

- **`extraSlotsBudget` deduction on `unlockSlot` for Gas Station slots** — the existing Phase 1 `unlockSlot` Cloud Function must check whether the slot being unlocked is a "Gas Station slot" (no coin/diamond cost) and if so decrement `extraSlotsBudget` rather than charge coins.

- **No pagination in ChemStore** — with 3–6 items this is never needed, but if the slot count is later raised beyond 6, add scroll handling.

- **Daily store does not pre-filter owned items** — items the user already owns still appear in the daily rotation with an "✓ Owned" badge. This is intentional (shows progress) but could be changed to exclude owned items if the owner prefers.

---

## Decisions Future Coders Must Know

1. **`getDailyStoreItems` is deterministic and pure** — given the same `userId`, `slimItems`, `slotCount`, and date it always returns the same items. No side effects, no Firestore reads. Safe to call in tests with a `dateOverride`.

2. **Daily store recomputes automatically via `onSnapshot`** — when `unlockStoreSlot` resolves, the Firestore listener on the user doc detects the updated `storeSlotCount` and calls `getDailyStoreItems` with the new count inside the `set()` callback. No manual `computeDailyStore()` call is needed after unlocking.

3. **`storeSlotCount` lives on the user doc, not in Zustand local state** — it is the source of truth. The Zustand `storeSlotCount` field is a mirror of `user.storeSlotCount` set by the `onSnapshot` listener.

4. **Rarity weights are in `dailyStore.ts`** — `RARITY_WEIGHT` object at the top of the file. Common=60, Rare=25, Epic=12, Legendary=3. Change here to rebalance. The weights are used in `getDailyStoreItems` for weighted-without-replacement sampling.

5. **Store slot unlock costs are in `dailyStore.ts`** — `STORE_SLOT_UNLOCK_COSTS`: `{ 4: 1000, 5: 2500, 6: 5000 }`. The server function `unlockStoreSlot` must use these same values — hardcode them on the server or move to a shared config document in Firestore.

6. **`getEffectiveCoinPrice` is display-only** — the server recomputes the discount independently. Never pass the discounted price from the client to the server.

7. **`PurchaseConfirmModal` auto-closes 1.5 s after success** — `onSnapshot` updates `ownedItems` in the background; the Owned badge in the store card updates automatically when the modal closes.

---

## Files the Next Coder Must Read First

1. `src/lib/chemcity/dailyStore.ts` — entire file; understand seeded PRNG, weights, and slot constants before touching store logic
2. `src/store/chemcityStore.ts` — `onSnapshot` listener (recomputes `dailyStoreItems`), `unlockStoreSlot`, `purchaseCard` actions
3. `src/components/chemcity/ChemStore.tsx` — daily UI, slot progress bar, unlock button
4. `src/components/chemcity/PurchaseConfirmModal.tsx` — purchase flow (currency selector, discount, auto-close)
5. `src/lib/chemcity/cloudFunctions.ts` — three new Phase 4 CF wrappers

---

## What Must NOT Be Changed (Locked-In Contracts)

All locks from Phases 0–3 remain in force.

New in Phase 4:
- `STORE_MIN_SLOTS` (3) and `STORE_MAX_SLOTS` (6) export values from `dailyStore.ts`
- `STORE_SLOT_UNLOCK_COSTS` export from `dailyStore.ts` — the server function must use matching values
- `storeSlotCount` field name on the user document (once any user has unlocked a slot)
- `dailyStoreItems`, `storeSlotCount` field names in Zustand store
- `callPurchaseCard`, `callUnlockPlace`, `callUnlockStoreSlot` export names from `cloudFunctions.ts`
- `getEffectiveCoinPrice` export name from `shop.ts`
- View values `'store'` and `'gas_station_distributor'` in the `View` union type

---

## Test Results

Phase 1 tests: 35 pass (`npm test`)
Phase 3 tests:  8 pass
Phase 4 new tests: 30 pass
- 11 determinism + edge case tests for `getDailyStoreItems`
- 3 statistical rarity-weighting tests (200-user simulation)
- 3 `utcDateString` tests
- 2 `msUntilUtcMidnight` tests
- 3 store slot constant tests
- 6 `getEffectiveCoinPrice` tests
- 4 `canAffordItem` tests
- 3 `getDisplayPrice` tests

Run: `npm test`

---

## Suggested First Steps for Next Phase (Phase 5 — Polish & Launch)

1. **Collections album** — read `user.progress/data.collections`, render completion % per collection with animated Complete badge. Add `claimCollectionReward` Cloud Function.
2. **Legendary card shimmer** — `index.css` keyframe already defined. Add `className="shimmer"` to legendary card gradient div in `ChemCard.tsx`.
3. **Onboarding** — 3-step first-visit overlay gated on `user.createdAt` within last 60 s or a new `onboardingComplete: boolean` field.
4. **Run `estimateCacheSize()`** — call from any admin screen, log the KB value, include in Phase 5 handoff.
5. **Firestore read audit** — instrument a session, count actual reads, verify < 100/day/user.
