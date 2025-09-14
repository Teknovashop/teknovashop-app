// Tipos “ambient” para imports por URL desde unpkg (evita errores de TS)

declare module "https://unpkg.com/three@0.157.0/build/three.module.js" {
  // Exponemos un "any" por defecto y todo como any
  const three: any;
  export default three;
  export = three;
}

declare module "https://unpkg.com/three@0.157.0/examples/jsm/controls/OrbitControls.js" {
  export const OrbitControls: any;
}

declare module "https://unpkg.com/three@0.157.0/examples/jsm/loaders/STLLoader.js" {
  export const STLLoader: any;
}

// (Opcional) comodín para cualquier otra URL de unpkg que importes en el futuro.
declare module "https://unpkg.com/*" {
  const mod: any;
  export default mod;
}
