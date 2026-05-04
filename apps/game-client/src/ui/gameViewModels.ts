import type { GoblinConfig, RewardChestTypeConfig } from "@goblin-cartel/content-schemas";
import type {
  BossCardDefinition,
  BossCardId,
  BossCardState,
  BossEnergyConfig,
  BuiltMineState,
  GoblinRosterState,
  MiningBlockState,
  MiningFoundVein,
  MiningSession
} from "@goblin-cartel/game-core";
import type { BuiltMineUpgradePreview, ConstructionSupportState } from "./builtMineClientState";
import type { ElevatorProgressionState } from "./elevatorState";
import { getAssignedForemen, type ForemanAssignments } from "./foremanTowerState";
import type { GoblinHutProgressionState, GoblinHutRoleTabId } from "./goblinHutClientState";
import { createMineRunCompletionStatsView, createMineRunProgressStatsView, type MineRunStats } from "./mineRunStats";
import type { MinePixiGoblin, MinePixiHitEffect } from "./MinePixiScene";
import type { GameSection } from "./screens/BottomNav";
import type { GameMainContentActions, GameMainContentView } from "./screens/GameMainContent";
import type { GameOverlaysActions, GameOverlaysView } from "./screens/GameOverlays";
import type { VkIdentityLinkStatus } from "./screens/SettingsModal";
import type { ContentState } from "./useGameBootstrap";
import type { PlayerDbSyncState } from "./playerDbSyncState";
import type { RandomGoblinReveal } from "./useGoblinRosterController";
import type { FoundVeinView } from "./useMineUiController";
import type { PlatformDropEvent } from "./useMiningLoop";
import type { ChestRewardFlyout, PendingRewardChest, RewardChestStage } from "./useRewardChestFlow";

