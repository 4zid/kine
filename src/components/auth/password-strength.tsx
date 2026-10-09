import { passwordStrength, PASSWORD_MIN } from "@/components/auth/password-rules";
import { cn } from "@/lib/utils";

/** Medidor de fortaleza de contraseña (4 segmentos + etiqueta). */
export function PasswordStrength({ password, className }: { password: string; className?: string }) {
  const { score, label, color } = passwordStrength(password);
  const tooShort = password.length > 0 && password.length < PASSWORD_MIN;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full bg-line-strong/70 transition-colors duration-300"
              style={i <= score ? { backgroundColor: color } : undefined}
            />
          ))}
        </div>
        <span className="min-w-[72px] text-right text-[13px] font-medium text-ink-2" aria-live="polite">
          {label ? <span className="sr-only">Seguridad de la contraseña: </span> : null}
          {label}
        </span>
      </div>
      <p className="text-[13px] text-muted">
        {tooShort
          ? `Te faltan ${PASSWORD_MIN - password.length} ${PASSWORD_MIN - password.length === 1 ? "carácter" : "caracteres"}.`
          : `Mínimo ${PASSWORD_MIN} caracteres. Sumá mayúsculas, números y símbolos para hacerla más segura.`}
      </p>
    </div>
  );
}
