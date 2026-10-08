/** Primer valor de un search param (Next entrega string | string[] | undefined). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const EMAIL_LIKE = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]{1,190}$/;

/** Email recibido por URL: solo si parece un email (para mostrarlo / precargarlo). */
export function emailParam(value: string | string[] | undefined): string {
  const v = firstParam(value)?.trim().toLowerCase() ?? "";
  return v.length <= 254 && EMAIL_LIKE.test(v) ? v : "";
}
