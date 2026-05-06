import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Coins, Gem, Hammer, Mountain, Pickaxe, Sparkles, Users, Warehouse, X, Zap } from "lucide-react";
import type { ContentBundle, GoblinConfig, GoblinGenerationArchetypeConfig } from "@goblin-cartel/content-schemas";
import type { ElevatorProgressionState } from "../elevatorState";
import { calculateGoblinEffectiveBaseStats, type GoblinRosterInstance, type GoblinRosterState } from "@goblin-cartel/game-core";
import {
  createGoblinIdentity,
  createRandomGoblinContractPreview,
  createGoblinUpgradePreview,
  type GoblinHutProgressionState,
  type GoblinHutRoleTabId,
  type RandomGoblinContractPreview,
  type GoblinUpgradePreview
} from "../goblinHutClientState";
import type { RandomGoblinReveal } from "../useGoblinRosterController";
import { createRuntimeGoblinConfigs, type RuntimeGoblinConfig } from "../goblinRuntimeUnits";
import { assetUrl } from "../assetUrls";

type GoblinHireCardSkin = NonNullable<ContentBundle["goblinGeneration"]["hireCardSkin"]>;
type GoblinContractIconAssetIds = {
  resources: Record<string, string>;
  stats: {
    loyalty: string;
    luck: string;
    speed: string;
    strength: string;
  };
};

const defaultGoblinHireCardSkin: GoblinHireCardSkin = {
  buttons: {
    disabled: "ui_hire_button_disabled_v1",
    hover: "ui_hire_button_hover_v1",
    normal: "ui_hire_button_normal_v1",
    pressed: "ui_hire_button_pressed_v1"
  },
  cardBases: {
    common: "ui_hire_card_base_common_v1",
    epic: "ui_hire_card_base_epic_v1",
    legendary: "ui_hire_card_base_legendary_v1",
    rare: "ui_hire_card_base_rare_v1"
  },
  icons: {
    cost: "ui_icon_coin_v1",
    loyalty: "ui_icon_clock_v1",
    luck: "ui_icon_star_v1",
    speed: "ui_icon_boot_v1",
    strength: "ui_icon_pickaxe_v1"
  },
  ownedCards: {
    base: "ui_owned_goblin_card_base_v1",
    upgradeArrow: "ui_owned_goblin_upgrade_arrow_v1"
  },
  pricePills: {
    disabled: "ui_hire_price_disabled_v1",
    normal: "ui_hire_price_normal_v1"
  },
  resourceChipFrame: "ui_resource_chip_frame_v1",
  screenBackground: "ui_goblin_screen_pattern_v1",
  titlePlate: "ui_hire_title_plate_v1"
};

