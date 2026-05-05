export type GoblinRosterClass = "miner" | "builder" | "collector" | "foreman";
export type GoblinRosterRarity = "common" | "rare" | "epic" | "legendary";

export interface GoblinRosterResourceAmount {
  resourceId: string;
  amount: number;
}

export interface GoblinRosterBaseStats {
  strength: number;
  speed: number;
  luck: number;
  loyalty: number;
}

export interface GoblinRosterUpgradeCostConfig {
  resourceId: string;
  baseAmount: number;
  levelMultiplier: number;
  levelPower: number;
}

export interface GoblinRosterStatGrowth {
  strength?: number;
  speed?: number;
  luck?: number;
  loyalty?: number;
}

export interface GoblinRosterLevelingConfig {
  maxLevel: number;
  cost: GoblinRosterUpgradeCostConfig[];
  statGrowthPerLevel?: GoblinRosterStatGrowth;
  autoCollectSlotsPerLevel?: number;
  buildCostMultiplierPerLevel?: number;
  buildTimeMultiplierPerLevel?: number;
  offlineRelocationSlotsPerLevel?: number;
  mineCapacityMultiplierPerLevel?: number;
  mineProductionMultiplierPerLevel?: number;
}

export type GoblinRosterAbilityEffect =
  | {
      type: "damage_bonus_by_tag";
      tag: string;
      value: number;
    }
  | {
      type: "base_damage_bonus";
      value: number;
    }
  | {
      type: "build_cost_multiplier";
      value: number;
    }
  | {
      type: "auto_collect_slots";
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
      type: "auto_select_next_block";
      enabled: boolean;
    }
  | {
      type: "offline_relocation_slots";
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
      type: "goblins_by_class";
      class: GoblinRosterClass;
      count: number;
    }
  | {
      type: "resource_collected";
      resourceId: string;
      amount: number;
    };

export interface GoblinRosterAbility {
  id: string;
  descriptionKey?: string;
  effects: GoblinRosterAbilityEffect[];
  nameKey?: string;
}

export interface GoblinRosterGoblin {
  id: string;
  class: GoblinRosterClass;
  rarity?: GoblinRosterRarity;
  baseStats: GoblinRosterBaseStats;
  ability: GoblinRosterAbility;
  hireCost: GoblinRosterResourceAmount[];
  leveling?: GoblinRosterLevelingConfig;
  unlockRequirements: GoblinRosterUnlockRequirement[];
  sortOrder: number;
}

export interface GoblinRosterInstanceTrait {
  id: string;
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
  id: string;
  ability?: GoblinRosterAbility;
  archetypeId: string;
  assetId?: string;
  class: GoblinRosterClass;
  equipment: GoblinRosterInstanceEquipment[];
  level: number;
  lifetimeStats: GoblinRosterInstanceLifetimeStats;
  name?: string;
  nickname?: string;
  rarity: GoblinRosterRarity;
  leveling?: GoblinRosterLevelingConfig;
  rolledStats: GoblinRosterBaseStats;
  specialization?: string;
  traits: GoblinRosterInstanceTrait[];
}

export interface GoblinGenerationNamePool {
  names: string[];
  nicknames: string[];
}

export interface GoblinGenerationStatRange {
  max: number;
  min: number;
}

export interface GoblinGenerationStatRanges {
  loyalty: GoblinGenerationStatRange;
  luck: GoblinGenerationStatRange;
  speed: GoblinGenerationStatRange;
  strength: GoblinGenerationStatRange;
}

export interface GoblinGenerationRarityWeight {
  rarity: GoblinRosterRarity;
  statMultiplier?: number;
  weight: number;
}

export interface GoblinGenerationTraitConfig {
  id: string;
  weight: number;
}

export interface GoblinGenerationRenderConfig {
  assetId: string;
  rarity?: GoblinRosterRarity;
  weight: number;
}

export interface GoblinGenerationArchetypeConfig {
  ability?: GoblinRosterAbility;
  class: GoblinRosterClass;
  hireCost?: GoblinRosterResourceAmount[];
  id: string;
  leveling?: GoblinRosterLevelingConfig;
  rarityWeights: GoblinGenerationRarityWeight[];
  renderPool?: GoblinGenerationRenderConfig[];
  specialization?: string;
  statRanges: GoblinGenerationStatRanges;
  traitPool?: GoblinGenerationTraitConfig[];
}

export interface RollGoblinInstanceInput {
  archetype: GoblinGenerationArchetypeConfig;
  namePool: GoblinGenerationNamePool;
  seed: string;
  sequence?: number;
}

export interface GoblinHutLevelConfig {
  level: number;
  maxHiredGoblins: number;
  unlockedClasses: GoblinRosterClass[];
  hireCostMultiplier?: number;
  upgradeCost?: GoblinRosterResourceAmount[];
  upgradeCostMultiplier?: number;
  unlockRequirements?: GoblinRosterUnlockRequirement[];
}

export interface GoblinHutConfig {
  levels: GoblinHutLevelConfig[];
}

export interface GoblinRosterState {
  goblinLevels?: Record<string, number>;
  hutLevel?: number;
  hiredGoblinIds: string[];
  instances?: GoblinRosterInstance[];
}

export interface GoblinRosterProgress {
  resources: Record<string, number>;
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
}

