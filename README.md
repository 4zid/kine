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
cp .env.example .env.local   # completar con los datos del proyecto Supabase
npm install
npm run dev                  # http://localhost:3000
```

Antes de commitear: `npm run typecheck && npm run lint`.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) o anon key |
| `NEXT_PUBLIC_SITE_URL` | (Opcional) URL pública; si falta se usa el host de cada request |

## Base de datos

El esquema vive en `supabase/migrations/`. Todas las tablas clínicas tienen RLS
(`professional_id = auth.uid()`) y claves foráneas compuestas que impiden mezclar datos entre
profesionales. Los archivos se guardan en el bucket privado `patient-files` bajo
`{professional_id}/{patient_id}/…`, también protegido por políticas.

Después de cambiar el esquema, regenerá los tipos en `src/lib/database.types.ts`.

## Configuración de Supabase Auth (obligatoria para producción)

En el dashboard de Supabase → **Authentication**:

1. **URL Configuration**
   - *Site URL*: la URL de producción (p. ej. `https://kine-kappa.vercel.app` o tu dominio).
   - *Redirect URLs*: agregar `https://kine-kappa.vercel.app/**`, `https://*-kalada.vercel.app/**`
     (previews) y `http://localhost:3000/**`.
2. **SMTP propio** (*Authentication → Emails → SMTP Settings*): el servidor de email incluido en
   Supabase solo envía a miembros del equipo y con un límite muy bajo, así que **los
   kinesiólogos no recibirían el email de confirmación**. Configurá un proveedor (Resend, Postmark,
   SES…) con un remitente de tu dominio.
3. (Opcional) Personalizá las plantillas de email en español.

## Deploy

Cada push a la rama de producción del repo despliega automáticamente en Vercel.
La región de las funciones está fijada en `vercel.json` (`gru1`).
