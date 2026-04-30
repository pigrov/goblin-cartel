import { Container, Graphics, Text } from "pixi.js";
import type { MinePixiLayout } from "./minePixiLayout";

export function drawSurface(root: Container, layout: MinePixiLayout, platformRow: number) {
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
  drawSurfaceLift(surface, layout);

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
  const cableX = layout.gridX;
  const pulleyY = layout.surfaceHeight - 108;
  const cableTop = pulleyY + 13;
  const cableBottom = Math.max(layout.surfaceHeight, layout.platformY + layout.platformHeight - 18);

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

function drawSurfaceLift(container: Container, layout: MinePixiLayout) {
  const x = layout.gridX;
  const y = layout.surfaceHeight - 104;

  container.addChild(
    new Graphics()
      .rect(x - 14, y + 20, 5, 76)
      .fill({ color: 0x8a6138 })
      .rect(x + 15, y + 20, 5, 76)
      .fill({ color: 0x75502e })
      .rect(x - 20, y + 18, 46, 6)
      .fill({ color: 0xa8753f })
      .rect(x - 18, y + 32, 42, 4)
      .fill({ color: 0x6a4728 })
      .circle(x + 3, y + 12, 15)
      .fill({ color: 0x56636d })
      .stroke({ color: 0xf7ead8, alpha: 0.72, width: 3 })
      .circle(x + 3, y + 12, 5)
      .fill({ color: 0xf7ead8 })
      .moveTo(x + 3, y - 3)
      .lineTo(x + 3, y + 27)
      .moveTo(x - 12, y + 12)
      .lineTo(x + 18, y + 12)
      .stroke({ color: 0x34424c, alpha: 0.8, width: 2 })
  );
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
