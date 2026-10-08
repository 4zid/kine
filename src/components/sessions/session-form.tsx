"use client";

import { ArrowRight, ChevronDown, Copy, History } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Textarea } from "@/components/ui/field";
import { ScaleBar } from "@/components/ui/scale";
import { SegmentedControl } from "@/components/ui/segmented";
import { SubmitButton } from "@/components/ui/submit-button";
import { ATTENDANCE, SESSION_DURATIONS } from "@/lib/constants";
import { initialActionState, type ActionState, type Attendance } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TimeSelect } from "@/components/sessions/time-select";
import { WeekStrip } from "@/components/sessions/week-strip";
import {
  DURATION_MAX,
  DURATION_MIN,
  durationLabel,
  endTime,
  longDate,
  PAIN_SERIES,
  SESSION_TEXT_MAX,
  shortDate,
  TECHNIQUE_OPTIONS,
  type SessionFormValues,
  type SessionTextField,
} from "@/components/sessions/session-utils";

export type SessionFormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export type PreviousSessionHint = {
  date: string;
  painAfter: number | null;
  plan: string | null;
  techniques: string[];
};

const POPULAR_TECHNIQUES = 12;

const ATTENDANCE_OPTIONS = (Object.keys(ATTENDANCE) as Attendance[]).map((value) => ({
  value,
  label: ATTENDANCE[value].label,
  icon: <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: ATTENDANCE[value].color }} />,
}));

const SOAP_FIELDS: { key: SessionTextField; letter: string; label: string; placeholder: string }[] = [
  {
    key: "subjective",
    letter: "S",
    label: "Subjetivo",
    placeholder: "¿Qué refiere el paciente? Dolor, sueño, actividades, cómo llegó…",
  },
  {
    key: "objective",
    letter: "O",
    label: "Objetivo",
    placeholder: "Hallazgos de la evaluación: rango de movimiento, fuerza, pruebas, palpación…",
  },
  {
    key: "assessment",
    letter: "A",
    label: "Análisis",
    placeholder: "Tu interpretación: respuesta al tratamiento, evolución respecto de los objetivos…",
  },
  {
    key: "plan",
    letter: "P",
    label: "Plan",
    placeholder: "Próximos pasos: progresión, cambios de técnica, frecuencia…",
  },
];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] text-danger">
      {message}
    </p>
  );
}

function SectionTitle({ children, hint, htmlFor }: { children: ReactNode; hint?: ReactNode; htmlFor?: string }) {
  const Tag = htmlFor ? "label" : "p";
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <Tag htmlFor={htmlFor} className="text-[15px] text-muted">
        {children}
      </Tag>
      {hint ? <span className="text-[13px] text-subtle">{hint}</span> : null}
    </div>
  );
}

