import { TECHNIQUES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { SessionOption } from "./types";

const TECHNIQUE_LABEL: Record<string, string> = Object.fromEntries(TECHNIQUES.map((t) => [t.value, t.label]));

/** "09:30" (24 h) o null. */
export function sessionTime(s: Pick<SessionOption, "start_time">): string | null {
  return s.start_time ? s.start_time.slice(0, 5) : null;
}

/** "Hoy, 8 oct 2026 · 09:30 · Masoterapia, Electroterapia…" (para el selector de sesión). */
export function sessionOptionLabel(s: SessionOption, today: string): string {
  if (!s.session_date) return "Sesión vinculada";
  const day = s.session_date === today ? `Hoy, ${formatDate(s.session_date)}` : formatDate(s.session_date);
  const time = sessionTime(s);
  const techniques = s.techniques.length
    ? ` · ${s.techniques
        .slice(0, 2)
        .map((t) => TECHNIQUE_LABEL[t] ?? t)
        .join(", ")}${s.techniques.length > 2 ? "…" : ""}`
    : "";
  return `${day}${time ? ` · ${time}` : ""}${techniques}`;
}

/** "8 oct 2026 · 09:30" (para el historial). */
export function sessionShortLabel(s: SessionOption | undefined): string {
  if (!s?.session_date) return "Sesión vinculada";
  const time = sessionTime(s);
  return `${formatDate(s.session_date)}${time ? ` · ${time}` : ""}`;
}
