import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, DollarSign, TrendingDown, TrendingUp, Calculator, Banknote, Receipt, CreditCard } from 'lucide-react';
import { ContaCategoria } from '../../types';

interface CategoriaInfo {
  nome: ContaCategoria;
  descricao: string;
  finalidade: string;
  icon: React.ComponentType<any>;
  color: string;
  natureza: 'Receita' | 'Dedução' | 'Custo' | 'Despesa' | 'Resultado';
  exemplos: string[];
  codigosSugeridos: string[];
  dicas: string[];
  impactoDRE: string;
  lancamentoTipo: 'Crédito' | 'Débito';
}

const categoriasInfo: CategoriaInfo[] = [
  {
    nome: 'Receita Bruta',
    descricao: 'Representa o total de vendas e serviços prestados pela empresa antes de qualquer dedução',
    finalidade: 'Registrar todas as receitas provenientes da atividade principal da empresa',
    icon: DollarSign,
    color: 'bg-green-100 text-green-800 border-green-200',
    natureza: 'Receita',
    exemplos: [
      'Vendas de produtos',
      'Prestação de serviços',
      'Receitas de locação',
      'Royalties recebidos',
      'Comissões recebidas'
    ],
    codigosSugeridos: ['3.1.1.01', '3.1.1.02', '3.1.2.01', '3.1.3.01'],
    dicas: [
      'Sempre registre pelo valor bruto, sem descontos',
      'Inclua impostos incidentes sobre vendas',
      'Separe por tipo de produto/serviço para análise detalhada',
      'Registre no momento da competência, não do recebimento'
    ],
    impactoDRE: 'Ponto de partida do DRE. Quanto maior, melhor para a margem bruta.',
    lancamentoTipo: 'Crédito'
  },
  {
    nome: 'Deduções e Impostos',
    descricao: 'Impostos, contribuições e deduções incidentes sobre as vendas e serviços',
    finalidade: 'Registrar todos os impostos e deduções obrigatórias sobre a receita bruta',
    icon: Receipt,
    color: 'bg-red-100 text-red-800 border-red-200',
    natureza: 'Dedução',
    exemplos: [
      'ICMS sobre vendas',
      'PIS sobre faturamento',
      'COFINS',
      'ISS (para serviços)',
      'Devoluções de vendas',
      'Descontos incondicionais'
    ],
    codigosSugeridos: ['3.2.1.01', '3.2.1.02', '3.2.1.03', '3.2.2.01'],
    dicas: [
      'Registre todos os impostos sobre vendas',
      'Inclua devoluções e cancelamentos',
      'Considere descontos dados aos clientes',
      'Mantenha alíquotas atualizadas conforme legislação'
    ],
    impactoDRE: 'Reduz a receita bruta para chegar à receita líquida. Quanto menor, melhor.',
    lancamentoTipo: 'Débito'
  },
  {
    nome: 'Custo dos Produtos Vendidos',
    descricao: 'Custos diretamente relacionados à produção ou aquisição dos produtos/serviços vendidos',
    finalidade: 'Registrar custos diretos de produção ou aquisição dos itens vendidos',
    icon: Calculator,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    natureza: 'Custo',
    exemplos: [
      'Custo das mercadorias vendidas',
      'Matéria-prima consumida',
      'Mão de obra direta',
      'Custos de produção',
      'Energia elétrica da produção',
      'Depreciação de máquinas produtivas'
    ],
    codigosSugeridos: ['4.1.1.01', '4.1.1.02', '4.1.2.01', '4.1.3.01'],
    dicas: [
      'Use método PEPS, UEPS ou Média Ponderada',
      'Inclua apenas custos diretos de produção',
      'Mantenha controle rigoroso de estoque',
      'Separe custos fixos de variáveis para análise'
    ],
    impactoDRE: 'Reduz a receita líquida. Controle rígido é essencial para margem bruta saudável.',
    lancamentoTipo: 'Débito'
  },
  {
    nome: 'Despesas Comerciais',
    descricao: 'Gastos relacionados às atividades de venda e marketing da empresa',
    finalidade: 'Registrar despesas com vendas, marketing e atividades comerciais',
    icon: TrendingUp,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    natureza: 'Despesa',
    exemplos: [
      'Salários da equipe de vendas',
      'Comissões sobre vendas',
      'Marketing e publicidade',
      'Participação em feiras',
      'Material promocional',
      'Viagens comerciais'
    ],
    codigosSugeridos: ['4.2.1.01', '4.2.1.02', '4.2.2.01', '4.2.3.01'],
    dicas: [
      'Monitore ROI das campanhas de marketing',
      'Controle comissões e bonificações',
      'Analise custo de aquisição de clientes',
      'Separe despesas por canal de vendas'
    ],
    impactoDRE: 'Reduz o resultado operacional. Deve gerar retorno em vendas.',
    lancamentoTipo: 'Débito'
  },
  {
    nome: 'Despesas Administrativas',
    descricao: 'Gastos com a administração geral da empresa, não relacionados diretamente às vendas',
    finalidade: 'Registrar despesas gerais de administração e suporte ao negócio',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    natureza: 'Despesa',
    exemplos: [
      'Salários administrativos',
      'Aluguel do escritório',
      'Telefone e internet',
      'Material de escritório',
      'Seguros',
      'Serviços contábeis',
      'Sistemas e software'
    ],
    codigosSugeridos: ['4.2.2.01', '4.2.2.02', '4.2.2.03', '4.2.2.04'],
    dicas: [
      'Controle custos fixos mensalmente',
      'Negocie contratos anuais para economizar',
      'Monitore eficiência dos gastos',
      'Mantenha orçamento anual atualizado'
    ],
    impactoDRE: 'Reduz o resultado operacional. Essencial manter controle rigoroso.',
    lancamentoTipo: 'Débito'
  },
  {
    nome: 'Outras Despesas Operacionais',
    descricao: 'Despesas operacionais que não se encaixam nas categorias comerciais ou administrativas',
    finalidade: 'Registrar demais despesas operacionais da atividade empresarial',
    icon: TrendingDown,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    natureza: 'Despesa',
    exemplos: [
      'Perdas com inadimplência',
      'Multas e penalidades',
      'Doações e contribuições',
      'Despesas com pesquisa e desenvolvimento',
      'Manutenção e reparos',
      'Despesas tributárias'
    ],
    codigosSugeridos: ['4.2.3.01', '4.2.3.02', '4.2.3.03', '4.2.4.01'],
    dicas: [
      'Monitore inadimplência constantemente',
      'Evite multas com planejamento',
      'Analise ROI de P&D',
      'Mantenha provisões para contingências'
    ],
    impactoDRE: 'Reduz o resultado operacional. Devem ser minimizadas.',
    lancamentoTipo: 'Débito'
  },
  {
    nome: 'Receitas Financeiras',
    descricao: 'Receitas provenientes de aplicações financeiras e outras operações financeiras',
    finalidade: 'Registrar ganhos com aplicações, juros recebidos e operações financeiras',
    icon: Banknote,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    natureza: 'Receita',
    exemplos: [
      'Juros de aplicações financeiras',
      'Rendimentos de fundos',
      'Descontos obtidos',
      'Juros recebidos de clientes',
      'Ganhos cambiais',
      'Dividendos recebidos'
    ],
    codigosSugeridos: ['3.3.1.01', '3.3.1.02', '3.3.2.01', '3.3.3.01'],
    dicas: [
      'Diversifique aplicações conforme risco',
      'Monitore rentabilidade vs CDI',
      'Considere liquidez necessária',
      'Mantenha controle de vencimentos'
    ],
    impactoDRE: 'Melhora o resultado antes do IR. Complementa a operação.',
    lancamentoTipo: 'Crédito'
  },
  {
    nome: 'Despesas Financeiras',
    descricao: 'Gastos com operações financeiras, empréstimos, financiamentos e juros pagos',
    finalidade: 'Registrar custos financeiros, juros pagos e despesas bancárias',
    icon: CreditCard,
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    natureza: 'Despesa',
    exemplos: [
      'Juros de empréstimos',
      'Juros de financiamentos',
      'Tarifas bancárias',
      'IOF',
      'Perdas cambiais',
      'Descontos concedidos por antecipação'
    ],
    codigosSugeridos: ['4.3.1.01', '4.3.1.02', '4.3.2.01', '4.3.3.01'],
    dicas: [
      'Negocie taxas com bancos',
      'Evite cheque especial',
      'Planeje fluxo de caixa',
      'Considere antecipação de recebíveis'
    ],
    impactoDRE: 'Reduz o resultado antes do IR. Deve ser minimizada.',
    lancamentoTipo: 'Débito'
  },
  {
    nome: 'Impostos sobre Lucro',
    descricao: 'Impostos incidentes sobre o lucro da empresa (IR e CSLL)',
    finalidade: 'Registrar provisões e pagamentos de IR e CSLL sobre o lucro',
    icon: Receipt,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    natureza: 'Despesa',
    exemplos: [
      'Imposto de Renda Pessoa Jurídica',
      'Contribuição Social sobre Lucro Líquido',
      'Adicional de IR (se aplicável)',
      'Provisões para IR/CSLL',
      'Multas sobre IR/CSLL'
    ],
    codigosSugeridos: ['4.4.1.01', '4.4.1.02', '4.4.2.01', '4.4.3.01'],
    dicas: [
      'Faça provisões mensais',
      'Considere planejamento tributário',
      'Monitore mudanças na legislação',
      'Mantenha documentação organizada'
    ],
    impactoDRE: 'Último item antes do lucro líquido. Varia conforme regime tributário.',
    lancamentoTipo: 'Débito'
  }
];

