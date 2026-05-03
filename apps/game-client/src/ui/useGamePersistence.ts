import {
  exportMiningSessionSave,
  findPlatformRow,
  type BossCardDefinition,
  type BossCardState,
  type BossEnergyState,
  type BuiltMineState,
  type GoblinRosterState,
  type MiningSession
} from "@goblin-cartel/game-core";
import { useEffect } from "react";
import {
  saveStoredBossCards,
  saveStoredGoblinRoster,
  saveStoredMiningSession,
  type StoredGoblinRoster,
  type StoredMineSave
} from "./playerSave";
import type { ForemanAssignments } from "./foremanTowerState";
import type { MineRunStats } from "./mineRunStats";
import type { GoblinPlacementMap } from "./useGoblinPlacement";

export function useGamePersistence(input: {
  activeCell: { row: number; col: number };
  bossCardDefinitions: BossCardDefinition[];
  bossCards: BossCardState;
  bossEnergy: BossEnergyState;
  builtMines: BuiltMineState[];
  contentVersion: string;
  elevatorLevel: number;
  foremanAssignments: ForemanAssignments;
  goblinPlacements: GoblinPlacementMap;
  mineRunStats: MineRunStats;
  mineCompletionNoticeSeenIds: string[];
  platformRow: number;
  roster: GoblinRosterState;
  session: MiningSession;
  sessionReady: boolean;
}) {
  useEffect(() => {
    if (!input.sessionReady) {
      return;
    }

    saveMiningSession(
      input.contentVersion,
      input.session,
      input.activeCell,
      input.platformRow,
      input.goblinPlacements,
      input.elevatorLevel,
      input.foremanAssignments,
      input.bossEnergy,
      input.builtMines,
      input.mineCompletionNoticeSeenIds,
      input.mineRunStats,
      input.bossCardDefinitions
    );
  }, [
    input.activeCell,
    input.bossCardDefinitions,
    input.bossEnergy,
    input.builtMines,
    input.contentVersion,
    input.elevatorLevel,
    input.foremanAssignments,
    input.goblinPlacements,
    input.mineCompletionNoticeSeenIds,
    input.mineRunStats,
    input.platformRow,
    input.session,
    input.sessionReady
  ]);

  useEffect(() => {
    if (!input.sessionReady) {
      return;
    }

    saveGoblinRoster(input.contentVersion, input.roster, input.bossCardDefinitions);
  }, [input.bossCardDefinitions, input.contentVersion, input.roster, input.sessionReady]);

  useEffect(() => {
    if (!input.sessionReady) {
      return;
    }

    saveStoredBossCards(input.bossCards, localStorage, input.bossCardDefinitions, input.contentVersion);
  }, [input.bossCardDefinitions, input.bossCards, input.contentVersion, input.sessionReady]);
}

export function saveMiningSession(
  contentVersion: string,
  session: MiningSession,
  activeCell: { row: number; col: number },
  platformRow: number,
  goblinPlacements: GoblinPlacementMap,
  elevatorLevel: number,
  foremanAssignments: ForemanAssignments,
  bossEnergy: BossEnergyState,
  builtMines: BuiltMineState[],
  mineCompletionNoticeSeenIds: string[],
  mineRunStats: MineRunStats,
  bossCardDefinitions: BossCardDefinition[]
): void {
  const payload: StoredMineSave = {
    activeCell,
    bossEnergy,
    builtMines,
    contentVersion,
    elevatorLevel,
    foremanAssignments,
    goblinPlacements,
    mineCompletionNoticeSeenIds,
    mineRunStats,
    platformRow: findPlatformRow(session, platformRow),
    save: exportMiningSessionSave(session),
    savedAt: Date.now()
  };
  saveStoredMiningSession(payload, localStorage, bossCardDefinitions);
}

function saveGoblinRoster(contentVersion: string, roster: GoblinRosterState, bossCardDefinitions: BossCardDefinition[]): void {
  const payload: StoredGoblinRoster = {
    contentVersion,
    roster
  };
  saveStoredGoblinRoster(payload, localStorage, bossCardDefinitions);
}
