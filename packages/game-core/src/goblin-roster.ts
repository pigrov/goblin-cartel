export type GoblinRosterRole = "miner" | "collector" | "foreman";
export type GoblinRosterPrimaryStat = "power" | "speed" | "control";
export type GoblinRosterStarRank = 0 | 1 | 2 | 3 | 4 | 5;

export interface GoblinRosterResourceAmount {
  resourceId: string;
  amount: number;
}

export type GoblinRosterModifier =
  | {
      type: "stat_bonus";
      stat: GoblinRosterPrimaryStat;
      value: number;
    }
  | {
      type: "stat_multiplier";
      stat: GoblinRosterPrimaryStat;
      value: number;
    }
  | {
      type: "mine_capacity_multiplier";
      value: number;
    }
  | {
      type: "mine_production_multiplier";
      resourceId?: string;
      value: number;
    }
  | {
      type: "build_time_multiplier";
      value: number;
    }
  | {
      type: "offline_auto_damage_multiplier";
      value: number;
    }
  | {
      type: "offline_reward_multiplier";
      value: number;
    };

export type GoblinRosterUnlockRequirement =
  | {
      type: "built_mines_count";
      value: number;
    }
  | {
      type: "mine_completed";
      mineTemplateId: string;
    }
  | {
      type: "goblins_by_role";
      role: GoblinRosterRole;
      count: number;
    }
  | {
      type: "resource_collected";
      resourceId: string;
      amount: number;
    };

export interface GoblinRosterProgressionStar {
  stars: GoblinRosterStarRank;
  statValue: number;
  upgradeCost: GoblinRosterResourceAmount[];
  modifiers?: GoblinRosterModifier[];
}

export interface GoblinRosterProgressionLevel {
  level: number;
  stars: GoblinRosterProgressionStar[];
}

export interface GoblinRosterGoblin {
  assetId: string;
  descriptionKey: string;
  hireCost: GoblinRosterResourceAmount[];
  id: string;
  levels: GoblinRosterProgressionLevel[];
  nameKey: string;
  role: GoblinRosterRole;
  sortOrder: number;
  statKey: GoblinRosterPrimaryStat;
  statNameKey: string;
  unlockRequirements: GoblinRosterUnlockRequirement[];
}

export interface GoblinRosterInstanceEquipment {
  itemId: string;
  slot: string;
}

export interface GoblinRosterInstanceLifetimeStats {
  blocksDestroyed?: number;
  minesCompleted?: number;
  resourcesCollected?: Record<string, number>;
}

export interface GoblinRosterInstance {
  assetId?: string;
  equipment: GoblinRosterInstanceEquipment[];
  goblinId: string;
  id: string;
  level: number;
  lifetimeStats: GoblinRosterInstanceLifetimeStats;
  role: GoblinRosterRole;
  stars: GoblinRosterStarRank;
}

export interface GoblinHutLevelConfig {
  level: number;
  maxHiredGoblins: number;
  unlockedRoles: GoblinRosterRole[];
  hireCostMultiplier?: number;
  upgradeCost?: GoblinRosterResourceAmount[];
  upgradeCostMultiplier?: number;
  unlockRequirements?: GoblinRosterUnlockRequirement[];
}

export interface GoblinHutConfig {
  levels: GoblinHutLevelConfig[];
}

export interface GoblinRosterState {
  hutLevel?: number;
  hiredGoblinIds: string[];
  instances?: GoblinRosterInstance[];
}

export interface GoblinRosterProgress {
  resources: Record<string, number>;
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
}

export type HireGoblinFailureReason = "missing_goblin" | "hut_limit" | "locked" | "not_enough_resources" | "role_locked";
export type UpgradeGoblinFailureReason = "missing_goblin" | "not_hired" | "max_level" | "not_enough_resources" | "needs_stars";
export type UpgradeGoblinHutFailureReason = "max_level" | "locked" | "not_enough_resources";
export type MergeGoblinsFailureReason = "missing_goblin" | "same_instance" | "not_hired" | "mismatch" | "max_stars";

