# SALIMO. — Contexto visual oficial (v1.0 · 17/11/2026)

Este bloque está pensado para **pegarse en las instrucciones o contexto del proyecto** y guiar el diseño y la implementación. No reemplaza la arquitectura funcional ni las decisiones de seguridad.

## Identidad elegida

La identidad visual aprobada de **SALIMO.** combina **Bento digital (70%)** con **Urbano contemporáneo (30%)**. Los mockups de escritorio y móvil de esta carpeta son la principal **referencia conceptual**, no diseños implementados pixel a pixel.

**Personalidad:** moderna, urbana, cálida, social, confiable y profesional. Tiene que sentirse como una guía digital real de bares, pubs y cervecerías de Tucumán, nunca como una plantilla genérica. Concepto editorial principal: **«Salí. Explorá. Descubrí.»**. Usar siempre la marca **SALIMO.** con punto final.

## Paleta oficial (tokens semánticos)

- Fondo general / gris hielo: `#F5F7FB` (`--salimo-bg`)
- Tarjetas y superficies: `#FFFFFF` (`--salimo-surface`)
- Azul noche / texto principal: `#102841` (`--salimo-ink`)
- Coral de marca: `#FF6852` (`--salimo-coral`)
- Coral profundo / botón con letras blancas: `#C63E2E` (`--salimo-coral-deep`)
- Azul eléctrico para mapa, selección y acciones concretas: `#1769FF` (`--salimo-blue`)
- Azul oscuro de paneles / CTA: `#112D48` (`--salimo-navy-surface`)
- Crema rosado para bloques destacados: `#FBE8DF` (`--salimo-peach`)
- Texto secundario: `#5A6779` (`--salimo-muted`)
- Bordes suaves: `#E0E7EF` (`--salimo-border`)

**Uso:** 70% fondos y superficies claras, 20% texto/paneles azul noche, 10% coral y azul eléctrico. Evitar usar coral y azul como acentos de igual peso en cada pantalla. Coral = identidad / llamadas a la acción; azul = mapa, filtros activos y navegación secundaria.

**Accesibilidad:** coral claro `#FF6852` con texto blanco no tiene suficiente contraste para texto pequeño. Usar **texto azul noche** sobre ese coral, o **coral profundo `#C63E2E` con texto blanco** para botones que requieran texto blanco. No depender solo del color para indicar estado.

## Tipografía

- **Manrope**: fuente principal para interfaz, navegación, cuerpos, filtros, botones y títulos (pesos 400–800).
- **Instrument Serif Italic**: solo para palabras/frases editoriales destacadas como «Descubrí.» o «en el mapa.». No utilizarla para fichas, filtros o información funcional.
- Cuerpo: 16 px; secundarios: 14 px; tarjetas: 18–22 px; encabezados de sección: 32–40 px; hero desktop: 56–68 px. Adaptar fluidamente a móvil.
- En Next.js priorizar `next/font/google` para las fuentes, evitando depender de cargas remotas de CSS en producción.

## Componentes y composición

- Layout **Bento**, grid flexible y responsive, con tarjetas de tamaños diferentes pero alineadas en una misma retícula.
- Radio de tarjetas: 20–24 px; botones: 12–16 px o pastilla en filtros; sombras muy suaves; bordes delicados.
- Header simple con logo, Explorar, Mapa y ubicación. No mostrar controles de cuentas, favoritos, notificaciones o descarga de app mientras no existan.
- Home desktop: bloque editorial de texto a la izquierda + foto social/nocturna protagonista a la derecha; buscador visible; accesos a bares/cervecerías y zonas; filtros; sección de mapa con resultados; CTA azul noche.
- Home móvil: apilar hero, foto, buscador, accesos, mapa y lugares; botones táctiles cómodos; cero scroll horizontal; navegación fácil. Barra inferior solo si sus destinos están operativos.
- Explorar: prioridad a búsqueda y filtros, resultados con datos reales y estados vacíos.
- Mapa: protagonista, pines claros, lista contextual, filtros efectivos y atribución OpenStreetMap visible.
- Fichas: nombre, categoría, localidad, dirección, fotos, horarios y contacto **solo cuando estén verificados**.
- Admin: mismos tokens y tipografía, pero interfaz más sobria y funcional; no copiar el hero publicitario al panel.

## Fotografía e iconografía

Fotografía editorial realista: amistades compartiendo, patios, cervezas, coctelería, luces cálidas y ambientes tucumanos. Evitar imágenes stock estereotipadas y composiciones artificiales. Las imágenes de los mockups son **ilustrativas**, no fotografías ni pruebas de locales reales. Iconos lineales de una sola familia visual (por ejemplo Lucide).

## Límites del MVP

NO presentar favoritos, cuentas, puntuaciones, reseñas, notificaciones, eventos, reservas o descarga de app como funciones existentes si no están implementadas. Los nombres y puntuaciones que aparecen en los mockups son **ejemplos ficticios**: no cargarlos en Neon ni mostrarlos como datos reales. Utilizar únicamente establecimientos y metadatos confiables; nunca inventar horarios, dirección, fotos o valoración.

## Implementación técnica

Next.js 16 + React 19 + TypeScript + Tailwind CSS, manteniendo Neon PostgreSQL y Prisma 5. Convertir los tokens de `salimo-design-tokens.css` en fuente única de colores, tipografía, radios y sombras. Crear componentes reutilizables y adaptar el panel administrativo existente. Mantener la infraestructura gratuita, respetar OSM y preservar los datos.

**Regla de trabajo:** conservar esta dirección visual en todas las pantallas; no reemplazarla por otro estilo sin aprobación. Este documento registra una decisión de diseño; no solicita por sí mismo modificar el repositorio o producción.