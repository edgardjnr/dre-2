import React, { useEffect, useRef } from 'react';
import Highcharts from 'highcharts';
import { DREPeriodo } from '../../types';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface DREStructureChartProps {
  dre: DREPeriodo;
}

export const DREStructureChart: React.FC<DREStructureChartProps> = ({ dre }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<Highcharts.Chart | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatCurrencyWithSign = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(value));
    return value < 0 ? `-${formatted}` : formatted;
  };

  // Dados estruturados para o gráfico cascata
  const chartData = [
    {
      name: 'Receita Bruta',
      y: dre.receitaBruta,
      color: '#10b981',
      type: 'positive'
    },
    {
      name: 'Deduções',
      y: -dre.deducoes,
      color: '#ef4444',
      type: 'negative'
    },
    {
      name: 'Receita Líquida',
      y: dre.receitaLiquida,
      color: '#059669',
      type: 'result'
    },
    {
      name: 'Custos',
      y: -dre.custos,
      color: '#f59e0b',
      type: 'negative'
    },
    {
      name: 'Lucro Bruto',
      y: dre.lucroBruto,
      color: '#0d9488',
      type: 'result'
    },
    {
      name: 'Despesas Operacionais',
      y: -dre.despesasOperacionais,
      color: '#dc2626',
      type: 'negative'
    },
    {
      name: 'Resultado Operacional',
      y: dre.resultadoOperacional,
      color: '#0891b2',
      type: 'result'
    },
    {
      name: 'Resultado Financeiro',
      y: dre.receitasFinanceiras - dre.despesasFinanceiras,
      color: dre.receitasFinanceiras - dre.despesasFinanceiras >= 0 ? '#10b981' : '#ef4444',
      type: dre.receitasFinanceiras - dre.despesasFinanceiras >= 0 ? 'positive' : 'negative'
    },
    {
      name: 'Impostos sobre Lucro',
      y: -dre.impostosSobreLucro,
      color: '#991b1b',
      type: 'negative'
    },
    {
      name: 'Lucro Líquido',
      y: dre.lucroLiquido,
      color: dre.lucroLiquido >= 0 ? '#059669' : '#dc2626',
      type: 'final'
    }
  ];

  useEffect(() => {
    if (!chartRef.current) return;

    try {
      // Destruir gráfico anterior se existir
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Criar novo gráfico
      chartInstance.current = Highcharts.chart(chartRef.current, {
        accessibility: {
          enabled: false
        },
        chart: {
          type: 'column',
          backgroundColor: 'transparent',
          style: {
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        },
        title: {
          text: null
        },
        subtitle: {
          text: null
        },
        xAxis: {
          categories: chartData.map(item => item.name),
          crosshair: true,
          labels: {
            rotation: -45,
            style: {
              fontSize: '11px',
              color: '#666'
            }
          },
          lineColor: '#e5e7eb',
          tickColor: '#e5e7eb'
        },
        yAxis: {
          min: Math.min(...chartData.map(item => item.y)) * 1.1,
          title: {
            text: 'Valores (R$)',
            style: {
              color: '#666',
              fontSize: '12px'
            }
          },
          labels: {
            formatter: function() {
              return formatCurrency(this.value || 0);
            },
            style: {
              fontSize: '12px',
              color: '#666'
            }
          },
          gridLineColor: '#f0f0f0'
        },
        tooltip: {
          backgroundColor: 'white',
          borderColor: '#e5e7eb',
          borderRadius: 8,
          shadow: true,
          useHTML: true,
          formatter: function() {
            const point = this.point as any;
            const percentage = dre.receitaBruta > 0 ? ((Math.abs(point.y) / dre.receitaBruta) * 100).toFixed(1) : '0.0';
            const typeLabel = point.options.type === 'positive' ? 'Receita' : 
                            point.options.type === 'negative' ? 'Dedução/Custo' : 'Resultado';
            
            return `
              <div style="padding: 8px;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #111827;">${point.name}</div>
                <div style="margin-bottom: 4px; color: #6b7280; font-size: 12px;">
                  Valor: <span style="font-weight: 600;">${formatCurrencyWithSign(point.y)}</span>
                </div>
                <div style="margin-bottom: 4px; color: #6b7280; font-size: 12px;">
                  Tipo: <span style="font-weight: 600;">${typeLabel}</span>
                </div>
                <div style="color: #6b7280; font-size: 12px;">
                  % da Receita Bruta: <span style="font-weight: 600;">${percentage}%</span>
                </div>
              </div>
            `;
          }
        },
        plotOptions: {
          column: {
            pointPadding: 0.2,
            borderWidth: 0,
            borderRadius: 4,
            dataLabels: {
              enabled: true,
              formatter: function() {
                const value = this.y || 0;
                return formatCurrencyWithSign(value);
              },
              style: {
                fontSize: '10px',
                fontWeight: '600',
                color: '#374151',
                textOutline: 'none'
              },
              y: -5
            }
          }
        },
        series: [{
          name: 'Estrutura DRE',
          type: 'column',
          data: chartData.map(item => ({
            name: item.name,
            y: item.y,
            color: item.color,
            type: item.type
          })),
          showInLegend: false
        }],
        credits: {
          enabled: false
        },
        responsive: {
          rules: [{
            condition: {
              maxWidth: 500
            },
            chartOptions: {
              xAxis: {
                labels: {
                  rotation: -90,
                  style: {
                    fontSize: '10px'
                  }
                }
              },
              plotOptions: {
                column: {
                  dataLabels: {
                    enabled: false
                  }
                }
              }
            }
          }]
        }
      });
    } catch (error) {
      console.error('Erro ao criar gráfico DRE:', error);
    }

    // Cleanup
    return () => {
      try {
        if (chartInstance.current) {
          chartInstance.current.destroy();
          chartInstance.current = null;
        }
      } catch (error) {
        console.error('Erro ao destruir gráfico:', error);
      }
    };
  }, [dre]);

  // Análise de performance
  const getPerformanceIndicator = (value: number, threshold: number) => {
    if (value >= threshold) return { icon: TrendingUp, color: 'text-green-500', label: 'Bom' };
    return { icon: TrendingDown, color: 'text-red-500', label: 'Atenção' };
  };

  const margemBrutaIndicator = getPerformanceIndicator(dre.margemBruta, 30);
  const margemOperacionalIndicator = getPerformanceIndicator(dre.margemOperacional, 15);
  const margemLiquidaIndicator = getPerformanceIndicator(dre.margemLiquida, 10);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-6 w-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Estrutura do DRE</h3>
            <p className="text-gray-600 text-sm">Cascata de resultados da demonstração</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Lucro Líquido</p>
          <p className={`text-lg font-bold ${dre.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrencyWithSign(dre.lucroLiquido)}
          </p>
        </div>
      </div>
      
      {/* Gráfico de estrutura */}
      <div className="h-96 mb-6">
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
      
      {/* Indicadores de performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-900">Margem Bruta</span>
            <margemBrutaIndicator.icon className={`h-4 w-4 ${margemBrutaIndicator.color}`} />
          </div>
          <p className="text-xl font-bold text-amber-900">{dre.margemBruta.toFixed(1)}%</p>
          <p className={`text-xs ${margemBrutaIndicator.color}`}>{margemBrutaIndicator.label}</p>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Margem Operacional</span>
            <margemOperacionalIndicator.icon className={`h-4 w-4 ${margemOperacionalIndicator.color}`} />
          </div>
          <p className="text-xl font-bold text-blue-900">{dre.margemOperacional.toFixed(1)}%</p>
          <p className={`text-xs ${margemOperacionalIndicator.color}`}>{margemOperacionalIndicator.label}</p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900">Margem Líquida</span>
            <margemLiquidaIndicator.icon className={`h-4 w-4 ${margemLiquidaIndicator.color}`} />
          </div>
          <p className="text-xl font-bold text-green-900">{dre.margemLiquida.toFixed(1)}%</p>
          <p className={`text-xs ${margemLiquidaIndicator.color}`}>{margemLiquidaIndicator.label}</p>
        </div>
      </div>
      
      {/* Análise detalhada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna de valores absolutos */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Valores Absolutos</h4>
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Receita Bruta</span>
              <span className="text-sm font-medium">{formatCurrencyWithSign(dre.receitaBruta)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Receita Líquida</span>
              <span className="text-sm font-medium">{formatCurrencyWithSign(dre.receitaLiquida)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Lucro Bruto</span>
              <span className="text-sm font-medium">{formatCurrencyWithSign(dre.lucroBruto)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Resultado Operacional</span>
              <span className="text-sm font-medium">{formatCurrencyWithSign(dre.resultadoOperacional)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600">Lucro Líquido</span>
              <span className={`text-sm font-medium ${dre.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrencyWithSign(dre.lucroLiquido)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Coluna de análise percentual */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Composição da Receita</h4>
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Deduções</span>
              <span className="text-sm font-medium text-red-600">
                {dre.receitaBruta > 0 ? ((dre.deducoes / dre.receitaBruta) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Custos</span>
              <span className="text-sm font-medium text-yellow-600">
                {dre.receitaLiquida > 0 ? ((dre.custos / dre.receitaLiquida) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Despesas Operacionais</span>
              <span className="text-sm font-medium text-purple-600">
                {dre.receitaLiquida > 0 ? ((dre.despesasOperacionais / dre.receitaLiquida) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Impostos sobre Lucro</span>
              <span className="text-sm font-medium text-gray-600">
                {dre.receitaLiquida > 0 ? ((dre.impostosSobreLucro / dre.receitaLiquida) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600">Retenção Líquida</span>
              <span className={`text-sm font-medium ${dre.margemLiquida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dre.margemLiquida.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};