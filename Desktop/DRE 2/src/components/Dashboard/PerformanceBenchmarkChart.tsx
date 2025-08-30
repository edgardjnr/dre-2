import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DREPeriodo } from '../../types';
import { Target, Award, AlertCircle } from 'lucide-react';

interface PerformanceBenchmarkChartProps {
  dre: DREPeriodo;
}

export const PerformanceBenchmarkChart: React.FC<PerformanceBenchmarkChartProps> = ({ dre }) => {
  // Benchmarks de mercado (valores típicos para diferentes setores)
  const benchmarks = {
    margemBruta: { excelente: 50, boa: 35, aceitavel: 20 },
    margemOperacional: { excelente: 25, boa: 15, aceitavel: 5 },
    margemLiquida: { excelente: 20, boa: 10, aceitavel: 3 },
    eficienciaOperacional: { excelente: 80, boa: 70, aceitavel: 60 } // % da receita que sobra após despesas operacionais
  };

  const eficienciaOperacional = ((dre.receitaLiquida - dre.despesasOperacionais) / dre.receitaLiquida) * 100;

  const data = [
    {
      name: 'Margem\nBruta',
      atual: dre.margemBruta,
      benchmark: benchmarks.margemBruta.boa,
      excelente: benchmarks.margemBruta.excelente,
      minimo: benchmarks.margemBruta.aceitavel,
      tipo: 'margem'
    },
    {
      name: 'Margem\nOperacional',
      atual: dre.margemOperacional,
      benchmark: benchmarks.margemOperacional.boa,
      excelente: benchmarks.margemOperacional.excelente,
      minimo: benchmarks.margemOperacional.aceitavel,
      tipo: 'margem'
    },
    {
      name: 'Margem\nLíquida',
      atual: dre.margemLiquida,
      benchmark: benchmarks.margemLiquida.boa,
      excelente: benchmarks.margemLiquida.excelente,
      minimo: benchmarks.margemLiquida.aceitavel,
      tipo: 'margem'
    },
    {
      name: 'Eficiência\nOperacional',
      atual: eficienciaOperacional,
      benchmark: benchmarks.eficienciaOperacional.boa,
      excelente: benchmarks.eficienciaOperacional.excelente,
      minimo: benchmarks.eficienciaOperacional.aceitavel,
      tipo: 'eficiencia'
    }
  ];

  // Função para avaliar performance
  const getPerformanceLevel = (atual: number, benchmarks: any) => {
    if (atual >= benchmarks.excelente) return 'excelente';
    if (atual >= benchmarks.boa) return 'boa';
    if (atual >= benchmarks.aceitavel) return 'aceitavel';
    return 'abaixo';
  };

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'excelente': return '#059669';
      case 'boa': return '#0891b2';
      case 'aceitavel': return '#f59e0b';
      default: return '#dc2626';
    }
  };

  const getPerformanceIcon = (level: string) => {
    switch (level) {
      case 'excelente': return Award;
      case 'boa': return Target;
      case 'aceitavel': return AlertCircle;
      default: return AlertCircle;
    }
  };

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const level = getPerformanceLevel(data.atual, {
        excelente: data.excelente,
        boa: data.benchmark,
        aceitavel: data.minimo
      });
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-3">{label.replace('\\n', ' ')}</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Atual:</span>
              <span className="text-sm font-semibold" style={{ color: getPerformanceColor(level) }}>
                {data.atual.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Benchmark:</span>
              <span className="text-sm font-medium text-blue-600">{data.benchmark.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Excelente:</span>
              <span className="text-sm text-green-600">{data.excelente.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Mínimo:</span>
              <span className="text-sm text-yellow-600">{data.minimo.toFixed(1)}%</span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Status: <span className="font-medium" style={{ color: getPerformanceColor(level) }}>
                  {level === 'excelente' ? 'Excelente' :
                   level === 'boa' ? 'Bom' :
                   level === 'aceitavel' ? 'Aceitável' : 'Abaixo do Esperado'}
                </span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calcular pontuação geral
  const calcularPontuacaoGeral = () => {
    let pontuacao = 0;
    let total = 0;
    
    data.forEach(item => {
      const level = getPerformanceLevel(item.atual, {
        excelente: item.excelente,
        boa: item.benchmark,
        aceitavel: item.minimo
      });
      
      switch (level) {
        case 'excelente': pontuacao += 4; break;
        case 'boa': pontuacao += 3; break;
        case 'aceitavel': pontuacao += 2; break;
        default: pontuacao += 1;
      }
      total += 4;
    });
    
    return (pontuacao / total) * 100;
  };

  const pontuacaoGeral = calcularPontuacaoGeral();
  const nivelGeral = pontuacaoGeral >= 80 ? 'excelente' : 
                     pontuacaoGeral >= 65 ? 'boa' : 
                     pontuacaoGeral >= 50 ? 'aceitavel' : 'abaixo';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="h-6 w-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Análise de Performance</h3>
            <p className="text-gray-600 text-sm">Comparação com benchmarks de mercado</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Score Geral</p>
          <p className={`text-2xl font-bold`} style={{ color: getPerformanceColor(nivelGeral) }}>
            {pontuacaoGeral.toFixed(0)}%
          </p>
        </div>
      </div>
      
      {/* Gráfico de performance */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#666"
              fontSize={11}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Linha de referência para benchmark */}
            <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
            
            {/* Barras de valores atuais */}
            <Bar 
              dataKey="atual" 
              fill="#3b82f6" 
              name="Atual"
              radius={[4, 4, 0, 0]}
            />
            
            {/* Barras de benchmark (mais transparentes) */}
            <Bar 
              dataKey="benchmark" 
              fill="#94a3b8" 
              name="Benchmark"
              fillOpacity={0.6}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Cards de análise detalhada */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {data.map((item, index) => {
          const level = getPerformanceLevel(item.atual, {
            excelente: item.excelente,
            boa: item.benchmark,
            aceitavel: item.minimo
          });
          const Icon = getPerformanceIcon(level);
          
          return (
            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {item.name.replace('\\n', ' ')}
                </span>
                <Icon className={`h-4 w-4`} style={{ color: getPerformanceColor(level) }} />
              </div>
              <p className="text-xl font-bold" style={{ color: getPerformanceColor(level) }}>
                {item.atual.toFixed(1)}%
              </p>
              <div className="mt-2 text-xs text-gray-600">
                <p>Meta: {item.benchmark.toFixed(1)}%</p>
                <p className="mt-1" style={{ color: getPerformanceColor(level) }}>
                  {level === 'excelente' ? 'Excelente!' :
                   level === 'boa' ? 'Bom desempenho' :
                   level === 'aceitavel' ? 'Dentro do esperado' : 'Precisa melhorar'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Recomendações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Pontos Fortes</h4>
          <div className="space-y-2">
            {data.filter(item => {
              const level = getPerformanceLevel(item.atual, {
                excelente: item.excelente,
                boa: item.benchmark,
                aceitavel: item.minimo
              });
              return level === 'excelente' || level === 'boa';
            }).map((item, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm text-green-700">
                <Award className="h-4 w-4" />
                <span>{item.name.replace('\\n', ' ')} está {item.atual >= item.excelente ? 'excelente' : 'boa'}</span>
              </div>
            ))}
            {data.filter(item => {
              const level = getPerformanceLevel(item.atual, {
                excelente: item.excelente,
                boa: item.benchmark,
                aceitavel: item.minimo
              });
              return level === 'excelente' || level === 'boa';
            }).length === 0 && (
              <p className="text-sm text-gray-500">Nenhum indicador está acima da média</p>
            )}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Oportunidades de Melhoria</h4>
          <div className="space-y-2">
            {data.filter(item => {
              const level = getPerformanceLevel(item.atual, {
                excelente: item.excelente,
                boa: item.benchmark,
                aceitavel: item.minimo
              });
              return level === 'aceitavel' || level === 'abaixo';
            }).map((item, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4" />
                <span>
                  Melhorar {item.name.replace('\\n', ' ')} em {(item.benchmark - item.atual).toFixed(1)}pp
                </span>
              </div>
            ))}
            {data.filter(item => {
              const level = getPerformanceLevel(item.atual, {
                excelente: item.excelente,
                boa: item.benchmark,
                aceitavel: item.minimo
              });
              return level === 'aceitavel' || level === 'abaixo';
            }).length === 0 && (
              <p className="text-sm text-green-600">Todos os indicadores estão acima da média!</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Resumo executivo */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Resumo Executivo</h4>
        <p className="text-sm text-blue-800">
          A empresa apresenta um score geral de <strong>{pontuacaoGeral.toFixed(0)}%</strong> em relação aos benchmarks de mercado.
          {nivelGeral === 'excelente' && ' Performance excepcional em todos os indicadores!'}
          {nivelGeral === 'boa' && ' Performance sólida com oportunidades pontuais de melhoria.'}
          {nivelGeral === 'aceitavel' && ' Performance adequada, mas há espaço significativo para crescimento.'}
          {nivelGeral === 'abaixo' && ' Performance abaixo do esperado, requer atenção urgente.'}
        </p>
        {(nivelGeral === 'aceitavel' || nivelGeral === 'abaixo') && (
          <p className="text-xs text-blue-700 mt-2">
            💡 <strong>Dica:</strong> Consulte o "Guia de Melhoria de Indicadores" abaixo para ações específicas e detalhadas sobre como melhorar cada indicador.
          </p>
        )}
      </div>
    </div>
  );
};