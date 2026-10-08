import type { CookieOptions } from "@supabase/ssr";

/**
 * Configuración pública de Supabase.
 *
 * La URL y la publishable key son valores públicos por diseño (viajan al navegador);
 * la seguridad de los datos la garantizan las políticas RLS. Las variables de entorno
 * tienen prioridad; los valores por defecto evitan que un deploy sin variables
 * configuradas quede caído. Las previews deberían apuntar a otro proyecto (ver README).
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qniolsvnhxrzwzfqwnxd.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_ixZPNlpy_3Pobh4GY0GDYQ_WGn2TGTq";

/**
 * Vida máxima de las cookies de sesión sin actividad (12 h).
 *
 * Funciona como ventana de inactividad: cada vez que se renueva el token (≈ cada hora de uso)
 * las cookies se reescriben con esta duración. Si el navegador queda sin uso más de 12 h
 * (p. ej. la PC compartida del consultorio de un día para el otro), la sesión se cierra.
 * @supabase/ssr fija 400 días e ignora `maxAge` en `cookieOptions`, por eso se aplica en setAll.
 */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 12;

/** Opciones de las cookies de auth, idénticas en el servidor, el proxy y el navegador. */
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

/** Aplica la ventana de inactividad a una cookie que se escribe (las que se borran quedan igual). */
export function withSessionMaxAge(options: CookieOptions | undefined): CookieOptions {
  const merged: CookieOptions = { ...AUTH_COOKIE_OPTIONS, ...options };
  const removing = merged.maxAge === 0 || (merged.expires instanceof Date && merged.expires.getTime() <= Date.now());
  if (removing) return merged;
  delete merged.expires;
  return { ...merged, maxAge: AUTH_COOKIE_MAX_AGE };
}
