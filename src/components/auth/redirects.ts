import { HOME_PATH, safeNextPath } from "@/lib/routes";

const INTERNAL_ORIGIN = "http://kine.internal";

/**
 * true si `path` es una ruta interna que el navegador resuelve dentro de este
 * mismo sitio. Parsea como lo hace el navegador (el parser WHATWG descarta
 * tabs y saltos de línea, así que "/\t/evil.com" sería "//evil.com").
 */
export function isInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 2048) return false;
  if (/[\u0000-\u001f\u007f\\]/.test(path)) return false;
  try {
    return new URL(path, INTERNAL_ORIGIN).origin === INTERNAL_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * `safeNextPath` + verificación estricta de origen (defensa en profundidad contra
 * open redirects en el login y en los links de email).
 */
export function internalNextPath(raw: string | null | undefined, fallback: string = HOME_PATH): string {
  const candidate = safeNextPath(raw, fallback);
  return isInternalPath(candidate) ? candidate : fallback;
}
