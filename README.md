# SALIMO.

**¿Salimo? Encontrá dónde.**

SALIMO. es un proyecto personal (hobby) para descubrir bares, pubs y cervecerías de **San Miguel de Tucumán y Yerba Buena**. Priorizamos herramientas gratuitas y una arquitectura sencilla con Next.js y PostgreSQL.

## Estado del proyecto

**Implementado en código:**
- Web pública: Inicio (`/`), Explorar (`/explorar`), Mapa (`/mapa`), fichas (`/lugares/[slug]`) y atribuciones (`/fuentes`).
- Búsqueda y filtros por localidad y categoría, reutilizados en el mapa.
- Área administrativa privada en `/admin` con indicadores, mapa, prioridades de revisión y actividad reciente. Locales, Revisión y Sincronizaciones tienen filtros, ordenamiento y paginación del lado del servidor.
- Bandeja de revisión con búsqueda, filtros de estado y listado de datos faltantes, para publicar fichas de forma manual y controlada.
- En el administrador, la ubicación se elige buscando una dirección o haciendo clic/arrastrando un pin sobre el mapa (coordenadas guardadas automáticamente).
- Publicación controlada: solo se muestran locales revisados y publicados.
- Importación manual opcional desde OSM/Overpass, clasificación opcional con Gemini y protección de correcciones manuales. La ejecución automática está pausada.
- Modelo Prisma ampliado (Venue, VenueImage y SyncRun), con migración SQL aditiva preparada y tests automatizados.

**Pendiente de configuración / lanzamiento:**
- Revisar y publicar los establecimientos existentes; completar información confiable.
- Configurar las credenciales de Cloudinary para habilitar las subidas desde el administrador. También se admiten enlaces HTTPS a fotos autorizadas.

## Tecnología

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Prisma 5 · PostgreSQL (Neon) · OpenStreetMap / Overpass · Gemini opcional · Vercel · GitHub Actions.

Para el mapa inicial se utiliza Leaflet cargado únicamente en la página del mapa y cartografía de OpenStreetMap, sujeto a sus políticas de uso. Si aumenta el tráfico, se evaluará otro proveedor gratuito o de pago.

## Instalación

Requisitos: Node.js 22+, npm, PostgreSQL.

```bash
git clone https://github.com/nicopazz/salimo.git
cd salimo
npm ci
```

Creá `.env.local` a partir de las variables documentadas, completá las credenciales sin subirlas al repositorio e iniciá:

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

La migración solo debe ejecutarse sobre una **base de desarrollo propia o aislada**. Seguí [la guía de migración](docs/migracion-neon.md) antes de usar Neon Production. No ejecutes `prisma migrate reset` en una base con datos.

## Variables principales

`DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SYNC_API_TOKEN`, `CRON_SECRET`, `OVERPASS_CONTACT`. Para subir fotos, configurar también `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`. Opcionales: `GEMINI_API_KEY`, `GEMINI_MODEL`, `SYNC_API_URL`, `SYNC_CRON`, `SYNC_TIMEZONE`.

### Fotografías con Cloudinary

Las subidas se procesan en el servidor desde `/admin/locales`; las credenciales nunca se envían al navegador. Obtené el Cloud name, API Key y API Secret desde el panel de Cloudinary y guardalos como las tres variables anteriores en `.env.local` para desarrollo o en las variables de entorno del entorno de Vercel que corresponda. No uses el prefijo `NEXT_PUBLIC_` ni compartas el API Secret. `.env.local` está excluido de Git.

Se aceptan JPEG, PNG y WebP de hasta 4 MB por archivo y un máximo de cinco fotos por establecimiento. Cada foto requiere origen, crédito, licencia o permiso y confirmación de autorización. Las imágenes agregadas previamente mediante URL HTTPS siguen siendo compatibles y no se eliminan al subir nuevas fotos.

En Preview las escrituras se bloquean por defecto con `ALLOW_PREVIEW_WRITES` salvo que la base esté separada y se habilite expresamente.

## Seguridad y automatización

- La web pública es de solo lectura. Las rutas `/admin`, `/api/admin/*` y `/api/venues/*` requieren credenciales HTTP Basic, provisionales para un administrador.
- `POST /api/sync` requiere `SYNC_API_TOKEN` y `/api/cron/sync` requiere `CRON_SECRET`; las credenciales deben ser distintas.
- El Cron diario de Vercel está **pausado** (`vercel.json` no programa ejecuciones). La importación manual se conserva; no usarla hasta verificar la conexión con Overpass.
- Los archivos de imagen se deben usar con licencia/permiso apropiados.
- El borrado administrativo ahora archiva sin eliminar físicamente las filas.
- GitHub Actions ejecuta lint, pruebas, build, migración y pruebas HTTP con PostgreSQL temporal. **No toca Neon**.

## Desarrollo

Trabajamos incrementalmente sobre `main` con servicios gratuitos, pruebas y cambios no destructivos. Las cuentas, favoritos, reseñas, promociones y propietarios quedan fuera del MVP.

**Fuentes:** datos © [colaboradores de OpenStreetMap](https://www.openstreetmap.org/copyright), licencia ODbL. Respetar también las condiciones de Overpass y del servicio de teselas.

---

**SALIMO. — ¿Salimo? Encontrá dónde.**

### Búsqueda de direcciones

El administrador utiliza un buscador de direcciones bajo demanda (sin autocompletado) mediante el servicio público Nominatim de OpenStreetMap. La consulta está limitada al área de Tucumán y protegida por HTTP Basic. Para respetar el máximo de **1 solicitud por segundo a nivel aplicación**, las búsquedas usan un bloqueo transaccional global de PostgreSQL; solicitudes simultáneas pueden responder HTTP 429 para reintentar. La búsqueda no publica información ni modifica establecimientos: la ubicación se guarda únicamente al presionar **Guardar establecimiento**. Es necesario verificar cada punto encontrado. Se aplican las [condiciones de Nominatim](https://operations.osmfoundation.org/policies/nominatim/); si aumenta el uso, cambiar de proveedor.
