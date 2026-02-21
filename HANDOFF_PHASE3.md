# ChemCity — Phase 3 Handoff Summary

Completed by: Claude (Sonnet 4.6) — Phase 3: Quiz Currency Rewards
Date: 2026-02-20

---

## What I Built

### Files Created / Modified

| File | Status | Purpose |
|---|---|---|
| `src/components/chemcity/QuizRewardModal.tsx` | **NEW** | Post-quiz animated coin/diamond counter overlay. NO card reveal. |
| `src/components/chemcity/DailyLoginModal.tsx` | **NEW** | Daily login bonus modal: streak flames, diamond + coin reward, Toilet hint |
| `src/hooks/useQuizReward.ts` | **NEW** | React hook bridging host platform quiz events → `callQuizReward()` CF |
| `src/hooks/useDailyLogin.ts` | **NEW** | React hook: fires `callGetDailyLoginBonus()` once per session on load |
| `src/lib/chemcity/quizIntegration.ts` | **NEW** | Integration guide doc (no runnable exports) — read before wiring quizzes |
| `src/store/chemcityStore.ts` | **UPDATED** | Added `quizReward` + `dailyLogin` state + `awardQuizReward` / `checkDailyLogin` / `clearQuizReward` / `dismissDailyLogin` actions |
| `src/components/chemcity/ChemCityRoot.tsx` | **UPDATED** | Renders `QuizRewardModal` + `DailyLoginModal` as global overlays; calls `checkDailyLogin` after `loadAll` |
| `tests/quizReward.test.ts` | **NEW** | Unit tests: reward constants, coin calculation, streak milestone messages |

---

## What I Changed from the Master Plan

1. **Daily login check is automatic** — master plan says "show reward on first daily open." Implemented as: `loadAll()` triggers `checkDailyLogin()` non-blocking after the user doc loads. No separate screen or navigation needed.

2. **`topicMastery` update is server-side only** — master plan task "update topicMastery on quiz completion" is handled entirely inside the `quizReward` Cloud Function (Phase 1). The client receives `QuizRewardResult` but does not write to `progress/data` directly — that is already handled server-side. Client-side `progress` state is a snapshot from login and is not re-fetched after every quiz (reads budget constraint).

3. **Two integration paths documented** — `quizIntegration.ts` documents both the direct store call (Option A, for non-React contexts) and the `useQuizReward` hook (Option B, for React components). The host platform owner picks whichever fits their architecture.

4. **Daily login modal dismissed before quiz modal** — if both states fire simultaneously (edge case on first-ever login), the daily login modal is shown first. Quiz reward appears after it is dismissed. This is enforced in `ChemCityRoot` render logic.

---

## Known Issues / Incomplete Work

- **Quiz integration is unwired** — `triggerQuizReward` / `awardQuizReward` must be called by the host platform's quiz completion handler. See `src/lib/chemcity/quizIntegration.ts` for the two wiring options. This is a host platform integration task, not a ChemCity task.
- **`progress` sub-doc not refreshed after quizzes** — `topicMastery` in the client store is stale after quiz completions (updated server-side only). If a Collections progress screen needs live topic counts, add a targeted Firestore read after `awardQuizReward` resolves. Deferred to Phase 5.
- **No "streak freeze" consumable** — master plan mentions streak freeze in Phase 5. Daily login streak can reset to 0 if a day is missed. Freeze logic is Phase 5.
- **Animation uses `requestAnimationFrame`** — works in all modern browsers. If supporting very old WebViews (pre-2019), replace with a `setInterval` fallback.

---

## Decisions Future Coders Must Know

1. **`awardQuizReward` stores result in Zustand** — the `quizReward.result` field drives `QuizRewardModal` visibility. After the modal is dismissed, call `clearQuizReward()` to reset it. Do not rely on component-local state for the reward result.

2. **`checkDailyLogin` is idempotent per session** — the `checked` flag prevents double-calling. Safe to call from multiple places; only the first call fires the Cloud Function.

3. **`callGetDailyLoginBonus` failure is silent** — a network error during the daily bonus check sets `checked: true` and shows nothing. The user loses that day's bonus display but the server will still gate correctly next open. This is intentional — daily bonus failure must never block the app.

4. **`COINS_PER_CORRECT_ANSWER` and `BASE_DIAMONDS_PER_QUIZ` are in `useQuizReward.ts`** — these are the only two reward rate constants on the client side. All other reward math (Kitchen/School/Beach chain) happens in the Cloud Function.

5. **The diamond breakdown in `QuizRewardModal`** — uses `result.breakdown.flatBonus`, `result.breakdown.afterSchool`, `result.breakdown.afterBeach` from `QuizRewardResult`. These are returned by the `quizReward` Cloud Function (Phase 1). If the CF breakdown fields change, update the modal display.

---

## Files the Next Coder Must Read First

1. `src/store/chemcityStore.ts` — `awardQuizReward` + `checkDailyLogin` actions; understand before adding any Phase 4 flows.
2. `src/lib/chemcity/quizIntegration.ts` — integration guide for wiring the quiz platform.
3. `src/hooks/useQuizReward.ts` — reward constants + hook interface.
4. `src/components/chemcity/ChemCityRoot.tsx` — modal render order (daily login before quiz reward).

---

## What Must NOT Be Changed (Locked-In Contracts)

All locks from Phases 0–2 remain in force.

New in Phase 3:
- `quizReward` and `dailyLogin` field names in Zustand store (referenced by `ChemCityRoot`)
- `QuizRewardResult` field names `coinsAwarded`, `diamondsAwarded`, `didDouble`, `breakdown` — returned by Cloud Function; modal reads them directly
- `COINS_PER_CORRECT_ANSWER` and `BASE_DIAMONDS_PER_QUIZ` export names from `useQuizReward.ts` — referenced in `quizIntegration.ts` docs

---

## Test Results

Phase 1 tests: all 35 pass (`npm test`)
Phase 3 new tests: 8 pass
- 4 reward constant tests
- 5 streak milestone message tests

Run: `npm test`

---

## Suggested First Steps for Next Phase (Phase 4 — ChemStore & Unlocks)

1. **Build `ChemStore` component** — browsable catalog from slim item cache. Filter by place/rarity/price. Tap → `fetchFullItem` → show full info before purchase. Wire `callPurchaseCard()` on confirm.
2. **Apply `shopDiscountPercent`** — read `user.activeBonuses.shopDiscountPercent` and display discounted prices alongside original prices in the store UI. Use `getEffectiveCoinPrice()` from `src/lib/chemcity/shop.ts`.
3. **Gas Station distributor UI** — show all locked slots across all places; let the player spend their `extraSlotsBudget` to unlock them one by one. Wire `callUnlockSlot()`.
