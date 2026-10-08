"use client";

import { Archive, ArchiveRestore, Eye, Pencil, RotateCcw, Trash2, UserCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setPatientStatus } from "@/app/(app)/pacientes/actions";
import { ActionMenu, type ActionMenuItem } from "@/components/patients/action-menu";
import { DeletePatientDialog } from "@/components/patients/delete-patient-dialog";
import type { PatientStatus } from "@/lib/types";
import { fullName } from "@/lib/utils";

export type PatientMenuTarget = {
  id: string;
  first_name: string;
  last_name: string;
  status: PatientStatus;
};

/**
 * Menú "…" de un paciente: ver ficha, editar, alta / reactivar, archivar / desarchivar y eliminar.
 * `context="list"` agrega "Ver ficha" y, al eliminar, vuelve al listado con los mismos filtros.
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
  const name = fullName(patient);
  const base = `/pacientes/${patient.id}`;

  const changeStatus = (status: PatientStatus) =>
    startTransition(async () => {
      const res = await setPatientStatus(patient.id, status);
      if (res.ok) toast.success(res.message ?? "Listo.");
      else toast.error(res.message ?? "No pudimos actualizar el estado.");
    });

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
        : [{ key: "unarchive", label: "Desarchivar", icon: <ArchiveRestore />, onSelect: () => changeStatus("active") }];

  const items: ActionMenuItem[] = [
    ...(context === "list" ? [{ key: "view", label: "Ver ficha", icon: <Eye />, href: base }] : []),
    { key: "edit", label: context === "list" ? "Editar" : "Editar datos", icon: <Pencil />, href: `${base}/editar` },
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
