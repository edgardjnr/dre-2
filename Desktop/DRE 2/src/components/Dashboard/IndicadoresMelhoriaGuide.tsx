import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, TrendingUp, DollarSign, Scissors, Target, BarChart3 } from 'lucide-react';
import { DREPeriodo } from '../../types';

interface IndicadoresMelhoriaGuideProps {
  dre: DREPeriodo;
}

interface IndicadorMelhoria {
  nome: string;
  valorAtual: number;
  benchmark: number;
  nivel: 'abaixo' | 'aceitavel' | 'boa' | 'excelente';
  icon: React.ComponentType<any>;
  color: string;
  acoes: {
    categoria: string;
    items: string[];
  }[];
}

export const IndicadoresMelhoriaGuide: React.FC<IndicadoresMelhoriaGuideProps> = ({ dre }) => {
  const [expandedIndicador, setExpandedIndicador] = useState<string | null>(null);

  // Calcular eficiência operacional
  const eficienciaOperacional = dre.receitaLiquida > 0 
    ? ((dre.receitaLiquida - dre.despesasOperacionais) / dre.receitaLiquida) * 100 
    : 0;

  // Definir função para determinar nível
  const getNivel = (atual: number, benchmarks: { excelente: number; boa: number; aceitavel: number }) => {
    if (atual >= benchmarks.excelente) return 'excelente';
    if (atual >= benchmarks.boa) return 'boa';
    if (atual >= benchmarks.aceitavel) return 'aceitavel';
    return 'abaixo';
  };

  // Configurar indicadores com suas respectivas orientações
  const indicadores: IndicadorMelhoria[] = [
    {
      nome: 'Margem Bruta',
      valorAtual: dre.margemBruta,
      benchmark: 35,
      nivel: getNivel(dre.margemBruta, { excelente: 50, boa: 35, aceitavel: 20 }),
      icon: DollarSign,
      color: '#f59e0b',
      acoes: [
        {
          categoria: 'Otimização de Custos',
          items: [
            'Renegociar preços com fornecedores para reduzir custos dos produtos',
            'Buscar fornecedores alternativos com melhor custo-benefício',
            'Implementar compras em maior volume para obter descontos',
            'Otimizar processos produtivos para reduzir desperdícios',
            'Investir em tecnologia para automação e eficiência'
          ]
        },
        {
          categoria: 'Estratégias de Preço',
          items: [
            'Analisar elasticidade da demanda para aumentos de preço',
            'Implementar estratégias de precificação baseada em valor',
            'Criar produtos premium com margens maiores',
            'Segmentar clientes para precificação diferenciada',
            'Eliminar produtos com baixa margem de contribuição'
          ]
        },
        {
          categoria: 'Gestão de Inventário',
          items: [
            'Implementar sistema de gestão de estoque mais eficiente',
            'Reduzir custos de armazenagem e manuseio',
            'Otimizar mix de produtos focando nos mais rentáveis',
            'Minimizar perdas por obsolescência ou deterioração'
          ]
        }
      ]
    },
    {
      nome: 'Margem Operacional',
      valorAtual: dre.margemOperacional,
      benchmark: 15,
      nivel: getNivel(dre.margemOperacional, { excelente: 25, boa: 15, aceitavel: 5 }),
      icon: BarChart3,
      color: '#8b5cf6',
      acoes: [
        {
          categoria: 'Controle de Despesas Administrativas',
          items: [
            'Revisar e reduzir custos fixos desnecessários',
            'Implementar orçamento base zero para todas as despesas',
            'Negociar contratos de serviços (telefonia, internet, seguros)',
            'Otimizar estrutura organizacional eliminando redundâncias',
            'Digitalizar processos para reduzir custos operacionais'
          ]
        },
        {
          categoria: 'Eficiência Comercial',
          items: [
            'Otimizar estratégias de marketing para melhor ROI',
            'Focar em canais de vendas mais eficientes',
            'Implementar CRM para melhorar produtividade de vendas',
            'Treinar equipe comercial para aumentar taxa de conversão',
            'Reduzir custos de aquisição de clientes (CAC)'
          ]
        },
        {
          categoria: 'Automação e Tecnologia',
          items: [
            'Investir em automação de processos repetitivos',
            'Implementar sistemas integrados (ERP) para eficiência',
            'Utilizar ferramentas de gestão de projetos',
            'Adotar soluções em nuvem para reduzir custos de TI'
          ]
        }
      ]
    },
    {
      nome: 'Margem Líquida',
      valorAtual: dre.margemLiquida,
      benchmark: 10,
      nivel: getNivel(dre.margemLiquida, { excelente: 20, boa: 10, aceitavel: 3 }),
      icon: Target,
      color: '#10b981',
      acoes: [
        {
          categoria: 'Otimização Fiscal',
          items: [
            'Revisar regime tributário para encontrar opções mais vantajosas',
            'Aproveitar todos os incentivos fiscais disponíveis',
            'Implementar planejamento tributário estratégico',
            'Considerar mudança de regime (Simples, Lucro Presumido, Lucro Real)',
            'Consultar contador especializado em otimização fiscal'
          ]
        },
        {
          categoria: 'Gestão Financeira',
          items: [
            'Renegociar taxas de juros de empréstimos e financiamentos',
            'Otimizar aplicações financeiras para aumentar receitas',
            'Implementar gestão rigorosa de fluxo de caixa',
            'Reduzir dependência de capital de terceiros',
            'Buscar linhas de crédito com taxas mais favoráveis'
          ]
        },
        {
          categoria: 'Crescimento Sustentável',
          items: [
            'Focar em crescimento orgânico com alta rentabilidade',
            'Diversificar fontes de receita',
            'Investir em inovação para diferenciação competitiva',
            'Melhorar retenção de clientes para reduzir custos de aquisição'
          ]
        }
      ]
    },
    {
      nome: 'Eficiência Operacional',
      valorAtual: eficienciaOperacional,
      benchmark: 70,
      nivel: getNivel(eficienciaOperacional, { excelente: 80, boa: 70, aceitavel: 60 }),
      icon: TrendingUp,
      color: '#06b6d4',
      acoes: [
        {
          categoria: 'Lean Management',
          items: [
            'Implementar metodologias Lean para eliminar desperdícios',
            'Mapear processos para identificar gargalos e ineficiências',
            'Estabelecer KPIs para monitorar eficiência operacional',
            'Treinar equipe em melhoria contínua (Kaizen)',
            'Padronizar processos operacionais críticos'
          ]
        },
        {
          categoria: 'Gestão de Pessoas',
          items: [
            'Investir em treinamento e desenvolvimento da equipe',
            'Implementar sistema de metas e incentivos por performance',
            'Otimizar alocação de recursos humanos',
            'Criar cultura de melhoria contínua e eficiência',
            'Mensurar e melhorar produtividade por colaborador'
          ]
        },
        {
          categoria: 'Infraestrutura e Processos',
          items: [
            'Avaliar terceirização de atividades não-core',
            'Implementar controles de qualidade para reduzir retrabalho',
            'Otimizar layout e fluxo de trabalho',
            'Investir em equipamentos mais eficientes',
            'Centralizar compras para ganhar escala e eficiência'
          ]
        }
      ]
    }
  ];

  // Filtrar apenas indicadores que precisam de melhoria
  const indicadoresParaMelhoria = indicadores.filter(
    indicador => indicador.nivel === 'abaixo' || indicador.nivel === 'aceitavel'
  );

  const toggleIndicador = (nome: string) => {
    setExpandedIndicador(expandedIndicador === nome ? null : nome);
  };

  const getColorByNivel = (nivel: string) => {
    switch (nivel) {
      case 'excelente': return 'text-green-600 bg-green-50 border-green-200';
      case 'boa': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'aceitavel': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  if (indicadoresParaMelhoria.length === 0) {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-6">
        <div className="flex items-center space-x-3">
          <Target className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">Excelente Performance!</h3>
            <p className="text-green-700">Todos os indicadores estão dentro ou acima dos benchmarks esperados.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg border-2 border-red-500 p-6 relative overflow-hidden">
      {/* Elemento decorativo de destaque */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-700"></div>
      
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-yellow-100 rounded-full">
          <Lightbulb className="h-6 w-6 text-yellow-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <span className="mr-2">💡</span>
            Guia de Melhoria de Indicadores
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">PRIORITÁRIO</span>
          </h3>
          <p className="text-gray-700 text-sm font-medium">Ações específicas para melhorar os indicadores abaixo do esperado</p>
        </div>
      </div>

      <div className="space-y-4">
        {indicadoresParaMelhoria.map((indicador, index) => {
          const Icon = indicador.icon;
          const isExpanded = expandedIndicador === indicador.nome;
          
          return (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Header do indicador */}
              <button
                onClick={() => toggleIndicador(indicador.nome)}
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5" style={{ color: indicador.color }} />
                  <div className="text-left">
                    <h4 className="text-sm font-medium text-gray-900">{indicador.nome}</h4>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-xs text-gray-600">
                        Atual: <span className="font-semibold">{indicador.valorAtual.toFixed(1)}%</span>
                      </span>
                      <span className="text-xs text-gray-600">
                        Meta: <span className="font-semibold">{indicador.benchmark}%</span>
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getColorByNivel(indicador.nivel)}`}>
                        {indicador.nivel === 'abaixo' ? 'Abaixo do esperado' : 'Precisa melhorar'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Indicador visual de expansão */}
                  <span className="text-xs text-gray-500 font-medium">
                    {isExpanded ? 'Ocultar' : 'Ver ações'}
                  </span>
                  <div className="p-2 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors">
                    {isExpanded ? (
                      <ChevronUp className="h-6 w-6 text-blue-600 font-bold" />
                    ) : (
                      <ChevronDown className="h-6 w-6 text-blue-600 font-bold animate-bounce" />
                    )}
                  </div>
                </div>
              </button>

              {/* Conteúdo expandido */}
              {isExpanded && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {indicador.acoes.map((categoria, catIndex) => (
                      <div key={catIndex} className="space-y-3">
                        <h5 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                          <Scissors className="h-4 w-4 text-blue-500" />
                          <span>{categoria.categoria}</span>
                        </h5>
                        <ul className="space-y-2">
                          {categoria.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="text-xs text-gray-700 pl-4 border-l-2 border-blue-100">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  
                  {/* Resumo de impacto esperado */}
                  <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h6 className="text-sm font-medium text-blue-900 mb-2">Impacto Esperado</h6>
                    <p className="text-xs text-blue-800">
                      Implementando essas ações, é possível melhorar o {indicador.nome.toLowerCase()} em{' '}
                      <strong>{(indicador.benchmark - indicador.valorAtual).toFixed(1)} pontos percentuais</strong>,
                      atingindo a meta de <strong>{indicador.benchmark}%</strong> ou superior.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cronograma de implementação */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Cronograma Sugerido</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Fase 1 (0-3 meses)</p>
                <p className="text-xs text-gray-600">Eficiência Operacional - Implementar lean management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Fase 2 (3-9 meses)</p>
                <p className="text-xs text-gray-600">Margem Operacional - Otimizar despesas administrativas</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Fase 3 (6-18 meses)</p>
                <p className="text-xs text-gray-600">Margens Bruta e Líquida - Otimização completa</p>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Benefícios Esperados</h4>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-900">Impacto Financeiro</p>
              <p className="text-xs text-green-700">
                Aumento estimado de {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format((dre.receitaLiquida * 4) / 100)} no lucro líquido anual
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">Competitividade</p>
              <p className="text-xs text-blue-700">
                Posicionamento acima da média do mercado em todos os indicadores
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-900">Sustentabilidade</p>
              <p className="text-xs text-purple-700">
                Criação de vantagem competitiva sustentável e crescimento consistente
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dicas gerais */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="text-sm font-medium text-yellow-900 mb-3">💡 Dicas Importantes</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-yellow-800">
          <div>
            <p className="font-medium mb-1">Priorização:</p>
            <p>Comece pelas ações com maior impacto e menor custo de implementação.</p>
          </div>
          <div>
            <p className="font-medium mb-1">Monitoramento:</p>
            <p>Acompanhe os indicadores mensalmente para medir o progresso das melhorias.</p>
          </div>
          <div>
            <p className="font-medium mb-1">Implementação Gradual:</p>
            <p>Implemente mudanças de forma escalonada para não comprometer as operações.</p>
          </div>
          <div>
            <p className="font-medium mb-1">Consultoria Especializada:</p>
            <p>Considere contratar consultores especializados para casos mais complexos.</p>
          </div>
        </div>
      </div>
      
      {/* Observações importantes */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h5 className="text-xs font-medium text-gray-900 mb-1">📋 Observações Importantes</h5>
        <p className="text-xs text-gray-700">
          • Projeções baseadas em médias de mercado e implementação efetiva das ações recomendadas<br/>
          • Resultados podem variar conforme setor, porte da empresa e condições econômicas<br/>
          • Recomenda-se acompanhamento mensal dos indicadores e ajustes na estratégia conforme necessário
        </p>
      </div>
    </div>
  );
};