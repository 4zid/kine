"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  /** Elemento que abre el diálogo; recibe `open()`. */
  trigger: (open: () => void) => ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  /** Si se define, hay que escribir este texto para habilitar la confirmación. */
  confirmText?: string;
  /** Acción a ejecutar. Puede devolver { ok, message }. */
  onConfirm: () => Promise<{ ok: boolean; message?: string } | void>;
  successMessage?: string;
};

/** Diálogo de confirmación para acciones destructivas. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  confirmVariant = "danger",
  confirmText,
  onConfirm,
  successMessage,
}: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const blocked = Boolean(confirmText) && typed.trim() !== confirmText;

  const close = () => {
    if (pending) return;
    setOpen(false);
    setTyped("");
  };

  const run = () =>
    startTransition(async () => {
      try {
        const res = await onConfirm();
        if (res && !res.ok) {
          toast.error(res.message ?? "No se pudo completar la acción.");
          return;
        }
        if (successMessage) toast.success(successMessage);
        setOpen(false);
        setTyped("");
      } catch (err) {
        // redirect() de Next lanza un error especial: dejarlo pasar.
        if (err && typeof err === "object" && "digest" in err && String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        toast.error("No se pudo completar la acción.");
      }
    });

  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog
        open={open}
        onClose={close}
        size="sm"
        title={title}
        description={description}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={pending}>
              Cancelar
            </Button>
            <Button variant={confirmVariant} onClick={run} disabled={blocked || pending} icon={pending ? <Spinner /> : undefined}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        {confirmText ? (
          <div className="space-y-2">
            <p className="text-sm text-muted">
              Para confirmar, escribí <span className="font-semibold text-ink">{confirmText}</span>
            </p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} data-autofocus aria-label={`Escribí ${confirmText} para confirmar`} autoComplete="off" />
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
