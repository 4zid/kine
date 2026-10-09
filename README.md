# kine

Plataforma de registro clínico para kinesiólogos: pacientes, historia clínica completa,
**mapa corporal interactivo del dolor**, sesiones con evolución SOAP, estudios adjuntos e
informes imprimibles. Cada profesional ve y gestiona únicamente a sus pacientes.

- **Frontend / backend**: Next.js 16 (App Router, Server Actions) + Tailwind CSS v4
- **Base de datos, auth y archivos**: Supabase (Postgres con Row Level Security, Auth, Storage)
- **Hosting**: Vercel (región `gru1`, São Paulo — misma región que la base)

## Funcionalidades

| Área | Qué incluye |
| --- | --- |
| Onboarding y registro | Tour de bienvenida en 5 pasos, alta del kinesiólogo con datos profesionales (matrícula MN/MP, especialidades, consultorio), login, recuperación de contraseña, verificación de email |
| Inicio | Semana actual, sesiones del día, resumen (pacientes en tratamiento, sesiones, EVA promedio), asistencia, pacientes que requieren atención, primeros pasos |
| Pacientes | Listado con búsqueda y filtros, alta/edición, alta médica, archivo y eliminación definitiva |
| Historia clínica | Antecedentes, alertas y contraindicaciones, hábitos, examen físico y signos vitales, goniometría, fuerza (Daniels), pruebas especiales, escalas funcionales, objetivos y plan |
| Mapa corporal | Figura frente/espalda por zonas, intensidad EVA 0–10, tipo y frecuencia del dolor, historial por zona, línea de tiempo de evolución |
| Sesiones | Evolución SOAP, técnicas aplicadas, dolor al inicio y al final, asistencia, gráfico de evolución |
| Estudios | Radiografías, resonancias, informes, etc. con archivos en Storage privado |
| Informe | Informe kinésico imprimible / PDF |

## Desarrollo local

```bash
cp .env.example .env.local   # completar con el proyecto Supabase de staging (no el de producción)
npm install
npm run dev                  # http://localhost:3000
```

Antes de commitear: `npm run typecheck && npm run lint`.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (distinto en Production y en Preview/Development) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) o anon key del mismo proyecto |
| `NEXT_PUBLIC_SITE_URL` | (Opcional) URL pública; si falta se usa el host de cada request |

## Base de datos

El esquema vive en `supabase/migrations/`. Todas las tablas clínicas tienen RLS
(`professional_id = auth.uid()`) y claves foráneas compuestas que impiden mezclar datos entre
profesionales. Los archivos se guardan en el bucket privado `patient-files` bajo
`{professional_id}/{patient_id}/…`, también protegido por políticas.

Los cambios y borrados de datos clínicos quedan registrados por trigger en `clinical_audit_log`
(custodia de la historia clínica, Ley 26.529): aunque se elimine un paciente de la app, se conserva
el registro de lo borrado.

Después de cambiar el esquema, regenerá los tipos en `src/lib/database.types.ts`.

## Configuración de Supabase Auth (obligatoria para producción)

La base de producción tiene **datos reales de pacientes**. Supabase usa la lista de *Redirect URLs*
como único control de a dónde envía los códigos y tokens de login, confirmación y recuperación:
cualquier host que entre en esa lista puede recibirlos. Por eso, en el proyecto de producción:

### 1. URL Configuration (*Authentication → URL Configuration*)

- **Site URL**: la URL de producción, p. ej. `https://kine-kappa.vercel.app` (o el dominio propio).
- **Redirect URLs**: **solo orígenes exactos de producción**:
  - `https://kine-kappa.vercel.app/**`
  - `https://<dominio-propio>/**` (si hay dominio propio)
- **No** agregar comodines de equipo como `https://*-kalada.vercel.app/**`: en los globs de Supabase
  `*` acepta cualquier texto sin `.` ni `/`, así que cualquier host `<algo>-kalada.vercel.app` (que
  cualquiera podría registrar) recibiría los códigos y podría tomar cuentas.
- **No** agregar `http://localhost:3000/**` en producción.

### 2. Previews y desarrollo local: otro proyecto de Supabase

Las previews de Vercel y el desarrollo local deben usar un **proyecto de Supabase separado**
(staging, sin datos reales), con sus propias Redirect URLs (ahí sí `http://localhost:3000/**` y,
si hace falta, la URL exacta de cada preview, p. ej. `https://kine-git-<rama>-kalada.vercel.app/**`).

En Vercel → *Settings → Environment Variables*, definí `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` **por entorno**: *Production* → proyecto de producción;
*Preview* y *Development* → staging. Importante: `src/lib/supabase/config.ts` usa el proyecto de
producción como valor por defecto si faltan las variables, así que una preview sin variables
apuntaría a la base real.

### 3. Plantillas de email con `token_hash` (*Authentication → Emails → Templates*)

Obligatorio para que los links funcionen aunque se abran en **otro navegador o dispositivo** (p. ej.
el pedido se hizo en la PC del consultorio y el email se abre en el celular, o Gmail lo abre en su
navegador interno). El flujo por defecto (PKCE, `/auth/callback`) necesita la cookie del navegador
que hizo el pedido; `/auth/confirm` verifica el `token_hash` y no depende de eso.

| Plantilla | Link del botón |
| --- | --- |
| Confirm signup | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` |
| Reset password | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/restablecer` |
| Change email address | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change` |

Escribí los textos en español rioplatense (p. ej. "Confirmá tu cuenta", "Restablecé tu contraseña").
`/auth/callback` queda como respaldo para los links con `code` que ya se hayan enviado.

### 4. SMTP propio (*Authentication → Emails → SMTP Settings*)

El servidor de email incluido en Supabase solo envía a miembros del equipo y con un límite muy bajo,
así que **los kinesiólogos no recibirían el email de confirmación**. Configurá un proveedor (Resend,
Postmark, SES…) con un remitente de tu dominio (SPF/DKIM configurados).

### 5. Contraseñas y sesiones

- *Authentication → Providers → Email*: activá **Leaked password protection** (rechaza contraseñas
  filtradas, HaveIBeenPwned) y una longitud mínima de al menos **8** caracteres (la que pide el
  formulario). Dejá activado *Secure email change*.
- *Authentication → Sessions* (plan Pro): configurá **Inactivity timeout** (p. ej. 12 h) y, si se
  quiere, **Time-box** (p. ej. 7 días). La app ya escribe las cookies de sesión con `Secure`,
  `SameSite=Lax` y una ventana de inactividad de 12 h (`AUTH_COOKIE_MAX_AGE` en
  `src/lib/supabase/config.ts`): en una PC compartida, la sesión no sobrevive de un día para el otro.

### 6. Cabeceras de seguridad

`next.config.ts` envía en todas las rutas `frame-ancestors 'none'` / `X-Frame-Options: DENY`
(nadie puede embeber la app), `nosniff`, `Referrer-Policy`, `Permissions-Policy` y HSTS.

## Deploy

Cada push a la rama de producción del repo despliega automáticamente en Vercel.
La región de las funciones está fijada en `vercel.json` (`gru1`).
