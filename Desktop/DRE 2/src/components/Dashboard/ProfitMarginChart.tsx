import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { mes: 'Jan', margemBruta: 35.5, margemOperacional: 18.2, margemLiquida: 13.1 },
  { mes: 'Fev', margemBruta: 38.2, margemOperacional: 21.5, margemLiquida: 15.6 },
  { mes: 'Mar', margemBruta: 36.8, margemOperacional: 19.8, margemLiquida: 14.4 },
  { mes: 'Abr', margemBruta: 40.1, margemOperacional: 23.2, margemLiquida: 17.3 },
  { mes: 'Mai', margemBruta: 42.3, margemOperacional: 25.1, margemLiquida: 17.9 },
  { mes: 'Jun', margemBruta: 44.2, margemOperacional: 26.8, margemLiquida: 19.3 },
  { mes: 'Jul', margemBruta: 41.8, margemOperacional: 24.5, margemLiquida: 18.4 },
  { mes: 'Ago', margemBruta: 43.5, margemOperacional: 27.2, margemLiquida: 20.5 },
  { mes: 'Set', margemBruta: 45.1, margemOperacional: 28.8, margemLiquida: 21.4 },
  { mes: 'Out', margemBruta: 43.9, margemOperacional: 27.5, margemLiquida: 20.6 },
  { mes: 'Nov', margemBruta: 46.2, margemOperacional: 29.1, margemLiquida: 22.4 },
  { mes: 'Dez', margemBruta: 47.8, margemOperacional: 31.2, margemLiquida: 23.9 }
];

export const ProfitMarginChart: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Evolução das Margens (%)</h3>
        <p className="text-gray-600 text-sm">Margem Bruta, Operacional e Líquida</p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="mes" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}%`, 
                name === 'margemBruta' ? 'Margem Bruta' : 
                name === 'margemOperacional' ? 'Margem Operacional' : 'Margem Líquida'
              ]}
              labelStyle={{ color: '#666' }}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="margemBruta" 
              stackId="1"
              stroke="#f59e0b" 
              fill="#fef3c7"
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="margemOperacional" 
              stackId="2"
              stroke="#8b5cf6" 
              fill="#e9d5ff"
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="margemLiquida" 
              stackId="3"
              stroke="#10b981" 
              fill="#d1fae5"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center space-x-6 mt-4 flex-wrap">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Margem Bruta</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Margem Operacional</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Margem Líquida</span>
        </div>
      </div>
    </div>
  );
};
