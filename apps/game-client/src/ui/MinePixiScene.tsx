import type { Application } from "pixi.js";
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
import type { MinePixiLiftRail } from "./minePixiBackground";
import { type MinePixiAnimatedBlockImpact } from "./minePixiHitEffectReconciliation";
import {
  createMinePixiApp,
  type MinePixiAppHandle,
  type MinePixiSceneLayers
} from "./minePixiApp";
import {
  type MinePixiAnimatedItem,
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
import type { MinePixiRenderedNode } from "./minePixiRenderNodes";
import { runMinePixiTickerFrame, type PixiDevStats } from "./minePixiTicker";
import {
  bindMinePixiViewport,
  defaultMinePixiViewport,
  minMinePixiViewportWidth,
  resizeMinePixiRenderer
} from "./minePixiViewport";
import {
  bindMinePixiDragPlacement,
  bindMinePixiPointerInput,
  type MinePixiTouchPanState,
  type PixiDevHitTest
} from "./minePixiInput";

export type { MinePixiHitEffect, MinePixiHitEffectVariant, MinePixiRewardDrop } from "./minePixiEffects";

export interface MinePixiGoblin extends MinePixiPlatformGoblin {
  id: string;
  name: string;
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

    return bindMinePixiViewport({
      host,
      setSceneViewport,
      setViewportWidth
    });
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
    resizeMinePixiRenderer(app, layout);
  }, [layout, readyTick, viewportWidth]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiBackground({
      layers,
      layout,
      liftRailRef,
      platformAnimationStartedAtRef,
      platformDropAnimatingRef
    });
  }, [layout, readyTick]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiSurface({
      currentPlatformRow: props.currentPlatformRow,
      layers,
      layout
    });
  }, [layout, props.currentPlatformRow, readyTick]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiMineAndDepth({
      activeCell: props.activeCell,
      blockNodes: blockNodesRef.current,
      blockTypeById: props.blockTypeById,
      currentPlatformRow: props.currentPlatformRow,
      depthMarkerLabel: props.depthMarkerLabel,
      depthMarkerNodes: depthMarkerNodesRef.current,
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
    readyTick,
    visibleRowRange
  ]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiHitEffects({
      animatedBlockImpactsRef,
      animatedHitEffectsRef,
      blockTypeById: props.blockTypeById,
      hitEffectNodes: hitEffectNodesRef.current,
      hitEffects: props.hitEffects,
      layers,
      layout,
      sessionBlocks: props.session.blocks,
      visibleRowRange
    });
  }, [layout, props.hitEffects, readyTick, visibleRowRange]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    renderMinePixiPlatform({
      animatedGoblinsRef,
      blocks: props.session.blocks,
      currentPlatformRow: props.currentPlatformRow,
      goblins: props.goblins,
      layers,
      layout,
      mineWidth: props.session.mine.width,
      platformAnimationStartedAtRef,
      platformCellKeys: props.platformCellKeys,
      platformDropAnimatingRef,
      platformRef,
      setDragState
    });
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

    renderMinePixiDragPreview({
      dragState,
      goblins: props.goblins,
      layers,
      layout
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
