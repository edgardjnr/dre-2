/**
 * Utilitário para verificar se o Supabase está configurado corretamente
 */

/**
 * Verifica se as variáveis de ambiente do Supabase estão configuradas corretamente
 * @returns {boolean} true se o Supabase estiver configurado, false caso contrário
 */
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return false;
  if (url === 'your-project-url.supabase.co' || key === 'your-anon-key-here') return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};
