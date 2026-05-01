export type GoblinRosterClass = "miner" | "builder" | "collector" | "foreman";

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
  effects: GoblinRosterAbilityEffect[];
}

export interface GoblinRosterGoblin {
  id: string;
  class: GoblinRosterClass;
  baseStats: GoblinRosterBaseStats;
  ability: GoblinRosterAbility;
  hireCost: GoblinRosterResourceAmount[];
  leveling?: GoblinRosterLevelingConfig;
  unlockRequirements: GoblinRosterUnlockRequirement[];
  sortOrder: number;
}

export interface GoblinRosterState {
  goblinLevels?: Record<string, number>;
  hiredGoblinIds: string[];
}

export interface GoblinRosterProgress {
  resources: Record<string, number>;
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
}

export type HireGoblinFailureReason = "missing_goblin" | "already_hired" | "locked" | "not_enough_resources";
export type UpgradeGoblinFailureReason = "missing_goblin" | "not_hired" | "max_level" | "not_enough_resources";

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
  goblins: GoblinRosterGoblin[];
  roster: GoblinRosterState;
  resources: Record<string, number>;
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
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

export function createInitialGoblinRoster(goblins: GoblinRosterGoblin[]): GoblinRosterState {
  const firstFreeGoblin = [...goblins]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .find((goblin) => goblin.hireCost.length === 0 && goblin.unlockRequirements.length === 0);

  return {
    hiredGoblinIds: firstFreeGoblin ? [firstFreeGoblin.id] : []
  };
}

export function normalizeGoblinRoster(roster: GoblinRosterState, goblins: GoblinRosterGoblin[]): GoblinRosterState {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));
  const knownGoblinIds = new Set(goblinById.keys());
  const hiredGoblinIds = roster.hiredGoblinIds.filter((id, index, ids) => knownGoblinIds.has(id) && ids.indexOf(id) === index);
  const goblinLevels: Record<string, number> = {};

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

  return Object.keys(goblinLevels).length > 0 ? { goblinLevels, hiredGoblinIds } : { hiredGoblinIds };
}

export function isGoblinHired(roster: GoblinRosterState, goblinId: string): boolean {
  return roster.hiredGoblinIds.includes(goblinId);
}

export function getGoblinLevel(roster: GoblinRosterState, goblinId: string): number {
  return Math.max(1, Math.floor(roster.goblinLevels?.[goblinId] ?? 1));
}

export function isGoblinUnlocked(input: {
  goblin: GoblinRosterGoblin;
  goblins: GoblinRosterGoblin[];
  progress: GoblinRosterProgress;
  roster: GoblinRosterState;
}): boolean {
  const hiredGoblins = resolveHiredGoblins(input.goblins, input.roster);
  const completedMineTemplateIds = new Set(input.progress.completedMineTemplateIds ?? []);

  return input.goblin.unlockRequirements.every((requirement) => {
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

export function canHireGoblin(input: {
  goblin: GoblinRosterGoblin;
  goblins: GoblinRosterGoblin[];
  resources: Record<string, number>;
  roster: GoblinRosterState;
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
}): boolean {
  if (isGoblinHired(input.roster, input.goblin.id)) {
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

  return hasEnoughResources(input.resources, input.goblin.hireCost);
}

export function hireGoblin(input: HireGoblinInput): HireGoblinResult {
  const goblin = input.goblins.find((item) => item.id === input.goblinId);

  if (!goblin) {
    return { ok: false, reason: "missing_goblin" };
  }

  const roster = normalizeGoblinRoster(input.roster, input.goblins);

  if (isGoblinHired(roster, input.goblinId)) {
    return { ok: false, reason: "already_hired" };
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

  if (!hasEnoughResources(input.resources, goblin.hireCost)) {
    return { ok: false, reason: "not_enough_resources" };
  }

  return {
    ok: true,
    roster: {
      ...(roster.goblinLevels ? { goblinLevels: { ...roster.goblinLevels, [input.goblinId]: 1 } } : {}),
      hiredGoblinIds: [...roster.hiredGoblinIds, input.goblinId]
    },
    resources: deductResources(input.resources, goblin.hireCost)
  };
}

export function calculateGoblinMaxLevel(goblin: GoblinRosterGoblin): number {
  return Math.max(1, Math.floor(goblin.leveling?.maxLevel ?? 1));
}

export function calculateGoblinUpgradeCost(goblin: GoblinRosterGoblin, currentLevel: number): GoblinRosterResourceAmount[] {
  const maxLevel = calculateGoblinMaxLevel(goblin);
  const level = normalizeGoblinLevel(currentLevel, maxLevel);

  if (level >= maxLevel) {
    return [];
  }

  return normalizeResourceCost(
    (goblin.leveling?.cost ?? []).map((cost) => ({
      amount: Math.ceil(cost.baseAmount * (Math.max(1, level) * cost.levelMultiplier) ** cost.levelPower),
      resourceId: cost.resourceId
    }))
  );
}

export function calculateGoblinEffectiveBaseStats(goblin: GoblinRosterGoblin, level = 1): GoblinRosterBaseStats {
  const effectiveLevel = normalizeGoblinLevel(level, calculateGoblinMaxLevel(goblin));
  const levelDelta = Math.max(0, effectiveLevel - 1);
  const growth = goblin.leveling?.statGrowthPerLevel ?? {};

  return {
    loyalty: Math.max(0, Math.floor(goblin.baseStats.loyalty + (growth.loyalty ?? 0) * levelDelta)),
    luck: Math.max(0, Math.floor(goblin.baseStats.luck + (growth.luck ?? 0) * levelDelta)),
    speed: Math.max(0, Math.floor(goblin.baseStats.speed + (growth.speed ?? 0) * levelDelta)),
    strength: Math.max(0, Math.floor(goblin.baseStats.strength + (growth.strength ?? 0) * levelDelta))
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

    return effect;
  });
}

export function upgradeGoblin(input: UpgradeGoblinInput): UpgradeGoblinResult {
  const goblin = input.goblins.find((item) => item.id === input.goblinId);

  if (!goblin) {
    return { ok: false, cost: [], reason: "missing_goblin" };
  }

  const roster = normalizeGoblinRoster(input.roster, input.goblins);

  if (!isGoblinHired(roster, input.goblinId)) {
    return { ok: false, cost: [], reason: "not_hired" };
  }

  const currentLevel = getGoblinLevel(roster, input.goblinId);
  const maxLevel = calculateGoblinMaxLevel(goblin);
  const cost = calculateGoblinUpgradeCost(goblin, currentLevel);

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
      goblinLevels: {
        ...(roster.goblinLevels ?? {}),
        [input.goblinId]: nextLevel
      }
    }
  };
}

export function calculateGoblinHitDamage(goblin: GoblinRosterGoblin, blockTags: string[] = [], level = 1): number {
  const effectiveStats = calculateGoblinEffectiveBaseStats(goblin, level);
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
  const crewDamage = resolveHiredGoblins(input.goblins, input.roster).reduce(
    (total, goblin) => total + calculateGoblinHitDamage(goblin, input.blockTags ?? [], getGoblinLevel(input.roster, goblin.id)),
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

function resolveHiredGoblins(goblins: GoblinRosterGoblin[], roster: GoblinRosterState): GoblinRosterGoblin[] {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));
  return roster.hiredGoblinIds.map((id) => goblinById.get(id)).filter((goblin): goblin is GoblinRosterGoblin => Boolean(goblin));
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
