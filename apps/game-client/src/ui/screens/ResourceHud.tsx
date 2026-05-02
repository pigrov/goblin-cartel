import type { ResourceConfig } from "@goblin-cartel/content-schemas";
import { Coins, Gem, Hammer, Menu, Mountain, Pickaxe, Sparkles, Zap } from "lucide-react";

export interface ResourceTooltip {
  id: number;
  label: string;
  resourceId: string;
  value: number;
}

export interface ResourceTooltipPayload {
  label: string;
  resourceId: string;
  value: number;
}

export function ResourceHud(props: {
  displayedResources: ResourceConfig[];
  flashingResourceIds: ReadonlySet<string>;
  labels: Record<string, string>;
  onMenuOpen: () => void;
  onResourceClick: (tooltip: ResourceTooltipPayload) => void;
  onTooltipClose: () => void;
  tooltip: ResourceTooltip | null;
  visibleResourceAmounts: Record<string, number>;
}) {
  return (
    <>
      <header className="resource-bar">
        <div
          className="resource-list"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, props.displayedResources.length)}, minmax(0, 1fr))` }}
        >
          {props.displayedResources.map((resource) => {
            const value = props.visibleResourceAmounts[resource.id] ?? 0;

            return (
              <ResourceChip
                flashing={props.flashingResourceIds.has(resource.id)}
                key={resource.id}
                labels={props.labels}
                onClick={props.onResourceClick}
                resource={resource}
                value={value}
              />
            );
          })}
        </div>
        <button className="icon-button menu-button" onClick={props.onMenuOpen} title="Меню" type="button" aria-label="Меню">
          <Menu size={20} />
        </button>
      </header>

      {props.tooltip ? (
        <button
          className={`resource-tooltip ${resourceClassName(props.tooltip.resourceId)}`}
          key={props.tooltip.id}
          onClick={props.onTooltipClose}
          type="button"
        >
          <ResourceIcon resourceId={props.tooltip.resourceId} size={16} />
          <span>{props.tooltip.label}</span>
          <strong>{formatNumber(props.tooltip.value)}</strong>
        </button>
      ) : null}
    </>
  );
}

function ResourceChip(props: {
  flashing: boolean;
  labels: Record<string, string>;
  onClick: (tooltip: ResourceTooltipPayload) => void;
  resource: ResourceConfig;
  value: number;
}) {
  const label = resourceLabel(props.resource, props.resource.id, props.labels);

  return (
    <button
      aria-label={`${label}: ${formatNumber(props.value)}`}
      className={`resource-chip ${resourceClassName(props.resource.id)}${props.flashing ? " flash" : ""}`}
      onClick={() => props.onClick({ label, resourceId: props.resource.id, value: props.value })}
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

export function isBossCardResourceId(resourceId: string): boolean {
  return resourceId.startsWith("boss_card_");
}

function resourceLabel(resource: ResourceConfig | undefined, fallback: string, labels: Record<string, string>): string {
  if (!resource) {
    return fallback;
  }

  return labelFromNameKey(resource.nameKey, resource.id, labels);
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
