"use client";

import { ArrowRight, NotebookPen, ShieldCheck, Siren, Stethoscope, UserRound } from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { buttonClasses } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { BigInput, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ageOn } from "@/components/patients/format";
import {
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MIN_BIRTH_DATE,
  PATIENT_LIMITS,
  patientFormValues,
  type PatientFieldName,
  type PatientFormValues,
  type PatientTextField,
} from "@/components/patients/patient-schema";
import { TagsInput } from "@/components/patients/tags-input";
import {
  DOCUMENT_TYPES,
  DOMINANT_SIDE_OPTIONS,
  HEALTH_INSURANCE_SUGGESTIONS,
  SEX_OPTIONS,
} from "@/lib/constants";
import { initialActionState, type ActionState, type Patient } from "@/lib/types";
import { cn } from "@/lib/utils";

const QUICK_INSURANCES = ["Particular", "OSDE", "Swiss Medical", "Galeno", "PAMI", "IOMA"];
const RELATION_SUGGESTIONS = ["Madre", "Padre", "Pareja", "Hijo/a", "Hermano/a", "Amigo/a", "Tutor/a"];
const MECHANISM_SUGGESTIONS = ["Traumático", "Sobreuso", "Postural", "Insidioso", "Postquirúrgico", "Deportivo", "Laboral"];
const TAG_SUGGESTIONS = ["Deportista", "Postquirúrgico", "Adulto mayor", "Embarazo", "ART", "Domicilio", "Crónico"];

type SectionId = "datos" | "cobertura" | "emergencia" | "consulta" | "notas";

const SECTIONS: { id: SectionId; title: string; description: string; icon: typeof UserRound; fields: PatientFieldName[] }[] = [
  {
    id: "datos",
    title: "Datos personales",
    description: "Quién es tu paciente y cómo contactarlo.",
    icon: UserRound,
    fields: [
      "first_name",
      "last_name",
      "document_type",
      "document_number",
      "birth_date",
      "sex",
      "gender_identity",
      "phone",
      "email",
      "address",
      "city",
      "occupation",
      "dominant_side",
    ],
  },
  {
    id: "cobertura",
    title: "Cobertura",
    description: "Obra social o prepaga y quién lo deriva.",
    icon: ShieldCheck,
    fields: ["health_insurance", "health_insurance_plan", "health_insurance_number", "referring_doctor"],
  },
  {
    id: "emergencia",
    title: "Contacto de emergencia",
    description: "A quién llamar si hace falta.",
    icon: Siren,
    fields: ["emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation"],
  },
  {
    id: "consulta",
    title: "Consulta",
    description: "Por qué viene y qué le diagnosticaron.",
    icon: Stethoscope,
    fields: ["consultation_reason", "medical_diagnosis", "kinesic_diagnosis", "onset_date", "injury_mechanism"],
  },
  {
    id: "notas",
    title: "Notas y etiquetas",
    description: "Lo que no entra en otro lado.",
    icon: NotebookPen,
    fields: ["tags", "notes"],
  },
];

/** Campos contados para el progreso de cada sección (sin el tipo de documento, que siempre tiene valor). */
const COUNTED: Record<SectionId, PatientFieldName[]> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s.fields.filter((f) => f !== "document_type")]),
) as Record<SectionId, PatientFieldName[]>;

