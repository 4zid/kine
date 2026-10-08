import type { Metadata } from "next";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";

export const metadata: Metadata = {
  title: "Bienvenida",
  description: "Conocé kine: historia clínica, mapa corporal del dolor y evolución sesión a sesión para kinesiólogos.",
};

export default async function BienvenidaPage({ searchParams }: PageProps<"/bienvenida">) {
  const { paso } = await searchParams;
  const raw = Array.isArray(paso) ? paso[0] : paso;
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  const initialStep = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 5) - 1 : 0;

  return <OnboardingTour initialStep={initialStep} />;
}
