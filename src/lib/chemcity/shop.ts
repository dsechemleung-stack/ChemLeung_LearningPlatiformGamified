import type { ActiveBonuses } from './types';

export function getEffectiveCoinPrice(
  rawCoinPrice: number,
  bonuses: ActiveBonuses | null | undefined,
): number {
  const discount = Number(bonuses?.shopDiscountPercent ?? 0);
  if (!Number.isFinite(discount) || discount <= 0) return rawCoinPrice;
  const discounted = rawCoinPrice * (1 - discount / 100);
  return Math.max(1, Math.floor(discounted));
}

export function getEffectiveDiamondPrice(
  rawDiamondPrice: number,
  bonuses: ActiveBonuses | null | undefined,
): number {
  const discount = Number(bonuses?.shopDiscountPercent ?? 0);
  if (!Number.isFinite(discount) || discount <= 0) return rawDiamondPrice;
  const discounted = rawDiamondPrice * (1 - discount / 100);
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
  if (rawDiamondPrice == null) return null;
  return getEffectiveDiamondPrice(rawDiamondPrice, bonuses);
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
  return userDiamonds >= getEffectiveDiamondPrice(rawDiamondPrice, bonuses);
}
