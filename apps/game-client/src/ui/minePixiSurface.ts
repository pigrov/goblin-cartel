import { Container, Graphics, Text } from "pixi.js";
import type { MinePixiLayout } from "./minePixiLayout";
import { minePixiLiftX } from "./minePixiLiftGeometry";

export interface MinePixiForeman {
  id: string;
  name: string;
  rarity: string;
}

export type MinePixiForemanSlot = MinePixiForeman | null;

export function drawSurface(
  root: Container,
  layout: MinePixiLayout,
  platformRow: number,
  foremen: readonly MinePixiForemanSlot[] = [],
  elevatorLevel = 1
) {
  const surface = new Container();

  surface.addChild(
    new Graphics()
      .rect(0, 0, layout.width, layout.surfaceHeight * 0.5)
      .fill({ color: 0x86cdea })
      .rect(0, layout.surfaceHeight * 0.5, layout.width, layout.surfaceHeight * 0.2)
      .fill({ color: 0x69a65d })
      .rect(0, layout.surfaceHeight * 0.7, layout.width, layout.surfaceHeight * 0.3)
      .fill({ color: 0x5b8f44 })
      .rect(0, layout.surfaceHeight - 13, layout.width, 13)
      .fill({ color: 0x6a4a2e })
  );

  drawSun(surface, layout.width - 58, 28);
  drawCloud(surface, 62, 28, 0.88);
  drawCloud(surface, layout.width * 0.54, 22, 0.66);
  drawBird(surface, layout.width * 0.32, 42, 0.78);
  drawBird(surface, layout.width * 0.7, 54, 0.62);
  drawTree(surface, 18, layout.surfaceHeight - 60, 1.08);
  drawTree(surface, 78, layout.surfaceHeight - 54, 0.82);
  drawTree(surface, layout.width - 58, layout.surfaceHeight - 56, 0.96);
  drawGrassClumps(surface, layout);
  drawSurfaceLift(surface, layout, elevatorLevel);
  drawForemanTower(surface, layout, foremen);

  const depthText = createText({
    color: 0xf2b84b,
    fontSize: 14,
    fontWeight: "800",
    text: `${platformRow + 1}`
  });
  depthText.position.set(12, 22);
  surface.addChild(depthText);

  const labelText = createText({
    color: 0x38586a,
    fontSize: 10,
    fontWeight: "800",
    text: "DEPTH"
  });
  labelText.position.set(12, 9);
  surface.addChild(labelText);

  root.addChild(surface);
}

export function drawLiftCables(root: Container, layout: MinePixiLayout) {
  const cableX = minePixiLiftX(layout);
  const pulleyY = layout.surfaceHeight - 108;
  const cableTop = pulleyY + 13;
  const cableBottom = layout.surfaceHeight;

  root.addChild(
    new Graphics()
      .rect(cableX - 10, pulleyY + 18, 4, 86)
      .fill({ color: 0x7c5530 })
      .rect(cableX + 12, pulleyY + 18, 4, 86)
      .fill({ color: 0x6a4728 })
      .rect(cableX - 16, pulleyY + 16, 38, 5)
      .fill({ color: 0x9b6a3a })
      .circle(cableX + 3, pulleyY + 13, 13)
      .fill({ color: 0x34424c })
      .stroke({ color: 0xd7dde2, width: 3 })
      .circle(cableX + 3, pulleyY + 13, 4)
      .fill({ color: 0xd7dde2 })
      .rect(cableX + 1, cableTop, 2, cableBottom - cableTop)
      .fill({ color: 0xd7dde2 })
      .rect(cableX + 6, cableTop, 2, cableBottom - cableTop)
      .fill({ color: 0x909ba5 })
  );
}

function drawSun(container: Container, x: number, y: number) {
  container.addChild(
    new Graphics()
      .circle(x, y, 16)
      .fill({ color: 0xf7d45c, alpha: 0.96 })
      .circle(x, y, 24)
      .stroke({ color: 0xf7d45c, alpha: 0.28, width: 3 })
  );
}

