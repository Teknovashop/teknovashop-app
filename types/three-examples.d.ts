// Tipos mínimos para que TS no falle con los módulos de three/examples

declare module "three/examples/jsm/loaders/STLLoader" {
  import { Loader, BufferGeometry } from "three";

  export class STLLoader extends Loader {
    load(
      url: string,
      onLoad: (geometry: BufferGeometry) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (err: unknown) => void
    ): void;

    parse(data: ArrayBuffer | string): BufferGeometry;
  }
}

declare module "three/examples/jsm/controls/OrbitControls" {
  import { Camera, MOUSE, TOUCH, Vector3 } from "three";
  import { EventDispatcher } from "three";

  export class OrbitControls extends EventDispatcher {
    constructor(object: Camera, domElement?: HTMLElement);

    // Propiedades más usadas; el resto no son necesarias para compilar
    enabled: boolean;
    target: Vector3;
    enableDamping: boolean;
    dampingFactor: number;
    enableZoom: boolean;
    zoomSpeed: number;
    enableRotate: boolean;
    rotateSpeed: number;
    enablePan: boolean;
    panSpeed: number;
    screenSpacePanning: boolean;
    minDistance: number;
    maxDistance: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    mouseButtons: { LEFT: MOUSE; MIDDLE: MOUSE; RIGHT: MOUSE };
    touches: { ONE: TOUCH; TWO: TOUCH };

    update(): void;
    dispose(): void;
    saveState(): void;
    reset(): void;
  }
}
