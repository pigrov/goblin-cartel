import type { ContentBundle, GoblinConfig, GoblinHutConfig, GoblinHutLevelConfig } from "@goblin-cartel/content-schemas";
import {
  calculateGoblinHireCost,
  calculateGoblinHutMaxHired,
  calculateCrewAutoDamagePerSecond,
  calculateGoblinMaxLevel,
  calculateGoblinUpgradeCost,
  getGoblinLevel,
  getGoblinHutLevel,
  isGoblinHired,
  isGoblinClassUnlockedByHut,
  isGoblinUnlocked,
  upgradeGoblinHut,
  type GoblinRosterState,
  type HireGoblinFailureReason,
  type UpgradeGoblinHutFailureReason,
  type UpgradeGoblinFailureReason
} from "@goblin-cartel/game-core";
import {
  createBuildCostRequirements,
  getGoblinAutoCollectSlots,
  getGoblinBuildCostMultiplier,
  getGoblinBuildTimeMultiplier,
  type BuildCostRequirement
} from "./builtMineClientState";

export interface GoblinUpgradePreview {
  autoCollectSlotsAfter: number;
  autoCollectSlotsNow: number;
  buildCostMultiplierAfter: number;
  buildCostMultiplierNow: number;
  buildTimeMultiplierAfter: number;
  buildTimeMultiplierNow: number;
  canUpgrade: boolean;
  costRequirements: BuildCostRequirement[];
  damagePerSecondAfter: number;
  damagePerSecondNow: number;
  failureReason: UpgradeGoblinFailureReason | null;
  levelAfter: number;
  levelNow: number;
  maxLevel: number;
}

export interface GoblinHirePreview {
  canHire: boolean;
  costRequirements: BuildCostRequirement[];
  failureReason: HireGoblinFailureReason | null;
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
}

export interface GoblinRoleSummary {
  builderCount: number;
  collectorCount: number;
  hiredCount: number;
  minerCount: number;
  totalAutoCollectSlots: number;
}

export type GoblinHutRoleTabId = "all" | "builders" | "collectors" | "miners";

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
  { id: "builders", label: "Стройка" }
];

