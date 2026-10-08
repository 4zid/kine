"use client";

import { ArrowRight, Check } from "lucide-react";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { notify } from "@/components/clinical-history/notify";
import { saveClinicalHistory } from "@/app/(app)/pacientes/[id]/historia/actions";
import { Spinner } from "@/components/ui/spinner";
import { SubmitButton } from "@/components/ui/submit-button";
import { SectionCard } from "@/components/clinical-history/fields";
import { SectionIndex } from "@/components/clinical-history/section-index";
import { AlertsSection, BackgroundSection } from "@/components/clinical-history/section-background";
import { HabitsSection } from "@/components/clinical-history/section-habits";
import { ExamSection } from "@/components/clinical-history/section-exam";
import {
  FunctionalScalesSection,
  RangeOfMotionSection,
  SpecialTestsSection,
  StrengthSection,
} from "@/components/clinical-history/section-evaluations";
import { PlanSection } from "@/components/clinical-history/section-plan";
import {
  ROW_KEYS,
  validateHistory,
  type HistoryFormValues,
  type RowKey,
  type SaveHistoryResult,
} from "@/components/clinical-history/schema";
import { SECTIONS, errorCountBySection, sectionHasData, type SectionId } from "@/components/clinical-history/sections";
import type { RowSectionProps, SetField } from "@/components/clinical-history/types";
import type { ActionState } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SaveHistoryAction = (
  patientId: string,
  input: HistoryFormValues,
) => Promise<ActionState<SaveHistoryResult>>;

type Props = {
  patientId: string;
  initialValues: HistoryFormValues;
  /** "8 oct, 14:30" o null si la historia nunca se editó (formateado en el servidor). */
  lastUpdatedLabel: string | null;
  /** Hoy en Argentina ("YYYY-MM-DD"), calculado en el servidor. */
  today: string;
  /** Inyectable para vistas previas; por defecto, la Server Action real. */
  saveAction?: SaveHistoryAction;
};

const omitKeys = (obj: Record<string, string>, predicate: (key: string) => boolean) => {
  const keys = Object.keys(obj).filter(predicate);
  if (keys.length === 0) return obj;
  const next = { ...obj };
  for (const k of keys) delete next[k];
  return next;
};

// Reloj compartido (cada 20 s) para el texto "Guardado · hace 2 min".
let clockNow = 0;
const subscribeClock = (cb: () => void) => {
  clockNow = Date.now();
  const id = window.setInterval(() => {
    clockNow = Date.now();
    cb();
  }, 20_000);
  return () => window.clearInterval(id);
};
const getClock = () => clockNow;
const getServerClock = () => 0;

const subscribeNothing = () => () => {};
const isMacPlatform = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

function relativeSaved(savedAt: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - savedAt) / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

