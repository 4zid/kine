"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { signIn, type SignInResult } from "@/app/(auth)/ingresar/actions";
import { guardAction } from "@/components/auth/action-guard";
import { AuthHeading } from "@/components/auth/auth-split-layout";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { ResendButton } from "@/components/auth/resend-button";
import { signInSchema, toFieldErrors } from "@/components/auth/schemas";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/types";

export type LoginNotice = { tone: "success" | "warning" | "error"; title: string; text?: string } | null;

type Errors = Partial<Record<"email" | "password", string>>;

const initialState: ActionState<SignInResult> = { ok: false };
const submitSignIn = guardAction(signIn);

/** Formulario de ingreso (email + contraseña). */
export function LoginForm({
  next,
  defaultEmail = "",
  notice = null,
}: {
  /** Ruta interna a la que volver después de ingresar (ya saneada). */
  next: string;
  defaultEmail?: string;
  /** Aviso que llega por URL (email confirmado, link vencido…). */
  notice?: LoginNotice;
}) {
  const [state, formAction, isPending] = useActionState(submitSignIn, initialState);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [handledState, setHandledState] = useState(state);
  const [showNotice, setShowNotice] = useState(Boolean(notice));

  // Errores devueltos por el servidor (se guardan en estado para poder limpiarlos al editar).
  if (state !== handledState) {
    setHandledState(state);
    setErrors(state.fieldErrors ?? {});
    setShowNotice(false);
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      e.preventDefault();
      const fe = toFieldErrors(parsed.error) as Errors;
      setErrors(fe);
      const first = fe.email ? "login-email" : "login-password";
      document.getElementById(first)?.focus();
    }
  };

  const formMessage = !state.ok && !isPending && state.message ? state.message : null;
  const needsConfirmation = Boolean(state.data?.needsConfirmation);

  return (
    <div>
      <AuthHeading
        eyebrow="Ingresar"
        title={["Tu consultorio", "te espera."]}
        description="Ingresá con el email y la contraseña de tu cuenta."
      />

      <div className="mt-6 flex flex-col gap-3 empty:hidden">
        {showNotice && notice ? (
          <FormAlert tone={notice.tone} title={notice.title}>
            {notice.text}
          </FormAlert>
        ) : null}
        {formMessage ? (
          <FormAlert
            tone={needsConfirmation ? "warning" : "error"}
            title={needsConfirmation ? "Confirmá tu email" : undefined}
            action={
              needsConfirmation && state.data?.email ? (
                <ResendButton email={state.data.email} variant="inverse" className="h-10 shadow-inset" />
              ) : undefined
            }
          >
            {formMessage}
          </FormAlert>
        ) : null}
      </div>

      <form action={formAction} onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" htmlFor="login-email" error={errors.email}>
          <Input
            id="login-email"
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
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
            }}
            aria-invalid={errors.email ? true : undefined}
            placeholder="nombre@consultorio.com"
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <Field label="Contraseña" htmlFor="login-password" error={errors.password}>
            <PasswordInput
              id="login-password"
              name="password"
              autoComplete="current-password"
              maxLength={72}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
              aria-invalid={errors.password ? true : undefined}
              placeholder="Tu contraseña"
            />
          </Field>
          <Link
            href={email.trim() ? `/recuperar?email=${encodeURIComponent(email.trim())}` : "/recuperar"}
            className="inline-flex h-10 items-center self-end text-[13px] font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <SubmitButton size="lg" pending={isPending} pendingLabel="Ingresando…" iconRight={<ArrowRight />} className="mt-1 w-full">
          Ingresar
        </SubmitButton>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="font-medium text-ink underline-offset-4 hover:underline">
          Creá una
        </Link>
      </p>
    </div>
  );
}
