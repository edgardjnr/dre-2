import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import SplashScreen from '../components/ui/SplashScreen';

// Teste de atualização - verificando se causa loop de carregamento

// Interface para perfil do usuário
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  updated_at?: string;
}

// Define credentials interfaces
interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials {
  email: string;
  password: string;
  full_name: string;
}


interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: AuthError | null;
  signInWithEmail: (credentials: SignInCredentials) => Promise<boolean>;
  signUpWithEmail: (credentials: SignUpCredentials) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [minLoadingTime, setMinLoadingTime] = useState(true);
  
  // Função para criar perfil do usuário a partir dos dados da sessão
  const createUserProfile = (user: User): UserProfile => {
    console.log('👤 [DEBUG] Criando perfil para usuário:', user.id);
    const profile: UserProfile = {
      id: user.id,
      email: user.email || 'usuario@exemplo.com',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
      updated_at: new Date().toISOString()
    };
    console.log('✅ [DEBUG] Perfil criado:', profile);
    return profile;
  };

  // Função para atualizar perfil
  const refreshProfile = async () => {
    if (user?.id) {
      const profile = createUserProfile(user);
      setUserProfile(profile);
    }
  };

  // Função para limpar tokens inválidos
  const clearInvalidTokens = async () => {
    try {
      await supabase.auth.signOut();
      // Limpar localStorage manualmente se necessário
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
    } catch (error) {
      console.error('Erro ao limpar tokens:', error);
    }
  };

  // Controlar tempo mínimo de loading (2.5 segundos)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingTime(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Remover loading quando o tempo mínimo passar
  useEffect(() => {
    if (!minLoadingTime) {
      setLoading(false);
    }
  }, [minLoadingTime]);

  useEffect(() => {
    console.log('🚀 [DEBUG] AuthContext useEffect iniciado');
    
    const getSession = async () => {
      try {
        console.log('📡 [DEBUG] Buscando sessão inicial...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Verificar se há erro de refresh token
        if (error && error.message.includes('Invalid Refresh Token')) {
          console.log('🚫 [DEBUG] Token inválido detectado, limpando sessão...');
          await clearInvalidTokens();
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }
        
        console.log('📋 [DEBUG] Sessão obtida:', session ? 'Existe' : 'Não existe', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Criar perfil sempre que há uma sessão válida (incluindo após refresh)
        if (session?.user?.id) {
          console.log('👤 [DEBUG] Criando perfil para usuário:', session.user.id);
          const profile = createUserProfile(session.user);
          setUserProfile(profile);
          console.log('✅ [DEBUG] userProfile definido no estado:', profile);
        } else {
          console.log('🚫 [DEBUG] Sem sessão, limpando perfil');
          setUserProfile(null);
        }
      } catch (error: any) {
        console.error('💥 [DEBUG] Erro ao obter sessão:', error);
        
        // Se for erro de refresh token, limpar tudo
        if (error?.message?.includes('Invalid Refresh Token') || error?.message?.includes('Refresh Token Not Found')) {
          console.log('🧹 [DEBUG] Erro de refresh token, limpando sessão...');
          await clearInvalidTokens();
          setSession(null);
          setUser(null);
          setUserProfile(null);
        }
      } finally {
        console.log('✅ [DEBUG] getSession finalizado');
        // Se o tempo mínimo já passou, remover loading imediatamente
        if (!minLoadingTime) {
          setLoading(false);
        }
        // Caso contrário, o useEffect do timer vai remover o loading
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('🔄 [DEBUG] Auth state changed:', event, session?.user?.id);
        console.log('🔄 [DEBUG] Session completa:', session);
        
        // Se o evento for TOKEN_REFRESHED e não há sessão, pode ser um erro de refresh
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('🚫 [DEBUG] Token refresh falhou, limpando sessão...');
          await clearInvalidTokens();
        }
        
        console.log('📝 [DEBUG] Atualizando estados: session e user');
        setSession(session);
        setUser(session?.user ?? null);
        
        // Criar perfil apenas em eventos de login (não em TOKEN_REFRESHED)
        if (session?.user?.id && event === 'SIGNED_IN') {
          console.log('👤 [DEBUG] Criando perfil após login:', event);
          const profile = createUserProfile(session.user);
          setUserProfile(profile);
          console.log('✅ [DEBUG] userProfile definido no estado:', profile);
        } else if (!session) {
          console.log('🚫 [DEBUG] Sem sessão, limpando perfil');
          setUserProfile(null);
        }
        
        console.log('✅ [DEBUG] onAuthStateChange finalizado');
        // Se o tempo mínimo já passou, remover loading imediatamente
        if (!minLoadingTime) {
          setLoading(false);
        }
        // Caso contrário, o useEffect do timer vai remover o loading
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (credentials: SignInCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      try {
        const { error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr && /Failed to fetch|NAME_NOT_RESOLVED|NetworkError/i.test(sessionErr.message)) {
          setError({ name: 'AuthError', message: 'Falha de conexão com o Supabase (DNS/Network). Verifique sua internet e a URL do projeto.' } as AuthError);
          return false;
        }
      } catch (prefErr: any) {
        const msg = prefErr?.message || '';
        if (/Failed to fetch|NAME_NOT_RESOLVED|NetworkError/i.test(msg)) {
          setError({ name: 'AuthError', message: 'Falha de conexão com o Supabase (DNS/Network). Verifique sua internet e a URL do projeto.' } as AuthError);
          return false;
        }
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        if ((error as any).status === 503 || error.message?.includes('503')) {
          setError({ name: 'AuthError', message: 'Serviço de autenticação indisponível (503). Verifique o status do projeto Supabase.' } as AuthError);
        } else if (error.message?.includes('Invalid login credentials')) {
          setError({ name: 'AuthError', message: 'Email ou senha incorretos.' } as AuthError);
        } else {
          setError(error);
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      const message = error instanceof Error ? error.message : 'Erro ao conectar com o servidor de autenticação.';
      if (/NAME_NOT_RESOLVED/i.test(message) || /Failed to fetch/i.test(message) || /NetworkError/i.test(message)) {
        setError({ name: 'AuthError', message: 'Falha de conexão com o Supabase (DNS/Network). Verifique sua internet e a URL do projeto.' } as AuthError);
      } else if (/503/i.test(message) || /Service Unavailable/i.test(message)) {
        setError({ name: 'AuthError', message: 'Serviço de autenticação indisponível (503).' } as AuthError);
      } else {
        setError({ name: 'AuthError', message } as AuthError);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (credentials: SignUpCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.full_name
          }
        }
      });

      if (error) {
        setError(error);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };



  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Limpar estado local primeiro (mais importante)
      setUserProfile(null);
      setSession(null);
      setUser(null);
      setError(null);
      
      // Tentar limpar localStorage também
      try {
        localStorage.removeItem('supabase.auth.token');
        // Usar variável de ambiente dinâmica em vez de hardcoded
        const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0];
        if (projectId) {
          localStorage.removeItem(`sb-${projectId}-auth-token`);
        }
      } catch (storageError) {
        console.warn('Erro ao limpar localStorage:', storageError);
      }
      
      // Tentar fazer logout no Supabase (opcional, não crítico)
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (supabaseError) {
        console.warn('Erro no logout do Supabase (ignorado):', supabaseError);
        // Ignoramos erros do Supabase pois o estado local já foi limpo
      }
      
    } catch (error) {
      console.error('Erro no logout:', error);
      // Garantir que o estado local está limpo mesmo com erro
      setUserProfile(null);
      setSession(null);
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      setError(null);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    session,
    user,
    userProfile,
    loading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading && <SplashScreen isVisible={loading} />}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
