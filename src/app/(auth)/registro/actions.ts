"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mapAuthError, NETWORK_MESSAGE } from "@/components/auth/auth-errors";
import { markOnboardedServer } from "@/components/auth/onboarded-server";
import { signUpSchema, toFieldErrors } from "@/components/auth/schemas";
import { getSiteUrl } from "@/components/auth/site-url";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export type SignUpResult = { emailTaken?: boolean };

const EMAIL_TAKEN = "Ya existe una cuenta con este email.";
const FALLBACK = "No pudimos crear tu cuenta. Probá de nuevo en unos minutos.";

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/**
 * Crea la cuenta del kinesiólogo. El perfil (`public.professionals`) lo crea un
 * trigger de la base a partir de `options.data` (las claves deben coincidir).
 */
export async function signUp(_prev: ActionState<SignUpResult>, formData: FormData): Promise<ActionState<SignUpResult>> {
  const parsed = signUpSchema.safeParse({
    first_name: text(formData, "first_name"),
    last_name: text(formData, "last_name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    phone: text(formData, "phone"),
    license_number: text(formData, "license_number"),
    license_type: text(formData, "license_type"),
    license_province: text(formData, "license_province"),
    specialties: formData.getAll("specialties").filter((v): v is string => typeof v === "string"),
    clinic_name: text(formData, "clinic_name"),
    city: text(formData, "city"),
    province: text(formData, "province"),
    accept_terms: ["on", "true", "1"].includes(text(formData, "accept_terms")),
  });

  if (!parsed.success) {
    return { ok: false, message: "Revisá los datos marcados.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const next = encodeURIComponent("/inicio?bienvenida=1");

  let result: Awaited<ReturnType<typeof supabase.auth.signUp>>;
  try {
    result = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          first_name: input.first_name,
          last_name: input.last_name,
          phone: input.phone,
          license_number: input.license_number,
          license_type: input.license_type,
          license_province: input.license_province,
          specialties: input.specialties,
          clinic_name: input.clinic_name,
          city: input.city,
          province: input.province,
        },
        emailRedirectTo: `${siteUrl}/auth/callback?next=${next}`,
      },
    });
  } catch (err) {
    console.error("[signUp] error inesperado", err);
    return { ok: false, message: NETWORK_MESSAGE };
  }

  const { data, error } = result;

  if (error) {
    const mapped = mapAuthError(error, FALLBACK);
    if (mapped.field) {
      return {
        ok: false,
        fieldErrors: { [mapped.field]: mapped.message },
        data: { emailTaken: mapped.message === EMAIL_TAKEN },
      };
    }
    if (mapped.message === FALLBACK) console.error("[signUp]", error.code, error.message);
    return { ok: false, message: mapped.message };
  }

  // Con confirmación de email activa, Supabase no revela si el email ya existe:
  // devuelve un usuario sin identidades.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, fieldErrors: { email: EMAIL_TAKEN }, data: { emailTaken: true } };
  }

  await markOnboardedServer();

  if (data.session) {
    // Confirmación de email desactivada: ya hay sesión.
    revalidatePath("/", "layout");
    redirect("/inicio?bienvenida=1");
  }

  redirect(`/verificar?email=${encodeURIComponent(input.email)}`);
}
