import { Application, Container, Graphics, Rectangle, Text } from "pixi.js";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import type { MiningBlockState, MiningSession } from "@goblin-cartel/game-core";
import {
  cellKey,
  createMinePixiLayout,
  createVisibleRowRange,
  isRowInVisibleRange,
  pointToMineCell,
  pointToPlatformColumnCell,
  pointToPlatformCell,
  type MinePixiCell,
  type MinePixiLayout,
  type MinePixiPoint,
  type MinePixiViewport,
  type MinePixiVisibleRowRange
} from "./minePixiLayout";
import {
  createMinePixiBlockRenderSignature,
  createMinePixiVisibleCellKeySet
} from "./minePixiRenderState";
import {
  animateHitEffects,
  drawHitEffect,
  rewardDropsSignature,
  type AnimatedHitEffect,
  type MinePixiHitEffect,
  type MinePixiHitEffectVariant
} from "./minePixiEffects";
import {
  blockColor,
  blockTypeVisualToken,
  drawBlock
} from "./minePixiBlocks";
import {
  drawDragPreview,
  drawPlatform,
  type MinePixiAnimatedItem,
  type MinePixiDragState
} from "./minePixiPlatform";
import { drawLiftCables, drawSurface } from "./minePixiSurface";

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

interface AnimatedBlockImpact {
  cellKey: string;
  destroyed: boolean;
  duration: number;
  startedAt: number;
  variant: MinePixiHitEffectVariant;
}

interface SceneLayers {
  background: Container;
  drag: Container;
  effects: Container;
  markers: Container;
  mine: Container;
  platform: Container;
  surface: Container;
}

interface RenderedPixiNode {
  baseX?: number;
  baseY?: number;
  node: Container;
  signature: string;
}

type DragState = MinePixiDragState;

interface TouchPanState {
  active: boolean;
  pointerId: number;
  scrollTop: number;
  startX: number;
  startY: number;
}

interface PixiDevStats {
  fps: number;
  renderedCells: number;
  scrollRow: number;
  totalCells: number;
  visibleRows: string;
}

interface PixiDevHitTest {
  cell: string;
  point: string;
  selected: string;
  state: string;
}

const minSceneWidth = 320;
const platformDropDurationMs = 1450;
const defaultSceneViewport: MinePixiViewport = {
  height: 0,
  scrollTop: 0
};

