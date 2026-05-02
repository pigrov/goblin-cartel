import { useState } from "react";
import { Coins, Gem, Hammer, Mountain, Pickaxe, Sparkles, Users, Warehouse, X, Zap } from "lucide-react";
import type { ContentBundle, GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  calculateCrewAutoDamagePerSecond,
  isGoblinHired,
  type GoblinRosterState
} from "@goblin-cartel/game-core";
import {
  createGoblinHirePreview,
  createGoblinHutRoleTabs,
  createGoblinIdentity,
  createGoblinRoleSummary,
  createGoblinUpgradePreview,
  filterGoblinsByHutRole,
  isMiningGoblin,
  type GoblinHirePreview,
  type GoblinHutProgressionState,
  type GoblinHutRoleTabId,
  type GoblinUpgradePreview
} from "../goblinHutClientState";

export function BaseSection(props: {
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

export function GoblinSection(props: {
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

function isBossCardResourceId(resourceId: string): boolean {
  return resourceId.startsWith("boss_card_");
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
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

function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
}
