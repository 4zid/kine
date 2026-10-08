"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { initialActionState, type ActionState } from "@/lib/types";

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

type FormValues = Record<string, string | string[]>;

function normalize<V extends FormValues>(values: V): V {
  const out: FormValues = {};
  for (const [k, v] of Object.entries(values)) {
    out[k] = Array.isArray(v) ? [...v].sort() : v.trim();
  }
  return out as V;
}

function same(a: FormValues, b: FormValues): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

/**
 * Estado de un formulario de ajustes: inputs controlados (React 19 resetea los no
 * controlados tras cada acción), errores por campo, detección de cambios y toasts.
 */
export function useSettingsForm<V extends FormValues>(initial: V, action: FormAction) {
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const [, formAction, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    setErrors(result.fieldErrors ?? {});
    if (result.ok) {
      setValues((v) => normalize(v));
      toast.success(result.message ?? "Cambios guardados.");
    } else {
      toast.error(result.message ?? "No pudimos guardar los cambios.");
    }
    return result;
  }, initialActionState);

  function set<K extends keyof V>(key: K, value: V[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: undefined } : e));
  }

  return {
    values,
    set,
    errors,
    formAction,
    pending,
    dirty: !same(values, initial),
    discard: () => {
      setValues(initial);
      setErrors({});
    },
  };
}
