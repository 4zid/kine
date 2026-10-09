import type { Metadata } from "next";
import { ReportControls } from "@/components/report/report-controls";
import { BodyMapPreview } from "@/components/body-map/body-map-preview";
import { ReportDocument, type ReportPainZone, type ReportStudy } from "@/components/report/report-document";
import { ReportPrintStyles } from "@/components/report/report-print-styles";
import { latestPerRegion, nextDayStartAR, resolvePeriod } from "@/components/report/report-utils";
import { requireProfessional } from "@/lib/auth";
import { getClinicalHistory, getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { createClient } from "@/lib/supabase/server";
import { fullName, todayISO } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]/informe">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  // El título se usa como nombre sugerido del PDF al imprimir.
  return { title: patient ? `Informe kinésico · ${fullName(patient)}` : "Informe kinésico" };
}

const REPORT_SESSION_COLUMNS =
  "id, session_date, start_time, duration_minutes, attendance, techniques, pain_before, pain_after, subjective, objective, assessment, plan, home_exercises, created_at";
/** Historial liviano del tratamiento completo: numeración y sesiones prescriptas. */
const TIMELINE_COLUMNS = "id, session_date, start_time, attendance, pain_before, pain_after, created_at";
const PAIN_COLUMNS =
  "id, region, intensity, status, pain_types, frequency, irradiation, aggravating_factors, relieving_factors, recorded_at, created_at";
const STUDY_COLUMNS = "id, title, kind, study_date, findings, created_at";

/** PostgREST corta en 1000 filas por pedido (max_rows): lo explicitamos. */
const MAX_ROWS = 1000;

export default async function ReportPage({ params, searchParams }: PageProps<"/pacientes/[id]/informe">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [professional, patient] = await Promise.all([requireProfessional(), getPatientOrNotFound(id)]);
  const supabase = await createClient();
  const today = todayISO();
  const period = resolvePeriod(query, today);

  let sessionsQuery = supabase
    .from("treatment_sessions")
    .select(REPORT_SESSION_COLUMNS)
    .eq("patient_id", patient.id)
    .lte("session_date", period.to);
  if (period.from) sessionsQuery = sessionsQuery.gte("session_date", period.from);

  // Estado del dolor por zona al cierre del período: si termina hoy, la vista del estado actual;
  // si termina antes, el último registro de cada zona hasta ese día (inclusive).
  const painQuery =
    period.to >= today
      ? supabase
          .from("patient_pain_current")
          .select(PAIN_COLUMNS)
          .eq("patient_id", patient.id)
          .order("recorded_at", { ascending: false })
      : supabase
          .from("pain_records")
          .select(PAIN_COLUMNS)
          .eq("patient_id", patient.id)
          .lt("recorded_at", nextDayStartAR(period.to))
          .order("recorded_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(MAX_ROWS);

  const [history, sessionsRes, timelineRes, painRes, studiesRes] = await Promise.all([
    getClinicalHistory(patient.id),
    sessionsQuery
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false, nullsFirst: false })
      .limit(MAX_ROWS),
    // Con un período acotado, la numeración ("Sesión 15") y lo prescripto se cuentan sobre todo el tratamiento.
    period.from
      ? supabase
          .from("treatment_sessions")
          .select(TIMELINE_COLUMNS)
          .eq("patient_id", patient.id)
          .lte("session_date", period.to)
          .order("session_date", { ascending: false })
          .limit(MAX_ROWS)
      : null,
    painQuery,
    supabase
      .from("patient_studies")
      .select(STUDY_COLUMNS)
      .eq("patient_id", patient.id)
      .order("study_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  // Un informe firmado no puede salir incompleto en silencio: ante cualquier error, error.tsx.
  if (sessionsRes.error) throw new Error("No se pudieron cargar las sesiones del informe.");
  if (timelineRes?.error) throw new Error("No se pudo cargar el historial de sesiones del informe.");
  if (painRes.error) throw new Error("No se pudo cargar el dolor por zona del informe.");
  if (studiesRes.error) throw new Error("No se pudieron cargar los estudios del informe.");

  const painZones: ReportPainZone[] = latestPerRegion(painRes.data ?? [])
    .flatMap((z) =>
      z.id && z.region && z.intensity != null && z.status !== "resolved" && z.intensity > 0
        ? [
            {
              id: z.id,
              region: z.region,
              intensity: z.intensity,
              status: z.status ?? "active",
              pain_types: z.pain_types ?? [],
              frequency: z.frequency,
              irradiation: z.irradiation,
              aggravating_factors: z.aggravating_factors,
              relieving_factors: z.relieving_factors,
              recorded_at: z.recorded_at,
            },
          ]
        : [],
    )
    .sort((a, b) => b.intensity - a.intensity);

  // Estudios con fecha (o cargados) hasta el cierre del período.
  const studies: ReportStudy[] = (studiesRes.data ?? []).filter(
    (s) => (s.study_date ?? s.created_at.slice(0, 10)) <= period.to,
  );

  return (
    <div className="flex flex-col gap-6 print:gap-0">
      <ReportPrintStyles />
      <ReportControls kind={period.kind} from={period.inputFrom} to={period.inputTo} max={today} />
      <ReportDocument
        today={today}
        period={period}
        professional={professional}
        patient={patient}
        history={history}
        sessions={sessionsRes.data ?? []}
        timeline={timelineRes?.data ?? undefined}
        painZones={painZones}
        studies={studies}
        bodyMap={
          painZones.length > 0 ? (
            <BodyMapPreview
              painByRegion={Object.fromEntries(painZones.map((z) => [z.region, { intensity: z.intensity, status: z.status }]))}
              size="md"
              showLegend
            />
          ) : undefined
        }
      />
    </div>
  );
}