export function MinePixiScene(props: MinePixiSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const animatedBlockImpactsRef = useRef<Map<number, AnimatedBlockImpact>>(new Map());
  const animatedHitEffectsRef = useRef<AnimatedHitEffect[]>([]);
  const blockNodesRef = useRef<Map<string, RenderedPixiNode>>(new Map());
  const depthMarkerNodesRef = useRef<Map<string, RenderedPixiNode>>(new Map());
  const hitEffectNodesRef = useRef<Map<string, RenderedPixiNode>>(new Map());
  const layersRef = useRef<SceneLayers | null>(null);
  const rootRef = useRef<Container | null>(null);
  const devOverlayEnabledRef = useRef(props.devOverlayEnabled);
  const devHitTestLastUpdatedAtRef = useRef(0);
  const devStatsLastUpdatedAtRef = useRef(0);
  const touchPanBlockTapUntilRef = useRef(0);
  const touchPanStateRef = useRef<TouchPanState | null>(null);
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

    const app = new Application();
    const root = new Container();
    let cancelled = false;
    let initialized = false;

    void app
      .init({
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
        height: 1,
        preference: "webgl",
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        width: 1
      })
      .then(() => {
        initialized = true;

        if (cancelled) {
          app.destroy({ removeView: true }, { children: true });
          return;
        }

        const layers = createSceneLayers(root);
        app.stage.addChild(root);
        app.stage.eventMode = "static";
        app.canvas.className = "mine-pixi-canvas";
        configurePixiInputForTouchScroll(app);
        host.appendChild(app.canvas);
        appRef.current = app;
        layersRef.current = layers;
        rootRef.current = root;

        app.ticker.add(() => {
          const now = performance.now();
          const platform = platformRef.current;

          if (platform) {
            platform.node.y = platform.baseY + currentPlatformDropOffset(now, platformDropAnimatingRef.current, platformAnimationStartedAtRef.current);
          }

          for (const item of animatedGoblinsRef.current) {
            const drillOffset = item.working ? Math.sin(now / 48 + item.phase) * 1.8 : Math.sin(now / 420 + item.phase) * 0.5;
            item.node.y = item.baseY + drillOffset;
            item.node.rotation = item.working ? Math.sin(now / 70 + item.phase) * 0.035 : 0;
          }

          animateBlockImpacts(now, animatedBlockImpactsRef.current, blockNodesRef.current);
          animateHitEffects(now, animatedHitEffectsRef.current);
          updatePixiDevStats(
            now,
            app,
            hostRef.current,
            layoutRef.current,
            visibleRowRangeRef.current,
            blockNodesRef.current.size,
            totalCellCountRef.current,
            devOverlayEnabledRef,
            devStatsLastUpdatedAtRef,
            setDevStats
          );
        });

        setReadyTick((current) => current + 1);
      });

    return () => {
      cancelled = true;
      appRef.current = null;
      layersRef.current = null;
      rootRef.current = null;
      animatedBlockImpactsRef.current.clear();
      animatedGoblinsRef.current = [];
      animatedHitEffectsRef.current = [];
      blockNodesRef.current.clear();
      depthMarkerNodesRef.current.clear();
      hitEffectNodesRef.current.clear();
      platformRef.current = null;
      if (initialized) {
        app.destroy({ removeView: true }, { children: true });
      }
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

    const playfield = host;

    function updateDevHitTest(event: PointerEvent, force = false) {
      if (!devOverlayEnabledRef.current) {
        return;
      }

      const now = performance.now();

      if (!force && now - devHitTestLastUpdatedAtRef.current < 80) {
        return;
      }

      const layout = layoutRef.current;
      const canvas = appRef.current?.canvas;

      if (!layout || !canvas) {
        return;
      }

      devHitTestLastUpdatedAtRef.current = now;
      setDevHitTest(createPixiDevHitTest({
        activeCell: activeCellRef.current,
        exposedCellKeys: exposedCellKeysRef.current,
        layout,
        platformCellKeys: platformCellKeysRef.current,
        platformRow: currentPlatformRowRef.current,
        point: pointFromCanvasEvent(event, canvas),
        sessionBlocks: sessionBlocksRef.current
      }));
    }

    function handlePointerDown(event: PointerEvent) {
      const layout = layoutRef.current;
      const canvas = appRef.current?.canvas;

      if (layout && canvas) {
        const point = pointFromCanvasEvent(event, canvas);
        const platformCell = pointToPlatformCell(point, layout, currentPlatformRowRef.current);
        updateDevHitTest(event, true);

        if (platformCell && platformCellKeysRef.current.has(cellKey(platformCell))) {
          touchPanStateRef.current = null;
          return;
        }

        const mineCell = pointToMineCell(point, layout);
        const block = mineCell ? sessionBlocksRef.current[mineCell.row]?.[mineCell.col] : null;

        if (
          block &&
          !block.destroyed &&
          exposedCellKeysRef.current.has(cellKey(block)) &&
          performance.now() >= touchPanBlockTapUntilRef.current
        ) {
          onBlockHitRef.current(block);
        }
      }

      if (event.pointerType !== "touch") {
        return;
      }

      touchPanStateRef.current = {
        active: false,
        pointerId: event.pointerId,
        scrollTop: playfield.scrollTop,
        startX: event.clientX,
        startY: event.clientY
      };
    }

    function handlePointerMove(event: PointerEvent) {
      updateDevHitTest(event);

      const state = touchPanStateRef.current;

      if (!state || state.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (!state.active) {
        if (absY < 8 || absY < absX * 1.1) {
          return;
        }

        state.active = true;
      }

      playfield.scrollTop = Math.max(0, state.scrollTop - deltaY);
      touchPanBlockTapUntilRef.current = performance.now() + 350;
      if (event.cancelable) {
        event.preventDefault();
      }
    }

    function finishPointer(event: PointerEvent) {
      const state = touchPanStateRef.current;

      if (state?.pointerId === event.pointerId && state.active) {
        touchPanBlockTapUntilRef.current = performance.now() + 350;
        if (event.cancelable) {
          event.preventDefault();
        }
      }

      if (state?.pointerId === event.pointerId) {
        touchPanStateRef.current = null;
      }
    }

    playfield.addEventListener("pointerdown", handlePointerDown);
    playfield.addEventListener("pointermove", handlePointerMove, { passive: false });
    playfield.addEventListener("pointerup", finishPointer, { passive: false });
    playfield.addEventListener("pointercancel", finishPointer, { passive: false });

    return () => {
      playfield.removeEventListener("pointerdown", handlePointerDown);
      playfield.removeEventListener("pointermove", handlePointerMove);
      playfield.removeEventListener("pointerup", finishPointer);
      playfield.removeEventListener("pointercancel", finishPointer);
    };
  }, [readyTick]);

  useEffect(() => {
    if (!dragState?.goblinId) {
      return;
    }

    const activeDraggingGoblinId = dragState.goblinId;

    function updateDragPoint(event: PointerEvent): MinePixiPoint | null {
      const layout = layoutRef.current;
      const canvas = appRef.current?.canvas;

      if (!layout || !canvas) {
        return null;
      }

      const point = pointFromCanvasEvent(event, canvas);
      const targetCell = pointToPlatformColumnCell(point, layout, currentPlatformRowRef.current);

      setDragState((current) => current
        ? {
            ...current,
            point,
            targetCell: targetCell && platformCellKeysRef.current.has(cellKey(targetCell)) ? targetCell : null
          }
        : current);

      return point;
    }

    function finishDrag(event: PointerEvent) {
      const layout = layoutRef.current;
      const canvas = appRef.current?.canvas;

      if (!layout || !canvas) {
        setDragState(null);
        return;
      }

      const point = updateDragPoint(event) ?? pointFromCanvasEvent(event, canvas);
      const targetCell = pointToPlatformColumnCell(point, layout, currentPlatformRowRef.current);

      if (targetCell && platformCellKeysRef.current.has(cellKey(targetCell))) {
        onPlaceGoblinRef.current(activeDraggingGoblinId, targetCell);
      }

      setDragState(null);
    }

    function handlePointerMove(event: PointerEvent) {
      updateDragPoint(event);
    }

    function cancelDrag() {
      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", cancelDrag);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", cancelDrag);
    };
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

    clearLayer(layers.background);
    drawSceneBackground(layers.background, layout);
  }, [layout, readyTick]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    clearLayer(layers.surface);
    drawSurface(layers.surface, layout, props.currentPlatformRow);
    drawLiftCables(layers.surface, layout);
  }, [layout, props.currentPlatformRow, readyTick]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    reconcileMineBlocks(layers.mine, blockNodesRef.current, layout, props, visibleRowRange);
    reconcileDepthMarkers(layers.markers, depthMarkerNodesRef.current, layout, props, visibleRowRange);
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

    reconcileHitEffects(
      layers.effects,
      hitEffectNodesRef.current,
      animatedHitEffectsRef,
      animatedBlockImpactsRef,
      layout,
      props,
      visibleRowRange
    );
  }, [layout, props.hitEffects, readyTick, visibleRowRange]);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers) {
      return;
    }

    clearLayer(layers.platform);
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

    clearLayer(layers.drag);
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

