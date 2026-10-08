import type { CSSProperties } from "react";

/**
 * Keyframes propios del onboarding y de las pantallas de acceso.
 * React 19 eleva y deduplica <style href precedence> en el <head>.
 * `prefers-reduced-motion` ya está contemplado globalmente en globals.css.
 */
const KEYFRAMES = `
@keyframes kine-in-right { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
@keyframes kine-in-left { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
@keyframes kine-card-in { from { opacity: 0; transform: translateY(26px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes kine-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -7px; } }
@keyframes kine-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes kine-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@media (prefers-reduced-motion: reduce) {
  .kine-motion, .kine-motion * { animation-delay: 0s !important; }
}
`;

/** Clase a poner en el contenedor raíz para que respete `prefers-reduced-motion` sin retardos. */
export const MOTION_ROOT_CLASS = "kine-motion";

export function MotionKeyframes() {
  return (
    <style href="kine-onboarding-keyframes" precedence="default">
      {KEYFRAMES}
    </style>
  );
}

/** Entrada de tarjeta flotante con retardo + flotación suave infinita. */
export function cardMotion(delayMs: number, { float = true }: { float?: boolean } = {}): CSSProperties {
  const enter = `kine-card-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms both`;
  if (!float) return { animation: enter };
  const floatDelay = delayMs + 700 + ((delayMs * 7) % 900);
  return { animation: `${enter}, kine-float ${6 + ((delayMs / 100) % 3)}s ease-in-out ${floatDelay}ms infinite` };
}

/** Entrada de texto (fade + desplazamiento según la dirección de navegación). */
export function textMotion(delayMs: number, direction: 1 | -1 = 1): CSSProperties {
  return {
    animation: `${direction === 1 ? "kine-in-right" : "kine-in-left"} 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms both`,
  };
}

/** Barra que crece desde abajo (gráficos). */
export function growMotion(delayMs: number): CSSProperties {
  return {
    transformOrigin: "bottom",
    animation: `kine-grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms both`,
  };
}

/** Barra que se llena de izquierda a derecha. */
export function fillMotion(delayMs: number): CSSProperties {
  return {
    transformOrigin: "left",
    animation: `kine-fill 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms both`,
  };
}
