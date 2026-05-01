import { describe, expect, it } from "vitest";
import type { MineTemplateConfig } from "@goblin-cartel/content-schemas";
import type { BuiltMineState, MiningSession } from "@goblin-cartel/game-core";
import {
  canMoveToNextMine,
  findMineTemplateIndex,
  findNextMineTemplate,
  getMineProgressionStatus,
  hasActiveBuiltMineFromSession,
  hasBuiltMineFromSession,
  markMineCompletionNoticeSeen,
  shouldShowMineCompletionNotice
} from "./mineProgressionClientState";

const firstMine = {
  cellMap: [
    { row: 0, col: 0, blockTypeId: "stone" }
  ],
  depthMeters: 60,
  difficultyEnd: 1,
  difficultyStart: 1,
  displayNameKey: "mine.first.name",
  height: 1,
  id: "first_mine",
  sortOrder: 10,
  width: 1
} satisfies MineTemplateConfig;

const secondMine = {
  ...firstMine,
  displayNameKey: "mine.second.name",
  id: "second_mine"
} satisfies MineTemplateConfig;

const session = {
  foundVeins: [],
  mine: {
    depthMeters: 60,
    height: 12,
    seed: "player-1",
    templateId: "first_mine",
    width: 8
  }
} as unknown as MiningSession;

const builtMine = {
  sourceVeinId: "first_mine:player-1:9:3:copper_vein_small",
  status: "active"
} as BuiltMineState;

describe("mine progression client state", () => {
  it("finds the active and next mine template", () => {
    expect(findMineTemplateIndex([firstMine, secondMine], "first_mine")).toBe(0);
    expect(findNextMineTemplate([firstMine, secondMine], "first_mine")).toBe(secondMine);
    expect(findNextMineTemplate([firstMine, secondMine], "second_mine")).toBeUndefined();
  });

  it("requires a built mine from the current session before moving next", () => {
    expect(hasBuiltMineFromSession(session, [builtMine])).toBe(true);
    expect(hasActiveBuiltMineFromSession(session, [builtMine])).toBe(true);
    expect(canMoveToNextMine({ builtMines: [builtMine], mineTemplates: [firstMine, secondMine], session })).toBe(true);
    expect(canMoveToNextMine({ builtMines: [], mineTemplates: [firstMine, secondMine], session })).toBe(false);
    expect(canMoveToNextMine({ builtMines: [builtMine], mineTemplates: [firstMine], session })).toBe(false);
  });

  it("requires an active built mine before moving next", () => {
    const buildingMine = {
      ...builtMine,
      status: "building" as const
    };

    expect(hasBuiltMineFromSession(session, [buildingMine])).toBe(true);
    expect(hasActiveBuiltMineFromSession(session, [buildingMine])).toBe(false);
    expect(canMoveToNextMine({ builtMines: [buildingMine], mineTemplates: [firstMine, secondMine], session })).toBe(false);
  });

  it("describes the current mine progression status", () => {
    expect(getMineProgressionStatus({ builtMines: [], mineTemplates: [firstMine, secondMine], session })).toBe("digging");
    expect(
      getMineProgressionStatus({
        builtMines: [],
        mineTemplates: [firstMine, secondMine],
        session: {
          ...session,
          foundVeins: [
            {
              id: "first_mine:player-1:9:3:copper_vein_small",
              veinTypeId: "copper_vein_small"
            }
          ]
        } as unknown as MiningSession
      })
    ).toBe("vein_found");
    expect(
      getMineProgressionStatus({
        builtMines: [
          {
            ...builtMine,
            status: "building" as const
          }
        ],
        mineTemplates: [firstMine, secondMine],
        session
      })
    ).toBe("mine_building");
    expect(getMineProgressionStatus({ builtMines: [builtMine], mineTemplates: [firstMine, secondMine], session })).toBe("next_available");
    expect(getMineProgressionStatus({ builtMines: [builtMine], mineTemplates: [firstMine], session })).toBe("complete_no_next");
  });

  it("shows mine completion notice once per mine", () => {
    expect(
      shouldShowMineCompletionNotice({
        canStartNextMine: true,
        mineTemplateId: "first_mine",
        seenMineCompletionNoticeIds: []
      })
    ).toBe(true);
    expect(
      shouldShowMineCompletionNotice({
        canStartNextMine: true,
        mineTemplateId: "first_mine",
        seenMineCompletionNoticeIds: ["first_mine"]
      })
    ).toBe(false);
    expect(markMineCompletionNoticeSeen([], "first_mine")).toEqual(["first_mine"]);
    expect(markMineCompletionNoticeSeen(["first_mine"], "first_mine")).toEqual(["first_mine"]);
  });
});