/** "hace 3 semanas" relativo a `today` (fechas "YYYY-MM-DD"), sin usar el reloj del cliente. */
function relativeTo(date: string, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const toUtc = (v: string) => {
    const [y, m, d] = v.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const days = Math.round((toUtc(today) - toUtc(date)) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) {
    const w = Math.round(days / 7);
    return `hace ${w} ${w === 1 ? "semana" : "semanas"}`;
  }
  if (days < 365) {
    const m = Math.round(days / 30);
    return `hace ${m} ${m === 1 ? "mes" : "meses"}`;
  }
  const y = Math.floor(days / 365);
  return `hace ${y} ${y === 1 ? "año" : "años"}`;
}

function SectionCard({
  id,
  title,
  description,
  icon: Icon,
  children,
}: {
  id: SectionId;
  title: string;
  description: string;
  icon: typeof UserRound;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-card bg-surface p-5 sm:p-8">
      <header className="mb-6 flex items-start gap-3.5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">
          <Icon className="size-5" strokeWidth={1.7} aria-hidden />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id={`${id}-title`} className="display text-[22px] font-medium text-ink sm:text-2xl">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  if (value.length < max * 0.7) return null;
  return (
    <span className={cn("tabular text-xs", value.length >= max ? "text-danger" : "text-muted")}>
      {value.length}/{max}
    </span>
  );
}

export type PatientFormProps = {
  mode: "create" | "edit";
  /** Server Action (createPatient o updatePatient ligada al id). */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Paciente a editar (modo edición). */
  patient?: Patient | null;
  /** Hoy en Argentina ("YYYY-MM-DD"), calculado en el servidor. */
  today: string;
  cancelHref: string;
};

/** Formulario de alta / edición de paciente (controlado: no pierde lo escrito si hay errores). */
export function PatientForm({ mode, action, patient, today, cancelHref }: PatientFormProps) {
  const [state, dispatch, isPending] = useActionState(action, initialActionState);
  const [, startTransition] = useTransition();
  const [values, setValues] = useState<PatientFormValues>(() => patientFormValues(patient));
  const [tags, setTags] = useState<string[]>(() => patient?.tags ?? []);
  const [dirty, setDirty] = useState(false);
  const [cleared, setCleared] = useState<Partial<Record<PatientFieldName, boolean>>>({});
  const [seenState, setSeenState] = useState(state);
  const [activeSection, setActiveSection] = useState<SectionId>("datos");
  const formRef = useRef<HTMLFormElement>(null);

  // Nueva respuesta del servidor: volver a mostrar todos sus errores.
  if (state !== seenState) {
    setSeenState(state);
    setCleared({});
  }

  const errorOf = (key: PatientFieldName) => (cleared[key] ? undefined : state.fieldErrors?.[key]);

  useEffect(() => {
    if (state === initialActionState || state.ok) return;
    // Arriba, para no tapar el pie fijo del formulario.
    if (state.message) toast.error(state.message, { position: "top-center" });
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalid.focus({ preventScroll: true });
    }
  }, [state]);

  // Aviso al cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty || isPending) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, isPending]);

  // Sección visible (para el índice lateral).
  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter((n): n is HTMLElement => Boolean(n));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id as SectionId);
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  const set = (key: PatientTextField, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    if (state.fieldErrors?.[key]) setCleared((prev) => ({ ...prev, [key]: true }));
  };

  /** Props comunes de un input controlado. */
  const bind = (key: PatientTextField) => ({
    id: key,
    name: key,
    value: values[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value),
    "aria-invalid": errorOf(key) ? true : undefined,
    maxLength: key in PATIENT_LIMITS ? PATIENT_LIMITS[key as keyof typeof PATIENT_LIMITS] : undefined,
    autoComplete: "off",
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };

  const age = values.birth_date ? ageOn(values.birth_date, today) : null;
  const onsetRelative = values.onset_date ? relativeTo(values.onset_date, today) : null;
  const numericDocument = ["DNI", "LC", "LE"].includes(values.document_type);

  const filledCount = (id: SectionId) =>
    COUNTED[id].filter((f) => (f === "tags" ? tags.length > 0 : Boolean(values[f as PatientTextField]?.trim()))).length;
  const sectionHasError = (id: SectionId) => SECTIONS.find((s) => s.id === id)!.fields.some((f) => errorOf(f));

  const isEdit = mode === "edit";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative" aria-busy={isPending}>
      <div className="grid gap-6 xl:grid-cols-[212px_minmax(0,1fr)] xl:gap-8">
        {/* Índice lateral */}
        <nav aria-label="Secciones del formulario" className="hidden xl:block">
          <ol className="sticky top-10 flex flex-col gap-1">
            {SECTIONS.map((s) => {
              const filled = filledCount(s.id);
              const total = COUNTED[s.id].length;
              const active = activeSection === s.id;
              const hasError = sectionHasError(s.id);
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "relative flex items-center justify-between gap-2 rounded-2xl px-3.5 py-3 text-[15px] transition-colors",
                      active ? "bg-surface font-medium text-ink shadow-inset" : "text-ink-2 hover:bg-surface/60",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {hasError ? <span aria-label="Con errores" className="size-2 shrink-0 rounded-full bg-danger" /> : null}
                      <span className="truncate">{s.title}</span>
                    </span>
                    <span className={cn("tabular text-xs", filled > 0 ? "text-ink-2" : "text-subtle")}>
                      {filled}/{total}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          {/* Datos personales */}
          <SectionCard {...SECTIONS[0]}>
            <fieldset>
              <legend className="mb-3 text-[15px] text-muted">¿Cómo se llama?</legend>
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="first_name" className="sr-only">
                    Nombre (obligatorio)
                  </label>
                  <BigInput
                    {...bind("first_name")}
                    placeholder="Nombre"
                    aria-required="true"
                    autoFocus={!isEdit}
                    autoCapitalize="words"
                    className={cn(
                      "border-b-[1.5px] pb-2.5 transition-colors",
                      errorOf("first_name") ? "border-danger" : "border-line focus:border-ink",
                    )}
                  />
                  {errorOf("first_name") ? (
                    <p role="alert" className="mt-2 text-[13px] text-danger">
                      {errorOf("first_name")}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="last_name" className="sr-only">
                    Apellido (obligatorio)
                  </label>
                  <BigInput
                    {...bind("last_name")}
                    placeholder="Apellido"
                    aria-required="true"
                    autoCapitalize="words"
                    className={cn(
                      "border-b-[1.5px] pb-2.5 transition-colors",
                      errorOf("last_name") ? "border-danger" : "border-line focus:border-ink",
                    )}
                  />
                  {errorOf("last_name") ? (
                    <p role="alert" className="mt-2 text-[13px] text-danger">
                      {errorOf("last_name")}
                    </p>
                  ) : null}
                </div>
              </div>
            </fieldset>

            <div className="mt-8 grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <Field label="Documento" htmlFor="document_number" error={errorOf("document_number") ?? errorOf("document_type")}>
                <div className="flex gap-2">
                  <div className="w-[7.5rem] shrink-0">
                    <Select {...bind("document_type")} aria-label="Tipo de documento" id="document_type">
                      {DOCUMENT_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input
                    {...bind("document_number")}
                    inputMode={numericDocument ? "numeric" : "text"}
                    placeholder={numericDocument ? "30123456" : "Número"}
                  />
                </div>
              </Field>

              <Field
                label="Fecha de nacimiento"
                htmlFor="birth_date"
                error={errorOf("birth_date")}
                hint={age != null ? undefined : "Con la fecha calculamos la edad."}
              >
                <div className="relative">
                  <Input {...bind("birth_date")} type="date" min={MIN_BIRTH_DATE} max={today} className="pr-28" />
                  {age != null ? (
                    <span className="tabular pointer-events-none absolute top-1/2 right-11 -translate-y-1/2 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
                      {age === 1 ? "1 año" : `${age} años`}
                    </span>
                  ) : null}
                </div>
              </Field>

              <Field label="Sexo" error={errorOf("sex")} className="sm:col-span-2">
                <ChipGroup
                  aria-label="Sexo"
                  options={SEX_OPTIONS}
                  value={values.sex ? [values.sex] : []}
                  onChange={(v) => set("sex", v[0] ?? "")}
                />
                <input type="hidden" name="sex" value={values.sex} />
              </Field>

              <Field label="Identidad de género" htmlFor="gender_identity" optional error={errorOf("gender_identity")}>
                <Input {...bind("gender_identity")} placeholder="Si difiere del sexo registrado" />
              </Field>

              <Field label="Ocupación" htmlFor="occupation" optional error={errorOf("occupation")}>
                <Input {...bind("occupation")} placeholder="Ej.: docente, albañil, administrativa" />
              </Field>

              <Field label="Teléfono" htmlFor="phone" error={errorOf("phone")}>
                <Input {...bind("phone")} type="tel" inputMode="tel" placeholder="11 5555-5555" />
              </Field>

              <Field label="Email" htmlFor="email" optional error={errorOf("email")}>
                <Input {...bind("email")} type="email" inputMode="email" placeholder="nombre@correo.com" />
              </Field>

              <Field label="Dirección" htmlFor="address" optional error={errorOf("address")}>
                <Input {...bind("address")} placeholder="Calle y número" />
              </Field>

              <Field label="Ciudad" htmlFor="city" optional error={errorOf("city")}>
                <Input {...bind("city")} placeholder="Ej.: CABA, Rosario" />
              </Field>

              <Field label="Lateralidad" error={errorOf("dominant_side")} className="sm:col-span-2">
                <ChipGroup
                  aria-label="Lateralidad"
                  options={DOMINANT_SIDE_OPTIONS}
                  value={values.dominant_side ? [values.dominant_side] : []}
                  onChange={(v) => set("dominant_side", v[0] ?? "")}
                />
                <input type="hidden" name="dominant_side" value={values.dominant_side} />
              </Field>
            </div>
          </SectionCard>

          {/* Cobertura */}
          <SectionCard {...SECTIONS[1]}>
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <Field label="Obra social / prepaga" htmlFor="health_insurance" error={errorOf("health_insurance")} className="sm:col-span-2">
                <Input {...bind("health_insurance")} list="health-insurance-options" placeholder="Escribí o elegí una" />
                <datalist id="health-insurance-options">
                  {HEALTH_INSURANCE_SUGGESTIONS.map((h) => (
                    <option key={h} value={h} />
                  ))}
                </datalist>
                <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Obras sociales frecuentes">
                  {QUICK_INSURANCES.map((h) => (
                    <Chip
                      key={h}
                      size="sm"
                      selected={values.health_insurance.toLocaleLowerCase("es-AR") === h.toLocaleLowerCase("es-AR")}
                      onClick={() => set("health_insurance", values.health_insurance === h ? "" : h)}
                    >
                      {h}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Plan" htmlFor="health_insurance_plan" optional error={errorOf("health_insurance_plan")}>
                <Input {...bind("health_insurance_plan")} placeholder="Ej.: 310, SMG20" />
              </Field>
              <Field label="Nº de afiliado" htmlFor="health_insurance_number" optional error={errorOf("health_insurance_number")}>
                <Input {...bind("health_insurance_number")} placeholder="Número de credencial" />
              </Field>
              <Field label="Médico derivante" htmlFor="referring_doctor" optional error={errorOf("referring_doctor")} className="sm:col-span-2">
                <Input {...bind("referring_doctor")} placeholder="Ej.: Dra. Paula Méndez (traumatóloga)" />
              </Field>
            </div>
          </SectionCard>

          {/* Contacto de emergencia */}
          <SectionCard {...SECTIONS[2]}>
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-3">
              <Field label="Nombre" htmlFor="emergency_contact_name" error={errorOf("emergency_contact_name")} className="sm:col-span-3 md:col-span-1">
                <Input {...bind("emergency_contact_name")} placeholder="Nombre y apellido" />
              </Field>
              <Field label="Teléfono" htmlFor="emergency_contact_phone" error={errorOf("emergency_contact_phone")} className="sm:col-span-2 md:col-span-1">
                <Input {...bind("emergency_contact_phone")} type="tel" inputMode="tel" placeholder="11 5555-5555" />
              </Field>
              <Field label="Vínculo" htmlFor="emergency_contact_relation" error={errorOf("emergency_contact_relation")}>
                <Input {...bind("emergency_contact_relation")} list="relation-options" placeholder="Ej.: pareja" />
                <datalist id="relation-options">
                  {RELATION_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>
            </div>
          </SectionCard>

          {/* Consulta */}
          <SectionCard {...SECTIONS[3]}>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="consultation_reason" className="display text-[22px] text-ink sm:text-[26px]">
                  ¿Qué lo trae a la consulta?
                </label>
                <Textarea
                  {...bind("consultation_reason")}
                  rows={4}
                  placeholder="Ej.: dolor lumbar hace 3 semanas que empeora al estar sentada mucho tiempo y la despierta a la noche."
                  className="min-h-36 rounded-panel px-5 py-4 text-[17px] leading-relaxed sm:text-[19px]"
                />
                <div className="flex items-center justify-between gap-3">
                  {errorOf("consultation_reason") ? (
                    <p role="alert" className="text-[13px] text-danger">
                      {errorOf("consultation_reason")}
                    </p>
                  ) : (
                    <p className="text-[13px] text-muted">Con sus palabras: qué siente, desde cuándo y qué lo empeora.</p>
                  )}
                  <Counter value={values.consultation_reason} max={PATIENT_LIMITS.consultation_reason} />
                </div>
              </div>

              <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                <Field label="Diagnóstico médico" htmlFor="medical_diagnosis" optional error={errorOf("medical_diagnosis")}>
                  <Textarea {...bind("medical_diagnosis")} rows={2} placeholder="Según la derivación o el médico tratante" />
                </Field>
                <Field label="Diagnóstico kinésico" htmlFor="kinesic_diagnosis" optional error={errorOf("kinesic_diagnosis")}>
                  <Textarea {...bind("kinesic_diagnosis")} rows={2} placeholder="Diagnóstico funcional" />
                </Field>
                <Field
                  label="Inicio de los síntomas"
                  htmlFor="onset_date"
                  error={errorOf("onset_date")}
                  hint={onsetRelative ? `Empezó ${onsetRelative}` : "Aproximado, si no sabe la fecha exacta."}
                >
                  <Input {...bind("onset_date")} type="date" min={MIN_BIRTH_DATE} max={today} />
                </Field>
                <Field label="Mecanismo de lesión" htmlFor="injury_mechanism" optional error={errorOf("injury_mechanism")}>
                  <Input {...bind("injury_mechanism")} placeholder="Cómo se produjo" />
                  <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Mecanismos frecuentes">
                    {MECHANISM_SUGGESTIONS.map((m) => {
                      const current = values.injury_mechanism.trim();
                      const included = current.toLocaleLowerCase("es-AR").includes(m.toLocaleLowerCase("es-AR"));
                      return (
                        <Chip
                          key={m}
                          size="sm"
                          selected={included}
                          onClick={() => {
                            if (included) return;
                            set("injury_mechanism", current ? `${current}, ${m.toLocaleLowerCase("es-AR")}` : m);
                          }}
                        >
                          {m}
                        </Chip>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* Notas y etiquetas */}
          <SectionCard {...SECTIONS[4]}>
            <div className="flex flex-col gap-5">
              <Field label="Etiquetas" htmlFor="tags-input" optional error={errorOf("tags")} hint="Para agrupar y encontrar pacientes rápido.">
                <TagsInput
                  id="tags-input"
                  name="tags"
                  value={tags}
                  onChange={(next) => {
                    setTags(next);
                    setDirty(true);
                    if (state.fieldErrors?.tags) setCleared((prev) => ({ ...prev, tags: true }));
                  }}
                  suggestions={TAG_SUGGESTIONS}
                  max={MAX_TAGS}
                  maxLength={MAX_TAG_LENGTH}
                  invalid={Boolean(errorOf("tags"))}
                />
              </Field>
              <Field label="Notas" htmlFor="notes" optional error={errorOf("notes")}>
                <Textarea {...bind("notes")} rows={5} placeholder="Preferencias de horario, cómo llegó al consultorio, observaciones generales…" />
                <div className="flex justify-end">
                  <Counter value={values.notes} max={PATIENT_LIMITS.notes} />
                </div>
              </Field>
            </div>
          </SectionCard>

          {/* Pie fijo (como el pie gris con píldora blanca de daily) */}
          <div className="sticky bottom-3 z-20 mt-1 sm:bottom-5">
            <div className="flex items-center gap-3 rounded-[30px] bg-surface-3/85 p-2 shadow-[0_18px_40px_-18px_rgb(17_17_20/0.35),inset_0_0_0_1px_rgb(17_17_20/0.05)] backdrop-blur-md sm:pl-6">
              <p
                className={cn(
                  "hidden min-w-0 flex-1 text-sm sm:block",
                  state.message && !state.ok ? "text-danger" : "text-muted",
                )}
                aria-live="polite"
              >
                {state.message && !state.ok
                  ? state.message
                  : isEdit
                    ? "Los cambios se aplican a toda la ficha del paciente."
                    : "Solo nombre y apellido son obligatorios. El resto lo podés completar después."}
              </p>
              <Link href={cancelHref} className={buttonClasses("ghost", "lg", "px-5 text-muted hover:text-ink")}>
                Cancelar
              </Link>
              <SubmitButton
                variant="inverse"
                size="lg"
                pending={isPending}
                pendingLabel="Guardando…"
                iconRight={<ArrowRight />}
                className="ml-auto flex-1 shadow-soft sm:ml-0 sm:flex-none"
              >
                {isEdit ? "Guardar cambios" : "Guardar paciente"}
              </SubmitButton>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
