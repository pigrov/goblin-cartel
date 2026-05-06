import type { ContentBundle, GoblinConfig, GoblinHutConfig, GoblinHutLevelConfig, GoblinRole } from "@goblin-cartel/content-schemas";
import {
  calculateGoblinHireCost,
  calculateGoblinHutMaxHired,
  calculateGoblinMaxLevel,
  calculateGoblinPrimaryStat,
  calculateGoblinUpgradeCost,
  getHiredGoblinCount,
  getGoblinHutLevel,
  getGoblinLevel,
  getGoblinStars,
  isGoblinHired,
  isGoblinRoleUnlockedByHut,
  isGoblinUnlocked,
  upgradeGoblinHut,
  type GoblinRosterState,
  type HireGoblinFailureReason,
  type UpgradeGoblinFailureReason,
  type UpgradeGoblinHutFailureReason
} from "@goblin-cartel/game-core";
import { createBuildCostRequirements, getGoblinAutoCollectSlots, type BuildCostRequirement } from "./builtMineClientState";

export interface GoblinUpgradePreview {
  canUpgrade: boolean;
  costRequirements: BuildCostRequirement[];
  failureReason: UpgradeGoblinFailureReason | null;
  levelAfter: number;
  levelNow: number;
  maxLevel: number;
  primaryStatAfter: number;
  primaryStatNow: number;
  starsAfter: number;
  starsNow: number;
}

export interface GoblinHirePreview {
  canHire: boolean;
  costRequirements: BuildCostRequirement[];
  failureReason: HireGoblinFailureReason | null;
  goblin: GoblinConfig;
}

export interface GoblinHutProgressionState {
  canUpgrade: boolean;
  costRequirements: BuildCostRequirement[];
  currentLevel: GoblinHutLevelConfig;
  failureReason: UpgradeGoblinHutFailureReason | null;
  hiredCount: number;
  levelNow: number;
  maxHiredGoblins: number;
  maxLevel: number;
  nextLevel: GoblinHutLevelConfig | null;
  visualStage: 1 | 2 | 3 | 4;
}

export interface GoblinRoleSummary {
  collectorCount: number;
  foremanCount: number;
  hiredCount: number;
  minerCount: number;
  totalAutoCollectSlots: number;
}

export type GoblinHutRoleTabId = "all" | "collectors" | "foremen" | "miners";

export interface GoblinHutRoleTab {
  count: number;
  hiredCount: number;
  id: GoblinHutRoleTabId;
  label: string;
  locked: boolean;
}

export interface GoblinIdentity {
  description: string;
  fullName: string;
  name: string;
  nickname: string;
}

const goblinHutRoleTabs: Array<{ id: GoblinHutRoleTabId; label: string }> = [
  { id: "all", label: "Все" },
  { id: "miners", label: "Шахтеры" },
  { id: "collectors", label: "Сборщики" },
  { id: "foremen", label: "Бригадиры" }
];

export function createGoblinUpgradePreview(
  goblin: GoblinConfig,
  roster: GoblinRosterState,
  resources: Record<string, number>,
  goblinHut?: GoblinHutConfig
): GoblinUpgradePreview {
  const hired = isGoblinHired(roster, goblin.id);
  const levelNow = getGoblinLevel(roster, goblin.id);
  const starsNow = getGoblinStars(roster, goblin.id);
  const maxLevel = calculateGoblinMaxLevel(goblin);
  const isMaxLevel = levelNow >= maxLevel && starsNow >= 5;
  const needsStars = starsNow < 5;
  const cost = needsStars ? [] : calculateGoblinUpgradeCost(goblin, levelNow, goblinHut, getGoblinHutLevel(roster), 5);
  const costRequirements = createBuildCostRequirements(cost, resources);
  const hasEnoughResources = costRequirements.every((requirement) => requirement.ok);
  const failureReason =
    !hired ? "not_hired" : isMaxLevel ? "max_level" : needsStars ? "needs_stars" : !hasEnoughResources ? "not_enough_resources" : null;
  const nextProgress = createNextGoblinLevelProgress(levelNow, starsNow, maxLevel);

  return {
    canUpgrade: failureReason === null,
    costRequirements,
    failureReason,
    levelAfter: nextProgress.level,
    levelNow,
    maxLevel,
    primaryStatAfter: calculateGoblinPrimaryStat(goblin, nextProgress.level, nextProgress.stars),
    primaryStatNow: calculateGoblinPrimaryStat(goblin, levelNow, starsNow),
    starsAfter: nextProgress.stars,
    starsNow
  };
}

