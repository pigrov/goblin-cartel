import { Application, Container, Graphics, Rectangle, Text, type FederatedPointerEvent } from "pixi.js";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import type { MiningBlockState, MiningSession } from "@goblin-cartel/game-core";
import {
  cellKey,
  createMinePixiLayout,
  pointToPlatformCell,
  type MinePixiCell,
  type MinePixiLayout,
  type MinePixiPoint
} from "./minePixiLayout";

export interface MinePixiGoblin {
  id: string;
  name: string;
  col: number;
  working: boolean;
}

export type MinePixiHitEffectVariant = "boss" | "goblin" | "critical";

export interface MinePixiHitEffect {
  id: number;
  row: number;
  col: number;
  variant: MinePixiHitEffectVariant;
}

interface MinePixiSceneProps {
  activeCell: {
    row: number;
    col: number;
  };
  blockTypeById: ReadonlyMap<string, BlockTypeConfig>;
  currentPlatformRow: number;
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

interface AnimatedItem {
  baseY: number;
  node: Container;
  phase: number;
  working: boolean;
}

interface SceneLayers {
  background: Container;
  effects: Container;
  markers: Container;
  mine: Container;
  platform: Container;
  surface: Container;
}

interface DragState {
  goblinId: string;
  point: MinePixiPoint;
  targetCell: MinePixiCell | null;
}

const minSceneWidth = 320;

export function MinePixiScene(props: MinePixiSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const rootRef = useRef<Container | null>(null);
  const layoutRef = useRef<MinePixiLayout | null>(null);
  const animatedGoblinsRef = useRef<AnimatedItem[]>([]);
  const currentPlatformRowRef = useRef(props.currentPlatformRow);
  const dragStateRef = useRef<DragState | null>(null);
  const onBlockHitRef = useRef(props.onBlockHit);
  const onPlaceGoblinRef = useRef(props.onPlaceGoblin);
  const platformCellKeysRef = useRef(props.platformCellKeys);
  const platformRef = useRef<AnimatedItem | null>(null);
  const platformDropAnimatingRef = useRef(false);
  const platformAnimationStartedAtRef = useRef(0);
  const [readyTick, setReadyTick] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(minSceneWidth);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const hitEffectsByCell = useMemo(() => {
    const effectsByCell = new Map<string, MinePixiHitEffect[]>();

    for (const effect of props.hitEffects) {
      const key = cellKey(effect);
      effectsByCell.set(key, [...(effectsByCell.get(key) ?? []), effect]);
    }

    return effectsByCell;
  }, [props.hitEffects]);

  useEffect(() => {
    platformDropAnimatingRef.current = props.platformDropAnimating;
  }, [props.platformDropAnimating]);

  useEffect(() => {
    currentPlatformRowRef.current = props.currentPlatformRow;
  }, [props.currentPlatformRow]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    onBlockHitRef.current = props.onBlockHit;
  }, [props.onBlockHit]);

  useEffect(() => {
    onPlaceGoblinRef.current = props.onPlaceGoblin;
  }, [props.onPlaceGoblin]);

  useEffect(() => {
    platformCellKeysRef.current = props.platformCellKeys;
  }, [props.platformCellKeys]);

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

        app.stage.addChild(root);
        app.stage.eventMode = "static";
        app.canvas.className = "mine-pixi-canvas";
        host.appendChild(app.canvas);
        appRef.current = app;
        rootRef.current = root;

        app.ticker.add(() => {
          const now = performance.now();
          const platform = platformRef.current;

          if (platform) {
            const elapsed = now - platformAnimationStartedAtRef.current;
            const dropOffset = platformDropAnimatingRef.current && elapsed < 1450
              ? platformDropOffset(elapsed / 1450)
              : 0;
            platform.node.y = platform.baseY + dropOffset;
          }

          for (const item of animatedGoblinsRef.current) {
            const drillOffset = item.working ? Math.sin(now / 48 + item.phase) * 1.8 : Math.sin(now / 420 + item.phase) * 0.5;
            item.node.y = item.baseY + drillOffset;
            item.node.rotation = item.working ? Math.sin(now / 70 + item.phase) * 0.035 : 0;
          }
        });