function createSceneLayers(root: Container): SceneLayers {
  const layers: SceneLayers = {
    background: new Container(),
    drag: new Container(),
    effects: new Container(),
    markers: new Container(),
    mine: new Container(),
    platform: new Container(),
    surface: new Container()
  };

  root.addChild(layers.background, layers.surface, layers.mine, layers.markers, layers.platform, layers.effects, layers.drag);
  return layers;
}

function clearLayer(layer: Container) {
  for (const child of layer.removeChildren()) {
    child.destroy({ children: true });
  }
}

function configurePixiInputForTouchScroll(app: Application) {
  const renderer = app.renderer as { events?: { autoPreventDefault: boolean } };

  if (renderer.events) {
    renderer.events.autoPreventDefault = false;
  }

  app.canvas.style.touchAction = "pan-y";
}

function updatePixiDevStats(
  now: number,
  app: Application,
  host: HTMLDivElement | null,
  layout: MinePixiLayout | null,
  visibleRowRange: MinePixiVisibleRowRange,
  renderedCells: number,
  totalCells: number,
  devOverlayEnabledRef: MutableRefObject<boolean>,
  devStatsLastUpdatedAtRef: MutableRefObject<number>,
  setDevStats: (stats: PixiDevStats) => void
) {
  if (!devOverlayEnabledRef.current || !layout || now - devStatsLastUpdatedAtRef.current < 350) {
    return;
  }

  devStatsLastUpdatedAtRef.current = now;
  const scrollTop = Math.max(0, host?.scrollTop ?? 0);
  const scrollRow = Math.max(0, Math.floor(Math.max(0, scrollTop - layout.gridY) / layout.rowStep));
  const ticker = app.ticker as { FPS?: number };

  setDevStats({
    fps: Math.round(ticker.FPS ?? 0),
    renderedCells,
    scrollRow,
    totalCells,
    visibleRows: `${visibleRowRange.startRow}-${visibleRowRange.endRow}`
  });
}

