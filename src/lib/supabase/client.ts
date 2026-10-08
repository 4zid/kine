import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { AUTH_COOKIE_OPTIONS, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, withSessionMaxAge } from "@/lib/supabase/config";

function readDocumentCookies(): { name: string; value: string }[] {
  if (typeof document === "undefined" || !document.cookie) return [];
  return document.cookie.split(/;\s*/).flatMap((pair) => {
    const i = pair.indexOf("=");
    if (i <= 0) return [];
    const name = pair.slice(0, i).trim();
    const raw = pair.slice(i + 1);
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      // valor no codificado: se usa tal cual
    }
    return [{ name, value }];
  });
}

function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.maxAge != null) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires instanceof Date) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  const sameSite = options.sameSite === true ? "strict" : options.sameSite;
  if (sameSite) parts.push(`SameSite=${String(sameSite).charAt(0).toUpperCase()}${String(sameSite).slice(1)}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Cliente de Supabase para Client Components (p. ej. subir archivos a Storage).
 * Escribe las cookies con las mismas opciones que el servidor (Secure, SameSite=Lax y
 * ventana de inactividad), en lugar de los 400 días por defecto de @supabase/ssr.
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return readDocumentCookies();
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return;
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = serializeCookie(name, value, withSessionMaxAge(options));
        });
      },
    },
  });
}
