import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { Lancamento, ContaContabil } from '../../types';
import { Spinner } from '../ui/Spinner';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

interface FluxoCaixaReportProps {
  empresaId: string;
  onBack: () => void;
}

interface CashFlowData {
  periodo: string;
  entradas: number;
  saidas: number;
  saldo: number;
  saldoAcumulado: number;
}

interface CategoryFlow {
  categoria: string;
  entradas: number;
  saidas: number;
  saldo: number;
  color: string;
}

interface ProjectionData {
  periodo: string;
  projetado: number;
  cenarioOtimista: number;
  cenarioPessimista: number;
}

export const FluxoCaixaReport: React.FC<FluxoCaixaReportProps> = ({ empresaId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryFlow[]>([]);
  const [projectionData, setProjectionData] = useState<ProjectionData[]>([]);
  const [currentSaldo, setCurrentSaldo] = useState(0);
  const [previousSaldo, setPreviousSaldo] = useState(0);

  useEffect(() => {
    fetchCashFlowData();
  }, [empresaId]);

  const fetchCashFlowData = async () => {
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

      // Generate cash flow data for the last 12 months
      const cashFlow = generateCashFlowData(lancamentos, contas);
      setCashFlowData(cashFlow);

      // Generate category analysis
      const categories = generateCategoryAnalysis(lancamentos, contas);
      setCategoryData(categories);

      // Generate projections for next 6 months
      const projections = generateProjections(cashFlow);
      setProjectionData(projections);

      // Calculate current vs previous month
      const thisMonth = calculateMonthlyFlow(lancamentos, contas, new Date());
      const lastMonth = calculateMonthlyFlow(lancamentos, contas, subMonths(new Date(), 1));
      
      setCurrentSaldo(thisMonth);
      setPreviousSaldo(lastMonth);

    } catch (error) {
      console.error('Erro ao carregar dados de fluxo de caixa:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCashFlowData = (lancamentos: Lancamento[], contas: ContaContabil[]): CashFlowData[] => {
    const data: CashFlowData[] = [];
    let saldoAcumulado = 0;

    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const monthlyLancamentos = lancamentos.filter(l => {
        const lancDate = new Date(l.data);
        return lancDate >= start && lancDate <= end;
      });

      let entradas = 0;
      let saidas = 0;

      monthlyLancamentos.forEach(lancamento => {
        const conta = contas.find(c => c.id === lancamento.contaId);
        if (!conta) return;

        const isReceita = ['Receita Bruta', 'Receitas Financeiras'].includes(conta.categoria);
        
        if (isReceita) {
          if (lancamento.tipo === 'Crédito') {
            entradas += lancamento.valor;
          } else {
            saidas += lancamento.valor;
          }
        } else {
          if (lancamento.tipo === 'Débito') {
            saidas += lancamento.valor;
          } else {
            entradas += lancamento.valor;
          }
        }
      });

      const saldo = entradas - saidas;
      saldoAcumulado += saldo;

      data.push({
        periodo: format(date, 'MMM/yy'),
        entradas,
        saidas,
        saldo,
        saldoAcumulado
      });
    }

    return data;
  };

  const generateCategoryAnalysis = (lancamentos: Lancamento[], contas: ContaContabil[]): CategoryFlow[] => {
    const categoryMap: Record<string, { entradas: number; saidas: number }> = {};
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
    ];

    // Filter last 3 months for category analysis
    const threeMonthsAgo = subMonths(new Date(), 3);
    const recentLancamentos = lancamentos.filter(l => new Date(l.data) >= threeMonthsAgo);

    recentLancamentos.forEach(lancamento => {
      const conta = contas.find(c => c.id === lancamento.contaId);
      if (!conta) return;

      if (!categoryMap[conta.categoria]) {
        categoryMap[conta.categoria] = { entradas: 0, saidas: 0 };
      }

      const isReceita = ['Receita Bruta', 'Receitas Financeiras'].includes(conta.categoria);
      
      if (isReceita) {
        if (lancamento.tipo === 'Crédito') {
          categoryMap[conta.categoria].entradas += lancamento.valor;
        } else {
          categoryMap[conta.categoria].saidas += lancamento.valor;
        }
      } else {
        if (lancamento.tipo === 'Débito') {
          categoryMap[conta.categoria].saidas += lancamento.valor;
        } else {
          categoryMap[conta.categoria].entradas += lancamento.valor;
        }
      }
    });

    return Object.entries(categoryMap).map(([categoria, values], index) => ({
      categoria,
      entradas: values.entradas,
      saidas: values.saidas,
      saldo: values.entradas - values.saidas,
      color: colors[index % colors.length]
    }));
  };

  const generateProjections = (historicalData: CashFlowData[]): ProjectionData[] => {
    const projections: ProjectionData[] = [];
    
    // Calculate trends from historical data
    const avgMonthlyFlow = historicalData.reduce((sum, item) => sum + item.saldo, 0) / historicalData.length;
    const lastThreeMonths = historicalData.slice(-3);
    const recentAvg = lastThreeMonths.reduce((sum, item) => sum + item.saldo, 0) / 3;

    for (let i = 1; i <= 6; i++) {
      const futureDate = addMonths(new Date(), i);
      const baseProjection = (avgMonthlyFlow + recentAvg) / 2;
      
      projections.push({
        periodo: format(futureDate, 'MMM/yy'),
        projetado: baseProjection,
        cenarioOtimista: baseProjection * 1.2,
        cenarioPessimista: baseProjection * 0.8
      });
    }

    return projections;
  };

  const calculateMonthlyFlow = (lancamentos: Lancamento[], contas: ContaContabil[], date: Date): number => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const monthlyLancamentos = lancamentos.filter(l => {
      const lancDate = new Date(l.data);
      return lancDate >= start && lancDate <= end;
    });

    let entradas = 0;
    let saidas = 0;

    monthlyLancamentos.forEach(lancamento => {
      const conta = contas.find(c => c.id === lancamento.contaId);
      if (!conta) return;

      const isReceita = ['Receita Bruta', 'Receitas Financeiras'].includes(conta.categoria);
      
      if (isReceita) {
        if (lancamento.tipo === 'Crédito') {
          entradas += lancamento.valor;
        } else {
          saidas += lancamento.valor;
        }
      } else {
        if (lancamento.tipo === 'Débito') {
          saidas += lancamento.valor;
        } else {
          entradas += lancamento.valor;
        }
      }
    });

    return entradas - saidas;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateVariation = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const getHealthStatus = () => {
    const lastThreeMonths = cashFlowData.slice(-3);
    const negativePeriods = lastThreeMonths.filter(d => d.saldo < 0).length;
    
    if (negativePeriods === 0) return { status: 'Excelente', color: 'text-green-600', bg: 'bg-green-50' };
    if (negativePeriods === 1) return { status: 'Bom', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (negativePeriods === 2) return { status: 'Atenção', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'Crítico', color: 'text-red-600', bg: 'bg-red-50' };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const variation = calculateVariation(currentSaldo, previousSaldo);
  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Relatório de Fluxo de Caixa</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                Análise detalhada das entradas e saídas de caixa
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg ${healthStatus.bg}`}>
              <span className={`text-xs sm:text-sm font-medium ${healthStatus.color}`}>
                Status: {healthStatus.status}
              </span>
            </div>
            <button className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="overflow-x-auto">
        <div className="flex space-x-4 min-w-max pb-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 min-w-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[280px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Saldo do Mês</p>
                  <p className={`text-lg sm:text-2xl font-bold ${currentSaldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(currentSaldo)}
                  </p>
                </div>
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
              <div className="flex items-center mt-2">
                {variation > 0 ? (
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                )}
                <span className={`text-xs sm:text-sm ml-1 ${variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(variation).toFixed(1)}% vs mês anterior
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[280px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Entradas (Mês)</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">
                    {formatCurrency(cashFlowData[cashFlowData.length - 1]?.entradas || 0)}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[280px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Saídas (Mês)</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-600">
                    {formatCurrency(cashFlowData[cashFlowData.length - 1]?.saidas || 0)}
                  </p>
                </div>
                <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[280px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Saldo Acumulado</p>
                  <p className={`text-lg sm:text-2xl font-bold ${cashFlowData[cashFlowData.length - 1]?.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(cashFlowData[cashFlowData.length - 1]?.saldoAcumulado || 0)}
                  </p>
                </div>
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Evolution Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
          Evolução do Fluxo de Caixa (Últimos 12 Meses)
        </h3>
        
        <div className="overflow-x-auto">
          <div className="h-64 sm:h-80 min-w-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                
                <Area 
                  type="monotone" 
                  dataKey="saldoAcumulado" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3}
                  name="Saldo Acumulado"
                />
                <Area 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                  name="Saldo Mensal"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Comparison Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
          Entradas vs Saídas Mensais
        </h3>
        
        <div className="overflow-x-auto">
          <div className="h-64 sm:h-80 min-w-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                
                <Bar dataKey="entradas" fill="#10b981" name="Entradas" />
                <Bar dataKey="saidas" fill="#ef4444" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
            Análise por Categoria (Últimos 3 Meses)
          </h3>
          
          <div className="space-y-3 sm:space-y-4">
            {categoryData.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div 
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">{category.categoria}</span>
                </div>
                <div className="text-right">
                  <p className={`text-xs sm:text-sm font-semibold ${category.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(category.saldo)}
                  </p>
                  <p className="text-xs text-gray-500">
                    +{formatCurrency(category.entradas)} / -{formatCurrency(category.saidas)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projections */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
            Projeções (Próximos 6 Meses)
          </h3>
          
          <div className="overflow-x-auto">
            <div className="h-64 sm:h-80 min-w-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" stroke="#666" fontSize={10} />
                  <YAxis stroke="#666" fontSize={10} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  
                  <Area 
                    type="monotone" 
                    dataKey="cenarioOtimista" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.2}
                    name="Cenário Otimista"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="projetado" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.4}
                    name="Projeção Base"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cenarioPessimista" 
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.2}
                    name="Cenário Pessimista"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts and Recommendations */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">🚨 Alertas e Recomendações</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Alertas de Liquidez</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700">
              {currentSaldo < 0 && (
                <li className="flex items-start space-x-1 sm:space-x-2">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mt-0.5" />
                  <span>Saldo negativo no mês atual</span>
                </li>
              )}
              {cashFlowData.slice(-3).filter(d => d.saldo < 0).length >= 2 && (
                <li className="flex items-start space-x-1 sm:space-x-2">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 mt-0.5" />
                  <span>Múltiplos meses com saldo negativo</span>
                </li>
              )}
              {projectionData.some(p => p.projetado < 0) && (
                <li className="flex items-start space-x-1 sm:space-x-2">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 mt-0.5" />
                  <span>Projeções indicam possível déficit futuro</span>
                </li>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Recomendações</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700">
              <li className="flex items-start space-x-1 sm:space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Monitore o fluxo semanalmente</span>
              </li>
              <li className="flex items-start space-x-1 sm:space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Mantenha reserva de emergência</span>
              </li>
              <li className="flex items-start space-x-1 sm:space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Negocie prazos com fornecedores</span>
              </li>
              <li className="flex items-start space-x-1 sm:space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Acelere cobrança de recebíveis</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};