"use client";

import { ArrowRight, Printer } from "lucide-react";
import Form from "next/form";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { PeriodKind } from "@/components/report/report-utils";

function label(short: string, long: string) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{long}</span>
    </>
  );
}

const OPTIONS: { value: PeriodKind; label: ReactNode }[] = [
  { value: "todo", label: label("Todo", "Todo el tratamiento") },
  { value: "30d", label: label("30 días", "Últimos 30 días") },
  { value: "personalizado", label: "Personalizado" },
];

/** Botón negro "Imprimir / PDF" (el diálogo del navegador permite guardar como PDF). */
export function PrintButton({ className }: { className?: string }) {
  return (
    <Button icon={<Printer />} onClick={() => window.print()} className={className}>
      Imprimir / PDF
    </Button>
  );
}

/**
 * Encabezado de la pestaña y controles del informe (no se imprimen): título, botón de impresión
 * y período (todo / 30 días / personalizado con desde–hasta en la URL).
 */
export function ReportControls({
  kind,
  from,
  to,
  max,
}: {
  kind: PeriodKind;
  from: string;
  to: string;
  /** Hoy ("YYYY-MM-DD"), tope de las fechas. */
  max: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<PeriodKind>(kind);
  const [desde, setDesde] = useState(from);
  const [hasta, setHasta] = useState(to);
  // Navegación atrás/adelante: seguir al período de la URL.
  const [syncedKind, setSyncedKind] = useState(kind);
  if (kind !== syncedKind) {
    setSyncedKind(kind);
    setSelected(kind);
  }

  const choose = (value: PeriodKind) => {
    setSelected(value);
    if (value === "personalizado") return;
    startTransition(() => {
      router.replace(value === "todo" ? pathname : `${pathname}?periodo=${value}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col gap-4 print:hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="display text-2xl font-medium text-ink">Informe</h2>
          <p className="mt-1 text-[14px] text-muted sm:text-[15px]">
            Vista previa del documento para imprimir o guardar como PDF.
          </p>
        </div>
        <PrintButton className="self-start sm:self-auto" />
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <SegmentedControl<PeriodKind>
            aria-label="Período del informe"
            options={OPTIONS}
            value={selected}
            onChange={choose}
            className="bg-surface p-1.5 [&>button]:h-10"
          />
        </div>
        {pending ? <Spinner className="size-5 text-muted" /> : null}
      </div>

      {selected === "personalizado" ? (
        <Form
          action={pathname}
          scroll={false}
          className="flex animate-fade-in flex-wrap items-end gap-3 self-start rounded-panel bg-surface p-4 shadow-inset sm:p-5"
        >
          <input type="hidden" name="periodo" value="personalizado" />
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">Desde</span>
            <input
              type="date"
              name="desde"
              value={desde}
              max={hasta || max}
              onChange={(e) => setDesde(e.target.value)}
              required
              className="tabular h-11 rounded-field bg-surface-2 px-4 text-[15px] text-ink outline-none focus:bg-surface focus:shadow-[0_0_0_1.5px_var(--color-ink)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">Hasta</span>
            <input
              type="date"
              name="hasta"
              value={hasta}
              min={desde || undefined}
              max={max}
              onChange={(e) => setHasta(e.target.value)}
              required
              className="tabular h-11 rounded-field bg-surface-2 px-4 text-[15px] text-ink outline-none focus:bg-surface focus:shadow-[0_0_0_1.5px_var(--color-ink)]"
            />
          </label>
          <Button
            type="submit"
            variant="secondary"
            iconRight={<ArrowRight />}
            className={cn("h-11", kind === "personalizado" && from === desde && to === hasta && "opacity-60")}
          >
            Aplicar
          </Button>
        </Form>
      ) : null}
    </div>
  );
}
