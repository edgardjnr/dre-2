import React, { useState, useEffect } from 'react';
import { FileText, Calendar, TrendingUp, BarChart3, PieChart, Download, Filter, Search, RefreshCw, Building2 } from 'lucide-react';
import { DREComparativoReport } from './DREComparativoReport.tsx';
import { FluxoCaixaReport } from './FluxoCaixaReport.tsx';
import { LancamentosReport } from './LancamentosReport.tsx';
import { DashboardAnalyticReport } from './DashboardAnalyticReport.tsx';
import { RevenueAnalysisReport } from './RevenueAnalysisReport.tsx';
import { supabase } from '../../lib/supabaseClient';
import { Empresa } from '../../types';
import { Spinner } from '../ui/Spinner';

type ReportType = 
  | 'dre-comparativo'
  | 'fluxo-caixa'
  | 'lancamentos'
  | 'dashboard-analytics'
  | 'revenue-analysis'
  | 'none';

interface ReportOption {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  features: string[];
}

const reportOptions: ReportOption[] = [
  {
    id: 'dre-comparativo',
    title: 'DRE Comparativo',
    description: 'Compare resultados entre períodos diferentes',
    icon: BarChart3,
    color: 'bg-blue-500',
    features: [
      'Comparação mensal, trimestral e anual',
      'Análise de variações percentuais',
      'Gráficos de evolução das margens',
      'Exportação para PDF e Excel'
    ]
  },
  {
    id: 'fluxo-caixa',
    title: 'Fluxo de Caixa',
    description: 'Análise detalhada do fluxo de caixa',
    icon: TrendingUp,
    color: 'bg-green-500',
    features: [
      'Entradas e saídas por categoria',
      'Projeções baseadas em histórico',
      'Indicadores de liquidez',
      'Alertas de fluxo negativo'
    ]
  },
  {
    id: 'lancamentos',
    title: 'Relatório de Lançamentos',
    description: 'Detalhamento completo dos lançamentos contábeis',
    icon: FileText,
    color: 'bg-purple-500',
    features: [
      'Filtros avançados por período e conta',
      'Resumo por categoria contábil',
      'Auditoria de lançamentos',
      'Exportação detalhada'
    ]
  },
  {
    id: 'dashboard-analytics',
    title: 'Analytics Avançado',
    description: 'Indicadores de performance e KPIs',
    icon: PieChart,
    color: 'bg-orange-500',
    features: [
      'ROI e ROE calculados',
      'Análise de tendências',
      'Benchmarking setorial',
      'Previsões inteligentes'
    ]
  },
  {
    id: 'revenue-analysis',
    title: 'Análise de Receitas',
    description: 'Decomposição detalhada das receitas',
    icon: Calendar,
    color: 'bg-emerald-500',
    features: [
      'Receitas por fonte/canal',
      'Sazonalidade e padrões',
      'Margem de contribuição',
      'Análise de crescimento'
    ]
  }
];

