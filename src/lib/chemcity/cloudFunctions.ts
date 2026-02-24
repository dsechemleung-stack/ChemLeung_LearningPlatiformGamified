import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
  EquipCardRequest,
  UnequipCardRequest,
  PurchaseCardRequest,
  GachaDrawRequest,
  GachaDrawResponse,
  PurchaseCosmeticRequest,
  PurchaseCosmeticResponse,
  EquipCosmeticsRequest,
  EquipCosmeticsResponse,
  BuyTicketsRequest,
  BuyTicketsResponse,
  UnlockPlaceRequest,
  UnlockSlotRequest,
  QuizRewardRequest,
  QuizRewardResult,
} from './types';

function getFns() {
  return getFunctions(undefined, 'asia-east1');
}

export async function callChemCityInitUser(): Promise<void> {
  const fn = httpsCallable(getFns(), 'chemcityInitUser');
  await fn({});
}

export interface MigrateSlotIdsResult {
  ok: boolean;
  alreadyMigrated?: boolean;
  version?: number;
  equippedKeysMigrated?: number;
  unlockedSlotsMigrated?: number;
}

export async function callChemCityMigrateSlotIds(): Promise<MigrateSlotIdsResult> {
  const fn = httpsCallable(getFns(), 'chemcityMigrateSlotIds');
  const result = await fn({});
  return result.data as MigrateSlotIdsResult;
}

export async function callChemCityEquipCard(slotId: string, itemId: string): Promise<void> {
  const fn = httpsCallable<EquipCardRequest, { ok?: boolean }>(getFns(), 'chemcityEquipCard');
  await fn({ slotId, itemId });
}

export async function callChemCityUnequipCard(slotId: string): Promise<void> {
  const fn = httpsCallable<UnequipCardRequest, { ok?: boolean }>(getFns(), 'chemcityUnequipCard');
  await fn({ slotId });
}

export async function callChemCityCollectPassiveIncome(): Promise<{ coinsAwarded: number } & Record<string, unknown>> {
  const fn = httpsCallable<{}, { coinsAwarded: number } & Record<string, unknown>>(
    getFns(),
    'chemcityCollectPassiveIncome',
  );
  const result = await fn({});
  return result.data;
}

export async function callChemCityDevGrantCoins(amount: number): Promise<void> {
  const fn = httpsCallable<{ amount: number }, { ok?: boolean }>(getFns(), 'chemcityDevGrantCoins');
  await fn({ amount });
}

export async function callChemCityGetDailyLoginBonus(): Promise<Record<string, unknown>> {
  const fn = httpsCallable(getFns(), 'chemcityGetDailyLoginBonus');
  const result = await fn({});
  return result.data as Record<string, unknown>;
}

export async function callChemCityPurchaseCard(itemId: string, currency: 'coins' | 'diamonds'): Promise<void> {
  const fn = httpsCallable<PurchaseCardRequest, { ok?: boolean }>(getFns(), 'chemcityPurchaseCard');
  await fn({ itemId, currency });
}

export async function callChemCityGachaDraw(req: GachaDrawRequest): Promise<GachaDrawResponse> {
  const fn = httpsCallable<GachaDrawRequest, GachaDrawResponse>(getFns(), 'chemcityGachaDraw');
  const result = await fn(req);
  return result.data;
}

export async function callChemCityPurchaseCosmetic(
  req: PurchaseCosmeticRequest,
): Promise<PurchaseCosmeticResponse> {
  const fn = httpsCallable<PurchaseCosmeticRequest, PurchaseCosmeticResponse>(
    getFns(),
    'chemcityPurchaseCosmetic',
  );
  const result = await fn(req);
  return result.data;
}

export async function callChemCityEquipCosmetics(
  req: EquipCosmeticsRequest,
): Promise<EquipCosmeticsResponse> {
  const fn = httpsCallable<EquipCosmeticsRequest, EquipCosmeticsResponse>(
    getFns(),
    'chemcityEquipCosmetics',
  );
  const result = await fn(req);
  return result.data;
}

export async function callChemCityBuyTickets(req: BuyTicketsRequest): Promise<BuyTicketsResponse> {
  const fn = httpsCallable<BuyTicketsRequest, BuyTicketsResponse>(getFns(), 'chemcityBuyTickets');
  const result = await fn(req);
  return result.data;
}

export async function callChemCityUnlockStoreSlot(): Promise<Record<string, unknown>> {
  const fn = httpsCallable(getFns(), 'chemcityUnlockStoreSlot');
  const result = await fn({});
  return result.data as Record<string, unknown>;
}

export async function callChemCityUnlockPlace(placeId: string): Promise<void> {
  const fn = httpsCallable<UnlockPlaceRequest, { ok?: boolean }>(getFns(), 'chemcityUnlockPlace');
  await fn({ placeId });
}

export async function callChemCityUnlockSlot(
  placeId: string,
  slotId: string,
  useExtraSlotBudget?: boolean,
): Promise<void> {
  const fn = httpsCallable<UnlockSlotRequest, { ok?: boolean }>(getFns(), 'chemcityUnlockSlot');
  await fn({ placeId, slotId, useExtraSlotBudget });
}

export async function callChemCityQuizReward(req: QuizRewardRequest): Promise<QuizRewardResult> {
  const fn = httpsCallable<QuizRewardRequest, QuizRewardResult>(getFns(), 'chemcityQuizReward');
  const result = await fn(req);
  return result.data;
}

export interface ClaimCollectionRewardResult {
  ok: boolean;
  coinsAwarded: number;
  diamondsAwarded: number;
}

export async function callChemCityClaimCollectionReward(
  collectionId: string,
): Promise<ClaimCollectionRewardResult> {
  const fn = httpsCallable<{ collectionId: string }, ClaimCollectionRewardResult>(
    getFns(),
    'chemcityClaimCollectionReward',
  );
  const result = await fn({ collectionId });
  return result.data;
}

// ─── Phase 4 aliases (used by the Phase 4 handoff code) ───────────────────────

export const callPurchaseCard = (req: PurchaseCardRequest) =>
  callChemCityPurchaseCard(req.itemId, req.currency).then(() => ({ success: true }));

export const callUnlockPlace = (req: UnlockPlaceRequest) =>
  callChemCityUnlockPlace(req.placeId).then(() => ({ success: true, coinsDeducted: 0 }));

export const callUnlockSlot = (req: UnlockSlotRequest) =>
  httpsCallable<UnlockSlotRequest, { ok?: boolean }>(getFns(), 'chemcityUnlockSlot')(req).then((r) => ({
    success: true,
    ...((r.data as any) ?? {}),
  }));

export const callUnlockStoreSlot = (_req: Record<string, never>) =>
  callChemCityUnlockStoreSlot().then((data: any) => ({
    success: true,
    newSlotCount: data?.newSlotCount ?? data?.storeSlotCount ?? 0,
    coinsDeducted: data?.coinsDeducted ?? data?.cost ?? 0,
  }));
