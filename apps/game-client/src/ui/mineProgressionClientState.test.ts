import { describe, expect, it } from "vitest";
import type { MineTemplateConfig } from "@goblin-cartel/content-schemas";
import type { BuiltMineState, MiningSession } from "@goblin-cartel/game-core";
import {
  canMoveToNextMine,
  findMineTemplateIndex,
  findNextMineTemplate,
  hasBuiltMineFromSession
} from "./mineProgressionClientState";

const firstMine = {
  depthMeters: 60,
  difficulty: 1,
  displayNameKey: "mine.first.name",
  guaranteedObjects: [],
  height: 12,
  id: "first_mine",
  seedMode: "playerBased",
  strata: [],
  width: 8
} satisfies MineTemplateConfig;

const secondMine = {
  ...firstMine,
  displayNameKey: "mine.second.name",
  id: "second_mine"
} satisfies MineTemplateConfig;

const session = {
  mine: {
    depthMeters: 60,
    height: 12,
    seed: "player-1",
    templateId: "first_mine",
    width: 8
  }
} as MiningSession;

const builtMine = {
  sourceVeinId: "first_mine:player-1:9:3:copper_vein_small"
} as BuiltMineState;

describe("mine progression client state", () => {
  it("finds the active and next mine template", () => {
    expect(findMineTemplateIndex([firstMine, secondMine], "first_mine")).toBe(0);
    expect(findNextMineTemplate([firstMine, secondMine], "first_mine")).toBe(secondMine);
    expect(findNextMineTemplate([firstMine, secondMine], "second_mine")).toBeUndefined();
  });

  it("requires a built mine from the current session before moving next", () => {
    expect(hasBuiltMineFromSession(session, [builtMine])).toBe(true);
    expect(canMoveToNextMine({ builtMines: [builtMine], mineTemplates: [firstMine, secondMine], session })).toBe(true);
    expect(canMoveToNextMine({ builtMines: [], mineTemplates: [firstMine, secondMine], session })).toBe(false);
    expect(canMoveToNextMine({ builtMines: [builtMine], mineTemplates: [firstMine], session })).toBe(false);
  });
});
