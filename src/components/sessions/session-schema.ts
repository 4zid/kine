import { z } from "zod";
import type { TreatmentSessionInsert } from "@/lib/types";
import {
  addDays,
  DURATION_MAX,
  DURATION_MIN,
  isValidISODate,
  SESSION_MAX_DAYS_AHEAD,
  SESSION_MIN_DATE,
  SESSION_TEXT_MAX,
  TECHNIQUE_VALUES,
} from "@/components/sessions/session-utils";

/**
 * Validación de una sesión de tratamiento. Espeja los CHECK de `treatment_sessions`
 * (supabase/migrations/…_init_schema.sql). Solo se usa en el servidor (Server Actions);
 * los límites viven en session-utils para que el formulario los use sin cargar zod.
 */

const text = z
  .string()
  .max(SESSION_TEXT_MAX, { error: `Máximo ${SESSION_TEXT_MAX.toLocaleString("es-AR")} caracteres.` })
  .transform((v) => (v.trim() === "" ? null : v.trim()));

const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.issues.push({ code: "custom", message, input: v });
        return z.NEVER;
      }
      return n;
    });

function sessionSchema(today: string) {
  const maxDate = addDays(today, SESSION_MAX_DAYS_AHEAD);
  return z.object({
    session_date: z
      .string()
      .trim()
      .refine(isValidISODate, { error: "Elegí una fecha válida." })
      .refine((v) => v >= SESSION_MIN_DATE, { error: "La fecha es demasiado antigua." })
      .refine((v) => v <= maxDate, { error: "Podés agendar sesiones hasta un año hacia adelante." }),
    start_time: z
      .string()
      .trim()
      .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), { error: "Ingresá un horario válido (HH:MM)." })
      .transform((v) => (v === "" ? null : v)),
    duration_minutes: optionalInt(
      DURATION_MIN,
      DURATION_MAX,
      `La duración debe ser un número entero entre ${DURATION_MIN} y ${DURATION_MAX} minutos.`,
    ),
    attendance: z.enum(["attended", "absent", "cancelled"], { error: "Elegí si el paciente asistió." }),
    techniques: z
      .array(z.string())
      .max(TECHNIQUE_VALUES.length)
      .refine((list) => list.every((t) => TECHNIQUE_VALUES.includes(t)), { error: "Hay técnicas no válidas." })
      .transform((list) => Array.from(new Set(list))),
    pain_before: optionalInt(0, 10, "El dolor va de 0 a 10."),
    pain_after: optionalInt(0, 10, "El dolor va de 0 a 10."),
    subjective: text,
    objective: text,
    assessment: text,
    plan: text,
    home_exercises: text,
    notes: text,
  });
}

export type SessionPayload = Omit<
  TreatmentSessionInsert,
  "patient_id" | "professional_id" | "id" | "created_at" | "updated_at"
>;

export type ParsedSession =
  | { ok: true; data: SessionPayload }
  | { ok: false; fieldErrors: Partial<Record<string, string>>; message: string };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/** Lee y valida el FormData del formulario de sesión. `today` = "YYYY-MM-DD" en Argentina. */
export function parseSessionForm(fd: FormData, today: string): ParsedSession {
  const raw = {
    session_date: str(fd, "session_date"),
    start_time: str(fd, "start_time"),
    duration_minutes: str(fd, "duration_minutes"),
    attendance: str(fd, "attendance") || "attended",
    techniques: fd.getAll("techniques").filter((v): v is string => typeof v === "string" && v !== ""),
    pain_before: str(fd, "pain_before"),
    pain_after: str(fd, "pain_after"),
    subjective: str(fd, "subjective"),
    objective: str(fd, "objective"),
    assessment: str(fd, "assessment"),
    plan: str(fd, "plan"),
    home_exercises: str(fd, "home_exercises"),
    notes: str(fd, "notes"),
  };

  const result = sessionSchema(today).safeParse(raw);
  if (!result.success) {
    const fieldErrors: Partial<Record<string, string>> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors, message: "Revisá los campos marcados." };
  }

  const v = result.data;
  const attended = v.attendance === "attended";

  // Sin asistencia no hay datos clínicos: solo se conservan fecha, horario y notas.
  return {
    ok: true,
    data: {
      session_date: v.session_date,
      start_time: v.start_time,
      duration_minutes: v.duration_minutes,
      attendance: v.attendance,
      techniques: attended ? v.techniques : [],
      pain_before: attended ? v.pain_before : null,
      pain_after: attended ? v.pain_after : null,
      subjective: attended ? v.subjective : null,
      objective: attended ? v.objective : null,
      assessment: attended ? v.assessment : null,
      plan: attended ? v.plan : null,
      home_exercises: attended ? v.home_exercises : null,
      notes: v.notes,
    },
  };
}