export const CategoriasGuide: React.FC = () => {
  const [expandedCategoria, setExpandedCategoria] = useState<string | null>(null);

  const toggleCategoria = (nome: string) => {
    setExpandedCategoria(expandedCategoria === nome ? null : nome);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <BookOpen className="h-6 w-6 text-blue-500" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Guia das Categorias do Plano de Contas</h3>
          <p className="text-gray-600 text-sm">Entenda o que é e como usar cada categoria contábil do DRE</p>
        </div>
      </div>

      <div className="space-y-3">
        {categoriasInfo.map((categoria, index) => {
          const Icon = categoria.icon;
          const isExpanded = expandedCategoria === categoria.nome;
          
          return (
            <div key={index} className={`border rounded-lg overflow-hidden ${categoria.color.includes('border') ? categoria.color : 'border-gray-200'}`}>
              {/* Header da categoria */}
              <button
                onClick={() => toggleCategoria(categoria.nome)}
                className="w-full p-4 hover:bg-gray-50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5" style={{ 
                    color: categoria.color.includes('text-green') ? '#059669' :
                           categoria.color.includes('text-red') ? '#dc2626' :
                           categoria.color.includes('text-orange') ? '#ea580c' :
                           categoria.color.includes('text-purple') ? '#9333ea' :
                           categoria.color.includes('text-blue') ? '#2563eb' :
                           categoria.color.includes('text-gray') ? '#6b7280' :
                           categoria.color.includes('text-emerald') ? '#059669' :
                           categoria.color.includes('text-pink') ? '#db2777' :
                           categoria.color.includes('text-yellow') ? '#ca8a04' : '#6b7280'
                  }} />
                  <div className="text-left">
                    <h4 className="text-sm font-medium text-gray-900">{categoria.nome}</h4>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${categoria.color}`}>
                        {categoria.natureza}
                      </span>
                      <span className="text-xs text-gray-600">
                        Lançamento: <span className="font-semibold">{categoria.lancamentoTipo}</span>
                      </span>
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {/* Conteúdo expandido */}
              {isExpanded && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Coluna 1: Descrição e Finalidade */}
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">📋 Descrição</h5>
                        <p className="text-sm text-gray-700">{categoria.descricao}</p>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">🎯 Finalidade</h5>
                        <p className="text-sm text-gray-700">{categoria.finalidade}</p>
                      </div>

                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">📊 Impacto no DRE</h5>
                        <p className="text-sm text-gray-700">{categoria.impactoDRE}</p>
                      </div>
                    </div>

                    {/* Coluna 2: Exemplos e Códigos */}
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">💡 Exemplos de Contas</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {categoria.exemplos.map((exemplo, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{exemplo}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">🏷️ Códigos Sugeridos</h5>
                        <div className="flex flex-wrap gap-2">
                          {categoria.codigosSugeridos.map((codigo, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono">
                              {codigo}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dicas importantes */}
                  <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="text-sm font-semibold text-blue-900 mb-2">💡 Dicas Importantes</h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {categoria.dicas.map((dica, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-blue-600 mt-1">✓</span>
                          <span>{dica}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumo geral */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">📈 Resumo da Estrutura DRE</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-900 mb-1">Sequência do DRE:</p>
            <ol className="text-gray-700 space-y-1 text-xs">
              <li>1. Receita Bruta</li>
              <li>2. (-) Deduções e Impostos</li>
              <li>3. (=) Receita Líquida</li>
              <li>4. (-) Custo dos Produtos Vendidos</li>
              <li>5. (=) Lucro Bruto</li>
              <li>6. (-) Despesas Operacionais</li>
              <li>7. (=) Resultado Operacional</li>
              <li>8. (+/-) Resultado Financeiro</li>
              <li>9. (-) Impostos sobre Lucro</li>
              <li>10. (=) Lucro Líquido</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">Dicas Gerais:</p>
            <ul className="text-gray-700 space-y-1 text-xs">
              <li>• Use códigos sequenciais para organização</li>
              <li>• Separe contas analíticas das sintéticas</li>
              <li>• Mantenha consistência nos lançamentos</li>
              <li>• Revise categorização periodicamente</li>
              <li>• Documente todas as operações</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};