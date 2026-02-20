import type { SlimItemDocument, ActiveBonuses } from "./types";
import { getShopPrice } from "./bonuses";

export function getEffectiveCoinPrice(
  item: SlimItemDocument,
  activeBonuses: ActiveBonuses
): number | null {
  if (item.shopData.coinCost == null) return null;
  return getShopPrice(item.shopData.coinCost, "coins", activeBonuses);
}

export function getEffectiveDiamondPrice(
  item: SlimItemDocument,
  _activeBonuses: ActiveBonuses
): number | null {
  return item.shopData.diamondCost ?? null;
}

export function canAffordCoins(
  item: SlimItemDocument,
  activeBonuses: ActiveBonuses,
  userCoins: number
): boolean {
  const price = getEffectiveCoinPrice(item, activeBonuses);
  if (price == null) return false;
  return userCoins >= price;
}

export function canAffordDiamonds(
  item: SlimItemDocument,
  userDiamonds: number
): boolean {
  const price = item.shopData.diamondCost;
  if (price == null) return false;
  return userDiamonds >= price;
}

export function isOwned(itemId: string, ownedItems: string[]): boolean {
  return ownedItems.includes(itemId);
}