/** Textarea grande con contador cuando se acerca al límite. */
function LongText({
  id,
  name,
  value,
  onChange,
  placeholder,
  error,
  rows = 4,
  label,
  letter,
}: {
  id: string;
  name: SessionTextField;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  rows?: number;
  label: string;
  letter?: string;
}) {
  const errorId = `${id}-error`;
  const near = value.length > SESSION_TEXT_MAX * 0.85;
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-2.5 text-[15px] font-medium text-ink">
          {letter ? (
            <span
              aria-hidden
              className="display inline-flex size-7 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white"
            >
              {letter}
            </span>
          ) : null}
          {label}
        </label>
        {near ? (
          <span className={cn("tabular text-xs", value.length > SESSION_TEXT_MAX ? "text-danger" : "text-subtle")}>
            {value.length.toLocaleString("es-AR")} / {SESSION_TEXT_MAX.toLocaleString("es-AR")}
          </span>
        ) : null}
      </div>
      <Textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={SESSION_TEXT_MAX}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="min-h-32 rounded-[18px] px-5 py-4 text-[15px]"
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

/**
 * Formulario de sesión (alta y edición), inspirado en la tarjeta de registro de daily:
 * fecha en tira semanal, horario grande, chips de duración y técnicas, escalas de dolor,
 * SOAP y pie gris con el botón blanco "Guardar sesión →". Estado 100% controlado:
 * si el servidor devuelve errores, no se pierde nada de lo escrito.
 */
export function SessionForm({
  action,
  initial,
  today,
  mode,
  cancelHref,
  sessionNumber,
  previous,
  footerStart,
}: {
  action: SessionFormAction;
  initial: SessionFormValues;
  /** "YYYY-MM-DD" calculado en el servidor. */
  today: string;
  mode: "create" | "edit";
  cancelHref: string;
  sessionNumber?: number | null;
  previous?: PreviousSessionHint | null;
  /** Contenido extra a la izquierda del pie (p. ej. botón Eliminar en la edición). */
  footerStart?: ReactNode;
}) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [values, setValues] = useState<SessionFormValues>(initial);
  // Las técnicas elegidas siempre se ven; el resto del catálogo se despliega a pedido.
  const [showAllTechniques, setShowAllTechniques] = useState(false);
  const [customDuration, setCustomDuration] = useState(() =>
    initial.duration_minutes && !(SESSION_DURATIONS as readonly number[]).includes(initial.duration_minutes)
      ? String(initial.duration_minutes)
      : "",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();
  const errors = state.fieldErrors ?? {};

  const set = <K extends keyof SessionFormValues>(key: K, value: SessionFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  // Error del servidor: toast + foco en el primer campo inválido.
  useEffect(() => {
    if (state.ok || !state.message) return;
    toast.error(state.message);
    const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]");
    if (first) {
      first.scrollIntoView({ block: "center", behavior: "smooth" });
      first.focus({ preventScroll: true });
    }
  }, [state]);

  const attended = values.attendance === "attended";
  const end = values.start_time ? endTime(values.start_time, values.duration_minutes) : null;
  const delta = values.pain_before != null && values.pain_after != null ? values.pain_after - values.pain_before : null;

  const visibleTechniques = showAllTechniques
    ? TECHNIQUE_OPTIONS
    : TECHNIQUE_OPTIONS.filter((o, i) => i < POPULAR_TECHNIQUES || values.techniques.includes(o.value));
  const hiddenCount = TECHNIQUE_OPTIONS.length - visibleTechniques.length;

  // Envío manual (en vez de <form action>): React no resetea el formulario después de la
  // acción, así los <select> del horario y el resto de los campos quedan como estaban.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  };

  const id = (name: string) => `${uid}-${name}`;
  const err = (name: string) => errors[name];

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {/* Encabezado: fecha elegida + asistencia (como "Jueves, 8 de octubre" · "¿Cómo estuvo el día?") */}
      <div className="flex animate-fade-up flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[15px] text-muted">
            {mode === "create" ? "Nueva sesión" : "Editar sesión"}
            {sessionNumber ? (
              <>
                {" "}
                · <span className="font-medium text-ink">Sesión {sessionNumber}</span>
              </>
            ) : null}
            {values.session_date > today ? <> · Programada</> : null}
          </p>
          <h2 className="display mt-1 text-[30px] font-normal text-ink sm:text-[40px]" aria-live="polite">
            {values.session_date
              ? longDate(values.session_date, values.session_date.slice(0, 4) !== today.slice(0, 4))
              : "Elegí una fecha"}
          </h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span aria-hidden className="text-[15px] text-muted">
            ¿Asistió?
          </span>
          <SegmentedControl<Attendance>
            name="attendance"
            aria-label="Asistencia"
            options={ATTENDANCE_OPTIONS}
            value={values.attendance}
            onChange={(v) => set("attendance", v)}
            className="self-start bg-surface p-1.5 sm:self-auto [&>button]:h-10 [&>button]:px-4"
          />
        </div>
      </div>

      <div className="animate-fade-up rounded-[34px] bg-surface-3/70 p-1.5 shadow-inset [animation-delay:60ms] sm:p-2">
        <div className="flex flex-col gap-9 rounded-card bg-surface p-5 sm:p-8">
          {/* Fecha */}
          <div>
            <WeekStrip
              value={values.session_date}
              onChange={(d) => set("session_date", d)}
              today={today}
              invalid={Boolean(err("session_date"))}
              describedBy={err("session_date") ? id("session_date-error") : undefined}
            />
            <input type="hidden" name="session_date" value={values.session_date} />
            <FieldError id={id("session_date-error")} message={err("session_date")} />
          </div>

          {/* Horario y duración */}
          <div className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[15px] text-muted">Inicio</p>
                <div className="mt-1 -ml-1">
                  <TimeSelect
                    id={id("start_time")}
                    name="start_time"
                    value={values.start_time}
                    onChange={(v) => set("start_time", v)}
                    invalid={Boolean(err("start_time"))}
                    describedBy={err("start_time") ? id("start_time-error") : undefined}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[15px] text-muted">Termina</p>
                <p
                  className="display tabular mt-1 flex h-[64px] items-center justify-end text-[34px] leading-none text-subtle sm:h-[72px] sm:text-[44px]"
                  aria-live="polite"
                >
                  {end ?? "--:--"}
                </p>
              </div>
            </div>
            <FieldError id={id("start_time-error")} message={err("start_time")} />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[15px] text-muted" id={id("duration-label")}>
                  Duración
                </span>
                <div role="group" aria-labelledby={id("duration-label")} className="flex flex-wrap items-center gap-2">
                  {SESSION_DURATIONS.map((m) => (
                    <Chip
                      key={m}
                      selected={values.duration_minutes === m && customDuration === ""}
                      onClick={() => {
                        setCustomDuration("");
                        set("duration_minutes", values.duration_minutes === m && customDuration === "" ? null : m);
                      }}
                    >
                      {durationLabel(m)}
                    </Chip>
                  ))}
                  <label
                    className={cn(
                      "inline-flex h-10 items-center gap-1 rounded-full pr-4 pl-3 text-sm font-medium transition-[background-color,box-shadow]",
                      customDuration !== "" ? "bg-ink text-white" : "bg-surface-2 text-ink hover:bg-surface-3",
                      "focus-within:shadow-[0_0_0_1.5px_var(--color-ink)] focus-within:ring-2 focus-within:ring-white focus-within:ring-inset",
                      err("duration_minutes") && "shadow-[0_0_0_1.5px_var(--color-danger)]",
                    )}
                  >
                    <span className="sr-only">Otra duración en minutos</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={DURATION_MIN}
                      max={DURATION_MAX}
                      placeholder="Otra"
                      value={customDuration}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 3);
                        setCustomDuration(raw);
                        set("duration_minutes", raw === "" ? null : Number(raw));
                      }}
                      aria-invalid={err("duration_minutes") ? true : undefined}
                      aria-describedby={err("duration_minutes") ? id("duration-error") : undefined}
                      className={cn(
                        "tabular w-10 bg-transparent text-right outline-none",
                        customDuration !== "" ? "placeholder:text-white/60" : "placeholder:text-muted",
                      )}
                    />
                    <span className={customDuration !== "" ? "text-white/70" : "text-muted"}>min</span>
                  </label>
                </div>
              </div>
              <input type="hidden" name="duration_minutes" value={values.duration_minutes ?? ""} />
              <FieldError id={id("duration-error")} message={err("duration_minutes")} />
            </div>
          </div>

          {attended ? (
            <div className="flex animate-fade-in flex-col gap-9">
              <div className="relative flex items-center justify-center">
                <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line" />
                <span className="relative inline-flex h-9 items-center rounded-full bg-surface px-4 text-[13px] text-muted shadow-inset">
                  Registro clínico
                </span>
              </div>

              {previous ? (
                <div className="flex flex-col gap-3 rounded-panel bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted shadow-inset">
                      <History className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-ink">
                        Sesión anterior · {shortDate(previous.date)}
                        {previous.painAfter != null ? (
                          <span className="font-normal text-muted"> · terminó con dolor {previous.painAfter}/10</span>
                        ) : null}
                      </p>
                      {previous.plan ? <p className="mt-0.5 line-clamp-2 text-muted">Plan: {previous.plan}</p> : null}
                    </div>
                  </div>
                  {previous.techniques.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        set("techniques", Array.from(new Set([...values.techniques, ...previous.techniques])));
                        toast.success("Técnicas de la sesión anterior agregadas");
                      }}
                      className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full bg-surface px-4 text-[13px] font-medium text-ink shadow-inset transition-colors hover:bg-surface-3 sm:self-auto"
                    >
                      <Copy className="size-4" aria-hidden />
                      Repetir técnicas ({previous.techniques.length})
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* Técnicas */}
              <div>
                <SectionTitle
                  hint={values.techniques.length > 0 ? `${values.techniques.length} elegidas` : "Podés elegir varias"}
                >
                  ¿Qué trabajaron hoy?
                </SectionTitle>
                <div role="group" aria-label="Técnicas utilizadas" className="flex flex-wrap gap-2">
                  {visibleTechniques.map((o) => {
                    const selected = values.techniques.includes(o.value);
                    return (
                      <Chip
                        key={o.value}
                        dot={o.dot}
                        selected={selected}
                        onClick={() =>
                          set(
                            "techniques",
                            selected ? values.techniques.filter((t) => t !== o.value) : [...values.techniques, o.value],
                          )
                        }
                      >
                        {o.label}
                      </Chip>
                    );
                  })}
                  {hiddenCount > 0 || showAllTechniques ? (
                    <button
                      type="button"
                      onClick={() => setShowAllTechniques((v) => !v)}
                      aria-expanded={showAllTechniques}
                      className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-ink-2 shadow-inset transition-colors hover:bg-surface-2"
                    >
                      {showAllTechniques ? "Ver menos" : `+${hiddenCount} técnicas`}
                      <ChevronDown
                        className={cn("size-4 transition-transform", showAllTechniques && "rotate-180")}
                        aria-hidden
                      />
                    </button>
                  ) : null}
                </div>
                {values.techniques.map((t) => (
                  <input key={t} type="hidden" name="techniques" value={t} />
                ))}
                <FieldError id={id("techniques-error")} message={err("techniques")} />
              </div>

              {/* Dolor */}
              <div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ScaleBar
                    name="pain_before"
                    tone="pain"
                    label="Dolor al inicio"
                    description="¿Cuánto dolor refiere al llegar?"
                    dot={PAIN_SERIES.before.color}
                    value={values.pain_before}
                    onChange={(v) => set("pain_before", v)}
                  />
                  <ScaleBar
                    name="pain_after"
                    tone="pain"
                    label="Dolor al final"
                    description="¿Y al terminar la sesión?"
                    dot={PAIN_SERIES.after.color}
                    value={values.pain_after}
                    onChange={(v) => set("pain_after", v)}
                  />
                </div>
                <div className="mt-2 min-h-5 px-1 text-[13px]" aria-live="polite">
                  {delta != null ? (
                    <p className={cn(delta < 0 ? "text-success" : delta > 0 ? "text-danger" : "text-muted")}>
                      {delta < 0
                        ? `Bajó ${Math.abs(delta)} ${Math.abs(delta) === 1 ? "punto" : "puntos"} durante la sesión.`
                        : delta > 0
                          ? `Subió ${delta} ${delta === 1 ? "punto" : "puntos"} durante la sesión.`
                          : "Sin cambios durante la sesión."}
                    </p>
                  ) : (
                    <p className="text-subtle">Tocá de nuevo un valor para dejarlo sin registrar.</p>
                  )}
                </div>
                <FieldError id={id("pain_before-error")} message={err("pain_before") ?? err("pain_after")} />
              </div>

              {/* SOAP */}
              <div className="grid gap-x-5 gap-y-6 lg:grid-cols-2">
                {SOAP_FIELDS.map((f) => (
                  <LongText
                    key={f.key}
                    id={id(f.key)}
                    name={f.key}
                    letter={f.letter}
                    label={f.label}
                    placeholder={f.placeholder}
                    value={values[f.key]}
                    onChange={(v) => set(f.key, v)}
                    error={err(f.key)}
                  />
                ))}
              </div>

              <div className="grid gap-x-5 gap-y-6 lg:grid-cols-2">
                <LongText
                  id={id("home_exercises")}
                  name="home_exercises"
                  label="Ejercicios para casa"
                  placeholder="Ej.: Puente de glúteos 3×12, elongación de isquiotibiales 3×30 s, hielo 15 min si hay dolor…"
                  value={values.home_exercises}
                  onChange={(v) => set("home_exercises", v)}
                  error={err("home_exercises")}
                  rows={3}
                />
                <LongText
                  id={id("notes")}
                  name="notes"
                  label="Notas"
                  placeholder="Observaciones internas, pagos, coordinación con el médico…"
                  value={values.notes}
                  onChange={(v) => set("notes", v)}
                  error={err("notes")}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="flex animate-fade-in flex-col gap-4">
              <div className="rounded-panel bg-surface-2 px-5 py-4 text-sm text-muted">
                {values.attendance === "absent" ? "El paciente no asistió." : "La sesión se canceló."} No se registran
                técnicas, dolor ni SOAP
                {mode === "edit" ? "; si había datos clínicos cargados, se van a borrar al guardar" : ""}.
              </div>
              <LongText
                id={id("notes")}
                name="notes"
                label="Motivo o notas"
                placeholder={
                  values.attendance === "absent"
                    ? "Ej.: avisó por WhatsApp que estaba enfermo, reprogramar para el jueves…"
                    : "Ej.: feriado, cancelada por el consultorio, se reprograma…"
                }
                value={values.notes}
                onChange={(v) => set("notes", v)}
                error={err("notes")}
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Pie gris (como el de daily): ayuda + botón blanco */}
        <div className="flex flex-col gap-4 px-3 pt-4 pb-2 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:pt-5 sm:pb-3">
          <div className="flex min-w-0 items-center gap-3">
            {footerStart}
            <p className="text-[15px] text-muted">
              {attended
                ? "Puntuá el dolor del 0 (sin dolor) al 10 (insoportable)."
                : "Podés reprogramar creando una nueva sesión."}
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <ButtonLink href={cancelHref} variant="ghost" size="lg" className="px-5">
              Cancelar
            </ButtonLink>
            <SubmitButton
              pending={isPending}
              variant="inverse"
              size="lg"
              iconRight={<ArrowRight />}
              pendingLabel="Guardando…"
              className="px-7 text-[16px] shadow-soft"
            >
              Guardar sesión
            </SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}
