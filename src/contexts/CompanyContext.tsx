import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

interface Company {
  id: string;
  razaoSocial: string;
}

interface CompanyContextType {
  selectedCompany: string;
  setSelectedCompany: (companyId: string) => void;
  companies: Company[];
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async (retryCount = 0) => {
    if (!user) {
      setLoading(false);
      return;
    }

    const maxRetries = 2;
    
    try {
      console.log('🏢 [DEBUG] Buscando empresas para usuário:', user.id, 'tentativa:', retryCount + 1);
      
      // Timeout para a busca de empresas
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na busca de empresas')), 5000);
      });
      
      const companiesPromise = supabase
        .from('empresas')
        .select('id, razaoSocial:razao_social')
        .eq('user_id', user.id)
        .eq('ativa', true)
        .order('razao_social');
      
      const { data, error } = await Promise.race([companiesPromise, timeoutPromise]);

      if (error) throw error;

      setCompanies(data || []);
      
      // Auto-selecionar a primeira empresa se não houver uma selecionada
      if (data && data.length > 0 && !selectedCompany) {
        setSelectedCompany(data[0].id);
      }
      
      console.log('✅ [DEBUG] Empresas carregadas com sucesso:', data?.length || 0);
    } catch (error) {
      console.error('💥 [DEBUG] Erro ao carregar empresas (tentativa', retryCount + 1, '):', error);
      
      // Verificar se é erro de timeout ou conectividade
      const isTimeoutError = error instanceof Error && error.message.includes('Timeout');
      const isNetworkError = error instanceof Error && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch'));
      
      // Retry logic apenas para erros de timeout ou rede
      if (retryCount < maxRetries && (isTimeoutError || isNetworkError)) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 3000); // Backoff exponencial
        console.log(`🔄 [DEBUG] Tentando buscar empresas novamente em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchCompanies(retryCount + 1);
      }
      
      // Se falhou após todas as tentativas, manter array vazio
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [user, selectedCompany]);

  const refreshCompanies = async () => {
    setLoading(true);
    await fetchCompanies();
  };

  useEffect(() => {
    fetchCompanies();
  }, [user?.id, fetchCompanies]);

  const value: CompanyContextType = {
    selectedCompany,
    setSelectedCompany,
    companies,
    loading,
    refreshCompanies,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};