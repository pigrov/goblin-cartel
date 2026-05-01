import {
  applyBossAttack,
  applyBossCardBonuses,
  applyPlatformAutoMining,
  assignBuiltMineCollector,
  createBossCardDefinitions,
  buildMineFromVein,
  calculateBossCardUpgradeCost,
  calculateCrewAutoDamagePerSecond,
  createBossEnergyState,
  createInitialBossCardState,
  createMiningSession,
  createInitialGoblinRoster,
  exportMiningSessionSave,
  findPlatformRow,
  generateMine,
  getBossEnergySecondsUntilReady,
  hitMineBlock,
  hireGoblin,
  getGoblinLevel,
  isGoblinHired,
  normalizeGoblinRoster,
  openRewardChest,
  regenerateBossEnergy,
  restoreBossEnergyState,
  restoreMiningSession,
  upgradeBossCard,
  upgradeGoblin,
  upgradeGoblinHut,
  upgradeBuiltMine,
  type BossCardDefinition,
  type BossCardId,
  type BossCardState,
  type BossEnergyConfig,
  type BossEnergyState,
  type BuiltMineState,
  type GoblinRosterState,
  type MiningBlockState,
  type MiningFoundVein,
  type MiningSession,
  type OpenedRewardChest
} from "@goblin-cartel/game-core";
import {
  starterContentBundle,
  type BuiltMineTypeConfig,
  type ContentBundle,
  type GoblinConfig,
  type MineTemplateConfig,
  type RewardChestTypeConfig,
  type ResourceConfig
} from "@goblin-cartel/content-schemas";
import { Coins, Gem, Hammer, Menu, Mountain, Pickaxe, RotateCcw, Sparkles, Users, Warehouse, X, Zap } from "lucide-react";
import { type CSSProperties, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MinePixiGoblin } from "./MinePixiScene";
import { destroyedHitEffectDurationMs } from "./minePixiEffects";
import {
  canBuildFoundVein,
  collectAutomatedBuiltMineIncomeWithCollectors,
  collectBuiltMineIncomeWithCollector,
  createBuiltMineDashboardState,
  createBuildCostRequirements,
  createBuildCostWithMultiplier,
  createBuiltMineUpgradePreview,
  createConstructionSupportState,
  createVisibleBuiltMines,
  countCollectorAssignedMines,
  findAssignableCollector,
  findUnbuiltFoundVeins,
  getBuiltMineBuildProgressPercent,
  getBuiltMineBuildRemainingMs,
  getBuiltMineStoragePercent,
  getGoblinAutoCollectSlots,
  hasCollectorSlotAvailable,
  hasBuiltMineForVein,
  isConstructionSupportGoblin,
  isBuiltMineStorageFull,
  type ConstructionSupportState,
  type BuiltMineUpgradePreview
} from "./builtMineClientState";
import {
  canMoveToNextMine,
  carryFoundVeinsToNextMineSession,
  findMineTemplateIndex,
  findNextMineTemplate,
  markMineCompletionNoticeSeen
} from "./mineProgressionClientState";
import {
  createGoblinHirePreview,
  createGoblinHutProgressionState,
  createGoblinHutRoleTabs,
  createGoblinIdentity,
  createGoblinRoleSummary,
  createGoblinUpgradePreview,
  filterGoblinsByHutRole,
  isMiningGoblin,
  type GoblinHutRoleTabId,
  type GoblinHirePreview,
  type GoblinHutProgressionState,
  type GoblinUpgradePreview
} from "./goblinHutClientState";
import {
  loadStoredBossCards,
  loadStoredGoblinRoster,
  loadStoredMiningSession,
  saveStoredBossCards,
  saveStoredGoblinRoster,
  saveStoredMiningSession,
  type StoredGoblinRoster,
  type StoredMineSave
} from "./playerSave";
import { contentVersionWithRuntimeSuffix, createRuntimeContentBundle } from "./runtimeContent";
import { useDelayedResourceDisplay } from "./useDelayedResourceDisplay";

const mineSeed = "local-player-001";
const autoMiningTickMs = 1000;
const bossEnergyMinTickMs = 50;
const offlineFinalHitDelayMs = 900;
const hitEffectLifetimeMs = 2400;
const resourceRewardSettleDelayMs = destroyedHitEffectDurationMs;
const resourceFlashMs = 620;
const resourceTooltipLifetimeMs = 3000;
const rewardChestOpeningMs = 2300;
const maxOfflineMiningSeconds = 6 * 60 * 60;
const depthMarkerStepMeters = 5;
const MinePixiScene = lazy(async () => {
  const module = await import("./MinePixiScene");
  return { default: module.MinePixiScene };
});
let hitEffectSequence = 0;
let chestRewardSequence = 0;

type GameSection = "mine" | "base" | "goblins" | "builtMines";
type GoblinPlacementMap = Record<string, number>;
type HitEffectVariant = "boss" | "goblin" | "critical";
type RewardChestStage = "closed" | "opening" | "summary";
type SpawnHitEffect = (
  cell: { row: number; col: number },
  variant: HitEffectVariant,
  damage: number,
  rewards?: Record<string, number>
) => void;

const baseBossEnergyConfig: BossEnergyConfig = {
  maxEnergy: 600,
  energyPerHit: 18,
  regenPerSecond: 6,
  damagePerTap: 18,
  critChance: 0.12,
  critMultiplier: 2
};
const bossEnergyTickMs = Math.max(bossEnergyMinTickMs, Math.round(1000 / Math.max(1, baseBossEnergyConfig.regenPerSecond)));
const initialContentBundle = starterContentBundle;

