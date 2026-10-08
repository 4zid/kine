"use client";

import { Archive, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { deletePatient } from "@/app/(app)/pacientes/actions";
import { fullName } from "@/lib/utils";

const normalize = (v: string) => v.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-AR");

function isRedirectError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "digest" in err &&
      String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT"),
  );
}

const CONSEQUENCES = [
  "La historia clínica completa",
  "Todas las sesiones y su evolución",
  "Los registros de dolor del mapa corporal",
  "Los estudios y archivos adjuntos",
];

/**
 * Confirmación de eliminación definitiva: hay que escribir el nombre completo del paciente.
 * Sugiere archivar como alternativa reversible.
 */
export function DeletePatientDialog({
  open,
  onClose,
  patient,
  returnTo,
  onArchiveInstead,
}: {
  open: boolean;
  onClose: () => void;
  patient: { id: string; first_name: string; last_name: string };
  /** Ruta del listado a la que volver (conserva filtros). Por defecto /pacientes. */
  returnTo?: string;
  /** Si se define, se ofrece "Archivar en su lugar". */
  onArchiveInstead?: () => void;
}) {
  const name = fullName(patient);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const matches = normalize(typed) === normalize(name);

  const close = () => {
    if (pending) return;
    setTyped("");
    onClose();
  };

  const run = () =>
    startTransition(async () => {
      try {
        const res = await deletePatient(patient.id, returnTo);
        if (res && !res.ok) toast.error(res.message ?? "No pudimos eliminar el paciente.");
      } catch (err) {
        if (isRedirectError(err)) {
          toast.success(`${name} se eliminó definitivamente.`);
          setTyped("");
          onClose();
          return;
        }
        toast.error("No pudimos eliminar el paciente. Probá de nuevo.");
      }
    });

  return (
    <Dialog
      open={open}
      onClose={close}
      size="sm"
      title="Eliminar paciente"
      description={`Vas a borrar a ${name} y toda su información. Esta acción no se puede deshacer.`}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={run}
            disabled={!matches || pending}
            icon={pending ? <Spinner /> : undefined}
          >
            Eliminar definitivamente
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-panel bg-danger-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-danger">
            <TriangleAlert className="size-4" aria-hidden />
            Se borra para siempre:
          </p>
          <ul className="mt-2 space-y-1 pl-6 text-sm text-ink-2">
            {CONSEQUENCES.map((c) => (
              <li key={c} className="list-disc marker:text-danger/60">
                {c}
              </li>
            ))}
          </ul>
        </div>

        {onArchiveInstead ? (
          <div className="flex flex-col gap-3 rounded-panel bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">¿Solo querés sacarlo de la lista?</span> Archivalo: queda guardado y
              lo recuperás cuando quieras.
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={<Archive />}
              disabled={pending}
              onClick={() => {
                setTyped("");
                onArchiveInstead();
              }}
            >
              Archivar
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor={`confirm-${patient.id}`} className="block text-sm text-muted">
            Para confirmar, escribí <span className="font-semibold text-ink">{name}</span>
          </label>
          <Input
            id={`confirm-${patient.id}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches && !pending) run();
            }}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            placeholder="Nombre y apellido"
          />
        </div>
      </div>
    </Dialog>
  );
}
