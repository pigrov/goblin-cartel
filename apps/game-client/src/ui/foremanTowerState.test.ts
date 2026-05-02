import { describe, expect, it } from "vitest";
import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  assignForemanToTowerSlot,
  createEmptyForemanAssignments,
  getAssignedForemen,
  normalizeForemanAssignments
} from "./foremanTowerState";

function createGoblin(id: string, goblinClass: GoblinConfig["class"] = "foreman"): GoblinConfig {
  return {
    ability: {
      descriptionKey: `ability.${id}.description`,
      effects: [],
      id: `ability_${id}`,
      nameKey: `ability.${id}.name`
    },
    assetId: `asset_${id}`,
    baseStats: {
      loyalty: 1,
      luck: 1,
      speed: 1,
      strength: 1
    },
    class: goblinClass,
    clan: "neutral",
    descriptionKey: `goblin.${id}.description`,
    hireCost: [],
    id,
    nameKey: `goblin.${id}.name`,
    rarity: "common",
    sortOrder: 1,
    unlockRequirements: []
  } as unknown as GoblinConfig;
}

describe("foreman tower state", () => {
  it("creates three empty tower slots", () => {
    expect(createEmptyForemanAssignments()).toEqual([null, null, null]);
  });

  it("keeps only unique hired foremen in tower slots", () => {
    const foreman = createGoblin("foreman");
    const otherForeman = createGoblin("other_foreman");
    const miner = createGoblin("miner", "miner");

    expect(
      normalizeForemanAssignments(
        ["foreman", "foreman", "miner"],
        [foreman, otherForeman, miner],
        { hiredGoblinIds: ["foreman", "miner"] }
      )
    ).toEqual(["foreman", null, null]);
  });

  it("moves a foreman between slots and returns assigned foremen", () => {
    const foreman = createGoblin("foreman");
    const assignments = assignForemanToTowerSlot(["foreman", null, null], 2, "foreman");

    expect(assignments).toEqual([null, null, "foreman"]);
    expect(getAssignedForemen([foreman], { hiredGoblinIds: ["foreman"] }, assignments)).toEqual([foreman]);
  });
});
