export interface BuiltMineResourceAmount {
  resourceId: string;
  amount: number;
}

export interface BuiltMineType {
  id: string;
  sourceVeinType: string;
  productionResourceId: string;
  baseProductionPerHour: number;
  baseCapacity: number;
  buildCost: BuiltMineResourceAmount[];
  buildTimeSec: number;
  upgrade?: BuiltMineUpgradeConfig;
}

export interface BuiltMineFoundVein {
  id: string;
  veinTypeId: string;
  mineTemplateId?: string;
  seed?: string;
  row?: number;
  col?: number;
}

export interface BuiltMineState {
  id: string;
  typeId: string;
  sourceVeinId: string;
  sourceVeinType: string;
  productionResourceId: string;
  level: number;
  status: "building" | "active";
  productionPerHour: number;
  capacity: number;
  storedAmount: number;
  startedAt: number;
  completesAt: number;
  lastProducedAt: number;
  assignedCollectorGoblinId?: string | null;
}

export type BuildMineFailureReason = "missing_built_mine_type" | "not_enough_resources";

export type BuildMineResult =
  | {
      ok: true;
      builtMine: BuiltMineState;
      resources: Record<string, number>;
    }
  | {
      ok: false;
      reason: BuildMineFailureReason;
    };

export const builtMineMaxLevel = 5;

export interface BuiltMineUpgradeCostConfig {
  baseAmount: number;
  levelMultiplier: number;
  levelPower: number;
  resourceId?: string;
  useProductionResource?: boolean;
}

export interface BuiltMineUpgradeConfig {
  capacityMultiplier: number;
  cost: BuiltMineUpgradeCostConfig[];
  maxLevel: number;
  productionMultiplier: number;
}

export interface BuiltMineUpgradeCostOptions {
  costMultiplier?: number;
  goldResourceId?: string;
  upgrade?: BuiltMineUpgradeConfig;
}

export interface BuiltMineUpgradeStats {
  capacity: number;
  level: number;
  productionPerHour: number;
}

export type UpgradeBuiltMineFailureReason = "max_level" | "mine_not_active" | "not_enough_resources";

export type UpgradeBuiltMineResult =
  | {
      ok: true;
      builtMine: BuiltMineState;
      cost: BuiltMineResourceAmount[];
      resources: Record<string, number>;
    }
  | {
      ok: false;
      cost: BuiltMineResourceAmount[];
      reason: UpgradeBuiltMineFailureReason;
    };

export interface BuildMineFromVeinInput {
  buildCostMultiplier?: number;
  buildTimeMultiplier?: number;
  builtMineTypes: BuiltMineType[];
  id?: string;
  now: number;
  resources: Record<string, number>;
  vein: BuiltMineFoundVein;
}

export interface CollectBuiltMineIncomeInput {
  builtMine: BuiltMineState;
  now: number;
  resources: Record<string, number>;
}

export interface CollectBuiltMineIncomeResult {
  builtMine: BuiltMineState;
  collectedAmount: number;
  resources: Record<string, number>;
}

export interface CollectAutomatedBuiltMineIncomeInput {
  builtMines: BuiltMineState[];
  now: number;
  resources: Record<string, number>;
}

export interface CollectAutomatedBuiltMineIncomeResult {
  builtMines: BuiltMineState[];
  collectedAmount: number;
  collectedResources: Record<string, number>;
  resources: Record<string, number>;
}

export interface UpgradeBuiltMineInput {
  builtMine: BuiltMineState;
  costMultiplier?: number;
  goldResourceId?: string;
  now: number;
  resources: Record<string, number>;
  upgrade?: BuiltMineUpgradeConfig;
}

const msPerHour = 60 * 60 * 1000;
const defaultBuiltMineUpgradeConfig: BuiltMineUpgradeConfig = {
  capacityMultiplier: 1.4,
  cost: [
    {
      baseAmount: 60,
      levelMultiplier: 1,
      levelPower: 1,
      useProductionResource: true
    },
    {
      baseAmount: 100,
      levelMultiplier: 1,
      levelPower: 1.35,
      resourceId: "gold"
    }
  ],
  maxLevel: builtMineMaxLevel,
  productionMultiplier: 1.35
};

export function findBuiltMineTypeForVein(
  builtMineTypes: BuiltMineType[],
  veinTypeId: string
): BuiltMineType | undefined {
  return builtMineTypes.find((builtMineType) => builtMineType.sourceVeinType === veinTypeId);
}

export function canBuildMineFromVein(input: {
  buildCostMultiplier?: number;
  builtMineTypes: BuiltMineType[];
  resources: Record<string, number>;
  veinTypeId: string;
}): boolean {
  const builtMineType = findBuiltMineTypeForVein(input.builtMineTypes, input.veinTypeId);
  const buildCost = builtMineType ? applyResourceCostMultiplier(builtMineType.buildCost, input.buildCostMultiplier) : [];

  return Boolean(builtMineType && hasEnoughResources(input.resources, buildCost));
}

