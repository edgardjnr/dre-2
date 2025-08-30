import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DREPeriodo } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RevenueChartProps {
  historicoMensal: DREPeriodo[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ historicoMensal }) => {
  const data = historicoMensal.map(dre => ({
    mes: format(new Date(dre.dataInicio + 'T00:00:00'), 'MMM', { locale: ptBR }),
    receita: dre.receitaLiquida,
    lucro: dre.lucroLiquido,
  }));

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução da Receita e Lucro</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} tickFormatter={formatCurrency} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Line type="monotone" dataKey="receita" name="Receita Líquida" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="lucro" name="Lucro Líquido" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
