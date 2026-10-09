"use client";

import { Check, Clock, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { toast } from "sonner";
import { Badge, PainBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { REGION_GROUPS, type BodyRegion } from "@/lib/body-regions";
import { PAIN_STATUS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { actionErrorMessage } from "./action-error";
import { PainHistory } from "./pain-history";
import { PainRecordForm } from "./pain-record-form";
import { asPainStatus, isActivePain, isStale, recordDay, relativeDay, STALE_DAYS, type RegionState } from "./pain-state";
import type { BodyMapActions, PainRecordItem, SessionOption } from "./types";

export const VIEW_NAMES = { front: "Frente", back: "Espalda" } as const;

type Props = {
  patientId: string;
  region: BodyRegion;
  state: RegionState | undefined;
  /** Registros de la zona, ascendentes. */
  history: PainRecordItem[];
  /** Sesiones que se pueden vincular (realizadas, hasta hoy). */
  sessions: SessionOption[];
  /** Sesiones vinculadas a registros que no están entre `sessions` (para nombrarlas). */
  linkedSessions?: SessionOption[];
  /** Sesión preseleccionada al registrar (la de hoy o la de ?sesion=). */
  defaultSessionId?: string | null;
  today: string;
  point: [number, number] | null;
  onClearPoint: () => void;
  actions: BodyMapActions;
  onSaved: (record: PainRecordItem) => void;
  onDeleted: (recordId: string) => void;
  onClose: () => void;
  layout: "inline" | "sheet";
  /** Mueve el foco al título al abrir (selección con teclado o desde la lista). */
  autoFocus?: boolean;
};

/** Mueve el foco a `ref` cuando React terminó de pintar (el elemento enfocado pudo desaparecer). */
function focusSoon(ref: RefObject<HTMLElement | null>) {
  requestAnimationFrame(() => ref.current?.focus({ preventScroll: false }));
}

/** Panel de una zona: estado actual, formulario "Registrar dolor" e historial (con edición). */
export function RegionPanel(props: Props) {
  const {
    patientId,
    region,
    state,
    history,
    sessions,
    linkedSessions = [],
    defaultSessionId = null,
    today,
    point,
    onClearPoint,
    actions,
    onSaved,
    onDeleted,
    onClose,
    layout,
    autoFocus = false,
  } = props;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLHeadingElement>(null);
  const [editing, setEditing] = useState<PainRecordItem | null>(null);

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const latest = state?.latest ?? null;
  // El formulario se rearma con cada registro nuevo (o corregido) de la zona.
  const formKey = `${region.id}:${latest ? `${latest.id}:${latest.intensity}:${latest.status}:${latest.recorded_at}` : "none"}`;
  const sub = layout === "sheet" ? "h3" : "h4";
  const SubHeading = sub;

  // Tras guardar o resolver, el botón usado desaparece: el foco pasa al estado actualizado de la zona.
  const saved = (record: PainRecordItem) => {
    onSaved(record);
    focusSoon(statusRef);
  };

  const remove = async (recordId: string) => {
    const res = await actions.remove(recordId, patientId);
    if (res.ok) {
      onDeleted(recordId);
      focusSoon(historyRef);
    }
    return res;
  };

  const form = (
    <PainRecordForm
      key={formKey}
      patientId={patientId}
      region={region}
      latest={latest}
      point={point}
      onClearPoint={onClearPoint}
      sessions={sessions}
      linkedSessions={linkedSessions}
      defaultSessionId={defaultSessionId}
      today={today}
      action={actions.create}
      onSaved={saved}
      inSheet={layout === "sheet"}
    />
  );

  const status = (
    <div ref={statusRef} tabIndex={-1} className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4">
      <StatusRow
        latest={latest}
        today={today}
        onResolve={async () => {
          try {
            const res = await actions.resolve(patientId, region.id, defaultSessionId);
            if (res.ok && res.data?.record) {
              toast.success(res.message ?? "Zona marcada como resuelta");
              saved(res.data.record);
            } else {
              toast.error(res.message ?? "No pudimos actualizar la zona.");
            }
          } catch (error) {
            toast.error(actionErrorMessage(error, "No pudimos actualizar la zona. Revisá tu conexión e intentá de nuevo."));
          }
        }}
      />
    </div>
  );

  const historySection = (
    <>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <SubHeading ref={historyRef} tabIndex={-1} className="display text-[22px] font-medium text-ink outline-none">
          Historial
        </SubHeading>
        {history.length ? (
          <span className="tabular text-sm text-muted">
            {history.length} {history.length === 1 ? "registro" : "registros"}
          </span>
        ) : null}
      </div>
      <PainHistory
        records={history}
        sessions={sessions}
        linkedSessions={linkedSessions}
        today={today}
        onDelete={remove}
        onEdit={actions.update ? setEditing : undefined}
      />
    </>
  );

  const editDialog =
    actions.update ? (
      <Dialog
        open={editing != null}
        onClose={() => setEditing(null)}
        size="md"
        title="Editar registro"
        description={
          editing
            ? `${region.label} · ${formatDate(recordDay(editing))}. Para un cambio en el dolor, registrá uno nuevo: corregí acá solo errores de carga.`
            : undefined
        }
      >
        {editing ? (
          <PainRecordForm
            key={editing.id}
            patientId={patientId}
            region={region}
            latest={latest}
            record={editing}
            point={null}
            onClearPoint={() => undefined}
            sessions={sessions}
            linkedSessions={linkedSessions}
            today={today}
            action={actions.update}
            onSaved={(record) => {
              onSaved(record);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
            inSheet
          />
        ) : null}
      </Dialog>
    ) : null;

  if (layout === "sheet") {
    return (
      <div className="space-y-6">
        {status}
        {form}
        <section className="pt-2">{historySection}</section>
        {editDialog}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-right" aria-label={`Panel de ${region.label}`} role="region">
      <section className="rounded-card bg-surface p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">
              {REGION_GROUPS[region.group]} · {VIEW_NAMES[region.view]}
            </p>
            <h3 ref={titleRef} tabIndex={-1} className="display mt-1 text-[28px] font-medium text-ink outline-none">
              {region.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de la zona"
            className="-mt-1 -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="mt-4">{status}</div>
        <div className="my-6 h-px bg-line" />
        <SubHeading className="mb-4 text-[17px] font-medium text-ink">Registrar dolor</SubHeading>
        {form}
      </section>
      <section className="rounded-card bg-surface p-6 sm:p-7">{historySection}</section>
      {editDialog}
    </div>
  );
}

function StatusRow({
  latest,
  today,
  onResolve,
}: {
  latest: PainRecordItem | null;
  today: string;
  onResolve: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  if (!latest) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="outline">Sin registros</Badge>
        <span className="text-[13px] text-muted">Completá el formulario para el primer registro.</span>
      </div>
    );
  }
  const status = asPainStatus(latest.status);
  const active = isActivePain(latest);
  const stale = isStale(latest, today);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {active ? <PainBadge intensity={latest.intensity} size="lg" showLabel /> : null}
        <Badge dot={PAIN_STATUS[active ? status : "resolved"].color} tone="soft" className="h-9 px-3">
          {PAIN_STATUS[active ? status : "resolved"].label}
        </Badge>
        <span className={cn("text-[13px] text-muted", stale && "font-medium text-warning-ink")}>
          {stale ? <Clock aria-hidden className="mr-1 inline size-3.5 -translate-y-px" /> : null}
          Actualizado {relativeDay(recordDay(latest), today)}
        </span>
      </div>
      {stale ? (
        <p className="text-[13px] text-muted">
          Hace más de {STALE_DAYS} días que no se actualiza: si la evaluaste hoy, registrá el valor actual.
        </p>
      ) : null}
      {active ? (
        <Button
          variant="secondary"
          size="sm"
          className="h-10 w-full"
          disabled={pending}
          icon={pending ? <Spinner /> : <Check />}
          onClick={() => startTransition(onResolve)}
        >
          Marcar como resuelto
        </Button>
      ) : null}
    </div>
  );
}
