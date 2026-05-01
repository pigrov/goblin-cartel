import { Container, Graphics, Rectangle } from "pixi.js";

export function drawGoblin(
  cellSize: number,
  working: boolean,
  dragging: boolean,
  options: { showGrabArea?: boolean } = {}
): Container {
  const goblin = new Container();
  const scale = calculateGoblinScale(cellSize);
  goblin.scale.set(scale);
  goblin.alpha = dragging ? 0.92 : 1;
  goblin.hitArea = createGoblinGrabHitArea(cellSize);

  if (options.showGrabArea) {
    goblin.addChild(drawGoblinGrabArea(cellSize));
  }

  goblin.addChild(
    new Graphics()
      .roundRect(-10, 16, 20, 7, 5)
      .fill({ color: 0x2d2118 })
      .stroke({ color: 0x20170f, width: 1 })
      .roundRect(-12, 20, 24, 8, 5)
      .fill({ color: 0x4f7334 })
      .roundRect(-7, 4, 14, 14, 6)
      .fill({ color: 0x75a94b })
      .stroke({ color: 0x18210f, width: 1 })
      .roundRect(-6, 17, 12, 13, 5)
      .fill({ color: 0x6b4d2e })
      .stroke({ color: 0x1b1a12, width: 1 })
      .rect(-2, 27, 5, 24)
      .fill({ color: 0x9ca3ad })
      .rect(-5, 44, 11, 6)
      .fill({ color: working ? 0xf2b84b : 0xc07a3d, alpha: working ? 0.94 : 0.8 })
  );

  goblin.addChild(
    new Graphics()
      .circle(-3, 10, 1.5)
      .fill({ color: 0x11170c })
      .circle(3, 10, 1.5)
      .fill({ color: 0x11170c })
  );

  return goblin;
}

export function createGoblinGrabHitArea(cellSize: number): Rectangle {
  const scale = calculateGoblinScale(cellSize);
  const size = cellSize / scale;

  return new Rectangle(-size / 2, 0, size, size);
}

function drawGoblinGrabArea(cellSize: number): Graphics {
  const area = createGoblinGrabHitArea(cellSize);

  return new Graphics()
    .rect(area.x, area.y, area.width, area.height)
    .stroke({ color: 0xf2b84b, alpha: 0.72, width: 1.5 });
}

function calculateGoblinScale(cellSize: number): number {
  return Math.max(0.8, Math.min(1.05, cellSize / 42));
}
