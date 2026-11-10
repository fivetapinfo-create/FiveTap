# FiveTap

**Más reseñas. Más clientes.** Para restaurantes y cafés premium.

El cliente toca una placa NFC (o escanea el QR) y ve una pregunta y dos botones:
**Dejar reseña en Google** o **Hablar con el gerente** (mensaje privado).

Sin IA. Sin APIs de pago. Next.js + Supabase + Vercel.

---

## Qué hay

| Ruta | Para quién | Qué hace |
|---|---|---|
| `/` | Dueños | Landing (restaurantes y cafés). `/para/cafes`, `/para/bares`… adaptan el texto |
| `/demo?n=Nombre` | Tú, vendiendo | La página del cliente con el nombre del negocio, sin base de datos |
| `/t/<código>` | Cliente final | Lo que abre la placa NFC. El QR abre lo mismo con `?s=q` |
| `/t/<código>/go` | Cliente final | Cuenta el clic y abre el formulario de reseña de Google |
| `/t/<código>/mensaje` | Cliente final | Mensaje privado → panel + email al gerente |
| `/pagar?n=Nombre` | Dueños | Tarjeta/PayPal, Yappy, ACH. Solo muestra lo configurado |
| `/admin` | Solo tú | Negocios, placas, QR, estadísticas, pagos |
| `/admin/mensajes` | Solo tú | Bandeja de mensajes privados, con aviso de no leídos |

Los enlaces de las placas **nunca cambian**: el código apunta al negocio en la
base de datos. Puedes cambiar logo, Google o email sin reprogramar nada.

---

## Despliegue (unos 30 minutos)

### 1. GitHub
Sube este código a tu repo (por ejemplo `fivetapinfo-create`):

```bash
git remote add origin https://github.com/<tu-usuario>/fivetapinfo-create.git
git push -u origin fivetap:main
```

### 2. Supabase (gratis)
1. Crea un proyecto (región: `us-east-1` es la más cercana a Panamá).
2. **SQL Editor** → pega todo `supabase/schema.sql` → **Run**. Se puede volver a
   ejecutar sin romper nada.
3. **Project Settings → API**: copia `Project URL` y la clave `service_role`.

### 3. Vercel
1. **Add New → Project** → importa el repo de GitHub. Framework: Next.js (se detecta solo).
2. Añade las variables de `.env.example` (mínimo las 6 obligatorias).
3. **Deploy**.
4. **Settings → Domains**: conecta tu dominio y pon el mismo en `NEXT_PUBLIC_SITE_URL`.
   Vuelve a desplegar después de cambiar esa variable.

> El plan Hobby de Vercel es solo para uso no comercial. Pasa a Pro ($20/mes)
> el día que cobres al primer cliente.

### 4. Email (opcional, gratis)
1. Crea una cuenta en [resend.com](https://resend.com) → **API Keys** → crea una.
2. **Domains** → añade tu dominio y copia los registros DNS en Cloudflare/Vercel.
3. Define `RESEND_API_KEY`, `EMAIL_FROM` y `FOUNDER_EMAIL` en Vercel.

Sin email todo funciona igual: los mensajes aparecen en `/admin/mensajes` con
un contador de no leídos.

### 5. Pagos (opcional)
- **PayPal**: plan mensual $129 → `PAYPAL_MONTHLY_URL`
  (también es el botón de `/empezar`, junto con `PAYPAL_CLIENT_ID`); plan anual
  $1,290 y su mitad $645 → `PAYPAL_ANNUAL_URL`, `PAYPAL_ANNUAL_HALF_URL`; 1 placa
  $35/mes, 2 placas $60 y tarjeta de mesero $25 → `PAYPAL_PLAQUE_URL`,
  `PAYPAL_PACK_URL`, `PAYPAL_WAITER_URL`. Sin enlace, cada botón abre WhatsApp.
- **Yappy**: tu directorio → `YAPPY_HANDLE`.
- **ACH**: `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_TYPE`, `BANK_ACCOUNT_NUMBER`.
- Cada pago se registra en el panel del negocio. El primero lo pasa de *Prueba* a *Activo*.

---

## Checklist antes de vender

- [ ] `schema.sql` ejecutado en Supabase sin errores
- [ ] Las 6 variables obligatorias en Vercel
- [ ] Dominio propio conectado y en `NEXT_PUBLIC_SITE_URL` (el panel avisa si falta)
- [ ] Entrar a `/admin` con tu contraseña
- [ ] Crear un negocio de prueba con **tu** enlace de Google
- [ ] Grabar una placa NFC real y tocarla con un iPhone **y** un Android
- [ ] Escanear el QR impreso
- [ ] Tocar "Dejar reseña" → se abre el formulario de Google
- [ ] Enviar un mensaje privado → llega al panel (y al email, si está configurado)
- [ ] Abrir `/demo?n=Nombre` en tu celular para enseñarlo en la calle
- [ ] Compartir el link de la landing por WhatsApp → se ve la imagen de FiveTap
- [ ] Borrar el negocio de prueba (Supabase → Table editor) o marcarlo como *Cancelado*

---

## Grabar una placa NFC

App **NFC Tools** (gratis, iPhone/Android) → **Escribir** → **Añadir registro**
→ **URL** → pega el enlace de la placa (botón *Copiar* del panel) → **Escribir**
→ acerca la placa. Opcional: *Bloquear* para que nadie la reescriba (es irreversible).

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # SUPABASE_* y ADMIN_PASSWORD como mínimo
npm run dev                  # http://localhost:3000
npm run typecheck && npm run build
```

## Decisiones

- El dueño no entra a ningún panel: recibe los mensajes por email y tu reporte mensual.
- Todo acceso a datos pasa por el servidor con la `service_role`. Las tablas
  tienen RLS activado sin políticas: la clave pública no puede leer nada.
- El botón de Google se muestra siempre a todos (Google prohíbe filtrar reseñas).
- Los bots y las vistas previas de enlaces (WhatsApp, Instagram) no cuentan como toques.
- Máximo 5 emails por placa cada 10 minutos; el resto queda en el panel.
- Tipografía: Satoshi (Fontshare, licencia libre para uso comercial), servida desde el propio sitio.
