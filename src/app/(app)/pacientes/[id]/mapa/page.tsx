import type { Metadata } from "next";
import { BodyMap } from "@/components/body-map/body-map";
import { PAIN_RECORD_COLUMNS } from "@/components/body-map/types";
import { getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { createClient } from "@/lib/supabase/server";
import { fullName, todayISO } from "@/lib/utils";
import { createPainRecord, deletePainRecord, markRegionResolved } from "./actions";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]/mapa">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `Mapa corporal · ${fullName(patient)}` : "Mapa corporal" };
}

export default async function PatientBodyMapPage({ params }: PageProps<"/pacientes/[id]/mapa">) {
  const { id } = await params;
  const patient = await getPatientOrNotFound(id);
  const supabase = await createClient();

  const [recordsRes, sessionsRes] = await Promise.all([
    supabase
      .from("pain_records")
      .select(PAIN_RECORD_COLUMNS)
      .eq("patient_id", patient.id)
      .order("recorded_at", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("treatment_sessions")
      .select("id, session_date, techniques")
      .eq("patient_id", patient.id)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (recordsRes.error) {
    throw new Error("No se pudieron cargar los registros de dolor del paciente.");
  }

  return (
    <BodyMap
      patientId={patient.id}
      records={recordsRes.data ?? []}
      sessions={sessionsRes.data ?? []}
      today={todayISO()}
      actions={{ create: createPainRecord, resolve: markRegionResolved, remove: deletePainRecord }}
    />
  );
}
