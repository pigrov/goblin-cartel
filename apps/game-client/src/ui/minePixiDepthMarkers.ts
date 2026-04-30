import { Container, Text } from "pixi.js";
import type {
  MinePixiLayout,
  MinePixiVisibleRowRange
} from "./minePixiLayout";
import { removeMinePixiRenderedNode, type MinePixiRenderedNode } from "./minePixiRenderNodes";

export function reconcileDepthMarkers(input: {
  currentPlatformRow: number;
  depthMarkerLabel: (row: number) => string;
  layout: MinePixiLayout;
  renderedMarkers: Map<string, MinePixiRenderedNode>;
  root: Container;
  visibleRowRange: MinePixiVisibleRowRange;
}) {
  const visibleMarkerKeys = new Set<string>();

  for (let row = input.visibleRowRange.startRow; row <= input.visibleRowRange.endRow; row += 1) {
    const label = input.depthMarkerLabel(row);

    if (!label) {
      continue;
    }

    const key = String(row);
    const y = input.layout.gridY + row * input.layout.rowStep + input.layout.cellSize / 2;
    const signature = [
      row,
      label,
      row === input.currentPlatformRow ? 1 : 0,
      input.layout.gridX,
      input.layout.gridY,
      input.layout.rowStep,
      input.layout.cellSize
    ].join("|");
    const renderedMarker = input.renderedMarkers.get(key);
    visibleMarkerKeys.add(key);

    if (renderedMarker?.signature === signature) {
      continue;
    }

    if (renderedMarker) {
      removeMinePixiRenderedNode(input.renderedMarkers, key, renderedMarker);
    }

    const marker = drawDepthMarker(input.layout, label, row === input.currentPlatformRow, y);
    input.root.addChild(marker);
    input.renderedMarkers.set(key, {
      node: marker,
      signature
    });
  }

  for (const [key, renderedMarker] of input.renderedMarkers) {
    if (!visibleMarkerKeys.has(key)) {
      removeMinePixiRenderedNode(input.renderedMarkers, key, renderedMarker);
    }
  }
}

function drawDepthMarker(
  layout: MinePixiLayout,
  label: string,
  active: boolean,
  y: number
): Container {
  const marker = new Container();
  const text = createText({
    color: active ? 0xf2b84b : 0xb7a58f,
    fontSize: 10,
    fontWeight: "800",
    text: label
  });
  text.anchor.set(1, 0.5);
  text.position.set(layout.gridX - 6, y);
  marker.addChild(text);
  return marker;
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