export function createGoblinHirePreview(input: {
  builtMinesCount: number;
  completedMineTemplateIds: string[];
  goblin: GoblinConfig;
  goblinHut?: GoblinHutConfig;
  goblins: GoblinConfig[];
  resources: Record<string, number>;
  roster: GoblinRosterState;
}): GoblinHirePreview {
  const cost = calculateGoblinHireCost(input.goblin, input.roster, input.goblinHut);
  const costRequirements = createBuildCostRequirements(cost, input.resources);

  if (!isGoblinRoleUnlockedByHut(input.goblin.role, input.roster, input.goblinHut)) {
    return { canHire: false, costRequirements, failureReason: "role_locked", goblin: input.goblin };
  }

  if (getHiredGoblinCount(input.roster) >= calculateGoblinHutMaxHired(input.roster, input.goblinHut)) {
    return { canHire: false, costRequirements, failureReason: "hut_limit", goblin: input.goblin };
  }

  if (
    !isGoblinUnlocked({
      goblin: input.goblin,
      goblins: input.goblins,
      progress: {
        builtMinesCount: input.builtMinesCount,
        completedMineTemplateIds: input.completedMineTemplateIds,
        resources: input.resources
      },
      roster: input.roster
    })
  ) {
    return { canHire: false, costRequirements, failureReason: "locked", goblin: input.goblin };
  }

  if (!costRequirements.every((requirement) => requirement.ok)) {
    return { canHire: false, costRequirements, failureReason: "not_enough_resources", goblin: input.goblin };
  }

  return { canHire: true, costRequirements, failureReason: null, goblin: input.goblin };
}

export function createGoblinHutProgressionState(input: {
  builtMinesCount: number;
  completedMineTemplateIds: string[];
  content: ContentBundle;
  resources: Record<string, number>;
  roster: GoblinRosterState;
}): GoblinHutProgressionState {
  const levelNow = getGoblinHutLevel(input.roster);
  const currentLevel = getContentGoblinHutLevel(input.content.goblinHut, levelNow);
  const nextLevel = getNextContentGoblinHutLevel(input.content.goblinHut, currentLevel.level);
  const maxLevel = Math.max(...input.content.goblinHut.levels.map((level) => level.level));
  const costRequirements = createBuildCostRequirements(nextLevel?.upgradeCost ?? [], input.resources);
  const upgradeResult = nextLevel
    ? upgradeGoblinHut({
        builtMinesCount: input.builtMinesCount,
        completedMineTemplateIds: input.completedMineTemplateIds,
        goblinHut: input.content.goblinHut,
        goblins: input.content.goblins.roles,
        resources: input.resources,
        roster: input.roster
      })
    : ({ ok: false, cost: [], reason: "max_level" } as const);

  return {
    canUpgrade: upgradeResult.ok,
    costRequirements,
    currentLevel,
    failureReason: upgradeResult.ok ? null : upgradeResult.reason,
    hiredCount: getHiredGoblinCount(input.roster),
    levelNow,
    maxHiredGoblins: currentLevel.maxHiredGoblins,
    maxLevel,
    nextLevel,
    visualStage: createGoblinHutVisualStage(levelNow, maxLevel)
  };
}

export function createGoblinHutVisualStage(levelNow: number, maxLevel: number): 1 | 2 | 3 | 4 {
  const normalizedMaxLevel = Math.max(1, Math.floor(maxLevel));
  const normalizedLevel = Math.min(normalizedMaxLevel, Math.max(1, Math.floor(levelNow)));
  const stage = Math.ceil((normalizedLevel / normalizedMaxLevel) * 4);

  if (stage <= 1) {
    return 1;
  }

  if (stage === 2) {
    return 2;
  }

  if (stage === 3) {
    return 3;
  }

  return 4;
}

