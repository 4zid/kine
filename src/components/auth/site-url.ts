import "server-only";
import { headers } from "next/headers";

/** Primer valor de un header que puede venir como lista separada por comas (proxies encadenados). */
function firstValue(value: string | null): string | null {
  const v = value?.split(",")[0]?.trim();
  return v ? v : null;
}

function fallbackSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (env && /^https?:\/\//.test(env) ? env : "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Origen público del sitio a partir de los headers del request
 * (x-forwarded-proto + x-forwarded-host / host). Funciona en previews y producción
 * de Vercel. Si no hay headers utilizables, usa NEXT_PUBLIC_SITE_URL.
 *
 * Nota: los links de email igual quedan acotados por la lista de Redirect URLs
 * configurada en Supabase Auth, así que un Host manipulado no puede desviar el link.
 */
export function siteUrlFromHeaders(h: Headers): string {
  const host = firstValue(h.get("x-forwarded-host")) ?? firstValue(h.get("host"));
  if (!host || !/^(\[[0-9a-f:]+\]|[a-z0-9.-]+)(:\d+)?$/i.test(host)) return fallbackSiteUrl();

  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const forwardedProto = firstValue(h.get("x-forwarded-proto"));
  const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : isLocal ? "http" : "https";
  return `${proto}://${host}`;
}

/** Igual que `siteUrlFromHeaders` pero leyendo los headers del request actual (Server Actions / Components). */
export async function getSiteUrl(): Promise<string> {
  return siteUrlFromHeaders(await headers());
}
