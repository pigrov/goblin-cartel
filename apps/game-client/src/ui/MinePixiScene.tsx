import { Rectangle, type Application } from "pixi.js";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import type { MiningBlockState, MiningSession } from "@goblin-cartel/game-core";
import {
  createMinePixiLayout,
  createVisibleRowRange,
  type MinePixiLayout,
  type MinePixiViewport,
  type MinePixiVisibleRowRange
} from "./minePixiLayout";
import {
  type AnimatedHitEffect,
  type MinePixiHitEffect
} from "./minePixiEffects";
import { reconcileMineBlocks } from "./minePixiBlockReconciliation";
import { drawSceneBackground, type MinePixiLiftRail } from "./minePixiBackground";
import { reconcileDepthMarkers } from "./minePixiDepthMarkers";
import { reconcileHitEffects, type MinePixiAnimatedBlockImpact } from "./minePixiHitEffectReconciliation";
import {
  clearMinePixiLayer,
  createMinePixiApp,
  type MinePixiAppHandle,
  type MinePixiSceneLayers
} from "./minePixiApp";
import {
  drawDragPreview,
  drawPlatform,
  type MinePixiAnimatedItem,
  type MinePixiDragState
} from "./minePixiPlatform";
import type { MinePixiRenderedNode } from "./minePixiRenderNodes";
import { drawLiftCables, drawSurface } from "./minePixiSurface";
import { currentPlatformDropOffset, runMinePixiTickerFrame, type PixiDevStats } from "./minePixiTicker";
import {
  bindMinePixiDragPlacement,
  bindMinePixiPointerInput,
  type MinePixiTouchPanState,
  type PixiDevHitTest
} from "./minePixiInput";

export type { MinePixiHitEffect, MinePixiHitEffectVariant, MinePixiRewardDrop } from "./minePixiEffects";

export interface MinePixiGoblin {
  id: string;
  name: string;
  col: number;
  working: boolean;
}

interface MinePixiSceneProps {
  activeCell: {
    row: number;
    col: number;
  };
  blockTypeById: ReadonlyMap<string, BlockTypeConfig>;
  currentPlatformRow: number;
  devOverlayEnabled: boolean;
  depthMarkerLabel: (row: number) => string;
  exposedCellKeys: ReadonlySet<string>;
  goblins: MinePixiGoblin[];
  hitEffects: MinePixiHitEffect[];
  onBlockHit: (block: MiningBlockState) => void;
  onPlaceGoblin: (goblinId: string, targetCell: { row: number; col: number }) => void;
  platformCellKeys: ReadonlySet<string>;
  platformDropAnimating: boolean;
  session: MiningSession;
}

type AnimatedItem = MinePixiAnimatedItem;

type DragState = MinePixiDragState;

const minSceneWidth = 320;
const defaultSceneViewport: MinePixiViewport = {
  height: 0,
  scrollTop: 0
};

