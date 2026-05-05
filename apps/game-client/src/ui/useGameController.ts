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
import {
  assignForemanToTowerSlot,
  createEmptyForemanAssignments,
  normalizeForemanAssignments,
  type ForemanAssignments
} from "./foremanTowerState";
import { createElevatorProgressionState, upgradeElevator } from "./elevatorState";
import { createGameViewModels } from "./gameViewModels";
import { createAvailableGoblins } from "./goblinContent";
import { type GoblinHutRoleTabId } from "./goblinHutClientState";
import { addMineRunBlockRewards, addMineRunDepthRewards, createMineRunStats } from "./mineRunStats";
import { requestNativeVkIdentityProof } from "./nativeVkIdentityBridge";
import { linkPlayerVkIdentity } from "./playerDbSaveClient";
import { type GameSection } from "./screens/BottomNav";
import type { VkIdentityLinkStatus } from "./screens/SettingsModal";
import { useBossCardsController } from "./useBossCardsController";
import { useBossEnergy } from "./useBossEnergy";
import { useBuiltMinesController } from "./useBuiltMinesController";
import { createSession, initialContentBundle, type ContentState, type OfflineMiningSummary, useGameBootstrap } from "./useGameBootstrap";
import { createPlayerDbSyncState, initialPlayerDbSyncState } from "./playerDbSyncState";
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
  const [playerDbSyncState, setPlayerDbSyncState] = useState(initialPlayerDbSyncState);
  const [vkIdentity, setVkIdentity] = useState<{
    displayName: string | null;
    message: string;
    status: VkIdentityLinkStatus;
  }>(() => ({
    displayName: null,
    message: "Доступно в Android/RuStore-сборке",
    status: "idle"
  }));
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const [platformRow, setPlatformRow] = useState(0);
  const [activeSection, setActiveSection] = useState<GameSection>("mine");
  const [goblinRoleTab, setGoblinRoleTab] = useState<GoblinHutRoleTabId>("all");
  const [foremanAssignments, setForemanAssignments] = useState<ForemanAssignments>(() => createEmptyForemanAssignments());
  const [elevatorLevel, setElevatorLevel] = useState(1);
  const [roster, setRoster] = useState<GoblinRosterState>(() => createInitialGoblinRoster(createAvailableGoblins(initialContentBundle)));
  const [, setOfflineSummary] = useState<OfflineMiningSummary | null>(null);
  const [pendingOfflineFinalHit, setPendingOfflineFinalHit] = useState<{ row: number; col: number } | null>(null);
  const [builtMines, setBuiltMines] = useState<BuiltMineState[]>([]);
  const [builtMineMessage, setBuiltMineMessage] = useState<string | null>(null);
  const [collectorPickerMineId, setCollectorPickerMineId] = useState<string | null>(null);
  const [foundVeinNotice, setFoundVeinNotice] = useState<MiningFoundVein | null>(null);
  const [mineCompletionNoticeOpen, setMineCompletionNoticeOpen] = useState(false);
  const [mineCompletionNoticeSeenIds, setMineCompletionNoticeSeenIds] = useState<string[]>([]);
  const [mineRunStats, setMineRunStats] = useState(() =>
    createMineRunStats(initialContentBundle.mineTemplates[0]?.id ?? "initial")
  );
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
  const elevatorProgression = useMemo(
    () => createElevatorProgressionState(contentState.content.elevator, elevatorLevel, session.resources),
    [contentState.content.elevator, elevatorLevel, session.resources]
  );
  const completedMineTemplateIds = useMemo(
    () => Array.from(new Set(session.foundVeins.map((vein) => vein.mineTemplateId))),
    [session.foundVeins]
  );
  const {
    availableGoblins,
    goblinHutProgression,
    goblinLevels,
    goblinPlacements,
    handleHireRandomGoblin,
    handlePlaceGoblin,
    handleUpgradeGoblin,
    handleUpgradeGoblinHut,
    hiredGoblins,
    miningGoblins,
    pixiGoblins,
    platformCellKeys,
    randomGoblinReveal,
    rosterMessage,
    setRandomGoblinReveal,
    setGoblinPlacements
  } = useGoblinRosterController({
    completedMineTemplateIds,
    content: contentState.content,
    currentPlatformRow,
    labels,
    onActiveCellChange: setActiveCell,
    platformSlots: elevatorProgression.platformSlots,
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
    elevatorLevel,
    foremanAssignments,
    labels,
    mineCompletionNoticeSeenIds,
    miningGoblins,
    platformSlots: elevatorProgression.platformSlots,
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
    setMineRunStats,
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
    setElevatorLevel,
    setFoundVeinNotice,
    setForemanAssignments,
    setGoblinPlacements,
    setLoadingContent,
    setMineCompletionNoticeOpen,
    setMineCompletionNoticeSeenIds,
    setMineRunStats,
    setOfflineSummary,
    setPendingOfflineFinalHit,
    setPlatformRow,
    setPlayerDbSyncState,
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
    content: contentState.content,
    contentVersion: contentState.version,
    elevatorLevel,
    foremanAssignments,
    goblinPlacements,
    mineCompletionNoticeSeenIds,
    mineRunStats,
    platformRow,
    roster,
    session,
    sessionReady,
    setPlayerDbSyncState
  });
  useEffect(() => {
    setForemanAssignments((current) => normalizeForemanAssignments(current, availableGoblins, roster));
  }, [availableGoblins, roster]);

  function handleAssignForemanSlot(slotIndex: number, goblinId: string | null) {
    setForemanAssignments((current) =>
      normalizeForemanAssignments(assignForemanToTowerSlot(current, slotIndex, goblinId), availableGoblins, roster)
    );
  }

  function handleUpgradeElevator() {
    const result = upgradeElevator({
      elevator: contentState.content.elevator,
      level: elevatorLevel,
      resources: session.resources
    });

    if (!result.ok) {
      return;
    }

    setElevatorLevel(result.level);
    syncVisibleResourceAmounts(result.resources);
    setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: result.resources
    }));
  }

  async function handleLinkVkIdentity() {
    setVkIdentity((current) => ({
      ...current,
      message: "Открываем VK ID",
      status: "linking"
    }));

    const nativeResult = await requestNativeVkIdentityProof();

    if (!nativeResult.ok) {
      setVkIdentity({
        displayName: null,
        message: nativeVkIdentityMessage(nativeResult.code),
        status: nativeResult.code === "bridge_unavailable" ? "unavailable" : "error"
      });
      return;
    }

    const linkResult = await linkPlayerVkIdentity({
      contentVersion: contentState.version,
      definitions: bossCardDefinitions,
      proof: nativeResult.proof
    });

    if (!linkResult.ok) {
      setVkIdentity({
        displayName: null,
        message: vkIdentityLinkMessage(linkResult.code),
        status: linkResult.code === "identity_verifier_not_configured" || linkResult.code === "no_token" ? "unavailable" : "error"
      });
      return;
    }

    setVkIdentity({
      displayName: linkResult.displayName,
      message: linkResult.linkedExistingPlayer ? "Профиль найден, прогресс загружен" : "Профиль подключен к этому устройству",
      status: "linked"
    });
    setPlayerDbSyncState(
      createPlayerDbSyncState({
        status: linkResult.appliedServerSave ? "restored" : "synced",
        revision: linkResult.serverRevision,
        message: linkResult.appliedServerSave ? "Прогресс VK ID загружен. Перезапускаем экран" : "VK ID подключен"
      })
    );

    if (linkResult.appliedServerSave) {
      window.setTimeout(() => window.location.reload(), 350);
    }
  }

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
    platformDropAnimating,
    platformDropEvent
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
    onBlockDestroyed: (mineTemplateId, rewards, destroyedBlockCount) => {
      setMineRunStats((current) => addMineRunBlockRewards(current, mineTemplateId, rewards, destroyedBlockCount));
    },
    onDepthProgressRewards: (mineTemplateId, rewards) => {
      setMineRunStats((current) => addMineRunDepthRewards(current, mineTemplateId, rewards));
    },
    onRewardChestBlock: queueCellRewardChest,
    pendingOfflineFinalHit,
    platformDropDurationMs: elevatorProgression.dropDurationMs,
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
    elevatorLevel,
    elevatorProgression,
    exposedCellKeys,
    foundVeinNotice,
    foundVeinView,
    foremanAssignments,
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
    handleAssignForemanSlot,
    handleHireRandomGoblin,
    handleOpenRewardChest,
    handleLinkVkIdentity,
    handlePlaceGoblin,
    handleStartNextMine,
    handleUpgradeBossCard,
    handleUpgradeBuiltMine,
    handleUpgradeElevator,
    handleUpgradeGoblin,
    handleUpgradeGoblinHut,
    hiredCollectorGoblins,
    hitEffects,
    labels,
    loading: loadingContent || !sessionReady,
    mineCompletionNextMineLabel,
    mineCompletionNoticeOpen,
    mineRunStats,
    nextMineTemplate,
    nextMineTitle,
    pendingRewardChest,
    pendingRewardChestType,
    playerDbSyncState,
    pixiDepthMarkerLabel,
    pixiDevOverlayEnabled,
    pixiGoblins,
    platformCellKeys,
    platformDropAnimating,
    platformDropEvent,
    resources: session.resources,
    rewardChestStage,
    roster,
    rosterMessage,
    randomGoblinReveal,
    selectedCell,
    session,
    setActiveSection,
    setBossCardsOpen,
    setBossDetailsOpen,
    setCollectorPickerMineId,
    setFoundVeinNotice,
    setGoblinRoleTab,
    setRandomGoblinReveal,
    setPixiDevOverlayEnabled,
    setSettingsOpen,
    settingsOpen,
    unbuiltFoundVeins,
    visibleBuiltMines,
    vkIdentity
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

function nativeVkIdentityMessage(code: "bridge_unavailable" | "cancelled" | "invalid_response" | "native_error"): string {
  switch (code) {
    case "bridge_unavailable":
      return "VK ID доступен только в Android/RuStore-сборке";
    case "cancelled":
      return "Вход через VK ID отменен";
    case "native_error":
      return "Native VK ID вернул ошибку";
    case "invalid_response":
    default:
      return "Native VK ID вернул неверный ответ";
  }
}

function vkIdentityLinkMessage(
  code: "identity_verifier_not_configured" | "invalid_identity_token" | "invalid_session" | "network_error" | "invalid_response" | "no_token"
): string {
  switch (code) {
    case "identity_verifier_not_configured":
      return "На сервере не настроены VK ID credentials";
    case "invalid_identity_token":
      return "VK ID не подтвердил пользователя";
    case "invalid_session":
    case "no_token":
      return "Сначала дождись подключения сохранения";
    case "network_error":
      return "Нет связи с сервером";
    case "invalid_response":
    default:
      return "Сервер вернул неверный ответ";
  }
}
