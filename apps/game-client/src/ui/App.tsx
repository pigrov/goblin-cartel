import {
  advanceBuiltMinesProduction,
  applyBossAttack,
  applyPlatformAutoMining,
  buildMineFromVein,
  calculateCrewAutoDamagePerSecond,
  canHireGoblin,
  collectBuiltMineIncome,
  createBossEnergyState,
  createMiningSession,
  createInitialGoblinRoster,
  exportMiningSessionSave,
  findPlatformRow,
  generateMine,
  getBossEnergySecondsUntilReady,
  hitMineBlock,
  hireGoblin,
  isGoblinHired,
  regenerateBossEnergy,
  restoreBossEnergyState,
  restoreMiningSession,
  type BossEnergyConfig,
  type BossEnergyState,
  type BuiltMineState,
  type GoblinRosterState,
  type MiningBlockState,
  type MiningFoundVein,
  type MiningSession,
  type MiningSessionSave
} from "@goblin-cartel/game-core";
import {
  starterContentBundle,
  type BuiltMineTypeConfig,
  type ContentBundle,
  type GoblinConfig,
  type MineTemplateConfig,
  type ResourceConfig
} from "@goblin-cartel/content-schemas";
import { Bot, Coins, Gem, Menu, Mountain, Pickaxe, RotateCcw, Users, Warehouse, X, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MinePixiScene, type MinePixiGoblin } from "./MinePixiScene";
import { destroyedHitEffectDurationMs } from "./minePixiEffects";
import {
  canBuildFoundVein,
  createVisibleBuiltMines,
  findUnbuiltFoundVeins,
  hasBuiltMineForVein
} from "./builtMineClientState";
import {
  canMoveToNextMine,
  findMineTemplateIndex,
  findNextMineTemplate,
  markMineCompletionNoticeSeen,
  shouldShowMineCompletionNotice
} from "./mineProgressionClientState";
import { contentVersionWithRuntimeSuffix, createRuntimeContentBundle } from "./runtimeContent";
import { useDelayedResourceDisplay } from "./useDelayedResourceDisplay";

const mineSeed = "local-player-001";
const mineSaveStorageKey = "goblin-cartel.player.mine-save.v1";
const goblinRosterStorageKey = "goblin-cartel.player.goblin-roster.v1";
const autoMiningTickMs = 1000;
const bossEnergyMinTickMs = 50;
const offlineFinalHitDelayMs = 900;
const hitEffectLifetimeMs = 2400;
const resourceRewardSettleDelayMs = destroyedHitEffectDurationMs;
const resourceFlashMs = 620;
const resourceTooltipLifetimeMs = 3000;
const maxOfflineMiningSeconds = 6 * 60 * 60;
const depthMarkerStepMeters = 5;
let hitEffectSequence = 0;

type GameSection = "mine" | "goblins" | "builtMines";
type GoblinPlacementMap = Record<string, number>;
type HitEffectVariant = "boss" | "goblin" | "critical";
type SpawnHitEffect = (
  cell: { row: number; col: number },
  variant: HitEffectVariant,
  damage: number,
  rewards?: Record<string, number>
) => void;

const bossEnergyConfig: BossEnergyConfig = {
  maxEnergy: 600,
  energyPerHit: 18,
  regenPerSecond: 6,
  damagePerTap: 18,
  critChance: 0.12,
  critMultiplier: 2
};
const bossEnergyTickMs = Math.max(bossEnergyMinTickMs, Math.round(1000 / Math.max(1, bossEnergyConfig.regenPerSecond)));
const initialContentBundle = createRuntimeContentBundle(starterContentBundle);

interface ContentState {
  content: ContentBundle;
  version: string;
  source: "published" | "fallback";
  message: string;
}

interface StoredMineSave {
  contentVersion: string;
  save: MiningSessionSave;
  activeCell?: {
    row: number;
    col: number;
  };
  platformRow?: number;
  goblinPlacements?: GoblinPlacementMap;
  bossEnergy?: BossEnergyState;
  builtMines?: BuiltMineState[];
  mineCompletionNoticeSeenIds?: string[];
  savedAt?: number;
}