export type HireGoblinResult =
  | {
      instance: GoblinRosterInstance;
      ok: true;
      roster: GoblinRosterState;
      resources: Record<string, number>;
    }
  | {
      cost: GoblinRosterResourceAmount[];
      ok: false;
      reason: HireGoblinFailureReason;
    };

export interface HireGoblinInput {
  goblinId: string;
  goblinHut?: GoblinHutConfig;
  goblins: GoblinRosterGoblin[];
  roster: GoblinRosterState;
  resources: Record<string, number>;
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
}

export type UpgradeGoblinResult =
  | {
      cost: GoblinRosterResourceAmount[];
      instance: GoblinRosterInstance;
      ok: true;
      resources: Record<string, number>;
      roster: GoblinRosterState;
    }
  | {
      cost: GoblinRosterResourceAmount[];
      ok: false;
      reason: UpgradeGoblinFailureReason;
    };

export interface UpgradeGoblinInput {
  goblinId: string;
  goblinHut?: GoblinHutConfig;
  goblins: GoblinRosterGoblin[];
  resources: Record<string, number>;
  roster: GoblinRosterState;
}

export type MergeGoblinsResult =
  | {
      consumedInstanceId: string;
      instance: GoblinRosterInstance;
      ok: true;
      roster: GoblinRosterState;
    }
  | {
      ok: false;
      reason: MergeGoblinsFailureReason;
    };

export interface MergeGoblinsInput {
  sourceGoblinId: string;
  targetGoblinId: string;
  goblins: GoblinRosterGoblin[];
  roster: GoblinRosterState;
}

export type UpgradeGoblinHutResult =
  | {
      cost: GoblinRosterResourceAmount[];
      ok: true;
      resources: Record<string, number>;
      roster: GoblinRosterState;
    }
  | {
      cost: GoblinRosterResourceAmount[];
      ok: false;
      reason: UpgradeGoblinHutFailureReason;
    };

export interface UpgradeGoblinHutInput {
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
  goblinHut: GoblinHutConfig;
  goblins: GoblinRosterGoblin[];
  resources: Record<string, number>;
  roster: GoblinRosterState;
}

export interface CrewAutoDamageInput {
  goblins: GoblinRosterGoblin[];
  roster: GoblinRosterState;
}

export function createInitialGoblinRoster(_goblins: GoblinRosterGoblin[]): GoblinRosterState {
  return {
    hiredGoblinIds: []
  };
}

export function normalizeGoblinRoster(
  roster: GoblinRosterState,
  goblins: GoblinRosterGoblin[],
  goblinHut?: GoblinHutConfig
): GoblinRosterState {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));
  const normalizedInstances = (roster.instances ?? []).flatMap((instance) => {
    const goblin = goblinById.get(instance.goblinId);
    return goblin ? [normalizeGoblinInstance(instance, goblin)] : [];
  });
  const instanceIds = new Set(normalizedInstances.map((instance) => instance.id));
  const hiredGoblinIds = roster.hiredGoblinIds.filter((id, index, ids) => instanceIds.has(id) && ids.indexOf(id) === index);
  const includedIds = new Set(hiredGoblinIds);

  for (const instance of normalizedInstances) {
    if (!includedIds.has(instance.id)) {
      hiredGoblinIds.push(instance.id);
      includedIds.add(instance.id);
    }
  }

  const hutLevel = normalizeGoblinHutLevel(roster.hutLevel ?? 1, goblinHut);

  return {
    ...(hutLevel > 1 ? { hutLevel } : {}),
    hiredGoblinIds,
    ...(normalizedInstances.length > 0 ? { instances: normalizedInstances } : {})
  };
}

export function ensureGoblinRosterInstances(roster: GoblinRosterState, goblins: GoblinRosterGoblin[]): GoblinRosterState {
  return normalizeGoblinRoster(roster, goblins);
}

export function isGoblinHired(roster: GoblinRosterState, goblinId: string): boolean {
  return Boolean((roster.instances ?? []).some((instance) => instance.id === goblinId || instance.goblinId === goblinId));
}

