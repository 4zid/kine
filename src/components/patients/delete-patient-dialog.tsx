"use client";

import { Archive, Scale, TriangleAlert } from "lucide-react";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
  "Los estudios y sus archivos adjuntos",
];

/**
 * Confirmación de eliminación definitiva: hay que escribir el nombre completo del paciente.
 * Recuerda el deber de conservar la historia clínica (Ley 26.529) y recomienda archivar.
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
  /** Si se define, se ofrece "Archivar" como alternativa recomendada. */
  onArchiveInstead?: () => void;
}) {
  const name = fullName(patient);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = normalize(typed) === normalize(name);
  const inputId = `confirm-${patient.id}`;

  // `autoFocus` no funciona dentro de <dialog> (React enfoca antes de showModal()): el Dialog
  // ya está abierto cuando corre este efecto (los efectos de los hijos corren antes).
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    if (pending) return;
    setTyped("");
    onClose();
  };

  const run = () =>
    startTransition(async () => {
      try {
        const res = await deletePatient(patient.id, returnTo);
        if (res && !res.ok) toast.error(res.message ?? "No pudimos eliminar al paciente.");
      } catch (err) {
        if (isRedirectError(err)) {
          toast.success(`${name} se eliminó.`);
          setTyped("");
          onClose();
          return;
        }
        toast.error(
          unstable_isUnrecognizedActionError(err)
            ? "Hay una versión nueva de kine. Recargá la página e intentá de nuevo."
            : "No pudimos eliminar al paciente. Revisá tu conexión e intentá de nuevo.",
        );
      }
    });

  return (
    <Dialog
      open={open}
      onClose={close}
      size="sm"
      title="Eliminar paciente"
      description={`Vas a eliminar a ${name} de kine. Esta acción no se puede deshacer.`}
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
        <div className="rounded-panel bg-warning-50 p-4 shadow-[inset_0_0_0_1px_rgb(183_121_31/0.18)]">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Scale className="size-4 shrink-0 text-warning" aria-hidden />
            La historia clínica se conserva al menos 10 años
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
            La Ley 26.529 (art. 18) te hace responsable de guardarla. Usá Eliminar solo para pacientes cargados por error;
            si ya no lo atendés, archivalo.
          </p>
        </div>

        {onArchiveInstead ? (
          <div className="flex flex-col gap-3 rounded-panel bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-2">
              <span className="font-medium text-ink">Recomendado: archivar.</span> Sale de tu lista y conserva toda su
              información. Lo podés desarchivar cuando quieras.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={<Archive />}
              disabled={pending}
              className="shrink-0"
              onClick={() => {
                setTyped("");
                onArchiveInstead();
              }}
            >
              Archivar
            </Button>
          </div>
        ) : null}

        <div className="rounded-panel bg-danger-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <TriangleAlert className="size-4 shrink-0 text-danger" aria-hidden />
            Si lo eliminás, desaparece de la app:
          </p>
          <ul className="mt-2 space-y-1 pl-6 text-sm text-ink-2">
            {CONSEQUENCES.map((c) => (
              <li key={c} className="list-disc marker:text-danger">
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            Para la custodia legal, kine guarda un registro de los datos clínicos eliminados en su auditoría. Los archivos
            adjuntos se borran para siempre.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor={inputId} className="block text-sm text-ink-2">
            Para confirmar, escribí <span className="font-semibold text-ink">{name}</span>
          </label>
          <Input
            ref={inputRef}
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches && !pending) run();
            }}
            autoComplete="off"
            spellCheck={false}
            data-autofocus
            placeholder="Nombre y apellido"
          />
        </div>
      </div>
    </Dialog>
  );
}
