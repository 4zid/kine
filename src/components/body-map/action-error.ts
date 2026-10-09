import { unstable_isUnrecognizedActionError, unstable_rethrow } from "next/navigation";

/**
 * Mensaje para una Server Action que se rechazó (sin conexión, deploy nuevo con otros ids de
 * acción, respuesta inesperada). Nunca dejamos que el rechazo llegue a error.tsx: desmontaría el
 * mapa y se perdería lo cargado. Los errores internos de Next (redirect, notFound) se relanzan.
 */
export function actionErrorMessage(error: unknown, fallback: string): string {
  unstable_rethrow(error);
  if (unstable_isUnrecognizedActionError(error)) {
    return "Hay una versión nueva de kine: recargá la página para seguir (copiá antes lo que escribiste).";
  }
  return fallback;
}
