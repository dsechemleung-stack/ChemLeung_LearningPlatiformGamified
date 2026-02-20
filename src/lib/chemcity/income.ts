import type { ActiveBonuses } from "./types";
import { Timestamp } from "firebase/firestore";

export const MAX_OFFLINE_HOURS = 24;

export function estimateUnclaimedCoins(
  activeBonuses: ActiveBonuses,
  lastCollected: Timestamp | null
): number {
  if (!lastCollected || activeBonuses.passiveBaseCoinsPerHour === 0) return 0;

  const nowMs = Date.now();
  const lastMs = lastCollected.toMillis();
  const elapsedHours = Math.min(
    (nowMs - lastMs) / (1000 * 60 * 60),
    MAX_OFFLINE_HOURS
  );

  return Math.floor(activeBonuses.passiveBaseCoinsPerHour * elapsedHours);
}

export function formatCoinsPerHour(coinsPerHour: number): string {
  if (coinsPerHour === 0) return "0 🪙/hr";
  if (coinsPerHour >= 1000) return `${(coinsPerHour / 1000).toFixed(1)}k 🪙/hr`;
  return `${Math.round(coinsPerHour)} 🪙/hr`;
}
