import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  calculateGoblinEffectiveModifiers,
  calculateGoblinPrimaryStat,
  findPlatformRow,
  getGoblinLevel,
  type GoblinRosterState,
  type MiningSession
} from "@goblin-cartel/game-core";
import { useCallback, useMemo, useState } from "react";
import type { MinePixiGoblin } from "./MinePixiScene";
import { createGoblinIdentity, isMiningGoblin } from "./goblinHutClientState";
import type { RuntimeGoblinConfig } from "./goblinRuntimeUnits";
import { createMineColumnTacticHints } from "./mineColumnTactics";

export type GoblinPlacementMap = Record<string, number>;
export type GoblinPlacementStatus = "idle" | "waiting" | "working";

export interface GoblinWorkerAssignment {
  goblin: RuntimeGoblinConfig;
  targetCell: {
    row: number;
    col: number;
  };
  damagePerSecond: number;
}

export function useGoblinPlacement(input: {
  currentPlatformRow: number;
  labels: Record<string, string>;
  miningGoblins: RuntimeGoblinConfig[];
  onActiveCellChange: (cell: { row: number; col: number }) => void;
  platformSlots: number;
  roster: GoblinRosterState;
  session: MiningSession;
}) {
  const [goblinPlacements, setGoblinPlacements] = useState<GoblinPlacementMap>({});
  const platformCells = useMemo(
    () => findPlatformCells(input.session, input.currentPlatformRow),
    [input.currentPlatformRow, input.session]
  );
  const platformCellKeys = useMemo(() => new Set(platformCells.map(cellKey)), [platformCells]);
  const workerAssignments = useMemo(
    () =>
      assignGoblinWorkers(
        input.session,
        input.miningGoblins,
        goblinPlacements,
        input.currentPlatformRow,
        input.roster
      ),
    [goblinPlacements, input.currentPlatformRow, input.miningGoblins, input.roster, input.session]
  );
  const workerByColumn = useMemo(
    () => new Map(workerAssignments.map((worker) => [worker.targetCell.col, worker])),
    [workerAssignments]
  );
  const columnTacticHints = useMemo(
    () =>
      createMineColumnTacticHints({
        currentPlatformRow: input.currentPlatformRow,
        goblinPlacements,
        labels: input.labels,
        miningGoblins: input.miningGoblins,
        roster: input.roster,
        session: input.session
      }),
    [goblinPlacements, input.currentPlatformRow, input.labels, input.miningGoblins, input.roster, input.session]
  );
  const pixiGoblins = useMemo(
    () =>
      input.miningGoblins
        .map((goblin): MinePixiGoblin | null => {
          const col = goblinPlacements[goblin.id];

          if (typeof col !== "number" || !isValidMineColumn(input.session, col)) {
            return null;
          }

          return {
            id: goblin.id,
            name: goblinName(goblin, input.labels),
            col,
            status: getGoblinPlacementStatus(input.session, col, input.currentPlatformRow, Boolean(workerByColumn.get(col))),
            working: Boolean(workerByColumn.get(col))
          };
        })
        .filter((goblin): goblin is MinePixiGoblin => Boolean(goblin)),
    [goblinPlacements, input.currentPlatformRow, input.labels, input.miningGoblins, input.session, workerByColumn]
  );

  const placeGoblinOnCellKey = useCallback(
    (goblinId: string, targetCellKey: string) => {
      const targetCell = parseCellKey(targetCellKey);

      if (!targetCell || !platformCellKeys.has(targetCellKey)) {
        return;
      }

      setGoblinPlacements((current) => {
        const next = { ...current };
        const previousColumn = next[goblinId];
        const occupyingGoblinId = Object.entries(next).find(
          ([otherGoblinId, column]) => otherGoblinId !== goblinId && column === targetCell.col
        )?.[0];
        const alreadyPlaced = typeof previousColumn === "number" && isValidMineColumn(input.session, previousColumn);

        if (!alreadyPlaced && !occupyingGoblinId && countPlacedGoblins(input.session, next) >= normalizePlatformSlots(input.platformSlots)) {
          return current;
        }

        if (occupyingGoblinId) {
          if (typeof previousColumn === "number" && isValidMineColumn(input.session, previousColumn)) {
            next[occupyingGoblinId] = previousColumn;
          } else {
            delete next[occupyingGoblinId];
          }
        }

        next[goblinId] = targetCell.col;
        return next;
      });
      input.onActiveCellChange(targetCell);
    },
    [input, platformCellKeys]
  );

  const handlePlaceGoblin = useCallback(
    (goblinId: string, targetCell: { row: number; col: number }) => {
      placeGoblinOnCellKey(goblinId, cellKey(targetCell));
    },
    [placeGoblinOnCellKey]
  );

  return {
    columnTacticHints,
    goblinPlacements,
    handlePlaceGoblin,
    pixiGoblins,
    platformCellKeys,
    setGoblinPlacements,
    workerAssignments
  };
}

