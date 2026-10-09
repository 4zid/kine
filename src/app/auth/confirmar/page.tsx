import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfirmLinkView } from "@/components/auth/confirm-link-view";
import { defaultNextFor, isTokenHash, linkErrorPath, parseEmailLinkType } from "@/components/auth/email-link";
import { internalNextPath } from "@/components/auth/redirects";
import { firstParam } from "@/components/auth/search-params";
import { getClaims } from "@/lib/auth";
import { confirmEmailLink, signOutAndContinue } from "./actions";

export const metadata: Metadata = {
  title: "Confirmar",
  description: "Confirmá el link que te enviamos por email.",
  // La URL lleva el token: que no viaje en el Referer.
  referrer: "no-referrer",
};

/**
 * Pantalla intermedia de los links de email (`/auth/confirm` redirige acá).
 * La verificación se hace recién al tocar el botón (POST), nunca al abrir el link.
 */
export default async function ConfirmarPage({ searchParams }: PageProps<"/auth/confirmar">) {
  const sp = await searchParams;
  const type = parseEmailLinkType(firstParam(sp.type));
  const tokenHash = firstParam(sp.token_hash);
  if (!type || !isTokenHash(tokenHash)) redirect(linkErrorPath(type));
  const next = internalNextPath(firstParam(sp.next), defaultNextFor(type));

  // El cambio de email se confirma con la sesión abierta (el servidor verifica que sea la misma cuenta).
  const claims = await getClaims();
  const signedInAs =
    claims?.sub && type !== "email_change" ? (typeof claims.email === "string" ? claims.email : "") : null;

  return (
    <ConfirmLinkView
      type={type}
      tokenHash={tokenHash}
      next={next}
      signedInAs={signedInAs}
      confirmAction={confirmEmailLink}
      signOutAction={signOutAndContinue}
    />
  );
}
