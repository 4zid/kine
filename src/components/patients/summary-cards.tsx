import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  FileText,
  Mail,
  Minus,
  Pencil,
  Phone,
  Plus,
  PersonStanding,
  Upload,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, PainBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DecorCircles } from "@/components/ui/decor";
import { PainEvolutionChart } from "@/components/patients/pain-evolution-chart";
import { PAIN_SERIES as SERIES, PAIN_SERIES_KEYS } from "@/components/patients/pain-series";
import {
  ageLabel,
  dayParts,
  documentLabel,
  dominantSideLabel,
  excerpt,
  plural,
  sexLabel,
  techniqueLabel,
  telHref,
} from "@/components/patients/format";
import { getRegionLabel } from "@/lib/body-regions";
import { ATTENDANCE, PAIN_STATUS, PAIN_TYPES, STUDY_KINDS } from "@/lib/constants";
import type { PatientSummaryData } from "@/lib/data/patients-types";
import type { Patient } from "@/lib/types";
import { cn, formatDate, formatRelativeDay } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Piezas comunes
// ---------------------------------------------------------------------------
function IconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex size-10 items-center justify-center rounded-full bg-surface-2 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink [&_svg]:size-4"
    >
      {children}
    </Link>
  );
}

function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <ButtonLink href={href} variant="soft" size="sm" iconRight={<ArrowRight />}>
      {children}
    </ButtonLink>
  );
}

function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-panel bg-surface-2 p-5">
      <p className="text-sm leading-relaxed text-muted">{children}</p>
      {action}
    </div>
  );
}

type DataItem = { label: string; value: ReactNode | null | undefined; wide?: boolean };

