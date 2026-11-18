# SALIMO. — Guía oficial de diseño del dashboard administrativo

**Versión:** 1.0  
**Fecha:** 18 de noviembre de 2026  
**Estado:** propuesta visual de referencia aprobada. **NO significa que las pantallas o métricas estén implementadas.**  
**Alcance:** área de administración de SALIMO. y su continuidad visual con la web pública.

> **Regla principal:** diseñar y desarrollar el panel de SALIMO. siguiendo la composición, densidad, personalidad y lenguaje de los mockups adjuntos. No sustituirlos por dashboards genéricos. Las capturas son referencias visuales; las necesidades de datos, accesibilidad y el producto real prevalecen sobre cualquier cifra o nombre ficticio mostrado.

---

## 1. Dirección visual aprobada

SALIMO. combina **70 % Bento digital y 30 % urbano contemporáneo**. En la administración, esa mezcla debe leerse como un **producto SaaS premium de gestión**, sobrio y eficaz, sin perder su identidad tucumana, social y nocturna.

- **Personalidad:** profesional, contemporánea, clara, confiable y original.
- **Jerarquía visual:** navegación oscura y estable; área de trabajo luminosa; tarjetas blancas; coral como identidad y énfasis; azul para mapa, filtros y datos.
- **Sensación buscada:** precisión de software empresarial con la calidez de una guía gastronómica urbana.
- **Regla de marca:** escribir siempre `SALIMO.` con punto final; acento coral en el punto.
- **Lema editorial:** «Salí. Explorá. Descubrí.»; reservarlo para espacios de marca, no repetirlo como encabezado en toda pantalla operativa.
- **Referentes de producto (conceptuales, no para clonar):** Linear (orden y navegación), Attio (gestión de registros), Vercel (métricas operativas).

### Orden de referencia de los mockups

| Prioridad | Archivo | Qué preservar |
|---|---|---|
| **1 — Principal** | `referencias/01-dashboard-resumen.webp` | Sidebar azul noche, encabezado superior, cuatro KPIs, gráfico horizontal de categorías, mapa, actividad reciente y panel de revisión |
| **2 — Complementario** | `referencias/02-dashboard-responsive-y-gestion.webp` | Responsive móvil, tabla de establecimientos, edición de registros y proporciones de las tarjetas |
| **3 — Complementario** | `referencias/03-analitica-y-fichas.webp` | Densidad de datos, gráficos, listado de locales, ficha de local y tratamiento de imágenes |

**Importante:** no tomar los nombres, mapas, horarios, números, porcentajes o fotografías de estas imágenes como información real. Son ejemplos de diseño generados para visualizar la propuesta.

## 2. Design tokens oficiales

Esta guía **extiende**, no reemplaza, el documento existente `SALIMO_CONTEXTO_VISUAL_BASE.md`.

| Token | Valor | Uso |
|---|---|---|
| `--salimo-bg` | `#F5F7FB` | Fondo gris hielo del área de trabajo |
| `--salimo-surface` | `#FFFFFF` | Tarjetas, formularios, tablas, popovers |
| `--salimo-ink` | `#102841` | Texto principal, encabezados y números |
| `--salimo-coral` | `#FF6852` | Marca, acentos, pequeñas superficies destacadas |
| `--salimo-coral-deep` | `#C63E2E` | CTA con letras blancas cuando sea necesario |
| `--salimo-blue` | `#1769FF` | Mapa, selección secundaria, gráficos de interacción |
| `--salimo-navy-surface` | `#112D48` | Sidebar, bloques oscuros, fondos de marca |
| `--salimo-peach` | `#FBE8DF` | Tarjetas o notas de énfasis suave |
| `--salimo-muted` | `#5A6779` | Descripciones, etiquetas y valores secundarios |
| `--salimo-border` | `#E0E7EF` | Bordes delicados, separadores y campos |

**Distribución visual aproximada:** 70 % fondo/superficies claras, 20 % navy/títulos, 10 % coral/azul. Evitar que el coral y el azul compitan por el mismo protagonismo en una pantalla.

**Contraste:** `#FF6852` con texto blanco pequeño no da suficiente contraste. Para navegación activa/botones, usar coral profundo con blanco o coral claro con texto azul noche. No usar exclusivamente color para estados.

### Tipografía

