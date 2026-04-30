import { Application, Container } from "pixi.js";
import { configurePixiInputForTouchScroll } from "./minePixiInput";

export interface MinePixiSceneLayers {
  background: Container;
  drag: Container;
  effects: Container;
  markers: Container;
  mine: Container;
  platform: Container;
  surface: Container;
}

export interface MinePixiAppHandle {
  app: Application;
  layers: MinePixiSceneLayers;
  root: Container;
  destroy: () => void;
}

export async function createMinePixiApp(input: {
  host: HTMLDivElement;
  onFrame: (app: Application) => void;
}): Promise<MinePixiAppHandle> {
  const app = new Application();
  const root = new Container();

  await app.init({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    height: 1,
    preference: "webgl",
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    width: 1
  });

  const layers = createMinePixiSceneLayers(root);
  const tick = () => input.onFrame(app);

  app.stage.addChild(root);
  app.stage.eventMode = "static";
  app.canvas.className = "mine-pixi-canvas";
  configurePixiInputForTouchScroll(app);
  input.host.appendChild(app.canvas);
  app.ticker.add(tick);

  return {
    app,
    destroy: () => {
      app.ticker.remove(tick);
      app.destroy({ removeView: true }, { children: true });
    },
    layers,
    root
  };
}

export function clearMinePixiLayer(layer: Container) {
  for (const child of layer.removeChildren()) {
    child.destroy({ children: true });
  }
}

function createMinePixiSceneLayers(root: Container): MinePixiSceneLayers {
  const layers: MinePixiSceneLayers = {
    background: new Container(),
    drag: new Container(),
    effects: new Container(),
    markers: new Container(),
    mine: new Container(),
    platform: new Container(),
    surface: new Container()
  };

  root.addChild(layers.background, layers.surface, layers.mine, layers.markers, layers.platform, layers.effects, layers.drag);
  return layers;
}
