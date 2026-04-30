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

export interface BuildMineFromVeinInput {
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

const msPerHour = 60 * 60 * 1000;

export function findBuiltMineTypeForVein(
  builtMineTypes: BuiltMineType[],
  veinTypeId: string
): BuiltMineType | undefined {
  return builtMineTypes.find((builtMineType) => builtMineType.sourceVeinType === veinTypeId);
}

export function canBuildMineFromVein(input: {
  builtMineTypes: BuiltMineType[];
  resources: Record<string, number>;
  veinTypeId: string;
}): boolean {
  const builtMineType = findBuiltMineTypeForVein(input.builtMineTypes, input.veinTypeId);

  return Boolean(builtMineType && hasEnoughResources(input.resources, builtMineType.buildCost));
}

export function buildMineFromVein(input: BuildMineFromVeinInput): BuildMineResult {
  const builtMineType = findBuiltMineTypeForVein(input.builtMineTypes, input.vein.veinTypeId);

  if (!builtMineType) {
    return {
      ok: false,
      reason: "missing_built_mine_type"
    };
  }

  if (!hasEnoughResources(input.resources, builtMineType.buildCost)) {
    return {
      ok: false,
      reason: "not_enough_resources"
    };
  }

  const buildTimeMs = Math.max(0, builtMineType.buildTimeSec) * 1000;
  const completesAt = input.now + buildTimeMs;
  const status = buildTimeMs > 0 ? "building" : "active";

  return {
    ok: true,
    resources: deductResources(input.resources, builtMineType.buildCost),
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