export function buildMineFromVein(input: BuildMineFromVeinInput): BuildMineResult {
  const builtMineType = findBuiltMineTypeForVein(input.builtMineTypes, input.vein.veinTypeId);

  if (!builtMineType) {
    return {
      ok: false,
      reason: "missing_built_mine_type"
    };
  }

  const buildCost = applyResourceCostMultiplier(builtMineType.buildCost, input.buildCostMultiplier);

  if (!hasEnoughResources(input.resources, buildCost)) {
    return {
      ok: false,
      reason: "not_enough_resources"
    };
  }

  const buildTimeMs = Math.ceil(Math.max(0, builtMineType.buildTimeSec) * normalizeMultiplier(input.buildTimeMultiplier) * 1000);
  const completesAt = input.now + buildTimeMs;
  const status = buildTimeMs > 0 ? "building" : "active";

  return {
    ok: true,
    resources: deductResources(input.resources, buildCost),
    builtMine: {
      id: input.id ?? `${builtMineType.id}:${input.vein.id}`,
      typeId: builtMineType.id,
      sourceVeinId: input.vein.id,
      sourceVeinType: input.vein.veinTypeId,
      productionResourceId: builtMineType.productionResourceId,
      level: 1,
      status,
      productionPerHour: builtMineType.baseProductionPerHour,
      capacity: builtMineType.baseCapacity,
      storedAmount: 0,
      startedAt: input.now,
      completesAt,
      lastProducedAt: status === "active" ? input.now : completesAt,
      assignedCollectorGoblinId: null
    }
  };
}

export function advanceBuiltMineProduction(builtMine: BuiltMineState, now: number): BuiltMineState {
  if (!Number.isFinite(now)) {
    return builtMine;
  }

  if (builtMine.status === "building" && now < builtMine.completesAt) {
    return builtMine;
  }

  if (now <= builtMine.lastProducedAt) {
    return builtMine.status === "building" && now >= builtMine.completesAt
      ? {
          ...builtMine,
          status: "active"
        }
      : builtMine;
  }

  const status = "active";
  const productionStartsAt = Math.max(builtMine.lastProducedAt, builtMine.completesAt);
  const elapsedMs = Math.max(0, now - productionStartsAt);
  const producedAmount = (builtMine.productionPerHour * elapsedMs) / msPerHour;
  const storedAmount = Math.min(builtMine.capacity, builtMine.storedAmount + producedAmount);

  return {
    ...builtMine,
    status,
    storedAmount,
    lastProducedAt: now
  };
}

export function advanceBuiltMinesProduction(builtMines: BuiltMineState[], now: number): BuiltMineState[] {
  return builtMines.map((builtMine) => advanceBuiltMineProduction(builtMine, now));
}

export function collectBuiltMineIncome(input: CollectBuiltMineIncomeInput): CollectBuiltMineIncomeResult {
  const producedBuiltMine = advanceBuiltMineProduction(input.builtMine, input.now);
  const collectedAmount = Math.floor(producedBuiltMine.storedAmount);

  if (collectedAmount <= 0) {
    return {
      builtMine: producedBuiltMine,
      collectedAmount: 0,
      resources: input.resources
    };
  }

  return {
    builtMine: {
      ...producedBuiltMine,
      storedAmount: producedBuiltMine.storedAmount - collectedAmount
    },
    collectedAmount,
    resources: {
      ...input.resources,
      [producedBuiltMine.productionResourceId]: (input.resources[producedBuiltMine.productionResourceId] ?? 0) + collectedAmount
    }
  };
}

