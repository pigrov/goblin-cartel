import { Container } from "pixi.js";

export interface MinePixiRenderedNode {
  baseX?: number;
  baseY?: number;
  node: Container;
  signature: string;
}

export function removeMinePixiRenderedNode(
  renderedNodes: Map<string, MinePixiRenderedNode>,
  key: string,
  renderedNode: MinePixiRenderedNode
) {
  renderedNode.node.parent?.removeChild(renderedNode.node);
  renderedNode.node.destroy({ children: true });
  renderedNodes.delete(key);
}