function DataList({ items, columns = 2 }: { items: DataItem[]; columns?: 1 | 2 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", columns === 2 && "sm:grid-cols-2")}>
      {items.map((item) => (
        <div key={item.label} className={cn("min-w-0", item.wide && columns === 2 && "sm:col-span-2")}>
          <dt className="text-[13px] text-muted">{item.label}</dt>
          <dd className={cn("mt-0.5 text-[15px] break-words", item.value ? "text-ink" : "text-subtle")}>
            {item.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Motivo de consulta
// ---------------------------------------------------------------------------
export function ReasonCard({ patient, className }: { patient: Patient; className?: string }) {
  const base = `/pacientes/${patient.id}`;
  const panels = [
    { label: "Diagnóstico médico", value: patient.medical_diagnosis },
    { label: "Diagnóstico kinésico", value: patient.kinesic_diagnosis },
    { label: "Mecanismo de lesión", value: patient.injury_mechanism },
  ].filter((p) => p.value);

  return (
    <Card className={className}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-[15px] text-muted">Motivo de consulta</p>
        <IconLink href={`${base}/editar#consulta`} label="Editar motivo de consulta">
          <Pencil />
        </IconLink>
      </div>
      {patient.consultation_reason ? (
        <p className="display line-clamp-5 text-[24px] leading-[1.2] font-normal whitespace-pre-line text-ink sm:text-[28px]">
          {patient.consultation_reason}
        </p>
      ) : (
        <p className="display text-[24px] leading-tight font-normal text-subtle sm:text-[28px]">
          ¿Qué lo trae a la consulta?{" "}
          <Link href={`${base}/editar#consulta`} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            Completalo
          </Link>
        </p>
      )}

      {patient.onset_date ? (
        <p className="mt-5 inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-2xl bg-surface-2 px-3.5 py-2 text-[13px] text-ink-2">
          <CalendarDays className="mr-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <span>Síntomas desde el</span>
          <span className="font-medium text-ink">{formatDate(patient.onset_date)}</span>
          <span className="text-muted">· {formatRelativeDay(patient.onset_date)}</span>
        </p>
      ) : null}

      {panels.length > 0 ? (
        <div className={cn("mt-5 grid gap-3", panels.length > 1 && "sm:grid-cols-2")}>
          {panels.map((p) => (
            <div key={p.label} className={cn("rounded-panel bg-surface-2 p-4", panels.length === 3 && p.label === "Mecanismo de lesión" && "sm:col-span-2")}>
              <p className="text-[13px] text-muted">{p.label}</p>
              <p className="mt-1 line-clamp-4 text-[15px] leading-relaxed whitespace-pre-line text-ink">{p.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">
          Sin diagnósticos cargados.{" "}
          <Link href={`${base}/editar#consulta`} className="font-medium text-ink underline-offset-4 hover:underline">
            Agregalos
          </Link>
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Progreso (tarjeta azul)
// ---------------------------------------------------------------------------
export function ProgressCard({
  patientId,
  summary,
  prescribedSessions,
  className,
}: {
  patientId: string;
  summary: PatientSummaryData;
  prescribedSessions: number | null;
  className?: string;
}) {
  const { initialPain, currentPain, attendedCount, lastSessionDate } = summary;
  const base = `/pacientes/${patientId}`;
  const improvement =
    initialPain && currentPain && initialPain.value > 0
      ? Math.round(((initialPain.value - currentPain.value) / initialPain.value) * 100)
      : null;
  const prescribed = prescribedSessions && prescribedSessions > 0 ? prescribedSessions : null;
  const segmentCount = prescribed ? Math.min(prescribed, 20) : 0;
  const filled = prescribed ? Math.round((Math.min(attendedCount, prescribed) / prescribed) * segmentCount) : 0;

  return (
    <section
      aria-labelledby="progress-title"
      className={cn(
        "relative isolate flex min-h-[320px] flex-col overflow-hidden rounded-card bg-accent p-6 text-white sm:p-7",
        className,
      )}
    >
      <DecorCircles variant="a" className="-z-10 text-white/70" />
      <div className="flex items-start justify-between gap-4">
        <h2
          id="progress-title"
          className="inline-flex h-10 items-center rounded-full px-5 text-[15px] font-medium shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.7)]"
        >
          Progreso
        </h2>
        <Link
          href={`${base}/sesiones`}
          aria-label="Ver sesiones"
          className="inline-flex size-12 items-center justify-center rounded-full shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.55)] transition-colors hover:bg-white/10 focus-visible:outline-white"
        >
          <ArrowUpRight className="size-5" strokeWidth={1.8} />
        </Link>
      </div>

      {attendedCount === 0 ? (
        <div className="mt-auto pt-10">
          <p className="display text-[34px] leading-none font-normal sm:text-[40px]">Sin sesiones todavía</p>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/80">
            Registrá la primera sesión con la EVA al inicio y al final para empezar a medir la evolución.
          </p>
          <ButtonLink href={`${base}/sesiones/nueva`} variant="inverse" className="mt-6" iconRight={<ArrowRight />}>
            Nueva sesión
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-auto pt-8">
          <dl className="flex items-end gap-6 sm:gap-8">
            <div>
              <dt className="text-[15px] text-white/75">EVA inicial</dt>
              <dd className="display tabular mt-1 flex items-baseline text-[56px] leading-none sm:text-[68px]">
                {initialPain?.value ?? "—"}
                <span className="ml-1 text-lg text-white/65">/10</span>
              </dd>
            </div>
            <div>
              <dt className="text-[15px] text-white/75">EVA actual</dt>
              <dd className="display tabular mt-1 flex items-baseline text-[56px] leading-none sm:text-[68px]">
                {currentPain?.value ?? "—"}
                <span className="ml-1 text-lg text-white/65">/10</span>
              </dd>
            </div>
          </dl>

          {improvement != null ? (
            <p className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3 text-[13px] font-medium">
              {improvement > 0 ? (
                <ArrowDownRight className="size-4" aria-hidden />
              ) : improvement < 0 ? (
                <ArrowUpRight className="size-4" aria-hidden />
              ) : (
                <Minus className="size-4" aria-hidden />
              )}
              {improvement > 0
                ? `${improvement}% de mejoría`
                : improvement < 0
                  ? `${Math.abs(improvement)}% más dolor`
                  : "Sin cambios en la EVA"}
            </p>
          ) : null}

          <div className="mt-6">
            {prescribed ? (
              <>
                <div className="flex gap-1.5" aria-hidden>
                  {Array.from({ length: segmentCount }, (_, i) => (
                    <span key={i} className={cn("h-2 flex-1 rounded-full", i < filled ? "bg-white" : "bg-white/25")} />
                  ))}
                </div>
                <p className="mt-2.5 text-[15px] text-white/85">
                  <span className="font-medium text-white">
                    {Math.min(attendedCount, prescribed)} de {prescribed}
                  </span>{" "}
                  sesiones indicadas
                  {attendedCount > prescribed ? ` · ${attendedCount - prescribed} extra` : ""}
                  {lastSessionDate ? ` · última ${formatRelativeDay(lastSessionDate)}` : ""}
                </p>
              </>
            ) : (
              <p className="text-[15px] text-white/85">
                <span className="font-medium text-white">{plural(attendedCount, "sesión realizada", "sesiones realizadas")}</span>
                {lastSessionDate ? ` · última ${formatRelativeDay(lastSessionDate)}` : ""}
                <br />
                <Link
                  href={`${base}/historia`}
                  className="text-[13px] text-white/70 underline decoration-white/40 underline-offset-4 hover:text-white"
                >
                  Indicá las sesiones prescriptas en la historia clínica
                </Link>
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dolor actual
// ---------------------------------------------------------------------------
const PAIN_TYPE_LABELS = Object.fromEntries(PAIN_TYPES.map((t) => [t.value, t.label]));
const MAX_ZONES = 6;

export function PainNowCard({
  patientId,
  zones,
  bodyMapSlot,
  className,
}: {
  patientId: string;
  zones: PatientSummaryData["painZones"];
  /** Lugar reservado para la vista previa del mapa corporal (BodyMapPreview). */
  bodyMapSlot?: ReactNode;
  className?: string;
}) {
  const base = `/pacientes/${patientId}`;
  const shown = zones.slice(0, MAX_ZONES);

  const list =
    zones.length === 0 ? (
      <Empty
        action={
          <ButtonLink href={`${base}/mapa`} size="sm" icon={<PersonStanding />}>
            Registrar dolor
          </ButtonLink>
        }
      >
        Sin zonas de dolor activas. Registrá el dolor tocando las zonas en el mapa corporal.
      </Empty>
    ) : (
      <ul className="flex flex-col gap-2">
        {shown.map((z) => {
          const status = PAIN_STATUS[z.status];
          const types = z.pain_types.map((t) => PAIN_TYPE_LABELS[t] ?? t).slice(0, 2);
          return (
            <li key={z.id} className="flex items-center gap-3.5 rounded-2xl bg-surface-2 px-3.5 py-3">
              <PainBadge intensity={z.intensity} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">{getRegionLabel(z.region)}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                    {status.label}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{formatRelativeDay(z.recorded_at)}</span>
                  {types.length > 0 ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="truncate">{types.join(", ").toLowerCase()}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          );
        })}
        {zones.length > MAX_ZONES ? (
          <li className="px-1 pt-1 text-[13px] text-muted">+ {plural(zones.length - MAX_ZONES, "zona más", "zonas más")}</li>
        ) : null}
      </ul>
    );

  return (
    <Card className={className}>
      <CardHeader
        title="Dolor actual"
        description={
          zones.length > 0
            ? `${plural(zones.length, "zona", "zonas")} con dolor · máx. ${zones[0].intensity}/10`
            : "Último registro de cada zona"
        }
        action={zones.length > 0 ? <MoreLink href={`${base}/mapa`}>Ver mapa corporal</MoreLink> : null}
      />
      {bodyMapSlot ? (
        <div className="grid gap-5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:items-start">
          <div className="min-w-0">{bodyMapSlot}</div>
          {list}
        </div>
      ) : (
        list
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Evolución del dolor
// ---------------------------------------------------------------------------
export function EvolutionCard({
  patientId,
  evolution,
  className,
}: {
  patientId: string;
  evolution: PatientSummaryData["evolution"];
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title="Evolución del dolor"
        description="EVA por sesión"
        className="mb-4"
        action={
          evolution.length >= 2 ? (
            <ul className="hidden flex-col items-end gap-1 sm:flex" aria-label="Referencias">
              {PAIN_SERIES_KEYS.map((k) => (
                <li key={k} className="flex items-center gap-2 text-[13px] text-muted">
                  <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ backgroundColor: SERIES[k].color }} />
                  {SERIES[k].label}
                </li>
              ))}
            </ul>
          ) : null
        }
      />
      {evolution.length >= 2 ? (
        <>
          <ul className="mb-3 flex gap-4 sm:hidden" aria-hidden>
            {PAIN_SERIES_KEYS.map((k) => (
              <li key={k} className="flex items-center gap-2 text-[13px] text-muted">
                <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: SERIES[k].color }} />
                {SERIES[k].label}
              </li>
            ))}
          </ul>
          <PainEvolutionChart points={evolution} className="mt-auto" />
        </>
      ) : (
        <Empty
          action={
            <ButtonLink href={`/pacientes/${patientId}/sesiones/nueva`} variant="secondary" size="sm" icon={<Plus />}>
              Nueva sesión
            </ButtonLink>
          }
        >
          {evolution.length === 1
            ? "Con una sesión más con EVA vas a ver acá la curva de evolución."
            : "Registrá la EVA al inicio y al final de cada sesión para ver la curva de evolución."}
        </Empty>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Últimas sesiones
// ---------------------------------------------------------------------------
export function RecentSessionsCard({
  patientId,
  sessions,
  totalSessions,
  className,
}: {
  patientId: string;
  sessions: PatientSummaryData["recentSessions"];
  totalSessions: number;
  className?: string;
}) {
  const base = `/pacientes/${patientId}`;
  return (
    <Card className={className}>
      <CardHeader
        title="Últimas sesiones"
        description={totalSessions > 0 ? `${plural(totalSessions, "sesión registrada", "sesiones registradas")}` : undefined}
        action={totalSessions > 0 ? <MoreLink href={`${base}/sesiones`}>Ver todas</MoreLink> : null}
      />
      {sessions.length === 0 ? (
        <Empty
          action={
            <ButtonLink href={`${base}/sesiones/nueva`} size="sm" icon={<Plus />}>
              Nueva sesión
            </ButtonLink>
          }
        >
          Todavía no registraste sesiones. Cada sesión guarda la evolución SOAP, las técnicas aplicadas y la EVA.
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => {
            const day = dayParts(s.session_date);
            const techniques = s.techniques.map(techniqueLabel);
            const attended = s.attendance === "attended";
            return (
              <li key={s.id}>
                <Link
                  href={`${base}/sesiones`}
                  className="flex gap-4 rounded-[20px] p-2 transition-colors hover:bg-surface-2"
                >
                  <span className="flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-surface-2 py-2.5 text-center">
                    <span className="text-[12px] text-muted">{day.weekday}</span>
                    <span className="display tabular text-[26px] leading-none text-ink">{day.day}</span>
                    <span className="mt-0.5 text-[12px] text-muted">{day.month}</span>
                  </span>
                  <span className="min-w-0 flex-1 py-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {!attended ? (
                        <Badge dot={ATTENDANCE[s.attendance].color} className="h-6 px-2 text-xs">
                          {ATTENDANCE[s.attendance].label}
                        </Badge>
                      ) : null}
                      {techniques.slice(0, 2).map((t) => (
                        <Badge key={t} tone="outline" className="h-6 px-2 text-xs">
                          {t}
                        </Badge>
                      ))}
                      {techniques.length > 2 ? (
                        <span className="text-xs text-muted">+{techniques.length - 2}</span>
                      ) : null}
                      {attended && techniques.length === 0 ? (
                        <span className="text-[13px] text-muted">Sin técnicas registradas</span>
                      ) : null}
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-ink-2">
                      {excerpt(s.subjective, 180) ?? <span className="text-subtle">Sin notas subjetivas</span>}
                    </span>
                  </span>
                  {s.pain_before != null || s.pain_after != null ? (
                    <span className="hidden shrink-0 items-center gap-1.5 self-center sm:flex" aria-label={`EVA ${s.pain_before ?? "—"} a ${s.pain_after ?? "—"}`}>
                      <PainBadge intensity={s.pain_before} size="sm" />
                      <ArrowRight className="size-3.5 text-subtle" aria-hidden />
                      <PainBadge intensity={s.pain_after} size="sm" />
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Estudios
// ---------------------------------------------------------------------------
export function StudiesCard({
  patientId,
  count,
  latest,
  className,
}: {
  patientId: string;
  count: number;
  latest: PatientSummaryData["latestStudy"];
  className?: string;
}) {
  const base = `/pacientes/${patientId}`;
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="display text-[22px] font-medium text-ink sm:text-2xl">Estudios</h2>
          <p className="mt-1 text-sm text-muted">Imágenes, informes y laboratorio</p>
        </div>
        <p className="display tabular text-[44px] leading-none text-ink">{count}</p>
      </div>
      <div className="mt-5 flex-1">
        {latest ? (
          <Link
            href={`${base}/estudios`}
            className="flex items-center gap-3.5 rounded-2xl bg-surface-2 p-3 transition-colors hover:bg-surface-3/70"
          >
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-[12px] font-semibold tracking-wide text-ink-2 shadow-inset">
              {STUDY_KINDS[latest.kind].short}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-ink">{latest.title}</span>
              <span className="block truncate text-[13px] text-muted">
                {STUDY_KINDS[latest.kind].label} · {latest.study_date ? formatDate(latest.study_date) : `cargado ${formatRelativeDay(latest.created_at)}`}
              </span>
            </span>
            <FileText className="size-4 shrink-0 text-subtle" aria-hidden />
          </Link>
        ) : (
          <Empty
            action={
              <ButtonLink href={`${base}/estudios`} variant="secondary" size="sm" icon={<Upload />}>
                Subir estudio
              </ButtonLink>
            }
          >
            Sin estudios cargados.
          </Empty>
        )}
      </div>
      {latest ? (
        <div className="mt-4">
          <MoreLink href={`${base}/estudios`}>{count > 1 ? `Ver los ${count} estudios` : "Ver estudio"}</MoreLink>
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Notas y etiquetas
// ---------------------------------------------------------------------------
export function NotesCard({ patient, className }: { patient: Patient; className?: string }) {
  const hasContent = Boolean(patient.notes) || patient.tags.length > 0;
  return (
    <Card className={className}>
      <CardHeader
        title="Notas"
        action={
          <IconLink href={`/pacientes/${patient.id}/editar#notas`} label="Editar notas y etiquetas">
            <Pencil />
          </IconLink>
        }
        className="mb-4"
      />
      {hasContent ? (
        <>
          {patient.tags.length > 0 ? (
            <ul className="mb-4 flex flex-wrap gap-1.5" aria-label="Etiquetas">
              {patient.tags.map((t) => (
                <li key={t}>
                  <Badge className="h-7">#{t}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
          {patient.notes ? (
            <p className="line-clamp-6 text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{patient.notes}</p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">Sin notas ni etiquetas. Usalas para lo que no entra en otro lado.</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Datos personales / cobertura / emergencia
// ---------------------------------------------------------------------------
export function PersonalDataCard({ patient, className }: { patient: Patient; className?: string }) {
  const age = ageLabel(patient.birth_date);
  const address = [patient.address, patient.city].filter(Boolean).join(", ");
  return (
    <Card className={className}>
      <CardHeader
        title="Datos personales"
        action={
          <IconLink href={`/pacientes/${patient.id}/editar`} label="Editar datos personales">
            <Pencil />
          </IconLink>
        }
      />
      <DataList
        items={[
          { label: "Fecha de nacimiento", value: patient.birth_date ? `${formatDate(patient.birth_date)}${age ? ` · ${age}` : ""}` : null },
          { label: "Documento", value: documentLabel(patient.document_type, patient.document_number) },
          {
            label: "Sexo",
            value: [sexLabel(patient.sex), patient.gender_identity].filter(Boolean).join(" · ") || null,
          },
          { label: "Lateralidad", value: dominantSideLabel(patient.dominant_side) },
          {
            label: "Teléfono",
            value: patient.phone ? (
              <a href={telHref(patient.phone)} className="inline-flex items-center gap-1.5 hover:underline">
                <Phone className="size-3.5 text-muted" aria-hidden />
                {patient.phone}
              </a>
            ) : null,
          },
          {
            label: "Email",
            value: patient.email ? (
              <a href={`mailto:${patient.email}`} className="inline-flex max-w-full items-center gap-1.5 hover:underline">
                <Mail className="size-3.5 shrink-0 text-muted" aria-hidden />
                <span className="truncate">{patient.email}</span>
              </a>
            ) : null,
          },
          { label: "Ocupación", value: patient.occupation },
          { label: "Domicilio", value: address || null },
        ]}
      />
    </Card>
  );
}

export function CoverageCard({ patient, className }: { patient: Patient; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader
        title="Cobertura y derivación"
        action={
          <IconLink href={`/pacientes/${patient.id}/editar#cobertura`} label="Editar cobertura">
            <Pencil />
          </IconLink>
        }
      />
      <DataList
        items={[
          { label: "Obra social / prepaga", value: patient.health_insurance },
          { label: "Plan", value: patient.health_insurance_plan },
          { label: "Nº de afiliado", value: patient.health_insurance_number },
          { label: "Médico derivante", value: patient.referring_doctor },
        ]}
      />
    </Card>
  );
}

export function EmergencyContactCard({ patient, className }: { patient: Patient; className?: string }) {
  const has = patient.emergency_contact_name || patient.emergency_contact_phone;
  return (
    <Card className={className}>
      <CardHeader
        title="Contacto de emergencia"
        action={
          <IconLink href={`/pacientes/${patient.id}/editar#emergencia`} label="Editar contacto de emergencia">
            <Pencil />
          </IconLink>
        }
      />
      {has ? (
        <div className="flex items-center justify-between gap-4 rounded-panel bg-surface-2 p-4">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-ink">{patient.emergency_contact_name ?? "Sin nombre"}</p>
            <p className="truncate text-[13px] text-muted">
              {[patient.emergency_contact_relation, patient.emergency_contact_phone].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          {patient.emergency_contact_phone ? (
            <a
              href={telHref(patient.emergency_contact_phone)}
              aria-label={`Llamar a ${patient.emergency_contact_name ?? "contacto de emergencia"}`}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ink-2"
            >
              <Phone className="size-[18px]" />
            </a>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Sin contacto de emergencia.{" "}
          <Link href={`/pacientes/${patient.id}/editar#emergencia`} className="font-medium text-ink underline-offset-4 hover:underline">
            Agregalo
          </Link>
        </p>
      )}
    </Card>
  );
}
