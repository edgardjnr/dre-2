import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Singleton para evitar múltiplas instâncias
let supabaseInstance: SupabaseClient | null = null;

// Check if environment variables are properly configured
if (!supabaseUrl || !supabaseAnonKey || 
    supabaseUrl === 'your-project-url.supabase.co' || 
    supabaseAnonKey === 'your-anon-key-here') {
  console.error('⚠️ Supabase configuration missing or using placeholder values');
  console.error('Please configure your .env file with actual Supabase credentials:');
  console.error('VITE_SUPABASE_URL=https://your-project-id.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=your-actual-anon-key');
}

// Create either a real Supabase client or a mock client (Singleton pattern)
const createSupabaseClient = (): SupabaseClient => {
  // Retornar instância existente se já foi criada
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl === 'your-project-url.supabase.co' || 
      supabaseAnonKey === 'your-anon-key-here') {
    
    // Create a mock client that will show an error message instead of crashing
    supabaseInstance = {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signUp: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
        signInWithPassword: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        admin: {
          inviteUserByEmail: () => Promise.resolve({ error: { message: 'Supabase not configured' } })
        }
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }) }),
        insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        update: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase not configured' } }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase not configured' } }) })
      })
    } as SupabaseClient;
  } else {
    // Criar apenas uma instância do cliente Supabase com configurações otimizadas
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'dre-auth-token' // Chave única para evitar conflitos
      },
      global: {
        headers: {
          'X-Client-Info': 'dre-system',
          apikey: supabaseAnonKey
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  
  return supabaseInstance;
};

export const supabase = createSupabaseClient();
