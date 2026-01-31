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

type CompanyRow = { id: string; razao_social: string };

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

    const maxRetries = 1;
    const timeoutMs = Number(import.meta.env.VITE_COMPANIES_TIMEOUT_MS) || 12000;

    const loadCompaniesDirect = async () => {
      const { data: ownedCompanies, error: ownedError } = await supabase
        .from('empresas')
        .select('id, razao_social')
        .eq('user_id', user.id)
        .eq('ativa', true)
        .order('razao_social');

      if (ownedError) throw ownedError;

      const { data: collaboratorRows, error: collaboratorError } = await supabase
        .from('company_collaborators')
        .select('company_id')
        .eq('user_id', user.id);

      if (collaboratorError) throw collaboratorError;

      const collaboratorCompanyIds = Array.from(
        new Set((collaboratorRows || []).map((row: { company_id: string }) => row.company_id).filter(Boolean))
      );

      let collaboratorCompanies: { id: string; razao_social: string }[] = [];
      if (collaboratorCompanyIds.length > 0) {
        const { data: collaboratorData, error: collaboratorDataError } = await supabase
          .from('empresas')
          .select('id, razao_social')
          .in('id', collaboratorCompanyIds)
          .eq('ativa', true)
          .order('razao_social');

        if (collaboratorDataError) throw collaboratorDataError;
        collaboratorCompanies = (collaboratorData || []) as { id: string; razao_social: string }[];
      }

      const mergedMap = new Map<string, { id: string; razaoSocial: string }>();
      (ownedCompanies || []).forEach((row: { id: string; razao_social: string }) => {
        mergedMap.set(row.id, { id: row.id, razaoSocial: row.razao_social });
      });
      collaboratorCompanies.forEach((row) => {
        mergedMap.set(row.id, { id: row.id, razaoSocial: row.razao_social });
      });

      const merged = Array.from(mergedMap.values());
      setCompanies(merged);

      if (merged.length > 0 && !selectedCompany) {
        setSelectedCompany(merged[0].id);
      }
    };
    
    try {
      console.log('🏢 [DEBUG] Buscando empresas para usuário:', user.id, 'tentativa:', retryCount + 1);
      
      // Timeout para a busca de empresas (ajustável via VITE_COMPANIES_TIMEOUT_MS)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na busca de empresas')), timeoutMs);
      });
      
      const companiesPromise = supabase
        .rpc('get_user_companies');
      
      const { data, error } = await Promise.race([companiesPromise, timeoutPromise]);

      if (error) throw error;

      setCompanies((data || []).map((row: CompanyRow) => ({
        id: row.id,
        razaoSocial: row.razao_social
      })));
      
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

      // Timeout: partir direto para o fallback sem múltiplas tentativas
      if (isTimeoutError) {
        console.log('⏱️ [DEBUG] Timeout na RPC, usando fallback imediato...');
        try {
          await loadCompaniesDirect();
        } catch (fallbackError) {
          console.error('💥 [DEBUG] Erro ao carregar empresas via fallback:', fallbackError);
          setCompanies([]);
        }
        return;
      }

      // Erro de rede: tentar uma vez com backoff, depois fallback
      if (isNetworkError && retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 3000);
        console.log(`🔄 [DEBUG] Tentando buscar empresas novamente em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchCompanies(retryCount + 1);
      }

      // Outros erros: usar fallback
      try {
        await loadCompaniesDirect();
      } catch (fallbackError) {
        console.error('💥 [DEBUG] Erro ao carregar empresas via fallback:', fallbackError);
        setCompanies([]);
      }
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