export function createGoblinUpgradePreview(
  goblin: GoblinConfig,
  roster: GoblinRosterState,
  resources: Record<string, number>,
  goblinHut?: GoblinHutConfig
): GoblinUpgradePreview {
  const hired = isGoblinHired(roster, goblin.id);
  const levelNow = getGoblinLevel(roster, goblin.id);
  const maxLevel = calculateGoblinMaxLevel(goblin);
  const isMaxLevel = levelNow >= maxLevel;
  const cost = calculateGoblinUpgradeCost(goblin, levelNow, goblinHut, getGoblinHutLevel(roster));
  const costRequirements = createBuildCostRequirements(cost, resources);
  const hasEnoughResources = costRequirements.every((requirement) => requirement.ok);
  const failureReason =
    !hired ? "not_hired" : isMaxLevel ? "max_level" : !hasEnoughResources ? "not_enough_resources" : null;
  const levelAfter = isMaxLevel ? levelNow : levelNow + 1;

  return {
    autoCollectSlotsAfter: getGoblinAutoCollectSlots(goblin, levelAfter),
    autoCollectSlotsNow: getGoblinAutoCollectSlots(goblin, levelNow),
    buildCostMultiplierAfter: getGoblinBuildCostMultiplier(goblin, levelAfter),
    buildCostMultiplierNow: getGoblinBuildCostMultiplier(goblin, levelNow),
    buildTimeMultiplierAfter: getGoblinBuildTimeMultiplier(goblin, levelAfter),
    buildTimeMultiplierNow: getGoblinBuildTimeMultiplier(goblin, levelNow),
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

export function createGoblinHirePreview(input: {
  builtMinesCount: number;
  completedMineTemplateIds: string[];
  goblin: GoblinConfig;
  goblinHut?: GoblinHutConfig;
  goblins: GoblinConfig[];
  resources: Record<string, number>;
  roster: GoblinRosterState;
}): GoblinHirePreview {
  const hired = isGoblinHired(input.roster, input.goblin.id);
  const cost = calculateGoblinHireCost(input.goblin, input.roster, input.goblinHut);
  const costRequirements = createBuildCostRequirements(cost, input.resources);

  if (hired) {
    return { canHire: false, costRequirements, failureReason: "already_hired" };
  }

  if (!isGoblinClassUnlockedByHut(input.goblin.class, input.roster, input.goblinHut)) {
    return { canHire: false, costRequirements, failureReason: "role_locked" };
  }

  if (input.roster.hiredGoblinIds.length >= calculateGoblinHutMaxHired(input.roster, input.goblinHut)) {
    return { canHire: false, costRequirements, failureReason: "hut_limit" };
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
    return { canHire: false, costRequirements, failureReason: "locked" };
  }

  if (!costRequirements.every((requirement) => requirement.ok)) {
    return { canHire: false, costRequirements, failureReason: "not_enough_resources" };
  }

  return { canHire: true, costRequirements, failureReason: null };
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
        goblins: input.content.goblins,
        resources: input.resources,
        roster: input.roster
      })
    : ({ ok: false, cost: [], reason: "max_level" } as const);

  return {
    canUpgrade: upgradeResult.ok,
    costRequirements,
    currentLevel,
    failureReason: upgradeResult.ok ? null : upgradeResult.reason,
    hiredCount: input.roster.hiredGoblinIds.length,
    levelNow,
    maxHiredGoblins: currentLevel.maxHiredGoblins,
    maxLevel,
    nextLevel
  };
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

export function createGoblinIdentity(goblin: GoblinConfig, labels: Record<string, string>): GoblinIdentity {
  const rawName = labels[goblin.nameKey] ?? goblin.id;
  const nickname = goblin.nicknameKey ? labels[goblin.nicknameKey] ?? "" : "";
  const fallbackSplit = splitGoblinName(rawName);
  const name = fallbackSplit.name;
  const resolvedNickname = nickname || fallbackSplit.nickname;
  const fullName = resolvedNickname ? `${name} ${resolvedNickname}` : name;

  return {
    description: labels[goblin.descriptionKey] ?? goblin.id,
    fullName,
    name,
    nickname: resolvedNickname
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

export function createGoblinHutRoleTabs(
  goblins: readonly GoblinConfig[],
  roster: GoblinRosterState,
  goblinHut?: GoblinHutConfig
): GoblinHutRoleTab[] {
  return goblinHutRoleTabs.map((tab) => {
    const tabGoblins = filterGoblinsByHutRole(goblins, tab.id);
    const locked =
      tab.id !== "all" && !tabGoblins.some((goblin) => isGoblinClassUnlockedByHut(goblin.class, roster, goblinHut));

    return {
      ...tab,
      count: tabGoblins.length,
      hiredCount: tabGoblins.filter((goblin) => isGoblinHired(roster, goblin.id)).length,
      locked
    };
  });
}

export function filterGoblinsByHutRole(
  goblins: readonly GoblinConfig[],
  role: GoblinHutRoleTabId
): GoblinConfig[] {
  switch (role) {
    case "builders":
      return goblins.filter(isBuilderGoblin);
    case "collectors":
      return goblins.filter(isCollectorGoblin);
    case "miners":
      return goblins.filter(isMiningGoblin);
    default:
      return [...goblins];
  }
}

export function isBuilderGoblin(goblin: GoblinConfig): boolean {
  return goblin.class === "builder" || goblin.class === "foreman";
}

export function isCollectorGoblin(goblin: GoblinConfig): boolean {
  return goblin.class === "collector";
}

export function isMiningGoblin(goblin: GoblinConfig): boolean {
  return goblin.class === "miner";
}

function splitGoblinName(value: string): { name: string; nickname: string } {
  const [name = value, ...nicknameParts] = value.trim().split(/\s+/u);

  return {
    name,
    nickname: nicknameParts.join(" ")
  };
}
