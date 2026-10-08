# kine — guía del proyecto

Plataforma para kinesiólogos: registro de pacientes, historia clínica completa,
mapa corporal interactivo del dolor, sesiones (evolución SOAP), estudios adjuntos
e informes imprimibles. Cada kinesiólogo gestiona solo sus pacientes.

Ver también `AGENTS.md` (reglas de Next.js generadas por `next dev`).

## Stack

- **Next.js 16.4** (App Router, Turbopack, React 19.3) — versión más nueva que la
  mayoría de los datos de entrenamiento. Docs locales en `node_modules/next/dist/docs/`.
- **Supabase** (Postgres + Auth + Storage) vía `@supabase/ssr` 0.12. Proyecto: `kine` (`qniolsvnhxrzwzfqwnxd`, sa-east-1).
- **Tailwind CSS v4** (tokens en `src/app/globals.css`, loader `@tailwindcss/turbopack`, sin postcss).
- `lucide-react` (íconos), `zod` v4 (validación), `sonner` (toasts), `clsx` + `tailwind-merge` (`cn`).
- Deploy en **Vercel** (team `kalada`).

## Comandos

```bash
npm run dev         # desarrollo
npm run typecheck   # next typegen && tsc --noEmit  (correr antes de commitear)
npm run lint        # eslint (next lint ya no existe)
npm run build       # build de producción
```

## Next.js 16.4 — lo que cambia

- `middleware.ts` → **`src/proxy.ts`** (`export async function proxy(req)`, siempre Node.js).
- `cookies()`, `headers()`, `params`, `searchParams` son **Promises** (`await`).
- Tipos globales generados: `PageProps<"/pacientes/[id]">`, `LayoutProps<"/">` (las claves son
  rutas URL **sin** route groups). Requieren `next typegen` (incluido en `npm run typecheck`).
- `cacheComponents` y `partialPrefetching` están **desactivados** a propósito (app 100% dinámica
  por usuario). No usar `"use cache"`, `cacheTag`, `instant`.
- Mutaciones: Server Actions + `revalidatePath(...)` y/o `redirect(...)` (redirect fuera de try/catch).
  `revalidateTag` exige 2.º argumento. `refresh()` (de `next/cache`) solo re-renderiza la pantalla.
- `useActionState` (react) → `[state, formAction, isPending]`; `useFormStatus` (react-dom) en un hijo del form.
- `error.tsx` recibe `{ error, retry }` (preferir `retry()` sobre `reset()`).
- Server Actions: límite de body 2 MB (configurado). Los archivos van directo a Storage desde el cliente.

## Arquitectura

```
src/
  proxy.ts                      # refresco de sesión + protección de rutas
  app/
    (auth)/                     # bienvenida (onboarding), registro, ingresar, recuperar, verificar, restablecer
    auth/confirm|callback/      # route handlers de verificación de email / PKCE
    (app)/                      # zona privada con AppShell (sidebar)
      inicio/                   # dashboard
      pacientes/                # listado, nuevo, [id]/(resumen|historia|mapa|sesiones|estudios|informe|editar)
      ajustes/                  # perfil del profesional
  components/
    ui/                         # kit de UI compartido (ver abajo)
    shell/                      # AppShell, Sidebar, MobileNav
    <feature>/                  # componentes por funcionalidad
  lib/
    supabase/{server,client,proxy}.ts
    auth.ts                     # getClaims, requireUserId, requireProfessional, getActionContext
    database.types.ts           # tipos generados de Supabase (regenerar tras migraciones)
    types.ts                    # alias de filas, uniones de valores, ActionState
    constants.ts                # opciones/etiquetas compartidas (especialidades, técnicas, tipos de dolor…)
    body-regions.ts             # catálogo de zonas del mapa corporal (slugs que se guardan en la DB)
    utils.ts                    # cn, fechas es-AR, edad, colores de dolor, helpers de FormData
    routes.ts                   # rutas públicas, safeNextPath (anti open-redirect)
supabase/migrations/            # SQL fuente de verdad del esquema
```

## Base de datos (resumen)

Tablas (todas con RLS `professional_id = auth.uid()`):
`professionals` (1:1 auth.users, creado por trigger desde `raw_user_meta_data`),
`patients`, `clinical_histories` (1:1, creada por trigger al crear paciente),
`treatment_sessions` (SOAP), `pain_records` (una fila = foto del dolor de una zona),
`patient_studies` (+ bucket privado `patient-files`, ruta `{professional_id}/{patient_id}/{uuid}-{archivo}`).
Vistas (security_invoker): `patient_pain_current` (último registro por zona), `patient_overview`.
FKs compuestas `(patient_id, professional_id)` impiden mezclar datos entre profesionales.
`professional_id` tiene `default auth.uid()`: no hace falta enviarlo en inserts.

## Convenciones

- **Idioma**: UI en español rioplatense con voseo ("Agregá", "Ingresá", "Guardá"). Código e
  identificadores en inglés. Rutas en español.
- **Datos**: leer en Server Components con `createClient()` de `@/lib/supabase/server`.
  Mutar con Server Actions (`"use server"`) colocadas en `actions.ts` junto a la ruta; validar con zod;
  devolver `ActionState` (`@/lib/types`); llamar `revalidatePath`. Usar `getActionContext()` en cada
  acción (la RLS protege igual, pero nunca confiar solo en el cliente). Nunca usar la service role key.
- **Fechas**: columnas `date` como `"YYYY-MM-DD"`; usar `todayISO()`, `formatDate()`, `parseDateOnly()`
  de `@/lib/utils` (zona America/Argentina/Buenos_Aires). No usar `new Date("YYYY-MM-DD")` directo.
- **Mapa corporal**: zonas en `@/lib/body-regions.ts`. Vista frente: el lado derecho del paciente se
  dibuja a la izquierda del observador; vista espalda: a la derecha.
- **UI**: usar el kit de `@/components/ui/*` antes de crear estilos nuevos:
  `Button`/`ButtonLink` (variantes primary negro, secondary, soft, ghost, brand, accent, danger),
  `Card`/`Panel`/`CardHeader`/`SectionLabel`, `Field`/`Input`/`Textarea`/`Select`/`BigInput`,
  `Chip`/`ChipGroup`, `SegmentedControl`, `ScaleBar` (0–10, `tone="pain"`), `Badge`/`PainBadge`,
  `Avatar`, `Dialog`/`ConfirmDialog`, `EmptyState`, `PageHeader`, `TabsNav`, `SubmitButton`,
  `DecorCircles`, `Logo`. Toasts con `toast` de `sonner`.
- **Estética** (referencia "daily"): lienzo `bg-canvas`, tarjetas `bg-surface rounded-card` (28px),
  paneles internos `bg-surface-2 rounded-panel`, títulos `display` (Inter Tight, tracking apretado),
  CTA negro en píldora, chips con punto de color, tarjeta resumen azul `bg-accent` con `DecorCircles`,
  paneles oscuros verde/azul con círculos de línea fina. Usar los tokens de color del tema, no hex sueltos
  (salvo escalas de datos como `painColor`). Responsive desde 360px.
- **Accesibilidad**: controles con `aria-*`, foco visible, objetivos táctiles ≥ 40px.
