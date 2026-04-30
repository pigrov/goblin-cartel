import { starterContentBundle } from "@goblin-cartel/content-schemas";
import { describe, expect, it } from "vitest";
import { contentVersionWithRuntimeSuffix, createRuntimeContentBundle } from "./runtimeContent";

describe("runtime content", () => {
  it("keeps current starter mine unchanged when it already has test depth", () => {
    expect(createRuntimeContentBundle(starterContentBundle)).toBe(starterContentBundle);
    expect(contentVersionWithRuntimeSuffix("fallback", starterContentBundle)).toBe("fallback:mine-12");
  });

  it("normalizes older published mine content to the 60m runtime depth", () => {
    const content = structuredClone(starterContentBundle);
    const mine = content.mineTemplates[0];

    if (!mine) {
      throw new Error("Missing starter mine");
    }

    mine.height = 40;
    mine.depthMeters = 200;
    mine.strata = [
      {
        id: "top_soil",
        fromRow: 0,
        toRow: 7,
        blockWeights: {
          dirt: 70,
          stone: 25,
          chest_wooden: 5
        }
      },
      {
        id: "stone_layer",
        fromRow: 8,
        toRow: 23,
        blockWeights: {
          dirt: 20,
          stone: 60,
          copper_ore: 15,
          chest_wooden: 5
        }
      },
      {
        id: "copper_layer",
        fromRow: 24,
        toRow: 39,
        blockWeights: {
          stone: 55,
          copper_ore: 40,
          chest_wooden: 5
        }
      }
    ];

    const runtimeContent = createRuntimeContentBundle(content);
    const runtimeMine = runtimeContent.mineTemplates[0];

    expect(runtimeMine?.height).toBe(12);
    expect(runtimeMine?.depthMeters).toBe(60);
    expect(runtimeMine?.id).toBe("old_well_01_test_12");
    expect(runtimeMine?.strata.map((stratum) => [stratum.fromRow, stratum.toRow])).toEqual([
      [0, 3],
      [4, 7],
      [8, 11]
    ]);
    expect(runtimeMine?.strata.at(-1)?.toRow).toBe(11);
    expect(contentVersionWithRuntimeSuffix("0.0.4", runtimeContent)).toBe("0.0.4:test-12");
  });
});
