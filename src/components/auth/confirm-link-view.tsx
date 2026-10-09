import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { ResetAside, VerifyAside } from "@/components/auth/auth-asides";
import { AuthHeading, AuthSplitLayout, TopLink } from "@/components/auth/auth-split-layout";
import type { EmailLinkType } from "@/components/auth/email-link";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { HOME_PATH } from "@/lib/routes";

type FormServerAction = (formData: FormData) => Promise<void>;

const COPY: Record<
  EmailLinkType,
  { eyebrow: string; title: [string, string]; description: string; cta: string; pending: string }
> = {
  signup: {
    eyebrow: "Confirmar email",
    title: ["Un toque", "y empezamos."],
    description: "Confirmá tu email para activar tu cuenta y entrar a tu consultorio.",
    cta: "Confirmar email",
    pending: "Confirmando…",
  },
  email: {
    eyebrow: "Confirmar email",
    title: ["Un toque", "y empezamos."],
    description: "Confirmá tu email para activar tu cuenta y entrar a tu consultorio.",
    cta: "Confirmar email",
    pending: "Confirmando…",
  },
  recovery: {
    eyebrow: "Recuperar contraseña",
    title: ["Ya casi", "lo tenés."],
    description: "Tocá Continuar para validar el link y elegir una contraseña nueva.",
    cta: "Continuar",
    pending: "Validando…",
  },
  email_change: {
    eyebrow: "Cambio de email",
    title: ["Confirmá tu", "email nuevo."],
    description: "Tocá el botón para confirmar el cambio de email de tu cuenta.",
    cta: "Confirmar cambio",
    pending: "Confirmando…",
  },
};

function LinkFields({ tokenHash, type, next }: { tokenHash: string; type: EmailLinkType; next: string }) {
  return (
    <>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />
    </>
  );
}

/**
 * Pantalla intermedia de los links de email: la verificación se hace recién al
 * tocar el botón (POST). Si ya hay otra sesión abierta, pide cerrarla primero.
 */
export function ConfirmLinkView({
  type,
  tokenHash,
  next,
  signedInAs,
  confirmAction,
  signOutAction,
}: {
  type: EmailLinkType;
  tokenHash: string;
  next: string;
  /** Email de la sesión abierta en este navegador ("" si no se conoce), o null si no hay sesión. */
  signedInAs: string | null;
  confirmAction: FormServerAction;
  signOutAction: FormServerAction;
}) {
  const copy = COPY[type];

  return (
    <AuthSplitLayout
      aside={type === "recovery" ? <ResetAside /> : <VerifyAside />}
      topRight={
        signedInAs === null ? (
          <TopLink prompt="¿No pediste este email?" href="/ingresar">
            Ir a ingresar
          </TopLink>
        ) : undefined
      }
    >
      {signedInAs !== null ? (
        <div>
          <AuthHeading
            eyebrow="Sesión abierta"
            title={["Ya hay una", "sesión abierta."]}
            description={
              <>
                Estás usando kine
                {signedInAs ? (
                  <>
                    {" "}
                    como <strong className="font-medium break-words text-ink">{signedInAs}</strong>
                  </>
                ) : null}
                . Para usar este link, primero cerrá esa sesión: así nunca se mezclan los datos de dos cuentas.
              </>
            }
          />
          <form action={signOutAction} className="mt-8">
            <LinkFields tokenHash={tokenHash} type={type} next={next} />
            <SubmitButton size="lg" icon={<LogOut />} pendingLabel="Cerrando sesión…" className="w-full">
              Cerrar sesión y continuar
            </SubmitButton>
          </form>
          <ButtonLink href={HOME_PATH} variant="secondary" size="lg" className="mt-3 w-full">
            Seguir con mi sesión
          </ButtonLink>
        </div>
      ) : (
        <div>
          <AuthHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
          <form action={confirmAction} className="mt-8">
            <LinkFields tokenHash={tokenHash} type={type} next={next} />
            <SubmitButton size="lg" iconRight={<ArrowRight />} pendingLabel={copy.pending} className="w-full">
              {copy.cta}
            </SubmitButton>
          </form>
          <p className="mt-6 flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-500" />
            <span>Por seguridad, el link se usa recién cuando tocás el botón. Sirve una sola vez y por tiempo limitado.</span>
          </p>
        </div>
      )}
    </AuthSplitLayout>
  );
}
