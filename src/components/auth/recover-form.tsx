"use client";

import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { useActionState, useState, type FormEvent } from "react";
import { requestPasswordReset, type RecoverResult } from "@/app/(auth)/recuperar/actions";
import { AuthHeading } from "@/components/auth/auth-split-layout";
import { FormAlert } from "@/components/auth/form-alert";
import { recoverSchema, toFieldErrors } from "@/components/auth/schemas";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/types";

const initialState: ActionState<RecoverResult> = { ok: false };

/** Pedido del link de recuperación + estado de "revisá tu email" (respuesta neutra). */
export function RecoverForm({ defaultEmail = "", linkError = false }: { defaultEmail?: string; linkError?: boolean }) {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | undefined>();
  const [handledState, setHandledState] = useState(state);
  const [dismissed, setDismissed] = useState<ActionState<RecoverResult> | null>(null);

  if (state !== handledState) {
    setHandledState(state);
    setError(state.fieldErrors?.email);
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const parsed = recoverSchema.safeParse({ email });
    if (!parsed.success) {
      e.preventDefault();
      setError(toFieldErrors(parsed.error).email);
      document.getElementById("recover-email")?.focus();
    }
  };

  const sent = state.ok && dismissed !== state;

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
          Abrí el link desde este mismo dispositivo. Si no lo ves en unos minutos, revisá la carpeta de spam o promociones.
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
        {linkError && !state.message ? (
          <FormAlert tone="warning" title="El link venció o ya fue usado.">
            Por seguridad, cada link sirve una sola vez y por tiempo limitado. Pedí uno nuevo.
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
        <SubmitButton size="lg" pending={isPending} pendingLabel="Enviando…" iconRight={<ArrowRight />} className="w-full">
          Enviar link
        </SubmitButton>
      </form>

    </div>
  );
}
