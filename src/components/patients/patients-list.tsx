import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { PainBadge } from "@/components/ui/badge";
import { PatientActionsMenu } from "@/components/patients/patient-actions-menu";
import { ageLabel, excerpt, plural, sexLabel, statusMeta } from "@/components/patients/format";
import type { PatientListItem } from "@/lib/data/patients-types";
import { cn, formatRelativeDay, fullName } from "@/lib/utils";

/** Grillas de columnas según el ancho del contenedor (container queries). */
const FULL_COLS = "@min-[880px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1.5fr)_minmax(0,0.75fr)_8.5rem_7.5rem_2.5rem]";
const ROW_GRID = `@min-[600px]:grid @min-[600px]:grid-cols-[minmax(0,1fr)_8.5rem_7.5rem_2.5rem] @min-[600px]:items-center @min-[600px]:gap-5 ${FULL_COLS}`;

function ColumnHeaders() {
  return (
    <div
      aria-hidden
      className={cn(
        "hidden gap-5 px-4 pt-3 pb-2 text-[12px] font-medium tracking-[0.08em] text-subtle uppercase @min-[880px]:grid",
        FULL_COLS,
      )}
    >
      <span>Paciente</span>
      <span>Motivo de consulta</span>
      <span>Obra social</span>
      <span>Última sesión</span>
      <span>Dolor actual</span>
      <span />
    </div>
  );
}

function PatientRow({ patient }: { patient: PatientListItem }) {
  const name = fullName(patient);
  const meta = [ageLabel(patient.birth_date), sexLabel(patient.sex)].filter(Boolean).join(" · ");
  const reason = excerpt(patient.consultation_reason ?? patient.kinesic_diagnosis ?? patient.medical_diagnosis, 160);
  const status = statusMeta(patient.status);
  const lastSession = patient.last_session_date ? formatRelativeDay(patient.last_session_date) : null;

  return (
    <li className="group relative rounded-card bg-surface p-5 transition-colors @min-[600px]:rounded-[20px] @min-[600px]:bg-transparent @min-[600px]:px-4 @min-[600px]:py-3.5 @min-[600px]:hover:bg-surface-2/80">
      <Link
        href={`/pacientes/${patient.id}`}
        aria-label={`Ver ficha de ${name}`}
        className="absolute inset-0 rounded-[inherit] focus-visible:outline-offset-[-2px]"
      />
      <div className={cn("pointer-events-none relative flex flex-col gap-3.5", ROW_GRID)}>
        {/* Paciente */}
        <div className="flex min-w-0 items-center gap-3.5 pr-12 @min-[600px]:pr-0">
          <Avatar person={patient} size="md" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-ink">{name}</p>
            <p className="truncate text-[13px] text-muted">
              {patient.status !== "active" ? (
                <span className="font-medium" style={{ color: status.color }}>
                  <span aria-hidden className="mr-1 inline-block size-1.5 -translate-y-px rounded-full align-middle" style={{ backgroundColor: status.color }} />
                  {status.label}
                  {meta ? " · " : ""}
                </span>
              ) : null}
              {meta || (patient.status === "active" ? "Sin datos personales" : "")}
            </p>
            {/* En filas compactas, el motivo va debajo del nombre. */}
            <p className="hidden truncate text-[13px] text-ink-2 @min-[600px]:block @min-[880px]:hidden">
              {reason ?? <span className="text-subtle">Sin motivo de consulta</span>}
            </p>
          </div>
        </div>

        {/* Motivo de consulta */}
        <p
          className={cn(
            "line-clamp-2 text-sm leading-relaxed @min-[600px]:hidden @min-[880px]:block @min-[880px]:truncate",
            reason ? "text-ink-2" : "text-subtle",
          )}
        >
          {reason ?? "Sin motivo de consulta cargado"}
        </p>

        {/* Pie (mobile) / celdas (desktop) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3.5 @min-[600px]:contents">
          <span className="min-w-0 truncate text-[13px] @min-[600px]:hidden @min-[880px]:block @min-[880px]:text-sm">
            {patient.health_insurance ? (
              <span className="text-ink-2">{patient.health_insurance}</span>
            ) : (
              <span className="text-subtle">Sin obra social</span>
            )}
          </span>

          <span aria-hidden className="size-1 rounded-full bg-line-strong @min-[600px]:hidden" />

          <span className="min-w-0 text-[13px] @min-[600px]:flex @min-[600px]:flex-col">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 @min-[600px]:text-sm",
                lastSession ? "text-ink-2" : "text-subtle",
              )}
            >
              <CalendarDays aria-hidden className="size-3.5 text-muted @min-[600px]:hidden" />
              {lastSession ? <span className="sr-only">Última sesión </span> : null}
              {lastSession ?? "Sin sesiones"}
            </span>
            {patient.session_count > 0 ? (
              <span className="hidden text-xs text-muted @min-[600px]:inline">
                {plural(patient.session_count, "sesión", "sesiones")}
              </span>
            ) : null}
          </span>

          <span className="ml-auto flex items-center gap-2 @min-[600px]:ml-0">
            <PainBadge intensity={patient.max_pain} size="sm" />
            {patient.max_pain != null && patient.active_regions > 0 ? (
              <span className="text-xs whitespace-nowrap text-muted">{plural(patient.active_regions, "zona", "zonas")}</span>
            ) : patient.max_pain === 0 ? (
              <span className="text-xs whitespace-nowrap text-muted">sin dolor</span>
            ) : null}
          </span>
        </div>

        {/* Menú */}
        <div className="pointer-events-auto absolute -top-1.5 -right-1.5 @min-[600px]:static @min-[600px]:flex @min-[600px]:justify-end">
          <PatientActionsMenu
            context="list"
            patient={{ id: patient.id, first_name: patient.first_name, last_name: patient.last_name, status: patient.status }}
          />
        </div>
      </div>
    </li>
  );
}

/** Listado de pacientes: filas dentro de una tarjeta (desktop) o tarjetas apiladas (mobile). */
export function PatientsList({ items }: { items: PatientListItem[] }) {
  return (
    <div className="@container animate-fade-up">
      <div className="@min-[600px]:rounded-card @min-[600px]:bg-surface @min-[600px]:p-2">
        <ColumnHeaders />
        <ul className="flex flex-col gap-3 @min-[600px]:gap-0.5">
          {items.map((p) => (
            <PatientRow key={p.id} patient={p} />
          ))}
        </ul>
      </div>
    </div>
  );
}
