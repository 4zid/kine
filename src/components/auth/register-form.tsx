"use client";

import { ArrowRight, ChevronLeft, PencilLine, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { signUp, type SignUpResult } from "@/app/(auth)/registro/actions";
import { guardAction } from "@/components/auth/action-guard";
import { RegisterAside } from "@/components/auth/auth-asides";
import { AuthHeading, AuthSplitLayout, TopLink } from "@/components/auth/auth-split-layout";
import { FormAlert } from "@/components/auth/form-alert";
import type { LegalDoc } from "@/components/auth/legal-dialog";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import {
  REGISTER_FIELD_STEP,
  registerStep1Schema,
  registerStep2RefinedSchema,
  registerStep3Schema,
  signUpSchema,
  toFieldErrors,
  type RegisterField,
  type RegisterValues,
} from "@/components/auth/schemas";
import { StepSegments } from "@/components/auth/step-segments";
import { textMotion } from "@/components/onboarding/motion";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented";
import { SubmitButton } from "@/components/ui/submit-button";
import { AR_PROVINCES, DOT_COLORS, SPECIALTIES } from "@/lib/constants";
import type { ActionState } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type Errors = Partial<Record<RegisterField | "_form", string>>;

const EMPTY_VALUES: RegisterValues = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  phone: "",
  license_number: "",
  license_type: "nacional",
  license_province: "",
  specialties: [],
  clinic_name: "",
  city: "",
  province: "",
  accept_terms: false,
};

const STEPS: Record<Step, { name: string; title: [string, string]; description: string }> = {
  1: {
    name: "Tus datos",
    title: ["Empecemos", "por vos."],
    description: "Con tu email y contraseña vas a ingresar a kine desde cualquier dispositivo.",
  },
  2: {
    name: "Datos profesionales",
    title: ["Tu matrícula,", "tu especialidad."],
    description: "Aparecen en tu perfil y en los informes que imprimas para tus pacientes.",
  },
  3: {
    name: "Consultorio",
    title: ["Tu consultorio,", "y listo."],
    description: "Podés completarlo ahora o más adelante desde Ajustes.",
  },
};

const SPECIALTY_OPTIONS = SPECIALTIES.map((s, i) => ({ ...s, dot: DOT_COLORS[i % DOT_COLORS.length] }));
const STEP_SCHEMAS = { 1: registerStep1Schema, 2: registerStep2RefinedSchema, 3: registerStep3Schema } as const;
const initialState: ActionState<SignUpResult> = { ok: false };
const submitSignUp = guardAction(signUp);

// El texto legal solo se descarga si la persona abre el diálogo.
const LegalDialog = dynamic(() => import("@/components/auth/legal-dialog").then((m) => m.LegalDialog), { ssr: false });

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function fieldId(field: RegisterField) {
  return `reg-${field}`;
}

function firstErrorStep(errors: Errors): Step | null {
  const steps = Object.keys(errors)
    .filter((k): k is RegisterField => k in REGISTER_FIELD_STEP)
    .map((k) => REGISTER_FIELD_STEP[k]);
  return steps.length ? (Math.min(...steps) as Step) : null;
}

function firstErrorField(errors: Errors, step: Step): RegisterField | null {
  const order = Object.keys(REGISTER_FIELD_STEP) as RegisterField[];
  return order.find((f) => REGISTER_FIELD_STEP[f] === step && errors[f]) ?? null;
}

