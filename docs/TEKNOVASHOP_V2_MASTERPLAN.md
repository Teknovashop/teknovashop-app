# Teknovashop Forge V2 — Masterplan

Objetivo: convertir Teknovashop Forge en una plataforma profesional de diseño paramétrico para accesorios y piezas funcionales, ampliando catálogo y herramientas sin romper V1.

## 0. Principio no negociable

V1 se mantiene funcional y compatible durante toda la evolución.

- No reemplazar rutas existentes de forma destructiva.
- No cambiar contratos de modelos actuales sin versionarlos.
- No reinterpretar diseños existentes con un motor nuevo.
- Toda capacidad nueva entra detrás de flags y contratos versionados.
- Los modelos V2 no se publican hasta pasar pruebas de geometría, UX y regresión.
- Preview y descarga siguen separados: preview degradado y artefacto final privado.
- Los 18 modelos actuales son baseline de regresión.

## 1. Baseline actual

Catálogo canónico actual: 18 productos.

1. Adaptador VESA
2. Soporte de Router
3. Bandeja de Cables
4. Soporte Laptop / Tablet
5. Soporte / Dock Móvil USB-C
6. Caddy SSD 2.5 a 3.5
7. Caja Raspberry Pi 4 Model B
8. Soporte GoPro
9. Clip Brazo Mic
10. Placa para Cámara
11. Colgador de Pared
12. Escuadra de Pared
13. Clip de Cable
14. Soporte Hub USB
15. Soporte Auriculares
16. Bandeja VESA
17. Caja técnica con tapa
18. Placa de identificación / Texto

Capacidades baseline:
- parámetros dimensionales por producto;
- texto;
- agujeros libres en un subconjunto;
- preview 3D;
- artefacto STL final privado;
- manifest + SHA-256 + licencia;
- catálogo, login, checkout y entitlement separados del motor.

## 2. Visión V2

Flujo objetivo:

Elegir pieza → ajustar medidas → aplicar operaciones → validar → guardar versión → comprar/licenciar → descargar paquete trazable.

La diferenciación se apoya en:
1. catálogo funcional curado;
2. personalización paramétrica profunda;
3. operaciones geométricas reutilizables;
4. UX de software profesional, no de formulario.

## 3. Arquitectura de compatibilidad

### 3.1 Dos motores coexistiendo

- Forge V1 / mesh engine: conserva modelos actuales y comportamiento existente.
- Forge V2 / CAD engine: incorpora operaciones avanzadas y nuevos modelos.

Cada diseño debe persistir:
- engine_version
- schema_version
- product_version
- operations
- params
- hash reproducible de entrada
- hash de artefacto

### 3.2 Rutas

Mantener:
- /api/forge/generate
- backend /generate

Añadir:
- /api/forge/v2/generate
- /api/forge/v2/validate
- /api/forge/v2/catalog
- /api/forge/v2/presets
- backend /v2/generate
- backend /v2/validate

### 3.3 Feature flags

- ENABLE_FORGE_V2_UI
- ENABLE_FORGE_V2_ENGINE
- ENABLE_EXTENDED_CATALOG
- ENABLE_ADVANCED_OPERATIONS
- ENABLE_EXPERIMENTAL_SURFACES
- ENABLE_BETA_MODELS

La UI consulta capabilities; nunca asume que todas las herramientas sirven para todas las piezas.

## 4. Motor geométrico

### 4.1 Estrategia híbrida

El motor actual de malla se conserva para compatibilidad y operaciones sencillas.

V2 añade un kernel CAD separado para:
- fillets reales;
- chamfers;
- lofts;
- curvas;
- shells;
- workplanes;
- STEP/3MF futuros.

Cada modelo declara engine:
- mesh-v1
- mesh-v2
- cad-v2

### 4.2 Operación como objeto versionado

Toda operación lleva:
- id;
- type;
- version;
- target;
- placement;
- params;
- enabled.

El orden de operaciones forma una pila reproducible.

### 4.3 Operaciones V2

