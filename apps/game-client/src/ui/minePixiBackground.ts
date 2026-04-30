import { Container, Graphics } from "pixi.js";
import type { MinePixiLayout } from "./minePixiLayout";

export function drawSceneBackground(root: Container, layout: MinePixiLayout) {
  root.addChild(
    new Graphics()
      .rect(0, 0, layout.width, layout.contentHeight)
      .fill({ color: 0x21170f })
  );
  root.addChild(
    new Graphics()
      .rect(0, layout.surfaceHeight, layout.width, layout.contentHeight - layout.surfaceHeight)
      .fill({ color: 0x221811 })
      .rect(layout.gridX - 3, layout.surfaceHeight, 2, layout.contentHeight - layout.surfaceHeight)
      .fill({ color: 0x9ca3ad, alpha: 0.72 })
      .rect(layout.gridX - 6, layout.surfaceHeight, 1, layout.contentHeight - layout.surfaceHeight)
      .fill({ color: 0x4f5960, alpha: 0.42 })
  );
}
