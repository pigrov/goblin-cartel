import { createBuildCostRequirements, type BuildCostRequirement } from "./builtMineClientState";

export interface ElevatorUpgradeCost {
  amount: number;
  resourceId: string;
}

export interface ElevatorLevelConfig {
  level: number;
  platformSlots: number;
  upgradeCost: ElevatorUpgradeCost[];
  visualStage: 1 | 2 | 3 | 4 | 5;
}

export type UpgradeElevatorFailureReason = "max_level" | "not_enough_resources";

export interface ElevatorProgressionState {
  canUpgrade: boolean;
  costRequirements: BuildCostRequirement[];
  currentLevel: ElevatorLevelConfig;
  failureReason: UpgradeElevatorFailureReason | null;
  levelNow: number;
  maxLevel: number;
  nextLevel: ElevatorLevelConfig | null;
  platformSlots: number;
  visualStage: 1 | 2 | 3 | 4 | 5;
}

export const elevatorLevels: ElevatorLevelConfig[] = [
  {
    level: 1,
    platformSlots: 2,
    upgradeCost: [],
    visualStage: 1
  },
  {
    level: 2,
    platformSlots: 3,
    upgradeCost: [
      { resourceId: "gold", amount: 700 },
      { resourceId: "stone", amount: 120 }
    ],
    visualStage: 2
  },
  {
    level: 3,
    platformSlots: 4,
    upgradeCost: [
      { resourceId: "gold", amount: 1600 },
      { resourceId: "copper_ore", amount: 75 }
    ],
    visualStage: 3
  },
  {
    level: 4,
    platformSlots: 5,
    upgradeCost: [
      { resourceId: "gold", amount: 3200 },
      { resourceId: "copper_ore", amount: 160 },
      { resourceId: "iron", amount: 35 }
    ],
    visualStage: 4
  },
  {
    level: 5,
    platformSlots: 7,
    upgradeCost: [
      { resourceId: "gold", amount: 6500 },
      { resourceId: "iron", amount: 120 },
      { resourceId: "elixir", amount: 20 }
    ],
    visualStage: 5
  }
];

export function createElevatorProgressionState(
  level: number | undefined,
  resources: Record<string, number>
): ElevatorProgressionState {
  const currentLevel = getElevatorLevelConfig(level);
  const nextLevel = getNextElevatorLevelConfig(currentLevel.level);
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
    failureReason,
    levelNow: currentLevel.level,
    maxLevel: elevatorLevels[elevatorLevels.length - 1]?.level ?? currentLevel.level,
    nextLevel,
    platformSlots: currentLevel.platformSlots,
    visualStage: currentLevel.visualStage
  };
}

export function upgradeElevator(input: {
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
  const state = createElevatorProgressionState(input.level, input.resources);

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

export function normalizeElevatorLevel(level: number | undefined): number {
  if (!Number.isFinite(level)) {
    return elevatorLevels[0]?.level ?? 1;
  }

  return getElevatorLevelConfig(Math.floor(level ?? 1)).level;
}

export function getElevatorLevelConfig(level: number | undefined): ElevatorLevelConfig {
  const normalizedLevel = Number.isFinite(level) ? Math.floor(level ?? 1) : 1;
  const levels = [...elevatorLevels].sort((left, right) => right.level - left.level);
  const fallbackLevel = levels[levels.length - 1];

  if (!fallbackLevel) {
    throw new Error("Elevator progression must contain at least one level.");
  }

  return levels.find((item) => item.level <= normalizedLevel) ?? fallbackLevel;
}

export function getNextElevatorLevelConfig(level: number | undefined): ElevatorLevelConfig | null {
  const currentLevel = getElevatorLevelConfig(level).level;

  return [...elevatorLevels].sort((left, right) => left.level - right.level).find((item) => item.level > currentLevel) ?? null;
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