Nivel A, prioritarias:
- agujero circular;
- avellanado;
- counterbore;
- ranura recta;
- ranura oblonga;
- corte rectangular;
- corte circular;
- ventana redondeada;
- patrón lineal;
- patrón rectangular;
- patrón circular;
- patrón VESA;
- ventilación lineal;
- ventilación hexagonal;
- canal de cable;
- paso de brida;
- texto grabado;
- texto en relieve;
- nervio;
- cartela/gusset;
- aligeramiento.

Nivel B:
- borde ondulado;
- perfil sinusoidal;
- scallop/notch pattern;
- perforación decorativa;
- rejilla paramétrica;
- honeycomb;
- relieve superficial;
- textura geométrica;
- borde dentado;
- panel curvo sencillo.

Nivel C, CAD avanzado:
- fillet real;
- chamfer real;
- shell;
- loft;
- taper/draft;
- sweep;
- workplanes sobre caras;
- selección de cara/arista;
- exportación STEP;
- assemblies simples.

## 5. Manufacturabilidad

Validaciones mínimas:
- espesor residual;
- distancia a borde;
- solapamiento de operaciones;
- radio mínimo;
- diámetro mínimo;
- tolerancia;
- volumen positivo;
- manifold/watertight;
- winding consistente;
- bounding box;
- número máximo de operaciones;
- complejidad;
- orientación y soporte recomendado cuando aplique.

## 6. Nuevo configurador

Desktop:
- barra superior: producto, versión, guardar, compartir, licencia;
- izquierda: catálogo, buscar, familias, favoritos y presets;
- centro: visor 3D;
- derecha: inspector;
- abajo: undo/redo, pila de operaciones, validación y estado.

Inspector:
- Dimensiones
- Montaje
- Agujeros
- Cortes
- Ventilación
- Superficie
- Texto
- Refuerzos

Regla UX: paneles cerrados por defecto.

Capacidades:
- selección visual de cara;
- click para colocar operación cuando sea posible;
- edición numérica siempre;
- snap;
- duplicar;
- activar/desactivar;
- undo/redo;
- reset;
- presets;
- before/after;
- estados válido / advertencia / bloqueado.

## 7. Visor 3D

Prioridades:
- centrado estable;
- escala real;
- regla y cotas;
- view cube;
- vistas ortográficas;
- grid milimétrica;
- sección;
- medición punto a punto;
- cara seleccionada;
- ghost preview de operación;
- wireframe opcional;
- reset camera;
- fit to object;
- orientación de impresión.

## 8. Sistema visual

El vídeo hero se mantiene protegido.

Dirección:
- grafito/azul muy oscuro;
- superficies técnicas claras;
- cyan/azul eléctrico como acento;
- verde solo validación;
- ámbar advertencias;
- rojo bloqueos;
- tipografía sobria;
- tarjetas coherentes;
- iconografía técnica;
- microanimaciones breves.

## 9. Catálogo objetivo: 72 productos

La ampliación se basa en familias reutilizables, no 54 scripts aislados.

### A — Montaje y adaptadores
1. Adaptador VESA actual
2. Bandeja VESA actual
3. Placa universal de montaje
4. Adaptador VESA offset
5. Adaptador VESA a bandeja
6. Montura mural universal
7. Montura bajo mesa universal
8. Placa perforada configurable
9. Adaptador de patrón circular
10. Placa de transición multipatrón

### B — Escritorio y ergonomía
11. Soporte Laptop / Tablet actual
12. Dock móvil USB-C actual
13. Soporte auriculares actual
14. Dock vertical para portátil
15. Elevador de monitor compacto
16. Soporte tablet de ángulo configurable
17. Soporte móvil horizontal/vertical
18. Base para reloj inteligente
19. Soporte de mando
20. Peana multi-dispositivo

### C — Gestión de cableado
21. Bandeja de cables actual
22. Clip de cable actual
23. Clip brazo mic actual
24. Peine de cables
25. Pasacables de mesa
26. Canal bajo mesa
27. Retenedor de cargador
28. Anclaje para brida reutilizable

