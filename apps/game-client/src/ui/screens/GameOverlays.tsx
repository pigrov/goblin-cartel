import type { ContentBundle, GoblinConfig, RewardChestTypeConfig } from "@goblin-cartel/content-schemas";
import type {
  BossCardDefinition,
  BossCardId,
  BossCardState,
  BossEnergyConfig,
  BuiltMineState,
  MiningFoundVein
} from "@goblin-cartel/game-core";
import type { MineRunCompletionStatsView } from "../mineRunStats";
import type { PlayerDbSyncState } from "../playerDbSyncState";
import { type FoundVeinView } from "../useMineUiController";
import { type ChestRewardFlyout, type PendingRewardChest, type RewardChestStage } from "../useRewardChestFlow";
import { BossCardsModal } from "./BossCardsModal";
import { BossDetailsModal } from "./BossEnergyPanel";
import { CollectorAssignmentModal } from "./BuiltMinesSection";
import { FoundVeinModal } from "./FoundVeinModal";
import { MineCompletionModal } from "./MineCompletionModal";
import { RewardChestScreen } from "./RewardChestScreen";
import { SettingsModal, type VkIdentityLinkStatus } from "./SettingsModal";

export interface GameOverlaysActions {
  onAssignBuiltMineCollector: (builtMineId: string, goblinId: string | null) => void;
  onBossCardsClose: () => void;
  onBossCardUpgrade: (cardId: BossCardId) => void;
  onBossDetailsClose: () => void;
  onBuildMineFromVein: (vein: MiningFoundVein) => boolean;
  onCloseCollectorPicker: () => void;
  onConfirmResetMine: () => void;
  onContinueRewardChest: () => void;
  onDismissMineCompletionNotice: () => void;
  onFoundVeinClose: () => void;
  onOpenBuiltMines: () => void;
  onOpenRewardChest: () => void;
  onPixiDevOverlayChange: (enabled: boolean) => void;
  onLinkVkIdentity: () => void;
  onSettingsClose: () => void;
  onStartNextMine: () => void;
}

export interface GameOverlaysView {
  bossCards: {
    cards: BossCardDefinition[];
    message: string | null;
    open: boolean;
    resources: Record<string, number>;
    state: BossCardState;
  };
  bossDetails: {
    config: BossEnergyConfig;
    displayedEnergy: number;
    open: boolean;
    secondsUntilReady: number;
  };
  collector: {
    builtMine: BuiltMineState | null;
    builtMines: BuiltMineState[];
    collectors: GoblinConfig[];
    goblinLevels: Record<string, number>;
  };
  common: {
    content: ContentBundle;
    currentMineTitle: string;
    labels: Record<string, string>;
  };
  foundVein: {
    notice: MiningFoundVein | null;
    view: FoundVeinView | null;
  };
  mineCompletion: {
    nextMineLabel: string;
    nextMineVisible: boolean;
    open: boolean;
    stats: MineRunCompletionStatsView;
  };
  rewardChest: {
    chestType: RewardChestTypeConfig | null;
    flyouts: ChestRewardFlyout[];
    nextMineTitle: string | null;
    pending: PendingRewardChest | null;
    stage: RewardChestStage;
  };
  settings: {
    contentLabel: string;
    open: boolean;
    playerDbSync: PlayerDbSyncState;
    pixiDevOverlayEnabled: boolean;
    vkIdentity: {
      displayName: string | null;
      message: string;
      status: VkIdentityLinkStatus;
    };
  };
}

export function GameOverlays(props: {
  actions: GameOverlaysActions;
  view: GameOverlaysView;
}) {
  const { actions, view } = props;
  const collectorPickerBuiltMine = view.collector.builtMine;
  const foundVeinNotice = view.foundVein.notice;

  return (
    <>
      {collectorPickerBuiltMine ? (
        <CollectorAssignmentModal
          builtMine={collectorPickerBuiltMine}
          builtMines={view.collector.builtMines}
          collectors={view.collector.collectors}
          content={view.common.content}
          goblinLevels={view.collector.goblinLevels}
          labels={view.common.labels}
          onAssign={(goblinId) => {
            actions.onAssignBuiltMineCollector(collectorPickerBuiltMine.id, goblinId);
            actions.onCloseCollectorPicker();
          }}
          onClose={actions.onCloseCollectorPicker}
        />
      ) : null}

      {foundVeinNotice && view.foundVein.view ? (
        <FoundVeinModal
          canBuild={view.foundVein.view.canBuild}
          costLabel={view.foundVein.view.costLabel}
          onBuild={() => {
            if (actions.onBuildMineFromVein(foundVeinNotice)) {
              actions.onFoundVeinClose();
              actions.onOpenBuiltMines();
            }
          }}
          onBuildLater={() => {
            actions.onFoundVeinClose();
            actions.onOpenBuiltMines();
          }}
          onClose={actions.onFoundVeinClose}
          productionLabel={view.foundVein.view.productionLabel}
          productionPerHour={view.foundVein.view.productionPerHour}
          veinName={view.foundVein.view.veinName}
        />
      ) : null}

      {view.mineCompletion.open && view.mineCompletion.nextMineVisible ? (
        <MineCompletionModal
          currentMineTitle={view.common.currentMineTitle}
          nextMineLabel={view.mineCompletion.nextMineLabel}
          onDismiss={actions.onDismissMineCompletionNotice}
          onStartNextMine={actions.onStartNextMine}
          stats={view.mineCompletion.stats}
        />
      ) : null}

      {view.rewardChest.pending && view.rewardChest.chestType ? (
        <RewardChestScreen
          chestType={view.rewardChest.chestType}
          content={view.common.content}
          currentMineTitle={view.common.currentMineTitle}
          flyouts={view.rewardChest.flyouts}
          labels={view.common.labels}
          nextMineTitle={view.rewardChest.nextMineTitle}
          onContinue={actions.onContinueRewardChest}
          onOpen={actions.onOpenRewardChest}
          rewards={view.rewardChest.pending.rewards ?? {}}
          source={view.rewardChest.pending.source}
          stage={view.rewardChest.stage}
        />
      ) : null}

      {view.settings.open ? (
        <SettingsModal
          contentLabel={view.settings.contentLabel}
          mineTitle={view.common.currentMineTitle}
          onClose={actions.onSettingsClose}
          onConfirmResetMine={actions.onConfirmResetMine}
          onLinkVkIdentity={actions.onLinkVkIdentity}
          onPixiDevOverlayChange={actions.onPixiDevOverlayChange}
          playerDbSync={view.settings.playerDbSync}
          pixiDevOverlayEnabled={view.settings.pixiDevOverlayEnabled}
          vkIdentity={view.settings.vkIdentity}
        />
      ) : null}

      {view.bossDetails.open ? (
        <BossDetailsModal
          config={view.bossDetails.config}
          displayedEnergy={view.bossDetails.displayedEnergy}
          onClose={actions.onBossDetailsClose}
          secondsUntilReady={view.bossDetails.secondsUntilReady}
        />
      ) : null}

      {view.bossCards.open ? (
        <BossCardsModal
          cards={view.bossCards.cards}
          labels={view.common.labels}
          message={view.bossCards.message}
          onClose={actions.onBossCardsClose}
          onUpgrade={actions.onBossCardUpgrade}
          resources={view.bossCards.resources}
          state={view.bossCards.state}
        />
      ) : null}
    </>
  );
}
