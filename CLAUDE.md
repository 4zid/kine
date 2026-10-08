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
    routes.ts                   # rutas públicas, safeNextPath (anti open-redirect: parsea, no compara prefijos)
supabase/migrations/            # SQL fuente de verdad del esquema
```

## Base de datos (resumen)

Tablas (todas con RLS `professional_id = auth.uid()`):
`professionals` (1:1 auth.users, creado por trigger desde `raw_user_meta_data`),
`patients`, `clinical_histories` (1:1, creada por trigger al crear paciente),
`treatment_sessions` (SOAP), `pain_records` (una fila = foto del dolor de una zona),
`patient_studies` (+ bucket privado `patient-files`, ruta `{professional_id}/{patient_id}/{uuid}-{archivo}`).
Vistas (security_invoker): `patient_pain_current` (último registro por zona), `patient_overview`
(incluye `last_activity_at`). `clinical_audit_log`: auditoría por trigger de UPDATE/DELETE clínicos
(solo lectura para el profesional; conserva lo borrado por custodia legal).
FKs compuestas `(patient_id, professional_id)` impiden mezclar datos entre profesionales.
`professional_id` tiene `default auth.uid()`: no hace falta enviarlo en inserts.

## Convenciones

- **Idioma**: UI en español rioplatense con voseo ("Agregá", "Ingresá", "Guardá"). Código e
  identificadores en inglés. Rutas en español.
- **Datos**: leer en Server Components con `createClient()` de `@/lib/supabase/server`.
  Mutar con Server Actions (`"use server"`) colocadas en `actions.ts` junto a la ruta; validar con zod;
  devolver `ActionState` (`@/lib/types`); llamar `revalidatePath`. Verificar la sesión en cada acción
  (la RLS protege igual, pero nunca confiar solo en el cliente). Nunca usar la service role key.
- **Errores**: una acción nunca lanza al cliente por algo esperable. Sesión vencida →
  `getActionContextOrNull()` + `return SESSION_EXPIRED_STATE` (`@/lib/auth`); error de la base →
  `ActionState` con mensaje amable. El cliente que llama acciones fuera de `<form action>` hace
  try/catch + `toast.error` (un rechazo llega al `error.tsx` y desmonta el formulario). El proxy no
  redirige los POST de Server Actions. En lecturas clínicas, un `error` de Supabase se lanza (lo atrapa
  el `error.tsx`), nunca se trata como "sin datos" (`getPatient`/`getClinicalHistory` ya lo hacen).
- **Fechas**: columnas `date` como `"YYYY-MM-DD"`; usar `todayISO()`, `formatDate()` ("8 oct 2026"),
  `formatTime()` ("09:30", 24 h), `formatDateTime()` ("8 oct, 09:30"), `parseDateOnly()` de
  `@/lib/utils` (zona America/Argentina/Buenos_Aires). No usar `new Date("YYYY-MM-DD")` directo.
  En componentes cliente, `formatRelativeDay(valor, today)` con `today` calculado en el servidor.
- **Reglas clínicas**:
  - Una sesión es la evolución de algo que **ya pasó**: `session_date ≤ todayISO()` (validar en el
    servidor). "Sesiones realizadas" = `attendance = 'attended'` y `session_date ≤ hoy`.
  - "Dolor actual" de una zona = su último `pain_records`; zona activa = `status ≠ 'resolved'` e
    `intensity > 0` (igual que `patient_overview.max_pain/active_regions`). Mostrarlo con su antigüedad
    ("actualizado hace 3 días"). La EVA de la sesión (`pain_before/pain_after`) es otra medida:
    rotular "Dolor por zona (mapa)" vs "EVA de la sesión".
  - % de mejoría: siempre `computeSessionStats` de `@/components/sessions/session-utils`.
  - "Recientes" se ordena por `patient_overview.last_activity_at`.
  - Escala de dolor: `PAIN_SCALE_NAME` ("EVA (0–10)") y `PAIN_SCALE_ANCHORS` de `@/lib/constants`.
- **Mapa corporal**: zonas en `@/lib/body-regions.ts`. Vista frente: el lado derecho del paciente se
  dibuja a la izquierda del observador; vista espalda: a la derecha.
- **UI**: usar el kit de `@/components/ui/*` antes de crear estilos nuevos:
  `Button`/`ButtonLink` (variantes primary negro, secondary, soft, ghost, brand, accent, danger),
  `Card`/`Panel`/`CardHeader`/`SectionLabel`, `Field`/`Input`/`Textarea`/`Select`/`BigInput`,
  `Chip`/`ChipGroup`, `SegmentedControl`, `ScaleBar` (0–10, `tone="pain"`), `Badge`/`PainBadge`,
  `Avatar`, `Dialog`/`ConfirmDialog`, `EmptyState`, `PageHeader`, `TabsNav`, `SubmitButton`,
  `DecorCircles`, `Logo`. Toasts con `toast` de `sonner`.
  - `Field` con `htmlFor` asocia solo la ayuda/error al control cuyo `id === htmlFor` (aria-describedby
    + aria-invalid); controles propios pueden usar `fieldDescriptionIds(htmlFor)`.
  - `Dialog`: nombre accesible desde `title`/`description` (o `aria-label`), botón Cerrar siempre
    visible (`showClose`), foco inicial con `autoFocus` o `data-autofocus`, devuelve el foco al cerrar.
  - `ScaleBar`/`SegmentedControl` son radiogroups con flechas/Inicio/Fin (un solo tab stop).
  - `PainBadge`: `context` ("por zona (mapa)", "de la sesión") y `updatedLabel` para el texto accesible.
  - `EmptyState`: `headingAs` (h1 en un error.tsx, h2 bajo el h1 de la página) y `role="alert"`.
  - `TabsNav`: `shortLabel` opcional por pestaña (< sm); la activa siempre queda a la vista.
- **Estética** (referencia "daily"): lienzo `bg-canvas`, tarjetas `bg-surface rounded-card` (28px),
  paneles internos `bg-surface-2 rounded-panel`, títulos `display` (Inter Tight, tracking apretado),
  CTA negro en píldora, chips con punto de color, tarjeta resumen azul `bg-accent` con `DecorCircles`,
  paneles oscuros verde/azul con círculos de línea fina. Usar los tokens de color del tema, no hex sueltos
  (salvo escalas de datos como `painColor`). Responsive desde 360px.
- **Accesibilidad** (WCAG 2.2 AA): controles con `aria-*`, foco visible, objetivos táctiles ≥ 40px
  (utilidad `hit-area` para ampliar el área sin cambiar el tamaño visual), inputs de 16px en mobile.
  `text-muted` y `text-subtle` ya cumplen 4.5:1 sobre todas las superficies claras; los estados
  (`text-danger`/`warning`/`success`) también sobre su fondo `-50`. En superficies oscuras marcar el
  contenedor con `data-surface="dark"` (o `focus-visible:outline-white`) para que el foco se vea.
  Scroll suave solo con `scrollBehavior()` de `@/lib/utils` (respeta `prefers-reduced-motion`).
- **Copy**: estados "En tratamiento" / "Alta" / "Archivado"; secciones "Sesión", "Paciente",
  "Historia clínica", "Mapa corporal", "Estudios", "Informe". Placeholders neutros ("Ej.: …"), nunca
  datos que parezcan reales.