### D — Electrónica y red
29. Soporte router actual
30. Soporte Hub USB actual
31. Caddy SSD 2.5→3.5 actual
32. Caja Raspberry Pi actual
33. Caja técnica con tapa actual
34. Soporte mini-PC/NUC genérico
35. Soporte switch de red
36. Caddy SSD/NVMe externo
37. Caja electrónica ventilada universal
38. Soporte fuente de alimentación

### E — Foto, vídeo y audio
39. Placa para cámara actual
40. Soporte GoPro actual
41. Soporte webcam de monitor
42. Adaptador cold-shoe
43. Soporte luz LED
44. Montura para interfaz de audio
45. Adaptador de micrófono a escritorio
46. Soporte de baterías/tarjetas

### F — Pared y utilidad
47. Colgador de pared actual
48. Escuadra de pared actual
49. Gancho doble
50. Soporte de escoba/herramienta
51. Estante mural compacto
52. Soporte de mando mural
53. Soporte de altavoz mural
54. Clip mural de cable

### G — Taller / maker
55. Placa de identificación / texto actual
56. Tope / guía
57. Plantilla de perforación
58. Bloc de sujeción ligera
59. Soporte modular de herramienta
60. Guía de corte no motorizada
61. Separador/calzo paramétrico
62. Organizador de brocas/llaves

### H — Organización y almacenamiento
63. Caja paramétrica con tapa
64. Caja apilable
65. Bandeja modular
66. Divisor de cajón
67. Organizador de escritorio
68. Portabolígrafos modular
69. Caja para tornillería
70. Rack pequeño de accesorios
71. Etiqueta/placa encastrable
72. Organizador de tarjetas/SD

## 10. Oleadas

Wave 0: 18 actuales.

Wave 1: añadir 12:
- dock vertical portátil;
- placa universal;
- soporte mini-PC;
- pasacables;
- canal bajo mesa;
- peana multi-dispositivo;
- soporte webcam;
- soporte switch;
- caja electrónica ventilada;
- soporte mando;
- plantilla de perforación;
- divisor de cajón.

Wave 2: llegar a 48.

Wave 3: llegar a 72 solo con validación y operaciones estables.

## 11. Presets

Ejemplos:

Bandeja de cables:
- Minimal
- Office
- Heavy Cable
- Ventilated
- Reinforced

Caja electrónica:
- Silent
- Airflow
- Wall Mount
- Cable Entry

Soporte portátil:
- Thin laptop
- Gaming laptop
- Tablet
- High angle
- Low angle

## 12. Capability matrix

Cada producto declara:
- dimensions
- text
- holes
- slots
- cutouts
- vents
- waves
- ribs
- mountingPatterns
- cadFeatures

La UI se genera desde el contrato.

## 13. Catálogo canónico V2

Campos:
- slug
- nombre
- familia
- versión
- stage
- engine
- descripción
- casos de uso
- imagen
- tags
- parámetros
- capabilities
- presets
- materiales sugeridos
- orientación sugerida
- dificultad
- restricciones
- licencia
- precio/plan
- published

Evitar duplicidad entre frontend y backend mediante catálogo canónico generado o validado en CI.

## 14. UX de catálogo

- búsqueda instantánea;
- familias;
- filtros por uso;
- filtros por operación;
- filtros por montaje;
- nuevo;
- popular solo con datos reales;
- favoritos;
- recientes;
- comparación;
- detalle rápido;
- CTA Personalizar.

## 15. Guardado y versiones

El usuario podrá:
- guardar;
- duplicar;
- renombrar;
- crear revisión;
- comparar;
- recuperar configuración;
- compartir configuración clonable o de solo lectura.

Un diseño comprado conserva engine, product version, params, operations, hash y manifest.

## 16. Rendimiento

- cache por hash;
- preview degradado más rápido que final;
- límite de complejidad;
- no recalcular hashes existentes;
- colas para CAD pesado;
- timeout por operación;
- métricas por builder;
- registrar duración de validación y generación.

