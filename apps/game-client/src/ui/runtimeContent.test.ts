import { starterContentBundle } from "@goblin-cartel/content-schemas";
import { describe, expect, it } from "vitest";
import { contentVersionWithRuntimeSuffix, createRuntimeContentBundle } from "./runtimeContent";

describe("runtime content", () => {
  it("keeps current starter mine unchanged when it already has test depth", () => {
    expect(createRuntimeContentBundle(starterContentBundle)).toBe(starterContentBundle);
    expect(contentVersionWithRuntimeSuffix("fallback", starterContentBundle)).toBe("fallback");
  });

  it("expands older published mine content to the 200m test depth", () => {
    const content = structuredClone(starterContentBundle);
    const mine = content.mineTemplates[0];

    if (!mine) {
      throw new Error("Missing starter mine");
    }

    mine.height = 12;
    mine.depthMeters = 60;
    mine.strata = [
      {
        id: "top_soil",
        fromRow: 0,
        toRow: 3,
        blockWeights: {
          dirt: 70,
          stone: 25,
          chest_wooden: 5
        }
      },
      {
        id: "stone_layer",
        fromRow: 4,
        toRow: 7,
        blockWeights: {
          dirt: 20,
          stone: 60,
          copper_ore: 15,
          chest_wooden: 5
        }
      },
      {
        id: "copper_layer",
        fromRow: 8,
        toRow: 11,
        blockWeights: {
          stone: 55,
          copper_ore: 40,
          chest_wooden: 5
        }
      }
    ];

    const runtimeContent = createRuntimeContentBundle(content);
    const runtimeMine = runtimeContent.mineTemplates[0];

    expect(runtimeMine?.height).toBe(40);
    expect(runtimeMine?.depthMeters).toBe(200);
    expect(runtimeMine?.id).toBe("old_well_01_test_40");
    expect(runtimeMine?.strata.at(-1)?.toRow).toBe(39);
    expect(contentVersionWithRuntimeSuffix("0.0.4", runtimeContent)).toBe("0.0.4:test-40");
  });
});
