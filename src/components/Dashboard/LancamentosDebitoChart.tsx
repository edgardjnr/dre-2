import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Lancamento, ContaContabil } from '../../types';
import { TrendingDown, DollarSign, FileText, BarChart3 } from 'lucide-react';
import { AnimatedPieChart } from './AnimatedPieChart';

interface LancamentosDebitoChartProps {
  empresaId: string;
  lancamentos?: Lancamento[];
  contasContabeis?: ContaContabil[];
  startDate?: string;
  endDate?: string;
}

interface DebitosPorConta {
  contaId: string;
  contaNome: string;
  categoria: string;
  totalDebitos: number;
  quantidadeLancamentos: number;
}

interface DebitosPorCategoria {
  categoria: string;
  totalDebitos: number;
  quantidadeLancamentos: number;
  percentual: number;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

export const LancamentosDebitoChart: React.FC<LancamentosDebitoChartProps> = ({ 
  empresaId, 
  lancamentos: lancamentosProps, 
  contasContabeis: contasProps, 
  startDate, 
  endDate 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [contas, setContas] = useState<ContaContabil[]>([]);
  const [dadosDebitosPorConta, setDadosDebitosPorConta] = useState<DebitosPorConta[]>([]);
  const [dadosDebitosPorCategoria, setDadosDebitosPorCategoria] = useState<DebitosPorCategoria[]>([]);
  const [totalDebitos, setTotalDebitos] = useState(0);
  const [totalLancamentos, setTotalLancamentos] = useState(0);
  const [maiorConta, setMaiorConta] = useState<string>('');

  useEffect(() => {
    if (empresaId) {
      // Se os dados já foram passados como props, usar eles
      if (lancamentosProps && contasProps) {
        processarDadosFiltrados();
      } else {
        fetchData();
      }
    }
  }, [empresaId, lancamentosProps, contasProps, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar contas contábeis
      const { data: contasData, error: contasError } = await supabase
        .from('contas_contabeis')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativa', true);

      if (contasError) throw contasError;

      // Buscar lançamentos de débito
      const { data: lancamentosData, error: lancamentosError } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'Débito')
        .order('data', { ascending: false });

      if (lancamentosError) throw lancamentosError;

      // Mapear dados corretamente
      const contasMapeadas = (contasData || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        created_at: item.created_at,
        empresaId: item.empresa_id,
        codigo: item.codigo,
        nome: item.nome,
        categoria: item.categoria,
        subcategoria: item.subcategoria,
        tipo: item.tipo,
        ativa: item.ativa
      }));

      const lancamentosMapeados = (lancamentosData || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        created_at: item.created_at,
        empresaId: item.empresa_id,
        contaId: item.conta_id,
        data: item.data,
        descricao: item.descricao,
        valor: item.valor,
        tipo: item.tipo
      }));

      setContas(contasMapeadas);
      setLancamentos(lancamentosMapeados);

      // Calcular dados para os gráficos
      calcularDebitosPorConta(lancamentosMapeados, contasMapeadas);
      calcularDebitosPorCategoria(lancamentosMapeados, contasMapeadas);

    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const processarDadosFiltrados = () => {
    setLoading(true);
    setError(null);
    
    try {
      // Filtrar lançamentos por período se startDate e endDate foram fornecidos
      let lancamentosFiltrados = lancamentosProps?.filter(l => l.tipo === 'Débito') || [];
      
      if (startDate && endDate) {
        lancamentosFiltrados = lancamentosFiltrados.filter(lancamento => {
          const dataLancamento = new Date(lancamento.data);
          const inicio = new Date(startDate);
          const fim = new Date(endDate);
          return dataLancamento >= inicio && dataLancamento <= fim;
        });
      }

      setContas(contasProps || []);
      setLancamentos(lancamentosFiltrados);

      // Calcular dados para os gráficos
      calcularDebitosPorConta(lancamentosFiltrados, contasProps || []);
      calcularDebitosPorCategoria(lancamentosFiltrados, contasProps || []);

    } catch (err: any) {
      setError(err.message || 'Erro ao processar dados filtrados');
      console.error('Erro ao processar dados filtrados:', err);
    } finally {
      setLoading(false);
    }
  };

  const calcularDebitosPorConta = (lancamentosData: Lancamento[], contasData: ContaContabil[]) => {
    const debitosPorConta = new Map<string, DebitosPorConta>();

    lancamentosData.forEach(lancamento => {
      const conta = contasData.find(c => c.id === lancamento.contaId);
      if (!conta) return;

      const key = conta.id;
      const existing = debitosPorConta.get(key);

      if (existing) {
        existing.totalDebitos += lancamento.valor;
        existing.quantidadeLancamentos += 1;
      } else {
        debitosPorConta.set(key, {
          contaId: conta.id,
          contaNome: conta.nome,
          categoria: conta.categoria,
          totalDebitos: lancamento.valor,
          quantidadeLancamentos: 1
        });
      }
    });

    const dadosOrdenados = Array.from(debitosPorConta.values())
      .sort((a, b) => b.totalDebitos - a.totalDebitos)
      .slice(0, 10); // Top 10 contas

    setDadosDebitosPorConta(dadosOrdenados);

    // Calcular totais e maior conta
    const total = dadosOrdenados.reduce((sum, item) => sum + item.totalDebitos, 0);
    const totalLanc = dadosOrdenados.reduce((sum, item) => sum + item.quantidadeLancamentos, 0);
    const maior = dadosOrdenados.length > 0 ? dadosOrdenados[0].contaNome : '';

    setTotalDebitos(total);
    setTotalLancamentos(totalLanc);
    setMaiorConta(maior);
  };

  const calcularDebitosPorCategoria = (lancamentosData: Lancamento[], contasData: ContaContabil[]) => {
    const debitosPorCategoria = new Map<string, { total: number; quantidade: number }>();

    lancamentosData.forEach(lancamento => {
      const conta = contasData.find(c => c.id === lancamento.contaId);
      if (!conta) return;

      const categoria = conta.categoria;
      const existing = debitosPorCategoria.get(categoria);

      if (existing) {
        existing.total += lancamento.valor;
        existing.quantidade += 1;
      } else {
        debitosPorCategoria.set(categoria, {
          total: lancamento.valor,
          quantidade: 1
        });
      }
    });

    const totalGeral = Array.from(debitosPorCategoria.values())
      .reduce((sum, item) => sum + item.total, 0);

    const dadosCategoria = Array.from(debitosPorCategoria.entries())
      .map(([categoria, dados]) => ({
        categoria,
        totalDebitos: dados.total,
        quantidadeLancamentos: dados.quantidade,
        percentual: totalGeral > 0 ? (dados.total / totalGeral) * 100 : 0
      }))
      .sort((a, b) => b.totalDebitos - a.totalDebitos);

    setDadosDebitosPorCategoria(dadosCategoria);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-500">
          <p>Erro ao carregar dados: {error}</p>
        </div>
      </div>
    );
  }

  if (dadosDebitosPorConta.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <TrendingDown className="mx-auto h-12 w-12 mb-4" />
          <p>Nenhum lançamento de débito encontrado para esta empresa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingDown className="mr-2 h-5 w-5 text-red-500" />
            Análise de Lançamentos de Débito
          </h3>
          <div className="text-right">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebitos)}</p>
            <p className="text-sm text-gray-500">Total em débitos</p>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total de Débitos</p>
                <p className="text-lg font-semibold text-red-600">{formatCurrency(totalDebitos)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total de Lançamentos</p>
                <p className="text-lg font-semibold text-blue-600">{totalLancamentos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Maior Conta</p>
                <p className="text-lg font-semibold text-orange-600 truncate" title={maiorConta}>
                  {maiorConta || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Pizza - Débitos por Conta Contábil */}
      <div className="mb-6">
        <div className="h-[450px]">
          <AnimatedPieChart
            data={dadosDebitosPorConta.slice(0, 10).map((item, index) => ({
              name: item.contaNome,
              y: item.totalDebitos,
              color: COLORS[index % COLORS.length]
            }))}
            title="Débitos por Conta Contábil"
            subtitle="Distribuição dos débitos por conta específica"
            containerId="debitos-conta-chart"
          />
        </div>
      </div>


    </div>
  );
};