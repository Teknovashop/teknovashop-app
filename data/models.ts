export type ForgeModel = {
  id: string;
  name: string;
  slug: string;
  thumbnail: string;
  stlPath: string; // ruta dentro del bucket forge-stl
  description: string;
  tips?: string[];
};

// NOTA: Ajustado a lo que se ve en Supabase:
// - cable-tray-9216ac10db2b.stl (raíz del bucket)
// - router-mount-ae9e5015b….stl (raíz del bucket)
// - vesa-adapter-78410643d6….stl (raíz del bucket)
// Si mueves estos ficheros a carpetas, cambia aquí las rutas.

export const MODELS: ForgeModel[] = [
  {
    id: 'vesa-adapter',
    name: 'Adaptador VESA 75/100 -> 100/200',
    slug: 'vesa-adapter',
    thumbnail: '/images/models/vesa-adapter.jpg',
    stlPath: 'vesa-adapter-78410643d6....stl', // <-- pon aquí el nombre exacto de tu archivo (copiar/pegar)
    description: 'Placa adaptadora entre patrones VESA.',
    tips: [
      'Confirma ambos patrones antes de imprimir',
      'Aumenta perimetros si el monitor pesa >6kg',
    ],
  },
  {
    id: 'router-mount',
    name: 'Soporte de Router',
    slug: 'router-mount',
    thumbnail: '/images/models/router-mount.jpg',
    stlPath: 'router-mount-ae9e5015b....stl', // <-- nombre exacto del archivo en el bucket
    description: 'Soporte de pared con ranuras.',
    tips: ['Holgura lateral 0.3-0.5 mm', 'Usa tacos adecuados a la pared'],
  },
  {
    id: 'cable-tray',
    name: 'Bandeja de Cables',
    slug: 'cable-tray',
    thumbnail: '/images/models/cable-tray.jpg',
    stlPath: 'cable-tray-9216ac10db2b.stl', // <-- nombre exacto del archivo en el bucket
    description: 'Organizador bajo mesa modular.',
    tips: ['Ancla cada 20-30 cm', 'Infill 30-40% si cargas peso'],
  },

  // ——— el resto todavía sin STL “oficial” en el bucket ———
  // Deja '' para que ModelCard genere rutas candidatas por slug.
  {
    id: 'headset-stand',
    name: 'Soporte de Auriculares',
    slug: 'headset-stand',
    thumbnail: '/images/models/headset-stand.jpg',
    stlPath: '',
    description: 'Soporte estable para auriculares.',
    tips: ['Fieltro en la base', 'Altura ajustable en preset'],
  },
  {
    id: 'phone-dock',
    name: 'Dock para Movil (USB-C)',
    slug: 'phone-dock',
    thumbnail: '/images/models/phone-dock.jpg',
    stlPath: '',
    description: 'Base con guia USB-C.',
    tips: ['Ten en cuenta la funda', 'Angulo 60-65 recomendado'],
  },
  {
    id: 'tablet-stand',
    name: 'Soporte de Tablet',
    slug: 'tablet-stand',
    thumbnail: '/images/models/tablet-stand.jpg',
    stlPath: '',
    description: 'Soporte plegable dos angulos.',
    tips: ['Refuerza paredes si >12"', 'Uso en mesa recomendado'],
  },
  {
    id: 'ssd-holder',
    name: 'Caddy SSD 2.5 a 3.5',
    slug: 'ssd-holder',
    thumbnail: '/images/models/ssd-holder.jpg',
    stlPath: '',
    description: 'Adaptador SSD a bahia 3.5.',
    tips: ['Tornillos M3x6', 'PETG si hay calor'],
  },
  {
    id: 'cable-clip',
    name: 'Clips de Cable (Pack)',
    slug: 'cable-clip',
    thumbnail: '/images/models/cable-clip.jpg',
    stlPath: '',
    description: 'Clips para 3-6 mm.',
    tips: ['Cinta 3M para agarre', 'Imprime varios por vez'],
  },
  {
    id: 'raspi-case',
    name: 'Caja Raspberry Pi',
    slug: 'raspi-case',
    thumbnail: '/images/models/raspi-case.jpg',
    stlPath: '',
    description: 'Caja ventilada con anclajes.',
    tips: ['Revisa puertos modelo', 'Añade ventilador si OC'],
  },
  {
    id: 'go-pro-mount',
    name: 'Soporte GoPro',
    slug: 'go-pro-mount',
    thumbnail: '/images/models/go-pro-mount.jpg',
    stlPath: '',
    description: 'Montura universal estilo GoPro.',
    tips: ['Usa tornillo M5', 'Refuerza con 40% infill'],
  },
  {
    id: 'wall-hook',
    name: 'Gancho de Pared',
    slug: 'wall-hook',
    thumbnail: '/images/models/wall-hook.jpg',
    stlPath: '',
    description: 'Gancho robusto para cables.',
    tips: ['Taco 6-8 mm', 'No exceder 5 kg'],
  },
  {
    id: 'monitor-stand',
    name: 'Elevador de Monitor',
    slug: 'monitor-stand',
    thumbnail: '/images/models/monitor-stand.jpg',
    stlPath: '',
    description: 'Base para elevar monitor.',
    tips: ['Añade pads antideslizantes', 'Asegura estabilidad'],
  },
  {
    id: 'laptop-stand',
    name: 'Soporte de Portatil',
    slug: 'laptop-stand',
    thumbnail: '/images/models/laptop-stand.jpg',
    stlPath: '',
    description: 'Soporte ventilado.',
    tips: ['No tapar entradas aire', 'PETG recomendado'],
  },
  {
    id: 'mic-arm-clip',
    name: 'Clip Brazo Mic',
    slug: 'mic-arm-clip',
    thumbnail: '/images/models/mic-arm-clip.jpg',
    stlPath: '',
    description: 'Clip para ordenar cables.',
    tips: ['Holgura 0.3 mm', 'PLA suficiente'],
  },
  {
    id: 'camera-plate',
    name: 'Zapata Camara',
    slug: 'camera-plate',
    thumbnail: '/images/models/camera-plate.jpg',
    stlPath: '',
    description: 'Placa tipo quick-release.',
    tips: ['Usa tornillo 1/4"', 'Comprueba holguras'],
  },
  {
    id: 'hub-holder',
    name: 'Soporte USB Hub',
    slug: 'hub-holder',
    thumbnail: '/images/models/hub-holder.jpg',
    stlPath: '',
    description: 'Soporte para hub USB.',
    tips: ['Medir ancho hub', 'Cinta 3M o tornillos'],
  },
];
