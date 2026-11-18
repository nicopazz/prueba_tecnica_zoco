# SALIMO. — Contexto corto de diseño del dashboard (18/11/2026)

**Decisión aprobada:** conservar y desarrollar el dashboard administrativo de SALIMO. siguiendo los tres mockups del paquete, con el **mockup 01 como referencia obligatoria principal**. No rediseñar desde cero ni usar plantillas genéricas.

## Identidad
- Marca: **SALIMO.**, con punto final coral.
- Estilo: **70 % Bento digital + 30 % urbano contemporáneo**, aplicado como panel SaaS premium.
- Fondo gris hielo `#F5F7FB`; tarjetas blancas `#FFFFFF`; tipografía/títulos azul noche `#102841`; sidebar navy `#112D48`; coral `#FF6852` y coral profundo `#C63E2E` para botones blancos; azul de mapa/selección `#1769FF`; peach `#FBE8DF`; texto secundario `#5A6779`; borde `#E0E7EF`.
- Usar **Manrope** para interfaz y **Instrument Serif Italic** solo como acento editorial.
- Tarjetas Bento 20–24 px de radio, separación ordenada, sombra tenue y bordes sutiles. Íconos lineales homogéneos.

## Referencias adjuntas
1. `referencias/01-dashboard-resumen.png` — **referencia principal:** sidebar oscura, topbar, encabezado editorial, cuatro KPIs, categorías, mapa, actividad reciente y CTA de revisión.
2. `referencias/02-dashboard-responsive-y-gestion.png` — referencia para móvil, tabla de locales y formulario de edición.
3. `referencias/03-analitica-y-fichas.png` — referencia para analítica futura, densidad visual y detalle de locales.

## Páginas del admin (propuesta a contrastar con rutas reales)
**Resumen, Locales, Mapa, Revisión, Sincronización y Configuración.** Analítica comercial con visitas, búsquedas y clics es futura y solo debe habilitarse con medición real y alcance aprobado. La gestión actual debe reutilizarse, no rehacerse sin motivo.

## Composición principal
Desktop: sidebar navy a izquierda (~228–252 px); barra superior clara con breadcrumb; título grande; fila de cuatro KPI; segunda fila de categorías + mapa; tercera fila de actividad verificable + próxima acción coral/navy. Usar gráficos funcionales y mapa real con atribución OSM. Sidebar oscura y espacio principal luminoso.

Móvil: navegación colapsable, tarjetas en 1 o 2 columnas según ancho, gráficos apilados, locales como tarjetas o lista compacta, formularios cómodos y **sin scroll horizontal**. Barra inferior solo si los destinos están implementados.

## Reglas fundamentales
- La prioridad es parecerse a los mockups **sin copiar los datos ficticios**.
- Cifras, nombres, porcentajes, fechas, visitas, fotos, opiniones, horarios y datos del mockup son **ilustrativos**.
- KPI reales que existan: total de locales, activos y categorías; revisión, sin coordenadas y actividad/sync solo si tienen respaldo real.
- No inventar porcentajes de crecimiento ni visitas/analítica sin telemetría.
- No inventar locales, coordenadas, estados de verificación ni fuentes OSM.
- Mantener el diseño público de SALIMO. coherente, pero administración más sobria y operativa.
- Preservar datos Neon, correcciones manuales, funcionamiento del panel existente y stack Next.js 16/React 19/TypeScript/Tailwind/Prisma 5.
- Inspeccionar repo antes de implementar. **Este archivo NO indica modificar código ni producción.**
- Aprobación obligatoria antes de cambiar la dirección visual.

**Guía completa:** `SALIMO_DASHBOARD_DISENO_OFICIAL.md`. **Contexto público original:** `SALIMO_CONTEXTO_VISUAL_BASE.md`.