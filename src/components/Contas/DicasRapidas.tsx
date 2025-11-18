import React from 'react';
import { Lightbulb, BookOpen, Calculator, DollarSign } from 'lucide-react';
import { ContaCategoria } from '../../types';

interface DicasRapidasProps {
  categoria: ContaCategoria;
}

const dicasRapidas: Record<ContaCategoria, {
  icon: React.ComponentType<any>;
  color: string;
  dicas: string[];
  codigoExemplo: string;
}> = {
  'Receita Bruta': {
    icon: DollarSign,
    color: 'text-green-600',
    dicas: [
      'Registre sempre pelo valor bruto (com impostos)',
      'Use crédito para aumentar receita',
      'Código sugerido: 3.1.x.xx'
    ],
    codigoExemplo: '3.1.1.01'
  },
  'Deduções e Impostos': {
    icon: Calculator,
    color: 'text-red-600',
    dicas: [
      'Inclua todos os impostos sobre vendas',
      'Use débito para registrar deduções',
      'Código sugerido: 3.2.x.xx'
    ],
    codigoExemplo: '3.2.1.01'
  },
  'Custo dos Produtos Vendidos': {
    icon: Calculator,
    color: 'text-orange-600',
    dicas: [
      'Apenas custos diretos de produção',
      'Use débito para aumentar custos',
      'Código sugerido: 4.1.x.xx'
    ],
    codigoExemplo: '4.1.1.01'
  },
  'Despesas Comerciais': {
    icon: BookOpen,
    color: 'text-purple-600',
    dicas: [
      'Gastos com vendas e marketing',
      'Use débito para registrar despesas',
      'Código sugerido: 4.2.1.xx'
    ],
    codigoExemplo: '4.2.1.01'
  },
  'Despesas Administrativas': {
    icon: BookOpen,
    color: 'text-blue-600',
    dicas: [
      'Gastos gerais de administração',
      'Use débito para registrar despesas',
      'Código sugerido: 4.2.2.xx'
    ],
    codigoExemplo: '4.2.2.01'
  },
  'Outras Despesas Operacionais': {
    icon: BookOpen,
    color: 'text-gray-600',
    dicas: [
      'Despesas operacionais diversas',
      'Use débito para registrar despesas',
      'Código sugerido: 4.2.3.xx'
    ],
    codigoExemplo: '4.2.3.01'
  },
  'Receitas Financeiras': {
    icon: DollarSign,
    color: 'text-emerald-600',
    dicas: [
      'Juros e rendimentos financeiros',
      'Use crédito para aumentar receita',
      'Código sugerido: 3.3.x.xx'
    ],
    codigoExemplo: '3.3.1.01'
  },
  'Despesas Financeiras': {
    icon: Calculator,
    color: 'text-pink-600',
    dicas: [
      'Juros pagos e custos financeiros',
      'Use débito para registrar despesas',
      'Código sugerido: 4.3.x.xx'
    ],
    codigoExemplo: '4.3.1.01'
  },
  'Impostos sobre Lucro': {
    icon: Calculator,
    color: 'text-yellow-600',
    dicas: [
      'IR e CSLL sobre o lucro',
      'Use débito para registrar impostos',
      'Código sugerido: 4.4.x.xx'
    ],
    codigoExemplo: '4.4.1.01'
  }
};

export const DicasRapidas: React.FC<DicasRapidasProps> = ({ categoria }) => {
  const info = dicasRapidas[categoria];
  const Icon = info.icon;

  return (
    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center space-x-2 mb-2">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">Dicas para: {categoria}</span>
      </div>
      
      <div className="flex items-start space-x-3">
        <Icon className={`h-5 w-5 ${info.color} mt-0.5`} />
        <div className="flex-1">
          <ul className="text-sm text-blue-800 space-y-1">
            {info.dicas.map((dica, index) => (
              <li key={index} className="flex items-start space-x-1">
                <span className="text-blue-600 mt-1 text-xs">•</span>
                <span>{dica}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-xs text-blue-700">Exemplo de código:</span>
            <code className="text-xs bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-mono">
              {info.codigoExemplo}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};