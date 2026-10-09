import { Suspense } from "react";
import { AuthFlashToast } from "@/components/auth/auth-flash-toast";
import { AppShell } from "@/components/shell/app-shell";
import type { ShellProfessional, ShellRecentPatient } from "@/components/shell/sidebar";
import { requireProfessional } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeDay, todayISO } from "@/lib/utils";

const RECENT_LIMIT = 4;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const professional = await requireProfessional();
  const supabase = await createClient();
  const today = todayISO();

  // "Recientes" = última actividad real (datos del paciente, sesiones o registros de dolor).
  // Los datos del sidebar son de apoyo: si una consulta falla se muestra vacío en vez de romper la app.
  const [recentRes, countRes] = await Promise.all([
    supabase
      .from("patient_overview")
      .select("id, first_name, last_name, last_session_date, max_pain, last_activity_at")
      .eq("status", "active")
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .limit(RECENT_LIMIT),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  if (recentRes.error) console.error("AppLayout recientes", recentRes.error.code, recentRes.error.message);
  if (countRes.error) console.error("AppLayout activos", countRes.error.code, countRes.error.message);

  const recent = (recentRes.data ?? []).filter((p): p is typeof p & { id: string } => Boolean(p.id));

  // Antigüedad del dolor mostrado (D2): último registro de las zonas activas de cada paciente.
  const painUpdated = new Map<string, string>();
  const withPain = recent.filter((p) => p.max_pain != null).map((p) => p.id);
  if (withPain.length > 0) {
    const { data: zones, error } = await supabase
      .from("patient_pain_current")
      .select("patient_id, recorded_at")
      .in("patient_id", withPain)
      .neq("status", "resolved")
      .gt("intensity", 0);
    if (error) console.error("AppLayout dolor", error.code, error.message);
    for (const z of zones ?? []) {
      if (!z.patient_id || !z.recorded_at) continue;
      const prev = painUpdated.get(z.patient_id);
      if (!prev || z.recorded_at > prev) painUpdated.set(z.patient_id, z.recorded_at);
    }
  }

  // Textos relativos calculados en el servidor (misma fecha que el resto de la página).
  const recentPatients: ShellRecentPatient[] = recent.map((p) => {
    const painAt = painUpdated.get(p.id);
    return {
      id: p.id,
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      activityLabel: p.last_session_date ? `Última sesión ${formatRelativeDay(p.last_session_date, today)}` : "Sin sesiones aún",
      max_pain: p.max_pain,
      painUpdatedLabel: painAt ? `actualizado ${formatRelativeDay(painAt, today)}` : null,
    };
  });

  // Solo lo que muestra el shell (no serializar el perfil completo en cada respuesta).
  const shellProfessional: ShellProfessional = {
    first_name: professional.first_name,
    last_name: professional.last_name,
    license_number: professional.license_number,
    license_type: professional.license_type,
  };

  return (
    <AppShell professional={shellProfessional} recentPatients={recentPatients} activeCount={countRes.count ?? 0}>
      {children}
      <Suspense fallback={null}>
        <AuthFlashToast />
      </Suspense>
    </AppShell>
  );
}
