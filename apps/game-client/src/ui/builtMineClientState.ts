import type { BuiltMineTypeConfig, GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  advanceBuiltMineProduction,
  builtMineMaxLevel,
  calculateBuiltMineUpgradeCost,
  calculateBuiltMineUpgradeStats,
  canBuildMineFromVein,
  collectBuiltMineIncome,
  type BuiltMineUpgradeConfig,
  type BuiltMineState,
  type CollectBuiltMineIncomeResult,
  type MiningFoundVein,
  type UpgradeBuiltMineFailureReason
} from "@goblin-cartel/game-core";

export interface BuildCostRequirement {
  available: number;
  missing: number;
  ok: boolean;
  required: number;
  resourceId: string;
}

export interface BuiltMineResourceSummary {
  amount: number;
  resourceId: string;
}

export interface BuiltMineDashboardState {
  activeCount: number;
  buildingCount: number;
  collectableMineCount: number;
  collectableResources: BuiltMineResourceSummary[];
  fullCount: number;
  productionPerHour: BuiltMineResourceSummary[];
}

export interface BuiltMineUpgradePreview {
  canUpgrade: boolean;
  capacityAfter: number;
  costRequirements: BuildCostRequirement[];
  failureReason: UpgradeBuiltMineFailureReason | null;
  levelAfter: number;
  maxLevel: number;
  productionPerHourAfter: number;
}

export function createVisibleBuiltMines(
  builtMines: BuiltMineState[],
  now: number,
  collectorGoblins: readonly GoblinConfig[] = []
): BuiltMineState[] {
  const collectorsById = createCollectorMap(collectorGoblins);

  return builtMines.map((builtMine) =>
    advanceBuiltMineProduction(createEffectiveBuiltMine(builtMine, findAssignedCollector(builtMine, collectorsById)), now)
  );
}

export function createBuiltMineDashboardState(builtMines: readonly BuiltMineState[]): BuiltMineDashboardState {
  const collectableResources = new Map<string, number>();
  const productionPerHour = new Map<string, number>();
  let activeCount = 0;
  let buildingCount = 0;
  let collectableMineCount = 0;
  let fullCount = 0;

  for (const builtMine of builtMines) {
    if (builtMine.status === "building") {
      buildingCount += 1;
      continue;
    }

    activeCount += 1;
    addResourceAmount(productionPerHour, builtMine.productionResourceId, builtMine.productionPerHour);

    if (isBuiltMineStorageFull(builtMine)) {
      fullCount += 1;
    }

    const collectableAmount = Math.floor(builtMine.storedAmount);

    if (collectableAmount > 0) {
      collectableMineCount += 1;
      addResourceAmount(collectableResources, builtMine.productionResourceId, collectableAmount);
    }
  }

  return {
    activeCount,
    buildingCount,
    collectableMineCount,
    collectableResources: createResourceSummaries(collectableResources),
    fullCount,
    productionPerHour: createResourceSummaries(productionPerHour)
  };
}

export function hasBuiltMineForVein(builtMines: readonly BuiltMineState[], veinId: string): boolean {
  return builtMines.some((builtMine) => builtMine.sourceVeinId === veinId);
}

export function findUnbuiltFoundVeins(
  foundVeins: readonly MiningFoundVein[],
  builtMines: readonly BuiltMineState[]
): MiningFoundVein[] {
  return foundVeins.filter((vein) => !hasBuiltMineForVein(builtMines, vein.id));
}

export function canBuildFoundVein(input: {
  builtMineTypes: BuiltMineTypeConfig[];
  builtMines: readonly BuiltMineState[];
  resources: Record<string, number>;
  vein: MiningFoundVein;
}): boolean {
  if (hasBuiltMineForVein(input.builtMines, input.vein.id)) {
    return false;
  }

  return canBuildMineFromVein({
    builtMineTypes: input.builtMineTypes,
    resources: input.resources,
    veinTypeId: input.vein.veinTypeId
  });
}