export function getHiredGoblinCount(roster: GoblinRosterState): number {
  return roster.instances?.length ?? roster.hiredGoblinIds.length;
}

export function getGoblinLevel(roster: GoblinRosterState, goblinId: string): number {
  const instance = findRosterInstance(roster, goblinId);
  return Math.max(1, Math.floor(instance?.level ?? 1));
}

export function getGoblinStars(roster: GoblinRosterState, goblinId: string): GoblinRosterStarRank {
  const instance = findRosterInstance(roster, goblinId);
  return normalizeStarRank(instance?.stars ?? 0);
}

export function createGoblinContractInstance(
  goblin: GoblinRosterGoblin,
  level = 1,
  instanceId = createGoblinInstanceId(goblin.id, 1),
  stars: GoblinRosterStarRank = 0
): GoblinRosterInstance {
  return {
    assetId: goblin.assetId,
    equipment: [],
    goblinId: goblin.id,
    id: instanceId,
    level: normalizeGoblinLevel(level, calculateGoblinMaxLevel(goblin)),
    lifetimeStats: {},
    role: goblin.role,
    stars
  };
}

export function getGoblinHutLevel(roster: GoblinRosterState): number {
  return Math.max(1, Math.floor(roster.hutLevel ?? 1));
}

export function getGoblinHutLevelConfig(goblinHut: GoblinHutConfig | undefined, level: number): GoblinHutLevelConfig {
  if (!goblinHut || goblinHut.levels.length === 0) {
    return createFallbackGoblinHutLevel();
  }

  const normalizedLevel = normalizeGoblinHutLevel(level, goblinHut);
  const exactLevel = goblinHut.levels.find((item) => item.level === normalizedLevel);

  return (
    exactLevel ??
    [...goblinHut.levels].sort((left, right) => right.level - left.level).find((item) => item.level <= normalizedLevel) ??
    createFallbackGoblinHutLevel()
  );
}

export function getCurrentGoblinHutLevelConfig(roster: GoblinRosterState, goblinHut?: GoblinHutConfig): GoblinHutLevelConfig {
  return getGoblinHutLevelConfig(goblinHut, getGoblinHutLevel(roster));
}

export function getNextGoblinHutLevelConfig(roster: GoblinRosterState, goblinHut: GoblinHutConfig): GoblinHutLevelConfig | null {
  const currentLevel = getGoblinHutLevelConfig(goblinHut, getGoblinHutLevel(roster)).level;

  return [...goblinHut.levels].sort((left, right) => left.level - right.level).find((level) => level.level > currentLevel) ?? null;
}

export function calculateGoblinHutMaxHired(roster: GoblinRosterState, goblinHut?: GoblinHutConfig): number {
  return getCurrentGoblinHutLevelConfig(roster, goblinHut).maxHiredGoblins;
}

export function isGoblinRoleUnlockedByHut(
  role: GoblinRosterRole,
  roster: GoblinRosterState,
  goblinHut?: GoblinHutConfig
): boolean {
  return getCurrentGoblinHutLevelConfig(roster, goblinHut).unlockedRoles.includes(role);
}

export function isGoblinUnlocked(input: {
  goblin: GoblinRosterGoblin;
  goblins: GoblinRosterGoblin[];
  progress: GoblinRosterProgress;
  roster: GoblinRosterState;
}): boolean {
  return areUnlockRequirementsMet({
    goblins: input.goblins,
    progress: input.progress,
    requirements: input.goblin.unlockRequirements,
    roster: input.roster
  });
}

