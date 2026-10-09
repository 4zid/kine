/**
 * Rutas públicas (no requieren sesión).
 * `/confirmar` es la pantalla intermedia de confirmación de enlaces de email (token_hash):
 * es pública pero no exclusiva de "sin sesión" (un cambio de email llega con sesión abierta).
 */
export const PUBLIC_PATHS = ["/bienvenida", "/registro", "/ingresar", "/recuperar", "/verificar", "/confirmar", "/auth"];

/** Rutas de autenticación: si ya hay sesión, se redirige al inicio. */
export const AUTH_ONLY_PATHS = ["/bienvenida", "/registro", "/ingresar", "/recuperar"];

/** Cookie de UX: este navegador ya vio el recorrido o tiene cuenta (no es sensible). */
export const ONBOARDED_COOKIE = "kine_onboarded";

export const HOME_PATH = "/inicio";
export const LOGIN_PATH = "/ingresar";

export function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Origen ficticio para resolver rutas relativas sin depender del host del request. */
const INTERNAL_ORIGIN = "http://internal.invalid";
const MAX_NEXT_LENGTH = 2048;
/** Caracteres de control (incluye tab, CR y LF, que el parser de URL descarta) y barras invertidas. */
const UNSAFE_CHARS = /[\u0000-\u001f\u007f\\]/;

/**
 * Evita open redirects: devuelve solo rutas internas absolutas ("/pacientes?x=1#y").
 *
 * No alcanza con mirar prefijos: el parser WHATWG elimina tabs/CR/LF antes de parsear, así que
 * "/\t/evil.com" pasaría un chequeo de "//" y terminaría en https://evil.com. Por eso se rechazan
 * los caracteres de control y las barras invertidas, y se parsea contra un origen ficticio para
 * comprobar que el destino no cambie de origen.
 */
export function safeNextPath(raw: string | null | undefined, fallback: string = HOME_PATH): string {
  if (!raw || raw.length > MAX_NEXT_LENGTH || !raw.startsWith("/") || UNSAFE_CHARS.test(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, INTERNAL_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== INTERNAL_ORIGIN) return fallback;
  const path = `${url.pathname}${url.search}${url.hash}`;
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
