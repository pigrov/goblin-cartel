import { Container, Graphics } from "pixi.js";
import type { MinePixiLayout } from "./minePixiLayout";
import {
  minePixiLiftRailHeight,
  minePixiLiftRailTop,
  minePixiLiftX
} from "./minePixiLiftGeometry";

export interface MinePixiLiftRail {
  baseHeight: number;
  node: Container;
}

export function drawSceneBackground(root: Container, layout: MinePixiLayout): MinePixiLiftRail {
  const liftX = minePixiLiftX(layout);
  const railTop = minePixiLiftRailTop(layout);
  const railHeight = minePixiLiftRailHeight(layout);
  const caveHeight = layout.contentHeight - layout.surfaceHeight;
  const cave = drawCaveBackdrop(layout, caveHeight);
  const shaft = new Graphics()
    .rect(0, layout.surfaceHeight, layout.width, caveHeight)
    .fill({ color: 0x1f160f, alpha: 0.72 });
  const rail = new Container();
  rail.position.set(0, railTop);
  rail.scale.y = railHeight;
  rail.addChild(
    new Graphics()
      .rect(liftX + 1, 0, 2, 1)
      .fill({ color: 0x9ca3ad, alpha: 0.72 })
      .rect(liftX + 6, 0, 2, 1)
      .fill({ color: 0x4f5960, alpha: 0.42 })
  );

  root.addChild(
    new Graphics()
      .rect(0, 0, layout.width, layout.contentHeight)
      .fill({ color: 0x21170f })
  );
  root.addChild(cave);
  root.addChild(shaft);
  root.addChild(rail);

  return {
    baseHeight: railHeight,
    node: rail
  };
}

function drawCaveBackdrop(layout: MinePixiLayout, caveHeight: number): Graphics {
  const cave = new Graphics()
    .rect(0, layout.surfaceHeight, layout.width, caveHeight)
    .fill({ color: 0x2a1b12 })
    .rect(0, layout.surfaceHeight, Math.max(0, layout.gridX - 2), caveHeight)
    .fill({ color: 0x17100b, alpha: 0.5 })
    .rect(layout.gridX + layout.gridWidth + 8, layout.surfaceHeight, layout.width, caveHeight)
    .fill({ color: 0x17100b, alpha: 0.34 });

  for (let index = 0; index < Math.ceil(caveHeight / 46); index += 1) {
    const y = layout.surfaceHeight + 24 + index * 46;
    const color = index % 3 === 0 ? 0x65452b : index % 3 === 1 ? 0x3f2b1d : 0x2d2118;
    cave
      .moveTo(0, y)
      .quadraticCurveTo(layout.width * 0.24, y - 14, layout.width * 0.5, y - 3)
      .quadraticCurveTo(layout.width * 0.76, y + 10, layout.width, y - 8)
      .stroke({ color, alpha: 0.26, width: 3 });
  }

  for (let index = 0; index < 34; index += 1) {
    const x = (index * 47) % Math.max(1, layout.width);
    const y = layout.surfaceHeight + 18 + ((index * 71) % Math.max(1, caveHeight - 20));
    const radius = 1 + (index % 3);
    cave.circle(x, y, radius).fill({ color: 0x8b5f38, alpha: 0.12 });
  }

  cave
    .rect(layout.gridX - 9, layout.surfaceHeight, 8, caveHeight)
    .fill({ color: 0x0f0b08, alpha: 0.28 })
    .rect(layout.gridX + layout.gridWidth + 4, layout.surfaceHeight, 10, caveHeight)
    .fill({ color: 0x0f0b08, alpha: 0.22 });

  return cave;
}