        setReadyTick((current) => current + 1);
      });

    return () => {
      cancelled = true;
      appRef.current = null;
      rootRef.current = null;
      animatedGoblinsRef.current = [];
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

    function updateWidth() {
      const nextWidth = Math.max(minSceneWidth, Math.floor(host?.clientWidth ?? minSceneWidth));
      setViewportWidth(nextWidth);
    }

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(host);

    return () => observer.disconnect();
  }, []);

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
      const targetCell = pointToPlatformCell(point, layout, currentPlatformRowRef.current);

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
      const targetCell = pointToPlatformCell(point, layout, currentPlatformRowRef.current);

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
    const root = rootRef.current;
    const host = hostRef.current;

    if (!app || !root || !host || viewportWidth <= 0) {
      return;
    }

    const layout = createMinePixiLayout(props.session.mine, viewportWidth, props.currentPlatformRow);
    layoutRef.current = layout;
    animatedGoblinsRef.current = [];
    platformRef.current = null;

    app.renderer.resize(layout.width, layout.contentHeight);
    app.canvas.style.width = `${layout.width}px`;
    app.canvas.style.height = `${layout.contentHeight}px`;
    app.stage.hitArea = new Rectangle(0, 0, layout.width, layout.contentHeight);

    for (const child of root.removeChildren()) {
      child.destroy({ children: true });
    }

    const layers = createSceneLayers(root);
    drawSceneBackground(layers.background, layout);
    drawSurface(layers.surface, layout, props.currentPlatformRow);
    drawMineBlocks(layers.mine, layers.effects, layout, props, hitEffectsByCell, onBlockHitRef);
    drawDepthMarkers(layers.markers, layout, props);
    drawLiftCables(layers.surface, layout);
    drawPlatform(
      layers.platform,
      layout,
      props,
      dragState,
      animatedGoblinsRef,
      platformRef,
      setDragState
    );

    if (props.platformDropAnimating) {
      platformAnimationStartedAtRef.current = performance.now();
    }

    const frameId = window.requestAnimationFrame(() => {
      const top = props.currentPlatformRow === 0 ? 0 : Math.max(0, layout.platformY - 8);
      host.scrollTo({
        top,
        behavior: "smooth"
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    dragState,
    hitEffectsByCell,
    props.activeCell,
    props.blockTypeById,
    props.currentPlatformRow,
    props.depthMarkerLabel,
    props.exposedCellKeys,
    props.goblins,
    props.platformDropAnimating,
    props.session,
    readyTick,
    viewportWidth
  ]);

  return (
    <section className="pixi-playfield" ref={hostRef} aria-label="Игровая область">
      {readyTick === 0 ? <span className="pixi-loading">Loading...</span> : null}
    </section>
  );
}

function createSceneLayers(root: Container): SceneLayers {
  const layers: SceneLayers = {
    background: new Container(),
    effects: new Container(),
    markers: new Container(),
    mine: new Container(),
    platform: new Container(),
    surface: new Container()
  };

  root.addChild(layers.background, layers.surface, layers.mine, layers.markers, layers.platform, layers.effects);
  return layers;
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

function drawSurface(root: Container, layout: MinePixiLayout, platformRow: number) {
  const surface = new Container();

  surface.addChild(
    new Graphics()
      .rect(0, 0, layout.width, layout.surfaceHeight)
      .fill({ color: 0x3d626b })
      .rect(0, layout.surfaceHeight * 0.48, layout.width, layout.surfaceHeight * 0.22)
      .fill({ color: 0x315f38 })
      .rect(0, layout.surfaceHeight * 0.68, layout.width, layout.surfaceHeight * 0.32)
      .fill({ color: 0x4a321f })
  );

  drawTree(surface, 20, layout.surfaceHeight - 54, 1);
  drawTree(surface, 78, layout.surfaceHeight - 48, 0.78);
  drawTree(surface, layout.width - 54, layout.surfaceHeight - 52, 0.9);

  surface.addChild(
    new Graphics()
      .roundRect(layout.gridX - 4, layout.surfaceHeight - 38, layout.platformWidth + 8, 46, 10)
      .fill({ color: 0x1b130d })
      .stroke({ color: 0x000000, alpha: 0.4, width: 1 })
  );

  const depthText = createText({
    color: 0xf2b84b,
    fontSize: 14,
    fontWeight: "800",
    text: `${platformRow + 1}`
  });
  depthText.position.set(12, 22);
  surface.addChild(depthText);

  const labelText = createText({
    color: 0xb7a58f,
    fontSize: 10,
    fontWeight: "800",
    text: "DEPTH"
  });
  labelText.position.set(12, 9);
  surface.addChild(labelText);

  root.addChild(surface);
}

function drawMineBlocks(
  mineLayer: Container,
  effectsLayer: Container,
  layout: MinePixiLayout,
  props: MinePixiSceneProps,
  hitEffectsByCell: ReadonlyMap<string, MinePixiHitEffect[]>,
  onBlockHitRef: MutableRefObject<(block: MiningBlockState) => void>
) {
  for (const row of props.session.blocks) {
    for (const block of row) {
      const blockKey = cellKey(block);
      const exposed = props.exposedCellKeys.has(blockKey);
      const active = block.row === props.activeCell.row && block.col === props.activeCell.col;
      const platformRow = block.row === props.currentPlatformRow;
      const x = layout.gridX + block.col * layout.rowStep;
      const y = layout.gridY + block.row * layout.rowStep;
      const blockGraphics = drawBlock(block, props.blockTypeById.get(block.blockTypeId), {
        active,
        exposed,
        platformRow,
        size: layout.cellSize
      });

      blockGraphics.position.set(x, y);

      if (!block.destroyed && exposed) {
        blockGraphics.eventMode = "static";
        blockGraphics.cursor = "pointer";
        blockGraphics.on("pointertap", () => onBlockHitRef.current(block));
      }

      mineLayer.addChild(blockGraphics);

      for (const effect of hitEffectsByCell.get(blockKey) ?? []) {
        effectsLayer.addChild(drawHitEffect(effect, x + layout.cellSize / 2, y + layout.cellSize / 2, layout.cellSize));
      }
    }
  }
}

function drawDepthMarkers(root: Container, layout: MinePixiLayout, props: MinePixiSceneProps) {
  for (let row = 0; row < props.session.mine.height; row += 1) {
    const label = props.depthMarkerLabel(row);

    if (!label) {
      continue;
    }

    const y = layout.gridY + row * layout.rowStep + layout.cellSize / 2;
    const text = createText({
      color: row === props.currentPlatformRow ? 0xf2b84b : 0xb7a58f,
      fontSize: 10,
      fontWeight: "800",
      text: label
    });
    text.anchor.set(1, 0.5);
    text.position.set(layout.gridX - 6, y);
    root.addChild(text);
  }
}

function drawLiftCables(root: Container, layout: MinePixiLayout) {
  const cableX = layout.gridX;
  const cableTop = layout.surfaceHeight - 104;
  const cableBottom = Math.max(layout.surfaceHeight, layout.platformY + layout.platformHeight - 18);

  root.addChild(
    new Graphics()
      .circle(cableX - 3, layout.surfaceHeight - 100, 12)
      .stroke({ color: 0x9ca3ad, width: 3 })
      .rect(cableX - 6, layout.surfaceHeight - 75, 12, 75)
      .fill({ color: 0x604122 })
      .rect(cableX - 1, cableTop + 16, 2, cableBottom - cableTop)
      .fill({ color: 0x9ca3ad })
      .rect(cableX + 4, cableTop + 16, 2, cableBottom - cableTop)
      .fill({ color: 0x717781 })
  );
}

function drawPlatform(
  root: Container,
  layout: MinePixiLayout,
  props: MinePixiSceneProps,
  dragState: DragState | null,
  animatedGoblinsRef: MutableRefObject<AnimatedItem[]>,
  platformRef: MutableRefObject<AnimatedItem | null>,
  setDragState: (state: DragState | null) => void
) {
  const platform = new Container();
  platform.position.set(0, layout.platformY);

  const graphics = new Graphics()
    .rect(layout.gridX, layout.platformHeight - 18, layout.platformWidth, 13)
    .fill({ color: 0x9b6a3a })
    .stroke({ color: 0x24160d, width: 1 })
    .rect(layout.gridX, layout.platformHeight - 6, layout.platformWidth, 5)
    .fill({ color: 0x55371f })
    .rect(layout.gridX - 2, 0, 3, layout.platformHeight - 8)
    .fill({ color: 0x9ca3ad })
    .rect(layout.gridX + layout.platformWidth - 1, 0, 3, layout.platformHeight - 8)
    .fill({ color: 0x9ca3ad });

  platform.addChild(graphics);

  for (let col = 0; col < props.session.mine.width; col += 1) {
    const block = props.session.blocks[props.currentPlatformRow]?.[col];
    const slotX = layout.gridX + col * layout.rowStep;
    const canPlace = Boolean(block && !block.destroyed);
    const isTarget = dragState?.targetCell?.col === col;
    const slot = new Graphics()
      .roundRect(slotX + 3, layout.platformHeight - 23, layout.cellSize - 6, 10, 4)
      .fill({ color: canPlace ? 0xa8753f : 0x3b2a1b, alpha: canPlace ? 1 : 0.56 });

    if (dragState?.goblinId && canPlace) {
      slot.stroke({ color: isTarget ? 0xf2b84b : 0x6fbf57, alpha: isTarget ? 0.95 : 0.75, width: isTarget ? 3 : 2 });
    }

    platform.addChild(slot);
  }

  for (const goblin of props.goblins) {
    if (goblin.col < 0 || goblin.col >= props.session.mine.width) {
      continue;
    }

    const x = layout.gridX + goblin.col * layout.rowStep + layout.cellSize / 2;
    const y = layout.platformHeight - 45;
    const isDragging = goblin.id === dragState?.goblinId;
    const goblinNode = drawGoblin(layout.cellSize, goblin.working, isDragging);
    goblinNode.position.set(x, y);
    goblinNode.eventMode = "static";
    goblinNode.cursor = "grab";
    goblinNode.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      event.preventDefault();
      const point = {
        x: event.global.x,
        y: event.global.y
      };
      const targetCell = pointToPlatformCell(point, layout, props.currentPlatformRow);
      setDragState({
        goblinId: goblin.id,
        point,
        targetCell: targetCell && props.platformCellKeys.has(cellKey(targetCell)) ? targetCell : null
      });
    });

    platform.addChild(goblinNode);
    animatedGoblinsRef.current.push({
      baseY: y,
      node: goblinNode,
      phase: goblin.col * 0.8,
      working: goblin.working
    });
  }

  root.addChild(platform);
  drawDragPreview(root, layout, props, dragState);
  platformRef.current = {
    baseY: layout.platformY,
    node: platform,
    phase: 0,
    working: false
  };
}

