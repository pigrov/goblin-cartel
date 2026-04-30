import type { Application } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import type { MiningBlockState, MiningSession } from "@goblin-cartel/game-core";
import type { AnimatedHitEffect } from "./minePixiEffects";
import type { MinePixiLiftRail } from "./minePixiBackground";
import type { MinePixiAnimatedBlockImpact } from "./minePixiHitEffectReconciliation";
import {
  createMinePixiApp,
  type MinePixiAppHandle,
  type MinePixiSceneLayers
} from "./minePixiApp";
import type { MinePixiLayout, MinePixiVisibleRowRange } from "./minePixiLayout";
import type { MinePixiAnimatedItem } from "./minePixiPlatform";
import type { MinePixiRenderedNode } from "./minePixiRenderNodes";
import { runMinePixiTickerFrame, type PixiDevStats } from "./minePixiTicker";
import type { MinePixiTouchPanState, PixiDevHitTest } from "./minePixiInput";

export function useMinePixiSceneRuntime(input: {
  activeCell: {
    row: number;
    col: number;
  };
  currentPlatformRow: number;
  devOverlayEnabled: boolean;
  exposedCellKeys: ReadonlySet<string>;
  onBlockHit: (block: MiningBlockState) => void;
  onPlaceGoblin: (goblinId: string, targetCell: { row: number; col: number }) => void;
  platformCellKeys: ReadonlySet<string>;
  platformDropAnimating: boolean;
  session: MiningSession;
  visibleRowRange: MinePixiVisibleRowRange;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const animatedBlockImpactsRef = useRef<Map<number, MinePixiAnimatedBlockImpact>>(new Map());
  const animatedHitEffectsRef = useRef<AnimatedHitEffect[]>([]);
  const blockNodesRef = useRef<Map<string, MinePixiRenderedNode>>(new Map());
  const depthMarkerNodesRef = useRef<Map<string, MinePixiRenderedNode>>(new Map());
  const hitEffectNodesRef = useRef<Map<string, MinePixiRenderedNode>>(new Map());
  const liftRailRef = useRef<MinePixiLiftRail | null>(null);
  const layersRef = useRef<MinePixiSceneLayers | null>(null);
  const devOverlayEnabledRef = useRef(input.devOverlayEnabled);
  const devHitTestLastUpdatedAtRef = useRef(0);
  const devStatsLastUpdatedAtRef = useRef(0);
  const touchPanBlockTapUntilRef = useRef(0);
  const touchPanStateRef = useRef<MinePixiTouchPanState | null>(null);
  const layoutRef = useRef<MinePixiLayout | null>(null);
  const animatedGoblinsRef = useRef<MinePixiAnimatedItem[]>([]);
  const activeCellRef = useRef(input.activeCell);
  const currentPlatformRowRef = useRef(input.currentPlatformRow);
  const exposedCellKeysRef = useRef(input.exposedCellKeys);
  const onBlockHitRef = useRef(input.onBlockHit);
  const onPlaceGoblinRef = useRef(input.onPlaceGoblin);
  const platformCellKeysRef = useRef(input.platformCellKeys);
  const sessionBlocksRef = useRef(input.session.blocks);
  const platformRef = useRef<MinePixiAnimatedItem | null>(null);
  const platformDropAnimatingRef = useRef(false);
  const platformAnimationStartedAtRef = useRef(0);
  const totalCellCountRef = useRef(input.session.mine.width * input.session.mine.height);
  const visibleRowRangeRef = useRef<MinePixiVisibleRowRange>(input.visibleRowRange);
  const previousPlatformDropSignalRef = useRef({
    animating: false,
    row: input.currentPlatformRow
  });
  const [devHitTest, setDevHitTest] = useState<PixiDevHitTest | null>(null);
  const [devStats, setDevStats] = useState<PixiDevStats | null>(null);
  const [readyTick, setReadyTick] = useState(0);

  useEffect(() => {
    devOverlayEnabledRef.current = input.devOverlayEnabled;

    if (!input.devOverlayEnabled) {
      setDevHitTest(null);
      setDevStats(null);
    }
  }, [input.devOverlayEnabled]);

  useEffect(() => {
    visibleRowRangeRef.current = input.visibleRowRange;
  }, [input.visibleRowRange]);

  useEffect(() => {
    totalCellCountRef.current = input.session.mine.width * input.session.mine.height;
  }, [input.session.mine.height, input.session.mine.width]);

  useEffect(() => {
    platformDropAnimatingRef.current = input.platformDropAnimating;
  }, [input.platformDropAnimating]);

  useEffect(() => {
    const previous = previousPlatformDropSignalRef.current;

    if (input.platformDropAnimating && (!previous.animating || previous.row !== input.currentPlatformRow)) {
      platformAnimationStartedAtRef.current = performance.now();
    }

    previousPlatformDropSignalRef.current = {
      animating: input.platformDropAnimating,
      row: input.currentPlatformRow
    };
  }, [input.currentPlatformRow, input.platformDropAnimating]);

  useEffect(() => {
    currentPlatformRowRef.current = input.currentPlatformRow;
  }, [input.currentPlatformRow]);

  useEffect(() => {
    activeCellRef.current = input.activeCell;
  }, [input.activeCell]);

  useEffect(() => {
    onBlockHitRef.current = input.onBlockHit;
  }, [input.onBlockHit]);

  useEffect(() => {
    exposedCellKeysRef.current = input.exposedCellKeys;
  }, [input.exposedCellKeys]);

  useEffect(() => {
    onPlaceGoblinRef.current = input.onPlaceGoblin;
  }, [input.onPlaceGoblin]);

  useEffect(() => {
    platformCellKeysRef.current = input.platformCellKeys;
  }, [input.platformCellKeys]);

  useEffect(() => {
    sessionBlocksRef.current = input.session.blocks;
  }, [input.session.blocks]);

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

  return {
    activeCellRef,
    animatedBlockImpactsRef,
    animatedGoblinsRef,
    animatedHitEffectsRef,
    appRef,
    blockNodesRef,
    currentPlatformRowRef,
    depthMarkerNodesRef,
    devHitTest,
    devHitTestLastUpdatedAtRef,
    devOverlayEnabledRef,
    devStats,
    exposedCellKeysRef,
    hitEffectNodesRef,
    hostRef,
    layersRef,
    layoutRef,
    liftRailRef,
    onBlockHitRef,
    onPlaceGoblinRef,
    platformAnimationStartedAtRef,
    platformCellKeysRef,
    platformDropAnimatingRef,
    platformRef,
    readyTick,
    sessionBlocksRef,
    setDevHitTest,
    touchPanBlockTapUntilRef,
    touchPanStateRef
  };
}
