import type { Metadata } from "next";
import { RecoverAside } from "@/components/auth/auth-asides";
import { AuthSplitLayout, TopLink } from "@/components/auth/auth-split-layout";
import { RecoverForm, type RecoverLinkError } from "@/components/auth/recover-form";
import { emailParam, firstParam } from "@/components/auth/search-params";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Pedí un link para crear una contraseña nueva.",
};

function linkErrorFrom(value: string | undefined): RecoverLinkError | null {
  if (!value) return null;
  return value === "vencido" || value === "navegador" ? value : "link";
}

export default async function RecuperarPage({ searchParams }: PageProps<"/recuperar">) {
  const sp = await searchParams;
  return (
    <AuthSplitLayout
      aside={<RecoverAside />}
      topRight={
        <TopLink prompt="¿Te acordaste?" href="/ingresar">
          Ingresar
        </TopLink>
      }
    >
      <RecoverForm defaultEmail={emailParam(sp.email)} linkError={linkErrorFrom(firstParam(sp.error))} />
    </AuthSplitLayout>
  );
}
