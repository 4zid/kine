import type { Metadata } from "next";
import { ReportControls } from "@/components/report/report-controls";
import { ReportDocument, type ReportPainZone } from "@/components/report/report-document";
import { ReportPrintStyles } from "@/components/report/report-print-styles";
import { resolvePeriod } from "@/components/report/report-utils";
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

  const [history, { data: sessions, error }, { data: pain }] = await Promise.all([
    getClinicalHistory(patient.id),
    sessionsQuery.order("session_date", { ascending: false }).limit(2000),
    supabase
      .from("patient_pain_current")
      .select("id, region, intensity, status, pain_types, frequency")
      .eq("patient_id", patient.id)
      .neq("status", "resolved")
      .gt("intensity", 0)
      .order("intensity", { ascending: false }),
  ]);
  if (error) throw new Error("No se pudieron cargar las sesiones del informe.");

  const painZones: ReportPainZone[] = (pain ?? []).flatMap((z) =>
    z.id && z.region && z.intensity != null
      ? [
          {
            id: z.id,
            region: z.region,
            intensity: z.intensity,
            status: z.status ?? "active",
            pain_types: z.pain_types ?? [],
            frequency: z.frequency,
          },
        ]
      : [],
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
        sessions={sessions ?? []}
        painZones={painZones}
      />
    </div>
  );
}
