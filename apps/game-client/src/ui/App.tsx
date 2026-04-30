import {
  applyBossAttack,
  applyPlatformAutoMining,
  calculateCrewAutoDamagePerSecond,
  canHireGoblin,
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
  type GoblinRosterState,
  type MiningBlockState,
  type MiningSession,
  type MiningSessionSave
} from "@goblin-cartel/game-core";
import {
  starterContentBundle,
  type ContentBundle,
  type GoblinConfig,
  type MineTemplateConfig,
  type ResourceConfig
} from "@goblin-cartel/content-schemas";
import { Bot, Coins, Gem, Menu, Mountain, Pickaxe, RotateCcw, Users, Warehouse, X, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MinePixiScene, type MinePixiGoblin } from "./MinePixiScene";

const mineSeed = "local-player-001";
const mineSaveStorageKey = "goblin-cartel.player.mine-save.v1";
const goblinRosterStorageKey = "goblin-cartel.player.goblin-roster.v1";
const autoMiningTickMs = 1000;
const bossEnergyTickMs = 500;
const offlineFinalHitDelayMs = 900;
const hitEffectLifetimeMs = 2400;
const resourceTooltipLifetimeMs = 3000;
const maxOfflineMiningSeconds = 6 * 60 * 60;
const depthMarkerStepMeters = 5;
const runtimeTestMineRows = 40;
const runtimeMineMetersPerRow = 5;
let hitEffectSequence = 0;

type GameSection = "mine" | "goblins";
type GoblinPlacementMap = Record<string, number>;
type HitEffectVariant = "boss" | "goblin" | "critical";