function createPixiDevHitTest(input: {
  activeCell: MinePixiCell;
  exposedCellKeys: ReadonlySet<string>;
  layout: MinePixiLayout;
  platformCellKeys: ReadonlySet<string>;
  platformRow: number;
  point: MinePixiPoint;
  sessionBlocks: MiningSession["blocks"];
}): PixiDevHitTest {
  const mineCell = pointToMineCell(input.point, input.layout);
  const platformCell = pointToPlatformCell(input.point, input.layout, input.platformRow);
  const point = `${Math.round(input.point.x)},${Math.round(input.point.y)}`;
  const selected = formatDevCell(input.activeCell);

  if (mineCell) {
    const block = input.sessionBlocks[mineCell.row]?.[mineCell.col];
    const key = formatDevCell(mineCell);

    if (!block) {
      return {
        cell: key,
        point,
        selected,
        state: "mine empty"
      };
    }

    return {
      cell: key,
      point,
      selected,
      state: block.destroyed
        ? "mine destroyed"
        : input.exposedCellKeys.has(cellKey(mineCell))
          ? "mine exposed"
          : "mine covered"
    };
  }

  if (platformCell) {
    return {
      cell: formatDevCell(platformCell),
      point,
      selected,
      state: input.platformCellKeys.has(cellKey(platformCell)) ? "platform" : "platform locked"
    };
  }

  return {
    cell: "-",
    point,
    selected,
    state: "void"
  };
}

function formatDevCell(cell: MinePixiCell): string {
  return `${cell.row}:${cell.col}`;
}

function removeRenderedNode(
  renderedNodes: Map<string, RenderedPixiNode>,
  key: string,
  renderedNode: RenderedPixiNode
) {
  renderedNode.node.parent?.removeChild(renderedNode.node);
  renderedNode.node.destroy({ children: true });
  renderedNodes.delete(key);
}

function drawSceneBackground(root: Container, layout: MinePixiLayout) {
  root.addChild(
    new Graphics()
      .rect(0, 0, layout.width, layout.contentHeight)
      .fill({ color: 0x21170f })
  );
  root.addChild(
    new Graphics()
      .rect(0, layout.surfaceHeight, layout.width, layout.contentHeight - layout.surfaceHeight)
      .fill({ color: 0x221811 })
  );
}

