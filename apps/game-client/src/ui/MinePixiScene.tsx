import { useEffect, useMemo, useState } from "react";
import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import type { MiningBlockState, MiningSession } from "@goblin-cartel/game-core";
import {
  createMinePixiLayout,
  createVisibleRowRange,
  type MinePixiViewport
} from "./minePixiLayout";
import { type MinePixiHitEffect } from "./minePixiEffects";
import {
  type MinePixiDragState,
  type MinePixiPlatformGoblin
} from "./minePixiPlatform";
import {
  renderMinePixiBackground,
  renderMinePixiDragPreview,
  renderMinePixiHitEffects,
  renderMinePixiMineAndDepth,
  renderMinePixiPlatform,
  renderMinePixiSurface
} from "./minePixiRenderPasses";
import {
  bindMinePixiViewport,
  defaultMinePixiViewport,
  minMinePixiViewportWidth,
  resizeMinePixiRenderer
} from "./minePixiViewport";
import {
  bindMinePixiDragPlacement,
  bindMinePixiPointerInput
} from "./minePixiInput";
import type { MinePixiForemanSlot } from "./minePixiSurface";
import { useMinePixiSceneRuntime } from "./useMinePixiSceneRuntime";

export type { MinePixiHitEffect, MinePixiHitEffectVariant, MinePixiRewardDrop } from "./minePixiEffects";

export interface MinePixiGoblin extends MinePixiPlatformGoblin {
  id: string;
  name: string;
}

export type { MinePixiForemanSlot };

interface MinePixiSceneProps {
  activeCell: {
    row: number;
    col: number;
  };
  blockTypeById: ReadonlyMap<string, BlockTypeConfig>;
  currentPlatformRow: number;
  devOverlayEnabled: boolean;
  depthMarkerLabel: (row: number) => string;
  elevatorLevel: number;
  exposedCellKeys: ReadonlySet<string>;
  foremen: readonly MinePixiForemanSlot[];
  goblins: MinePixiGoblin[];
  hitEffects: MinePixiHitEffect[];
  onBlockHit: (block: MiningBlockState) => void;
  onPlaceGoblin: (goblinId: string, targetCell: { row: number; col: number }) => void;
  platformCellKeys: ReadonlySet<string>;
  platformDropAnimating: boolean;
  session: MiningSession;
}

type DragState = MinePixiDragState;

