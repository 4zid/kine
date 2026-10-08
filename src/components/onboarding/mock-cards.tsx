import {
  Activity,
  AlertTriangle,
  Check,
  ClipboardList,
  HeartPulse,
  MapPin,
  NotebookPen,
  Plus,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, PainBadge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { SegmentedControl } from "@/components/ui/segmented";
import { DecorCircles } from "@/components/ui/decor";
import { BodySilhouette } from "@/components/onboarding/body-silhouette";
import { fillMotion, growMotion } from "@/components/onboarding/motion";
import { cn, painColor } from "@/lib/utils";

/*
 * Tarjetas de interfaz "de mentira" (datos estáticos de ejemplo) para ilustrar
 * el onboarding y las pantallas de acceso. Son decorativas: el contenedor que las
 * usa debe marcarse `inert` / `aria-hidden`.
 */

type MockProps = { className?: string; style?: CSSProperties };

export function MockCard({ className, style, children }: MockProps & { children: ReactNode }) {
  return (
    <div className={cn("rounded-[22px] bg-surface p-5 text-ink shadow-float", className)} style={style}>
      {children}
    </div>
  );
}

function MockTitle({ icon, children, aside }: { icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-[15px] text-ink-2 [&_svg]:size-[18px] [&_svg]:text-muted">
        {icon}
        {children}
      </p>
      {aside}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paso 1 · Bienvenida
// ---------------------------------------------------------------------------
const WEEK = [
  { d: "L", n: 5, sessions: 4 },
  { d: "M", n: 6, sessions: 6 },
  { d: "M", n: 7, sessions: 3 },
  { d: "J", n: 8, sessions: 5, today: true },
  { d: "V", n: 9, sessions: 0 },
  { d: "S", n: 10, sessions: 0 },
  { d: "D", n: 11, sessions: 0 },
];

export function WeekMockCard(props: MockProps) {
  return (
    <MockCard {...props}>
      <MockTitle>Esta semana</MockTitle>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK.map((day) => (
          <div
            key={day.n}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl py-2.5",
              day.today ? "bg-ink text-white" : "bg-surface-2 text-ink",
            )}
          >
            <span className={cn("text-[11px]", day.today ? "text-white/70" : "text-muted")}>{day.d}</span>
            <span className="display text-[22px] leading-none">{day.n}</span>
            <span
              className={cn(
                "size-1.5 rounded-full",
                day.sessions > 0 ? "bg-brand-500" : day.today ? "bg-white/40" : "bg-line-strong",
              )}
            />
          </div>
        ))}
      </div>
    </MockCard>
  );
}

const PATIENTS = [
  { id: "p1", first_name: "Lucía", last_name: "Fernández", detail: "Lumbalgia · Sesión 6", start: 7, now: 3 },
  { id: "p7", first_name: "Tomás", last_name: "Medina", detail: "Esguince · Sesión 3", start: 6, now: 4 },
];

export function PatientRowsMockCard({ className, style, rows = PATIENTS }: MockProps & { rows?: typeof PATIENTS }) {
  return (
    <MockCard className={cn("px-3 py-2", className)} style={style}>
      <ul className="divide-y divide-line">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-2 py-3">
            <Avatar person={p} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">
                {p.first_name} {p.last_name}
              </p>
              <p className="truncate text-[13px] text-muted">{p.detail}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge dot="var(--color-orange)" className="h-8 gap-1.5 px-3">
                <span className="text-muted">Inicio</span>
                <span className="tabular font-semibold text-ink">{p.start}</span>
              </Badge>
              <Badge dot="var(--color-blue)" className="h-8 gap-1.5 px-3">
                <span className="text-muted">Hoy</span>
                <span className="tabular font-semibold text-ink">{p.now}</span>
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </MockCard>
  );
}