export function BaseSection(props: {
  elevatorProgression: ElevatorProgressionState;
  goblinHutProgression: GoblinHutProgressionState;
  labels: Record<string, string>;
  message: string | null;
  onUpgradeElevator: () => void;
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

        <ElevatorProgressCard
          labels={props.labels}
          onUpgradeElevator={props.onUpgradeElevator}
          state={props.elevatorProgression}
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
              <Gem size={18} />
            </span>
            <div>
              <strong>Знания</strong>
              <span>скоро</span>
            </div>
          </article>
          <article className="base-upgrade-card disabled">
            <span className="base-upgrade-icon">
              <Hammer size={18} />
            </span>
            <div>
              <strong>Мастерская</strong>
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

function ElevatorProgressCard(props: {
  labels: Record<string, string>;
  onUpgradeElevator: () => void;
  state: ElevatorProgressionState;
}) {
  const currentLevelTitle = labelFromNameKey(props.state.currentLevel.nameKey, "Подъемник", props.labels);
  const nextLevelTitle = props.state.nextLevel
    ? labelFromNameKey(props.state.nextLevel.nameKey, "Следующий уровень", props.labels)
    : null;

  return (
    <section className="goblin-hut-progress-card elevator-progress-card">
      <div className="goblin-hut-progress-overview">
        <ElevatorVisual stage={props.state.visualStage} />
        <div className="goblin-hut-progress-copy">
          <span>{currentLevelTitle} · {props.state.levelNow} ур.</span>
          <strong>{props.state.platformSlots} мест на платформе</strong>
        </div>
      </div>
      <div className="goblin-hut-progress-meta">
        <span>
          {props.state.platformSlots} мест · спуск {formatSeconds(props.state.dropDurationMs / 1000)} · офлайн x
          {formatMultiplier(props.state.offlineDamageMultiplier)}
        </span>
        <span>Надежность {props.state.stabilityPercent}%</span>
        {props.state.nextLevel ? <span>{nextLevelTitle}: {props.state.nextLevel.platformSlots} мест</span> : <span>максимум</span>}
      </div>
      {props.state.nextLevel ? (
        <footer>
          <span>Ур. {props.state.nextLevel.level}</span>
          <div className="build-cost-list">
            {props.state.costRequirements.map((requirement) => (
              <span className={requirement.ok ? "ok" : "missing"} key={requirement.resourceId}>
                <ResourceIcon resourceId={requirement.resourceId} size={13} />
                {formatInteger(Math.min(requirement.available, requirement.required))}/{formatInteger(requirement.required)}
              </span>
            ))}
          </div>
          <button disabled={!props.state.canUpgrade} onClick={props.onUpgradeElevator} type="button">
            {elevatorUpgradeActionLabel(props.state)}
          </button>
        </footer>
      ) : (
        <footer>
          <span>Подъемник полностью улучшен</span>
        </footer>
      )}
    </section>
  );
}

export function GoblinSection(props: {
  activeRoleTab: GoblinHutRoleTabId;
  availableGoblins: GoblinConfig[];
  content: ContentBundle;
  hutLevel: number;
  hutLimit: number;
  labels: Record<string, string>;
  onHireRandomGoblin: (archetypeId: string) => void;
  onRandomGoblinRevealClose: () => void;
  onRoleTabChange: (role: GoblinHutRoleTabId) => void;
  onUpgradeGoblin: (goblin: GoblinConfig) => void;
  randomGoblinReveal: RandomGoblinReveal | null;
  resources: Record<string, number>;
  roster: GoblinRosterState;
  rosterMessage: string | null;
}) {
  const runtimeGoblins = createRuntimeGoblinConfigs(props.availableGoblins, props.roster);
  const generation = props.content.goblinGeneration;
  const allContractPreviews = [...generation.archetypes]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((archetype) =>
      createRandomGoblinContractPreview({
        archetype,
        goblinHut: props.content.goblinHut,
        goblins: props.availableGoblins,
        resources: props.resources,
        roster: props.roster
      })
    );
  const allRolledGoblins = runtimeGoblins.filter((goblin) => goblin.id.startsWith("rolled:"));
  const contractPreviews = allContractPreviews;
  const rolledGoblins = allRolledGoblins;
  const skin = createGoblinHireCardSkin(props.content.goblinGeneration);
  const iconAssetIds = createGoblinContractIconAssetIds(props.content, skin);

  return (
    <section className="goblin-roster management-screen" style={createGoblinScreenStyle(skin)} aria-label="Гоблины">
      {contractPreviews.length > 0 ? (
        <GoblinContractPanel
          labels={props.labels}
          onHireRandomGoblin={props.onHireRandomGoblin}
          iconAssetIds={iconAssetIds}
          previews={contractPreviews}
          skin={skin}
        />
      ) : null}

      {rolledGoblins.length > 0 ? (
        <OwnedRandomGoblins
          content={props.content}
          goblins={rolledGoblins}
          hutLimit={props.hutLimit}
          labels={props.labels}
          onUpgradeGoblin={props.onUpgradeGoblin}
          resources={props.resources}
          roster={props.roster}
          skin={skin}
        />
      ) : null}

      {props.rosterMessage ? <p className="roster-message">{props.rosterMessage}</p> : null}
      {props.randomGoblinReveal ? (
        <RandomGoblinRevealModal
          content={props.content}
          labels={props.labels}
          onClose={props.onRandomGoblinRevealClose}
          reveal={props.randomGoblinReveal}
        />
      ) : null}
    </section>
  );
}

function createGoblinHireCardSkin(goblinGeneration: ContentBundle["goblinGeneration"]): GoblinHireCardSkin {
  const skin = goblinGeneration.hireCardSkin as Partial<GoblinHireCardSkin> | undefined;

  return {
    buttons: {
      ...defaultGoblinHireCardSkin.buttons,
      ...(skin?.buttons ?? {})
    },
    cardBases: {
      ...defaultGoblinHireCardSkin.cardBases,
      ...(skin?.cardBases ?? {})
    },
    icons: {
      ...defaultGoblinHireCardSkin.icons,
      ...(skin?.icons ?? {})
    },
    ownedCards: {
      ...defaultGoblinHireCardSkin.ownedCards,
      ...(skin?.ownedCards ?? {})
    },
    pricePills: {
      ...defaultGoblinHireCardSkin.pricePills,
      ...(skin?.pricePills ?? {})
    },
    resourceChipFrame: skin?.resourceChipFrame ?? defaultGoblinHireCardSkin.resourceChipFrame,
    screenBackground: skin?.screenBackground ?? defaultGoblinHireCardSkin.screenBackground,
    titlePlate: skin?.titlePlate ?? defaultGoblinHireCardSkin.titlePlate
  };
}

function createGoblinHireCardStyle(
  skin: GoblinHireCardSkin,
  rarity: GoblinRosterInstance["rarity"]
): CSSProperties {
  return {
    "--hire-button-disabled": cssAssetUrl(skin.buttons.disabled),
    "--hire-button-hover": cssAssetUrl(skin.buttons.hover),
    "--hire-button-normal": cssAssetUrl(skin.buttons.normal),
    "--hire-button-pressed": cssAssetUrl(skin.buttons.pressed),
    "--hire-card-base": cssAssetUrl(skin.cardBases[rarity])
  } as CSSProperties;
}

function createOwnedGoblinCardStyle(skin: GoblinHireCardSkin): CSSProperties {
  return {
    "--owned-goblin-card-base": cssAssetUrl(skin.ownedCards.base)
  } as CSSProperties;
}

function cssAssetUrl(assetId: string): string {
  const url = assetUrl(assetId);
  return url ? `url("${url}")` : "none";
}

function createGoblinScreenStyle(skin: GoblinHireCardSkin): CSSProperties {
  return {
    "--goblin-roster-background": cssAssetUrl(skin.screenBackground)
  } as CSSProperties;
}

function createGoblinHireTitlePlateStyle(skin: GoblinHireCardSkin): CSSProperties {
  return {
    "--hire-title-plate": cssAssetUrl(skin.titlePlate)
  } as CSSProperties;
}

function createGoblinContractIconAssetIds(content: ContentBundle, skin: GoblinHireCardSkin): GoblinContractIconAssetIds {
  const uiIcons = content.uiIcons ?? { resources: {}, stats: {} };

  return {
    resources: Object.fromEntries(
      content.resources.map((resource) => [resource.id, uiIcons.resources[resource.id] ?? resource.iconAssetId])
    ),
    stats: {
      loyalty: uiIcons.stats.loyalty ?? skin.icons.loyalty,
      luck: uiIcons.stats.luck ?? skin.icons.luck,
      speed: uiIcons.stats.speed ?? skin.icons.speed,
      strength: uiIcons.stats.strength ?? skin.icons.strength
    }
  };
}

function contractVisualRarity(goblinClass: GoblinGenerationArchetypeConfig["class"]): GoblinRosterInstance["rarity"] {
  switch (goblinClass) {
    case "foreman":
      return "epic";
    case "builder":
    case "collector":
      return "rare";
    default:
      return "common";
  }
}

type ContractStatKey = keyof GoblinGenerationArchetypeConfig["statRanges"];

function createContractPrimaryStats(
  archetype: GoblinGenerationArchetypeConfig
): Array<{ key: ContractStatKey; label: string; range: { max: number; min: number } }> {
  return contractPrimaryStatKeys(archetype.class).map((key) => ({
    key,
    label: contractStatLabel(key),
    range: archetype.statRanges[key]
  }));
}

function contractPrimaryStatKeys(goblinClass: GoblinGenerationArchetypeConfig["class"]): [ContractStatKey, ContractStatKey] {
  switch (goblinClass) {
    case "collector":
      return ["luck", "speed"];
    case "builder":
    case "foreman":
      return ["loyalty", "speed"];
    default:
      return ["strength", "speed"];
  }
}

function contractStatLabel(stat: ContractStatKey): string {
  switch (stat) {
    case "loyalty":
      return "лояльность";
    case "luck":
      return "удача";
    case "speed":
      return "скорость";
    default:
      return "сила";
  }
}

function contractStatIconAssetId(iconAssetIds: GoblinContractIconAssetIds["stats"], stat: ContractStatKey): string {
  switch (stat) {
    case "loyalty":
      return iconAssetIds.loyalty;
    case "luck":
      return iconAssetIds.luck;
    case "speed":
      return iconAssetIds.speed;
    default:
      return iconAssetIds.strength;
  }
}

function findCostRequirement(
  requirements: RandomGoblinContractPreview["costRequirements"],
  resourceId: string
): RandomGoblinContractPreview["costRequirements"][number] | null {
  return requirements.find((requirement) => requirement.resourceId === resourceId) ?? null;
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

function ElevatorVisual(props: { stage: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className={`elevator-visual stage-${props.stage}`} aria-hidden="true">
      <i className="elevator-rail" />
      <i className="elevator-wheel" />
      <i className="elevator-cable" />
      <i className="elevator-platform" />
      <i className="elevator-brace" />
    </div>
  );
}

function GoblinPortrait(props: { goblin: GoblinConfig; identity: ReturnType<typeof createGoblinIdentity> }) {
  const [renderFailed, setRenderFailed] = useState(false);
  const renderUrl = renderFailed ? null : assetUrl(props.goblin.assetId);

  useEffect(() => {
    setRenderFailed(false);
  }, [props.goblin.assetId]);

  return (
    <div className={`goblin-portrait ${props.goblin.class} ${props.goblin.rarity} ${renderUrl ? "has-render" : ""}`} aria-hidden="true">
      {renderUrl ? (
        <img className="goblin-render" src={renderUrl} alt="" onError={() => setRenderFailed(true)} />
      ) : (
        <>
          <i className="goblin-helmet" />
          <i className="goblin-eye left" />
          <i className="goblin-eye right" />
          <i className="goblin-mouth" />
          <span className="goblin-tool">
            <SpecializationIcon goblin={props.goblin} size={12} />
          </span>
        </>
      )}
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

function SkinAssetIcon(props: { assetId: string; fallback?: ReactNode }) {
  const url = assetUrl(props.assetId);

  if (!url) {
    return props.fallback ?? null;
  }

  return <img className="skin-asset-icon" src={url} alt="" />;
}

function OwnedGoblinUpgradeArrow(props: { skin: GoblinHireCardSkin }) {
  const url = assetUrl(props.skin.ownedCards.upgradeArrow);

  if (!url) {
    return <span aria-hidden="true">↑</span>;
  }

  return <img className="owned-random-goblin-upgrade-arrow" src={url} alt="" />;
}

function HireCostIcon(props: { assetId?: string; resourceId: string }) {
  return <SkinAssetIcon assetId={props.assetId ?? ""} fallback={<ResourceIcon resourceId={props.resourceId} size={13} />} />;
}

function GoblinContractPanel(props: {
  iconAssetIds: GoblinContractIconAssetIds;
  labels: Record<string, string>;
  onHireRandomGoblin: (archetypeId: string) => void;
  previews: RandomGoblinContractPreview[];
  skin: GoblinHireCardSkin;
}) {
  return (
    <section className="goblin-contract-panel" aria-label="Контракты гоблинов">
      <header className="goblin-contract-title-plaque" style={createGoblinHireTitlePlateStyle(props.skin)}>
        <span>НАЙМ ГОБЛИНОВ</span>
      </header>
      <div className="goblin-contract-grid">
        {props.previews.map((preview) => {
          const identity = createGoblinIdentity(preview.goblin, props.labels);
          const primaryStats = createContractPrimaryStats(preview.archetype);
          const goldRequirement = findCostRequirement(preview.costRequirements, "gold");
          const goldAmount = goldRequirement?.required ?? 0;
          const visualRarity = contractVisualRarity(preview.archetype.class);
          const cardStyle = createGoblinHireCardStyle(props.skin, visualRarity);

          return (
            <article
              className={preview.canHire ? `goblin-contract-card skinned ${visualRarity}` : `goblin-contract-card skinned locked ${visualRarity}`}
              key={preview.archetype.id}
              style={cardStyle}
            >
              <div className="goblin-contract-role">
                <strong>{goblinClassLabel(preview.archetype.class)}</strong>
              </div>
              <GoblinPortrait goblin={preview.goblin} identity={identity} />
              <div className="goblin-contract-statline primary" aria-label="Основные характеристики">
                {primaryStats.map((stat) => (
                  <span key={stat.key}>
                    <small>{stat.label}</small>
                    <strong>
                      <SkinAssetIcon assetId={contractStatIconAssetId(props.iconAssetIds.stats, stat.key)} />
                      {formatStatRange(stat.range)}
                    </strong>
                  </span>
                ))}
              </div>
              <button
                aria-label={`${contractActionLabel(preview)} за ${formatInteger(goldAmount)} золота`}
                disabled={!preview.canHire}
                onClick={() => props.onHireRandomGoblin(preview.archetype.id)}
                title={contractActionLabel(preview)}
                type="button"
              >
                <span>НАНЯТЬ</span>
                <span className="goblin-contract-button-cost">
                  <HireCostIcon assetId={props.iconAssetIds.resources.gold} resourceId="gold" />
                  {formatInteger(goldAmount)}
                </span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OwnedRandomGoblins(props: {
  content: ContentBundle;
  goblins: RuntimeGoblinConfig[];
  hutLimit: number;
  labels: Record<string, string>;
  onUpgradeGoblin: (goblin: GoblinConfig) => void;
  resources: Record<string, number>;
  roster: GoblinRosterState;
  skin: GoblinHireCardSkin;
}) {
  const [selectedGoblinId, setSelectedGoblinId] = useState<string | null>(null);
  const selectedGoblin = selectedGoblinId ? props.goblins.find((goblin) => goblin.id === selectedGoblinId) ?? null : null;

  return (
    <section className="owned-random-goblins" aria-label="Нанятые случайные гоблины">
      <header className="goblin-contract-title-plaque" style={createGoblinHireTitlePlateStyle(props.skin)}>
        <span>
          ВАШИ ГОБЛИНЫ {formatInteger(props.goblins.length)}/{formatInteger(props.hutLimit)}
        </span>
      </header>
      <div className="owned-random-goblin-list">
        {props.goblins.map((goblin) => {
          const identity = createGoblinIdentity(goblin, props.labels);
          const preview = createGoblinUpgradePreview(goblin, props.roster, props.resources, props.content.goblinHut);

          return (
            <article
              className={`owned-random-goblin ${goblin.rarity} ${preview.canUpgrade ? "can-upgrade" : ""}`}
              key={goblin.id}
              onClick={() => setSelectedGoblinId(goblin.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedGoblinId(goblin.id);
                }
              }}
              role="button"
              style={createOwnedGoblinCardStyle(props.skin)}
              tabIndex={0}
            >
              <span className="owned-random-goblin-level">{formatInteger(preview.levelNow)}</span>
              {preview.canUpgrade ? (
                <button
                  aria-label={`Улучшить ${identity.fullName}`}
                  className="owned-random-goblin-upgrade"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onUpgradeGoblin(goblin);
                  }}
                  title="Улучшить"
                  type="button"
                >
                  <OwnedGoblinUpgradeArrow skin={props.skin} />
                </button>
              ) : null}
              <GoblinPortrait goblin={goblin} identity={{ ...identity, name: goblin.instanceName ?? identity.name }} />
            </article>
          );
        })}
      </div>
      {selectedGoblin ? (
        <RandomGoblinDetailsModal
          content={props.content}
          goblin={selectedGoblin}
          labels={props.labels}
          onClose={() => setSelectedGoblinId(null)}
          onUpgrade={() => props.onUpgradeGoblin(selectedGoblin)}
          resources={props.resources}
          roster={props.roster}
        />
      ) : null}
    </section>
  );
}

function RandomGoblinDetailsModal(props: {
  content: ContentBundle;
  goblin: RuntimeGoblinConfig;
  labels: Record<string, string>;
  onClose: () => void;
  onUpgrade: () => void;
  resources: Record<string, number>;
  roster: GoblinRosterState;
}) {
  const identity = createGoblinIdentity(props.goblin, props.labels);
  const nameParts = runtimeGoblinNameParts(props.goblin, props.labels);
  const name = nameParts.fullName;
  const preview = createGoblinUpgradePreview(props.goblin, props.roster, props.resources, props.content.goblinHut);
  const statsNow = calculateGoblinEffectiveBaseStats(props.goblin, preview.levelNow, props.goblin.baseStats);
  const statsAfter = calculateGoblinEffectiveBaseStats(props.goblin, preview.levelAfter, props.goblin.baseStats);
  const archetype =
    props.content.goblinGeneration.archetypes.find(
      (item) => item.id === (props.goblin.sourceArchetypeId ?? props.goblin.id) && item.class === props.goblin.class
    ) ?? null;
  const equipmentSlots = archetype?.equipmentSlots ?? ["tool"];
  const traits = props.goblin.instanceTraits ?? [];

  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section
        className={`goblin-modal random-goblin-details ${props.goblin.rarity}`}
        aria-label={name}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p>{rarityLabel(props.goblin.rarity)} · {goblinClassLabel(props.goblin.class)}</p>
            <strong>{nameParts.name}</strong>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <div className="random-goblin-details-hero">
          <div className="random-goblin-details-portrait">
            <GoblinPortrait goblin={props.goblin} identity={{ ...identity, name: props.goblin.instanceName ?? identity.name }} />
          </div>
          <div className="random-goblin-details-title">
            <span>{nameParts.nickname || collectorSpecializationLabel(props.goblin)}</span>
            <strong>{name}</strong>
            <p>{identity.description}</p>
            <div className="random-goblin-details-badges">
              <span>
                <SpecializationIcon goblin={props.goblin} size={13} />
                {collectorSpecializationLabel(props.goblin)}
              </span>
              <span>ур. {preview.levelNow}/{preview.maxLevel}</span>
            </div>
          </div>
        </div>

        <section className="random-goblin-level-panel">
          <div>
            <span>Текущий вклад</span>
            <strong>{preview.damagePerSecondNow}/сек</strong>
          </div>
          <div>
            <span>После улучшения</span>
            <strong>{preview.levelAfter !== preview.levelNow ? `${preview.damagePerSecondAfter}/сек` : "макс."}</strong>
          </div>
          <div className="build-cost-list">
            {preview.costRequirements.length > 0 ? (
              preview.costRequirements.map((requirement) => (
                <span className={requirement.ok ? "ok" : "missing"} key={requirement.resourceId}>
                  <ResourceIcon resourceId={requirement.resourceId} size={13} />
                  {formatInteger(Math.min(requirement.available, requirement.required))}/{formatInteger(requirement.required)}
                </span>
              ))
            ) : (
              <span className="ok">максимальный уровень</span>
            )}
          </div>
        </section>

        <section className="goblin-modal-block random-goblin-stat-section">
          <header>
            <strong>Характеристики</strong>
            <span>{preview.levelAfter !== preview.levelNow ? "следующий уровень" : "текущий уровень"}</span>
          </header>
          <div className="goblin-modal-stats random-goblin-level-stats">
            <GoblinStatMeter after={statsAfter.strength} before={statsNow.strength} label="Сила" />
            <GoblinStatMeter after={statsAfter.speed} before={statsNow.speed} label="Скорость" />
            <GoblinStatMeter after={statsAfter.luck} before={statsNow.luck} label="Удача" />
            <GoblinStatMeter after={statsAfter.loyalty} before={statsNow.loyalty} label="Лояльность" />
          </div>
        </section>

        <section className="goblin-modal-block random-goblin-profile">
          <header>
            <strong>Профиль</strong>
            <span>{goblinClassLabel(props.goblin.class)}</span>
          </header>
          <div className="random-goblin-profile-grid">
            <div>
              <span>Редкость</span>
              <strong>{rarityLabel(props.goblin.rarity)}</strong>
            </div>
            <div>
              <span>Специализация</span>
              <strong>{collectorSpecializationLabel(props.goblin)}</strong>
            </div>
          </div>
        </section>

        <section className="goblin-modal-block">
          <header>
            <strong>Особенности</strong>
            <span>{traits.length}</span>
          </header>
          <div className="random-goblin-traits">
            {traits.length > 0 ? traits.map((trait) => <span key={trait.id}>{traitLabel(trait.id, props.labels)}</span>) : <span>без особенностей</span>}
          </div>
        </section>

        <section className="goblin-modal-block">
          <header>
            <strong>Предметы</strong>
            <span>{equipmentSlots.length}</span>
          </header>
          <div className="random-goblin-equipment-slots">
            {equipmentSlots.map((slot) => (
              <span key={slot}>{equipmentSlotLabel(slot)}</span>
            ))}
          </div>
        </section>

        <footer>
          <span>{randomGoblinUpgradeActionLabel(preview)}</span>
          <button disabled={!preview.canUpgrade} onClick={props.onUpgrade} type="button">
            Улучшить
          </button>
        </footer>
      </section>
    </div>
  );
}

function GoblinStatMeter(props: { after: number; before: number; label: string }) {
  const ceiling = Math.max(20, props.after, props.before);
  const fillPercent = Math.max(12, Math.min(100, Math.round((props.before / ceiling) * 100)));
  const delta = Math.max(0, props.after - props.before);

  return (
    <div className="goblin-stat-meter" style={{ "--stat-fill": `${fillPercent}%` } as CSSProperties}>
      <header>
        <span>{props.label}</span>
        <strong>{formatInteger(props.before)}</strong>
        {delta > 0 ? <small>+{formatInteger(delta)}</small> : null}
      </header>
      <i aria-hidden="true">
        <span />
      </i>
    </div>
  );
}

function RandomGoblinRevealModal(props: {
  content: ContentBundle;
  labels: Record<string, string>;
  onClose: () => void;
  reveal: RandomGoblinReveal;
}) {
  const archetype = props.content.goblinGeneration.archetypes.find((item) => item.id === props.reveal.archetypeId) ?? null;
  const identity = createGoblinIdentity(props.reveal.goblin, props.labels);
  const name = randomGoblinDisplayName(props.reveal.instance, props.reveal.goblin, props.labels);
  const equipmentSlots = archetype?.equipmentSlots ?? ["tool"];

  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section
        className={`random-goblin-reveal goblin-modal ${props.reveal.instance.rarity}`}
        aria-label={`Нанят ${name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p>{archetype ? labelFromNameKey(archetype.nameKey, archetype.id, props.labels) : "Контракт"}</p>
            <strong>Контракт раскрыт</strong>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <div className="random-goblin-reveal-hero">
          <div className="random-goblin-reveal-portrait">
            <GoblinPortrait goblin={props.reveal.goblin} identity={{ ...identity, name: props.reveal.instance.name ?? identity.name }} />
          </div>
          <div className="random-goblin-reveal-title">
            <span className={`random-goblin-reveal-rarity ${props.reveal.instance.rarity}`}>
              {rarityLabel(props.reveal.instance.rarity)}
            </span>
            <strong>{name}</strong>
            <p>{identity.description}</p>
            <div className="random-goblin-details-badges">
              <span>
                <SpecializationIcon goblin={props.reveal.goblin} size={13} />
                {collectorSpecializationLabel(props.reveal.goblin)}
              </span>
              <span>{goblinClassLabel(props.reveal.instance.class)}</span>
            </div>
          </div>
        </div>

        <section className="goblin-modal-block random-goblin-stat-section">
          <header>
            <strong>Характеристики</strong>
            <span>стартовые</span>
          </header>
          <div className="goblin-modal-stats random-goblin-level-stats">
            <GoblinStatMeter
              after={props.reveal.instance.rolledStats.strength}
              before={props.reveal.instance.rolledStats.strength}
              label="Сила"
            />
            <GoblinStatMeter
              after={props.reveal.instance.rolledStats.speed}
              before={props.reveal.instance.rolledStats.speed}
              label="Скорость"
            />
            <GoblinStatMeter after={props.reveal.instance.rolledStats.luck} before={props.reveal.instance.rolledStats.luck} label="Удача" />
            <GoblinStatMeter
              after={props.reveal.instance.rolledStats.loyalty}
              before={props.reveal.instance.rolledStats.loyalty}
              label="Лояльность"
            />
          </div>
        </section>

        <section className="goblin-modal-block">
          <header>
            <strong>Особенности</strong>
            <span>{props.reveal.instance.traits.length || 0}</span>
          </header>
          <div className="random-goblin-traits">
            {props.reveal.instance.traits.length > 0 ? (
              props.reveal.instance.traits.map((trait) => <span key={trait.id}>{traitLabel(trait.id, props.labels)}</span>)
            ) : (
              <span>без особенностей</span>
            )}
          </div>
        </section>

        <section className="goblin-modal-block">
          <header>
            <strong>Предметы</strong>
            <span>{equipmentSlots.length}</span>
          </header>
          <div className="random-goblin-equipment-slots">
            {equipmentSlots.map((slot) => (
              <span key={slot}>{equipmentSlotLabel(slot)}</span>
            ))}
          </div>
        </section>

        <footer>
          <span>Гоблин добавлен в Хижину</span>
          <button onClick={props.onClose} type="button">
            В бригаду
          </button>
        </footer>
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

function contractActionLabel(preview: RandomGoblinContractPreview): string {
  switch (preview.failureReason) {
    case null:
      return "Нанять";
    case "hut_limit":
      return "Лимит";
    case "missing_archetype":
      return "Не настроен";
    case "not_enough_resources":
      return "Нет ресурсов";
    case "role_locked":
      return "Роль закрыта";
    default:
      return "Закрыто";
  }
}

function randomGoblinDisplayName(instance: GoblinRosterInstance, archetype: GoblinConfig | null | undefined, labels: Record<string, string>): string {
  const fallback = archetype ? createGoblinIdentity(archetype, labels).name : instance.archetypeId;
  return [instance.name ?? fallback, instance.nickname].filter(Boolean).join(" ");
}

function runtimeGoblinNameParts(
  goblin: RuntimeGoblinConfig,
  labels: Record<string, string>
): { fullName: string; name: string; nickname: string } {
  const identity = createGoblinIdentity(goblin, labels);
  const name = goblin.instanceName?.trim() || identity.name;
  const nickname = goblin.instanceNickname?.trim() || identity.nickname;
  return {
    fullName: nickname ? `${name} ${nickname}` : name,
    name,
    nickname
  };
}

function randomGoblinUpgradeActionLabel(preview: GoblinUpgradePreview): string {
  if (preview.failureReason === "max_level") {
    return "Макс.";
  }

  return preview.canUpgrade ? "Улучшить" : "Нет золота";
}

function rarityLabel(rarity: GoblinRosterInstance["rarity"]): string {
  switch (rarity) {
    case "rare":
      return "Редкий";
    case "epic":
      return "Эпический";
    case "legendary":
      return "Легендарный";
    default:
      return "Обычный";
  }
}

function formatStatRange(range: { max: number; min: number }): string {
  return range.min === range.max ? formatInteger(range.min) : `${formatInteger(range.min)}-${formatInteger(range.max)}`;
}

function traitLabel(traitId: string, labels: Record<string, string>): string {
  return labels[`goblin_trait.${traitId}.name`] ?? traitId;
}

function equipmentSlotLabel(slot: string): string {
  switch (slot) {
    case "ledger":
      return "книга";
    case "tool":
      return "инструмент";
    case "whistle":
      return "свисток";
    default:
      return slot;
  }
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

function elevatorUpgradeActionLabel(state: ElevatorProgressionState): string {
  switch (state.failureReason) {
    case null:
      return "Улучшить";
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

function formatMultiplier(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/u, "");
}

function formatSeconds(value: number): string {
  return `${value.toFixed(2).replace(/\.?0+$/u, "")}с`;
}

function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
}