export function canHireGoblin(input: {
  goblin: GoblinRosterGoblin;
  goblinHut?: GoblinHutConfig;
  goblins: GoblinRosterGoblin[];
  resources: Record<string, number>;
  roster: GoblinRosterState;
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
}): boolean {
  const roster = normalizeGoblinRoster(input.roster, input.goblins, input.goblinHut);

  if (!isGoblinRoleUnlockedByHut(input.goblin.role, roster, input.goblinHut)) {
    return false;
  }

  if (getHiredGoblinCount(roster) >= calculateGoblinHutMaxHired(roster, input.goblinHut)) {
    return false;
  }

  if (
    !isGoblinUnlocked({
      goblin: input.goblin,
      goblins: input.goblins,
      roster,
      progress: {
        resources: input.resources,
        builtMinesCount: input.builtMinesCount,
        completedMineTemplateIds: input.completedMineTemplateIds
      }
    })
  ) {
    return false;
  }

  return hasEnoughResources(input.resources, calculateGoblinHireCost(input.goblin, roster, input.goblinHut));
}

export function hireGoblin(input: HireGoblinInput): HireGoblinResult {
  const goblin = input.goblins.find((item) => item.id === input.goblinId);

  if (!goblin) {
    return { cost: [], ok: false, reason: "missing_goblin" };
  }

  const roster = normalizeGoblinRoster(input.roster, input.goblins, input.goblinHut);
  const hireCost = calculateGoblinHireCost(goblin, roster, input.goblinHut);

  if (!isGoblinRoleUnlockedByHut(goblin.role, roster, input.goblinHut)) {
    return { cost: hireCost, ok: false, reason: "role_locked" };
  }

  if (getHiredGoblinCount(roster) >= calculateGoblinHutMaxHired(roster, input.goblinHut)) {
    return { cost: hireCost, ok: false, reason: "hut_limit" };
  }

  const unlocked = isGoblinUnlocked({
    goblin,
    goblins: input.goblins,
    roster,
    progress: {
      resources: input.resources,
      builtMinesCount: input.builtMinesCount,
      completedMineTemplateIds: input.completedMineTemplateIds
    }
  });

  if (!unlocked) {
    return { cost: hireCost, ok: false, reason: "locked" };
  }

  if (!hasEnoughResources(input.resources, hireCost)) {
    return { cost: hireCost, ok: false, reason: "not_enough_resources" };
  }

  const sequence = getNextGoblinInstanceSequence(roster, goblin.id);
  const instance = createGoblinContractInstance(goblin, 1, createGoblinInstanceId(goblin.id, sequence));

  return {
    instance,
    ok: true,
    roster: {
      ...(roster.hutLevel ? { hutLevel: roster.hutLevel } : {}),
      hiredGoblinIds: [...roster.hiredGoblinIds, instance.id],
      instances: [...(roster.instances ?? []), instance]
    },
    resources: deductResources(input.resources, hireCost)
  };
}

export function calculateGoblinHireCost(
  goblin: GoblinRosterGoblin,
  roster: GoblinRosterState,
  goblinHut?: GoblinHutConfig
): GoblinRosterResourceAmount[] {
  const multiplier = getCurrentGoblinHutLevelConfig(roster, goblinHut).hireCostMultiplier ?? 1;
  return multiplyResourceCost(goblin.hireCost, multiplier);
}

export function calculateGoblinMaxLevel(goblin: GoblinRosterGoblin): number {
  return Math.max(1, Math.max(...goblin.levels.map((level) => level.level)));
}

export function calculateGoblinUpgradeCost(
  goblin: GoblinRosterGoblin,
  level = 1,
  goblinHut?: GoblinHutConfig,
  hutLevel = 1,
  stars: GoblinRosterStarRank = 0
): GoblinRosterResourceAmount[] {
  const tier = getGoblinProgressionTier(goblin, level, stars);
  const multiplier = getGoblinHutLevelConfig(goblinHut, hutLevel).upgradeCostMultiplier ?? 1;
  return multiplyResourceCost(tier?.upgradeCost ?? [], multiplier);
}

export function canMergeGoblins(input: MergeGoblinsInput): boolean {
  return mergeGoblins(input).ok;
}

