import {
  applyBossCardBonuses,
  applyPlatformAutoMining,
  calculateCrewAutoDamagePerSecond,
  createBossCardDefinitions,
  createBossEnergyState,
  createInitialGoblinRoster,
  createMiningSession,
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
import { isMiningGoblin } from "./goblinHutClientState";
import { loadStoredBossCards, loadStoredGoblinRoster, loadStoredMiningSession } from "./playerSave";
import { contentVersionWithRuntimeSuffix, createRuntimeContentBundle } from "./runtimeContent";
import {
  assignGoblinWorkers,
  createDefaultGoblinPlacements,
  normalizeGoblinPlacements,
  type GoblinPlacementMap
} from "./useGoblinPlacement";
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

export interface OfflineMiningSummary {
  seconds: number;
  destroyedBlocks: number;
  rewards: Record<string, number>;
  pendingFinalHit: boolean;
}

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
  bossEnergy: BossEnergyState;
  builtMines: BuiltMineState[];
  mineCompletionNoticeSeenIds: string[];
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
  setFoundVeinNotice: Dispatch<SetStateAction<MiningFoundVein | null>>;
  setGoblinPlacements: Dispatch<SetStateAction<GoblinPlacementMap>>;
  setLoadingContent: Dispatch<SetStateAction<boolean>>;
  setMineCompletionNoticeOpen: Dispatch<SetStateAction<boolean>>;
  setMineCompletionNoticeSeenIds: Dispatch<SetStateAction<string[]>>;
  setOfflineSummary: Dispatch<SetStateAction<OfflineMiningSummary | null>>;
  setPendingOfflineFinalHit: Dispatch<SetStateAction<{ row: number; col: number } | null>>;
  setPlatformRow: Dispatch<SetStateAction<number>>;
  setRoster: Dispatch<SetStateAction<GoblinRosterState>>;
  setSession: Dispatch<SetStateAction<MiningSession>>;
  setSessionReady: Dispatch<SetStateAction<boolean>>;
  setVisibleResourceAmounts: (resources: Record<string, number>) => void;
}) {
  useEffect(() => {
    let active = true;

    async function loadContent() {
      try {
        const response = await fetch("/api/content/current", {
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
          const nextRoster = createRestoredGoblinRoster(runtimeContent, runtimeVersion);
          const nextBossCardDefinitions = createBossCardDefinitions(runtimeContent.bossCards);
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
          input.setGoblinPlacements(restoredMining.goblinPlacements);
          input.setBossCards(nextBossCards);
          input.setBossEnergy(restoredMining.bossEnergy);
          input.setBuiltMines(restoredMining.builtMines);
          input.setMineCompletionNoticeSeenIds(restoredMining.mineCompletionNoticeSeenIds);
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
  const miningGoblins = hiredGoblins.filter(isMiningGoblin);
  const now = Date.now();
  const storedMineTemplateId = storedSave?.save.mineTemplateId;
  const session = createSession(content, storedMineTemplateId);

  if (!storedSave) {
    const initialPlatformRow = findPlatformRow(session, 0);

    return {
      session,
      activeCell: findFirstPlayableCell(session),
      offlineSummary: null,
      pendingOfflineFinalHit: null,
      platformRow: initialPlatformRow,
      goblinPlacements: createDefaultGoblinPlacements(session, miningGoblins, initialPlatformRow),
      bossEnergy: createBossEnergyState(bossEnergyConfig, now),
      builtMines: [],
      mineCompletionNoticeSeenIds: []
    };
  }

  try {
    const restoredSession = restoreMiningSession(session, storedSave.save);
    const restoredPlatformRow = findPlatformRow(restoredSession, storedSave.platformRow ?? 0);
    const restoredActiveCell = storedSave.activeCell ?? findFirstPlayableCell(restoredSession);
    const restoredPlacements = storedSave.goblinPlacements
      ? normalizeGoblinPlacements(restoredSession, miningGoblins, storedSave.goblinPlacements, {
          placeMissing: true,
          platformRow: restoredPlatformRow
        })
      : createDefaultGoblinPlacements(restoredSession, miningGoblins, restoredPlatformRow);
    const restoredBossEnergy = restoreBossEnergyState(storedSave.bossEnergy, bossEnergyConfig, now);
    const restoredBuiltMines = normalizeBuiltMineCollectorAssignments(storedSave.builtMines ?? [], hiredGoblins, roster);
    const automatedMineIncome = collectAutomatedBuiltMineIncomeWithCollectors({
      builtMines: restoredBuiltMines,
      collectors: hiredCollectorGoblins,
      goblinLevels: roster.goblinLevels ?? {},
      now,
      resources: restoredSession.resources
    });
    const restoredSessionWithAutomatedIncome = {
      ...restoredSession,
      resources: automatedMineIncome.resources
    };
    const restoredMineCompletionNoticeSeenIds = normalizeIdList(storedSave.mineCompletionNoticeSeenIds ?? []);

    return applyOfflineMining(
      content,
      restoredSessionWithAutomatedIncome,
      restoredActiveCell,
      restoredPlatformRow,
      roster,
      restoredPlacements,
      restoredBossEnergy,
      automatedMineIncome.builtMines,
      restoredMineCompletionNoticeSeenIds,
      storedSave.savedAt
    );
  } catch {
    const initialPlatformRow = findPlatformRow(session, 0);

    return {
      session,
      activeCell: findFirstPlayableCell(session),
      offlineSummary: null,
      pendingOfflineFinalHit: null,
      platformRow: initialPlatformRow,
      goblinPlacements: createDefaultGoblinPlacements(session, miningGoblins, initialPlatformRow),
      bossEnergy: createBossEnergyState(bossEnergyConfig, now),
      builtMines: [],
      mineCompletionNoticeSeenIds: []
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
  mineCompletionNoticeSeenIds: string[],
  savedAt: number | undefined
): RestoredMiningState {
  const activePlatformRow = findPlatformRow(session, platformRow);

  if (!savedAt) {
    return {
      session,
      activeCell,
      offlineSummary: null,
      pendingOfflineFinalHit: null,
      platformRow: activePlatformRow,
      goblinPlacements,
      bossEnergy,
      builtMines,
      mineCompletionNoticeSeenIds
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
      goblinPlacements,
      bossEnergy,
      builtMines,
      mineCompletionNoticeSeenIds
    };
  }

  const availableGoblins = createAvailableGoblins(content);
  const miningGoblins = availableGoblins.filter((goblin) => isGoblinHired(roster, goblin.id) && isMiningGoblin(goblin));
  const restoredPlacements = normalizeGoblinPlacements(session, miningGoblins, goblinPlacements, {
    placeMissing: false,
    platformRow: activePlatformRow
  });
  const workers = assignGoblinWorkers(session, miningGoblins, restoredPlacements, activePlatformRow, roster);

  if (workers.length === 0) {
    return {
      session,
      activeCell,
      offlineSummary: null,
      pendingOfflineFinalHit: null,
      platformRow: activePlatformRow,
      goblinPlacements: restoredPlacements,
      bossEnergy,
      builtMines,
      mineCompletionNoticeSeenIds
    };
  }

  let nextSession = session;
  let nextActiveCell = activeCell;
  let nextPlatformRow = activePlatformRow;
  let destroyedBlocks = 0;
  let rewards: Record<string, number> = {};
  let pendingFinalHit: { row: number; col: number } | null = null;

  for (const worker of workers) {
    const targetBlock = nextSession.blocks[nextPlatformRow]?.[worker.targetCell.col];

    if (!targetBlock || targetBlock.destroyed) {
      continue;
    }

    const autoDamage = calculateCrewAutoDamagePerSecond({
      blockTags: targetBlock.tags,
      goblins: [worker.goblin],
      roster: {
        hiredGoblinIds: [worker.goblin.id]
      }
    });

    if (autoDamage <= 0) {
      continue;
    }

    const result = applyPlatformAutoMining(nextSession, content.blockTypes, {
      platformRow: nextPlatformRow,
      column: worker.targetCell.col,
      damage: offlineSeconds * autoDamage,
      holdLastDestroy: pendingFinalHit === null
    });

    nextSession = result.session;
    nextPlatformRow = result.platformRow;
    nextActiveCell = result.nextTargetCell;
    destroyedBlocks += result.report.destroyedBlocks;
    rewards = mergeResourceMaps(rewards, result.report.rewards);

    if (!pendingFinalHit && result.report.pendingFinalHit) {
      pendingFinalHit = result.report.pendingFinalHit;
    }
  }

  const hasOfflineProgress = destroyedBlocks > 0 || Boolean(pendingFinalHit);

  return {
    session: nextSession,
    activeCell: pendingFinalHit ?? findExposedCellForPreferred(nextSession, nextActiveCell),
    offlineSummary: hasOfflineProgress
      ? {
          seconds: offlineSeconds,
          destroyedBlocks,
          rewards,
          pendingFinalHit: Boolean(pendingFinalHit)
        }
      : null,
    pendingOfflineFinalHit: pendingFinalHit,
    platformRow: pendingFinalHit ? pendingFinalHit.row : nextPlatformRow,
    goblinPlacements: normalizeGoblinPlacements(nextSession, miningGoblins, restoredPlacements, {
      placeMissing: false,
      platformRow: pendingFinalHit ? pendingFinalHit.row : nextPlatformRow
    }),
    bossEnergy,
    builtMines,
    mineCompletionNoticeSeenIds
  };
}

function createHiredGoblins(content: ContentBundle, roster: GoblinRosterState): GoblinConfig[] {
  return createAvailableGoblins(content).filter((goblin) => isGoblinHired(roster, goblin.id));
}

function createAvailableGoblins(content: ContentBundle): GoblinConfig[] {
  return [...content.goblins].sort((left, right) => left.sortOrder - right.sortOrder);
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
    return createInitialGoblinRoster(goblins);
  }

  return normalizeGoblinRoster(storedRoster.roster, goblins, content.goblinHut);
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

function normalizeIdList(values: readonly string[]): string[] {
  return values.filter((value, index, list) => typeof value === "string" && value.length > 0 && list.indexOf(value) === index);
}
