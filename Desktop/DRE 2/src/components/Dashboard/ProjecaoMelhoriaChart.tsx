import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DREPeriodo } from '../../types';
import { TrendingUp, Target, CheckCircle } from 'lucide-react';

interface ProjecaoMelhoriaChartProps {
  dre: DREPeriodo;
}

export const ProjecaoMelhoriaChart: React.FC<ProjecaoMelhoriaChartProps> = ({ dre }) => {
  // Calcular eficiência operacional
  const eficienciaOperacional = dre.receitaLiquida > 0 
    ? ((dre.receitaLiquida - dre.despesasOperacionais) / dre.receitaLiquida) * 100 
    : 0;

  // Cenários de melhoria baseados em implementação de boas práticas
  const projecoes = [
    {
      name: 'Margem Bruta',
      atual: dre.margemBruta,
      meta: 35,
      projetado: Math.min(dre.margemBruta + 8, 50), // Melhoria de 8pp através de otimização de custos
      implementacao: '6-12 meses'
    },
    {
      name: 'Margem Operacional',
      atual: dre.margemOperacional,
      meta: 15,
      projetado: Math.min(dre.margemOperacional + 5, 25), // Melhoria de 5pp através de eficiência operacional
      implementacao: '3-9 meses'
    },
    {
      name: 'Margem Líquida',
      atual: dre.margemLiquida,
      meta: 10,
      projetado: Math.min(dre.margemLiquida + 4, 20), // Melhoria de 4pp através de otimização fiscal
      implementacao: '6-18 meses'
    },
    {
      name: 'Eficiência Operacional',
      atual: eficienciaOperacional,
      meta: 70,
      projetado: Math.min(eficienciaOperacional + 10, 85), // Melhoria de 10pp através de lean management
      implementacao: '3-12 meses'
    }
  ];

  const data = projecoes.map(item => ({
    ...item,
    melhoria: item.projetado - item.atual,
    atingiuMeta: item.projetado >= item.meta
  }));

  // Funções de formatação (seguindo o padrão do DRE Comparativo)
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calcular impacto financeiro estimado
  const calcularImpactoFinanceiro = () => {
    const melhoriaMargemLiquida = data[2].melhoria; // Margem líquida
    const impactoEstimado = (dre.receitaLiquida * melhoriaMargemLiquida) / 100;
    return impactoEstimado;
  };

  const impactoFinanceiro = calcularImpactoFinanceiro();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Projeção de Melhoria</h3>
            <p className="text-gray-600 text-sm">Cenários realistas de melhoria com implementação de boas práticas</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Impacto Estimado</p>
          <p className="text-lg font-bold text-green-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              notation: 'compact'
            }).format(impactoFinanceiro)}
          </p>
        </div>
      </div>
      
      {/* Gráfico de projeção - Estilo do DRE Comparativo */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              yAxisId="values"
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
            <YAxis 
              yAxisId="metas"
              orientation="right"
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
            <Tooltip 
              formatter={(value: any, name: string) => {
                return [formatPercentage(value), name];
              }}
            />
            <Legend />
            
            {/* Ordem na legenda: Atual, Projetado, Meta */}
            <Bar yAxisId="values" dataKey="atual" fill="#3b82f6" name="Atual" />
            <Bar yAxisId="values" dataKey="projetado" fill="#10b981" name="Projetado" />
            
            <Line 
              yAxisId="metas" 
              type="monotone" 
              dataKey="meta" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Meta"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Cards de detalhamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((item, index) => (
          <div key={index} className="p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                {item.name}
              </span>
              {item.atingiuMeta ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Target className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Atual:</span>
                <span className="font-semibold text-blue-600">{item.atual.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Projetado:</span>
                <span className="font-semibold text-green-600">{item.projetado.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Meta:</span>
                <span className="font-semibold text-red-600">{item.meta}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Melhoria:</span>
                <span className="font-bold text-green-700">+{item.melhoria.toFixed(1)}pp</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-green-200">
              <p className="text-xs text-gray-600">
                Prazo: <span className="font-medium">{item.implementacao}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};