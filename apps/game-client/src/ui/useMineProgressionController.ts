import type { ContentBundle, GoblinConfig, MineTemplateConfig } from "@goblin-cartel/content-schemas";
import {
  findPlatformRow,
  type BossCardDefinition,
  type BossEnergyState,
  type BuiltMineState,
  type MiningBlockState,
  type MiningFoundVein,
  type MiningSession
} from "@goblin-cartel/game-core";
import { type Dispatch, type SetStateAction, useCallback, useMemo } from "react";
import {
  canMoveToNextMine,
  carryFoundVeinsToNextMineSession,
  findMineTemplateIndex,
  findNextMineTemplate,
  markMineCompletionNoticeSeen
} from "./mineProgressionClientState";
import { createMineRunStats, type MineRunStats } from "./mineRunStats";
import { createSession, type OfflineMiningSummary } from "./useGameBootstrap";
import { saveMiningSession } from "./useGamePersistence";
import type { ForemanAssignments } from "./foremanTowerState";
import { createDefaultGoblinPlacements, type GoblinPlacementMap } from "./useGoblinPlacement";
import { useRewardChestFlow } from "./useRewardChestFlow";

type GameSection = "mine" | "base" | "goblins" | "builtMines";

export function useMineProgressionController(input: {
  bossCardDefinitions: BossCardDefinition[];
  bossEnergy: BossEnergyState;
  builtMines: BuiltMineState[];
  content: ContentBundle;
  contentVersion: string;
  createBossEnergyStateForNow: (now: number) => BossEnergyState;
  elevatorLevel: number;
  foremanAssignments: ForemanAssignments;
  labels: Record<string, string>;
  mineCompletionNoticeSeenIds: string[];
  miningGoblins: GoblinConfig[];
  platformSlots: number;
  session: MiningSession;
  setActiveCell: Dispatch<SetStateAction<{ row: number; col: number }>>;
  setActiveSection: Dispatch<SetStateAction<GameSection>>;
  setBossEnergy: Dispatch<SetStateAction<BossEnergyState>>;
  setBuiltMineMessage: Dispatch<SetStateAction<string | null>>;
  setBuiltMines: Dispatch<SetStateAction<BuiltMineState[]>>;
  setClockNow: Dispatch<SetStateAction<number>>;
  setFoundVeinNotice: Dispatch<SetStateAction<MiningFoundVein | null>>;
  setGoblinPlacements: Dispatch<SetStateAction<GoblinPlacementMap>>;
  setMineCompletionNoticeOpen: Dispatch<SetStateAction<boolean>>;
  setMineCompletionNoticeSeenIds: Dispatch<SetStateAction<string[]>>;
  setMineRunStats: Dispatch<SetStateAction<MineRunStats>>;
  setOfflineSummary: Dispatch<SetStateAction<OfflineMiningSummary | null>>;
  setPendingOfflineFinalHit: Dispatch<SetStateAction<{ row: number; col: number } | null>>;
  setPlatformRow: Dispatch<SetStateAction<number>>;
  setSession: Dispatch<SetStateAction<MiningSession>>;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
  syncVisibleResourceAmounts: (resources: Record<string, number>) => void;
  scheduleResourceRewardDisplay: (rewards: Record<string, number>) => void;
  visibleBuiltMines: BuiltMineState[];
}) {
  const mineTemplate =
    input.content.mineTemplates.find((template) => template.id === input.session.mine.templateId) ?? input.content.mineTemplates[0];
  const nextMineTemplate = useMemo(
    () => findNextMineTemplate(input.content.mineTemplates, input.session.mine.templateId),
    [input.content.mineTemplates, input.session.mine.templateId]
  );
  const currentMineIndex = useMemo(
    () => (mineTemplate ? findMineTemplateIndex(input.content.mineTemplates, mineTemplate.id) : -1),
    [input.content.mineTemplates, mineTemplate]
  );
  const canStartNextMine = useMemo(
    () =>
      canMoveToNextMine({
        builtMines: input.visibleBuiltMines,
        mineTemplates: input.content.mineTemplates,
        session: input.session
      }),
    [input.content.mineTemplates, input.session, input.visibleBuiltMines]
  );

  const handleRewardChestRewardsCollected = useCallback(
    (rewards: Record<string, number>) => {
      input.setSession((current) => ({
        ...current,
        lastRewards: {},
        resources: mergeResourceMaps(current.resources, rewards)
      }));
      input.scheduleResourceRewardDisplay(rewards);
    },
    [input]
  );

  const {
    chestRewardFlyouts,
    continueRewardChest: handleContinueRewardChest,
    openPendingRewardChest: handleOpenRewardChest,
    pendingRewardChest,
    pendingRewardChestType,
    queueCellRewardChest,
    queueMineCompletionRewardChest,
    resetRewardChest,
    rewardChestStage
  } = useRewardChestFlow({
    content: input.content,
    labels: input.labels,
    mineCompletionNoticeSeenIds: input.mineCompletionNoticeSeenIds,
    onMineCompletionChestContinued: handleStartNextMine,
    onMineCompletionSeenIdsChange: input.setMineCompletionNoticeSeenIds,
    onRewardsCollected: handleRewardChestRewardsCollected
  });

  function handleResetMine() {
    const resetAt = Date.now();
    const nextSession = createSession(input.content);
    const nextActiveCell = findFirstPlayableCell(nextSession);
    const nextPlatformRow = findPlatformRow(nextSession, 0);
    const nextGoblinPlacements = createDefaultGoblinPlacements(
      nextSession,
      input.miningGoblins,
      nextPlatformRow,
      input.platformSlots
    );
    const nextBossEnergy = input.createBossEnergyStateForNow(resetAt);
    const nextMineRunStats = createMineRunStats(nextSession.mine.templateId, nextSession.destroyedBlocks);

    input.setSession(nextSession);
    input.setActiveCell(nextActiveCell);
    input.setPlatformRow(nextPlatformRow);
    input.setGoblinPlacements(nextGoblinPlacements);
    input.setBossEnergy(nextBossEnergy);
    input.setBuiltMines([]);
    input.setBuiltMineMessage(null);
    input.setFoundVeinNotice(null);
    input.setMineCompletionNoticeOpen(false);
    input.setMineCompletionNoticeSeenIds([]);
    input.setMineRunStats(nextMineRunStats);
    resetRewardChest();
    input.syncVisibleResourceAmounts(nextSession.resources);
    input.setClockNow(resetAt);
    input.setOfflineSummary(null);
    input.setPendingOfflineFinalHit(null);
    saveMiningSession(
      input.contentVersion,
      nextSession,
      nextActiveCell,
      nextPlatformRow,
      nextGoblinPlacements,
      input.elevatorLevel,
      input.foremanAssignments,
      nextBossEnergy,
      [],
      [],
      nextMineRunStats,
      input.bossCardDefinitions
    );
  }

  function handleConfirmResetMine() {
    if (!window.confirm("Сбросить текущую шахту и локальный прогресс?")) {
      return;
    }

    handleResetMine();
    input.setSettingsOpen(false);
  }

  function handleStartNextMine() {
    const nextMine = findNextMineTemplate(input.content.mineTemplates, input.session.mine.templateId);

    if (!nextMine) {
      input.setBuiltMineMessage("Следующий рудник пока не открыт.");
      return;
    }

    if (!canStartNextMine) {
      input.setBuiltMineMessage("Сначала полностью расчисти текущий рудник.");
      return;
    }

    if (openMineCompletionRewardChestIfNeeded()) {
      return;
    }

    const nextSession = carryFoundVeinsToNextMineSession(createSession(input.content, nextMine.id, input.session.resources), input.session);
    const nextPlatformRow = findPlatformRow(nextSession, 0);
    const nextActiveCell = findFirstPlayableCell(nextSession);
    const nextGoblinPlacements = createDefaultGoblinPlacements(
      nextSession,
      input.miningGoblins,
      nextPlatformRow,
      input.platformSlots
    );
    const nextSeenNoticeIds = markMineCompletionNoticeSeen(input.mineCompletionNoticeSeenIds, input.session.mine.templateId);
    const nextMineRunStats = createMineRunStats(nextSession.mine.templateId, nextSession.destroyedBlocks);

    input.setSession(nextSession);
    input.setActiveCell(nextActiveCell);
    input.setPlatformRow(nextPlatformRow);
    input.setGoblinPlacements(nextGoblinPlacements);
    input.setFoundVeinNotice(null);
    input.setMineCompletionNoticeOpen(false);
    input.setMineCompletionNoticeSeenIds(nextSeenNoticeIds);
    input.setMineRunStats(nextMineRunStats);
    input.setPendingOfflineFinalHit(null);
    input.setOfflineSummary(null);
    input.setActiveSection("mine");
    input.setBuiltMineMessage(`${mineTitle(nextMine, input.labels)} открыт.`);
    saveMiningSession(
      input.contentVersion,
      nextSession,
      nextActiveCell,
      nextPlatformRow,
      nextGoblinPlacements,
      input.elevatorLevel,
      input.foremanAssignments,
      input.bossEnergy,
      input.builtMines,
      nextSeenNoticeIds,
      nextMineRunStats,
      input.bossCardDefinitions
    );
  }

  function openMineCompletionRewardChestIfNeeded(): boolean {
    if (!canStartNextMine) {
      return false;
    }

    if (!queueMineCompletionRewardChest(input.session.mine.templateId)) {
      return false;
    }

    input.setMineCompletionNoticeOpen(false);
    input.setActiveSection("mine");
    return true;
  }

  function handleDismissMineCompletionNotice() {
    input.setMineCompletionNoticeOpen(false);
    input.setMineCompletionNoticeSeenIds((current) => markMineCompletionNoticeSeen(current, input.session.mine.templateId));
    input.setBuiltMineMessage("Следующий рудник доступен из меню шахт.");
  }

  return {
    canStartNextMine,
    chestRewardFlyouts,
    currentMineIndex,
    handleConfirmResetMine,
    handleContinueRewardChest,
    handleDismissMineCompletionNotice,
    handleOpenRewardChest,
    handleStartNextMine,
    mineTemplate,
    nextMineTemplate,
    pendingRewardChest,
    pendingRewardChestType,
    queueCellRewardChest,
    resetRewardChest,
    rewardChestStage
  };
}

function mineTitle(mineTemplate: MineTemplateConfig | undefined, labels: Record<string, string>): string {
  if (!mineTemplate) {
    return "Рудник не найден";
  }

  return `${labelFromNameKey(mineTemplate.displayNameKey, mineTemplate.id, labels)} · ${mineTemplate.depthMeters} м`;
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

function findFirstPlayableCell(session: MiningSession): { row: number; col: number } {
  const block = findFirstPlayableBlock(session);
  return block ? { row: block.row, col: block.col } : { row: 0, col: 0 };
}

function findFirstPlayableBlock(session: MiningSession): MiningBlockState | undefined {
  return session.blocks.flat().find((block) => !block.destroyed) ?? session.blocks[0]?.[0];
}

function mergeResourceMaps(left: Record<string, number>, right: Record<string, number>): Record<string, number> {
  const result = { ...left };

  for (const [resourceId, amount] of Object.entries(right)) {
    result[resourceId] = (result[resourceId] ?? 0) + amount;
  }

  return result;
}