export function mergeGoblins(input: MergeGoblinsInput): MergeGoblinsResult {
  if (input.sourceGoblinId === input.targetGoblinId) {
    return { ok: false, reason: "same_instance" };
  }

  const roster = normalizeGoblinRoster(input.roster, input.goblins);
  const source = findRosterInstance(roster, input.sourceGoblinId);
  const target = findRosterInstance(roster, input.targetGoblinId);

  if (!source || !target) {
    return { ok: false, reason: "not_hired" };
  }

  const goblin = input.goblins.find((item) => item.id === target.goblinId);

  if (!goblin || !input.goblins.some((item) => item.id === source.goblinId)) {
    return { ok: false, reason: "missing_goblin" };
  }

  if (source.goblinId !== target.goblinId || source.level !== target.level || source.stars !== target.stars) {
    return { ok: false, reason: "mismatch" };
  }

  if (target.stars >= 5) {
    return { ok: false, reason: "max_stars" };
  }

  const mergedInstance: GoblinRosterInstance = {
    ...target,
    lifetimeStats: mergeGoblinLifetimeStats(target.lifetimeStats, source.lifetimeStats),
    stars: (target.stars + 1) as GoblinRosterStarRank
  };
  const instances = (roster.instances ?? [])
    .filter((instance) => instance.id !== source.id)
    .map((instance) => (instance.id === target.id ? mergedInstance : instance));

  return {
    consumedInstanceId: source.id,
    instance: mergedInstance,
    ok: true,
    roster: {
      ...(roster.hutLevel ? { hutLevel: roster.hutLevel } : {}),
      hiredGoblinIds: roster.hiredGoblinIds.filter((id) => id !== source.id),
      instances
    }
  };
}

export function upgradeGoblin(input: UpgradeGoblinInput): UpgradeGoblinResult {
  const roster = normalizeGoblinRoster(input.roster, input.goblins, input.goblinHut);
  const instance = findRosterInstance(roster, input.goblinId);
  const goblin = instance ? input.goblins.find((item) => item.id === instance.goblinId) : input.goblins.find((item) => item.id === input.goblinId);

  if (!goblin) {
    return { cost: [], ok: false, reason: "missing_goblin" };
  }

  if (!instance) {
    return { cost: [], ok: false, reason: "not_hired" };
  }

  if (instance.stars < 5) {
    return { cost: [], ok: false, reason: "needs_stars" };
  }

  const nextProgress = getNextGoblinLevelProgress(goblin, instance.level);

  if (!nextProgress) {
    return { cost: [], ok: false, reason: "max_level" };
  }

  const cost = calculateGoblinUpgradeCost(goblin, instance.level, input.goblinHut, getGoblinHutLevel(roster), instance.stars);

  if (!hasEnoughResources(input.resources, cost)) {
    return { cost, ok: false, reason: "not_enough_resources" };
  }

  const upgradedInstance: GoblinRosterInstance = {
    ...instance,
    level: nextProgress.level,
    stars: nextProgress.stars
  };
  const instances = (roster.instances ?? []).map((item) => (item.id === instance.id ? upgradedInstance : item));

  return {
    cost,
    instance: upgradedInstance,
    ok: true,
    resources: deductResources(input.resources, cost),
    roster: {
      ...(roster.hutLevel ? { hutLevel: roster.hutLevel } : {}),
      hiredGoblinIds: roster.hiredGoblinIds,
      instances
    }
  };
}

export function upgradeGoblinHut(input: UpgradeGoblinHutInput): UpgradeGoblinHutResult {
  const roster = normalizeGoblinRoster(input.roster, input.goblins, input.goblinHut);
  const nextLevel = getNextGoblinHutLevelConfig(roster, input.goblinHut);

  if (!nextLevel) {
    return { cost: [], ok: false, reason: "max_level" };
  }

  const cost = normalizeResourceCost(nextLevel.upgradeCost ?? []);
  const unlocked = areUnlockRequirementsMet({
    goblins: input.goblins,
    progress: {
      resources: input.resources,
      builtMinesCount: input.builtMinesCount,
      completedMineTemplateIds: input.completedMineTemplateIds
    },
    requirements: nextLevel.unlockRequirements ?? [],
    roster
  });

  if (!unlocked) {
    return { cost, ok: false, reason: "locked" };
  }

  if (!hasEnoughResources(input.resources, cost)) {
    return { cost, ok: false, reason: "not_enough_resources" };
  }

  return {
    cost,
    ok: true,
    resources: deductResources(input.resources, cost),
    roster: {
      ...roster,
      hutLevel: nextLevel.level
    }
  };
}

