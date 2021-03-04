import React from "react";
import { render } from "react-dom";
import "./style.css";

import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";

import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";

import {
  NodeMaterial,
  INodeMaterialEditorOptions
} from "@babylonjs/core/Materials/Node/nodeMaterial";

import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";

import { Vector3 } from "@babylonjs/core/Maths/math";

import { map, withLatestFrom, shareReplay } from "rxjs/operators";
import { Subject, combineLatest } from "rxjs";

import { NodeEditor } from "@babylonjs/node-editor/nodeEditor";

class MyNodeMaterial extends NodeMaterial {
  public edit(config?: INodeMaterialEditorOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      NodeEditor.Show({
        nodeMaterial: this
      });
      resolve();
    });
  }
}

const canvas$ = new Subject<HTMLCanvasElement>();
const engine$ = canvas$.pipe(
  map(canvas => new Engine(canvas)),
  shareReplay(1)
);
const scene$ = engine$.pipe(
  map(engine => new Scene(engine)),
  shareReplay(1)
);

engine$.subscribe(engine => {
  // Watch for browser/canvas resize events
  window.addEventListener("resize", function() {
    engine.resize();
  });
});

combineLatest(engine$, scene$).subscribe(([engine, scene]) => {
  engine.runRenderLoop(function() {
    scene.render();
  });
});

combineLatest(scene$, canvas$).subscribe(([scene, canvas]) => {
  const camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(canvas, true);

  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const nodeMaterial = new NodeMaterial("node material", scene, {
    emitComments: true
  });
});

const showHideInspector = (scene: Scene) => {
  if (!scene.debugLayer.isVisible()) {
    scene.debugLayer.show({
      handleResize: true,
      overlay: true,
      globalRoot: document.getElementById("#root") || undefined
    });
  } else {
    scene.debugLayer.hide();
  }
};

const click$ = new Subject<void>();

click$.pipe(withLatestFrom(scene$)).subscribe(([_click, scene]) => {
  Promise.all([
    import("@babylonjs/core/Debug/debugLayer"),
    import("@babylonjs/inspector")
  ]).then(_values => showHideInspector(scene));
});

export const App = () => {
  const canvas = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (canvas == null) {
      return;
    }
    canvas$.next(canvas.current);
  }, [canvas]);

  const handleClick = React.useCallback(() => {
    click$.next();
  }, []);

  return (
    <>
      <button ref={canvas} onClick={handleClick}>
        Open inspector
      </button>
      <canvas id="renderCanvas" touch-action="none" />
    </>
  );
};

render(<App />, document.getElementById("root"));
