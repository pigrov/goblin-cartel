import type { BlockTypeConfig, ContentBundle, GoblinConfig } from "@goblin-cartel/content-schemas";
import type { MiningBlockState, MiningSession } from "@goblin-cartel/game-core";
import { ArrowDownUp, BarChart3, Coins, Gem, Gauge, Hammer, Mountain, Pickaxe, Plus, ShieldCheck, X, Zap } from "lucide-react";
import { lazy, type CSSProperties, type ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ElevatorProgressionState } from "../elevatorState";
import type { ForemanAssignments } from "../foremanTowerState";
import { createGoblinIdentity } from "../goblinHutClientState";
import type { MineRunProgressStatsView, MineRunRewardSummary } from "../mineRunStats";
import type { MinePixiColumnTacticHint, MinePixiForemanSlot, MinePixiGoblin, MinePixiHitEffect } from "../MinePixiScene";
import { formatOfflineDuration, type OfflineMiningSummary } from "../offlineMiningSummary";
import type { PlatformDropEvent } from "../useMiningLoop";
import {
  getGoblinOfflineAutoDamageMultiplier,
  getGoblinOfflineRelocationSlots,
  getGoblinOfflineRewardMultiplier
} from "../useGoblinPlacement";

const MinePixiScene = lazy(async () => {
  const module = await import("../MinePixiScene");
  return { default: module.MinePixiScene };
});

