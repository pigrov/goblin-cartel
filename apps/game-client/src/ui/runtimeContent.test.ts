import { starterContentBundle } from "@goblin-cartel/content-schemas";
import { describe, expect, it } from "vitest";
import { contentVersionWithRuntimeSuffix, createRuntimeContentBundle } from "./runtimeContent";

describe("runtime content", () => {
  it("keeps current starter content unchanged when it is already sorted", () => {
    expect(createRuntimeContentBundle(starterContentBundle)).toBe(starterContentBundle);
    expect(contentVersionWithRuntimeSuffix("0.0.8")).toBe("0.0.8");
  });

  it("sorts mines by authored sort order", () => {
    const content = structuredClone(starterContentBundle);
    content.mineTemplates = [...content.mineTemplates].reverse();

    const runtimeContent = createRuntimeContentBundle(content);

    expect(runtimeContent.mineTemplates.map((mineTemplate) => mineTemplate.id)).toEqual(["old_well_01", "abandoned_crosscut_02"]);
  });

  it("keeps authored mine dimensions unchanged", () => {
    const content = structuredClone(starterContentBundle);
    const mine = content.mineTemplates[0];

    if (!mine) {
      throw new Error("Missing starter mine");
    }

    mine.height = 40;
    mine.depthMeters = 200;
    mine.cellMap = Array.from({ length: 40 }, (_rowItem, row) =>
      Array.from({ length: mine.width }, (_colItem, col) => ({
        blockTypeId: row >= 8 ? "stone" : "dirt",
        col,
        row
      }))
    ).flat();

    const runtimeContent = createRuntimeContentBundle(content);
    const runtimeMine = runtimeContent.mineTemplates[0];

    expect(runtimeMine?.height).toBe(40);
    expect(runtimeMine?.depthMeters).toBe(200);
    expect(runtimeMine?.id).toBe("old_well_01");
    expect(runtimeMine?.cellMap).toHaveLength(mine.width * 40);
    expect(runtimeMine?.cellMap.at(-1)).toMatchObject({ blockTypeId: "stone", row: 39 });
    expect(contentVersionWithRuntimeSuffix("0.0.4")).toBe("0.0.4");
  });
});
