import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { AUTH_COOKIE_OPTIONS, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, withSessionMaxAge } from "@/lib/supabase/config";

/** Cliente de Supabase para Server Components, Server Actions y Route Handlers. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, withSessionMaxAge(options)));
          } catch {
            // Llamado desde un Server Component (cookies de solo lectura).
            // Es seguro: src/proxy.ts refresca la sesión en cada request.
          }
        },
      },
    },
  );
}
