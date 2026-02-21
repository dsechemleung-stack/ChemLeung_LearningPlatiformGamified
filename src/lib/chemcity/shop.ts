import type { ActiveBonuses } from './types';

export function getEffectiveCoinPrice(
  rawCoinPrice: number,
  bonuses: ActiveBonuses | null | undefined,
): number {
  const discount = bonuses?.shopDiscountPercent ?? 0;
  if (discount <= 0) return rawCoinPrice;
  const discounted = rawCoinPrice * (1 - discount / 100);
  return Math.max(1, Math.floor(discounted));
}

export function getDisplayPrice(
  rawCoinPrice: number | undefined,
  rawDiamondPrice: number | undefined,
  currency: 'coins' | 'diamonds',
  bonuses: ActiveBonuses | null | undefined,
): number | null {
  if (currency === 'coins') {
    if (rawCoinPrice == null) return null;
    return getEffectiveCoinPrice(rawCoinPrice, bonuses);
  }
  return rawDiamondPrice ?? null;
}

export function canAffordItem(
  rawCoinPrice: number | undefined,
  rawDiamondPrice: number | undefined,
  currency: 'coins' | 'diamonds',
  userCoins: number,
  userDiamonds: number,
  bonuses: ActiveBonuses | null | undefined,
): boolean {
  if (currency === 'coins') {
    if (rawCoinPrice == null) return false;
    return userCoins >= getEffectiveCoinPrice(rawCoinPrice, bonuses);
  }
  if (rawDiamondPrice == null) return false;
  return userDiamonds >= rawDiamondPrice;
}
