import type { MiningSession } from "@goblin-cartel/game-core";
import { calculateCrewAutoDamagePerSecond, getGoblinLevel, type GoblinRosterState } from "@goblin-cartel/game-core";
import { createGoblinIdentity, isMiningGoblin } from "./goblinHutClientState";
import type { RuntimeGoblinConfig } from "./goblinRuntimeUnits";
import type { GoblinPlacementMap } from "./useGoblinPlacement";

export type MineColumnTacticState = "empty" | "weak" | "good" | "best";

export interface MineColumnTacticHint {
  bestDps: number;
  bestGoblinId: string | null;
  bestGoblinName: string | null;
  col: number;
  currentDps: number;
  currentGoblinId: string | null;
  detail: string;
  hasTagBonus: boolean;
  label: string;
  row: number;
  state: MineColumnTacticState;
}

export function createMineColumnTacticHints(input: {
  currentPlatformRow: number;
  goblinPlacements: GoblinPlacementMap;
  labels: Record<string, string>;
  miningGoblins: RuntimeGoblinConfig[];
  roster: GoblinRosterState;
  session: MiningSession;
}): MineColumnTacticHint[] {
  const miningGoblins = input.miningGoblins.filter(isMiningGoblin);

  if (miningGoblins.length === 0) {
    return [];
  }

  const placedGoblinIdByColumn = createPlacedGoblinIdByColumn(input.goblinPlacements);

  return Array.from({ length: input.session.mine.width }, (_item, col): MineColumnTacticHint | null => {
    const block = input.session.blocks[input.currentPlatformRow]?.[col];

    if (!block || block.destroyed) {
      return null;
    }

    const best = findBestGoblinForBlock(miningGoblins, block.tags ?? [], input.roster, input.labels);

    if (!best) {
      return null;
    }

    const currentGoblinId = placedGoblinIdByColumn.get(col) ?? null;
    const currentGoblin = currentGoblinId ? miningGoblins.find((goblin) => goblin.id === currentGoblinId) ?? null : null;
    const currentDps = currentGoblin ? calculateGoblinDps(currentGoblin, block.tags ?? [], input.roster) : 0;
    const state = columnTacticState(currentDps, best.dps);

    return {
      bestDps: best.dps,
      bestGoblinId: best.goblin.id,
      bestGoblinName: best.name,
      col,
      currentDps,
      currentGoblinId,
      detail: columnTacticDetail(state, currentDps, best.dps, best.name),
      hasTagBonus: best.hasTagBonus,
      label: columnTacticLabel(state, currentDps, best.dps),
      row: block.row,
      state
    };
  }).filter((hint): hint is MineColumnTacticHint => Boolean(hint));
}

function findBestGoblinForBlock(
  goblins: RuntimeGoblinConfig[],
  blockTags: string[],
  roster: GoblinRosterState,
  labels: Record<string, string>
): { dps: number; goblin: RuntimeGoblinConfig; hasTagBonus: boolean; name: string } | null {
  let best: { dps: number; goblin: RuntimeGoblinConfig; hasTagBonus: boolean; name: string } | null = null;

  for (const goblin of goblins) {
    const dps = calculateGoblinDps(goblin, blockTags, roster);
    const baseDps = calculateGoblinDps(goblin, [], roster);

    if (dps <= 0) {
      continue;
    }

    if (!best || dps > best.dps || (dps === best.dps && goblin.sortOrder < best.goblin.sortOrder)) {
      best = {
        dps,
        goblin,
        hasTagBonus: dps > baseDps,
        name: goblinDisplayName(goblin, labels)
      };
    }
  }

  return best;
}

function calculateGoblinDps(goblin: RuntimeGoblinConfig, blockTags: string[], roster: GoblinRosterState): number {
  return calculateCrewAutoDamagePerSecond({
    blockTags,
    goblins: [goblin],
    roster: {
      goblinLevels: {
        [goblin.id]: Math.max(1, Math.floor(goblin.instanceLevel ?? getGoblinLevel(roster, goblin.id)))
      },
      hiredGoblinIds: [goblin.id]
    }
  });
}

function createPlacedGoblinIdByColumn(placements: GoblinPlacementMap): Map<number, string> {
  const result = new Map<number, string>();

  for (const [goblinId, col] of Object.entries(placements)) {
    if (Number.isInteger(col) && !result.has(col)) {
      result.set(col, goblinId);
    }
  }

  return result;
}

function columnTacticState(currentDps: number, bestDps: number): MineColumnTacticState {
  if (currentDps <= 0) {
    return "empty";
  }

  if (currentDps >= bestDps) {
    return "best";
  }

  return currentDps / Math.max(1, bestDps) >= 0.75 ? "good" : "weak";
}

function columnTacticLabel(state: MineColumnTacticState, currentDps: number, bestDps: number): string {
  if (state === "empty") {
    return `${bestDps}/с`;
  }

  if (state === "best") {
    return `${currentDps}/с`;
  }

  return `${currentDps}/${bestDps}`;
}

function columnTacticDetail(state: MineColumnTacticState, currentDps: number, bestDps: number, bestGoblinName: string): string {
  if (state === "empty") {
    return bestGoblinName;
  }

  if (state === "best") {
    return "лучший";
  }

  return `${Math.max(1, Math.floor((currentDps / Math.max(1, bestDps)) * 100))}%`;
}

function goblinDisplayName(goblin: RuntimeGoblinConfig, labels: Record<string, string>): string {
  const identity = createGoblinIdentity(goblin, labels);
  const name = goblin.instanceName?.trim() || identity.name;
  const nickname = goblin.instanceNickname?.trim() || identity.nickname;
  return nickname ? `${name} ${nickname}` : name;
}
