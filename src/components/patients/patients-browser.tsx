"use client";

import { ArrowDownWideNarrow, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition, type ReactNode } from "react";
import { SegmentedControl } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import {
  SORT_LABELS,
  STATUS_FILTER_LABELS,
  patientListHref,
  type PatientListParams,
  type PatientSort,
  type StatusCounts,
  type StatusFilter,
} from "@/lib/data/patients-types";
import { cn } from "@/lib/utils";

const STATUS_ORDER: StatusFilter[] = ["active", "discharged", "archived", "all"];
const SORT_ORDER: PatientSort[] = ["recent", "name", "pain"];

/**
 * Barra de herramientas del listado (búsqueda con debounce, filtro por estado y orden),
 * todo en la URL. Atenúa el listado mientras carga la nueva página.
 */
export function PatientsBrowser({
  params,
  counts,
  children,
}: {
  params: PatientListParams;
  counts: StatusCounts;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.q);
  const [syncedQ, setSyncedQ] = useState(params.q);
  const inputRef = useRef<HTMLInputElement>(null);

  // Si la búsqueda cambia desde afuera (p. ej. "Limpiar búsqueda"), reflejarla en el input.
  if (params.q !== syncedQ) {
    setSyncedQ(params.q);
    setQuery(params.q);
  }

  const navigate = (next: Partial<PatientListParams>) => {
    const href = patientListHref({ ...params, page: 1, ...next });
    startTransition(() => router.replace(href, { scroll: false }));
  };

  const commitSearch = useEffectEvent((value: string) => {
    if (value !== params.q) navigate({ q: value });
  });

  useEffect(() => {
    const value = query.trim().slice(0, 80);
    const t = window.setTimeout(() => commitSearch(value), 320);
    return () => window.clearTimeout(t);
  }, [query]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <SegmentedControl<StatusFilter>
            aria-label="Filtrar por estado"
            value={params.status}
            onChange={(status) => navigate({ status })}
            options={STATUS_ORDER.map((s) => ({
              value: s,
              label: (
                <>
                  {STATUS_FILTER_LABELS[s]}
                  <span
                    className={cn(
                      "tabular -mr-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      params.status === s ? "bg-ink text-white" : "bg-surface-3 text-muted",
                    )}
                  >
                    {counts[s]}
                  </span>
                </>
              ),
            }))}
            className="bg-surface"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const value = query.trim();
              if (value !== params.q) navigate({ q: value });
            }}
            className="relative min-w-0 flex-1 xl:w-[300px] xl:flex-none"
          >
            <label htmlFor="patients-search" className="sr-only">
              Buscar pacientes
            </label>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted" />
            <input
              ref={inputRef}
              id="patients-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  setQuery("");
                }
              }}
              placeholder="Buscar por nombre o DNI"
              autoComplete="off"
              spellCheck={false}
              maxLength={80}
              className="h-11 w-full rounded-full bg-surface pr-11 pl-11 text-[15px] text-ink shadow-inset outline-none transition-shadow placeholder:text-subtle focus:shadow-[0_0_0_1.5px_var(--color-ink)] [&::-webkit-search-cancel-button]:appearance-none"
            />
            <span className="absolute top-1/2 right-1.5 -translate-y-1/2">
              {isPending ? (
                <span className="inline-flex size-8 items-center justify-center text-muted" aria-hidden>
                  <Spinner />
                </span>
              ) : query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Borrar búsqueda"
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </span>
          </form>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[13px] text-muted sm:inline-flex xl:hidden 2xl:inline-flex">
              <ArrowDownWideNarrow aria-hidden className="size-4" />
              Orden
            </span>
            <SegmentedControl<PatientSort>
              aria-label="Ordenar por"
              size="sm"
              value={params.sort}
              onChange={(sort) => navigate({ sort })}
              options={SORT_ORDER.map((s) => ({ value: s, label: SORT_LABELS[s] }))}
              className="bg-surface"
            />
          </div>
        </div>
      </div>

      <div
        aria-busy={isPending}
        className={cn("transition-opacity duration-200", isPending && "pointer-events-none opacity-55")}
      >
        {children}
      </div>
      <span className="sr-only" aria-live="polite">
        {isPending ? "Actualizando listado…" : ""}
      </span>
    </div>
  );
}
