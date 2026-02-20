import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
  EquipCardRequest,
  UnequipCardRequest,
  PurchaseCardRequest,
  UnlockPlaceRequest,
  UnlockSlotRequest,
  QuizRewardRequest,
  QuizRewardResult,
} from './types';

const functions = getFunctions(undefined, 'asia-east1');

export async function callChemCityInitUser(): Promise<void> {
  const fn = httpsCallable(functions, 'chemcityInitUser');
  await fn({});
}

export async function callChemCityEquipCard(slotId: string, itemId: string): Promise<void> {
  const fn = httpsCallable<EquipCardRequest, { ok?: boolean }>(functions, 'chemcityEquipCard');
  await fn({ slotId, itemId });
}

export async function callChemCityUnequipCard(slotId: string): Promise<void> {
  const fn = httpsCallable<UnequipCardRequest, { ok?: boolean }>(functions, 'chemcityUnequipCard');
  await fn({ slotId });
}

export async function callChemCityCollectPassiveIncome(): Promise<{ coinsAwarded: number } & Record<string, unknown>> {
  const fn = httpsCallable<{}, { coinsAwarded: number } & Record<string, unknown>>(
    functions,
    'chemcityCollectPassiveIncome',
  );
  const result = await fn({});
  return result.data;
}

export async function callChemCityGetDailyLoginBonus(): Promise<Record<string, unknown>> {
  const fn = httpsCallable(functions, 'chemcityGetDailyLoginBonus');
  const result = await fn({});
  return result.data as Record<string, unknown>;
}

export async function callChemCityPurchaseCard(itemId: string, currency: 'coins' | 'diamonds'): Promise<void> {
  const fn = httpsCallable<PurchaseCardRequest, { ok?: boolean }>(functions, 'chemcityPurchaseCard');
  await fn({ itemId, currency });
}

export async function callChemCityUnlockPlace(placeId: string): Promise<void> {
  const fn = httpsCallable<UnlockPlaceRequest, { ok?: boolean }>(functions, 'chemcityUnlockPlace');
  await fn({ placeId });
}

export async function callChemCityUnlockSlot(placeId: string, slotId: string): Promise<void> {
  const fn = httpsCallable<UnlockSlotRequest, { ok?: boolean }>(functions, 'chemcityUnlockSlot');
  await fn({ placeId, slotId });
}

export async function callChemCityQuizReward(req: QuizRewardRequest): Promise<QuizRewardResult> {
  const fn = httpsCallable<QuizRewardRequest, QuizRewardResult>(functions, 'chemcityQuizReward');
  const result = await fn(req);
  return result.data;
}