export function createBuildCostRequirements(
  buildCost: Array<{ amount: number; resourceId: string }>,
  resources: Record<string, number>
): BuildCostRequirement[] {
  return buildCost.map((cost) => {
    const available = Math.max(0, Math.floor(resources[cost.resourceId] ?? 0));
    const required = Math.max(0, cost.amount);
    const missing = Math.max(0, required - available);

    return {
      available,
      missing,
      ok: missing === 0,
      required,
      resourceId: cost.resourceId
    };
  });
}

export function getBuiltMineBuildProgressPercent(builtMine: BuiltMineState, now: number): number {
  if (builtMine.status === "active") {
    return 100;
  }

  const durationMs = builtMine.completesAt - builtMine.startedAt;

  if (durationMs <= 0) {
    return 100;
  }

  return clampPercent(((now - builtMine.startedAt) / durationMs) * 100);
}

export function getBuiltMineBuildRemainingMs(builtMine: BuiltMineState, now: number): number {
  return builtMine.status === "active" ? 0 : Math.max(0, builtMine.completesAt - now);
}

export function getBuiltMineStoragePercent(builtMine: BuiltMineState): number {
  if (builtMine.capacity <= 0) {
    return 0;
  }

  return clampPercent((builtMine.storedAmount / builtMine.capacity) * 100);
}

export function isBuiltMineStorageFull(builtMine: BuiltMineState): boolean {
  return builtMine.capacity > 0 && builtMine.storedAmount >= builtMine.capacity;
}

export function createBuiltMineUpgradePreview(
  builtMine: BuiltMineState,
  resources: Record<string, number>,
  upgrade?: BuiltMineUpgradeConfig
): BuiltMineUpgradePreview {
  const maxLevel = upgrade?.maxLevel ?? builtMineMaxLevel;
  const isMaxLevel = builtMine.level >= maxLevel;
  const cost = calculateBuiltMineUpgradeCost(builtMine, { upgrade });
  const nextStats = isMaxLevel
    ? {
        capacity: builtMine.capacity,
        level: builtMine.level,
        productionPerHour: builtMine.productionPerHour
      }
    : calculateBuiltMineUpgradeStats(builtMine, upgrade);
  const costRequirements = createBuildCostRequirements(cost, resources);
  const hasEnoughResources = costRequirements.every((requirement) => requirement.ok);
  const failureReason =
    isMaxLevel
      ? "max_level"
      : builtMine.status !== "active"
        ? "mine_not_active"
        : !hasEnoughResources
          ? "not_enough_resources"
          : null;

  return {
    canUpgrade: failureReason === null,
    capacityAfter: nextStats.capacity,
    costRequirements,
    failureReason,
    levelAfter: Math.min(nextStats.level, maxLevel),
    maxLevel,
    productionPerHourAfter: nextStats.productionPerHour
  };
}

export function getGoblinAutoCollectSlots(goblin: GoblinConfig): number {
  if (goblin.class !== "collector") {
    return 0;
  }

  return Math.max(
    0,
    goblin.ability.effects
      .filter((effect) => effect.type === "auto_collect_slots")
      .reduce((total, effect) => total + effect.value, 0)
  );
}

export function countCollectorAssignedMines(
  goblinId: string,
  builtMines: readonly BuiltMineState[],
  ignoredMineId?: string
): number {
  return builtMines.filter((builtMine) => builtMine.id !== ignoredMineId && builtMine.assignedCollectorGoblinId === goblinId).length;
}

export function hasCollectorSlotAvailable(goblin: GoblinConfig, builtMines: readonly BuiltMineState[], targetMineId: string): boolean {
  return countCollectorAssignedMines(goblin.id, builtMines, targetMineId) < getGoblinAutoCollectSlots(goblin);
}

export function findAssignableCollector(
  collectors: readonly GoblinConfig[],
  builtMines: readonly BuiltMineState[],
  targetMineId: string
): GoblinConfig | undefined {
  return collectors.find((collector) => hasCollectorSlotAvailable(collector, builtMines, targetMineId));
}

