# ChemCity — Phase 4 Handoff Summary

Completed by: Cascade
Date: 2026-02-21

---

## What Was Implemented

### Daily rotating ChemStore (client-side deterministic)
- Daily stock is generated client-side (no extra Firestore reads) using a deterministic PRNG seeded by `userId + YYYY-MM-DD (UTC)`.
- Rarity-weighted selection without replacement.
- Supports 3–6 visible items based on `chemcity.storeSlotCount`.

### Store slot unlocks (server-authoritative)
- New user field: `chemcity.storeSlotCount`.
- New callable Cloud Function: `chemcityUnlockStoreSlot`.
- Unlock costs (coins):
  - Slot 4: 1000
  - Slot 5: 2500
  - Slot 6: 5000

### Purchase flow
- Store item tap opens a full-detail confirm modal.
- Client sends only `{ itemId, currency }` for purchases; server computes authoritative price.

### Place unlock flow from map
- Locked hotspots show `🔒`.
- Tapping a locked place opens a confirm modal and calls `chemcityUnlockPlace`.

### Gas Station distributor
- New view to spend `chemcity.extraSlotsBudget` on unlocking slots by calling `chemcityUnlockSlot` with `useExtraSlotBudget: true`.

---

## Files Added / Updated (Repo)

### Added
- `src/lib/chemcity/dailyStore.ts`
- `src/components/chemcity/ChemStore.tsx`
- `src/components/chemcity/PurchaseConfirmModal.tsx`
- `src/components/chemcity/PlaceUnlockModal.tsx`
- `src/components/chemcity/GasStationDistributor.tsx`
- `tests/chemcity/phase4.test.ts`

### Updated
- `src/store/chemcityStore.ts`
  - New views: `store`, `gas_station_distributor`
  - New state: `dailyStoreItems`, `storeSlotCount`, modal state
  - New actions: `navigateToStore`, `navigateToGasStationDistributor`, `unlockStoreSlot`, purchase/unlock modal open/close
  - `unlockSlot(placeId, slotId, useExtraSlotBudget?)` now supports Gas Station distributor
- `src/lib/chemcity/types.ts`
  - Added `storeSlotCount: number` to `UserChemCityData`
  - Added `useExtraSlotBudget?: boolean` to `UnlockSlotRequest`
- `src/lib/chemcity/shop.ts`
  - Phase 4 display helpers: `getEffectiveCoinPrice`, `getDisplayPrice`, `canAffordItem`
- `src/lib/chemcity/cloudFunctions.ts`
  - Added `callChemCityUnlockStoreSlot` and Phase 4 aliases
  - **Important**: switched to lazy `getFns()` to avoid Jest failure when Firebase isn’t initialized
- `src/components/chemcity/ChemCityRoot.tsx`
  - Wires new views + global overlays (`PlaceUnlockModal`, `PurchaseConfirmModal`)
- `src/components/chemcity/CurrencyBar.tsx`
  - Added 🏪 Store button
  - Added conditional ⛽ distributor shortcut on Gas Station place when budget > 0
- `src/components/chemcity/ChemCityMap.tsx`
  - Locked place tap opens unlock modal instead of being inert
- `functions/index.js`
  - Added default `storeSlotCount: 3` in `getChemCityDefaults`
  - Added new callable `exports.chemcityUnlockStoreSlot`

---

## Important Data / Contracts

- New Firestore user field: `users/{uid}.chemcity.storeSlotCount`
- New callable Cloud Function name: `chemcityUnlockStoreSlot`
- View values added: `store`, `gas_station_distributor`

---

## Test / Build Status

- `npm test`: PASS (69 tests)
- `npm run build`: PASS

---

## Deployment Checklist

1. Deploy Cloud Functions:
   - `firebase deploy --only functions`
2. Existing users:
   - If `storeSlotCount` is missing, client defaults to 3 and server also defaults to 3 for unlocks.

---

## Notes / Known Non-blocking Warnings

- `npm run build` reports duplicate keys in `src/contexts/LanguageContext.jsx` (pre-existing; build still succeeds).
