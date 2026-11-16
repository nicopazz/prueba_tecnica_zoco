# Zoco — Sincronizador de locales

Aplicación Next.js para administrar bares y pubs de Tucumán. Usa PostgreSQL (Neon), Prisma y Overpass (OpenStreetMap), con normalización opcional mediante Gemini.

## Funcionalidad
- Dashboard CRUD con edición, alta, eliminación y cambio de estado.
- Acceso administrativo protegido con usuario y contraseña.
- Endpoint POST /api/sync con token Bearer independiente.
- Importación OSM de nodos, vías y relaciones, con identificador estable en el campo source (ej. osm:node:123).
- Conserva correcciones humanas de nombre normalizado, categoría y ubicación.
- Transacción PostgreSQL para evitar sincronizaciones simultáneas.
- Gemini procesa exclusivamente nuevos locales; usa reglas determinísticas cuando falla.

## Instalación
Requiere Node.js 22+ y PostgreSQL. Copiar .env.example a .env y completar los valores sin subirlos a Git.

1. npm ci
2. npx prisma generate
3. npm run dev
4. npm run test:security
5. npm run worker (solo donde pueda ejecutarse un proceso continuo).

Esta actualización conserva el esquema de Prisma y NO necesita migración. No ejecutar prisma db push ni migrate reset en una base real sin respaldo.

## Variables de entorno
- DATABASE_URL: conexión PostgreSQL; Preview y Production deben usar bases/ramas de Neon distintas.
- ADMIN_USERNAME, ADMIN_PASSWORD: administrador único; HTTPS obligatorio.
- SYNC_API_TOKEN: token aleatorio separado para sincronización.
- GEMINI_API_KEY: opcional; en su ausencia se aplica clasificación básica.
- GEMINI_MODEL: opcional, predeterminado gemini-3.5-flash-lite.
- OVERPASS_CONTACT: contacto real para la API.
- SYNC_API_URL, SYNC_CRON, SYNC_TIMEZONE: variables del worker.

## Automatización
Solo POST /api/sync con Authorization: Bearer (SYNC_API_TOKEN) activa una importación.
El worker local ejecuta una vez al día por defecto. En Vercel está configurado el Cron nativo para todos los días a las 09:00 UTC (06:00 de Argentina). Para habilitarlo en producción, configurar CRON_SECRET con un token nuevo y distinto de SYNC_API_TOKEN. Sin CRON_SECRET, la ruta del Cron responde 401 y no ejecuta tareas.

## Verificaciones y advertencias
- CI usa npm ci, lint, test:security y build.
- No se incluyen secretos ni credenciales en el repositorio.
- Las pruebas automatizadas comprueban validaciones y el procesamiento sin tocar la base real.
- Los registros históricos se vinculan a OSM conservadoramente.
- La autenticación Basic es provisional, diseñada para un único administrador. Multiusuario requiere sesiones y roles.
- El borrado de locales sigue siendo permanente; hacer un respaldo antes de habilitarlo en producción.
- El workflow de CI levanta un PostgreSQL temporal para comprobar el CRUD sin afectar Neon.
- Antes de fusionar, configurar las credenciales en Production y separar Preview de la base real.
