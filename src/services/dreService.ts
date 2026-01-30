import { DREPeriodo, Lancamento, ContaContabil } from '../types';
import { isWithinInterval, parseISO } from 'date-fns';
import { isReceitaDreCategoria, mapContaCategoriaToDreCategoria } from '../utils/dreCategoria';

export class DREService {
  static calcularDRE(
    lancamentos: Lancamento[],
    contasContabeis: ContaContabil[],
    empresaId: string,
    dataInicio: string,
    dataFim: string
  ): DREPeriodo {
    // Filtrar lançamentos por empresa e período
    const lancamentosFiltrados = lancamentos.filter(lancamento => {
      const dataLancamento = parseISO(lancamento.data);
      const inicio = parseISO(dataInicio);
      const fim = parseISO(dataFim);
      
      return lancamento.empresaId === empresaId &&
             isWithinInterval(dataLancamento, { start: inicio, end: fim });
    });

    // Agrupar valores por categoria
    const valoresPorCategoria = this.agruparValoresPorCategoria(lancamentosFiltrados, contasContabeis);

    // Calcular componentes do DRE
    const receitaBruta = valoresPorCategoria['Receita Bruta'] || 0;
    const deducoes = valoresPorCategoria['Deduções e Impostos'] || 0;
    const receitaLiquida = receitaBruta - deducoes;
    
    const custos = valoresPorCategoria['Custo dos Produtos Vendidos'] || 0;
    const lucroBruto = receitaLiquida - custos;
    
    const despesasComerciais = valoresPorCategoria['Despesas Comerciais'] || 0;
    const despesasAdministrativas = valoresPorCategoria['Despesas Administrativas'] || 0;
    const outrasDespesas = valoresPorCategoria['Outras Despesas Operacionais'] || 0;
    const despesasOperacionais = despesasComerciais + despesasAdministrativas + outrasDespesas;
    
    const resultadoOperacional = lucroBruto - despesasOperacionais;
    
    const receitasFinanceiras = valoresPorCategoria['Receitas Financeiras'] || 0;
    const despesasFinanceiras = valoresPorCategoria['Despesas Financeiras'] || 0;
    const resultadoFinanceiro = receitasFinanceiras - despesasFinanceiras;
    
    const resultadoAntesIR = resultadoOperacional + resultadoFinanceiro;
    
    const impostosSobreLucro = valoresPorCategoria['Impostos sobre Lucro'] || 0;
    const lucroLiquido = resultadoAntesIR - impostosSobreLucro;

    // Debug logs para investigar margem líquida
    console.log('=== DEBUG DRE CALCULATION ===');
    console.log('Receita Líquida:', receitaLiquida);
    console.log('Custo Vendas:', custos);
    console.log('Despesas Operacionais:', despesasOperacionais);
    console.log('Despesas Financeiras:', despesasFinanceiras);
    console.log('Receitas Financeiras:', receitasFinanceiras);
    console.log('Impostos:', impostosSobreLucro);
    console.log('Lucro Bruto:', lucroBruto);
    console.log('Lucro Operacional:', resultadoOperacional);
    console.log('Lucro Antes Impostos:', resultadoAntesIR);
    console.log('Lucro Líquido:', lucroLiquido);
    console.log('Total de lançamentos:', lancamentos.length);
    console.log('Total de contas:', contasContabeis.length);

    // Calcular margens
    const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
    const margemOperacional = receitaLiquida > 0 ? (resultadoOperacional / receitaLiquida) * 100 : 0;
    const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;
    
    console.log('Margem Bruta:', margemBruta + '%');
    console.log('Margem Operacional:', margemOperacional + '%');
    console.log('Margem Líquida:', margemLiquida + '%');
    console.log('==============================');

    return {
      empresaId,
      dataInicio,
      dataFim,
      receitaBruta,
      deducoes,
      receitaLiquida,
      custos,
      lucroBruto,
      despesasComerciais,
      despesasAdministrativas,
      outrasDespesas,
      despesasOperacionais,
      resultadoOperacional,
      receitasFinanceiras,
      despesasFinanceiras,
      resultadoFinanceiro,
      resultadoAntesIR,
      impostosSobreLucro,
      lucroLiquido,
      margemBruta,
      margemOperacional,
      margemLiquida
    };
  }

