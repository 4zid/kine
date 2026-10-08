/**
 * Configuración pública de Supabase.
 *
 * La URL y la publishable key son valores públicos por diseño (viajan al navegador);
 * la seguridad de los datos la garantizan las políticas RLS. Las variables de entorno
 * tienen prioridad; los valores por defecto evitan que un deploy sin variables
 * configuradas quede caído.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qniolsvnhxrzwzfqwnxd.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_ixZPNlpy_3Pobh4GY0GDYQ_WGn2TGTq";
