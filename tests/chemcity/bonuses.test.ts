import {
  calcGardenCoinsPerHour,
  calcLabMultiplier,
  calcKitchenMaxDiamonds,
  calcSchoolMultiplier,
  calcBeachDoubleChance,
  calcToiletLoginDiamonds,
  calcGasStationExtraSlots,
  calcBoutiqueDiscount,
  computeActiveBonuses,
  computeQuizDiamonds,
  rollKitchenBonus,
  rollBeachDouble,
  getShopPrice,
} from "../../src/lib/chemcity/bonuses";

import type { SlimItemDocument, ActiveBonuses } from "../../src/lib/chemcity/types";

function makeItem(
  id: string,
  placeId: SlimItemDocument["placeId"],
  skillContribution: number,
  rarityValue: 1 | 2 | 3 | 4 = 1
): SlimItemDocument {
  return {
    id,
    name: id,
    chemicalFormula: "X",
    emoji: "🧪",
    rarity: "common",
    rarityValue,
    placeId,
    validSlots: [`${placeId}_slot_1`],
    shopData: { coinCost: 100 },
    skillContribution,
    collections: [],
    deprecated: false,
  };
}

describe("Garden coins per hour", () => {
  it("0 cards = 0 coins/hr", () => expect(calcGardenCoinsPerHour(0)).toBe(0));
  it("bonus 32 → 320 coins/hr", () => expect(calcGardenCoinsPerHour(32)).toBe(320));
  it("linear with bonus", () => expect(calcGardenCoinsPerHour(10)).toBe(100));
});

describe("Lab multiplier", () => {
  it("0 cards = 1.0×", () => expect(calcLabMultiplier(0)).toBe(1));
  it("bonus 12 → 2.2×", () => expect(calcLabMultiplier(12)).toBeCloseTo(2.2));
  it("bonus 10 → 2.0×", () => expect(calcLabMultiplier(10)).toBe(2.0));
});

describe("Kitchen max diamonds", () => {
  it("0 bonus = 0", () => expect(calcKitchenMaxDiamonds(0)).toBe(0));
  it("bonus 16 → 48", () => expect(calcKitchenMaxDiamonds(16)).toBe(48));
});

describe("School multiplier", () => {
  it("0 bonus = 1.0×", () => expect(calcSchoolMultiplier(0)).toBe(1));
  it("bonus 20 → 3.0×", () => expect(calcSchoolMultiplier(20)).toBe(3.0));
});

describe("Beach double chance (capped at 100)", () => {
  it("0 bonus = 0%", () => expect(calcBeachDoubleChance(0)).toBe(0));
  it("bonus 10 = 50%", () => expect(calcBeachDoubleChance(10)).toBe(50));
  it("bonus 20 = 100% (cap)", () => expect(calcBeachDoubleChance(20)).toBe(100));
  it("bonus 30 = 100% (cap enforced)", () => expect(calcBeachDoubleChance(30)).toBe(100));
  it("never exceeds 100", () => {
    for (let b = 0; b <= 50; b++) {
      expect(calcBeachDoubleChance(b)).toBeLessThanOrEqual(100);
    }
  });
});

describe("Toilet daily login", () => {
  it("0 bonus = 5 diamonds (base)", () => expect(calcToiletLoginDiamonds(0)).toBe(5));
  it("bonus 24 → 53", () => expect(calcToiletLoginDiamonds(24)).toBe(53));
  it("bonus 1 → 7", () => expect(calcToiletLoginDiamonds(1)).toBe(7));
});

describe("Gas Station extra slots", () => {
  it("0 bonus = 0 extra slots", () => expect(calcGasStationExtraSlots(0)).toBe(0));
  it("bonus 16 = 16 slots", () => expect(calcGasStationExtraSlots(16)).toBe(16));
});

describe("Boutique discount (no cap)", () => {
  it("0 bonus = 0%", () => expect(calcBoutiqueDiscount(0)).toBe(0));
  it("bonus 1 = 10%", () => expect(calcBoutiqueDiscount(1)).toBe(10));
  it("bonus 5 = 50%", () => expect(calcBoutiqueDiscount(5)).toBe(50));
  it("bonus 10 = 100%", () => expect(calcBoutiqueDiscount(10)).toBe(100));
  it("can exceed 50%", () => expect(calcBoutiqueDiscount(6)).toBe(60));
});

