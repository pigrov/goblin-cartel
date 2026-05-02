import type { Application } from "pixi.js";
import type { MutableRefObject } from "react";
import { animateHitEffects, type AnimatedHitEffect } from "./minePixiEffects";
import type { MinePixiLayout, MinePixiVisibleRowRange } from "./minePixiLayout";
import type { MinePixiAnimatedItem } from "./minePixiPlatform";
import type { MinePixiAnimatedBlockImpact } from "./minePixiHitEffectReconciliation";
import type { MinePixiRenderedNode } from "./minePixiRenderNodes";
import type { MinePixiLiftRail } from "./minePixiBackground";

export interface PixiDevStats {
  fps: number;
  renderedCells: number;
  scrollRow: number;
  totalCells: number;
  visibleRows: string;
}

export const platformDropDurationMs = 1450;
const platformDropHoldProgress = 0.12;

export function runMinePixiTickerFrame(input: {
  animatedBlockImpacts: Map<number, MinePixiAnimatedBlockImpact>;
  animatedGoblins: MinePixiAnimatedItem[];
  animatedHitEffects: AnimatedHitEffect[];
  app: Application;
  blockNodes: ReadonlyMap<string, MinePixiRenderedNode>;
  devOverlayEnabledRef: MutableRefObject<boolean>;
  devStatsLastUpdatedAtRef: MutableRefObject<number>;
  host: HTMLDivElement | null;
  layout: MinePixiLayout | null;
  liftRail: MinePixiLiftRail | null;
  now: number;
  platform: MinePixiAnimatedItem | null;
  platformAnimationStartedAt: number;
  platformDropDurationMs: number;
  platformDropAnimating: boolean;
  setDevStats: (stats: PixiDevStats) => void;
  totalCells: number;
  visibleRowRange: MinePixiVisibleRowRange;
}) {
  const platformOffset = currentPlatformDropOffset(
    input.now,
    input.platformDropAnimating,
    input.platformAnimationStartedAt,
    input.platformDropDurationMs
  );
  const platformDropProgress = currentPlatformDropProgress(
    input.now,
    input.platformDropAnimating,
    input.platformAnimationStartedAt,
    input.platformDropDurationMs
  );
  const platformDropActive = input.platformDropAnimating && platformDropProgress > 0;

  if (input.platform) {
    input.platform.node.y = input.platform.baseY + platformOffset;
    input.platform.node.x = platformDropActive
      ? Math.sin(input.now / 55) * (1.2 + (1 - platformDropProgress) * 0.7)
      : 0;

    if (input.platform.dropEffects) {
      const pulse = Math.sin(platformDropProgress * Math.PI);
      input.platform.dropEffects.visible = platformDropActive && pulse > 0;
      input.platform.dropEffects.alpha = platformDropActive ? Math.max(0, pulse) * 0.95 : 0;
      input.platform.dropEffects.y = Math.sin(input.now / 70) * 2;
      input.platform.dropEffects.x = Math.sin(input.now / 35) * 1.5;
    }

    for (const cable of input.platform.cableNodes ?? []) {
      cable.rotation = platformDropActive
        ? Math.sin(input.now / 64 + cable.x * 0.07) * 0.018 * (1 - platformDropProgress * 0.35)
        : 0;
    }
  }

  if (input.liftRail) {
    input.liftRail.node.scale.y = Math.max(0, input.liftRail.baseHeight + platformOffset);
  }

  for (const item of input.animatedGoblins) {
    const drillOffset = item.working
      ? Math.sin(input.now / 48 + item.phase) * 1.8
      : Math.sin(input.now / 420 + item.phase) * 0.5;
    item.node.y = item.baseY + drillOffset;
    item.node.rotation = item.working ? Math.sin(input.now / 70 + item.phase) * 0.035 : 0;
  }

  animateBlockImpacts(input.now, input.animatedBlockImpacts, input.blockNodes);
  animateHitEffects(input.now, input.animatedHitEffects);
  updatePixiDevStats(input);
}

