import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PATIENTS_PAGE_SIZE, patientListHref, type PatientListParams } from "@/lib/data/patients-types";
import { cn } from "@/lib/utils";

/** Números de página a mostrar, con huecos (null) cuando hay muchas. */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

const roundBtn =
  "inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-inset transition-colors hover:bg-surface-2 [&_svg]:size-[18px]";

export function PatientsPagination({
  params,
  page,
  pageCount,
  total,
}: {
  params: PatientListParams;
  page: number;
  pageCount: number;
  total: number;
}) {
  if (total === 0) return null;
  const from = (page - 1) * PATIENTS_PAGE_SIZE + 1;
  const to = Math.min(page * PATIENTS_PAGE_SIZE, total);
  const href = (p: number) => patientListHref({ ...params, page: p });

  return (
    <nav aria-label="Paginación" className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
      <p className="tabular text-sm text-muted">
        {pageCount > 1 ? (
          <>
            Mostrando <span className="font-medium text-ink">{from}–{to}</span> de{" "}
            <span className="font-medium text-ink">{total}</span>
          </>
        ) : (
          <>
            <span className="font-medium text-ink">{total}</span> {total === 1 ? "paciente" : "pacientes"}
          </>
        )}
      </p>

      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={href(page - 1)} className={roundBtn} aria-label="Página anterior" scroll>
              <ChevronLeft />
            </Link>
          ) : (
            <span className={cn(roundBtn, "pointer-events-none opacity-40")} aria-hidden>
              <ChevronLeft />
            </span>
          )}
          <ul className="flex items-center gap-1">
            {pageWindow(page, pageCount).map((p, i) =>
              p == null ? (
                <li key={`gap-${i}`} aria-hidden className="w-6 text-center text-muted">
                  …
                </li>
              ) : (
                <li key={p} className={cn(p !== page && Math.abs(p - page) > 1 && p !== 1 && p !== pageCount && "hidden sm:block")}>
                  <Link
                    href={href(p)}
                    aria-label={`Página ${p}`}
                    aria-current={p === page ? "page" : undefined}
                    className={cn(
                      "tabular inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors",
                      p === page ? "bg-ink text-white" : "text-ink-2 hover:bg-surface",
                    )}
                  >
                    {p}
                  </Link>
                </li>
              ),
            )}
          </ul>
          {page < pageCount ? (
            <Link href={href(page + 1)} className={roundBtn} aria-label="Página siguiente" scroll>
              <ChevronRight />
            </Link>
          ) : (
            <span className={cn(roundBtn, "pointer-events-none opacity-40")} aria-hidden>
              <ChevronRight />
            </span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
