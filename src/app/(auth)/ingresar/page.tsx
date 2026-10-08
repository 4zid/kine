import type { Metadata } from "next";
import { LoginAside } from "@/components/auth/auth-asides";
import { AuthSplitLayout, TopLink } from "@/components/auth/auth-split-layout";
import { LoginForm, type LoginNotice } from "@/components/auth/login-form";
import { emailParam, firstParam } from "@/components/auth/search-params";
import { HOME_PATH, safeNextPath } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Ingresá a kine con tu email y contraseña.",
};

function noticeFrom(confirmed: string | undefined, error: string | undefined): LoginNotice {
  if (confirmed === "1") {
    return { tone: "success", title: "Tu email fue confirmado, ya podés ingresar." };
  }
  switch (error) {
    case undefined:
      return null;
    case "link_vencido":
      return {
        tone: "warning",
        title: "El link venció.",
        text: "Si ya confirmaste tu email, ingresá con tu contraseña. Si no, intentá ingresar y te ofrecemos reenviarlo.",
      };
    case "link_invalido":
      return {
        tone: "warning",
        title: "El link no es válido o ya fue usado.",
        text: "Ingresá con tu email y contraseña. Si todavía no confirmaste tu cuenta, te ofrecemos reenviar el email.",
      };
    case "sesion":
      return { tone: "warning", title: "Tu sesión expiró.", text: "Ingresá de nuevo para continuar." };
    default:
      return { tone: "error", title: "No pudimos validar el link.", text: "Probá ingresar con tu email y contraseña." };
  }
}

export default async function IngresarPage({ searchParams }: PageProps<"/ingresar">) {
  const sp = await searchParams;
  const next = safeNextPath(firstParam(sp.next), HOME_PATH);
  const notice = noticeFrom(firstParam(sp.confirmado), firstParam(sp.error));

  return (
    <AuthSplitLayout
      aside={<LoginAside />}
      topRight={
        <TopLink prompt="¿Primera vez acá?" href="/bienvenida">
          Conocé kine
        </TopLink>
      }
    >
      <LoginForm next={next} defaultEmail={emailParam(sp.email)} notice={notice} />
    </AuthSplitLayout>
  );
}