function drawDragPreview(
  root: Container,
  layout: MinePixiLayout,
  props: MinePixiSceneProps,
  dragState: DragState | null
) {
  if (!dragState) {
    return;
  }

  const sourceGoblin = props.goblins.find((goblin) => goblin.id === dragState.goblinId);

  if (!sourceGoblin) {
    return;
  }

  const preview = drawGoblin(layout.cellSize, sourceGoblin.working, false);
  preview.alpha = 0.82;
  preview.position.set(dragState.point.x, dragState.point.y - layout.platformHeight * 0.55);
  preview.scale.set(preview.scale.x * 1.08);
  root.addChild(preview);

  if (dragState.targetCell) {
    const targetX = layout.gridX + dragState.targetCell.col * layout.rowStep;
    root.addChild(
      new Graphics()
        .roundRect(targetX + 2, layout.platformY + layout.platformHeight - 27, layout.cellSize - 4, 16, 5)
        .stroke({ color: 0xf2b84b, alpha: 0.95, width: 3 })
    );
  }
}

function drawBlock(
  block: MiningBlockState,
  blockType: BlockTypeConfig | undefined,
  options: {
    active: boolean;
    exposed: boolean;
    platformRow: boolean;
    size: number;
  }
): Container {
  const container = new Container();
  const size = options.size;
  const hpPercent = Math.max(0, Math.min(1, block.hp / block.maxHp));
  const color = block.destroyed ? 0x15100c : blockColor(block.blockTypeId, blockType);
  const crackedAlpha = block.destroyed ? 0 : blockDamageAlpha(hpPercent);

  container.addChild(
    new Graphics()
      .roundRect(0, 0, size, size, 5)
      .fill({ color })
      .stroke({ color: options.active ? 0xf2b84b : 0x0f0a07, alpha: options.active ? 0.95 : 0.55, width: options.active ? 2 : 1 })
  );

  if (!block.destroyed && options.platformRow) {
    container.addChild(
      new Graphics()
        .roundRect(2, 2, size - 4, size - 4, 4)
        .stroke({ color: 0xf2b84b, alpha: 0.3, width: 1 })
    );
  }

  if (!block.destroyed && options.exposed) {
    container.addChild(
      new Graphics()
        .rect(0, 0, size, 3)
        .fill({ color: 0x44c6c8, alpha: 0.52 })
    );
  }

  if (!block.destroyed && !options.exposed) {
    container.addChild(
      new Graphics()
        .roundRect(0, 0, size, size, 5)
        .fill({ color: 0x000000, alpha: 0.32 })
    );
  }

  if (crackedAlpha > 0) {
    container.addChild(drawCracks(size, crackedAlpha));
  }

  if (!block.destroyed) {
    const hpText = createText({
      color: 0xf7ead8,
      fontSize: Math.max(9, Math.floor(size * 0.24)),
      fontWeight: "800",
      text: String(Math.ceil(block.hp))
    });
    hpText.position.set(5, 4);
    container.addChild(hpText);

    const labelText = createText({
      color: 0xffffff,
      fontSize: Math.max(8, Math.floor(size * 0.2)),
      fontWeight: "800",
      text: shortBlockLabel(blockType)
    });
    labelText.anchor.set(1, 1);
    labelText.alpha = 0.58;
    labelText.position.set(size - 4, size - 5);
    container.addChild(labelText);

    container.addChild(
      new Graphics()
        .roundRect(4, size - 7, Math.max(3, (size - 8) * hpPercent), 3, 2)
        .fill({ color: 0x6fbf57 })
    );
  }

  return container;
}

