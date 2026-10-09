import { unstable_isUnrecognizedActionError, unstable_rethrow } from "next/navigation";
import type { ActionState } from "@/lib/types";

/**
 * Las Server Actions pueden rechazarse en el cliente aunque el servidor nunca
 * lance (deploy nuevo con otros ids de acción, sesión vencida a mitad de camino,
 * sin conexión). Sin esto, React lleva el rechazo al error.tsx de la ruta y se
 * desmonta el formulario con todo lo escrito.
 */
export const STALE_VERSION_MESSAGE = "Hay una versión nueva de kine. Recargá la página (copiá antes lo que escribiste).";
export const CONNECTION_MESSAGE = "No pudimos conectarnos con kine. Revisá tu conexión e intentá de nuevo.";

/** ActionState amigable para un rechazo. Re-lanza redirect() / notFound() para que Next los maneje. */
export function actionFailure<T = undefined>(error: unknown): ActionState<T> {
  unstable_rethrow(error);
  console.error(error);
  return {
    ok: false,
    message: unstable_isUnrecognizedActionError(error) ? STALE_VERSION_MESSAGE : CONNECTION_MESSAGE,
  };
}

/** Envuelve la acción que recibe `useActionState` para que nunca rechace (salvo redirecciones). */
export function guardAction<T, P>(
  action: (prev: ActionState<T>, payload: P) => Promise<ActionState<T>>,
): (prev: ActionState<T>, payload: P) => Promise<ActionState<T>> {
  return async (prev, payload) => {
    try {
      return await action(prev, payload);
    } catch (error) {
      return actionFailure<T>(error);
    }
  };
}
