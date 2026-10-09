import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { AUTH_COOKIE_OPTIONS, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, withSessionMaxAge } from "@/lib/supabase/config";
import { AUTH_ONLY_PATHS, HOME_PATH, LOGIN_PATH, ONBOARDED_COOKIE, PUBLIC_PATHS, matchesPath } from "@/lib/routes";

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas privadas.
 * Se ejecuta desde src/proxy.ts (Next 16 reemplazó middleware por proxy).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let authHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, withSessionMaxAge(options)));
          authHeaders = headers;
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // No poner código entre createServerClient() y getClaims().
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;

  const redirectTo = (pathnameTo: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathnameTo;
    url.search = params ? `?${new URLSearchParams(params).toString()}` : "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    Object.entries(authHeaders).forEach(([k, v]) => redirect.headers.set(k, v));
    return redirect;
  };

  // Vistas previas locales de componentes con datos de ejemplo (src/app/dev, ignorado por git).
  if (process.env.NODE_ENV !== "production" && matchesPath(pathname, ["/dev"])) {
    return response;
  }

  // Server Actions (POST con header `Next-Action`): nunca redirigir. Un 307 al login haría que la
  // promesa de la acción se rechace en el cliente y el error.tsx desmonte el formulario (se pierde
  // lo escrito). Cada acción verifica la sesión y devuelve "Tu sesión expiró" como ActionState.
  if (request.method === "POST" && request.headers.has("next-action")) {
    return response;
  }

  if (pathname === "/") {
    if (isAuthenticated) return redirectTo(HOME_PATH);
    return redirectTo(request.cookies.has(ONBOARDED_COOKIE) ? LOGIN_PATH : "/bienvenida");
  }

  if (!isAuthenticated && !matchesPath(pathname, PUBLIC_PATHS)) {
    return redirectTo(LOGIN_PATH, { next: `${pathname}${search}` });
  }

  if (isAuthenticated && matchesPath(pathname, AUTH_ONLY_PATHS)) {
    return redirectTo(HOME_PATH);
  }

  return response;
}