export function MinePixiScene(props: MinePixiSceneProps) {
  const [sceneViewport, setSceneViewport] = useState<MinePixiViewport>(defaultMinePixiViewport);
  const [viewportWidth, setViewportWidth] = useState(minMinePixiViewportWidth);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const layout = useMemo(
    () => createMinePixiLayout(props.session.mine, viewportWidth, props.currentPlatformRow),
    [props.currentPlatformRow, props.session.mine, viewportWidth]
  );
  const visibleRowRange = useMemo(
    () => createVisibleRowRange(layout, sceneViewport),
    [layout, sceneViewport]
  );
  const runtime = useMinePixiSceneRuntime({
    activeCell: props.activeCell,
    currentPlatformRow: props.currentPlatformRow,
    devOverlayEnabled: props.devOverlayEnabled,
    exposedCellKeys: props.exposedCellKeys,
    onBlockHit: props.onBlockHit,
    onPlaceGoblin: props.onPlaceGoblin,
    platformCellKeys: props.platformCellKeys,
    platformDropAnimating: props.platformDropAnimating,
    session: props.session,
    visibleRowRange
  });

  useEffect(() => {
    const host = runtime.hostRef.current;

    if (!host) {
      return;
    }

    return bindMinePixiViewport({
      host,
      setSceneViewport,
      setViewportWidth
    });
  }, []);

  useEffect(() => {
    const host = runtime.hostRef.current;

    if (!host) {
      return;
    }

    return bindMinePixiPointerInput({
      activeCellRef: runtime.activeCellRef,
      appRef: runtime.appRef,
      currentPlatformRowRef: runtime.currentPlatformRowRef,
      devHitTestLastUpdatedAtRef: runtime.devHitTestLastUpdatedAtRef,
      devOverlayEnabledRef: runtime.devOverlayEnabledRef,
      exposedCellKeysRef: runtime.exposedCellKeysRef,
      host,
      layoutRef: runtime.layoutRef,
      onBlockHitRef: runtime.onBlockHitRef,
      platformCellKeysRef: runtime.platformCellKeysRef,
      sessionBlocksRef: runtime.sessionBlocksRef,
      setDevHitTest: runtime.setDevHitTest,
      touchPanBlockTapUntilRef: runtime.touchPanBlockTapUntilRef,
      touchPanStateRef: runtime.touchPanStateRef
    });
  }, [runtime.readyTick]);

  useEffect(() => {
    return bindMinePixiDragPlacement({
      appRef: runtime.appRef,
      currentPlatformRowRef: runtime.currentPlatformRowRef,
      dragState,
      layoutRef: runtime.layoutRef,
      onPlaceGoblinRef: runtime.onPlaceGoblinRef,
      platformCellKeysRef: runtime.platformCellKeysRef,
      setDragState
    });
  }, [dragState?.goblinId]);

  useEffect(() => {
    const app = runtime.appRef.current;

    if (!app || viewportWidth <= 0) {
      return;
    }

    runtime.layoutRef.current = layout;
    resizeMinePixiRenderer(app, layout);
  }, [layout, runtime.readyTick, viewportWidth]);

  useEffect(() => {
    const layers = runtime.layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiBackground({
      layers,
      layout,
      liftRailRef: runtime.liftRailRef,
      platformAnimationStartedAtRef: runtime.platformAnimationStartedAtRef,
      platformDropAnimatingRef: runtime.platformDropAnimatingRef
    });
  }, [layout, runtime.readyTick]);

  useEffect(() => {
    const layers = runtime.layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiSurface({
      currentPlatformRow: props.currentPlatformRow,
      elevatorLevel: props.elevatorLevel,
      foremen: props.foremen,
      layers,
      layout
    });
  }, [layout, props.currentPlatformRow, props.elevatorLevel, props.foremen, runtime.readyTick]);

  useEffect(() => {
    const layers = runtime.layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiMineAndDepth({
      activeCell: props.activeCell,
      blockNodes: runtime.blockNodesRef.current,
      blockTypeById: props.blockTypeById,
      currentPlatformRow: props.currentPlatformRow,
      depthMarkerLabel: props.depthMarkerLabel,
      depthMarkerNodes: runtime.depthMarkerNodesRef.current,
      exposedCellKeys: props.exposedCellKeys,
      layers,
      layout,
      sessionBlocks: props.session.blocks,
      visibleRowRange
    });
  }, [
    layout,
    props.activeCell,
    props.blockTypeById,
    props.currentPlatformRow,
    props.depthMarkerLabel,
    props.exposedCellKeys,
    props.session.blocks,
    runtime.readyTick,
    visibleRowRange
  ]);

  useEffect(() => {
    const layers = runtime.layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiHitEffects({
      animatedBlockImpactsRef: runtime.animatedBlockImpactsRef,
      animatedHitEffectsRef: runtime.animatedHitEffectsRef,
      blockTypeById: props.blockTypeById,
      hitEffectNodes: runtime.hitEffectNodesRef.current,
      hitEffects: props.hitEffects,
      layers,
      layout,
      sessionBlocks: props.session.blocks,
      visibleRowRange
    });
  }, [layout, props.blockTypeById, props.hitEffects, props.session.blocks, runtime.readyTick, visibleRowRange]);

  useEffect(() => {
    const layers = runtime.layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiPlatform({
      animatedGoblinsRef: runtime.animatedGoblinsRef,
      blocks: props.session.blocks,
      currentPlatformRow: props.currentPlatformRow,
      dragState,
      goblins: props.goblins,
      layers,
      layout,
      mineWidth: props.session.mine.width,
      platformAnimationStartedAtRef: runtime.platformAnimationStartedAtRef,
      platformCellKeys: props.platformCellKeys,
      platformDropAnimatingRef: runtime.platformDropAnimatingRef,
      platformRef: runtime.platformRef,
      setDragState
    });
  }, [
    layout,
    props.currentPlatformRow,
    dragState?.goblinId,
    props.goblins,
    props.platformCellKeys,
    props.platformDropAnimating,
    props.session.blocks,
    props.session.mine.width,
    runtime.readyTick
  ]);

  useEffect(() => {
    const layers = runtime.layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiDragPreview({
      dragState,
      goblins: props.goblins,
      layers,
      layout
    });
  }, [dragState, layout, props.goblins, runtime.readyTick]);

  return (
    <section className="pixi-playfield" ref={runtime.hostRef} aria-label="Игровая область">
      {runtime.readyTick === 0 ? <span className="pixi-loading">Loading...</span> : null}
      {props.devOverlayEnabled && runtime.devStats ? (
        <div className="pixi-dev-overlay" aria-hidden="true">
          <span>FPS {runtime.devStats.fps}</span>
          <span>Rows {runtime.devStats.visibleRows}</span>
          <span>Scroll {runtime.devStats.scrollRow}</span>
          <span>Cells {runtime.devStats.renderedCells}/{runtime.devStats.totalCells}</span>
          <span>Hit {runtime.devHitTest?.cell ?? "-"}</span>
          <span>{runtime.devHitTest?.state ?? "idle"}</span>
          <span>XY {runtime.devHitTest?.point ?? "-"}</span>
          <span>Sel {runtime.devHitTest?.selected ?? "-"}</span>
        </div>
      ) : null}
    </section>
  );
}
