// data/models.ts
export type ForgeModel = {
  id: string;
  name: string;
  slug: string;
  thumbnail: string;
  stlPath: string;
  description: string;
  tips?: string[];
};
export const MODELS: ForgeModel[] = [
  { id:'vesa-adapter', name:'Adaptador VESA 75/100 -> 100/200', slug:'vesa-adapter',
    thumbnail:'/images/models/vesa-adapter.jpg', stlPath:'public/vesa-adapter.stl',
    description:'Placa adaptadora entre patrones VESA habituales.',
    tips:['Confirma ambos patrones antes de imprimir','Aumenta perimetros si el monitor pesa >6kg']},
  { id:'router-mount', name:'Soporte de Router', slug:'router-mount',
    thumbnail:'/images/models/router-mount.jpg', stlPath:'public/router-mount.stl',
    description:'Soporte de pared con ranuras de ventilacion.',
    tips:['Holgura lateral 0.3-0.5 mm','Usa tacos adecuados a la pared']},
  { id:'cable-tray', name:'Bandeja de Cables', slug:'cable-tray',
    thumbnail:'/images/models/cable-tray.jpg', stlPath:'public/cable-tray.stl',
    description:'Organizador bajo mesa con anclaje modular.',
    tips:['Ancla cada 20-30 cm','Infill 30-40% si cargas peso']},
  { id:'headset-stand', name:'Soporte de Auriculares', slug:'headset-stand',
    thumbnail:'/images/models/headset-stand.jpg', stlPath:'public/headset-stand.stl',
    description:'Soporte de escritorio estable para auriculares over ear.',
    tips:['Fieltro en la base para mejor agarre']},
  { id:'phone-dock', name:'Dock para Movil (USB-C)', slug:'phone-dock',
    thumbnail:'/images/models/phone-dock.jpg', stlPath:'public/phone-dock.stl',
    description:'Base con guia para conector USB-C y buen angulo de vision.',
    tips:['Ten en cuenta el grosor de la funda']},
  { id:'tablet-stand', name:'Soporte de Tablet', slug:'tablet-stand',
    thumbnail:'/images/models/tablet-stand.jpg', stlPath:'public/tablet-stand.stl',
    description:'Soporte plegable con dos angulos.',
    tips:['Refuerza paredes si la tablet es >12"']},
  { id:'ssd-holder', name:'Caddy SSD 2.5 a 3.5', slug:'ssd-holder',
    thumbnail:'/images/models/ssd-holder.jpg', stlPath:'public/ssd-holder.stl',
    description:'Adaptador para montar SSD 2.5 en bahias 3.5.',
    tips:['Tornillos M3x6','PETG si hay calor']},
  { id:'cable-clip', name:'Clips de Cable (Pack)', slug:'cable-clip',
    thumbnail:'/images/models/cable-clip.jpg', stlPath:'public/cable-clip.stl',
    description:'Pack de clips para cables de 3-6 mm.',
    tips:['Cinta doble cara 3M para mejor agarre']},
];
