"use client";

import { Eye, EyeOff, KeyRound, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { toast } from "sonner";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { signOut } from "@/lib/actions/session";
import { initialActionState, type ActionState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/components/settings/limits";
import { SettingsSection } from "@/components/settings/settings-section";
import type { FormAction } from "@/components/settings/use-settings-form";

const STRENGTH = [
  { label: "Muy débil", color: "bg-danger" },
  { label: "Débil", color: "bg-orange" },
  { label: "Aceptable", color: "bg-yellow" },
  { label: "Buena", color: "bg-green" },
  { label: "Muy buena", color: "bg-brand" },
] as const;

function strengthOf(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return pw.length < PASSWORD_MIN ? 0 : Math.min(score, 4);
}

function PasswordInput({
  id,
  name,
  value,
  onChange,
  visible,
  autoComplete,
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <Input
      id={id}
      name={name}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      autoCapitalize="none"
      spellCheck={false}
      minLength={PASSWORD_MIN}
      maxLength={PASSWORD_MAX}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className="bg-surface shadow-inset hover:bg-surface"
    />
  );
}

function PasswordForm({ action }: { action: FormAction }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const strengthId = useId();

  const [, formAction, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    setErrors(result.fieldErrors ?? {});
    if (result.ok) {
      setPassword("");
      setConfirm("");
      setVisible(false);
      toast.success(result.message ?? "Contraseña actualizada.");
    } else {
      toast.error(result.message ?? "No pudimos actualizar la contraseña.");
    }
    return result;
  }, initialActionState);

  const score = strengthOf(password);
  const mismatch = confirm.length > 0 && password.length > 0 && confirm !== password;
  const canSubmit = password.length >= PASSWORD_MIN && confirm === password;

  return (
    <form action={formAction} noValidate className="rounded-panel bg-surface-2 p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[17px] font-medium text-ink">
            <KeyRound aria-hidden className="size-4" strokeWidth={1.8} />
            Cambiar contraseña
          </h3>
          <p className="mt-1 text-sm text-muted">Mínimo {PASSWORD_MIN} caracteres. Mezclá letras, números y símbolos.</p>
        </div>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-ink"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nueva contraseña" htmlFor="new_password" error={errors.password}>
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
            invalid={Boolean(errors.password)}
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
                className={cn("h-1.5 flex-1 rounded-full transition-colors", password && i <= score ? STRENGTH[score].color : "bg-line-strong/70")}
              />
            ))}
          </div>
          <span className="text-[13px] text-muted">
            {password ? `Seguridad: ${STRENGTH[score].label.toLowerCase()}` : "Escribí una contraseña nueva"}
          </span>
        </div>
        <SubmitButton pending={pending} pendingLabel="Actualizando…" disabled={!canSubmit} className="h-11">
          Actualizar contraseña
        </SubmitButton>
      </div>
    </form>
  );
}

/** Cuenta: email de acceso, cambio de contraseña y cierre de sesión. */
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
            <Mail className="size-5" strokeWidth={1.7} />
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
