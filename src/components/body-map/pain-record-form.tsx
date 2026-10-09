"use client";

import { ArrowRight, ChevronDown, MapPin, X } from "lucide-react";
import { startTransition, useActionState, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ScaleBar } from "@/components/ui/scale";
import { SegmentedControl } from "@/components/ui/segmented";
import { SubmitButton } from "@/components/ui/submit-button";
import type { BodyRegion } from "@/lib/body-regions";
import { PAIN_FREQUENCY, PAIN_SCALE_LABELS, PAIN_STATUS, PAIN_TYPES } from "@/lib/constants";
import type { PainStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { actionErrorMessage } from "./action-error";
import { normalizePoint } from "./geometry";
import { PAIN_SCALE_ANCHORS } from "./pain-legend";
import { asPainStatus, recordDay } from "./pain-state";
import { sessionOptionLabel } from "./session-label";
import type { BodyMapActions, PainFormState, PainRecordItem, SessionOption } from "./types";

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
  /** Último registro de la zona: al registrar, precarga la caracterización (tipo, frecuencia, irradiación…). */
  latest: PainRecordItem | null;
  /** Modo edición: el registro a corregir (precarga todos sus datos). */
  record?: PainRecordItem | null;
  /** Punto exacto marcado en el mapa (coordenadas del viewBox). Solo al registrar. */
  point: [number, number] | null;
  onClearPoint: () => void;
  /** Sesiones que se pueden vincular (realizadas, hasta hoy). */
  sessions: SessionOption[];
  /** Sesiones ya vinculadas a algún registro que no están entre `sessions` (para nombrarlas). */
  linkedSessions?: SessionOption[];
  /** Sesión preseleccionada al registrar (la de hoy o la que llegó por ?sesion=). */
  defaultSessionId?: string | null;
  today: string;
  /** Acción de crear (o de editar, con `record`). */
  action: BodyMapActions["create"];
  onSaved: (record: PainRecordItem) => void;
  /** Solo en edición: botón "Cancelar". */
  onCancel?: () => void;
  /** En la hoja de mobile (o en un diálogo) no se puede tocar el mapa con el panel abierto. */
  inSheet?: boolean;
};

/**
 * Formulario "Registrar dolor" (y "Editar registro"). Todos los campos son controlados y el envío
 * es manual (onSubmit + startTransition): con <form action> React 19 resetea el formulario al
 * terminar cada acción y los <select> controlados quedarían mostrando otra opción que la del estado.
 */
