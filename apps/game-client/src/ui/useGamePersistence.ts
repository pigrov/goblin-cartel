import type { ContentBundle } from "@goblin-cartel/content-schemas";
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
import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import {
  saveStoredBossCards,
  saveStoredGoblinRoster,
  saveStoredMiningSession,
  type StoredGoblinRoster,
  type StoredMineSave
} from "./playerSave";
import type { ForemanAssignments } from "./foremanTowerState";
import type { MineRunStats } from "./mineRunStats";
import { uploadPlayerDbScores, uploadStoredPlayerDbSave } from "./playerDbSaveClient";
import { createPlayerDbScoreRows } from "./playerDbScores";
import { createPlayerDbSyncState, type PlayerDbSyncState } from "./playerDbSyncState";
import type { GoblinPlacementMap } from "./useGoblinPlacement";

const remoteSaveDelayMs = 1500;

export function useGamePersistence(input: {
  activeCell: { row: number; col: number };
  bossCardDefinitions: BossCardDefinition[];
  bossCards: BossCardState;
  bossEnergy: BossEnergyState;
  builtMines: BuiltMineState[];
  content: ContentBundle;
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
  setPlayerDbSyncState: Dispatch<SetStateAction<PlayerDbSyncState>>;
}) {
  const remoteSaveTimerRef = useRef<number | null>(null);
  const remoteSaveInFlightRef = useRef(false);
  const remoteSavePendingRef = useRef(false);
  const remoteSaveInputRef = useRef({
    bossCardDefinitions: input.bossCardDefinitions,
    builtMines: input.builtMines,
    content: input.content,
    contentVersion: input.contentVersion,
    mineRunStats: input.mineRunStats,
    platformRow: input.platformRow,
    roster: input.roster,
    session: input.session,
    sessionReady: input.sessionReady
  });
  remoteSaveInputRef.current = {
    bossCardDefinitions: input.bossCardDefinitions,
    builtMines: input.builtMines,
    content: input.content,
    contentVersion: input.contentVersion,
    mineRunStats: input.mineRunStats,
    platformRow: input.platformRow,
    roster: input.roster,
    session: input.session,
    sessionReady: input.sessionReady
  };

  function queueRemoteSave(): void {
    if (remoteSaveTimerRef.current !== null) {
      return;
    }

    input.setPlayerDbSyncState((current) =>
      current.status === "queued" || current.status === "syncing"
        ? current
        : createPlayerDbSyncState({
            status: "queued",
            revision: current.revision,
            message: "Ожидает отправки на сервер"
          })
    );

    remoteSaveTimerRef.current = window.setTimeout(() => {
      remoteSaveTimerRef.current = null;
      void flushRemoteSave();
    }, remoteSaveDelayMs);
  }

  async function flushRemoteSave(): Promise<void> {
    if (remoteSaveInFlightRef.current) {
      remoteSavePendingRef.current = true;
      queueRemoteSave();
      return;
    }

    const latest = remoteSaveInputRef.current;

    if (!latest.sessionReady) {
      remoteSavePendingRef.current = false;
      return;
    }

    remoteSavePendingRef.current = false;
    remoteSaveInFlightRef.current = true;
    input.setPlayerDbSyncState((current) =>
      createPlayerDbSyncState({
        status: "syncing",
        revision: current.revision,
        message: "Сохранение на сервер"
      })
    );

    try {
      const result = await uploadStoredPlayerDbSave({
        contentVersion: latest.contentVersion,
        definitions: latest.bossCardDefinitions
      });
      await uploadPlayerDbScores({
        scores: createPlayerDbScoreRows({
          builtMines: latest.builtMines,
          content: latest.content,
          mineRunStats: latest.mineRunStats,
          platformRow: latest.platformRow,
          roster: latest.roster,
          session: latest.session
        })
      });

      input.setPlayerDbSyncState((current) => syncStateFromUploadResult(result, current.revision));
    } finally {
      remoteSaveInFlightRef.current = false;

      if (remoteSavePendingRef.current) {
        queueRemoteSave();
      }
    }
  }

  useEffect(
    () => () => {
      if (remoteSaveTimerRef.current !== null) {
        window.clearTimeout(remoteSaveTimerRef.current);
        remoteSaveTimerRef.current = null;
      }
    },
    []
  );

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

  useEffect(() => {
    if (!input.sessionReady) {
      return;
    }

    remoteSavePendingRef.current = true;
    queueRemoteSave();
  }, [
    input.activeCell,
    input.bossCardDefinitions,
    input.bossCards,
    input.bossEnergy,
    input.builtMines,
    input.content,
    input.contentVersion,
    input.elevatorLevel,
    input.foremanAssignments,
    input.goblinPlacements,
    input.mineCompletionNoticeSeenIds,
    input.mineRunStats,
    input.platformRow,
    input.roster,
    input.session,
    input.sessionReady
  ]);

}

function syncStateFromUploadResult(
  result: Awaited<ReturnType<typeof uploadStoredPlayerDbSave>>,
  currentRevision: number | null
): PlayerDbSyncState {
  if (result.ok && result.uploaded) {
    return createPlayerDbSyncState({
      status: "synced",
      revision: result.revision,
      message: result.conflictResolved
        ? "Локальный прогресс перезаписал серверную ревизию"
        : "Прогресс сохранен на сервере"
    });
  }

  if (result.ok) {
    return createPlayerDbSyncState({
      status: "local_only",
      revision: currentRevision,
      message: "Прогресс пока хранится локально"
    });
  }

  if (result.code === "network_error") {
    return createPlayerDbSyncState({
      status: "offline",
      revision: currentRevision,
      message: "Сервер недоступен, прогресс не потерян"
    });
  }

  if (result.code === "revision_conflict") {
    return createPlayerDbSyncState({
      status: "conflict",
      revision: result.currentRevision ?? currentRevision,
      message: "Конфликт сохранения, локальный прогресс оставлен"
    });
  }

  return createPlayerDbSyncState({
    status: "error",
    revision: currentRevision,
    message: result.code === "invalid_session" ? "Сессия игрока сброшена" : "Сохранение не отправлено"
  });
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
