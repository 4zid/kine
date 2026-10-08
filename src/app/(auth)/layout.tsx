/**
 * Zona pública de acceso (onboarding, registro, ingreso, recuperación).
 * Sin AppShell ni sidebar: cada pantalla arma su propio layout dividido.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-dvh bg-canvas">{children}</div>;
}
