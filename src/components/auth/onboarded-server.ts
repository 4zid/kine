import "server-only";
import { cookies } from "next/headers";
import { ONBOARDED_COOKIE, ONBOARDED_COOKIE_MAX_AGE } from "@/components/onboarding/onboarded-cookie";

/** Marca (desde el servidor) que este navegador ya tiene cuenta / vio el recorrido. */
export async function markOnboardedServer() {
  try {
    const store = await cookies();
    store.set(ONBOARDED_COOKIE, "1", {
      path: "/",
      maxAge: ONBOARDED_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });
  } catch {
    // Es solo un flag de UX: si no se puede escribir, no bloquea el flujo.
  }
}