export interface CreateGameViewModelsInput {
  activeSection: GameSection;
  availableGoblins: GoblinConfig[];
  blockTypeById: GameMainContentView["mine"]["blockTypeById"];
  bossCardDefinitions: BossCardDefinition[];
  bossCards: BossCardState;
  bossCardsMessage: string | null;
  bossCardsOpen: boolean;
  bossDetailsOpen: boolean;
  bossEnergyConfig: BossEnergyConfig;
  bossSecondsUntilReady: number;
  builtMineMessage: string | null;
  builtMineUpgradePreviews: ReadonlyMap<string, BuiltMineUpgradePreview>;
  canStartNextMine: boolean;
  chestRewardFlyouts: ChestRewardFlyout[];
  clockNow: number;
  collectorPickerBuiltMine: BuiltMineState | null;
  completedMineTemplateIds: string[];
  constructionSupport: ConstructionSupportState;
  contentState: ContentState;
  currentMineTitle: string;
  currentPlatformRow: number;
  displayedBossEnergy: number;
  elevatorLevel: number;
  elevatorProgression: ElevatorProgressionState;
  exposedCellKeys: ReadonlySet<string>;
  foundVeinNotice: MiningFoundVein | null;
  foundVeinView: FoundVeinView | null;
  foremanAssignments: ForemanAssignments;
  goblinHutProgression: GoblinHutProgressionState;
  goblinLevels: Record<string, number>;
  goblinRoleTab: GoblinHutRoleTabId;
  handleAssignBuiltMineCollector: (builtMineId: string, goblinId: string | null) => void;
  handleBlockHit: (block: MiningBlockState) => void;
  handleBuildMineFromVein: (vein: MiningFoundVein) => boolean;
  handleCollectAllBuiltMines: () => void;
  handleCollectBuiltMine: (builtMineId: string) => void;
  handleConfirmResetMine: () => void;
  handleContinueRewardChest: () => void;
  handleDismissMineCompletionNotice: () => void;
  handleAssignForemanSlot: (slotIndex: number, goblinId: string | null) => void;
  handleHireRandomGoblin: (archetypeId: string) => void;
  handleOpenRewardChest: () => void;
  handleLinkVkIdentity: () => void;
  handlePlaceGoblin: (goblinId: string, targetCell: { row: number; col: number }) => void;
  handleStartNextMine: () => void;
  handleUpgradeBossCard: (cardId: BossCardId) => void;
  handleUpgradeBuiltMine: (builtMineId: string) => void;
  handleUpgradeElevator: () => void;
  handleUpgradeGoblin: (goblin: GoblinConfig) => void;
  handleUpgradeGoblinHut: () => void;
  hiredCollectorGoblins: GoblinConfig[];
  hitEffects: MinePixiHitEffect[];
  labels: Record<string, string>;
  loading: boolean;
  mineCompletionNextMineLabel: string;
  mineCompletionNoticeOpen: boolean;
  mineRunStats: MineRunStats;
  nextMineTemplate: GameMainContentView["builtMines"]["nextMineTemplate"];
  nextMineTitle: string | null;
  pendingRewardChest: PendingRewardChest | null;
  pendingRewardChestType: RewardChestTypeConfig | null;
  playerDbSyncState: PlayerDbSyncState;
  pixiDepthMarkerLabel: (row: number) => string;
  pixiDevOverlayEnabled: boolean;
  pixiGoblins: MinePixiGoblin[];
  platformCellKeys: ReadonlySet<string>;
  platformDropAnimating: boolean;
  platformDropEvent: PlatformDropEvent | null;
  resources: Record<string, number>;
  randomGoblinReveal: RandomGoblinReveal | null;
  rewardChestStage: RewardChestStage;
  roster: GoblinRosterState;
  rosterMessage: string | null;
  selectedCell: { row: number; col: number };
  session: MiningSession;
  setActiveSection: (section: GameSection) => void;
  setBossCardsOpen: (open: boolean) => void;
  setBossDetailsOpen: (open: boolean) => void;
  setCollectorPickerMineId: (builtMineId: string | null) => void;
  setFoundVeinNotice: (notice: MiningFoundVein | null) => void;
  setGoblinRoleTab: (roleTab: GoblinHutRoleTabId) => void;
  setRandomGoblinReveal: (reveal: RandomGoblinReveal | null) => void;
  setPixiDevOverlayEnabled: (enabled: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  settingsOpen: boolean;
  unbuiltFoundVeins: MiningFoundVein[];
  visibleBuiltMines: BuiltMineState[];
  vkIdentity: {
    displayName: string | null;
    message: string;
    status: VkIdentityLinkStatus;
  };
}

export function createGameViewModels(input: CreateGameViewModelsInput) {
  const mainContentView = createMainContentView(input);
  const mainContentActions = createMainContentActions(input);
  const overlaysView = createOverlaysView(input);
  const overlaysActions = createOverlaysActions(input);

  return {
    mainContentActions,
    mainContentView,
    overlaysActions,
    overlaysView
  };
}

function createMainContentView(input: CreateGameViewModelsInput): GameMainContentView {
  return {
    activeSection: input.activeSection,
    base: {
      elevatorProgression: input.elevatorProgression,
      goblinHutProgression: input.goblinHutProgression,
      rosterMessage: input.rosterMessage
    },
    builtMines: {
      builtMines: input.visibleBuiltMines,
      builtMineTypes: input.contentState.content.builtMineTypes,
      canStartNextMine: input.canStartNextMine,
      collectorGoblins: input.hiredCollectorGoblins,
      constructionSupport: input.constructionSupport,
      foundVeins: input.unbuiltFoundVeins,
      goblinLevels: input.goblinLevels,
      message: input.builtMineMessage,
      nextMineTemplate: input.nextMineTemplate,
      now: input.clockNow,
      upgradePreviews: input.builtMineUpgradePreviews
    },
    common: {
      content: input.contentState.content,
      contentErrorMessage: input.contentState.source === "error" ? input.contentState.message : null,
      labels: input.labels,
      resources: input.resources
    },
    goblins: {
      activeRoleTab: input.goblinRoleTab,
      availableGoblins: input.availableGoblins,
      hutLevel: input.goblinHutProgression.levelNow,
      hutLimit: input.goblinHutProgression.maxHiredGoblins,
      roster: input.roster,
      randomGoblinReveal: input.randomGoblinReveal,
      rosterMessage: input.rosterMessage
    },
    mine: {
      activeCell: input.selectedCell,
      blockTypeById: input.blockTypeById,
      currentPlatformRow: input.currentPlatformRow,
      depthMarkerLabel: input.pixiDepthMarkerLabel,
      devOverlayEnabled: input.pixiDevOverlayEnabled,
      elevatorLevel: input.elevatorLevel,
      elevatorProgression: input.elevatorProgression,
      elevatorVisualStage: input.elevatorProgression.visualStage,
      exposedCellKeys: input.exposedCellKeys,
      foremanTower: {
        assignedForemen: getAssignedForemen(input.availableGoblins, input.roster, input.foremanAssignments),
        assignments: input.foremanAssignments,
        availableForemen: input.availableGoblins.filter(
          (goblin) => goblin.class === "foreman" && input.roster.hiredGoblinIds.includes(goblin.id)
        ),
        goblinLevels: input.goblinLevels
      },
      goblins: input.pixiGoblins,
      hitEffects: input.hitEffects,
      loading: input.loading,
      progressStats: createMineRunProgressStatsView(
        input.mineRunStats,
        input.session,
        input.contentState.content,
        input.labels,
        input.currentPlatformRow
      ),
      platformCellKeys: input.platformCellKeys,
      platformDropAnimating: input.platformDropAnimating,
      platformDropEvent: input.platformDropEvent,
      session: input.session
    }
  };
}

function createMainContentActions(input: CreateGameViewModelsInput): GameMainContentActions {
  return {
    onBlockHit: input.handleBlockHit,
    onBuildMine: input.handleBuildMineFromVein,
    onCollectAllMines: input.handleCollectAllBuiltMines,
    onCollectMine: input.handleCollectBuiltMine,
    onAssignForemanSlot: input.handleAssignForemanSlot,
    onHireRandomGoblin: input.handleHireRandomGoblin,
    onOpenGoblins: () => {
      input.setGoblinRoleTab("builders");
      input.setActiveSection("goblins");
    },
    onOpenCollectorPicker: input.setCollectorPickerMineId,
    onPlaceGoblin: input.handlePlaceGoblin,
    onRoleTabChange: input.setGoblinRoleTab,
    onRandomGoblinRevealClose: () => input.setRandomGoblinReveal(null),
    onStartNextMine: input.handleStartNextMine,
    onUpgradeGoblin: input.handleUpgradeGoblin,
    onUpgradeGoblinHut: input.handleUpgradeGoblinHut,
    onUpgradeElevator: input.handleUpgradeElevator,
    onUpgradeMine: input.handleUpgradeBuiltMine
  };
}

function createOverlaysView(input: CreateGameViewModelsInput): GameOverlaysView {
  return {
    bossCards: {
      cards: input.bossCardDefinitions,
      message: input.bossCardsMessage,
      open: input.bossCardsOpen,
      resources: input.resources,
      state: input.bossCards
    },
    bossDetails: {
      config: input.bossEnergyConfig,
      displayedEnergy: input.displayedBossEnergy,
      open: input.bossDetailsOpen,
      secondsUntilReady: input.bossSecondsUntilReady
    },
    collector: {
      builtMine: input.collectorPickerBuiltMine,
      builtMines: input.visibleBuiltMines,
      collectors: input.hiredCollectorGoblins,
      goblinLevels: input.goblinLevels
    },
    common: {
      content: input.contentState.content,
      currentMineTitle: input.currentMineTitle,
      labels: input.labels
    },
    foundVein: {
      notice: input.foundVeinNotice,
      view: input.foundVeinView
    },
    mineCompletion: {
      nextMineLabel: input.mineCompletionNextMineLabel,
      nextMineVisible: Boolean(input.nextMineTemplate),
      open: input.mineCompletionNoticeOpen,
      stats: createMineRunCompletionStatsView(input.mineRunStats, input.session, input.contentState.content, input.labels)
    },
    rewardChest: {
      chestType: input.pendingRewardChestType,
      flyouts: input.chestRewardFlyouts,
      nextMineTitle: input.nextMineTitle,
      pending: input.pendingRewardChest,
      stage: input.rewardChestStage
    },
    settings: {
      contentLabel: input.contentState.source === "published" ? input.contentState.version : input.contentState.message,
      open: input.settingsOpen,
      playerDbSync: input.playerDbSyncState,
      pixiDevOverlayEnabled: input.pixiDevOverlayEnabled,
      vkIdentity: input.vkIdentity
    }
  };
}

function createOverlaysActions(input: CreateGameViewModelsInput): GameOverlaysActions {
  return {
    onAssignBuiltMineCollector: input.handleAssignBuiltMineCollector,
    onBossCardUpgrade: input.handleUpgradeBossCard,
    onBossCardsClose: () => input.setBossCardsOpen(false),
    onBossDetailsClose: () => input.setBossDetailsOpen(false),
    onBuildMineFromVein: input.handleBuildMineFromVein,
    onCloseCollectorPicker: () => input.setCollectorPickerMineId(null),
    onConfirmResetMine: input.handleConfirmResetMine,
    onContinueRewardChest: input.handleContinueRewardChest,
    onDismissMineCompletionNotice: input.handleDismissMineCompletionNotice,
    onFoundVeinClose: () => input.setFoundVeinNotice(null),
    onOpenBuiltMines: () => input.setActiveSection("builtMines"),
    onOpenRewardChest: input.handleOpenRewardChest,
    onPixiDevOverlayChange: input.setPixiDevOverlayEnabled,
    onLinkVkIdentity: input.handleLinkVkIdentity,
    onSettingsClose: () => input.setSettingsOpen(false),
    onStartNextMine: input.handleStartNextMine
  };
}
