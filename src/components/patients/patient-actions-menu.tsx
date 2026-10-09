"use client";

import { Archive, ArchiveRestore, Eye, Pencil, PersonStanding, Plus, RotateCcw, Trash2, UserCheck } from "lucide-react";
import { unstable_isUnrecognizedActionError, unstable_rethrow } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { setPatientStatus, unarchivePatient } from "@/app/(app)/pacientes/actions";
import { ActionMenu, type ActionMenuItem } from "@/components/patients/action-menu";
import { DeletePatientDialog } from "@/components/patients/delete-patient-dialog";
import type { ActionState, PatientStatus } from "@/lib/types";
import { fullName } from "@/lib/utils";

export type PatientMenuTarget = {
  id: string;
  first_name: string;
  last_name: string;
  status: PatientStatus;
};

/** Campo de búsqueda del listado: destino del foco si la fila desaparece tras un cambio de estado. */
const LIST_FOCUS_FALLBACK_ID = "patients-search";

/** Mensaje para una acción que falló sin respuesta (sin conexión, versión nueva desplegada…). */
export function actionFailureMessage(err: unknown, fallback: string): string {
  unstable_rethrow(err);
  return unstable_isUnrecognizedActionError(err)
    ? "Hay una versión nueva de kine. Recargá la página e intentá de nuevo."
    : fallback;
}

/**
 * Menú "…" de un paciente: ver ficha, accesos rápidos (nueva sesión, registrar dolor), editar,
 * alta / reactivar, archivar / desarchivar y eliminar.
 * `context="list"` agrega "Ver ficha" y los accesos rápidos y, al eliminar, vuelve al listado
 * con los mismos filtros. En la ficha esos accesos ya están en el encabezado.
 */
export function PatientActionsMenu({
  patient,
  context,
  variant,
  className,
}: {
  patient: PatientMenuTarget;
  context: "list" | "detail";
  variant?: "round" | "ghost";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [returnTo, setReturnTo] = useState<string | undefined>(undefined);
  /** Hay un cambio de estado iniciado con teclado en curso (para no perder el foco si la fila se va). */
  const keyboardActionRef = useRef(false);
  const name = fullName(patient);
  const base = `/pacientes/${patient.id}`;

  // En el listado, archivar o dar de alta puede sacar la fila de la vista actual: si el foco del
  // teclado estaba en su menú, llevarlo al buscador en lugar de dejarlo caer en <body>.
  useEffect(() => {
    const keyboardAction = keyboardActionRef;
    if (context !== "list") return;
    return () => {
      if (!keyboardAction.current) return;
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active && active !== document.body) return;
        document.getElementById(LIST_FOCUS_FALLBACK_ID)?.focus();
      });
    };
  }, [context]);

  const run = (task: () => Promise<ActionState>, fallback: string) => {
    keyboardActionRef.current = Boolean(document.activeElement?.matches(":focus-visible"));
    startTransition(async () => {
      try {
        const res = await task();
        if (res.ok) toast.success(res.message ?? "Listo.");
        else toast.error(res.message ?? fallback);
      } catch (err) {
        toast.error(actionFailureMessage(err, "No pudimos guardar el cambio. Revisá tu conexión e intentá de nuevo."));
      } finally {
        keyboardActionRef.current = false;
      }
    });
  };

  const changeStatus = (status: PatientStatus) =>
    run(() => setPatientStatus(patient.id, status), "No pudimos actualizar el estado.");
  const unarchive = () => run(() => unarchivePatient(patient.id), "No pudimos desarchivar al paciente.");

  const statusItems: ActionMenuItem[] =
    patient.status === "active"
      ? [
          { key: "discharge", label: "Dar de alta", icon: <UserCheck />, onSelect: () => changeStatus("discharged") },
          { key: "archive", label: "Archivar", icon: <Archive />, onSelect: () => changeStatus("archived") },
        ]
      : patient.status === "discharged"
        ? [
            { key: "reactivate", label: "Reactivar tratamiento", icon: <RotateCcw />, onSelect: () => changeStatus("active") },
            { key: "archive", label: "Archivar", icon: <Archive />, onSelect: () => changeStatus("archived") },
          ]
        : [{ key: "unarchive", label: "Desarchivar", icon: <ArchiveRestore />, onSelect: unarchive }];

  const quickItems: ActionMenuItem[] =
    context === "list"
      ? [
          { key: "view", label: "Ver ficha", icon: <Eye />, href: base },
          { key: "new-session", label: "Nueva sesión", icon: <Plus />, href: `${base}/sesiones/nueva` },
          { key: "pain", label: "Registrar dolor", icon: <PersonStanding />, href: `${base}/mapa` },
          { type: "separator", key: "sep-0" },
        ]
      : [];

  const items: ActionMenuItem[] = [
    ...quickItems,
    { key: "edit", label: "Editar datos", icon: <Pencil />, href: `${base}/editar` },
    { type: "separator", key: "sep-1" },
    ...statusItems,
    { type: "separator", key: "sep-2" },
    {
      key: "delete",
      label: "Eliminar",
      icon: <Trash2 />,
      tone: "danger",
      onSelect: () => {
        setReturnTo(context === "list" ? `${window.location.pathname}${window.location.search}` : undefined);
        setDeleteOpen(true);
      },
    },
  ];

  return (
    <>
      <ActionMenu items={items} label={`Acciones para ${name}`} pending={pending} variant={variant} className={className} />
      <DeletePatientDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        patient={patient}
        returnTo={returnTo}
        onArchiveInstead={
          patient.status === "archived"
            ? undefined
            : () => {
                setDeleteOpen(false);
                changeStatus("archived");
              }
        }
      />
    </>
  );
}