- **Manrope** (400–800): navegación, botones, KPI, tablas, formularios, filtros, títulos de módulos.
- **Instrument Serif Italic**: pequeñas frases editoriales, como «en perspectiva.» o «Descubrí.». No usar para celdas, números, estados ni inputs.
- Escalas orientativas (ajustables según viewport): títulos de dashboard 36–44 px desktop / 28–32 px móvil; títulos de módulo 24–32 px; títulos de tarjeta 18–22 px; cuerpo 14–16 px; etiquetas 12–14 px; KPI 30–38 px.
- Números con buen alineamiento visual y tabulares cuando ayude a comparar columnas.
- Cargar fuentes con `next/font` cuando corresponda y reutilizar tokens existentes.

### Superficies y ritmo

- Tarjetas principales con **radio de 20–24 px**; controles 12–16 px; chips/pastillas muy suaves.
- Bordes finos `--salimo-border`; sombras tenues, sin efecto flotante exagerado.
- Espaciado consistente en escala 4/8: por ejemplo, padding de tarjetas 20–24 px y separación entre tarjetas 16–20 px.
- Íconos lineales de una única familia (preferencia: Lucide); mismo grosor y escala funcional.
- Gráficos con líneas limpias, cuadrículas discretas y etiquetas legibles. No introducir gradientes o brillos excesivos.

## 3. Estructura maestra del dashboard

### Desktop — composición prioritaria

Reproducir la lógica del archivo **01-dashboard-resumen.webp**:

1. **Sidebar fija o estable, azul noche**, con logo SALIMO. arriba, menú vertical y una pequeña firma de identidad de Tucumán abajo. Ancho orientativo 228–252 px, con bordes redondeados en el contenedor.
2. **Barra superior clara**, con breadcrumb `Administración / [sección]`, selector de ámbito cuando exista, búsqueda administrativa solo si funciona y acceso de sesión. No poner elementos simulados.
3. **Título y subtítulo** con jerarquía editorial: por ejemplo, `Tu ciudad, en perspectiva.` más una descripción de los datos que se muestran. Instrument Serif Italic únicamente en la expresión destacada.
4. **Primera fila:** cuatro KPI compactos e idénticos en altura. Cada KPI tiene ícono discreto, etiqueta, valor real y, *solo si es calculable*, variación histórica.
5. **Segunda fila:** bloque ancho con distribución por categorías (barras horizontales) y bloque de mapa geográfico con los locales válidamente ubicados.
6. **Tercera fila:** actividad reciente (eventos reales si hay registro) y tarjeta oscura de **acción prioritaria**, por ejemplo `Locales pendientes de revisión`, con CTA coral.
7. Mantener el conjunto aireado: contenido denso, pero nunca apretado ni convertido en collage decorativo.

### Navegación administrativa sugerida

Menú base, respetando módulos y rutas *que realmente existan en el proyecto*:

- **Resumen** — estado general e indicadores operativos.
- **Locales** — búsqueda, filtros, alta, edición, activación/desactivación.
- **Mapa** — distribución de locales con coordenadas fiables.
- **Revisión** — pendientes de normalización, datos dudosos y comprobaciones.
- **Sincronización** — acción manual, resultados e historial real.
- **Configuración** — opciones administrativas existentes.

Una sección de **Analítica** comercial (visitas, clics, tráfico, búsquedas) se deja **futura/condicional**: solo se habilita cuando exista instrumentación de eventos, consentimiento y retención apropiados, y datos reales. No convertir el mockup 02/03 en evidencia de que esa función existe.

### Rutas orientativas, sujetas a auditoría del repositorio

`/admin` · `/admin/locales` · `/admin/locales/[id]` · `/admin/mapa` · `/admin/revision` · `/admin/sincronizacion` · `/admin/configuracion`.

**No crear ni renombrar rutas sin verificar las existentes y acordar alcance.** Evitar cambiar rutas estables solo para replicar las capturas.

## 4. Especificación por pantalla

### A. Resumen (`/admin`)

**Objetivo:** responder en pocos segundos cuántos locales hay, cuántos están activos, qué datos requieren atención y cuál es el próximo paso del administrador.

**Componentes:**

- `StatCard`: total de locales, activos, pendientes de revisión, sin coordenadas (o métricas equivalentes respaldadas por el esquema).
- `CategoryDistribution`: barras de categorías y cantidades reales, con filtros únicamente funcionales.
- `VenueMiniMap`: puntos de San Miguel de Tucumán y Yerba Buena según datos comprobables, tooltip útil y atribución OSM.
- `ActivityFeed`: eventos auditables reales, si existen. Si no hay log, reemplazar por un bloque útil de información/sincronización; no inventar actividad.
- `NextActionCard`: prioridad administrativa con cifra derivada del sistema y CTA operativa.

