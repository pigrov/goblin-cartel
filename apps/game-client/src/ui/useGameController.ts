import {
  createInitialGoblinRoster,
  findPlatformRow,
  type BossEnergyConfig,
  type BuiltMineState,
  type GoblinRosterState,
  type MiningFoundVein,
  type MiningSession
} from "@goblin-cartel/game-core";
import { useEffect, useMemo, useState } from "react";
import { createGameViewModels } from "./gameViewModels";
import { type GoblinHutRoleTabId } from "./goblinHutClientState";
import { type GameSection } from "./screens/BottomNav";
import { useBossCardsController } from "./useBossCardsController";
import { useBossEnergy } from "./useBossEnergy";
import { useBuiltMinesController } from "./useBuiltMinesController";
import { createSession, initialContentBundle, type ContentState, type OfflineMiningSummary, useGameBootstrap } from "./useGameBootstrap";
import { useGamePersistence } from "./useGamePersistence";
import { useGameUiController } from "./useGameUiController";
import { useGoblinRosterController } from "./useGoblinRosterController";
import { createLabels, useMineUiController } from "./useMineUiController";
import { useMineProgressionController } from "./useMineProgressionController";
import { useMiningLoop } from "./useMiningLoop";

const baseBossEnergyConfig: BossEnergyConfig = {
  maxEnergy: 600,
  energyPerHit: 18,
  regenPerSecond: 6,
  damagePerTap: 18,
  critChance: 0.12,
  critMultiplier: 2
};

