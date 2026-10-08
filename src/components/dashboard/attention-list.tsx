import { ArrowRight, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge, PainBadge } from "@/components/ui/badge";
import { DOT_COLORS } from "@/lib/constants";
import { cn, fullName } from "@/lib/utils";
import { INACTIVE_DAYS, SEVERE_PAIN, type AttentionItem, type AttentionReason } from "@/components/dashboard/data";

const RED = DOT_COLORS[7];
const YELLOW = DOT_COLORS[3];

function reasonLabel(r: AttentionReason): string {
  if (r.kind === "pain") return "Dolor intenso";
  return r.neverAttended ? `Sin primera sesión · ${r.days} días` : `${r.days} días sin sesión`;
}

/** Pacientes activos con dolor intenso o sin sesiones recientes. */
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
    <section aria-labelledby="attention-title" className={cn("rounded-card bg-surface p-6 sm:p-7", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="attention-title" className="display text-[24px] font-medium text-ink">
            Requieren atención
          </h2>
          <p className="mt-1 text-sm text-muted">
            EVA {SEVERE_PAIN} o más, o más de {INACTIVE_DAYS} días sin sesión.
          </p>
        </div>
        {total > 0 ? (
          <span className="tabular inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-ink px-2.5 text-sm font-semibold text-white">
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
                className="group flex items-center gap-3 rounded-[20px] p-2 transition-colors hover:bg-surface-2"
              >
                <Avatar person={p} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{fullName(p)}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {p.reasons.map((r) => (
                      <Badge
                        key={r.kind}
                        dot={r.kind === "pain" ? RED : YELLOW}
                        className="h-6 px-2 text-xs"
                      >
                        {reasonLabel(r)}
                      </Badge>
                    ))}
                  </span>
                </span>
                {p.maxPain != null ? <PainBadge intensity={p.maxPain} /> : null}
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
            <ShieldCheck className="size-5" strokeWidth={1.8} />
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
        <Link
          href="/pacientes"
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full px-1 text-sm font-medium text-ink hover:underline"
        >
          Ver los {total} pacientes
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </section>
  );
}
