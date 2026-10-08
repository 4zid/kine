"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Badge, PainBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { REGION_GROUPS, type BodyRegion } from "@/lib/body-regions";
import { PAIN_STATUS } from "@/lib/constants";
import { PainHistory } from "./pain-history";
import { PainRecordForm } from "./pain-record-form";
import { asPainStatus, isActivePain, recordDay, relativeDay, type RegionState } from "./pain-state";
import type { BodyMapActions, PainRecordItem, SessionOption } from "./types";

export const VIEW_NAMES = { front: "Frente", back: "Espalda" } as const;

type Props = {
  patientId: string;
  region: BodyRegion;
  state: RegionState | undefined;
  /** Registros de la zona, ascendentes. */
  history: PainRecordItem[];
  sessions: SessionOption[];
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

/** Panel de una zona: estado actual, formulario "Registrar dolor" e historial. */
export function RegionPanel(props: Props) {
  const {
    patientId,
    region,
    state,
    history,
    sessions,
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

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  const latest = state?.latest ?? null;
  const formKey = `${region.id}:${latest?.id ?? "none"}`;

  const remove = async (recordId: string) => {
    const res = await actions.remove(recordId, patientId);
    if (res.ok) onDeleted(recordId);
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
      today={today}
      action={actions.create}
      onSaved={onSaved}
      inSheet={layout === "sheet"}
    />
  );

  const status = (
    <StatusRow
      latest={latest}
      today={today}
      onResolve={async () => {
        const res = await actions.resolve(patientId, region.id);
        if (res.ok && res.data?.record) {
          toast.success(res.message ?? "Zona marcada como resuelta");
          onSaved(res.data.record);
        } else {
          toast.error(res.message ?? "No pudimos actualizar la zona.");
        }
      }}
    />
  );

  const historySection = (
    <>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="display text-[22px] font-medium text-ink">Historial</h3>
        {history.length ? (
          <span className="tabular text-sm text-muted">
            {history.length} {history.length === 1 ? "registro" : "registros"}
          </span>
        ) : null}
      </div>
      <PainHistory records={history} sessions={sessions} today={today} onDelete={remove} />
    </>
  );

  if (layout === "sheet") {
    return (
      <div className="space-y-6">
        {status}
        {form}
        <section className="pt-2">{historySection}</section>
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
            <h2 ref={titleRef} tabIndex={-1} className="display mt-1 text-[28px] font-medium text-ink outline-none">
              {region.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de la zona"
            className="-mt-1 -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4">{status}</div>
        <div className="my-6 h-px bg-line" />
        <h3 className="mb-4 text-[17px] font-medium text-ink">Registrar dolor</h3>
        {form}
      </section>
      <section className="rounded-card bg-surface p-6 sm:p-7">{historySection}</section>
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
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {active ? <PainBadge intensity={latest.intensity} size="lg" showLabel /> : null}
        <Badge dot={PAIN_STATUS[active ? status : "resolved"].color} tone="soft" className="h-9 px-3">
          {PAIN_STATUS[active ? status : "resolved"].label}
        </Badge>
        <span className="text-[13px] text-muted">Actualizado {relativeDay(recordDay(latest), today)}</span>
      </div>
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
