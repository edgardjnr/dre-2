import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Percent, Target, BarChart3 } from 'lucide-react';
import { DREPeriodo } from '../../types';
import { DREService } from '../../services/dreService';

interface DashboardCardsProps {
  dreAtual: DREPeriodo | null;
  dreAnterior: DREPeriodo | null;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatPercent = (value: number) => `${value.toFixed(2)}%`;

export const DashboardCards: React.FC<DashboardCardsProps> = ({ dreAtual, dreAnterior }) => {
  if (!dreAtual) return null;

  const variacao = dreAnterior ? DREService.compararPeriodos(dreAnterior, dreAtual) : null;

  const cards = [
    {
      title: 'Receita Líquida',
      value: formatCurrency(dreAtual.receitaLiquida),
      change: variacao ? `${variacao.variacaoReceita.toFixed(1)}%` : 'N/A',
      trend: variacao && variacao.variacaoReceita >= 0 ? 'up' : 'down',
      icon: DollarSign,
      color: 'blue'
    },
    {
      title: 'Lucro Líquido',
      value: formatCurrency(dreAtual.lucroLiquido),
      change: variacao ? `${variacao.variacaoLucroLiquido.toFixed(1)}%` : 'N/A',
      trend: variacao && variacao.variacaoLucroLiquido >= 0 ? 'up' : 'down',
      icon: Target,
      color: 'green'
    },
    {
      title: 'Margem Líquida',
      value: formatPercent(dreAtual.margemLiquida),
      change: variacao ? `${variacao.variacaoMargemLiquida.toFixed(1)} p.p.` : 'N/A',
      trend: variacao && variacao.variacaoMargemLiquida >= 0 ? 'up' : 'down',
      icon: Percent,
      color: 'purple'
    },
    {
      title: 'Resultado Operacional',
      value: formatCurrency(dreAtual.resultadoOperacional),
      change: '',
      trend: 'up',
      icon: BarChart3,
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: 'bg-blue-500 text-blue-600 bg-blue-50',
      green: 'bg-green-500 text-green-600 bg-green-50',
      purple: 'bg-purple-500 text-purple-600 bg-purple-50',
      orange: 'bg-orange-500 text-orange-600 bg-orange-50'
    };
    return colors[color].split(' ');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const colorClasses = getColorClasses(card.color);
        const TrendIcon = card.trend === 'up' ? TrendingUp : TrendingDown;
        
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${colorClasses[2]} flex items-center justify-center`}><Icon className={`h-6 w-6 ${colorClasses[1]}`} /></div>
              {card.change && card.change !== 'N/A' && (
                <div className={`flex items-center space-x-1 ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{card.change}</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-gray-600 text-sm font-medium">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
