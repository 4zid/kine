"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthHeading } from "@/components/auth/auth-split-layout";
import { ResendButton } from "@/components/auth/resend-button";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/** Pantalla "Revisá tu email" después de registrarse, con reenvío del link. */
export function VerifyEmailPanel({ email }: { email: string }) {
  const [typedEmail, setTypedEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const target = email || typedEmail.trim();

  return (
    <div>
      <div className="relative inline-flex">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Mail className="size-7" strokeWidth={1.7} />
        </span>
        <span aria-hidden className="absolute -top-0.5 -right-0.5 flex size-4">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500" />
          <span className="relative size-4 rounded-full border-2 border-surface bg-brand-500" />
        </span>
      </div>

      <AuthHeading
        className="mt-6"
        eyebrow={
          <>
            Último paso · <strong>Confirmá tu email</strong>
          </>
        }
        title={["Revisá tu", "bandeja de entrada."]}
        description={
          email ? (
            <>
              Te enviamos un link de confirmación a <strong className="font-medium break-words text-ink">{email}</strong>.
              Abrilo para activar tu cuenta y entrar a kine.
            </>
          ) : (
            "Te enviamos un link de confirmación a tu email. Abrilo para activar tu cuenta y entrar a kine."
          )
        }
      />

      <ol className="mt-8 space-y-3 rounded-panel bg-surface-2 p-5 text-[14px] leading-relaxed text-ink-2">
        {[
          "Abrí el email que te mandamos desde kine.",
          "Tocá “Confirmar email”. Si podés, hacelo desde este mismo dispositivo.",
          "¿No llegó? Revisá spam o promociones, o pedí que te lo reenviemos.",
        ].map((item, i) => (
          <li key={item} className="flex gap-3">
            <span className="display inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-[12px] font-semibold text-ink shadow-inset">
              {i + 1}
            </span>
            <span className="pt-0.5">{item}</span>
          </li>
        ))}
      </ol>

      {!email ? (
        <Field label="Tu email" htmlFor="verify-email" error={error} className="mt-6">
          <Input
            id="verify-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            value={typedEmail}
            onChange={(e) => {
              setTypedEmail(e.target.value);
              if (error) setError(undefined);
            }}
            aria-invalid={error ? true : undefined}
            placeholder="nombre@consultorio.com"
          />
        </Field>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/ingresar" size="lg" icon={<ArrowLeft />} className="sm:flex-1">
          Ir a ingresar
        </ButtonLink>
        <ResendButton
          email={target}
          initialCooldown={email ? 45 : 0}
          onError={setError}
          className="h-14 px-7 text-[15px] sm:flex-1"
        />
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        ¿Te equivocaste de email?{" "}
        <Link href="/registro" className="font-medium text-ink underline-offset-4 hover:underline">
          Registrate de nuevo
        </Link>
      </p>
    </div>
  );
}
