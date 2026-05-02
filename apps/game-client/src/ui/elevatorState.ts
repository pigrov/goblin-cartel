import { starterContentBundle, type ElevatorConfig, type ElevatorLevelConfig } from "@goblin-cartel/content-schemas";
import { createBuildCostRequirements, type BuildCostRequirement } from "./builtMineClientState";

export interface ElevatorUpgradeCost {
  amount: number;
  resourceId: string;
}

export type UpgradeElevatorFailureReason = "max_level" | "not_enough_resources";

export interface ElevatorProgressionState {
  canUpgrade: boolean;
  costRequirements: BuildCostRequirement[];
  currentLevel: ElevatorLevelConfig;
  dropDurationMs: number;
  failureReason: UpgradeElevatorFailureReason | null;
  levelNow: number;
  maxLevel: number;
  nextLevel: ElevatorLevelConfig | null;
  offlineDamageMultiplier: number;
  platformSlots: number;
  stabilityPercent: number;
  visualStage: 1 | 2 | 3 | 4 | 5;
}

export function createElevatorProgressionState(
  elevator: ElevatorConfig | undefined,
  level: number | undefined,
  resources: Record<string, number>
): ElevatorProgressionState {
  const levels = sortedElevatorLevels(elevator);
  const currentLevel = getElevatorLevelConfig(elevator, level);
  const nextLevel = getNextElevatorLevelConfig(elevator, currentLevel.level);
  const costRequirements = createBuildCostRequirements(nextLevel?.upgradeCost ?? [], resources);
  const failureReason = nextLevel
    ? costRequirements.every((requirement) => requirement.ok)
      ? null
      : "not_enough_resources"
    : "max_level";

  return {
    canUpgrade: failureReason === null,
    costRequirements,
    currentLevel,
    dropDurationMs: currentLevel.dropDurationMs,
    failureReason,
    levelNow: currentLevel.level,
    maxLevel: levels[levels.length - 1]?.level ?? currentLevel.level,
    nextLevel,
    offlineDamageMultiplier: currentLevel.offlineDamageMultiplier,
    platformSlots: currentLevel.platformSlots,
    stabilityPercent: currentLevel.stabilityPercent,
    visualStage: currentLevel.visualStage
  };
}

export function upgradeElevator(input: {
  elevator?: ElevatorConfig;
  level: number | undefined;
  resources: Record<string, number>;
}):
  | {
      ok: true;
      level: number;
      resources: Record<string, number>;
    }
  | {
      ok: false;
      reason: UpgradeElevatorFailureReason;
    } {
  const state = createElevatorProgressionState(input.elevator, input.level, input.resources);

  if (!state.nextLevel) {
    return { ok: false, reason: "max_level" };
  }

  if (!state.canUpgrade) {
    return { ok: false, reason: "not_enough_resources" };
  }

  return {
    ok: true,
    level: state.nextLevel.level,
    resources: deductResources(input.resources, state.nextLevel.upgradeCost)
  };
}

export function normalizeElevatorLevel(elevator: ElevatorConfig | undefined, level: number | undefined): number {
  if (!Number.isFinite(level)) {
    return sortedElevatorLevels(elevator)[0]?.level ?? 1;
  }

  return getElevatorLevelConfig(elevator, Math.floor(level ?? 1)).level;
}

export function getElevatorLevelConfig(elevator: ElevatorConfig | undefined, level: number | undefined): ElevatorLevelConfig {
  const normalizedLevel = Number.isFinite(level) ? Math.floor(level ?? 1) : 1;
  const levels = sortedElevatorLevels(elevator).sort((left, right) => right.level - left.level);
  const fallbackLevel = levels[levels.length - 1];

  if (!fallbackLevel) {
    throw new Error("Elevator progression must contain at least one level.");
  }

  return levels.find((item) => item.level <= normalizedLevel) ?? fallbackLevel;
}

export function getNextElevatorLevelConfig(elevator: ElevatorConfig | undefined, level: number | undefined): ElevatorLevelConfig | null {
  const currentLevel = getElevatorLevelConfig(elevator, level).level;

  return sortedElevatorLevels(elevator).find((item) => item.level > currentLevel) ?? null;
}

function deductResources(
  resources: Record<string, number>,
  cost: ElevatorUpgradeCost[]
): Record<string, number> {
  const nextResources = { ...resources };

  for (const item of cost) {
    nextResources[item.resourceId] = Math.max(0, (nextResources[item.resourceId] ?? 0) - item.amount);
  }

  return nextResources;
}

function sortedElevatorLevels(elevator: ElevatorConfig | undefined): ElevatorLevelConfig[] {
  const levels = elevator?.levels.length ? elevator.levels : starterContentBundle.elevator.levels;
  return [...levels].sort((left, right) => left.level - right.level);
}