export function calculateGoblinPrimaryStat(goblin: GoblinRosterGoblin, level = 1, stars: GoblinRosterStarRank = 0): number {
  const tier = getGoblinProgressionTier(goblin, level, stars);
  const baseValue = tier?.statValue ?? 0;
  const modifiers = tier?.modifiers ?? [];
  const flatBonus = modifiers
    .filter((modifier): modifier is Extract<GoblinRosterModifier, { type: "stat_bonus" }> => modifier.type === "stat_bonus")
    .filter((modifier) => modifier.stat === goblin.statKey)
    .reduce((total, modifier) => total + modifier.value, 0);
  const multiplier = modifiers
    .filter((modifier): modifier is Extract<GoblinRosterModifier, { type: "stat_multiplier" }> => modifier.type === "stat_multiplier")
    .filter((modifier) => modifier.stat === goblin.statKey)
    .reduce((total, modifier) => total * modifier.value, 1);

  return Math.max(0, Math.floor((baseValue + flatBonus) * multiplier));
}

export function calculateGoblinEffectiveModifiers(
  goblin: GoblinRosterGoblin,
  level = 1,
  stars: GoblinRosterStarRank = 0
): GoblinRosterModifier[] {
  return [...(getGoblinProgressionTier(goblin, level, stars)?.modifiers ?? [])];
}

export function calculateGoblinHitDamage(goblin: GoblinRosterGoblin, level = 1, stars: GoblinRosterStarRank = 0): number {
  return goblin.role === "miner" ? Math.max(1, calculateGoblinPrimaryStat(goblin, level, stars)) : 0;
}

export function calculateCrewHitDamage(input: CrewAutoDamageInput): number {
  return resolveHiredGoblinEntries(input.goblins, input.roster).reduce(
    (total, entry) => total + calculateGoblinHitDamage(entry.goblin, entry.instance.level, entry.instance.stars),
    0
  );
}

export function calculateCrewAutoDamagePerSecond(input: CrewAutoDamageInput): number {
  return calculateCrewHitDamage(input);
}

function areUnlockRequirementsMet(input: {
  goblins: GoblinRosterGoblin[];
  progress: GoblinRosterProgress;
  requirements: GoblinRosterUnlockRequirement[];
  roster: GoblinRosterState;
}): boolean {
  const hiredGoblins = resolveHiredGoblinEntries(input.goblins, input.roster);
  const completedMineTemplateIds = new Set(input.progress.completedMineTemplateIds ?? []);

  return input.requirements.every((requirement) => {
    switch (requirement.type) {
      case "built_mines_count":
        return (input.progress.builtMinesCount ?? 0) >= requirement.value;
      case "mine_completed":
        return completedMineTemplateIds.has(requirement.mineTemplateId);
      case "goblins_by_role":
        return hiredGoblins.filter((entry) => entry.goblin.role === requirement.role).length >= requirement.count;
      case "resource_collected":
        return (input.progress.resources[requirement.resourceId] ?? 0) >= requirement.amount;
    }
  });
}

function createFallbackGoblinHutLevel(): GoblinHutLevelConfig {
  return {
    hireCostMultiplier: 1,
    level: 1,
    maxHiredGoblins: Number.MAX_SAFE_INTEGER,
    unlockedRoles: ["miner", "collector", "foreman"],
    upgradeCost: [],
    upgradeCostMultiplier: 1,
    unlockRequirements: []
  };
}

function normalizeGoblinHutLevel(level: number, goblinHut?: GoblinHutConfig): number {
  if (!Number.isFinite(level)) {
    return 1;
  }

  const normalizedLevel = Math.max(1, Math.floor(level));

  if (!goblinHut || goblinHut.levels.length === 0) {
    return normalizedLevel;
  }

  const maxLevel = Math.max(...goblinHut.levels.map((item) => item.level));
  return Math.min(normalizedLevel, maxLevel);
}

