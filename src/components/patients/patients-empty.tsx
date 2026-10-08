import { ArrowRight, ClipboardList, Plus, RotateCcw, SearchX, TrendingDown, UserRoundPlus, PersonStanding } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PainBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DecorCircles } from "@/components/ui/decor";
import { EmptyState } from "@/components/ui/empty-state";
import {
  patientListHref,
  type PatientListParams,
  type StatusCounts,
  type StatusFilter,
} from "@/lib/data/patients-types";

const FEATURES = [
  { icon: ClipboardList, title: "Historia clínica completa", text: "Antecedentes, evaluación y plan en un solo lugar." },
  { icon: PersonStanding, title: "Mapa corporal del dolor", text: "Marcá zonas e intensidad tocando el cuerpo." },
  { icon: TrendingDown, title: "Evolución sesión a sesión", text: "EVA antes y después, técnicas y notas SOAP." },
];

/** Estado vacío cuando el profesional todavía no cargó ningún paciente. */
export function PatientsWelcome() {
  return (
    <Card className="animate-fade-up grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10">
      <div>
        <span className="inline-flex h-8 items-center rounded-full bg-brand-50 px-3 text-[13px] font-medium text-brand">
          Primer paso
        </span>
        <h2 className="display mt-5 text-[34px] text-ink sm:text-[44px]">
          <span className="font-light text-muted">Tu consultorio</span>
          <br />
          <span className="font-medium">empieza acá</span>
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
          Cargá a tu primer paciente con sus datos y motivo de consulta. Después vas a poder completar la historia
          clínica, registrar el dolor y cada sesión.
        </p>
        <ButtonLink
          href="/pacientes/nuevo"
          size="lg"
          className="mt-7"
          icon={<UserRoundPlus />}
          iconRight={<ArrowRight />}
        >
          Agregá tu primer paciente
        </ButtonLink>

        <ul className="mt-9 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-1">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">
                <Icon className="size-[18px]" strokeWidth={1.7} aria-hidden />
              </span>
              <span>
                <span className="block text-[15px] font-medium text-ink">{title}</span>
                <span className="block text-[13px] text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div
        aria-hidden
        className="relative isolate hidden min-h-[380px] overflow-hidden rounded-[24px] bg-gradient-to-br from-brand-900 via-brand-800 to-brand p-6 sm:block"
      >
        <DecorCircles variant="a" className="-z-10 text-white/50" />
        <div className="absolute top-10 left-8 w-[min(300px,78%)] rotate-[-2deg] rounded-[22px] bg-white p-4 shadow-float">
          <div className="flex items-center gap-3">
            <Avatar person={{ id: "demo-a", first_name: "Lucía", last_name: "Fernández" }} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-ink">Lucía Fernández</p>
              <p className="truncate text-[13px] text-muted">38 años · Lumbalgia mecánica</p>
            </div>
            <PainBadge intensity={6} size="sm" />
          </div>
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < 4 ? "h-2 flex-1 rounded-full bg-accent" : "h-2 flex-1 rounded-full bg-surface-3"} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">4 de 10 sesiones</p>
        </div>
        <div className="absolute right-8 bottom-10 w-[min(250px,70%)] rotate-[2deg] rounded-[22px] bg-white p-4 shadow-float">
          <p className="text-[13px] text-muted">EVA · inicio → hoy</p>
          <p className="display tabular mt-1 text-[40px] text-ink">
            7 <span className="text-muted">→</span> 3
          </p>
          <p className="mt-1 text-[13px] font-medium text-success">57% de mejoría</p>
        </div>
      </div>
    </Card>
  );
}

const EMPTY_FILTER_COPY: Record<StatusFilter, { title: string; text: string }> = {
  active: { title: "No tenés pacientes en tratamiento", text: "Cuando cargues uno nuevo o reactives un tratamiento, va a aparecer acá." },
  discharged: { title: "Todavía no diste ningún alta", text: "Desde la ficha del paciente podés darle el alta cuando termine su tratamiento." },
  archived: { title: "No tenés pacientes archivados", text: "Archivá a quienes ya no atendés para mantener tu lista ordenada, sin perder su historia." },
  all: { title: "No hay pacientes", text: "Agregá tu primer paciente para empezar." },
};

const STATUS_PHRASE: Record<StatusFilter, string> = {
  active: "entre los pacientes en tratamiento",
  discharged: "entre los pacientes con alta",
  archived: "entre los archivados",
  all: "",
};

/** Sin resultados para la búsqueda o el filtro actual. */
export function PatientsNoResults({ params, counts }: { params: PatientListParams; counts: StatusCounts }) {
  const elsewhere = (["active", "discharged", "archived"] as const).filter((s) => s !== params.status && counts[s] > 0);

  if (params.q) {
    return (
      <Card className="animate-fade-up">
        <EmptyState
          icon={<SearchX />}
          title={`No encontramos “${params.q}”`}
          description={
            elsewhere.length > 0 && params.status !== "all"
              ? `No hay coincidencias ${STATUS_PHRASE[params.status]}, pero sí en otros estados.`
              : "Probá con otro nombre, apellido o número de documento."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {elsewhere.length > 0 && params.status !== "all" ? (
                <ButtonLink href={patientListHref({ ...params, status: "all", page: 1 })} variant="primary">
                  Ver en todos ({counts.all})
                </ButtonLink>
              ) : null}
              <ButtonLink href={patientListHref({ ...params, q: "", page: 1 })} variant="secondary" icon={<RotateCcw />}>
                Limpiar búsqueda
              </ButtonLink>
            </div>
          }
        />
      </Card>
    );
  }

  const copy = EMPTY_FILTER_COPY[params.status];
  return (
    <Card className="animate-fade-up">
      <EmptyState
        icon={<UserRoundPlus />}
        title={copy.title}
        description={copy.text}
        action={
          params.status === "active" ? (
            <ButtonLink href="/pacientes/nuevo" icon={<Plus />}>
              Nuevo paciente
            </ButtonLink>
          ) : (
            <ButtonLink href={patientListHref({ ...params, status: "active", page: 1 })} variant="secondary">
              Ver pacientes en tratamiento
            </ButtonLink>
          )
        }
      />
    </Card>
  );
}

export function PatientsLoadError({ href }: { href: string }) {
  return (
    <Card>
      <EmptyState
        icon={<RotateCcw />}
        title="No pudimos cargar tus pacientes"
        description="Puede ser un problema de conexión. Probá de nuevo en unos segundos."
        action={
          <ButtonLink href={href} variant="secondary" icon={<RotateCcw />} prefetch={false}>
            Reintentar
          </ButtonLink>
        }
      />
    </Card>
  );
}
