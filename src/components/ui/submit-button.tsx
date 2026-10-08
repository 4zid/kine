"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = ComponentProps<typeof Button> & {
  /** Texto mientras se envía (opcional). */
  pendingLabel?: string;
  /** Forzar estado de carga (p. ej. con isPending de useActionState). */
  pending?: boolean;
};

/** Botón de envío que muestra un spinner mientras el <form> padre se está enviando. */
export function SubmitButton({ children, pendingLabel, pending: pendingProp, disabled, icon, iconRight, ...props }: Props) {
  const { pending: formPending } = useFormStatus();
  const pending = pendingProp ?? formPending;
  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      icon={pending ? <Spinner /> : icon}
      iconRight={pending ? undefined : iconRight}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
