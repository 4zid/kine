"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  name: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: readonly string[];
  max?: number;
  maxLength?: number;
  invalid?: boolean;
  placeholder?: string;
};

const keyOf = (t: string) => t.toLocaleLowerCase("es-AR");

/** Etiquetas libres: Enter o coma para agregar, Backspace para borrar la última. Envía `name` repetido. */
export function TagsInput({
  id,
  name,
  value,
  onChange,
  suggestions = [],
  max = 20,
  maxLength = 40,
  invalid,
  placeholder = "Escribí y apretá Enter",
}: Props) {
  const [draft, setDraft] = useState("");
  const full = value.length >= max;

  const addMany = (raws: string[]) => {
    const next = [...value];
    for (const raw of raws) {
      const tag = raw.replace(/^#/, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
      if (!tag || next.length >= max || next.some((t) => keyOf(t) === keyOf(tag))) continue;
      next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
  };
  const add = (raw: string) => addMany([raw]);

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const pending = suggestions.filter((s) => !value.some((t) => keyOf(t) === keyOf(s)));

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex min-h-12 flex-wrap items-center gap-1.5 rounded-field bg-surface-2 px-2 py-2 transition-[background-color,box-shadow] focus-within:bg-surface focus-within:shadow-[0_0_0_1.5px_var(--color-ink)]",
          invalid && "shadow-[0_0_0_1.5px_var(--color-danger)]",
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-ink pr-1 pl-3 text-[13px] font-medium text-white animate-scale-in"
          >
            #{tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Quitar etiqueta ${tag}`}
              className="inline-flex size-6 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={full}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) {
              const parts = v.split(",");
              addMany(parts.slice(0, -1));
              setDraft(parts.at(-1) ?? "");
            } else {
              setDraft(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
              setDraft("");
            } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft("");
            }
          }}
          maxLength={maxLength}
          placeholder={full ? `Máximo ${max} etiquetas` : value.length === 0 ? placeholder : "Agregar otra…"}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          className="h-8 min-w-[10rem] flex-1 bg-transparent px-2 text-[15px] text-ink outline-none placeholder:text-subtle disabled:cursor-not-allowed"
        />
      </div>
      {pending.length > 0 && !full ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[13px] text-muted">Sugeridas:</span>
          {pending.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-surface-2 px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-3"
            >
              <Plus className="size-3.5 text-muted" aria-hidden />
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {value.map((tag) => (
        <input key={tag} type="hidden" name={name} value={tag} />
      ))}
    </div>
  );
}
