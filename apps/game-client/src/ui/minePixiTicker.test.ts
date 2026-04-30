import { Container, type Application } from "pixi.js";
import { describe, expect, it } from "vitest";
import {
  platformDropDurationMs,
  runMinePixiTickerFrame
} from "./minePixiTicker";

describe("minePixiTicker", () => {
  it("keeps lift rail height in sync with platform drop offset", () => {
    const startedAt = 1000;
    const platform = {
      baseY: 120,
      node: new Container(),
      phase: 0,
      working: false
    };
    const liftRail = {
      baseHeight: 100,
      node: new Container()
    };

    runMinePixiTickerFrame({
      animatedBlockImpacts: new Map(),
      animatedGoblins: [],
      animatedHitEffects: [],
      app: { ticker: { FPS: 60 } } as Application,
      blockNodes: new Map(),
      devOverlayEnabledRef: { current: false },
      devStatsLastUpdatedAtRef: { current: 0 },
      host: null,
      layout: null,
      liftRail,
      now: startedAt,
      platform,
      platformAnimationStartedAt: startedAt,
      platformDropAnimating: true,
      setDevStats: () => {
        throw new Error("Dev stats should not update when overlay is disabled");
      },
      totalCells: 0,
      visibleRowRange: { endRow: 0, startRow: 0 }
    });

    expect(platform.node.y).toBe(90);
    expect(liftRail.node.scale.y).toBe(70);

    runMinePixiTickerFrame({
      animatedBlockImpacts: new Map(),
      animatedGoblins: [],
      animatedHitEffects: [],
      app: { ticker: { FPS: 60 } } as Application,
      blockNodes: new Map(),
      devOverlayEnabledRef: { current: false },
      devStatsLastUpdatedAtRef: { current: 0 },
      host: null,
      layout: null,
      liftRail,
      now: startedAt + platformDropDurationMs + 1,
      platform,
      platformAnimationStartedAt: startedAt,
      platformDropAnimating: true,
      setDevStats: () => {
        throw new Error("Dev stats should not update when overlay is disabled");
      },
      totalCells: 0,
      visibleRowRange: { endRow: 0, startRow: 0 }
    });

    expect(platform.node.y).toBe(120);
    expect(liftRail.node.scale.y).toBe(100);
  });
});