export function useGameController() {
  const [contentState, setContentState] = useState<ContentState>(() => ({
    content: initialContentBundle,
    version: "",
    source: "loading",
    message: "Загрузка опубликованного контента"
  }));
  const [loadingContent, setLoadingContent] = useState(true);
  const [session, setSession] = useState<MiningSession>(() => createSession(initialContentBundle));
  const [sessionReady, setSessionReady] = useState(false);
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const [platformRow, setPlatformRow] = useState(0);
  const [activeSection, setActiveSection] = useState<GameSection>("mine");
  const [goblinRoleTab, setGoblinRoleTab] = useState<GoblinHutRoleTabId>("all");
  const [roster, setRoster] = useState<GoblinRosterState>(() => createInitialGoblinRoster(initialContentBundle.goblins));
  const [, setOfflineSummary] = useState<OfflineMiningSummary | null>(null);
  const [pendingOfflineFinalHit, setPendingOfflineFinalHit] = useState<{ row: number; col: number } | null>(null);
  const [builtMines, setBuiltMines] = useState<BuiltMineState[]>([]);
  const [builtMineMessage, setBuiltMineMessage] = useState<string | null>(null);
  const [collectorPickerMineId, setCollectorPickerMineId] = useState<string | null>(null);
  const [foundVeinNotice, setFoundVeinNotice] = useState<MiningFoundVein | null>(null);
  const [mineCompletionNoticeOpen, setMineCompletionNoticeOpen] = useState(false);
  const [mineCompletionNoticeSeenIds, setMineCompletionNoticeSeenIds] = useState<string[]>([]);
  const {
    displayedResources,
    flashingResourceIds,
    pixiDevOverlayEnabled,
    resourceTooltip,
    scheduleResourceRewardDisplay,
    setPixiDevOverlayEnabled,
    setResourceTooltip,
    setSettingsOpen,
    settingsOpen,
    showResourceTooltip,
    syncVisibleResourceAmounts,
    visibleResourceAmounts
  } = useGameUiController({
    content: contentState.content,
    initialResources: session.resources
  });
  const labels = useMemo(() => createLabels(contentState.content), [contentState.content]);
  const {
    bossCardDefinitions,
    bossCards,
    bossCardsMessage,
    bossCardsOpen,
    bossEnergyConfig,
    handleUpgradeBossCard,
    setBossCards,
    setBossCardsMessage,
    setBossCardsOpen
  } = useBossCardsController({
    baseBossEnergyConfig,
    content: contentState.content,
    labels,
    resources: session.resources,
    setSession,
    syncVisibleResourceAmounts
  });
  const {
    applyBossTap,
    bossDetailsOpen,
    bossEnergy,
    bossEnergyFeedback,
    bossEnergyPercent,
    bossSecondsUntilReady,
    clockNow,
    createBossEnergyStateForNow,
    displayedBossEnergy,
    setBossDetailsOpen,
    setBossEnergy,
    setClockNow
  } = useBossEnergy({
    config: bossEnergyConfig,
    sessionReady
  });
  const currentPlatformRow = useMemo(() => findPlatformRow(session, platformRow), [platformRow, session]);
  const completedMineTemplateIds = useMemo(
    () => Array.from(new Set(session.foundVeins.map((vein) => vein.mineTemplateId))),
    [session.foundVeins]
  );
  const {
    availableGoblins,
    goblinHutProgression,
    goblinLevels,
    goblinPlacements,
    handleHireGoblin,
    handlePlaceGoblin,
    handleUpgradeGoblin,
    handleUpgradeGoblinHut,
    hiredGoblins,
    miningGoblins,
    pixiGoblins,
    platformCellKeys,
    rosterMessage,
    setGoblinPlacements
  } = useGoblinRosterController({
    completedMineTemplateIds,
    content: contentState.content,
    currentPlatformRow,
    labels,
    onActiveCellChange: setActiveCell,
    roster,
    resources: session.resources,
    session,
    setRoster,
    setSession,
    syncVisibleResourceAmounts,
    visibleBuiltMinesCount: builtMines.length
  });
  const {
    builtMineUpgradePreviews,
    collectorPickerBuiltMine,
    constructionSupport,
    handleAssignBuiltMineCollector,
    handleBuildMineFromVein,
    handleCollectAllBuiltMines,
    handleCollectBuiltMine,
    handleUpgradeBuiltMine,
    hiredCollectorGoblins,
    notifyFoundVein,
    unbuiltFoundVeins,
    visibleBuiltMines
  } = useBuiltMinesController({
    builtMines,
    clockNow,
    collectorPickerMineId,
    content: contentState.content,
    goblinLevels,
    hiredGoblins,
    labels,
    resources: session.resources,
    roster,
    session,
    sessionReady,
    setBuiltMineMessage,
    setBuiltMines,
    setFoundVeinNotice,
    setSession,
    syncVisibleResourceAmounts
  });
  const {
    canStartNextMine,
    chestRewardFlyouts,
    currentMineIndex,
    handleConfirmResetMine,
    handleContinueRewardChest,
    handleDismissMineCompletionNotice,
    handleOpenRewardChest,
    handleStartNextMine,
    nextMineTemplate,
    pendingRewardChest,
    pendingRewardChestType,
    queueCellRewardChest,
    resetRewardChest,
    rewardChestStage
  } = useMineProgressionController({
    bossCardDefinitions,
    bossEnergy,
    builtMines,
    content: contentState.content,
    contentVersion: contentState.version,
    createBossEnergyStateForNow,
    labels,
    mineCompletionNoticeSeenIds,
    miningGoblins,
    scheduleResourceRewardDisplay,
    session,
    setActiveCell,
    setActiveSection,
    setBossEnergy,
    setBuiltMineMessage,
    setBuiltMines,
    setClockNow,
    setFoundVeinNotice,
    setGoblinPlacements,
    setMineCompletionNoticeOpen,
    setMineCompletionNoticeSeenIds,
    setOfflineSummary,
    setPendingOfflineFinalHit,
    setPlatformRow,
    setSession,
    setSettingsOpen,
    syncVisibleResourceAmounts,
    visibleBuiltMines
  });
  useGameBootstrap({
    baseBossEnergyConfig,
    resetRewardChest,
    setActiveCell,
    setBossCards,
    setBossCardsMessage,
    setBossCardsOpen,
    setBossEnergy,
    setBuiltMineMessage,
    setBuiltMines,
    setClockNow,
    setContentState,
    setFoundVeinNotice,
    setGoblinPlacements,
    setLoadingContent,
    setMineCompletionNoticeOpen,
    setMineCompletionNoticeSeenIds,
    setOfflineSummary,
    setPendingOfflineFinalHit,
    setPlatformRow,
    setRoster,
    setSession,
    setSessionReady,
    setVisibleResourceAmounts: syncVisibleResourceAmounts
  });
  useGamePersistence({
    activeCell,
    bossCardDefinitions,
    bossCards,
    bossEnergy,
    builtMines,
    contentVersion: contentState.version,
    goblinPlacements,
    mineCompletionNoticeSeenIds,
    platformRow,
    roster,
    session,
    sessionReady
  });
  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    setPlatformRow((current) => {
      const next = findPlatformRow(session, current);
      return next === current ? current : next;
    });
  }, [session, sessionReady]);
  const {
    blockTypeById,
    currentMineTitle,
    exposedCellKeys,
    foundVeinView,
    mineCompletionNextMineLabel,
    nextMineTitle,
    pixiDepthMarkerLabel,
    selectedCell
  } = useMineUiController({
    activeCell,
    buildCostMultiplier: constructionSupport.buildCostMultiplier,
    builtMines,
    content: contentState.content,
    currentMineIndex,
    currentPlatformRow,
    foundVeinNotice,
    labels,
    nextMineTemplate,
    resources: session.resources,
    session
  });
  const {
    handleBlockHit,
    hitEffects,
    platformDropAnimating
  } = useMiningLoop({
    activeCell,
    applyBossTap,
    blockTypes: contentState.content.blockTypes,
    content: contentState.content,
    currentPlatformRow,
    exposedCellKeys,
    goblinPlacements,
    labels,
    miningGoblins,
    onFoundVein: notifyFoundVein,
    onRewardChestBlock: queueCellRewardChest,
    pendingOfflineFinalHit,
    platformRow,
    roster,
    scheduleResourceRewardDisplay,
    session,
    sessionReady,
    setActiveCell,
    setOfflineSummary,
    setPendingOfflineFinalHit,
    setPlatformRow,
    setSession
  });
  const {
    mainContentActions,
    mainContentView,
    overlaysActions,
    overlaysView
  } = createGameViewModels({
    activeSection,
    availableGoblins,
    blockTypeById,
    bossCardDefinitions,
    bossCards,
    bossCardsMessage,
    bossCardsOpen,
    bossDetailsOpen,
    bossEnergyConfig,
    bossSecondsUntilReady,
    builtMineMessage,
    builtMineUpgradePreviews,
    canStartNextMine,
    chestRewardFlyouts,
    clockNow,
    collectorPickerBuiltMine,
    completedMineTemplateIds,
    constructionSupport,
    contentState,
    currentMineTitle,
    currentPlatformRow,
    displayedBossEnergy,
    exposedCellKeys,
    foundVeinNotice,
    foundVeinView,
    goblinHutProgression,
    goblinLevels,
    goblinRoleTab,
    handleAssignBuiltMineCollector,
    handleBlockHit,
    handleBuildMineFromVein,
    handleCollectAllBuiltMines,
    handleCollectBuiltMine,
    handleConfirmResetMine,
    handleContinueRewardChest,
    handleDismissMineCompletionNotice,
    handleHireGoblin,
    handleOpenRewardChest,
    handlePlaceGoblin,
    handleStartNextMine,
    handleUpgradeBossCard,
    handleUpgradeBuiltMine,
    handleUpgradeGoblin,
    handleUpgradeGoblinHut,
    hiredCollectorGoblins,
    hitEffects,
    labels,
    loading: loadingContent || !sessionReady,
    mineCompletionNextMineLabel,
    mineCompletionNoticeOpen,
    nextMineTemplate,
    nextMineTitle,
    pendingRewardChest,
    pendingRewardChestType,
    pixiDepthMarkerLabel,
    pixiDevOverlayEnabled,
    pixiGoblins,
    platformCellKeys,
    platformDropAnimating,
    resources: session.resources,
    rewardChestStage,
    roster,
    rosterMessage,
    selectedCell,
    session,
    setActiveSection,
    setBossCardsOpen,
    setBossDetailsOpen,
    setCollectorPickerMineId,
    setFoundVeinNotice,
    setGoblinRoleTab,
    setPixiDevOverlayEnabled,
    setSettingsOpen,
    settingsOpen,
    unbuiltFoundVeins,
    visibleBuiltMines
  });

  return {
    bottomNav: {
      activeSection,
      onSectionChange: setActiveSection
    },
    bossPanel: {
      config: bossEnergyConfig,
      displayedEnergy: displayedBossEnergy,
      energyPercent: bossEnergyPercent,
      feedback: bossEnergyFeedback,
      onOpenCards: () => setBossCardsOpen(true),
      onOpenDetails: () => setBossDetailsOpen(true),
      visible: activeSection === "mine" && sessionReady
    },
    mainContent: {
      actions: mainContentActions,
      view: mainContentView
    },
    overlays: {
      actions: overlaysActions,
      view: overlaysView
    },
    resourceHud: {
      displayedResources,
      flashingResourceIds,
      labels,
      onMenuOpen: () => setSettingsOpen(true),
      onResourceClick: showResourceTooltip,
      onTooltipClose: () => setResourceTooltip(null),
      tooltip: resourceTooltip,
      visibleResourceAmounts
    }
  };
}
