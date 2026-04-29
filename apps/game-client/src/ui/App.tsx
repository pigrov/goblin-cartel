import {
  applyAutoMining,
  calculateCrewAutoDamagePerSecond,
  canHireGoblin,
  createMiningSession,
  createInitialGoblinRoster,
  exportMiningSessionSave,
  generateMine,
  hitMineBlock,
  hireGoblin,
  isGoblinHired,
  restoreMiningSession,
  type GoblinRosterState,
  type MiningBlockState,
  type MiningSession,
  type MiningSessionSave
} from "@goblin-cartel/game-core";
import {
  starterContentBundle,
  type BlockTypeConfig,
  type ContentBundle,
  type GoblinConfig,
  type MineTemplateConfig,
  type ResourceConfig
} from "@goblin-cartel/content-schemas";
import { Bot, Hammer, Pickaxe, RotateCcw, Settings, Users, Warehouse } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const bossBaseDamage = 18;
const mineSeed = "local-player-001";
const mineSaveStorageKey = "goblin-cartel.player.mine-save.v1";
const goblinRosterStorageKey = "goblin-cartel.player.goblin-roster.v1";
const autoMiningTickMs = 1000;
const offlineFinalHitDelayMs = 900;
const maxOfflineMiningSeconds = 6 * 60 * 60;

type GameSection = "mine" | "goblins";

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

