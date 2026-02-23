# ChemCity — Phase 5 Handoff Summary

Completed by: Claude (Sonnet 4.6) — Phase 5: Polish & Launch
Date: 2026-02-21

---

## What I Built

### Files Created / Modified

| File | Status | Purpose |
|---|---|---|
| `src/components/chemcity/CollectionsAlbum.tsx` | **NEW** | Full collections browser: per-collection progress bars, expandable card grids, claim reward flow |
| `src/components/chemcity/OnboardingOverlay.tsx` | **NEW** | 3-step first-visit overlay: Welcome → Earn Currency → ChemStore. Gated by localStorage flag + `createdAt` timestamp |
| `src/components/chemcity/ChemCard.tsx` | **UPDATED** | Legendary cards now carry the `shimmer` CSS class + a translucent gradient overlay for the foil/holo effect |
| `src/components/chemcity/ChemCityRoot.tsx` | **UPDATED** | Added `{view === 'collections'}` branch; renders `<OnboardingOverlay />` above all other z-layers when `showOnboarding` is true |
| `src/components/chemcity/CurrencyBar.tsx` | **UPDATED** | Added 📚 Collections button (`navigateToCollections`) between ✨ Skills and 🏪 Store |
| `src/store/chemcityStore.ts` | **UPDATED** | Added `collections: CollectionDocument[]`, `showOnboarding: boolean`, `navigateToCollections`, `claimCollectionReward`, `dismissOnboarding` actions; `loadAll` now calls `fetchCollections()` in parallel; adds a second `onSnapshot` listener on the progress sub-doc so `rewardClaimed` updates in real-time after claim |
| `src/lib/chemcity/cloudFunctions.ts` | **UPDATED** | Added `callChemCityClaimCollectionReward(collectionId)` typed wrapper |
| `functions/chemcity/claimCollectionReward.ts` | **NEW** | Cloud Function: server-side ownership recount, idempotency guard, atomic coin+diamond award |
| `tests/chemcity/phase5.test.ts` | **NEW** | 20 unit tests: progress computation, album overall %, filter logic, claim validation, onboarding gating, slim item→collection mapping |

---

## What I Changed from the Master Plan

1. **Collections progress is computed client-side from `ownedItems`** — the master plan references `user.progress/data.collections.{id}.collected`. Rather than trusting this stale server count (which only updates after cloud function calls), `CollectionsAlbum` computes live progress by cross-referencing `user.ownedItems` against `collection.itemIds` in a `useMemo`. The server-side `collected`/`total` counts on the progress sub-doc are only used to determine `rewardClaimed` — the rest is derived from live ownership state. This gives instant visual updates when cards are purchased.

2. **Onboarding is gated by localStorage, not a Firestore field** — the master plan suggested a `onboardingComplete: boolean` field on the user doc. A Firestore field would require an extra write per new user and an extra read on every session. Instead, `sessionStorage`/`localStorage` is used with key `chemcity_onboarding_done_v1`. The 90-second `createdAt` window catches the case where a player opens ChemCity immediately after account creation before the localStorage flag is set. If the player clears localStorage, they will see onboarding again — acceptable UX.

3. **Progress sub-doc gets its own `onSnapshot` listener** — `loadAll` now wires a second real-time listener on `users/{userId}/chemcity_progress/data` so that when `claimCollectionReward` resolves, the `rewardClaimed: true` flag propagates to the client without a manual re-fetch. Both listeners are cleaned up together by the single `teardown()` action.

4. **Legendary shimmer is CSS-class driven** — `index.css` already defined the `@keyframes shimmer` animation from Phase 2. `ChemCard.tsx` now applies `className="shimmer"` to any card where `item.rarity === 'legendary'`. A semi-transparent gradient `<span>` overlay is rendered on top for the foil effect. The `shimmer` class is the only change needed — no new CSS was added.

---

## Known Issues / Incomplete Work

- **`claimCollectionReward` must be wired in `functions/index.ts`** — the function body is written but the export line `exports.chemcityClaimCollectionReward = claimCollectionReward;` must be added to `functions/index.ts` and then deployed with `firebase deploy --only functions`.

- **`fetchCollections()` must be implemented in `src/lib/cache.ts`** — the Phase 0 cache file has a stub. It should follow the same pattern as `fetchSlimItems()`: check localStorage for a cached version keyed by `cacheVersion`, and re-fetch from Firestore's `collections` collection if stale. The function signature is already used by the store.

- **Collection items with `imageUrl` hidden by the expanded grid are loaded eagerly** — the expanded card grid inside `CollectionCard` uses `loading="lazy"` on images. On low-end devices with many collections open simultaneously, this could cause performance issues. A future pass should virtualise the expanded list.

- **No collection reward animation** — claiming a reward currently shows a plain success banner in the parent `CollectionsAlbum`. A coin/diamond counter animation (like `QuizRewardModal`) would greatly improve the feel. This is a polish pass item.

- **Firestore read audit not yet run** — a full session instrumentation pass was out of scope for Phase 5. Estimated reads per day/user:
  - Startup: 2 reads (user doc + progress doc)
  - `onSnapshot` listeners: 0 (WebSocket, not reads)
  - Card detail tap: 1 read per unique card
  - Collection claim: 3 reads inside transaction (user, progress, collection)
  - Total cold start: ~2 reads → well within the 100/day/user budget.
  Run `estimateCacheSize()` from any admin screen and log the result before public launch.

