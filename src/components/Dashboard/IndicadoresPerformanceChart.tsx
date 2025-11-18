import React, { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface CustoCategoria {
  name: string;
  y: number;
  color?: string;
}

interface IndicadoresPerformanceChartProps {
  empresaId: string;
  lancamentos?: any[];
  contasContabeis?: any[];
  startDate?: string;
  endDate?: string;
}

const IndicadoresPerformanceChart: React.FC<IndicadoresPerformanceChartProps> = ({
  empresaId,
  lancamentos,
  contasContabeis,
  startDate,
  endDate
}) => {
  const [dados, setDados] = useState<CustoCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const buscarDados = async () => {
      try {
        setLoading(true);
        setError(null);

        // Se temos dados passados como props, calcular com base neles
        if (lancamentos && contasContabeis && startDate && endDate) {
          calcularIndicadoresReais();
        } else {
          // Dados simulados realistas para demonstração
          const dadosSimulados: CustoCategoria[] = [
            {
              name: 'Mão de obra',
              y: 42.5,
              color: '#FF6B6B'
            },
            {
              name: 'CMV',
              y: 28.3,
              color: '#4ECDC4'
            },
            {
              name: 'Funcionários extras',
              y: 15.7,
              color: '#45B7D1'
            },
            {
              name: 'Bandas',
              y: 8.2,
              color: '#96CEB4'
            },
            {
              name: 'CAC',
              y: 5.3,
              color: '#FFEAA7'
            }
          ];

          setDados(dadosSimulados);
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError('Erro ao carregar dados dos indicadores');
      } finally {
        setLoading(false);
      }
    };

    buscarDados();
  }, [empresaId, lancamentos, contasContabeis, startDate, endDate]);

  const calcularIndicadoresReais = () => {
    try {
      // Filtrar lançamentos por período
      const lancamentosFiltrados = lancamentos?.filter(lancamento => {
        const dataLancamento = new Date(lancamento.data);
        const inicio = new Date(startDate!);
        const fim = new Date(endDate!);
        return dataLancamento >= inicio && dataLancamento <= fim;
      }) || [];

      // Calcular custos por categoria baseado nos lançamentos reais
      const custosPorCategoria = new Map<string, number>();
      let totalCustos = 0;

      lancamentosFiltrados.forEach(lancamento => {
        if (lancamento.tipo === 'Débito') {
          const conta = contasContabeis?.find(c => c.id === lancamento.contaId);
          if (conta) {
            const categoria = conta.categoria || 'Outros';
            custosPorCategoria.set(categoria, (custosPorCategoria.get(categoria) || 0) + lancamento.valor);
            totalCustos += lancamento.valor;
          }
        }
      });

      // Converter para formato do gráfico
      const cores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
      const dadosCalculados: CustoCategoria[] = Array.from(custosPorCategoria.entries())
        .map(([categoria, valor], index) => ({
          name: categoria,
          y: totalCustos > 0 ? (valor / totalCustos) * 100 : 0,
          color: cores[index % cores.length]
        }))
        .sort((a, b) => b.y - a.y)
        .slice(0, 8); // Limitar a 8 categorias

      setDados(dadosCalculados);
    } catch (err) {
      console.error('Erro ao calcular indicadores reais:', err);
      setError('Erro ao calcular indicadores');
    }
  };



  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center text-red-600">
          <p className="font-semibold">Erro ao carregar indicadores</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const total = dados.reduce((sum, item) => sum + item.y, 0);

  const chartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      height: 400,
      backgroundColor: 'transparent',
      custom: {},
      events: {
        render() {
          const chart = this as any;
          const series = chart.series[0];
          let customLabel = chart.options.chart.custom.label;

          if (!customLabel) {
            customLabel = chart.options.chart.custom.label =
              chart.renderer.label(
                'Total<br/>' +
                '<strong>' + total.toFixed(1) + '%</strong>'
              )
                .css({
                  color: 'var(--highcharts-neutral-color-100, #000)',
                  textAnchor: 'middle'
                })
                .add();
          }

          const x = series.center[0] + chart.plotLeft;
          const y = series.center[1] + chart.plotTop - (customLabel.attr('height') / 2);

          customLabel.attr({ x, y });
          customLabel.css({
            fontSize: `${series.center[2] / 12}px`
          });
        }
      }
    },
    title: {
      text: ''
    },
    accessibility: {
      point: {
        valueSuffix: '%'
      }
    },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    legend: {
      enabled: false
    },
    plotOptions: {
      series: {
        allowPointSelect: true,
        cursor: 'pointer',
        borderRadius: 8,
        dataLabels: [{
          enabled: true,
          distance: 20,
          format: '{point.name}'
        }, {
          enabled: true,
          distance: -15,
          format: '{point.percentage:.1f}%',
          style: {
            fontSize: '0.9em'
          }
        }],
        showInLegend: true
      }
    },
    series: [{
      name: 'Custos',
      type: 'pie',
      colorByPoint: true,
      innerSize: '75%',
      data: dados
    }]
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Indicadores de Performance</h3>
        <p className="text-sm text-gray-600">Distribuição atual dos custos por categoria</p>
      </div>
      
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
      />
      
      {/* Legenda personalizada */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {dados.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500">
                  {item.y.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IndicadoresPerformanceChart;