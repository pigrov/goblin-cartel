import { Container, Graphics, Text } from "pixi.js";

const damageLabelRise = 56;
const rewardLabelRise = 68;

export type MinePixiHitEffectVariant = "boss" | "goblin" | "critical";

export interface MinePixiRewardDrop {
  amount: number;
  label: string;
  resourceId: string;
}

export interface MinePixiHitEffect {
  damage: number;
  id: number;
  rewardDrops: MinePixiRewardDrop[];
  row: number;
  col: number;
  variant: MinePixiHitEffectVariant;
}

export interface AnimatedHitEffect {
  collapseShards: AnimatedCollapseShard[];
  damageLabel: Container | null;
  damageLabelBaseY: number;
  duration: number;
  id: number;
  node: Container;
  particles: AnimatedHitParticle[];
  rewardLabels: AnimatedRewardLabel[];
  rings: Container[];
  slash: Container | null;
  startedAt: number;
}

export interface AnimatedRewardLabel {
  baseY: number;
  delay: number;
  node: Container;
}

export interface AnimatedHitParticle {
  delay: number;
  gravity: number;
  node: Container;
  spin: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
}

export interface AnimatedCollapseShard {
  delay: number;
  gravity: number;
  node: Container;
  scale: number;
  spin: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
}

export interface DrawnHitEffect {
  collapseShards: AnimatedCollapseShard[];
  damageLabel: Container | null;
  damageLabelBaseY: number;
  duration: number;
  node: Container;
  particles: AnimatedHitParticle[];
  rewardLabels: AnimatedRewardLabel[];
  rings: Container[];
  slash: Container | null;
}

interface HitEffectPalette {
  accent: number;
  dust: number;
  flash: number;
  ring: number;
  slash: number;
}

export function drawHitEffect(
  effect: MinePixiHitEffect,
  x: number,
  y: number,
  size: number,
  destroyed: boolean,
  blockFill: number
): DrawnHitEffect {
  const burst = new Container();
  const collapseShards: AnimatedCollapseShard[] = [];
  const rings: Container[] = [];
  const particles: AnimatedHitParticle[] = [];
  const palette = hitEffectPalette(effect.variant, destroyed);
  const particleCount = destroyed ? 16 : effect.variant === "critical" ? 14 : effect.variant === "boss" ? 11 : 8;
  const duration = destroyed ? 1960 : effect.variant === "critical" ? 720 : 620;
  const flashScale = effect.variant === "critical" ? 1.18 : effect.variant === "goblin" ? 0.82 : 1;
  const damageLabel = drawDamageLabel(effect, size);
  const damageLabelBaseY = -size * (effect.variant === "critical" ? 0.72 : 0.54);
  const rewardLabels = destroyed ? drawRewardLabels(effect.rewardDrops, size) : [];

  burst.position.set(x, y);
  burst.alpha = 0.98;

  const shockRing = new Graphics()
    .circle(0, 0, size * 0.18 * flashScale)
    .stroke({ color: palette.ring, alpha: destroyed ? 0.88 : 0.68, width: destroyed ? 3 : 2 });
  const dustRing = new Graphics()
    .circle(0, size * 0.06, size * 0.22)
    .stroke({ color: palette.dust, alpha: 0.46, width: 3 });
  rings.push(shockRing, dustRing);
  burst.addChild(shockRing, dustRing);

  if (destroyed) {
    const fracture = drawDestroyFracture(size, palette.ring);
    rings.push(fracture);
    burst.addChild(fracture);
  }

  const glow = new Graphics()
    .circle(0, 0, size * 0.16 * flashScale)
    .fill({ color: palette.flash, alpha: effect.variant === "goblin" ? 0.46 : 0.78 })
    .circle(-size * 0.12, size * 0.12, size * 0.1)
    .fill({ color: palette.dust, alpha: 0.42 });
  burst.addChild(glow);

  const slash = effect.variant === "goblin"
    ? null
    : new Graphics()
        .roundRect(-size * 0.38, -size * 0.035, size * 0.76, Math.max(3, size * 0.07), 3)
        .fill({ color: palette.slash, alpha: effect.variant === "critical" ? 0.9 : 0.72 });

  if (slash) {
    slash.rotation = effect.variant === "critical" ? -0.65 : -0.38;
    burst.addChild(slash);
  }

  if (destroyed) {
    collapseShards.push(...drawCollapseShards(size, blockFill, palette));

    for (const shard of collapseShards) {
      burst.addChild(shard.node);
    }
  }

  for (let index = 0; index < particleCount; index += 1) {
    const particleSize = Math.max(2, size * (destroyed && index % 3 === 0 ? 0.11 : 0.07));
    const particle = new Graphics();
    const particleColor = index % 4 === 0 ? palette.flash : index % 3 === 0 ? palette.accent : palette.dust;

    if (destroyed && index % 3 === 0) {
      particle.roundRect(-particleSize / 2, -particleSize / 2, particleSize, particleSize * 0.72, 2).fill({ color: particleColor, alpha: 0.92 });
    } else {
      particle.circle(0, 0, particleSize / 2).fill({ color: particleColor, alpha: 0.9 });
    }

    const spread = destroyed ? Math.PI * 1.7 : effect.variant === "goblin" ? Math.PI * 0.9 : Math.PI * 1.18;
    const startAngle = -Math.PI / 2 - spread / 2;
    const angle = startAngle + spread * (index / (particleCount - 1));
    const speedFactor = 0.48 + (index % 5) * 0.09 + (destroyed ? 0.22 : 0);
    const speed = size * speedFactor;

    burst.addChild(particle);
    particles.push({
      delay: (index % 4) * 0.025,
      gravity: size * (destroyed ? 0.28 : 0.18),
      node: particle,
      spin: (index % 2 === 0 ? 1 : -1) * (0.6 + index * 0.08),
      startX: 0,
      startY: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed
    });
  }

  damageLabel.position.set(0, damageLabelBaseY);
  burst.addChild(damageLabel);

  for (const rewardLabel of rewardLabels) {
    burst.addChild(rewardLabel.node);
  }

  return {
    collapseShards,
    damageLabel,
    damageLabelBaseY,
    duration,
    node: burst,
    particles,
    rewardLabels,
    rings,
    slash
  };
}