export function MinePixiScene(props: MinePixiSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const animatedBlockImpactsRef = useRef<Map<number, MinePixiAnimatedBlockImpact>>(new Map());
  const animatedHitEffectsRef = useRef<AnimatedHitEffect[]>([]);
  const blockNodesRef = useRef<Map<string, MinePixiRenderedNode>>(new Map());
  const depthMarkerNodesRef = useRef<Map<string, MinePixiRenderedNode>>(new Map());
  const hitEffectNodesRef = useRef<Map<string, MinePixiRenderedNode>>(new Map());
  const liftRailRef = useRef<MinePixiLiftRail | null>(null);
  const layersRef = useRef<MinePixiSceneLayers | null>(null);
  const devOverlayEnabledRef = useRef(props.devOverlayEnabled);
  const devHitTestLastUpdatedAtRef = useRef(0);
  const devStatsLastUpdatedAtRef = useRef(0);
  const touchPanBlockTapUntilRef = useRef(0);
  const touchPanStateRef = useRef<MinePixiTouchPanState | null>(null);
  const layoutRef = useRef<MinePixiLayout | null>(null);
  const animatedGoblinsRef = useRef<AnimatedItem[]>([]);
  const activeCellRef = useRef(props.activeCell);
  const currentPlatformRowRef = useRef(props.currentPlatformRow);
  const exposedCellKeysRef = useRef(props.exposedCellKeys);
  const onBlockHitRef = useRef(props.onBlockHit);
  const onPlaceGoblinRef = useRef(props.onPlaceGoblin);
  const platformCellKeysRef = useRef(props.platformCellKeys);
  const sessionBlocksRef = useRef(props.session.blocks);
  const platformRef = useRef<AnimatedItem | null>(null);
  const platformDropAnimatingRef = useRef(false);
  const platformAnimationStartedAtRef = useRef(0);
  const totalCellCountRef = useRef(props.session.mine.width * props.session.mine.height);
  const visibleRowRangeRef = useRef<MinePixiVisibleRowRange>({ endRow: 0, startRow: 0 });
  const previousPlatformDropSignalRef = useRef({
    animating: false,
    row: props.currentPlatformRow
  });
  const [devHitTest, setDevHitTest] = useState<PixiDevHitTest | null>(null);
  const [devStats, setDevStats] = useState<PixiDevStats | null>(null);
  const [readyTick, setReadyTick] = useState(0);
  const [sceneViewport, setSceneViewport] = useState<MinePixiViewport>(defaultSceneViewport);
  const [viewportWidth, setViewportWidth] = useState(minSceneWidth);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const layout = useMemo(
    () => createMinePixiLayout(props.session.mine, viewportWidth, props.currentPlatformRow),
    [props.currentPlatformRow, props.session.mine, viewportWidth]
  );
  const visibleRowRange = useMemo(
    () => createVisibleRowRange(layout, sceneViewport),
    [layout, sceneViewport]
  );

  useEffect(() => {
    devOverlayEnabledRef.current = props.devOverlayEnabled;

    if (!props.devOverlayEnabled) {
      setDevHitTest(null);
      setDevStats(null);
    }
  }, [props.devOverlayEnabled]);

  useEffect(() => {
    visibleRowRangeRef.current = visibleRowRange;
  }, [visibleRowRange]);

  useEffect(() => {
    totalCellCountRef.current = props.session.mine.width * props.session.mine.height;
  }, [props.session.mine.height, props.session.mine.width]);

  useEffect(() => {
    platformDropAnimatingRef.current = props.platformDropAnimating;
  }, [props.platformDropAnimating]);

  useEffect(() => {
    const previous = previousPlatformDropSignalRef.current;

    if (props.platformDropAnimating && (!previous.animating || previous.row !== props.currentPlatformRow)) {
      platformAnimationStartedAtRef.current = performance.now();
    }

    previousPlatformDropSignalRef.current = {
      animating: props.platformDropAnimating,
      row: props.currentPlatformRow
    };
  }, [props.currentPlatformRow, props.platformDropAnimating]);

  useEffect(() => {
    currentPlatformRowRef.current = props.currentPlatformRow;
  }, [props.currentPlatformRow]);

  useEffect(() => {
    activeCellRef.current = props.activeCell;
  }, [props.activeCell]);

  useEffect(() => {
    onBlockHitRef.current = props.onBlockHit;
  }, [props.onBlockHit]);

  useEffect(() => {
    exposedCellKeysRef.current = props.exposedCellKeys;
  }, [props.exposedCellKeys]);

  useEffect(() => {
    onPlaceGoblinRef.current = props.onPlaceGoblin;
  }, [props.onPlaceGoblin]);

  useEffect(() => {
    platformCellKeysRef.current = props.platformCellKeys;
  }, [props.platformCellKeys]);

  useEffect(() => {
    sessionBlocksRef.current = props.session.blocks;
  }, [props.session.blocks]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    let cancelled = false;
    let handle: MinePixiAppHandle | null = null;

    void createMinePixiApp({
      host,
      onFrame: (app) => {
        runMinePixiTickerFrame({
          animatedBlockImpacts: animatedBlockImpactsRef.current,
          animatedGoblins: animatedGoblinsRef.current,
          animatedHitEffects: animatedHitEffectsRef.current,
          app,
          blockNodes: blockNodesRef.current,
          devOverlayEnabledRef,
          devStatsLastUpdatedAtRef,
          host: hostRef.current,
          layout: layoutRef.current,
          liftRail: liftRailRef.current,
          now: performance.now(),
          platform: platformRef.current,
          platformAnimationStartedAt: platformAnimationStartedAtRef.current,
          platformDropAnimating: platformDropAnimatingRef.current,
          setDevStats,
          totalCells: totalCellCountRef.current,
          visibleRowRange: visibleRowRangeRef.current
        });
      }
    }).then((pixi) => {
      if (cancelled) {
        pixi.destroy();
        return;
      }

      handle = pixi;
      appRef.current = pixi.app;
      layersRef.current = pixi.layers;
      setReadyTick((current) => current + 1);
    });

    return () => {
      cancelled = true;
      appRef.current = null;
      layersRef.current = null;
      animatedBlockImpactsRef.current.clear();
      animatedGoblinsRef.current = [];
      animatedHitEffectsRef.current = [];
      blockNodesRef.current.clear();
      depthMarkerNodesRef.current.clear();
      hitEffectNodesRef.current.clear();
      liftRailRef.current = null;
      platformRef.current = null;
      handle?.destroy();
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    function updateViewport() {
      const nextWidth = Math.max(minSceneWidth, Math.floor(host?.clientWidth ?? minSceneWidth));
      setViewportWidth(nextWidth);
      setSceneViewport({
        height: Math.max(0, Math.floor(host?.clientHeight ?? 0)),
        scrollTop: Math.max(0, Math.floor(host?.scrollTop ?? 0))
      });
    }

    updateViewport();

    const observer = new ResizeObserver(updateViewport);
    observer.observe(host);
    host.addEventListener("scroll", updateViewport, { passive: true });

    return () => {
      observer.disconnect();
      host.removeEventListener("scroll", updateViewport);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    return bindMinePixiPointerInput({
      activeCellRef,
      appRef,
      currentPlatformRowRef,
      devHitTestLastUpdatedAtRef,
      devOverlayEnabledRef,
      exposedCellKeysRef,
      host,
      layoutRef,
      onBlockHitRef,
      platformCellKeysRef,
      sessionBlocksRef,
      setDevHitTest,
      touchPanBlockTapUntilRef,
      touchPanStateRef
    });
  }, [readyTick]);

  useEffect(() => {
    return bindMinePixiDragPlacement({
      appRef,
      currentPlatformRowRef,
      dragState,
      layoutRef,
      onPlaceGoblinRef,
      platformCellKeysRef,
      setDragState
    });
  }, [dragState?.goblinId]);

  useEffect(() => {
    const app = appRef.current;

    if (!app || viewportWidth <= 0) {
      return;
    }

    layoutRef.current = layout;
    app.renderer.resize(layout.width, layout.contentHeight);
    app.canvas.style.width = `${layout.width}px`;
    app.canvas.style.height = `${layout.contentHeight}px`;
    app.stage.hitArea = new Rectangle(0, 0, layout.width, layout.contentHeight);
  }, [layout, readyTick, viewportWidth]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    clearMinePixiLayer(layers.background);
    liftRailRef.current = drawSceneBackground(layers.background, layout);
    liftRailRef.current.node.scale.y = Math.max(
      0,
      liftRailRef.current.baseHeight + currentPlatformDropOffset(
        performance.now(),
        platformDropAnimatingRef.current,
        platformAnimationStartedAtRef.current
      )
    );
  }, [layout, readyTick]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    clearMinePixiLayer(layers.surface);
    drawSurface(layers.surface, layout, props.currentPlatformRow);
    drawLiftCables(layers.surface, layout);
  }, [layout, props.currentPlatformRow, readyTick]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    reconcileMineBlocks({
      activeCell: props.activeCell,
      blockTypeById: props.blockTypeById,
      currentPlatformRow: props.currentPlatformRow,
      exposedCellKeys: props.exposedCellKeys,
      layout,
      mineLayer: layers.mine,
      renderedBlocks: blockNodesRef.current,
      sessionBlocks: props.session.blocks,
      visibleRowRange
    });
    reconcileDepthMarkers({
      currentPlatformRow: props.currentPlatformRow,
      depthMarkerLabel: props.depthMarkerLabel,
      layout,
      renderedMarkers: depthMarkerNodesRef.current,
      root: layers.markers,
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
    readyTick,
    visibleRowRange
  ]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    reconcileHitEffects({
      animatedBlockImpactsRef,
      animatedHitEffectsRef,
      blockTypeById: props.blockTypeById,
      hitEffects: props.hitEffects,
      layout,
      renderedEffects: hitEffectNodesRef.current,
      root: layers.effects,
      sessionBlocks: props.session.blocks,
      visibleRowRange
    });
  }, [layout, props.hitEffects, readyTick, visibleRowRange]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    clearMinePixiLayer(layers.platform);
    animatedGoblinsRef.current = [];
    platformRef.current = drawPlatform({
      animatedGoblins: animatedGoblinsRef.current,
      blocks: props.session.blocks,
      currentPlatformRow: props.currentPlatformRow,
      goblins: props.goblins,
      layout,
      mineWidth: props.session.mine.width,
      platformCellKeys: props.platformCellKeys,
      root: layers.platform,
      setDragState
    });

    const platform = platformRef.current as AnimatedItem | null;

    if (platform) {
      platform.node.y = platform.baseY + currentPlatformDropOffset(
        performance.now(),
        platformDropAnimatingRef.current,
        platformAnimationStartedAtRef.current
      );
    }
  }, [
    layout,
    props.currentPlatformRow,
    props.goblins,
    props.platformCellKeys,
    props.platformDropAnimating,
    props.session.blocks,
    readyTick
  ]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    clearMinePixiLayer(layers.drag);
    drawDragPreview({
      dragState,
      goblins: props.goblins,
      layout,
      root: layers.drag
    });
  }, [dragState, layout, props.goblins, readyTick]);

  return (
    <section className="pixi-playfield" ref={hostRef} aria-label="Игровая область">
      {readyTick === 0 ? <span className="pixi-loading">Loading...</span> : null}
      {props.devOverlayEnabled && devStats ? (
        <div className="pixi-dev-overlay" aria-hidden="true">
          <span>FPS {devStats.fps}</span>
          <span>Rows {devStats.visibleRows}</span>
          <span>Scroll {devStats.scrollRow}</span>
          <span>Cells {devStats.renderedCells}/{devStats.totalCells}</span>
          <span>Hit {devHitTest?.cell ?? "-"}</span>
          <span>{devHitTest?.state ?? "idle"}</span>
          <span>XY {devHitTest?.point ?? "-"}</span>
          <span>Sel {devHitTest?.selected ?? "-"}</span>
        </div>
      ) : null}
    </section>
  );
}