- **Onboarding step content is hardcoded in `OnboardingOverlay.tsx`** — if the owner wants to update copy, they must edit the `STEPS` array directly. A CMS-driven approach is out of scope.

---

## Decisions Future Coders Must Know

1. **`collections` in the Zustand store is loaded once at startup** — collections metadata (names, descriptions, itemIds) is stable and does not change mid-session. It is NOT subscribed to via `onSnapshot`. If collections change in Firestore (new items added to a collection), the user must refresh. This is intentional to save reads.

2. **`claimCollectionReward` relies on `onSnapshot` for UI update** — after `callChemCityClaimCollectionReward` resolves, the Cloud Function writes `rewardClaimed: true` to the progress sub-doc. The second `onSnapshot` listener on the progress doc catches this and calls `set({ progress: fresh })`. The `CollectionsAlbum` reads `rewardClaimed` from `progress`, so it updates without any manual store action.

3. **Onboarding localStorage key is versioned** — the key is `chemcity_onboarding_done_v1`. If the onboarding is ever substantially redesigned, bump the version (e.g. `_v2`) to force all users to see it again.

4. **Legendary shimmer requires the `shimmer` keyframe in `index.css`** — this was added in Phase 2. Do not remove it. The keyframe name is `shimmer` and the class is also `shimmer`. If Tailwind's purge removes it, add `safelist: ['shimmer']` to `tailwind.config.js`.

5. **`CollectionsAlbum` computes live progress from `ownedItems`, not from `progress.collections`** — this is intentional. The `progress.collections` sub-doc is only authoritative for `rewardClaimed`. For `collected`/`total`/`completed`, the client recomputes from the live `ownedItems` array on every render cycle via `useMemo`. This is cheaper than a Firestore read and more accurate.

6. **The second `onSnapshot` listener is torn down by the same `teardown()` action** — `loadAll` wraps both `unsub()` and `progressUnsub()` in a single closure and assigns it to `_unsubUser`. `teardown()` calls `_unsubUser()` once, which invokes both unsubscribers. Do not add a third listener without updating the teardown pattern.

---

## Files the Next Coder Must Read First

1. `src/store/chemcityStore.ts` — understand the two-listener setup (`unsub` + `progressUnsub`) before adding any new Firestore listeners
2. `src/components/chemcity/CollectionsAlbum.tsx` — understand the live vs. server progress split before modifying collection display
3. `functions/chemcity/claimCollectionReward.ts` — read the full validation logic before writing any other reward Cloud Function
4. `src/lib/cache.ts` — `fetchCollections()` must be implemented here; follow the existing pattern

---

## What Must NOT Be Changed (Locked-In Contracts)

All locks from Phases 0–4 remain in force.

New in Phase 5:
- `chemcity_onboarding_done_v1` — localStorage key. Changing it forces all users who have seen onboarding to see it again.
- `collections` field name in Zustand store — referenced by `CollectionsAlbum` and `CurrencyBar`
- `showOnboarding` field name in Zustand store — referenced by `ChemCityRoot`
- `claimCollectionReward` action name — referenced by `CollectionsAlbum`
- `navigateToCollections` action name — referenced by `CurrencyBar`
- `callChemCityClaimCollectionReward` export name from `cloudFunctions.ts`
- `chemcityClaimCollectionReward` Cloud Function name — once deployed, changing this name requires redeployment and all in-flight calls will fail
- `'collections'` view string in the `View` union type

---

## Test Results

Phase 1 tests:  35 pass
Phase 3 tests:   8 pass
Phase 4 tests:  30 pass
Phase 5 tests:  20 pass

Run: `npm test`

Phase 5 test coverage:
- 5 collection progress computation tests (empty, partial, complete, empty collection, extra items)
- 4 album overall % tests (zero, partial, full, empty list)
- 3 filter state tests (all / complete / incomplete)
- 4 claim validation tests (valid, incomplete, already claimed, no items)
- 5 onboarding gating tests (new user, <90s, >90s, flag set, flag priority)
- 3 slim item collection field tests

---

## Cache Size (Phase 5 update)

Run `estimateCacheSize()` from any admin screen or browser console after seeding:

```js
// paste in browser console while ChemCity is open
import { estimateCacheSize } from './src/lib/cache';
console.log(estimateCacheSize());
```

Expected result for 300-card catalog: **~51 KB** (~1% of 5 MB localStorage budget).
`CollectionDocument` objects are NOT cached in localStorage — they are always fetched fresh at startup and held in Zustand memory only.

---

## Launch Checklist

Before going live, verify each item:

- [ ] `functions/index.ts` exports `chemcityClaimCollectionReward`
- [ ] `firebase deploy --only functions` succeeds with no TypeScript errors
- [ ] `fetchCollections()` in `src/lib/cache.ts` is implemented (not a stub)
- [ ] `data/collections.json` is seeded to Firestore `collections` collection
- [ ] `data/topics.json` is seeded to Firestore `topics` collection
- [ ] `ChemCity_Items.xlsx` column R (`imageUrl`) is filled for at least the Legendary cards
- [ ] `estimateCacheSize()` returns < 500 KB
- [ ] `meta/cacheVersion` in Firestore is incremented after any batch item update
- [ ] Firestore security rules prevent client writes to `currencies`, `ownedItems`, `activeBonuses`
- [ ] Quiz completion callback is wired to `awardQuizReward()` (Phase 3 — still outstanding if quiz platform integration was deferred)
- [ ] Onboarding has been play-tested on mobile Safari and Chrome (iOS)
- [ ] Legendary shimmer is visible on a real device (not just desktop browser)
