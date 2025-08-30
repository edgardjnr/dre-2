import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Filter, Search, Calendar, FileText, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Lancamento, ContaContabil, ContaCategoria } from '../../types';
import { Spinner } from '../ui/Spinner';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface LancamentosReportProps {
  empresaId: string;
  onBack: () => void;
}

interface FilterOptions {
  dataInicio: string;
  dataFim: string;
  categoria: ContaCategoria | '';
  tipo: 'Débito' | 'Crédito' | '';
  conta: string;
  valor: {
    min: string;
    max: string;
  };
}

interface LancamentoDetalhado extends Lancamento {
  conta: ContaContabil;
}

interface ResumoCategoria {
  categoria: ContaCategoria;
  debitos: number;
  creditos: number;
  saldo: number;
  quantidade: number;
}

export const LancamentosReport: React.FC<LancamentosReportProps> = ({ empresaId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoDetalhado[]>([]);
  const [contas, setContas] = useState<ContaContabil[]>([]);
  const [filteredLancamentos, setFilteredLancamentos] = useState<LancamentoDetalhado[]>([]);
  const [resumoCategoria, setResumoCategoria] = useState<ResumoCategoria[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  const [filters, setFilters] = useState<FilterOptions>({
    dataInicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    dataFim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    categoria: '',
    tipo: '',
    conta: '',
    valor: { min: '', max: '' }
  });

  useEffect(() => {
    fetchData();
  }, [empresaId]);

  useEffect(() => {
    applyFilters();
  }, [lancamentos, filters, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lancamentosRes, contasRes] = await Promise.all([
        supabase
          .from('lancamentos')
          .select(`
            id,
            user_id,
            created_at,
            empresaId:empresa_id,
            contaId:conta_id,
            data,
            descricao,
            valor,
            tipo
          `)
          .eq('empresa_id', empresaId)
          .order('data', { ascending: false }),
        supabase
          .from('contas_contabeis')
          .select(`
            id,
            user_id,
            created_at,
            empresaId:empresa_id,
            codigo,
            nome,
            categoria,
            subcategoria,
            tipo,
            ativa
          `)
          .eq('empresa_id', empresaId)
          .order('codigo')
      ]);

      if (lancamentosRes.error) throw lancamentosRes.error;
      if (contasRes.error) throw contasRes.error;

      const contasData = contasRes.data as unknown as ContaContabil[];
      const lancamentosData = lancamentosRes.data as unknown as Lancamento[];

      // Join lancamentos with contas
      const lancamentosDetalhados: LancamentoDetalhado[] = lancamentosData
        .map(lancamento => {
          const conta = contasData.find(c => c.id === lancamento.contaId);
          return conta ? { ...lancamento, conta } : null;
        })
        .filter(Boolean) as LancamentoDetalhado[];

      setLancamentos(lancamentosDetalhados);
      setContas(contasData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = lancamentos;

    // Date filter
    if (filters.dataInicio) {
      filtered = filtered.filter(l => l.data >= filters.dataInicio);
    }
    if (filters.dataFim) {
      filtered = filtered.filter(l => l.data <= filters.dataFim);
    }

    // Category filter
    if (filters.categoria) {
      filtered = filtered.filter(l => l.conta.categoria === filters.categoria);
    }

    // Type filter
    if (filters.tipo) {
      filtered = filtered.filter(l => l.tipo === filters.tipo);
    }

    // Account filter
    if (filters.conta) {
      filtered = filtered.filter(l => l.contaId === filters.conta);
    }

    // Value filter
    if (filters.valor.min) {
      filtered = filtered.filter(l => l.valor >= parseFloat(filters.valor.min));
    }
    if (filters.valor.max) {
      filtered = filtered.filter(l => l.valor <= parseFloat(filters.valor.max));
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(l => 
        l.descricao.toLowerCase().includes(search) ||
        l.conta.nome.toLowerCase().includes(search) ||
        l.conta.codigo.toLowerCase().includes(search)
      );
    }

    setFilteredLancamentos(filtered);
    setCurrentPage(1);

    // Generate category summary
    generateCategorySummary(filtered);
  };

  const generateCategorySummary = (lancamentosData: LancamentoDetalhado[]) => {
    const summary: Record<ContaCategoria, { debitos: number; creditos: number; quantidade: number }> = {} as any;

    lancamentosData.forEach(lancamento => {
      const categoria = lancamento.conta.categoria;
      
      if (!summary[categoria]) {
        summary[categoria] = { debitos: 0, creditos: 0, quantidade: 0 };
      }

      if (lancamento.tipo === 'Débito') {
        summary[categoria].debitos += lancamento.valor;
      } else {
        summary[categoria].creditos += lancamento.valor;
      }
      summary[categoria].quantidade += 1;
    });

    const resumo: ResumoCategoria[] = Object.entries(summary).map(([categoria, values]) => ({
      categoria: categoria as ContaCategoria,
      debitos: values.debitos,
      creditos: values.creditos,
      saldo: values.creditos - values.debitos,
      quantidade: values.quantidade
    }));

    setResumoCategoria(resumo);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const handleQuickFilter = (type: 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear') => {
    const today = new Date();
    let start: Date, end: Date;

    switch (type) {
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'thisYear':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case 'lastYear':
        const lastYear = new Date(today.getFullYear() - 1, 0, 1);
        start = startOfYear(lastYear);
        end = endOfYear(lastYear);
        break;
    }

    setFilters(prev => ({
      ...prev,
      dataInicio: format(start, 'yyyy-MM-dd'),
      dataFim: format(end, 'yyyy-MM-dd')
    }));
  };

  const clearFilters = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      categoria: '',
      tipo: '',
      conta: '',
      valor: { min: '', max: '' }
    });
    setSearchTerm('');
  };

  const exportData = () => {
    // This would implement actual export functionality
    console.log('Exporting data...', filteredLancamentos);
  };

  // Pagination
  const totalPages = Math.ceil(filteredLancamentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLancamentos = filteredLancamentos.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Relatório de Lançamentos</h2>
              <p className="text-gray-600 text-sm mt-1">
                Análise detalhada dos lançamentos contábeis ({filteredLancamentos.length} registros)
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </button>
            
            <button 
              onClick={exportData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, conta, código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickFilter('thisMonth')}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Este Mês
          </button>
          <button
            onClick={() => handleQuickFilter('lastMonth')}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Mês Anterior
          </button>
          <button
            onClick={() => handleQuickFilter('thisYear')}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Este Ano
          </button>
          <button
            onClick={() => handleQuickFilter('lastYear')}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Ano Anterior
          </button>
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros Avançados</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
              <input
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
              <input
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
              <select
                value={filters.categoria}
                onChange={(e) => setFilters(prev => ({ ...prev, categoria: e.target.value as ContaCategoria }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas as categorias</option>
                <option value="Receita Bruta">Receita Bruta</option>
                <option value="Deduções e Impostos">Deduções e Impostos</option>
                <option value="Custo dos Produtos Vendidos">Custo dos Produtos Vendidos</option>
                <option value="Despesas Comerciais">Despesas Comerciais</option>
                <option value="Despesas Administrativas">Despesas Administrativas</option>
                <option value="Outras Despesas Operacionais">Outras Despesas Operacionais</option>
                <option value="Receitas Financeiras">Receitas Financeiras</option>
                <option value="Despesas Financeiras">Despesas Financeiras</option>
                <option value="Impostos sobre Lucro">Impostos sobre Lucro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={filters.tipo}
                onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value as 'Débito' | 'Crédito' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os tipos</option>
                <option value="Débito">Débito</option>
                <option value="Crédito">Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Conta</label>
              <select
                value={filters.conta}
                onChange={(e) => setFilters(prev => ({ ...prev, conta: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas as contas</option>
                {contas.map(conta => (
                  <option key={conta.id} value={conta.id}>
                    {conta.codigo} - {conta.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Mín"
                  value={filters.valor.min}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    valor: { ...prev.valor, min: e.target.value }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Máx"
                  value={filters.valor.max}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    valor: { ...prev.valor, max: e.target.value }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Summary */}
      {resumoCategoria.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Resumo por Categoria</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumoCategoria.map((categoria, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">{categoria.categoria}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Débitos:</span>
                    <span className="text-red-600 font-medium">{formatCurrency(categoria.debitos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Créditos:</span>
                    <span className="text-green-600 font-medium">{formatCurrency(categoria.creditos)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                    <span className="text-gray-900 font-medium">Saldo:</span>
                    <span className={`font-semibold ${categoria.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(categoria.saldo)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Lançamentos:</span>
                    <span className="text-gray-700">{categoria.quantidade}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lançamentos Detalhados</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Data</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Conta</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Descrição</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Tipo</th>
                <th className="text-right py-3 px-6 font-medium text-gray-900">Valor</th>
                <th className="text-center py-3 px-6 font-medium text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody>
              {currentLancamentos.map((lancamento, index) => (
                <tr key={lancamento.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-3 px-6 text-gray-900">
                    {formatDate(lancamento.data)}
                  </td>
                  <td className="py-3 px-6">
                    <div>
                      <p className="text-gray-900 font-medium">{lancamento.conta.codigo}</p>
                      <p className="text-gray-600 text-xs">{lancamento.conta.nome}</p>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-gray-900 max-w-xs">
                    <div className="truncate" title={lancamento.descricao}>
                      {lancamento.descricao}
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      lancamento.tipo === 'Débito' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {lancamento.tipo}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right font-medium text-gray-900">
                    {formatCurrency(lancamento.valor)}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                      <Eye className="h-4 w-4 text-gray-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredLancamentos.length)} de {filteredLancamentos.length} registros
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              <span className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredLancamentos.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lançamento encontrado</h3>
          <p className="text-gray-600">
            Tente ajustar os filtros ou verificar se há lançamentos cadastrados no período selecionado.
          </p>
        </div>
      )}
    </div>
  );
};