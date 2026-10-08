import { redirect } from "next/navigation";
import { getClaims } from "@/lib/auth";
import { HOME_PATH } from "@/lib/routes";

export default async function RootPage() {
  const claims = await getClaims();
  redirect(claims ? HOME_PATH : "/bienvenida");
}
