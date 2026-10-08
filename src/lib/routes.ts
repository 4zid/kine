/** Rutas públicas (no requieren sesión). */
export const PUBLIC_PATHS = ["/bienvenida", "/registro", "/ingresar", "/recuperar", "/verificar", "/auth"];

/** Rutas de autenticación: si ya hay sesión, se redirige al inicio. */
export const AUTH_ONLY_PATHS = ["/bienvenida", "/registro", "/ingresar", "/recuperar"];

/** Cookie de UX: este navegador ya vio el recorrido o tiene cuenta (no es sensible). */
export const ONBOARDED_COOKIE = "kine_onboarded";

export const HOME_PATH = "/inicio";
export const LOGIN_PATH = "/ingresar";

export function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Evita open redirects: solo rutas internas absolutas. */
export function safeNextPath(raw: string | null | undefined, fallback: string = HOME_PATH): string {
  if (!raw) return fallback;
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : fallback;
}