export function currentPlatformDropOffset(now: number, animating: boolean, startedAt: number, durationMs = platformDropDurationMs): number {
  const elapsed = now - startedAt;
  const duration = normalizePlatformDropDurationMs(durationMs);

  if (!animating || elapsed < 0 || elapsed >= duration) {
    return 0;
  }

  return platformDropOffset(elapsed / duration);
}

export function currentPlatformDropProgress(now: number, animating: boolean, startedAt: number, durationMs = platformDropDurationMs): number {
  const elapsed = now - startedAt;
  const duration = normalizePlatformDropDurationMs(durationMs);

  if (!animating || elapsed < 0 || elapsed >= duration) {
    return 0;
  }

  return clamp01(elapsed / duration);
}

function updatePixiDevStats(input: {
  app: Application;
  blockNodes: ReadonlyMap<string, MinePixiRenderedNode>;
  devOverlayEnabledRef: MutableRefObject<boolean>;
  devStatsLastUpdatedAtRef: MutableRefObject<number>;
  host: HTMLDivElement | null;
  layout: MinePixiLayout | null;
  now: number;
  setDevStats: (stats: PixiDevStats) => void;
  totalCells: number;
  visibleRowRange: MinePixiVisibleRowRange;
}) {
  if (!input.devOverlayEnabledRef.current || !input.layout || input.now - input.devStatsLastUpdatedAtRef.current < 350) {
    return;
  }

  input.devStatsLastUpdatedAtRef.current = input.now;
  const scrollTop = Math.max(0, input.host?.scrollTop ?? 0);
  const scrollRow = Math.max(0, Math.floor(Math.max(0, scrollTop - input.layout.gridY) / input.layout.rowStep));
  const ticker = input.app.ticker as { FPS?: number };

  input.setDevStats({
    fps: Math.round(ticker.FPS ?? 0),
    renderedCells: input.blockNodes.size,
    scrollRow,
    totalCells: input.totalCells,
    visibleRows: `${input.visibleRowRange.startRow}-${input.visibleRowRange.endRow}`
  });
}

function animateBlockImpacts(
  now: number,
  impacts: Map<number, MinePixiAnimatedBlockImpact>,
  renderedBlocks: ReadonlyMap<string, MinePixiRenderedNode>
) {
  for (const renderedBlock of renderedBlocks.values()) {
    if (typeof renderedBlock.baseX === "number" && typeof renderedBlock.baseY === "number") {
      renderedBlock.node.position.set(renderedBlock.baseX, renderedBlock.baseY);
    }
  }

  for (const [id, impact] of impacts) {
    const elapsed = now - impact.startedAt;

    if (elapsed >= impact.duration) {
      impacts.delete(id);
      continue;
    }

    const renderedBlock = renderedBlocks.get(impact.cellKey);

    if (!renderedBlock || typeof renderedBlock.baseX !== "number" || typeof renderedBlock.baseY !== "number") {
      continue;
    }

    const progress = clamp01(elapsed / impact.duration);
    const strength = (impact.variant === "critical" ? 1.55 : impact.variant === "goblin" ? 0.72 : 1) * (impact.destroyed ? 1.18 : 1);
    const fade = 1 - progress;
    const x = Math.sin(progress * Math.PI * 9) * fade * 3.4 * strength;
    const y = Math.abs(Math.sin(progress * Math.PI * 4.5)) * fade * 2.2 * strength;
    renderedBlock.node.position.set(renderedBlock.baseX + x, renderedBlock.baseY + y);
  }
}

function platformDropOffset(progress: number): number {
  if (progress <= platformDropHoldProgress) {
    return -30;
  }

  if (progress >= 1) {
    return 0;
  }

  const activeProgress = (progress - platformDropHoldProgress) / (1 - platformDropHoldProgress);
  const eased = activeProgress < 0.5
    ? 4 * activeProgress * activeProgress * activeProgress
    : 1 - Math.pow(-2 * activeProgress + 2, 3) / 2;
  return -30 * (1 - eased);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizePlatformDropDurationMs(value: number): number {
  if (!Number.isFinite(value)) {
    return platformDropDurationMs;
  }

  return Math.max(500, Math.min(2500, Math.floor(value)));
}
