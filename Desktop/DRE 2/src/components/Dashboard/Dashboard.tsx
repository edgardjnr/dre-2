import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { DREService } from '../../services/dreService';
import { Lancamento, ContaContabil, DREPeriodo } from '../../types';
import { DashboardCards } from './DashboardCards';
import { RevenueChart } from './RevenueChart';
import { MargensEvolutionChart } from './MargensEvolutionChart';
import { DREStructureChart } from './DREStructureChart';
import { LancamentosDebitoChart } from './LancamentosDebitoChart';
import { ProjecaoMelhoriaChart } from './ProjecaoMelhoriaChart';
import IndicadoresPerformanceChart from './IndicadoresPerformanceChart';
import { PeriodFilter } from './PeriodFilter';
import { usePeriodFilter } from './hooks/usePeriodFilter';


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
  
  // Hook para gerenciar filtros de período
  const {
    selectedPeriod,
    customStartDate,
    customEndDate,
    periodRange,
    previousPeriodRange,
    handlePeriodChange,
    handleCustomDateChange,
    formatDateForAPI,
    isDateInRange,
    getPeriodLabel,
  } = usePeriodFilter();

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
    console.log('📊 [DEBUG] Dashboard - Período selecionado:', selectedPeriod, getPeriodLabel());
    console.log('📊 [DEBUG] Dashboard - Range atual:', formatDateForAPI(periodRange.startDate), 'a', formatDateForAPI(periodRange.endDate));
    console.log('📊 [DEBUG] Dashboard - Range anterior:', formatDateForAPI(previousPeriodRange.startDate), 'a', formatDateForAPI(previousPeriodRange.endDate));
    
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

        // Calcular DRE baseado no período filtrado
        const dreAtual = DREService.calcularDRE(
          lancamentos, 
          contas, 
          empresaId, 
          formatDateForAPI(periodRange.startDate), 
          formatDateForAPI(periodRange.endDate)
        );
        
        const dreAnterior = DREService.calcularDRE(
          lancamentos, 
          contas, 
          empresaId, 
          formatDateForAPI(previousPeriodRange.startDate), 
          formatDateForAPI(previousPeriodRange.endDate)
        );

        // Histórico mensal baseado no período filtrado
        const historicoMensal: DREPeriodo[] = [];
        
        // Filtrar lançamentos dentro do período selecionado
        const lancamentosFiltrados = lancamentos.filter(lancamento => {
          if (lancamento.empresaId !== empresaId) return false;
          const dataLancamento = new Date(lancamento.data);
          return isDateInRange(dataLancamento, periodRange);
        });
        
        // Identificar meses únicos com lançamentos no período filtrado
        const mesesComLancamentos = new Set<string>();
        lancamentosFiltrados.forEach(lancamento => {
          const dataLancamento = new Date(lancamento.data);
          const chaveAnoMes = `${dataLancamento.getFullYear()}-${dataLancamento.getMonth()}`;
          mesesComLancamentos.add(chaveAnoMes);
        });
        
        console.log(`Meses com lançamentos no período filtrado: ${Array.from(mesesComLancamentos).length}`);
        
        // Processar cada mês com lançamentos
        Array.from(mesesComLancamentos).sort().forEach(chaveAnoMes => {
          const [ano, mes] = chaveAnoMes.split('-').map(Number);
          const inicioMes = new Date(ano, mes, 1);
          const fimMes = new Date(ano, mes + 1, 0);
          
          const dreMes = DREService.calcularDRE(
            lancamentos, 
            contas, 
            empresaId, 
            format(inicioMes, 'yyyy-MM-dd'), 
            format(fimMes, 'yyyy-MM-dd')
          );
          
          console.log(`Mês ${mes + 1}/${ano}: Receita: ${dreMes.receitaLiquida}, Margem: ${dreMes.margemLiquida}%`);
          historicoMensal.push(dreMes);
        });

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
  }, [companiesLoading, companies, selectedCompany, periodRange, previousPeriodRange]);

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
      {/* Filtro de Período */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Filtros de Período</h3>
          <span className="text-sm text-gray-600">Período atual: {getPeriodLabel()}</span>
        </div>
        <PeriodFilter
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomDateChange={handleCustomDateChange}
        />
      </div>
      
      {/* Cards de resumo */}
      <DashboardCards dreAtual={data.dreAtual} dreAnterior={data.dreAnterior} />
      
      {/* Primeira linha de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueEvolutionChart historicoMensal={data.historicoMensal} />
        <MargensEvolutionChart historicoMensal={data.historicoMensal} />
      </div>
      

      
      {/* Análise de Lançamentos de Débito e Indicadores de Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LancamentosDebitoChart 
          empresaId={data.empresaId}
          lancamentos={data.lancamentos}
          contasContabeis={data.contasContabeis}
          startDate={formatDateForAPI(periodRange.startDate)}
          endDate={formatDateForAPI(periodRange.endDate)}
        />
        <IndicadoresPerformanceChart 
          empresaId={data.empresaId}
          lancamentos={data.lancamentos}
          contasContabeis={data.contasContabeis}
          startDate={formatDateForAPI(periodRange.startDate)}
          endDate={formatDateForAPI(periodRange.endDate)}
        />
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
      
    </div>
  );
};
