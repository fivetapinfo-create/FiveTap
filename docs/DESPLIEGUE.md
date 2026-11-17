# Desplegar FiveTap en cualquier servidor

FiveTap es una app Next.js normal: no depende de Vercel ni de un dominio fijo.

## Requisitos
- Node.js 20 o más nuevo.
- Un proyecto de Supabase con `supabase/schema.sql` aplicado.
- Las variables de `.env.example` (las obligatorias: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_BACKUP_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`).

## Pasos
```bash
npm ci
npm run build
npm start            # escucha en el puerto 3000 (PORT=xxxx para otro)
```
Detrás de un proxy (Nginx, Caddy, Cloudflare), envía `X-Forwarded-Host` y `X-Forwarded-Proto`: FiveTap arma sus enlaces y las llaves de Face ID con el dominio por el que entra cada visita.

## Tarea diaria
En Vercel corre sola (`vercel.json`). En otro servidor, prográmala una vez al día (por ejemplo 7:07 a. m. de Panamá):
```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://TU-DOMINIO/api/cron/daily
```

## Cambio de dominio (lista)
1. Apunta el DNS al servidor y pon `NEXT_PUBLIC_SITE_URL=https://tu-dominio`.
2. Redirige el dominio anterior al nuevo (301) para que las placas ya instaladas sigan funcionando.
3. Face ID del Founder: las llaves de acceso son por dominio; vuelve a agregar tu dispositivo en Más → Seguridad.
4. Notificaciones push: cada dueño debe volver a activarlas una vez desde su app.
5. Reenvía los enlaces de acceso de FiveTap Business si cambiaron.

## Comprobación
`GET /api/health` responde `{ ok: true }` si la base de datos contesta (no revela nada privado).

## Seguridad que ya trae
- Base de datos: RLS activado en todas las tablas y sin políticas públicas; solo el servidor (clave de servicio) lee y escribe.
- Ninguna clave secreta llega al navegador.
- Panel Founder con contraseña, contraseña de respaldo, Face ID y bloqueo por inactividad.
- FiveTap Business con códigos privados o usuario y contraseña, y bloqueo tras 5 intentos.
- Encabezados de seguridad (HSTS, nosniff, sin iframes de terceros, CSP básica).
- Límites contra abuso en formularios públicos.
