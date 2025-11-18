import React, { useEffect, useRef, useMemo } from 'react';
import Highcharts from 'highcharts';
import { Lancamento, ContaContabil } from '../../types';

interface CustosDistributionChartProps {
  lancamentos: Lancamento[];
  contasContabeis: ContaContabil[];
  empresaId: string;
  startDate: string;
  endDate: string;
}

interface CustoCategoria {
  name: string;
  value: number;
  color: string;
}

export const CustosDistributionChart: React.FC<CustosDistributionChartProps> = ({
  lancamentos,
  contasContabeis,
  empresaId,
  startDate,
  endDate
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<Highcharts.Chart | null>(null);

  // Função para categorizar custos baseado no nome da conta
  const categorizarCusto = (nomeConta: string, categoria: string): string => {
    const nomeUpper = nomeConta.toUpperCase();
    const categoriaUpper = categoria.toUpperCase();

    // Log para debug da categorização
    console.log(`Categorizando: "${nomeConta}" -> "${nomeUpper}"`);

    // CATEGORIA FUNCIONÁRIOS REMOVIDA - Não há dados de funcionários no sistema

    // Extras (nova categoria específica)
    if (nomeUpper.includes('EXTRA') || nomeUpper.includes('ADICIONAL') || nomeUpper.includes('HORA EXTRA') ||
        nomeUpper.includes('OVERTIME') || nomeUpper.includes('COMPLEMENTO') || nomeUpper.includes('GRATIFICACAO') ||
        nomeUpper.includes('GRATIFICAÇÃO') || nomeUpper.includes('BONUS') || nomeUpper.includes('BÔNUS')) {
      console.log(`-> Categorizado como: Extras`);
      return 'Extras';
    }

    // Bandas/Artistas
    if (nomeUpper.includes('BANDA') || nomeUpper.includes('ARTISTA') ||
        nomeUpper.includes('MÚSICO') || nomeUpper.includes('MUSICO') ||
        nomeUpper.includes('SHOW') || nomeUpper.includes('APRESENTAÇÃO') ||
        nomeUpper.includes('APRESENTACAO') || nomeUpper.includes('CACHÊ') ||
        nomeUpper.includes('CACHE') || nomeUpper.includes('PERFORMANCE')) {
      console.log(`-> Categorizado como: Bandas/Artistas`);
      return 'Bandas/Artistas';
    }

    // Mercadorias/Produtos
    if (categoriaUpper.includes('CUSTO') && categoriaUpper.includes('PRODUTO') ||
        nomeUpper.includes('MERCADORIA') || nomeUpper.includes('PRODUTO') ||
        nomeUpper.includes('ESTOQUE') || nomeUpper.includes('COMPRA') ||
        nomeUpper.includes('FORNECEDOR') || nomeUpper.includes('MATÉRIA') ||
        nomeUpper.includes('MATERIA')) {
      console.log(`-> Categorizado como: Mercadorias`);
      return 'Mercadorias';
    }

    // Equipamentos
    if (nomeUpper.includes('EQUIPAMENTO') || nomeUpper.includes('MAQUINA') || nomeUpper.includes('MÁQUINA') ||
        nomeUpper.includes('FERRAMENTA') || nomeUpper.includes('INSTRUMENTO') || nomeUpper.includes('APARELHO') ||
        nomeUpper.includes('COMPUTADOR') || nomeUpper.includes('SOFTWARE') || nomeUpper.includes('LICENCA') || nomeUpper.includes('LICENÇA')) {
      console.log(`-> Categorizado como: Equipamentos`);
      return 'Equipamentos';
    }

    // Marketing
    if (nomeUpper.includes('MARKETING') || nomeUpper.includes('PUBLICIDADE') ||
        nomeUpper.includes('PROPAGANDA') || nomeUpper.includes('DIVULGAÇÃO') ||
        nomeUpper.includes('DIVULGACAO') || nomeUpper.includes('SOCIAL MEDIA') ||
        nomeUpper.includes('MÍDIA') || nomeUpper.includes('MIDIA')) {
      console.log(`-> Categorizado como: Marketing`);
      return 'Marketing';
    }

    // Aluguel/Infraestrutura
    if (nomeUpper.includes('ALUGUEL') || nomeUpper.includes('ALUGUER') ||
        nomeUpper.includes('LOCAÇÃO') || nomeUpper.includes('LOCACAO') ||
        nomeUpper.includes('IMÓVEL') || nomeUpper.includes('IMOVEL') ||
        nomeUpper.includes('PREDIAL') || nomeUpper.includes('CONDOMÍNIO') ||
        nomeUpper.includes('CONDOMINIO') || nomeUpper.includes('ENERGIA') || nomeUpper.includes('AGUA') ||
        nomeUpper.includes('ÁGUA') || nomeUpper.includes('TELEFONE') || nomeUpper.includes('INTERNET') ||
        nomeUpper.includes('MANUTENCAO') || nomeUpper.includes('MANUTENÇÃO') || nomeUpper.includes('LIMPEZA')) {
      console.log(`-> Categorizado como: Aluguel/Infraestrutura`);
      return 'Aluguel/Infraestrutura';
    }

    // Serviços
    if (categoriaUpper.includes('DESPESA') && (categoriaUpper.includes('ADMINISTRATIVA') || categoriaUpper.includes('COMERCIAL')) ||
        nomeUpper.includes('SERVIÇO') || nomeUpper.includes('SERVICO') ||
        nomeUpper.includes('CONSULTORIA') || nomeUpper.includes('ASSESSORIA') ||
        nomeUpper.includes('SEGURANÇA') || nomeUpper.includes('SEGURANCA')) {
      console.log(`-> Categorizado como: Serviços`);
      return 'Serviços';
    }

    // Impostos e Taxas
    if (categoriaUpper.includes('IMPOSTO') || categoriaUpper.includes('DEDUÇÃO') ||
        nomeUpper.includes('IMPOSTO') || nomeUpper.includes('TAXA') ||
        nomeUpper.includes('TRIBUTO') || nomeUpper.includes('ICMS') ||
        nomeUpper.includes('PIS') || nomeUpper.includes('COFINS') ||
        nomeUpper.includes('ISS') || nomeUpper.includes('IRPJ') ||
        nomeUpper.includes('CSLL')) {
      console.log(`-> Categorizado como: Impostos e Taxas`);
      return 'Impostos e Taxas';
    }

    // Financeiro
    if (categoriaUpper.includes('FINANCEIRA') ||
        nomeUpper.includes('JUROS') || nomeUpper.includes('FINANCIAMENTO') ||
        nomeUpper.includes('EMPRÉSTIMO') || nomeUpper.includes('EMPRESTIMO') ||
        nomeUpper.includes('BANCO') || nomeUpper.includes('CARTÃO') ||
        nomeUpper.includes('CARTAO') || nomeUpper.includes('TARIFA')) {
      console.log(`-> Categorizado como: Financeiro`);
      return 'Financeiro';
    }

    console.log(`-> Categorizado como: Outros`);
    return 'Outros';
  };

  // Função para debug - listar todas as contas e suas categorizações com valores
  const listarContasECategorias = () => {
    if (!lancamentos || lancamentos.length === 0) return;
    
    const contasComValores: { [key: string]: { categoria: string; valor: number; quantidade: number } } = {};
    const categorizacoes: { [key: string]: { contas: string[]; valorTotal: number } } = {};
    
    // Filtrar lançamentos do período
    const lancamentosFiltrados = lancamentos.filter(lancamento => {
      if (lancamento.empresaId !== empresaId || lancamento.tipo !== 'Débito') {
        return false;
      }
      const dataLancamento = new Date(lancamento.data);
      const inicio = new Date(startDate);
      const fim = new Date(endDate);
      return dataLancamento >= inicio && dataLancamento <= fim;
    });
    
    lancamentosFiltrados.forEach(lancamento => {
      const conta = contasContabeis.find(c => c.id === lancamento.contaId);
      if (conta) {
        const categoria = categorizarCusto(conta.nome, conta.categoria);
        
        // Agrupar por conta individual
        if (!contasComValores[conta.nome]) {
          contasComValores[conta.nome] = { categoria, valor: 0, quantidade: 0 };
        }
        contasComValores[conta.nome].valor += lancamento.valor;
        contasComValores[conta.nome].quantidade += 1;
        
        // Agrupar por categoria
        if (!categorizacoes[categoria]) {
          categorizacoes[categoria] = { contas: [], valorTotal: 0 };
        }
        if (!categorizacoes[categoria].contas.includes(conta.nome)) {
          categorizacoes[categoria].contas.push(conta.nome);
        }
        categorizacoes[categoria].valorTotal += lancamento.valor;
      }
    });
    
    console.log('=== RELATÓRIO DETALHADO DE CATEGORIZAÇÃO ===');
    console.log(`Período: ${startDate} a ${endDate}`);
    console.log(`Total de lançamentos analisados: ${lancamentosFiltrados.length}`);
    
    console.log('\n--- CONTAS INDIVIDUAIS ---');
    Object.entries(contasComValores)
      .sort(([,a], [,b]) => b.valor - a.valor)
      .forEach(([conta, dados]) => {
        console.log(`${conta}: R$ ${dados.valor.toFixed(2)} (${dados.quantidade} lançamentos) -> ${dados.categoria}`);
      });
    
    console.log('\n--- RESUMO POR CATEGORIA ---');
    Object.entries(categorizacoes)
      .sort(([,a], [,b]) => b.valorTotal - a.valorTotal)
      .forEach(([categoria, dados]) => {
        console.log(`\n${categoria}: R$ ${dados.valorTotal.toFixed(2)} (${dados.contas.length} contas):`);
        dados.contas.forEach(conta => {
          const valorConta = contasComValores[conta]?.valor || 0;
          console.log(`  - ${conta}: R$ ${valorConta.toFixed(2)}`);
        });
      });
    
    // Categoria 'Funcionários' foi removida - confirmado que não há dados no sistema
    
    console.log('=== FIM DO RELATÓRIO ===\n');
  };

  // Calcular custos por categoria
  const custosCategorizados = useMemo(() => {
    if (!lancamentos || lancamentos.length === 0) return { dados: [], total: 0 };

    // Executar debug apenas uma vez
    if (lancamentos.length > 0) {
      listarContasECategorias();
    }

    const categorias: { [key: string]: number } = {};

    // Filtrar lançamentos de débito no período
    const lancamentosFiltrados = lancamentos.filter(lancamento => {
      if (lancamento.empresaId !== empresaId || lancamento.tipo !== 'Débito') {
        return false;
      }
      const dataLancamento = new Date(lancamento.data);
      const inicio = new Date(startDate);
      const fim = new Date(endDate);
      return dataLancamento >= inicio && dataLancamento <= fim;
    });

    console.log(`Lançamentos filtrados: ${lancamentosFiltrados.length}`);

    // Agrupar por categoria
    lancamentosFiltrados.forEach(lancamento => {
      const conta = contasContabeis.find(c => c.id === lancamento.contaId);
      if (conta) {
        const categoria = categorizarCusto(conta.nome, conta.categoria);
        categorias[categoria] = (categorias[categoria] || 0) + lancamento.valor;
      }
    });

    console.log('Valores por categoria:', categorias);

    // Calcular total para porcentagens
    const total = Object.values(categorias).reduce((sum, value) => sum + value, 0);
    console.log('Total de custos:', total);

    // Cores para cada categoria (Funcionários removido - não há dados no sistema)
    const cores: { [key: string]: string } = {
      'Extras': '#FF8E53',
      'Bandas/Artistas': '#4ECDC4',
      'Mercadorias': '#45B7D1',
      'Equipamentos': '#A29BFE',
      'Marketing': '#FFEAA7',
      'Aluguel/Infraestrutura': '#96CEB4',
      'Serviços': '#06B6D4',
      'Impostos e Taxas': '#F97316',
      'Financeiro': '#EC4899',
      'Outros': '#DDA0DD'
    };

    // Filtrar apenas categorias que realmente têm valores
    const categoriasComValores = Object.entries(categorias)
      .filter(([_, value]) => value > 0)
      .sort(([,a], [,b]) => b - a);
    
    console.log('Categorias com valores encontradas:', categoriasComValores.map(([nome, valor]) => `${nome}: R$ ${valor.toFixed(2)}`));
    
    // Converter para formato do gráfico
    const dados: CustoCategoria[] = categoriasComValores
      .map(([name, value]) => ({
        name,
        value: total > 0 ? (value / total) * 100 : 0,
        color: cores[name] || '#6B7280'
      }))
      .filter(item => item.value >= 0.1) // Mostrar categorias com pelo menos 0.1%
      .sort((a, b) => b.value - a.value);
    
    // Log de categorias que foram filtradas (sem valores)
    const categoriasVazias = Object.keys(cores).filter(categoria => !categorias[categoria] || categorias[categoria] === 0);
    if (categoriasVazias.length > 0) {
      console.log('⚠️  Categorias sem valores (removidas do gráfico):', categoriasVazias);
    }

    console.log('Dados do gráfico:', dados);
    return { dados, total };
  }, [lancamentos, contasContabeis, empresaId, startDate, endDate]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destruir gráfico anterior se existir
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const { dados, total } = custosCategorizados;

    if (dados.length === 0) {
      // Mostrar mensagem quando não há dados
      if (chartRef.current) {
        chartRef.current.innerHTML = `
          <div class="flex items-center justify-center h-64">
            <div class="text-center">
              <p class="text-gray-500 text-lg mb-2">Nenhum custo encontrado</p>
              <p class="text-gray-400 text-sm">Não há lançamentos de débito no período selecionado</p>
            </div>
          </div>
        `;
      }
      return;
    }

    // Criar gráfico
    chartInstance.current = Highcharts.chart(chartRef.current, {
      chart: {
        type: 'pie',
        height: 400,
        custom: {},
        events: {
          render() {
            const chart = this;
            const series = chart.series[0];
            let customLabel = chart.options.chart.custom.label;

            if (!customLabel) {
              customLabel = chart.options.chart.custom.label = chart.renderer.label(
                'Total<br/>' + '<strong>R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</strong>'
              )
                .css({
                  color: 'var(--highcharts-neutral-color-100, #000)',
                  textAnchor: 'middle',
                  fontWeight: 'bold'
                })
                .add();
            }

            const x = series.center[0] + chart.plotLeft;
            const y = series.center[1] + chart.plotTop - (customLabel.attr('height') / 2);

            customLabel.attr({ x, y });
            customLabel.css({ fontSize: `${series.center[2] / 12}px` });
          }
        }
      },
      accessibility: {
        point: {
          valueSuffix: '%'
        }
      },
      title: {
        text: 'Distribuição de Custos por Categoria',
        style: {
          fontSize: '18px',
          fontWeight: 'bold'
        }
      },
      subtitle: {
        text: `Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b><br/>Valor: <b>R$ {point.custom.valor}</b>'
      },
      legend: {
        enabled: true,
        align: 'right',
        verticalAlign: 'middle',
        layout: 'vertical',
        itemStyle: {
          fontSize: '12px'
        }
      },
      plotOptions: {
        series: {
          allowPointSelect: true,
          cursor: 'pointer',
          borderRadius: 8,
          dataLabels: [{
            enabled: true,
            distance: 20,
            format: '{point.name}',
            style: {
              fontSize: '11px',
              fontWeight: 'bold'
            }
          }, {
            enabled: true,
            distance: -15,
            format: '{point.percentage:.1f}%',
            style: {
              fontSize: '10px',
              color: 'white',
              textOutline: 'none'
            }
          }],
          showInLegend: true
        }
      },
      series: [{
        name: 'Custos',
        colorByPoint: true,
        innerSize: '75%',
        data: dados.map(item => ({
          name: item.name,
          y: item.value,
          color: item.color,
          custom: {
            valor: ((item.value / 100) * total).toLocaleString('pt-BR', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })
          }
        }))
      }]
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [custosCategorizados, startDate, endDate]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div ref={chartRef} className="w-full" />
    </div>
  );
};

export default CustosDistributionChart;