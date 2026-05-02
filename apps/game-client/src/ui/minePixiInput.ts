import type { Application } from "pixi.js";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { MiningBlockState, MiningSession } from "@goblin-cartel/game-core";
import {
  cellKey,
  pointToMineCell,
  pointToPlatformCell,
  pointToPlatformColumnCell,
  type MinePixiCell,
  type MinePixiLayout,
  type MinePixiPoint
} from "./minePixiLayout";
import type { MinePixiDragState } from "./minePixiPlatform";

export interface PixiDevHitTest {
  cell: string;
  point: string;
  selected: string;
  state: string;
}

export interface MinePixiTouchPanState {
  active: boolean;
  pointerId: number;
  scrollTop: number;
  startX: number;
  startY: number;
}

export function configurePixiInputForTouchScroll(app: Application) {
  const renderer = app.renderer as { events?: { autoPreventDefault: boolean } };

  if (renderer.events) {
    renderer.events.autoPreventDefault = false;
  }

  app.canvas.style.touchAction = "pan-y";
}

export function bindMinePixiPointerInput(input: {
  activeCellRef: MutableRefObject<{ row: number; col: number }>;
  appRef: MutableRefObject<Application | null>;
  currentPlatformRowRef: MutableRefObject<number>;
  devHitTestLastUpdatedAtRef: MutableRefObject<number>;
  devOverlayEnabledRef: MutableRefObject<boolean>;
  exposedCellKeysRef: MutableRefObject<ReadonlySet<string>>;
  host: HTMLDivElement;
  layoutRef: MutableRefObject<MinePixiLayout | null>;
  onBlockHitRef: MutableRefObject<(block: MiningBlockState) => void>;
  platformCellKeysRef: MutableRefObject<ReadonlySet<string>>;
  sessionBlocksRef: MutableRefObject<MiningSession["blocks"]>;
  setDevHitTest: (hitTest: PixiDevHitTest) => void;
  touchPanBlockTapUntilRef: MutableRefObject<number>;
  touchPanStateRef: MutableRefObject<MinePixiTouchPanState | null>;
}): () => void {
  const playfield = input.host;

  function updateDevHitTest(event: PointerEvent, force = false) {
    if (!input.devOverlayEnabledRef.current) {
      return;
    }

    const now = performance.now();

    if (!force && now - input.devHitTestLastUpdatedAtRef.current < 80) {
      return;
    }

    const layout = input.layoutRef.current;
    const canvas = input.appRef.current?.canvas;

    if (!layout || !canvas) {
      return;
    }

    input.devHitTestLastUpdatedAtRef.current = now;
    input.setDevHitTest(createPixiDevHitTest({
      activeCell: input.activeCellRef.current,
      exposedCellKeys: input.exposedCellKeysRef.current,
      layout,
      platformCellKeys: input.platformCellKeysRef.current,
      platformRow: input.currentPlatformRowRef.current,
      point: pointFromCanvasEvent(event, canvas),
      sessionBlocks: input.sessionBlocksRef.current
    }));
  }

  function handlePointerDown(event: PointerEvent) {
    const layout = input.layoutRef.current;
    const canvas = input.appRef.current?.canvas;

    if (layout && canvas) {
      const point = pointFromCanvasEvent(event, canvas);
      const platformCell = pointToPlatformCell(point, layout, input.currentPlatformRowRef.current);
      updateDevHitTest(event, true);

      if (platformCell && input.platformCellKeysRef.current.has(cellKey(platformCell))) {
        input.touchPanStateRef.current = null;
        return;
      }

      const mineCell = pointToMineCell(point, layout);
      const block = mineCell ? input.sessionBlocksRef.current[mineCell.row]?.[mineCell.col] : null;

      if (
        block &&
        !block.destroyed &&
        input.exposedCellKeysRef.current.has(cellKey(block)) &&
        performance.now() >= input.touchPanBlockTapUntilRef.current
      ) {
        input.onBlockHitRef.current(block);
      }
    }

    if (event.pointerType !== "touch") {
      return;
    }

    input.touchPanStateRef.current = {
      active: false,
      pointerId: event.pointerId,
      scrollTop: playfield.scrollTop,
      startX: event.clientX,
      startY: event.clientY
    };
  }

  function handlePointerMove(event: PointerEvent) {
    updateDevHitTest(event);

    const state = input.touchPanStateRef.current;

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
    input.touchPanBlockTapUntilRef.current = performance.now() + 350;
    if (event.cancelable) {
      event.preventDefault();
    }
  }

  function finishPointer(event: PointerEvent) {
    const state = input.touchPanStateRef.current;

    if (state?.pointerId === event.pointerId && state.active) {
      input.touchPanBlockTapUntilRef.current = performance.now() + 350;
      if (event.cancelable) {
        event.preventDefault();
      }
    }

    if (state?.pointerId === event.pointerId) {
      input.touchPanStateRef.current = null;
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
}

export function bindMinePixiDragPlacement(input: {
  appRef: MutableRefObject<Application | null>;
  currentPlatformRowRef: MutableRefObject<number>;
  dragState: MinePixiDragState | null;
  layoutRef: MutableRefObject<MinePixiLayout | null>;
  onPlaceGoblinRef: MutableRefObject<(goblinId: string, targetCell: { row: number; col: number }) => void>;
  platformCellKeysRef: MutableRefObject<ReadonlySet<string>>;
  setDragState: Dispatch<SetStateAction<MinePixiDragState | null>>;
}): (() => void) | undefined {
  if (!input.dragState?.goblinId) {
    return undefined;
  }

  const activeDraggingGoblinId = input.dragState.goblinId;
  const canvas = input.appRef.current?.canvas;
  const previousTouchAction = canvas?.style.touchAction;

  if (canvas) {
    canvas.style.touchAction = "none";
  }

  function updateDragPoint(event: PointerEvent): MinePixiPoint | null {
    const layout = input.layoutRef.current;
    const canvas = input.appRef.current?.canvas;

    if (!layout || !canvas) {
      return null;
    }

    const point = pointFromCanvasEvent(event, canvas);
    const targetCell = pointToPlatformColumnCell(point, layout, input.currentPlatformRowRef.current);

    input.setDragState((current) => current
      ? {
          ...current,
          point,
          targetCell: targetCell && input.platformCellKeysRef.current.has(cellKey(targetCell)) ? targetCell : null
        }
      : current);

    return point;
  }

  function finishDrag(event: PointerEvent) {
    if (event.cancelable) {
      event.preventDefault();
    }

    const layout = input.layoutRef.current;
    const canvas = input.appRef.current?.canvas;

    if (!layout || !canvas) {
      input.setDragState(null);
      return;
    }

    const point = updateDragPoint(event) ?? pointFromCanvasEvent(event, canvas);
    const targetCell = pointToPlatformColumnCell(point, layout, input.currentPlatformRowRef.current);

    if (targetCell && input.platformCellKeysRef.current.has(cellKey(targetCell))) {
      input.onPlaceGoblinRef.current(activeDraggingGoblinId, targetCell);
    }

    input.setDragState(null);
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.cancelable) {
      event.preventDefault();
    }

    updateDragPoint(event);
  }

  function cancelDrag(event?: PointerEvent) {
    if (event?.cancelable) {
      event.preventDefault();
    }

    input.setDragState(null);
  }

  window.addEventListener("pointermove", handlePointerMove, { passive: false });
  window.addEventListener("pointerup", finishDrag, { passive: false });
  window.addEventListener("pointercancel", cancelDrag, { passive: false });

  return () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", finishDrag);
    window.removeEventListener("pointercancel", cancelDrag);

    if (canvas) {
      canvas.style.touchAction = previousTouchAction ?? "";
    }
  };
}

