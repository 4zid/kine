"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionContext } from "@/lib/auth";
import { SPECIALTIES } from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
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
    current_password: z
      .string()
      .min(1, "Ingresá tu contraseña actual.")
      .max(PASSWORD_MAX, "La contraseña es demasiado larga."),
    password: z
      .string()
      .min(PASSWORD_MIN, `Usá al menos ${PASSWORD_MIN} caracteres.`)
      .max(PASSWORD_MAX, `Usá como máximo ${PASSWORD_MAX} caracteres.`)
      .refine((v) => v.trim().length > 0, "La contraseña no puede ser solo espacios."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], error: "Las contraseñas no coinciden." })
  .refine((d) => d.password !== d.current_password, {
    path: ["password"],
    error: "Elegí una contraseña distinta de la actual.",
  });

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
const SESSION_EXPIRED: ActionState = { ok: false, message: "Tu sesión expiró. Volvé a ingresar para guardar." };
const UNEXPECTED: ActionState = { ok: false, message: "No pudimos guardar los cambios. Revisá tu conexión y probá de nuevo." };

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
  if (!ctx) return SESSION_EXPIRED;
  const { supabase, userId } = ctx;

  try {
    const { data, error } = await supabase.from("professionals").update(patch).eq("id", userId).select("id").maybeSingle();
    if (error) {
      console.error("ajustes: update professionals", error.code, error.message);
      if (error.code === "23514") return { ok: false, message: "Algún dato supera el largo permitido. Revisalo y probá de nuevo." };
      if (error.code === "42501") return { ok: false, message: "No tenés permiso para modificar este perfil." };
      return { ok: false, message: "No pudimos guardar los cambios. Probá de nuevo en unos segundos." };
    }
    if (!data) return { ok: false, message: "No encontramos tu perfil. Volvé a ingresar." };
  } catch (err) {
    console.error("ajustes: update professionals (inesperado)", err);
    return UNEXPECTED;
  }

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

/**
 * Cliente descartable (sin cookies ni persistencia) para comprobar la contraseña
 * actual sin tocar la sesión del navegador.
 */
function passwordVerifier() {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

type VerifyResult = "ok" | "wrong" | "rate_limited" | "error";

async function verifyCurrentPassword(email: string, password: string, userId: string): Promise<VerifyResult> {
  const verifier = passwordVerifier();
  const { data, error } = await verifier.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") return "wrong";
    if (error.code === "over_request_rate_limit" || error.status === 429) return "rate_limited";
    console.error("ajustes: verificar contraseña actual", error.code, error.message);
    return "error";
  }
  // Cerramos enseguida la sesión que abrió la verificación.
  const { error: signOutError } = await verifier.auth.signOut({ scope: "local" });
  if (signOutError) console.error("ajustes: cerrar sesión de verificación", signOutError.code, signOutError.message);
  return data.user?.id === userId ? "ok" : "wrong";
}

/**
 * Cambia la contraseña desde Ajustes: exige la contraseña actual (una cookie de
 * sesión sola no alcanza) y cierra las demás sesiones abiertas.
 */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordSchema.safeParse({
    current_password: text(formData, "current_password"),
    password: text(formData, "password"),
    confirm: text(formData, "confirm"),
  });
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsOf(parsed.error) };

  const ctx = await contextOrNull();
  if (!ctx) return SESSION_EXPIRED;

  try {
    const { data: claimsData } = await ctx.supabase.auth.getClaims();
    const email = claimsData?.claims?.email;
    if (typeof email !== "string" || !email) {
      return { ok: false, message: "No pudimos verificar tu cuenta. Volvé a ingresar y probá de nuevo." };
    }

    const verified = await verifyCurrentPassword(email, parsed.data.current_password, ctx.userId);
    if (verified === "wrong") {
      return {
        ok: false,
        message: "La contraseña actual no es correcta.",
        fieldErrors: { current_password: "La contraseña actual no es correcta." },
      };
    }
    if (verified === "rate_limited") {
      return { ok: false, message: "Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo." };
    }
    if (verified === "error") {
      return { ok: false, message: "No pudimos verificar tu contraseña actual. Probá de nuevo en unos minutos." };
    }

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

    // Cualquier otra sesión (otra computadora, un celular perdido) queda cerrada.
    const { error: othersError } = await ctx.supabase.auth.signOut({ scope: "others" });
    if (othersError) console.error("ajustes: signOut others", othersError.code, othersError.message);
  } catch (err) {
    console.error("ajustes: changePassword (inesperado)", err);
    return { ok: false, message: "No pudimos actualizar la contraseña. Revisá tu conexión y probá de nuevo." };
  }

  return { ok: true, message: "Contraseña actualizada. Cerramos tu sesión en los demás dispositivos." };
}