/** Formulario de registro del kinesiólogo en 3 pasos, con vista previa del perfil. */
export function RegisterForm({
  initialStep = 1,
  initialValues,
}: {
  initialStep?: Step;
  initialValues?: Partial<RegisterValues>;
}) {
  const [values, setValues] = useState<RegisterValues>(() => ({ ...EMPTY_VALUES, ...initialValues }));
  const [step, setStep] = useState<Step>(initialStep);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [errors, setErrors] = useState<Errors>({});
  const [legal, setLegal] = useState<LegalDoc | null>(null);
  // Una vez abierto queda montado: el <dialog> nativo devuelve el foco al botón al cerrarse.
  const [legalMounted, setLegalMounted] = useState(false);
  const openLegal = (doc: LegalDoc) => {
    setLegalMounted(true);
    setLegal(doc);
  };
  const [state, formAction, isPending] = useActionState(submitSignUp, initialState);
  const [handledState, setHandledState] = useState(state);
  const [emailTaken, setEmailTaken] = useState(false);

  // Pedido de foco (se aplica en un efecto, después de renderizar el paso).
  const [focusRequest, setFocusRequest] = useState<{ field: RegisterField | "first" } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Resultado del servidor: mostrar errores y volver al paso que corresponda.
  if (state !== handledState) {
    setHandledState(state);
    if (!state.ok) {
      const serverErrors: Errors = { ...(state.fieldErrors ?? {}) };
      if (state.message && !state.fieldErrors) serverErrors._form = state.message;
      setErrors(serverErrors);
      setEmailTaken(Boolean(state.data?.emailTaken));
      const target = firstErrorStep(serverErrors);
      if (target) {
        const field = firstErrorField(serverErrors, target);
        if (field) setFocusRequest({ field });
        if (target !== step) {
          setDirection(-1);
          setStep(target);
        }
      }
    }
  }

  // Foco: al primer campo con error o al primer campo del paso nuevo.
  useEffect(() => {
    if (!focusRequest) return;
    const target = focusRequest.field;
    const form = formRef.current;
    if (!form) return;
    const el =
      target === "first"
        ? form.querySelector<HTMLElement>("[data-step-fields] input:not([type=hidden]), [data-step-fields] select")
        : document.getElementById(fieldId(target));
    el?.focus({ preventScroll: true });
    if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ block: "start", behavior: scrollBehavior() });
  }, [focusRequest]);

  const set = <K extends RegisterField>(key: K, value: RegisterValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (key === "email" && emailTaken) setEmailTaken(false);
    setErrors((prev) => {
      if (!prev[key] && !prev._form) return prev;
      const next = { ...prev };
      delete next[key];
      delete next._form;
      return next;
    });
  };

  const goTo = (target: Step) => {
    if (target === step) return;
    setDirection(target > step ? 1 : -1);
    setFocusRequest({ field: "first" });
    setStep(target);
  };

  const validateStep = (s: Step): boolean => {
    const result = STEP_SCHEMAS[s].safeParse(values);
    const stepFields = (Object.keys(REGISTER_FIELD_STEP) as RegisterField[]).filter((f) => REGISTER_FIELD_STEP[f] === s);
    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev };
        stepFields.forEach((f) => delete next[f]);
        return next;
      });
      return true;
    }
    const stepErrors = toFieldErrors(result.error) as Errors;
    const field = firstErrorField(stepErrors, s);
    if (field) setFocusRequest({ field });
    setErrors((prev) => {
      const next = { ...prev };
      stepFields.forEach((f) => delete next[f]);
      return { ...next, ...stepErrors };
    });
    return false;
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    if (!validateStep(step)) return;
    if (step < 3) {
      goTo((step + 1) as Step);
      return;
    }

    const all = signUpSchema.safeParse(values);
    if (!all.success) {
      const allErrors = toFieldErrors(all.error) as Errors;
      setErrors(allErrors);
      const target = firstErrorStep(allErrors) ?? 1;
      const field = firstErrorField(allErrors, target);
      if (field) setFocusRequest({ field });
      if (target !== step) {
        setDirection(-1);
        setStep(target);
      }
      return;
    }

    const fd = new FormData();
    (Object.keys(values) as RegisterField[]).forEach((key) => {
      const value = values[key];
      if (Array.isArray(value)) value.forEach((v) => fd.append(key, v));
      else if (typeof value === "boolean") fd.set(key, value ? "on" : "");
      else fd.set(key, value);
    });
    startTransition(() => formAction(fd));
  };

  const meta = STEPS[step];
  const err = (field: RegisterField) => errors[field] ?? null;
  const invalid = (field: RegisterField) => (errors[field] ? true : undefined);
  const fullName = [values.first_name.trim(), values.last_name.trim()].filter(Boolean).join(" ");

  return (
    <AuthSplitLayout
      width="lg"
      aside={<RegisterAside values={values} />}
      topRight={
        <TopLink prompt="¿Ya tenés cuenta?" href="/ingresar">
          Ingresar
        </TopLink>
      }
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} aria-labelledby="registro-titulo" className="scroll-mt-6">
        <div className="flex flex-col-reverse items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-[15px] text-muted">
            Paso {step} de 3 · <span className="font-medium text-ink">{meta.name}</span>
          </p>
          <StepSegments
            total={3}
            current={step}
            labels={[STEPS[1].name, STEPS[2].name, STEPS[3].name]}
            onSelect={(s) => goTo(s as Step)}
          />
        </div>

        <div key={step} data-step-fields>
          <div style={textMotion(0, direction)}>
            <AuthHeading className="mt-3" title={meta.title} description={meta.description} />
            <span id="registro-titulo" className="sr-only">
              Crear cuenta · Paso {step} de 3: {meta.name}
            </span>
          </div>

          {errors._form ? (
            <FormAlert className="mt-6" title="No pudimos crear tu cuenta">
              {errors._form}
            </FormAlert>
          ) : null}

          <div className="mt-8 flex flex-col gap-5" style={textMotion(80, direction)}>
            {step === 1 ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Nombre" htmlFor={fieldId("first_name")} error={err("first_name")}>
                    <Input
                      id={fieldId("first_name")}
                      name="first_name"
                      autoComplete="given-name"
                      maxLength={100}
                      value={values.first_name}
                      onChange={(e) => set("first_name", e.target.value)}
                      aria-invalid={invalid("first_name")}
                      placeholder="Tu nombre"
                    />
                  </Field>
                  <Field label="Apellido" htmlFor={fieldId("last_name")} error={err("last_name")}>
                    <Input
                      id={fieldId("last_name")}
                      name="last_name"
                      autoComplete="family-name"
                      maxLength={100}
                      value={values.last_name}
                      onChange={(e) => set("last_name", e.target.value)}
                      aria-invalid={invalid("last_name")}
                      placeholder="Tu apellido"
                    />
                  </Field>
                </div>

                <Field label="Email" htmlFor={fieldId("email")} error={err("email")}>
                  <Input
                    id={fieldId("email")}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={254}
                    value={values.email}
                    onChange={(e) => set("email", e.target.value)}
                    aria-invalid={invalid("email")}
                    placeholder="nombre@consultorio.com"
                  />
                </Field>
                {emailTaken ? (
                  <p className="-mt-3 text-[13px] text-muted">
                    ¿Es tuya?{" "}
                    <Link
                      href={`/ingresar?email=${encodeURIComponent(values.email.trim())}`}
                      className="font-medium text-ink underline underline-offset-4"
                    >
                      Ingresá con tu cuenta
                    </Link>{" "}
                    o{" "}
                    <Link href="/recuperar" className="font-medium text-ink underline underline-offset-4">
                      recuperá tu contraseña
                    </Link>
                    .
                  </p>
                ) : null}

                <Field label="Contraseña" htmlFor={fieldId("password")} error={err("password")}>
                  <PasswordInput
                    id={fieldId("password")}
                    name="password"
                    autoComplete="new-password"
                    maxLength={72}
                    value={values.password}
                    onChange={(e) => set("password", e.target.value)}
                    aria-invalid={invalid("password")}
                    placeholder="Mínimo 8 caracteres"
                  />
                </Field>
                <PasswordStrength password={values.password} className="-mt-2" />

                <Field label="Teléfono" htmlFor={fieldId("phone")} error={err("phone")} optional>
                  <Input
                    id={fieldId("phone")}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={50}
                    value={values.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    aria-invalid={invalid("phone")}
                    placeholder="Ej.: 11 5555-1234"
                  />
                </Field>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Field label="Matrícula" htmlFor={fieldId("license_number")} error={err("license_number")}>
                    <Input
                      id={fieldId("license_number")}
                      name="license_number"
                      autoComplete="off"
                      maxLength={50}
                      value={values.license_number}
                      onChange={(e) => set("license_number", e.target.value)}
                      aria-invalid={invalid("license_number")}
                      placeholder="Ej.: 12345"
                    />
                  </Field>
                  <Field label="Tipo">
                    <SegmentedControl
                      aria-label="Tipo de matrícula"
                      className="h-12 w-full sm:w-auto [&>button]:flex-1 [&>button]:justify-center"
                      value={values.license_type}
                      onChange={(v) => set("license_type", v)}
                      options={[
                        { value: "nacional", label: "Nacional · MN" },
                        { value: "provincial", label: "Provincial · MP" },
                      ]}
                    />
                  </Field>
                </div>

                {values.license_type === "provincial" ? (
                  <div className="animate-fade-up">
                    <Field label="Provincia de la matrícula" htmlFor={fieldId("license_province")} error={err("license_province")}>
                      <Select
                        id={fieldId("license_province")}
                        name="license_province"
                        required
                        value={values.license_province}
                        onChange={(e) => set("license_province", e.target.value)}
                        aria-invalid={invalid("license_province")}
                      >
                        <option value="" disabled>
                          Elegí una provincia
                        </option>
                        {AR_PROVINCES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                ) : null}

                <Field
                  label="Especialidades"
                  optional
                  error={err("specialties")}
                  hint={
                    values.specialties.length > 0
                      ? `${values.specialties.length} ${values.specialties.length === 1 ? "elegida" : "elegidas"}`
                      : "Elegí todas las que apliquen."
                  }
                >
                  <ChipGroup
                    aria-label="Especialidades"
                    multiple
                    size="sm"
                    className="gap-1.5"
                    options={SPECIALTY_OPTIONS}
                    value={values.specialties}
                    onChange={(v) => set("specialties", v)}
                  />
                </Field>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div className="flex items-center gap-3.5 rounded-panel bg-surface-2 p-4">
                  <Avatar person={{ first_name: values.first_name, last_name: values.last_name }} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink">{fullName || "Sin nombre"}</p>
                    <p className="truncate text-[13px] text-muted">
                      {values.email.trim() || "Sin email"}
                      {values.license_number.trim()
                        ? ` · ${values.license_type === "provincial" ? "MP" : "MN"} ${values.license_number.trim()}`
                        : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" icon={<PencilLine />} onClick={() => goTo(1)} className="-mr-1">
                    Editar
                  </Button>
                </div>

                <Field
                  label="Nombre del consultorio o centro"
                  htmlFor={fieldId("clinic_name")}
                  error={err("clinic_name")}
                  optional
                >
                  <Input
                    id={fieldId("clinic_name")}
                    name="clinic_name"
                    autoComplete="organization"
                    maxLength={150}
                    value={values.clinic_name}
                    onChange={(e) => set("clinic_name", e.target.value)}
                    aria-invalid={invalid("clinic_name")}
                    placeholder="Ej.: Consultorio Kinesio Palermo"
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Ciudad" htmlFor={fieldId("city")} error={err("city")} optional>
                    <Input
                      id={fieldId("city")}
                      name="city"
                      autoComplete="address-level2"
                      maxLength={100}
                      value={values.city}
                      onChange={(e) => set("city", e.target.value)}
                      aria-invalid={invalid("city")}
                      placeholder="Ej.: Rosario"
                    />
                  </Field>
                  <Field label="Provincia" htmlFor={fieldId("province")} error={err("province")} optional>
                    <Select
                      id={fieldId("province")}
                      name="province"
                      value={values.province}
                      onChange={(e) => set("province", e.target.value)}
                      aria-invalid={invalid("province")}
                      className={cn(!values.province && "text-subtle")}
                    >
                      <option value="">Elegí una provincia</option>
                      {AR_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="flex flex-col gap-2">
                  <div
                    className={cn(
                      "rounded-panel bg-surface-2 p-4 transition-shadow",
                      errors.accept_terms && "shadow-[0_0_0_1.5px_var(--color-danger)]",
                    )}
                  >
                    <label htmlFor={fieldId("accept_terms")} className="flex cursor-pointer items-start gap-3">
                      <input
                        id={fieldId("accept_terms")}
                        type="checkbox"
                        name="accept_terms"
                        checked={values.accept_terms}
                        onChange={(e) => set("accept_terms", e.target.checked)}
                        aria-invalid={invalid("accept_terms")}
                        aria-describedby={errors.accept_terms ? `${fieldId("accept_terms")}-error` : "reg-legal-links"}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden
                        className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-surface text-transparent shadow-[inset_0_0_0_1.5px_var(--color-line-strong)] transition-colors peer-checked:bg-ink peer-checked:text-white peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
                      >
                        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="pt-0.5 text-[14px] leading-relaxed text-ink-2">
                        Leí y acepto los Términos y condiciones y la Política de privacidad.
                      </span>
                    </label>
                    <p
                      id="reg-legal-links"
                      className="mt-1 flex flex-wrap items-center gap-x-2 pl-9 text-[13px] leading-relaxed text-muted"
                    >
                      <span>Leer:</span>
                      <button
                        type="button"
                        onClick={() => openLegal("terms")}
                        className="inline-flex min-h-10 items-center font-medium text-ink underline underline-offset-4"
                      >
                        Términos y condiciones
                      </button>
                      <span aria-hidden>·</span>
                      <button
                        type="button"
                        onClick={() => openLegal("privacy")}
                        className="inline-flex min-h-10 items-center font-medium text-ink underline underline-offset-4"
                      >
                        Política de privacidad
                      </button>
                    </p>
                  </div>
                  {errors.accept_terms ? (
                    <p id={`${fieldId("accept_terms")}-error`} role="alert" className="text-[13px] text-danger">
                      {errors.accept_terms}
                    </p>
                  ) : null}
                </div>

                <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
                  <span>
                    Vas a registrar datos de salud de tus pacientes. En kine se tratan como información sensible y
                    confidencial, conforme a la Ley 25.326 de Protección de Datos Personales y la Ley 26.529 de Derechos del
                    Paciente: solo vos accedés a tus registros.
                  </span>
                </p>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          {step > 1 ? (
            <Button
              variant="secondary"
              size="icon-lg"
              aria-label="Paso anterior"
              onClick={() => goTo((step - 1) as Step)}
              disabled={isPending}
            >
              <ChevronLeft />
            </Button>
          ) : null}
          <SubmitButton
            size="lg"
            className="flex-1"
            pending={isPending}
            pendingLabel="Creando tu cuenta…"
            iconRight={<ArrowRight />}
          >
            {step < 3 ? "Continuar" : "Crear cuenta"}
          </SubmitButton>
        </div>
      </form>

      {legalMounted ? <LegalDialog doc={legal} onClose={() => setLegal(null)} /> : null}
    </AuthSplitLayout>
  );
}
