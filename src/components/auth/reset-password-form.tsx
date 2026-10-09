"use client";

import { ArrowRight } from "lucide-react";
import { useActionState, useState, type FormEvent } from "react";
import { restartRecovery, updatePassword, type ResetPasswordResult } from "@/app/(auth)/restablecer/actions";
import { guardAction } from "@/components/auth/action-guard";
import { AuthHeading } from "@/components/auth/auth-split-layout";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { resetPasswordSchema, toFieldErrors } from "@/components/auth/schemas";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/types";

type Errors = Partial<Record<"password" | "confirm", string>>;

const initialState: ActionState<ResetPasswordResult> = { ok: false };
const submitNewPassword = guardAction(updatePassword);

/** Formulario para elegir una contraseña nueva (después del link de recuperación). */
export function ResetPasswordForm({ email }: { email?: string | null }) {
  const [state, formAction, isPending] = useActionState(submitNewPassword, initialState);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [handledState, setHandledState] = useState(state);

  if (state !== handledState) {
    setHandledState(state);
    setErrors(state.fieldErrors ?? {});
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const parsed = resetPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      e.preventDefault();
      const fe = toFieldErrors(parsed.error) as Errors;
      setErrors(fe);
      document.getElementById(fe.password ? "reset-password" : "reset-confirm")?.focus();
    }
  };

  const linkExpired = !state.ok && Boolean(state.data?.linkExpired);

  return (
    <div>
      <AuthHeading
        eyebrow={
          email ? (
            <>
              Cuenta · <strong className="break-words">{email}</strong>
            </>
          ) : (
            "Nueva contraseña"
          )
        }
        title={["Elegí tu", "contraseña nueva."]}
        description="Usá al menos 8 caracteres. Después vas a entrar directo a tu consultorio."
      />

      {!state.ok && !isPending && state.message ? (
        <FormAlert
          className="mt-6"
          action={
            linkExpired ? (
              <form action={restartRecovery}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center text-sm font-medium text-ink underline underline-offset-4"
                >
                  Pedir un link nuevo
                </button>
              </form>
            ) : undefined
          }
        >
          {state.message}
        </FormAlert>
      ) : null}

      <form action={formAction} onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
        {/* Ayuda a los gestores de contraseñas a asociar la clave con la cuenta. */}
        {email ? <input type="email" name="username" autoComplete="username" value={email} readOnly hidden /> : null}

        <Field label="Contraseña nueva" htmlFor="reset-password" error={errors.password}>
          <PasswordInput
            id="reset-password"
            name="password"
            autoComplete="new-password"
            maxLength={72}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
            }}
            aria-invalid={errors.password ? true : undefined}
            placeholder="Mínimo 8 caracteres"
          />
        </Field>
        <PasswordStrength password={password} className="-mt-2" />

        <Field label="Repetí la contraseña" htmlFor="reset-confirm" error={errors.confirm}>
          <PasswordInput
            id="reset-confirm"
            name="confirm"
            autoComplete="new-password"
            maxLength={72}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
            }}
            aria-invalid={errors.confirm ? true : undefined}
            placeholder="La misma contraseña"
          />
        </Field>

        <SubmitButton size="lg" pending={isPending} pendingLabel="Guardando…" iconRight={<ArrowRight />} className="mt-1 w-full">
          Guardar e ingresar
        </SubmitButton>
      </form>
    </div>
  );
}