export function assignGoblinWorkers(
  session: MiningSession,
  hiredGoblins: RuntimeGoblinConfig[],
  goblinPlacements: GoblinPlacementMap,
  platformRow: number,
  roster: GoblinRosterState
): GoblinWorkerAssignment[] {
  const activePlatformRow = findPlatformRow(session, platformRow);

  return hiredGoblins
    .filter(isMiningGoblin)
    .map((goblin) => {
      const targetColumn = goblinPlacements[goblin.id];

      if (typeof targetColumn !== "number" || !isValidMineColumn(session, targetColumn)) {
        return null;
      }

      const targetBlock = session.blocks[activePlatformRow]?.[targetColumn];

      if (!targetBlock || targetBlock.destroyed) {
        return null;
      }

      return {
        goblin,
        targetCell: {
          row: activePlatformRow,
          col: targetColumn
        },
        damagePerSecond: calculateGoblinPrimaryStat(goblin, getRuntimeGoblinLevel(roster, goblin), getRuntimeGoblinStars(goblin))
      };
    })
    .filter((worker): worker is GoblinWorkerAssignment => Boolean(worker));
}

export function getGoblinPlacementStatus(
  session: MiningSession,
  column: number,
  platformRow: number,
  working: boolean
): GoblinPlacementStatus {
  if (working) {
    return "working";
  }

  if (!isValidMineColumn(session, column)) {
    return "waiting";
  }

  const activePlatformRow = findPlatformRow(session, platformRow);
  const targetBlock = session.blocks[activePlatformRow]?.[column];

  if (!targetBlock || targetBlock.destroyed) {
    return "waiting";
  }

  return "idle";
}

export function getGoblinOfflineRelocationSlots(goblin: GoblinConfig, level = 1): number {
  return goblin.role === "foreman" ? calculateGoblinPrimaryStat(goblin, level, getRuntimeGoblinStars(goblin)) : 0;
}

export function getGoblinOfflineAutoDamageMultiplier(goblin: GoblinConfig, level = 1): number {
  return calculateGoblinEffectiveModifiers(goblin, level, getRuntimeGoblinStars(goblin)).reduce((multiplier, effect) => {
    if (effect.type !== "offline_auto_damage_multiplier") {
      return multiplier;
    }

    return multiplier + Math.max(0, effect.value - 1);
  }, 1);
}

export function getGoblinOfflineRewardMultiplier(goblin: GoblinConfig, level = 1): number {
  return calculateGoblinEffectiveModifiers(goblin, level, getRuntimeGoblinStars(goblin)).reduce((multiplier, effect) => {
    if (effect.type !== "offline_reward_multiplier") {
      return multiplier;
    }

    return multiplier + Math.max(0, effect.value - 1);
  }, 1);
}

export function relocateOfflineGoblinPlacements(
  session: MiningSession,
  hiredGoblins: RuntimeGoblinConfig[],
  goblinPlacements: GoblinPlacementMap,
  platformRow: number,
  roster: GoblinRosterState,
  maxMoves: number
): { moves: number; placements: GoblinPlacementMap } {
  if (maxMoves <= 0) {
    return { moves: 0, placements: goblinPlacements };
  }

  const activePlatformRow = findPlatformRow(session, platformRow);
  const liveCells = findLivePlatformCells(session, activePlatformRow)
    .map((cell) => ({
      ...cell,
      hp: session.blocks[cell.row]?.[cell.col]?.hp ?? Number.MAX_SAFE_INTEGER
    }))
    .sort((left, right) => left.hp - right.hp || left.col - right.col);

  if (liveCells.length === 0) {
    return { moves: 0, placements: goblinPlacements };
  }

  const nextPlacements = { ...goblinPlacements };
  const occupiedColumns = new Set<number>();

  for (const column of Object.values(nextPlacements)) {
    if (typeof column === "number" && isValidMineColumn(session, column)) {
      occupiedColumns.add(column);
    }
  }

  let moves = 0;
  const miningGoblins = hiredGoblins.filter(isMiningGoblin);
  const sortedIdleGoblins = [...miningGoblins].sort(
    (left, right) => getRuntimeGoblinLevel(roster, right) - getRuntimeGoblinLevel(roster, left) || left.sortOrder - right.sortOrder
  );

  for (const goblin of sortedIdleGoblins) {
    if (moves >= maxMoves) {
      break;
    }

    const currentColumn = nextPlacements[goblin.id];
    const currentBlock =
      typeof currentColumn === "number" && isValidMineColumn(session, currentColumn)
        ? session.blocks[activePlatformRow]?.[currentColumn]
        : null;

    if (currentBlock && !currentBlock.destroyed) {
      continue;
    }

    const targetCell = liveCells.find((cell) => !occupiedColumns.has(cell.col));

    if (!targetCell) {
      break;
    }

    if (typeof currentColumn === "number") {
      occupiedColumns.delete(currentColumn);
    }

    nextPlacements[goblin.id] = targetCell.col;
    occupiedColumns.add(targetCell.col);
    moves += 1;
  }

  return { moves, placements: nextPlacements };
}

