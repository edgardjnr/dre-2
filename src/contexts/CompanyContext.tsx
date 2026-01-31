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

    const loadCompanies = async (): Promise<Company[]> => {
      const { data, error } = await supabase.rpc('get_user_companies');
      if (!error && Array.isArray(data)) {
        return (data as CompanyRow[]).map((row) => ({ id: row.id, razaoSocial: row.razao_social }));
      }

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

      return Array.from(mergedMap.values());
    };
    
    try {
      console.log('🏢 [DEBUG] Buscando empresas para usuário:', user.id, 'tentativa:', retryCount + 1);
      const merged = await loadCompanies();
      setCompanies(merged);
      if (merged.length > 0 && !selectedCompany) {
        setSelectedCompany(merged[0].id);
      }
      console.log('✅ [DEBUG] Empresas carregadas com sucesso:', merged.length);
    } catch (error) {
      console.error('💥 [DEBUG] Erro ao carregar empresas:', error);
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
