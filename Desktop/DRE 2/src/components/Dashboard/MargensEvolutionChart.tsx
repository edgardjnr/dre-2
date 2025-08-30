import React, { useEffect, useRef } from 'react';
import * as Highcharts from 'highcharts';
// Remover completamente a importação do módulo de acessibilidade
import { DREPeriodo } from '../../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MargensEvolutionChartProps {
  historicoMensal: DREPeriodo[];
}

export const MargensEvolutionChart: React.FC<MargensEvolutionChartProps> = ({ historicoMensal }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<Highcharts.Chart | null>(null);

  const data = historicoMensal.map((dre, index) => ({
    mes: format(new Date(dre.dataInicio + 'T00:00:00'), 'MMM', { locale: ptBR }),
    mesCompleto: format(new Date(dre.dataInicio + 'T00:00:00'), 'MMMM yyyy', { locale: ptBR }),
    margemBruta: Number(dre.margemBruta.toFixed(2)),
    margemOperacional: Number(dre.margemOperacional.toFixed(2)),
    margemLiquida: Number(dre.margemLiquida.toFixed(2)),
    receita: dre.receitaLiquida,
    index
  }));

  // Calcular tendências
  const calcularTendencia = (valores: number[]) => {
    if (valores.length < 2) return 'neutro';
    const ultimosMeses = valores.slice(-3);
    const primeiros = ultimosMeses.slice(0, Math.floor(ultimosMeses.length / 2));
    const ultimos = ultimosMeses.slice(Math.floor(ultimosMeses.length / 2));
    
    const mediaPrimeiros = primeiros.reduce((a, b) => a + b, 0) / primeiros.length;
    const mediaUltimos = ultimos.reduce((a, b) => a + b, 0) / ultimos.length;
    
    const diferenca = mediaUltimos - mediaPrimeiros;
    if (diferenca > 1) return 'alta';
    if (diferenca < -1) return 'baixa';
    return 'estavel';
  };

  const tendenciaMargemBruta = calcularTendencia(data.map(d => d.margemBruta));
  const tendenciaMargemOperacional = calcularTendencia(data.map(d => d.margemOperacional));
  const tendenciaMargemLiquida = calcularTendencia(data.map(d => d.margemLiquida));

  const getTrendIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'alta': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'baixa': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (tendencia: string) => {
    switch (tendencia) {
      case 'alta': return 'text-green-600';
      case 'baixa': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    try {
      // Preparar dados para o Highcharts
      const categories = data.map(item => item.mes);
      const margemBrutaData = data.map(item => item.margemBruta);
      const margemOperacionalData = data.map(item => item.margemOperacional);
      const margemLiquidaData = data.map(item => item.margemLiquida);

      // Destruir gráfico anterior se existir
      if (chartInstance.current) {
        try {
          chartInstance.current.destroy();
        } catch (error) {
          console.warn('Erro ao destruir gráfico anterior:', error);
        }
        chartInstance.current = null;
      }

      // Criar novo gráfico
      chartInstance.current = Highcharts.chart(chartRef.current, {
        accessibility: {
          enabled: false  // Desabilitar acessibilidade para evitar o aviso
        },
        chart: {
          type: 'line',
          backgroundColor: 'transparent'
        },
        title: {
          text: 'Evolução das Margens (%)',
          align: 'left',
          style: {
            fontSize: '18px',
            fontWeight: 'bold'
          }
        },
        subtitle: {
          text: 'Análise de rentabilidade ao longo do tempo',
          align: 'left'
        },
        xAxis: {
          categories: categories,
          title: {
            text: 'Período'
          },
          accessibility: {
            description: 'Período mensal de análise'
          }
        },
        yAxis: {
          title: {
            text: 'Margem (%)'
          },
          labels: {
            formatter: function() {
              // Verificação de segurança para evitar erro
              return (this.value || 0) + '%';
            }
          },
          accessibility: {
            description: 'Valores das margens em percentual'
          }
        },
        plotOptions: {
          line: {
            dataLabels: {
              enabled: true,
              formatter: function() {
                // Verificação de segurança
                const value = this.y !== undefined ? this.y : 0;
                return value.toFixed(1) + '%';
              }
            },
            enableMouseTracking: true,
            marker: {
              radius: 4,
              lineWidth: 2,
              lineColor: '#FFFFFF'
            }
          }
        },
        tooltip: {
          shared: true,
          formatter: function() {
            // Verificação de segurança para evitar erros
            if (!this.x) return '';
            
            let tooltip = `<b>${this.x}</b><br/>`;
            if (this.points && Array.isArray(this.points)) {
              this.points.forEach(point => {
                const value = point.y !== undefined ? point.y : 0;
                const color = point.color || '#000';
                const seriesName = point.series.name || 'Série';
                tooltip += `<span style="color:${color}">●</span> ${seriesName}: <b>${value.toFixed(1)}%</b><br/>`;
              });
            }
            return tooltip;
          }
        },
        series: [{
          name: 'Margem Bruta',
          data: margemBrutaData,
          color: '#f59e0b', // Amarelo/Laranja
          lineWidth: 3,
          accessibility: {
            description: 'Evolução da margem bruta mensal'
          }
        }, {
          name: 'Margem Operacional', 
          data: margemOperacionalData,
          color: '#8b5cf6', // Roxo
          lineWidth: 3,
          accessibility: {
            description: 'Evolução da margem operacional mensal'
          }
        }, {
          name: 'Margem Líquida',
          data: margemLiquidaData,
          color: '#10b981', // Verde
          lineWidth: 3,
          accessibility: {
            description: 'Evolução da margem líquida mensal'
          }
        }],
        responsive: {
          rules: [{
            condition: {
              maxWidth: 550
            },
            chartOptions: {
              plotOptions: {
                line: {
                  dataLabels: {
                    enabled: false
                  }
                }
              },
              legend: {
                itemWidth: 120
              }
            }
          }]
        },
        credits: {
          enabled: false
        }
      });
    } catch (error) {
      console.error('Erro ao criar gráfico de margens:', error);
    }

    return () => {
      if (chartInstance.current) {
        try {
          chartInstance.current.destroy();
        } catch (error) {
          console.warn('Erro ao destruir gráfico no cleanup:', error);
        }
        chartInstance.current = null;
      }
    };
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Gráfico */}
      <div 
        ref={chartRef} 
        className="w-full mb-6" 
        style={{ height: '400px' }}
        role="img"
        aria-label="Gráfico de evolução das margens bruta, operacional e líquida"
      />
      
      {/* Indicadores de tendência */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-sm font-medium text-amber-900">Margem Bruta</span>
            </div>
            {getTrendIcon(tendenciaMargemBruta)}
          </div>
          <p className="text-lg font-bold text-amber-900">
            {data.length > 0 ? data[data.length - 1].margemBruta.toFixed(1) : '0.0'}%
          </p>
          <p className={`text-xs ${getTrendColor(tendenciaMargemBruta)}`}>
            {tendenciaMargemBruta === 'alta' ? 'Em alta' : 
             tendenciaMargemBruta === 'baixa' ? 'Em baixa' : 'Estável'}
          </p>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-purple-900">Margem Operacional</span>
            </div>
            {getTrendIcon(tendenciaMargemOperacional)}
          </div>
          <p className="text-lg font-bold text-purple-900">
            {data.length > 0 ? data[data.length - 1].margemOperacional.toFixed(1) : '0.0'}%
          </p>
          <p className={`text-xs ${getTrendColor(tendenciaMargemOperacional)}`}>
            {tendenciaMargemOperacional === 'alta' ? 'Em alta' : 
             tendenciaMargemOperacional === 'baixa' ? 'Em baixa' : 'Estável'}
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-900">Margem Líquida</span>
            </div>
            {getTrendIcon(tendenciaMargemLiquida)}
          </div>
          <p className="text-lg font-bold text-green-900">
            {data.length > 0 ? data[data.length - 1].margemLiquida.toFixed(1) : '0.0'}%
          </p>
          <p className={`text-xs ${getTrendColor(tendenciaMargemLiquida)}`}>
            {tendenciaMargemLiquida === 'alta' ? 'Em alta' : 
             tendenciaMargemLiquida === 'baixa' ? 'Em baixa' : 'Estável'}
          </p>
        </div>
      </div>
    </div>
  );
};