export function pointFromCanvasEvent(event: PointerEvent, canvas: HTMLCanvasElement): MinePixiPoint {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
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
  const selected = formatDevCell(input.activeCell);
  const platformCell = pointToPlatformCell(input.point, input.layout, input.platformRow);

  if (platformCell && input.platformCellKeys.has(cellKey(platformCell))) {
    return {
      cell: formatDevCell(platformCell),
      point: `${Math.round(input.point.x)},${Math.round(input.point.y)}`,
      selected,
      state: "platform"
    };
  }

  const mineCell = pointToMineCell(input.point, input.layout);

  if (!mineCell) {
    return {
      cell: "-",
      point: `${Math.round(input.point.x)},${Math.round(input.point.y)}`,
      selected,
      state: "void"
    };
  }

  const block = input.sessionBlocks[mineCell.row]?.[mineCell.col];
  const key = cellKey(mineCell);

  return {
    cell: formatDevCell(mineCell),
    point: `${Math.round(input.point.x)},${Math.round(input.point.y)}`,
    selected,
    state: !block ? "missing" : block.destroyed ? "destroyed" : input.exposedCellKeys.has(key) ? "open" : "covered"
  };
}

function formatDevCell(cell: MinePixiCell): string {
  return `${cell.row}:${cell.col}`;
}