function resolveHiredGoblinEntries(goblins: GoblinRosterGoblin[], roster: GoblinRosterState): Array<{
  goblin: GoblinRosterGoblin;
  instance: GoblinRosterInstance;
}> {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));
  const instanceById = new Map((roster.instances ?? []).map((instance) => [instance.id, instance]));

  return roster.hiredGoblinIds
    .map((id) => {
      const instance = instanceById.get(id);
      const goblin = instance ? goblinById.get(instance.goblinId) : undefined;
      return goblin && instance ? { goblin, instance } : undefined;
    })
    .filter((entry): entry is { goblin: GoblinRosterGoblin; instance: GoblinRosterInstance } => Boolean(entry));
}

function normalizeGoblinInstance(instance: GoblinRosterInstance, goblin: GoblinRosterGoblin): GoblinRosterInstance {
  return {
    assetId: typeof instance.assetId === "string" && instance.assetId.length > 0 ? instance.assetId : goblin.assetId,
    equipment: normalizeGoblinEquipment(instance.equipment),
    goblinId: goblin.id,
    id: typeof instance.id === "string" && instance.id.length > 0 ? instance.id : createGoblinInstanceId(goblin.id, 1),
    level: normalizeGoblinLevel(instance.level, calculateGoblinMaxLevel(goblin)),
    lifetimeStats: normalizeGoblinLifetimeStats(instance.lifetimeStats),
    role: goblin.role,
    stars: normalizeStarRank(instance.stars)
  };
}

function findRosterInstance(roster: GoblinRosterState, goblinId: string): GoblinRosterInstance | undefined {
  return (roster.instances ?? []).find((instance) => instance.id === goblinId) ?? (roster.instances ?? []).find((instance) => instance.goblinId === goblinId);
}

function getNextGoblinInstanceSequence(roster: GoblinRosterState, goblinId: string): number {
  const prefix = `goblin:${goblinId}:`;
  const maxSequence = (roster.instances ?? []).reduce((max, instance) => {
    if (!instance.id.startsWith(prefix)) {
      return max;
    }

    const sequence = Number.parseInt(instance.id.slice(prefix.length), 10);
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);

  return maxSequence + 1;
}

function createGoblinInstanceId(goblinId: string, sequence: number): string {
  return `goblin:${sanitizeInstanceIdPart(goblinId)}:${Math.max(1, Math.floor(sequence))}`;
}

function sanitizeInstanceIdPart(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]+/gu, "_").replace(/^_+|_+$/gu, "");
  return sanitized || "goblin";
}

function getGoblinProgressionTier(
  goblin: GoblinRosterGoblin,
  level: number,
  stars: GoblinRosterStarRank
): GoblinRosterProgressionStar | undefined {
  const normalizedLevel = normalizeGoblinLevel(level, calculateGoblinMaxLevel(goblin));
  const levelConfig = goblin.levels.find((item) => item.level === normalizedLevel) ?? goblin.levels[0];
  return levelConfig?.stars.find((item) => item.stars === stars) ?? levelConfig?.stars.find((item) => item.stars === 0);
}

function getNextGoblinLevelProgress(goblin: GoblinRosterGoblin, level: number): { level: number; stars: GoblinRosterStarRank } | null {
  const maxLevel = calculateGoblinMaxLevel(goblin);
  const normalizedLevel = normalizeGoblinLevel(level, maxLevel);

  if (normalizedLevel >= maxLevel) {
    return null;
  }

  return {
    level: normalizedLevel + 1,
    stars: 0
  };
}

function normalizeGoblinEquipment(value: unknown): GoblinRosterInstanceEquipment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) =>
    isRecord(item) && typeof item.itemId === "string" && item.itemId.length > 0 && typeof item.slot === "string" && item.slot.length > 0
      ? [{ itemId: item.itemId, slot: item.slot }]
      : []
  );
}

