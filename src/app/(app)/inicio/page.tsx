import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { buildDashboardData, weekBounds, type ChecklistCounts } from "@/components/dashboard/data";
import { isISODate } from "@/components/dashboard/dates";
import { requireProfessional } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { completeOnboarding } from "./actions";

export const metadata: Metadata = { title: "Inicio" };

const SESSION_COLUMNS =
  "id, session_date, start_time, duration_minutes, attendance, techniques, pain_before, pain_after, patient_id, patient:patients!treatment_sessions_patient_fk(id, first_name, last_name)";

export default async function InicioPage({ searchParams }: PageProps<"/inicio">) {
  const [professional, params, supabase] = await Promise.all([requireProfessional(), searchParams, createClient()]);

  // "Hoy" y la semana se calculan siempre en el servidor (hora de Argentina).
  const today = todayISO();
  const rawDay = Array.isArray(params.dia) ? params.dia[0] : params.dia;
  const selectedDay = isISODate(rawDay) ? rawDay : today;
  const { start, end } = weekBounds(selectedDay);
  const needsChecklist = !professional.onboarding_completed_at;
  const countOnly = { count: "exact", head: true } as const;

  const [activeRes, sessionsRes, totalRes, painRes, sessionCountRes] = await Promise.all([
    supabase
      .from("patient_overview")
      .select("id, first_name, last_name, max_pain, active_regions, last_session_date, created_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1000),
    supabase
      .from("treatment_sessions")
      .select(SESSION_COLUMNS)
      .gte("session_date", start)
      .lte("session_date", end)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .limit(500),
    supabase.from("patients").select("id", countOnly),
    needsChecklist ? supabase.from("pain_records").select("id", countOnly) : null,
    needsChecklist ? supabase.from("treatment_sessions").select("id", countOnly) : null,
  ]);

  for (const [label, res] of [
    ["patient_overview", activeRes],
    ["treatment_sessions", sessionsRes],
    ["patients count", totalRes],
  ] as const) {
    if (res.error) {
      console.error(`inicio: ${label}`, res.error.code, res.error.message);
      throw new Error("No pudimos cargar tu inicio.");
    }
  }

  const totalPatients = totalRes.count ?? 0;
  const checklistCounts: ChecklistCounts | null = needsChecklist
    ? {
        patients: totalPatients,
        painRecords: painRes?.count ?? 0,
        sessions: sessionCountRes?.count ?? 0,
      }
    : null;

  const data = buildDashboardData({
    professional,
    today,
    selectedDay,
    activePatients: activeRes.data ?? [],
    weekSessions: sessionsRes.data ?? [],
    totalPatients,
    checklistCounts,
    welcome: params.bienvenida === "1",
  });

  return <DashboardView data={data} dismissOnboardingAction={completeOnboarding} />;
}