interface StoredGoblinRoster {
  contentVersion: string;
  roster: GoblinRosterState;
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

interface ResourceTooltip {
  id: number;
  label: string;
  resourceId: string;
  value: number;
}

export function App() {
  const [contentState, setContentState] = useState<ContentState>(() => ({
    content: initialContentBundle,
    version: "fallback",
    source: "fallback",
    message: "Стартовый локальный контент"
  }));
  const [, setLoadingContent] = useState(true);
  const [session, setSession] = useState<MiningSession>(() => createSession(initialContentBundle));
  const [sessionReady, setSessionReady] = useState(false);
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const [platformRow, setPlatformRow] = useState(0);
  const [activeSection, setActiveSection] = useState<GameSection>("mine");
  const [roster, setRoster] = useState<GoblinRosterState>(() => createInitialGoblinRoster(initialContentBundle.goblins));
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);
  const [, setOfflineSummary] = useState<OfflineMiningSummary | null>(null);
  const [pendingOfflineFinalHit, setPendingOfflineFinalHit] = useState<{ row: number; col: number } | null>(null);
  const [goblinPlacements, setGoblinPlacements] = useState<GoblinPlacementMap>({});
  const [builtMines, setBuiltMines] = useState<BuiltMineState[]>([]);
  const [builtMineMessage, setBuiltMineMessage] = useState<string | null>(null);
  const [foundVeinNotice, setFoundVeinNotice] = useState<MiningFoundVein | null>(null);
  const [mineCompletionNoticeOpen, setMineCompletionNoticeOpen] = useState(false);
  const [mineCompletionNoticeSeenIds, setMineCompletionNoticeSeenIds] = useState<string[]>([]);
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [bossEnergy, setBossEnergy] = useState<BossEnergyState>(() => createBossEnergyState(bossEnergyConfig, Date.now()));
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
  const hiredGoblinsRef = useRef<GoblinConfig[]>([]);
  const pendingOfflineFinalHitRef = useRef(pendingOfflineFinalHit);
  const platformRowRef = useRef(platformRow);
  const previousPlatformRowRef = useRef(0);
  const spawnHitEffectRef = useRef<SpawnHitEffect>(() => undefined);
  const tooltipSequenceRef = useRef(0);

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
          const runtimeVersion = contentVersionWithRuntimeSuffix(payload.version.version, runtimeContent);
          const nextContentState = {
            content: runtimeContent,
            version: runtimeVersion,
            source: "published" as const,
            message: "Опубликованный контент"
          };
          const nextRoster = createRestoredGoblinRoster(runtimeContent, runtimeVersion);
          const restoredMining = createRestoredMiningState(runtimeContent, runtimeVersion, nextRoster);
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
          setBossEnergy(restoredMining.bossEnergy);
          setBuiltMines(restoredMining.builtMines);
          setMineCompletionNoticeSeenIds(restoredMining.mineCompletionNoticeSeenIds);
          setMineCompletionNoticeOpen(false);
          setBuiltMineMessage(null);
          setFoundVeinNotice(null);
          setClockNow(Date.now());
          setSessionReady(true);
        }
      } catch (error) {
        if (active) {
          const fallbackVersion = contentVersionWithRuntimeSuffix("fallback", initialContentBundle);
          const nextRoster = createRestoredGoblinRoster(initialContentBundle, fallbackVersion);
          const restoredMining = createRestoredMiningState(initialContentBundle, fallbackVersion, nextRoster);
          setContentState({
            content: initialContentBundle,
            version: fallbackVersion,
            source: "fallback",
            message: error instanceof Error ? error.message : "Стартовый локальный контент"
          });
          setSession(restoredMining.session);
          syncVisibleResourceAmounts(restoredMining.session.resources);
          setRoster(nextRoster);
          setActiveCell(restoredMining.activeCell);
          setPlatformRow(restoredMining.platformRow);
          setOfflineSummary(restoredMining.offlineSummary);
          setPendingOfflineFinalHit(restoredMining.pendingOfflineFinalHit);
          setGoblinPlacements(restoredMining.goblinPlacements);
          setBossEnergy(restoredMining.bossEnergy);
          setBuiltMines(restoredMining.builtMines);
          setMineCompletionNoticeSeenIds(restoredMining.mineCompletionNoticeSeenIds);
          setMineCompletionNoticeOpen(false);
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
      mineCompletionNoticeSeenIds
    );
  }, [
    activeCell,
    bossEnergy,
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

    saveGoblinRoster(contentState.version, roster);
  }, [contentState.version, roster, sessionReady]);

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

  const blockTypeById = useMemo(
    () => new Map(contentState.content.blockTypes.map((blockType) => [blockType.id, blockType])),
    [contentState.content.blockTypes]
  );
  const mineTemplate =
    contentState.content.mineTemplates.find((template) => template.id === session.mine.templateId) ?? contentState.content.mineTemplates[0];
  const labels = useMemo(() => createLabels(contentState.content), [contentState.content]);
  const displayedResources = useMemo(
    () => contentState.content.resources.filter((resource) => resource.id !== "boss_energy").slice(0, 4),
    [contentState.content.resources]
  );
  const availableGoblins = useMemo(() => createAvailableGoblins(contentState.content), [contentState.content]);
  const hiredGoblins = useMemo(
    () => availableGoblins.filter((goblin) => isGoblinHired(roster, goblin.id)),
    [availableGoblins, roster]
  );
  const currentPlatformRow = useMemo(() => findPlatformRow(session, platformRow), [platformRow, session]);
  const visibleBuiltMines = useMemo(() => createVisibleBuiltMines(builtMines, clockNow), [builtMines, clockNow]);
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

  useEffect(() => {
    if (
      !sessionReady ||
      foundVeinNotice ||
      mineCompletionNoticeOpen ||
      !shouldShowMineCompletionNotice({
        canStartNextMine,
        mineTemplateId: session.mine.templateId,
        seenMineCompletionNoticeIds: mineCompletionNoticeSeenIds
      })
    ) {
      return;
    }

    setMineCompletionNoticeOpen(true);
  }, [
    canStartNextMine,
    foundVeinNotice,
    mineCompletionNoticeOpen,
    mineCompletionNoticeSeenIds,
    session.mine.templateId,
    sessionReady
  ]);

  const platformCells = useMemo(() => findPlatformCells(session, currentPlatformRow), [currentPlatformRow, session]);
  const platformCellKeys = useMemo(() => new Set(platformCells.map(cellKey)), [platformCells]);
  const exposedCells = useMemo(() => findExposedCells(session), [session]);
  const exposedCellKeys = useMemo(() => new Set(exposedCells.map(cellKey)), [exposedCells]);
  const selectedCell = useMemo(() => findExposedCellForPreferred(session, activeCell), [activeCell, session]);
  const workerAssignments = useMemo(
    () => assignGoblinWorkers(session, hiredGoblins, goblinPlacements, currentPlatformRow),
    [currentPlatformRow, goblinPlacements, hiredGoblins, session]
  );
  const workerByColumn = useMemo(
    () => new Map(workerAssignments.map((worker) => [worker.targetCell.col, worker])),
    [workerAssignments]
  );
  const pixiGoblins = useMemo(
    () =>
      hiredGoblins
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
    [goblinPlacements, hiredGoblins, labels, session, workerByColumn]
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
    hiredGoblinsRef.current = hiredGoblins;
    pendingOfflineFinalHitRef.current = pendingOfflineFinalHit;
    platformRowRef.current = platformRow;
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
          hiredGoblinsRef.current,
          goblinPlacementsRef.current,
          nextPlatformStartRow
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

          spawnHitEffectRef.current(worker.targetCell, "goblin", worker.damagePerSecond, targetDestroyed ? next.lastRewards : undefined);
          notifyFoundVein(next.lastFoundVein);

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
      spawnHitEffect(targetCell, attack.critical ? "critical" : "boss", attack.damage, targetDestroyed ? next.lastRewards : undefined);
      notifyFoundVein(next.lastFoundVein);
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
    const nextGoblinPlacements = createDefaultGoblinPlacements(nextSession, hiredGoblins, nextPlatformRow);
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
    syncVisibleResourceAmounts(nextSession.resources);
    setClockNow(resetAt);
    setOfflineSummary(null);
    setPendingOfflineFinalHit(null);
    saveMiningSession(contentState.version, nextSession, nextActiveCell, nextPlatformRow, nextGoblinPlacements, nextBossEnergy, [], []);
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
      setBuiltMineMessage("Сначала построй шахту из найденной жилы.");
      return;
    }

    const nextSession = createSession(contentState.content, nextMine.id, session.resources);
    const nextPlatformRow = findPlatformRow(nextSession, 0);
    const nextActiveCell = findFirstPlayableCell(nextSession);
    const nextGoblinPlacements = createDefaultGoblinPlacements(nextSession, hiredGoblins, nextPlatformRow);
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
      nextSeenNoticeIds
    );
  }

  function handleDismissMineCompletionNotice() {
    setMineCompletionNoticeOpen(false);
    setMineCompletionNoticeSeenIds((current) => markMineCompletionNoticeSeen(current, session.mine.templateId));
    setBuiltMineMessage("Можно перейти к следующему руднику из меню шахт.");
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
    setBuiltMineMessage(`${veinNameById(vein.veinTypeId, contentState.content, labels)} найдена.`);
  }

  function handleBuildMineFromVein(vein: MiningFoundVein): boolean {
    if (hasBuiltMineForVein(builtMines, vein.id)) {
      setBuiltMineMessage("На этой жиле уже построена шахта.");
      return false;
    }

    const result = buildMineFromVein({
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

    const result = collectBuiltMineIncome({
      builtMine,
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

  function handleHireGoblin(goblin: GoblinConfig) {
    const result = hireGoblin({
      goblinId: goblin.id,
      goblins: availableGoblins,
      roster,
      resources: session.resources
    });

    if (!result.ok) {
      setRosterMessage(messageForHireFailure(result.reason));
      return;
    }

    setRoster(result.roster);
    setGoblinPlacements((current) => placeGoblinInFirstFreeColumn(session, current, goblin.id, currentPlatformRow));
    syncVisibleResourceAmounts(result.resources);
    setSession((current) => ({
      ...current,
      resources: result.resources,
      lastRewards: {}
    }));
    setRosterMessage(`${goblinName(goblin, labels)} нанят.`);
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

        {activeSection === "goblins" ? (
          <GoblinSection
            availableGoblins={availableGoblins}
            labels={labels}
            onHireGoblin={handleHireGoblin}
            resources={session.resources}
            roster={roster}
            rosterMessage={rosterMessage}
          />
        ) : activeSection === "builtMines" ? (
          <BuiltMinesSection
            builtMines={visibleBuiltMines}
            builtMineTypes={contentState.content.builtMineTypes}
            canStartNextMine={canStartNextMine}
            content={contentState.content}
            currentMineTemplate={mineTemplate}
            foundVeins={unbuiltFoundVeins}
            labels={labels}
            message={builtMineMessage}
            nextMineTemplate={nextMineTemplate}
            onBuildMine={handleBuildMineFromVein}
            onCollectMine={handleCollectBuiltMine}
            onStartNextMine={handleStartNextMine}
            resources={session.resources}
          />
        ) : (
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
        )}

        {activeSection === "mine" ? (
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
          </section>
        ) : null}

        {foundVeinNotice ? (
          <div className="modal-backdrop" onClick={() => setFoundVeinNotice(null)} role="presentation">
            <section className="vein-modal" aria-label="Найдена жила" onClick={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <p>Найдена жила</p>
                  <strong>{veinNameById(foundVeinNotice.veinTypeId, contentState.content, labels)}</strong>
                </div>
                <button className="icon-button" onClick={() => setFoundVeinNotice(null)} type="button" aria-label="Закрыть">
                  <X size={18} />
                </button>
              </header>
              <p className="vein-modal-copy">Теперь из нее можно построить шахту с доходом в час.</p>
              <div className="vein-modal-actions">
                <button
                  disabled={
                    !canBuildFoundVein({
                      builtMineTypes: contentState.content.builtMineTypes,
                      builtMines,
                      resources: session.resources,
                      vein: foundVeinNotice
                    })
                  }
                  onClick={() => {
                    if (handleBuildMineFromVein(foundVeinNotice)) {
                      setFoundVeinNotice(null);
                      setActiveSection("builtMines");
                    }
                  }}
                  type="button"
                >
                  Построить шахту
                </button>
                <button
                  onClick={() => {
                    setFoundVeinNotice(null);
                    setActiveSection("builtMines");
                  }}
                  type="button"
                >
                  К шахтам
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
                  <span>Жила закреплена</span>
                  <strong>Постоянная шахта построена</strong>
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
                  В следующий рудник
                </button>
                <button onClick={handleDismissMineCompletionNotice} type="button">
                  Остаться
                </button>
              </div>
            </section>
          </div>
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

        <nav className="bottom-nav" aria-label="Основная навигация">
          <button className={activeSection === "mine" ? "active" : ""} onClick={() => setActiveSection("mine")} type="button">
            <Pickaxe size={18} />
            Рудник
          </button>
          <button className={activeSection === "goblins" ? "active" : ""} onClick={() => setActiveSection("goblins")} type="button">
            <Users size={18} />
            Гоблины
          </button>
          <button className={activeSection === "builtMines" ? "active" : ""} onClick={() => setActiveSection("builtMines")} type="button">
            <Warehouse size={18} />
            Шахты
          </button>
          <button disabled type="button">
            <Bot size={18} />
            Авто
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
    const fallbackSession = createMiningSession({
      mine: generateMine(starterContentBundle.mineTemplates[0] as MineTemplateConfig, mineSeed),
      blockTypes: starterContentBundle.blockTypes
    });

    return {
      ...fallbackSession,
      resources: { ...resources }
    };
  }

  const session = createMiningSession({
    mine: generateMine(mineTemplate, mineSeed),
    blockTypes: content.blockTypes,
    mineDifficultyMultiplier: mineTemplate.difficulty
  });

  return {
    ...session,
    resources: { ...resources }
  };
}

function createRestoredMiningState(
  content: ContentBundle,
  contentVersion: string,
  roster: GoblinRosterState
): RestoredMiningState {
  const storedSave = loadMiningSessionSave();
  const hiredGoblins = createHiredGoblins(content, roster);
  const now = Date.now();
  const storedMineTemplateId =
    storedSave?.contentVersion === contentVersion ? storedSave.save.mineTemplateId : undefined;
  const session = createSession(content, storedMineTemplateId);

  if (!storedSave || storedSave.contentVersion !== contentVersion) {
    const initialPlatformRow = findPlatformRow(session, 0);

    return {
      session,
      activeCell: findFirstPlayableCell(session),
      offlineSummary: null,
      pendingOfflineFinalHit: null,
      platformRow: initialPlatformRow,
      goblinPlacements: createDefaultGoblinPlacements(session, hiredGoblins, initialPlatformRow),
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
      ? normalizeGoblinPlacements(restoredSession, hiredGoblins, storedSave.goblinPlacements, {
          placeMissing: true,
          platformRow: restoredPlatformRow
        })
      : createDefaultGoblinPlacements(restoredSession, hiredGoblins, restoredPlatformRow);
    const restoredBossEnergy = restoreBossEnergyState(storedSave.bossEnergy, bossEnergyConfig, now);
    const restoredBuiltMines = advanceBuiltMinesProduction(storedSave.builtMines ?? [], now);
    const restoredMineCompletionNoticeSeenIds = normalizeIdList(storedSave.mineCompletionNoticeSeenIds ?? []);

    return applyOfflineMining(
      content,
      restoredSession,
      restoredActiveCell,
      restoredPlatformRow,
      roster,
      restoredPlacements,
      restoredBossEnergy,
      restoredBuiltMines,
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
      goblinPlacements: createDefaultGoblinPlacements(session, hiredGoblins, initialPlatformRow),
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
  const hiredGoblins = availableGoblins.filter((goblin) => isGoblinHired(roster, goblin.id));
  const restoredPlacements = normalizeGoblinPlacements(session, hiredGoblins, goblinPlacements, {
    placeMissing: false,
    platformRow: activePlatformRow
  });
  const workers = assignGoblinWorkers(session, hiredGoblins, restoredPlacements, activePlatformRow);

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
    goblinPlacements: normalizeGoblinPlacements(nextSession, hiredGoblins, restoredPlacements, {
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
  const storedRoster = loadGoblinRoster();

  if (!storedRoster || storedRoster.contentVersion !== contentVersion) {
    return createInitialGoblinRoster(goblins);
  }

  return {
    hiredGoblinIds: storedRoster.roster.hiredGoblinIds.filter((id, index, ids) =>
      goblins.some((goblin) => goblin.id === id) && ids.indexOf(id) === index
    )
  };
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
  if (props.resourceId.includes("gold")) {
    return <Coins size={props.size} />;
  }

  if (props.resourceId.includes("copper")) {
    return <Gem size={props.size} />;
  }

  if (props.resourceId.includes("energy")) {
    return <Zap size={props.size} />;
  }

  return <Mountain size={props.size} />;
}

function BossStat(props: { label: string; value: string }) {
  return (
    <div className="boss-stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function GoblinSection(props: {
  availableGoblins: GoblinConfig[];
  labels: Record<string, string>;
  onHireGoblin: (goblin: GoblinConfig) => void;
  resources: Record<string, number>;
  roster: GoblinRosterState;
  rosterMessage: string | null;
}) {
  return (
    <section className="goblin-roster" aria-label="Гоблины">
      <header className="section-title">
        <div>
          <p>Бригада</p>
          <strong>{props.roster.hiredGoblinIds.length} нанято</strong>
        </div>
        <span>Урон {calculateCrewAutoDamagePerSecond({ goblins: props.availableGoblins, roster: props.roster })}/сек</span>
      </header>

      <div className="goblin-list">
        {props.availableGoblins.map((goblin) => {
          const hired = isGoblinHired(props.roster, goblin.id);
          const canHire = canHireGoblin({
            goblin,
            goblins: props.availableGoblins,
            resources: props.resources,
            roster: props.roster
          });

          return (
            <article className={hired ? "goblin-card hired" : "goblin-card"} key={goblin.id}>
              <div>
                <strong>{goblinName(goblin, props.labels)}</strong>
                <span>
                  {goblinClassLabel(goblin.class)} · {calculateCrewAutoDamagePerSecond({ goblins: [goblin], roster: { hiredGoblinIds: [goblin.id] } })}/сек
                </span>
              </div>
              <p>{labelFromNameKey(goblin.descriptionKey, goblin.id, props.labels)}</p>
              <footer>
                <span>{hireCostLabel(goblin, props.labels)}</span>
                <button disabled={hired || !canHire} onClick={() => props.onHireGoblin(goblin)} type="button">
                  {hired ? "Нанят" : "Нанять"}
                </button>
              </footer>
            </article>
          );
        })}
      </div>

      {props.rosterMessage ? <p className="roster-message">{props.rosterMessage}</p> : null}
    </section>
  );
}

function BuiltMinesSection(props: {
  builtMines: BuiltMineState[];
  builtMineTypes: BuiltMineTypeConfig[];
  canStartNextMine: boolean;
  content: ContentBundle;
  currentMineTemplate: MineTemplateConfig | undefined;
  foundVeins: MiningFoundVein[];
  labels: Record<string, string>;
  message: string | null;
  nextMineTemplate: MineTemplateConfig | undefined;
  onBuildMine: (vein: MiningFoundVein) => boolean;
  onCollectMine: (builtMineId: string) => void;
  onStartNextMine: () => void;
  resources: Record<string, number>;
}) {
  const activeMineCount = props.builtMines.filter((builtMine) => builtMine.status === "active").length;
  const currentMineIndex = props.currentMineTemplate ? findMineTemplateIndex(props.content.mineTemplates, props.currentMineTemplate.id) : -1;

  return (
    <section className="built-mines" aria-label="Шахты">
      <header className="section-title">
        <div>
          <p>Производство</p>
          <strong>{props.builtMines.length} шахт</strong>
        </div>
        <span>{activeMineCount} активны</span>
      </header>

      <p className="built-mine-message">{props.message ?? ""}</p>

      <div className="built-mine-list">
        <article className="mine-progress-card">
          <div>
            <span>Текущий рудник</span>
            <strong>
              {currentMineIndex >= 0 ? `№${currentMineIndex + 1} · ` : ""}
              {mineTitle(props.currentMineTemplate, props.labels)}
            </strong>
          </div>
          {props.nextMineTemplate ? (
            <button disabled={!props.canStartNextMine} onClick={props.onStartNextMine} type="button">
              Рудник №{currentMineIndex + 2}
            </button>
          ) : (
            <span>Следующий скоро</span>
          )}
        </article>

        {props.foundVeins.map((vein) => {
          const builtMineType = builtMineTypeForVein(vein, props.builtMineTypes);
          const canBuild = canBuildFoundVein({
            builtMineTypes: props.builtMineTypes,
            builtMines: props.builtMines,
            resources: props.resources,
            vein
          });

          return (
            <article className="found-vein-card" key={vein.id}>
              <div className="found-vein-icon" aria-hidden="true">
                <Gem size={22} />
              </div>
              <div>
                <strong>{veinNameById(vein.veinTypeId, props.content, props.labels)}</strong>
                <span>{builtMineType ? builtMineCostLabel(builtMineType, props.labels, props.content) : "Нет проекта шахты"}</span>
              </div>
              <button disabled={!canBuild || !builtMineType} onClick={() => props.onBuildMine(vein)} type="button">
                Построить
              </button>
            </article>
          );
        })}

        {props.builtMines.map((builtMine) => {
          const collectableAmount = Math.floor(builtMine.storedAmount);
          const storagePercent = builtMine.capacity > 0 ? Math.min(100, (builtMine.storedAmount / builtMine.capacity) * 100) : 0;

          return (
            <article className="built-mine-card" key={builtMine.id}>
              <header>
                <div>
                  <strong>{builtMineTypeName(builtMine.typeId, props.content, props.labels)}</strong>
                  <span>{builtMineStatusLabel(builtMine)}</span>
                </div>
                <span>{formatNumber(builtMine.productionPerHour)}/ч</span>
              </header>
              <div className="built-mine-storage">
                <span style={{ width: `${storagePercent}%` }} />
              </div>
              <footer>
                <span>
                  {formatNumber(builtMine.storedAmount)}/{formatNumber(builtMine.capacity)}{" "}
                  {resourceLabelById(builtMine.productionResourceId, props.labels, props.content)}
                </span>
                <button disabled={builtMine.status !== "active" || collectableAmount <= 0} onClick={() => props.onCollectMine(builtMine.id)} type="button">
                  Собрать {collectableAmount > 0 ? formatInteger(collectableAmount) : ""}
                </button>
              </footer>
            </article>
          );
        })}

        {props.foundVeins.length === 0 && props.builtMines.length === 0 ? (
          <article className="built-mine-empty">
            <strong>Шахт пока нет</strong>
            <span>Докопайся до жилы в руднике, чтобы открыть первую постоянную шахту.</span>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function resourceClassName(resourceId: string): string {
  if (resourceId.includes("gold")) {
    return "gold";
  }

  if (resourceId.includes("copper")) {
    return "copper";
  }

  if (resourceId.includes("energy")) {
    return "energy";
  }

  return "stone";
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
  const veinType = content.veinTypes.find((item) => item.id === veinTypeId) ?? starterContentBundle.veinTypes.find((item) => item.id === veinTypeId);
  return veinType ? labelFromNameKey(veinType.nameKey, veinType.id, labels) : veinTypeId;
}

function builtMineTypeName(typeId: string, content: ContentBundle, labels: Record<string, string>): string {
  const builtMineType =
    content.builtMineTypes.find((item) => item.id === typeId) ?? starterContentBundle.builtMineTypes.find((item) => item.id === typeId);
  return builtMineType ? labelFromNameKey(builtMineType.nameKey, builtMineType.id, labels) : typeId;
}

function builtMineTypeForVein(vein: MiningFoundVein, builtMineTypes: BuiltMineTypeConfig[]): BuiltMineTypeConfig | undefined {
  return builtMineTypes.find((builtMineType) => builtMineType.sourceVeinType === vein.veinTypeId);
}

function builtMineCostLabel(builtMineType: BuiltMineTypeConfig, labels: Record<string, string>, content: ContentBundle): string {
  if (builtMineType.buildCost.length === 0) {
    return "Без стоимости";
  }

  return builtMineType.buildCost
    .map((cost) => `${cost.amount} ${resourceLabelById(cost.resourceId, labels, content)}`)
    .join(" · ");
}

function builtMineStatusLabel(builtMine: BuiltMineState): string {
  return builtMine.status === "active" ? "Работает" : "Строится";
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

function createLabels(content: ContentBundle): Record<string, string> {
  return {
    ...(starterContentBundle.localization.ru ?? {}),
    ...(content.localization?.ru ?? {})
  };
}

function createAvailableGoblins(content: ContentBundle): GoblinConfig[] {
  const source = content.goblins?.length ? content.goblins : starterContentBundle.goblins;
  return [...source].sort((left, right) => left.sortOrder - right.sortOrder);
}

function createHiredGoblins(content: ContentBundle, roster: GoblinRosterState): GoblinConfig[] {
  return createAvailableGoblins(content).filter((goblin) => isGoblinHired(roster, goblin.id));
}

function goblinName(goblin: GoblinConfig, labels: Record<string, string>): string {
  return labelFromNameKey(goblin.nameKey, goblin.id, labels);
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

function hireCostLabel(goblin: GoblinConfig, labels: Record<string, string>): string {
  if (goblin.hireCost.length === 0) {
    return "Стартовый";
  }

  return goblin.hireCost
    .map((cost) => `-${cost.amount} ${resourceLabelById(cost.resourceId, labels)}`)
    .join(" · ");
}

function resourceLabelById(resourceId: string, labels: Record<string, string>, content: ContentBundle = starterContentBundle): string {
  const resource = content.resources.find((item) => item.id === resourceId) ?? starterContentBundle.resources.find((item) => item.id === resourceId);
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

function messageForHireFailure(reason: string): string {
  switch (reason) {
    case "already_hired":
      return "Этот гоблин уже в бригаде.";
    case "locked":
      return "Условия найма еще не выполнены.";
    case "not_enough_resources":
      return "Не хватает ресурсов для найма.";
    default:
      return "Найм не прошел.";
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
  platformRow: number
): GoblinWorkerAssignment[] {
  const activePlatformRow = findPlatformRow(session, platformRow);

  return hiredGoblins
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
  mineCompletionNoticeSeenIds: string[]
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
  localStorage.setItem(mineSaveStorageKey, JSON.stringify(payload));
}

function normalizeIdList(values: readonly string[]): string[] {
  return values.filter((value, index, list) => typeof value === "string" && value.length > 0 && list.indexOf(value) === index);
}

function loadMiningSessionSave(): StoredMineSave | null {
  const raw = localStorage.getItem(mineSaveStorageKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredMineSave;
  } catch {
    localStorage.removeItem(mineSaveStorageKey);
    return null;
  }
}

function saveGoblinRoster(contentVersion: string, roster: GoblinRosterState): void {
  const payload: StoredGoblinRoster = {
    contentVersion,
    roster
  };
  localStorage.setItem(goblinRosterStorageKey, JSON.stringify(payload));
}

function loadGoblinRoster(): StoredGoblinRoster | null {
  const raw = localStorage.getItem(goblinRosterStorageKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredGoblinRoster;
  } catch {
    localStorage.removeItem(goblinRosterStorageKey);
    return null;
  }
}
