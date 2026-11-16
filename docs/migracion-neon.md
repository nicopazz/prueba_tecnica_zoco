# Migración segura de SALIMO. (Neon)

La nueva versión agrega columnas opcionales a `Venue` y crea `VenueImage` y `SyncRun`. **No elimina ni renombra registros existentes.** Los establecimientos anteriores comienzan como `DRAFT` / `PENDING`.

## Estado
- El esquema Prisma y el SQL de migración están versionados.
- La app detecta si la columna `publicationStatus` existe. Mientras no esté aplicada, el CRUD antiguo y la sincronización siguen funcionando con selecciones compatibles, pero el catálogo público no muestra registros.
- **No se ejecuta una migración sobre Production automáticamente.**

## Aplicación segura cuando exista respaldo comprobado

1. Verificá que `DATABASE_URL` no apunta al entorno incorrecto.
2. Comprobá un respaldo o snapshot recuperable de Neon **y ensayá su restauración**.
3. Separá Preview y Production; Preview debe apuntar a una rama aislada de Neon.
4. En un entorno aislado ejecutá `npx prisma migrate deploy` y las pruebas de integración. No utilices `migrate reset`.
5. Revisá el resultado de `SELECT COUNT(*) FROM "Venue"` y comparalo contra el valor previo, incluyendo nombres y IDs.
6. Recién después aplicá la misma migración a Production. Nunca uses `db push` sobre Production sin revisión.
7. Revisá y completá localidad, coordenadas y contacto desde `/admin/locales/[id]`. Los registros con estado `PENDING` no se muestran al público.
8. La sincronización incorpora los datos OSM nuevos de forma conservadora. Los locales anteriores conservan su `location` original y pueden completarse manualmente.

La migración también puede crear el modelo base `Venue` en una base completamente vacía. En GitHub Actions se utiliza PostgreSQL aislado y `migrate deploy`.

## Cómo recuperar
Si la migración fallara, detené escrituras y restaurá el snapshot verificado de Neon en un entorno separado antes de hacer un cambio en Production. No borres columnas ni hagas migraciones de reversión destructivas sobre datos reales.

## Publicación
Solo aparecen locales con `isActive=true`, `reviewStatus=REVIEWED` y `publicationStatus=PUBLISHED`, cuando tienen categoría, localidad y ubicación suficiente. Los campos faltantes nunca se inventan.
