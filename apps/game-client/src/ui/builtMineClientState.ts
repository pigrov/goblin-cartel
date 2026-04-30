import type { BuiltMineTypeConfig } from "@goblin-cartel/content-schemas";
import {
  advanceBuiltMineProduction,
  canBuildMineFromVein,
  type BuiltMineState,
  type MiningFoundVein
} from "@goblin-cartel/game-core";

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
