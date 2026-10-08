import type { Metadata } from "next";
import { VerifyAside } from "@/components/auth/auth-asides";
import { AuthSplitLayout, TopLink } from "@/components/auth/auth-split-layout";
import { emailParam } from "@/components/auth/search-params";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";

export const metadata: Metadata = {
  title: "Verificá tu email",
  description: "Confirmá tu email para activar tu cuenta de kine.",
};

export default async function VerificarPage({ searchParams }: PageProps<"/verificar">) {
  const sp = await searchParams;
  return (
    <AuthSplitLayout
      aside={<VerifyAside />}
      topRight={
        <TopLink prompt="¿Ya confirmaste?" href="/ingresar">
          Ingresar
        </TopLink>
      }
    >
      <VerifyEmailPanel email={emailParam(sp.email)} />
    </AuthSplitLayout>
  );
}
