import { toast, type ExternalToast } from "sonner";

/**
 * Toasts de la historia clínica: arriba al centro, porque abajo está la barra
 * fija de guardado (el Toaster global está abajo al centro).
 */
const TOP: ExternalToast = { position: "top-center" };

export const notify = {
  success: (message: string) => toast.success(message, TOP),
  error: (message: string, options?: ExternalToast) => toast.error(message, { ...TOP, ...options }),
  info: (message: string, options?: ExternalToast) => toast(message, { ...TOP, ...options }),
};