export function animateHitEffects(now: number, animatedEffects: AnimatedHitEffect[]) {
  for (let index = animatedEffects.length - 1; index >= 0; index -= 1) {
    const item = animatedEffects[index];

    if (!item) {
      continue;
    }

    const elapsed = now - item.startedAt;

    if (elapsed >= item.duration) {
      item.node.alpha = 0;
      animatedEffects.splice(index, 1);
      continue;
    }

    const progress = clamp01(elapsed / item.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    item.node.alpha = Math.max(0, 1 - progress * 1.18);
    item.node.scale.set(0.72 + eased * 0.62);
    item.node.rotation = Math.sin(progress * Math.PI * 2.6) * (1 - progress) * 0.08;

    for (let ringIndex = 0; ringIndex < item.rings.length; ringIndex += 1) {
      const ring = item.rings[ringIndex];

      if (!ring) {
        continue;
      }

      ring.alpha = Math.max(0, (1 - progress) * (ringIndex === 0 ? 0.9 : 0.54));
      ring.scale.set(0.42 + eased * (ringIndex === 0 ? 1.25 : 0.84));
    }

    if (item.slash) {
      item.slash.alpha = Math.max(0, 1 - progress * 2.3);
      item.slash.scale.set(0.55 + eased * 0.92, 1);
    }

    for (const shard of item.collapseShards) {
      const shardProgress = clamp01((progress - shard.delay) / Math.max(0.01, 1 - shard.delay));
      const shardEase = 1 - Math.pow(1 - shardProgress, 2);
      shard.node.alpha = shardProgress <= 0
        ? 0
        : Math.max(0, shardProgress < 0.08 ? shardProgress / 0.08 : 1 - Math.max(0, shardProgress - 0.7) / 0.3);
      shard.node.position.set(
        shard.startX + shard.vx * shardEase,
        shard.startY + shard.vy * shardEase + shard.gravity * shardProgress * shardProgress
      );
      shard.node.rotation = shard.spin * shardProgress;
      shard.node.scale.set(shard.scale * (1 + shardProgress * 0.18));
    }

    if (item.damageLabel) {
      const labelRise = -damageLabelRise * eased;
      item.damageLabel.y = item.damageLabelBaseY + labelRise;
      item.damageLabel.alpha = progress < 0.18 ? progress / 0.18 : Math.max(0, 1 - (progress - 0.34) / 0.66);
      item.damageLabel.scale.set(1 + (1 - progress) * 0.18);
    }

    for (const rewardLabel of item.rewardLabels) {
      const rewardProgress = clamp01((progress - rewardLabel.delay) / Math.max(0.01, 1 - rewardLabel.delay));
      const rewardEase = 1 - Math.pow(1 - rewardProgress, 3);
      rewardLabel.node.y = rewardLabel.baseY - rewardEase * rewardLabelRise;
      rewardLabel.node.alpha = rewardProgress <= 0
        ? 0
        : Math.max(0, rewardProgress < 0.18 ? rewardProgress / 0.18 : 1 - Math.max(0, rewardProgress - 0.62) / 0.38);
      rewardLabel.node.scale.set(0.86 + rewardEase * 0.16);
    }

    for (const particle of item.particles) {
      const particleProgress = clamp01((progress - particle.delay) / Math.max(0.01, 1 - particle.delay));
      const particleEase = 1 - Math.pow(1 - particleProgress, 2);
      particle.node.alpha = particleProgress <= 0 ? 0 : Math.max(0, 1 - particleProgress);
      particle.node.position.set(
        particle.startX + particle.vx * particleEase,
        particle.startY + particle.vy * particleEase + particle.gravity * particleProgress * particleProgress
      );
      particle.node.rotation = particle.spin * particleProgress;
      particle.node.scale.set(0.78 + particleProgress * 0.5);
    }
  }
}

export function rewardDropsSignature(rewardDrops: MinePixiRewardDrop[]): string {
  return rewardDrops.map((drop) => `${drop.resourceId}:${drop.amount}:${drop.label}`).join(",");
}

function hitEffectPalette(variant: MinePixiHitEffectVariant, destroyed: boolean): HitEffectPalette {
  if (variant === "critical") {
    return {
      accent: 0xc4442d,
      dust: destroyed ? 0x8d5c2e : 0xf2b84b,
      flash: 0xffffff,
      ring: 0xf7ead8,
      slash: 0xffffff
    };
  }

  if (variant === "goblin") {
    return {
      accent: 0x8d5c2e,
      dust: destroyed ? 0x6a4a2e : 0x5e3d24,
      flash: 0xf2b84b,
      ring: 0x8d5c2e,
      slash: 0xf2b84b
    };
  }

  return {
    accent: 0xc07a3d,
    dust: destroyed ? 0x8d5c2e : 0x6a4a2e,
    flash: 0xf2b84b,
    ring: 0xf2b84b,
    slash: 0xf7ead8
  };
}

function drawDestroyFracture(size: number, color: number): Graphics {
  return new Graphics()
    .moveTo(-size * 0.34, -size * 0.3)
    .lineTo(-size * 0.14, -size * 0.08)
    .lineTo(-size * 0.28, size * 0.18)
    .moveTo(size * 0.08, -size * 0.34)
    .lineTo(-size * 0.02, -size * 0.06)
    .lineTo(size * 0.22, size * 0.22)
    .moveTo(size * 0.34, -size * 0.12)
    .lineTo(size * 0.1, size * 0.04)
    .lineTo(size * 0.32, size * 0.34)
    .stroke({ color, alpha: 0.86, width: 2 });
}

function drawCollapseShards(size: number, blockFill: number, palette: HitEffectPalette): AnimatedCollapseShard[] {
  const shardCount = 8;
  const shards: AnimatedCollapseShard[] = [];

  for (let index = 0; index < shardCount; index += 1) {
    const width = size * (0.13 + (index % 3) * 0.035);
    const height = size * (0.1 + (index % 2) * 0.035);
    const tint = adjustColor(blockFill, index % 2 === 0 ? 16 : -18);
    const node = new Graphics()
      .roundRect(-width / 2, -height / 2, width, height, 2)
      .fill({ color: tint, alpha: 0.96 })
      .stroke({ color: index % 3 === 0 ? palette.accent : 0x120c08, alpha: 0.48, width: 1 });
    const column = index % 4;
    const row = Math.floor(index / 4);
    const startX = (column - 1.5) * size * 0.16;
    const startY = (row - 0.5) * size * 0.22;
    const angle = -Math.PI * 0.88 + (Math.PI * 1.76 * index) / Math.max(1, shardCount - 1);
    const speed = size * (0.3 + (index % 4) * 0.055);

    node.alpha = 0;
    node.position.set(startX, startY);
    node.rotation = (index - 3.5) * 0.16;

    shards.push({
      delay: index * 0.018,
      gravity: size * (0.34 + (index % 3) * 0.04),
      node,
      scale: 0.94 + (index % 3) * 0.05,
      spin: (index % 2 === 0 ? 1 : -1) * (1.1 + index * 0.12),
      startX,
      startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - size * 0.08
    });
  }

  return shards;
}

function drawDamageLabel(effect: MinePixiHitEffect, size: number): Container {
  const label = new Container();
  const critical = effect.variant === "critical";
  const fontSize = Math.max(13, Math.floor(size * (critical ? 0.34 : 0.29)));
  const text = `${critical ? "КРИТ " : ""}-${formatDamageAmount(effect.damage)}`;
  const fill = critical ? 0xffffff : effect.variant === "boss" ? 0xf2b84b : 0xf7ead8;
  const shadowFill = critical ? 0x7a1f16 : 0x120c08;
  const shadow = createText({
    color: shadowFill,
    fontSize,
    fontWeight: "800",
    text
  });
  const main = createText({
    color: fill,
    fontSize,
    fontWeight: "800",
    text
  });

  shadow.anchor.set(0.5);
  shadow.position.set(1.5, 1.5);
  main.anchor.set(0.5);
  label.addChild(shadow, main);

  return label;
}

function drawRewardLabels(rewardDrops: MinePixiRewardDrop[], size: number): AnimatedRewardLabel[] {
  return rewardDrops.slice(0, 3).map((drop, index) => {
    const fontSize = Math.max(10, Math.floor(size * 0.22));
    const color = resourceColor(drop.resourceId);
    const textValue = `+${formatDamageAmount(drop.amount)} ${drop.label}`;
    const shadow = createText({
      color: 0x120c08,
      fontSize,
      fontWeight: "800",
      text: textValue
    });
    const text = createText({
      color,
      fontSize,
      fontWeight: "800",
      text: textValue
    });
    const label = new Container();
    const height = Math.max(16, fontSize * 1.45);
    const iconSize = Math.max(7, height * 0.35);
    const width = Math.max(size * 0.82, text.width + iconSize + 8);
    const baseY = size * 0.13 + index * (height + 3);
    const icon = drawRewardIcon(drop.resourceId, iconSize);

    shadow.anchor.set(0, 0.5);
    shadow.position.set(-width / 2 + iconSize + 8 + 1.2, 1.2);
    text.anchor.set(0, 0.5);
    text.position.set(-width / 2 + iconSize + 8, 0);
    icon.position.set(-width / 2 + iconSize / 2, 0);
    label.position.set((index % 2 === 0 ? -1 : 1) * size * 0.06, baseY);
    label.alpha = 0;
    label.addChild(icon, shadow, text);

    return {
      baseY,
      delay: 0.16 + index * 0.08,
      node: label
    };
  });
}

function drawRewardIcon(resourceId: string, size: number): Graphics {
  const color = resourceColor(resourceId);
  const icon = new Graphics();

  if (resourceId.includes("gold")) {
    return icon
      .circle(0, 0, size * 0.5)
      .fill({ color, alpha: 0.96 })
      .circle(size * 0.14, -size * 0.1, size * 0.42)
      .stroke({ color: 0xfff0a6, alpha: 0.76, width: 1 });
  }

  if (resourceId.includes("copper")) {
    return icon
      .roundRect(-size * 0.45, -size * 0.45, size * 0.9, size * 0.9, 2)
      .fill({ color, alpha: 0.95 })
      .stroke({ color: 0xf0b179, alpha: 0.72, width: 1 });
  }

  if (resourceId.includes("stone")) {
    return icon
      .roundRect(-size * 0.5, -size * 0.36, size, size * 0.72, 2)
      .fill({ color, alpha: 0.92 })
      .rect(-size * 0.18, -size * 0.48, size * 0.54, size * 0.42)
      .fill({ color: 0x747b86, alpha: 0.86 });
  }

  return icon
    .circle(0, 0, size * 0.5)
    .fill({ color, alpha: 0.94 })
    .stroke({ color: 0xd8ffd0, alpha: 0.56, width: 1 });
}

function formatDamageAmount(damage: number): string {
  if (!Number.isFinite(damage)) {
    return "0";
  }

  return Number.isInteger(damage) ? String(damage) : damage.toFixed(1);
}

function resourceColor(resourceId: string): number {
  if (resourceId.includes("gold")) {
    return 0xf2b84b;
  }

  if (resourceId.includes("copper")) {
    return 0xc07a3d;
  }

  if (resourceId.includes("stone")) {
    return 0x9ca3ad;
  }

  return 0x6fbf57;
}

function adjustColor(color: number, delta: number): number {
  const red = clampColorChannel((color >> 16) + delta);
  const green = clampColorChannel(((color >> 8) & 0xff) + delta);
  const blue = clampColorChannel((color & 0xff) + delta);

  return (red << 16) | (green << 8) | blue;
}

function clampColorChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
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