function drawCloud(container: Container, x: number, y: number, scale: number) {
  const cloud = new Container();
  cloud.position.set(x, y);
  cloud.scale.set(scale);
  cloud.alpha = 0.86;
  cloud.addChild(
    new Graphics()
      .ellipse(0, 6, 22, 8)
      .fill({ color: 0xf3fbff })
      .circle(-10, 2, 9)
      .fill({ color: 0xf3fbff })
      .circle(4, -2, 11)
      .fill({ color: 0xf3fbff })
      .circle(17, 4, 8)
      .fill({ color: 0xf3fbff })
  );
  container.addChild(cloud);
}

function drawBird(container: Container, x: number, y: number, scale: number) {
  const bird = new Graphics()
    .moveTo(-7, 0)
    .quadraticCurveTo(-3, -5, 0, 0)
    .quadraticCurveTo(4, -5, 8, 0)
    .stroke({ color: 0x2b3d47, alpha: 0.68, width: 2 });
  bird.position.set(x, y);
  bird.scale.set(scale);
  container.addChild(bird);
}

function drawTree(container: Container, x: number, y: number, scale: number) {
  const tree = new Container();
  tree.position.set(x, y);
  tree.scale.set(scale);
  tree.addChild(
    new Graphics()
      .rect(10, 22, 6, 34)
      .fill({ color: 0x6a4728 })
      .roundRect(0, 8, 26, 18, 10)
      .fill({ color: 0x3f8d48 })
      .roundRect(-4, 20, 34, 20, 10)
      .fill({ color: 0x2e713a })
      .roundRect(4, 0, 20, 18, 9)
      .fill({ color: 0x4a9b50 })
  );
  container.addChild(tree);
}

function drawGrassClumps(container: Container, layout: MinePixiLayout) {
  const grass = new Graphics();

  for (let index = 0; index < 18; index += 1) {
    const x = 8 + index * Math.max(18, layout.width / 18);
    const y = layout.surfaceHeight - 18 - (index % 3) * 4;
    grass
      .moveTo(x, y)
      .lineTo(x + 3, y - 8)
      .lineTo(x + 7, y)
      .stroke({ color: index % 2 === 0 ? 0x91c86c : 0x78b95f, alpha: 0.78, width: 1 });
  }

  container.addChild(grass);
}

function drawSurfaceLift(container: Container, layout: MinePixiLayout, elevatorLevel: number) {
  const x = minePixiLiftX(layout);
  const y = layout.surfaceHeight - 104;
  const level = Math.max(1, Math.min(5, Math.floor(elevatorLevel)));
  const railColor = level >= 2 ? 0x8b929b : 0x8a6138;
  const railShadowColor = level >= 2 ? 0x6e7881 : 0x75502e;
  const wheelColor = level >= 4 ? 0xc2c8cf : 0x56636d;
  const trimColor = level >= 5 ? 0xf2b84b : 0xf7ead8;

  container.addChild(
    new Graphics()
      .rect(x - 14, y + 20, 5, 76)
      .fill({ color: railColor })
      .rect(x + 15, y + 20, 5, 76)
      .fill({ color: railShadowColor })
      .rect(x - 20, y + 18, 46, 6)
      .fill({ color: level >= 3 ? 0xb17b45 : 0xa8753f })
      .rect(x - 18, y + 32, 42, 4)
      .fill({ color: 0x6a4728 })
      .circle(x + 3, y + 12, 15)
      .fill({ color: wheelColor })
      .stroke({ color: trimColor, alpha: 0.72, width: 3 })
      .circle(x + 3, y + 12, 5)
      .fill({ color: trimColor })
      .moveTo(x + 3, y - 3)
      .lineTo(x + 3, y + 27)
      .moveTo(x - 12, y + 12)
      .lineTo(x + 18, y + 12)
      .stroke({ color: 0x34424c, alpha: 0.8, width: 2 })
  );

  const levelText = createText({
    color: level >= 5 ? 0xf2b84b : 0xe8f4ff,
    fontSize: 9,
    fontWeight: "800",
    text: `LV ${level}`
  });

  levelText.anchor.set(0.5);
  levelText.position.set(x + 3, y + 50);
  container.addChild(levelText);
}

