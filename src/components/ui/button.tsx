import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary" // negro (CTA principal, como "Ver informe")
  | "secondary" // blanco con borde suave (como "Hoy")
  | "soft" // gris claro (chips de acción)
  | "ghost" // sin fondo
  | "brand" // verde de marca
  | "accent" // azul eléctrico
  | "danger"
  | "danger-soft"
  | "inverse"; // blanco sobre fondos oscuros

export type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon" | "icon-lg";

const base =
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-[background-color,color,box-shadow,transform,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2 shadow-[0_1px_0_rgb(255_255_255/0.08)_inset]",
  secondary: "bg-surface text-ink shadow-inset hover:bg-surface-2",
  soft: "bg-surface-2 text-ink hover:bg-surface-3",
  ghost: "bg-transparent text-ink hover:bg-ink/[0.05]",
  brand: "bg-brand text-white hover:bg-brand-600",
  accent: "bg-accent text-white hover:bg-accent-700",
  danger: "bg-danger text-white hover:bg-danger/90",
  "danger-soft": "bg-danger-50 text-danger hover:bg-danger/15",
  // Va sobre fondos oscuros: anillo de foco blanco para que se vea.
  inverse: "bg-white text-ink hover:bg-white/90 focus-visible:outline-white",
};

/** `sm` e `icon-sm` miden 36px pero su área táctil llega a 40px (hit-area). */
const sizes: Record<ButtonSize, string> = {
  sm: "hit-area h-9 px-4 text-[13px] [&_svg]:size-4",
  md: "h-11 px-5 text-sm [&_svg]:size-[18px]",
  lg: "h-14 px-7 text-[15px] [&_svg]:size-5",
  "icon-sm": "hit-area size-9 [&_svg]:size-4",
  icon: "size-11 [&_svg]:size-[18px]",
  "icon-lg": "size-14 [&_svg]:size-5",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícono antes del texto. */
  icon?: ReactNode;
  /** Ícono después del texto (p. ej. flecha →). */
  iconRight?: ReactNode;
};

export function Button({
  variant,
  size,
  icon,
  iconRight,
  className,
  children,
  type = "button",
  ...props
}: CommonProps & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  iconRight,
  className,
  children,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
