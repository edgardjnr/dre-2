import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, Edit2, Trash2, DollarSign, X, Calendar } from 'lucide-react';
import { Lancamento, Empresa, ContaContabil } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { LancamentoForm } from './LancamentoForm';

import { ConfirmModal } from '../ui/ConfirmModal';
import { AlertModal } from '../ui/AlertModal';
import { useModal } from '../../hooks/useModal';

export const LancamentosList: React.FC = () => {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contas, setContas] = useState<ContaContabil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [termoPesquisa, setTermoPesquisa] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Corrigir a query para mapear corretamente os campos
      const lancamentosPromise = supabase.from('lancamentos').select(`
        id,
        user_id,
        created_at,
        empresa_id,
        conta_id,
        data,
        descricao,
        valor,
        tipo
      `).order('data', { ascending: false });
      
      const empresasPromise = supabase.from('empresas').select(`
        id,
        razao_social
      `);
      
      const contasPromise = supabase.from('contas_contabeis').select(`
        id,
        user_id,
        created_at,
        empresa_id,
        codigo,
        nome,
        categoria,
        subcategoria,
        tipo,
        ativa
      `);
      
      const [lancamentosRes, empresasRes, contasRes] = await Promise.all([
        lancamentosPromise, 
        empresasPromise, 
        contasPromise
      ]);

      if (lancamentosRes.error) throw lancamentosRes.error;
      if (empresasRes.error) throw empresasRes.error;
      if (contasRes.error) throw contasRes.error;

      // Mapear os dados corretamente
      const lancamentosData = (lancamentosRes.data || []).map(item => ({
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

      const empresasData = (empresasRes.data || []).map(item => ({
        id: item.id,
        razaoSocial: item.razao_social,
        // Adicionar outros campos necessários com valores padrão
        user_id: '',
        created_at: '',
        cnpj: '',
        regimeTributario: 'Simples Nacional' as const,
        dataAbertura: '',
        ativa: true
      }));

      const contasData = (contasRes.data || []).map(item => ({
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

      setLancamentos(lancamentosData);
      setEmpresas(empresasData);
      setContas(contasData);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido ao carregar dados');
      console.error("Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleEdit = (lancamento: Lancamento) => {
    setEditingLancamento(lancamento);
    setShowModal(true);
  };

  const { confirmModal, showConfirm, closeConfirm, setConfirmLoading, alertModal, showAlert, closeAlert } = useModal();

  const handleDelete = async (id: string) => {
    try {
      const confirmed = await showConfirm({
        title: 'Confirmar Exclusão',
        message: 'Tem certeza que deseja excluir este lançamento?\n\nEsta ação não pode ser desfeita.',
        type: 'danger',
        confirmText: 'Sim, Excluir',
        cancelText: 'Cancelar'
      });

      if (!confirmed) {
        closeConfirm();
        return;
      }

      console.log('Tentando excluir lançamento com ID:', id);
      
      // Verificar se o usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        closeConfirm();
        await showAlert({
          title: 'Erro de Autenticação',
          message: 'Usuário não autenticado. Faça login novamente.',
          type: 'error'
        });
        return;
      }
      
      // Verificar se o lançamento existe e pertence ao usuário
      const { data: lancamento, error: fetchError } = await supabase
        .from('lancamentos')
        .select('id, user_id, descricao')
        .eq('id', id)
        .single();
        
      if (fetchError) {
        console.error('Erro ao buscar lançamento:', fetchError);
        closeConfirm();
        await showAlert({
          title: 'Erro ao Buscar Lançamento',
          message: 'Não foi possível encontrar o lançamento.',
          type: 'error',
          details: [fetchError.message]
        });
        return;
      }
      
      if (!lancamento) {
        closeConfirm();
        await showAlert({
          title: 'Lançamento Não Encontrado',
          message: 'O lançamento que você está tentando excluir não foi encontrado.',
          type: 'error'
        });
        return;
      }
      
      if (lancamento.user_id !== user.id) {
        closeConfirm();
        await showAlert({
          title: 'Acesso Negado',
          message: 'Você não tem permissão para excluir este lançamento.',
          type: 'error'
        });
        return;
      }
      
      // Verificar se o lançamento está vinculado a alguma conta a pagar
      const { data: contasVinculadas, error: contasError } = await supabase
        .from('contas_a_pagar')
        .select('id, fornecedor, descricao, valor')
        .eq('lancamento_gerado_id', id);
        
      if (contasError) {
        console.error('Erro ao verificar contas vinculadas:', contasError);
        closeConfirm();
        await showAlert({
          title: 'Erro de Verificação',
          message: 'Não foi possível verificar as vinculações do lançamento.',
          type: 'error',
          details: [contasError.message]
        });
        return;
      }
      
      // Se existem contas vinculadas, exibir modal informativo
      if (contasVinculadas && contasVinculadas.length > 0) {
        closeConfirm();
        
        const contasInfo = contasVinculadas.map(conta => 
          `${conta.fornecedor} - ${conta.descricao} (R$ ${conta.valor.toFixed(2).replace('.', ',')})`
        );
        
        await showAlert({
          title: '❌ Exclusão Não Permitida',
          message: 'Este lançamento não pode ser excluído pois está vinculado a contas a pagar.',
          type: 'warning',
          details: [
            'Contas vinculadas:',
            ...contasInfo,
            '',
            'Para excluir este lançamento:',
            '1. Acesse a seção "Contas a Pagar"',
            '2. Remova a vinculação dessas contas com este lançamento',
            '3. Ou exclua as contas a pagar vinculadas',
            '4. Após isso, você poderá excluir o lançamento'
          ]
        });
        return;
      }
      
      // Executar a exclusão se não há vinculações
      const { error: deleteError } = await supabase
        .from('lancamentos')
        .delete()
        .eq('id', id);
        
      if (deleteError) {
        console.error('Erro na exclusão:', deleteError);
        closeConfirm();
        
        let errorMessage = 'Ocorreu um erro ao excluir o lançamento.';
        let errorDetails = [deleteError.message];
        
        if (deleteError.code === '23503') {
          errorMessage = 'Este lançamento está sendo referenciado por outros registros.';
          errorDetails = [
            'Verifique se há contas a pagar ou outros dados vinculados a este lançamento.',
            'Remova primeiro as referências antes de tentar excluir.'
          ];
        } else if (deleteError.message.includes('409') || deleteError.message.includes('conflict')) {
          errorMessage = 'Conflito detectado ao excluir o lançamento.';
          errorDetails = [
            'Este lançamento está sendo usado por outros registros.',
            'Remova primeiro as referências antes de excluir.'
          ];
        }
        
        await showAlert({
          title: 'Erro na Exclusão',
          message: errorMessage,
          type: 'error',
          details: errorDetails
        });
        return;
      }
      
      console.log('Lançamento excluído com sucesso');
      closeConfirm();
      
      // Atualizar a lista após exclusão bem-sucedida
      setLancamentos(prev => prev.filter(l => l.id !== id));
      
      // Limpar qualquer erro anterior
      setError(null);
      
      // Mostrar confirmação de sucesso
      await showAlert({
        title: 'Lançamento Excluído',
        message: 'O lançamento foi excluído com sucesso.',
        type: 'success'
      });
      
    } catch (error: any) {
      console.error('Erro inesperado na exclusão:', error);
      closeConfirm();
      await showAlert({
        title: 'Erro Inesperado',
        message: 'Ocorreu um erro inesperado ao excluir o lançamento.',
        type: 'error',
        details: [error.message]
      });
    }
  };

  const handleAddNew = () => {
    setEditingLancamento(null);
    setShowModal(true);
  };

  const handleSave = () => {
    setShowModal(false);
    fetchData();
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const getContaNome = (contaId: string) => contas.find(c => c.id === contaId)?.nome || 'N/A';
  const getEmpresaNome = (empresaId: string) => empresas.find(e => e.id === empresaId)?.razaoSocial || 'N/A';

  const lancamentosFiltrados = lancamentos.filter(l => {
    if (filtroEmpresa && l.empresaId !== filtroEmpresa) return false;
    if (filtroDataInicio && l.data < filtroDataInicio) return false;
    if (filtroDataFim && l.data > filtroDataFim) return false;
    
    // Filtro de pesquisa por texto
    if (termoPesquisa) {
      const termo = termoPesquisa.toLowerCase();
      const descricao = l.descricao?.toLowerCase() || '';
      const valor = l.valor.toString();
      const contaNome = getContaNome(l.contaId).toLowerCase();
      const empresaNome = getEmpresaNome(l.empresaId).toLowerCase();
      const tipo = l.tipo.toLowerCase();
      
      const matchesSearch = descricao.includes(termo) ||
                           valor.includes(termo) ||
                           contaNome.includes(termo) ||
                           empresaNome.includes(termo) ||
                           tipo.includes(termo);
      
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  if (error) return (
    <div className="space-y-4">
      <div className="text-center text-red-500">Erro ao carregar lançamentos: {error}</div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header Responsivo */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Lançamentos Contábeis</h2>
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 touch-manipulation"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Novo Lançamento</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar</label>
            <input
              type="text"
              placeholder="Buscar por descrição, valor, conta..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select 
              value={filtroEmpresa} 
              onChange={e => setFiltroEmpresa(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as empresas</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.razaoSocial}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input 
              type="date" 
              value={filtroDataInicio} 
              onChange={e => setFiltroDataInicio(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input 
              type="date" 
              value={filtroDataFim} 
              onChange={e => setFiltroDataFim(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => { setFiltroEmpresa(''); setFiltroDataInicio(''); setFiltroDataFim(''); setTermoPesquisa(''); }} 
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 touch-manipulation text-sm h-10 w-full"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Lista/Tabela Responsiva */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Desktop: Tabela */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Conta</th>
                <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="p-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lancamentosFiltrados.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap text-sm">{new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="p-3 whitespace-nowrap text-sm">{getEmpresaNome(l.empresaId)}</td>
                  <td className="p-3 whitespace-nowrap text-sm">{getContaNome(l.contaId)}</td>
                  <td className="p-3 text-sm max-w-xs truncate">{l.descricao}</td>
                  <td className={`p-3 whitespace-nowrap text-sm text-right font-medium ${l.tipo === 'Débito' ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(l.valor)}
                  </td>
                  <td className="p-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => handleEdit(l)} 
                        className="p-2 text-gray-600 hover:text-blue-600"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(l.id)} 
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
          {lancamentosFiltrados.map((lancamento) => (
            <div key={lancamento.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(lancamento.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      lancamento.tipo === 'Débito' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {lancamento.tipo}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 break-words mb-1">{lancamento.descricao}</h3>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Empresa:</span> {getEmpresaNome(lancamento.empresaId)}
                    </p>
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Conta:</span> {getContaNome(lancamento.contaId)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2 ml-3">
                  <span className={`text-sm font-bold ${
                    lancamento.tipo === 'Débito' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(lancamento.valor)}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => handleEdit(lancamento)} 
                      className="p-2 text-gray-600 hover:text-blue-600 touch-manipulation"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(lancamento.id)} 
                      className="p-2 text-gray-600 hover:text-red-600 touch-manipulation"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Estado vazio */}
        {lancamentosFiltrados.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <DollarSign className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Nenhum lançamento encontrado</h3>
            <p className="text-sm sm:text-base text-gray-600">Ajuste os filtros ou adicione novos lançamentos.</p>
          </div>
        )}
      </div>
      
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingLancamento ? 'Editar Lançamento' : 'Novo Lançamento'} 
        size="lg"
      >
        <LancamentoForm
          lancamento={editingLancamento}
          empresas={empresas}
          contas={contas}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      </Modal>
      
      {/* Modais de Confirmação e Alerta */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.options.title}
        message={confirmModal.options.message}
        type={confirmModal.options.type}
        confirmText={confirmModal.options.confirmText}
        cancelText={confirmModal.options.cancelText}
        loading={confirmModal.loading}
      />
      <AlertModal 
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.options.title}
        message={alertModal.options.message}
        type={alertModal.options.type}
        details={alertModal.options.details}
        actionText={alertModal.options.actionText}
      />
    </div>
  );
};
