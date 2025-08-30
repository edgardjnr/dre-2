import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { DREService } from '../../services/dreService';
import { Lancamento, ContaContabil, DREPeriodo } from '../../types';
import { Spinner } from '../ui/Spinner';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from 'date-fns';

interface DREComparativoReportProps {
  empresaId: string;
  onBack: () => void;
}

type PeriodType = 'monthly' | 'quarterly' | 'yearly';

interface ComparisonData {
  periodo: string;
  receitaBruta: number;
  receitaLiquida: number;
  lucroBruto: number;
  resultadoOperacional: number;
  lucroLiquido: number;
  margemBruta: number;
  margemOperacional: number;
  margemLiquida: number;
}

export const DREComparativoReport: React.FC<DREComparativoReportProps> = ({ empresaId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [currentDRE, setCurrentDRE] = useState<DREPeriodo | null>(null);
  const [previousDRE, setPreviousDRE] = useState<DREPeriodo | null>(null);

  useEffect(() => {
    fetchDREData();
  }, [empresaId, periodType]);

  const fetchDREData = async () => {
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

      // Calculate current and previous period DRE
      const today = new Date();
      let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

      if (periodType === 'monthly') {
        currentStart = startOfMonth(today);
        currentEnd = endOfMonth(today);
        previousStart = startOfMonth(subMonths(today, 1));
        previousEnd = endOfMonth(subMonths(today, 1));
      } else if (periodType === 'yearly') {
        currentStart = startOfYear(today);
        currentEnd = endOfYear(today);
        previousStart = startOfYear(subYears(today, 1));
        previousEnd = endOfYear(subYears(today, 1));
      } else { // quarterly
        const currentQuarter = Math.floor(today.getMonth() / 3);
        currentStart = new Date(today.getFullYear(), currentQuarter * 3, 1);
        currentEnd = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
        
        const prevQuarterDate = subMonths(currentStart, 3);
        const prevQuarter = Math.floor(prevQuarterDate.getMonth() / 3);
        previousStart = new Date(prevQuarterDate.getFullYear(), prevQuarter * 3, 1);
        previousEnd = new Date(prevQuarterDate.getFullYear(), (prevQuarter + 1) * 3, 0);
      }

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

      // Generate comparison data for charts
      const data = generateComparisonData(lancamentos, contas, periodType);
      setComparisonData(data);

    } catch (error) {
      console.error('Erro ao carregar dados DRE:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateComparisonData = (
    lancamentos: Lancamento[], 
    contas: ContaContabil[], 
    type: PeriodType
  ): ComparisonData[] => {
    const data: ComparisonData[] = [];
    const today = new Date();
    const periods = type === 'monthly' ? 12 : type === 'quarterly' ? 8 : 5;

    for (let i = periods - 1; i >= 0; i--) {
      let start: Date, end: Date, label: string;

      if (type === 'monthly') {
        const date = subMonths(today, i);
        start = startOfMonth(date);
        end = endOfMonth(date);
        label = format(date, 'MMM/yy');
      } else if (type === 'quarterly') {
        const quarterStart = subMonths(today, i * 3);
        const quarter = Math.floor(quarterStart.getMonth() / 3);
        start = new Date(quarterStart.getFullYear(), quarter * 3, 1);
        end = new Date(quarterStart.getFullYear(), (quarter + 1) * 3, 0);
        label = `Q${quarter + 1}/${quarterStart.getFullYear()}`;
      } else {
        const year = subYears(today, i);
        start = startOfYear(year);
        end = endOfYear(year);
        label = format(year, 'yyyy');
      }

      const dre = DREService.calcularDRE(
        lancamentos,
        contas,
        empresaId,
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );

      data.push({
        periodo: label,
        receitaBruta: dre.receitaBruta,
        receitaLiquida: dre.receitaLiquida,
        lucroBruto: dre.lucroBruto,
        resultadoOperacional: dre.resultadoOperacional,
        lucroLiquido: dre.lucroLiquido,
        margemBruta: dre.margemBruta,
        margemOperacional: dre.margemOperacional,
        margemLiquida: dre.margemLiquida
      });
    }

    return data;
  };

  const calculateVariation = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getVariationIcon = (variation: number) => {
    if (variation > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (variation < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getVariationColor = (variation: number) => {
    if (variation > 0) return 'text-green-600';
    if (variation < 0) return 'text-red-600';
    return 'text-gray-600';
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
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Relatório DRE Comparativo</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                Análise comparativa dos resultados entre períodos
              </p>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
              <option value="yearly">Anual</option>
            </select>
            
            <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto">
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Current vs Previous Period Comparison */}
      {currentDRE && previousDRE && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
            Comparação Período Atual vs Anterior
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[
              { 
                label: 'Receita Líquida', 
                current: currentDRE.receitaLiquida, 
                previous: previousDRE.receitaLiquida 
              },
              { 
                label: 'Lucro Bruto', 
                current: currentDRE.lucroBruto, 
                previous: previousDRE.lucroBruto 
              },
              { 
                label: 'Resultado Operacional', 
                current: currentDRE.resultadoOperacional, 
                previous: previousDRE.resultadoOperacional 
              },
              { 
                label: 'Lucro Líquido', 
                current: currentDRE.lucroLiquido, 
                previous: previousDRE.lucroLiquido 
              }
            ].map((item, index) => {
              const variation = calculateVariation(item.current, item.previous);
              return (
                <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg min-w-0">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 truncate">{item.label}</h4>
                  <div className="space-y-1">
                    <p className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">
                      {formatCurrency(item.current)}
                    </p>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      {getVariationIcon(variation)}
                      <span className={`text-xs sm:text-sm font-medium ${getVariationColor(variation)} truncate`}>
                        {formatPercentage(Math.abs(variation))}
                      </span>
                      <span className="text-xs text-gray-500 hidden sm:inline">vs período anterior</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Anterior: {formatCurrency(item.previous)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Evolution Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
          Evolução dos Resultados ({periodType === 'monthly' ? 'Últimos 12 Meses' : 
                                   periodType === 'quarterly' ? 'Últimos 8 Trimestres' : 
                                   'Últimos 5 Anos'})
        </h3>
        
        <div className="overflow-x-auto">
          <div className="h-64 sm:h-80 min-w-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comparisonData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="periodo" 
                  stroke="#666"
                  fontSize={10}
                />
                <YAxis 
                  yAxisId="values"
                  stroke="#666"
                  fontSize={10}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  yAxisId="margins"
                  orientation="right"
                  stroke="#666"
                  fontSize={10}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name.includes('Margem')) {
                      return [formatPercentage(value), name];
                    }
                    return [formatCurrency(value), name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                
                <Bar yAxisId="values" dataKey="receitaLiquida" fill="#3b82f6" name="Receita Líquida" />
                <Bar yAxisId="values" dataKey="lucroBruto" fill="#10b981" name="Lucro Bruto" />
                <Bar yAxisId="values" dataKey="lucroLiquido" fill="#f59e0b" name="Lucro Líquido" />
                
                <Line 
                  yAxisId="margins" 
                  type="monotone" 
                  dataKey="margemLiquida" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Margem Líquida (%)"
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
          Tabela Comparativa Detalhada
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Período</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Receita Bruta</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Receita Líquida</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Lucro Bruto</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Resultado Op.</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Lucro Líquido</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">Margem Líquida</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900">{row.periodo}</td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-900">
                    {formatCurrency(row.receitaBruta)}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-900">
                    {formatCurrency(row.receitaLiquida)}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-900">
                    {formatCurrency(row.lucroBruto)}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-900">
                    {formatCurrency(row.resultadoOperacional)}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-900">
                    {formatCurrency(row.lucroLiquido)}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-right">
                    <span className={`font-medium ${
                      row.margemLiquida > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(row.margemLiquida)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">💡 Insights e Recomendações</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Tendências Identificadas</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700">
              {currentDRE && previousDRE && (
                <>
                  {calculateVariation(currentDRE.receitaLiquida, previousDRE.receitaLiquida) > 0 ? (
                    <li className="flex items-start space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Crescimento positivo na receita líquida</span>
                    </li>
                  ) : (
                    <li className="flex items-start space-x-2">
                      <TrendingDown className="h-4 w-4 text-red-500 mt-0.5" />
                      <span>Declínio na receita líquida - investigar causas</span>
                    </li>
                  )}
                  
                  {currentDRE.margemLiquida > previousDRE.margemLiquida ? (
                    <li className="flex items-start space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Melhoria na margem líquida</span>
                    </li>
                  ) : (
                    <li className="flex items-start space-x-2">
                      <TrendingDown className="h-4 w-4 text-red-500 mt-0.5" />
                      <span>Pressão na margem líquida - revisar custos</span>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Próximas Ações</h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700">
              <li className="flex items-start space-x-1 sm:space-x-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mt-0.5" />
                <span>Acompanhar tendências mensalmente</span>
              </li>
              <li className="flex items-start space-x-1 sm:space-x-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mt-0.5" />
                <span>Analisar sazonalidades do negócio</span>
              </li>
              <li className="flex items-start space-x-1 sm:space-x-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mt-0.5" />
                <span>Benchmarking com concorrentes</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};