export function createGoblinIdentity(goblin: GoblinConfig, labels: Record<string, string>): GoblinIdentity {
  const name = labels[goblin.nameKey] ?? roleLabel(goblin.role);

  return {
    description: labels[goblin.descriptionKey] ?? "",
    fullName: name,
    name,
    nickname: ""
  };
}

export function createGoblinRoleSummary(goblins: readonly GoblinConfig[], roster: GoblinRosterState): GoblinRoleSummary {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));
  const hiredInstances = roster.instances ?? [];
  const hiredGoblins = hiredInstances.flatMap((instance) => {
    const goblin = goblinById.get(instance.goblinId);
    return goblin ? [{ goblin, instance }] : [];
  });

  return {
    collectorCount: hiredGoblins.filter(({ goblin }) => goblin.role === "collector").length,
    foremanCount: hiredGoblins.filter(({ goblin }) => goblin.role === "foreman").length,
    hiredCount: hiredGoblins.length,
    minerCount: hiredGoblins.filter(({ goblin }) => goblin.role === "miner").length,
    totalAutoCollectSlots: hiredGoblins.reduce(
      (total, { goblin, instance }) => total + getGoblinAutoCollectSlots({ ...goblin, id: instance.id } as GoblinConfig, instance.level),
      0
    )
  };
}

export function createGoblinHutRoleTabs(
  goblins: readonly GoblinConfig[],
  roster: GoblinRosterState,
  goblinHut?: GoblinHutConfig
): GoblinHutRoleTab[] {
  return goblinHutRoleTabs.map((tab) => {
    const tabGoblins = filterGoblinsByHutRole(goblins, tab.id);
    const locked = tab.id !== "all" && !tabGoblins.some((goblin) => isGoblinRoleUnlockedByHut(goblin.role, roster, goblinHut));

    return {
      ...tab,
      count: tabGoblins.length,
      hiredCount: (roster.instances ?? []).filter((instance) => tabGoblins.some((goblin) => goblin.id === instance.goblinId)).length,
      locked
    };
  });
}

export function filterGoblinsByHutRole(goblins: readonly GoblinConfig[], role: GoblinHutRoleTabId): GoblinConfig[] {
  switch (role) {
    case "collectors":
      return goblins.filter(isCollectorGoblin);
    case "foremen":
      return goblins.filter(isBuilderGoblin);
    case "miners":
      return goblins.filter(isMiningGoblin);
    default:
      return [...goblins];
  }
}

export function isBuilderGoblin(goblin: GoblinConfig): boolean {
  return goblin.role === "foreman";
}

export function isCollectorGoblin(goblin: GoblinConfig): boolean {
  return goblin.role === "collector";
}

export function isMiningGoblin(goblin: GoblinConfig): boolean {
  return goblin.role === "miner";
}

export function roleLabel(role: GoblinRole): string {
  switch (role) {
    case "collector":
      return "Сборщик";
    case "foreman":
      return "Бригадир";
    case "miner":
      return "Шахтер";
  }
}

function getContentGoblinHutLevel(goblinHut: GoblinHutConfig, level: number): GoblinHutLevelConfig {
  const levels = [...goblinHut.levels].sort((left, right) => right.level - left.level);
  const fallbackLevel = levels[levels.length - 1];

  if (!fallbackLevel) {
    throw new Error("Goblin Hut content must contain at least one level.");
  }

  return levels.find((item) => item.level <= level) ?? fallbackLevel;
}

function getNextContentGoblinHutLevel(goblinHut: GoblinHutConfig, currentLevel: number): GoblinHutLevelConfig | null {
  return [...goblinHut.levels].sort((left, right) => left.level - right.level).find((item) => item.level > currentLevel) ?? null;
}

function createNextGoblinLevelProgress(level: number, stars: number, maxLevel: number): { level: number; stars: 0 | 1 | 2 | 3 | 4 | 5 } {
  if (stars < 5 || level >= maxLevel) {
    return {
      level,
      stars: Math.min(5, Math.max(0, stars)) as 0 | 1 | 2 | 3 | 4 | 5
    };
  }

  return {
    level: level + 1,
    stars: 0
  };
}
