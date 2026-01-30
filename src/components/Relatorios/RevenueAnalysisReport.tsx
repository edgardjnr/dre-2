import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { DREService } from '../../services/dreService';
import { Lancamento, ContaContabil } from '../../types';
import { Spinner } from '../ui/Spinner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { isReceitaDreCategoria, mapContaCategoriaToDreCategoria } from '../../utils/dreCategoria';

interface RevenueAnalysisReportProps {
  empresaId: string;
  onBack: () => void;
}

interface RevenueData {
  periodo: string;
  receitaBruta: number;
  receitaLiquida: number;
  crescimento: number;
}

interface RevenueSourceData {
  fonte: string;
  valor: number;
  percentual: number;
  color: string;
}

export const RevenueAnalysisReport: React.FC<RevenueAnalysisReportProps> = ({ empresaId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [revenueSourceData, setRevenueSourceData] = useState<RevenueSourceData[]>([]);
  const [growthMetrics, setGrowthMetrics] = useState({
    crescimentoMensal: 0,
    crescimentoAnual: 0,
    receituaMedia: 0
  });

  useEffect(() => {
    fetchRevenueData();
  }, [empresaId]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const [lancamentosRes, contasRes] = await Promise.all([
        supabase.from('lancamentos').select(`
          id,
          user_id,
          created_at,
          empresaId:empresa_id,
          contaId:conta_id,
          data,
          descricao,
          valor,
          tipo
        `).eq('empresa_id', empresaId),
        supabase.from('contas_contabeis').select(`
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
        `).eq('empresa_id', empresaId)
      ]);

      if (lancamentosRes.error) throw lancamentosRes.error;
      if (contasRes.error) throw contasRes.error;

      const lancamentos = lancamentosRes.data as unknown as Lancamento[];
      const contas = contasRes.data as unknown as ContaContabil[];

      // Generate revenue evolution data
      const revenueEvolution = generateRevenueEvolution(lancamentos, contas);
      setRevenueData(revenueEvolution);

      // Generate revenue sources analysis
      const revenueSources = generateRevenueSourcesAnalysis(lancamentos, contas);
      setRevenueSourceData(revenueSources);

      // Calculate growth metrics
      const metrics = calculateGrowthMetrics(revenueEvolution);
      setGrowthMetrics(metrics);

    } catch (error) {
      console.error('Erro ao carregar dados de receitas:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRevenueEvolution = (lancamentos: Lancamento[], contas: ContaContabil[]): RevenueData[] => {
    const data: RevenueData[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const dre = DREService.calcularDRE(
        lancamentos,
        contas,
        empresaId,
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );

      let crescimento = 0;
      if (data.length > 0) {
        const previousRevenue = data[data.length - 1].receitaLiquida;
        if (previousRevenue > 0) {
          crescimento = ((dre.receitaLiquida - previousRevenue) / previousRevenue) * 100;
        }
      }

      data.push({
        periodo: format(date, 'MMM/yy'),
        receitaBruta: dre.receitaBruta,
        receitaLiquida: dre.receitaLiquida,
        crescimento
      });
    }

    return data;
  };

  const generateRevenueSourcesAnalysis = (lancamentos: Lancamento[], contas: ContaContabil[]): RevenueSourceData[] => {
    const sourceMap: Record<string, number> = {};
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const last3Months = subMonths(new Date(), 3);
    const recentLancamentos = lancamentos.filter(l => new Date(l.data) >= last3Months);

    const revenueAccounts = contas.filter(c => {
      const categoriaDre = mapContaCategoriaToDreCategoria(c.categoria);
      return categoriaDre ? isReceitaDreCategoria(categoriaDre) : false;
    });

    revenueAccounts.forEach(conta => {
      const revenue = recentLancamentos
        .filter(l => l.contaId === conta.id && l.tipo === 'Crédito')
        .reduce((sum, l) => sum + l.valor, 0);

      if (revenue > 0) {
        sourceMap[conta.nome] = revenue;
      }
    });

    const totalRevenue = Object.values(sourceMap).reduce((sum, val) => sum + val, 0);

    return Object.entries(sourceMap).map(([fonte, valor], index) => ({
      fonte,
      valor,
      percentual: totalRevenue > 0 ? (valor / totalRevenue) * 100 : 0,
      color: colors[index % colors.length]
    })).sort((a, b) => b.valor - a.valor);
  };

  const calculateGrowthMetrics = (data: RevenueData[]) => {
    if (data.length < 2) {
      return { crescimentoMensal: 0, crescimentoAnual: 0, receituaMedia: 0 };
    }

    const last6Months = data.slice(-6);
    const crescimentoMensal = last6Months.reduce((sum, d) => sum + d.crescimento, 0) / 6;

    const receituaMedia = data.reduce((sum, d) => sum + d.receitaLiquida, 0) / data.length;

    const currentYear = data.slice(-12).reduce((sum, d) => sum + d.receitaLiquida, 0);
    const previousYear = data.length >= 24 ? data.slice(-24, -12).reduce((sum, d) => sum + d.receitaLiquida, 0) : 0;
    const crescimentoAnual = previousYear > 0 ? ((currentYear - previousYear) / previousYear) * 100 : 0;

    return { crescimentoMensal, crescimentoAnual, receituaMedia };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact'
    }).format(value);
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Análise de Receitas</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                Decomposição detalhada e análise de crescimento das receitas
              </p>
            </div>
          </div>
          
          <button className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Growth Metrics Cards */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-3 md:grid-cols-3 gap-4 sm:gap-6 min-w-[600px] md:min-w-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Crescimento Mensal</p>
                <p className={`text-lg sm:text-2xl font-bold ${growthMetrics.crescimentoMensal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(growthMetrics.crescimentoMensal)}
                </p>
              </div>
              {growthMetrics.crescimentoMensal >= 0 ? (
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Crescimento Anual</p>
                <p className={`text-lg sm:text-2xl font-bold ${growthMetrics.crescimentoAnual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(growthMetrics.crescimentoAnual)}
                </p>
              </div>
              {growthMetrics.crescimentoAnual >= 0 ? (
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Receita Média Mensal</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">
                  {formatCurrency(growthMetrics.receituaMedia)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Evolution Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
          Evolução das Receitas (Últimos 12 Meses)
        </h3>
        
        <div className="overflow-x-auto">
          <div className="h-80 min-w-[600px] sm:min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                
                <Line 
                  type="monotone" 
                  dataKey="receitaBruta" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Receita Bruta"
                />
                <Line 
                  type="monotone" 
                  dataKey="receitaLiquida" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Receita Líquida"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue Sources and Growth */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-[800px] lg:min-w-0">
          {/* Revenue Sources Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Composição das Receitas (Últimos 3 Meses)</h3>
            
            <div className="h-80 flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueSourceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="valor"
                      nameKey="fonte"
                    >
                      {revenueSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="w-1/2 space-y-2 sm:space-y-3">
                {revenueSourceData.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <div 
                        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      ></div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                        {source.fonte}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900">
                        {formatPercentage(source.percentual)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatCurrency(source.valor)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Growth Rate Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Taxa de Crescimento Mensal (%)</h3>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" stroke="#666" fontSize={10} />
                  <YAxis stroke="#666" fontSize={10} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: any) => formatPercentage(value)} />
                  
                  <Bar 
                    dataKey="crescimento" 
                    name="Crescimento (%)"
                  >
                    {revenueData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.crescimento >= 0 ? '#10b981' : '#ef4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">📊 Insights sobre Receitas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Principais Descobertas</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700">
              <li className="flex items-start space-x-1 sm:space-x-2">
                <div className={`w-2 h-2 rounded-full mt-1 sm:mt-2 ${growthMetrics.crescimentoAnual > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>
                  Crescimento anual de {formatPercentage(growthMetrics.crescimentoAnual)} 
                  {growthMetrics.crescimentoAnual > 0 ? ' indica expansão saudável' : ' requer atenção'}
                </span>
              </li>
              {revenueSourceData.length > 0 && (
                <li className="flex items-start space-x-1 sm:space-x-2">
                  <div className="w-2 h-2 rounded-full mt-1 sm:mt-2 bg-blue-500"></div>
                  <span>
                    Principal fonte: {revenueSourceData[0].fonte} ({formatPercentage(revenueSourceData[0].percentual)})
                  </span>
                </li>
              )}
              <li className="flex items-start space-x-1 sm:space-x-2">
                <div className="w-2 h-2 rounded-full mt-1 sm:mt-2 bg-purple-500"></div>
                <span>Receita média mensal de {formatCurrency(growthMetrics.receituaMedia)}</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Recomendações</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700">
              <li className="flex items-start space-x-1 sm:space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Diversificar fontes de receita para reduzir riscos</span>
              </li>
              <li className="flex items-start space-x-1 sm:space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Focar no crescimento das fontes mais lucrativas</span>
              </li>
              <li className="flex items-start space-x-1 sm:space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Monitorar tendências mensais para ajustes estratégicos</span>
              </li>
              <li className="flex items-start space-x-1 sm:space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Estabelecer metas de crescimento realistas</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
