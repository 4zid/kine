/**
 * Cookie que recuerda que este navegador ya vio el recorrido / tiene cuenta.
 * La puede usar el proxy para mandar "/" directo a /ingresar en vez de /bienvenida.
 */
import { ONBOARDED_COOKIE } from "@/lib/routes";

export { ONBOARDED_COOKIE };
export const ONBOARDED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Marca la cookie desde el navegador (no es sensible: solo un flag de UX). */
export function markOnboardedClient() {
  try {
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${ONBOARDED_COOKIE}=1; path=/; max-age=${ONBOARDED_COOKIE_MAX_AGE}; samesite=lax${secure}`;
  } catch {
    // Cookies bloqueadas: no pasa nada, es solo una comodidad.
  }
}
