import {
  applyBossCardBonuses,
  applyPlatformAutoMining,
  createBossCardDefinitions,
  createBossEnergyState,
  createInitialGoblinRoster,
  createMiningSession,
  ensureGoblinRosterInstances,
  findPlatformRow,
  generateMine,
  getGoblinLevel,
  isGoblinHired,
  normalizeGoblinRoster,
  restoreBossEnergyState,
  restoreMiningSession,
  type BossCardState,
  type BossEnergyConfig,
  type BossEnergyState,
  type BuiltMineState,
  type GoblinRosterState,
  type MiningFoundVein,
  type MiningSession
} from "@goblin-cartel/game-core";
import { starterContentBundle, type ContentBundle, type GoblinConfig } from "@goblin-cartel/content-schemas";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { collectAutomatedBuiltMineIncomeWithCollectors, getGoblinAutoCollectSlots } from "./builtMineClientState";
import {
  createEmptyForemanAssignments,
  getAssignedForemen,
  normalizeForemanAssignments,
  type ForemanAssignments
} from "./foremanTowerState";
import { getElevatorLevelConfig, normalizeElevatorLevel } from "./elevatorState";
import { isMiningGoblin } from "./goblinHutClientState";
import { addMineRunBlockRewards, createMineRunStats, restoreMineRunStats, type MineRunStats } from "./mineRunStats";
import { createOfflineMiningSummary, type OfflineMiningSummary } from "./offlineMiningSummary";
import { apiUrl } from "./apiClient";
import { bootstrapPlayerDbSave } from "./playerDbSaveClient";
import { createPlayerDbSyncState, type PlayerDbSyncState } from "./playerDbSyncState";
import { loadStoredBossCards, loadStoredGoblinRoster, loadStoredMiningSession } from "./playerSave";
import { contentVersionWithRuntimeSuffix, createRuntimeContentBundle } from "./runtimeContent";
import {
  assignGoblinWorkers,
  createDefaultGoblinPlacements,
  getGoblinOfflineAutoDamageMultiplier,
  getGoblinOfflineRelocationSlots,
  getGoblinOfflineRewardMultiplier,
  normalizeGoblinPlacements,
  relocateOfflineGoblinPlacements,
  type GoblinPlacementMap
} from "./useGoblinPlacement";
import { createRuntimeGoblinConfigs } from "./goblinRuntimeUnits";
import { createAvailableGoblins } from "./goblinContent";
import { findExposedCellForPreferred } from "./useMiningLoop";

const mineSeed = "local-player-001";
const maxOfflineMiningSeconds = 6 * 60 * 60;

export const initialContentBundle = starterContentBundle;

export interface ContentState {
  content: ContentBundle;
  version: string;
  source: "error" | "loading" | "published";
  message: string;
}

export type { OfflineMiningSummary } from "./offlineMiningSummary";

interface RestoredMiningState {
  session: MiningSession;
  activeCell: {
    row: number;
    col: number;
  };
  offlineSummary: OfflineMiningSummary | null;
  pendingOfflineFinalHit: {
    row: number;
    col: number;
  } | null;
  platformRow: number;
  goblinPlacements: GoblinPlacementMap;
  elevatorLevel: number;
  bossEnergy: BossEnergyState;
  builtMines: BuiltMineState[];
  foremanAssignments: ForemanAssignments;
  mineCompletionNoticeSeenIds: string[];
  mineRunStats: MineRunStats;
}

