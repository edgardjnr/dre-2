import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, TrendingUp, Target, BarChart3, PieChart, AlertCircle, Award } from 'lucide-react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { DREService } from '../../services/dreService';
import { Lancamento, ContaContabil, DREPeriodo } from '../../types';
import { Spinner } from '../ui/Spinner';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface DashboardAnalyticReportProps {
  empresaId: string;
  onBack: () => void;
}

interface KPIData {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface BenchmarkData {
  metric: string;
  empresa: number;
  setor: number;
  mercado: number;
}

interface TrendData {
  periodo: string;
  ROE: number;
  ROI: number;
  ROIC: number;
  ROA: number;
  margemEBITDA: number;
  liquidezCorrente: number;
}

export const DashboardAnalyticReport: React.FC<DashboardAnalyticReportProps> = ({ empresaId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [currentDRE, setCurrentDRE] = useState<DREPeriodo | null>(null);
  const [previousDRE, setPreviousDRE] = useState<DREPeriodo | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [empresaId]);

  const fetchAnalyticsData = async () => {
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

      // Calculate current year DRE
      const currentYear = new Date();
      const currentStart = startOfYear(currentYear);
      const currentEnd = endOfYear(currentYear);
      
      const previousYear = new Date(currentYear.getFullYear() - 1, 0, 1);
      const previousStart = startOfYear(previousYear);
      const previousEnd = endOfYear(previousYear);

      const current = DREService.calcularDRE(
        lancamentos,
        contas,
        empresaId,
        format(currentStart, 'yyyy-MM-dd'),
        format(currentEnd, 'yyyy-MM-dd')
      );

      const previous = DREService.calcularDRE(
        lancamentos,
        contas,
        empresaId,
        format(previousStart, 'yyyy-MM-dd'),
        format(previousEnd, 'yyyy-MM-dd')
      );

      setCurrentDRE(current);
      setPreviousDRE(previous);

      // Generate KPIs
      const kpis = generateKPIs(current, previous);
      setKpiData(kpis);

      // Generate benchmark data
      const benchmarks = generateBenchmarkData(current);
      setBenchmarkData(benchmarks);

      // Generate trend data
      const trends = generateTrendData(lancamentos, contas);
      setTrendData(trends);

    } catch (error) {
      console.error('Erro ao carregar dados de analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateKPIs = (current: DREPeriodo, previous: DREPeriodo): KPIData[] => {
    // Simulated balance sheet values for calculations
    const ativo = current.receitaLiquida * 2.5; // Simplified assumption
    const patrimonio = current.lucroLiquido * 8; // Simplified assumption
    const capitalInvestido = ativo * 0.7; // Simplified assumption
    
    const prevAtivo = previous.receitaLiquida * 2.5;
    const prevPatrimonio = previous.lucroLiquido * 8;
    const prevCapitalInvestido = prevAtivo * 0.7;

    // ROE - Return on Equity
    const roe = patrimonio > 0 ? (current.lucroLiquido / patrimonio) * 100 : 0;
    const prevROE = prevPatrimonio > 0 ? (previous.lucroLiquido / prevPatrimonio) * 100 : 0;

    // ROI - Return on Investment
    const roi = capitalInvestido > 0 ? (current.lucroLiquido / capitalInvestido) * 100 : 0;
    const prevROI = prevCapitalInvestido > 0 ? (previous.lucroLiquido / prevCapitalInvestido) * 100 : 0;

    // ROIC - Return on Invested Capital
    const roic = capitalInvestido > 0 ? ((current.resultadoOperacional * 0.66) / capitalInvestido) * 100 : 0; // Assuming 34% tax rate
    const prevROIC = prevCapitalInvestido > 0 ? ((previous.resultadoOperacional * 0.66) / prevCapitalInvestido) * 100 : 0;

    // ROA - Return on Assets
    const roa = ativo > 0 ? (current.lucroLiquido / ativo) * 100 : 0;
    const prevROA = prevAtivo > 0 ? (previous.lucroLiquido / prevAtivo) * 100 : 0;

    // EBITDA Margin (approximated)
    const ebitda = current.resultadoOperacional + (current.receitaLiquida * 0.05); // Approximated depreciation
    const margemEBITDA = current.receitaLiquida > 0 ? (ebitda / current.receitaLiquida) * 100 : 0;
    const prevEBITDA = previous.resultadoOperacional + (previous.receitaLiquida * 0.05);
    const prevMargemEBITDA = previous.receitaLiquida > 0 ? (prevEBITDA / previous.receitaLiquida) * 100 : 0;

    // Current Ratio (simplified)
    const ativoCirculante = current.receitaLiquida * 0.8;
    const passivoCirculante = current.receitaLiquida * 0.4;
    const liquidezCorrente = passivoCirculante > 0 ? ativoCirculante / passivoCirculante : 0;
    
    const prevAtivoCirculante = previous.receitaLiquida * 0.8;
    const prevPassivoCirculante = previous.receitaLiquida * 0.4;
    const prevLiquidezCorrente = prevPassivoCirculante > 0 ? prevAtivoCirculante / prevPassivoCirculante : 0;

    const getStatus = (value: number, targets: { excellent: number; good: number; warning: number }) => {
      if (value >= targets.excellent) return 'excellent';
      if (value >= targets.good) return 'good';
      if (value >= targets.warning) return 'warning';
      return 'critical';
    };

    return [
      {
        name: 'ROE',
        value: roe,
        target: 15,
        unit: '%',
        trend: roe - prevROE,
        status: getStatus(roe, { excellent: 20, good: 15, warning: 10 })
      },
      {
        name: 'ROI',
        value: roi,
        target: 12,
        unit: '%',
        trend: roi - prevROI,
        status: getStatus(roi, { excellent: 15, good: 12, warning: 8 })
      },
      {
        name: 'ROIC',
        value: roic,
        target: 10,
        unit: '%',
        trend: roic - prevROIC,
        status: getStatus(roic, { excellent: 12, good: 10, warning: 6 })
      },
      {
        name: 'ROA',
        value: roa,
        target: 8,
        unit: '%',
        trend: roa - prevROA,
        status: getStatus(roa, { excellent: 10, good: 8, warning: 5 })
      },
      {
        name: 'Margem EBITDA',
        value: margemEBITDA,
        target: 20,
        unit: '%',
        trend: margemEBITDA - prevMargemEBITDA,
        status: getStatus(margemEBITDA, { excellent: 25, good: 20, warning: 15 })
      },
      {
        name: 'Liquidez Corrente',
        value: liquidezCorrente,
        target: 1.5,
        unit: 'x',
        trend: liquidezCorrente - prevLiquidezCorrente,
        status: getStatus(liquidezCorrente, { excellent: 2, good: 1.5, warning: 1.2 })
      }
    ];
  };

  const generateBenchmarkData = (current: DREPeriodo): BenchmarkData[] => {
    // Simulated benchmark data for demonstration
    return [
      {
        metric: 'Margem Bruta',
        empresa: current.margemBruta,
        setor: 32.5,
        mercado: 28.7
      },
      {
        metric: 'Margem Operacional',
        empresa: current.margemOperacional,
        setor: 18.3,
        mercado: 15.2
      },
      {
        metric: 'Margem Líquida',
        empresa: current.margemLiquida,
        setor: 12.8,
        mercado: 10.5
      },
      {
        metric: 'EBITDA',
        empresa: current.receitaLiquida > 0 ? ((current.resultadoOperacional + current.receitaLiquida * 0.05) / current.receitaLiquida) * 100 : 0,
        setor: 22.4,
        mercado: 19.8
      }
    ];
  };

  const generateTrendData = (lancamentos: Lancamento[], contas: ContaContabil[]): TrendData[] => {
    const data: TrendData[] = [];
    
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

      // Simplified calculations for demonstration
      const ativo = dre.receitaLiquida * 2.5;
      const patrimonio = dre.lucroLiquido * 8;
      const capitalInvestido = ativo * 0.7;
      const ebitda = dre.resultadoOperacional + (dre.receitaLiquida * 0.05);
      const ativoCirculante = dre.receitaLiquida * 0.8;
      const passivoCirculante = dre.receitaLiquida * 0.4;

      data.push({
        periodo: format(date, 'MMM/yy'),
        ROE: patrimonio > 0 ? (dre.lucroLiquido / patrimonio) * 100 : 0,
        ROI: capitalInvestido > 0 ? (dre.lucroLiquido / capitalInvestido) * 100 : 0,
        ROIC: capitalInvestido > 0 ? ((dre.resultadoOperacional * 0.66) / capitalInvestido) * 100 : 0,
        ROA: ativo > 0 ? (dre.lucroLiquido / ativo) * 100 : 0,
        margemEBITDA: dre.receitaLiquida > 0 ? (ebitda / dre.receitaLiquida) * 100 : 0,
        liquidezCorrente: passivoCirculante > 0 ? ativoCirculante / passivoCirculante : 0
      });
    }

    return data;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatNumber = (value: number, decimals: number = 1) => value.toFixed(decimals);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' };
      case 'good': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
      case 'warning': return { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' };
      default: return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <Award className="h-5 w-5 text-green-500" />;
      case 'good': return <Target className="h-5 w-5 text-blue-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default: return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Analytics Avançado</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                Indicadores de performance e análise de rentabilidade
              </p>
            </div>
          </div>
          
          <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Indicadores Chave de Performance (KPIs)</h3>
        
        <div className="overflow-x-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 min-w-[640px] lg:min-w-0">
          {kpiData.map((kpi, index) => {
            const colors = getStatusColor(kpi.status);
            return (
              <div key={index} className={`p-3 sm:p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900">{kpi.name}</h4>
                  {getStatusIcon(kpi.status)}
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-end space-x-1 sm:space-x-2">
                    <span className={`text-lg sm:text-2xl font-bold ${colors.text}`}>
                      {formatNumber(kpi.value)}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-600">{kpi.unit}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Meta: {formatNumber(kpi.target)}{kpi.unit}</span>
                    <span className={`font-medium ${kpi.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpi.trend >= 0 ? '+' : ''}{formatNumber(kpi.trend)}{kpi.unit}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        kpi.status === 'excellent' ? 'bg-green-500' :
                        kpi.status === 'good' ? 'bg-blue-500' :
                        kpi.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Trend Analysis Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Evolução dos Indicadores (Últimos 12 Meses)</h3>
        
        <div className="overflow-x-auto">
          <div className="h-64 sm:h-80 min-w-[600px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" stroke="#666" fontSize={12} />
              <YAxis yAxisId="percentage" stroke="#666" fontSize={12} tickFormatter={(value) => `${value}%`} />
              <YAxis yAxisId="ratio" orientation="right" stroke="#666" fontSize={12} tickFormatter={(value) => `${value.toFixed(1)}x`} />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'Liquidez Corrente') {
                    return [`${value.toFixed(2)}x`, name];
                  }
                  return [`${value.toFixed(1)}%`, name];
                }}
              />
              <Legend />
              
              <Line yAxisId="percentage" type="monotone" dataKey="ROE" stroke="#3b82f6" strokeWidth={2} name="ROE (%)" />
              <Line yAxisId="percentage" type="monotone" dataKey="ROI" stroke="#10b981" strokeWidth={2} name="ROI (%)" />
              <Line yAxisId="percentage" type="monotone" dataKey="ROIC" stroke="#f59e0b" strokeWidth={2} name="ROIC (%)" />
              <Line yAxisId="percentage" type="monotone" dataKey="margemEBITDA" stroke="#ef4444" strokeWidth={2} name="Margem EBITDA (%)" />
              <Line yAxisId="ratio" type="monotone" dataKey="liquidezCorrente" stroke="#8b5cf6" strokeWidth={2} name="Liquidez Corrente" />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Benchmark Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Benchmarking Setorial</h3>
          
          <div className="overflow-x-auto">
            <div className="h-64 sm:h-80 min-w-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={benchmarkData} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="metric" 
                  stroke="#666" 
                  fontSize={10}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, '']} />
                <Legend />
                
                <Bar dataKey="empresa" fill="#3b82f6" name="Sua Empresa" />
                <Bar dataKey="setor" fill="#10b981" name="Média do Setor" />
                <Bar dataKey="mercado" fill="#f59e0b" name="Média do Mercado" />
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Performance Score */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Score de Performance</h3>
          
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-32 h-32">
                <div className="absolute inset-0">
                  <div className="w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[
                        { name: 'Score', value: 75, fill: '#3b82f6' }
                      ]}>
                        <RadialBar dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">75</p>
                  <p className="text-xs text-gray-600">Score Geral</p>
                </div>
              </div>
            </div>

            {/* Individual Scores */}
            <div className="space-y-3">
              {[
                { name: 'Rentabilidade', score: 82, color: 'bg-green-500' },
                { name: 'Liquidez', score: 71, color: 'bg-blue-500' },
                { name: 'Eficiência', score: 68, color: 'bg-yellow-500' },
                { name: 'Crescimento', score: 79, color: 'bg-purple-500' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${item.score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{item.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">🎯 Insights Estratégicos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Pontos Fortes</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700">
              {kpiData.filter(kpi => kpi.status === 'excellent' || kpi.status === 'good').map((kpi, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <Award className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>{kpi.name} está {kpi.status === 'excellent' ? 'excelente' : 'bom'} ({formatNumber(kpi.value)}{kpi.unit})</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Áreas de Melhoria</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700">
              {kpiData.filter(kpi => kpi.status === 'warning' || kpi.status === 'critical').map((kpi, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span>{kpi.name} precisa melhorar (atual: {formatNumber(kpi.value)}{kpi.unit}, meta: {formatNumber(kpi.target)}{kpi.unit})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white rounded-lg border border-purple-200">
          <h5 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">🚀 Próximos Passos Recomendados</h5>
          <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-gray-700">
            <li>Focar na melhoria dos indicadores críticos identificados</li>
            <li>Implementar monitoramento mensal dos KPIs</li>
            <li>Benchmarking contínuo com concorrentes do setor</li>
            <li>Definir metas específicas para cada indicador</li>
            <li>Criar planos de ação detalhados para melhorias</li>
          </ol>
        </div>
      </div>
    </div>
  );
};