const bossEnergyConfig: BossEnergyConfig = {
  maxEnergy: 600,
  energyPerHit: 18,
  regenPerSecond: 6,
  damagePerTap: 18,
  critChance: 0.12,
  critMultiplier: 2
};
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
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [bossEnergy, setBossEnergy] = useState<BossEnergyState>(() => createBossEnergyState(bossEnergyConfig, Date.now()));
  const [bossDetailsOpen, setBossDetailsOpen] = useState(false);
  const [bossEnergyFeedback, setBossEnergyFeedback] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pixiDevOverlayEnabled, setPixiDevOverlayEnabled] = useState(false);
  const [resourceTooltip, setResourceTooltip] = useState<ResourceTooltip | null>(null);
  const [platformDropAnimating, setPlatformDropAnimating] = useState(false);
  const previousPlatformRowRef = useRef(0);
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
          setRoster(nextRoster);
          setActiveCell(restoredMining.activeCell);
          setPlatformRow(restoredMining.platformRow);
          setOfflineSummary(restoredMining.offlineSummary);
          setPendingOfflineFinalHit(restoredMining.pendingOfflineFinalHit);
          setGoblinPlacements(restoredMining.goblinPlacements);
          setBossEnergy(restoredMining.bossEnergy);
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
          setRoster(nextRoster);
          setActiveCell(restoredMining.activeCell);
          setPlatformRow(restoredMining.platformRow);
          setOfflineSummary(restoredMining.offlineSummary);
          setPendingOfflineFinalHit(restoredMining.pendingOfflineFinalHit);
          setGoblinPlacements(restoredMining.goblinPlacements);
          setBossEnergy(restoredMining.bossEnergy);
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

    saveMiningSession(contentState.version, session, activeCell, platformRow, goblinPlacements, bossEnergy);
  }, [activeCell, bossEnergy, contentState.version, goblinPlacements, platformRow, session, sessionReady]);

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
  const mineTemplate = contentState.content.mineTemplates[0];
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
  const bossEnergyPercent = bossEnergyConfig.maxEnergy > 0 ? (visibleBossEnergy.currentEnergy / bossEnergyConfig.maxEnergy) * 100 : 0;
  const bossSecondsUntilReady = useMemo(
    () => getBossEnergySecondsUntilReady(bossEnergy, bossEnergyConfig, clockNow),
    [bossEnergy, clockNow]
  );
  const pixiDepthMarkerLabel = useCallback(
    (row: number) => depthMarkerLabel(session, row, currentPlatformRow),
    [currentPlatformRow, session]
  );

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
    if (!sessionReady || pendingOfflineFinalHit) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSession((current) => {
        const currentSelectedCell = findExposedCellForPreferred(current, activeCell);
        const nextPlatformStartRow = findPlatformRow(current, platformRow);
        const currentWorkers = assignGoblinWorkers(current, hiredGoblins, goblinPlacements, nextPlatformStartRow);

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

          const next = hitMineBlock(nextSession, contentState.content.blockTypes, {
            row: target.row,
            col: target.col,
            damage: worker.damagePerSecond
          });
          const targetDestroyed = Boolean(next.blocks[target.row]?.[target.col]?.destroyed);

          spawnHitEffect(worker.targetCell, "goblin", worker.damagePerSecond, targetDestroyed ? next.lastRewards : undefined);

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
  }, [activeCell, contentState.content.blockTypes, goblinPlacements, hiredGoblins, pendingOfflineFinalHit, platformRow, sessionReady]);

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
    setClockNow(resetAt);
    setOfflineSummary(null);
    setPendingOfflineFinalHit(null);
    saveMiningSession(contentState.version, nextSession, nextActiveCell, nextPlatformRow, nextGoblinPlacements, nextBossEnergy);
  }

  function handleConfirmResetMine() {
    if (!window.confirm("Сбросить текущую шахту и локальный прогресс?")) {
      return;
    }

    handleResetMine();
    setSettingsOpen(false);
  }

  function showResourceTooltip(resource: ResourceConfig, value: number) {
    setResourceTooltip({
      id: ++tooltipSequenceRef.current,
      label: resourceLabel(resource, resource.id, labels),
      resourceId: resource.id,
      value
    });
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
              const value = session.resources[resource.id] ?? 0;

              return (
                <ResourceChip
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
                {formatNumber(visibleBossEnergy.currentEnergy)}/{bossEnergyConfig.maxEnergy}
              </strong>
            </span>
            <span className="boss-energy-stats">
              <span>{bossEnergyConfig.damagePerTap} урон</span>
              <span>+{bossEnergyConfig.regenPerSecond}/сек</span>
            </span>
          </button>
        </section>

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
                <BossStat label="Энергия" value={`${formatNumber(visibleBossEnergy.currentEnergy)}/${bossEnergyConfig.maxEnergy}`} />
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
          <button disabled type="button">
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

function createRuntimeContentBundle(content: ContentBundle): ContentBundle {
  const debugRows = readDebugMineRows();
  const targetRows = debugRows ?? runtimeTestMineRows;
  const targetDepthMeters = targetRows * runtimeMineMetersPerRow;
  const mineTemplate = content.mineTemplates[0];

  if (!mineTemplate) {
    return content;
  }

  const currentDepthMeters = mineTemplate.depthMeters ?? mineTemplate.height;
  const shouldUseRuntimeMine =
    Boolean(debugRows) || mineTemplate.height < targetRows || currentDepthMeters < targetDepthMeters;

  if (!shouldUseRuntimeMine) {
    return content;
  }

  const lastStratum = mineTemplate.strata.at(-1);

  if (!lastStratum) {
    return content;
  }

  return {
    ...content,
    mineTemplates: [
      {
        ...mineTemplate,
        depthMeters: Math.max(currentDepthMeters, targetDepthMeters),
        height: targetRows,
        id: `${mineTemplate.id}_${debugRows ? "debug" : "test"}_${targetRows}`,
        strata: [
          ...mineTemplate.strata.slice(0, -1),
          {
            ...lastStratum,
            toRow: targetRows - 1
          }
        ]
      },
      ...content.mineTemplates.slice(1)
    ]
  };
}

function contentVersionWithRuntimeSuffix(version: string, content: ContentBundle): string {
  const debugRows = readDebugMineRows();
  const mineTemplate = content.mineTemplates[0];

  if (debugRows) {
    return `${version}:debug-${debugRows}`;
  }

  return mineTemplate?.id.endsWith(`_test_${runtimeTestMineRows}`) ? `${version}:test-${runtimeTestMineRows}` : version;
}

function readDebugMineRows(): number | null {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return null;
  }

  const raw = new URLSearchParams(window.location.search).get("debugMineRows");
  const rows = raw ? Number(raw) : 0;

  if (!Number.isInteger(rows) || rows < 50 || rows > 200) {
    return null;
  }

  return rows;
}

function createSession(content: ContentBundle): MiningSession {
  const mineTemplate = content.mineTemplates[0];

  if (!mineTemplate) {
    return createMiningSession({
      mine: generateMine(starterContentBundle.mineTemplates[0] as MineTemplateConfig, mineSeed),
      blockTypes: starterContentBundle.blockTypes
    });
  }

  return createMiningSession({
    mine: generateMine(mineTemplate, mineSeed),
    blockTypes: content.blockTypes,
    mineDifficultyMultiplier: mineTemplate.difficulty
  });
}

function createRestoredMiningState(
  content: ContentBundle,
  contentVersion: string,
  roster: GoblinRosterState
): RestoredMiningState {
  const session = createSession(content);
  const storedSave = loadMiningSessionSave();
  const hiredGoblins = createHiredGoblins(content, roster);
  const now = Date.now();

  if (!storedSave || storedSave.contentVersion !== contentVersion) {
    const initialPlatformRow = findPlatformRow(session, 0);

    return {
      session,
      activeCell: findFirstPlayableCell(session),
      offlineSummary: null,
      pendingOfflineFinalHit: null,
      platformRow: initialPlatformRow,
      goblinPlacements: createDefaultGoblinPlacements(session, hiredGoblins, initialPlatformRow),
      bossEnergy: createBossEnergyState(bossEnergyConfig, now)
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

    return applyOfflineMining(
      content,
      restoredSession,
      restoredActiveCell,
      restoredPlatformRow,
      roster,
      restoredPlacements,
      restoredBossEnergy,
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
      bossEnergy: createBossEnergyState(bossEnergyConfig, now)
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
      bossEnergy
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
      bossEnergy
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
      bossEnergy
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
    bossEnergy
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
  labels: Record<string, string>;
  onClick: () => void;
  resource: ResourceConfig;
  value: number;
}) {
  const label = resourceLabel(props.resource, props.resource.id, props.labels);

  return (
    <button
      aria-label={`${label}: ${formatNumber(props.value)}`}
      className={`resource-chip ${resourceClassName(props.resource.id)}`}
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

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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
  bossEnergy: BossEnergyState
): void {
  const payload: StoredMineSave = {
    contentVersion,
    save: exportMiningSessionSave(session),
    activeCell,
    platformRow: findPlatformRow(session, platformRow),
    goblinPlacements,
    bossEnergy,
    savedAt: Date.now()
  };
  localStorage.setItem(mineSaveStorageKey, JSON.stringify(payload));
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
