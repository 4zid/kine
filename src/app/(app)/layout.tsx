import { Suspense } from "react";
import { AuthFlashToast } from "@/components/auth/auth-flash-toast";
import { AppShell } from "@/components/shell/app-shell";
import { requireProfessional } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const professional = await requireProfessional();
  const supabase = await createClient();

  const [{ data: recent }, { count }] = await Promise.all([
    supabase
      .from("patient_overview")
      .select("id, first_name, last_name, last_session_date, max_pain")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const recentPatients = (recent ?? [])
    .filter((p) => p.id)
    .map((p) => ({
      id: p.id as string,
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      last_session_date: p.last_session_date,
      max_pain: p.max_pain,
    }));

  return (
    <AppShell professional={professional} recentPatients={recentPatients} activeCount={count ?? 0}>
      {children}
      <Suspense fallback={null}>
        <AuthFlashToast />
      </Suspense>
    </AppShell>
  );
}