function drawCracks(size: number, alpha: number): Graphics {
  return new Graphics()
    .moveTo(size * 0.28, size * 0.18)
    .lineTo(size * 0.46, size * 0.42)
    .lineTo(size * 0.38, size * 0.7)
    .moveTo(size * 0.62, size * 0.2)
    .lineTo(size * 0.52, size * 0.5)
    .lineTo(size * 0.74, size * 0.76)
    .stroke({ color: 0x0d0907, alpha, width: 2 });
}

function drawHitEffect(effect: MinePixiHitEffect, x: number, y: number, size: number): Container {
  const burst = new Container();
  const scale = effect.variant === "critical" ? 1.2 : 1;
  const color = effect.variant === "goblin" ? 0x5e3d24 : effect.variant === "critical" ? 0xffffff : 0xf2b84b;
  const accent = effect.variant === "goblin" ? 0x34251b : 0xc4442d;

  burst.position.set(x, y);
  burst.addChild(
    new Graphics()
      .circle(0, 0, size * 0.18 * scale)
      .fill({ color, alpha: 0.74 })
      .circle(-size * 0.22, -size * 0.16, size * 0.07)
      .fill({ color: accent, alpha: 0.82 })
      .circle(size * 0.24, -size * 0.08, size * 0.06)
      .fill({ color: 0xf2b84b, alpha: 0.82 })
      .circle(-size * 0.16, size * 0.24, size * 0.08)
      .fill({ color: 0x8d5c2e, alpha: 0.74 })
  );

  return burst;
}

