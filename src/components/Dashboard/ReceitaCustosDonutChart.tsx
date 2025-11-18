import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DREPeriodo } from '../../types';
import { DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';

interface ReceitaCustosDonutChartProps {
  dre: DREPeriodo;
}

export const ReceitaCustosDonutChart: React.FC<ReceitaCustosDonutChartProps> = ({ dre }) => {
  const [viewMode, setViewMode] = useState<'receita' | 'custos'>('receita');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Dados para visualização de receita
  const receitaData = [
    {
      name: 'Receita Líquida',
      value: dre.receitaLiquida,
      color: '#10b981',
      percentage: dre.receitaBruta > 0 ? (dre.receitaLiquida / dre.receitaBruta) * 100 : 0
    },
    {
      name: 'Deduções',
      value: dre.deducoes,
      color: '#ef4444',
      percentage: dre.receitaBruta > 0 ? (dre.deducoes / dre.receitaBruta) * 100 : 0
    }
  ];

  // Dados para visualização de custos
  const custosData = [
    {
      name: 'Custos dos Produtos',
      value: dre.custos,
      color: '#f59e0b',
      percentage: dre.receitaLiquida > 0 ? (dre.custos / dre.receitaLiquida) * 100 : 0
    },
    {
      name: 'Despesas Comerciais',
      value: dre.despesasComerciais,
      color: '#8b5cf6',
      percentage: dre.receitaLiquida > 0 ? (dre.despesasComerciais / dre.receitaLiquida) * 100 : 0
    },
    {
      name: 'Despesas Administrativas',
      value: dre.despesasAdministrativas,
      color: '#06b6d4',
      percentage: dre.receitaLiquida > 0 ? (dre.despesasAdministrativas / dre.receitaLiquida) * 100 : 0
    },
    {
      name: 'Outras Despesas',
      value: dre.outrasDespesas,
      color: '#f97316',
      percentage: dre.receitaLiquida > 0 ? (dre.outrasDespesas / dre.receitaLiquida) * 100 : 0
    }
  ].filter(item => item.value > 0);

  const currentData = viewMode === 'receita' ? receitaData : custosData;
  const centerLabel = viewMode === 'receita' ? 'Receita Bruta' : 'Total Custos/Despesas';
  const centerValue = viewMode === 'receita' ? dre.receitaBruta : 
    dre.custos + dre.despesasComerciais + dre.despesasAdministrativas + dre.outrasDespesas;

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{formatCurrency(data.value)}</span>
            <span className="ml-2">({data.percentage.toFixed(1)}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="11"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const renderCenterLabel = ({ cx, cy }: any) => {
    return (
      <g>
        <text 
          x={cx} 
          y={cy - 10} 
          textAnchor="middle" 
          dominantBaseline="central"
          className="fill-gray-600 text-xs font-medium"
        >
          {centerLabel}
        </text>
        <text 
          x={cx} 
          y={cy + 8} 
          textAnchor="middle" 
          dominantBaseline="central"
          className="fill-gray-900 text-sm font-bold"
        >
          {formatCurrency(centerValue)}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <DollarSign className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {viewMode === 'receita' ? 'Composição da Receita' : 'Distribuição de Custos'}
            </h3>
            <p className="text-gray-600 text-sm">
              {viewMode === 'receita' ? 'Receita bruta vs deduções' : 'Custos e despesas sobre a receita'}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setViewMode(viewMode === 'receita' ? 'custos' : 'receita')}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          {viewMode === 'receita' ? (
            <>
              <ToggleLeft className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-700">Ver Custos</span>
            </>
          ) : (
            <>
              <ToggleRight className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-700">Ver Receita</span>
            </>
          )}
        </button>
      </div>
      
      {currentData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>Não há dados suficientes para exibir</p>
        </div>
      ) : (
        <>
          {/* Gráfico de donut */}
          <div className="h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {currentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Label central customizado */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xs text-gray-600 font-medium">{centerLabel}</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(centerValue)}</p>
              </div>
            </div>
          </div>
          
          {/* Legenda detalhada */}
          <div className="mt-6 space-y-3">
            {currentData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.value)}</p>
                  <p className="text-xs text-gray-600">{item.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Resumo financeiro */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <p className="text-xs text-green-700 font-medium">Receita Líquida</p>
              <p className="text-sm font-bold text-green-900">{formatCurrency(dre.receitaLiquida)}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 font-medium">Total {viewMode === 'receita' ? 'Deduções' : 'Custos/Despesas'}</p>
              <p className="text-sm font-bold text-blue-900">
                {formatCurrency(viewMode === 'receita' ? dre.deducoes : centerValue)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-xs text-purple-700 font-medium">
                {viewMode === 'receita' ? 'Taxa de Retenção' : 'Margem após Custos'}
              </p>
              <p className="text-sm font-bold text-purple-900">
                {viewMode === 'receita' ? 
                  `${dre.receitaBruta > 0 ? ((dre.receitaLiquida / dre.receitaBruta) * 100).toFixed(1) : '0.0'}%` :
                  formatCurrency(dre.receitaLiquida - centerValue)
                }
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};