function reconcileMineBlocks(
  mineLayer: Container,
  renderedBlocks: Map<string, RenderedPixiNode>,
  layout: MinePixiLayout,
  props: MinePixiSceneProps,
  visibleRowRange: MinePixiVisibleRowRange
) {
  const visibleCellKeys = createMinePixiVisibleCellKeySet(props.session.blocks, visibleRowRange);

  for (const [key, renderedBlock] of renderedBlocks) {
    if (!visibleCellKeys.has(key)) {
      removeRenderedNode(renderedBlocks, key, renderedBlock);
    }
  }

  for (let rowIndex = visibleRowRange.startRow; rowIndex <= visibleRowRange.endRow; rowIndex += 1) {
    const row = props.session.blocks[rowIndex];

    if (!row) {
      continue;
    }

    for (const block of row) {
      const blockKey = cellKey(block);
      const exposed = props.exposedCellKeys.has(blockKey);
      const active = block.row === props.activeCell.row && block.col === props.activeCell.col;
      const platformRow = block.row === props.currentPlatformRow;
      const x = layout.gridX + block.col * layout.rowStep;
      const y = layout.gridY + block.row * layout.rowStep;
      const blockType = props.blockTypeById.get(block.blockTypeId);
      const signature = createMinePixiBlockRenderSignature({
        active,
        block,
        blockTypeToken: blockTypeVisualToken(blockType),
        exposed,
        platformRow,
        size: layout.cellSize,
        x,
        y
      });
      const renderedBlock = renderedBlocks.get(blockKey);

      if (renderedBlock?.signature === signature) {
        continue;
      }

      if (renderedBlock) {
        removeRenderedNode(renderedBlocks, blockKey, renderedBlock);
      }

      const blockGraphics = drawBlock(block, props.blockTypeById.get(block.blockTypeId), {
        active,
        exposed,
        platformRow,
        size: layout.cellSize
      });

      blockGraphics.position.set(x, y);

      if (!block.destroyed && exposed) {
        blockGraphics.cursor = "pointer";
      }

      mineLayer.addChild(blockGraphics);
      renderedBlocks.set(blockKey, {
        baseX: x,
        baseY: y,
        node: blockGraphics,
        signature
      });
    }
  }
}

function reconcileDepthMarkers(
  root: Container,
  renderedMarkers: Map<string, RenderedPixiNode>,
  layout: MinePixiLayout,
  props: MinePixiSceneProps,
  visibleRowRange: MinePixiVisibleRowRange
) {
  const visibleMarkerKeys = new Set<string>();

  for (let row = visibleRowRange.startRow; row <= visibleRowRange.endRow; row += 1) {
    const label = props.depthMarkerLabel(row);

    if (!label) {
      continue;
    }

    const key = String(row);
    const y = layout.gridY + row * layout.rowStep + layout.cellSize / 2;
    const signature = [
      row,
      label,
      row === props.currentPlatformRow ? 1 : 0,
      layout.gridX,
      layout.gridY,
      layout.rowStep,
      layout.cellSize
    ].join("|");
    const renderedMarker = renderedMarkers.get(key);
    visibleMarkerKeys.add(key);

    if (renderedMarker?.signature === signature) {
      continue;
    }

    if (renderedMarker) {
      removeRenderedNode(renderedMarkers, key, renderedMarker);
    }

    const marker = drawDepthMarker(layout, row, label, row === props.currentPlatformRow, y);
    root.addChild(marker);
    renderedMarkers.set(key, {
      node: marker,
      signature
    });
  }

  for (const [key, renderedMarker] of renderedMarkers) {
    if (!visibleMarkerKeys.has(key)) {
      removeRenderedNode(renderedMarkers, key, renderedMarker);
    }
  }
}

function drawDepthMarker(
  layout: MinePixiLayout,
  row: number,
  label: string,
  active: boolean,
  y: number
): Container {
  const marker = new Container();
  const text = createText({
    color: active ? 0xf2b84b : 0xb7a58f,
    fontSize: 10,
    fontWeight: "800",
    text: label
  });
  text.anchor.set(1, 0.5);
  text.position.set(layout.gridX - 6, y);
  marker.addChild(text);
  return marker;
}