## 17. Seguridad

- mantener identidad Supabase verificada;
- no confiar en user_id del cliente;
- rate limiting;
- límites por IP/usuario/sesión;
- límite de operaciones;
- payload estricto;
- sanitización de texto;
- storage paths del servidor;
- artefactos finales privados;
- trazabilidad por design ID.

## 18. Quality gates

Un producto no pasa a published hasta:
1. contrato válido;
2. builder registrado;
3. parámetros públicos cambian geometría;
4. default genera STL válido;
5. variante diferente;
6. componentes cerrados;
7. volumen finito y positivo;
8. operaciones soportadas con tests;
9. combinaciones mínimas probadas;
10. límites inválidos fallan controladamente;
11. thumbnail coherente;
12. descripción/tips;
13. manifest reproducible;
14. tiempo aceptable;
15. revisión visual desktop/móvil.

## 19. Suites V2

- test_operation_contracts
- test_operation_combinations
- test_geometry_bounds
- test_product_capability_matrix
- test_design_reproducibility
- test_v1_regression
- test_catalog_sync
- test_preview_final_traceability

## 20. Fases de ejecución

A — Foundation:
- contrato V2;
- operation DSL;
- capability matrix;
- schema version;
- feature flags;
- tests V1;
- catálogo canónico.

B — UI shell:
- workspace;
- inspector;
- operation stack;
- undo/redo;
- visor;
- oculto detrás de flag.

C — Operaciones Nivel A:
- holes v2;
- slots;
- cutouts;
- patterns;
- vents;
- text;
- ribs;
- cable channel.

D — Wave 1:
- 12 productos.

E — CAD engine:
- CadQuery/OCCT como worker o servicio separado;
- fillet/chamfer/loft/shell;
- STEP opcional;
- no migrar V1.

F — Nivel B/C:
- waves;
- curved profiles;
- surfaces;
- features CAD.

G — 48 y 72:
- solo después de estabilidad y métricas.

## 21. Tres pilotos

Bandeja de cables:
- holes;
- slots;
- vents;
- cable channels;
- ribs;
- patterns.

Adaptador VESA:
- mounting patterns;
- holes;
- countersink;
- slots;
- cutouts;
- text.

Caja técnica:
- vents;
- cutouts;
- cable entry;
- text;
- ribs;
- futura transición CAD.

## 22. Definición de WOW

Un usuario debe poder:
- entender catálogo en segundos;
- abrir una pieza sin formulario saturado;
- seleccionar una cara;
- colocar corte/agujero visualmente;
- ver ghost preview;
- ajustar medidas exactas;
- aplicar preset;
- recibir feedback de manufacturabilidad;
- usar undo/redo;
- medir;
- guardar versión;
- comprar y descargar una pieza trazable.

El wow viene de fluidez y potencia, no de animaciones excesivas.

## 23. Qué no hacer

- no añadir 50 modelos antes de crear familias;
- no duplicar lógica frontend/backend;
- no exponer operaciones no soportadas;
- no fingir CAD complejo con mallas frágiles;
- no romper slugs;
- no cambiar contratos de diseños vendidos;
- no mezclar rediseño, pagos y engine en un solo PR;
- no publicar sin tests;
- no mezclar estilos de miniaturas;
- no etiquetar beta como producción.

## 24. Primera iteración

Entregables:
1. especificación V2;
2. capability matrix;
3. feature flags;
4. operation DSL;
5. workspace V2 oculto;
6. tres pilotos;
7. holes v2 + slots + cutouts;
8. validación;
9. regresión V1;
10. plan Wave 1.

## 25. Resultado esperado

Evolucionar de 18 piezas a una plataforma con:
- 72 productos objetivo;
- familias reutilizables;
- operaciones avanzadas;
- motor híbrido mesh + CAD;
- UX profesional;
- compatibilidad V1;
- artefactos trazables;
- catálogo escalable;
- base para STEP/3MF.
