import { describe, expect, it } from "vitest";
import {
  calculateCrewAutoDamagePerSecond,
  calculateGoblinPrimaryStat,
  createInitialGoblinRoster,
  getHiredGoblinCount,
  hireGoblin,
  mergeGoblins,
  upgradeGoblin,
  upgradeGoblinHut,
  type GoblinHutConfig,
  type GoblinRosterGoblin
} from "./goblin-roster";

const goblins: GoblinRosterGoblin[] = [
  createGoblin("miner", "power", []),
  createGoblin("collector", "speed", [{ amount: 100, resourceId: "gold" }]),
  createGoblin("foreman", "control", [{ amount: 200, resourceId: "gold" }])
];

const hut: GoblinHutConfig = {
  levels: [
    { level: 1, maxHiredGoblins: 2, unlockedRoles: ["miner"], upgradeCost: [] },
    { level: 2, maxHiredGoblins: 4, unlockedRoles: ["miner", "collector"], upgradeCost: [{ amount: 50, resourceId: "gold" }] },
    { level: 3, maxHiredGoblins: 6, unlockedRoles: ["miner", "collector", "foreman"], upgradeCost: [{ amount: 80, resourceId: "gold" }] }
  ]
};

describe("goblin roster", () => {
  it("hires fixed-role goblin instances and enforces hut role locks", () => {
    const roster = createInitialGoblinRoster(goblins);
    const locked = hireGoblin({ goblinHut: hut, goblinId: "collector", goblins, resources: { gold: 500 }, roster });

    expect(locked).toMatchObject({ ok: false, reason: "role_locked" });

    const hired = hireGoblin({ goblinHut: hut, goblinId: "miner", goblins, resources: { gold: 0 }, roster });

    expect(hired.ok).toBe(true);
    expect(hired.ok ? hired.instance : null).toMatchObject({ goblinId: "miner", role: "miner", level: 1, stars: 0 });
    expect(hired.ok ? getHiredGoblinCount(hired.roster) : 0).toBe(1);
  });

  it("merges matching goblin instances into the target star rank for free", () => {
    const firstHire = hireGoblin({
      goblinHut: hut,
      goblinId: "miner",
      goblins,
      resources: { gold: 1000 },
      roster: createInitialGoblinRoster(goblins)
    });

    if (!firstHire.ok) {
      throw new Error("expected first hire to succeed");
    }

    const secondHire = hireGoblin({
      goblinHut: hut,
      goblinId: "miner",
      goblins,
      resources: firstHire.resources,
      roster: firstHire.roster
    });

    if (!secondHire.ok) {
      throw new Error("expected second hire to succeed");
    }

    const merged = mergeGoblins({
      goblins,
      roster: secondHire.roster,
      sourceGoblinId: secondHire.instance.id,
      targetGoblinId: firstHire.instance.id
    });

    expect(merged).toMatchObject({
      consumedInstanceId: secondHire.instance.id,
      instance: { id: firstHire.instance.id, level: 1, stars: 1 },
      ok: true
    });
    expect(merged.ok ? merged.roster.hiredGoblinIds : []).toEqual([firstHire.instance.id]);
  });

  it("rejects non-matching and max-star goblin merges", () => {
    const roster = {
      hiredGoblinIds: ["goblin:miner:1", "goblin:miner:2", "goblin:miner:3"],
      instances: [
        { equipment: [], goblinId: "miner", id: "goblin:miner:1", level: 1, lifetimeStats: {}, role: "miner" as const, stars: 1 as const },
        { equipment: [], goblinId: "miner", id: "goblin:miner:2", level: 1, lifetimeStats: {}, role: "miner" as const, stars: 2 as const },
        { equipment: [], goblinId: "miner", id: "goblin:miner:3", level: 1, lifetimeStats: {}, role: "miner" as const, stars: 5 as const }
      ]
    };

    expect(mergeGoblins({ goblins, roster, sourceGoblinId: "goblin:miner:2", targetGoblinId: "goblin:miner:1" })).toMatchObject({
      ok: false,
      reason: "mismatch"
    });
    expect(mergeGoblins({ goblins, roster, sourceGoblinId: "goblin:miner:3", targetGoblinId: "goblin:miner:3" })).toMatchObject({
      ok: false,
      reason: "same_instance"
    });
    expect(
      mergeGoblins({
        goblins,
        roster: {
          hiredGoblinIds: ["goblin:miner:3", "goblin:miner:4"],
          instances: [
            roster.instances[2]!,
            { equipment: [], goblinId: "miner", id: "goblin:miner:4", level: 1, lifetimeStats: {}, role: "miner" as const, stars: 5 as const }
          ]
        },
        sourceGoblinId: "goblin:miner:4",
        targetGoblinId: "goblin:miner:3"
      })
    ).toMatchObject({
      ok: false,
      reason: "max_stars"
    });
  });

  it("only promotes level after five stars and charges gold then", () => {
    const roster = {
      hiredGoblinIds: ["goblin:miner:1"],
      instances: [
        { equipment: [], goblinId: "miner", id: "goblin:miner:1", level: 1, lifetimeStats: {}, role: "miner" as const, stars: 4 as const }
      ]
    };

    expect(upgradeGoblin({ goblinHut: hut, goblinId: "goblin:miner:1", goblins, resources: { gold: 1000 }, roster })).toMatchObject({
      ok: false,
      reason: "needs_stars"
    });

    const fiveStarRoster = {
      ...roster,
      instances: [{ ...roster.instances[0]!, stars: 5 as const }]
    };
    const promoted = upgradeGoblin({
      goblinHut: hut,
      goblinId: "goblin:miner:1",
      goblins,
      resources: { gold: 1000 },
      roster: fiveStarRoster
    });

    expect(promoted).toMatchObject({
      cost: [{ amount: 100, resourceId: "gold" }],
      instance: { level: 2, stars: 0 },
      ok: true,
      resources: { gold: 900 }
    });
  });

  it("uses miner power as crew damage", () => {
    const roster = {
      hiredGoblinIds: ["goblin:miner:1", "goblin:collector:1"],
      instances: [
        { equipment: [], goblinId: "miner", id: "goblin:miner:1", level: 1, lifetimeStats: {}, role: "miner" as const, stars: 5 as const },
        { equipment: [], goblinId: "collector", id: "goblin:collector:1", level: 1, lifetimeStats: {}, role: "collector" as const, stars: 5 as const }
      ]
    };

    expect(calculateGoblinPrimaryStat(goblins[0]!, 1, 5)).toBe(10);
    expect(calculateCrewAutoDamagePerSecond({ goblins, roster })).toBe(10);
  });

  it("upgrades the hut and unlocks collector roles", () => {
    const upgraded = upgradeGoblinHut({
      goblinHut: hut,
      goblins,
      resources: { gold: 200 },
      roster: createInitialGoblinRoster(goblins)
    });

    expect(upgraded).toMatchObject({ ok: true, roster: { hutLevel: 2 } });

    const hiredCollector = hireGoblin({
      goblinHut: hut,
      goblinId: "collector",
      goblins,
      resources: upgraded.ok ? upgraded.resources : { gold: 200 },
      roster: upgraded.ok ? upgraded.roster : createInitialGoblinRoster(goblins)
    });

    expect(hiredCollector.ok).toBe(true);
  });
});

function createGoblin(role: "miner" | "collector" | "foreman", statKey: "power" | "speed" | "control", hireCost: Array<{ amount: number; resourceId: string }>): GoblinRosterGoblin {
  return {
    assetId: `asset_${role}`,
    descriptionKey: `goblin.${role}.description`,
    hireCost,
    id: role,
    levels: [
      {
        level: 1,
        stars: [0, 1, 2, 3, 4, 5].map((stars) => ({
          stars: stars as 0 | 1 | 2 | 3 | 4 | 5,
          statValue: 5 + stars,
          upgradeCost: stars === 5 ? [{ amount: 100, resourceId: "gold" }] : []
        }))
      },
      {
        level: 2,
        stars: [0, 1, 2, 3, 4, 5].map((stars) => ({
          stars: stars as 0 | 1 | 2 | 3 | 4 | 5,
          statValue: 12 + stars,
          upgradeCost: stars === 5 ? [{ amount: 200, resourceId: "gold" }] : []
        }))
      }
    ],
    nameKey: `goblin.${role}.name`,
    role,
    sortOrder: 1,
    statKey,
    statNameKey: `goblin.stat.${statKey}`,
    unlockRequirements: []
  };
}