describe("computeActiveBonuses", () => {
  it("empty equipped → defaults", () => {
    const bonuses = computeActiveBonuses({}, []);
    expect(bonuses.passiveBaseCoinsPerHour).toBe(0);
    expect(bonuses.passiveMultiplier).toBe(1);
    expect(bonuses.quizFlatDiamondBonus).toBe(0);
    expect(bonuses.quizDiamondMultiplier).toBe(1);
    expect(bonuses.quizDoubleChancePercent).toBe(0);
    expect(bonuses.dailyLoginDiamonds).toBe(5);
    expect(bonuses.extraSlotsTotal).toBe(0);
    expect(bonuses.shopDiscountPercent).toBe(0);
  });

  it("garden card contribution adds coins/hr", () => {
    const items: SlimItemDocument[] = [makeItem("item_plant", "garden", 10)];
    const bonuses = computeActiveBonuses({ garden_shed_1: "item_plant" }, items);
    expect(bonuses.passiveBaseCoinsPerHour).toBe(100);
    expect(bonuses.passiveMultiplier).toBe(1);
  });

  it("lab card multiplies garden income", () => {
    const items: SlimItemDocument[] = [
      makeItem("item_plant", "garden", 10),
      makeItem("item_flask", "lab", 10),
    ];
    const bonuses = computeActiveBonuses(
      { garden_shed_1: "item_plant", lab_bench: "item_flask" },
      items
    );
    expect(bonuses.passiveBaseCoinsPerHour).toBe(200);
    expect(bonuses.passiveMultiplier).toBe(2.0);
  });

  it("boutique discount uses rarityValue sum (rarity 1 → 10%, rarity 2 → 20%, etc.)", () => {
    const items: SlimItemDocument[] = [
      makeItem("b1", "lifestyle_boutique", 0.2, 1),
      makeItem("b2", "lifestyle_boutique", 0.2, 2),
      makeItem("b3", "lifestyle_boutique", 0.2, 4),
    ];
    const equipped: Record<string, string> = {
      lifestyle_boutique_poseur_table_1: "b1",
      lifestyle_boutique_service_desk: "b2",
      lifestyle_boutique_jewellery_display: "b3",
    };
    const bonuses = computeActiveBonuses(equipped, items);
    // rarityValue sum = 1 + 2 + 4 = 7 → 70%
    expect(bonuses.shopDiscountPercent).toBe(70);
  });

  it("deprecated cards do not contribute", () => {
    const item = makeItem("item_old", "garden", 10);
    item.deprecated = true;
    const bonuses = computeActiveBonuses({ garden_shed_1: "item_old" }, [item]);
    expect(bonuses.passiveBaseCoinsPerHour).toBe(0);
  });
});

describe("rollKitchenBonus", () => {
  it("0 kitchen bonus → 0", () => {
    expect(rollKitchenBonus(0)).toBe(0);
  });

  it("kitchen bonus 10 → value between 10 and 30", () => {
    for (let i = 0; i < 100; i++) {
      const result = rollKitchenBonus(10);
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(30);
    }
  });
});

describe("rollBeachDouble", () => {
  it("0% chance → never doubles", () => {
    for (let i = 0; i < 50; i++) {
      const doubled = rollBeachDouble(0);
      expect(doubled).toBe(false);
    }
  });
});

describe("computeQuizDiamonds", () => {
  it("no bonuses: base 5 diamonds", () => {
    const ab: ActiveBonuses = {
      passiveBaseCoinsPerHour: 0,
      passiveMultiplier: 1,
      quizFlatDiamondBonus: 0,
      quizDiamondMultiplier: 1,
      quizDoubleChancePercent: 0,
      dailyLoginDiamonds: 5,
      extraSlotsTotal: 0,
      shopDiscountPercent: 0,
    };
    const r = computeQuizDiamonds(5, ab);
    expect(r).toBe(5);
  });

  it("school 2× multiplier doubles diamonds", () => {
    const ab: ActiveBonuses = {
      passiveBaseCoinsPerHour: 0,
      passiveMultiplier: 1,
      quizFlatDiamondBonus: 0,
      quizDiamondMultiplier: 2,
      quizDoubleChancePercent: 0,
      dailyLoginDiamonds: 5,
      extraSlotsTotal: 0,
      shopDiscountPercent: 0,
    };
    const r = computeQuizDiamonds(5, ab);
    expect(r).toBe(10);
  });
});

describe("getShopPrice", () => {
  it("diamonds also discounted", () => {
    const ab: ActiveBonuses = {
      passiveBaseCoinsPerHour: 0,
      passiveMultiplier: 1,
      quizFlatDiamondBonus: 0,
      quizDiamondMultiplier: 1,
      quizDoubleChancePercent: 0,
      dailyLoginDiamonds: 5,
      extraSlotsTotal: 0,
      shopDiscountPercent: 50,
    };
    expect(getShopPrice(200, "diamonds", ab)).toBe(100);
  });

  it("50% discount halves coin price", () => {
    const ab: ActiveBonuses = {
      passiveBaseCoinsPerHour: 0,
      passiveMultiplier: 1,
      quizFlatDiamondBonus: 0,
      quizDiamondMultiplier: 1,
      quizDoubleChancePercent: 0,
      dailyLoginDiamonds: 5,
      extraSlotsTotal: 0,
      shopDiscountPercent: 50,
    };
    expect(getShopPrice(200, "coins", ab)).toBe(100);
  });
});