**Reglas:** si no hay histórico, suprimir `+6 %`, tendencias y sparkline. Si no hay datos suficientes, mostrar estados vacíos honestos. Nunca fijar cantidades de los ejemplos del mockup.

### B. Gestión de locales

**Referencia:** tablas del mockup 02 y mockup 03.

- Encabezado claro `Locales`, resumen breve y botón primario `Nuevo local` **solo si la acción existe**.
- Barra de búsqueda y filtros por categoría, localidad, estado de actividad y revisión, cuando esos atributos sean confiables.
- Tabla desktop: **Nombre**, **Categoría**, **Localidad**, **Estado**, **Actualización**, **Acciones**. Las fotos son optativas y nunca obligatorias si no existen.
- Filas limpias, miniatura pequeña si hay foto autorizada, badges legibles y menú contextual visible por teclado.
- Paginación o carga progresiva, estado sin resultados y feedback de guardado/error.
- Móvil: lista de tarjetas o filas compactas, **sin tabla horizontal imposible de usar**.

### C. Ficha / edición administrativa de local

- Cabecera con nombre, estado y acciones `Editar / Guardar / Cancelar` según modo.
- Secciones: **Información**, **Ubicación**, **Categoría/estado**, **Contacto/horarios/fotos** si el esquema las soporta y están justificadas.
- Distinguir **datos provenientes de OSM/IA** y **correcciones manuales**; no sobrescribir accidentalmente campos protegidos.
- Estados de validación y origen explícitos; confirmación antes de acciones destructivas.
- Si faltan coordenadas, ofrecer flujo de ubicación ya admitido por el sistema; jamás colocarlas al azar.
- Foto ilustrativa del mockup NO es material de producto ni imagen de un establecimiento real.

### D. Revisión y calidad de datos

- Bandeja de pendientes con filtros por causa: coordenadas ausentes, categoría dudosa, duplicación potencial, falta de verificación.
- Cada registro debería explicar **qué dato necesita atención y por qué**.
- Acciones claras: ver ficha, corregir, confirmar, descartar sugerencia cuando el flujo lo soporte.
- Priorizar trazabilidad y preservación de correcciones manuales.
- No etiquetar un local como “verificado” si no existe un procedimiento y estado auditable real.

### E. Sincronización

- Estado real de la última ejecución, fecha/hora y resultado.
- Totales de registros incorporados/actualizados/revisados **solo cuando esos datos estén disponibles**.
- Acción manual protegida por la autenticación administrativa y controles adecuados.
- Historial real de ejecuciones cuando exista; si no existe, no fingirlo.
- Indicar errores e información de OSM con atribución y respeto a sus condiciones.

### F. Mapa administrativo

- Mapa amplio con pines reales y lista contextual filtrable.
- Diferenciar elementos ubicados y **sin ubicación** mediante contadores y vistas, no mediante pines falsos.
- Conservar atribución a OpenStreetMap visible y controles accesibles.
- Manejar carga, error del servicio, falta de datos y vista móvil.

### G. Analítica avanzada (no incluida por defecto en el MVP)

Usar el **mockup 03** como línea visual para una posible etapa posterior. Ejemplos de componentes futuros: serie temporal de visitas, origen de navegación, locales más consultados, búsquedas, clics y comparativas. Ninguno se presenta como métrica real ni debe implementarse sin definición de eventos, privacidad, persistencia y alcance aprobado.

## 5. Responsive

| Ancho | Comportamiento visual esperado |
|---|---|
| Desktop amplio (aprox. ≥1280 px) | Sidebar + 4 KPI + dos columnas Bento + última fila equilibrada |
| Laptop/tablet horizontal (aprox. 900–1279 px) | Sidebar compacta según espacio; KPI en dos columnas cuando sea necesario; paneles en 1–2 columnas |
| Tablet vertical (aprox. 640–899 px) | Menú colapsable; 2 KPI por fila; mapa y gráficos ocupan el ancho disponible |
| Móvil (aprox. <640 px) | Header compacto; sidebar transformada en menú accesible; KPI 2×2 si se lee bien o 1 por fila; gráficos apilados; formularios táctiles |

En móvil, seguir la **sensación** de los teléfonos de los mockups 02 y 03, pero no copiar una navegación inferior con destinos que no estén implementados. **Cero scroll horizontal** en el layout principal. Las tablas deben reestructurarse y los gráficos deben conservar etiquetas legibles.

## 6. Reglas para datos reales y estados de UI

