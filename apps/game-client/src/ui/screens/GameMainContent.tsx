import type { BlockTypeConfig, BuiltMineTypeConfig, ContentBundle, GoblinConfig, MineTemplateConfig } from "@goblin-cartel/content-schemas";
import type {
  BuiltMineState,
  GoblinRosterState,
  MiningBlockState,
  MiningFoundVein,
  MiningSession
} from "@goblin-cartel/game-core";
import type { BuiltMineUpgradePreview, ConstructionSupportState } from "../builtMineClientState";
import type { ElevatorProgressionState } from "../elevatorState";
import type { ForemanAssignments } from "../foremanTowerState";
import type { GoblinHutProgressionState, GoblinHutRoleTabId } from "../goblinHutClientState";
import type { MinePixiGoblin, MinePixiHitEffect } from "../MinePixiScene";
import type { MineRunProgressStatsView } from "../mineRunStats";
import type { PlatformDropEvent } from "../useMiningLoop";
import type { GameSection } from "./BottomNav";
import { BuiltMinesSection } from "./BuiltMinesSection";
import { BaseSection, GoblinSection } from "./GoblinManagementScreens";
import { MineScreen } from "./MineScreen";

export interface GameMainContentActions {
  onBlockHit: (block: MiningBlockState) => void;
  onAssignForemanSlot: (slotIndex: number, goblinId: string | null) => void;
  onBuildMine: (vein: MiningFoundVein) => boolean;
  onCollectAllMines: () => void;
  onCollectMine: (builtMineId: string) => void;
  onHireGoblin: (goblin: GoblinConfig) => void;
  onOpenGoblins: () => void;
  onOpenCollectorPicker: (builtMineId: string) => void;
  onPlaceGoblin: (goblinId: string, targetCell: { row: number; col: number }) => void;
  onRoleTabChange: (roleTab: GoblinHutRoleTabId) => void;
  onStartNextMine: () => void;
  onUpgradeGoblin: (goblin: GoblinConfig) => void;
  onUpgradeGoblinHut: () => void;
  onUpgradeElevator: () => void;
  onUpgradeMine: (builtMineId: string) => void;
}

export interface GameMainContentView {
  activeSection: GameSection;
  base: {
    elevatorProgression: ElevatorProgressionState;
    goblinHutProgression: GoblinHutProgressionState;
    rosterMessage: string | null;
  };
  builtMines: {
    builtMines: BuiltMineState[];
    builtMineTypes: BuiltMineTypeConfig[];
    canStartNextMine: boolean;
    collectorGoblins: GoblinConfig[];
    constructionSupport: ConstructionSupportState;
    foundVeins: MiningFoundVein[];
    goblinLevels: Record<string, number>;
    message: string | null;
    nextMineTemplate: MineTemplateConfig | undefined;
    now: number;
    upgradePreviews: ReadonlyMap<string, BuiltMineUpgradePreview>;
  };
  common: {
    content: ContentBundle;
    contentErrorMessage: string | null;
    labels: Record<string, string>;
    resources: Record<string, number>;
  };
  goblins: {
    activeRoleTab: GoblinHutRoleTabId;
    availableGoblins: GoblinConfig[];
    builtMinesCount: number;
    completedMineTemplateIds: string[];
    hutLevel: number;
    hutLimit: number;
    roster: GoblinRosterState;
    rosterMessage: string | null;
  };
  mine: {
    activeCell: {
      row: number;
      col: number;
    };
    blockTypeById: ReadonlyMap<string, BlockTypeConfig>;
    currentPlatformRow: number;
    depthMarkerLabel: (row: number) => string;
    devOverlayEnabled: boolean;
    elevatorLevel: number;
    elevatorProgression: ElevatorProgressionState;
    elevatorVisualStage: 1 | 2 | 3 | 4 | 5;
    exposedCellKeys: ReadonlySet<string>;
    foremanTower: {
      assignedForemen: GoblinConfig[];
      assignments: ForemanAssignments;
      availableForemen: GoblinConfig[];
      goblinLevels: Record<string, number>;
    };
    goblins: MinePixiGoblin[];
    hitEffects: MinePixiHitEffect[];
    loading: boolean;
    progressStats: MineRunProgressStatsView;
    platformCellKeys: ReadonlySet<string>;
    platformDropAnimating: boolean;
    platformDropEvent: PlatformDropEvent | null;
    session: MiningSession;
  };
}

