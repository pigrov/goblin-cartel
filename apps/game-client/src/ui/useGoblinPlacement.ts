import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  calculateCrewAutoDamagePerSecond,
  findPlatformRow,
  getGoblinLevel,
  type GoblinRosterState,
  type MiningSession
} from "@goblin-cartel/game-core";
import { useCallback, useMemo, useState } from "react";
import type { MinePixiGoblin } from "./MinePixiScene";
import { createGoblinIdentity, isMiningGoblin } from "./goblinHutClientState";

export type GoblinPlacementMap = Record<string, number>;

export interface GoblinWorkerAssignment {
  goblin: GoblinConfig;
  targetCell: {
    row: number;
    col: number;
  };
  damagePerSecond: number;
}

export function useGoblinPlacement(input: {
  currentPlatformRow: number;
  labels: Record<string, string>;
  miningGoblins: GoblinConfig[];
  onActiveCellChange: (cell: { row: number; col: number }) => void;
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
            working: Boolean(workerByColumn.get(col))
          };
        })
        .filter((goblin): goblin is MinePixiGoblin => Boolean(goblin)),
    [goblinPlacements, input.labels, input.miningGoblins, input.session, workerByColumn]
  );

  const placeGoblinOnCellKey = useCallback(
    (goblinId: string, targetCellKey: string) => {
      const targetCell = parseCellKey(targetCellKey);

      if (!targetCell || !platformCellKeys.has(targetCellKey)) {
        return;
      }

      const targetBlock = input.session.blocks[targetCell.row]?.[targetCell.col];

      if (!targetBlock || targetBlock.destroyed) {
        return;
      }

      setGoblinPlacements((current) => {
        const next = { ...current };
        const previousColumn = next[goblinId];
        const occupyingGoblinId = Object.entries(next).find(
          ([otherGoblinId, column]) => otherGoblinId !== goblinId && column === targetCell.col
        )?.[0];

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
  hiredGoblins: GoblinConfig[],
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
        damagePerSecond: calculateCrewAutoDamagePerSecond({
          blockTags: targetBlock.tags,
          goblins: [goblin],
          roster: {
            goblinLevels: {
              [goblin.id]: getGoblinLevel(roster, goblin.id)
            },
            hiredGoblinIds: [goblin.id]
          }
        })
      };
    })
    .filter((worker): worker is GoblinWorkerAssignment => Boolean(worker));
}

export function findPlatformCells(session: MiningSession, platformRow: number): Array<{ row: number; col: number }> {
  const activePlatformRow = findPlatformRow(session, platformRow);
  const rowBlocks = session.blocks[activePlatformRow] ?? [];

  return rowBlocks
    .filter((block) => !block.destroyed)
    .map((block) => ({
      row: block.row,
      col: block.col
    }));
}

export function createDefaultGoblinPlacements(
  session: MiningSession,
  hiredGoblins: GoblinConfig[],
  platformRow: number
): GoblinPlacementMap {
  return hiredGoblins.reduce<GoblinPlacementMap>(
    (placements, goblin) => placeGoblinInFirstFreeColumn(session, placements, goblin.id, platformRow),
    {}
  );
}

export function normalizeGoblinPlacements(
  session: MiningSession,
  hiredGoblins: GoblinConfig[],
  placements: GoblinPlacementMap,
  options: { placeMissing: boolean; platformRow: number }
): GoblinPlacementMap {
  const normalized: GoblinPlacementMap = {};
  const usedColumns = new Set<number>();

  for (const goblin of hiredGoblins) {
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

    return placeGoblinInFirstFreeColumn(session, currentPlacements, goblin.id, options.platformRow);
  }, normalized);
}

export function placeGoblinInFirstFreeColumn(
  session: MiningSession,
  placements: GoblinPlacementMap,
  goblinId: string,
  platformRow: number
): GoblinPlacementMap {
  const occupiedColumns = new Set(
    Object.entries(placements)
      .filter(([placedGoblinId]) => placedGoblinId !== goblinId)
      .map(([, column]) => column)
  );
  const targetCell =
    findPlatformCells(session, platformRow).find((cell) => !occupiedColumns.has(cell.col)) ??
    findPlatformCells(session, platformRow).find((cell) => cell.col === placements[goblinId]);

  if (!targetCell) {
    return placements;
  }

  return {
    ...placements,
    [goblinId]: targetCell.col
  };
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

function goblinName(goblin: GoblinConfig, labels: Record<string, string>): string {
  return createGoblinIdentity(goblin, labels).fullName;
}