export function App() {
  const [contentState, setContentState] = useState<ContentState>(() => ({
    content: starterContentBundle,
    version: "fallback",
    source: "fallback",
    message: "Стартовый локальный контент"
  }));
  const [loadingContent, setLoadingContent] = useState(true);
  const [session, setSession] = useState<MiningSession>(() => createSession(starterContentBundle));
  const [sessionReady, setSessionReady] = useState(false);
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const [activeSection, setActiveSection] = useState<GameSection>("mine");
  const [roster, setRoster] = useState<GoblinRosterState>(() => createInitialGoblinRoster(starterContentBundle.goblins));
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);
  const [offlineSummary, setOfflineSummary] = useState<OfflineMiningSummary | null>(null);
  const [pendingOfflineFinalHit, setPendingOfflineFinalHit] = useState<{ row: number; col: number } | null>(null);

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
          const nextContentState = {
            content: payload.content,
            version: payload.version.version,
            source: "published" as const,
            message: "Опубликованный контент"
          };
          const nextRoster = createRestoredGoblinRoster(payload.content, payload.version.version);
          const restoredMining = createRestoredMiningState(payload.content, payload.version.version, nextRoster);
          setContentState({
            ...nextContentState
          });
          setSession(restoredMining.session);
          setRoster(nextRoster);
          setActiveCell(restoredMining.activeCell);
          setOfflineSummary(restoredMining.offlineSummary);
          setPendingOfflineFinalHit(restoredMining.pendingOfflineFinalHit);
          setSessionReady(true);
        }
      } catch (error) {
        if (active) {
          const nextRoster = createRestoredGoblinRoster(starterContentBundle, "fallback");
          const restoredMining = createRestoredMiningState(starterContentBundle, "fallback", nextRoster);
          setContentState({
            content: starterContentBundle,
            version: "fallback",
            source: "fallback",
            message: error instanceof Error ? error.message : "Стартовый локальный контент"
          });
          setSession(restoredMining.session);
          setRoster(nextRoster);
          setActiveCell(restoredMining.activeCell);
          setOfflineSummary(restoredMining.offlineSummary);
          setPendingOfflineFinalHit(restoredMining.pendingOfflineFinalHit);
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

    saveMiningSession(contentState.version, session, activeCell);
  }, [activeCell, contentState.version, session, sessionReady]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    saveGoblinRoster(contentState.version, roster);
  }, [contentState.version, roster, sessionReady]);

  const resourceById = useMemo(
    () => new Map(contentState.content.resources.map((resource) => [resource.id, resource])),
    [contentState.content.resources]
  );
  const blockTypeById = useMemo(
    () => new Map(contentState.content.blockTypes.map((blockType) => [blockType.id, blockType])),
    [contentState.content.blockTypes]
  );
  const mineTemplate = contentState.content.mineTemplates[0];
  const labels = useMemo(() => createLabels(contentState.content), [contentState.content]);
  const availableGoblins = useMemo(() => createAvailableGoblins(contentState.content), [contentState.content]);
  const hiredGoblins = useMemo(
    () => availableGoblins.filter((goblin) => isGoblinHired(roster, goblin.id)),
    [availableGoblins, roster]
  );
  const exposedCells = useMemo(() => findExposedCells(session), [session]);
  const exposedCellKeys = useMemo(() => new Set(exposedCells.map(cellKey)), [exposedCells]);
  const selectedCell = useMemo(() => findExposedCellForPreferred(session, activeCell), [activeCell, session]);
  const workerAssignments = useMemo(
    () => assignGoblinWorkers(session, hiredGoblins, selectedCell),
    [hiredGoblins, selectedCell, session]
  );
  const visibleBlocks = session.blocks.flat().slice(0, Math.min(56, session.mine.width * session.mine.height));
  const activeBlock = session.blocks[selectedCell.row]?.[selectedCell.col] ?? findFirstPlayableBlock(session);
  const bossHitDamage = bossBaseDamage;
  const goblinDamagePerSecond = workerAssignments.reduce((total, worker) => total + worker.damagePerSecond, 0);

  useEffect(() => {
    if (!sessionReady || pendingOfflineFinalHit) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSession((current) => {
        const currentSelectedCell = findExposedCellForPreferred(current, activeCell);
        const currentWorkers = assignGoblinWorkers(current, hiredGoblins, currentSelectedCell);

        if (currentWorkers.length === 0) {
          return current;
        }

        let nextSession = current;
        let nextActiveCell = currentSelectedCell;

        for (const worker of currentWorkers) {
          const target = nextSession.blocks[worker.targetCell.row]?.[worker.targetCell.col];

          if (!target || target.destroyed || worker.damagePerSecond <= 0 || !isExposedCell(nextSession, worker.targetCell)) {
            continue;
          }

          const next = hitMineBlock(nextSession, contentState.content.blockTypes, {
            row: target.row,
            col: target.col,
            damage: worker.damagePerSecond
          });

          if (next.blocks[target.row]?.[target.col]?.destroyed && cellKey(worker.targetCell) === cellKey(currentSelectedCell)) {
            nextActiveCell = findNextExposedCell(next, worker.targetCell);
          }

          nextSession = next;
        }

        setActiveCell(nextActiveCell);
        return nextSession;
      });
    }, autoMiningTickMs);

    return () => window.clearInterval(intervalId);
  }, [activeCell, contentState.content.blockTypes, hiredGoblins, pendingOfflineFinalHit, sessionReady]);

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

        setActiveCell(findFirstPlayableCell(next));
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
        return next;
      });
    }, offlineFinalHitDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [contentState.content.blockTypes, pendingOfflineFinalHit, sessionReady]);

  function handleBlockHit(block: MiningBlockState) {
    const targetCell = { row: block.row, col: block.col };

    if (block.destroyed || !exposedCellKeys.has(cellKey(targetCell))) {
      return;
    }

    setSession((current) => {
      const next = hitMineBlock(current, contentState.content.blockTypes, {
        row: block.row,
        col: block.col,
        damage: bossHitDamage
      });
      const targetDestroyed = next.blocks[block.row]?.[block.col]?.destroyed;
      setActiveCell(targetDestroyed ? findNextExposedCell(next, targetCell) : targetCell);
      return next;
    });
  }

  function handleResetMine() {
    const nextSession = createSession(contentState.content);
    const nextActiveCell = findFirstPlayableCell(nextSession);
    setSession(nextSession);
    setActiveCell(nextActiveCell);
    setOfflineSummary(null);
    setPendingOfflineFinalHit(null);
    saveMiningSession(contentState.version, nextSession, nextActiveCell);
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
          {contentState.content.resources.slice(0, 4).map((resource) => (
            <ResourceChip
              key={resource.id}
              labels={labels}
              resource={resource}
              value={session.resources[resource.id] ?? 0}
            />
          ))}
        </header>

        <section className="mine-header">
          <div>
            <p>{contentState.source === "published" ? `Content ${contentState.version}` : contentState.message}</p>
            <strong>{mineTitle(mineTemplate, labels)}</strong>
          </div>
          <button className="icon-button" onClick={handleResetMine} title="Сбросить шахту" type="button" aria-label="Сбросить шахту">
            <RotateCcw size={19} />
          </button>
          <button className="icon-button" type="button" aria-label="Настройки">
            <Settings size={19} />
          </button>
        </section>

        <section className="goblin-platform" aria-label="Бригада">
          {Array.from({ length: session.mine.width }, (_, col) => {
            const worker = workerAssignments.find((item) => item.targetCell.col === col);

            return (
              <div className="goblin-slot" key={col}>
                {worker ? (
                  <div className="worker-goblin drilling" title={goblinName(worker.goblin, labels)}>
                    <span className="worker-head" />
                    <span className="worker-body" />
                    <span className="worker-tool" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>

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
          <section
            className="mine-grid"
            style={{ gridTemplateColumns: `repeat(${session.mine.width}, minmax(0, 1fr))` }}
            aria-label="Рудник"
          >
            {visibleBlocks.map((block) => {
              const blockType = blockTypeById.get(block.blockTypeId);
              return (
                <button
                  className={blockClassName(block, selectedCell, exposedCellKeys)}
                  disabled={block.destroyed || !exposedCellKeys.has(cellKey({ row: block.row, col: block.col }))}
                  key={`${block.row}:${block.col}`}
                  onClick={() => handleBlockHit(block)}
                  type="button"
                >
                  <span>{block.destroyed ? "" : block.hp}</span>
                  <i style={{ width: `${blockHpPercent(block)}%` }} />
                  <b>{shortBlockLabel(blockType)}</b>
                </button>
              );
            })}
          </section>
        )}

        <section className="boss-panel">
          <button
            className="boss-button"
            disabled={!activeBlock || activeBlock.destroyed}
            onClick={() => activeBlock && handleBlockHit(activeBlock)}
            type="button"
          >
            <Hammer size={20} />
            Удар босса · {bossHitDamage}
          </button>
          <div className="active-block">
            <span>{activeBlock ? blockName(activeBlock, blockTypeById, labels) : "Нет блока"}</span>
            <strong>
              {activeBlock && !activeBlock.destroyed ? `${activeBlock.hp}/${activeBlock.maxHp} HP` : "разбит"}
            </strong>
          </div>
          <div className="active-block">
            <span>Гоблины</span>
            <strong>{goblinDamagePerSecond}/сек</strong>
          </div>
          {offlineSummary ? (
            <div className="offline-report">
              <span>
                Пока тебя не было: {offlineSummary.destroyedBlocks} блоков,{" "}
                {formatRewards(offlineSummary.rewards, resourceById, labels)}
              </span>
              {offlineSummary.pendingFinalHit ? <strong>Финальный удар</strong> : null}
            </div>
          ) : null}
          <div className="reward-line">
            {Object.keys(session.lastRewards).length > 0
              ? Object.entries(session.lastRewards)
                  .map(([resourceId, amount]) => `+${amount} ${resourceLabel(resourceById.get(resourceId), resourceId, labels)}`)
                  .join(" · ")
              : loadingContent
                ? "Загружаем контент"
                : `${session.destroyedBlocks} блоков разбито`}
          </div>
        </section>

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

  if (!storedSave || storedSave.contentVersion !== contentVersion) {
    return {
      session,
      activeCell: findFirstPlayableCell(session),
      offlineSummary: null,
      pendingOfflineFinalHit: null
    };
  }

  try {
    const restoredSession = restoreMiningSession(session, storedSave.save);
    const restoredActiveCell = storedSave.activeCell ?? findFirstPlayableCell(restoredSession);
    return applyOfflineMining(content, restoredSession, restoredActiveCell, roster, storedSave.savedAt);
  } catch {
    return {
      session,
      activeCell: findFirstPlayableCell(session),
      offlineSummary: null,
      pendingOfflineFinalHit: null
    };
  }
}

function applyOfflineMining(
  content: ContentBundle,
  session: MiningSession,
  activeCell: { row: number; col: number },
  roster: GoblinRosterState,
  savedAt: number | undefined
): RestoredMiningState {
  if (!savedAt) {
    return {
      session,
      activeCell,
      offlineSummary: null,
      pendingOfflineFinalHit: null
    };
  }

  const offlineSeconds = Math.min(maxOfflineMiningSeconds, Math.max(0, Math.floor((Date.now() - savedAt) / 1000)));
  const targetBlock = session.blocks[activeCell.row]?.[activeCell.col] ?? findFirstPlayableBlock(session);

  if (offlineSeconds < 5 || !targetBlock) {
    return {
      session,
      activeCell,
      offlineSummary: null,
      pendingOfflineFinalHit: null
    };
  }

  const availableGoblins = createAvailableGoblins(content);
  const autoDamage = calculateCrewAutoDamagePerSecond({
    blockTags: targetBlock.tags,
    goblins: availableGoblins,
    roster
  });

  if (autoDamage <= 0) {
    return {
      session,
      activeCell,
      offlineSummary: null,
      pendingOfflineFinalHit: null
    };
  }

  const result = applyAutoMining(session, content.blockTypes, {
    startCell: activeCell,
    damage: offlineSeconds * autoDamage,
    holdLastDestroy: true
  });

  const hasOfflineProgress = result.report.destroyedBlocks > 0 || Boolean(result.report.pendingFinalHit);

  return {
    session: result.session,
    activeCell: result.nextTargetCell,
    offlineSummary: hasOfflineProgress
      ? {
          seconds: offlineSeconds,
          destroyedBlocks: result.report.destroyedBlocks,
          rewards: result.report.rewards,
          pendingFinalHit: Boolean(result.report.pendingFinalHit)
        }
      : null,
    pendingOfflineFinalHit: result.report.pendingFinalHit
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

function ResourceChip(props: { labels: Record<string, string>; resource: ResourceConfig; value: number }) {
  return (
    <div className={`resource-chip ${resourceClassName(props.resource.id)}`}>
      <span>{resourceLabel(props.resource, props.resource.id, props.labels)}</span>
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

function blockClassName(
  block: MiningBlockState,
  activeCell: { row: number; col: number },
  exposedCellKeys: Set<string>
): string {
  const classes = ["mine-block", block.blockTypeId.replaceAll("_", "-"), blockDamageClass(block)];
  const blockCell = { row: block.row, col: block.col };

  if (block.destroyed) {
    classes.push("destroyed");
  }

  if (!block.destroyed && !exposedCellKeys.has(cellKey(blockCell))) {
    classes.push("covered");
  }

  if (block.row === activeCell.row && block.col === activeCell.col) {
    classes.push("active");
  }

  return classes.join(" ");
}

function blockDamageClass(block: MiningBlockState): string {
  if (block.destroyed) {
    return "damage-destroyed";
  }

  const ratio = block.hp / block.maxHp;

  if (ratio <= 0.34) {
    return "damage-breaking";
  }

  if (ratio <= 0.67) {
    return "damage-cracked";
  }

  if (ratio < 1) {
    return "damage-chipped";
  }

  return "damage-intact";
}

function blockHpPercent(block: MiningBlockState): number {
  return Math.max(0, Math.min(100, (block.hp / block.maxHp) * 100));
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

function shortBlockLabel(blockType?: BlockTypeConfig): string {
  if (!blockType) {
    return "?";
  }

  if (blockType.id === "copper_ore") {
    return "Cu";
  }

  if (blockType.specialBehavior === "chest") {
    return "Box";
  }

  return blockType.id.slice(0, 2).toUpperCase();
}

function blockName(
  block: MiningBlockState,
  blockTypeById: Map<string, BlockTypeConfig>,
  labels: Record<string, string>
): string {
  const blockType = blockTypeById.get(block.blockTypeId);
  return blockType ? labelFromNameKey(blockType.nameKey, blockType.id, labels) : block.blockTypeId;
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

function resourceLabelById(resourceId: string, labels: Record<string, string>): string {
  const resource = starterContentBundle.resources.find((item) => item.id === resourceId);
  return resource ? labelFromNameKey(resource.nameKey, resource.id, labels) : resourceId;
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

function formatRewards(
  rewards: Record<string, number>,
  resourceById: Map<string, ResourceConfig>,
  labels: Record<string, string>
): string {
  const entries = Object.entries(rewards);

  if (entries.length === 0) {
    return "награда ждет финального удара";
  }

  return entries
    .map(([resourceId, amount]) => `+${amount} ${resourceLabel(resourceById.get(resourceId), resourceId, labels)}`)
    .join(" · ");
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
  preferredCell: { row: number; col: number }
): GoblinWorkerAssignment[] {
  const targets = orderExposedCells(findExposedCells(session), preferredCell).slice(0, hiredGoblins.length);

  return hiredGoblins
    .slice(0, targets.length)
    .map((goblin, index) => {
      const targetCell = targets[index] ?? preferredCell;
      const targetBlock = session.blocks[targetCell.row]?.[targetCell.col];

      return {
        goblin,
        targetCell,
        damagePerSecond: calculateCrewAutoDamagePerSecond({
          blockTags: targetBlock?.tags ?? [],
          goblins: [goblin],
          roster: {
            hiredGoblinIds: [goblin.id]
          }
        })
      };
    });
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

function orderExposedCells(
  exposedCells: Array<{ row: number; col: number }>,
  preferredCell: { row: number; col: number }
): Array<{ row: number; col: number }> {
  if (exposedCells.length === 0) {
    return [];
  }

  const sorted = [...exposedCells].sort((left, right) => left.col - right.col || left.row - right.row);
  const preferredIndex = sorted.findIndex((cell) => cell.row === preferredCell.row && cell.col === preferredCell.col);

  if (preferredIndex === -1) {
    return sorted;
  }

  return [...sorted.slice(preferredIndex), ...sorted.slice(0, preferredIndex)];
}

function findExposedCells(session: MiningSession): Array<{ row: number; col: number }> {
  return Array.from({ length: session.mine.width }, (_, col) => {
    const block = session.blocks.map((row) => row[col]).find((item): item is MiningBlockState => Boolean(item && !item.destroyed));
    return block ? { row: block.row, col: block.col } : null;
  }).filter((cell): cell is { row: number; col: number } => Boolean(cell));
}

function isExposedCell(session: MiningSession, cell: { row: number; col: number }): boolean {
  return findExposedCells(session).some((item) => item.row === cell.row && item.col === cell.col);
}

function cellKey(cell: { row: number; col: number }): string {
  return `${cell.row}:${cell.col}`;
}

function findFirstPlayableCell(session: MiningSession): { row: number; col: number } {
  const block = findFirstPlayableBlock(session);
  return block ? { row: block.row, col: block.col } : { row: 0, col: 0 };
}

function findFirstPlayableBlock(session: MiningSession): MiningBlockState | undefined {
  return session.blocks.flat().find((block) => !block.destroyed) ?? session.blocks[0]?.[0];
}

function saveMiningSession(contentVersion: string, session: MiningSession, activeCell: { row: number; col: number }): void {
  const payload: StoredMineSave = {
    contentVersion,
    save: exportMiningSessionSave(session),
    activeCell,
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