export type HireGoblinFailureReason =
  | "missing_goblin"
  | "already_hired"
  | "hut_limit"
  | "locked"
  | "not_enough_resources"
  | "role_locked";
export type HireRandomGoblinFailureReason =
  | "missing_archetype"
  | "hut_limit"
  | "not_enough_resources"
  | "role_locked";
export type UpgradeGoblinFailureReason = "missing_goblin" | "not_hired" | "max_level" | "not_enough_resources";
export type UpgradeGoblinHutFailureReason = "max_level" | "locked" | "not_enough_resources";

export type HireGoblinResult =
  | {
      ok: true;
      roster: GoblinRosterState;
      resources: Record<string, number>;
    }
  | {
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

export type HireRandomGoblinResult =
  | {
      goblin: GoblinRosterGoblin;
      instance: GoblinRosterInstance;
      ok: true;
      resources: Record<string, number>;
      roster: GoblinRosterState;
    }
  | {
      cost: GoblinRosterResourceAmount[];
      ok: false;
      reason: HireRandomGoblinFailureReason;
    };

export interface HireRandomGoblinInput {
  archetypeId: string;
  archetypes: GoblinGenerationArchetypeConfig[];
  goblinHut?: GoblinHutConfig;
  goblins: GoblinRosterGoblin[];
  namePool: GoblinGenerationNamePool;
  resources: Record<string, number>;
  roster: GoblinRosterState;
  seed: string;
  sequence?: number;
}

export type UpgradeGoblinResult =
  | {
      ok: true;
      cost: GoblinRosterResourceAmount[];
      resources: Record<string, number>;
      roster: GoblinRosterState;
    }
  | {
      ok: false;
      cost: GoblinRosterResourceAmount[];
      reason: UpgradeGoblinFailureReason;
    };

export interface UpgradeGoblinInput {
  goblinId: string;
  goblinHut?: GoblinHutConfig;
  goblins: GoblinRosterGoblin[];
  resources: Record<string, number>;
  roster: GoblinRosterState;
}

export type UpgradeGoblinHutResult =
  | {
      ok: true;
      cost: GoblinRosterResourceAmount[];
      resources: Record<string, number>;
      roster: GoblinRosterState;
    }
  | {
      ok: false;
      cost: GoblinRosterResourceAmount[];
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

export interface CrewHitDamageInput {
  baseDamage?: number;
  blockTags?: string[];
  goblins: GoblinRosterGoblin[];
  roster: GoblinRosterState;
}

export interface CrewAutoDamageInput {
  blockTags?: string[];
  goblins: GoblinRosterGoblin[];
  roster: GoblinRosterState;
}

interface ResolvedHiredGoblin {
  goblin: GoblinRosterGoblin;
  instance: GoblinRosterInstance | undefined;
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
  const knownGoblinIds = new Set(goblinById.keys());
  const instanceIds = new Set((roster.instances ?? []).filter((instance) => knownGoblinIds.has(instance.archetypeId)).map((instance) => instance.id));
  const hiredGoblinIds = roster.hiredGoblinIds.filter(
    (id, index, ids) => (knownGoblinIds.has(id) || instanceIds.has(id)) && ids.indexOf(id) === index
  );
  const goblinLevels: Record<string, number> = {};
  const hutLevel = normalizeGoblinHutLevel(roster.hutLevel ?? 1, goblinHut);

  for (const goblinId of hiredGoblinIds) {
    const level = roster.goblinLevels?.[goblinId];

    if (typeof level !== "number") {
      continue;
    }

    const goblin = goblinById.get(goblinId);

    if (goblin) {
      const normalizedLevel = normalizeGoblinLevel(level, calculateGoblinMaxLevel(goblin));

      if (normalizedLevel > 1) {
        goblinLevels[goblinId] = normalizedLevel;
      }
    }
  }

  const normalizedRoster = {
    ...(Object.keys(goblinLevels).length > 0 ? { goblinLevels } : {}),
    ...(hutLevel > 1 ? { hutLevel } : {}),
    hiredGoblinIds
  };

  return roster.instances
    ? {
        ...normalizedRoster,
        instances: normalizeGoblinInstances(roster.instances, normalizedRoster, goblins)
      }
    : normalizedRoster;
}

export function isGoblinHired(roster: GoblinRosterState, goblinId: string): boolean {
  return roster.hiredGoblinIds.includes(goblinId) || Boolean(roster.instances?.some((instance) => instance.archetypeId === goblinId));
}

export function getHiredGoblinCount(roster: GoblinRosterState): number {
  return Math.max(roster.hiredGoblinIds.length, roster.instances?.length ?? 0);
}

export function getGoblinLevel(roster: GoblinRosterState, goblinId: string): number {
  const exactInstanceLevel = roster.instances?.find((instance) => instance.id === goblinId)?.level;
  const contractInstanceLevel = roster.instances?.find((instance) => instance.archetypeId === goblinId && !instance.id.startsWith("rolled:"))?.level;
  const instanceLevel = exactInstanceLevel ?? contractInstanceLevel;
  return Math.max(1, Math.floor(Math.max(instanceLevel ?? 1, roster.goblinLevels?.[goblinId] ?? 1)));
}

export function ensureGoblinRosterInstances(roster: GoblinRosterState, goblins: GoblinRosterGoblin[]): GoblinRosterState {
  return {
    ...roster,
    instances: normalizeGoblinInstances(roster.instances ?? [], roster, goblins)
  };
}

export function createGoblinContractInstance(
  goblin: GoblinRosterGoblin,
  level = 1,
  instanceId = createContractInstanceId(goblin.id)
): GoblinRosterInstance {
  return {
    archetypeId: goblin.id,
    class: goblin.class,
    equipment: [],
    id: instanceId,
    level: normalizeGoblinLevel(level, calculateGoblinMaxLevel(goblin)),
    lifetimeStats: {},
    rarity: goblin.rarity ?? "common",
    rolledStats: { ...goblin.baseStats },
    traits: []
  };
}

export function rollGoblinInstance(input: RollGoblinInstanceInput): GoblinRosterInstance {
  const sequence = Math.max(0, Math.floor(input.sequence ?? 0));
  const random = createSeededRandom(`${input.seed}:${input.archetype.id}:${sequence}`);
  const rarityWeight = pickWeighted(input.archetype.rarityWeights, random);
  const rarity = normalizeGoblinRarity(rarityWeight?.rarity);
  const statMultiplier = Math.max(0.01, rarityWeight?.statMultiplier ?? 1);
  const trait = pickWeighted(input.archetype.traitPool ?? [], random);
  const name = pickString(input.namePool.names, random);
  const nickname = pickString(input.namePool.nicknames, random);
  const rolledStats = {
    loyalty: rollStat(input.archetype.statRanges.loyalty, statMultiplier, random),
    luck: rollStat(input.archetype.statRanges.luck, statMultiplier, random),
    speed: rollStat(input.archetype.statRanges.speed, statMultiplier, random),
    strength: rollStat(input.archetype.statRanges.strength, statMultiplier, random)
  };
  const render = pickGoblinRender(input.archetype.renderPool ?? [], rarity, random);

  return {
    ...(input.archetype.ability ? { ability: cloneGoblinAbility(input.archetype.ability) } : {}),
    archetypeId: input.archetype.id,
    class: input.archetype.class,
    equipment: [],
    id: createRolledInstanceId(input.archetype.id, input.seed, sequence),
    ...(render ? { assetId: render.assetId } : {}),
    level: 1,
    ...(input.archetype.leveling ? { leveling: cloneGoblinLeveling(input.archetype.leveling) } : {}),
    lifetimeStats: {},
    name,
    nickname,
    rarity,
    rolledStats,
    ...(input.archetype.specialization ? { specialization: input.archetype.specialization } : {}),
    traits: trait ? [{ id: trait.id }] : []
  };
}

export function getGoblinHutLevel(roster: GoblinRosterState): number {
  return Math.max(1, Math.floor(roster.hutLevel ?? 1));
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

export function getGoblinHutLevelConfig(goblinHut: GoblinHutConfig | undefined, level: number): GoblinHutLevelConfig {
  if (!goblinHut || goblinHut.levels.length === 0) {
    return createFallbackGoblinHutLevel();
  }

  const normalizedLevel = normalizeGoblinHutLevel(level, goblinHut);
  const exactLevel = goblinHut.levels.find((item) => item.level === normalizedLevel);

  if (exactLevel) {
    return exactLevel;
  }

  return [...goblinHut.levels].sort((left, right) => right.level - left.level).find((item) => item.level <= normalizedLevel) ?? createFallbackGoblinHutLevel();
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

export function isGoblinClassUnlockedByHut(
  goblinClass: GoblinRosterClass,
  roster: GoblinRosterState,
  goblinHut?: GoblinHutConfig
): boolean {
  return getCurrentGoblinHutLevelConfig(roster, goblinHut).unlockedClasses.includes(goblinClass);
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
  if (isGoblinHired(input.roster, input.goblin.id)) {
    return false;
  }

  if (!isGoblinClassUnlockedByHut(input.goblin.class, input.roster, input.goblinHut)) {
    return false;
  }

  if (input.roster.hiredGoblinIds.length >= calculateGoblinHutMaxHired(input.roster, input.goblinHut)) {
    return false;
  }

  if (
    !isGoblinUnlocked({
      goblin: input.goblin,
      goblins: input.goblins,
      roster: input.roster,
      progress: {
        resources: input.resources,
        builtMinesCount: input.builtMinesCount,
        completedMineTemplateIds: input.completedMineTemplateIds
      }
    })
  ) {
    return false;
  }

  return hasEnoughResources(input.resources, calculateGoblinHireCost(input.goblin, input.roster, input.goblinHut));
}

export function hireGoblin(input: HireGoblinInput): HireGoblinResult {
  const goblin = input.goblins.find((item) => item.id === input.goblinId);

  if (!goblin) {
    return { ok: false, reason: "missing_goblin" };
  }

  const roster = normalizeGoblinRoster(input.roster, input.goblins, input.goblinHut);

  if (isGoblinHired(roster, input.goblinId)) {
    return { ok: false, reason: "already_hired" };
  }

  if (!isGoblinClassUnlockedByHut(goblin.class, roster, input.goblinHut)) {
    return { ok: false, reason: "role_locked" };
  }

  if (roster.hiredGoblinIds.length >= calculateGoblinHutMaxHired(roster, input.goblinHut)) {
    return { ok: false, reason: "hut_limit" };
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
    return { ok: false, reason: "locked" };
  }

  const hireCost = calculateGoblinHireCost(goblin, roster, input.goblinHut);

  if (!hasEnoughResources(input.resources, hireCost)) {
    return { ok: false, reason: "not_enough_resources" };
  }

  return {
    ok: true,
    roster: {
      ...(roster.goblinLevels ? { goblinLevels: { ...roster.goblinLevels, [input.goblinId]: 1 } } : {}),
      ...(roster.hutLevel ? { hutLevel: roster.hutLevel } : {}),
      hiredGoblinIds: [...roster.hiredGoblinIds, input.goblinId],
      instances: addGoblinContractInstance(roster.instances ?? [], goblin, 1)
    },
    resources: deductResources(input.resources, hireCost)
  };
}

export function calculateGoblinMaxLevel(goblin: GoblinRosterGoblin): number {
  return Math.max(1, Math.floor(goblin.leveling?.maxLevel ?? 1));
}

export function hireRandomGoblin(input: HireRandomGoblinInput): HireRandomGoblinResult {
  const archetype = input.archetypes.find((item) => item.id === input.archetypeId);

  if (!archetype) {
    return { cost: [], ok: false, reason: "missing_archetype" };
  }

  const goblin = input.goblins.find((item) => item.id === archetype.id);
  const roster = ensureGoblinRosterInstances(normalizeGoblinRoster(input.roster, input.goblins, input.goblinHut), input.goblins);
  const cost = calculateGoblinGenerationHireCost(archetype, roster, input.goblinHut);

  if (!goblin || goblin.class !== archetype.class) {
    return { cost, ok: false, reason: "missing_archetype" };
  }

  if (!isGoblinClassUnlockedByHut(archetype.class, roster, input.goblinHut)) {
    return { cost, ok: false, reason: "role_locked" };
  }

  if (getHiredGoblinCount(roster) >= calculateGoblinHutMaxHired(roster, input.goblinHut)) {
    return { cost, ok: false, reason: "hut_limit" };
  }

  if (!hasEnoughResources(input.resources, cost)) {
    return { cost, ok: false, reason: "not_enough_resources" };
  }

  const sequence = input.sequence ?? countRolledGoblinInstances(roster.instances ?? []);
  const instance = rollGoblinInstance({
    archetype,
    namePool: input.namePool,
    seed: input.seed,
    sequence
  });

  return {
    goblin,
    instance,
    ok: true,
    resources: deductResources(input.resources, cost),
    roster: {
      ...roster,
      hiredGoblinIds: [...roster.hiredGoblinIds, instance.id],
      instances: [...(roster.instances ?? []), instance]
    }
  };
}

export function calculateGoblinHireCost(
  goblin: GoblinRosterGoblin,
  roster: GoblinRosterState,
  goblinHut?: GoblinHutConfig
): GoblinRosterResourceAmount[] {
  const multiplier = getCurrentGoblinHutLevelConfig(roster, goblinHut).hireCostMultiplier ?? 1;

  return normalizeResourceCost(
    goblin.hireCost.map((cost) => ({
      amount: Math.ceil(cost.amount * multiplier),
      resourceId: cost.resourceId
    }))
  );
}

export function calculateGoblinGenerationHireCost(
  archetype: GoblinGenerationArchetypeConfig,
  roster: GoblinRosterState,
  goblinHut?: GoblinHutConfig
): GoblinRosterResourceAmount[] {
  if (getHiredGoblinCount(roster) === 0) {
    return [];
  }

  const multiplier = getCurrentGoblinHutLevelConfig(roster, goblinHut).hireCostMultiplier ?? 1;

  return normalizeResourceCost(
    (archetype.hireCost ?? []).map((cost) => ({
      amount: Math.ceil(cost.amount * multiplier),
      resourceId: cost.resourceId
    }))
  );
}

export function calculateGoblinUpgradeCost(
  goblin: GoblinRosterGoblin,
  currentLevel: number,
  goblinHut?: GoblinHutConfig,
  hutLevel = 1
): GoblinRosterResourceAmount[] {
  const maxLevel = calculateGoblinMaxLevel(goblin);
  const level = normalizeGoblinLevel(currentLevel, maxLevel);
  const multiplier = getGoblinHutLevelConfig(goblinHut, hutLevel).upgradeCostMultiplier ?? 1;

  if (level >= maxLevel) {
    return [];
  }

  return normalizeResourceCost(
    (goblin.leveling?.cost ?? []).map((cost) => ({
      amount: Math.ceil(cost.baseAmount * (Math.max(1, level) * cost.levelMultiplier) ** cost.levelPower * multiplier),
      resourceId: cost.resourceId
    }))
  );
}

export function calculateGoblinEffectiveBaseStats(
  goblin: GoblinRosterGoblin,
  level = 1,
  baseStats: GoblinRosterBaseStats = goblin.baseStats
): GoblinRosterBaseStats {
  const effectiveLevel = normalizeGoblinLevel(level, calculateGoblinMaxLevel(goblin));
  const levelDelta = Math.max(0, effectiveLevel - 1);
  const growth = goblin.leveling?.statGrowthPerLevel ?? {};

  return {
    loyalty: Math.max(0, Math.floor(baseStats.loyalty + (growth.loyalty ?? 0) * levelDelta)),
    luck: Math.max(0, Math.floor(baseStats.luck + (growth.luck ?? 0) * levelDelta)),
    speed: Math.max(0, Math.floor(baseStats.speed + (growth.speed ?? 0) * levelDelta)),
    strength: Math.max(0, Math.floor(baseStats.strength + (growth.strength ?? 0) * levelDelta))
  };
}

export function calculateGoblinEffectiveAbilityEffects(
  goblin: GoblinRosterGoblin,
  level = 1
): GoblinRosterAbilityEffect[] {
  const effectiveLevel = normalizeGoblinLevel(level, calculateGoblinMaxLevel(goblin));
  const levelDelta = Math.max(0, effectiveLevel - 1);
  const slotGrowth = goblin.leveling?.autoCollectSlotsPerLevel ?? 0;
  const buildCostGrowth = goblin.leveling?.buildCostMultiplierPerLevel ?? 0;
  const buildTimeGrowth = goblin.leveling?.buildTimeMultiplierPerLevel ?? 0;
  const offlineRelocationGrowth = goblin.leveling?.offlineRelocationSlotsPerLevel ?? 0;
  const capacityGrowth = goblin.leveling?.mineCapacityMultiplierPerLevel ?? 0;
  const productionGrowth = goblin.leveling?.mineProductionMultiplierPerLevel ?? 0;

  return goblin.ability.effects.map((effect) => {
    if (effect.type === "auto_collect_slots") {
      return {
        ...effect,
        value: Math.max(1, effect.value + Math.floor(levelDelta * slotGrowth))
      };
    }

    if (effect.type === "mine_capacity_multiplier") {
      return {
        ...effect,
        value: Math.max(0, effect.value + levelDelta * capacityGrowth)
      };
    }

    if (effect.type === "mine_production_multiplier") {
      return {
        ...effect,
        value: Math.max(0, effect.value + levelDelta * productionGrowth)
      };
    }

    if (effect.type === "build_cost_multiplier") {
      return {
        ...effect,
        value: Math.max(0.01, effect.value - levelDelta * buildCostGrowth)
      };
    }

    if (effect.type === "build_time_multiplier") {
      return {
        ...effect,
        value: Math.max(0.01, effect.value - levelDelta * buildTimeGrowth)
      };
    }

    if (effect.type === "offline_relocation_slots") {
      return {
        ...effect,
        value: Math.max(1, effect.value + Math.floor(levelDelta * offlineRelocationGrowth))
      };
    }

    return effect;
  });
}

export function upgradeGoblin(input: UpgradeGoblinInput): UpgradeGoblinResult {
  const roster = normalizeGoblinRoster(input.roster, input.goblins, input.goblinHut);
  const instance = roster.instances?.find((item) => item.id === input.goblinId);
  const archetypeId = instance?.archetypeId ?? input.goblinId;
  const archetype = input.goblins.find((item) => item.id === archetypeId);
  const goblin = archetype ? createEffectiveGoblinFromInstance(archetype, instance) : undefined;

  if (!goblin) {
    return { ok: false, cost: [], reason: "missing_goblin" };
  }

  if (!isGoblinHired(roster, input.goblinId)) {
    return { ok: false, cost: [], reason: "not_hired" };
  }

  const currentLevel = instance?.level ?? getGoblinLevel(roster, input.goblinId);
  const maxLevel = calculateGoblinMaxLevel(goblin);
  const cost = calculateGoblinUpgradeCost(goblin, currentLevel, input.goblinHut, getGoblinHutLevel(roster));

  if (currentLevel >= maxLevel) {
    return { ok: false, cost, reason: "max_level" };
  }

  if (!hasEnoughResources(input.resources, cost)) {
    return { ok: false, cost, reason: "not_enough_resources" };
  }

  const nextLevel = normalizeGoblinLevel(currentLevel + 1, maxLevel);

  return {
    ok: true,
    cost,
    resources: deductResources(input.resources, cost),
    roster: {
      ...roster,
      ...(instance
        ? {}
        : {
            goblinLevels: {
              ...(roster.goblinLevels ?? {}),
              [input.goblinId]: nextLevel
            }
          }),
      ...(roster.instances ? { instances: updateGoblinInstanceLevel(roster.instances, input.goblinId, nextLevel) } : {})
    }
  };
}

export function canUpgradeGoblinHut(input: UpgradeGoblinHutInput): boolean {
  const roster = normalizeGoblinRoster(input.roster, input.goblins, input.goblinHut);
  const nextLevel = getNextGoblinHutLevelConfig(roster, input.goblinHut);

  if (!nextLevel) {
    return false;
  }

  if (
    !areUnlockRequirementsMet({
      goblins: input.goblins,
      progress: {
        resources: input.resources,
        builtMinesCount: input.builtMinesCount,
        completedMineTemplateIds: input.completedMineTemplateIds
      },
      requirements: nextLevel.unlockRequirements ?? [],
      roster
    })
  ) {
    return false;
  }

  return hasEnoughResources(input.resources, nextLevel.upgradeCost ?? []);
}

export function upgradeGoblinHut(input: UpgradeGoblinHutInput): UpgradeGoblinHutResult {
  const roster = normalizeGoblinRoster(input.roster, input.goblins, input.goblinHut);
  const nextLevel = getNextGoblinHutLevelConfig(roster, input.goblinHut);

  if (!nextLevel) {
    return { ok: false, cost: [], reason: "max_level" };
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
    return { ok: false, cost, reason: "locked" };
  }

  if (!hasEnoughResources(input.resources, cost)) {
    return { ok: false, cost, reason: "not_enough_resources" };
  }

  return {
    ok: true,
    cost,
    resources: deductResources(input.resources, cost),
    roster: {
      ...roster,
      hutLevel: nextLevel.level
    }
  };
}

export function calculateGoblinHitDamage(
  goblin: GoblinRosterGoblin,
  blockTags: string[] = [],
  level = 1,
  baseStats: GoblinRosterBaseStats = goblin.baseStats
): number {
  const effectiveStats = calculateGoblinEffectiveBaseStats(goblin, level, baseStats);
  const baseDamage = effectiveStats.strength + effectiveStats.speed / 2;
  let flatBonus = 0;
  let multiplierBonus = 0;
  const blockTagSet = new Set(blockTags);

  for (const effect of calculateGoblinEffectiveAbilityEffects(goblin, level)) {
    if (effect.type === "base_damage_bonus") {
      flatBonus += effect.value;
    }

    if (effect.type === "damage_bonus_by_tag" && blockTagSet.has(effect.tag)) {
      multiplierBonus += effect.value;
    }
  }

  return Math.max(1, Math.ceil((baseDamage + flatBonus) * (1 + multiplierBonus)));
}

export function calculateCrewHitDamage(input: CrewHitDamageInput): number {
  const baseDamage = input.baseDamage ?? 0;
  const crewDamage = resolveHiredGoblinEntries(input.goblins, input.roster).reduce(
    (total, entry) =>
      total +
      calculateGoblinHitDamage(
        entry.goblin,
        input.blockTags ?? [],
        entry.instance?.level ?? getGoblinLevel(input.roster, entry.goblin.id),
        entry.instance?.rolledStats ?? entry.goblin.baseStats
      ),
    0
  );

  return Math.max(0, Math.ceil(baseDamage + crewDamage));
}

export function calculateCrewAutoDamagePerSecond(input: CrewAutoDamageInput): number {
  const crewDamage = calculateCrewHitDamage({
    blockTags: input.blockTags,
    goblins: input.goblins,
    roster: input.roster
  });

  if (crewDamage === 0) {
    return 0;
  }

  return Math.max(1, Math.floor(crewDamage * 0.35));
}

function areUnlockRequirementsMet(input: {
  goblins: GoblinRosterGoblin[];
  progress: GoblinRosterProgress;
  requirements: GoblinRosterUnlockRequirement[];
  roster: GoblinRosterState;
}): boolean {
  const hiredGoblins = resolveHiredGoblins(input.goblins, input.roster);
  const completedMineTemplateIds = new Set(input.progress.completedMineTemplateIds ?? []);

  return input.requirements.every((requirement) => {
    switch (requirement.type) {
      case "built_mines_count":
        return (input.progress.builtMinesCount ?? 0) >= requirement.value;
      case "mine_completed":
        return completedMineTemplateIds.has(requirement.mineTemplateId);
      case "goblins_by_class":
        return hiredGoblins.filter((goblin) => goblin.class === requirement.class).length >= requirement.count;
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
    unlockedClasses: ["miner", "builder", "collector", "foreman"],
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

function resolveHiredGoblins(goblins: GoblinRosterGoblin[], roster: GoblinRosterState): GoblinRosterGoblin[] {
  return resolveHiredGoblinEntries(goblins, roster).map((entry) => entry.goblin);
}

function resolveHiredGoblinEntries(goblins: GoblinRosterGoblin[], roster: GoblinRosterState): ResolvedHiredGoblin[] {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));
  const instanceById = new Map((roster.instances ?? []).map((instance) => [instance.id, instance]));
  const contractInstanceByArchetypeId = new Map(
    (roster.instances ?? [])
      .filter((instance) => !instance.id.startsWith("rolled:"))
      .map((instance) => [instance.archetypeId, instance])
  );

  return roster.hiredGoblinIds
    .map((id) => {
      const contractGoblin = goblinById.get(id);

      if (contractGoblin) {
        return {
          goblin: contractGoblin,
          instance: instanceById.get(id) ?? contractInstanceByArchetypeId.get(id)
        };
      }

      const instance = instanceById.get(id);
      const goblin = instance ? goblinById.get(instance.archetypeId) : undefined;
      return goblin && instance ? { goblin: createEffectiveGoblinFromInstance(goblin, instance), instance } : undefined;
    })
    .filter((entry): entry is ResolvedHiredGoblin => Boolean(entry));
}

function normalizeGoblinInstances(
  instances: readonly GoblinRosterInstance[],
  roster: GoblinRosterState,
  goblins: GoblinRosterGoblin[]
): GoblinRosterInstance[] {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));
  const instanceById = new Map(instances.map((instance) => [instance.id, instance]));
  const contractInstanceByArchetypeId = new Map(
    instances
      .filter((instance) => !instance.id.startsWith("rolled:"))
      .map((instance) => [instance.archetypeId, instance])
  );
  return roster.hiredGoblinIds.flatMap((hiredId) => {
    const instance = instanceById.get(hiredId);
    const archetypeId = instance?.archetypeId ?? hiredId;
    const goblin = goblinById.get(archetypeId);

    if (!goblin) {
      return [];
    }

    const sourceInstance = instance ?? contractInstanceByArchetypeId.get(hiredId);

    if (!sourceInstance) {
      return [];
    }

    const level = getGoblinLevel(
      {
        goblinLevels: roster.goblinLevels,
        hiredGoblinIds: roster.hiredGoblinIds
      },
      archetypeId
    );

    return [normalizeGoblinInstance(sourceInstance, goblin, level)];
  });
}

function normalizeGoblinInstance(
  instance: GoblinRosterInstance | undefined,
  goblin: GoblinRosterGoblin,
  level: number
): GoblinRosterInstance {
  const maxLevel = calculateGoblinMaxLevel(goblin);
  const normalizedLevel = normalizeGoblinLevel(Math.max(instance?.level ?? 1, level), maxLevel);
  const ability = normalizeGoblinAbilitySnapshot(instance?.ability);
  const leveling = normalizeGoblinLevelingSnapshot(instance?.leveling);

  return {
    ...(ability ? { ability } : {}),
    archetypeId: goblin.id,
    class: goblin.class,
    equipment: normalizeGoblinEquipment(instance?.equipment),
    id: typeof instance?.id === "string" && instance.id.length > 0 ? instance.id : createContractInstanceId(goblin.id),
    ...(typeof instance?.assetId === "string" && instance.assetId.trim() ? { assetId: instance.assetId.trim() } : {}),
    level: normalizedLevel,
    ...(leveling ? { leveling } : {}),
    lifetimeStats: normalizeGoblinLifetimeStats(instance?.lifetimeStats),
    ...(typeof instance?.name === "string" && instance.name.trim() ? { name: instance.name.trim() } : {}),
    ...(typeof instance?.nickname === "string" && instance.nickname.trim() ? { nickname: instance.nickname.trim() } : {}),
    rarity: normalizeGoblinRarity(instance?.rarity ?? goblin.rarity),
    rolledStats: normalizeGoblinBaseStats(instance?.rolledStats, goblin.baseStats),
    ...(typeof instance?.specialization === "string" && instance.specialization.trim() ? { specialization: instance.specialization.trim() } : {}),
    traits: normalizeGoblinTraits(instance?.traits)
  };
}

function createEffectiveGoblinFromInstance(
  goblin: GoblinRosterGoblin,
  instance: GoblinRosterInstance | undefined
): GoblinRosterGoblin {
  return {
    ...goblin,
    ...(instance?.ability ? { ability: instance.ability } : {}),
    ...(instance?.leveling ? { leveling: instance.leveling } : {})
  };
}

function addGoblinContractInstance(
  instances: readonly GoblinRosterInstance[],
  goblin: GoblinRosterGoblin,
  level: number
): GoblinRosterInstance[] {
  if (instances.some((instance) => instance.archetypeId === goblin.id && !instance.id.startsWith("rolled:"))) {
    return [...instances];
  }

  return [...instances, createGoblinContractInstance(goblin, level)];
}

function countRolledGoblinInstances(instances: readonly GoblinRosterInstance[]): number {
  return instances.filter((instance) => instance.id.startsWith("rolled:")).length;
}

function updateGoblinInstanceLevel(
  instances: readonly GoblinRosterInstance[],
  goblinId: string,
  level: number
): GoblinRosterInstance[] {
  return instances.map((instance) => {
    const matchesExactInstance = instance.id === goblinId;
    const matchesContractInstance = !goblinId.startsWith("rolled:") && instance.archetypeId === goblinId && !instance.id.startsWith("rolled:");
    return matchesExactInstance || matchesContractInstance ? { ...instance, level } : instance;
  });
}

function createContractInstanceId(goblinId: string): string {
  return `contract:${goblinId}`;
}

function createRolledInstanceId(archetypeId: string, seed: string, sequence: number): string {
  return `rolled:${sanitizeInstanceIdPart(archetypeId)}:${hashSeedText(`${seed}:${sequence}`).toString(36)}`;
}

function sanitizeInstanceIdPart(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]+/gu, "_").replace(/^_+|_+$/gu, "");
  return sanitized || "goblin";
}

function cloneGoblinAbility(ability: GoblinRosterAbility): GoblinRosterAbility {
  return {
    ...ability,
    effects: ability.effects.map((effect) => ({ ...effect }))
  };
}

function cloneGoblinLeveling(leveling: GoblinRosterLevelingConfig): GoblinRosterLevelingConfig {
  return {
    ...leveling,
    cost: (leveling.cost ?? []).map((cost) => ({ ...cost })),
    statGrowthPerLevel: {
      ...(leveling.statGrowthPerLevel ?? {})
    }
  };
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeedText(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeedText(seed: string): number {
  let state = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    state = Math.imul(state ^ seed.charCodeAt(index), 16777619);
  }

  return state >>> 0;
}

function pickWeighted<T extends { weight: number }>(items: readonly T[], random: () => number): T | undefined {
  const weightedItems = items.filter((item) => Number.isFinite(item.weight) && item.weight > 0);
  const totalWeight = weightedItems.reduce((total, item) => total + item.weight, 0);

  if (weightedItems.length === 0 || totalWeight <= 0) {
    return undefined;
  }

  let cursor = random() * totalWeight;

  for (const item of weightedItems) {
    cursor -= item.weight;

    if (cursor <= 0) {
      return item;
    }
  }

  return weightedItems[weightedItems.length - 1];
}

function pickString(items: readonly string[], random: () => number): string | undefined {
  const availableItems = items.map((item) => item.trim()).filter(Boolean);

  if (availableItems.length === 0) {
    return undefined;
  }

  return availableItems[Math.floor(random() * availableItems.length) % availableItems.length];
}

function pickGoblinRender(
  items: readonly GoblinGenerationRenderConfig[],
  rarity: GoblinRosterRarity,
  random: () => number
): GoblinGenerationRenderConfig | undefined {
  const rarityItems = items.filter((item) => !item.rarity || item.rarity === rarity);
  return pickWeighted(rarityItems.length > 0 ? rarityItems : items, random);
}

function rollStat(range: GoblinGenerationStatRange, multiplier: number, random: () => number): number {
  const min = normalizeStat(range.min, 0);
  const max = normalizeStat(range.max, min);
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const rolled = low + Math.floor(random() * (high - low + 1));

  return Math.max(0, Math.floor(rolled * multiplier));
}

function normalizeGoblinRarity(value: unknown): GoblinRosterRarity {
  return value === "rare" || value === "epic" || value === "legendary" ? value : "common";
}

function normalizeGoblinBaseStats(
  value: GoblinRosterBaseStats | undefined,
  fallback: GoblinRosterBaseStats
): GoblinRosterBaseStats {
  return {
    loyalty: normalizeStat(value?.loyalty, fallback.loyalty),
    luck: normalizeStat(value?.luck, fallback.luck),
    speed: normalizeStat(value?.speed, fallback.speed),
    strength: normalizeStat(value?.strength, fallback.strength)
  };
}

function normalizeStat(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function positiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeGoblinTraits(value: unknown): GoblinRosterInstanceTrait[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set<string>();
  const traits: GoblinRosterInstanceTrait[] = [];

  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string" || item.id.length === 0 || seenIds.has(item.id)) {
      continue;
    }

    seenIds.add(item.id);
    traits.push({ id: item.id });
  }

  return traits;
}

function normalizeGoblinAbilitySnapshot(value: unknown): GoblinRosterAbility | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = stringValue(value.id);
  const nameKey = stringValue(value.nameKey);
  const descriptionKey = stringValue(value.descriptionKey);

  if (!id || !Array.isArray(value.effects)) {
    return undefined;
  }

  return {
    effects: value.effects.filter((effect): effect is GoblinRosterAbilityEffect => isRecord(effect) && Boolean(stringValue(effect.type))),
    id,
    ...(descriptionKey ? { descriptionKey } : {}),
    ...(nameKey ? { nameKey } : {})
  };
}

function normalizeGoblinLevelingSnapshot(value: unknown): GoblinRosterLevelingConfig | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    autoCollectSlotsPerLevel: positiveNumber(value.autoCollectSlotsPerLevel, 0),
    buildCostMultiplierPerLevel: positiveNumber(value.buildCostMultiplierPerLevel, 0),
    buildTimeMultiplierPerLevel: positiveNumber(value.buildTimeMultiplierPerLevel, 0),
    cost: normalizeGoblinLevelingCost(value.cost),
    maxLevel: Math.max(1, normalizeStat(value.maxLevel, 1)),
    mineCapacityMultiplierPerLevel: positiveNumber(value.mineCapacityMultiplierPerLevel, 0),
    mineProductionMultiplierPerLevel: positiveNumber(value.mineProductionMultiplierPerLevel, 0),
    offlineRelocationSlotsPerLevel: positiveNumber(value.offlineRelocationSlotsPerLevel, 0),
    statGrowthPerLevel: normalizeGoblinStatGrowth(value.statGrowthPerLevel)
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

function normalizeGoblinLevelingCost(value: unknown): GoblinRosterUpgradeCostConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || !stringValue(item.resourceId)) {
      return [];
    }

    return [
      {
        baseAmount: Math.max(1, normalizeStat(item.baseAmount, 1)),
        levelMultiplier: positiveNumber(item.levelMultiplier, 1),
        levelPower: positiveNumber(item.levelPower, 1),
        resourceId: stringValue(item.resourceId)
      }
    ];
  });
}

function normalizeGoblinStatGrowth(value: unknown): GoblinRosterStatGrowth {
  if (!isRecord(value)) {
    return {};
  }

  return {
    loyalty: positiveNumber(value.loyalty, 0),
    luck: positiveNumber(value.luck, 0),
    speed: positiveNumber(value.speed, 0),
    strength: positiveNumber(value.strength, 0)
  };
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

function normalizeResourceAmounts(value: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [resourceId, amount] of Object.entries(value)) {
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      result[resourceId] = Math.floor(amount);
    }
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
