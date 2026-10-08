"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { resendConfirmation } from "@/app/(auth)/verificar/actions";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const COOLDOWN_SECONDS = 60;

/**
 * Reenvía el email de confirmación con una espera entre envíos
 * (Supabase limita a un envío por minuto).
 */
export function ResendButton({
  email,
  initialCooldown = 0,
  variant = "secondary",
  className,
  onError,
}: {
  email: string;
  /** Segundos de espera iniciales (p. ej. justo después de registrarse). */
  initialCooldown?: number;
  variant?: ButtonVariant;
  className?: string;
  /** Errores de validación del email (cuando lo escribe el usuario). */
  onError?: (message: string) => void;
}) {
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const resend = () =>
    startTransition(async () => {
      try {
        const res = await resendConfirmation(email);
        if (res.ok) {
          toast.success(res.message ?? "Te reenviamos el email.");
          setCooldown(COOLDOWN_SECONDS);
        } else if (res.fieldErrors?.email) {
          onError?.(res.fieldErrors.email);
          if (!onError) toast.error(res.fieldErrors.email);
        } else {
          toast.error(res.message ?? "No pudimos reenviar el email.");
        }
      } catch {
        toast.error("No pudimos reenviar el email. Revisá tu conexión.");
      }
    });

  const waiting = cooldown > 0;
  return (
    <Button
      variant={variant}
      onClick={resend}
      disabled={pending || waiting}
      aria-busy={pending}
      icon={pending ? <Spinner /> : <RotateCw />}
      className={className}
    >
      {waiting ? (
        <span className="tabular">Reenviar en {cooldown} s</span>
      ) : pending ? (
        "Reenviando…"
      ) : (
        "Reenviar email"
      )}
    </Button>
  );
}
