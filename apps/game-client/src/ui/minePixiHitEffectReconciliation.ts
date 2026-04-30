import { Container } from "pixi.js";
import type { MutableRefObject } from "react";
import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import type { MiningSession } from "@goblin-cartel/game-core";
import {
  cellKey,
  isRowInVisibleRange,
  type MinePixiLayout,
  type MinePixiVisibleRowRange
} from "./minePixiLayout";
import {
  drawHitEffect,
  rewardDropsSignature,
  type AnimatedHitEffect,
  type MinePixiHitEffect,
  type MinePixiHitEffectVariant
} from "./minePixiEffects";
import { blockColor } from "./minePixiBlocks";
import {
  removeMinePixiRenderedNode,
  type MinePixiRenderedNode
} from "./minePixiRenderNodes";

export interface MinePixiAnimatedBlockImpact {
  cellKey: string;
  destroyed: boolean;
  duration: number;
  startedAt: number;
  variant: MinePixiHitEffectVariant;
}

export function reconcileHitEffects(input: {
  animatedBlockImpactsRef: MutableRefObject<Map<number, MinePixiAnimatedBlockImpact>>;
  animatedHitEffectsRef: MutableRefObject<AnimatedHitEffect[]>;
  blockTypeById: ReadonlyMap<string, BlockTypeConfig>;
  hitEffects: MinePixiHitEffect[];
  layout: MinePixiLayout;
  renderedEffects: Map<string, MinePixiRenderedNode>;
  root: Container;
  sessionBlocks: MiningSession["blocks"];
  visibleRowRange: MinePixiVisibleRowRange;
}) {
  const visibleEffectKeys = new Set<string>();

  for (const effect of input.hitEffects) {
    if (!isRowInVisibleRange(effect.row, input.visibleRowRange)) {
      continue;
    }

    const key = String(effect.id);
    const targetBlock = input.sessionBlocks[effect.row]?.[effect.col];
    const destroyed = Boolean(targetBlock?.destroyed);
    const x = input.layout.gridX + effect.col * input.layout.rowStep + input.layout.cellSize / 2;
    const y = input.layout.gridY + effect.row * input.layout.rowStep + input.layout.cellSize / 2;
    const signature = [
      effect.id,
      effect.row,
      effect.col,
      effect.variant,
      effect.damage,
      rewardDropsSignature(effect.rewardDrops),
      destroyed ? 1 : 0,
      input.layout.cellSize,
      x,
      y
    ].join("|");
    const renderedEffect = input.renderedEffects.get(key);
    visibleEffectKeys.add(key);

    if (renderedEffect?.signature === signature) {
      continue;
    }

    if (renderedEffect) {
      removeMinePixiRenderedNode(input.renderedEffects, key, renderedEffect);
      input.animatedHitEffectsRef.current = input.animatedHitEffectsRef.current.filter((item) => item.id !== effect.id);
    }

    const targetBlockType = targetBlock ? input.blockTypeById.get(targetBlock.blockTypeId) : undefined;
    const drawnEffect = drawHitEffect(
      effect,
      x,
      y,
      input.layout.cellSize,
      destroyed,
      blockColor(targetBlock?.blockTypeId ?? "", targetBlockType)
    );
    input.root.addChild(drawnEffect.node);
    input.animatedHitEffectsRef.current.push({
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
    input.animatedBlockImpactsRef.current.set(effect.id, {
      cellKey: cellKey(effect),
      destroyed,
      duration: destroyed ? 620 : 360,
      startedAt: performance.now(),
      variant: effect.variant
    });
    input.renderedEffects.set(key, {
      node: drawnEffect.node,
      signature
    });
  }

  for (const [key, renderedEffect] of input.renderedEffects) {
    if (!visibleEffectKeys.has(key)) {
      removeMinePixiRenderedNode(input.renderedEffects, key, renderedEffect);
      input.animatedHitEffectsRef.current = input.animatedHitEffectsRef.current.filter((item) => String(item.id) !== key);
    }
  }
}