- El modelo actual informado para `Venue` parte de `id`, `originalName`, `normalizedName`, `location`, `category`, `source`, `confidence`, `isActive`, `createdAt`, `updatedAt`. Confirmar esquema real antes de programar.
- **Total / activo**: conteos desde la base, no valores hardcoded.
- **Pendiente de revisión**: requiere criterio real y consistente; no inferir solo de un color en mockup.
- **Sin coordenadas**: computable si el modelo tiene latitud/longitud; contemplar ausencia del campo hasta que exista.
- **Tendencia mensual**: únicamente si se conservan snapshots o eventos comparables.
- **Visitas / clics / interacciones / búsquedas**: no usar hasta contar con telemetría real y decisión de privacidad.
- **Última actividad**: usar historial de sincronización/edición solo si existe.
- **Fotos, horarios, direcciones, teléfonos, puntuaciones**: solo metadatos con procedencia válida; nada inventado.
- Incluir estados `loading`, `vacío`, `error`, `sin permisos` cuando corresponda y `sin información verificada`.
- Evitar que el layout cambie bruscamente cuando un dato falte.

## 7. Componentes reutilizables recomendados

`AdminShell`, `AdminSidebar`, `AdminTopbar`, `PageHeading`, `StatCard`, `CategoryDistribution`, `VenueMiniMap`, `ActivityFeed`, `NextActionCard`, `FilterBar`, `VenueTable`, `VenueStatusBadge`, `VenueForm`, `ReviewQueue`, `SyncRunCard`, `EmptyState`, `ErrorState`, `ConfirmDialog`.

Estos nombres son **propuesta conceptual**, no una orden de crear archivos ni reemplazar componentes actuales. Antes de programar, inspeccionar y reutilizar lo que ya existe.

## 8. Criterios de fidelidad visual

Al implementar cada pantalla, comparar lado a lado con la captura de referencia:

- [ ] Marca `SALIMO.` correcta y sidebar azul noche con navegación sobria.
- [ ] Misma jerarquía del dashboard principal: barra superior → encabezado → KPI → distribución/mapa → actividad/acción.
- [ ] Colores desde tokens oficiales, sin paletas nuevas arbitrarias.
- [ ] Tipografía Manrope y serif editorial muy controlada.
- [ ] Tarjetas Bento con radios, espaciado, bordes y sombras consistentes.
- [ ] Mapas y gráficos legibles, no decorativos.
- [ ] Tablas y formularios tan cuidados visualmente como la portada.
- [ ] Móvil usable y sin desplazamiento horizontal.
- [ ] Datos y estados reales, o estados vacíos explícitos; jamás cifras simuladas en producción.
- [ ] Accesibilidad: foco visible, contraste, semántica, navegación por teclado, área táctil cómoda.
- [ ] Ningún cambio inesperado en la web pública ni en funciones existentes.

### Proceso acordado para iterar

1. Revisar pantalla existente y datos disponibles.
2. Definir si el módulo está en el MVP o en una etapa posterior.
3. Comparar con los mockups aprobados y aplicar tokens/componentes existentes.
4. Verificar responsive, accesibilidad, vacíos, errores y acciones.
5. Pedir aprobación antes de cambios de dirección visual o de alcance funcional.

## 9. Restricciones del proyecto

- Mantener **Next.js 16 / React 19 / TypeScript / Tailwind CSS**, backend en Next.js.
- Preservar **PostgreSQL Neon / Prisma 5**, registros y correcciones manuales.
- Priorizar infraestructura gratuita; evitar proveedores pagos para replicar estética.
- Revisar el repositorio antes de tocar código, confirmar seguridad y conexiones a base de datos.
- No modificar datos de producción ni desplegar por el simple hecho de existir esta guía.
- Mantener el diseño público y administrativo conectados por el mismo sistema visual, **pero con distinta densidad y propósito**.

## 10. Instrucción para futuras sesiones de desarrollo

> Trabajamos en SALIMO., guía de bares y cervecerías de Tucumán. Esta carpeta contiene la dirección visual **aprobada** del panel administrativo. Usá `01-dashboard-resumen.webp` como referencia principal de composición, `02-dashboard-responsive-y-gestion.webp` para móvil, tablas y edición, y `03-analitica-y-fichas.webp` para densidad visual y analítica futura. Mantené exactamente la identidad de colores, tipografías, tarjetas Bento, sidebar navy, acentos coral y lenguaje editorial. No reemplaces el diseño por una plantilla genérica. Antes de implementar, revisá código, rutas, datos y componentes existentes. No inventes KPIs, locales ni contenidos; si algo no existe, usá estados vacíos y priorizá las funcionalidades del MVP. Esta guía no autoriza cambios de código por sí sola.