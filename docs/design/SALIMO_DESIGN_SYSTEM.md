# SALIMO. — Sistema de identidad visual y guía de implementación
**Versión:** 1.0 · **Fecha:** 17 de noviembre de 2026 · **Estado:** Dirección visual aprobada; implementación pendiente

## 1. Propósito
SALIMO. es una guía digital pública para descubrir bares, pubs y cervecerías de San Miguel de Tucumán y Yerba Buena. La interfaz debe ayudar a encontrar lugares con rapidez y transmitir el espíritu de salir a compartir. El resultado debe ser reconocible, cercano y profesional, sin parecer un dashboard genérico ni una página de reservas de lujo.

**Concepto de marca:** «Salí. Explorá. Descubrí.»

**Dirección elegida:** diseño híbrido **Bento digital + Urbano contemporáneo**, con predominio de la estructura bento. Fotografías cálidas, fondos fríos muy claros, acentos coral y un azul eléctrico utilizado de manera funcional.

## 2. Referencias aprobadas
- `referencias/salimo_desktop_referencia.png`: composición de portada, hero, tarjetas, mapa y CTA.
- `referencias/salimo_mobile_referencia.png`: adaptación a formato móvil y jerarquía vertical.

**Importante:** son mockups conceptuales generados para explorar la estética. Los locales, valoraciones, iconos de favoritos, notificaciones y otros elementos **no representan funciones ni datos existentes**. Los contenidos definitivos vienen del producto y de su base de datos.

## 3. Principios de diseño
1. **Descubrir primero:** buscador, filtros, mapa y lugares tienen prioridad frente a adornos.
2. **Fotografía con intención:** imágenes grandes y cálidas para transmitir la salida nocturna, sin encubrir información.
3. **Color con rol:** coral para identidad y CTA; azul para mapa/selección; navy para jerarquía; blanco para claridad.
4. **Bento controlado:** componentes de distintos tamaños sin perder alineación ni crear ruido visual.
5. **Credibilidad:** no inventar establecimientos, horarios, fotos, reseñas o valoraciones.
6. **Responsive real:** mobile first, tamaño táctil adecuado, contraste y estados de interfaz.
7. **Un solo sistema:** diseño público más expresivo; administración más funcional usando los mismos tokens.

## 4. Paleta y usos

| Rol | Token CSS | HEX | Uso |
|---|---|---|---|
| Fondo | `--salimo-bg` | `#F5F7FB` | Fondo principal |
| Superficie | `--salimo-surface` | `#FFFFFF` | Cards, menús, resultados |
| Texto principal | `--salimo-ink` | `#102841` | Logo, navegación, títulos |
| Navy secundario | `--salimo-navy-surface` | `#112D48` | CTA grande, bloques por zona |
| Coral marca | `--salimo-coral` | `#FF6852` | Acentos, puntos, detalles |
| Coral profundo | `--salimo-coral-deep` | `#C63E2E` | Botón con texto blanco |
| Azul interacción | `--salimo-blue` | `#1769FF` | Mapa, filtros activos, enlaces |
| Azul profundo | `--salimo-blue-deep` | `#1254CC` | Hover / selección |
| Crema coral | `--salimo-peach` | `#FBE8DF` | Tarjeta editorial cálida |
| Texto secundario | `--salimo-muted` | `#5A6779` | Descripción y metadatos |
| Borde | `--salimo-border` | `#E0E7EF` | Separadores y campos |
| Fondo de mapa | `--salimo-map-bg` | `#EAF0F5` | Placeholder o carcasa de mapa |
| Éxito | `--salimo-success` | `#196B4D` | Estado verificado, si corresponde |
| Error | `--salimo-danger` | `#B42318` | Errores y fallos de formularios |

**Contraste:** `#FF6852` + blanco ≈ 2,86:1, insuficiente para texto pequeño. `#FF6852` + azul noche ≈ 5,25:1. `#C63E2E` + blanco ≈ 5,09:1. Elegir color del texto en función del contraste, no solo de la apariencia del mockup.

### Proporción orientativa
- **70%** fondos y superficies (`bg`, blanco, crema)
- **20%** tipografía y paneles (`ink`, navy)
- **10%** acentos y acciones (`coral`, azul)

La proporción es una guía compositiva, no un cálculo rígido.

## 5. Tipografía

| Uso | Fuente | Peso | Tamaño orientativo |
|---|---|---|---|
| Logo / titular | Manrope | 800 | variable |
| Hero desktop | Manrope | 800 | 56–68 px |
| Hero destacado | Instrument Serif Italic | 400 | 60–72 px |
| Título sección | Manrope | 700/800 | 32–40 px |
| Nombre de local | Manrope | 700/800 | 18–22 px |
| Texto general | Manrope | 400/500 | 16 px |
| Metadatos | Manrope | 500 | 13–14 px |
| Botones, filtros | Manrope | 600/700 | 14–15 px |

- Manrope para todo lo funcional; Instrument Serif Italic como **acento editorial ocasional**.
- No utilizar fuentes distintas en cada página.
- No usar textos diminutos (menos de 12 px) para información importante.
- En producción con Next.js, cargar con `next/font/google` y exponer variables de fuentes para Tailwind/CSS.