function drawGoblin(cellSize: number, working: boolean, dragging: boolean): Container {
  const goblin = new Container();
  const scale = Math.max(0.8, Math.min(1.05, cellSize / 42));
  goblin.scale.set(scale);
  goblin.alpha = dragging ? 0.55 : 1;

  goblin.addChild(
    new Graphics()
      .roundRect(-10, 16, 20, 7, 5)
      .fill({ color: 0x2d2118 })
      .stroke({ color: 0x20170f, width: 1 })
      .roundRect(-12, 20, 24, 8, 5)
      .fill({ color: 0x4f7334 })
      .roundRect(-7, 4, 14, 14, 6)
      .fill({ color: 0x75a94b })
      .stroke({ color: 0x18210f, width: 1 })
      .roundRect(-6, 17, 12, 13, 5)
      .fill({ color: 0x6b4d2e })
      .stroke({ color: 0x1b1a12, width: 1 })
      .rect(-2, 27, 5, 24)
      .fill({ color: 0x9ca3ad })
      .rect(-5, 44, 11, 6)
      .fill({ color: working ? 0xf2b84b : 0xc07a3d, alpha: working ? 0.94 : 0.8 })
  );

  goblin.addChild(
    new Graphics()
      .circle(-3, 10, 1.5)
      .fill({ color: 0x11170c })
      .circle(3, 10, 1.5)
      .fill({ color: 0x11170c })
  );

  return goblin;
}

