import { Container, type Application } from "pixi.js";
import { describe, expect, it } from "vitest";
import {
  currentPlatformDropOffset,
  platformDropDurationMs,
  runMinePixiTickerFrame
} from "./minePixiTicker";

describe("minePixiTicker", () => {
  it("holds platform briefly before the descent starts", () => {
    const startedAt = 1000;

    expect(currentPlatformDropOffset(startedAt, true, startedAt, platformDropDurationMs)).toBe(-30);
    expect(currentPlatformDropOffset(startedAt + platformDropDurationMs * 0.08, true, startedAt, platformDropDurationMs)).toBe(-30);
    expect(currentPlatformDropOffset(startedAt + platformDropDurationMs * 0.35, true, startedAt, platformDropDurationMs)).toBeGreaterThan(-30);
  });

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
      platformDropDurationMs,
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
      platformDropDurationMs,
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

  it("animates platform drop effects only during the drop", () => {
    const startedAt = 2000;
    const dropEffects = new Container();
    const cable = new Container();
    cable.position.set(12, 0);
    const platform = {
      baseY: 120,
      cableNodes: [cable],
      dropEffects,
      node: new Container(),
      phase: 0,
      working: false
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
      liftRail: null,
      now: startedAt + platformDropDurationMs / 2,
      platform,
      platformAnimationStartedAt: startedAt,
      platformDropDurationMs,
      platformDropAnimating: true,
      setDevStats: () => {
        throw new Error("Dev stats should not update when overlay is disabled");
      },
      totalCells: 0,
      visibleRowRange: { endRow: 0, startRow: 0 }
    });

    expect(dropEffects.visible).toBe(true);
    expect(dropEffects.alpha).toBeGreaterThan(0.8);
    expect(platform.node.x).not.toBe(0);

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
      liftRail: null,
      now: startedAt + platformDropDurationMs + 1,
      platform,
      platformAnimationStartedAt: startedAt,
      platformDropDurationMs,
      platformDropAnimating: true,
      setDevStats: () => {
        throw new Error("Dev stats should not update when overlay is disabled");
      },
      totalCells: 0,
      visibleRowRange: { endRow: 0, startRow: 0 }
    });

    expect(dropEffects.visible).toBe(false);
    expect(dropEffects.alpha).toBe(0);
    expect(platform.node.x).toBe(0);
  });
});
