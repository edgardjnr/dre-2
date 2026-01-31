import React, { useEffect, useRef } from 'react';
import * as Highcharts from 'highcharts';
// Remover completamente a importação do módulo de acessibilidade
import { DREPeriodo } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MargensEvolutionChartProps {
  historicoMensal: DREPeriodo[];
}

export const MargensEvolutionChart: React.FC<MargensEvolutionChartProps> = ({ historicoMensal }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<Highcharts.Chart | null>(null);

  console.log('=== DEBUG MARGENS EVOLUTION CHART ===');
  console.log('historicoMensal recebido:', historicoMensal);
  console.log('Quantidade de períodos:', historicoMensal?.length || 0);

  const data = historicoMensal.map((dre, index) => {
    console.log(`Período ${index}:`, {
      dataInicio: dre.dataInicio,
      margemBruta: dre.margemBruta,
      margemOperacional: dre.margemOperacional,
      margemLiquida: dre.margemLiquida
    });
    
    return {
      mes: format(new Date(dre.dataInicio + 'T00:00:00'), 'MMM', { locale: ptBR }),
      mesCompleto: format(new Date(dre.dataInicio + 'T00:00:00'), 'MMMM yyyy', { locale: ptBR }),
      margemBruta: Number(dre.margemBruta.toFixed(2)),
      margemOperacional: Number(dre.margemOperacional.toFixed(2)),
      margemLiquida: Number(dre.margemLiquida.toFixed(2)),
      receita: dre.receitaLiquida,
      index
    };
  });
  
  console.log('Dados processados para o gráfico:', data);
  console.log('=====================================');



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
        className="w-full" 
        style={{ height: '400px' }}
        role="img"
        aria-label="Gráfico de evolução das margens bruta, operacional e líquida"
      />
    </div>
  );
};