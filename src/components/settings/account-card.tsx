"use client";

import { Eye, EyeOff, FileText, KeyRound, LogOut, Mail, ShieldCheck } from "lucide-react";
import { startTransition, useActionState, useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { actionFailure } from "@/components/auth/action-guard";
import { CONTACT_EMAIL } from "@/components/auth/legal-contact";
import { passwordStrength } from "@/components/auth/password-rules";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { signOut } from "@/lib/actions/session";
import { initialActionState, type ActionState } from "@/lib/types";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/components/settings/limits";
import { SettingsSection } from "@/components/settings/settings-section";
import type { FormAction } from "@/components/settings/use-settings-form";

function PasswordInput({
  id,
  name,
  value,
  onChange,
  visible,
  autoComplete,
  invalid,
  describedBy,
  minLength,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
  minLength?: number;
}) {
  return (
    <Input
      id={id}
      name={name}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      autoCapitalize="none"
      spellCheck={false}
      minLength={minLength}
      maxLength={PASSWORD_MAX}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className="bg-surface shadow-inset hover:bg-surface"
    />
  );
}

/**
 * Cambio de contraseña: pide la actual (una sesión abierta sola no alcanza) y, al
 * guardar, el servidor cierra las sesiones de los demás dispositivos.
 */
function PasswordForm({ action }: { action: FormAction }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const strengthId = useId();

  const [, formAction, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    let result: ActionState;
    try {
      result = await action(prev, formData);
    } catch (error) {
      result = actionFailure(error);
    }
    setErrors(result.fieldErrors ?? {});
    if (result.ok) {
      setCurrent("");
      setPassword("");
      setConfirm("");
      setVisible(false);
      toast.success(result.message ?? "Contraseña actualizada.");
    } else {
      toast.error(result.message ?? "No pudimos actualizar la contraseña.");
      if (result.fieldErrors?.current_password) document.getElementById("current_password")?.focus();
      else if (result.fieldErrors?.password) document.getElementById("new_password")?.focus();
    }
    return result;
  }, initialActionState);

  const strength = passwordStrength(password);
  const mismatch = confirm.length > 0 && password.length > 0 && confirm !== password;
  const sameAsCurrent = password.length > 0 && password === current;
  const canSubmit = current.length > 0 && password.length >= PASSWORD_MIN && confirm === password && !sameAsCurrent;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !canSubmit) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-panel bg-surface-2 p-5 sm:p-6" aria-labelledby="password-form-title">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 id="password-form-title" className="flex items-center gap-2 text-[17px] font-medium text-ink">
            <KeyRound aria-hidden className="size-4" strokeWidth={1.8} />
            Cambiar contraseña
          </h3>
          <p className="mt-1 text-sm text-muted">
            Mínimo {PASSWORD_MIN} caracteres. Al guardarla, cerramos tu sesión en los demás dispositivos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Ocultar contraseñas" : "Mostrar contraseñas"}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-ink"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Contraseña actual"
          htmlFor="current_password"
          error={errors.current_password}
          hint="¿No la recordás? Cerrá sesión y entrá a “¿Olvidaste tu contraseña?”."
          className="sm:col-span-2"
        >
          <PasswordInput
            id="current_password"
            name="current_password"
            value={current}
            onChange={(v) => {
              setCurrent(v);
              if (errors.current_password) setErrors((e) => ({ ...e, current_password: undefined }));
            }}
            visible={visible}
            autoComplete="current-password"
            invalid={Boolean(errors.current_password)}
          />
        </Field>
        <Field
          label="Nueva contraseña"
          htmlFor="new_password"
          error={errors.password ?? (sameAsCurrent ? "Elegí una contraseña distinta de la actual." : undefined)}
        >
          <PasswordInput
            id="new_password"
            name="password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
            }}
            visible={visible}
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            invalid={Boolean(errors.password) || sameAsCurrent}
            describedBy={strengthId}
          />
        </Field>
        <Field
          label="Repetila"
          htmlFor="confirm_password"
          error={errors.confirm ?? (mismatch ? "Las contraseñas no coinciden." : undefined)}
        >
          <PasswordInput
            id="confirm_password"
            name="confirm"
            value={confirm}
            onChange={(v) => {
              setConfirm(v);
              if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
            }}
            visible={visible}
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            invalid={Boolean(errors.confirm) || mismatch}
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div id={strengthId} className="flex min-w-[180px] flex-1 items-center gap-3" aria-live="polite">
          <div aria-hidden className="flex w-28 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full bg-line-strong/70 transition-colors"
                style={password && i <= strength.score ? { backgroundColor: strength.color } : undefined}
              />
            ))}
          </div>
          <span className="text-[13px] text-muted">
            {password
              ? password.length < PASSWORD_MIN
                ? `Te faltan ${PASSWORD_MIN - password.length} ${PASSWORD_MIN - password.length === 1 ? "carácter" : "caracteres"}`
                : `Seguridad: ${strength.label.toLowerCase()}`
              : "Escribí una contraseña nueva"}
          </span>
        </div>
        <SubmitButton pending={pending} pendingLabel="Actualizando…" disabled={!canSubmit} className="h-11">
          Actualizar contraseña
        </SubmitButton>
      </div>
    </form>
  );
}

/** Cuenta: email de acceso, cambio de contraseña, tus datos y cierre de sesión. */
export function AccountCard({ email, changePasswordAction }: { email: string; changePasswordAction: FormAction }) {
  return (
    <SettingsSection
      id="cuenta"
      icon={<ShieldCheck strokeWidth={1.7} />}
      title="Cuenta"
      description="Tu acceso a kine y la seguridad de tus datos."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 rounded-panel bg-surface-2 p-5 sm:p-6">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-inset">
            <Mail aria-hidden className="size-5" strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink-2">Email de acceso</p>
            <p className="mt-0.5 truncate text-[16px] text-ink">{email || "—"}</p>
          </div>
          <span className="inline-flex h-7 items-center rounded-full bg-surface px-2.5 text-[13px] text-muted shadow-inset">
            No editable
          </span>
        </div>

        <PasswordForm action={changePasswordAction} />

        <div className="flex items-start gap-4 rounded-panel bg-surface-2 p-5 sm:p-6">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-inset">
            <FileText aria-hidden className="size-5" strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
            <h3 className="text-[15px] font-medium text-ink">Tus registros clínicos</h3>
            <p className="mt-1">
              Podés imprimir o guardar en PDF el informe de cada paciente desde su ficha. La historia clínica se conserva al
              menos 10 años (Ley 26.529, art. 18), aunque elimines un paciente o cierres tu cuenta.
            </p>
            <p className="mt-2">
              Para pedir una copia de todos tus registros o el cierre de tu cuenta, escribinos
              {CONTACT_EMAIL ? (
                <>
                  {" "}
                  a{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-ink underline underline-offset-4">
                    {CONTACT_EMAIL}
                  </a>
                </>
              ) : (
                " al soporte de kine"
              )}
              .
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel p-1 pt-3 sm:pt-4">
          <div className="min-w-0">
            <p className="font-medium text-ink">Cerrar sesión</p>
            <p className="mt-0.5 text-sm text-muted">Salí de kine en este dispositivo. Tus datos quedan guardados.</p>
          </div>
          <form action={signOut}>
            <SubmitButton variant="danger-soft" icon={<LogOut />} pendingLabel="Cerrando…">
              Cerrar sesión
            </SubmitButton>
          </form>
        </div>
      </div>
    </SettingsSection>
  );
}
