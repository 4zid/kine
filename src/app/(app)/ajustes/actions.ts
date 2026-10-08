"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionContext } from "@/lib/auth";
import { SPECIALTIES } from "@/lib/constants";
import type { ActionState, Professional } from "@/lib/types";
import { formList } from "@/lib/utils";
import { PASSWORD_MAX, PASSWORD_MIN, PROFESSIONAL_LIMITS as L } from "@/components/settings/limits";

// ---------------------------------------------------------------------------
// Esquemas (espejan los CHECK de public.professionals)
// ---------------------------------------------------------------------------
const tooLong = (max: number) => `Máximo ${max} caracteres.`;

/** Texto opcional: trim, vacío => null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, tooLong(max))
    .transform((v) => (v === "" ? null : v));

const requiredText = (max: number, emptyMessage: string) => z.string().trim().min(1, emptyMessage).max(max, tooLong(max));

const PHONE_RE = /^[0-9+()\-.\s]*$/;
const SPECIALTY_VALUES = SPECIALTIES.map((s) => s.value);

const profileSchema = z.object({
  first_name: requiredText(L.first_name, "Ingresá tu nombre."),
  last_name: requiredText(L.last_name, "Ingresá tu apellido."),
  phone: optionalText(L.phone).refine((v) => v == null || PHONE_RE.test(v), "Usá solo números, espacios y + ( ) -"),
  bio: optionalText(L.bio),
});

const professionalSchema = z.object({
  license_number: optionalText(L.license_number).refine(
    (v) => v == null || /^[\p{L}\p{N}\s./-]+$/u.test(v),
    "Usá solo letras, números, puntos o guiones.",
  ),
  license_type: z
    .enum(["nacional", "provincial", ""], { error: "Elegí nacional o provincial." })
    .transform((v) => (v === "" ? null : v)),
  license_province: optionalText(L.license_province),
  specialties: z
    .array(z.string().refine((v) => SPECIALTY_VALUES.includes(v), "Especialidad no válida."))
    .max(SPECIALTY_VALUES.length, "Elegí como máximo las especialidades de la lista.")
    .transform((list) => Array.from(new Set(list))),
});

const clinicSchema = z.object({
  clinic_name: optionalText(L.clinic_name),
  clinic_address: optionalText(L.clinic_address),
  city: optionalText(L.city),
  province: optionalText(L.province),
});

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN, `Usá al menos ${PASSWORD_MIN} caracteres.`)
      .max(PASSWORD_MAX, `Usá como máximo ${PASSWORD_MAX} caracteres.`),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], error: "Las contraseñas no coinciden." });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function fieldErrorsOf(error: z.ZodError): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const INVALID: ActionState = { ok: false, message: "Revisá los campos marcados." };

async function contextOrNull() {
  try {
    return await getActionContext();
  } catch {
    return null;
  }
}

type ProfessionalPatch = Partial<
  Pick<
    Professional,
    | "first_name"
    | "last_name"
    | "phone"
    | "bio"
    | "license_number"
    | "license_type"
    | "license_province"
    | "specialties"
    | "clinic_name"
    | "clinic_address"
    | "city"
    | "province"
  >
>;

/** Actualiza el perfil del profesional logueado (id = auth.uid(), nunca del cliente). */
async function saveProfessional(patch: ProfessionalPatch, successMessage: string): Promise<ActionState> {
  const ctx = await contextOrNull();
  if (!ctx) return { ok: false, message: "Tu sesión expiró. Volvé a ingresar." };
  const { supabase, userId } = ctx;

  const { data, error } = await supabase.from("professionals").update(patch).eq("id", userId).select("id").maybeSingle();

  if (error) {
    console.error("ajustes: update professionals", error.code, error.message);
    if (error.code === "23514") return { ok: false, message: "Algún dato supera el largo permitido. Revisalo y probá de nuevo." };
    if (error.code === "42501") return { ok: false, message: "No tenés permiso para modificar este perfil." };
    return { ok: false, message: "No pudimos guardar los cambios. Probá de nuevo en unos segundos." };
  }
  if (!data) return { ok: false, message: "No encontramos tu perfil. Volvé a ingresar." };

  // El nombre y la matrícula se muestran en la barra lateral y en los informes.
  revalidatePath("/", "layout");
  return { ok: true, message: successMessage };
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    first_name: text(formData, "first_name"),
    last_name: text(formData, "last_name"),
    phone: text(formData, "phone"),
    bio: text(formData, "bio"),
  });
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  return saveProfessional(parsed.data, "Perfil actualizado.");
}

export async function updateProfessionalData(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = professionalSchema.safeParse({
    license_number: text(formData, "license_number"),
    license_type: text(formData, "license_type"),
    license_province: text(formData, "license_province"),
    specialties: formList(formData, "specialties"),
  });
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  return saveProfessional(parsed.data, "Datos profesionales actualizados.");
}

export async function updateClinic(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = clinicSchema.safeParse({
    clinic_name: text(formData, "clinic_name"),
    clinic_address: text(formData, "clinic_address"),
    city: text(formData, "city"),
    province: text(formData, "province"),
  });
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsOf(parsed.error) };
  return saveProfessional(parsed.data, "Datos del consultorio actualizados.");
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordSchema.safeParse({
    password: text(formData, "password"),
    confirm: text(formData, "confirm"),
  });
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsOf(parsed.error) };

  const ctx = await contextOrNull();
  if (!ctx) return { ok: false, message: "Tu sesión expiró. Volvé a ingresar." };

  const { error } = await ctx.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("ajustes: updateUser password", error.code, error.message);
    switch (error.code) {
      case "same_password":
        return {
          ok: false,
          message: "La nueva contraseña tiene que ser distinta de la actual.",
          fieldErrors: { password: "Elegí una contraseña distinta de la actual." },
        };
      case "weak_password":
        return {
          ok: false,
          message: "La contraseña es muy débil.",
          fieldErrors: { password: "Probá con una más larga o que combine letras, números y símbolos." },
        };
      case "reauthentication_needed":
      case "session_expired":
      case "session_not_found":
        return { ok: false, message: "Por seguridad, volvé a ingresar y probá de nuevo." };
      case "over_request_rate_limit":
        return { ok: false, message: "Hiciste muchos intentos seguidos. Esperá un momento y probá de nuevo." };
      default:
        return { ok: false, message: "No pudimos actualizar la contraseña. Probá de nuevo." };
    }
  }

  return { ok: true, message: "Contraseña actualizada." };
}