/** Tarjeta azul de resumen (como "Resumen · Placer 7,4 / Control 6,8"). */
export function PainSummaryMockCard({
  className,
  style,
  label = "Resumen",
  from = "6,2",
  to = "3,1",
  fromLabel = "EVA inicial",
  toLabel = "EVA actual",
  footnote = "Promedio de 12 pacientes activos",
}: MockProps & { label?: string; from?: string; to?: string; fromLabel?: string; toLabel?: string; footnote?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[22px] bg-accent p-6 text-white shadow-float", className)} style={style}>
      <DecorCircles variant="b" className="text-white/40" />
      <div className="relative">
        <span className="inline-flex h-8 items-center rounded-full px-3.5 text-[13px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.55)]">
          {label}
        </span>
        <div className="mt-6 flex items-end gap-8">
          <div>
            <p className="text-[13px] text-white/75">{fromLabel}</p>
            <p className="display tabular mt-1 text-[46px] leading-none font-light">
              {from}
              <span className="ml-0.5 text-base font-normal text-white/70">/10</span>
            </p>
          </div>
          <div>
            <p className="text-[13px] text-white/75">{toLabel}</p>
            <p className="display tabular mt-1 text-[46px] leading-none font-light">
              {to}
              <span className="ml-0.5 text-base font-normal text-white/70">/10</span>
            </p>
          </div>
        </div>
        <p className="mt-4 text-[13px] text-white/80">{footnote}</p>
      </div>
    </div>
  );
}

/** Píldora blanca flotante (como "Contale tu día"). */
export function FloatingPill({ icon, children, className, style }: MockProps & { icon?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex h-14 items-center gap-2.5 rounded-full bg-surface pr-6 pl-5 text-[15px] font-medium whitespace-nowrap text-ink shadow-float [&_svg]:size-5",
        className,
      )}
      style={style}
    >
      {icon}
      {children}
    </div>
  );
}

export function NewPatientPill(props: MockProps) {
  return (
    <FloatingPill {...props} icon={<Plus strokeWidth={2} />}>
      Nuevo paciente
    </FloatingPill>
  );
}

// ---------------------------------------------------------------------------
// Paso 2 · Historia clínica
// ---------------------------------------------------------------------------
export function AnamnesisMockCard(props: MockProps) {
  return (
    <MockCard {...props}>
      <div className="flex items-center gap-3">
        <Avatar person={{ id: "p1", first_name: "Lucía", last_name: "Fernández" }} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">Lucía Fernández</p>
          <p className="text-[13px] text-muted">34 años · Docente · OSDE</p>
        </div>
        <Badge tone="outline" className="text-[12px]">
          <ClipboardList className="size-3.5" />
          Anamnesis
        </Badge>
      </div>

      <p className="mt-5 mb-2 text-[11px] font-medium tracking-[0.14em] text-subtle uppercase">Antecedentes</p>
      <div className="flex flex-wrap gap-1.5">
        <Chip size="sm" dot="var(--color-blue)">
          Hipertensión
        </Chip>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-danger-50 px-3 text-[13px] font-medium text-danger">
          <AlertTriangle className="size-3.5" strokeWidth={2.2} />
          Marcapasos
        </span>
        <Chip size="sm" dot="var(--color-yellow)">
          Hernia de disco
        </Chip>
        <Chip size="sm" dot="var(--color-green)">
          Asma / EPOC
        </Chip>
      </div>

      <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3">
        <p className="text-[12px] text-muted">Motivo de consulta</p>
        <p className="mt-0.5 text-[14px] leading-snug text-ink-2">
          Dolor lumbar irradiado a pierna derecha desde hace 3 semanas.
        </p>
      </div>
    </MockCard>
  );
}

const VITALS = [
  { label: "Presión", value: "120/80", unit: "" },
  { label: "FC", value: "72", unit: "lpm" },
  { label: "SpO₂", value: "98", unit: "%" },
  { label: "IMC", value: "22,1", unit: "" },
];

