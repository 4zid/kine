import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetAside } from "@/components/auth/auth-asides";
import { AuthSplitLayout, TopLink } from "@/components/auth/auth-split-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getClaims } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  description: "Elegí una contraseña nueva para tu cuenta de kine.",
};

export default async function RestablecerPage() {
  // El proxy ya exige sesión; si igual no la hay (link vencido), volvemos a pedir el link.
  const claims = await getClaims();
  if (!claims?.sub) redirect("/recuperar?error=link");
  const email = typeof claims.email === "string" ? claims.email : null;

  return (
    <AuthSplitLayout
      aside={<ResetAside />}
      topRight={
        <TopLink prompt="¿No querés cambiarla?" href="/inicio">
          Ir al inicio
        </TopLink>
      }
    >
      <ResetPasswordForm email={email} />
    </AuthSplitLayout>
  );
}