export function collectAutomatedBuiltMineIncome(
  input: CollectAutomatedBuiltMineIncomeInput
): CollectAutomatedBuiltMineIncomeResult {
  let resources = input.resources;
  let collectedAmount = 0;
  const collectedResources: Record<string, number> = {};

  const builtMines = input.builtMines.map((builtMine) => {
    if (!builtMine.assignedCollectorGoblinId) {
      return builtMine;
    }

    const result = collectBuiltMineIncome({
      builtMine,
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

export function assignBuiltMineCollector(builtMine: BuiltMineState, goblinId: string): BuiltMineState {
  return {
    ...builtMine,
    assignedCollectorGoblinId: goblinId
  };
}

export function calculateBuiltMineUpgradeCost(
  builtMine: BuiltMineState,
  options: BuiltMineUpgradeCostOptions = {}
): BuiltMineResourceAmount[] {
  const upgrade = normalizeBuiltMineUpgradeConfig(options.upgrade, options.goldResourceId);

  if (builtMine.level >= upgrade.maxLevel) {
    return [];
  }

  return applyResourceCostMultiplier(
    upgrade.cost.map((cost) => ({
      amount: Math.ceil(cost.baseAmount * (Math.max(1, builtMine.level) * cost.levelMultiplier) ** cost.levelPower),
      resourceId: cost.useProductionResource ? builtMine.productionResourceId : cost.resourceId ?? options.goldResourceId ?? "gold"
    })),
    options.costMultiplier
  );
}

export function calculateBuiltMineUpgradeStats(
  builtMine: BuiltMineState,
  upgradeConfig?: BuiltMineUpgradeConfig
): BuiltMineUpgradeStats {
  const upgrade = normalizeBuiltMineUpgradeConfig(upgradeConfig);

  return {
    capacity: Math.ceil(builtMine.capacity * upgrade.capacityMultiplier),
    level: builtMine.level + 1,
    productionPerHour: Math.ceil(builtMine.productionPerHour * upgrade.productionMultiplier)
  };
}

export function upgradeBuiltMine(input: UpgradeBuiltMineInput): UpgradeBuiltMineResult {
  const producedBuiltMine = advanceBuiltMineProduction(input.builtMine, input.now);
  const upgrade = normalizeBuiltMineUpgradeConfig(input.upgrade, input.goldResourceId);
  const cost = calculateBuiltMineUpgradeCost(producedBuiltMine, {
    costMultiplier: input.costMultiplier,
    goldResourceId: input.goldResourceId,
    upgrade
  });

  if (producedBuiltMine.status !== "active") {
    return {
      ok: false,
      cost,
      reason: "mine_not_active"
    };
  }

  if (producedBuiltMine.level >= upgrade.maxLevel) {
    return {
      ok: false,
      cost,
      reason: "max_level"
    };
  }

  if (!hasEnoughResources(input.resources, cost)) {
    return {
      ok: false,
      cost,
      reason: "not_enough_resources"
    };
  }

  const nextStats = calculateBuiltMineUpgradeStats(producedBuiltMine, upgrade);

  return {
    ok: true,
    cost,
    resources: deductResources(input.resources, cost),
    builtMine: {
      ...producedBuiltMine,
      capacity: nextStats.capacity,
      level: nextStats.level,
      productionPerHour: nextStats.productionPerHour,
      storedAmount: Math.min(producedBuiltMine.storedAmount, nextStats.capacity),
      lastProducedAt: input.now
    }
  };
}

function hasEnoughResources(resources: Record<string, number>, cost: BuiltMineResourceAmount[]): boolean {
  return cost.every((item) => (resources[item.resourceId] ?? 0) >= item.amount);
}

function deductResources(resources: Record<string, number>, cost: BuiltMineResourceAmount[]): Record<string, number> {
  const result = { ...resources };

  for (const item of cost) {
    result[item.resourceId] = (result[item.resourceId] ?? 0) - item.amount;
  }

  return result;
}

function normalizeResourceCost(cost: BuiltMineResourceAmount[]): BuiltMineResourceAmount[] {
  const amounts = new Map<string, number>();

  for (const item of cost) {
    if (item.amount <= 0) {
      continue;
    }

    amounts.set(item.resourceId, (amounts.get(item.resourceId) ?? 0) + item.amount);
  }

  return Array.from(amounts.entries()).map(([resourceId, amount]) => ({
    amount,
    resourceId
  }));
}

function applyResourceCostMultiplier(
  cost: BuiltMineResourceAmount[],
  multiplier: number | undefined
): BuiltMineResourceAmount[] {
  const normalizedMultiplier = normalizeMultiplier(multiplier);

  if (normalizedMultiplier === 1) {
    return normalizeResourceCost(cost);
  }

  return normalizeResourceCost(
    cost.map((item) => ({
      ...item,
      amount: Math.ceil(Math.max(0, item.amount) * normalizedMultiplier)
    }))
  );
}

function normalizeMultiplier(multiplier: number | undefined): number {
  if (typeof multiplier !== "number" || !Number.isFinite(multiplier)) {
    return 1;
  }

  return Math.max(0, multiplier);
}

function normalizeBuiltMineUpgradeConfig(
  upgrade: BuiltMineUpgradeConfig | undefined,
  goldResourceId = "gold"
): BuiltMineUpgradeConfig {
  if (!upgrade) {
    return {
      ...defaultBuiltMineUpgradeConfig,
      cost: defaultBuiltMineUpgradeConfig.cost.map((cost) =>
        cost.resourceId === "gold"
          ? {
              ...cost,
              resourceId: goldResourceId
            }
          : { ...cost }
      )
    };
  }

  const cost = upgrade.cost.length > 0 ? upgrade.cost : defaultBuiltMineUpgradeConfig.cost;

  return {
    capacityMultiplier: Math.max(1, upgrade.capacityMultiplier),
    cost: cost.map((item) => ({
      baseAmount: Math.max(1, item.baseAmount),
      levelMultiplier: Math.max(0.01, item.levelMultiplier),
      levelPower: Math.max(0, item.levelPower),
      resourceId: item.useProductionResource ? undefined : item.resourceId ?? goldResourceId,
      useProductionResource: Boolean(item.useProductionResource)
    })),
    maxLevel: Math.max(1, Math.floor(upgrade.maxLevel)),
    productionMultiplier: Math.max(1, upgrade.productionMultiplier)
  };
}