function normalizeGoblinLifetimeStats(value: unknown): GoblinRosterInstanceLifetimeStats {
  if (!isRecord(value)) {
    return {};
  }

  return {
    ...(typeof value.blocksDestroyed === "number" && Number.isFinite(value.blocksDestroyed)
      ? { blocksDestroyed: Math.max(0, Math.floor(value.blocksDestroyed)) }
      : {}),
    ...(typeof value.minesCompleted === "number" && Number.isFinite(value.minesCompleted)
      ? { minesCompleted: Math.max(0, Math.floor(value.minesCompleted)) }
      : {}),
    ...(isRecord(value.resourcesCollected) ? { resourcesCollected: normalizeResourceAmounts(value.resourcesCollected) } : {})
  };
}

function mergeGoblinLifetimeStats(
  target: GoblinRosterInstanceLifetimeStats,
  source: GoblinRosterInstanceLifetimeStats
): GoblinRosterInstanceLifetimeStats {
  const blocksDestroyed = sumOptionalPositiveIntegers(target.blocksDestroyed, source.blocksDestroyed);
  const minesCompleted = sumOptionalPositiveIntegers(target.minesCompleted, source.minesCompleted);
  const resourcesCollected = mergeResourceAmountRecords(target.resourcesCollected, source.resourcesCollected);

  return {
    ...(blocksDestroyed ? { blocksDestroyed } : {}),
    ...(minesCompleted ? { minesCompleted } : {}),
    ...(resourcesCollected ? { resourcesCollected } : {})
  };
}

function sumOptionalPositiveIntegers(left: number | undefined, right: number | undefined): number | undefined {
  const total = Math.max(0, Math.floor(left ?? 0)) + Math.max(0, Math.floor(right ?? 0));
  return total > 0 ? total : undefined;
}

function mergeResourceAmountRecords(
  target: Record<string, number> | undefined,
  source: Record<string, number> | undefined
): Record<string, number> | undefined {
  const merged = normalizeResourceAmounts({
    ...(target ?? {}),
    ...(source ?? {})
  });

  for (const [resourceId, amount] of Object.entries(target ?? {})) {
    merged[resourceId] = Math.max(0, Math.floor(amount)) + Math.max(0, Math.floor(source?.[resourceId] ?? 0));
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function normalizeResourceAmounts(value: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [resourceId, amount] of Object.entries(value)) {
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      result[resourceId] = Math.floor(amount);
    }
  }

  return result;
}

function hasEnoughResources(resources: Record<string, number>, cost: GoblinRosterResourceAmount[]): boolean {
  return cost.every((item) => (resources[item.resourceId] ?? 0) >= item.amount);
}

function deductResources(resources: Record<string, number>, cost: GoblinRosterResourceAmount[]): Record<string, number> {
  const nextResources = { ...resources };

  for (const item of cost) {
    nextResources[item.resourceId] = (nextResources[item.resourceId] ?? 0) - item.amount;
  }

  return nextResources;
}

function multiplyResourceCost(cost: GoblinRosterResourceAmount[], multiplier: number): GoblinRosterResourceAmount[] {
  return normalizeResourceCost(
    cost.map((item) => ({
      amount: Math.max(1, Math.ceil(item.amount * multiplier)),
      resourceId: item.resourceId
    }))
  );
}

function normalizeResourceCost(cost: GoblinRosterResourceAmount[]): GoblinRosterResourceAmount[] {
  const amounts = new Map<string, number>();

  for (const item of cost) {
    if (item.amount <= 0) {
      continue;
    }

    amounts.set(item.resourceId, (amounts.get(item.resourceId) ?? 0) + item.amount);
  }

  return Array.from(amounts.entries())
    .sort(([leftResourceId], [rightResourceId]) => leftResourceId.localeCompare(rightResourceId))
    .map(([resourceId, amount]) => ({
      amount,
      resourceId
    }));
}

function normalizeGoblinLevel(level: number, maxLevel: number): number {
  if (!Number.isFinite(level)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.floor(level)), Math.max(1, Math.floor(maxLevel)));
}

function normalizeStarRank(value: unknown): GoblinRosterStarRank {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value;
  }

  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
