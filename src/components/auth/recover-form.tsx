"use client";

import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { useActionState, useEffect, useState, type FormEvent } from "react";
import { requestPasswordReset, type RecoverResult } from "@/app/(auth)/recuperar/actions";
import { guardAction } from "@/components/auth/action-guard";
import { AuthHeading } from "@/components/auth/auth-split-layout";
import { FormAlert } from "@/components/auth/form-alert";
import { recoverSchema, toFieldErrors } from "@/components/auth/schemas";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/types";

const initialState: ActionState<RecoverResult> = { ok: false };
const submitRecover = guardAction(requestPasswordReset);

/** Espera entre pedidos (Supabase permite un email por minuto por dirección). */
const COOLDOWN_SECONDS = 60;

/** Motivo por el que el link de recuperación no funcionó (llega por ?error=). */
export type RecoverLinkError = "link" | "vencido" | "navegador";

const LINK_ERRORS: Record<RecoverLinkError, { title: string; text: string }> = {
  vencido: {
    title: "El link venció o ya fue usado.",
    text: "Por seguridad, cada link sirve una sola vez y por tiempo limitado. Pedí uno nuevo.",
  },
  navegador: {
    title: "No pudimos abrir el link en este navegador.",
    text: "El link funciona en el mismo navegador donde lo pediste. Si tu app de correo lo abrió en otro, copialo y pegalo en ese navegador, o pedí uno nuevo desde acá.",
  },
  link: {
    title: "No pudimos validar el link.",
    text: "Puede haber vencido o haberse abierto en otro navegador o dispositivo. Pedí uno nuevo y abrilo en este mismo navegador.",
  },
};

/** Pedido del link de recuperación + estado de "revisá tu email" (respuesta neutra). */
export function RecoverForm({
  defaultEmail = "",
  linkError = null,
}: {
  defaultEmail?: string;
  linkError?: RecoverLinkError | null;
}) {
  const [state, formAction, isPending] = useActionState(submitRecover, initialState);
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | undefined>();
  const [handledState, setHandledState] = useState(state);
  const [dismissed, setDismissed] = useState<ActionState<RecoverResult> | null>(null);
  const [cooldown, setCooldown] = useState(0);

  if (state !== handledState) {
    setHandledState(state);
    setError(state.fieldErrors?.email);
    // Después de un envío, evitamos pedidos repetidos seguidos.
    if (state.ok) setCooldown(COOLDOWN_SECONDS);
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (cooldown > 0) {
      e.preventDefault();
      return;
    }
    const parsed = recoverSchema.safeParse({ email });
    if (!parsed.success) {
      e.preventDefault();
      setError(toFieldErrors(parsed.error).email);
      document.getElementById("recover-email")?.focus();
    }
  };

  const sent = state.ok && dismissed !== state;
  const linkNotice = linkError ? LINK_ERRORS[linkError] : null;

  if (sent) {
    return (
      <div className="animate-fade-up">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MailCheck className="size-6" />
        </span>
        <AuthHeading
          className="mt-6"
          title={["Revisá tu", "bandeja de entrada."]}
          description={
            <>
              Si existe una cuenta con <strong className="font-medium break-words text-ink">{state.data?.email}</strong>, te
              enviamos un link para crear una contraseña nueva.
            </>
          }
        />
        <div className="mt-6 rounded-panel bg-surface-2 px-4 py-3.5 text-[14px] leading-relaxed text-ink-2">
          Abrí el link en este mismo navegador: si tu app de correo lo abre en otro, copialo y pegalo acá. Si no lo ves en
          unos minutos, revisá la carpeta de spam o promociones.
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/ingresar" size="lg" icon={<ArrowLeft />} className="sm:flex-1">
            Volver a ingresar
          </ButtonLink>
          <Button variant="secondary" size="lg" onClick={() => setDismissed(state)} className="sm:flex-1">
            Usar otro email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading
        eyebrow="Recuperar contraseña"
        title={["¿Olvidaste", "tu contraseña?"]}
        description="Escribí el email de tu cuenta y te mandamos un link para crear una nueva."
      />

      <div className="mt-6 flex flex-col gap-3 empty:hidden">
        {linkNotice && !state.message ? (
          <FormAlert tone="warning" title={linkNotice.title}>
            {linkNotice.text}
          </FormAlert>
        ) : null}
        {!state.ok && !isPending && state.message ? <FormAlert>{state.message}</FormAlert> : null}
      </div>

      <form action={formAction} onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
        <Field label="Email" htmlFor="recover-email" error={error}>
          <Input
            id="recover-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(undefined);
            }}
            aria-invalid={error ? true : undefined}
            placeholder="nombre@consultorio.com"
          />
        </Field>
        <SubmitButton
          size="lg"
          pending={isPending}
          pendingLabel="Enviando…"
          disabled={cooldown > 0}
          iconRight={cooldown > 0 ? undefined : <ArrowRight />}
          className="w-full"
        >
          {cooldown > 0 ? <span className="tabular">Podés pedir otro en {cooldown} s</span> : "Enviar link"}
        </SubmitButton>
      </form>
    </div>
  );
}