export const ReportsList: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('none');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select(`
          id,
          user_id,
          created_at,
          razaoSocial:razao_social,
          cnpj,
          regimeTributario:regime_tributario,
          dataAbertura:data_abertura,
          email,
          telefone,
          endereco,
          ativa
        `)
        .eq('ativa', true)
        .order('razao_social');
      
      if (error) {
        console.error('Erro na consulta:', error);
        throw error;
      }
      
      setEmpresas(data as Empresa[]);
      
      // Auto-select first company if available
      if (data && data.length > 0) {
        setSelectedEmpresa(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reportOptions.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReportSelect = (reportId: ReportType) => {
    setSelectedReport(reportId);
  };

  const handleBackToList = () => {
    setSelectedReport('none');
  };

  const renderReportComponent = () => {
    if (!selectedEmpresa) {
      return (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione uma Empresa</h3>
          <p className="text-gray-600">Escolha uma empresa para visualizar os relatórios.</p>
        </div>
      );
    }

    switch (selectedReport) {
      case 'dre-comparativo':
        return <DREComparativoReport empresaId={selectedEmpresa} onBack={handleBackToList} />;
      case 'fluxo-caixa':
        return <FluxoCaixaReport empresaId={selectedEmpresa} onBack={handleBackToList} />;
      case 'lancamentos':
        return <LancamentosReport empresaId={selectedEmpresa} onBack={handleBackToList} />;
      case 'dashboard-analytics':
        return <DashboardAnalyticReport empresaId={selectedEmpresa} onBack={handleBackToList} />;
      case 'revenue-analysis':
        return <RevenueAnalysisReport empresaId={selectedEmpresa} onBack={handleBackToList} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (selectedReport !== 'none') {
    return renderReportComponent();
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Centro de Relatórios</h2>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">
              Gere relatórios detalhados para análise financeira e tomada de decisões
            </p>
          </div>
          <button
            onClick={fetchEmpresas}
            className="flex items-center justify-center space-x-2 px-3 py-2 sm:px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Atualizar</span>
            <span className="sm:hidden">Sync</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Company selection */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Empresa
            </label>
            <select
              value={selectedEmpresa}
              onChange={(e) => setSelectedEmpresa(e.target.value)}
              className="w-full px-2 py-2 sm:px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione uma empresa</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.razaoSocial}
                </option>
              ))}
            </select>
            
            {/* Status info */}
            <div className="mt-1 sm:mt-2 text-xs text-gray-500">
              {loading ? 'Carregando empresas...' : 
               empresas.length === 0 ? 'Nenhuma empresa ativa encontrada. Cadastre uma empresa primeiro.' :
               `${empresas.length} empresa(s) disponível(is)`}
            </div>
          </div>

          {/* Search reports */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Buscar Relatórios
            </label>
            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Empty state for no companies */}
      {!loading && empresas.length === 0 && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-medium text-yellow-900">Nenhuma Empresa Cadastrada</h3>
              <p className="text-yellow-700 text-xs sm:text-sm mt-1">
                Para gerar relatórios, você precisa primeiro cadastrar uma empresa no sistema.
              </p>
              <div className="mt-3">
                <a 
                  href="/empresas" 
                  className="inline-flex items-center px-3 py-2 sm:px-4 bg-yellow-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Cadastrar Empresa
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredReports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleReportSelect(report.id)}
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-lg ${report.color} bg-opacity-10`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${report.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{report.title}</h3>
                  </div>
                </div>
                
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{report.description}</p>
                
                <div className="space-y-1 sm:space-y-2">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900">Recursos:</h4>
                  <ul className="space-y-1">
                    {report.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-start space-x-1 sm:space-x-2 text-xs text-gray-600">
                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span className="line-clamp-1">{feature}</span>
                      </li>
                    ))}
                    {report.features.length > 3 && (
                      <li className="text-xs text-gray-500 italic">+{report.features.length - 3} mais recursos</li>
                    )}
                  </ul>
                </div>
                
                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleReportSelect(report.id)}
                    disabled={!selectedEmpresa}
                    className={`w-full flex items-center justify-center space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 rounded-lg transition-colors text-xs sm:text-sm font-medium ${
                      selectedEmpresa
                        ? `${report.color} text-white hover:opacity-90`
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Gerar Relatório</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state for search */}
      {filteredReports.length === 0 && searchTerm && (
        <div className="text-center py-8 sm:py-12">
          <Search className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Nenhum relatório encontrado</h3>
          <p className="text-gray-600 text-sm px-4">
            Tente ajustar os termos de busca ou remover filtros.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-3 sm:mt-4 px-3 py-2 sm:px-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Limpar busca
          </button>
        </div>
      )}

      {/* Quick stats */}
      {selectedEmpresa && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">📊 Estatísticas Rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
            <div>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{reportOptions.length}</p>
              <p className="text-xs text-gray-600">Relatórios Disponíveis</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-green-600">5</p>
              <p className="text-xs text-gray-600">Formatos de Exportação</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">24/7</p>
              <p className="text-xs text-gray-600">Acesso aos Dados</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-orange-600">∞</p>
              <p className="text-xs text-gray-600">Histórico Disponível</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};