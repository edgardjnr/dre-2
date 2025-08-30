import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { DREService } from '../../services/dreService';
import { Lancamento, ContaContabil, DREPeriodo } from '../../types';
import { DashboardCards } from './DashboardCards';
import { RevenueChart } from './RevenueChart';
import { MargensEvolutionChart } from './MargensEvolutionChart';
import { DREStructureChart } from './DREStructureChart';
import { LancamentosDebitoChart } from './LancamentosDebitoChart';
import { IndicadoresMelhoriaGuide } from './IndicadoresMelhoriaGuide';
import { ProjecaoMelhoriaChart } from './ProjecaoMelhoriaChart';

import { Spinner } from '../ui/Spinner';
import { useCompany } from '../../contexts/CompanyContext';
import { subYears, startOfYear, endOfYear, format } from 'date-fns';
import RevenueEvolutionChart from './RevenueEvolutionChart';

interface DashboardData {
  dreAtual: DREPeriodo | null;
  dreAnterior: DREPeriodo | null;
  historicoMensal: DREPeriodo[];
  lancamentos: Lancamento[];
  contasContabeis: ContaContabil[];
  empresaId: string;
}

export const Dashboard: React.FC = () => {
  const { companies, selectedCompany, loading: companiesLoading } = useCompany();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompanySelector, setShowCompanySelector] = useState(false);

  console.log('📊 [DEBUG] Dashboard - Componente renderizado');
  console.log('📊 [DEBUG] Dashboard - loading:', loading, 'data:', !!data, 'error:', error);
  console.log('📊 [DEBUG] Dashboard - companies:', companies.length, 'selectedCompany:', selectedCompany);

  // Determinar se deve mostrar o seletor de empresa
  useEffect(() => {
    if (!companiesLoading) {
      setShowCompanySelector(companies.length > 1);
    }
  }, [companies, companiesLoading]);

  useEffect(() => {
    console.log('📊 [DEBUG] Dashboard - useEffect iniciado');
    
    // Se ainda está carregando empresas, aguardar
    if (companiesLoading) {
      return;
    }
    
    // Se há múltiplas empresas e nenhuma foi selecionada, não carregar dados
    if (companies.length > 1 && !selectedCompany) {
      setLoading(false);
      return;
    }
    
    // Se há apenas uma empresa, usar ela automaticamente
    const empresaId = companies.length === 1 ? companies[0].id : selectedCompany;
    
    if (!empresaId) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const lancamentosPromise = supabase.from('lancamentos').select(`
          id,
          user_id,
          created_at,
          empresaId:empresa_id,
          contaId:conta_id,
          data,
          descricao,
          valor,
          tipo
        `).eq('empresa_id', empresaId);
        
        const contasPromise = supabase.from('contas_contabeis').select(`
          id,
          user_id,
          created_at,
          empresaId:empresa_id,
          codigo,
          nome,
          categoria,
          subcategoria,
          tipo,
          ativa
        `).eq('empresa_id', empresaId);
        
        const [lancamentosRes, contasRes] = await Promise.all([lancamentosPromise, contasPromise]);

        if (lancamentosRes.error) throw lancamentosRes.error;
        if (contasRes.error) throw contasRes.error;

        const lancamentos = lancamentosRes.data as unknown as Lancamento[];
        const contas = contasRes.data as unknown as ContaContabil[];

        const anoAtual = new Date();
        const anoAnterior = subYears(anoAtual, 1);

        const dreAtual = DREService.calcularDRE(lancamentos, contas, empresaId, format(startOfYear(anoAtual), 'yyyy-MM-dd'), format(endOfYear(anoAtual), 'yyyy-MM-dd'));
        const dreAnterior = DREService.calcularDRE(lancamentos, contas, empresaId, format(startOfYear(anoAnterior), 'yyyy-MM-dd'), format(endOfYear(anoAnterior), 'yyyy-MM-dd'));

        // For monthly chart
        const historicoMensal: DREPeriodo[] = [];
        for (let i = 0; i < 12; i++) {
          const mes = new Date(anoAtual.getFullYear(), i, 1);
          const inicioMes = format(mes, 'yyyy-MM-dd');
          const fimMes = format(new Date(anoAtual.getFullYear(), i + 1, 0), 'yyyy-MM-dd');
          historicoMensal.push(DREService.calcularDRE(lancamentos, contas, empresaId, inicioMes, fimMes));
        }

        setData({ 
          dreAtual, 
          dreAnterior, 
          historicoMensal, 
          lancamentos, 
          contasContabeis: contas, 
          empresaId 
        });

      } catch (err: any) {
        setError(err.message);
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companiesLoading, companies, selectedCompany]);

  // Se está carregando empresas, mostrar spinner
  if (companiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Se há múltiplas empresas e nenhuma foi selecionada, mostrar mensagem
  if (showCompanySelector && !selectedCompany) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="w-full px-4 py-8">
          <div className="w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Selecione uma Empresa</h2>
              <p className="text-gray-600 mb-8">Você possui múltiplas empresas. Use o seletor no menu superior para escolher qual empresa deseja visualizar no dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !data.dreAtual) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Nenhum dado encontrado</h2>
          <p className="text-gray-500">Não há dados disponíveis para exibir no dashboard.</p>
        </div>
      </div>
    );
  }

  // Verificar se há indicadores que precisam de melhoria
  const eficienciaOperacional = data.dreAtual.receitaLiquida > 0 
    ? ((data.dreAtual.receitaLiquida - data.dreAtual.despesasOperacionais) / data.dreAtual.receitaLiquida) * 100 
    : 0;
  
  const precisaMelhoria = (
    data.dreAtual.margemBruta < 35 ||
    data.dreAtual.margemOperacional < 15 ||
    data.dreAtual.margemLiquida < 10 ||
    eficienciaOperacional < 70
  );

  return (
    <div className="space-y-6">

      
      {/* Cards de resumo */}
      <DashboardCards dreAtual={data.dreAtual} dreAnterior={data.dreAnterior} />
      
      {/* Primeira linha de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueEvolutionChart historicoMensal={data.historicoMensal} />
        <MargensEvolutionChart historicoMensal={data.historicoMensal} />
      </div>
      

      
      {/* Análise de Lançamentos de Débito */}
      <div className="grid grid-cols-1 gap-6">
        <LancamentosDebitoChart empresaId={data.empresaId} />
      </div>
      
      {/* Estrutura do DRE */}
      <div className="grid grid-cols-1 gap-6">
        <DREStructureChart dre={data.dreAtual} />
      </div>
      
      {/* Quarta linha - projeção de melhoria (apenas se precisar de melhoria) */}
      {precisaMelhoria && (
        <div className="grid grid-cols-1 gap-6">
          <ProjecaoMelhoriaChart dre={data.dreAtual} />
        </div>
      )}
      
      {/* Quinta linha - guia de melhoria de indicadores */}
      <div className="grid grid-cols-1 gap-6">
        <IndicadoresMelhoriaGuide dre={data.dreAtual} />
      </div>
    </div>
  );
};
