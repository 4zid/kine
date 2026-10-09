"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { actionFailure } from "@/components/auth/action-guard";
import { initialActionState, type ActionState } from "@/lib/types";

import type { FormAction } from "@/lib/types";
export type { FormAction };

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
 * Estado de un formulario de ajustes: inputs controlados, errores por campo,
 * detección de cambios y toasts.
 *
 * El envío va por `onSubmit` + `startTransition` (no `<form action>`): React 19
 * resetea el DOM de los formularios con `action` después de cada envío y los
 * <select> controlados quedaban mostrando la primera opción, que se mandaba en el
 * siguiente "Guardar". Un rechazo de la acción (deploy nuevo, sin conexión) se
 * muestra como toast y no desmonta la pantalla.
 */
export function useSettingsForm<V extends FormValues>(initial: V, action: FormAction) {
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const [, formAction, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    let result: ActionState;
    try {
      result = await action(prev, formData);
    } catch (error) {
      result = actionFailure(error);
    }
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

  const dirty = !same(values, initial);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !dirty) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return {
    values,
    set,
    errors,
    onSubmit,
    pending,
    dirty,
    discard: () => {
      setValues(initial);
      setErrors({});
    },
  };
}