export function VitalsMockCard(props: MockProps) {
  return (
    <MockCard {...props}>
      <MockTitle icon={<HeartPulse />}>Signos vitales</MockTitle>
      <div className="grid grid-cols-2 gap-2">
        {VITALS.map((v) => (
          <div key={v.label} className="rounded-2xl bg-surface-2 px-3.5 py-3">
            <p className="text-[12px] text-muted">
              {v.label}
              {v.unit ? <span className="text-subtle"> · {v.unit}</span> : null}
            </p>
            <p className="display tabular mt-1 text-[21px] leading-none whitespace-nowrap">{v.value}</p>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

export function GoniometryMockCard(props: MockProps) {
  const rows = [
    { movement: "Flexión", value: 95, max: 135, delay: 500 },
    { movement: "Extensión", value: -5, max: 0, delay: 650, display: "−5°" },
    { movement: "Rotación int.", value: 30, max: 40, delay: 800 },
  ];
  return (
    <MockCard {...props}>
      <MockTitle icon={<Ruler />} aside={<Badge className="text-[12px]">Rodilla der.</Badge>}>
        Goniometría
      </MockTitle>
      <div className="space-y-3">
        {rows.map((r) => {
          const pct = r.max === 0 ? 92 : Math.round((r.value / r.max) * 100);
          return (
            <div key={r.movement} className="grid grid-cols-[96px_1fr_auto] items-center gap-3">
              <span className="text-[13px] text-ink-2">{r.movement}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-3">
                <span className="block h-full rounded-full bg-ink" style={{ width: `${pct}%`, ...fillMotion(r.delay) }} />
              </span>
              <span className="tabular text-[13px] text-muted">
                <span className="font-semibold text-ink">{r.display ?? `${r.value}°`}</span> / {r.max}°
              </span>
            </div>
          );
        })}
      </div>
    </MockCard>
  );
}

export function AlertPill(props: MockProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-ink py-2.5 pr-4 pl-3 text-[13px] font-medium whitespace-nowrap text-white shadow-float",
        props.className,
      )}
      style={props.style}
    >
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-danger">
        <AlertTriangle className="size-3.5" strokeWidth={2.4} />
      </span>
      Evitá electroterapia
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paso 3 · Mapa corporal
// ---------------------------------------------------------------------------
export const BODY_DOTS = [
  { x: 117, y: 214, intensity: 7, label: "Lumbar derecha" },
  { x: 80, y: 92, intensity: 4, label: "Trapecio izquierdo" },
  { x: 123, y: 362, intensity: 2, label: "Gemelo derecho" },
];

export function BodyMapMockCard(props: MockProps) {
  return (
    <MockCard {...props} className={cn("flex flex-col items-center px-5 pt-5 pb-4", props.className)}>
      <SegmentedControl
        size="sm"
        aria-label="Vista"
        value="back"
        options={[
          { value: "front", label: "Frente" },
          { value: "back", label: "Espalda" },
        ]}
      />
      <div className="relative mt-3 h-[350px]">
        <BodySilhouette view="back" dots={BODY_DOTS} activeIndex={0} />
        <span className="absolute top-1 left-0 text-[11px] text-subtle">Izq.</span>
        <span className="absolute top-1 right-0 text-[11px] text-subtle">Der.</span>
      </div>
      <div className="mt-2 flex w-full items-center justify-between rounded-full bg-surface-2 px-3.5 py-2 text-[12px] text-muted">
        <span>3 zonas registradas</span>
        <span className="flex items-center gap-1">
          {[2, 4, 7].map((i) => (
            <span key={i} className="size-2 rounded-full" style={{ backgroundColor: painColor(i) }} />
          ))}
        </span>
      </div>
    </MockCard>
  );
}

export function PainPopoverMockCard(props: MockProps) {
  return (
    <MockCard {...props}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-muted">Zona</p>
          <p className="display text-[22px] leading-tight">Lumbar derecha</p>
        </div>
        <PainBadge intensity={7} size="lg" />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Chip size="sm" selected dot="var(--color-red)">
          Punzante
        </Chip>
        <Chip size="sm" dot="var(--color-orange)">
          Al movimiento
        </Chip>
      </div>
      <div className="mt-4 rounded-2xl bg-surface-2 px-3.5 pt-3 pb-2.5">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-medium">EVA</p>
          <p className="tabular text-[13px] text-muted">
            <span className="display text-lg font-medium text-ink">7</span>/10 · Intenso
          </p>
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((step) => (
            <span
              key={step}
              className="h-2 flex-1 rounded-full"
              style={{ backgroundColor: step <= 7 ? painColor(step) : "var(--color-line-strong)" }}
            />
          ))}
        </div>
      </div>
    </MockCard>
  );
}

// ---------------------------------------------------------------------------
// Paso 4 · Sesiones
// ---------------------------------------------------------------------------
const SOAP = [
  { k: "S", text: "Refiere menos dolor al levantarse." },
  { k: "O", text: "Flexión lumbar 70° (+15°)." },
  { k: "A", text: "Buena evolución, sin irradiación." },
  { k: "P", text: "Progresar carga de core." },
];

export function SoapMockCard(props: MockProps) {
  return (
    <MockCard {...props}>
      <MockTitle icon={<NotebookPen />} aside={<span className="text-[12px] text-subtle">8 oct</span>}>
        Sesión 7
      </MockTitle>
      <ul className="space-y-2.5">
        {SOAP.map((row) => (
          <li key={row.k} className="flex items-start gap-3">
            <span className="display inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold">
              {row.k}
            </span>
            <span className="pt-1 text-[14px] leading-snug text-ink-2">{row.text}</span>
          </li>
        ))}
      </ul>
    </MockCard>
  );
}

const SESSIONS_PAIN = [
  { before: 8, after: 6 },
  { before: 7, after: 6 },
  { before: 7, after: 5 },
  { before: 6, after: 4 },
  { before: 5, after: 4 },
  { before: 5, after: 3 },
  { before: 4, after: 2 },
];

export function PainChartMockCard(props: MockProps) {
  return (
    <MockCard {...props} className={cn("px-6 pt-5 pb-4", props.className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[15px] text-ink-2">Dolor antes y después</p>
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-orange" />
            Antes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue" />
            Después
          </span>
        </div>
      </div>
      <div className="flex h-[150px] items-end justify-between gap-2">
        {SESSIONS_PAIN.map((s, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-[124px] items-end gap-1">
              <span
                className="w-3.5 rounded-full bg-orange"
                style={{ height: `${s.before * 12}px`, ...growMotion(350 + i * 70) }}
              />
              <span
                className="w-3.5 rounded-full bg-blue"
                style={{ height: `${s.after * 12}px`, ...growMotion(420 + i * 70) }}
              />
            </div>
            <span className="text-[12px] text-muted">S{i + 1}</span>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

export function ProgressPill(props: MockProps) {
  return (
    <FloatingPill {...props} icon={<Activity strokeWidth={2} className="text-accent" />}>
      −4 puntos de EVA
    </FloatingPill>
  );
}

// ---------------------------------------------------------------------------
// Paso 5 · Empezá
// ---------------------------------------------------------------------------
export function ProfileMockCard(props: MockProps) {
  return (
    <MockCard {...props}>
      <div className="flex items-center gap-3.5">
        <Avatar person={{ id: "pro", first_name: "Martina", last_name: "Ruiz" }} size="lg" />
        <div className="min-w-0">
          <p className="display text-[22px] leading-tight">Lic. Martina Ruiz</p>
          <p className="text-[13px] text-muted">Kinesióloga · MN 12.345</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Chip size="sm" dot="var(--color-blue)">
          Deportiva
        </Chip>
        <Chip size="sm" dot="var(--color-orange)">
          Terapia manual
        </Chip>
        <Chip size="sm" dot="var(--color-green)">
          RPG
        </Chip>
      </div>
      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-2 px-3.5 py-3 text-[13px] text-ink-2">
        <MapPin className="size-4 text-muted" />
        Consultorio Palermo · CABA
      </p>
    </MockCard>
  );
}

const CHECKLIST = [
  { label: "Creá tu cuenta", done: true },
  { label: "Completá tus datos profesionales", done: true },
  { label: "Agregá tu primer paciente", done: false },
];

export function ChecklistMockCard(props: MockProps) {
  return (
    <MockCard {...props}>
      <MockTitle aside={<span className="tabular text-[13px] font-medium text-ink">2/3</span>}>Primeros pasos</MockTitle>
      <div className="mb-4 flex gap-1.5">
        {CHECKLIST.map((c, i) => (
          <span key={c.label} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            {c.done ? <span className="block h-full rounded-full bg-brand-500" style={fillMotion(500 + i * 150)} /> : null}
          </span>
        ))}
      </div>
      <ul className="space-y-2">
        {CHECKLIST.map((c) => (
          <li key={c.label} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[14px]">
            <span
              className={cn(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                c.done ? "bg-brand-500 text-white" : "shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]",
              )}
            >
              {c.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
            </span>
            <span className={c.done ? "text-muted line-through decoration-line-strong" : "font-medium text-ink"}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </MockCard>
  );
}

export function PrivacyPill(props: MockProps) {
  return (
    <FloatingPill {...props} icon={<ShieldCheck strokeWidth={1.8} className="text-brand-500" />}>
      Solo vos ves a tus pacientes
    </FloatingPill>
  );
}