export function findPlatformCells(session: MiningSession, platformRow: number): Array<{ row: number; col: number }> {
  const activePlatformRow = findPlatformRow(session, platformRow);
  const rowBlocks = session.blocks[activePlatformRow] ?? [];

  return rowBlocks.map((block) => ({
    row: block.row,
    col: block.col
  }));
}

export function createDefaultGoblinPlacements(
  session: MiningSession,
  hiredGoblins: RuntimeGoblinConfig[],
  platformRow: number,
  maxPlacements = Number.POSITIVE_INFINITY
): GoblinPlacementMap {
  return hiredGoblins.reduce<GoblinPlacementMap>(
    (placements, goblin) => placeGoblinInFirstFreeColumn(session, placements, goblin.id, platformRow, { maxPlacements }),
    {}
  );
}

export function normalizeGoblinPlacements(
  session: MiningSession,
  hiredGoblins: RuntimeGoblinConfig[],
  placements: GoblinPlacementMap,
  options: { maxPlacements?: number; placeMissing: boolean; platformRow: number }
): GoblinPlacementMap {
  const normalized: GoblinPlacementMap = {};
  const usedColumns = new Set<number>();
  const maxPlacements = normalizePlatformSlots(options.maxPlacements);

  for (const goblin of hiredGoblins) {
    if (Object.keys(normalized).length >= maxPlacements) {
      break;
    }

    const column = placements[goblin.id];

    if (typeof column === "number" && isValidMineColumn(session, column) && !usedColumns.has(column)) {
      normalized[goblin.id] = column;
      usedColumns.add(column);
    }
  }

  if (!options.placeMissing) {
    return normalized;
  }

  return hiredGoblins.reduce((currentPlacements, goblin) => {
    if (typeof currentPlacements[goblin.id] === "number") {
      return currentPlacements;
    }

    return placeGoblinInFirstFreeColumn(session, currentPlacements, goblin.id, options.platformRow, { maxPlacements });
  }, normalized);
}

export function placeGoblinInFirstFreeColumn(
  session: MiningSession,
  placements: GoblinPlacementMap,
  goblinId: string,
  platformRow: number,
  options: { maxPlacements?: number } = {}
): GoblinPlacementMap {
  const alreadyPlaced = typeof placements[goblinId] === "number" && isValidMineColumn(session, placements[goblinId]);

  if (!alreadyPlaced && countPlacedGoblins(session, placements) >= normalizePlatformSlots(options.maxPlacements)) {
    return placements;
  }

  const occupiedColumns = new Set(
    Object.entries(placements)
      .filter(([placedGoblinId]) => placedGoblinId !== goblinId)
      .map(([, column]) => column)
  );
  const platformCells = findPlatformCells(session, platformRow);
  const liveCells = findLivePlatformCells(session, platformRow);
  const targetCell =
    liveCells.find((cell) => !occupiedColumns.has(cell.col)) ??
    platformCells.find((cell) => !occupiedColumns.has(cell.col)) ??
    platformCells.find((cell) => cell.col === placements[goblinId]);

  if (!targetCell) {
    return placements;
  }

  return {
    ...placements,
    [goblinId]: targetCell.col
  };
}

function findLivePlatformCells(session: MiningSession, platformRow: number): Array<{ row: number; col: number }> {
  const activePlatformRow = findPlatformRow(session, platformRow);
  const rowBlocks = session.blocks[activePlatformRow] ?? [];

  return rowBlocks
    .filter((block) => !block.destroyed)
    .map((block) => ({
      row: block.row,
      col: block.col
    }));
}

function cellKey(cell: { row: number; col: number }): string {
  return `${cell.row}:${cell.col}`;
}

function parseCellKey(value: string): { row: number; col: number } | null {
  const [rowValue, colValue] = value.split(":");
  const row = Number(rowValue);
  const col = Number(colValue);

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return null;
  }

  return { row, col };
}

function isValidMineColumn(session: MiningSession, column: number): boolean {
  return Number.isInteger(column) && column >= 0 && column < session.mine.width;
}

function countPlacedGoblins(session: MiningSession, placements: GoblinPlacementMap): number {
  return Object.values(placements).filter((column) => typeof column === "number" && isValidMineColumn(session, column)).length;
}

function normalizePlatformSlots(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Math.floor(value));
}

function getRuntimeGoblinLevel(roster: GoblinRosterState, goblin: RuntimeGoblinConfig): number {
  return Math.max(1, Math.floor(goblin.instanceLevel ?? getGoblinLevel(roster, goblin.id)));
}

function getRuntimeGoblinStars(goblin: unknown): 0 | 1 | 2 | 3 | 4 | 5 {
  const value = typeof goblin === "object" && goblin !== null ? (goblin as { instanceStars?: number }).instanceStars : undefined;
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 ? value : 0;
}

function goblinName(goblin: RuntimeGoblinConfig, labels: Record<string, string>): string {
  const identity = createGoblinIdentity(goblin, labels);
  return identity.fullName;
}
