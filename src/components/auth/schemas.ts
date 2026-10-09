import { z } from "zod";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/components/auth/password-rules";
import { AR_PROVINCES, SPECIALTIES } from "@/lib/constants";

/**
 * Esquemas de validación de autenticación y registro.
 * Se comparten entre el cliente (validación por paso) y las Server Actions
 * (validación definitiva). Los límites espejan los CHECK de `public.professionals`.
 */

export { PASSWORD_MAX, PASSWORD_MIN, passwordStrength } from "@/components/auth/password-rules";

const SPECIALTY_VALUES = SPECIALTIES.map((s) => s.value);
const PROVINCES: readonly string[] = AR_PROVINCES;

/** Texto obligatorio con trim y largo máximo. */
const requiredText = (max: number, emptyMessage: string, maxMessage: string) =>
  z.string().trim().min(1, emptyMessage).max(max, maxMessage);

/** Texto opcional: trim, vacío => null. */
const optionalText = (max: number, maxMessage: string) =>
  z
    .string()
    .trim()
    .max(max, maxMessage)
    .transform((v) => (v === "" ? null : v));

const optionalProvince = z
  .string()
  .trim()
  .refine((v) => v === "" || PROVINCES.includes(v), "Elegí una provincia de la lista.")
  .transform((v) => (v === "" ? null : v));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Ingresá tu email.")
  .max(254, "El email es demasiado largo.")
  .pipe(z.email("Ingresá un email válido."));

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, `Usá al menos ${PASSWORD_MIN} caracteres.`)
  .max(PASSWORD_MAX, `Usá como máximo ${PASSWORD_MAX} caracteres.`)
  .refine((v) => v.trim().length > 0, "La contraseña no puede ser solo espacios.");

// ---------------------------------------------------------------------------
// Registro (3 pasos)
// ---------------------------------------------------------------------------
export const registerStep1Schema = z.object({
  first_name: requiredText(100, "Ingresá tu nombre.", "Máximo 100 caracteres."),
  last_name: requiredText(100, "Ingresá tu apellido.", "Máximo 100 caracteres."),
  email: emailSchema,
  password: newPasswordSchema,
  phone: optionalText(50, "Máximo 50 caracteres.").refine(
    (v) => v === null || /^[0-9+()\-.\s]{6,50}$/.test(v),
    "Usá solo números, espacios y + ( ) -.",
  ),
});

export const registerStep2Schema = z.object({
  license_number: requiredText(50, "Ingresá tu número de matrícula.", "Máximo 50 caracteres."),
  license_type: z.enum(["nacional", "provincial"], "Elegí el tipo de matrícula."),
  license_province: optionalProvince,
  specialties: z
    .array(z.string())
    .max(SPECIALTY_VALUES.length, "Elegiste demasiadas especialidades.")
    .refine((list) => list.every((s) => SPECIALTY_VALUES.includes(s)), "Hay una especialidad inválida.")
    .transform((list) => Array.from(new Set(list))),
});

export const registerStep3Schema = z.object({
  clinic_name: optionalText(150, "Máximo 150 caracteres."),
  city: optionalText(100, "Máximo 100 caracteres."),
  province: optionalProvince,
  accept_terms: z.literal(true, "Para crear tu cuenta tenés que aceptar los términos y la política de privacidad."),
});

/** Regla cruzada: la provincia es obligatoria si la matrícula es provincial. */
function licenseProvinceRule(
  data: { license_type: "nacional" | "provincial"; license_province: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.license_type === "provincial" && !data.license_province) {
    ctx.addIssue({
      code: "custom",
      path: ["license_province"],
      message: "Elegí la provincia que emitió tu matrícula.",
    });
  }
}

export const registerStep2RefinedSchema = registerStep2Schema.superRefine(licenseProvinceRule);

export const signUpSchema = z
  .object({
    ...registerStep1Schema.shape,
    ...registerStep2Schema.shape,
    ...registerStep3Schema.shape,
  })
  .superRefine(licenseProvinceRule)
  .transform((data) => ({
    ...data,
    // Con matrícula nacional no se guarda provincia de matrícula.
    license_province: data.license_type === "provincial" ? data.license_province : null,
  }));

export type SignUpInput = z.output<typeof signUpSchema>;

/** Campos del formulario de registro (valores crudos del cliente). */
export type RegisterValues = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  license_number: string;
  license_type: "nacional" | "provincial";
  license_province: string;
  specialties: string[];
  clinic_name: string;
  city: string;
  province: string;
  accept_terms: boolean;
};

export type RegisterField = keyof RegisterValues;

/** Paso del formulario en el que vive cada campo (para saltar al primer error). */
export const REGISTER_FIELD_STEP: Record<RegisterField, 1 | 2 | 3> = {
  first_name: 1,
  last_name: 1,
  email: 1,
  password: 1,
  phone: 1,
  license_number: 2,
  license_type: 2,
  license_province: 2,
  specialties: 2,
  clinic_name: 3,
  city: 3,
  province: 3,
  accept_terms: 3,
};

// ---------------------------------------------------------------------------
// Ingreso / recuperación
// ---------------------------------------------------------------------------
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña.").max(PASSWORD_MAX, "La contraseña es demasiado larga."),
});

export const recoverSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirm: z.string().min(1, "Repetí la contraseña."),
  })
  .superRefine((data, ctx) => {
    if (data.confirm && data.password !== data.confirm) {
      ctx.addIssue({ code: "custom", path: ["confirm"], message: "Las contraseñas no coinciden." });
    }
  });

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
/** Convierte un ZodError en { campo: primer mensaje }. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
