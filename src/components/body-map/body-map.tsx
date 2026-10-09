"use client";

import { Eye, EyeOff, Hand, History } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type TouchEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented";
import { getRegion, REGION_GROUPS } from "@/lib/body-regions";
import type { BodyView } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { BodyFigure, type DraftPoint } from "./body-figure";
import { PainLegend } from "./pain-legend";
import {
  isActivePain,
  isStale,
  paintFromStates,
  painStats,
  recordDay,
  regionStatesAsOf,
  relativeDay,
  sortRecords,
  timelineDays,
} from "./pain-state";
import { PainSummaryCard } from "./pain-summary-card";
import { PainTimeline } from "./pain-timeline";
import { PainZonesList } from "./pain-zones-list";
import { RegionPanel, VIEW_NAMES } from "./region-panel";
import { RegionSearch } from "./region-search";
import type { BodyMapActions, PainRecordItem, SessionOption } from "./types";

type Props = {
  patientId: string;
  /** Todos los registros de dolor del paciente. */
  records: PainRecordItem[];
  /** Últimas sesiones realizadas (hasta hoy) que se pueden vincular a un registro. */
  sessions: SessionOption[];
  /** Sesiones ya vinculadas a registros que no están entre `sessions` (para nombrarlas en el historial). */
  linkedSessions?: SessionOption[];
  /** Sesión que se preselecciona al registrar (la de hoy, o la que llegó por ?sesion=). */
  defaultSessionId?: string | null;
  /** "Hoy" calculado en el servidor (YYYY-MM-DD, AR). */
  today: string;
  actions: BodyMapActions;
  /** true si el historial se recortó por tamaño (se muestran los registros más recientes). */
  truncated?: boolean;
};

const XL_QUERY = "(min-width: 1280px)";

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const VIEW_OPTIONS = [
  { value: "front" as const, label: "Frente" },
  { value: "back" as const, label: "Espalda" },
];

// Alto de la figura: entra en la pantalla (la tarjeta es sticky en desktop) y en el ancho disponible.
const FIGURE_HEIGHT =
  "h-[min(clamp(380px,calc(100svh_-_300px),560px),calc(100cqw_*_2.2))] sm:h-[min(clamp(400px,calc(100svh_-_330px),640px),104cqw)]";

/**
 * Mapa corporal interactivo del paciente: figura frente/espalda, línea de tiempo, resumen,
 * lista de zonas y panel de registro (lateral en desktop, hoja inferior en mobile).
 */