interface ContentState {
  content: ContentBundle;
  version: string;
  source: "error" | "loading" | "published";
  message: string;
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

interface OfflineMiningSummary {
  seconds: number;
  destroyedBlocks: number;
  rewards: Record<string, number>;
  pendingFinalHit: boolean;
}

interface GoblinWorkerAssignment {
  goblin: GoblinConfig;
  targetCell: {
    row: number;
    col: number;
  };
  damagePerSecond: number;
}

interface HitEffect {
  damage: number;
  id: number;
  rewardDrops: RewardDrop[];
  row: number;
  col: number;
  variant: HitEffectVariant;
}

interface RewardDrop {
  amount: number;
  label: string;
  resourceId: string;
}

interface FeaturedCardReward extends RewardDrop {
  card: BossCardDefinition;
}

interface ResourceTooltip {
  id: number;
  label: string;
  resourceId: string;
  value: number;
}

interface PendingRewardChest {
  chestTypeId: string;
  id: string;
  mineTemplateId: string;
  rewards: Record<string, number> | null;
  source: "mine_completion" | "cell";
}

interface ChestRewardFlyout extends RewardDrop {
  delayMs: number;
  distance: number;
  id: number;
  x: number;
}

export function App() {
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
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);
  const [, setOfflineSummary] = useState<OfflineMiningSummary | null>(null);
  const [pendingOfflineFinalHit, setPendingOfflineFinalHit] = useState<{ row: number; col: number } | null>(null);
  const [goblinPlacements, setGoblinPlacements] = useState<GoblinPlacementMap>({});
  const [builtMines, setBuiltMines] = useState<BuiltMineState[]>([]);
  const [builtMineMessage, setBuiltMineMessage] = useState<string | null>(null);
  const [collectorPickerMineId, setCollectorPickerMineId] = useState<string | null>(null);
  const [foundVeinNotice, setFoundVeinNotice] = useState<MiningFoundVein | null>(null);
  const [mineCompletionNoticeOpen, setMineCompletionNoticeOpen] = useState(false);
  const [mineCompletionNoticeSeenIds, setMineCompletionNoticeSeenIds] = useState<string[]>([]);
  const [pendingRewardChest, setPendingRewardChest] = useState<PendingRewardChest | null>(null);
  const [rewardChestStage, setRewardChestStage] = useState<RewardChestStage>("closed");
  const [chestRewardFlyouts, setChestRewardFlyouts] = useState<ChestRewardFlyout[]>([]);
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [bossCards, setBossCards] = useState<BossCardState>(() => createInitialBossCardState());
  const [bossCardsOpen, setBossCardsOpen] = useState(false);
  const [bossCardsMessage, setBossCardsMessage] = useState<string | null>(null);
  const [bossEnergy, setBossEnergy] = useState<BossEnergyState>(() => createBossEnergyState(baseBossEnergyConfig, Date.now()));
  const [bossDetailsOpen, setBossDetailsOpen] = useState(false);
  const [bossEnergyFeedback, setBossEnergyFeedback] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pixiDevOverlayEnabled, setPixiDevOverlayEnabled] = useState(false);
  const [resourceTooltip, setResourceTooltip] = useState<ResourceTooltip | null>(null);
  const {
    flashingResourceIds,
    scheduleResourceRewardDisplay,
    syncVisibleResourceAmounts,
    visibleResourceAmounts
  } = useDelayedResourceDisplay({
    flashMs: resourceFlashMs,
    initialResources: session.resources,
    rewardSettleDelayMs: resourceRewardSettleDelayMs
  });
  const [platformDropAnimating, setPlatformDropAnimating] = useState(false);
  const activeCellRef = useRef(activeCell);
  const builtMinesRef = useRef(builtMines);
  const contentBlockTypesRef = useRef(contentState.content.blockTypes);
  const goblinPlacementsRef = useRef(goblinPlacements);
  const hiredCollectorGoblinsRef = useRef<GoblinConfig[]>([]);
  const miningGoblinsRef = useRef<GoblinConfig[]>([]);
  const pendingOfflineFinalHitRef = useRef(pendingOfflineFinalHit);
  const platformRowRef = useRef(platformRow);
  const previousPlatformRowRef = useRef(0);
  const pendingRewardChestRef = useRef(pendingRewardChest);
  const rewardChestSummaryTimeoutRef = useRef<number | null>(null);
  const rosterRef = useRef(roster);
  const sessionRef = useRef(session);
  const spawnHitEffectRef = useRef<SpawnHitEffect>(() => undefined);
  const tooltipSequenceRef = useRef(0);
  const bossCardDefinitions = useMemo(
    () => createBossCardDefinitions(contentState.content.bossCards),
    [contentState.content.bossCards]
  );

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
          const nextContentState = {
            content: runtimeContent,
            version: runtimeVersion,
            source: "published" as const,
            message: "Опубликованный контент"
          };
          const nextRoster = createRestoredGoblinRoster(runtimeContent, runtimeVersion);
          const nextBossCardDefinitions = createBossCardDefinitions(runtimeContent.bossCards);
          const nextBossCards = loadStoredBossCards(localStorage, nextBossCardDefinitions, runtimeVersion);
          const restoredMining = createRestoredMiningState(
            runtimeContent,
            runtimeVersion,
            nextRoster,
            applyBossCardBonuses(baseBossEnergyConfig, nextBossCards, nextBossCardDefinitions)
          );
          setContentState({
            ...nextContentState
          });
          setSession(restoredMining.session);
          syncVisibleResourceAmounts(restoredMining.session.resources);
          setRoster(nextRoster);
          setActiveCell(restoredMining.activeCell);
          setPlatformRow(restoredMining.platformRow);
          setOfflineSummary(restoredMining.offlineSummary);
          setPendingOfflineFinalHit(restoredMining.pendingOfflineFinalHit);
          setGoblinPlacements(restoredMining.goblinPlacements);
          setBossCards(nextBossCards);
          setBossEnergy(restoredMining.bossEnergy);
          setBuiltMines(restoredMining.builtMines);
          setMineCompletionNoticeSeenIds(restoredMining.mineCompletionNoticeSeenIds);
          setMineCompletionNoticeOpen(false);
          setPendingRewardChest(null);
          setRewardChestStage("closed");
          setChestRewardFlyouts([]);
          setBossCardsOpen(false);
          setBossCardsMessage(null);
          setBuiltMineMessage(null);
          setFoundVeinNotice(null);
          setClockNow(Date.now());
          setSessionReady(true);
        }
      } catch (error) {
        if (active) {
          setContentState({
            content: initialContentBundle,
            version: "",
            source: "error",
            message: error instanceof Error ? error.message : "Контент не загрузился"
          });
          setSessionReady(false);
          setMineCompletionNoticeOpen(false);
          setPendingRewardChest(null);
          setRewardChestStage("closed");
          setChestRewardFlyouts([]);
          setBuiltMineMessage(null);
          setFoundVeinNotice(null);
          setClockNow(Date.now());
          setSessionReady(true);
        }
      } finally {
        if (active) {
          setLoadingContent(false);
        }
      }
    }

    void loadContent();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    saveMiningSession(
      contentState.version,
      session,
      activeCell,
      platformRow,
      goblinPlacements,
      bossEnergy,
      builtMines,
      mineCompletionNoticeSeenIds,
      bossCardDefinitions
    );
  }, [
    activeCell,
    bossEnergy,
    bossCardDefinitions,
    builtMines,
    contentState.version,
    goblinPlacements,
    mineCompletionNoticeSeenIds,
    platformRow,
    session,
    sessionReady
  ]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    saveGoblinRoster(contentState.version, roster, bossCardDefinitions);
  }, [bossCardDefinitions, contentState.version, roster, sessionReady]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    saveStoredBossCards(bossCards, localStorage, bossCardDefinitions, contentState.version);
  }, [bossCardDefinitions, bossCards, contentState.version, sessionReady]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    const intervalId = window.setInterval(() => setClockNow(Date.now()), bossEnergyTickMs);

    return () => window.clearInterval(intervalId);
  }, [sessionReady]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (!builtMinesRef.current.some((builtMine) => builtMine.assignedCollectorGoblinId)) {
        return;
      }

      const result = collectAutomatedBuiltMineIncomeWithCollectors({
        builtMines: builtMinesRef.current,
        collectors: hiredCollectorGoblinsRef.current,
        goblinLevels: rosterRef.current.goblinLevels ?? {},
        now: Date.now(),
        resources: sessionRef.current.resources
      });

      setBuiltMines(result.builtMines);

      if (result.collectedAmount <= 0) {
        return;
      }

      setSession((current) => ({
        ...current,
        lastRewards: {},
        resources: mergeResourceMaps(current.resources, result.collectedResources)
      }));
      syncVisibleResourceAmounts(result.resources);
    }, autoMiningTickMs);

    return () => window.clearInterval(intervalId);
  }, [sessionReady, syncVisibleResourceAmounts]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    setPlatformRow((current) => {
      const next = findPlatformRow(session, current);
      return next === current ? current : next;
    });
  }, [session, sessionReady]);

  useEffect(() => {
    if (!bossEnergyFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setBossEnergyFeedback(false), 450);

    return () => window.clearTimeout(timeoutId);
  }, [bossEnergyFeedback]);

  useEffect(() => {
    if (!resourceTooltip) {
      return;
    }

    const timeoutId = window.setTimeout(() => setResourceTooltip(null), resourceTooltipLifetimeMs);

    return () => window.clearTimeout(timeoutId);
  }, [resourceTooltip]);

  useEffect(() => {
    return () => clearRewardChestSummaryTimer(rewardChestSummaryTimeoutRef);
  }, []);

  useEffect(() => {
    pendingRewardChestRef.current = pendingRewardChest;
  }, [pendingRewardChest]);

  const blockTypeById = useMemo(
    () => new Map(contentState.content.blockTypes.map((blockType) => [blockType.id, blockType])),
    [contentState.content.blockTypes]
  );
  const mineTemplate =
    contentState.content.mineTemplates.find((template) => template.id === session.mine.templateId) ?? contentState.content.mineTemplates[0];
  const labels = useMemo(() => createLabels(contentState.content), [contentState.content]);
  const displayedResources = useMemo(
    () => contentState.content.resources.filter((resource) => resource.id !== "boss_energy" && !isBossCardResourceId(resource.id)).slice(0, 5),
    [contentState.content.resources]
  );
  const bossEnergyConfig = useMemo(
    () => applyBossCardBonuses(baseBossEnergyConfig, bossCards, bossCardDefinitions),
    [bossCardDefinitions, bossCards]
  );
  const availableGoblins = useMemo(() => createAvailableGoblins(contentState.content), [contentState.content]);
  const hiredGoblins = useMemo(
    () => availableGoblins.filter((goblin) => isGoblinHired(roster, goblin.id)),
    [availableGoblins, roster]
  );
  const goblinLevels = roster.goblinLevels ?? {};
  const miningGoblins = useMemo(() => hiredGoblins.filter(isMiningGoblin), [hiredGoblins]);
  const completedMineTemplateIds = useMemo(
    () => Array.from(new Set(session.foundVeins.map((vein) => vein.mineTemplateId))),
    [session.foundVeins]
  );
  const hiredCollectorGoblins = useMemo(
    () => hiredGoblins.filter((goblin) => getGoblinAutoCollectSlots(goblin, getGoblinLevel(roster, goblin.id)) > 0),
    [hiredGoblins, roster]
  );
  const constructionSupportGoblins = useMemo(() => hiredGoblins.filter(isConstructionSupportGoblin), [hiredGoblins]);
  const constructionSupport = useMemo(
    () => createConstructionSupportState(constructionSupportGoblins, goblinLevels),
    [constructionSupportGoblins, goblinLevels]
  );
  const currentPlatformRow = useMemo(() => findPlatformRow(session, platformRow), [platformRow, session]);
  const visibleBuiltMines = useMemo(
    () => createVisibleBuiltMines(builtMines, clockNow, hiredCollectorGoblins, goblinLevels),
    [builtMines, clockNow, goblinLevels, hiredCollectorGoblins]
  );
  const goblinHutProgression = useMemo(
    () =>
      createGoblinHutProgressionState({
        builtMinesCount: visibleBuiltMines.length,
        completedMineTemplateIds,
        content: contentState.content,
        resources: session.resources,
        roster
      }),
    [completedMineTemplateIds, contentState.content, roster, session.resources, visibleBuiltMines.length]
  );
  const builtMineUpgradePreviews = useMemo(() => {
    const progressedBuiltMines = createVisibleBuiltMines(builtMines, clockNow);
    const builtMineTypesById = new Map(contentState.content.builtMineTypes.map((builtMineType) => [builtMineType.id, builtMineType]));

    return new Map(
      progressedBuiltMines.map((builtMine) => [
        builtMine.id,
        createBuiltMineUpgradePreview(
          builtMine,
          session.resources,
          builtMineTypesById.get(builtMine.typeId)?.upgrade,
          constructionSupport.upgradeCostMultiplier
        )
      ])
    );
  }, [builtMines, clockNow, constructionSupport.upgradeCostMultiplier, contentState.content.builtMineTypes, session.resources]);
  const collectorPickerBuiltMine = useMemo(
    () => visibleBuiltMines.find((builtMine) => builtMine.id === collectorPickerMineId) ?? null,
    [collectorPickerMineId, visibleBuiltMines]
  );
  const unbuiltFoundVeins = useMemo(
    () => findUnbuiltFoundVeins(session.foundVeins, visibleBuiltMines),
    [session.foundVeins, visibleBuiltMines]
  );
  const nextMineTemplate = useMemo(
    () => findNextMineTemplate(contentState.content.mineTemplates, session.mine.templateId),
    [contentState.content.mineTemplates, session.mine.templateId]
  );
  const currentMineIndex = useMemo(
    () => (mineTemplate ? findMineTemplateIndex(contentState.content.mineTemplates, mineTemplate.id) : -1),
    [contentState.content.mineTemplates, mineTemplate]
  );
  const canStartNextMine = useMemo(
    () =>
      canMoveToNextMine({
        builtMines: visibleBuiltMines,
        mineTemplates: contentState.content.mineTemplates,
        session
      }),
    [contentState.content.mineTemplates, session, visibleBuiltMines]
  );
  const pendingRewardChestType = useMemo(
    () => (pendingRewardChest ? findRewardChestType(contentState.content, pendingRewardChest.chestTypeId) : null),
    [contentState.content, pendingRewardChest]
  );
  const foundVeinBuiltMineType = useMemo(
    () => (foundVeinNotice ? builtMineTypeForVein(foundVeinNotice, contentState.content.builtMineTypes) : undefined),
    [contentState.content.builtMineTypes, foundVeinNotice]
  );
  const canBuildFoundVeinNotice = foundVeinNotice
    ? canBuildFoundVein({
        buildCostMultiplier: constructionSupport.buildCostMultiplier,
        builtMineTypes: contentState.content.builtMineTypes,
        builtMines,
        resources: session.resources,
        vein: foundVeinNotice
      })
    : false;

  const platformCells = useMemo(() => findPlatformCells(session, currentPlatformRow), [currentPlatformRow, session]);
  const platformCellKeys = useMemo(() => new Set(platformCells.map(cellKey)), [platformCells]);
  const exposedCells = useMemo(() => findExposedCells(session), [session]);
  const exposedCellKeys = useMemo(() => new Set(exposedCells.map(cellKey)), [exposedCells]);
  const selectedCell = useMemo(() => findExposedCellForPreferred(session, activeCell), [activeCell, session]);
  const workerAssignments = useMemo(
    () => assignGoblinWorkers(session, miningGoblins, goblinPlacements, currentPlatformRow, roster),
    [currentPlatformRow, goblinPlacements, miningGoblins, roster, session]
  );
  const workerByColumn = useMemo(
    () => new Map(workerAssignments.map((worker) => [worker.targetCell.col, worker])),
    [workerAssignments]
  );
  const pixiGoblins = useMemo(
    () =>
      miningGoblins
        .map((goblin): MinePixiGoblin | null => {
          const col = goblinPlacements[goblin.id];

          if (typeof col !== "number" || !isValidMineColumn(session, col)) {
            return null;
          }

          return {
            id: goblin.id,
            name: goblinName(goblin, labels),
            col,
            working: Boolean(workerByColumn.get(col))
          };
        })
        .filter((goblin): goblin is MinePixiGoblin => Boolean(goblin)),
    [goblinPlacements, labels, miningGoblins, session, workerByColumn]
  );
  const visibleBossEnergy = useMemo(() => regenerateBossEnergy(bossEnergy, bossEnergyConfig, clockNow), [bossEnergy, clockNow]);
  const displayedBossEnergy = Math.floor(visibleBossEnergy.currentEnergy);
  const bossEnergyPercent = bossEnergyConfig.maxEnergy > 0 ? (displayedBossEnergy / bossEnergyConfig.maxEnergy) * 100 : 0;
  const bossSecondsUntilReady = useMemo(
    () => getBossEnergySecondsUntilReady(bossEnergy, bossEnergyConfig, clockNow),
    [bossEnergy, clockNow]
  );
  const pixiDepthMarkerLabel = useCallback(
    (row: number) => depthMarkerLabel(session, row, currentPlatformRow),
    [currentPlatformRow, session]
  );

  useEffect(() => {
    activeCellRef.current = activeCell;
    builtMinesRef.current = builtMines;
    contentBlockTypesRef.current = contentState.content.blockTypes;
    goblinPlacementsRef.current = goblinPlacements;
    hiredCollectorGoblinsRef.current = hiredCollectorGoblins;
    miningGoblinsRef.current = miningGoblins;
    pendingOfflineFinalHitRef.current = pendingOfflineFinalHit;
    platformRowRef.current = platformRow;
    rosterRef.current = roster;
    sessionRef.current = session;
    spawnHitEffectRef.current = spawnHitEffect;
  });

  useEffect(() => {
    if (!sessionReady) {
      previousPlatformRowRef.current = currentPlatformRow;
      return;
    }

    if (currentPlatformRow <= previousPlatformRowRef.current) {
      previousPlatformRowRef.current = currentPlatformRow;
      return;
    }

    previousPlatformRowRef.current = currentPlatformRow;
    setPlatformDropAnimating(true);

    const timeoutId = window.setTimeout(() => setPlatformDropAnimating(false), 1450);

    return () => window.clearTimeout(timeoutId);
  }, [currentPlatformRow, sessionReady]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSession((current) => {
        if (pendingOfflineFinalHitRef.current) {
          return current;
        }

        const currentSelectedCell = findExposedCellForPreferred(current, activeCellRef.current);
        const nextPlatformStartRow = findPlatformRow(current, platformRowRef.current);
        const currentWorkers = assignGoblinWorkers(
          current,
          miningGoblinsRef.current,
          goblinPlacementsRef.current,
          nextPlatformStartRow,
          rosterRef.current
        );

        if (currentWorkers.length === 0) {
          return current;
        }

        let nextSession = current;
        let nextActiveCell = currentSelectedCell;
        let nextPlatformRow = nextPlatformStartRow;

        for (const worker of currentWorkers) {
          const target = nextSession.blocks[worker.targetCell.row]?.[worker.targetCell.col];

          if (!target || target.destroyed || worker.damagePerSecond <= 0 || worker.targetCell.row !== nextPlatformRow) {
            continue;
          }

          const next = hitMineBlock(nextSession, contentBlockTypesRef.current, {
            row: target.row,
            col: target.col,
            damage: worker.damagePerSecond
          });
          const targetDestroyed = Boolean(next.blocks[target.row]?.[target.col]?.destroyed);
          const destroyedBlock = targetDestroyed ? next.blocks[target.row]?.[target.col] : undefined;

          spawnHitEffectRef.current(worker.targetCell, "goblin", worker.damagePerSecond, targetDestroyed ? next.lastRewards : undefined);
          notifyFoundVein(next.lastFoundVein);
          openCellRewardChestIfNeeded(destroyedBlock);

          if (targetDestroyed && cellKey(worker.targetCell) === cellKey(currentSelectedCell)) {
            nextActiveCell = findExposedCellForPreferred(next, worker.targetCell);
          }

          nextSession = next;
          nextPlatformRow = findPlatformRow(nextSession, nextPlatformRow);
        }

        setActiveCell(nextActiveCell);
        setPlatformRow(nextPlatformRow);
        return nextSession;
      });
    }, autoMiningTickMs);

    return () => window.clearInterval(intervalId);
  }, [sessionReady]);

  useEffect(() => {
    if (!sessionReady || !pendingOfflineFinalHit) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSession((current) => {
        const target = current.blocks[pendingOfflineFinalHit.row]?.[pendingOfflineFinalHit.col];

        if (!target || target.destroyed) {
          return current;
        }

        const next = hitMineBlock(current, contentState.content.blockTypes, {
          row: target.row,
          col: target.col,
          damage: Math.max(1, target.hp)
        });

        spawnHitEffect(pendingOfflineFinalHit, "boss", Math.max(1, target.hp), next.lastRewards);
        notifyFoundVein(next.lastFoundVein);
        openCellRewardChestIfNeeded(next.blocks[target.row]?.[target.col]);

        setActiveCell(findExposedCellForPreferred(next, pendingOfflineFinalHit));
        setOfflineSummary((currentSummary) =>
          currentSummary
            ? {
                ...currentSummary,
                destroyedBlocks: currentSummary.destroyedBlocks + 1,
                rewards: mergeResourceMaps(currentSummary.rewards, next.lastRewards),
                pendingFinalHit: false
              }
            : null
        );
        setPendingOfflineFinalHit(null);
        setPlatformRow(findPlatformRow(next, pendingOfflineFinalHit.row));
        return next;
      });
    }, offlineFinalHitDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [contentState.content.blockTypes, pendingOfflineFinalHit, sessionReady]);

  const placeGoblinOnCellKey = useCallback(
    (goblinId: string, targetCellKey: string) => {
      const targetCell = parseCellKey(targetCellKey);

      if (!targetCell || !platformCellKeys.has(targetCellKey)) {
        return;
      }

      const targetBlock = session.blocks[targetCell.row]?.[targetCell.col];

      if (!targetBlock || targetBlock.destroyed) {
        return;
      }

      setGoblinPlacements((current) => {
        const next = { ...current };
        const previousColumn = next[goblinId];
        const occupyingGoblinId = Object.entries(next).find(
          ([otherGoblinId, column]) => otherGoblinId !== goblinId && column === targetCell.col
        )?.[0];

        if (occupyingGoblinId) {
          if (typeof previousColumn === "number" && isValidMineColumn(session, previousColumn)) {
            next[occupyingGoblinId] = previousColumn;
          } else {
            delete next[occupyingGoblinId];
          }
        }

        next[goblinId] = targetCell.col;
        return next;
      });
      setActiveCell(targetCell);
    },
    [platformCellKeys, session]
  );

  const handlePlaceGoblin = useCallback(
    (goblinId: string, targetCell: { row: number; col: number }) => {
      placeGoblinOnCellKey(goblinId, cellKey(targetCell));
    },
    [placeGoblinOnCellKey]
  );

  function spawnHitEffect(
    cell: { row: number; col: number },
    variant: HitEffectVariant,
    damage: number,
    rewards: Record<string, number> = {}
  ) {
    const id = ++hitEffectSequence;
    const rewardDrops = rewardDropsFromMap(rewards, contentState.content, labels);

    setHitEffects((current) => [...current.slice(-16), { damage, id, rewardDrops, row: cell.row, col: cell.col, variant }]);
    scheduleResourceRewardDisplay(rewards);
    window.setTimeout(() => {
      setHitEffects((current) => current.filter((effect) => effect.id !== id));
    }, hitEffectLifetimeMs);
  }

  function handleBlockHit(block: MiningBlockState) {
    const targetCell = { row: block.row, col: block.col };

    if (block.destroyed || !exposedCellKeys.has(cellKey(targetCell))) {
      return;
    }

    const now = Date.now();
    const attack = applyBossAttack(bossEnergy, bossEnergyConfig, {
      now,
      random: Math.random
    });

    setBossEnergy(attack.state);
    setClockNow(now);

    if (!attack.ok) {
      setBossEnergyFeedback(true);
      return;
    }

    setSession((current) => {
      const next = hitMineBlock(current, contentState.content.blockTypes, {
        row: block.row,
        col: block.col,
        damage: attack.damage
      });
      const targetDestroyed = next.blocks[block.row]?.[block.col]?.destroyed;
      const destroyedBlock = targetDestroyed ? next.blocks[block.row]?.[block.col] : undefined;
      spawnHitEffect(targetCell, attack.critical ? "critical" : "boss", attack.damage, targetDestroyed ? next.lastRewards : undefined);
      notifyFoundVein(next.lastFoundVein);
      openCellRewardChestIfNeeded(destroyedBlock);
      setActiveCell(targetDestroyed ? findNextExposedCell(next, targetCell) : targetCell);
      setPlatformRow((current) => findPlatformRow(next, current));
      return next;
    });
  }

  function handleResetMine() {
    const resetAt = Date.now();
    const nextSession = createSession(contentState.content);
    const nextActiveCell = findFirstPlayableCell(nextSession);
    const nextPlatformRow = findPlatformRow(nextSession, 0);
    const nextGoblinPlacements = createDefaultGoblinPlacements(nextSession, miningGoblins, nextPlatformRow);
    const nextBossEnergy = createBossEnergyState(bossEnergyConfig, resetAt);
    setSession(nextSession);
    setActiveCell(nextActiveCell);
    setPlatformRow(nextPlatformRow);
    setGoblinPlacements(nextGoblinPlacements);
    setBossEnergy(nextBossEnergy);
    setBuiltMines([]);
    setBuiltMineMessage(null);
    setFoundVeinNotice(null);
    setMineCompletionNoticeOpen(false);
    setMineCompletionNoticeSeenIds([]);
    clearRewardChestSummaryTimer(rewardChestSummaryTimeoutRef);
    setPendingRewardChest(null);
    setRewardChestStage("closed");
    setChestRewardFlyouts([]);
    syncVisibleResourceAmounts(nextSession.resources);
    setClockNow(resetAt);
    setOfflineSummary(null);
    setPendingOfflineFinalHit(null);
    saveMiningSession(
      contentState.version,
      nextSession,
      nextActiveCell,
      nextPlatformRow,
      nextGoblinPlacements,
      nextBossEnergy,
      [],
      [],
      bossCardDefinitions
    );
  }

  function handleConfirmResetMine() {
    if (!window.confirm("Сбросить текущую шахту и локальный прогресс?")) {
      return;
    }

    handleResetMine();
    setSettingsOpen(false);
  }

  function handleStartNextMine() {
    const nextMine = findNextMineTemplate(contentState.content.mineTemplates, session.mine.templateId);

    if (!nextMine) {
      setBuiltMineMessage("Следующий рудник пока не открыт.");
      return;
    }

    if (!canStartNextMine) {
      setBuiltMineMessage("Сначала полностью расчисти текущий рудник.");
      return;
    }

    if (openMineCompletionRewardChestIfNeeded()) {
      return;
    }

    const nextSession = carryFoundVeinsToNextMineSession(createSession(contentState.content, nextMine.id, session.resources), session);
    const nextPlatformRow = findPlatformRow(nextSession, 0);
    const nextActiveCell = findFirstPlayableCell(nextSession);
    const nextGoblinPlacements = createDefaultGoblinPlacements(nextSession, miningGoblins, nextPlatformRow);
    const nextSeenNoticeIds = markMineCompletionNoticeSeen(mineCompletionNoticeSeenIds, session.mine.templateId);

    setSession(nextSession);
    setActiveCell(nextActiveCell);
    setPlatformRow(nextPlatformRow);
    setGoblinPlacements(nextGoblinPlacements);
    setFoundVeinNotice(null);
    setMineCompletionNoticeOpen(false);
    setMineCompletionNoticeSeenIds(nextSeenNoticeIds);
    setPendingOfflineFinalHit(null);
    setOfflineSummary(null);
    setActiveSection("mine");
    setBuiltMineMessage(`${mineTitle(nextMine, labels)} открыт.`);
    saveMiningSession(
      contentState.version,
      nextSession,
      nextActiveCell,
      nextPlatformRow,
      nextGoblinPlacements,
      bossEnergy,
      builtMines,
      nextSeenNoticeIds,
      bossCardDefinitions
    );
  }

  function openMineCompletionRewardChestIfNeeded(): boolean {
    if (!canStartNextMine) {
      return false;
    }

    if (mineCompletionNoticeSeenIds.includes(session.mine.templateId)) {
      return false;
    }

    const rewardChest = createMineCompletionRewardChest(contentState.content, session.mine.templateId);

    if (!rewardChest) {
      return false;
    }

    queueRewardChest(rewardChest);
    setMineCompletionNoticeOpen(false);
    setActiveSection("mine");
    return true;
  }

  function queueRewardChest(rewardChest: PendingRewardChest) {
    clearRewardChestSummaryTimer(rewardChestSummaryTimeoutRef);
    pendingRewardChestRef.current = rewardChest;
    setPendingRewardChest(rewardChest);
    setRewardChestStage("closed");
    setChestRewardFlyouts([]);
  }

  function openCellRewardChestIfNeeded(block: MiningBlockState | undefined) {
    if (!block || block.special !== "reward_chest" || !block.rewardChestTypeId || pendingRewardChestRef.current) {
      return;
    }

    if (!findRewardChestType(contentState.content, block.rewardChestTypeId)) {
      return;
    }

    const currentSession = sessionRef.current;
    queueRewardChest({
      chestTypeId: block.rewardChestTypeId,
      id: `${currentSession.mine.templateId}:${currentSession.mine.seed}:${block.row}:${block.col}:${block.rewardChestTypeId}`,
      mineTemplateId: currentSession.mine.templateId,
      rewards: null,
      source: "cell"
    });
  }

  function handleOpenRewardChest() {
    if (!pendingRewardChest || rewardChestStage !== "closed") {
      return;
    }

    const chestType = findRewardChestType(contentState.content, pendingRewardChest.chestTypeId);

    if (!chestType) {
      setPendingRewardChest(null);
      setRewardChestStage("closed");
      return;
    }

    const openedChest: OpenedRewardChest = openRewardChest({
      chestType,
      random: Math.random
    });
    const rewards = openedChest.rewards;
    const nextSeenNoticeIds =
      pendingRewardChest.source === "mine_completion"
        ? markMineCompletionNoticeSeen(mineCompletionNoticeSeenIds, pendingRewardChest.mineTemplateId)
        : mineCompletionNoticeSeenIds;

    clearRewardChestSummaryTimer(rewardChestSummaryTimeoutRef);
    setPendingRewardChest({ ...pendingRewardChest, rewards });
    setRewardChestStage("opening");
    setChestRewardFlyouts(createChestRewardFlyouts(rewards, contentState.content, labels));
    if (pendingRewardChest.source === "mine_completion") {
      setMineCompletionNoticeSeenIds(nextSeenNoticeIds);
    }
    setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: mergeResourceMaps(current.resources, rewards)
    }));
    scheduleResourceRewardDisplay(rewards);
    rewardChestSummaryTimeoutRef.current = window.setTimeout(() => {
      rewardChestSummaryTimeoutRef.current = null;
      setRewardChestStage("summary");
    }, rewardChestOpeningMs);
  }

  function handleContinueRewardChest() {
    const completedChest = pendingRewardChest;

    if (rewardChestStage !== "summary" || !completedChest) {
      return;
    }

    clearRewardChestSummaryTimer(rewardChestSummaryTimeoutRef);
    setPendingRewardChest(null);
    pendingRewardChestRef.current = null;
    setRewardChestStage("closed");
    setChestRewardFlyouts([]);
    if (completedChest.source === "mine_completion") {
      handleStartNextMine();
    }
  }

  function handleDismissMineCompletionNotice() {
    setMineCompletionNoticeOpen(false);
    setMineCompletionNoticeSeenIds((current) => markMineCompletionNoticeSeen(current, session.mine.templateId));
    setBuiltMineMessage("Следующий рудник доступен из меню шахт.");
  }

  function showResourceTooltip(resource: ResourceConfig, value: number) {
    setResourceTooltip({
      id: ++tooltipSequenceRef.current,
      label: resourceLabel(resource, resource.id, labels),
      resourceId: resource.id,
      value
    });
  }

  function notifyFoundVein(vein: MiningFoundVein | null) {
    if (!vein || hasBuiltMineForVein(builtMinesRef.current, vein.id)) {
      return;
    }

    setFoundVeinNotice(vein);
    setBuiltMineMessage(`Рудник расчищен. ${veinNameById(vein.veinTypeId, contentState.content, labels)} найдена.`);
  }

  function handleBuildMineFromVein(vein: MiningFoundVein): boolean {
    if (hasBuiltMineForVein(builtMines, vein.id)) {
      setBuiltMineMessage("На этой жиле уже построена шахта.");
      return false;
    }

    const result = buildMineFromVein({
      buildCostMultiplier: constructionSupport.buildCostMultiplier,
      buildTimeMultiplier: constructionSupport.buildTimeMultiplier,
      builtMineTypes: contentState.content.builtMineTypes,
      now: Date.now(),
      resources: session.resources,
      vein
    });

    if (!result.ok) {
      setBuiltMineMessage(messageForBuildMineFailure(result.reason));
      return false;
    }

    setBuiltMines((current) => [...current, result.builtMine]);
    setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: result.resources
    }));
    syncVisibleResourceAmounts(result.resources);
    setBuiltMineMessage(`${builtMineTypeName(result.builtMine.typeId, contentState.content, labels)} строится.`);
    return true;
  }

  function handleCollectBuiltMine(builtMineId: string) {
    const builtMine = builtMines.find((mine) => mine.id === builtMineId);

    if (!builtMine) {
      return;
    }

    const collector = builtMine.assignedCollectorGoblinId
      ? hiredCollectorGoblins.find((goblin) => goblin.id === builtMine.assignedCollectorGoblinId)
      : undefined;
    const result = collectBuiltMineIncomeWithCollector({
      builtMine,
      collector,
      collectorLevel: collector ? getGoblinLevel(roster, collector.id) : undefined,
      now: Date.now(),
      resources: session.resources
    });

    setBuiltMines((current) => current.map((mine) => (mine.id === builtMineId ? result.builtMine : mine)));

    if (result.collectedAmount <= 0) {
      setBuiltMineMessage("В хранилище шахты пока пусто.");
      return;
    }

    setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: result.resources
    }));
    syncVisibleResourceAmounts(result.resources);
    setBuiltMineMessage(`Собрано ${formatInteger(result.collectedAmount)} ${resourceLabelById(result.builtMine.productionResourceId, labels, contentState.content)}.`);
  }

  function handleCollectAllBuiltMines() {
    const now = Date.now();
    const collectedResources: Record<string, number> = {};
    let nextResources = session.resources;
    let collectedTotal = 0;

    const nextBuiltMines = builtMines.map((builtMine) => {
      const collector = builtMine.assignedCollectorGoblinId
        ? hiredCollectorGoblins.find((goblin) => goblin.id === builtMine.assignedCollectorGoblinId)
        : undefined;
      const result = collectBuiltMineIncomeWithCollector({
        builtMine,
        collector,
        collectorLevel: collector ? getGoblinLevel(roster, collector.id) : undefined,
        now,
        resources: nextResources
      });

      nextResources = result.resources;

      if (result.collectedAmount > 0) {
        collectedTotal += result.collectedAmount;
        collectedResources[result.builtMine.productionResourceId] =
          (collectedResources[result.builtMine.productionResourceId] ?? 0) + result.collectedAmount;
      }

      return result.builtMine;
    });

    setBuiltMines(nextBuiltMines);

    if (collectedTotal <= 0) {
      setBuiltMineMessage("В шахтах пока нечего собрать.");
      return;
    }

    setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: nextResources
    }));
    syncVisibleResourceAmounts(nextResources);
    setBuiltMineMessage(
      `Собрано ${resourceAmountSummaryLabel(rewardDropsFromMap(collectedResources, contentState.content, labels), labels, contentState.content)}.`
    );
  }

  function handleUpgradeBuiltMine(builtMineId: string) {
    const builtMine = builtMinesRef.current.find((mine) => mine.id === builtMineId);

    if (!builtMine) {
      return;
    }

    const result = upgradeBuiltMine({
      builtMine,
      costMultiplier: constructionSupport.upgradeCostMultiplier,
      now: Date.now(),
      resources: sessionRef.current.resources,
      upgrade: contentState.content.builtMineTypes.find((builtMineType) => builtMineType.id === builtMine.typeId)?.upgrade
    });

    if (!result.ok) {
      setBuiltMineMessage(messageForUpgradeBuiltMineFailure(result.reason));
      return;
    }

    setBuiltMines((current) => current.map((mine) => (mine.id === builtMineId ? result.builtMine : mine)));
    setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: result.resources
    }));
    syncVisibleResourceAmounts(result.resources);
    setBuiltMineMessage(`${builtMineTypeName(result.builtMine.typeId, contentState.content, labels)} улучшена до уровня ${result.builtMine.level}.`);
  }

  function handleAssignBuiltMineCollector(builtMineId: string, goblinId: string | null) {
    const builtMine = builtMines.find((mine) => mine.id === builtMineId);

    if (!builtMine) {
      return;
    }

    if (!goblinId) {
      setBuiltMines((current) =>
        current.map((mine) => (mine.id === builtMineId ? { ...mine, assignedCollectorGoblinId: null } : mine))
      );
      setBuiltMineMessage(`Автосбор снят с ${builtMineTypeName(builtMine.typeId, contentState.content, labels)}.`);
      return;
    }

    const collector = hiredCollectorGoblins.find((goblin) => goblin.id === goblinId);

    if (!collector) {
      setBuiltMineMessage("Сначала найми гоблина-сборщика.");
      return;
    }

    if (!hasCollectorSlotAvailable(collector, builtMines, builtMineId, getGoblinLevel(roster, collector.id))) {
      setBuiltMineMessage(`${goblinName(collector, labels)} уже занят.`);
      return;
    }

    setBuiltMines((current) =>
      current.map((mine) => (mine.id === builtMineId ? assignBuiltMineCollector(mine, collector.id) : mine))
    );
    setBuiltMineMessage(`${goblinName(collector, labels)} назначен на ${builtMineTypeName(builtMine.typeId, contentState.content, labels)}.`);
  }

  function handleHireGoblin(goblin: GoblinConfig) {
    const result = hireGoblin({
      builtMinesCount: visibleBuiltMines.length,
      completedMineTemplateIds,
      goblinId: goblin.id,
      goblinHut: contentState.content.goblinHut,
      goblins: availableGoblins,
      roster,
      resources: session.resources
    });

    if (!result.ok) {
      setRosterMessage(messageForHireFailure(result.reason));
      return;
    }

    setRoster(result.roster);
    if (isMiningGoblin(goblin)) {
      setGoblinPlacements((current) => placeGoblinInFirstFreeColumn(session, current, goblin.id, currentPlatformRow));
    }
    syncVisibleResourceAmounts(result.resources);
    setSession((current) => ({
      ...current,
      resources: result.resources,
      lastRewards: {}
    }));
    setRosterMessage(`${goblinName(goblin, labels)} нанят.`);
  }

  function handleUpgradeGoblin(goblin: GoblinConfig) {
    const result = upgradeGoblin({
      goblinId: goblin.id,
      goblinHut: contentState.content.goblinHut,
      goblins: availableGoblins,
      resources: session.resources,
      roster
    });

    if (!result.ok) {
      setRosterMessage(messageForGoblinUpgradeFailure(result.reason));
      return;
    }

    setRoster(result.roster);
    syncVisibleResourceAmounts(result.resources);
    setSession((current) => ({
      ...current,
      resources: result.resources,
      lastRewards: {}
    }));
    setRosterMessage(`${goblinName(goblin, labels)} уровень ${getGoblinLevel(result.roster, goblin.id)}.`);
  }

  function handleUpgradeGoblinHut() {
    const result = upgradeGoblinHut({
      builtMinesCount: visibleBuiltMines.length,
      completedMineTemplateIds,
      goblinHut: contentState.content.goblinHut,
      goblins: availableGoblins,
      resources: session.resources,
      roster
    });

    if (!result.ok) {
      setRosterMessage(messageForGoblinHutUpgradeFailure(result.reason));
      return;
    }

    setRoster(result.roster);
    syncVisibleResourceAmounts(result.resources);
    setSession((current) => ({
      ...current,
      resources: result.resources,
      lastRewards: {}
    }));
    setRosterMessage(`Хижина уровень ${result.roster.hutLevel ?? 1}.`);
  }

  function handleUpgradeBossCard(cardId: BossCardId) {
    const result = upgradeBossCard({
      cardId,
      definitions: bossCardDefinitions,
      resources: session.resources,
      state: bossCards
    });

    if (!result.ok) {
      setBossCardsMessage(messageForBossCardUpgradeFailure(result.reason));
      return;
    }

    const card = bossCardDefinitions.find((definition) => definition.id === cardId);
    setBossCards(result.state);
    setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: result.resources
    }));
    syncVisibleResourceAmounts(result.resources);
    setBossCardsMessage(`${bossCardName(card, labels)} уровень ${result.state.levels[cardId] ?? 0}.`);
  }

  return (
    <main className="game-shell">
      <section className="phone-frame" aria-label="Игровой экран">
        <header className="resource-bar">
          <div className="resource-list" style={{ gridTemplateColumns: `repeat(${Math.max(1, displayedResources.length)}, minmax(0, 1fr))` }}>
            {displayedResources.map((resource) => {
              const value = visibleResourceAmounts[resource.id] ?? 0;

              return (
                <ResourceChip
                  flashing={flashingResourceIds.has(resource.id)}
                  key={resource.id}
                  labels={labels}
                  onClick={() => showResourceTooltip(resource, value)}
                  resource={resource}
                  value={value}
                />
              );
            })}
          </div>
          <button className="icon-button menu-button" onClick={() => setSettingsOpen(true)} title="Меню" type="button" aria-label="Меню">
            <Menu size={20} />
          </button>
        </header>
        {resourceTooltip ? (
          <button
            className={`resource-tooltip ${resourceClassName(resourceTooltip.resourceId)}`}
            key={resourceTooltip.id}
            onClick={() => setResourceTooltip(null)}
            type="button"
          >
            <ResourceIcon resourceId={resourceTooltip.resourceId} size={16} />
            <span>{resourceTooltip.label}</span>
            <strong>{formatNumber(resourceTooltip.value)}</strong>
          </button>
        ) : null}

        {contentState.source === "error" ? (
          <section className="mine-content-loading error">
            <strong>Контент не загрузился</strong>
            <span>{contentState.message}</span>
          </section>
        ) : activeSection === "base" ? (
          <BaseSection
            goblinHutProgression={goblinHutProgression}
            labels={labels}
            message={rosterMessage}
            onUpgradeGoblinHut={handleUpgradeGoblinHut}
          />
        ) : activeSection === "goblins" ? (
          <GoblinSection
            activeRoleTab={goblinRoleTab}
            availableGoblins={availableGoblins}
            builtMinesCount={visibleBuiltMines.length}
            completedMineTemplateIds={completedMineTemplateIds}
            content={contentState.content}
            hutLevel={goblinHutProgression.levelNow}
            hutLimit={goblinHutProgression.maxHiredGoblins}
            labels={labels}
            onHireGoblin={handleHireGoblin}
            onRoleTabChange={setGoblinRoleTab}
            onUpgradeGoblin={handleUpgradeGoblin}
            resources={session.resources}
            roster={roster}
            rosterMessage={rosterMessage}
          />
        ) : activeSection === "builtMines" ? (
          <BuiltMinesSection
            builtMines={visibleBuiltMines}
            builtMineTypes={contentState.content.builtMineTypes}
            upgradePreviews={builtMineUpgradePreviews}
            canStartNextMine={canStartNextMine}
            constructionSupport={constructionSupport}
            collectorGoblins={hiredCollectorGoblins}
            content={contentState.content}
            foundVeins={unbuiltFoundVeins}
            goblinLevels={goblinLevels}
            labels={labels}
            message={builtMineMessage}
            nextMineTemplate={nextMineTemplate}
            onOpenCollectorPicker={setCollectorPickerMineId}
            onCollectAllMines={handleCollectAllBuiltMines}
            onBuildMine={handleBuildMineFromVein}
            onCollectMine={handleCollectBuiltMine}
            onStartNextMine={handleStartNextMine}
            onUpgradeMine={handleUpgradeBuiltMine}
            now={clockNow}
            resources={session.resources}
          />
        ) : loadingContent || !sessionReady ? (
          <section className="mine-content-loading">
            <span>Загрузка рудника...</span>
          </section>
        ) : (
          <Suspense
            fallback={
              <section className="mine-content-loading">
                <span>Загрузка рудника...</span>
              </section>
            }
          >
            <MinePixiScene
              activeCell={selectedCell}
              blockTypeById={blockTypeById}
              currentPlatformRow={currentPlatformRow}
              depthMarkerLabel={pixiDepthMarkerLabel}
              exposedCellKeys={exposedCellKeys}
              goblins={pixiGoblins}
              hitEffects={hitEffects}
              onBlockHit={handleBlockHit}
              onPlaceGoblin={handlePlaceGoblin}
              devOverlayEnabled={pixiDevOverlayEnabled}
              platformCellKeys={platformCellKeys}
              platformDropAnimating={platformDropAnimating}
              session={session}
            />
          </Suspense>
        )}

        {activeSection === "mine" && sessionReady ? (
          <section className="boss-panel">
            <button
              className={bossEnergyFeedback ? "boss-energy-card warn" : "boss-energy-card"}
              onClick={() => setBossDetailsOpen(true)}
              type="button"
            >
              <span className="boss-energy-tank" aria-hidden="true">
                <i style={{ height: `${bossEnergyPercent}%` }} />
              </span>
              <span className="boss-energy-main">
                <span>Энергия босса</span>
                <strong>
                  {formatInteger(displayedBossEnergy)}/{bossEnergyConfig.maxEnergy}
                </strong>
              </span>
              <span className="boss-energy-stats">
                <span>{bossEnergyConfig.damagePerTap} урон</span>
                <span>+{bossEnergyConfig.regenPerSecond}/сек</span>
              </span>
            </button>
            <button className="boss-cards-button" onClick={() => setBossCardsOpen(true)} type="button" aria-label="Карты босса">
              <Sparkles size={18} />
              <span>Карты</span>
            </button>
          </section>
        ) : null}

        {collectorPickerBuiltMine ? (
          <CollectorAssignmentModal
            builtMine={collectorPickerBuiltMine}
            builtMines={visibleBuiltMines}
            collectors={hiredCollectorGoblins}
            content={contentState.content}
            goblinLevels={goblinLevels}
            labels={labels}
            onAssign={(goblinId) => {
              handleAssignBuiltMineCollector(collectorPickerBuiltMine.id, goblinId);
              setCollectorPickerMineId(null);
            }}
            onClose={() => setCollectorPickerMineId(null)}
          />
        ) : null}

        {foundVeinNotice ? (
          <div className="modal-backdrop" onClick={() => setFoundVeinNotice(null)} role="presentation">
            <section className="vein-modal" aria-label="Рудник расчищен" onClick={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <p>Рудник расчищен</p>
                  <strong>{veinNameById(foundVeinNotice.veinTypeId, contentState.content, labels)}</strong>
                </div>
                <button className="icon-button" onClick={() => setFoundVeinNotice(null)} type="button" aria-label="Закрыть">
                  <X size={18} />
                </button>
              </header>
              <p className="vein-modal-copy">
                Ура, рудник полностью расчищен. Найдена жила: {veinNameById(foundVeinNotice.veinTypeId, contentState.content, labels)}.
                Построй шахту, чтобы она автоматически приносила ресурс.
              </p>
              {foundVeinBuiltMineType ? (
                <div className="vein-modal-stats">
                  <div>
                    <span>Стоимость</span>
                    <strong>
                      {builtMineCostLabel(foundVeinBuiltMineType, labels, contentState.content, constructionSupport.buildCostMultiplier)}
                    </strong>
                  </div>
                  <div>
                    <span>Добыча</span>
                    <strong>
                      {formatNumber(foundVeinBuiltMineType.baseProductionPerHour)}/ч{" "}
                      {resourceLabelById(foundVeinBuiltMineType.productionResourceId, labels, contentState.content)}
                    </strong>
                  </div>
                </div>
              ) : null}
              <div className="vein-modal-actions">
                <button
                  disabled={!canBuildFoundVeinNotice || !foundVeinBuiltMineType}
                  onClick={() => {
                    if (handleBuildMineFromVein(foundVeinNotice)) {
                      setFoundVeinNotice(null);
                      setActiveSection("builtMines");
                    }
                  }}
                  type="button"
                >
                  Построить
                </button>
                <button
                  onClick={() => {
                    setFoundVeinNotice(null);
                    setActiveSection("builtMines");
                  }}
                  type="button"
                >
                  Построить позже
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {mineCompletionNoticeOpen && nextMineTemplate ? (
          <div className="modal-backdrop" onClick={handleDismissMineCompletionNotice} role="presentation">
            <section className="mine-complete-modal" aria-label="Рудник освоен" onClick={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <p>Рудник освоен</p>
                  <strong>{mineTitle(mineTemplate, labels)}</strong>
                </div>
                <button className="icon-button" onClick={handleDismissMineCompletionNotice} type="button" aria-label="Закрыть">
                  <X size={18} />
                </button>
              </header>
              <div className="mine-complete-medal" aria-hidden="true">
                <Pickaxe size={30} />
              </div>
              <div className="mine-complete-summary">
                <div>
                  <span>Жила найдена</span>
                  <strong>Рудник полностью расчищен</strong>
                </div>
                <div>
                  <span>Открыт маршрут</span>
                  <strong>
                    Рудник №{currentMineIndex + 2} · {mineTitle(nextMineTemplate, labels)}
                  </strong>
                </div>
              </div>
              <div className="mine-complete-actions">
                <button onClick={handleStartNextMine} type="button">
                  Новый рудник
                </button>
                <button onClick={handleDismissMineCompletionNotice} type="button">
                  Остаться
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {pendingRewardChest && pendingRewardChestType ? (
          <RewardChestScreen
            chestType={pendingRewardChestType}
            content={contentState.content}
            currentMineTitle={mineTitle(mineTemplate, labels)}
            flyouts={chestRewardFlyouts}
            labels={labels}
            nextMineTitle={nextMineTemplate ? mineTitle(nextMineTemplate, labels) : null}
            onContinue={handleContinueRewardChest}
            onOpen={handleOpenRewardChest}
            rewards={pendingRewardChest.rewards ?? {}}
            source={pendingRewardChest.source}
            stage={rewardChestStage}
          />
        ) : null}

        {settingsOpen ? (
          <div className="modal-backdrop" onClick={() => setSettingsOpen(false)} role="presentation">
            <section className="settings-modal" aria-label="Настройки" onClick={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <p>Меню</p>
                  <strong>Настройки</strong>
                </div>
                <button className="icon-button" onClick={() => setSettingsOpen(false)} type="button" aria-label="Закрыть">
                  <X size={18} />
                </button>
              </header>
              <div className="settings-list">
                <div className="settings-row">
                  <span>Рудник</span>
                  <strong>{mineTitle(mineTemplate, labels)}</strong>
                </div>
                <div className="settings-row">
                  <span>Контент</span>
                  <strong>{contentState.source === "published" ? contentState.version : contentState.message}</strong>
                </div>
                <label className="settings-toggle">
                  <span>
                    <strong>Pixi dev overlay</strong>
                    <small>FPS, клетки, строки</small>
                  </span>
                  <input
                    checked={pixiDevOverlayEnabled}
                    onChange={(event) => setPixiDevOverlayEnabled(event.target.checked)}
                    type="checkbox"
                  />
                </label>
              </div>
              <button className="settings-action" onClick={handleConfirmResetMine} type="button">
                <RotateCcw size={18} />
                Сбросить шахту
              </button>
            </section>
          </div>
        ) : null}

        {bossDetailsOpen ? (
          <div className="modal-backdrop" onClick={() => setBossDetailsOpen(false)} role="presentation">
            <section className="boss-modal" aria-label="Параметры босса" onClick={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <p>Босс</p>
                  <strong>Параметры удара</strong>
                </div>
                <button className="icon-button" onClick={() => setBossDetailsOpen(false)} type="button" aria-label="Закрыть">
                  <X size={18} />
                </button>
              </header>
              <div className="boss-stat-grid">
                <BossStat label="Энергия" value={`${formatInteger(displayedBossEnergy)}/${bossEnergyConfig.maxEnergy}`} />
                <BossStat label="Расход" value={`${bossEnergyConfig.energyPerHit}/удар`} />
                <BossStat label="Урон" value={`${bossEnergyConfig.damagePerTap}/тап`} />
                <BossStat label="Реген" value={`+${bossEnergyConfig.regenPerSecond}/сек`} />
                <BossStat label="Крит" value={formatPercent(bossEnergyConfig.critChance)} />
                <BossStat label="Множитель" value={`x${formatNumber(bossEnergyConfig.critMultiplier)}`} />
              </div>
              <div className="boss-ready-line">
                {bossSecondsUntilReady === 0 ? "Удар готов" : `Следующий удар через ${formatSeconds(bossSecondsUntilReady)}`}
              </div>
            </section>
          </div>
        ) : null}

        {bossCardsOpen ? (
          <BossCardsModal
            cards={bossCardDefinitions}
            labels={labels}
            message={bossCardsMessage}
            onClose={() => setBossCardsOpen(false)}
            onUpgrade={handleUpgradeBossCard}
            resources={session.resources}
            state={bossCards}
          />
        ) : null}

        <nav className="bottom-nav" aria-label="Основная навигация">
          <button className={activeSection === "mine" ? "active" : ""} onClick={() => setActiveSection("mine")} type="button">
            <Pickaxe size={18} />
            Рудник
          </button>
          <button className={activeSection === "base" ? "active" : ""} onClick={() => setActiveSection("base")} type="button">
            <Hammer size={18} />
            База
          </button>
          <button className={activeSection === "goblins" ? "active" : ""} onClick={() => setActiveSection("goblins")} type="button">
            <Users size={18} />
            Гоблины
          </button>
          <button className={activeSection === "builtMines" ? "active" : ""} onClick={() => setActiveSection("builtMines")} type="button">
            <Warehouse size={18} />
            Шахты
          </button>
        </nav>
      </section>
    </main>
  );
}

function createSession(
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

function createRestoredGoblinRoster(content: ContentBundle, contentVersion: string): GoblinRosterState {
  const goblins = createAvailableGoblins(content);
  const storedRoster = loadStoredGoblinRoster(localStorage, contentVersion);

  if (!storedRoster) {
    return createInitialGoblinRoster(goblins);
  }

  return normalizeGoblinRoster(storedRoster.roster, goblins, content.goblinHut);
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

function ResourceChip(props: {
  flashing: boolean;
  labels: Record<string, string>;
  onClick: () => void;
  resource: ResourceConfig;
  value: number;
}) {
  const label = resourceLabel(props.resource, props.resource.id, props.labels);

  return (
    <button
      aria-label={`${label}: ${formatNumber(props.value)}`}
      className={`resource-chip ${resourceClassName(props.resource.id)}${props.flashing ? " flash" : ""}`}
      onClick={props.onClick}
      title={label}
      type="button"
    >
      <ResourceIcon resourceId={props.resource.id} size={17} />
      <strong>{formatNumber(props.value)}</strong>
    </button>
  );
}

function ResourceIcon(props: { resourceId: string; size: number }) {
  if (isBossCardResourceId(props.resourceId)) {
    return <BossCardResourceIcon resourceId={props.resourceId} size={props.size} />;
  }

  if (props.resourceId.includes("elixir")) {
    return <Zap size={props.size} />;
  }

  if (props.resourceId.includes("gold")) {
    return <Coins size={props.size} />;
  }

  if (props.resourceId.includes("copper")) {
    return <Gem size={props.size} />;
  }

  if (props.resourceId.includes("iron")) {
    return <Pickaxe size={props.size} />;
  }

  if (props.resourceId.includes("energy")) {
    return <Zap size={props.size} />;
  }

  return <Mountain size={props.size} />;
}

function BossCardResourceIcon(props: { resourceId: string; size: number }) {
  if (props.resourceId.includes("hit_damage")) {
    return <Hammer size={props.size} />;
  }

  if (props.resourceId.includes("crit_chance")) {
    return <Zap size={props.size} />;
  }

  if (props.resourceId.includes("crit_multiplier")) {
    return <Sparkles size={props.size} />;
  }

  if (props.resourceId.includes("max_energy")) {
    return <Gem size={props.size} />;
  }

  return <Sparkles size={props.size} />;
}

function RewardChestScreen(props: {
  chestType: RewardChestTypeConfig;
  content: ContentBundle;
  currentMineTitle: string;
  flyouts: ChestRewardFlyout[];
  labels: Record<string, string>;
  nextMineTitle: string | null;
  onContinue: () => void;
  onOpen: () => void;
  rewards: Record<string, number>;
  source: PendingRewardChest["source"];
  stage: RewardChestStage;
}) {
  const chestName = labelFromNameKey(props.chestType.nameKey, props.chestType.id, props.labels);
  const rewardDrops = rewardDropsFromMap(props.rewards, props.content, props.labels);
  const featuredCardReward = findFeaturedCardReward(rewardDrops, props.content);
  const isSummary = props.stage === "summary";
  const isCardRevealVisible = props.stage === "opening" && Boolean(featuredCardReward);
  const chestAssetClass = rewardChestAssetClass(props.chestType);

  return (
    <section className={`reward-chest-screen ${props.chestType.tier} ${chestAssetClass}`} aria-label="Открытие сундука">
      <div className="reward-chest-sky" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <header className="reward-chest-header">
        <p>{props.source === "mine_completion" ? "Рудник освоен" : "Сундук найден"}</p>
        <strong>{props.source === "mine_completion" ? props.currentMineTitle : chestName}</strong>
        <span>
          {props.source === "mine_completion"
            ? props.nextMineTitle
              ? `Дальше: ${props.nextMineTitle}`
              : "Следующий рудник скоро"
            : props.currentMineTitle}
        </span>
      </header>

      <div className="reward-chest-stage" aria-live="polite">
        <div className="reward-chest-glow" aria-hidden="true" />
        {props.flyouts.map((reward) => (
          <span
            className={`chest-reward-flyout ${resourceClassName(reward.resourceId)}`}
            key={reward.id}
            style={
              {
                "--delay": `${reward.delayMs}ms`,
                "--distance": `${reward.distance}px`,
                "--x": `${reward.x}px`
              } as CSSProperties
            }
          >
            <ResourceIcon resourceId={reward.resourceId} size={17} />
            +{formatInteger(reward.amount)}
          </span>
        ))}

        {featuredCardReward ? (
          <div
            className={`reward-card-reveal ${featuredCardReward.card.rarity} ${isCardRevealVisible ? "show" : ""}`}
            aria-hidden={!isCardRevealVisible}
          >
            <span>{bossCardRarityLabel(featuredCardReward.card.rarity)}</span>
            <BossCardArt card={featuredCardReward.card} />
            <strong>{bossCardName(featuredCardReward.card, props.labels)}</strong>
            <small>
              +{formatInteger(featuredCardReward.amount)} {featuredCardReward.label}
            </small>
          </div>
        ) : null}

        <button
          className={`reward-chest-box ${props.chestType.tier} ${chestAssetClass} ${props.stage}`}
          disabled={props.stage !== "closed"}
          onClick={props.onOpen}
          type="button"
          aria-label={`Открыть ${chestName}`}
        >
          <span className="reward-chest-lid" />
          <span className="reward-chest-hinge" />
          <span className="reward-chest-lock" />
          <span className="reward-chest-rune" />
          <span className="reward-chest-body" />
          <span className="reward-chest-bands" />
        </button>

        <div className={isSummary ? "reward-chest-summary show" : "reward-chest-summary"} aria-hidden={!isSummary}>
          <p>Получено</p>
          <strong>{chestName}</strong>
          <div className="reward-chest-rewards">
            {rewardDrops.length > 0 ? (
              rewardDrops.map((reward) => (
                <span className={`reward-chest-reward ${resourceClassName(reward.resourceId)}`} key={reward.resourceId}>
                  <ResourceIcon resourceId={reward.resourceId} size={18} />
                  <b>+{formatInteger(reward.amount)}</b>
                  <small>{reward.label}</small>
                </span>
              ))
            ) : (
              <span className="reward-chest-reward empty">Пусто</span>
            )}
          </div>
          <button onClick={props.onContinue} type="button">
            Продолжить
          </button>
        </div>
      </div>

      <p className="reward-chest-hint">
        {props.stage === "closed" ? "Тапни по сундуку" : props.stage === "opening" ? "Награды вылетают" : "Забираем добычу"}
      </p>
    </section>
  );
}

function rewardChestAssetClass(chestType: RewardChestTypeConfig): string {
  if (chestType.assetId.includes("steel")) {
    return "asset-steel";
  }

  if (chestType.assetId.includes("iron")) {
    return "asset-iron";
  }

  if (chestType.assetId.includes("golden")) {
    return "asset-golden";
  }

  return "asset-wooden";
}

function BossStat(props: { label: string; value: string }) {
  return (
    <div className="boss-stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function BossCardArt(props: { card: BossCardDefinition }) {
  const className = `boss-card-art ${bossCardAssetClass(props.card)}`;

  switch (props.card.effectType) {
    case "critChance":
      return (
        <div className={className} aria-hidden="true">
          <span className="boss-card-art-face">
            <span className="boss-card-art-rune" />
            <Zap size={22} />
          </span>
        </div>
      );
    case "critMultiplier":
      return (
        <div className={className} aria-hidden="true">
          <span className="boss-card-art-face">
            <span className="boss-card-art-rune" />
            <Sparkles size={22} />
          </span>
        </div>
      );
    case "maxEnergy":
      return (
        <div className={className} aria-hidden="true">
          <span className="boss-card-art-face">
            <span className="boss-card-art-rune" />
            <Gem size={22} />
          </span>
        </div>
      );
    default:
      return (
        <div className={className} aria-hidden="true">
          <span className="boss-card-art-face">
            <span className="boss-card-art-rune" />
            <Hammer size={22} />
          </span>
        </div>
      );
  }
}

function bossCardAssetClass(card: BossCardDefinition): string {
  const assetId = card.assetId ?? "";

  if (assetId.includes("crit_chance")) {
    return "crit-chance";
  }

  if (assetId.includes("crit_multiplier")) {
    return "crit-multiplier";
  }

  if (assetId.includes("max_energy")) {
    return "max-energy";
  }

  if (assetId.includes("hit_damage")) {
    return "hit-damage";
  }

  switch (card.effectType) {
    case "critChance":
      return "crit-chance";
    case "critMultiplier":
      return "crit-multiplier";
    case "maxEnergy":
      return "max-energy";
    default:
      return "hit-damage";
  }
}

function BossCardsModal(props: {
  cards: BossCardDefinition[];
  labels: Record<string, string>;
  message: string | null;
  onClose: () => void;
  onUpgrade: (cardId: BossCardId) => void;
  resources: Record<string, number>;
  state: BossCardState;
}) {
  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section className="boss-cards-modal" aria-label="Карты босса" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Босс</p>
            <strong>Карты удара</strong>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <div className="boss-cards-list">
          {props.cards.map((card) => {
            const level = props.state.levels[card.id] ?? 0;
            const cost = calculateBossCardUpgradeCost(card, props.state);
            const availableCards = props.resources[card.cardResourceId] ?? 0;
            const availableElixir = props.resources.elixir ?? 0;
            const cardProgress = cost ? Math.min(100, (availableCards / cost.cardAmount) * 100) : 100;
            const canUpgrade = Boolean(cost && availableCards >= cost.cardAmount && availableElixir >= cost.elixirAmount);

            return (
              <article className={`boss-card ${card.rarity}`} key={card.id}>
                <BossCardArt card={card} />
                <div className="boss-card-copy">
                  <div className="boss-card-title">
                    <span>{bossCardRarityLabel(card.rarity)}</span>
                    <strong>{bossCardName(card, props.labels)}</strong>
                  </div>
                  <p>{bossCardDescription(card, props.labels)}</p>
                  <div className="boss-card-effect">
                    <span>Ур. {level}</span>
                    <strong>{bossCardEffectLabel(card)}</strong>
                  </div>
                  {cost ? (
                    <div className="boss-card-progress">
                      <div>
                        <span>Карты</span>
                        <strong>
                          {formatInteger(Math.min(availableCards, cost.cardAmount))}/{formatInteger(cost.cardAmount)}
                        </strong>
                      </div>
                      <i aria-hidden="true">
                        <b style={{ width: `${cardProgress}%` }} />
                      </i>
                      <div>
                        <span>Эликсир</span>
                        <strong>
                          {formatInteger(Math.min(availableElixir, cost.elixirAmount))}/{formatInteger(cost.elixirAmount)}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="boss-card-progress maxed">
                      <strong>Максимальный уровень</strong>
                    </div>
                  )}
                </div>
                <button disabled={!canUpgrade} onClick={() => props.onUpgrade(card.id)} type="button">
                  {cost ? "Улучшить" : "Макс."}
                </button>
              </article>
            );
          })}
        </div>

        {props.message ? <p className="boss-cards-message">{props.message}</p> : null}
      </section>
    </div>
  );
}

function BaseSection(props: {
  goblinHutProgression: GoblinHutProgressionState;
  labels: Record<string, string>;
  message: string | null;
  onUpgradeGoblinHut: () => void;
}) {
  return (
    <section className="base-screen management-screen" aria-label="База">
      <header className="section-title management-title">
        <div>
          <p>База</p>
          <strong>Постройки лагеря</strong>
        </div>
        <span>Хижина {props.goblinHutProgression.levelNow} ур.</span>
      </header>

      <div className="base-upgrade-list">
        <GoblinHutProgressCard
          labels={props.labels}
          onUpgradeGoblinHut={props.onUpgradeGoblinHut}
          state={props.goblinHutProgression}
        />

        <div className="base-upgrade-grid" aria-label="Будущие улучшения базы">
          <article className="base-upgrade-card disabled">
            <span className="base-upgrade-icon">
              <Warehouse size={18} />
            </span>
            <div>
              <strong>Склад</strong>
              <span>скоро</span>
            </div>
          </article>
          <article className="base-upgrade-card disabled">
            <span className="base-upgrade-icon">
              <Hammer size={18} />
            </span>
            <div>
              <strong>Подъемник</strong>
              <span>скоро</span>
            </div>
          </article>
          <article className="base-upgrade-card disabled">
            <span className="base-upgrade-icon">
              <Gem size={18} />
            </span>
            <div>
              <strong>Знания</strong>
              <span>скоро</span>
            </div>
          </article>
        </div>
      </div>

      {props.message ? <p className="roster-message">{props.message}</p> : null}
    </section>
  );
}

function GoblinHutProgressCard(props: {
  labels: Record<string, string>;
  onUpgradeGoblinHut: () => void;
  state: GoblinHutProgressionState;
}) {
  return (
    <section className="goblin-hut-progress-card">
      <div className="goblin-hut-progress-overview">
        <GoblinHutVisual stage={props.state.visualStage} />
        <div className="goblin-hut-progress-copy">
          <span>{labelFromNameKey(props.state.currentLevel.nameKey, "hut", props.labels)}</span>
          <strong>
            Лимит {props.state.hiredCount}/{props.state.maxHiredGoblins}
          </strong>
        </div>
      </div>
      <div className="goblin-hut-progress-meta">
        <span>{goblinHutUnlockedRolesLabel(props.state.currentLevel)}</span>
        <span>{goblinHutBonusLabel(props.state.currentLevel)}</span>
      </div>
      {props.state.nextLevel ? (
        <footer>
          <span>Далее: {labelFromNameKey(props.state.nextLevel.nameKey, "hut", props.labels)}</span>
          <div className="build-cost-list">
            {props.state.costRequirements.map((requirement) => (
              <span className={requirement.ok ? "ok" : "missing"} key={requirement.resourceId}>
                <ResourceIcon resourceId={requirement.resourceId} size={13} />
                {formatInteger(Math.min(requirement.available, requirement.required))}/{formatInteger(requirement.required)}
              </span>
            ))}
          </div>
          <button disabled={!props.state.canUpgrade} onClick={props.onUpgradeGoblinHut} type="button">
            {goblinHutUpgradeActionLabel(props.state)}
          </button>
        </footer>
      ) : (
        <footer>
          <span>Хижина полностью улучшена</span>
        </footer>
      )}
    </section>
  );
}

function GoblinSection(props: {
  activeRoleTab: GoblinHutRoleTabId;
  availableGoblins: GoblinConfig[];
  builtMinesCount: number;
  completedMineTemplateIds: string[];
  content: ContentBundle;
  hutLevel: number;
  hutLimit: number;
  labels: Record<string, string>;
  onHireGoblin: (goblin: GoblinConfig) => void;
  onRoleTabChange: (role: GoblinHutRoleTabId) => void;
  onUpgradeGoblin: (goblin: GoblinConfig) => void;
  resources: Record<string, number>;
  roster: GoblinRosterState;
  rosterMessage: string | null;
}) {
  const [selectedGoblinId, setSelectedGoblinId] = useState<string | null>(null);
  const roleSummary = createGoblinRoleSummary(props.availableGoblins, props.roster);
  const roleTabs = createGoblinHutRoleTabs(props.availableGoblins, props.roster, props.content.goblinHut);
  const visibleGoblins = filterGoblinsByHutRole(props.availableGoblins, props.activeRoleTab);
  const minerGoblins = props.availableGoblins.filter(isMiningGoblin);
  const selectedGoblin = selectedGoblinId ? props.availableGoblins.find((goblin) => goblin.id === selectedGoblinId) ?? null : null;

  return (
    <section className="goblin-roster management-screen" aria-label="Гоблины">
      <header className="section-title">
        <div>
          <p>Гоблины</p>
          <strong>
            Хижина {props.hutLevel} ур. · {roleSummary.hiredCount}/{props.hutLimit}
          </strong>
        </div>
        <span>Урон {calculateCrewAutoDamagePerSecond({ goblins: minerGoblins, roster: props.roster })}/сек</span>
      </header>

      <div className="goblin-role-tabs" aria-label="Виды гоблинов">
        {roleTabs.map((tab) => (
          <button
            className={props.activeRoleTab === tab.id ? "active" : ""}
            disabled={tab.locked}
            key={tab.id}
            onClick={() => props.onRoleTabChange(tab.id)}
            type="button"
          >
            <span>{tab.label}</span>
            <strong>
              {tab.locked ? "закрыто" : `${tab.hiredCount}/${tab.count}`}
            </strong>
          </button>
        ))}
      </div>

      <div className="goblin-role-summary" aria-label="Роли гоблинов">
        <span>Шахтеры {roleSummary.minerCount}</span>
        <span>Сборщики {roleSummary.collectorCount}</span>
        <span>Автосбор {roleSummary.totalAutoCollectSlots}</span>
        <span>Бригадиры {roleSummary.builderCount}</span>
      </div>

      <div className="goblin-list">
        {visibleGoblins.map((goblin) => {
          const hired = isGoblinHired(props.roster, goblin.id);
          const upgradePreview = createGoblinUpgradePreview(goblin, props.roster, props.resources, props.content.goblinHut);
          const hirePreview = createGoblinHirePreview({
            builtMinesCount: props.builtMinesCount,
            completedMineTemplateIds: props.completedMineTemplateIds,
            goblin,
            goblinHut: props.content.goblinHut,
            goblins: props.availableGoblins,
            resources: props.resources,
            roster: props.roster
          });
          const identity = createGoblinIdentity(goblin, props.labels);

          return (
            <article
              className={hired ? "goblin-card hired" : "goblin-card"}
              key={goblin.id}
              onClick={() => setSelectedGoblinId(goblin.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedGoblinId(goblin.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <GoblinPortrait goblin={goblin} identity={identity} />
              <div className="goblin-card-name">
                <strong>{identity.name}</strong>
                <span>{identity.nickname || goblinClassLabel(goblin.class)}</span>
              </div>
              <div className="goblin-card-meta">
                <span title={collectorSpecializationLabel(goblin)}>
                  <SpecializationIcon goblin={goblin} size={14} />
                </span>
                <small>
                  {upgradePreview.levelNow}/{upgradePreview.maxLevel}
                </small>
              </div>
              <button
                className="goblin-card-action"
                disabled={hired ? !upgradePreview.canUpgrade : !hirePreview.canHire}
                onClick={(event) => {
                  event.stopPropagation();
                  if (hired) {
                    props.onUpgradeGoblin(goblin);
                  } else {
                    props.onHireGoblin(goblin);
                  }
                }}
                type="button"
              >
                {goblinCardActionLabel(hired, upgradePreview, hirePreview)}
              </button>
            </article>
          );
        })}
      </div>

      {props.rosterMessage ? <p className="roster-message">{props.rosterMessage}</p> : null}
      {selectedGoblin ? (
        <GoblinDetailsModal
          hirePreview={createGoblinHirePreview({
            builtMinesCount: props.builtMinesCount,
            completedMineTemplateIds: props.completedMineTemplateIds,
            goblin: selectedGoblin,
            goblinHut: props.content.goblinHut,
            goblins: props.availableGoblins,
            resources: props.resources,
            roster: props.roster
          })}
          content={props.content}
          goblin={selectedGoblin}
          hired={isGoblinHired(props.roster, selectedGoblin.id)}
          labels={props.labels}
          onClose={() => setSelectedGoblinId(null)}
          onHire={() => props.onHireGoblin(selectedGoblin)}
          onUpgrade={() => props.onUpgradeGoblin(selectedGoblin)}
          resources={props.resources}
          roster={props.roster}
        />
      ) : null}
    </section>
  );
}

function GoblinHutVisual(props: { stage: 1 | 2 | 3 | 4 }) {
  return (
    <div className={`goblin-hut-visual stage-${props.stage}`} aria-hidden="true">
      <i className="hut-backdrop" />
      <i className="hut-body" />
      <i className="hut-roof" />
      <i className="hut-door" />
      <i className="hut-window" />
      <i className="hut-crate" />
      <i className="hut-crane" />
    </div>
  );
}

function GoblinPortrait(props: { goblin: GoblinConfig; identity: ReturnType<typeof createGoblinIdentity> }) {
  return (
    <div className={`goblin-portrait ${props.goblin.class} ${props.goblin.rarity}`} aria-hidden="true">
      <span>{props.identity.name.slice(0, 1)}</span>
    </div>
  );
}

function SpecializationIcon(props: { goblin: GoblinConfig; size: number }) {
  switch (props.goblin.specialization) {
    case "construction_foreman":
      return <Hammer size={props.size} />;
    case "ore_sniffer":
    case "resource_expert":
      return <Gem size={props.size} />;
    case "warehouse_keeper":
      return <Warehouse size={props.size} />;
    case "heavy_striker":
    case "stonebreaker":
      return <Pickaxe size={props.size} />;
    default:
      return props.goblin.class === "builder" || props.goblin.class === "foreman" ? <Hammer size={props.size} /> : <Users size={props.size} />;
  }
}

function GoblinDetailsModal(props: {
  content: ContentBundle;
  goblin: GoblinConfig;
  hirePreview: GoblinHirePreview;
  hired: boolean;
  labels: Record<string, string>;
  onClose: () => void;
  onHire: () => void;
  onUpgrade: () => void;
  resources: Record<string, number>;
  roster: GoblinRosterState;
}) {
  const identity = createGoblinIdentity(props.goblin, props.labels);
  const preview = createGoblinUpgradePreview(props.goblin, props.roster, props.resources, props.content.goblinHut);
  const abilityTitle = labelFromNameKey(props.goblin.ability.nameKey, props.goblin.ability.id, props.labels);
  const abilityDescription = labelFromNameKey(props.goblin.ability.descriptionKey, props.goblin.id, props.labels);

  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section className="goblin-modal" aria-label={identity.fullName} onClick={(event) => event.stopPropagation()}>
        <header>
          <div className="goblin-modal-headline">
            <GoblinPortrait goblin={props.goblin} identity={identity} />
            <div>
              <p>{goblinClassLabel(props.goblin.class)} · {collectorSpecializationLabel(props.goblin)}</p>
              <strong>{identity.name}</strong>
              <span>{identity.nickname}</span>
            </div>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <p className="goblin-modal-description">{identity.description}</p>

        <div className="goblin-modal-stats">
          <GoblinStat label="Сила" value={props.goblin.baseStats.strength} />
          <GoblinStat label="Скорость" value={props.goblin.baseStats.speed} />
          <GoblinStat label="Удача" value={props.goblin.baseStats.luck} />
          <GoblinStat label="Лояльность" value={props.goblin.baseStats.loyalty} />
        </div>

        <section className="goblin-modal-block">
          <header>
            <strong>{abilityTitle}</strong>
            <span>{goblinHutEffectLabel(props.goblin, preview)}</span>
          </header>
          <p>{abilityDescription}</p>
        </section>

        <section className="goblin-modal-block">
          <header>
            <strong>
              Уровень {preview.levelNow}/{preview.maxLevel}
            </strong>
            <span>{goblinUpgradeEffectLabel(props.goblin, preview)}</span>
          </header>
          <div className="build-cost-list">
            {preview.costRequirements.length > 0 ? (
              preview.costRequirements.map((requirement) => (
                <span className={requirement.ok ? "ok" : "missing"} key={requirement.resourceId}>
                  <ResourceIcon resourceId={requirement.resourceId} size={13} />
                  {formatInteger(Math.min(requirement.available, requirement.required))}/{formatInteger(requirement.required)}
                </span>
              ))
            ) : (
              <span className="ok">Максимальный уровень</span>
            )}
          </div>
        </section>

        <footer>
          <span>{props.hired ? "В бригаде" : hirePreviewCostLabel(props.hirePreview, props.labels, props.content)}</span>
          <button disabled={props.hired ? !preview.canUpgrade : !props.hirePreview.canHire} onClick={props.hired ? props.onUpgrade : props.onHire} type="button">
            {goblinCardActionLabel(props.hired, preview, props.hirePreview)}
          </button>
        </footer>
      </section>
    </div>
  );
}

function GoblinStat(props: { label: string; value: number }) {
  return (
    <div>
      <span>{props.label}</span>
      <strong>{formatInteger(props.value)}</strong>
    </div>
  );
}

function BuiltMinesSection(props: {
  builtMines: BuiltMineState[];
  builtMineTypes: BuiltMineTypeConfig[];
  canStartNextMine: boolean;
  constructionSupport: ConstructionSupportState;
  collectorGoblins: GoblinConfig[];
  content: ContentBundle;
  foundVeins: MiningFoundVein[];
  goblinLevels: Record<string, number>;
  labels: Record<string, string>;
  message: string | null;
  nextMineTemplate: MineTemplateConfig | undefined;
  now: number;
  onBuildMine: (vein: MiningFoundVein) => boolean;
  onCollectAllMines: () => void;
  onCollectMine: (builtMineId: string) => void;
  onOpenCollectorPicker: (builtMineId: string) => void;
  onStartNextMine: () => void;
  onUpgradeMine: (builtMineId: string) => void;
  resources: Record<string, number>;
  upgradePreviews: ReadonlyMap<string, BuiltMineUpgradePreview>;
}) {
  const dashboard = createBuiltMineDashboardState(props.builtMines);
  const hasBuiltMines = props.builtMines.length > 0;
  const hasCollectableIncome = dashboard.collectableResources.length > 0;
  const hasFoundVeins = props.foundVeins.length > 0;
  const assignedCollectorCount = props.builtMines.filter((builtMine) => builtMine.assignedCollectorGoblinId).length;
  const totalCollectorSlots = props.collectorGoblins.reduce(
    (total, goblin) => total + getGoblinAutoCollectSlots(goblin, props.goblinLevels[goblin.id] ?? 1),
    0
  );

  return (
    <section className="built-mines management-screen" aria-label="Шахты">
      <header className="section-title management-title">
        <div>
          <p>Шахты</p>
          <strong>Постоянная добыча</strong>
        </div>
      </header>

      <p className="built-mine-message">{props.message ?? ""}</p>

      <div className="built-mine-list">
        <section className="built-mine-dashboard" aria-label="Сводка шахт">
          <div className="built-mine-kpis">
            <div>
              <span>Работают</span>
              <strong>{dashboard.activeCount}</strong>
            </div>
            <div>
              <span>Строятся</span>
              <strong>{dashboard.buildingCount}</strong>
            </div>
            <div>
              <span>Заполнены</span>
              <strong>{dashboard.fullCount}</strong>
            </div>
          </div>
          <button className="built-mine-collect-all" disabled={!hasCollectableIncome} onClick={props.onCollectAllMines} type="button">
            <span>К сбору</span>
            <strong>{resourceAmountSummaryLabel(dashboard.collectableResources, props.labels, props.content)}</strong>
            <small>{hasCollectableIncome ? `${dashboard.collectableMineCount} шахт готовы` : "Доход еще копится"}</small>
          </button>
          <div className="built-mine-income-row" aria-label="Доход в час">
            <span>Доход в час</span>
            <div>
              {dashboard.productionPerHour.length > 0 ? (
                dashboard.productionPerHour.map((resource) => (
                  <span className={`mine-resource-pill ${resourceClassName(resource.resourceId)}`} key={resource.resourceId}>
                    <ResourceIcon resourceId={resource.resourceId} size={14} />
                    {formatNumber(resource.amount)}/ч
                  </span>
                ))
              ) : (
                <span className="mine-resource-pill empty">Нет активных шахт</span>
              )}
            </div>
          </div>
          <div className="built-mine-income-row" aria-label="Автосбор">
            <span>Автосбор</span>
            <div>
              <span className={totalCollectorSlots > 0 ? "mine-resource-pill" : "mine-resource-pill empty"}>
                {assignedCollectorCount}/{totalCollectorSlots} слотов занято
              </span>
            </div>
          </div>
          <div className="built-mine-income-row" aria-label="Стройка">
            <span>Стройка</span>
            <div>
              <span className={props.constructionSupport.supporterCount > 0 ? "mine-resource-pill" : "mine-resource-pill empty"}>
                {props.constructionSupport.supporterCount > 0
                  ? `${formatConstructionSupport(props.constructionSupport)}`
                  : "Нет бригадиров"}
              </span>
            </div>
          </div>
        </section>

        {props.canStartNextMine && props.nextMineTemplate ? (
          <article className="mine-progress-card mine-route-card">
            <div>
              <span>Рудник расчищен</span>
              <strong>Новый рудник</strong>
              <small>{mineTitle(props.nextMineTemplate, props.labels)}</small>
            </div>
            <button onClick={props.onStartNextMine} type="button">
              Новый рудник
            </button>
          </article>
        ) : null}

        {hasFoundVeins ? (
          <section className="built-mine-group" aria-label="Найденные жилы">
            <header className="built-mine-group-title">
              <div>
                <span>Новые шахты</span>
                <strong>Найденные жилы</strong>
              </div>
              <small>{props.foundVeins.length} доступно</small>
            </header>
            <div className="built-mine-group-list">
              {props.foundVeins.map((vein) => {
                const builtMineType = builtMineTypeForVein(vein, props.builtMineTypes);
                const canBuild = canBuildFoundVein({
                  buildCostMultiplier: props.constructionSupport.buildCostMultiplier,
                  builtMineTypes: props.builtMineTypes,
                  builtMines: props.builtMines,
                  resources: props.resources,
                  vein
                });
                const buildRequirements = builtMineType
                  ? createBuildCostRequirements(
                      createBuildCostWithMultiplier(builtMineType.buildCost, props.constructionSupport.buildCostMultiplier),
                      props.resources
                    )
                  : [];
                const buildTimeMs = builtMineType
                  ? builtMineType.buildTimeSec * props.constructionSupport.buildTimeMultiplier * 1000
                  : 0;
                const missingRequirements = buildRequirements.filter((requirement) => !requirement.ok);

                return (
                  <article className="found-vein-card" key={vein.id}>
                    <div className="found-vein-icon" aria-hidden="true">
                      <Gem size={22} />
                    </div>
                    <div className="found-vein-main">
                      <strong>{veinNameById(vein.veinTypeId, props.content, props.labels)}</strong>
                      {builtMineType ? (
                        <>
                          <span>
                            {builtMineTypeName(builtMineType.id, props.content, props.labels)} ·{" "}
                            {formatNumber(builtMineType.baseProductionPerHour)}/ч{" "}
                            {resourceLabelById(builtMineType.productionResourceId, props.labels, props.content)}
                          </span>
                          <div className="build-cost-list">
                            {buildRequirements.map((requirement) => (
                              <span className={requirement.ok ? "ok" : "missing"} key={requirement.resourceId}>
                                <ResourceIcon resourceId={requirement.resourceId} size={13} />
                                {formatInteger(Math.min(requirement.available, requirement.required))}/{formatInteger(requirement.required)}
                              </span>
                            ))}
                          </div>
                          <small>
                            {missingRequirements.length > 0
                              ? `Не хватает: ${missingRequirements
                                  .map(
                                    (requirement) =>
                                      `${formatInteger(requirement.missing)} ${resourceLabelById(
                                        requirement.resourceId,
                                        props.labels,
                                        props.content
                                      )}`
                                  )
                                  .join(" · ")}`
                              : `Строительство ${formatDurationMs(buildTimeMs)}`}
                          </small>
                        </>
                      ) : (
                        <span>Нет проекта шахты</span>
                      )}
                    </div>
                    <button disabled={!canBuild || !builtMineType} onClick={() => props.onBuildMine(vein)} type="button">
                      {canBuild ? "Построить" : "Не хватает"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="built-mine-group permanent-mines-group" aria-label="Постоянные шахты">
          <header className="built-mine-group-title">
            <div>
              <span>Список шахт</span>
              <strong>{hasBuiltMines ? `${props.builtMines.length} шахт` : "Пока пусто"}</strong>
            </div>
            <small>{hasBuiltMines ? "Сбор вручную" : "Нужна первая жила"}</small>
          </header>

          {hasBuiltMines ? (
            <div className="built-mine-group-list">
              {props.builtMines.map((builtMine) => {
                const collectableAmount = Math.floor(builtMine.storedAmount);
                const storagePercent = getBuiltMineStoragePercent(builtMine);
                const buildProgressPercent = getBuiltMineBuildProgressPercent(builtMine, props.now);
                const buildRemainingMs = getBuiltMineBuildRemainingMs(builtMine, props.now);
                const progressPercent = builtMine.status === "building" ? buildProgressPercent : storagePercent;
                const storageFull = isBuiltMineStorageFull(builtMine);
                const stateClass = builtMine.status === "building" ? "building" : storageFull ? "full" : "active";
                const assignedCollector = builtMine.assignedCollectorGoblinId
                  ? props.collectorGoblins.find((goblin) => goblin.id === builtMine.assignedCollectorGoblinId)
                  : undefined;
                const assignableCollector = findAssignableCollector(
                  props.collectorGoblins,
                  props.builtMines,
                  builtMine.id,
                  props.goblinLevels
                );
                const upgradePreview = props.upgradePreviews.get(builtMine.id);

                return (
                  <article className={`built-mine-card ${builtMine.status}${storageFull ? " full" : ""}`} key={builtMine.id}>
                    <header className="built-mine-card-head">
                      <div className="built-mine-card-title">
                        <span className={`built-mine-state ${stateClass}`}>{builtMineStateText(builtMine, props.now)}</span>
                        <strong>{builtMineTypeName(builtMine.typeId, props.content, props.labels)}</strong>
                        <small>
                          {resourceLabelById(builtMine.productionResourceId, props.labels, props.content)} · уровень {builtMine.level}
                        </small>
                      </div>
                      <div className={`built-mine-resource-icon ${resourceClassName(builtMine.productionResourceId)}`} aria-hidden="true">
                        <ResourceIcon resourceId={builtMine.productionResourceId} size={22} />
                      </div>
                    </header>
                    <div className="built-mine-stat-row">
                      <span>
                        <strong>{formatNumber(builtMine.productionPerHour)}/ч</strong>
                        <small>Добыча</small>
                      </span>
                      <span>
                        <strong>{builtMine.status === "building" ? `${Math.round(buildProgressPercent)}%` : `${Math.round(storagePercent)}%`}</strong>
                        <small>{builtMine.status === "building" ? "Стройка" : "Хранилище"}</small>
                      </span>
                    </div>
                    {upgradePreview ? (
                      <div className="built-mine-upgrade-row">
                        <span>
                          <strong>
                            Уровень {builtMine.level} → {upgradePreview.levelAfter}
                          </strong>
                          <small>
                            После: {formatNumber(upgradePreview.productionPerHourAfter)}/ч · вместимость {formatNumber(upgradePreview.capacityAfter)}
                          </small>
                        </span>
                        <div className="build-cost-list">
                          {upgradePreview.costRequirements.length > 0 ? (
                            upgradePreview.costRequirements.map((requirement) => (
                              <span className={requirement.ok ? "ok" : "missing"} key={requirement.resourceId}>
                                <ResourceIcon resourceId={requirement.resourceId} size={13} />
                                {formatInteger(Math.min(requirement.available, requirement.required))}/{formatInteger(requirement.required)}
                              </span>
                            ))
                          ) : (
                            <span className="ok">Максимум</span>
                          )}
                        </div>
                        <button disabled={!upgradePreview.canUpgrade} onClick={() => props.onUpgradeMine(builtMine.id)} type="button">
                          {upgradePreview.failureReason === "max_level" ? "Максимум" : "Улучшить"}
                        </button>
                      </div>
                    ) : null}
                    <div className={builtMine.status === "building" ? "built-mine-progress building" : "built-mine-progress storage"}>
                      <span style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className={assignedCollector ? "built-mine-automation-row active" : "built-mine-automation-row"}>
                      <span>
                        <strong>{assignedCollector ? "Автосбор включен" : "Автосбор"}</strong>
                        <small>
                          {assignedCollector
                            ? `${goblinName(assignedCollector, props.labels)} собирает доход`
                            : automationHint(props.collectorGoblins, assignableCollector, props.labels)}
                        </small>
                      </span>
                      <button
                        onClick={() => props.onOpenCollectorPicker(builtMine.id)}
                        type="button"
                      >
                        {assignedCollector ? "Изменить" : "Назначить"}
                      </button>
                    </div>
                    <footer>
                      {builtMine.status === "building" ? (
                        <span>Готово через {formatDurationMs(buildRemainingMs)}</span>
                      ) : (
                        <span>
                          {formatNumber(builtMine.storedAmount)}/{formatNumber(builtMine.capacity)}{" "}
                          {resourceLabelById(builtMine.productionResourceId, props.labels, props.content)}
                        </span>
                      )}
                      <button
                        disabled={builtMine.status !== "active" || collectableAmount <= 0}
                        onClick={() => props.onCollectMine(builtMine.id)}
                        type="button"
                      >
                        {builtMine.status === "building" ? "Строится" : `Собрать ${collectableAmount > 0 ? formatInteger(collectableAmount) : ""}`}
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          ) : (
            <article className="built-mine-empty">
              <strong>Шахт пока нет</strong>
              <span>Докопайся до жилы в руднике, чтобы открыть первую постоянную шахту.</span>
            </article>
          )}
        </section>
      </div>
    </section>
  );
}

function CollectorAssignmentModal(props: {
  builtMine: BuiltMineState;
  builtMines: BuiltMineState[];
  collectors: GoblinConfig[];
  content: ContentBundle;
  goblinLevels: Record<string, number>;
  labels: Record<string, string>;
  onAssign: (goblinId: string | null) => void;
  onClose: () => void;
}) {
  const assignedCollectorId = props.builtMine.assignedCollectorGoblinId ?? null;
  const mineName = builtMineTypeName(props.builtMine.typeId, props.content, props.labels);

  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section className="collector-modal" aria-label="Выбор сборщика" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Автосбор</p>
            <strong>{mineName}</strong>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <div className="collector-modal-summary">
          <span>
            {formatNumber(props.builtMine.productionPerHour)}/ч {resourceLabelById(props.builtMine.productionResourceId, props.labels, props.content)}
          </span>
          <span>
            {formatNumber(props.builtMine.storedAmount)}/{formatNumber(props.builtMine.capacity)} в хранилище
          </span>
        </div>

        {props.collectors.length > 0 ? (
          <div className="collector-list">
            {props.collectors.map((collector) => {
              const isAssigned = assignedCollectorId === collector.id;
              const usedSlots = countCollectorAssignedMines(collector.id, props.builtMines);
              const collectorLevel = props.goblinLevels[collector.id] ?? 1;
              const totalSlots = getGoblinAutoCollectSlots(collector, collectorLevel);
              const canAssign = hasCollectorSlotAvailable(collector, props.builtMines, props.builtMine.id, collectorLevel);

              return (
                <article className={isAssigned ? "collector-card active" : "collector-card"} key={collector.id}>
                  <div className="collector-card-main">
                    <strong>{goblinName(collector, props.labels)}</strong>
                    <span>
                      {collectorSpecializationLabel(collector)} · {usedSlots}/{totalSlots} слотов
                    </span>
                    <p>{collectorEffectLabel(collector, props.labels, props.content)}</p>
                  </div>
                  <button disabled={!isAssigned && !canAssign} onClick={() => props.onAssign(isAssigned ? null : collector.id)} type="button">
                    {isAssigned ? "Снять" : canAssign ? "Назначить" : "Занят"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <article className="collector-empty">
            <strong>Нет свободных сборщиков</strong>
            <span>Найми гоблина-сборщика, чтобы включить автоматический сбор дохода.</span>
          </article>
        )}
      </section>
    </div>
  );
}

function createMineCompletionRewardChest(content: ContentBundle, mineTemplateId: string): PendingRewardChest | null {
  const mineTemplate = content.mineTemplates.find((template) => template.id === mineTemplateId);
  const chestTypeId = mineTemplate?.completionRewardChestTypeId;

  if (!chestTypeId || !findRewardChestType(content, chestTypeId)) {
    return null;
  }

  return {
    chestTypeId,
    id: `${mineTemplateId}:${chestTypeId}`,
    mineTemplateId,
    rewards: null,
    source: "mine_completion"
  };
}

function findRewardChestType(content: ContentBundle, chestTypeId: string): RewardChestTypeConfig | null {
  return (content.rewardChestTypes ?? []).find((chestType) => chestType.id === chestTypeId) ?? null;
}

function createChestRewardFlyouts(
  rewards: Record<string, number>,
  content: ContentBundle,
  labels: Record<string, string>
): ChestRewardFlyout[] {
  return rewardDropsFromMap(rewards, content, labels).map((reward, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    const distance = 122 + index * 18;

    return {
      ...reward,
      delayMs: index * 170,
      distance,
      id: ++chestRewardSequence,
      x: direction * (28 + index * 20)
    };
  });
}

function clearRewardChestSummaryTimer(timeoutRef: { current: number | null }): void {
  if (timeoutRef.current === null) {
    return;
  }

  window.clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

function resourceClassName(resourceId: string): string {
  if (isBossCardResourceId(resourceId)) {
    if (resourceId.includes("crit_multiplier")) {
      return "card card-golden";
    }

    if (resourceId.includes("crit_chance")) {
      return "card card-rare";
    }

    return "card card-common";
  }

  if (resourceId.includes("elixir")) {
    return "elixir";
  }

  if (resourceId.includes("gold")) {
    return "gold";
  }

  if (resourceId.includes("copper")) {
    return "copper";
  }

  if (resourceId.includes("iron")) {
    return "iron";
  }

  if (resourceId.includes("energy")) {
    return "energy";
  }

  return "stone";
}

function isBossCardResourceId(resourceId: string): boolean {
  return resourceId.startsWith("boss_card_");
}

function bossCardName(card: BossCardDefinition | undefined, labels: Record<string, string>): string {
  if (!card) {
    return "Карта";
  }

  return labelFromNameKey(card.nameKey, bossCardFallbackName(card.id), labels);
}

function bossCardDescription(card: BossCardDefinition, labels: Record<string, string>): string {
  return labelFromNameKey(card.descriptionKey, bossCardFallbackDescription(card.id), labels);
}

function bossCardFallbackName(cardId: BossCardId): string {
  switch (cardId) {
    case "crit_chance":
      return "Критический шанс";
    case "crit_multiplier":
      return "Сила крита";
    case "hit_damage":
      return "Сила удара";
    case "max_energy":
      return "Запас энергии";
    default:
      return "Карта босса";
  }
}

function bossCardFallbackDescription(cardId: BossCardId): string {
  switch (cardId) {
    case "crit_chance":
      return "Повышает шанс критического удара.";
    case "crit_multiplier":
      return "Увеличивает множитель критического удара.";
    case "hit_damage":
      return "Увеличивает урон босса за тап.";
    case "max_energy":
      return "Увеличивает максимальную энергию босса.";
    default:
      return "Улучшает один из параметров босса.";
  }
}

function bossCardRarityLabel(rarity: BossCardDefinition["rarity"]): string {
  switch (rarity) {
    case "golden":
      return "золотая";
    case "rare":
      return "редкая";
    case "common":
      return "обычная";
  }
}

function bossCardEffectLabel(card: BossCardDefinition): string {
  switch (card.effectType) {
    case "critChance":
      return `+${formatPercent(card.valuePerLevel)}/ур.`;
    case "critMultiplier":
      return `+${formatNumber(card.valuePerLevel)}x/ур.`;
    case "damagePerTap":
      return `+${formatNumber(card.valuePerLevel)} урон/ур.`;
    case "maxEnergy":
      return `+${formatNumber(card.valuePerLevel)} энергия/ур.`;
  }
}

function resourceLabel(
  resource: ResourceConfig | undefined,
  fallback: string,
  labels: Record<string, string>
): string {
  if (!resource) {
    return fallback;
  }

  return labelFromNameKey(resource.nameKey, resource.id, labels);
}

function mineTitle(mineTemplate: MineTemplateConfig | undefined, labels: Record<string, string>): string {
  if (!mineTemplate) {
    return "Рудник не найден";
  }

  return `${labelFromNameKey(mineTemplate.displayNameKey, mineTemplate.id, labels)} · ${mineTemplate.depthMeters} м`;
}

function veinNameById(veinTypeId: string, content: ContentBundle, labels: Record<string, string>): string {
  const veinType = content.veinTypes.find((item) => item.id === veinTypeId);
  return veinType ? labelFromNameKey(veinType.nameKey, veinType.id, labels) : veinTypeId;
}

function builtMineTypeName(typeId: string, content: ContentBundle, labels: Record<string, string>): string {
  const builtMineType = content.builtMineTypes.find((item) => item.id === typeId);
  return builtMineType ? labelFromNameKey(builtMineType.nameKey, builtMineType.id, labels) : typeId;
}

function builtMineTypeForVein(vein: MiningFoundVein, builtMineTypes: BuiltMineTypeConfig[]): BuiltMineTypeConfig | undefined {
  return builtMineTypes.find((builtMineType) => builtMineType.sourceVeinType === vein.veinTypeId);
}

function builtMineCostLabel(
  builtMineType: BuiltMineTypeConfig,
  labels: Record<string, string>,
  content: ContentBundle,
  costMultiplier = 1
): string {
  const buildCost = createBuildCostWithMultiplier(builtMineType.buildCost, costMultiplier);

  if (buildCost.length === 0) {
    return "Без стоимости";
  }

  return buildCost
    .map((cost) => `${cost.amount} ${resourceLabelById(cost.resourceId, labels, content)}`)
    .join(" · ");
}

function formatConstructionSupport(support: ConstructionSupportState): string {
  const costPercent = Math.round((1 - support.buildCostMultiplier) * 100);
  const timePercent = Math.round((1 - support.buildTimeMultiplier) * 100);
  const bonuses = [];

  if (costPercent > 0) {
    bonuses.push(`-${costPercent}% цена`);
  }

  if (timePercent > 0) {
    bonuses.push(`-${timePercent}% время`);
  }

  return bonuses.length > 0 ? bonuses.join(" · ") : `${support.supporterCount} в бригаде`;
}

function builtMineStateText(builtMine: BuiltMineState, now: number): string {
  if (builtMine.status === "building") {
    const remainingMs = getBuiltMineBuildRemainingMs(builtMine, now);
    return remainingMs > 0 ? "Строится" : "Запускается";
  }

  return isBuiltMineStorageFull(builtMine) ? "Заполнена" : "Работает";
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

function createLabels(content: ContentBundle): Record<string, string> {
  return content.localization?.ru ?? {};
}

function createAvailableGoblins(content: ContentBundle): GoblinConfig[] {
  return [...content.goblins].sort((left, right) => left.sortOrder - right.sortOrder);
}

function createHiredGoblins(content: ContentBundle, roster: GoblinRosterState): GoblinConfig[] {
  return createAvailableGoblins(content).filter((goblin) => isGoblinHired(roster, goblin.id));
}

function goblinName(goblin: GoblinConfig, labels: Record<string, string>): string {
  return createGoblinIdentity(goblin, labels).fullName;
}

function goblinClassLabel(goblinClass: GoblinConfig["class"]): string {
  switch (goblinClass) {
    case "builder":
      return "Строитель";
    case "collector":
      return "Сборщик";
    case "foreman":
      return "Бригадир";
    default:
      return "Шахтер";
  }
}

function goblinCardActionLabel(hired: boolean, preview: GoblinUpgradePreview, hirePreview: GoblinHirePreview): string {
  if (!hired) {
    switch (hirePreview.failureReason) {
      case null:
        return "Нанять";
      case "hut_limit":
        return "Лимит";
      case "not_enough_resources":
        return "Нет ресурсов";
      case "role_locked":
        return "Роль закрыта";
      default:
        return "Закрыт";
    }
  }

  if (preview.failureReason === "max_level") {
    return "Макс.";
  }

  return preview.canUpgrade ? "Улучшить" : "Нет золота";
}

function goblinHutUnlockedRolesLabel(level: GoblinHutProgressionState["currentLevel"]): string {
  return level.unlockedClasses.map(goblinClassLabel).join(" · ");
}

function goblinHutBonusLabel(level: GoblinHutProgressionState["currentLevel"]): string {
  const hireDiscount = Math.max(0, Math.round((1 - (level.hireCostMultiplier ?? 1)) * 100));
  const upgradeDiscount = Math.max(0, Math.round((1 - (level.upgradeCostMultiplier ?? 1)) * 100));

  if (hireDiscount === 0 && upgradeDiscount === 0) {
    return "без скидок";
  }

  return [`найм -${hireDiscount}%`, `прокачка -${upgradeDiscount}%`].filter((item) => !item.includes("-0%")).join(" · ");
}

function goblinHutUpgradeActionLabel(state: GoblinHutProgressionState): string {
  switch (state.failureReason) {
    case null:
      return "Улучшить";
    case "locked":
      return "Нужен прогресс";
    case "not_enough_resources":
      return "Нет ресурсов";
    default:
      return "Макс.";
  }
}

function automationHint(
  collectors: readonly GoblinConfig[],
  assignableCollector: GoblinConfig | undefined,
  labels: Record<string, string>
): string {
  if (assignableCollector) {
    return `${goblinName(assignableCollector, labels)} готов к назначению`;
  }

  return collectors.length > 0 ? "Все сборщики заняты" : "Нужен нанятый гоблин-сборщик";
}

function collectorSpecializationLabel(goblin: GoblinConfig): string {
  switch (goblin.specialization) {
    case "construction_foreman":
      return "Бригадир";
    case "event":
      return "Редкий";
    case "heavy_striker":
      return "Тяжеловес";
    case "ore_sniffer":
      return "Рудный нюх";
    case "resource_expert":
      return "Рудный эксперт";
    case "stonebreaker":
      return "Камнелом";
    case "warehouse_keeper":
      return "Кладовщик";
    default:
      return goblinClassLabel(goblin.class);
  }
}

function collectorEffectLabel(goblin: GoblinConfig, labels: Record<string, string>, content: ContentBundle): string {
  const effectLabels = goblin.ability.effects.map((effect) => {
    switch (effect.type) {
      case "auto_collect_slots":
        return `${effect.value} ${pluralRu(effect.value, "шахта", "шахты", "шахт")} автосбора`;
      case "mine_capacity_multiplier":
        return `вместимость ${formatMultiplierBonus(effect.value)}`;
      case "mine_production_multiplier":
        return effect.resourceId
          ? `${resourceLabelById(effect.resourceId, labels, content)} ${formatMultiplierBonus(effect.value)}`
          : `добыча ${formatMultiplierBonus(effect.value)}`;
      case "build_time_multiplier":
        return `стройка ${formatMultiplierReduction(effect.value)}`;
      default:
        return null;
    }
  });

  return effectLabels.filter((label): label is string => Boolean(label)).join(" · ") || labelFromNameKey(goblin.ability.descriptionKey, goblin.id, labels);
}

function goblinHutEffectLabel(goblin: GoblinConfig, preview: GoblinUpgradePreview): string {
  if (goblin.class === "collector") {
    return `${preview.autoCollectSlotsNow} ${pluralRu(preview.autoCollectSlotsNow, "шахта", "шахты", "шахт")} автосбора`;
  }

  if (goblin.class === "builder" || goblin.class === "foreman") {
    return goblinConstructionEffectLabel(goblin, preview) || "бригада стройки";
  }

  return `${preview.damagePerSecondNow}/сек по камням`;
}

function goblinUpgradeEffectLabel(goblin: GoblinConfig, preview: GoblinUpgradePreview): string {
  if (preview.failureReason === "max_level") {
    return "Максимальный уровень";
  }

  if (goblin.class === "collector") {
    return `автосбор ${preview.autoCollectSlotsNow} → ${preview.autoCollectSlotsAfter}`;
  }

  if (goblin.class === "builder" || goblin.class === "foreman") {
    return goblinConstructionUpgradeLabel(preview);
  }

  return `урон ${preview.damagePerSecondNow}/сек → ${preview.damagePerSecondAfter}/сек`;
}

function goblinConstructionEffectLabel(goblin: GoblinConfig, preview: GoblinUpgradePreview): string {
  const labels = [];

  if (preview.buildCostMultiplierNow < 1) {
    labels.push(`цена ${formatMultiplierCostReduction(preview.buildCostMultiplierNow)}`);
  }

  if (preview.buildTimeMultiplierNow < 1) {
    labels.push(formatMultiplierReduction(preview.buildTimeMultiplierNow));
  }

  if (goblin.ability.effects.some((effect) => effect.type === "auto_select_next_block")) {
    labels.push("управляет шахтерами");
  }

  return labels.join(" · ");
}

function goblinConstructionUpgradeLabel(preview: GoblinUpgradePreview): string {
  const labels = [];

  if (preview.buildCostMultiplierNow !== preview.buildCostMultiplierAfter) {
    labels.push(
      `цена ${formatMultiplierCostReduction(preview.buildCostMultiplierNow)} → ${formatMultiplierCostReduction(preview.buildCostMultiplierAfter)}`
    );
  }

  if (preview.buildTimeMultiplierNow !== preview.buildTimeMultiplierAfter) {
    labels.push(
      `время ${formatMultiplierCostReduction(preview.buildTimeMultiplierNow)} → ${formatMultiplierCostReduction(preview.buildTimeMultiplierAfter)}`
    );
  }

  return labels.join(" · ") || "уровень повышает параметры бригады";
}

function formatMultiplierBonus(value: number): string {
  const percent = Math.round((value - 1) * 100);
  return percent >= 0 ? `+${percent}%` : `${percent}%`;
}

function formatMultiplierReduction(value: number): string {
  const percent = Math.round((1 - value) * 100);
  return percent >= 0 ? `-${percent}% времени` : `+${Math.abs(percent)}% времени`;
}

function formatMultiplierCostReduction(value: number): string {
  const percent = Math.round((1 - value) * 100);
  return percent >= 0 ? `-${percent}%` : `+${Math.abs(percent)}%`;
}

function pluralRu(value: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(value);
  const mod10 = absolute % 10;
  const mod100 = absolute % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }

  return many;
}

function hirePreviewCostLabel(preview: GoblinHirePreview, labels: Record<string, string>, content: ContentBundle): string {
  if (preview.costRequirements.length === 0) {
    return "Стартовый";
  }

  return preview.costRequirements
    .map((cost) => `-${cost.required} ${resourceLabelById(cost.resourceId, labels, content)}`)
    .join(" · ");
}

function resourceLabelById(resourceId: string, labels: Record<string, string>, content: ContentBundle): string {
  const resource = content.resources.find((item) => item.id === resourceId);
  return resource ? labelFromNameKey(resource.nameKey, resource.id, labels) : resourceId;
}

function rewardDropsFromMap(rewards: Record<string, number>, content: ContentBundle, labels: Record<string, string>): RewardDrop[] {
  return Object.entries(rewards)
    .filter(([, amount]) => amount > 0)
    .sort(([leftResourceId], [rightResourceId]) => leftResourceId.localeCompare(rightResourceId))
    .map(([resourceId, amount]) => ({
      amount,
      label: resourceLabelById(resourceId, labels, content),
      resourceId
    }));
}

function findFeaturedCardReward(rewards: RewardDrop[], content: ContentBundle): FeaturedCardReward | null {
  const cardByResourceId = new Map<string, BossCardDefinition>(content.bossCards.map((card) => [card.cardResourceId, card]));
  const cardRewards: FeaturedCardReward[] = [];

  for (const reward of rewards) {
    const card = cardByResourceId.get(reward.resourceId);

    if (card) {
      cardRewards.push({ ...reward, card });
    }
  }

  if (cardRewards.length === 0) {
    return null;
  }

  return cardRewards.sort((left, right) => {
    const rarityDelta = bossCardRarityRank(right.card.rarity) - bossCardRarityRank(left.card.rarity);
    return rarityDelta !== 0 ? rarityDelta : right.amount - left.amount;
  })[0] ?? null;
}

function bossCardRarityRank(rarity: BossCardDefinition["rarity"]): number {
  switch (rarity) {
    case "golden":
      return 3;
    case "rare":
      return 2;
    case "common":
      return 1;
  }
}

function resourceAmountSummaryLabel(
  resources: Array<{ amount: number; label?: string; resourceId: string }>,
  labels: Record<string, string>,
  content: ContentBundle
): string {
  if (resources.length === 0) {
    return "0";
  }

  return resources
    .map((resource) => `${formatInteger(resource.amount)} ${resource.label ?? resourceLabelById(resource.resourceId, labels, content)}`)
    .join(" · ");
}

function messageForHireFailure(reason: string): string {
  switch (reason) {
    case "already_hired":
      return "Этот гоблин уже в бригаде.";
    case "hut_limit":
      return "Лимит Хижины заполнен. Улучши Хижину, чтобы нанять больше.";
    case "locked":
      return "Условия найма еще не выполнены.";
    case "not_enough_resources":
      return "Не хватает ресурсов для найма.";
    case "role_locked":
      return "Эта роль еще не открыта уровнем Хижины.";
    default:
      return "Найм не прошел.";
  }
}

function messageForGoblinHutUpgradeFailure(reason: string): string {
  switch (reason) {
    case "locked":
      return "Условия улучшения Хижины еще не выполнены.";
    case "not_enough_resources":
      return "Не хватает ресурсов для улучшения Хижины.";
    case "max_level":
      return "Хижина уже на максимальном уровне.";
    default:
      return "Хижина не улучшена.";
  }
}

function messageForBossCardUpgradeFailure(reason: string): string {
  switch (reason) {
    case "max_level":
      return "Карта уже на максимальном уровне.";
    case "not_enough_cards":
      return "Не хватает копий карты.";
    case "not_enough_elixir":
      return "Не хватает Эликсира.";
    default:
      return "Карта не улучшена.";
  }
}

function messageForGoblinUpgradeFailure(reason: string): string {
  switch (reason) {
    case "max_level":
      return "Гоблин уже на максимальном уровне.";
    case "not_enough_resources":
      return "Не хватает ресурсов для прокачки.";
    case "not_hired":
      return "Сначала найми этого гоблина.";
    default:
      return "Прокачка не прошла.";
  }
}

function messageForBuildMineFailure(reason: string): string {
  switch (reason) {
    case "missing_built_mine_type":
      return "Для этой жилы пока нет проекта шахты.";
    case "not_enough_resources":
      return "Не хватает ресурсов для строительства шахты.";
    default:
      return "Шахта не построена.";
  }
}

function messageForUpgradeBuiltMineFailure(reason: string): string {
  switch (reason) {
    case "max_level":
      return "Шахта уже на максимальном уровне.";
    case "mine_not_active":
      return "Сначала дождись завершения строительства шахты.";
    case "not_enough_resources":
      return "Не хватает ресурсов для улучшения шахты.";
    default:
      return "Шахта не улучшена.";
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value)) {
    return "∞";
  }

  return `${Math.max(0, value).toFixed(1)} сек`;
}

function formatDurationMs(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 сек";
  }

  const seconds = Math.ceil(value / 1000);

  if (seconds < 60) {
    return `${seconds} сек`;
  }

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  if (minutes < 60) {
    return restSeconds > 0 ? `${minutes} мин ${restSeconds} сек` : `${minutes} мин`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  return restMinutes > 0 ? `${hours} ч ${restMinutes} мин` : `${hours} ч`;
}

function mergeResourceMaps(left: Record<string, number>, right: Record<string, number>): Record<string, number> {
  const result = { ...left };

  for (const [resourceId, amount] of Object.entries(right)) {
    result[resourceId] = (result[resourceId] ?? 0) + amount;
  }

  return result;
}

function assignGoblinWorkers(
  session: MiningSession,
  hiredGoblins: GoblinConfig[],
  goblinPlacements: GoblinPlacementMap,
  platformRow: number,
  roster: GoblinRosterState
): GoblinWorkerAssignment[] {
  const activePlatformRow = findPlatformRow(session, platformRow);

  return hiredGoblins
    .filter(isMiningGoblin)
    .map((goblin) => {
      const targetColumn = goblinPlacements[goblin.id];

      if (typeof targetColumn !== "number" || !isValidMineColumn(session, targetColumn)) {
        return null;
      }

      const targetBlock = session.blocks[activePlatformRow]?.[targetColumn];

      if (!targetBlock || targetBlock.destroyed) {
        return null;
      }

      return {
        goblin,
        targetCell: {
          row: activePlatformRow,
          col: targetColumn
        },
        damagePerSecond: calculateCrewAutoDamagePerSecond({
          blockTags: targetBlock.tags,
          goblins: [goblin],
          roster: {
            goblinLevels: {
              [goblin.id]: getGoblinLevel(roster, goblin.id)
            },
            hiredGoblinIds: [goblin.id]
          }
        })
      };
    })
    .filter((worker): worker is GoblinWorkerAssignment => Boolean(worker));
}

function findPlatformCells(session: MiningSession, platformRow: number): Array<{ row: number; col: number }> {
  const activePlatformRow = findPlatformRow(session, platformRow);
  const rowBlocks = session.blocks[activePlatformRow] ?? [];

  return rowBlocks
    .filter((block) => !block.destroyed)
    .map((block) => ({
      row: block.row,
      col: block.col
    }));
}

function depthMetersForRow(session: MiningSession, row: number): number {
  const rowCount = Math.max(1, session.mine.height);
  return Math.max(1, Math.round(((row + 1) * session.mine.depthMeters) / rowCount));
}

function depthMarkerLabel(session: MiningSession, row: number, platformRow: number): string {
  const depth = depthMetersForRow(session, row);

  if (row === platformRow || depth % depthMarkerStepMeters === 0) {
    return `${depth}м`;
  }

  return "";
}

function findExposedCellForPreferred(
  session: MiningSession,
  preferredCell: { row: number; col: number }
): { row: number; col: number } {
  const exposedCells = findExposedCells(session);

  if (exposedCells.some((cell) => cell.row === preferredCell.row && cell.col === preferredCell.col)) {
    return preferredCell;
  }

  return findNextExposedCell(session, preferredCell);
}

function findNextExposedCell(session: MiningSession, fromCell: { row: number; col: number }): { row: number; col: number } {
  const exposedCells = findExposedCells(session);

  if (exposedCells.length === 0) {
    return { row: 0, col: 0 };
  }

  const byColumn = [...exposedCells].sort((left, right) => left.col - right.col || left.row - right.row);
  const nextByColumn = byColumn.find((cell) => cell.col > fromCell.col);

  return nextByColumn ?? byColumn[0] ?? { row: 0, col: 0 };
}

function findExposedCells(session: MiningSession): Array<{ row: number; col: number }> {
  return Array.from({ length: session.mine.width }, (_, col) => {
    const block = session.blocks.map((row) => row[col]).find((item): item is MiningBlockState => Boolean(item && !item.destroyed));
    return block ? { row: block.row, col: block.col } : null;
  }).filter((cell): cell is { row: number; col: number } => Boolean(cell));
}

function createDefaultGoblinPlacements(
  session: MiningSession,
  hiredGoblins: GoblinConfig[],
  platformRow: number
): GoblinPlacementMap {
  return hiredGoblins.reduce<GoblinPlacementMap>(
    (placements, goblin) => placeGoblinInFirstFreeColumn(session, placements, goblin.id, platformRow),
    {}
  );
}

function normalizeGoblinPlacements(
  session: MiningSession,
  hiredGoblins: GoblinConfig[],
  placements: GoblinPlacementMap,
  options: { placeMissing: boolean; platformRow: number }
): GoblinPlacementMap {
  const normalized: GoblinPlacementMap = {};
  const usedColumns = new Set<number>();

  for (const goblin of hiredGoblins) {
    const column = placements[goblin.id];

    if (typeof column === "number" && isValidMineColumn(session, column) && !usedColumns.has(column)) {
      normalized[goblin.id] = column;
      usedColumns.add(column);
    }
  }

  if (!options.placeMissing) {
    return normalized;
  }

  return hiredGoblins.reduce((currentPlacements, goblin) => {
    if (typeof currentPlacements[goblin.id] === "number") {
      return currentPlacements;
    }

    return placeGoblinInFirstFreeColumn(session, currentPlacements, goblin.id, options.platformRow);
  }, normalized);
}

function placeGoblinInFirstFreeColumn(
  session: MiningSession,
  placements: GoblinPlacementMap,
  goblinId: string,
  platformRow: number
): GoblinPlacementMap {
  const occupiedColumns = new Set(
    Object.entries(placements)
      .filter(([placedGoblinId]) => placedGoblinId !== goblinId)
      .map(([, column]) => column)
  );
  const targetCell =
    findPlatformCells(session, platformRow).find((cell) => !occupiedColumns.has(cell.col)) ??
    findPlatformCells(session, platformRow).find((cell) => cell.col === placements[goblinId]);

  if (!targetCell) {
    return placements;
  }

  return {
    ...placements,
    [goblinId]: targetCell.col
  };
}

function cellKey(cell: { row: number; col: number }): string {
  return `${cell.row}:${cell.col}`;
}

function parseCellKey(value: string): { row: number; col: number } | null {
  const [rowValue, colValue] = value.split(":");
  const row = Number(rowValue);
  const col = Number(colValue);

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return null;
  }

  return { row, col };
}

function isValidMineColumn(session: MiningSession, column: number): boolean {
  return Number.isInteger(column) && column >= 0 && column < session.mine.width;
}

function findFirstPlayableCell(session: MiningSession): { row: number; col: number } {
  const block = findFirstPlayableBlock(session);
  return block ? { row: block.row, col: block.col } : { row: 0, col: 0 };
}

function findFirstPlayableBlock(session: MiningSession): MiningBlockState | undefined {
  return session.blocks.flat().find((block) => !block.destroyed) ?? session.blocks[0]?.[0];
}

function saveMiningSession(
  contentVersion: string,
  session: MiningSession,
  activeCell: { row: number; col: number },
  platformRow: number,
  goblinPlacements: GoblinPlacementMap,
  bossEnergy: BossEnergyState,
  builtMines: BuiltMineState[],
  mineCompletionNoticeSeenIds: string[],
  bossCardDefinitions: BossCardDefinition[]
): void {
  const payload: StoredMineSave = {
    contentVersion,
    save: exportMiningSessionSave(session),
    activeCell,
    platformRow: findPlatformRow(session, platformRow),
    goblinPlacements,
    bossEnergy,
    builtMines,
    mineCompletionNoticeSeenIds,
    savedAt: Date.now()
  };
  saveStoredMiningSession(payload, localStorage, bossCardDefinitions);
}

function normalizeIdList(values: readonly string[]): string[] {
  return values.filter((value, index, list) => typeof value === "string" && value.length > 0 && list.indexOf(value) === index);
}

function saveGoblinRoster(contentVersion: string, roster: GoblinRosterState, bossCardDefinitions: BossCardDefinition[]): void {
  const payload: StoredGoblinRoster = {
    contentVersion,
    roster
  };
  saveStoredGoblinRoster(payload, localStorage, bossCardDefinitions);
}
