import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { categoria: 'Receita Bruta', atual: 950000, anterior: 850000 },
  { categoria: 'Receita Líquida', atual: 847520, anterior: 756200 },
  { categoria: 'Lucro Bruto', atual: 398500, anterior: 345800 },
  { categoria: 'Resultado Operacional', atual: 152340, anterior: 128500 },
  { categoria: 'Lucro Líquido', atual: 126840, anterior: 96200 }
];

export const ComparisonChart: React.FC = () => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Comparativo de Períodos</h3>
        <p className="text-gray-600 text-xs sm:text-sm">2025 vs 2024 - Principais indicadores</p>
      </div>
      
      <div className="overflow-x-auto">
        <div className="h-64 sm:h-80 min-w-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="horizontal" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number"
                stroke="#666"
                fontSize={10}
                tickFormatter={formatCurrency}
              />
              <YAxis 
                type="category"
                dataKey="categoria"
                stroke="#666"
                fontSize={10}
                width={100}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'atual' ? '2025' : '2024'
                ]}
                labelStyle={{ color: '#666', fontSize: '12px' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar 
                dataKey="anterior" 
                fill="#94a3b8" 
                name="2024"
                radius={[0, 4, 4, 0]}
              />
              <Bar 
                dataKey="atual" 
                fill="#3b82f6" 
                name="2025"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
