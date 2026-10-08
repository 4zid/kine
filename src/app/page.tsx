import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/auth";
import { HOME_PATH, LOGIN_PATH, ONBOARDED_COOKIE } from "@/lib/routes";

export default async function RootPage() {
  const claims = await getClaims();
  if (claims) redirect(HOME_PATH);
  const onboarded = (await cookies()).has(ONBOARDED_COOKIE);
  redirect(onboarded ? LOGIN_PATH : "/bienvenida");
}
