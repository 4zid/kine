"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  confirmPagePath,
  defaultNextFor,
  isTokenHash,
  linkErrorPath,
  parseEmailLinkType,
  type EmailLinkType,
} from "@/components/auth/email-link";
import { markOnboardedServer } from "@/components/auth/onboarded-server";
import { internalNextPath } from "@/components/auth/redirects";
import { createClient } from "@/lib/supabase/server";

type EmailLink = { type: EmailLinkType; tokenHash: string; next: string };

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function readLink(fd: FormData): EmailLink | null {
  const type = parseEmailLinkType(text(fd, "type"));
  const tokenHash = text(fd, "token_hash");
  if (!type || !isTokenHash(tokenHash)) return null;
  return { type, tokenHash, next: internalNextPath(text(fd, "next"), defaultNextFor(type)) };
}

/**
 * Verifica el link de email (POST explícito desde la pantalla "Confirmar").
 * Si ya hay otra sesión abierta en este navegador no verifica: la pantalla pide
 * cerrarla primero, así un link ajeno no puede cambiar de cuenta en silencio.
 */
export async function confirmEmailLink(formData: FormData): Promise<void> {
  const link = readLink(formData);
  if (!link) redirect(linkErrorPath(parseEmailLinkType(text(formData, "type"))));

  let destination: string;
  let verified = false;
  try {
    const supabase = await createClient();
    const { data: current } = await supabase.auth.getClaims();
    const previousUserId = current?.claims?.sub ?? null;

    if (previousUserId && link.type !== "email_change") {
      destination = confirmPagePath(link);
    } else {
      const { data, error } = await supabase.auth.verifyOtp({ type: link.type, token_hash: link.tokenHash });
      if (error) {
        console.error("[auth/confirmar] verifyOtp", error.code, error.message);
        destination = linkErrorPath(link.type, error.code);
      } else if (previousUserId && data.user && data.user.id !== previousUserId) {
        // Cambio de email de otra cuenta: no dejamos abierta una sesión ajena.
        await supabase.auth.signOut({ scope: "local" });
        destination = "/ingresar?error=otra_cuenta";
      } else {
        destination = link.next;
        verified = true;
      }
    }
  } catch (err) {
    console.error("[auth/confirmar] error inesperado", err);
    destination = linkErrorPath(link.type);
  }

  if (verified) {
    await markOnboardedServer();
    revalidatePath("/", "layout");
  }
  redirect(destination);
}

/** Cierra la sesión abierta en este navegador y vuelve a la pantalla "Confirmar". */
export async function signOutAndContinue(formData: FormData): Promise<void> {
  const link = readLink(formData);
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    console.error("[auth/confirmar] signOut", err);
  }
  revalidatePath("/", "layout");
  redirect(link ? confirmPagePath(link) : "/ingresar");
}
