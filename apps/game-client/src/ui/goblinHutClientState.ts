import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  calculateCrewAutoDamagePerSecond,
  calculateGoblinMaxLevel,
  calculateGoblinUpgradeCost,
  getGoblinLevel,
  isGoblinHired,
  type GoblinRosterState,
  type UpgradeGoblinFailureReason
} from "@goblin-cartel/game-core";
import { createBuildCostRequirements, getGoblinAutoCollectSlots, type BuildCostRequirement } from "./builtMineClientState";

export interface GoblinUpgradePreview {
  autoCollectSlotsAfter: number;
  autoCollectSlotsNow: number;
  canUpgrade: boolean;
  costRequirements: BuildCostRequirement[];
  damagePerSecondAfter: number;
  damagePerSecondNow: number;
  failureReason: UpgradeGoblinFailureReason | null;
  levelAfter: number;
  levelNow: number;
  maxLevel: number;
}

export interface GoblinRoleSummary {
  builderCount: number;
  collectorCount: number;
  hiredCount: number;
  minerCount: number;
  totalAutoCollectSlots: number;
}

export function createGoblinUpgradePreview(
  goblin: GoblinConfig,
  roster: GoblinRosterState,
  resources: Record<string, number>
): GoblinUpgradePreview {
  const hired = isGoblinHired(roster, goblin.id);
  const levelNow = getGoblinLevel(roster, goblin.id);
  const maxLevel = calculateGoblinMaxLevel(goblin);
  const isMaxLevel = levelNow >= maxLevel;
  const cost = calculateGoblinUpgradeCost(goblin, levelNow);
  const costRequirements = createBuildCostRequirements(cost, resources);
  const hasEnoughResources = costRequirements.every((requirement) => requirement.ok);
  const failureReason =
    !hired ? "not_hired" : isMaxLevel ? "max_level" : !hasEnoughResources ? "not_enough_resources" : null;
  const levelAfter = isMaxLevel ? levelNow : levelNow + 1;

  return {
    autoCollectSlotsAfter: getGoblinAutoCollectSlots(goblin, levelAfter),
    autoCollectSlotsNow: getGoblinAutoCollectSlots(goblin, levelNow),
    canUpgrade: failureReason === null,
    costRequirements,
    damagePerSecondAfter: calculateCrewAutoDamagePerSecond({
      goblins: [goblin],
      roster: {
        goblinLevels: {
          [goblin.id]: levelAfter
        },
        hiredGoblinIds: [goblin.id]
      }
    }),
    damagePerSecondNow: calculateCrewAutoDamagePerSecond({
      goblins: [goblin],
      roster: {
        goblinLevels: {
          [goblin.id]: levelNow
        },
        hiredGoblinIds: [goblin.id]
      }
    }),
    failureReason,
    levelAfter,
    levelNow,
    maxLevel
  };
}

export function createGoblinRoleSummary(goblins: readonly GoblinConfig[], roster: GoblinRosterState): GoblinRoleSummary {
  const hiredGoblins = goblins.filter((goblin) => isGoblinHired(roster, goblin.id));

  return {
    builderCount: hiredGoblins.filter((goblin) => goblin.class === "builder" || goblin.class === "foreman").length,
    collectorCount: hiredGoblins.filter((goblin) => goblin.class === "collector").length,
    hiredCount: hiredGoblins.length,
    minerCount: hiredGoblins.filter((goblin) => goblin.class === "miner").length,
    totalAutoCollectSlots: hiredGoblins.reduce(
      (total, goblin) => total + getGoblinAutoCollectSlots(goblin, getGoblinLevel(roster, goblin.id)),
      0
    )
  };
}