export function ClinicalHistoryForm({
  patientId,
  initialValues,
  lastUpdatedLabel,
  today,
  saveAction = saveClinicalHistory,
}: Props) {
  const [values, setValues] = useState<HistoryFormValues>(initialValues);
  const [baseline, setBaseline] = useState<HistoryFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [updatedLabel, setUpdatedLabel] = useState(lastUpdatedLabel);
  const [focusErrorToken, setFocusErrorToken] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const now = useSyncExternalStore(subscribeClock, getClock, getServerClock);
  const isMac = useSyncExternalStore(subscribeNothing, isMacPlatform, () => false);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(baseline), [values, baseline]);

  // Errores visibles: descarta los de filas que ya no existen.
  const visibleErrors = useMemo(() => {
    const ids = new Set<string>();
    for (const key of ROW_KEYS) for (const row of values[key]) ids.add(`${key}.${row.id}`);
    return omitKeys(errors, (k) => {
      const [head, id] = k.split(".");
      return (ROW_KEYS as string[]).includes(head) && id !== undefined && !ids.has(`${head}.${id}`);
    });
  }, [errors, values]);

  const hasData = useMemo(
    () => Object.fromEntries(SECTIONS.map((s) => [s.id, sectionHasData(s, values)])) as Record<SectionId, boolean>,
    [values],
  );
  const errorCounts = useMemo(() => errorCountBySection(visibleErrors), [visibleErrors]);

  // -------------------------------------------------------------------------
  // Edición
  // -------------------------------------------------------------------------
  const set: SetField = useCallback((key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => omitKeys(e, (k) => k === key));
  }, []);

  const rowsApi = useCallback(<K extends RowKey>(key: K): Omit<RowSectionProps<K>, "rows" | "errors"> => {
    type Row = HistoryFormValues[K][number];
    return {
      onRowsChange: (updater) => {
        setValues((v) => ({ ...v, [key]: updater(v[key] as Row[]) }));
        setErrors((e) => omitKeys(e, (k) => k === key));
      },
      patch: (id, changes) => {
        setValues((v) => ({
          ...v,
          [key]: (v[key] as Row[]).map((r) => (r.id === id ? { ...r, ...changes } : r)),
        }));
        const prefix = `${key}.${id}.`;
        const fields = Object.keys(changes);
        setErrors((e) => omitKeys(e, (k) => k.startsWith(prefix) && fields.includes(k.slice(prefix.length))));
      },
    };
  }, []);

  // -------------------------------------------------------------------------
  // Guardado
  // -------------------------------------------------------------------------
  const [, formAction, isPending] = useActionState<ActionState<SaveHistoryResult>, FormData>(
    async (prev) => {
      if (!dirty) {
        notify.info("No hay cambios para guardar");
        return prev;
      }
      const snapshot = values;
      const local = validateHistory(snapshot);
      if (!local.ok) {
        setErrors(local.fieldErrors);
        setFocusErrorToken((t) => t + 1);
        notify.error("Revisá los campos marcados antes de guardar.");
        return { ok: false, fieldErrors: local.fieldErrors };
      }

      let res: ActionState<SaveHistoryResult>;
      try {
        res = await saveAction(patientId, snapshot);
      } catch {
        res = { ok: false, message: "No pudimos guardar. Revisá tu conexión e intentá de nuevo." };
      }

      if (res.ok && res.data) {
        const saved = res.data.values;
        setBaseline(saved);
        // Si no se tipeó nada mientras se guardaba, adoptar los valores normalizados.
        setValues((current) => (current === snapshot ? saved : current));
        setErrors({});
        setSavedAt(Date.now());
        setUpdatedLabel(res.data.updatedLabel);
        notify.success(res.message ?? "Historia clínica guardada");
      } else {
        if (res.fieldErrors) {
          setErrors(res.fieldErrors as Record<string, string>);
          setFocusErrorToken((t) => t + 1);
        }
        notify.error(res.message ?? "No pudimos guardar la historia clínica.");
      }
      return res;
    },
    { ok: false },
  );

  // Llevar al primer campo con error.
  useEffect(() => {
    if (!focusErrorToken) return;
    const form = formRef.current;
    const target =
      form?.querySelector<HTMLElement>("[aria-invalid='true']") ?? form?.querySelector<HTMLElement>("[role='alert']");
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    if (target.matches("input, textarea, select, button")) target.focus({ preventScroll: true });
  }, [focusErrorToken]);

  // Ctrl/Cmd + S guarda.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s" || e.altKey || e.shiftKey) return;
      e.preventDefault();
      formRef.current?.requestSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Avisar antes de salir con cambios sin guardar (recarga/cierre y navegación interna).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm("Tenés cambios sin guardar en la historia clínica. ¿Querés salir igual?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const fieldProps = { values, errors: visibleErrors, set };
  const card = (id: SectionId, children: ReactNode) => {
    const index = SECTIONS.findIndex((s) => s.id === id);
    return (
      <SectionCard
        key={id}
        section={SECTIONS[index]}
        index={index}
        hasData={hasData[id]}
        errorCount={errorCounts[id] ?? 0}
      >
        {children}
      </SectionCard>
    );
  };

  const status = isPending ? (
    <span className="inline-flex items-center gap-2">
      <Spinner className="size-3.5" />
      Guardando…
    </span>
  ) : dirty ? (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="relative inline-flex size-2">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-yellow" />
        <span className="relative size-2 rounded-full bg-yellow" />
      </span>
      Cambios sin guardar
    </span>
  ) : savedAt ? (
    <span className="inline-flex items-center gap-2">
      <Check aria-hidden className="size-4 text-brand-100" strokeWidth={2.5} />
      Guardado · {relativeSaved(savedAt, now || savedAt)}
    </span>
  ) : updatedLabel ? (
    <span className="truncate text-white/70">Actualizada el {updatedLabel}</span>
  ) : (
    <span className="truncate text-white/70">Completá lo que tengas a mano</span>
  );

  return (
    <form ref={formRef} action={formAction} noValidate className="animate-fade-up" aria-label="Historia clínica">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 sm:mb-6">
        <div className="min-w-0">
          <h2 className="display text-[30px] font-normal text-ink sm:text-[38px]">
            Historia <span className="font-medium">clínica</span>
          </h2>
          <p className="mt-2 text-[15px] text-muted">Anamnesis, examen físico y plan terapéutico, en un solo lugar.</p>
        </div>
        <p className="text-[13px] text-muted">
          {updatedLabel ? (
            <>
              Última actualización · <span className="font-medium text-ink-2">{updatedLabel}</span>
            </>
          ) : (
            "Todavía sin completar"
          )}
        </p>
      </header>

      <SectionIndex variant="mobile" hasData={hasData} errors={errorCounts} />

      <div className="xl:grid xl:grid-cols-[228px_minmax(0,1fr)] xl:gap-5">
        <aside className="hidden xl:block">
          <SectionIndex variant="desktop" hasData={hasData} errors={errorCounts} />
        </aside>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          {card("antecedentes", <BackgroundSection {...fieldProps} />)}
          {card("alertas", <AlertsSection {...fieldProps} />)}
          {card("habitos", <HabitsSection {...fieldProps} />)}
          {card("examen", <ExamSection {...fieldProps} />)}
          {card(
            "movilidad",
            <RangeOfMotionSection
              rows={values.range_of_motion}
              errors={visibleErrors}
              {...rowsApi("range_of_motion")}
            />,
          )}
          {card(
            "fuerza",
            <StrengthSection rows={values.muscle_strength} errors={visibleErrors} {...rowsApi("muscle_strength")} />,
          )}
          {card(
            "pruebas",
            <SpecialTestsSection rows={values.special_tests} errors={visibleErrors} {...rowsApi("special_tests")} />,
          )}
          {card(
            "escalas",
            <FunctionalScalesSection
              rows={values.functional_scales}
              errors={visibleErrors}
              today={today}
              {...rowsApi("functional_scales")}
            />,
          )}
          {card("plan", <PlanSection {...fieldProps} />)}

          {/* Barra de guardado fija */}
          <div className="pointer-events-none sticky bottom-3 z-20 flex justify-center pt-2 sm:bottom-5 print:hidden">
            <div
              className={cn(
                "pointer-events-auto flex w-full items-center gap-3 rounded-full bg-ink p-1.5 pl-5 text-[14px] text-white shadow-float transition-[box-shadow] duration-300 sm:w-auto sm:min-w-[480px]",
                dirty && "shadow-[0_2px_6px_rgb(17_17_20/0.1),0_28px_56px_-18px_rgb(17_17_20/0.5)]",
              )}
            >
              <div className="min-w-0 flex-1" role="status" aria-live="polite">
                {status}
              </div>
              <kbd className="hidden h-7 items-center rounded-md bg-white/10 px-2 font-sans text-[12px] text-white/70 md:inline-flex">
                {isMac ? "⌘S" : "Ctrl+S"}
              </kbd>
              <SubmitButton variant="inverse" pending={isPending} iconRight={<ArrowRight />} className="px-4 sm:px-5">
                <span>
                  Guardar<span className="hidden sm:inline"> historia clínica</span>
                </span>
              </SubmitButton>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
