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
  const visibleGoblins = useMemo(() => availableGoblins.slice(0, 3), [availableGoblins]);
  const visibleBlocks = session.blocks.flat().slice(0, Math.min(56, session.mine.width * session.mine.height));
  const activeBlock = session.blocks[activeCell.row]?.[activeCell.col] ?? findFirstPlayableBlock(session);
  const bossHitDamage = bossBaseDamage;
  const goblinDamagePerSecond = useMemo(
    () =>
      calculateCrewAutoDamagePerSecond({
        blockTags: activeBlock?.tags ?? [],
        goblins: availableGoblins,
        roster
      }),
    [activeBlock?.tags, availableGoblins, roster]
  );

  useEffect(() => {
    if (!sessionReady || pendingOfflineFinalHit) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSession((current) => {
        const targetBlock = current.blocks[activeCell.row]?.[activeCell.col] ?? findFirstPlayableBlock(current);

        if (!targetBlock || targetBlock.destroyed) {
          return current;
        }

        const autoDamage = calculateCrewAutoDamagePerSecond({
          blockTags: targetBlock.tags,
          goblins: availableGoblins,
          roster
        });

        if (autoDamage <= 0) {
          return current;
        }

        const result = applyAutoMining(current, contentState.content.blockTypes, {
          startCell: activeCell,
          damage: autoDamage
        });

        setActiveCell(result.nextTargetCell);
        return result.session;
      });
    }, autoMiningTickMs);

    return () => window.clearInterval(intervalId);
  }, [activeCell, availableGoblins, contentState.content.blockTypes, pendingOfflineFinalHit, roster, sessionReady]);

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
    if (block.destroyed) {
      setActiveCell({ row: block.row, col: block.col });
      return;
    }

    setSession((current) => {
      const next = hitMineBlock(current, contentState.content.blockTypes, {
        row: block.row,
        col: block.col,
        damage: bossHitDamage
      });
      const targetDestroyed = next.blocks[block.row]?.[block.col]?.destroyed;
      setActiveCell(targetDestroyed ? findFirstPlayableCell(next) : { row: block.row, col: block.col });
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
          {visibleGoblins.length > 0 ? (
            visibleGoblins.map((goblin) => (
              <div
                className={isGoblinHired(roster, goblin.id) ? "goblin hired" : "goblin locked"}
                key={goblin.id}
                title={labelFromNameKey(goblin.descriptionKey, goblin.id, labels)}
              >
                <strong>{goblinName(goblin, labels)}</strong>
                <span>
                  {goblinClassLabel(goblin.class)} · {goblin.baseStats.strength}
                </span>
              </div>
            ))
          ) : (
            <div className="goblin locked">
              <strong>Нет бригады</strong>
              <span>0</span>
            </div>
          )}
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
                  className={blockClassName(block, activeCell)}
                  disabled={block.destroyed}
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

function blockClassName(block: MiningBlockState, activeCell: { row: number; col: number }): string {
  const classes = ["mine-block", block.blockTypeId.replaceAll("_", "-"), blockDamageClass(block)];

  if (block.destroyed) {
    classes.push("destroyed");
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
