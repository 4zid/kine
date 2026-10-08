"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

const selectClass =
  "display tabular h-[64px] cursor-pointer appearance-none rounded-2xl bg-transparent px-1 text-[52px] leading-none font-normal text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:shadow-[0_0_0_1.5px_var(--color-ink)] sm:h-[72px] sm:text-[60px] [&>option]:font-sans [&>option]:text-base";

/**
 * Horario grande "09:00 ⌄" (como el "Inicio" de daily) con dos <select> nativos:
 * mismo formato 24 h en cualquier idioma del navegador y selector nativo en el celular.
 * `value` = "HH:MM" o "" (sin horario: elegir "--" en la hora).
 */
export function TimeSelect({
  id,
  name,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [hour = "", minute = ""] = value ? value.split(":") : [];
  // Si el horario guardado no cae en múltiplos de 5, conservarlo como opción.
  const minutes = minute && !MINUTES.includes(minute) ? [...MINUTES, minute].sort() : MINUTES;
  const empty = !value;

  return (
    <div className="flex items-center">
      <select
        id={id}
        aria-label="Hora de inicio"
        value={hour}
        onChange={(e) => {
          const h = e.target.value;
          onChange(h ? `${h}:${minute || "00"}` : "");
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(selectClass, empty && "text-subtle")}
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className={cn(
          "display -mx-0.5 pb-1.5 text-[52px] leading-none sm:text-[60px]",
          empty ? "text-subtle" : "text-ink",
        )}
      >
        :
      </span>
      <select
        aria-label="Minutos de inicio"
        value={minute}
        disabled={empty}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(selectClass, empty && "text-subtle disabled:cursor-default disabled:hover:bg-transparent")}
      >
        {empty ? <option value="">--</option> : null}
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="ml-1 size-5 shrink-0 text-muted" />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
