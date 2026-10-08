"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { notify } from "@/components/clinical-history/notify";
import { Button } from "@/components/ui/button";
import { MAX_ROWS } from "@/components/clinical-history/schema";
import { cn } from "@/lib/utils";

export type RowsUpdater<T> = (updater: (rows: T[]) => T[]) => void;

type RenderArgs<T> = {
  row: T;
  index: number;
  /** Botón para quitar la fila (ubicarlo dentro de la grilla de la fila). */
  remove: ReactNode;
  /** true para la fila recién agregada (enfocar su primer campo). */
  isNew: boolean;
};

/**
 * Lista editable de filas (goniometría, fuerza, pruebas, escalas):
 * agregar, quitar con "Deshacer", estado vacío y tope de filas.
 */
export function RowList<T extends { id: string }>({
  rows,
  onRowsChange,
  createRow,
  renderRow,
  addLabel,
  noun,
  empty,
  icon,
  error,
}: {
  rows: T[];
  onRowsChange: RowsUpdater<T>;
  /** Crea una fila nueva a partir de la última (para heredar articulación / lado). */
  createRow: (last: T | undefined) => T;
  renderRow: (args: RenderArgs<T>) => ReactNode;
  addLabel: string;
  /** Sustantivos para contadores y mensajes ("medición", "mediciones", "Quitaste una medición"). */
  noun: { one: string; many: string; removed: string };
  empty: { title: string; description: string };
  icon: ReactNode;
  error?: string | null;
}) {
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const atLimit = rows.length >= MAX_ROWS;

  const add = () => {
    if (atLimit) return;
    const row = createRow(rows[rows.length - 1]);
    setLastAddedId(row.id);
    onRowsChange((list) => [...list, row]);
  };

  const removeAt = (index: number) => {
    const removed = rows[index];
    if (!removed) return;
    onRowsChange((list) => list.filter((r) => r.id !== removed.id));
    notify.info(noun.removed, {
      action: {
        label: "Deshacer",
        onClick: () =>
          onRowsChange((list) => {
            if (list.some((r) => r.id === removed.id)) return list;
            const next = [...list];
            next.splice(Math.min(index, next.length), 0, removed);
            return next;
          }),
      },
    });
  };

  return (
    <div className="@container">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-panel border border-dashed border-line-strong px-6 py-8 text-center">
          <span className="mb-3 inline-flex size-11 items-center justify-center rounded-full bg-surface-2 text-ink-2 [&_svg]:size-5">
            {icon}
          </span>
          <p className="text-[15px] font-medium text-ink">{empty.title}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">{empty.description}</p>
          <Button variant="primary" size="sm" className="mt-5" icon={<Plus />} onClick={add}>
            {addLabel}
          </Button>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {rows.map((row, index) => (
              <li
                key={row.id}
                className={cn("rounded-panel bg-surface-2 p-3 sm:p-3.5", row.id === lastAddedId && "animate-fade-up")}
              >
                {renderRow({
                  row,
                  index,
                  isNew: row.id === lastAddedId,
                  remove: (
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      aria-label={`Quitar ${noun.one} ${index + 1}`}
                      title={`Quitar ${noun.one}`}
                      className="mt-[7px] inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-danger-50 hover:text-danger"
                    >
                      <Trash2 className="size-[18px]" strokeWidth={1.8} />
                    </button>
                  ),
                })}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Button variant="soft" size="sm" icon={<Plus />} onClick={add} disabled={atLimit}>
              {addLabel}
            </Button>
            <p className="tabular text-[13px] text-muted">
              {atLimit
                ? `Llegaste al máximo de ${MAX_ROWS} ${noun.many}`
                : `${rows.length} ${rows.length === 1 ? noun.one : noun.many}`}
            </p>
          </div>
        </>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