export function MineScreen(props: {
  activeCell: {
    row: number;
    col: number;
  };
  blockTypeById: ReadonlyMap<string, BlockTypeConfig>;
  columnHints: MinePixiColumnTacticHint[];
  currentPlatformRow: number;
  content: ContentBundle;
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
  labels: Record<string, string>;
  loading: boolean;
  offlineSummary: OfflineMiningSummary | null;
  progressStats: MineRunProgressStatsView;
  onBlockHit: (block: MiningBlockState) => void;
  onAssignForemanSlot: (slotIndex: number, goblinId: string | null) => void;
  onDismissOfflineSummary: () => void;
  onOpenGoblins: () => void;
  onPlaceGoblin: (goblinId: string, targetCell: { row: number; col: number }) => void;
  onUpgradeElevator: () => void;
  platformCellKeys: ReadonlySet<string>;
  platformDropAnimating: boolean;
  platformDropEvent: PlatformDropEvent | null;
  session: MiningSession;
}) {
  const [foremanPickerOpen, setForemanPickerOpen] = useState(false);
  const [elevatorOpen, setElevatorOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [elevatorUpgradePulse, setElevatorUpgradePulse] = useState(false);
  const previousElevatorLevelRef = useRef(props.elevatorProgression.levelNow);
  const pixiForemen = useMemo<MinePixiForemanSlot[]>(() => {
    const foremanById = new Map(props.foremanTower.availableForemen.map((goblin) => [goblin.id, goblin]));

    return props.foremanTower.assignments.map((goblinId) => {
      const foreman = goblinId ? foremanById.get(goblinId) ?? null : null;

      if (!foreman) {
        return null;
      }

      return {
        id: foreman.id,
        name: createGoblinIdentity(foreman, props.labels).name,
        rarity: foreman.role
      };
    });
  }, [props.foremanTower.assignments, props.foremanTower.availableForemen, props.labels]);

  useEffect(() => {
    if (props.elevatorProgression.levelNow > previousElevatorLevelRef.current) {
      setElevatorUpgradePulse(true);
      const timeoutId = window.setTimeout(() => setElevatorUpgradePulse(false), 1300);
      previousElevatorLevelRef.current = props.elevatorProgression.levelNow;
      return () => window.clearTimeout(timeoutId);
    }

    previousElevatorLevelRef.current = props.elevatorProgression.levelNow;
    return undefined;
  }, [props.elevatorProgression.levelNow]);

  if (props.loading) {
    return <MineLoadingState />;
  }

  const mineModalOpen = foremanPickerOpen || elevatorOpen || progressOpen;
  const occupiedElevatorSlots = Math.min(props.goblins.length, props.elevatorProgression.platformSlots);

  return (
    <section className="mine-screen-stage">
      <Suspense fallback={<MineLoadingState />}>
        <MinePixiScene
          activeCell={props.activeCell}
          blockTypeById={props.blockTypeById}
          columnHints={props.columnHints}
          currentPlatformRow={props.currentPlatformRow}
          depthMarkerLabel={props.depthMarkerLabel}
          elevatorLevel={props.elevatorLevel}
          elevatorVisualStage={props.elevatorVisualStage}
          exposedCellKeys={props.exposedCellKeys}
          foremen={pixiForemen}
          goblins={props.goblins}
          hitEffects={props.hitEffects}
          onBlockHit={props.onBlockHit}
          onPlaceGoblin={props.onPlaceGoblin}
          devOverlayEnabled={props.devOverlayEnabled}
          platformCellKeys={props.platformCellKeys}
          platformDropDurationMs={props.elevatorProgression.dropDurationMs}
          platformDropAnimating={props.platformDropAnimating}
          session={props.session}
        />
      </Suspense>
      {!mineModalOpen ? (
        <div className="mine-side-actions" aria-label="Управление рудником">
          <div className="mine-elevator-action">
            <ElevatorMineButton
              lowering={props.platformDropAnimating}
              occupiedSlots={occupiedElevatorSlots}
              upgraded={elevatorUpgradePulse}
              level={props.elevatorProgression.levelNow}
              slots={props.elevatorProgression.platformSlots}
              onOpen={() => setElevatorOpen(true)}
            />
            {elevatorUpgradePulse ? (
              <div className="mine-elevator-upgrade-toast">LV {props.elevatorProgression.levelNow}</div>
            ) : null}
          </div>
          <ForemanTowerButton
            assignedCount={props.foremanTower.assignedForemen.length}
            onOpen={() => setForemanPickerOpen(true)}
          />
          <MineProgressButton stats={props.progressStats} onOpen={() => setProgressOpen(true)} />
        </div>
      ) : null}
      {props.platformDropEvent ? <MineDepthEventToast event={props.platformDropEvent} key={props.platformDropEvent.id} /> : null}
      {props.offlineSummary && !mineModalOpen ? (
        <ForemanOfflineReport
          content={props.content}
          labels={props.labels}
          onClose={props.onDismissOfflineSummary}
          summary={props.offlineSummary}
        />
      ) : null}
      {elevatorOpen ? (
        <ElevatorModal
          labels={props.labels}
          onClose={() => setElevatorOpen(false)}
          onUpgrade={props.onUpgradeElevator}
          state={props.elevatorProgression}
          upgraded={elevatorUpgradePulse}
        />
      ) : null}
      {foremanPickerOpen ? (
        <ForemanTowerModal
          foremanTower={props.foremanTower}
          labels={props.labels}
          onAssign={props.onAssignForemanSlot}
          onClose={() => setForemanPickerOpen(false)}
          onOpenGoblins={() => {
            setForemanPickerOpen(false);
            props.onOpenGoblins();
          }}
        />
      ) : null}
      {progressOpen ? <MineProgressModal stats={props.progressStats} onClose={() => setProgressOpen(false)} /> : null}
    </section>
  );
}

function ElevatorMineButton(props: {
  level: number;
  lowering: boolean;
  occupiedSlots: number;
  slots: number;
  onOpen: () => void;
  upgraded: boolean;
}) {
  const className = [
    "mine-elevator-button",
    props.lowering ? "lowering" : "",
    props.upgraded ? "upgraded" : ""
  ].filter(Boolean).join(" ");

  return (
    <button
      className={className}
      onClick={props.onOpen}
      title={`LV ${props.level}`}
      type="button"
      aria-label="Подъемник"
    >
      <ArrowDownUp size={18} />
      <strong>{formatInteger(props.occupiedSlots)}/{formatInteger(props.slots)}</strong>
    </button>
  );
}

function MineDepthEventToast(props: { event: PlatformDropEvent }) {
  const progress = `${Math.max(0, Math.min(100, Math.round((props.event.depthMeters / props.event.totalDepthMeters) * 100)))}%`;
  const rewardLabel = props.event.rewardDrops.length > 0
    ? props.event.rewardDrops.map((reward) => `+${formatInteger(reward.amount)} ${reward.label}`).join(" · ")
    : `${props.event.depthMeters}/${props.event.totalDepthMeters} м`;

  return (
    <div className="mine-depth-event-toast" style={{ "--progress": progress } as CSSProperties}>
      <span>Ряд очищен</span>
      <strong>+{props.event.metersGained} м</strong>
      <small>{rewardLabel}</small>
      <i aria-hidden="true" />
    </div>
  );
}

function ForemanOfflineReport(props: {
  content: ContentBundle;
  labels: Record<string, string>;
  onClose: () => void;
  summary: OfflineMiningSummary;
}) {
  const rewards = rewardRowsFromMap(props.summary.rewards, props.content, props.labels);

  return (
    <aside className="foreman-offline-report" aria-label="Офлайн-работа бригадира">
      <header>
        <div>
          <p>Пока тебя не было</p>
          <strong>Бригадирская смена</strong>
        </div>
        <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть отчет">
          <X size={17} />
        </button>
      </header>

      <div className="foreman-offline-report-stats">
        <ForemanOfflineStat icon={<Hammer size={16} />} label="перест." value={props.summary.relocationMoves} />
        <ForemanOfflineStat icon={<Pickaxe size={16} />} label="блоков" value={props.summary.destroyedBlocks} />
        <ForemanOfflineStat icon={<Zap size={16} />} label="офлайн" value={formatOfflineDuration(props.summary.seconds)} />
      </div>

      {props.summary.pendingFinalHit ? (
        <p className="foreman-offline-report-note">Последний удар показываем прямо в руднике.</p>
      ) : null}

      {rewards.length > 0 ? (
        <div className="foreman-offline-report-rewards">
          {rewards.map((reward) => (
            <span className={`foreman-offline-report-reward ${resourceClassName(reward.resourceId)}`} key={reward.resourceId}>
              <ResourceIcon resourceId={reward.resourceId} size={13} />
              <strong>+{formatInteger(reward.amount)}</strong>
              <em>{reward.label}</em>
            </span>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function ForemanOfflineStat(props: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <span>
      <i aria-hidden="true">{props.icon}</i>
      <strong>{typeof props.value === "number" ? formatInteger(props.value) : props.value}</strong>
      <em>{props.label}</em>
    </span>
  );
}

function MineProgressButton(props: { onOpen: () => void; stats: MineRunProgressStatsView }) {
  return (
    <button className="mine-progress-button" onClick={props.onOpen} type="button" aria-label="Прогресс рудника">
      <BarChart3 size={17} />
      <strong>{formatInteger(props.stats.currentDepthMeters)}/{formatInteger(props.stats.depthMeters)}</strong>
    </button>
  );
}

function MineProgressModal(props: { onClose: () => void; stats: MineRunProgressStatsView }) {
  const progressStyle = { "--progress": `${props.stats.progressPercent}%` } as CSSProperties;

  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section className="mine-progress-modal" aria-label="Прогресс рудника" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Рудник</p>
            <strong>Прогресс</strong>
            <span>
              {props.stats.currentDepthMeters}/{props.stats.depthMeters} м
            </span>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <div className="mine-progress-modal-hero">
          <div className="mine-progress-ring" style={progressStyle}>
            <strong>{props.stats.progressPercent}%</strong>
            <span>очищено</span>
          </div>
          <div>
            <span>Камни</span>
            <strong>
              {props.stats.destroyedBlocks}/{props.stats.totalBlocks}
            </strong>
          </div>
          <div>
            <span>Жила</span>
            <strong>{props.stats.completionVeinName ?? "Не указана"}</strong>
          </div>
        </div>

        <div className="mine-progress-modal-stats">
          <MineProgressStat label="Глубина" value={`${props.stats.currentDepthMeters}/${props.stats.depthMeters} м`} />
          <MineProgressStat label="Бонус глубины" value={props.stats.depthRewardLabel ?? "Нет"} />
        </div>

        <section className="mine-progress-modal-rewards">
          <header>
            <Gem size={16} />
            <span>Добыто сейчас</span>
          </header>
          <MineProgressRewardPills rewards={props.stats.totalRewards} />
        </section>
      </section>
    </div>
  );
}

function MineProgressStat(props: { label: string; value: string }) {
  return (
    <div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function MineProgressRewardPills(props: { rewards: MineRunRewardSummary[] }) {
  if (props.rewards.length === 0) {
    return <p className="mine-progress-modal-empty">Пока нет добычи</p>;
  }

  return (
    <div className="mine-progress-modal-reward-pills">
      {props.rewards.map((reward) => (
        <span className={`mine-progress-modal-reward ${resourceClassName(reward.resourceId)}`} key={reward.resourceId}>
          <strong>+{formatInteger(reward.amount)}</strong>
          <em>{reward.label}</em>
        </span>
      ))}
    </div>
  );
}

function ElevatorModal(props: {
  labels: Record<string, string>;
  onClose: () => void;
  onUpgrade: () => void;
  state: ElevatorProgressionState;
  upgraded: boolean;
}) {
  const currentTitle = labelFromNameKey(props.state.currentLevel.nameKey, "Подъемник", props.labels);
  const nextTitle = props.state.nextLevel ? labelFromNameKey(props.state.nextLevel.nameKey, "Следующий уровень", props.labels) : null;

  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section className={props.upgraded ? "elevator-modal upgraded" : "elevator-modal"} aria-label="Подъемник" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Рудник</p>
            <strong>Подъемник</strong>
            <span>{currentTitle} · уровень {props.state.levelNow}/{props.state.maxLevel}</span>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <div className={`elevator-modal-visual stage-${props.state.visualStage}`} aria-hidden="true">
          <i className="elevator-modal-rail" />
          <i className="elevator-modal-wheel" />
          <i className="elevator-modal-cable" />
          <i className="elevator-modal-platform" />
          <i className="elevator-modal-glow" />
        </div>

        <div className="elevator-modal-stat-grid">
          <ElevatorStat icon={<Pickaxe size={16} />} label="Места" value={`${props.state.platformSlots}`} />
          <ElevatorStat icon={<Gauge size={16} />} label="Спуск" value={formatSeconds(props.state.dropDurationMs / 1000)} />
          <ElevatorStat icon={<Zap size={16} />} label="Офлайн" value={`x${formatMultiplier(props.state.offlineDamageMultiplier)}`} />
          <ElevatorStat icon={<ShieldCheck size={16} />} label="Надежность" value={`${props.state.stabilityPercent}%`} />
        </div>

        {props.state.nextLevel ? (
          <section className="elevator-modal-next">
            <header>
              <strong>{nextTitle}</strong>
              <span>
                {props.state.platformSlots} → {props.state.nextLevel.platformSlots} мест · x
                {formatMultiplier(props.state.offlineDamageMultiplier)} → x{formatMultiplier(props.state.nextLevel.offlineDamageMultiplier)}
              </span>
            </header>
            <div className="build-cost-list">
              {props.state.costRequirements.map((requirement) => (
                <span className={requirement.ok ? "ok" : "missing"} key={requirement.resourceId}>
                  <ResourceIcon resourceId={requirement.resourceId} size={13} />
                  {formatInteger(Math.min(requirement.available, requirement.required))}/{formatInteger(requirement.required)}
                </span>
              ))}
            </div>
            <button disabled={!props.state.canUpgrade} onClick={props.onUpgrade} type="button">
              {elevatorUpgradeActionLabel(props.state)}
            </button>
          </section>
        ) : (
          <section className="elevator-modal-next complete">
            <strong>Подъемник полностью улучшен</strong>
            <span>Платформа работает на максимальном уровне.</span>
          </section>
        )}
      </section>
    </div>
  );
}

function ElevatorStat(props: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="elevator-modal-stat">
      <span aria-hidden="true">{props.icon}</span>
      <p>{props.label}</p>
      <strong>{props.value}</strong>
    </div>
  );
}

export function MineLoadingState() {
  return (
    <section className="mine-content-loading">
      <span>Загрузка рудника...</span>
    </section>
  );
}

function ForemanTowerButton(props: { assignedCount: number; onOpen: () => void }) {
  return (
    <button className="foreman-tower-button" onClick={props.onOpen} type="button" aria-label="Вышка бригадира">
      <Hammer size={17} />
      <span>{props.assignedCount}/3</span>
    </button>
  );
}

function ForemanTowerModal(props: {
  foremanTower: {
    assignedForemen: GoblinConfig[];
    assignments: ForemanAssignments;
    availableForemen: GoblinConfig[];
    goblinLevels: Record<string, number>;
  };
  labels: Record<string, string>;
  onAssign: (slotIndex: number, goblinId: string | null) => void;
  onClose: () => void;
  onOpenGoblins: () => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState(0);
  const assignedById = new Set(props.foremanTower.assignments.filter((id): id is string => Boolean(id)));

  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section className="foreman-modal" aria-label="Вышка бригадира" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Рудник</p>
            <strong>Вышка бригадира</strong>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <div className="foreman-slot-grid" aria-label="Слоты вышки">
          {props.foremanTower.assignments.map((goblinId, index) => {
            const foreman = goblinId ? props.foremanTower.availableForemen.find((goblin) => goblin.id === goblinId) ?? null : null;

            return (
              <button
                className={selectedSlot === index ? "foreman-slot active" : "foreman-slot"}
                key={index}
                onClick={() => setSelectedSlot(index)}
                type="button"
              >
                {foreman ? (
                  <>
                    <strong>{createGoblinIdentity(foreman, props.labels).name}</strong>
                    <span>{((foreman as { instanceLevel?: number }).instanceLevel ?? props.foremanTower.goblinLevels[foreman.id] ?? 1)} ур.</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>пусто</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="foreman-effect-summary">
          <span>Перестановки: {sumForemanRelocations(props.foremanTower.assignedForemen, props.foremanTower.goblinLevels)}</span>
          <span>Офлайн-урон: x{formatMultiplier(sumForemanDamage(props.foremanTower.assignedForemen, props.foremanTower.goblinLevels))}</span>
          <span>Офлайн-добыча: x{formatMultiplier(sumForemanRewards(props.foremanTower.assignedForemen, props.foremanTower.goblinLevels))}</span>
        </div>

        <div className="foreman-list" aria-label="Купленные бригадиры">
          {props.foremanTower.availableForemen.length > 0 ? (
            props.foremanTower.availableForemen.map((foreman) => {
              const level = props.foremanTower.goblinLevels[foreman.id] ?? 1;
              const identity = createGoblinIdentity(foreman, props.labels);
              const assigned = assignedById.has(foreman.id);

              return (
                <article className={assigned ? "foreman-picker-card assigned" : "foreman-picker-card"} key={foreman.id}>
                  <div>
                    <strong>{identity.fullName}</strong>
                    <span>
                      {getGoblinOfflineRelocationSlots(foreman, level)} перест. · x
                      {formatMultiplier(getGoblinOfflineAutoDamageMultiplier(foreman, level))} урон · x
                      {formatMultiplier(getGoblinOfflineRewardMultiplier(foreman, level))} добыча
                    </span>
                  </div>
                  <button onClick={() => props.onAssign(selectedSlot, foreman.id)} type="button">
                    {assigned ? "переставить" : "назначить"}
                  </button>
                </article>
              );
            })
          ) : (
            <div className="foreman-empty">
              <strong>Бригадиров пока нет</strong>
              <span>Сначала найми бригадира в Хижине, потом назначь его в слот вышки.</span>
              <button onClick={props.onOpenGoblins} type="button">В Хижину</button>
            </div>
          )}
        </div>

        {props.foremanTower.assignments[selectedSlot] ? (
          <button className="foreman-clear-button" onClick={() => props.onAssign(selectedSlot, null)} type="button">
            Снять со слота
          </button>
        ) : null}
      </section>
    </div>
  );
}

function sumForemanRelocations(foremen: GoblinConfig[], levels: Record<string, number>): number {
  return foremen.reduce((total, foreman) => total + getGoblinOfflineRelocationSlots(foreman, levels[foreman.id] ?? 1), 0);
}

function sumForemanDamage(foremen: GoblinConfig[], levels: Record<string, number>): number {
  return foremen.reduce(
    (multiplier, foreman) => multiplier + getGoblinOfflineAutoDamageMultiplier(foreman, levels[foreman.id] ?? 1) - 1,
    1
  );
}

function sumForemanRewards(foremen: GoblinConfig[], levels: Record<string, number>): number {
  return foremen.reduce(
    (multiplier, foreman) => multiplier + getGoblinOfflineRewardMultiplier(foreman, levels[foreman.id] ?? 1) - 1,
    1
  );
}

function formatMultiplier(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/u, "");
}

function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
}

function formatSeconds(value: number): string {
  return `${value.toFixed(2).replace(/\.?0+$/u, "")}с`;
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

function rewardRowsFromMap(
  rewards: Record<string, number>,
  content: ContentBundle,
  labels: Record<string, string>
): MineRunRewardSummary[] {
  return Object.entries(rewards)
    .filter(([, amount]) => amount > 0)
    .sort(([leftResourceId], [rightResourceId]) => leftResourceId.localeCompare(rightResourceId))
    .map(([resourceId, amount]) => {
      const resource = content.resources.find((item) => item.id === resourceId);

      return {
        amount,
        label: resource ? labelFromNameKey(resource.nameKey, resource.id, labels) : resourceId,
        resourceId
      };
    });
}

function resourceClassName(resourceId: string): string {
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

  return "stone";
}

function elevatorUpgradeActionLabel(state: ElevatorProgressionState): string {
  switch (state.failureReason) {
    case null:
      return "Улучшить";
    case "not_enough_resources":
      return "Не хватает ресурсов";
    default:
      return "Максимум";
  }
}

function ResourceIcon(props: { resourceId: string; size: number }) {
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

  return <Mountain size={props.size} />;
}
