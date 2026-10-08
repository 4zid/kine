"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteSession } from "@/app/(app)/pacientes/[id]/sesiones/actions";

/**
 * Confirmación para eliminar una sesión. `trigger` recibe `open()`.
 * Con `redirectTo`, navega allí después de borrar (p. ej. desde la pantalla de edición).
 */
export function DeleteSessionDialog({
  patientId,
  sessionId,
  dateLabel,
  redirectTo,
  trigger,
}: {
  patientId: string;
  sessionId: string;
  /** "jueves, 8 de octubre". */
  dateLabel: string;
  redirectTo?: string;
  trigger: (open: () => void) => ReactNode;
}) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={trigger}
      title="¿Eliminar esta sesión?"
      description={`Se va a borrar la sesión del ${dateLabel} con su registro SOAP. Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar sesión"
      successMessage="Sesión eliminada"
      onConfirm={async () => {
        const res = await deleteSession(patientId, sessionId);
        if (res.ok && redirectTo) router.replace(redirectTo);
        return res;
      }}
    />
  );
}

/** Botón redondo "Eliminar" para la pantalla de edición (vuelve al listado al borrar). */
export function DeleteSessionButton({
  patientId,
  sessionId,
  dateLabel,
  redirectTo,
}: {
  patientId: string;
  sessionId: string;
  dateLabel: string;
  redirectTo: string;
}) {
  return (
    <DeleteSessionDialog
      patientId={patientId}
      sessionId={sessionId}
      dateLabel={dateLabel}
      redirectTo={redirectTo}
      trigger={(open) => (
        <Button
          variant="secondary"
          size="icon-lg"
          onClick={open}
          aria-label="Eliminar sesión"
          title="Eliminar sesión"
          className="text-danger hover:bg-danger-50"
        >
          <Trash2 />
        </Button>
      )}
    />
  );
}
