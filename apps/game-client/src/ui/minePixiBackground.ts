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
  const shaft = new Graphics()
    .rect(0, layout.surfaceHeight, layout.width, layout.contentHeight - layout.surfaceHeight)
    .fill({ color: 0x221811 });
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
  root.addChild(shaft);
  root.addChild(rail);

  return {
    baseHeight: railHeight,
    node: rail
  };
}
