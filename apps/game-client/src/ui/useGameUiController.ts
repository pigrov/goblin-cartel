import { type ContentBundle } from "@goblin-cartel/content-schemas";
import { useEffect, useMemo, useRef, useState } from "react";
import { destroyedHitEffectDurationMs } from "./minePixiEffects";
import { isBossCardResourceId, type ResourceTooltip, type ResourceTooltipPayload } from "./screens/ResourceHud";
import { useDelayedResourceDisplay } from "./useDelayedResourceDisplay";

const resourceRewardSettleDelayMs = destroyedHitEffectDurationMs;
const resourceFlashMs = 620;
const resourceTooltipLifetimeMs = 3000;

export function useGameUiController(input: {
  content: ContentBundle;
  initialResources: Record<string, number>;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pixiDevOverlayEnabled, setPixiDevOverlayEnabled] = useState(false);
  const [resourceTooltip, setResourceTooltip] = useState<ResourceTooltip | null>(null);
  const {
    flashingResourceIds,
    scheduleResourceRewardDisplay,
    syncVisibleResourceAmounts,
    visibleResourceAmounts
  } = useDelayedResourceDisplay({
    flashMs: resourceFlashMs,
    initialResources: input.initialResources,
    rewardSettleDelayMs: resourceRewardSettleDelayMs
  });
  const tooltipSequenceRef = useRef(0);
  const displayedResources = useMemo(
    () =>
      input.content.resources
        .filter((resource) => !["boss_energy", "copper_ore", "elixir"].includes(resource.id) && !isBossCardResourceId(resource.id))
        .slice(0, 5),
    [input.content.resources]
  );

  useEffect(() => {
    if (!resourceTooltip) {
      return;
    }

    const timeoutId = window.setTimeout(() => setResourceTooltip(null), resourceTooltipLifetimeMs);

    return () => window.clearTimeout(timeoutId);
  }, [resourceTooltip]);

  function showResourceTooltip(tooltip: ResourceTooltipPayload) {
    setResourceTooltip({
      id: ++tooltipSequenceRef.current,
      ...tooltip
    });
  }

  return {
    displayedResources,
    flashingResourceIds,
    pixiDevOverlayEnabled,
    resourceTooltip,
    scheduleResourceRewardDisplay,
    setPixiDevOverlayEnabled,
    setResourceTooltip,
    setSettingsOpen,
    settingsOpen,
    showResourceTooltip,
    syncVisibleResourceAmounts,
    visibleResourceAmounts
  };
}
