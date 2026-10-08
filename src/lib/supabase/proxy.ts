import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { AUTH_ONLY_PATHS, HOME_PATH, LOGIN_PATH, PUBLIC_PATHS, matchesPath } from "@/lib/routes";

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas privadas.
 * Se ejecuta desde src/proxy.ts (Next 16 reemplazó middleware por proxy).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let authHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
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

  if (pathname === "/") {
    return redirectTo(isAuthenticated ? HOME_PATH : "/bienvenida");
  }

  if (!isAuthenticated && !matchesPath(pathname, PUBLIC_PATHS)) {
    return redirectTo(LOGIN_PATH, { next: `${pathname}${search}` });
  }

  if (isAuthenticated && matchesPath(pathname, AUTH_ONLY_PATHS)) {
    return redirectTo(HOME_PATH);
  }

  return response;
}
