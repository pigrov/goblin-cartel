import { Coins, Gem, Hammer, Mountain, Pickaxe, Sparkles, X, Zap } from "lucide-react";
import type { BuiltMineTypeConfig, ContentBundle, GoblinConfig, MineTemplateConfig } from "@goblin-cartel/content-schemas";
import type { BuiltMineState, MiningFoundVein } from "@goblin-cartel/game-core";
import {
  canBuildFoundVein,
  createBuiltMineDashboardState,
  createBuildCostRequirements,
  createBuildCostWithMultiplier,
  countCollectorAssignedMines,
  findAssignableCollector,
  getBuiltMineBuildProgressPercent,
  getBuiltMineBuildRemainingMs,
  getBuiltMineStoragePercent,
  getGoblinAutoCollectSlots,
  hasCollectorSlotAvailable,
  isBuiltMineStorageFull,
  type BuiltMineUpgradePreview,
  type ConstructionSupportState
} from "../builtMineClientState";
import { createGoblinIdentity } from "../goblinHutClientState";

export function BuiltMinesSection(props: {
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

export function CollectorAssignmentModal(props: {
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

function formatMultiplierBonus(value: number): string {
  const percent = Math.round((value - 1) * 100);
  return percent >= 0 ? `+${percent}%` : `${percent}%`;
}

function formatMultiplierReduction(value: number): string {
  const percent = Math.round((1 - value) * 100);
  return percent >= 0 ? `-${percent}% времени` : `+${Math.abs(percent)}% времени`;
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

function resourceLabelById(resourceId: string, labels: Record<string, string>, content: ContentBundle): string {
  const resource = content.resources.find((item) => item.id === resourceId);
  return resource ? labelFromNameKey(resource.nameKey, resource.id, labels) : resourceId;
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

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
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
