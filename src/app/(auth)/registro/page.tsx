import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { emailParam, firstParam } from "@/components/auth/search-params";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Registrate en kine con tus datos profesionales y empezá a cargar a tus pacientes.",
};

export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  const sp = await searchParams;
  const paso = Number.parseInt(firstParam(sp.paso) ?? "1", 10);
  const initialStep = paso === 2 || paso === 3 ? paso : 1;
  const email = emailParam(sp.email);

  return <RegisterForm initialStep={initialStep} initialValues={email ? { email } : undefined} />;
}
