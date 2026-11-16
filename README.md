# SALIMO.

**¿Salimo? Encontrá dónde.**

SALIMO. es una plataforma web en desarrollo para descubrir bares, pubs y cervecerías de **San Miguel de Tucumán y Yerba Buena**. La propuesta es simple: buscar lugares, filtrarlos por zona y categoría, ubicarlos en un mapa y consultar información confiable antes de salir.

Es un **proyecto personal (hobby)**. Priorizamos herramientas gratuitas, rendimiento, simplicidad y la posibilidad de crecer si el proyecto lo necesita.

> **Estado:** en desarrollo. El repositorio contiene una base administrativa funcional; la experiencia pública de SALIMO. todavía está pendiente. Las funcionalidades planificadas no deben confundirse con las ya implementadas.

## Funcionalidades

### Implementadas

- Dashboard administrativo con listado de establecimientos.
- Alta, edición, cambio de estado y eliminación de locales.
- Validaciones y prevención básica de duplicados.
- Acceso administrativo provisional mediante HTTP Basic.
- Importación de bares y pubs desde OpenStreetMap a través de Overpass API.
- Identificación estable de registros OSM y protección de correcciones manuales.
- Clasificación de locales con Gemini y mecanismo alternativo sin IA.
- Sincronización manual mediante endpoint protegido y programación diaria con Vercel Cron.
- Pruebas automatizadas y validaciones en GitHub Actions.

### Planificadas para el MVP

**Web pública (sin registro):**
- Inicio con buscador, categorías y lugares destacados.
- Explorador con búsqueda y filtros por localidad y categoría.
- Mapa interactivo con establecimientos geolocalizados.
- Ficha de cada lugar con descripción, dirección y datos de contacto, imágenes y horarios **cuando haya datos confiables**.

**Administración:**
- Panel en `/admin` reutilizando el CRUD existente.
- Gestión de publicación y revisión de establecimientos.
- Historial de sincronizaciones y herramientas para revisar datos incompletos o conflictivos.

**Modelo de datos:**
- Ampliación segura de `Venue` con coordenadas, localidad, descripción, contactos, horarios y estados.
- Incorporación de `VenueImage` para referencias de fotografías y sus créditos.
- Incorporación de `SyncRun` para el historial persistente de sincronizaciones.

Las cuentas, los favoritos, las reseñas y las funcionalidades para propietarios quedan fuera del MVP.

## Tecnologías

| Área | Tecnología |
| --- | --- |
| Aplicación web y backend | Next.js 16, React 19, TypeScript |
| Estilos | Tailwind CSS |
| Base de datos | PostgreSQL en Neon |
| Acceso a datos | Prisma 5 |
| Datos geográficos | OpenStreetMap y Overpass API |
| Clasificación opcional | Gemini |
| Despliegue y tareas programadas | Vercel y Vercel Cron |
| Repositorio y CI | GitHub y GitHub Actions |

**Evaluadas para el MVP, todavía no integradas:** MapLibre GL JS + MapTiler (mapas) y Cloudinary (imágenes). Se utilizarán opciones gratuitas mientras resulten adecuadas.

## Ejecutar localmente

**Requisitos:** Node.js 22 o superior, npm y una base PostgreSQL accesible.

```bash
git clone https://github.com/nicopazz/salimo.git
cd salimo
npm ci
```

Copiá `.env.example` a `.env` y completá las variables necesarias **sin subir credenciales reales al repositorio**.

```bash
npx prisma generate
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

**Importante:** en la versión actual, la ruta `/` muestra el dashboard administrativo y requiere credenciales HTTP Basic. La portada pública y `/admin` son parte de la próxima etapa; todavía no están implementadas.

### Comandos útiles

```bash
npm run lint
npm run test:security
npm run build
```

`npm run worker` ejecuta el proceso local de sincronización programada y debe utilizarse únicamente en un entorno preparado para ello. **No ejecutes sincronizaciones ni escrituras sobre Production para probar cambios.**

## Variables de entorno

Tomá `.env.example` como referencia. Las principales variables son:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Acceso administrativo provisional |
| `SYNC_API_TOKEN` | Token exclusivo para `POST /api/sync` |
| `CRON_SECRET` | Token exclusivo para el Cron de Vercel |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Clasificación con IA (opcional) |
| `OVERPASS_CONTACT` | Contacto para solicitudes a Overpass |
| `SYNC_API_URL`, `SYNC_CRON`, `SYNC_TIMEZONE` | Configuración del worker local |
| `ALLOW_PREVIEW_WRITES` | Habilitación excepcional de escrituras en Preview, solo con una base aislada |

No reutilices tokens entre servicios ni incluyas secretos en el código o en los commits.

## Sincronización y seguridad

- `POST /api/sync` requiere `Authorization: Bearer <SYNC_API_TOKEN>`.
- `/api/cron/sync` utiliza `CRON_SECRET`. El Cron está configurado en `vercel.json` para las **09:00 UTC (06:00 de Argentina)**, sujeto a la configuración del despliegue.
- La sincronización evita ejecuciones concurrentes mediante bloqueo transaccional de PostgreSQL, y conserva las correcciones manuales de nombre normalizado, categoría y ubicación.
- La autenticación HTTP Basic es **provisional** y está pensada para un solo administrador.
- El borrado actual de establecimientos es **permanente**; el archivado seguro es una mejora pendiente.
- Las escrituras en Vercel Preview se bloquean por defecto. **Preview y Production deben utilizar bases o ramas de Neon aisladas antes de habilitar cambios de datos.**
- Antes de ampliar el esquema Prisma se requiere respaldo comprobado y migración no destructiva. No usar `prisma migrate reset` ni `prisma db push` contra una base con datos reales sin una revisión explícita.
- GitHub Actions ejecuta lint, pruebas, compilación y una prueba de integración con PostgreSQL temporal, sin usar la base de producción.

## Desarrollo del MVP

1. **Estructura y datos:** adaptar rutas públicas y administrativas; ampliar Prisma de manera segura.
2. **Experiencia pública:** inicio, explorador, filtros, mapa y fichas.
3. **Administración:** adaptar el dashboard, agregar revisión y controlar la publicación.
4. **Calidad y lanzamiento:** pruebas funcionales, accesibilidad, rendimiento, seguridad y consumo de planes gratuitos.

Se trabaja de forma incremental sobre la rama `main`, con cambios pequeños y verificables. No se prevé incorporar servicios pagos mientras SALIMO. siga siendo un proyecto hobby.

## Datos y atribuciones

Parte de la información se obtiene de **OpenStreetMap**, cuyos colaboradores mantienen los datos bajo la licencia **ODbL**. La web pública deberá mostrar la atribución correspondiente y respetar las condiciones de uso de los servicios de mapas y de Overpass. Las fotografías se publicarán solamente cuando exista autorización o licencia adecuada.

---

**SALIMO.** — ¿Salimo? Encontrá dónde.
