import React, { useEffect, useRef } from 'react';
import * as Highcharts from 'highcharts';
import { supabase } from '../../lib/supabaseClient';
import { mapContaCategoriaToDreCategoria } from '../../utils/dreCategoria';

interface RevenueData {
  month: string;
  receita_bruta: number;
  deducoes: number;
  lucro_liquido: number;
}

const RevenueEvolutionChart: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Corrigir a query para usar os campos corretos da tabela
        const { data: lancamentos, error } = await supabase
          .from('lancamentos')
          .select(`
            id,
            user_id,
            created_at,
            empresaId:empresa_id,
            contaId:conta_id,
            data,
            descricao,
            valor,
            tipo
          `)
          .order('data', { ascending: true });

        if (error) {
          console.error('Erro na query Supabase:', error);
          throw error;
        }

        // Buscar também as contas para identificar categorias
        const { data: contas, error: contasError } = await supabase
          .from('contas_contabeis')
          .select(`
            id,
            categoria,
            nome
          `);

        if (contasError) {
          console.error('Erro ao buscar contas:', contasError);
          throw contasError;
        }

        // Processar dados por mês
        const monthlyData: { [key: string]: RevenueData } = {};
        
        lancamentos?.forEach(lancamento => {
          const date = new Date(lancamento.data + 'T00:00:00'); // Adicionar horário para evitar problemas de timezone
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: monthName,
              receita_bruta: 0,
              deducoes: 0,
              lucro_liquido: 0
            };
          }
          
          const valor = parseFloat(lancamento.valor) || 0;
          const conta = contas?.find(c => c.id === lancamento.contaId);
          
          // Classificar por categoria da conta
          if (conta) {
            const categoriaDre = mapContaCategoriaToDreCategoria(conta.categoria);
            if (categoriaDre === 'Receita Bruta') {
              monthlyData[monthKey].receita_bruta += valor;
            } else if (categoriaDre === 'Deduções e Impostos') {
              monthlyData[monthKey].deducoes += Math.abs(valor);
            }
          }
          
          // Alternativamente, classificar por tipo de lançamento se não houver categoria
          if (!conta) {
            if (lancamento.tipo === 'Crédito') {
              monthlyData[monthKey].receita_bruta += valor;
            } else if (lancamento.tipo === 'Débito') {
              // Assumir que débitos podem ser deduções
              if (lancamento.descricao?.toLowerCase().includes('imposto') ||
                  lancamento.descricao?.toLowerCase().includes('taxa') ||
                  lancamento.descricao?.toLowerCase().includes('dedução')) {
                monthlyData[monthKey].deducoes += Math.abs(valor);
              }
            }
          }
        });

        // Calcular lucro líquido
        Object.values(monthlyData).forEach(data => {
          data.lucro_liquido = data.receita_bruta - data.deducoes;
        });

        const sortedData = Object.values(monthlyData).sort((a, b) => {
          const dateA = new Date(a.month + ' 01');
          const dateB = new Date(b.month + ' 01');
          return dateA.getTime() - dateB.getTime();
        });

        const categories = sortedData.map(item => item.month);
        const receitaBrutaData = sortedData.map(item => item.receita_bruta);
        const deducoesData = sortedData.map(item => item.deducoes);
        const lucroLiquidoData = sortedData.map(item => item.lucro_liquido);

        const colors = Highcharts.getOptions().colors;

        if (chartRef.current) {
          chartInstance.current = Highcharts.chart(chartRef.current, {
            chart: {
              type: 'column',
              backgroundColor: 'transparent'
            },

            legend: {
              symbolWidth: 40
            },

            title: {
              text: 'Evolução Financeira - Receita, Deduções e Lucro Líquido',
              align: 'left',
              style: {
                fontSize: '16px',
                fontWeight: 'bold'
              }
            },

            subtitle: {
              text: 'Análise mensal do desempenho financeiro da empresa',
              align: 'left'
            },

            yAxis: {
              min: 0,
              title: {
                text: 'Valor (R$)'
              },
              accessibility: {
                description: 'Valores em Reais'
              },
              labels: {
                formatter: function() {
                  return 'R$ ' + Highcharts.numberFormat(this.value, 0, ',', '.');
                }
              }
            },

            xAxis: {
              categories: categories,
              crosshair: true,
              accessibility: {
                description: 'Período mensal de análise'
              }
            },

            tooltip: {
              valueSuffix: '',
              shared: true,
              formatter: function() {
                let tooltip = `<b>${this.x}</b><br/>`;
                this.points?.forEach(point => {
                  tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>R$ ${Highcharts.numberFormat(point.y || 0, 2, ',', '.')}</b><br/>`;
                });
                return tooltip;
              }
            },

            plotOptions: {
              column: {
                pointPadding: 0.2,
                borderWidth: 0
              }
            },

            series: [
              {
                name: 'Receita Bruta',
                data: receitaBrutaData,
                color: colors?.[2] || '#10B981', // Verde
                accessibility: {
                  description: 'Receita bruta mensal da empresa'
                }
              },
              {
                name: 'Deduções',
                data: deducoesData,
                color: '#970700', // Vermelho - cor fixa
                accessibility: {
                  description: 'Total de deduções mensais (impostos, taxas, etc.)'
                }
              },
              {
                name: 'Lucro Líquido',
                data: lucroLiquidoData,
                color: colors?.[0] || '#3B82F6', // Azul
                accessibility: {
                  description: 'Lucro líquido mensal após deduções'
                }
              }
            ],

            responsive: {
              rules: [{
                condition: {
                  maxWidth: 550
                },
                chartOptions: {
                  chart: {
                    spacingLeft: 3,
                    spacingRight: 3
                  },
                  legend: {
                    itemWidth: 120
                  },
                  xAxis: {
                    title: {
                      text: ''
                    }
                  },
                  yAxis: {
                    title: {
                      text: 'R$'
                    }
                  }
                }
              }]
            },

            credits: {
              enabled: false
            }
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do gráfico:', error);
      }
    };

    fetchData();

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div 
        ref={chartRef} 
        className="w-full" 
        style={{ height: '400px' }}
        role="img"
        aria-label="Gráfico de evolução da receita bruta, deduções e lucro líquido"
      />
    </div>
  );
};

export default RevenueEvolutionChart;