function reconcileHitEffects(
  root: Container,
  renderedEffects: Map<string, RenderedPixiNode>,
  animatedHitEffectsRef: MutableRefObject<AnimatedHitEffect[]>,
  animatedBlockImpactsRef: MutableRefObject<Map<number, AnimatedBlockImpact>>,
  layout: MinePixiLayout,
  props: MinePixiSceneProps,
  visibleRowRange: MinePixiVisibleRowRange
) {
  const visibleEffectKeys = new Set<string>();

  for (const effect of props.hitEffects) {
    if (!isRowInVisibleRange(effect.row, visibleRowRange)) {
      continue;
    }

    const key = String(effect.id);
    const targetBlock = props.session.blocks[effect.row]?.[effect.col];
    const destroyed = Boolean(targetBlock?.destroyed);
    const x = layout.gridX + effect.col * layout.rowStep + layout.cellSize / 2;
    const y = layout.gridY + effect.row * layout.rowStep + layout.cellSize / 2;
    const signature = [
      effect.id,
      effect.row,
      effect.col,
      effect.variant,
      effect.damage,
      rewardDropsSignature(effect.rewardDrops),
      destroyed ? 1 : 0,
      layout.cellSize,
      x,
      y
    ].join("|");
    const renderedEffect = renderedEffects.get(key);
    visibleEffectKeys.add(key);

    if (renderedEffect?.signature === signature) {
      continue;
    }

    if (renderedEffect) {
      removeRenderedNode(renderedEffects, key, renderedEffect);
      animatedHitEffectsRef.current = animatedHitEffectsRef.current.filter((item) => item.id !== effect.id);
    }

    const targetBlockType = targetBlock ? props.blockTypeById.get(targetBlock.blockTypeId) : undefined;
    const drawnEffect = drawHitEffect(
      effect,
      x,
      y,
      layout.cellSize,
      destroyed,
      blockColor(targetBlock?.blockTypeId ?? "", targetBlockType)
    );
    root.addChild(drawnEffect.node);
    animatedHitEffectsRef.current.push({
      collapseShards: drawnEffect.collapseShards,
      damageLabel: drawnEffect.damageLabel,
      damageLabelBaseY: drawnEffect.damageLabelBaseY,
      duration: drawnEffect.duration,
      id: effect.id,
      node: drawnEffect.node,
      particles: drawnEffect.particles,
      rewardLabels: drawnEffect.rewardLabels,
      rings: drawnEffect.rings,
      slash: drawnEffect.slash,
      startedAt: performance.now()
    });
    animatedBlockImpactsRef.current.set(effect.id, {
      cellKey: cellKey(effect),
      destroyed,
      duration: destroyed ? 620 : 360,
      startedAt: performance.now(),
      variant: effect.variant
    });
    renderedEffects.set(key, {
      node: drawnEffect.node,
      signature
    });
  }

  for (const [key, renderedEffect] of renderedEffects) {
    if (!visibleEffectKeys.has(key)) {
      removeRenderedNode(renderedEffects, key, renderedEffect);
      animatedHitEffectsRef.current = animatedHitEffectsRef.current.filter((item) => String(item.id) !== key);
    }
  }
}

function animateBlockImpacts(
  now: number,
  impacts: Map<number, AnimatedBlockImpact>,
  renderedBlocks: ReadonlyMap<string, RenderedPixiNode>
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

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function platformDropOffset(progress: number): number {
  if (progress <= 0) {
    return -30;
  }

  if (progress >= 1) {
    return 0;
  }

  const eased = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  return -30 * (1 - eased);
}

function currentPlatformDropOffset(now: number, animating: boolean, startedAt: number): number {
  const elapsed = now - startedAt;

  if (!animating || elapsed < 0 || elapsed >= platformDropDurationMs) {
    return 0;
  }

  return platformDropOffset(elapsed / platformDropDurationMs);
}

function createText(options: {
  color: number;
  fontSize: number;
  fontWeight: "700" | "800";
  text: string;
}): Text {
  return new Text({
    style: {
      fill: options.color,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: options.fontSize,
      fontWeight: options.fontWeight
    },
    text: options.text
  });
}

function pointFromCanvasEvent(event: PointerEvent, canvas: HTMLCanvasElement): MinePixiPoint {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}
