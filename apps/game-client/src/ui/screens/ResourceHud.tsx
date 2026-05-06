import type { ResourceConfig } from "@goblin-cartel/content-schemas";
import { Gem, Hammer, Mountain, Sparkles, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import { assetUrl } from "../assetUrls";
import resourceBarFrameUrl from "../../assets/goblin-modal/details-top.png";
import settingsIconImageUrl from "../../assets/ui/icon-settings.png";

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
  resourceChipFrameAssetId: string;
  resourceIconAssetIds: Record<string, string>;
  settingsButtonFrameAssetId: string;
  settingsIconAssetId: string;
  tooltip: ResourceTooltip | null;
  visibleResourceAmounts: Record<string, number>;
}) {
  const resourceById = new Map(props.displayedResources.map((resource) => [resource.id, resource]));
  const style = {
    "--resource-bar-frame": `url("${resourceBarFrameUrl}")`,
    "--resource-chip-frame": cssAssetUrl(props.resourceChipFrameAssetId),
    "--settings-button-frame": cssAssetUrl(props.settingsButtonFrameAssetId),
    "--settings-button-icon": `url("${settingsIconImageUrl}")`
  } as CSSProperties;

  return (
    <>
      <header className="resource-bar" style={style}>
        <div
          className="resource-list"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, props.displayedResources.length)}, minmax(0, 1fr))` }}
        >
          {props.displayedResources.map((resource) => {
            const value = props.visibleResourceAmounts[resource.id] ?? 0;

            return (
              <ResourceChip
                assetId={props.resourceIconAssetIds[resource.id]}
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
          <span aria-hidden="true" className="settings-button-icon" />
        </button>
      </header>

      {props.tooltip ? (
        <button
          className={`resource-tooltip ${resourceClassName(props.tooltip.resourceId)}`}
          key={props.tooltip.id}
          onClick={props.onTooltipClose}
          type="button"
        >
          <ResourceIcon
            assetId={props.resourceIconAssetIds[props.tooltip.resourceId]}
            resource={resourceById.get(props.tooltip.resourceId)}
            resourceId={props.tooltip.resourceId}
            size={16}
          />
          <span>{props.tooltip.label}</span>
          <strong>{formatNumber(props.tooltip.value)}</strong>
        </button>
      ) : null}
    </>
  );
}

function ResourceChip(props: {
  assetId?: string;
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
      <ResourceIcon assetId={props.assetId ?? props.resource.iconAssetId} resource={props.resource} resourceId={props.resource.id} size={24} />
      <strong>{formatNumber(props.value)}</strong>
    </button>
  );
}

function ResourceIcon(props: { assetId?: string; resource?: ResourceConfig; resourceId: string; size: number }) {
  if (isBossCardResourceId(props.resourceId)) {
    return <BossCardResourceIcon resourceId={props.resourceId} size={props.size} />;
  }

  const iconUrl = assetUrl(props.assetId ?? props.resource?.iconAssetId);
  if (iconUrl) {
    return <img alt="" className="resource-icon-asset" src={iconUrl} style={{ height: props.size, width: props.size }} />;
  }

  if (props.resourceId.includes("elixir")) {
    return <Zap size={props.size} />;
  }

  if (props.resourceId.includes("copper")) {
    return <Gem size={props.size} />;
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

function cssAssetUrl(assetId: string): string {
  const url = assetUrl(assetId);
  return url ? `url("${url}")` : "none";
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