export function useGameBootstrap(input: {
  baseBossEnergyConfig: BossEnergyConfig;
  resetRewardChest: () => void;
  setActiveCell: Dispatch<SetStateAction<{ row: number; col: number }>>;
  setBossCards: Dispatch<SetStateAction<BossCardState>>;
  setBossCardsMessage: Dispatch<SetStateAction<string | null>>;
  setBossCardsOpen: Dispatch<SetStateAction<boolean>>;
  setBossEnergy: Dispatch<SetStateAction<BossEnergyState>>;
  setBuiltMineMessage: Dispatch<SetStateAction<string | null>>;
  setBuiltMines: Dispatch<SetStateAction<BuiltMineState[]>>;
  setClockNow: Dispatch<SetStateAction<number>>;
  setContentState: Dispatch<SetStateAction<ContentState>>;
  setElevatorLevel: Dispatch<SetStateAction<number>>;
  setFoundVeinNotice: Dispatch<SetStateAction<MiningFoundVein | null>>;
  setForemanAssignments: Dispatch<SetStateAction<ForemanAssignments>>;
  setGoblinPlacements: Dispatch<SetStateAction<GoblinPlacementMap>>;
  setLoadingContent: Dispatch<SetStateAction<boolean>>;
  setMineCompletionNoticeOpen: Dispatch<SetStateAction<boolean>>;
  setMineCompletionNoticeSeenIds: Dispatch<SetStateAction<string[]>>;
  setMineRunStats: Dispatch<SetStateAction<MineRunStats>>;
  setOfflineSummary: Dispatch<SetStateAction<OfflineMiningSummary | null>>;
  setPendingOfflineFinalHit: Dispatch<SetStateAction<{ row: number; col: number } | null>>;
  setPlatformRow: Dispatch<SetStateAction<number>>;
  setPlayerDbSyncState: Dispatch<SetStateAction<PlayerDbSyncState>>;
  setRoster: Dispatch<SetStateAction<GoblinRosterState>>;
  setSession: Dispatch<SetStateAction<MiningSession>>;
  setSessionReady: Dispatch<SetStateAction<boolean>>;
  setVisibleResourceAmounts: (resources: Record<string, number>) => void;
}) {
  useEffect(() => {
    let active = true;

    async function loadContent() {
      try {
        const response = await fetch(apiUrl("/api/content/current"), {
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(response.status === 404 ? "Нет опубликованного контента" : "Контент не загрузился");
        }

        const payload = (await response.json()) as {
          version: { version: string };
          content: ContentBundle;
        };

        if (active) {
          const runtimeContent = createRuntimeContentBundle(payload.content);
          const runtimeVersion = contentVersionWithRuntimeSuffix(payload.version.version);
          const nextBossCardDefinitions = createBossCardDefinitions(runtimeContent.bossCards);
          input.setPlayerDbSyncState(
            createPlayerDbSyncState({
              status: "connecting",
              message: "Подключение к серверному сохранению"
            })
          );
          const playerDbBootstrap = await bootstrapPlayerDbSave({
            contentVersion: runtimeVersion,
            definitions: nextBossCardDefinitions
          });

          if (!active) {
            return;
          }

          if (playerDbBootstrap.ok) {
            input.setPlayerDbSyncState(
              createPlayerDbSyncState({
                status: playerDbBootstrap.appliedServerSave ? "restored" : "local_only",
                revision: playerDbBootstrap.serverRevision,
                message: playerDbBootstrap.appliedServerSave
                  ? "Прогресс загружен с сервера"
                  : playerDbBootstrap.serverRevision !== null
                    ? "Серверная ревизия не применена к текущему контенту"
                    : "Первое локальное сохранение"
              })
            );
          } else {
            input.setPlayerDbSyncState(
              createPlayerDbSyncState({
                status: playerDbBootstrap.code === "network_error" ? "offline" : "error",
                message:
                  playerDbBootstrap.code === "network_error"
                    ? "Сервер недоступен, игра идет локально"
                    : "Серверное сохранение не применено"
              })
            );
          }

          const nextRoster = createRestoredGoblinRoster(runtimeContent, runtimeVersion);
          const nextBossCards = loadStoredBossCards(localStorage, nextBossCardDefinitions, runtimeVersion);
          const restoredMining = createRestoredMiningState(
            runtimeContent,
            runtimeVersion,
            nextRoster,
            applyBossCardBonuses(input.baseBossEnergyConfig, nextBossCards, nextBossCardDefinitions)
          );

          input.setContentState({
            content: runtimeContent,
            version: runtimeVersion,
            source: "published",
            message: "Опубликованный контент"
          });
          input.setSession(restoredMining.session);
          input.setVisibleResourceAmounts(restoredMining.session.resources);
          input.setRoster(nextRoster);
          input.setActiveCell(restoredMining.activeCell);
          input.setPlatformRow(restoredMining.platformRow);
          input.setOfflineSummary(restoredMining.offlineSummary);
          input.setPendingOfflineFinalHit(restoredMining.pendingOfflineFinalHit);
          input.setForemanAssignments(restoredMining.foremanAssignments);
          input.setElevatorLevel(restoredMining.elevatorLevel);
          input.setGoblinPlacements(restoredMining.goblinPlacements);
          input.setBossCards(nextBossCards);
          input.setBossEnergy(restoredMining.bossEnergy);
          input.setBuiltMines(restoredMining.builtMines);
          input.setMineCompletionNoticeSeenIds(restoredMining.mineCompletionNoticeSeenIds);
          input.setMineRunStats(restoredMining.mineRunStats);
          input.setMineCompletionNoticeOpen(false);
          input.resetRewardChest();
          input.setBossCardsOpen(false);
          input.setBossCardsMessage(null);
          input.setBuiltMineMessage(null);
          input.setFoundVeinNotice(null);
          input.setClockNow(Date.now());
          input.setSessionReady(true);
        }
      } catch (error) {
        if (active) {
          input.setContentState({
            content: initialContentBundle,
            version: "",
            source: "error",
            message: error instanceof Error ? error.message : "Контент не загрузился"
          });
          input.setSessionReady(false);
          input.setMineCompletionNoticeOpen(false);
          input.setElevatorLevel(1);
          input.setMineRunStats(createMineRunStats(initialContentBundle.mineTemplates[0]?.id ?? "initial"));
          input.resetRewardChest();
          input.setBuiltMineMessage(null);
          input.setFoundVeinNotice(null);
          input.setClockNow(Date.now());
          input.setSessionReady(true);
        }
      } finally {
        if (active) {
          input.setLoadingContent(false);
        }
      }
    }

    void loadContent();

    return () => {
      active = false;
    };
  }, []);
}

export function createSession(
  content: ContentBundle,
  mineTemplateId?: string,
  resources: Record<string, number> = {}
): MiningSession {
  const mineTemplate =
    (mineTemplateId ? content.mineTemplates.find((template) => template.id === mineTemplateId) : undefined) ?? content.mineTemplates[0];

  if (!mineTemplate) {
    throw new Error("Published content has no mine templates.");
  }

  const session = createMiningSession({
    mine: generateMine(mineTemplate, mineSeed),
    blockTypes: content.blockTypes,
    mineDifficultyMultiplier: 1
  });

  return {
    ...session,
    resources: { ...resources }
  };
}

function createRestoredMiningState(
  content: ContentBundle,
  contentVersion: string,
  roster: GoblinRosterState,
  bossEnergyConfig: BossEnergyConfig
): RestoredMiningState {
  const storedSave = loadStoredMiningSession(localStorage, contentVersion);
  const hiredGoblins = createHiredGoblins(content, roster);
  const hiredCollectorGoblins = hiredGoblins.filter((goblin) => getGoblinAutoCollectSlots(goblin, getGoblinLevel(roster, goblin.id)) > 0);
  const miningGoblins = createRuntimeGoblinConfigs(createAvailableGoblins(content), roster).filter(isMiningGoblin);
  const now = Date.now();
  const storedMineTemplateId = storedSave?.save.mineTemplateId;
  const session = createSession(content, storedMineTemplateId);

  if (!storedSave) {
    const initialPlatformRow = findPlatformRow(session, 0);
    const initialElevatorLevel = 1;
    const initialPlatformSlots = getElevatorLevelConfig(content.elevator, initialElevatorLevel).platformSlots;

    return {
      session,
      activeCell: findFirstPlayableCell(session),
      offlineSummary: null,
      pendingOfflineFinalHit: null,
      platformRow: initialPlatformRow,
      goblinPlacements: createDefaultGoblinPlacements(session, miningGoblins, initialPlatformRow, initialPlatformSlots),
      elevatorLevel: initialElevatorLevel,
      bossEnergy: createBossEnergyState(bossEnergyConfig, now),
      builtMines: [],
      foremanAssignments: createEmptyForemanAssignments(),
      mineCompletionNoticeSeenIds: [],
      mineRunStats: createMineRunStats(session.mine.templateId, session.destroyedBlocks)
    };
  }

  try {
    const restoredSession = restoreMiningSession(session, storedSave.save);
    const restoredPlatformRow = findPlatformRow(restoredSession, storedSave.platformRow ?? 0);
    const restoredElevatorLevel = normalizeElevatorLevel(content.elevator, storedSave.elevatorLevel);
    const restoredPlatformSlots = getElevatorLevelConfig(content.elevator, restoredElevatorLevel).platformSlots;
    const restoredActiveCell = storedSave.activeCell ?? findFirstPlayableCell(restoredSession);
    const restoredPlacements = storedSave.goblinPlacements
      ? normalizeGoblinPlacements(restoredSession, miningGoblins, storedSave.goblinPlacements, {
          maxPlacements: restoredPlatformSlots,
          placeMissing: true,
          platformRow: restoredPlatformRow
        })
      : createDefaultGoblinPlacements(restoredSession, miningGoblins, restoredPlatformRow, restoredPlatformSlots);
    const restoredBossEnergy = restoreBossEnergyState(storedSave.bossEnergy, bossEnergyConfig, now);
    const restoredBuiltMines = normalizeBuiltMineCollectorAssignments(storedSave.builtMines ?? [], hiredGoblins, roster);
    const restoredForemanAssignments = normalizeForemanAssignments(storedSave.foremanAssignments, createAvailableGoblins(content), roster);
    const automatedMineIncome = collectAutomatedBuiltMineIncomeWithCollectors({
      builtMines: restoredBuiltMines,
      collectors: hiredCollectorGoblins,
      goblinLevels: Object.fromEntries((roster.instances ?? []).map((instance) => [instance.id, instance.level])),
      now,
      resources: restoredSession.resources
    });
    const restoredSessionWithAutomatedIncome = {
      ...restoredSession,
      resources: automatedMineIncome.resources
    };
    const restoredMineCompletionNoticeSeenIds = normalizeIdList(storedSave.mineCompletionNoticeSeenIds ?? []);
    const restoredMineRunStats = restoreMineRunStats(
      storedSave.mineRunStats,
      restoredSessionWithAutomatedIncome.mine.templateId,
      restoredSessionWithAutomatedIncome.destroyedBlocks
    );

    return applyOfflineMining(
      content,
      restoredSessionWithAutomatedIncome,
      restoredActiveCell,
      restoredPlatformRow,
      roster,
      restoredPlacements,
      restoredBossEnergy,
      automatedMineIncome.builtMines,
      restoredForemanAssignments,
      restoredElevatorLevel,
      restoredMineCompletionNoticeSeenIds,
      restoredMineRunStats,
      storedSave.savedAt
    );
  } catch {
    const initialPlatformRow = findPlatformRow(session, 0);
    const initialElevatorLevel = 1;
    const initialPlatformSlots = getElevatorLevelConfig(content.elevator, initialElevatorLevel).platformSlots;

    return {
      session,
      activeCell: findFirstPlayableCell(session),
      offlineSummary: null,
      pendingOfflineFinalHit: null,
      platformRow: initialPlatformRow,
      goblinPlacements: createDefaultGoblinPlacements(session, miningGoblins, initialPlatformRow, initialPlatformSlots),
      elevatorLevel: initialElevatorLevel,
      bossEnergy: createBossEnergyState(bossEnergyConfig, now),
      builtMines: [],
      foremanAssignments: createEmptyForemanAssignments(),
      mineCompletionNoticeSeenIds: [],
      mineRunStats: createMineRunStats(session.mine.templateId, session.destroyedBlocks)
    };
  }
}

function applyOfflineMining(
  content: ContentBundle,
  session: MiningSession,
  activeCell: { row: number; col: number },
  platformRow: number,
  roster: GoblinRosterState,
  goblinPlacements: GoblinPlacementMap,
  bossEnergy: BossEnergyState,
  builtMines: BuiltMineState[],
  foremanAssignments: ForemanAssignments,
  elevatorLevel: number,
  mineCompletionNoticeSeenIds: string[],
  mineRunStats: MineRunStats,
  savedAt: number | undefined
): RestoredMiningState {
  const activePlatformRow = findPlatformRow(session, platformRow);
  const elevatorLevelConfig = getElevatorLevelConfig(content.elevator, elevatorLevel);
  const platformSlots = elevatorLevelConfig.platformSlots;
  const availableGoblins = createAvailableGoblins(content);
  const miningGoblins = createRuntimeGoblinConfigs(availableGoblins, roster).filter(isMiningGoblin);
  const normalizedPlacements = normalizeGoblinPlacements(session, miningGoblins, goblinPlacements, {
    maxPlacements: platformSlots,
    placeMissing: false,
    platformRow: activePlatformRow
  });

  if (!savedAt) {
    return {
      session,
      activeCell,
      offlineSummary: null,
      pendingOfflineFinalHit: null,
      platformRow: activePlatformRow,
      goblinPlacements: normalizedPlacements,
      elevatorLevel,
      bossEnergy,
      builtMines,
      foremanAssignments,
      mineCompletionNoticeSeenIds,
      mineRunStats
    };
  }

  const offlineSeconds = Math.min(maxOfflineMiningSeconds, Math.max(0, Math.floor((Date.now() - savedAt) / 1000)));

  if (offlineSeconds < 5) {
    return {
      session,
      activeCell,
      offlineSummary: null,
      pendingOfflineFinalHit: null,
      platformRow: activePlatformRow,
      goblinPlacements: normalizedPlacements,
      elevatorLevel,
      bossEnergy,
      builtMines,
      foremanAssignments,
      mineCompletionNoticeSeenIds,
      mineRunStats
    };
  }

  const restoredPlacements = normalizedPlacements;
  const hiredForemen = getAssignedForemen(availableGoblins, roster, foremanAssignments);
  const offlineRelocationSlots = hiredForemen.reduce(
    (slots, goblin) => slots + getGoblinOfflineRelocationSlots(goblin, getGoblinLevel(roster, goblin.id)),
    0
  );
  const offlineDamageMultiplier = hiredForemen.reduce(
    (multiplier, goblin) => multiplier + getGoblinOfflineAutoDamageMultiplier(goblin, getGoblinLevel(roster, goblin.id)) - 1,
    Math.max(1, elevatorLevelConfig.offlineDamageMultiplier)
  );
  const offlineRewardMultiplier = hiredForemen.reduce(
    (multiplier, goblin) => multiplier + getGoblinOfflineRewardMultiplier(goblin, getGoblinLevel(roster, goblin.id)) - 1,
    1
  );
  let nextPlacements = restoredPlacements;
  let relocationMovesLeft = offlineRelocationSlots;
  let relocationMoves = 0;

  if (relocationMovesLeft > 0) {
    const relocation = relocateOfflineGoblinPlacements(
      session,
      miningGoblins,
      nextPlacements,
      activePlatformRow,
      roster,
      relocationMovesLeft
    );
    nextPlacements = relocation.placements;
    relocationMovesLeft -= relocation.moves;
    relocationMoves += relocation.moves;
  }

  if (assignGoblinWorkers(session, miningGoblins, nextPlacements, activePlatformRow, roster).length === 0) {
    const offlineSummary = createOfflineMiningSummary({
      destroyedBlocks: 0,
      pendingFinalHit: false,
      relocationMoves,
      rewards: {},
      seconds: offlineSeconds
    });

    return {
      session,
      activeCell,
      offlineSummary,
      pendingOfflineFinalHit: null,
      platformRow: activePlatformRow,
      goblinPlacements: nextPlacements,
      elevatorLevel,
      bossEnergy,
      builtMines,
      foremanAssignments,
      mineCompletionNoticeSeenIds,
      mineRunStats
    };
  }

  let nextSession = session;
  let nextActiveCell = activeCell;
  let nextPlatformRow = activePlatformRow;
  let destroyedBlocks = 0;
  let rewards: Record<string, number> = {};
  let pendingFinalHit: { row: number; col: number } | null = null;
  const processedGoblinIds = new Set<string>();
  const maxCycles = Math.max(1, miningGoblins.length + offlineRelocationSlots);

  for (let cycle = 0; cycle < maxCycles; cycle += 1) {
    const workers = assignGoblinWorkers(
      nextSession,
      miningGoblins.filter((goblin) => !processedGoblinIds.has(goblin.id)),
      nextPlacements,
      nextPlatformRow,
      roster
    );
    const worker = workers[0];

    if (!worker) {
      if (relocationMovesLeft <= 0) {
        break;
      }

      const relocation = relocateOfflineGoblinPlacements(
        nextSession,
        miningGoblins.filter((goblin) => !processedGoblinIds.has(goblin.id)),
        nextPlacements,
        nextPlatformRow,
        roster,
        relocationMovesLeft
      );

      if (relocation.moves === 0) {
        break;
      }

      nextPlacements = relocation.placements;
      relocationMovesLeft -= relocation.moves;
      relocationMoves += relocation.moves;
      continue;
    }

    const targetBlock = nextSession.blocks[nextPlatformRow]?.[worker.targetCell.col];

    if (!targetBlock || targetBlock.destroyed) {
      processedGoblinIds.add(worker.goblin.id);
      continue;
    }

    const autoDamage = worker.damagePerSecond * offlineDamageMultiplier;

    if (autoDamage <= 0) {
      processedGoblinIds.add(worker.goblin.id);
      continue;
    }

    const result = applyPlatformAutoMining(nextSession, content.blockTypes, {
      platformRow: nextPlatformRow,
      column: worker.targetCell.col,
      damage: offlineSeconds * autoDamage,
      holdLastDestroy: pendingFinalHit === null
    });

    const scaledRewards = multiplyResourceRewards(result.report.rewards, offlineRewardMultiplier);
    const bonusRewards = subtractResourceRewards(scaledRewards, result.report.rewards);

    nextSession = Object.keys(bonusRewards).length > 0
      ? {
          ...result.session,
          resources: mergeResourceMaps(result.session.resources, bonusRewards)
        }
      : result.session;
    nextPlatformRow = result.platformRow;
    nextActiveCell = result.nextTargetCell;
    destroyedBlocks += result.report.destroyedBlocks;
    rewards = mergeResourceMaps(rewards, scaledRewards);

    if (!pendingFinalHit && result.report.pendingFinalHit) {
      pendingFinalHit = result.report.pendingFinalHit;
    }

    processedGoblinIds.add(worker.goblin.id);

    if (pendingFinalHit) {
      break;
    }

    if (relocationMovesLeft > 0) {
      const relocation = relocateOfflineGoblinPlacements(
        nextSession,
        miningGoblins.filter((goblin) => !processedGoblinIds.has(goblin.id)),
        nextPlacements,
        nextPlatformRow,
        roster,
        relocationMovesLeft
      );
      nextPlacements = relocation.placements;
      relocationMovesLeft -= relocation.moves;
      relocationMoves += relocation.moves;
    }
  }

  const offlineSummary = createOfflineMiningSummary({
    destroyedBlocks,
    pendingFinalHit: Boolean(pendingFinalHit),
    relocationMoves,
    rewards,
    seconds: offlineSeconds
  });

  return {
    session: nextSession,
    activeCell: pendingFinalHit ?? findExposedCellForPreferred(nextSession, nextActiveCell),
    offlineSummary,
    pendingOfflineFinalHit: pendingFinalHit,
    platformRow: pendingFinalHit ? pendingFinalHit.row : nextPlatformRow,
    goblinPlacements: normalizeGoblinPlacements(nextSession, miningGoblins, nextPlacements, {
      maxPlacements: platformSlots,
      placeMissing: false,
      platformRow: pendingFinalHit ? pendingFinalHit.row : nextPlatformRow
    }),
    elevatorLevel,
    bossEnergy,
    builtMines,
    foremanAssignments,
    mineCompletionNoticeSeenIds,
    mineRunStats: offlineSummary
      ? addMineRunBlockRewards(mineRunStats, nextSession.mine.templateId, offlineSummary.rewards, offlineSummary.destroyedBlocks)
      : mineRunStats
  };
}

function createHiredGoblins(content: ContentBundle, roster: GoblinRosterState): GoblinConfig[] {
  return createAvailableGoblins(content).filter((goblin) => isGoblinHired(roster, goblin.id));
}

function normalizeBuiltMineCollectorAssignments(
  builtMines: BuiltMineState[],
  hiredGoblins: GoblinConfig[],
  roster: GoblinRosterState
): BuiltMineState[] {
  const collectorById = new Map(
    hiredGoblins
      .filter((goblin) => getGoblinAutoCollectSlots(goblin, getGoblinLevel(roster, goblin.id)) > 0)
      .map((goblin) => [goblin.id, goblin])
  );
  const assignedSlots = new Map<string, number>();

  return builtMines.map((builtMine) => {
    const collectorId = builtMine.assignedCollectorGoblinId;

    if (!collectorId) {
      return builtMine;
    }

    const collector = collectorById.get(collectorId);

    if (!collector) {
      return {
        ...builtMine,
        assignedCollectorGoblinId: null
      };
    }

    const usedSlots = assignedSlots.get(collectorId) ?? 0;

    if (usedSlots >= getGoblinAutoCollectSlots(collector, getGoblinLevel(roster, collector.id))) {
      return {
        ...builtMine,
        assignedCollectorGoblinId: null
      };
    }

    assignedSlots.set(collectorId, usedSlots + 1);
    return builtMine;
  });
}

function createRestoredGoblinRoster(content: ContentBundle, contentVersion: string): GoblinRosterState {
  const goblins = createAvailableGoblins(content);
  const storedRoster = loadStoredGoblinRoster(localStorage, contentVersion);

  if (!storedRoster) {
    return ensureGoblinRosterInstances(createInitialGoblinRoster(goblins), goblins);
  }

  return ensureGoblinRosterInstances(normalizeGoblinRoster(storedRoster.roster, goblins, content.goblinHut), goblins);
}

function findFirstPlayableCell(session: MiningSession): { row: number; col: number } {
  const block = session.blocks.flat().find((item) => !item.destroyed) ?? session.blocks[0]?.[0];
  return block ? { row: block.row, col: block.col } : { row: 0, col: 0 };
}

function mergeResourceMaps(left: Record<string, number>, right: Record<string, number>): Record<string, number> {
  const result = { ...left };

  for (const [resourceId, amount] of Object.entries(right)) {
    result[resourceId] = (result[resourceId] ?? 0) + amount;
  }

  return result;
}

function multiplyResourceRewards(rewards: Record<string, number>, multiplier: number): Record<string, number> {
  if (multiplier <= 1) {
    return rewards;
  }

  const result: Record<string, number> = {};

  for (const [resourceId, amount] of Object.entries(rewards)) {
    result[resourceId] = Math.max(amount, Math.floor(amount * multiplier));
  }

  return result;
}

function subtractResourceRewards(left: Record<string, number>, right: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [resourceId, amount] of Object.entries(left)) {
    const delta = amount - (right[resourceId] ?? 0);

    if (delta > 0) {
      result[resourceId] = delta;
    }
  }

  return result;
}

function normalizeIdList(values: readonly string[]): string[] {
  return values.filter((value, index, list) => typeof value === "string" && value.length > 0 && list.indexOf(value) === index);
}
