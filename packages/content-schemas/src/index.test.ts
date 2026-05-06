import { describe, expect, it } from "vitest";
import { contentBundleSchema, goblinsSchema, starterContentBundle, validateContentBundle } from "./index";

describe("content schemas", () => {
  it("accepts starter content with fixed goblin roles", () => {
    expect(contentBundleSchema.safeParse(starterContentBundle).success).toBe(true);
    expect(validateContentBundle(starterContentBundle)).toEqual({ errors: [], ok: true });
    expect(starterContentBundle.goblins.roles.map((goblin) => [goblin.id, goblin.role, goblin.statKey])).toEqual([
      ["miner", "miner", "power"],
      ["collector", "collector", "speed"],
      ["foreman", "foreman", "control"]
    ]);
    expect(starterContentBundle.goblinHut.levels[0]?.unlockedRoles).toEqual(["miner"]);
  });

  it("accepts the standalone goblins config", () => {
    const result = goblinsSchema.safeParse(starterContentBundle.goblins);

    expect(result.success).toBe(true);
    expect(result.success ? result.data.skin.cardBase : null).toBe("ui_hire_card_base_common_v1");
  });

  it("rejects duplicate goblin roles", () => {
    const broken = structuredClone(starterContentBundle);
    broken.goblins.roles[1] = {
      ...broken.goblins.roles[1]!,
      id: "miner",
      role: "miner",
      statKey: "power",
      statNameKey: "goblin.stat.power"
    };

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("goblins.roles has duplicate role miner");
  });

  it("requires goblin hire and upgrade costs to use gold", () => {
    const broken = structuredClone(starterContentBundle);
    broken.goblins.roles[0]!.hireCost = [{ amount: 10, resourceId: "stone" }];
    broken.goblins.roles[0]!.levels[0]!.stars[0]!.upgradeCost = [{ amount: 10, resourceId: "stone" }];

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("goblins.roles.miner.hireCost.0 must use gold");
    expect(result.errors).toContain("goblins.roles.miner.levels.1.stars.0.upgradeCost.0 must use gold");
  });
});