export function GameMainContent(props: {
  actions: GameMainContentActions;
  view: GameMainContentView;
}) {
  const { actions, view } = props;
  const { common } = view;

  if (common.contentErrorMessage) {
    return (
      <section className="mine-content-loading error">
        <strong>Контент не загрузился</strong>
        <span>{common.contentErrorMessage}</span>
      </section>
    );
  }

  if (view.activeSection === "base") {
    return (
      <BaseSection
        goblinHutProgression={view.base.goblinHutProgression}
        elevatorProgression={view.base.elevatorProgression}
        labels={common.labels}
        message={view.base.rosterMessage}
        onUpgradeElevator={actions.onUpgradeElevator}
        onUpgradeGoblinHut={actions.onUpgradeGoblinHut}
      />
    );
  }

  if (view.activeSection === "goblins") {
    return (
      <GoblinSection
        activeRoleTab={view.goblins.activeRoleTab}
        availableGoblins={view.goblins.availableGoblins}
        builtMinesCount={view.goblins.builtMinesCount}
        completedMineTemplateIds={view.goblins.completedMineTemplateIds}
        content={common.content}
        hutLevel={view.goblins.hutLevel}
        hutLimit={view.goblins.hutLimit}
        labels={common.labels}
        onHireGoblin={actions.onHireGoblin}
        onRoleTabChange={actions.onRoleTabChange}
        onUpgradeGoblin={actions.onUpgradeGoblin}
        resources={common.resources}
        roster={view.goblins.roster}
        rosterMessage={view.goblins.rosterMessage}
      />
    );
  }

  if (view.activeSection === "builtMines") {
    return (
      <BuiltMinesSection
        builtMines={view.builtMines.builtMines}
        builtMineTypes={view.builtMines.builtMineTypes}
        canStartNextMine={view.builtMines.canStartNextMine}
        collectorGoblins={view.builtMines.collectorGoblins}
        constructionSupport={view.builtMines.constructionSupport}
        content={common.content}
        foundVeins={view.builtMines.foundVeins}
        goblinLevels={view.builtMines.goblinLevels}
        labels={common.labels}
        message={view.builtMines.message}
        nextMineTemplate={view.builtMines.nextMineTemplate}
        now={view.builtMines.now}
        onBuildMine={actions.onBuildMine}
        onCollectAllMines={actions.onCollectAllMines}
        onCollectMine={actions.onCollectMine}
        onOpenCollectorPicker={actions.onOpenCollectorPicker}
        onStartNextMine={actions.onStartNextMine}
        onUpgradeMine={actions.onUpgradeMine}
        resources={common.resources}
        upgradePreviews={view.builtMines.upgradePreviews}
      />
    );
  }

  return (
    <MineScreen
      activeCell={view.mine.activeCell}
      blockTypeById={view.mine.blockTypeById}
      currentPlatformRow={view.mine.currentPlatformRow}
      depthMarkerLabel={view.mine.depthMarkerLabel}
      devOverlayEnabled={view.mine.devOverlayEnabled}
      elevatorLevel={view.mine.elevatorLevel}
      elevatorProgression={view.mine.elevatorProgression}
      elevatorVisualStage={view.mine.elevatorVisualStage}
      exposedCellKeys={view.mine.exposedCellKeys}
      foremanTower={view.mine.foremanTower}
      goblins={view.mine.goblins}
      hitEffects={view.mine.hitEffects}
      labels={common.labels}
      loading={view.mine.loading}
      progressStats={view.mine.progressStats}
      onBlockHit={actions.onBlockHit}
      onAssignForemanSlot={actions.onAssignForemanSlot}
      onOpenGoblins={actions.onOpenGoblins}
      onPlaceGoblin={actions.onPlaceGoblin}
      onUpgradeElevator={actions.onUpgradeElevator}
      platformCellKeys={view.mine.platformCellKeys}
      platformDropAnimating={view.mine.platformDropAnimating}
      platformDropEvent={view.mine.platformDropEvent}
      session={view.mine.session}
    />
  );
}
