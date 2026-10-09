import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info" | "warning";

// Texto con los tonos "-ink" (contraste AA sobre los fondos -50).
const tones: Record<Tone, { box: string; icon: ReactNode }> = {
  error: { box: "bg-danger-50 text-danger-ink", icon: <AlertCircle /> },
  success: { box: "bg-success-50 text-brand-700", icon: <CheckCircle2 /> },
  info: { box: "bg-surface-2 text-ink-2", icon: <Info /> },
  warning: { box: "bg-warning-50 text-warning-ink", icon: <TriangleAlert /> },
};

/** Aviso dentro de formularios (errores generales, confirmaciones, links vencidos). */
export function FormAlert({
  tone = "error",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex animate-fade-up items-start gap-3 rounded-panel px-4 py-3.5 text-sm", t.box, className)}
    >
      <span className="mt-px shrink-0 [&_svg]:size-[18px]" aria-hidden>
        {t.icon}
      </span>
      <div className="min-w-0 flex-1 leading-relaxed">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", "text-ink-2")}>{children}</div> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
