"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  addDays,
  dayParts,
  mondayOf,
  SESSION_MAX_DAYS_AHEAD,
  SESSION_MIN_DATE,
} from "@/components/sessions/session-utils";

/**
 * Selector de fecha: tira de la semana (‹ lun … dom ›) con hoy marcado, más un
 * <input type="date"> nativo para fechas lejanas. Controlado por `value` ("YYYY-MM-DD").
 */
export function WeekStrip({
  value,
  onChange,
  today,
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (date: string) => void;
  /** "YYYY-MM-DD" calculado en el servidor. */
  today: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(value || today));
  // Si la fecha cambia desde afuera (input nativo), mostrar su semana.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value && (value < weekStart || value > addDays(weekStart, 6))) setWeekStart(mondayOf(value));
  }

  const maxDate = addDays(today, SESSION_MAX_DAYS_AHEAD);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const first = dayParts(days[0]);
  const last = dayParts(days[6]);
  const rangeLabel =
    first.month === last.month ? `${first.monthLong} ${first.year}` : `${first.month} – ${last.month} ${last.year}`;
  const showToday = today < weekStart || today > addDays(weekStart, 6) || value !== today;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[15px] text-muted">
          Fecha <span className="text-subtle">·</span>{" "}
          <span className="text-ink-2 first-letter:uppercase">{rangeLabel}</span>
        </p>
        <div className="flex items-center gap-1.5">
          {showToday ? (
            <button
              type="button"
              onClick={() => {
                onChange(today);
                setWeekStart(mondayOf(today));
              }}
              className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-[13px] font-medium text-ink shadow-inset transition-colors hover:bg-surface-2"
            >
              Hoy
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            disabled={addDays(weekStart, -1) < SESSION_MIN_DATE}
            className="inline-flex size-10 items-center justify-center rounded-full bg-surface text-ink shadow-inset transition-colors hover:bg-surface-2 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            disabled={addDays(weekStart, 7) > maxDate}
            className="inline-flex size-10 items-center justify-center rounded-full bg-surface text-ink shadow-inset transition-colors hover:bg-surface-2 disabled:opacity-40"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <label className="relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-surface pr-1 pl-3 text-[13px] font-medium text-ink shadow-inset transition-colors focus-within:shadow-[0_0_0_1.5px_var(--color-ink)] hover:bg-surface-2">
            <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="sr-only">Elegir otra fecha</span>
            <input
              type="date"
              value={value}
              min={SESSION_MIN_DATE}
              max={maxDate}
              onChange={(e) => {
                if (e.target.value) onChange(e.target.value);
              }}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className="tabular h-full w-[118px] cursor-pointer bg-transparent pr-2 text-[13px] text-ink outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50"
            />
          </label>
        </div>
      </div>

      <div role="group" aria-label="Días de la semana" className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {days.map((d) => {
          const p = dayParts(d);
          const selected = d === value;
          const isToday = d === today;
          const disabled = d < SESSION_MIN_DATE || d > maxDate;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${p.weekdayLong} ${p.day} de ${p.monthLong}${isToday ? " (hoy)" : ""}`}
              onClick={() => onChange(d)}
              className={cn(
                "relative flex h-[66px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:opacity-35 sm:h-[84px] sm:rounded-[20px]",
                selected ? "bg-ink text-white shadow-float" : "bg-surface-2 text-ink hover:bg-surface-3",
              )}
            >
              {isToday ? (
                <span
                  aria-hidden
                  className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-green sm:top-2.5 sm:right-2.5"
                />
              ) : null}
              <span className={cn("text-[11px] sm:text-[13px]", selected ? "text-white/70" : "text-muted")}>
                {p.weekday}
              </span>
              <span className="display tabular text-[22px] leading-none sm:text-[30px]">{p.day}</span>
              {isToday ? (
                <span
                  className={cn("hidden text-[10px] font-medium sm:block", selected ? "text-white/70" : "text-green")}
                >
                  Hoy
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
