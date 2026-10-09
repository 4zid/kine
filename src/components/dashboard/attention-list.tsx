import { ArrowRight, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge, PainBadge } from "@/components/ui/badge";
import { DOT_COLORS } from "@/lib/constants";
import { cn, formatRelativeDay, fullName } from "@/lib/utils";
import { INACTIVE_DAYS, SEVERE_PAIN, type AttentionItem, type AttentionReason } from "@/components/dashboard/data";

const RED = DOT_COLORS[7];
const YELLOW = DOT_COLORS[3];

function reasonLabel(r: AttentionReason, painUpdatedAt: string | null): string {
  if (r.kind === "pain") return painUpdatedAt ? `Dolor intenso · ${formatRelativeDay(painUpdatedAt)}` : "Dolor intenso";
  return r.neverAttended ? `Sin primera sesión · ${r.days} días` : `${r.days} días sin sesión`;
}

/** Descripción completa para lectores de pantalla (el número solo no dice que es dolor). */
function painDescription(p: AttentionItem): string {
  if (p.maxPain == null) return "";
  const when = p.painUpdatedAt ? `, actualizado ${formatRelativeDay(p.painUpdatedAt)}` : "";
  return `Dolor por zona (mapa) ${p.maxPain} de 10${when}.`;
}

/** Pacientes en tratamiento con dolor intenso en el mapa o sin sesiones recientes. */
export function AttentionList({
  items,
  total,
  hasActivePatients,
  className,
}: {
  items: AttentionItem[];
  total: number;
  hasActivePatients: boolean;
  className?: string;
}) {
  return (
    <section aria-labelledby="attention-title" className={cn("min-w-0 rounded-card bg-surface p-6 sm:p-7", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="attention-title" className="display text-[24px] font-medium text-ink">
            Requieren atención
          </h2>
          <p className="mt-1 text-sm text-muted">
            Dolor por zona (mapa) de {SEVERE_PAIN} o más, o más de {INACTIVE_DAYS} días sin sesión.
          </p>
        </div>
        {total > 0 ? (
          <span className="tabular inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-ink px-2.5 text-sm font-semibold text-white">
            <span className="sr-only">Total: </span>
            {total}
          </span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ul className="-mx-2 flex flex-col gap-1">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pacientes/${p.id}`}
                className="group flex min-w-0 items-center gap-3 rounded-[20px] p-2 transition-colors hover:bg-surface-2"
              >
                <Avatar person={p} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{fullName(p)}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {p.reasons.map((r) => (
                      <Badge key={r.kind} dot={r.kind === "pain" ? RED : YELLOW} className="h-6 px-2 text-xs">
                        {reasonLabel(r, p.painUpdatedAt)}
                      </Badge>
                    ))}
                  </span>
                </span>
                {p.maxPain != null ? (
                  <>
                    <span aria-hidden>
                      <PainBadge intensity={p.maxPain} />
                    </span>
                    <span className="sr-only">{painDescription(p)}</span>
                  </>
                ) : null}
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-4 rounded-panel bg-surface-2 p-5">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-success-50 text-success">
            <ShieldCheck aria-hidden className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-ink">{hasActivePatients ? "Todo en orden" : "Nada por revisar"}</p>
            <p className="mt-0.5 text-sm text-muted">
              {hasActivePatients
                ? "Ningún paciente con dolor intenso ni sin sesiones recientes."
                : "Acá vas a ver a quién conviene llamar o revisar primero."}
            </p>
          </div>
        </div>
      )}

      {total > items.length ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-[13px] text-muted">
            Mostramos {items.length} de {total}.
          </p>
          <Link
            href="/pacientes?orden=dolor"
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-1 text-sm font-medium text-ink hover:underline"
          >
            Ver pacientes por dolor
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
