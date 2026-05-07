import type { ContentBundle, GoblinConfig } from "@goblin-cartel/content-schemas";
import { calculateGoblinPrimaryStat, getHiredGoblinCount, type GoblinRosterState } from "@goblin-cartel/game-core";
import { ArrowDownUp, Users } from "lucide-react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ElevatorProgressionState } from "../elevatorState";
import {
  createGoblinHirePreview,
  createGoblinIdentity,
  createGoblinUpgradePreview,
  roleLabel,
  type GoblinHutProgressionState,
  type GoblinHutRoleTabId
} from "../goblinHutClientState";
import { createRuntimeGoblinConfigs, type RuntimeGoblinConfig } from "../goblinRuntimeUnits";
import { assetUrl } from "../assetUrls";
import { GameFullscreenModal } from "../components/GameFullscreenModal";
import goblinDetailsAvatarUrl from "../../assets/goblin-modal/details-avatar.png";

type OwnedGoblinDragState = {
  cardSize: number;
  currentX: number;
  currentY: number;
  dragging: boolean;
  id: string;
  startX: number;
  startY: number;
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
    <section className="base-section">
      <header className="base-section-header">
        <span>База</span>
        <strong>Улучшения</strong>
      </header>

      <div className="base-upgrade-list">
        <div className="base-upgrade-grid">
          <BaseUpgradeCard
            actionLabel={baseUpgradeActionLabel({
              canUpgrade: props.goblinHutProgression.canUpgrade,
              hasNextLevel: Boolean(props.goblinHutProgression.nextLevel),
              title: "Хижину"
            })}
            canUpgrade={props.goblinHutProgression.canUpgrade}
            icon={<Users size={18} />}
            level={`${props.goblinHutProgression.levelNow}/${props.goblinHutProgression.maxLevel}`}
            nextText={
              props.goblinHutProgression.nextLevel
                ? `След. лимит: ${props.goblinHutProgression.nextLevel.maxHiredGoblins}`
                : "Максимальный уровень"
            }
            onUpgrade={props.onUpgradeGoblinHut}
            statLabel="Гоблины"
            statValue={`${props.goblinHutProgression.hiredCount}/${props.goblinHutProgression.maxHiredGoblins}`}
            title="Хижина гоблинов"
          />

          <BaseUpgradeCard
            actionLabel={baseUpgradeActionLabel({
              canUpgrade: props.elevatorProgression.canUpgrade,
              hasNextLevel: Boolean(props.elevatorProgression.nextLevel),
              title: "Подъемник"
            })}
            canUpgrade={props.elevatorProgression.canUpgrade}
            icon={<ArrowDownUp size={18} />}
            level={`${props.elevatorProgression.levelNow}/${props.elevatorProgression.maxLevel}`}
            nextText={
              props.elevatorProgression.nextLevel
                ? `След. мест: ${props.elevatorProgression.nextLevel.platformSlots}`
                : "Максимальный уровень"
            }
            onUpgrade={props.onUpgradeElevator}
            statLabel="Места"
            statValue={`${props.elevatorProgression.platformSlots}`}
            title="Подъемник"
          />
        </div>
      </div>

      {props.message ? <p className="roster-message">{props.message}</p> : null}
    </section>
  );
}

function BaseUpgradeCard(props: {
  actionLabel: string;
  canUpgrade: boolean;
  icon: ReactNode;
  level: string;
  nextText: string;
  onUpgrade: () => void;
  statLabel: string;
  statValue: string;
  title: string;
}) {
  return (
    <article className="base-upgrade-card">
      <header>
        <span className="base-upgrade-icon">{props.icon}</span>
        <div>
          <small>{props.title}</small>
          <strong>{props.level} ур.</strong>
        </div>
      </header>
      <div className="base-upgrade-stat">
        <span>{props.statLabel}</span>
        <strong>{props.statValue}</strong>
      </div>
      <p>{props.nextText}</p>
      <button disabled={!props.canUpgrade} onClick={props.onUpgrade} type="button">
        {props.actionLabel}
      </button>
    </article>
  );
}

function baseUpgradeActionLabel(input: { canUpgrade: boolean; hasNextLevel: boolean; title: string }): string {
  if (!input.hasNextLevel) {
    return "МАКСИМУМ";
  }

  if (!input.canUpgrade) {
    return "НЕ ХВАТАЕТ";
  }

  return `УЛУЧШИТЬ ${input.title}`;
}

