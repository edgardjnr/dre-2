import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User, AuthError, AuthChangeEvent } from '@supabase/supabase-js';

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



interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: AuthError | null;
  signInWithEmail: (credentials: SignInCredentials) => Promise<boolean>;
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
  
  // Estados do contexto de autenticação

  // Computed values
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
        console.log('✅ [DEBUG] getSession finalizado, loading = false');
        setLoading(false);
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
        
        console.log('✅ [DEBUG] onAuthStateChange finalizado, loading = false');
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (credentials: SignInCredentials): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        setError(error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro no login:', error);
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
    signOut,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};