import type { Application } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import type { MinePixiLayout } from "./minePixiLayout";
import {
  readMinePixiViewport,
  resizeMinePixiRenderer
} from "./minePixiViewport";

describe("minePixiViewport", () => {
  it("reads a clamped viewport from the playfield host", () => {
    const host = {
      clientHeight: 642.8,
      clientWidth: 280.6,
      scrollTop: -15
    } as Pick<HTMLElement, "clientHeight" | "clientWidth" | "scrollTop">;

    expect(readMinePixiViewport(host)).toEqual({
      sceneViewport: {
        height: 642,
        scrollTop: 0
      },
      viewportWidth: 320
    });
  });

  it("resizes renderer, canvas style, and hit area from layout", () => {
    const resize = vi.fn();
    const app = {
      canvas: {
        style: {}
      },
      renderer: {
        resize
      },
      stage: {
        hitArea: null
      }
    } as unknown as Application;
    const layout = {
      contentHeight: 900,
      width: 430
    } as MinePixiLayout;

    resizeMinePixiRenderer(app, layout);

    expect(resize).toHaveBeenCalledWith(430, 900);
    expect(app.canvas.style.width).toBe("430px");
    expect(app.canvas.style.height).toBe("900px");
    expect(app.stage.hitArea).toMatchObject({
      height: 900,
      width: 430,
      x: 0,
      y: 0
    });
  });
});
