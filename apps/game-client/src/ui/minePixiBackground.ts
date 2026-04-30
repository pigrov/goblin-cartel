import { Container, Graphics } from "pixi.js";
import type { MinePixiLayout } from "./minePixiLayout";

export function drawSceneBackground(root: Container, layout: MinePixiLayout) {
  const liftX = layout.gridX - 4;
  const railTop = layout.surfaceHeight;
  const railBottom = Math.max(railTop, layout.platformY + layout.platformHeight - 18);
  const railHeight = railBottom - railTop;
  const shaft = new Graphics()
    .rect(0, layout.surfaceHeight, layout.width, layout.contentHeight - layout.surfaceHeight)
    .fill({ color: 0x221811 });

  if (railHeight > 0) {
    shaft
      .rect(liftX + 1, railTop, 2, railHeight)
      .fill({ color: 0x9ca3ad, alpha: 0.72 })
      .rect(liftX + 6, railTop, 2, railHeight)
      .fill({ color: 0x4f5960, alpha: 0.42 });
  }

  root.addChild(
    new Graphics()
      .rect(0, 0, layout.width, layout.contentHeight)
      .fill({ color: 0x21170f })
  );
  root.addChild(shaft);
}
