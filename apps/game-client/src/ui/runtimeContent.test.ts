import { starterContentBundle } from "@goblin-cartel/content-schemas";
import { describe, expect, it } from "vitest";
import { contentVersionWithRuntimeSuffix, createRuntimeContentBundle } from "./runtimeContent";

describe("runtime content", () => {
  it("uses the published content bundle without runtime fallbacks", () => {
    const content = structuredClone(starterContentBundle);
    content.mineTemplates = [...content.mineTemplates].reverse();
    content.bossCards = [];

    expect(createRuntimeContentBundle(content)).toBe(content);
    expect(content.mineTemplates[0]?.id).toBe("red_iron_drop_05");
    expect(content.bossCards).toEqual([]);
  });

  it("keeps the published content version unchanged", () => {
    expect(contentVersionWithRuntimeSuffix("0.0.15")).toBe("0.0.15");
  });
});