  private static agruparValoresPorCategoria(
    lancamentos: Lancamento[],
    contasContabeis: ContaContabil[]
  ): Record<string, number> {
    const resultado: Record<string, number> = {};

    lancamentos.forEach(lancamento => {
      const conta = contasContabeis.find(c => c.id === lancamento.contaId);
      if (!conta) return;

      const categoriaDre = mapContaCategoriaToDreCategoria(conta.categoria);
      if (!categoriaDre) return;

      if (!resultado[categoriaDre]) {
        resultado[categoriaDre] = 0;
      }

      // Para receitas, considerar créditos como positivos
      // Para despesas/custos, considerar débitos como positivos
      const valor = isReceitaDreCategoria(categoriaDre) 
        ? (lancamento.tipo === 'Crédito' ? lancamento.valor : -lancamento.valor)
        : (lancamento.tipo === 'Débito' ? lancamento.valor : -lancamento.valor);

      resultado[categoriaDre] += valor;
    });

    return resultado;
  }

  static obterContasIndividuais(
    lancamentos: Lancamento[],
    contasContabeis: ContaContabil[],
    empresaId: string,
    dataInicio: string,
    dataFim: string
  ): Array<{ nome: string; categoria: string; valor: number; }> {
    // Filtrar lançamentos por empresa e período
    const lancamentosFiltrados = lancamentos.filter(lancamento => {
      const dataLancamento = parseISO(lancamento.data);
      const inicio = parseISO(dataInicio);
      const fim = parseISO(dataFim);
      
      return lancamento.empresaId === empresaId &&
             isWithinInterval(dataLancamento, { start: inicio, end: fim });
    });

    const resultado: Record<string, { nome: string; categoria: string; valor: number; }> = {};

    lancamentosFiltrados.forEach(lancamento => {
      const conta = contasContabeis.find(c => c.id === lancamento.contaId);
      if (!conta) return;

      // Filtrar apenas contas de despesas/custos (não receitas)
      const categoriaDre = mapContaCategoriaToDreCategoria(conta.categoria);
      if (!categoriaDre) return;
      if (isReceitaDreCategoria(categoriaDre)) return;

      const chave = conta.id;
      if (!resultado[chave]) {
        resultado[chave] = {
          nome: conta.nome,
          categoria: categoriaDre,
          valor: 0
        };
      }

      // Para despesas/custos, considerar débitos como positivos
      const valor = lancamento.tipo === 'Débito' ? lancamento.valor : -lancamento.valor;
      resultado[chave].valor += valor;
    });

    // Retornar apenas contas com valores > 0
    return Object.values(resultado).filter(conta => conta.valor > 0);
  }

  static compararPeriodos(
    dre1: DREPeriodo,
    dre2: DREPeriodo
  ): {
    variacaoReceita: number;
    variacaoLucroLiquido: number;
    variacaoMargemLiquida: number;
  } {
    // Debug logs
    console.log('DREService.compararPeriodos Debug:', {
      dre1: { receitaLiquida: dre1.receitaLiquida, lucroLiquido: dre1.lucroLiquido, margemLiquida: dre1.margemLiquida },
      dre2: { receitaLiquida: dre2.receitaLiquida, lucroLiquido: dre2.lucroLiquido, margemLiquida: dre2.margemLiquida }
    });

    // Verificar se há dados válidos no período anterior
    if (!dre1 || dre1.receitaLiquida <= 0) {
      console.log('Período anterior sem dados válidos para comparação');
      return {
        variacaoReceita: 0,
        variacaoLucroLiquido: 0,
        variacaoMargemLiquida: 0
      };
    }

    const variacaoReceita = ((dre2.receitaLiquida - dre1.receitaLiquida) / dre1.receitaLiquida) * 100;

    const variacaoLucroLiquido = dre1.lucroLiquido !== 0 
      ? ((dre2.lucroLiquido - dre1.lucroLiquido) / Math.abs(dre1.lucroLiquido)) * 100 
      : (dre2.lucroLiquido > 0 ? 100 : 0); // Se anterior era 0 e atual é positivo, considerar 100% de melhoria

    const variacaoMargemLiquida = dre2.margemLiquida - dre1.margemLiquida;

    const resultado = {
      variacaoReceita,
      variacaoLucroLiquido,
      variacaoMargemLiquida
    };

    console.log('Resultado da comparação:', resultado);

    return resultado;
  }
}
