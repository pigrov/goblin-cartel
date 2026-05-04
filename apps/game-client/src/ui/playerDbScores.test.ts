import { starterContentBundle } from "@goblin-cartel/content-schemas";
import type { BuiltMineState, GoblinRosterState, MiningSession } from "@goblin-cartel/game-core";
import { describe, expect, it } from "vitest";
import { createMineRunStats } from "./mineRunStats";
import { createPlayerDbScoreRows } from "./playerDbScores";

describe("player db scores", () => {
  it("builds stable score rows from current player progress", () => {
    const session = {
      destroyedBlocks: 5,
      foundVeins: [
        {
          id: "first_mine:player-1:completion:copper_vein_small",
          mineTemplateId: "first_mine",
          seed: "player-1",
          row: 9,
          col: 3,
          veinTypeId: "copper_vein_small"
        }
      ],
      mine: {
        depthMeters: 20,
        height: 10,
        templateId: "second_mine"
      },
      resources: {
        copper: 15.8,
        gold: 120,
        iron: -2
      }
    } as unknown as MiningSession;
    const firstTemplate = starterContentBundle.mineTemplates[0];
    const secondTemplate = starterContentBundle.mineTemplates[1] ?? starterContentBundle.mineTemplates[0];

    if (!firstTemplate || !secondTemplate) {
      throw new Error("Expected starter mine templates");
    }

    const content = {
      ...starterContentBundle,
      mineTemplates: [
        {
          ...firstTemplate,
          depthMeters: 10,
          height: 10,
          id: "first_mine"
        },
        {
          ...secondTemplate,
          depthMeters: 20,
          height: 10,
          id: "second_mine"
        }
      ]
    };
    const builtMines = [
      {
        id: "mine-1",
        status: "active"
      },
      {
        id: "mine-2",
        status: "building"
      }
    ] as BuiltMineState[];
    const roster = {
      hiredGoblinIds: ["miner-1", "collector-1", "foreman-1"]
    } as GoblinRosterState;

    expect(
      createPlayerDbScoreRows({
        builtMines,
        content,
        mineRunStats: createMineRunStats("second_mine", 7),
        platformRow: 4,
        roster,
        session
      })
    ).toEqual([
      { key: "mine.current_depth_meters", value: 10 },
      { key: "mine.max_depth_meters", value: 10 },
      { key: "mine.current_destroyed_blocks", value: 7 },
      { key: "mine.completed_count", value: 1 },
      { key: "built_mines.total_count", value: 2 },
      { key: "built_mines.active_count", value: 1 },
      { key: "goblins.hired_count", value: 3 },
      { key: "resources.wallet_total", value: 135 }
    ]);
  });
});
