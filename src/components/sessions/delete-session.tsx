"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { deleteSession } from "@/app/(app)/pacientes/[id]/sesiones/actions";

/** id del título de la pestaña Sesiones (ver sessions-overview). */
const SESSIONS_HEADING_ID = "sesiones-titulo";

/**
 * Confirmación para eliminar una sesión. `trigger` recibe `open()`.
 * Con `redirectTo`, navega allí después de borrar (p. ej. desde la pantalla de edición).
 * Sin `redirectTo` (desde la lista), la tarjeta desaparece: el foco pasa al título de la pestaña.
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
      description={`La sesión del ${dateLabel} y su registro SOAP dejan de verse en la ficha y no se puede deshacer. Por custodia legal, queda una copia en el registro de auditoría.`}
      confirmLabel="Eliminar sesión"
      successMessage="Sesión eliminada"
      onConfirm={async () => {
        try {
          const res = await deleteSession(patientId, sessionId);
          if (res.ok) {
            if (redirectTo) router.replace(redirectTo);
            else
              window.setTimeout(() => {
                document.getElementById(SESSIONS_HEADING_ID)?.focus();
              }, 80);
          }
          return res;
        } catch {
          return { ok: false, message: "No pudimos eliminar la sesión. Revisá tu conexión y probá de nuevo." };
        }
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
  className,
}: {
  patientId: string;
  sessionId: string;
  dateLabel: string;
  redirectTo: string;
  className?: string;
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
          size="icon"
          onClick={open}
          aria-label="Eliminar sesión"
          title="Eliminar sesión"
          className={cn("text-danger hover:bg-danger-50 focus-visible:outline-white", className)}
        >
          <Trash2 />
        </Button>
      )}
    />
  );
}
