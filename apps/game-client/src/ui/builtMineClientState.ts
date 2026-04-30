import type { BuiltMineTypeConfig } from "@goblin-cartel/content-schemas";
import {
  advanceBuiltMineProduction,
  canBuildMineFromVein,
  type BuiltMineState,
  type MiningFoundVein
} from "@goblin-cartel/game-core";

export interface BuildCostRequirement {
  available: number;
  missing: number;
  ok: boolean;
  required: number;
  resourceId: string;
}

export function createVisibleBuiltMines(builtMines: BuiltMineState[], now: number): BuiltMineState[] {
  return builtMines.map((builtMine) => advanceBuiltMineProduction(builtMine, now));
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

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}
