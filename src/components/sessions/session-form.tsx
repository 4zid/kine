"use client";

import { ArrowRight, ChevronDown, Copy, History } from "lucide-react";
import { unstable_isUnrecognizedActionError, unstable_rethrow } from "next/navigation";
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
import { useUnsavedChangesGuard } from "@/components/sessions/use-unsaved-changes";
import { WeekStrip } from "@/components/sessions/week-strip";
import {
  DURATION_MAX,
  DURATION_MIN,
  durationLabel,
  endTime,
  FUTURE_SESSION_MESSAGE,
  longDate,
  PAIN_SERIES,
  SESSION_TEXT_MAX,
  sessionNumberOn,
  shortDate,
  TECHNIQUE_OPTIONS,
  type AttendedSlot,
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

const UNSAVED_MESSAGE = "Tenés cambios sin guardar en la sesión. ¿Querés salir igual?";

/** Lleva la vista y el foco al primer campo inválido (sin animar si se pidió menos movimiento). */
function focusFirstInvalid(form: HTMLFormElement | null) {
  const first = form?.querySelector<HTMLElement>("[aria-invalid=true]");
  if (!first) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  first.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  first.focus({ preventScroll: true });
}

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
      {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
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
          <span className={cn("tabular text-xs", value.length > SESSION_TEXT_MAX ? "text-danger" : "text-muted")}>
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
 * fecha en tira semanal (solo hasta hoy: una sesión documenta un encuentro que ya ocurrió),
 * horario grande, chips de duración y técnicas, EVA de la sesión, SOAP y barra de guardado fija.
 * Estado 100% controlado: si el servidor devuelve errores (o la acción falla), no se pierde nada
 * de lo escrito; al salir con cambios sin guardar se pide confirmación.
 */
export function SessionForm({
  action,
  initial,
  today,
  mode,
  cancelHref,
  sessionNumber,
  attendedSlots,
  previous,
  footerStart,
}: {
  action: SessionFormAction;
  initial: SessionFormValues;
  /** "YYYY-MM-DD" calculado en el servidor. */
  today: string;
  mode: "create" | "edit";
  cancelHref: string;
  /** Número de la sesión con los datos iniciales (en la edición, el calculado en el servidor). */
  sessionNumber?: number | null;
  /**
   * Sesiones realizadas del paciente (sin la que se edita): permite recalcular "Sesión N"
   * cuando se cambia la fecha, el horario o la asistencia.
   */
  attendedSlots?: AttendedSlot[];
  previous?: PreviousSessionHint | null;
  /** Contenido extra a la izquierda del pie (p. ej. botón Eliminar en la edición). */
  footerStart?: ReactNode;
}) {
  // Si la acción se rechaza (sesión vencida, deploy nuevo, red), devolver un estado de error en
  // vez de dejar que error.tsx desmonte el formulario y se pierda la nota SOAP.
  const safeAction = async (prev: ActionState, formData: FormData): Promise<ActionState> => {
    try {
      return await action(prev, formData);
    } catch (error) {
      unstable_rethrow(error); // redirect() al guardar bien
      return {
        ok: false,
        message: unstable_isUnrecognizedActionError(error)
          ? "Hay una versión nueva de kine: recargá la página para guardar (copiá antes lo que escribiste)."
          : "No pudimos guardar la sesión. Revisá tu conexión y probá de nuevo.",
      };
    }
  };
  const [state, formAction, isPending] = useActionState(safeAction, initialActionState);
  const [values, setValues] = useState<SessionFormValues>(initial);
  const [baseline] = useState(() => JSON.stringify(initial));
  const dirty = JSON.stringify(values) !== baseline;
  useUnsavedChangesGuard(dirty, UNSAVED_MESSAGE);
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
  const id = (name: string) => `${uid}-${name}`;
  const err = (name: string) => errors[name];

  // Error del servidor: toast + foco en el primer campo inválido.
  useEffect(() => {
    if (state.ok || !state.message) return;
    toast.error(state.message);
    focusFirstInvalid(formRef.current);
  }, [state]);

  const attended = values.attendance === "attended";
  const futureDate = Boolean(values.session_date) && values.session_date > today;
  const dateError = err("session_date") ?? (futureDate ? FUTURE_SESSION_MESSAGE : undefined);

  // "Sesión N" para la fecha y el horario elegidos (no solo para hoy).
  const unchanged =
    values.session_date === initial.session_date &&
    values.start_time === initial.start_time &&
    values.attendance === initial.attendance;
  const number = !attended
    ? null
    : attendedSlots && !(mode === "edit" && unchanged && sessionNumber)
      ? sessionNumberOn(attendedSlots, values.session_date, values.start_time || null, today)
      : futureDate
        ? null
        : (sessionNumber ?? null);
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
    if (futureDate) {
      toast.error(FUTURE_SESSION_MESSAGE);
      focusFirstInvalid(formRef.current);
      return;
    }
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  };

  const statusText = isPending
    ? "Guardando…"
    : dirty
      ? "Cambios sin guardar"
      : mode === "edit"
        ? "Sin cambios"
        : "Lista para guardar";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {/* Encabezado: título de la pestaña, fecha elegida (como "Jueves, 8 de octubre") y asistencia */}
      <div className="flex animate-fade-up flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="display flex flex-wrap items-baseline gap-x-2 text-2xl font-medium text-ink">
            {mode === "create" ? "Nueva sesión" : "Editar sesión"}
            {number ? (
              <span className="font-sans text-[15px] font-normal tracking-normal text-muted">· Sesión {number}</span>
            ) : null}
          </h2>
          <p className="display mt-2 text-[30px] font-normal text-ink sm:text-[40px]" aria-live="polite">
            {values.session_date
              ? longDate(values.session_date, values.session_date.slice(0, 4) !== today.slice(0, 4))
              : "Elegí una fecha"}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span aria-hidden className="text-[15px] text-muted">
            ¿Asistió?
          </span>
          <SegmentedControl<Attendance>
            name="attendance"
            aria-label="¿Asistió el paciente?"
            options={ATTENDANCE_OPTIONS}
            value={values.attendance}
            onChange={(v) => set("attendance", v)}
            className="w-full bg-surface p-1.5 sm:w-auto [&>button]:h-10 [&>button]:flex-1 [&>button]:justify-center [&>button]:gap-1.5 [&>button]:px-2 sm:[&>button]:flex-none sm:[&>button]:gap-2 sm:[&>button]:px-4"
          />
        </div>
      </div>

      <div className="animate-fade-up rounded-[34px] bg-surface-3/70 p-1.5 shadow-inset [animation-delay:60ms] sm:p-2">
        <div className="flex flex-col gap-9 rounded-card bg-surface p-5 sm:p-8">
          {/* Fecha (hasta hoy: no se registran sesiones futuras) */}
          <div>
            <WeekStrip
              value={values.session_date}
              onChange={(d) => set("session_date", d)}
              today={today}
              invalid={Boolean(dateError)}
              describedBy={dateError ? id("session_date-error") : undefined}
            />
            <input type="hidden" name="session_date" value={values.session_date} />
            <FieldError id={id("session_date-error")} message={dateError} />
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
                  className="display tabular mt-1 flex h-[64px] items-center justify-end text-[34px] leading-none text-muted sm:h-[72px] sm:text-[44px]"
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
                        customDuration !== "" ? "placeholder:text-white/70" : "placeholder:text-muted",
                      )}
                    />
                    <span className={customDuration !== "" ? "text-white/80" : "text-muted"}>min</span>
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

              {previous && previous.date <= values.session_date ? (
                <div className="flex flex-col gap-3 rounded-panel bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted shadow-inset">
                      <History className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-ink">
                        Sesión anterior · {shortDate(previous.date)}
                        {previous.painAfter != null ? (
                          <span className="font-normal text-muted"> · terminó con EVA {previous.painAfter}/10</span>
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
                  ¿Qué trabajaron?
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

              {/* EVA de la sesión (dolor global; el dolor por zona se registra en el mapa corporal) */}
              <div>
                <SectionTitle hint="0 = sin dolor · 10 = el peor dolor imaginable">EVA de la sesión (0–10)</SectionTitle>
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
                    <p className="text-muted">Tocá de nuevo un valor para dejarlo sin registrar.</p>
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
                  placeholder="Ej.: puente de glúteos 3×12, elongación de isquiotibiales 3×30 s, hielo 15 min si hay dolor…"
                  value={values.home_exercises}
                  onChange={(v) => set("home_exercises", v)}
                  error={err("home_exercises")}
                  rows={3}
                />
                <LongText
                  id={id("notes")}
                  name="notes"
                  label="Notas"
                  placeholder="Ej.: observaciones internas, pagos, coordinación con el médico…"
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

        {/* Barra de guardado fija (como la de la historia clínica): siempre a mano en un formulario largo. */}
        <div className="pointer-events-none sticky bottom-3 z-20 px-0.5 pt-3 pb-0.5 sm:bottom-5 sm:px-1 sm:pt-4 sm:pb-1 print:hidden">
          <div className="pointer-events-auto flex items-center gap-2 rounded-[26px] bg-ink p-1.5 text-white shadow-float sm:pl-5">
            {footerStart ? <div className="flex shrink-0 items-center">{footerStart}</div> : null}
            <p
              role="status"
              aria-live="polite"
              className="sr-only flex-1 items-center gap-2 text-[14px] text-white/85 sm:not-sr-only sm:flex sm:min-w-0"
            >
              {dirty && !isPending ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-orange" /> : null}
              <span className="truncate">{statusText}</span>
            </p>
            <span aria-hidden className="flex-1 sm:hidden" />
            <ButtonLink
              href={cancelHref}
              variant="ghost"
              className="px-4 text-white hover:bg-white/10 focus-visible:outline-white sm:px-5"
            >
              Cancelar
            </ButtonLink>
            <SubmitButton
              pending={isPending}
              variant="inverse"
              iconRight={<ArrowRight />}
              pendingLabel="Guardando…"
              className="px-5 focus-visible:outline-white sm:px-6"
            >
              <span>
                Guardar<span className="hidden min-[400px]:inline"> sesión</span>
              </span>
            </SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}