export function collectBuiltMineIncomeWithCollector(input: {
  builtMine: BuiltMineState;
  collector?: GoblinConfig;
  now: number;
  resources: Record<string, number>;
}): CollectBuiltMineIncomeResult {
  const result = collectBuiltMineIncome({
    builtMine: createEffectiveBuiltMine(input.builtMine, input.collector),
    now: input.now,
    resources: input.resources
  });

  return {
    ...result,
    builtMine: restoreBaseMineStats(result.builtMine, input.builtMine)
  };
}

export function collectAutomatedBuiltMineIncomeWithCollectors(input: {
  builtMines: BuiltMineState[];
  collectors: readonly GoblinConfig[];
  now: number;
  resources: Record<string, number>;
}): {
  builtMines: BuiltMineState[];
  collectedAmount: number;
  collectedResources: Record<string, number>;
  resources: Record<string, number>;
} {
  let resources = input.resources;
  let collectedAmount = 0;
  const collectedResources: Record<string, number> = {};
  const collectorsById = createCollectorMap(input.collectors);

  const builtMines = input.builtMines.map((builtMine) => {
    const collector = findAssignedCollector(builtMine, collectorsById);

    if (!collector) {
      return builtMine;
    }

    const result = collectBuiltMineIncomeWithCollector({
      builtMine,
      collector,
      now: input.now,
      resources
    });

    resources = result.resources;

    if (result.collectedAmount > 0) {
      collectedAmount += result.collectedAmount;
      collectedResources[result.builtMine.productionResourceId] =
        (collectedResources[result.builtMine.productionResourceId] ?? 0) + result.collectedAmount;
    }

    return result.builtMine;
  });

  return {
    builtMines,
    collectedAmount,
    collectedResources,
    resources
  };
}

function createEffectiveBuiltMine(builtMine: BuiltMineState, collector: GoblinConfig | undefined): BuiltMineState {
  if (!collector) {
    return builtMine;
  }

  const capacity = Math.max(1, builtMine.capacity * getCollectorMineCapacityMultiplier(collector));
  const productionPerHour = Math.max(
    0,
    builtMine.productionPerHour * getCollectorMineProductionMultiplier(collector, builtMine.productionResourceId)
  );

  return {
    ...builtMine,
    capacity,
    productionPerHour
  };
}

function getCollectorMineCapacityMultiplier(goblin: GoblinConfig): number {
  return goblin.ability.effects
    .filter((effect) => effect.type === "mine_capacity_multiplier")
    .reduce((multiplier, effect) => multiplier * effect.value, 1);
}

function getCollectorMineProductionMultiplier(goblin: GoblinConfig, resourceId: string): number {
  return goblin.ability.effects.reduce((multiplier, effect) => {
    if (effect.type !== "mine_production_multiplier" || (effect.resourceId && effect.resourceId !== resourceId)) {
      return multiplier;
    }

    return multiplier * effect.value;
  }, 1);
}

function createCollectorMap(collectorGoblins: readonly GoblinConfig[]): Map<string, GoblinConfig> {
  return new Map(collectorGoblins.map((collector) => [collector.id, collector]));
}

function findAssignedCollector(builtMine: BuiltMineState, collectorsById: ReadonlyMap<string, GoblinConfig>): GoblinConfig | undefined {
  return builtMine.assignedCollectorGoblinId ? collectorsById.get(builtMine.assignedCollectorGoblinId) : undefined;
}

function restoreBaseMineStats(effectiveBuiltMine: BuiltMineState, baseBuiltMine: BuiltMineState): BuiltMineState {
  return {
    ...effectiveBuiltMine,
    capacity: baseBuiltMine.capacity,
    productionPerHour: baseBuiltMine.productionPerHour
  };
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function addResourceAmount(amounts: Map<string, number>, resourceId: string, amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  amounts.set(resourceId, (amounts.get(resourceId) ?? 0) + amount);
}

function createResourceSummaries(amounts: Map<string, number>): BuiltMineResourceSummary[] {
  return Array.from(amounts.entries())
    .sort(([leftResourceId], [rightResourceId]) => leftResourceId.localeCompare(rightResourceId))
    .map(([resourceId, amount]) => ({
      amount,
      resourceId
    }));
}