function drawForemanTower(container: Container, layout: MinePixiLayout, foremen: readonly MinePixiForemanSlot[]) {
  const x = Math.min(layout.width - 118, Math.max(layout.gridX + 12, layout.gridX + layout.gridWidth - 112));
  const y = layout.surfaceHeight - 112;
  const tower = new Container();

  tower.position.set(x, y);
  tower.addChild(
    new Graphics()
      .rect(18, 34, 7, 70)
      .fill({ color: 0x7b4c28 })
      .rect(84, 34, 7, 70)
      .fill({ color: 0x633b21 })
      .moveTo(18, 92)
      .lineTo(90, 48)
      .moveTo(90, 92)
      .lineTo(18, 48)
      .stroke({ color: 0x9b6738, width: 4 })
      .roundRect(9, 20, 90, 34, 7)
      .fill({ color: 0xb87b3f })
      .stroke({ color: 0x5e371e, width: 3 })
      .moveTo(2, 21)
      .lineTo(54, 0)
      .lineTo(106, 21)
      .closePath()
      .fill({ color: 0x8e2f2b })
      .stroke({ color: 0x5e1f1d, width: 3 })
      .rect(45, 5, 18, 13)
      .fill({ color: 0xd7b15a })
      .rect(20, 100, 72, 7)
      .fill({ color: 0x4b2b18 })
  );

  for (let index = 0; index < 3; index += 1) {
    const slotX = 28 + index * 26;
    const foreman = foremen[index] ?? null;

    if (foreman) {
      drawForemanTowerOccupant(tower, slotX, 38, foreman);
    } else {
      tower.addChild(
        new Graphics()
          .circle(slotX, 38, 10)
          .fill({ color: 0x29394a, alpha: 0.9 })
          .stroke({ color: 0xf0d386, width: 2 })
          .circle(slotX - 3, 35, 3)
          .fill({ color: 0x88d071, alpha: 0.76 })
      );
    }
  }

  tower.addChild(
    new Graphics()
      .rect(95, 9, 3, 24)
      .fill({ color: 0x5e371e })
      .moveTo(98, 10)
      .lineTo(114, 15)
      .lineTo(98, 22)
      .closePath()
      .fill({ color: 0xf2c14c })
  );
  container.addChild(tower);
}

function drawForemanTowerOccupant(container: Container, x: number, y: number, foreman: MinePixiForeman) {
  const rarityColor = foremanRarityColor(foreman.rarity);
  const initial = foreman.name.trim().slice(0, 1).toUpperCase() || "?";
  const text = new Text({
    style: {
      fill: 0x17310f,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: 9,
      fontWeight: "800"
    },
    text: initial
  });

  text.anchor.set(0.5);
  text.position.set(x, y + 2);
  container.addChild(
    new Graphics()
      .circle(x, y, 12)
      .fill({ color: 0x79af4d })
      .stroke({ color: rarityColor, width: 2.5 })
      .roundRect(x - 9, y - 14, 18, 8, 4)
      .fill({ color: 0xd7b15a })
      .stroke({ color: 0x6f4b24, width: 1 })
      .circle(x - 4, y - 2, 1.4)
      .fill({ color: 0x10170b })
      .circle(x + 4, y - 2, 1.4)
      .fill({ color: 0x10170b })
  );
  container.addChild(text);
}

function foremanRarityColor(rarity: string): number {
  switch (rarity) {
    case "legendary":
      return 0xf2b84b;
    case "epic":
      return 0xb17cff;
    case "rare":
      return 0x68c6c8;
    default:
      return 0xf0d386;
  }
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
