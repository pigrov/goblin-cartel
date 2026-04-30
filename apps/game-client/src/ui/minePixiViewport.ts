import { Rectangle, type Application } from "pixi.js";
import type { MinePixiLayout, MinePixiViewport } from "./minePixiLayout";

export const minMinePixiViewportWidth = 320;

export const defaultMinePixiViewport: MinePixiViewport = {
  height: 0,
  scrollTop: 0
};

export function readMinePixiViewport(
  host: Pick<HTMLElement, "clientHeight" | "clientWidth" | "scrollTop">,
  minWidth = minMinePixiViewportWidth
): {
  sceneViewport: MinePixiViewport;
  viewportWidth: number;
} {
  return {
    sceneViewport: {
      height: Math.max(0, Math.floor(host.clientHeight)),
      scrollTop: Math.max(0, Math.floor(host.scrollTop))
    },
    viewportWidth: Math.max(minWidth, Math.floor(host.clientWidth))
  };
}

export function bindMinePixiViewport(input: {
  host: HTMLDivElement;
  minWidth?: number;
  setSceneViewport: (viewport: MinePixiViewport) => void;
  setViewportWidth: (width: number) => void;
}): () => void {
  function updateViewport() {
    const nextViewport = readMinePixiViewport(input.host, input.minWidth);

    input.setViewportWidth(nextViewport.viewportWidth);
    input.setSceneViewport(nextViewport.sceneViewport);
  }

  updateViewport();

  const observer = new ResizeObserver(updateViewport);
  observer.observe(input.host);
  input.host.addEventListener("scroll", updateViewport, { passive: true });

  return () => {
    observer.disconnect();
    input.host.removeEventListener("scroll", updateViewport);
  };
}

export function resizeMinePixiRenderer(app: Application, layout: MinePixiLayout) {
  app.renderer.resize(layout.width, layout.contentHeight);
  app.canvas.style.width = `${layout.width}px`;
  app.canvas.style.height = `${layout.contentHeight}px`;
  app.stage.hitArea = new Rectangle(0, 0, layout.width, layout.contentHeight);
}