export function GoblinSection(props: {
  activeRoleTab: GoblinHutRoleTabId;
  availableGoblins: GoblinConfig[];
  content: ContentBundle;
  hutLevel: number;
  hutLimit: number;
  labels: Record<string, string>;
  onHireGoblin: (goblinId: string) => void;
  onMergeGoblins: (sourceGoblinId: string, targetGoblinId: string) => void;
  onRoleTabChange: (roleTab: GoblinHutRoleTabId) => void;
  onUpgradeGoblin: (goblin: GoblinConfig) => void;
  resources: Record<string, number>;
  roster: GoblinRosterState;
  rosterMessage: string | null;
}) {
  const [selectedGoblinId, setSelectedGoblinId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<OwnedGoblinDragState | null>(null);
  const runtimeGoblins = useMemo(() => createRuntimeGoblinConfigs(props.availableGoblins, props.roster), [props.availableGoblins, props.roster]);
  const selectedGoblin = runtimeGoblins.find((goblin) => goblin.id === selectedGoblinId) ?? null;
  const draggedGoblin = runtimeGoblins.find((goblin) => goblin.id === dragState?.id) ?? null;
  const mergeTargetIds = useMemo(() => {
    if (!draggedGoblin || (draggedGoblin.instanceStars ?? 0) >= 5) {
      return new Set<string>();
    }

    return new Set(runtimeGoblins.filter((goblin) => canMergeOwnedGoblins(draggedGoblin, goblin)).map((goblin) => goblin.id));
  }, [draggedGoblin, runtimeGoblins]);
  const skin = props.content.goblins.skin;
  const screenStyle = {
    "--goblin-roster-background": cssAssetUrl(skin.screenBackground)
  } as CSSProperties;

  function handleOwnedGoblinPointerDown(event: PointerEvent<HTMLButtonElement>, goblin: RuntimeGoblinConfig) {
    const bounds = event.currentTarget.getBoundingClientRect();

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({
      cardSize: Math.max(bounds.width, bounds.height),
      currentX: event.clientX,
      currentY: event.clientY,
      dragging: false,
      id: goblin.id,
      startX: event.clientX,
      startY: event.clientY
    });
  }

  function handleOwnedGoblinPointerMove(event: PointerEvent<HTMLButtonElement>, goblin: RuntimeGoblinConfig) {
    setDragState((current) => {
      if (!current || current.id !== goblin.id) {
        return current;
      }

      const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
      const dragging = current.dragging || distance > 8;

      if (dragging) {
        event.preventDefault();
      }

      return {
        ...current,
        currentX: event.clientX,
        currentY: event.clientY,
        dragging
      };
    });
  }

  function handleOwnedGoblinPointerUp(event: PointerEvent<HTMLButtonElement>, goblin: RuntimeGoblinConfig) {
    const current = dragState;
    setDragState(null);

    if (!current || current.id !== goblin.id) {
      return;
    }

    if (!current.dragging) {
      setSelectedGoblinId(goblin.id);
      return;
    }

    const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-owned-goblin-id]");
    const targetGoblinId = targetElement?.dataset.ownedGoblinId;

    if (targetGoblinId && mergeTargetIds.has(targetGoblinId)) {
      props.onMergeGoblins(current.id, targetGoblinId);
    }
  }

  return (
    <section className="goblin-roster" style={screenStyle}>
      <section className="goblin-contract-panel">
        <header className="goblin-contract-title-plaque" style={{ "--hire-title-plate": cssAssetUrl(skin.titlePlate) } as CSSProperties}>
          <span>НАЙМ ГОБЛИНОВ</span>
        </header>

        <div className="goblin-contract-grid">
          {props.availableGoblins.map((goblin) => (
            <GoblinHireCard
              content={props.content}
              goblin={goblin}
              key={goblin.id}
              labels={props.labels}
              onHire={() => props.onHireGoblin(goblin.id)}
              preview={createGoblinHirePreview({
                builtMinesCount: 0,
                completedMineTemplateIds: [],
                goblin,
                goblinHut: props.content.goblinHut,
                goblins: props.availableGoblins,
                resources: props.resources,
                roster: props.roster
              })}
            />
          ))}
        </div>
      </section>

      <section className="owned-goblins">
        <header className="goblin-contract-title-plaque" style={{ "--hire-title-plate": cssAssetUrl(skin.titlePlate) } as CSSProperties}>
          <span>ВАШИ ГОБЛИНЫ {getHiredGoblinCount(props.roster)}/{props.hutLimit}</span>
        </header>

        <div className="owned-goblin-grid">
          {runtimeGoblins.map((goblin) => {
            const isMergeSource = dragState?.id === goblin.id;
            const isMergeTarget = mergeTargetIds.has(goblin.id);
            const ownedGoblinStyle = {
              "--owned-goblin-card-base": cssAssetUrl(skin.ownedCards.base)
            } as CSSProperties;

            return (
            <button
              className={`owned-goblin ${canUpgradeOwnedGoblin(goblin, props) ? "can-upgrade" : ""} ${isMergeSource ? "merge-source" : ""} ${isMergeTarget ? "merge-target" : ""}`}
              data-owned-goblin-id={goblin.id}
              key={goblin.id}
              onPointerCancel={() => setDragState(null)}
              onPointerDown={(event) => handleOwnedGoblinPointerDown(event, goblin)}
              onPointerMove={(event) => handleOwnedGoblinPointerMove(event, goblin)}
              onPointerUp={(event) => handleOwnedGoblinPointerUp(event, goblin)}
              style={ownedGoblinStyle}
              type="button"
            >
              <span className="owned-goblin-level">{goblin.instanceLevel ?? 1}</span>
              {canUpgradeOwnedGoblin(goblin, props) ? (
                <SkinAssetIcon assetId={skin.ownedCards.upgradeArrow} className="owned-goblin-upgrade" />
              ) : null}
              <SkinAssetIcon assetId={goblin.assetId} className="owned-goblin-render" />
              <OwnedGoblinStars starIconAssetId={skin.ownedCards.starIcon} stars={goblin.instanceStars ?? 0} />
            </button>
            );
          })}
        </div>
      </section>

      {dragState?.dragging && draggedGoblin ? (
        <div
          aria-hidden="true"
          className="owned-goblin owned-goblin-drag-preview"
          style={{
            "--owned-goblin-card-base": cssAssetUrl(skin.ownedCards.base),
            "--owned-goblin-drag-size": `${dragState.cardSize}px`,
            "--owned-goblin-drag-x": `${dragState.currentX}px`,
            "--owned-goblin-drag-y": `${dragState.currentY}px`
          } as CSSProperties}
        >
          <span className="owned-goblin-level">{draggedGoblin.instanceLevel ?? 1}</span>
          {canUpgradeOwnedGoblin(draggedGoblin, props) ? (
            <SkinAssetIcon assetId={skin.ownedCards.upgradeArrow} className="owned-goblin-upgrade" />
          ) : null}
          <SkinAssetIcon assetId={draggedGoblin.assetId} className="owned-goblin-render" />
          <OwnedGoblinStars starIconAssetId={skin.ownedCards.starIcon} stars={draggedGoblin.instanceStars ?? 0} />
        </div>
      ) : null}

      {props.rosterMessage ? <p className="roster-message">{props.rosterMessage}</p> : null}

      {selectedGoblin ? (
        <GoblinDetailsModal
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

function OwnedGoblinStars(props: { starIconAssetId?: string; stars: number }) {
  const stars = Math.max(0, Math.min(5, Math.floor(props.stars)));
  const starIconUrl = assetUrl(props.starIconAssetId);

  if (stars === 0) {
    return null;
  }

  return (
    <span aria-label={`${stars} звезд`} className="owned-goblin-stars">
      {Array.from({ length: stars }, (_, index) => (
        <span aria-hidden="true" className="owned-goblin-star" key={index}>
          <span className="owned-goblin-star-fallback">{"\u2605"}</span>
          {starIconUrl ? (
            <img
              alt=""
              className="owned-goblin-star-icon"
              draggable={false}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
              src={starIconUrl}
            />
          ) : null}
        </span>
      ))}
    </span>
  );
}

function GoblinHireCard(props: {
  content: ContentBundle;
  goblin: GoblinConfig;
  labels: Record<string, string>;
  onHire: () => void;
  preview: ReturnType<typeof createGoblinHirePreview>;
}) {
  const skin = props.content.goblins.skin;
  const identity = createGoblinIdentity(props.goblin, props.labels);
  const primaryStat = calculateGoblinPrimaryStat(props.goblin, 1, 0);
  const goldIcon = props.content.uiIcons.resources.gold ?? "icon_gold_v1";
  const statIcon = props.content.uiIcons.stats[props.goblin.statKey];
  const cost = props.preview.costRequirements.find((item) => item.resourceId === "gold")?.required ?? 0;

  return (
    <article
      className="goblin-contract-card skinned"
      style={
        {
          "--hire-button-disabled": cssAssetUrl(skin.buttons.disabled),
          "--hire-button-hover": cssAssetUrl(skin.buttons.hover),
          "--hire-button-normal": cssAssetUrl(skin.buttons.normal),
          "--hire-button-pressed": cssAssetUrl(skin.buttons.pressed),
          "--hire-card-base": cssAssetUrl(skin.cardBase)
        } as CSSProperties
      }
    >
      <div className="goblin-contract-role">
        <strong>{identity.name}</strong>
      </div>
      <SkinAssetIcon assetId={props.goblin.assetId} className="goblin-contract-render" />
      <div className="goblin-contract-statline primary">
        <small>{props.labels[props.goblin.statNameKey] ?? statLabel(props.goblin.statKey)}</small>
        <span>
          <SkinAssetIcon assetId={statIcon} />
          {primaryStat}
        </span>
      </div>
      <button disabled={!props.preview.canHire} onClick={props.onHire} type="button">
        <span>НАНЯТЬ</span>
        <span className="goblin-contract-button-cost">
          <SkinAssetIcon assetId={goldIcon} />
          {cost}
        </span>
      </button>
    </article>
  );
}

function GoblinDetailsModal(props: {
  content: ContentBundle;
  goblin: RuntimeGoblinConfig;
  labels: Record<string, string>;
  onClose: () => void;
  onUpgrade: () => void;
  resources: Record<string, number>;
  roster: GoblinRosterState;
}) {
  const identity = createGoblinIdentity(props.goblin, props.labels);
  const preview = createGoblinUpgradePreview(props.goblin, props.roster, props.resources, props.content.goblinHut);
  const statName = props.labels[props.goblin.statNameKey] ?? statLabel(props.goblin.statKey);
  const goldIcon = props.content.uiIcons.resources.gold ?? "icon_gold_v1";
  const upgradeCost = preview.costRequirements.find((item) => item.resourceId === "gold");

  return (
    <GameFullscreenModal
      ariaLabel="Информация о гоблине"
      avatarSrc={goblinDetailsAvatarUrl}
      contentClassName="goblin-details-info-content"
      onClose={props.onClose}
      title={roleLabel(props.goblin.role)}
    >
      <header className="goblin-details-info-header">
        <span>{identity.name}</span>
        <strong>{preview.levelNow} ур. · {preview.starsNow} зв.</strong>
      </header>

      <div className="goblin-details-stats">
        <div>
          <span>{statName}</span>
          <strong>{preview.primaryStatNow}</strong>
        </div>
        <div>
          <span>После улучшения</span>
          <strong>{preview.primaryStatAfter}</strong>
        </div>
        <div>
          <span>Звезды</span>
          <strong>{preview.starsNow}/5</strong>
        </div>
      </div>

      <p className="goblin-details-description">{identity.description || "Личный гоблин готов к работе в руднике."}</p>

      <footer className="goblin-details-actions">
        <button className="goblin-details-primary-action" disabled={!preview.canUpgrade} onClick={props.onUpgrade} type="button">
          <span>{goblinUpgradeButtonLabel(preview.failureReason)}</span>
          {upgradeCost ? (
            <small>
              <SkinAssetIcon assetId={goldIcon} />
              {upgradeCost.required}
            </small>
          ) : null}
        </button>
      </footer>
    </GameFullscreenModal>
  );
}

function goblinUpgradeButtonLabel(reason: ReturnType<typeof createGoblinUpgradePreview>["failureReason"]): string {
  switch (reason) {
    case null:
      return "УЛУЧШИТЬ";
    case "max_level":
      return "МАКСИМУМ";
    case "needs_stars":
      return "НУЖНО 5 ЗВЁЗД";
    case "not_enough_resources":
      return "НЕ ХВАТАЕТ ЗОЛОТА";
    default:
      return "НЕДОСТУПНО";
  }
}

function canUpgradeOwnedGoblin(
  goblin: RuntimeGoblinConfig,
  props: {
    content: ContentBundle;
    resources: Record<string, number>;
    roster: GoblinRosterState;
  }
): boolean {
  return createGoblinUpgradePreview(goblin, props.roster, props.resources, props.content.goblinHut).canUpgrade;
}

function canMergeOwnedGoblins(source: RuntimeGoblinConfig, target: RuntimeGoblinConfig): boolean {
  return (
    source.id !== target.id &&
    source.sourceGoblinId === target.sourceGoblinId &&
    (source.instanceLevel ?? 1) === (target.instanceLevel ?? 1) &&
    (source.instanceStars ?? 0) === (target.instanceStars ?? 0) &&
    (source.instanceStars ?? 0) < 5
  );
}

function SkinAssetIcon(props: { assetId: string; className?: string }) {
  const url = assetUrl(props.assetId);

  if (!url) {
    return null;
  }

  return <img alt="" className={["skin-asset-icon", props.className].filter(Boolean).join(" ")} draggable={false} src={url} />;
}

function cssAssetUrl(assetId: string): string {
  const url = assetUrl(assetId);
  return url ? `url("${url}")` : "none";
}

function statLabel(stat: GoblinConfig["statKey"]): string {
  switch (stat) {
    case "control":
      return "Контроль";
    case "power":
      return "Сила";
    case "speed":
      return "Скорость";
  }
}
