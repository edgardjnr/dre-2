import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, Edit2, Trash2, CreditCard, Eye, FileText, Calendar, AlertTriangle, Menu, X } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
// Corrigir esta linha - remover duplicação
// Remover TipoDocumento do import
import { ContaPagar, Empresa, ContaContabil, ContaPagarStatus } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { ConfirmModal } from '../ui/ConfirmModal';
import { AlertModal } from '../ui/AlertModal';
import { ContaPagarForm } from './ContaPagarForm';
import { ContaPagarDetails } from './ContaPagarDetails';
import { useModal } from '../../hooks/useModal';
import { useContaPagarStatus } from './hooks/useContaPagarStatus';

export const ContasPagarList: React.FC = () => {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contasContabeis, setContasContabeis] = useState<ContaContabil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [viewingConta, setViewingConta] = useState<ContaPagar | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroContaContabil, setFiltroContaContabil] = useState('');
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // Adicionar esta linha para usar o hook useModal
  const { confirmModal, showConfirm, closeConfirm, setConfirmLoading, alertModal, showAlert, closeAlert } = useModal();
  
  // Hook para controle de status de pagamento
  const [payingContaId, setPayingContaId] = useState<string | null>(null);
  
  // Estados para o modal de comprovante
  const [showComprovanteModal, setShowComprovanteModal] = useState(false);
  const [contaParaPagar, setContaParaPagar] = useState<ContaPagar | null>(null);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contasRes, empresasRes, contasContabeisRes] = await Promise.all([
        supabase.from('contas_a_pagar').select(`
          id,
          user_id,
          empresa_id,
          fornecedor,
          descricao,
          valor,
          data_vencimento,
          data_pagamento,
          status,
          observacoes,
          numero_documento,
          foto_url,
          foto_nome,
          conta_contabil_id,
          lancamento_gerado_id,
          created_at,
          updated_at,
          conta_pagar_fotos(
            id,
            foto_url,
            foto_nome,
            ordem,
            created_at
          )
        `).order('data_vencimento', { ascending: true }),
        
        supabase.from('empresas').select('id, razao_social'),
        
        supabase.from('contas_contabeis').select(`
          id,
          empresa_id,
          codigo,
          nome,
          categoria,
          tipo,
          ativa
        `).eq('ativa', true)
      ]);

      if (contasRes.error) throw contasRes.error;
      if (empresasRes.error) throw empresasRes.error;
      if (contasContabeisRes.error) throw contasContabeisRes.error;

      // Mapear dados das contas incluindo as fotos
      const contasData = (contasRes.data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        empresaId: item.empresa_id,
        fornecedor: item.fornecedor,
        descricao: item.descricao,
        valor: item.valor,
        dataVencimento: item.data_vencimento,
        dataPagamento: item.data_pagamento,
        status: item.status,
        observacoes: item.observacoes,
        numeroDocumento: item.numero_documento,
        fotoUrl: item.foto_url, // Mantido para compatibilidade
        fotoNome: item.foto_nome, // Mantido para compatibilidade
        fotos: (item.conta_pagar_fotos || []).map(foto => ({
          id: foto.id,
          contaPagarId: item.id,
          fotoUrl: foto.foto_url,
          fotoNome: foto.foto_nome,
          ordem: foto.ordem,
          createdAt: foto.created_at
        })),
        contaContabilId: item.conta_contabil_id,
        lancamentoGeradoId: item.lancamento_gerado_id,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      const empresasData = (empresasRes.data || []).map(item => ({
        id: item.id,
        razaoSocial: item.razao_social,
        user_id: '',
        created_at: '',
        cnpj: '',
        regimeTributario: 'Simples Nacional' as const,
        dataAbertura: '',
        ativa: true
      }));

      const contasContabeisData = (contasContabeisRes.data || []).map(item => ({
        id: item.id,
        user_id: '',
        created_at: '',
        empresaId: item.empresa_id,
        codigo: item.codigo,
        nome: item.nome,
        categoria: item.categoria,
        subcategoria: null,
        tipo: item.tipo,
        ativa: item.ativa
      }));

      setContas(contasData);
      setEmpresas(empresasData);
      setContasContabeis(contasContabeisData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (conta: ContaPagar) => {
    setEditingConta(conta);
    setShowModal(true);
  };

  const handleView = (conta: ContaPagar) => {
    setViewingConta(conta);
    setShowDetailsModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const confirmed = await showConfirm({
        title: 'Confirmar Exclusão',
        message: 'Tem certeza que deseja excluir esta conta a pagar?\n\nEsta ação não pode ser desfeita.',
        type: 'danger',
        confirmText: 'Sim, Excluir',
        cancelText: 'Cancelar'
      });

      if (!confirmed) {
        closeConfirm();
        return;
      }

      console.log('Tentando excluir conta a pagar com ID:', id);
      
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
      
      // Verificar se a conta existe e pertence ao usuário
      const { data: conta, error: fetchError } = await supabase
        .from('contas_a_pagar')
        .select('id, user_id, fornecedor, descricao, lancamento_gerado_id')
        .eq('id', id)
        .single();
        
      if (fetchError) {
        console.error('Erro ao buscar conta:', fetchError);
        closeConfirm();
        await showAlert({
          title: 'Erro ao Buscar Conta',
          message: 'Não foi possível encontrar a conta a pagar.',
          type: 'error',
          details: [fetchError.message]
        });
        return;
      }
      
      if (!conta) {
        closeConfirm();
        await showAlert({
          title: 'Conta Não Encontrada',
          message: 'A conta a pagar que você está tentando excluir não foi encontrada.',
          type: 'error'
        });
        return;
      }
      
      if (conta.user_id !== user.id) {
        closeConfirm();
        await showAlert({
          title: 'Acesso Negado',
          message: 'Você não tem permissão para excluir esta conta a pagar.',
          type: 'error'
        });
        return;
      }
      
      // Remover lançamento DRE vinculado se existir
      if (conta.lancamento_gerado_id) {
        console.log('Removendo referência e lançamento DRE vinculado:', conta.lancamento_gerado_id);
        
        // Primeiro, remover a referência na conta a pagar
        const { error: updateError } = await supabase
          .from('contas_a_pagar')
          .update({ lancamento_gerado_id: null })
          .eq('id', id);
          
        if (updateError) {
          console.error('Erro ao remover referência do lançamento:', updateError);
          closeConfirm();
          await showAlert({
            title: 'Erro ao Remover Referência',
            message: 'Não foi possível remover a referência do lançamento DRE.',
            type: 'error',
            details: [updateError.message]
          });
          return;
        }
        
        // Depois, excluir o lançamento
        const { error: deleteLancamentoError } = await supabase
          .from('lancamentos')
          .delete()
          .eq('id', conta.lancamento_gerado_id);
          
        if (deleteLancamentoError) {
          console.error('Erro ao remover lançamento DRE:', deleteLancamentoError);
          closeConfirm();
          await showAlert({
            title: 'Erro ao Remover Lançamento',
            message: 'Não foi possível remover o lançamento DRE vinculado.',
            type: 'error',
            details: [deleteLancamentoError.message]
          });
          return;
        }
      }
      
      // Remover fotos vinculadas se existirem
      const { error: deleteFotosError } = await supabase
        .from('conta_pagar_fotos')
        .delete()
        .eq('conta_pagar_id', id);
        
      if (deleteFotosError) {
        console.error('Erro ao remover fotos:', deleteFotosError);
        // Continuar mesmo se houver erro ao remover fotos
      }
      
      // Executar a exclusão da conta
      const { error: deleteError } = await supabase
        .from('contas_a_pagar')
        .delete()
        .eq('id', id);
        
      if (deleteError) {
        console.error('Erro na exclusão:', deleteError);
        closeConfirm();
        
        let errorMessage = 'Ocorreu um erro ao excluir a conta a pagar.';
        let errorDetails = [deleteError.message];
        
        if (deleteError.code === '23503') {
          errorMessage = 'Esta conta está sendo referenciada por outros registros.';
          errorDetails = [
            'Verifique se há lançamentos ou outros dados vinculados a esta conta.',
            'Remova primeiro as referências antes de tentar excluir.'
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
      
      console.log('Conta a pagar excluída com sucesso');
      closeConfirm();
      
      // Atualizar a lista após exclusão bem-sucedida
      await fetchData();
      
      // Mostrar confirmação de sucesso
      await showAlert({
        title: 'Conta Excluída',
        message: 'A conta a pagar foi excluída com sucesso.',
        type: 'success'
      });
      
    } catch (error: any) {
      console.error('Erro inesperado na exclusão:', error);
      closeConfirm();
      await showAlert({
        title: 'Erro Inesperado',
        message: 'Ocorreu um erro inesperado ao excluir a conta a pagar.',
        type: 'error',
        details: [error.message]
      });
    }
  };

  const handleMarkAsPaid = async (conta: ContaPagar) => {
    if (conta.status === 'paga') return;
    
    // Mostrar modal perguntando sobre comprovante
    setContaParaPagar(conta);
    setShowComprovanteModal(true);
  };

  const processPayment = async (withComprovante: boolean) => {
    if (!contaParaPagar) return;
    
    try {
      setPayingContaId(contaParaPagar.id);
      setUploadingComprovante(true);
      
      // Obter o usuário atual primeiro
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado');
        await showAlert({
          title: 'Erro de Autenticação',
          message: 'Usuário não autenticado. Faça login novamente.',
          type: 'error'
        });
        return;
      }
      
      let comprovanteUrl = null;
      let comprovanteNome = null;
      
      // Upload do comprovante se fornecido
      if (withComprovante && comprovanteFile) {
        const fileExt = comprovanteFile.name.split('.').pop();
        const fileName = `comprovante_${contaParaPagar.id}_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contas-fotos')
          .upload(`${user.id}/${fileName}`, comprovanteFile);
          
        if (uploadError) {
          console.error('Erro ao fazer upload do comprovante:', uploadError);
          throw new Error('Erro ao fazer upload do comprovante');
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('contas-fotos')
          .getPublicUrl(`${user.id}/${fileName}`);
          
        comprovanteUrl = publicUrl;
        comprovanteNome = comprovanteFile.name;
      }
      
      const updateData = { 
        status: 'paga',
        data_pagamento: new Date().toISOString().split('T')[0],
        ...(comprovanteUrl && { foto_url: comprovanteUrl }),
        ...(comprovanteNome && { foto_nome: comprovanteNome })
      };

      const { error } = await supabase
        .from('contas_a_pagar')
        .update(updateData)
        .eq('id', contaParaPagar.id);

      if (error) throw error;

      // Buscar os dados atualizados da conta para gerar o lançamento DRE
      const { data: contaData, error: fetchError } = await supabase
        .from('contas_a_pagar')
        .select('*')
        .eq('id', contaParaPagar.id)
        .single();

      if (!fetchError && contaData) {
        if (!contaData.conta_contabil_id) {
          console.error('Conta não possui conta_contabil_id definida:', contaData);
          await showAlert({
            title: 'Erro',
            message: 'Esta conta não possui uma conta contábil associada. Por favor, edite a conta e selecione uma conta contábil.',
            type: 'error'
          });
          return;
        }

        // Obter o usuário atual
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) {
           console.error('Usuário não autenticado');
           await showAlert({
             title: 'Erro de Autenticação',
             message: 'Usuário não autenticado. Faça login novamente.',
             type: 'error'
           });
           return;
         }

         // Gerar lançamento DRE automaticamente
         const lancamentoData = {
           user_id: user.id,
           empresa_id: contaData.empresa_id,
           conta_id: contaData.conta_contabil_id,
           descricao: `Pagamento - ${contaData.fornecedor} - ${contaData.descricao}`,
           valor: contaData.valor,
           tipo: 'Débito',
           data: contaData.data_pagamento || new Date().toISOString().split('T')[0]
         };

        const { data: lancamento, error: lancamentoError } = await supabase
          .from('lancamentos')
          .insert([lancamentoData])
          .select()
          .single();

        if (!lancamentoError && lancamento) {
          // Atualizar a conta com o ID do lançamento gerado
          await supabase
            .from('contas_a_pagar')
            .update({ lancamento_gerado_id: lancamento.id })
            .eq('id', contaData.id);
          
          await showAlert({
            title: 'Sucesso',
            message: withComprovante ? 
              'Conta marcada como paga com comprovante e lançamento DRE criado com sucesso!' :
              'Conta marcada como paga e lançamento DRE criado com sucesso!',
            type: 'success'
          });
        } else {
          console.error('Erro ao criar lançamento DRE:', lancamentoError);
          await showAlert({
            title: 'Erro',
            message: 'Erro ao criar lançamento DRE: ' + (lancamentoError?.message || 'Erro desconhecido'),
            type: 'error'
          });
        }
      } else {
        console.error('Erro ao buscar dados da conta:', fetchError);
        await showAlert({
          title: 'Erro',
          message: 'Erro ao buscar dados da conta: ' + (fetchError?.message || 'Erro desconhecido'),
          type: 'error'
        });
      }

      // Fechar modal e limpar estados
      setShowComprovanteModal(false);
      setContaParaPagar(null);
      setComprovanteFile(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao marcar conta como paga:', error);
      await showAlert({
        title: 'Erro',
        message: 'Erro ao marcar conta como paga: ' + error.message,
        type: 'error'
      });
    } finally {
      setPayingContaId(null);
      setUploadingComprovante(false);
    }
  };

  const handleComprovanteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        showAlert({
          title: 'Arquivo Inválido',
          message: 'Por favor, selecione uma imagem (JPG, PNG, WEBP) ou PDF.',
          type: 'error'
        });
        return;
      }
      
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showAlert({
          title: 'Arquivo Muito Grande',
          message: 'O arquivo deve ter no máximo 5MB.',
          type: 'error'
        });
        return;
      }
      
      setComprovanteFile(file);
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

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getEmpresaNome = (empresaId: string) => 
    empresas.find(e => e.id === empresaId)?.razaoSocial || 'N/A';

  const getStatusColor = (status: string, dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    
    switch (status) {
      case 'paga':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-gray-100 text-gray-800';
      case 'vencida':
        return 'bg-red-100 text-red-800';
      case 'pendente':
        if (isBefore(vencimento, hoje)) {
          return 'bg-red-100 text-red-800'; // Vencida
        } else if (isBefore(vencimento, addDays(hoje, 7))) {
          return 'bg-yellow-100 text-yellow-800'; // Vence em breve
        }
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string, dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    
    if (status === 'pendente' && isBefore(vencimento, hoje)) {
      return 'Vencida';
    }
    
    const statusMap = {
      'pendente': 'Pendente',
      'paga': 'Paga',
      'vencida': 'Vencida',
      'cancelada': 'Cancelada'
    };
    
    return statusMap[status as keyof typeof statusMap] || status;
  };

  // Função para obter o nome da conta contábil
  const getContaContabilNome = (contaContabilId: string | null) => {
    if (!contaContabilId) return 'Não definida';
    const conta = contasContabeis.find(c => c.id === contaContabilId);
    return conta ? `${conta.codigo} - ${conta.nome}` : 'Conta não encontrada';
  };



  // Filtrar contas
  const contasFiltradas = contas.filter(conta => {
    if (filtroEmpresa && conta.empresaId !== filtroEmpresa) return false;
    if (filtroStatus && conta.status !== filtroStatus) return false;
    if (filtroContaContabil && conta.contaContabilId !== filtroContaContabil) return false;
    
    // Filtro de pesquisa por texto
    if (termoPesquisa) {
      const termo = termoPesquisa.toLowerCase();
      const fornecedor = conta.fornecedor?.toLowerCase() || '';
      const descricao = conta.descricao?.toLowerCase() || '';
      const valor = conta.valor.toString();
      const numeroDocumento = conta.numeroDocumento?.toLowerCase() || '';
      const observacoes = conta.observacoes?.toLowerCase() || '';
      const empresaNome = getEmpresaNome(conta.empresaId).toLowerCase();
      const contaContabilNome = getContaContabilNome(conta.contaContabilId).toLowerCase();
      
      const matchesSearch = fornecedor.includes(termo) ||
                           descricao.includes(termo) ||
                           valor.includes(termo) ||
                           numeroDocumento.includes(termo) ||
                           observacoes.includes(termo) ||
                           empresaNome.includes(termo) ||
                           contaContabilNome.includes(termo);
      
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  // Calcular totais
  const totalPendente = contasFiltradas
    .filter(c => c.status === 'pendente')
    .reduce((sum, c) => sum + c.valor, 0);
  
  const totalVencidas = contasFiltradas
    .filter(c => {
      const hoje = new Date();
      const vencimento = new Date(c.dataVencimento);
      return c.status === 'pendente' && isBefore(vencimento, hoje);
    })
    .reduce((sum, c) => sum + c.valor, 0);

  const fetchContas = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('contas_a_pagar')
        .select(`
          *,
          empresas!inner(id, razao_social)
        `)
        .order('data_vencimento', { ascending: true });
  
      // ... rest of the query logic ...
  } catch (error) {
    console.error('Erro ao carregar contas:', error);
    setError('Erro ao carregar contas a pagar');
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Erro ao carregar contas: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header Responsivo */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Contas a Pagar</h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </button>
          <button 
            onClick={handleAddNew} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 touch-manipulation"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo Responsivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Pendente</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(totalPendente)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Vencidas</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(totalVencidas)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total de Contas</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{contasFiltradas.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros - Desktop sempre visível, Mobile colapsável */}
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 ${showFilters ? 'block' : 'hidden sm:block'}`}>
        <div className="flex items-center justify-between mb-4 sm:hidden">
          <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
          <button
            onClick={() => setShowFilters(false)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar</label>
            <input
              type="text"
              placeholder="Buscar por fornecedor, descrição, valor..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select 
              value={filtroEmpresa} 
              onChange={(e) => setFiltroEmpresa(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            >
              <option value="">Todas as empresas</option>
              {empresas.map(empresa => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.razaoSocial}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              value={filtroStatus} 
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
              <option value="vencida">Vencida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conta Contábil</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              value={filtroContaContabil}
              onChange={(e) => setFiltroContaContabil(e.target.value)}
            >
              <option value="">Todas as contas</option>
              {contasContabeis.map(conta => (
                <option key={conta.id} value={conta.id}>
                  {conta.codigo} - {conta.nome} ({conta.categoria})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista/Tabela Responsiva */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Desktop: Tabela */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Fornecedor</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Descrição</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Conta Contábil</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Vencimento</th>
                <th className="text-right py-3 px-6 font-medium text-gray-900">Valor</th>
                <th className="text-center py-3 px-6 font-medium text-gray-900">Status</th>
                <th className="text-center py-3 px-6 font-medium text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody>
              {contasFiltradas.map((conta, index) => (
                <tr key={conta.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-3 px-6">
                    <div>
                      <p className="font-medium text-gray-900">{conta.fornecedor}</p>
                      <p className="text-xs text-gray-500">{getEmpresaNome(conta.empresaId)}</p>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <p className="text-gray-900">{conta.descricao}</p>
                    {conta.numeroDocumento && (
                      <p className="text-xs text-gray-500">Descrição: {conta.numeroDocumento}</p>
                    )}
                  </td>
                  <td className="py-3 px-6">
                    <span className="capitalize text-gray-700">{getContaContabilNome(conta.contaContabilId)}</span>
                  </td>
                  <td className="py-3 px-6">
                    <p className="text-gray-900">{format(new Date(conta.dataVencimento), 'dd/MM/yyyy')}</p>
                    {conta.dataPagamento && (
                      <p className="text-xs text-green-600">Pago em {format(new Date(conta.dataPagamento), 'dd/MM/yyyy')}</p>
                    )}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <span className="font-medium text-gray-900">{formatCurrency(conta.valor)}</span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(conta.status, conta.dataVencimento)}`}>
                      {getStatusText(conta.status, conta.dataVencimento)}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => handleView(conta)} 
                        className="p-2 text-gray-600 hover:text-blue-600"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(conta)} 
                        className="p-2 text-gray-600 hover:text-blue-600"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {conta.status === 'pendente' && (
                        <button 
                          onClick={() => handleMarkAsPaid(conta)}
                          disabled={payingContaId === conta.id}
                          className="p-2 text-gray-600 hover:text-green-600 disabled:opacity-50"
                          title="Marcar como paga"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      )}
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
                  <h3 className="text-sm font-medium text-gray-900 truncate">{conta.fornecedor}</h3>
                  <p className="text-xs text-gray-500 truncate">{getEmpresaNome(conta.empresaId)}</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${getStatusColor(conta.status, conta.dataVencimento)}`}>
                  {getStatusText(conta.status, conta.dataVencimento)}
                </span>
              </div>
              
              <div className="space-y-2 mb-3">
                <p className="text-sm text-gray-900 break-words">{conta.descricao}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Vencimento: {format(new Date(conta.dataVencimento), 'dd/MM/yyyy')}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(conta.valor)}</span>
                </div>
                
                {conta.numeroDocumento && (
                  <p className="text-xs text-gray-500">Doc: {conta.numeroDocumento}</p>
                )}
                
                {conta.dataPagamento && (
                  <p className="text-xs text-green-600">Pago em {format(new Date(conta.dataPagamento), 'dd/MM/yyyy')}</p>
                )}
              </div>
              
              <div className="flex items-center justify-end space-x-1">
                <button 
                  onClick={() => handleView(conta)} 
                  className="p-2 text-gray-600 hover:text-blue-600 touch-manipulation"
                  title="Ver detalhes"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleEdit(conta)} 
                  className="p-2 text-gray-600 hover:text-blue-600 touch-manipulation"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                {conta.status === 'pendente' && (
                  <button 
                    onClick={() => handleMarkAsPaid(conta)}
                    disabled={payingContaId === conta.id}
                    className="p-2 text-gray-600 hover:text-green-600 disabled:opacity-50 touch-manipulation"
                    title="Marcar como paga"
                  >
                    <CreditCard className="h-4 w-4" />
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(conta.id)} 
                  className="p-2 text-gray-600 hover:text-red-600 touch-manipulation"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          
          {contasFiltradas.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma conta encontrada</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou adicione uma nova conta</p>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <Modal 
        isOpen={showModal} 
        onClose={() => {
          setShowModal(false);
          setEditingConta(null);
        }}
        title={editingConta ? 'Editar Conta' : 'Nova Conta'}
        size="lg"
      >
        <ContaPagarForm 
          conta={editingConta || undefined}
          onSave={() => {
            setShowModal(false);
            setEditingConta(null);
            fetchData();
          }}
          onCancel={() => {
            setShowModal(false);
            setEditingConta(null);
          }}
        />
      </Modal>

      <Modal 
        isOpen={showDetailsModal} 
        onClose={() => {
          setShowDetailsModal(false);
          setViewingConta(null);
        }}
        title="Detalhes da Conta"
        size="xl"
      >
        {viewingConta && (
          <ContaPagarDetails 
            conta={contas.find(c => c.id === viewingConta.id) || viewingConta}
            empresa={empresas.find(e => e.id === viewingConta.empresaId)}
            onUpdate={() => {
              fetchData();
            }}
          />
        )}
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
      
      {/* Modal de Comprovante de Pagamento */}
      {showComprovanteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Marcar como Paga
                </h3>
                <button
                  onClick={() => {
                    setShowComprovanteModal(false);
                    setContaParaPagar(null);
                    setComprovanteFile(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {contaParaPagar && (
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {contaParaPagar.fornecedor}
                    </h4>
                    <p className="text-sm text-gray-600 mb-1">
                      {contaParaPagar.descricao}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(contaParaPagar.valor)}
                    </p>
                  </div>
                  
                  <p className="text-gray-700 mb-4">
                    Deseja adicionar uma foto do comprovante de pagamento?
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comprovante (opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleComprovanteFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos aceitos: JPG, PNG, WEBP, PDF (máx. 5MB)
                    </p>
                    
                    {comprovanteFile && (
                      <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-sm text-green-700">
                          📎 {comprovanteFile.name}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => processPayment(false)}
                      disabled={uploadingComprovante || payingContaId === contaParaPagar.id}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingComprovante || payingContaId === contaParaPagar.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Processando...
                        </div>
                      ) : (
                        'Pagar sem Comprovante'
                      )}
                    </button>
                    
                    <button
                      onClick={() => processPayment(true)}
                      disabled={uploadingComprovante || payingContaId === contaParaPagar.id}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingComprovante || payingContaId === contaParaPagar.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processando...
                        </div>
                      ) : (
                        comprovanteFile ? 'Pagar com Comprovante' : 'Marcar como Paga'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};