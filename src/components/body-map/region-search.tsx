"use client";

import { Search, X } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { PainBadge } from "@/components/ui/badge";
import { BODY_REGIONS, REGION_GROUPS, type BodyRegion } from "@/lib/body-regions";
import { cn } from "@/lib/utils";
import { isPainful } from "./figure-style";
import type { RegionPaint } from "./types";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const VIEW_SHORT = { front: "Frente", back: "Espalda" } as const;

const SEARCH_INDEX = BODY_REGIONS.map((r) => ({
  region: r,
  haystack: normalize(`${r.label} ${r.short} ${REGION_GROUPS[r.group]} ${VIEW_SHORT[r.view]}`),
}));

/**
 * Buscador accesible de zonas (combobox + listbox): alternativa a tocar el mapa,
 * ideal para zonas chicas y para usuarios de teclado o lector de pantalla.
 */
export function RegionSearch({
  paint,
  onSelect,
  className,
}: {
  paint: Record<string, RegionPaint>;
  onSelect: (regionId: string) => void;
  className?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo<BodyRegion[]>(() => {
    const q = normalize(query);
    if (!q) {
      // Sin búsqueda: primero las zonas con dolor, luego el resto.
      const painful = BODY_REGIONS.filter((r) => isPainful(paint[r.id]));
      return [...painful, ...BODY_REGIONS.filter((r) => !isPainful(paint[r.id]))];
    }
    const terms = q.split(/\s+/);
    return SEARCH_INDEX.filter((e) => terms.every((t) => e.haystack.includes(t))).map((e) => e.region);
  }, [query, paint]);

  const choose = (r: BodyRegion | undefined) => {
    if (!r) return;
    onSelect(r.id);
    setQuery("");
    setOpen(false);
    setActive(0);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, open ? a + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      } else if (query) {
        setQuery("");
      }
    }
  };

  const activeId = open && results[active] ? `${id}-opt-${results[active].id}` : undefined;

  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="Buscar zona del cuerpo"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        spellCheck={false}
        placeholder="Buscar zona…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-full bg-surface-2 pr-9 pl-10 text-sm text-ink outline-none placeholder:text-subtle transition-[background-color,box-shadow] hover:bg-surface-3/70 focus:bg-surface focus:shadow-[0_0_0_1.5px_var(--color-ink)]"
      />
      {query ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-1.5 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-3 hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      ) : null}

      <div
        className={cn(
          "absolute top-[calc(100%+8px)] right-0 left-0 z-30 min-w-64 overflow-hidden rounded-2xl bg-surface shadow-float sm:left-auto sm:w-80",
          !open && "hidden",
        )}
      >
        <ul id={listId} role="listbox" aria-label="Zonas del cuerpo" className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted">No encontramos esa zona.</li>
          ) : (
            results.map((r, i) => {
              const p = paint[r.id];
              return (
                <li
                  key={r.id}
                  id={`${id}-opt-${r.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm",
                    i === active ? "bg-surface-2" : "",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{r.label}</span>
                    <span className="block text-xs text-muted">
                      {VIEW_SHORT[r.view]} · {REGION_GROUPS[r.group]}
                    </span>
                  </span>
                  {isPainful(p) ? <PainBadge intensity={p.intensity} size="sm" /> : null}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
