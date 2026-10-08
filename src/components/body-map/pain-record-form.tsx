"use client";

import { ArrowRight, ChevronDown, MapPin, X } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { toast } from "sonner";
import { ChipGroup } from "@/components/ui/chip";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ScaleBar } from "@/components/ui/scale";
import { SegmentedControl } from "@/components/ui/segmented";
import { SubmitButton } from "@/components/ui/submit-button";
import type { BodyRegion } from "@/lib/body-regions";
import { PAIN_FREQUENCY, PAIN_SCALE_LABELS, PAIN_STATUS, PAIN_TYPES, TECHNIQUES } from "@/lib/constants";
import type { PainStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { normalizePoint } from "./geometry";
import { asPainStatus } from "./pain-state";
import type { BodyMapActions, PainFormState, PainRecordItem, SessionOption } from "./types";

const TECHNIQUE_LABEL = Object.fromEntries(TECHNIQUES.map((t) => [t.value, t.label]));

const STATUS_OPTIONS = (Object.keys(PAIN_STATUS) as PainStatus[]).map((value) => ({
  value,
  label: (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: PAIN_STATUS[value].color }} />
      {PAIN_STATUS[value].label}
    </span>
  ),
}));

const initialState: PainFormState = { ok: false };

type Props = {
  patientId: string;
  region: BodyRegion;
  /** Último registro de la zona (para precargar tipo y frecuencia). */
  latest: PainRecordItem | null;
  /** Punto exacto marcado en el mapa (coordenadas del viewBox). */
  point: [number, number] | null;
  onClearPoint: () => void;
  sessions: SessionOption[];
  today: string;
  action: BodyMapActions["create"];
  onSaved: (record: PainRecordItem) => void;
  /** En la hoja de mobile no se puede tocar el mapa con el panel abierto. */
  inSheet?: boolean;
};

/**
 * Formulario "Registrar dolor". Todos los campos son controlados: React 19 resetea los campos no
 * controlados al terminar una acción, y acá no queremos perder lo escrito si hay un error.
 */