export function BodyMap({
  patientId,
  records: serverRecords,
  sessions,
  linkedSessions = [],
  defaultSessionId = null,
  today,
  actions,
  truncated = false,
}: Props) {
  const titleId = useId();

  // Registros locales: se resincronizan cuando el servidor manda datos nuevos (revalidatePath) y
  // se actualizan al instante con lo que devuelven las acciones.
  const [records, setRecords] = useState(serverRecords);
  const [syncedFrom, setSyncedFrom] = useState(serverRecords);
  if (serverRecords !== syncedFrom) {
    setSyncedFrom(serverRecords);
    setRecords(serverRecords);
  }

  const sorted = useMemo(() => sortRecords(records), [records]);
  const days = useMemo(() => timelineDays(sorted), [sorted]);
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const lastIndex = days.length - 1;
  const index = dayIndex == null || dayIndex > lastIndex ? lastIndex : dayIndex;
  const asOf = index >= 0 && index < lastIndex ? days[index] : null;

  const currentStates = useMemo(() => regionStatesAsOf(sorted, null), [sorted]);
  const states = useMemo(() => (asOf ? regionStatesAsOf(sorted, asOf) : currentStates), [sorted, asOf, currentStates]);
  const paint = useMemo(() => paintFromStates(states), [states]);
  const currentPaint = useMemo(() => paintFromStates(currentStates), [currentStates]);
  const stats = useMemo(() => painStats(states), [states]);
  const dayLevel = useMemo(() => days.map((d) => painStats(regionStatesAsOf(sorted, d)).avg), [days, sorted]);
  const stateList = useMemo(() => [...states.values()], [states]);
  const improving = stateList.filter((s) => isActivePain(s.latest) && s.latest.status === "improving").length;
  const resolvedCount = stateList.filter((s) => !isActivePain(s.latest)).length;
  const staleCount = asOf ? 0 : stateList.filter((s) => isStale(s.latest, today)).length;
  const lastRecord = sorted[sorted.length - 1];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPoint | null>(null);
  const [mobileView, setMobileView] = useState<BodyView>("front");
  const [showResolved, setShowResolved] = useState(false);
  const isXl = useMediaQuery(XL_QUERY);
  const asideRef = useRef<HTMLElement>(null);

  const selectedRegion = getRegion(selectedId);
  const selectedHistory = useMemo(
    () => (selectedId ? sorted.filter((r) => r.region === selectedId) : []),
    [sorted, selectedId],
  );

  // Si se eligió con teclado o desde la lista, el foco pasa al título del panel.
  const [focusPanel, setFocusPanel] = useState(false);

  const onFigureSelect = useCallback((id: string, point: [number, number] | null) => {
    setSelectedId(id);
    setFocusPanel(point === null);
    setDraft((prev) => (point ? { region: id, x: point[0], y: point[1] } : prev?.region === id ? prev : null));
  }, []);

  const selectFromList = useCallback((id: string) => {
    const region = getRegion(id);
    if (!region) return;
    setSelectedId(id);
    setFocusPanel(true);
    setMobileView(region.view);
    setDraft((prev) => (prev?.region === id ? prev : null));
  }, []);

  const close = useCallback(() => {
    const previous = selectedId;
    setSelectedId(null);
    setDraft(null);
    // Devolver el foco a la zona en el mapa.
    if (previous) {
      requestAnimationFrame(() =>
        document.querySelector<SVGPathElement>(`path[data-region="${previous}"]`)?.focus({ preventScroll: true }),
      );
    }
  }, [selectedId]);

  // La hoja (mobile) contiene otros diálogos (editar registro, confirmar borrado) y React propaga sus
  // eventos cancel/close por el árbol: la hoja solo se cierra si el evento es suyo y no hay otro
  // diálogo abierto encima.
  const closeSheet = useCallback(
    (e?: { target: EventTarget | null; currentTarget: EventTarget | null }) => {
      if (e && e.target !== e.currentTarget) return;
      if (document.querySelectorAll("dialog[open]").length > 1) return;
      close();
    },
    [close],
  );

  const onSaved = useCallback((record: PainRecordItem) => {
    setRecords((prev) => [...prev.filter((r) => r.id !== record.id), record]);
    setDraft(null);
    setDayIndex(null);
  }, []);

  const onDeleted = useCallback((recordId: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
  }, []);

  // Esc cierra el panel lateral (en mobile lo maneja el Dialog).
  useEffect(() => {
    if (!selectedId || !isXl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      const target = e.target as HTMLElement | null;
      // No cerrar mientras se escribe (se perdería lo cargado).
      if (target?.closest("input, textarea, select, [role=combobox]")) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, isXl, close]);

  // Al abrir el panel en desktop, que quede a la vista.
  useEffect(() => {
    if (!selectedId || !isXl) return;
    const el = asideRef.current;
    if (el && el.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [selectedId, isXl]);

  // Deslizar horizontalmente sobre la figura cambia de vista (mobile).
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 45) setMobileView(dx < 0 ? "back" : "front");
  };

  const panelProps = selectedRegion
    ? {
        patientId,
        region: selectedRegion,
        state: currentStates.get(selectedRegion.id),
        history: selectedHistory,
        sessions,
        linkedSessions,
        defaultSessionId,
        today,
        point: draft && draft.region === selectedRegion.id ? ([draft.x, draft.y] as [number, number]) : null,
        onClearPoint: () => setDraft(null),
        actions,
        onSaved,
        onDeleted,
        onClose: close,
      }
    : null;

  return (
    <>
      {/* Encabezado de la pestaña: título + acciones del mapa (el nombre del paciente ya está arriba). */}
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 id={titleId} className="display text-2xl font-medium text-ink">
            Mapa corporal
          </h2>
          <p className="mt-1 text-sm text-muted">Tocá una zona del cuerpo para registrar o actualizar el dolor.</p>
        </div>
        <div className="flex items-center gap-2">
          <RegionSearch paint={currentPaint} onSelect={selectFromList} className="min-w-0 flex-1 md:w-60 md:flex-none" />
          <button
            type="button"
            aria-pressed={showResolved}
            onClick={() => setShowResolved((v) => !v)}
            title={showResolved ? "Ocultar zonas resueltas en la figura" : "Mostrar zonas resueltas en la figura"}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors",
              showResolved ? "bg-ink text-white" : "bg-surface text-ink shadow-inset hover:bg-surface-2",
            )}
          >
            {showResolved ? <Eye aria-hidden className="size-4" /> : <EyeOff aria-hidden className="size-4" />}
            Resueltos
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        {/* ------------------------------------------------------------- Mapa */}
        <section
          aria-labelledby={titleId}
          className="@container/map animate-fade-up rounded-card bg-surface p-5 sm:p-7 xl:sticky xl:top-6"
        >
          {truncated ? (
            <p className="mb-4 rounded-panel bg-surface-2 px-4 py-2.5 text-[13px] text-muted">
              El historial es muy largo: el mapa muestra los registros más recientes.
            </p>
          ) : null}
          <div className="flex justify-center sm:hidden">
            <SegmentedControl
              tone="dark"
              aria-label="Vista del cuerpo"
              options={VIEW_OPTIONS}
              value={mobileView}
              onChange={setMobileView}
            />
          </div>

          <div className="@container relative mt-4 sm:mt-0" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center sm:top-9">
              {asOf ? (
                <p className="inline-flex animate-fade-in items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-white shadow-float">
                  <History aria-hidden className="size-3.5" />
                  Mapa al {formatDate(asOf)}
                </p>
              ) : records.length === 0 ? (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] text-muted">
                  <Hand aria-hidden className="size-3.5" />
                  Tocá cualquier zona para empezar
                </p>
              ) : null}
            </div>
            <div className="flex justify-center gap-[8%]">
              {(["front", "back"] as const).map((view) => (
                <div
                  key={view}
                  className={cn("flex min-w-0 flex-col items-center gap-3", view !== mobileView && "max-sm:hidden")}
                >
                  <p className="hidden text-[11px] font-medium tracking-[0.14em] text-muted uppercase sm:block">
                    {VIEW_NAMES[view]}
                  </p>
                  <BodyFigure
                    view={view}
                    paint={paint}
                    selectedId={selectedId}
                    draftPoint={draft}
                    showResolved={showResolved}
                    onSelect={onFigureSelect}
                    today={today}
                    className={cn(FIGURE_HEIGHT, records.length === 0 || asOf ? "max-sm:mt-10" : "max-sm:mt-1")}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-6 border-t border-line pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-end md:gap-10">
            <PainLegend />
            {days.length >= 2 ? (
              <PainTimeline days={days} dayLevel={dayLevel} index={index} onChange={setDayIndex} />
            ) : (
              <p className="text-[13px] text-muted md:text-right">
                {records.length
                  ? "La línea de evolución aparece cuando haya registros en más de un día."
                  : "Cada registro queda con su fecha para ver la evolución."}
              </p>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------- Lateral */}
        <aside ref={asideRef} aria-label="Detalle del dolor" className="min-w-0 scroll-mt-6 space-y-6">
          {panelProps && isXl ? (
            <RegionPanel key={panelProps.region.id} layout="inline" autoFocus={focusPanel} {...panelProps} />
          ) : (
            <>
              <PainSummaryCard
                className="animate-fade-up"
                stats={stats}
                asOf={asOf}
                lastUpdate={lastRecord ? relativeDay(recordDay(lastRecord), today) : null}
                improving={improving}
                resolved={resolvedCount}
                stale={staleCount}
              />
              <PainZonesList
                className="animate-fade-up [animation-delay:60ms]"
                states={stateList}
                selectedId={selectedId}
                onSelect={selectFromList}
                today={today}
              />
            </>
          )}
        </aside>
      </div>

      {/* Hoja inferior (mobile / tablet) */}
      <Dialog
        open={Boolean(panelProps) && !isXl}
        onClose={closeSheet}
        variant="sheet"
        size="md"
        title={selectedRegion?.label}
        description={selectedRegion ? `${REGION_GROUPS[selectedRegion.group]} · ${VIEW_NAMES[selectedRegion.view]}` : undefined}
      >
        {panelProps && !isXl ? <RegionPanel key={panelProps.region.id} layout="sheet" {...panelProps} /> : null}
      </Dialog>
    </>
  );
}
