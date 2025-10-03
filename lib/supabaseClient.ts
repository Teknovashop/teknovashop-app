// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Obtiene el cliente de Supabase solo en cliente (navegador).
 * En SSR/build devuelve null para evitar errores de entorno.
 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    // Estamos en SSR / build: no crear cliente aquí
    return null;
  }
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Faltan variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  _client = createClient(url, anon);
  return _client;
}
