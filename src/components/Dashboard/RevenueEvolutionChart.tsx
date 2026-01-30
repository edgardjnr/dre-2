import React, { useEffect, useRef } from 'react';
import * as Highcharts from 'highcharts';
import { DREPeriodo } from '../../types';

interface RevenueEvolutionChartProps {
  historicoMensal: DREPeriodo[];
}

const RevenueEvolutionChart: React.FC<RevenueEvolutionChartProps> = ({ historicoMensal }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    try {
      const monthlyData = historicoMensal.map(dre => ({
        monthLabel: new Date(dre.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        receita_bruta: dre.receitaBruta,
        deducoes: dre.deducoes,
        lucro_liquido: dre.lucroLiquido
      }));

      const categories = monthlyData.map(item => item.monthLabel);
      const receitaBrutaData = monthlyData.map(item => item.receita_bruta);
      const deducoesData = monthlyData.map(item => item.deducoes);
      const lucroLiquidoData = monthlyData.map(item => item.lucro_liquido);

      const colors = Highcharts.getOptions().colors;

      if (chartInstance.current) {
        try { chartInstance.current.destroy(); } catch {}
        chartInstance.current = null;
      }

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
          title: { text: 'Valor (R$)' },
          accessibility: { description: 'Valores em Reais' },
          labels: {
            formatter: function() { return 'R$ ' + Highcharts.numberFormat(this.value || 0, 0, ',', '.'); }
          }
        },
        xAxis: {
          categories,
          crosshair: true,
          accessibility: { description: 'Período mensal de análise' }
        },
        tooltip: {
          valueSuffix: '',
          shared: true,
          formatter: function() {
            let tooltip = `<b>${this.x}</b><br/>`;
            // @ts-ignore
            this.points?.forEach((point: any) => {
              tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>R$ ${Highcharts.numberFormat(point.y || 0, 2, ',', '.')}</b><br/>`;
            });
            return tooltip;
          }
        },
        plotOptions: {
          column: { pointPadding: 0.2, borderWidth: 0 }
        },
        series: [
          {
            name: 'Receita Bruta',
            data: receitaBrutaData,
            color: colors?.[2] || '#10B981',
            accessibility: { description: 'Receita bruta mensal da empresa' }
          },
          {
            name: 'Deduções',
            data: deducoesData,
            color: '#970700',
            accessibility: { description: 'Total de deduções mensais (impostos, taxas, etc.)' }
          },
          {
            name: 'Lucro Líquido',
            data: lucroLiquidoData,
            color: colors?.[0] || '#3B82F6',
            accessibility: { description: 'Lucro líquido mensal após deduções' }
          }
        ],
        responsive: {
          rules: [{
            condition: { maxWidth: 550 },
            chartOptions: {
              chart: { spacingLeft: 3, spacingRight: 3 },
              legend: { itemWidth: 120 },
              xAxis: { title: { text: '' } },
              yAxis: { title: { text: 'R$' } }
            }
          }]
        },
        credits: { enabled: false }
      });
    } catch (error) {
      console.error('Erro ao montar gráfico de evolução de receita:', error);
    }

    return () => {
      if (chartInstance.current) {
        try { chartInstance.current.destroy(); } catch {}
        chartInstance.current = null;
      }
    };
  }, [historicoMensal]);

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