## 6. Espaciado, formas y elevación

- Escala de espacios: **4, 8, 12, 16, 24, 32, 48, 64 px**.
- Contenedor recomendado: 1280–1360 px, con padding horizontal adaptable 20–40 px en desktop y 16–20 px en móvil.
- Cards: radio **20–24 px**; botones **12–16 px**; chips redondeados tipo pastilla.
- Imágenes: recorte natural con `object-fit: cover`, evitando caras cortadas por el encuadre.
- Sombras: discretas y frías; no usar glassmorphism excesivo, brillos 3D ni grandes degradados artificiales.
- Animaciones: 150–220 ms para hover/focus, respetar `prefers-reduced-motion`.
- Focus visible, controles interactivos de al menos 44×44 px cuando sea posible.

## 7. Componentes que debería tener el sistema

**Fundamentales:** Logo/Brand, Header, Navigation, SearchField, ActionButton, FilterChip, CategoryChip, VenueCard, VenueListItem, LocationBadge, EmptyState, LoadingSkeleton, ErrorState, MapMarker, MapPreview, SectionHeader, Footer.

**Composición pública:** HeroSplit, QuickAccessBento, FeaturedPlaces, MapDiscovery, LocationFilter, VenueDetail.

**Admin:** AdminShell, StatsCard, VenueTable, FormField, StatusBadge, SyncHistory. Mantener densidad de información y consistencia de tokens sin replicar decoración comercial.

**Estados necesarios para cada componente:** normal, hover cuando corresponda, focus visible, disabled, loading, vacío/error y selección activa. Evitar controles solo decorativos que aparenten funcionar.

## 8. Estructura visual de las páginas del MVP

### Inicio `/`
Header; hero con texto y fotografía; buscador; accesos por tipo y por zona; selección de locales confiables; vista resumida del mapa; CTA hacia explorar. No mostrar valoraciones sin fuente confiable.

### Explorar `/explorar`
Búsqueda principal, filtros por zona/categoría, resultados paginados, estados vacíos, tarjetas con información confiable. Filtros compartibles por URL cuando se implemente.

### Mapa `/mapa`
Mapa visible, pines interactivos, controles de categoría/zona, listado complementario y atribución OpenStreetMap. Manejar locales sin coordenadas y estados sin resultados.

### Detalle `/locales/[slug]` (ruta propuesta, a validar con estructura real)
Foto cuando exista, nombre, categoría, dirección, descripción, enlaces y horarios si son confiables. Marcar los datos faltantes como no disponibles; no adivinarlos.

### Administración `/admin/*`
Conservar el sistema existente. Adoptar tipografías, colores, botones, formularios y estados, pero mantener el foco en productividad, seguridad y claridad.

## 9. Diseño responsive

- **≥ 1024 px:** hero dividido con texto y foto; bento horizontal; mapa + información lateral.
- **768–1023 px:** ajustar columnas y mantener búsqueda completa.
- **≤ 767 px:** una columna; hero y fotografía apilados, botones grandes, chips desplazables solo si son accesibles, listado debajo del mapa.
- No incluir una barra de favoritos o cuentas en móvil mientras esas funciones no estén desarrolladas.
- Mantener el mismo color, jerarquía y componentes en los tres rangos.

## 10. Qué no copiar literalmente de los mockups

- Nombres de locales de ejemplo (`Río Alto`, `Coral House`, `Azul Patio`, etc.).
- Valoraciones de estrellas o cantidades de opiniones sin fuentes verificadas.
- Iconos de cuentas, favoritos, notificaciones, eventos, reservas o «Descargá la app» antes de existir.
- Fotos generadas como si fueran de establecimientos reales.
- Call-to-action que no lleva a una pantalla funcional.

## 11. Recomendación técnica de implementación

- Stack objetivo: Next.js 16, React 19, TypeScript y Tailwind CSS; Neon PostgreSQL y Prisma 5.
- Usar `salimo-design-tokens.css` como fuente inicial de valores y migrar gradualmente a variables/Tailwind sin duplicar hexadecimales en componentes.
- Definir componentes antes de maquetar las páginas, reutilizando el admin donde sea seguro.
- Dejar la representación de locales conectada a Neon con campos reales; verificar geocodificación y datos antes de publicarlos.
- No introducir dependencias de pago para lograr el aspecto visual.
- La identidad visual está **aprobada como dirección**. Ningún archivo de esta carpeta modifica el repositorio ni Production por sí mismo.

## 12. Criterios de aceptación visual

- ¿Se reconoce SALIMO. incluso sin leer la descripción?
- ¿El usuario puede buscar o explorar en los primeros segundos?
- ¿Se percibe el equilibrio entre coral cálido y navy frío?
- ¿El mapa es útil, con ubicación y filtros comprensibles?
- ¿El móvil mantiene la misma identidad sin scroll lateral?
- ¿Todos los botones tienen acciones reales?
- ¿Los contenidos, fotos y puntuaciones son verificables?
- ¿Contraste, foco, tamaños táctiles y estados se pueden utilizar correctamente?

---
**Aprobación de referencia:** mockups de escritorio y móvil de la fusión Bento digital + Urbano contemporáneo, 17/11/2026.