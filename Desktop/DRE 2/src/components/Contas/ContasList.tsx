import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, BookOpen, Filter, X, Menu } from 'lucide-react';
import { ContaContabil, Empresa } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { ContaForm } from './ContaForm'; 

type EmpresaInfo = Pick<Empresa, 'id' | 'razaoSocial'>;

export const ContasList: React.FC = () => {
  const [contas, setContas] = useState<ContaContabil[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaContabil | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const categorias = [
    'Receita Bruta', 'Deduções e Impostos', 'Custo dos Produtos Vendidos',
    'Despesas Comerciais', 'Despesas Administrativas', 'Outras Despesas Operacionais',
    'Receitas Financeiras', 'Despesas Financeiras', 'Impostos sobre Lucro'
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const contasPromise = supabase.from('contas_contabeis').select(`
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
      `).order('codigo');
      const empresasPromise = supabase.from('empresas').select('id, razaoSocial:razao_social');
      
      const [contasRes, empresasRes] = await Promise.all([contasPromise, empresasPromise]);

      if (contasRes.error) throw contasRes.error;
      if (empresasRes.error) throw empresasRes.error;

      setContas(contasRes.data as unknown as ContaContabil[]);
      setEmpresas(empresasRes.data as EmpresaInfo[]);
    } catch (err: any) {
      setError(err.message);
      console.error("Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (conta: ContaContabil) => {
    setEditingConta(conta);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      const { error } = await supabase.from('contas_contabeis').delete().eq('id', id);
      if (error) alert(`Erro ao excluir: ${error.message}`);
      else fetchData();
    }
  };

  const handleAddNew = () => {
    setEditingConta(null);
    setShowModal(true);
  };

  const handleSave = () => {
    setShowModal(false);
    fetchData();
  };

  const getCategoriaColor = (categoria: string) => {
    const colors: { [key: string]: string } = {
      'Receita Bruta': 'bg-green-100 text-green-800',
      'Deduções e Impostos': 'bg-red-100 text-red-800',
      'Custo dos Produtos Vendidos': 'bg-orange-100 text-orange-800',
      'Despesas Comerciais': 'bg-purple-100 text-purple-800',
      'Despesas Administrativas': 'bg-blue-100 text-blue-800',
      'Outras Despesas Operacionais': 'bg-gray-100 text-gray-800',
      'Receitas Financeiras': 'bg-emerald-100 text-emerald-800',
      'Despesas Financeiras': 'bg-pink-100 text-pink-800',
      'Impostos sobre Lucro': 'bg-yellow-100 text-yellow-800'
    };
    return colors[categoria] || 'bg-gray-100 text-gray-800';
  };

  const getEmpresaNome = (empresaId: string) => {
    const empresa = empresas.find(e => e.id === empresaId);
    return empresa ? empresa.razaoSocial : 'N/A';
  };
  
  const contasFiltradas = contas.filter(conta => {
    if (filtroEmpresa && conta.empresaId !== filtroEmpresa) return false;
    if (filtroCategoria && conta.categoria !== filtroCategoria) return false;
    return true;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Erro ao carregar contas: {error}</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header Responsivo */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Plano de Contas</h2>
          <p className="text-sm sm:text-base text-gray-600">Gerencie as contas contábeis do sistema</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 touch-manipulation"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </button>
          <button 
            onClick={handleAddNew} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 touch-manipulation"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Nova Conta</span>
          </button>
        </div>
      </div>

      {/* Filtros - Desktop sempre visível, Mobile colapsável */}
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 ${showFilters ? 'block' : 'hidden sm:block'}`}>
        <div className="flex items-center justify-between mb-4 sm:hidden">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Filtros</span>
          </div>
          <button
            onClick={() => setShowFilters(false)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="hidden sm:flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 sm:hidden">Empresa</label>
            <select 
              value={filtroEmpresa} 
              onChange={(e) => setFiltroEmpresa(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as empresas</option>
              {empresas.map(empresa => (
                <option key={empresa.id} value={empresa.id}>{empresa.razaoSocial}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 sm:hidden">Categoria</label>
            <select 
              value={filtroCategoria} 
              onChange={(e) => setFiltroCategoria(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as categorias</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => { setFiltroEmpresa(''); setFiltroCategoria(''); }} 
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 touch-manipulation text-sm sm:text-base"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Lista/Tabela Responsiva */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Desktop: Tabela */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome da Conta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contasFiltradas.map((conta) => (
                <tr key={conta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{conta.codigo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conta.nome}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoriaColor(conta.categoria)}`}>
                      {conta.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getEmpresaNome(conta.empresaId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => handleEdit(conta)} 
                        className="p-2 text-gray-600 hover:text-blue-600"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(conta.id)} 
                        className="p-2 text-gray-600 hover:text-red-600"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet: Cards */}
        <div className="lg:hidden divide-y divide-gray-200">
          {contasFiltradas.map((conta) => (
            <div key={conta.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                      {conta.codigo}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoriaColor(conta.categoria)}`}>
                      {conta.categoria}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 break-words">{conta.nome}</h3>
                  <p className="text-xs text-gray-500 mt-1">{getEmpresaNome(conta.empresaId)}</p>
                </div>
                <div className="flex items-center space-x-1 ml-3">
                  <button 
                    onClick={() => handleEdit(conta)} 
                    className="p-2 text-gray-600 hover:text-blue-600 touch-manipulation"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(conta.id)} 
                    className="p-2 text-gray-600 hover:text-red-600 touch-manipulation"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Estado vazio */}
        {contasFiltradas.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Nenhuma conta encontrada</h3>
            <p className="text-sm sm:text-base text-gray-600">Ajuste os filtros ou adicione novas contas.</p>
          </div>
        )}
      </div>
      
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingConta ? 'Editar Conta Contábil' : 'Nova Conta Contábil'} 
        size="lg"
      >
        <ContaForm 
          conta={editingConta}
          empresas={empresas as unknown as Empresa[]}
          contas={contas}
          onSave={handleSave} 
          onClose={() => setShowModal(false)} 
        />
      </Modal>
    </div>
  );
};
