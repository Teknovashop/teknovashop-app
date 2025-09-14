// types/three.d.ts
// Shims mínimos para compilar en Vercel sin @types/three

declare module "three" {
  const Three: any;
  export = Three;
  export default Three;
}

declare module "three/examples/jsm/controls/OrbitControls.js" {
  export class OrbitControls {
    constructor(object: any, domElement?: HTMLElement);
    target: any;
    enableDamping: boolean;
    dampingFactor: number;
    rotateSpeed: number;
    zoomSpeed: number;
    panSpeed: number;
    update(): void;
    dispose(): void;
  }
}

declare module "three/examples/jsm/loaders/STLLoader.js" {
  export class STLLoader {
    parse(data: ArrayBuffer): any; // devuelve BufferGeometry
    load(
      url: string,
      onLoad: (geometry: any) => void,
      onProgress?: (ev: ProgressEvent) => void,
      onError?: (err: unknown) => void
    ): void;
  }
}