function drawTree(container: Container, x: number, y: number, scale: number) {
  const tree = new Container();
  tree.position.set(x, y);
  tree.scale.set(scale);
  tree.addChild(
    new Graphics()
      .rect(10, 22, 6, 34)
      .fill({ color: 0x4a321e })
      .roundRect(0, 8, 26, 18, 10)
      .fill({ color: 0x2f6b3b })
      .roundRect(-4, 20, 34, 20, 10)
      .fill({ color: 0x255933 })
  );
  container.addChild(tree);
}

function platformDropOffset(progress: number): number {
  if (progress <= 0) {
    return -30;
  }

  if (progress >= 1) {
    return 0;
  }

  const eased = 1 - Math.pow(1 - progress, 3);
  const settle = Math.sin(progress * Math.PI * 2.5) * (1 - progress) * 8;
  return -30 * (1 - eased) + settle;
}

function blockColor(blockTypeId: string, blockType: BlockTypeConfig | undefined): number {
  if (blockTypeId.includes("copper")) {
    return 0xa35f38;
  }

  if (blockTypeId.includes("gold")) {
    return 0xd49a35;
  }

  if (blockType?.specialBehavior === "chest" || blockTypeId.includes("chest")) {
    return 0xb77b35;
  }

  if (blockTypeId.includes("stone")) {
    return 0x62666d;
  }

  return 0x6a4a2e;
}

function blockDamageAlpha(hpPercent: number): number {
  if (hpPercent <= 0.34) {
    return 0.78;
  }

  if (hpPercent <= 0.67) {
    return 0.52;
  }

  if (hpPercent < 1) {
    return 0.34;
  }

  return 0;
}

function shortBlockLabel(blockType?: BlockTypeConfig): string {
  if (!blockType) {
    return "?";
  }

  if (blockType.id === "copper_ore") {
    return "Cu";
  }

  if (blockType.specialBehavior === "chest") {
    return "Box";
  }

  return blockType.id.slice(0, 2).toUpperCase();
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
