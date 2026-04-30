import type { MutableRefObject } from "react";
import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import type { MiningSession } from "@goblin-cartel/game-core";
import { drawSceneBackground, type MinePixiLiftRail } from "./minePixiBackground";
import { reconcileMineBlocks } from "./minePixiBlockReconciliation";
import { reconcileDepthMarkers } from "./minePixiDepthMarkers";
import type { AnimatedHitEffect, MinePixiHitEffect } from "./minePixiEffects";
import { reconcileHitEffects, type MinePixiAnimatedBlockImpact } from "./minePixiHitEffectReconciliation";
import { clearMinePixiLayer, type MinePixiSceneLayers } from "./minePixiApp";
import {
  type MinePixiLayout,
  type MinePixiVisibleRowRange
} from "./minePixiLayout";
import {
  drawDragPreview,
  drawPlatform,
  type MinePixiAnimatedItem,
  type MinePixiDragState,
  type MinePixiPlatformGoblin
} from "./minePixiPlatform";
import type { MinePixiRenderedNode } from "./minePixiRenderNodes";
import { drawLiftCables, drawSurface } from "./minePixiSurface";
import { currentPlatformDropOffset } from "./minePixiTicker";

type AnimatedItemRef = MutableRefObject<MinePixiAnimatedItem | null>;

export function renderMinePixiBackground(input: {
  layers: MinePixiSceneLayers;
  layout: MinePixiLayout;
  liftRailRef: MutableRefObject<MinePixiLiftRail | null>;
  platformAnimationStartedAtRef: MutableRefObject<number>;
  platformDropAnimatingRef: MutableRefObject<boolean>;
}) {
  clearMinePixiLayer(input.layers.background);
  input.liftRailRef.current = drawSceneBackground(input.layers.background, input.layout);
  input.liftRailRef.current.node.scale.y = Math.max(
    0,
    input.liftRailRef.current.baseHeight + currentPlatformDropOffset(
      performance.now(),
      input.platformDropAnimatingRef.current,
      input.platformAnimationStartedAtRef.current
    )
  );
}

export function renderMinePixiSurface(input: {
  currentPlatformRow: number;
  layers: MinePixiSceneLayers;
  layout: MinePixiLayout;
}) {
  clearMinePixiLayer(input.layers.surface);
  drawSurface(input.layers.surface, input.layout, input.currentPlatformRow);
  drawLiftCables(input.layers.surface, input.layout);
}

export function renderMinePixiMineAndDepth(input: {
  activeCell: {
    row: number;
    col: number;
  };
  blockTypeById: ReadonlyMap<string, BlockTypeConfig>;
  currentPlatformRow: number;
  depthMarkerLabel: (row: number) => string;
  depthMarkerNodes: Map<string, MinePixiRenderedNode>;
  exposedCellKeys: ReadonlySet<string>;
  layers: MinePixiSceneLayers;
  layout: MinePixiLayout;
  sessionBlocks: MiningSession["blocks"];
  visibleRowRange: MinePixiVisibleRowRange;
  blockNodes: Map<string, MinePixiRenderedNode>;
}) {
  reconcileMineBlocks({
    activeCell: input.activeCell,
    blockTypeById: input.blockTypeById,
    currentPlatformRow: input.currentPlatformRow,
    exposedCellKeys: input.exposedCellKeys,
    layout: input.layout,
    mineLayer: input.layers.mine,
    renderedBlocks: input.blockNodes,
    sessionBlocks: input.sessionBlocks,
    visibleRowRange: input.visibleRowRange
  });
  reconcileDepthMarkers({
    currentPlatformRow: input.currentPlatformRow,
    depthMarkerLabel: input.depthMarkerLabel,
    layout: input.layout,
    renderedMarkers: input.depthMarkerNodes,
    root: input.layers.markers,
    visibleRowRange: input.visibleRowRange
  });
}

export function renderMinePixiHitEffects(input: {
  animatedBlockImpactsRef: MutableRefObject<Map<number, MinePixiAnimatedBlockImpact>>;
  animatedHitEffectsRef: MutableRefObject<AnimatedHitEffect[]>;
  blockTypeById: ReadonlyMap<string, BlockTypeConfig>;
  hitEffectNodes: Map<string, MinePixiRenderedNode>;
  hitEffects: MinePixiHitEffect[];
  layers: MinePixiSceneLayers;
  layout: MinePixiLayout;
  sessionBlocks: MiningSession["blocks"];
  visibleRowRange: MinePixiVisibleRowRange;
}) {
  reconcileHitEffects({
    animatedBlockImpactsRef: input.animatedBlockImpactsRef,
    animatedHitEffectsRef: input.animatedHitEffectsRef,
    blockTypeById: input.blockTypeById,
    hitEffects: input.hitEffects,
    layout: input.layout,
    renderedEffects: input.hitEffectNodes,
    root: input.layers.effects,
    sessionBlocks: input.sessionBlocks,
    visibleRowRange: input.visibleRowRange
  });
}

export function renderMinePixiPlatform(input: {
  animatedGoblinsRef: MutableRefObject<MinePixiAnimatedItem[]>;
  blocks: MiningSession["blocks"];
  currentPlatformRow: number;
  goblins: MinePixiPlatformGoblin[];
  layers: MinePixiSceneLayers;
  layout: MinePixiLayout;
  mineWidth: number;
  platformAnimationStartedAtRef: MutableRefObject<number>;
  platformCellKeys: ReadonlySet<string>;
  platformDropAnimatingRef: MutableRefObject<boolean>;
  platformRef: AnimatedItemRef;
  setDragState: (state: MinePixiDragState | null) => void;
}) {
  clearMinePixiLayer(input.layers.platform);
  input.animatedGoblinsRef.current = [];
  input.platformRef.current = drawPlatform({
    animatedGoblins: input.animatedGoblinsRef.current,
    blocks: input.blocks,
    currentPlatformRow: input.currentPlatformRow,
    goblins: input.goblins,
    layout: input.layout,
    mineWidth: input.mineWidth,
    platformCellKeys: input.platformCellKeys,
    root: input.layers.platform,
    setDragState: input.setDragState
  });

  const platform = input.platformRef.current;

  if (platform) {
    platform.node.y = platform.baseY + currentPlatformDropOffset(
      performance.now(),
      input.platformDropAnimatingRef.current,
      input.platformAnimationStartedAtRef.current
    );
  }
}

export function renderMinePixiDragPreview(input: {
  dragState: MinePixiDragState | null;
  goblins: MinePixiPlatformGoblin[];
  layers: MinePixiSceneLayers;
  layout: MinePixiLayout;
}) {
  clearMinePixiLayer(input.layers.drag);
  drawDragPreview({
    dragState: input.dragState,
    goblins: input.goblins,
    layout: input.layout,
    root: input.layers.drag
  });
}