export function PainRecordForm({
  patientId,
  region,
  latest,
  point,
  onClearPoint,
  sessions,
  today,
  action,
  onSaved,
  inSheet = false,
}: Props) {
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  const [intensity, setIntensity] = useState<number | null>(null);
  const [types, setTypes] = useState<string[]>(latest?.pain_types ?? []);
  const [frequency, setFrequency] = useState<string[]>(latest?.frequency ? [latest.frequency] : []);
  const [status, setStatus] = useState<PainStatus>(
    latest && asPainStatus(latest.status) !== "resolved" ? asPainStatus(latest.status) : "active",
  );
  const [startedOn, setStartedOn] = useState(latest && latest.status !== "resolved" ? (latest.started_on ?? "") : "");
  const [recordedOn, setRecordedOn] = useState(today);
  const [recordedTouched, setRecordedTouched] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [irradiation, setIrradiation] = useState("");
  const [aggravating, setAggravating] = useState("");
  const [relieving, setRelieving] = useState("");
  const [notes, setNotes] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [state, formAction, isPending] = useActionState<PainFormState, FormData>(async (prev, formData) => {
    if (formData.get("intensity") === "" || formData.get("intensity") == null) {
      return { ok: false, fieldErrors: { intensity: "Elegí la intensidad del dolor (0 a 10)." } };
    }
    try {
      const res = await action(prev, formData);
      if (res.ok && res.data?.record) {
        toast.success(res.message ?? "Registro guardado");
        onSaved(res.data.record);
      } else {
        toast.error(res.message ?? "Revisá los datos marcados.");
        const fe = res.fieldErrors ?? {};
        if (fe.irradiation || fe.aggravating_factors || fe.relieving_factors || fe.notes) setDetailsOpen(true);
      }
      return res;
    } catch {
      toast.error("No pudimos guardar el registro. Revisá tu conexión e intentá de nuevo.");
      return { ok: false, message: "No pudimos guardar el registro." };
    }
  }, initialState);

  const errors = state.fieldErrors ?? {};
  const normalized = point ? normalizePoint(point[0], point[1]) : null;
  const detailCount = [irradiation, aggravating, relieving, notes].filter((v) => v.trim()).length;

  return (
    <form action={formAction} noValidate className="flex flex-col" aria-label={`Registrar dolor en ${region.label}`}>
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="region" value={region.id} />
      <input type="hidden" name="view" value={region.view} />
      {normalized ? (
        <>
          <input type="hidden" name="point_x" value={normalized.x} />
          <input type="hidden" name="point_y" value={normalized.y} />
        </>
      ) : null}

      <div className="space-y-6">
        <div>
          <ScaleBar
            tone="pain"
            min={0}
            max={10}
            name="intensity"
            label="Intensidad"
            description="EVA · 0 sin dolor, 10 el peor imaginable"
            value={intensity}
            onChange={(v) => {
              setIntensity(v);
              if (v === 0 && status !== "resolved") setStatus("resolved");
            }}
            allowEmpty={false}
          />
          {errors.intensity ? (
            <p role="alert" className="mt-2 px-1 text-[13px] text-danger">
              {errors.intensity}
            </p>
          ) : (
            <p className="mt-2 px-1 text-[13px] text-muted" aria-live="polite">
              {intensity != null
                ? `${PAIN_SCALE_LABELS[intensity]}`
                : latest
                  ? `Último registro: ${latest.intensity}/10 (${formatDate(latest.recorded_at)})`
                  : "Tocá un valor de la escala."}
            </p>
          )}
        </div>

        <Field label="Tipo de dolor" error={errors.pain_types}>
          <ChipGroup
            multiple
            size="sm"
            name="pain_types"
            aria-label="Tipo de dolor"
            options={PAIN_TYPES}
            value={types}
            onChange={setTypes}
          />
        </Field>

        <Field label="Frecuencia" error={errors.frequency}>
          <ChipGroup
            size="sm"
            name="frequency"
            aria-label="Frecuencia"
            options={PAIN_FREQUENCY}
            value={frequency}
            onChange={setFrequency}
          />
        </Field>

        <Field label="Estado" error={errors.status}>
          <SegmentedControl
            aria-label="Estado del dolor"
            name="status"
            size="sm"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(v) => {
              setStatus(v);
              if (v === "resolved" && intensity == null) setIntensity(0);
            }}
            className="w-full [&>button]:flex-1 [&>button]:justify-center"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <Field label="Desde cuándo" htmlFor={fid("started")} optional error={errors.started_on}>
            <Input
              id={fid("started")}
              type="date"
              name="started_on"
              max={today}
              value={startedOn}
              onChange={(e) => setStartedOn(e.target.value)}
              aria-invalid={Boolean(errors.started_on)}
            />
          </Field>
          <Field label="Fecha del registro" htmlFor={fid("recorded")} error={errors.recorded_on}>
            <Input
              id={fid("recorded")}
              type="date"
              name="recorded_on"
              max={today}
              required
              value={recordedOn}
              onChange={(e) => {
                setRecordedOn(e.target.value);
                setRecordedTouched(true);
              }}
              aria-invalid={Boolean(errors.recorded_on)}
            />
          </Field>
        </div>

        <Field
          label="Vincular a sesión"
          htmlFor={fid("session")}
          optional
          error={errors.session_id}
          hint={sessions.length ? undefined : "Todavía no hay sesiones cargadas para este paciente."}
        >
          <Select
            id={fid("session")}
            name="session_id"
            value={sessionId}
            disabled={!sessions.length}
            onChange={(e) => {
              const id = e.target.value;
              setSessionId(id);
              const s = sessions.find((x) => x.id === id);
              if (s && !recordedTouched && s.session_date <= today) setRecordedOn(s.session_date);
              if (!s && !recordedTouched) setRecordedOn(today);
            }}
            aria-invalid={Boolean(errors.session_id)}
          >
            <option value="">Sin vincular</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {formatDate(s.session_date)}
                {s.techniques.length
                  ? ` · ${s.techniques
                      .slice(0, 2)
                      .map((t) => TECHNIQUE_LABEL[t] ?? t)
                      .join(", ")}${s.techniques.length > 2 ? "…" : ""}`
                  : ""}
              </option>
            ))}
          </Select>
        </Field>

        {/* Punto exacto */}
        <div className="flex items-center gap-3 rounded-panel bg-surface-2 px-4 py-3">
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
              point ? "bg-ink text-white" : "bg-surface text-muted",
            )}
          >
            <MapPin aria-hidden className="size-4" />
          </span>
          <p className="min-w-0 flex-1 text-[13px] text-muted">
            {point ? (
              <>
                <span className="font-medium text-ink">Punto exacto marcado.</span> Se guarda junto al registro.
              </>
            ) : inSheet ? (
              "Para marcar el punto exacto, cerrá este panel y tocá la zona en el mapa."
            ) : (
              "Opcional: tocá la zona en el mapa para marcar el punto exacto del dolor."
            )}
          </p>
          {point ? (
            <button
              type="button"
              onClick={onClearPoint}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-ink hover:bg-surface-3"
            >
              <X aria-hidden className="size-3.5" />
              Quitar
            </button>
          ) : null}
        </div>

        {/* Más detalles */}
        <div className="rounded-panel shadow-inset">
          <button
            type="button"
            aria-expanded={detailsOpen}
            aria-controls={fid("details")}
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-panel px-4 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            <span>
              Más detalles
              <span className="ml-1.5 font-normal text-muted">
                {detailCount ? `· ${detailCount} completado${detailCount === 1 ? "" : "s"}` : "· irradiación, agravantes, notas"}
              </span>
            </span>
            <ChevronDown aria-hidden className={cn("size-4 shrink-0 transition-transform", detailsOpen && "rotate-180")} />
          </button>
          <div id={fid("details")} hidden={!detailsOpen} className="space-y-4 px-4 pt-1 pb-4">
            <Field label="Irradiación" htmlFor={fid("irr")} optional error={errors.irradiation}>
              <Input
                id={fid("irr")}
                name="irradiation"
                maxLength={1000}
                placeholder="Ej.: hacia el glúteo y cara posterior del muslo"
                value={irradiation}
                onChange={(e) => setIrradiation(e.target.value)}
                aria-invalid={Boolean(errors.irradiation)}
              />
            </Field>
            <Field label="Agravantes" htmlFor={fid("agg")} optional error={errors.aggravating_factors}>
              <Textarea
                id={fid("agg")}
                name="aggravating_factors"
                rows={2}
                maxLength={2000}
                placeholder="¿Qué lo empeora? Posturas, movimientos, esfuerzos…"
                value={aggravating}
                onChange={(e) => setAggravating(e.target.value)}
                aria-invalid={Boolean(errors.aggravating_factors)}
              />
            </Field>
            <Field label="Atenuantes" htmlFor={fid("rel")} optional error={errors.relieving_factors}>
              <Textarea
                id={fid("rel")}
                name="relieving_factors"
                rows={2}
                maxLength={2000}
                placeholder="¿Qué lo alivia? Reposo, calor, medicación…"
                value={relieving}
                onChange={(e) => setRelieving(e.target.value)}
                aria-invalid={Boolean(errors.relieving_factors)}
              />
            </Field>
            <Field label="Notas" htmlFor={fid("notes")} optional error={errors.notes}>
              <Textarea
                id={fid("notes")}
                name="notes"
                rows={3}
                maxLength={4000}
                placeholder="Observaciones de la evaluación"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                aria-invalid={Boolean(errors.notes)}
              />
            </Field>
          </div>
        </div>

        {state.message && !state.ok && !Object.keys(errors).length ? (
          <p role="alert" className="rounded-panel bg-danger-50 px-4 py-3 text-sm text-danger">
            {state.message}
          </p>
        ) : null}
      </div>

      {/* Pie fijo (como el "Agregar →" de daily) */}
      <div
        className={cn(
          "sticky bottom-0 z-10 -mx-6 mt-6 flex items-center justify-between gap-3 bg-surface-2 px-6 py-4 sm:-mx-7 sm:px-7",
          inSheet ? "-bottom-5 border-t border-line" : "-mb-6 rounded-b-card sm:-mb-7",
        )}
      >
        <p className="min-w-0 text-[13px] text-muted">
          {intensity == null ? "Elegí la intensidad para guardar." : "Se suma al historial de la zona."}
        </p>
        <SubmitButton
          pending={isPending}
          pendingLabel="Guardando…"
          variant="inverse"
          className="shadow-soft"
          iconRight={<ArrowRight />}
        >
          Guardar
        </SubmitButton>
      </div>
    </form>
  );
}
