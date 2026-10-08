import type { Metadata } from "next";
import { StudiesView } from "@/components/studies/studies-view";
import { isPreviewableImage } from "@/components/studies/files";
import type { StudyListItem } from "@/components/studies/schema";
import { requireUserId } from "@/lib/auth";
import { PATIENT_FILES_BUCKET, STUDY_KINDS } from "@/lib/constants";
import { getPatient, getPatientOrNotFound } from "@/lib/data/patients";
import { createClient } from "@/lib/supabase/server";
import type { StudyKind } from "@/lib/types";
import { formatDate, formatRelativeDay, fullName, todayISO } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/pacientes/[id]/estudios">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient ? `Estudios · ${fullName(patient)}` : "Estudios" };
}

const THUMBNAIL_TTL_SECONDS = 60 * 60;

export default async function StudiesPage({ params }: PageProps<"/pacientes/[id]/estudios">) {
  const { id } = await params;
  const [userId, patient, supabase] = await Promise.all([requireUserId(), getPatientOrNotFound(id), createClient()]);

  const { data: rows, error } = await supabase
    .from("patient_studies")
    .select("id, kind, title, study_date, findings, file_path, file_name, mime_type, size_bytes, created_at")
    .eq("patient_id", patient.id)
    .order("study_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error("No pudimos cargar los estudios del paciente.");

  // Miniaturas: URLs firmadas de corta duración (bucket privado), en un solo pedido.
  const imagePaths = (rows ?? [])
    .filter((r) => r.file_path && isPreviewableImage(r.mime_type))
    .map((r) => r.file_path as string);
  const thumbnails = new Map<string, string>();
  if (imagePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(PATIENT_FILES_BUCKET)
      .createSignedUrls(imagePaths, THUMBNAIL_TTL_SECONDS);
    for (const s of signed ?? []) if (s.path && s.signedUrl && !s.error) thumbnails.set(s.path, s.signedUrl);
  }

  const studies: StudyListItem[] = (rows ?? []).map((r) => ({
    id: r.id,
    kind: (r.kind in STUDY_KINDS ? r.kind : "other") as StudyKind,
    title: r.title,
    study_date: r.study_date,
    dateLabel: r.study_date ? formatDate(r.study_date) : null,
    findings: r.findings,
    createdLabel: formatRelativeDay(r.created_at),
    file: r.file_path ? { name: r.file_name || "archivo", mime_type: r.mime_type, size_bytes: r.size_bytes } : null,
    thumbnailUrl: r.file_path ? (thumbnails.get(r.file_path) ?? null) : null,
  }));

  return <StudiesView patientId={patient.id} userId={userId} today={todayISO()} studies={studies} />;
}