export function PainRecordForm({
  patientId,
  region,
  latest,
  record = null,
  point,
  onClearPoint,
  sessions,
  linkedSessions = [],
  defaultSessionId = null,
  today,
  action,
  onSaved,
  onCancel,
  inSheet = false,
}: Props) {
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const formRef = useRef<HTMLFormElement>(null);
  const editing = record != null;

  // Al volver a evaluar una zona con dolor, la caracterización sigue igual salvo que se cambie.
  const continuing = !editing && latest != null && asPainStatus(latest.status) !== "resolved" ? latest : null;
  const defaultSession = !editing ? sessions.find((s) => s.id === defaultSessionId) : undefined;
  const source = record ?? continuing;

  const [intensity, setIntensity] = useState<number | null>(record ? record.intensity : null);
  const [types, setTypes] = useState<string[]>((record ?? latest)?.pain_types ?? []);
  const [frequency, setFrequency] = useState<string[]>(() => {
    const f = (record ?? latest)?.frequency;
    return f ? [f] : [];
  });
  const [status, setStatus] = useState<PainStatus>(
    record ? asPainStatus(record.status) : continuing ? asPainStatus(continuing.status) : "active",
  );
  const [startedOn, setStartedOn] = useState(source?.started_on ?? "");
  const [recordedOn, setRecordedOn] = useState(
    record
      ? recordDay(record)
      : defaultSession && defaultSession.session_date <= today
        ? defaultSession.session_date
        : today,
  );
  const [recordedTouched, setRecordedTouched] = useState(editing);
  const [sessionId, setSessionId] = useState(record ? (record.session_id ?? "") : (defaultSession?.id ?? ""));
  const [irradiation, setIrradiation] = useState(source?.irradiation ?? "");
  const [aggravating, setAggravating] = useState(source?.aggravating_factors ?? "");
  const [relieving, setRelieving] = useState(source?.relieving_factors ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [detailsOpen, setDetailsOpen] = useState(Boolean(record?.notes));
  const [keepPoint, setKeepPoint] = useState(record?.point_x != null && record?.point_y != null);

  // Opciones del selector: en edición se conserva la sesión ya vinculada aunque no esté entre las últimas.
  const sessionOptions = useMemo(() => {
    const linkedId = record?.session_id;
    if (!linkedId || sessions.some((s) => s.id === linkedId)) return sessions;
    const linked = linkedSessions.find((s) => s.id === linkedId);
    return [...sessions, linked ?? { id: linkedId, session_date: "", techniques: [] }];
  }, [sessions, linkedSessions, record?.session_id]);

  const [state, formAction, isPending] = useActionState<PainFormState, FormData>(async (prev, formData) => {
    if (formData.get("intensity") === "" || formData.get("intensity") == null) {
      return { ok: false, fieldErrors: { intensity: "Elegí la intensidad del dolor (0 a 10)." } };
    }
    try {
      const res = await action(prev, formData);
      if (res.ok && res.data?.record) {
        toast.success(res.message ?? (editing ? "Registro actualizado" : "Registro guardado"));
        onSaved(res.data.record);
      } else {
        toast.error(res.message ?? "Revisá los datos marcados.");
        const fe = res.fieldErrors ?? {};
        if (fe.irradiation || fe.aggravating_factors || fe.relieving_factors || fe.notes) setDetailsOpen(true);
      }
      return res;
    } catch (error) {
      const message = actionErrorMessage(error, "No pudimos guardar el registro. Revisá tu conexión e intentá de nuevo.");
      toast.error(message);
      return { ok: false, message };
    }
  }, initialState);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  };

  // Tras un error de validación, el foco va al primer campo marcado (el mensaje queda asociado).
  useEffect(() => {
    if (state.ok || !state.fieldErrors) return;
    const form = formRef.current;
    if (!form) return;
    const target = state.fieldErrors.intensity
      ? form.querySelector<HTMLElement>('[data-field="intensity"] [role="radio"]')
      : form.querySelector<HTMLElement>('[aria-invalid="true"]');
    target?.focus();
  }, [state]);

  const errors = state.fieldErrors ?? {};
  const normalized = editing ? null : point ? normalizePoint(point[0], point[1]) : null;
  const detailCount = [irradiation, aggravating, relieving, notes].filter((v) => v.trim()).length;
  const carriedDetails =
    continuing != null &&
    detailCount > 0 &&
    !notes.trim() &&
    irradiation === (continuing.irradiation ?? "") &&
    aggravating === (continuing.aggravating_factors ?? "") &&
    relieving === (continuing.relieving_factors ?? "");
  const selectedSession = sessionOptions.find((s) => s.id === sessionId);
  const sessionHint = !sessionOptions.length
    ? "Todavía no hay sesiones realizadas para vincular."
    : !editing && defaultSession && sessionId === defaultSession.id
      ? defaultSession.session_date === today
        ? "Preseleccionamos la sesión de hoy."
        : `Preseleccionamos la sesión del ${formatDate(defaultSession.session_date)}.`
      : undefined;
  const intensityMsgId = fid("intensity-msg");

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col"
      aria-label={editing ? `Editar registro de dolor en ${region.label}` : `Registrar dolor en ${region.label}`}
    >
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="region" value={region.id} />
      <input type="hidden" name="view" value={region.view} />
      {record ? <input type="hidden" name="record_id" value={record.id} /> : null}
      {normalized ? (
        <>
          <input type="hidden" name="point_x" value={normalized.x} />
          <input type="hidden" name="point_y" value={normalized.y} />
        </>
      ) : null}
      {record && keepPoint && record.point_x != null && record.point_y != null ? (
        <>
          <input type="hidden" name="point_x" value={record.point_x} />
          <input type="hidden" name="point_y" value={record.point_y} />
        </>
      ) : null}

      <div className="space-y-6">
        <div role="group" aria-labelledby={fid("intensity-label")} aria-describedby={intensityMsgId} data-field="intensity">
          <span id={fid("intensity-label")} className="sr-only">
            Intensidad del dolor, EVA de 0 a 10: 0 es sin dolor y 10, el peor dolor imaginable
          </span>
          <ScaleBar
            tone="pain"
            min={0}
            max={10}
            name="intensity"
            label="Intensidad del dolor"
            description={`EVA (0–10) · ${PAIN_SCALE_ANCHORS}`}
            value={intensity}
            onChange={(v) => {
              setIntensity(v);
              if (v === 0 && status !== "resolved") setStatus("resolved");
              if (v != null && v > 0 && status === "resolved") setStatus("active");
            }}
            allowEmpty={false}
          />
          {errors.intensity ? (
            <p id={intensityMsgId} role="alert" className="mt-2 px-1 text-[13px] text-danger">
              {errors.intensity}
            </p>
          ) : (
            <p id={intensityMsgId} className="mt-2 px-1 text-[13px] text-muted" aria-live="polite">
              {intensity != null
                ? `${PAIN_SCALE_LABELS[intensity]}`
                : latest
                  ? `Último registro: EVA ${latest.intensity}/10 (${formatDate(recordDay(latest))})`
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
              max={recordedOn || today}
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

        <Field label="Vincular a sesión" htmlFor={fid("session")} optional error={errors.session_id} hint={sessionHint}>
          <Select
            id={fid("session")}
            name="session_id"
            value={sessionId}
            disabled={!sessionOptions.length}
            onChange={(e) => {
              const id = e.target.value;
              setSessionId(id);
              const s = sessionOptions.find((x) => x.id === id);
              if (s?.session_date && !recordedTouched && s.session_date <= today) setRecordedOn(s.session_date);
              if (!s && !recordedTouched) setRecordedOn(today);
            }}
            aria-invalid={Boolean(errors.session_id)}
          >
            <option value="">Sin vincular</option>
            {sessionOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {sessionOptionLabel(s, today)}
              </option>
            ))}
          </Select>
        </Field>
        {selectedSession?.session_date && recordedOn && selectedSession.session_date !== recordedOn ? (
          <p className="-mt-4 px-1 text-[13px] text-muted">
            La fecha del registro ({formatDate(recordedOn)}) no coincide con la de la sesión.
          </p>
        ) : null}

        {/* Punto exacto */}
        <div className="flex items-center gap-3 rounded-panel bg-surface-2 px-4 py-3">
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
              point || (editing && keepPoint) ? "bg-ink text-white" : "bg-surface text-muted",
            )}
          >
            <MapPin aria-hidden className="size-4" />
          </span>
          <p className="min-w-0 flex-1 text-[13px] text-muted">
            {editing ? (
              keepPoint ? (
                <>
                  <span className="font-medium text-ink">Punto exacto marcado.</span> Se conserva al guardar.
                </>
              ) : record?.point_x != null ? (
                "El punto exacto se quita al guardar."
              ) : (
                "Este registro no tiene punto exacto."
              )
            ) : point ? (
              <>
                <span className="font-medium text-ink">Punto exacto marcado.</span> Se guarda junto al registro.
              </>
            ) : inSheet ? (
              "Para marcar el punto exacto, cerrá este panel y tocá la zona en el mapa."
            ) : (
              "Opcional: tocá la zona en el mapa para marcar el punto exacto del dolor."
            )}
          </p>
          {(editing ? keepPoint : point) ? (
            <button
              type="button"
              onClick={editing ? () => setKeepPoint(false) : onClearPoint}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-ink hover:bg-surface-3"
            >
              <X aria-hidden className="size-3.5" />
              Quitar
            </button>
          ) : editing && record?.point_x != null ? (
            <button
              type="button"
              onClick={() => setKeepPoint(true)}
              className="inline-flex h-10 shrink-0 items-center rounded-full px-3 text-[13px] font-medium text-ink hover:bg-surface-3"
            >
              Deshacer
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
                {detailCount
                  ? `· ${detailCount} completado${detailCount === 1 ? "" : "s"}${carriedDetails ? " (del último registro)" : ""}`
                  : "· irradiación, agravantes, notas"}
              </span>
            </span>
            <ChevronDown aria-hidden className={cn("size-4 shrink-0 transition-transform", detailsOpen && "rotate-180")} />
          </button>
          <div id={fid("details")} hidden={!detailsOpen} className="space-y-4 px-4 pt-1 pb-4">
            {carriedDetails ? (
              <p className="text-[13px] text-muted">Copiamos la irradiación y los factores del último registro: editalos si cambiaron.</p>
            ) : null}
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
          <p role="alert" className="rounded-panel bg-danger-50 px-4 py-3 text-sm text-danger-ink">
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
        <p className={cn("min-w-0 text-[13px] text-muted", editing && "max-sm:sr-only")}>
          {intensity == null
            ? "Elegí la intensidad para guardar."
            : editing
              ? "El cambio queda registrado en la auditoría clínica."
              : "Se suma al historial de la zona."}
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {editing && onCancel ? (
            <Button variant="ghost" onClick={onCancel} disabled={isPending}>
              Cancelar
            </Button>
          ) : null}
          <SubmitButton
            pending={isPending}
            pendingLabel="Guardando…"
            variant="inverse"
            className="shadow-soft"
            iconRight={<ArrowRight />}
          >
            {editing ? "Guardar cambios" : "Guardar"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
