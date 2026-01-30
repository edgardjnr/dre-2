import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, Edit2, Trash2, CreditCard, Eye, FileText, Calendar, AlertTriangle, Menu, X, ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpDown } from 'lucide-react';
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
import { BarcodeScanner } from './BarcodeScanner';
import { useModal } from '../../hooks/useModal';
import { useContaPagarStatus } from './hooks/useContaPagarStatus';
import { applyDateMask, isValidDate, convertToISODate, convertFromISODate } from '../../utils/dateUtils';
import { DatePicker } from '../ui/DatePicker';

// Função para formatar data para o banco de dados sem problemas de timezone
const formatDateForDatabase = (dateString: string): string => {
  if (!dateString) return '';
  
  // Se a data já está no formato YYYY-MM-DD, retorna como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Cria a data com horário fixo para evitar problemas de timezone
  const date = new Date(dateString + 'T00:00:00');
  return date.toISOString().split('T')[0];
};

// Função para formatar data para exibição sem problemas de timezone
const formatDateForDisplay = (dateString: string): Date => {
  if (!dateString) return new Date();
  // Adiciona horário fixo para evitar problemas de timezone na exibição
  return new Date(dateString + 'T00:00:00');
};

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

  const [filtroStatus, setFiltroStatus] = useState('');
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [debouncedTermoPesquisa, setDebouncedTermoPesquisa] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  
  // Estados para datas formatadas dd/mm/yyyy
  const [filtroDataInicioFormatada, setFiltroDataInicioFormatada] = useState('');
  const [filtroDataFimFormatada, setFiltroDataFimFormatada] = useState('');

  // Estados de ordenação
  const [campoOrdenacao, setCampoOrdenacao] = useState<string>('');
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<'asc' | 'desc'>('asc');

  // Adicionar esta linha para usar o hook useModal
  const { confirmModal, showConfirm, closeConfirm, setConfirmLoading, alertModal, showAlert, closeAlert } = useModal();
  
  // Hook para controle de status de pagamento
  const [payingContaId, setPayingContaId] = useState<string | null>(null);
  
  // Estados para o modal de comprovante
  const [showComprovanteModal, setShowComprovanteModal] = useState(false);
  const [contaParaPagar, setContaParaPagar] = useState<ContaPagar | null>(null);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  // Data de Pagamento no modal "Marcar como Paga"
  const [dataPagamentoFormatada, setDataPagamentoFormatada] = useState<string>('');
  const [dataPagamentoISO, setDataPagamentoISO] = useState<string>('');

  useEffect(() => {
    if (showComprovanteModal) {
      const todayIso = new Date().toISOString().split('T')[0];
      setDataPagamentoISO(todayIso);
      setDataPagamentoFormatada(convertFromISODate(todayIso));
    } else {
      setDataPagamentoISO('');
      setDataPagamentoFormatada('');
    }
  }, [showComprovanteModal]);
  
  // Estado para controle da cópia do código
  const [copiandoCodigo, setCopiandoCodigo] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Estados para controle do scanner de código de barras
  const [scannerAtivo, setScannerAtivo] = useState(false);
  const [scannerPermissaoNegada, setScannerPermissaoNegada] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [contaParaScanner, setContaParaScanner] = useState<ContaPagar | null>(null);
  
  // Estados para o botão de ordenação móvel
  const [showMobileSortModal, setShowMobileSortModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [fetchLimit, setFetchLimit] = useState(1000);
  const [serverSearching, setServerSearching] = useState(false);
  const toDate = (value?: string) => {
    if (!value) return null;
    const d = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  };
  const formatDateSafe = (value?: string, pattern: string = 'dd/MM/yyyy') => {
    const d = toDate(value);
    return d ? format(d, pattern) : '-';
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTermoPesquisa(termoPesquisa);
    }, 3000);
    return () => clearTimeout(timer);
  }, [termoPesquisa]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setServerSearching(!!debouncedTermoPesquisa && debouncedTermoPesquisa.trim().length >= 2);
    try {
      const baseQuery = supabase.from('contas_a_pagar').select(`
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
        `, { count: 'exact' });

      const term = (debouncedTermoPesquisa || '').trim();
      const contasQuery = term.length >= 2
        ? baseQuery.or(
            `fornecedor.ilike.%${term}%,descricao.ilike.%${term}%,numero_documento.ilike.%${term}%,observacoes.ilike.%${term}%`
          )
        : baseQuery;

      const [contasRes, empresasRes, contasContabeisRes] = await Promise.all([
        contasQuery.order('created_at', { ascending: false }).range(0, fetchLimit - 1),
        
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
        createdAt: item.created_at,
        updatedAt: item.updated_at
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
      setTotalCount(contasRes.count || 0);
      setEmpresas(empresasData);
      setContasContabeis(contasContabeisData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchLimit, debouncedTermoPesquisa]);

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
        .select('id, user_id, fornecedor, descricao, lancamento_gerado_id, foto_url')
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
      
      const extractStorageKey = (value: string): string | null => {
        const url = String(value || '').trim();
        if (!url) return null;
        if (url.startsWith('data:')) return null;
        if (url.startsWith('http')) {
          const m = url.match(/\/contas-fotos\/(.+)$/);
          return m?.[1] || null;
        }
        return url;
      };

      const { data: fotosData } = await supabase
        .from('conta_pagar_fotos')
        .select('foto_url')
        .eq('conta_pagar_id', id);

      const storageKeys: string[] = [];
      for (const f of (fotosData || [])) {
        const k = extractStorageKey((f as any).foto_url);
        if (k) storageKeys.push(k);
      }
      if ((conta as any).foto_url) {
        const k = extractStorageKey((conta as any).foto_url as string);
        if (k) storageKeys.push(k);
      }

      if (storageKeys.length) {
        const { error: storageDeleteError } = await supabase.storage
          .from('contas-fotos')
          .remove(storageKeys);
        if (storageDeleteError) {
          console.error('Erro ao remover imagens do storage:', storageDeleteError);
        }
      }

      const { error: deleteFotosError } = await supabase
        .from('conta_pagar_fotos')
        .delete()
        .eq('conta_pagar_id', id);
      
      if (deleteFotosError) {
        console.error('Erro ao remover fotos:', deleteFotosError);
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
        const filePath = `${user.id}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contas-fotos')
          .upload(filePath, comprovanteFile);
          
        if (uploadError) {
          console.error('Erro ao fazer upload do comprovante:', uploadError);
          throw new Error('Erro ao fazer upload do comprovante');
        }

        comprovanteUrl = filePath;
        comprovanteNome = comprovanteFile.name;
      }
      
      // Validação: data de pagamento obrigatória
      if (!dataPagamentoISO || !isValidDate(convertFromISODate(dataPagamentoISO))) {
        await showAlert({
          title: 'Data de Pagamento Inválida',
          message: 'Informe uma data de pagamento válida no formato dd/mm/yyyy.',
          type: 'error'
        });
        setUploadingComprovante(false);
        setPayingContaId(null);
        return;
      }

      const updateData = { 
        status: 'paga',
        data_pagamento: dataPagamentoISO,
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
      // Validar tipo de arquivo - apenas imagens
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(fileExtension)) {
        showAlert({
          title: 'Arquivo Inválido',
          message: 'Por favor, selecione apenas arquivos de imagem (JPG, JPEG, PNG, WEBP).',
          type: 'error'
        });
        // Limpar a seleção
        e.target.value = '';
        setComprovanteFile(null);
        return;
      }
      
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showAlert({
          title: 'Arquivo Muito Grande',
          message: 'O arquivo deve ter no máximo 5MB.',
          type: 'error'
        });
        // Limpar a seleção
        e.target.value = '';
        setComprovanteFile(null);
        return;
      }
      
      setComprovanteFile(file);
    }
  };

  const handleAddNew = () => {
    setEditingConta(null);
    setShowModal(true);
    
    // Configurar a função global para o scanner
    window.openBarcodeScanner = () => {
      setScannerAtivo(true);
      setScannerError(null);
      setScannerPermissaoNegada(false);
    };
    
    // Configurar a função global para receber dados do scanner
    window.setBarcodeData = (codigo: string) => {
      // Esta função será chamada quando o código for detectado
      const event = new CustomEvent('barcodeDetected', { detail: codigo });
      window.dispatchEvent(event);
    };
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

  // Função para ordenação
  const handleSort = (campo: string) => {
    if (campoOrdenacao === campo) {
      // Se já está ordenando por este campo, inverte a direção
      setDirecaoOrdenacao(direcaoOrdenacao === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é um novo campo, define como ascendente
      setCampoOrdenacao(campo);
      setDirecaoOrdenacao('asc');
    }
  };

  // Função para copiar o código da conta
  const handleCopyCode = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiedCode(codigo);
      
      // Limpar o feedback após 2 segundos
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar código:', error);
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = codigo;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedCode(codigo);
        setTimeout(() => {
          setCopiedCode(null);
        }, 2000);
      } catch (fallbackError) {
        console.error('Erro no fallback de cópia:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };



  // Filtrar e ordenar contas
  const contasFiltradas = contas.filter(conta => {
    // Lógica corrigida para filtro de status
    if (filtroStatus) {
      const hoje = new Date();
      const vencimento = formatDateForDisplay(conta.dataVencimento);
      
      if (filtroStatus === 'vencida') {
        // Mostrar apenas contas pendentes que estão vencidas
        if (!(conta.status === 'pendente' && isBefore(vencimento, hoje))) {
          return false;
        }
      } else if (filtroStatus === 'pendente') {
        // Mostrar apenas contas pendentes que NÃO estão vencidas
        if (!(conta.status === 'pendente' && !isBefore(vencimento, hoje))) {
          return false;
        }
      } else {
        // Para outros status (paga, cancelada), usar comparação direta
        if (conta.status !== filtroStatus) return false;
      }
    }
    
    // Filtro por período de datas
    if (filtroDataInicio || filtroDataFim) {
      const dataVencimento = formatDateForDisplay(conta.dataVencimento);
      
      if (filtroDataInicio) {
        const dataInicio = new Date(filtroDataInicio);
        if (isBefore(dataVencimento, dataInicio)) return false;
      }
      
      if (filtroDataFim) {
        const dataFim = new Date(filtroDataFim);
        if (isAfter(dataVencimento, dataFim)) return false;
      }
    }
    
    // Filtro de pesquisa por texto
  if (debouncedTermoPesquisa && !serverSearching) {
      const termo = debouncedTermoPesquisa.toLowerCase();
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
  }).sort((a, b) => {
    if (!campoOrdenacao) return 0;
    
    let valorA: any;
    let valorB: any;
    
    switch (campoOrdenacao) {
      case 'fornecedor':
        valorA = a.fornecedor?.toLowerCase() || '';
        valorB = b.fornecedor?.toLowerCase() || '';
        break;
      case 'descricao':
        valorA = a.descricao?.toLowerCase() || '';
        valorB = b.descricao?.toLowerCase() || '';
        break;
      case 'contaContabil':
        valorA = getContaContabilNome(a.contaContabilId).toLowerCase();
        valorB = getContaContabilNome(b.contaContabilId).toLowerCase();
        break;
      case 'vencimento':
        valorA = new Date(a.dataVencimento);
        valorB = new Date(b.dataVencimento);
        break;
      case 'criado':
        valorA = toDate(a.createdAt)?.getTime() ?? 0;
        valorB = toDate(b.createdAt)?.getTime() ?? 0;
        break;
      case 'valor':
        valorA = a.valor;
        valorB = b.valor;
        break;
      case 'status':
        // Ordenação por prioridade: pendente > vencida > paga
        const statusPrioridade = { 'pendente': 3, 'vencida': 2, 'paga': 1, 'cancelada': 0 };
        valorA = statusPrioridade[a.status as keyof typeof statusPrioridade] || 0;
        valorB = statusPrioridade[b.status as keyof typeof statusPrioridade] || 0;
        break;
      default:
        return 0;
    }
    
    if (valorA < valorB) {
      return direcaoOrdenacao === 'asc' ? -1 : 1;
    }
    if (valorA > valorB) {
      return direcaoOrdenacao === 'asc' ? 1 : -1;
    }
    return 0;
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
    <div className="w-full max-w-full min-w-0 space-y-3 sm:space-y-4 lg:space-y-6 px-1 xs:px-2 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 overflow-x-hidden overflow-y-visible">
      {/* Header Responsivo */}
      <div className="w-full flex flex-col gap-3 overflow-hidden">
        <div className="w-full min-w-0">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Contas a Pagar</h2>
        </div>
        <div className="w-full flex flex-col xs:flex-row gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden w-full xs:flex-1 flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 text-sm min-w-0"
          >
            <Filter className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
            <span className="truncate">Filtros</span>
          </button>
          <div className="flex gap-2 w-full xs:flex-1">
            <button 
              onClick={handleAddNew} 
              className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1.5 touch-manipulation text-sm min-w-0"
            >
              <Plus className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">Nova Conta</span>
            </button>
            <button 
              onClick={() => {
                setScannerAtivo(true);
                setScannerError(null);
                setScannerPermissaoNegada(false);
              }} 
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center touch-manipulation text-sm flex-shrink-0"
              title="Escanear código de barras"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M12 12v4m6-4h.01M12 8h.01M12 8h4.01M12 8h-4.01" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo Responsivos */}
      <div className="w-full grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0 overflow-hidden">
        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 min-w-0 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Pendente</p>
              <p className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 truncate">{formatCurrency(totalPendente)}</p>
            </div>
          </div>
        </div>

        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 min-w-0 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Vencidas</p>
              <p className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 truncate">{formatCurrency(totalVencidas)}</p>
            </div>
          </div>
        </div>

        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 xs:col-span-2 lg:col-span-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total de Contas</p>
              <p className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 truncate">{contasFiltradas.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros - Desktop sempre visível, Mobile colapsável */}
      <div className={`w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 min-w-0 overflow-hidden ${showFilters ? 'block' : 'hidden sm:block'}`}>
        <div className="flex items-center justify-between mb-3 sm:hidden">
          <h3 className="text-base font-medium text-gray-900 truncate">Filtros</h3>
          <button
            onClick={() => setShowFilters(false)}
            className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="w-full space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 min-w-0 overflow-hidden">
          <div className="w-full sm:col-span-2 lg:col-span-1 min-w-0">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 truncate">Pesquisar</label>
            <input
              type="text"
              placeholder="Buscar por fornecedor, descrição..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              className="w-full min-w-0 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          
          <div className="w-full min-w-0">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 truncate">Status</label>
            <select 
              value={filtroStatus} 
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full min-w-0 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
              <option value="vencida">Vencida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          
          <div className="w-full min-w-0">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 truncate">Data Início</label>
            <DatePicker
              value={filtroDataInicioFormatada}
              onChange={(value) => {
                setFiltroDataInicioFormatada(value);
              }}
              onISOChange={(isoValue) => {
                setFiltroDataInicio(isoValue);
                
                // Se há data fim definida e a nova data início é maior, limpar data fim
                if (filtroDataFim && isoValue && new Date(isoValue) > new Date(filtroDataFim)) {
                  setFiltroDataFim('');
                  setFiltroDataFimFormatada('');
                }
              }}
              placeholder="dd/mm/yyyy"
              className="w-full min-w-0 text-sm bg-white"
            />
          </div>
          
          <div className="w-full min-w-0">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 truncate">Data Fim</label>
            <DatePicker
              value={filtroDataFimFormatada}
              onChange={(value) => {
                setFiltroDataFimFormatada(value);
              }}
              onISOChange={(isoValue) => {
                setFiltroDataFim(isoValue);
                
                // Se há data início definida e a nova data fim é menor, limpar data início
                if (filtroDataInicio && isoValue && new Date(isoValue) < new Date(filtroDataInicio)) {
                  setFiltroDataInicio('');
                  setFiltroDataInicioFormatada('');
                }
              }}
              placeholder="dd/mm/yyyy"
              className="w-full min-w-0 text-sm bg-white"
            />
          </div>
        </div>
      </div>

      {/* Lista/Tabela Responsiva */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Desktop: Tabela */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[15%] min-w-[120px]">
                  <button
                    onClick={() => handleSort('fornecedor')}
                    className="flex items-center justify-between w-full text-left py-3 px-4 font-medium text-gray-900 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 rounded-md group"
                  >
                    <span className="group-hover:text-blue-600 transition-colors">Fornecedor</span>
                    {campoOrdenacao === 'fornecedor' ? (
                      direcaoOrdenacao === 'asc' ? 
                        <ChevronUp className="w-4 h-4 text-blue-600" /> : 
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                  </button>
                </th>
                <th className="w-[20%] min-w-[150px]">
                  <button
                    onClick={() => handleSort('descricao')}
                    className="flex items-center justify-between w-full text-left py-3 px-4 font-medium text-gray-900 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 rounded-md group"
                  >
                    <span className="group-hover:text-blue-600 transition-colors">Descrição</span>
                    {campoOrdenacao === 'descricao' ? (
                      direcaoOrdenacao === 'asc' ? 
                        <ChevronUp className="w-4 h-4 text-blue-600" /> : 
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                  </button>
                </th>
                <th className="w-[15%] min-w-[120px]">
                  <button
                    onClick={() => handleSort('contaContabil')}
                    className="flex items-center justify-between w-full text-left py-3 px-4 font-medium text-gray-900 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 rounded-md group"
                  >
                    <span className="group-hover:text-blue-600 transition-colors">Conta Contábil</span>
                    {campoOrdenacao === 'contaContabil' ? (
                      direcaoOrdenacao === 'asc' ? 
                        <ChevronUp className="w-4 h-4 text-blue-600" /> : 
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                  </button>
                </th>
                <th className="w-[12%] min-w-[100px]">
                  <button
                    onClick={() => handleSort('vencimento')}
                    className="flex items-center justify-between w-full text-left py-3 px-4 font-medium text-gray-900 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 rounded-md group"
                  >
                    <span className="group-hover:text-blue-600 transition-colors">Vencimento</span>
                    {campoOrdenacao === 'vencimento' ? (
                      direcaoOrdenacao === 'asc' ? 
                        <ChevronUp className="w-4 h-4 text-blue-600" /> : 
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                  </button>
                </th>
                <th className="w-[12%] min-w-[120px]">
                  <button
                    onClick={() => handleSort('criado')}
                    className="flex items-center justify-between w-full text-left py-3 px-4 font-medium text-gray-900 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 rounded-md group"
                  >
                    <span className="group-hover:text-blue-600 transition-colors">Criado em</span>
                    {campoOrdenacao === 'criado' ? (
                      direcaoOrdenacao === 'asc' ? 
                        <ChevronUp className="w-4 h-4 text-blue-600" /> : 
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                  </button>
                </th>
                <th className="w-[12%] min-w-[100px]">
                  <button
                    onClick={() => handleSort('valor')}
                    className="flex items-center justify-between w-full text-right py-3 px-4 font-medium text-gray-900 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 rounded-md group"
                  >
                    <span className="group-hover:text-blue-600 transition-colors">Valor</span>
                    {campoOrdenacao === 'valor' ? (
                      direcaoOrdenacao === 'asc' ? 
                        <ChevronUp className="w-4 h-4 text-blue-600" /> : 
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                  </button>
                </th>
                <th className="w-[10%] min-w-[80px]">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center justify-between w-full text-center py-3 px-4 font-medium text-gray-900 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 rounded-md group"
                  >
                    <span className="group-hover:text-blue-600 transition-colors">Status</span>
                    {campoOrdenacao === 'status' ? (
                      direcaoOrdenacao === 'asc' ? 
                        <ChevronUp className="w-4 h-4 text-blue-600" /> : 
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                  </button>
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-900 w-[16%] min-w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {contasFiltradas.map((conta, index) => (
                <tr key={conta.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-3 px-4 max-w-0">
                    <div className="overflow-hidden">
                      <p className="font-medium text-gray-900 truncate">{conta.fornecedor}</p>
                      <p className="text-xs text-gray-500 truncate">{getEmpresaNome(conta.empresaId)}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-0">
                    <div className="overflow-hidden">
                      <p className="text-gray-900 truncate" title={conta.descricao}>{conta.descricao}</p>
                      {conta.numeroDocumento && (
                        <p className="text-xs text-gray-500 truncate" title={conta.numeroDocumento}>CÓD: {conta.numeroDocumento}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-0">
                    <span className="capitalize text-gray-700 truncate block" title={getContaContabilNome(conta.contaContabilId)}>{getContaContabilNome(conta.contaContabilId)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="overflow-hidden">
                      <p className="text-gray-900 text-sm">{format(formatDateForDisplay(conta.dataVencimento), 'dd/MM/yyyy')}</p>
                      {conta.status === 'paga' && conta.dataPagamento && (
                        <p className="text-xs text-green-600 truncate">Pago em {format(formatDateForDisplay(conta.dataPagamento), 'dd/MM/yyyy')}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="overflow-hidden">
                      <p className="text-gray-900 text-sm">{formatDateSafe(conta.createdAt, 'dd/MM/yyyy')}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium text-gray-900 text-sm">{formatCurrency(conta.valor)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(conta.status, conta.dataVencimento)}`}>
                      {getStatusText(conta.status, conta.dataVencimento)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center space-x-1 flex-wrap">
                      <button 
                        onClick={() => handleView(conta)} 
                        className="p-1.5 text-gray-600 hover:text-blue-600 flex-shrink-0"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(conta)} 
                        className="p-1.5 text-gray-600 hover:text-blue-600 flex-shrink-0"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {conta.status === 'pendente' && (
                        <button 
                          onClick={() => handleMarkAsPaid(conta)}
                          disabled={payingContaId === conta.id}
                          className="p-1.5 text-gray-600 hover:text-green-600 disabled:opacity-50 flex-shrink-0"
                          title="Marcar como paga"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(conta.id)} 
                        className="p-1.5 text-gray-600 hover:text-red-600 flex-shrink-0"
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

        {/* Mobile/Tablet: Cards Modernos */}
        <div className="lg:hidden flex flex-col items-center space-y-3 px-1 sm:px-2 py-2 sm:py-4 sm:space-y-4 overflow-x-hidden relative">
          {/* Botão de Ordenação Móvel */}
          <button
            onClick={() => setShowMobileSortModal(true)}
            className="lg:hidden fixed bottom-20 right-4 z-40 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            title="Ordenar lista"
          >
            <ArrowUpDown className="h-5 w-5" />
          </button>
          {contasFiltradas.map((conta) => {
            const isVencida = conta.status === 'pendente' && isBefore(formatDateForDisplay(conta.dataVencimento), new Date());
            const isProximaVencimento = conta.status === 'pendente' && isAfter(formatDateForDisplay(conta.dataVencimento), new Date()) && isBefore(formatDateForDisplay(conta.dataVencimento), addDays(new Date(), 7));
            
            return (
              <div 
                key={conta.id} 
                className={`relative bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border transition-all duration-300 hover:shadow-lg sm:hover:shadow-xl hover:-translate-y-1 overflow-hidden w-full max-w-[310px] mx-auto ${
                  isVencida ? 'border-red-200 bg-gradient-to-br from-red-50 to-white' :
                  isProximaVencimento ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white' :
                  conta.status === 'paga' ? 'border-green-200 bg-gradient-to-br from-green-50 to-white' :
                  'border-gray-200 bg-gradient-to-br from-blue-50 to-white'
                }`}
                style={{ maxWidth: 'min(310px, calc(100vw - 8px))' }}
              >
                {/* Indicador de urgência */}
                {isVencida && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-l-[30px] sm:border-l-[40px] border-l-transparent border-t-[30px] sm:border-t-[40px] border-t-red-500">
                    <AlertTriangle className="absolute -top-6 sm:-top-8 -right-6 sm:-right-8 h-3 w-3 sm:h-4 sm:w-4 text-white transform rotate-45" />
                  </div>
                )}
                {isProximaVencimento && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-l-[30px] sm:border-l-[40px] border-l-transparent border-t-[30px] sm:border-t-[40px] border-t-amber-500">
                    <Calendar className="absolute -top-6 sm:-top-8 -right-6 sm:-right-8 h-3 w-3 sm:h-4 sm:w-4 text-white transform rotate-45" />
                  </div>
                )}
                
                {/* Header do card com avatar */}
                <div className="p-3 sm:p-5 pb-0">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      {/* Avatar do fornecedor */}
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-md ${
                        isVencida ? 'bg-gradient-to-br from-red-500 to-red-600' :
                        isProximaVencimento ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                        conta.status === 'paga' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                        'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        {conta.fornecedor.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate mb-1">{conta.fornecedor}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate flex items-center">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full mr-1.5 sm:mr-2"></span>
                          {getEmpresaNome(conta.empresaId)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status badge elegante */}
                    <div className="flex flex-col items-end space-y-1 sm:space-y-2">
                      <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-full shadow-sm ${
                        conta.status === 'paga' ? 'bg-green-100 text-green-800 border border-green-200' :
                        isVencida ? 'bg-red-100 text-red-800 border border-red-200' :
                        isProximaVencimento ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1.5 sm:mr-2 ${
                          conta.status === 'paga' ? 'bg-green-500' :
                          isVencida ? 'bg-red-500' :
                          isProximaVencimento ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`}></span>
                        <span className="hidden sm:inline">{getStatusText(conta.status, conta.dataVencimento)}</span>
                        <span className="sm:hidden">{conta.status === 'paga' ? 'Paga' : isVencida ? 'Vencida' : 'Pendente'}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Seção de informações principais */}
                <div className="px-3 sm:px-5 pb-3 sm:pb-4">
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border border-white/50">
                    <div className="mb-2 sm:mb-3">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Descrição</label>
                      <p className="text-xs sm:text-sm font-medium text-gray-900 mt-1 leading-relaxed line-clamp-2">{conta.descricao}</p>
                    </div>
                    
                    {/* Blocos de informações principais - Vertical */}
                    <div className="flex flex-col space-y-1 sm:space-y-2">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded p-1 sm:p-1.5 border border-gray-200 w-full">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                          <Calendar className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5" />
                          <span className="text-xs">Vencimento</span>
                        </label>
                        <p className={`text-xs font-bold leading-tight ${
                          isVencida ? 'text-red-600' :
                          isProximaVencimento ? 'text-amber-600' :
                          'text-gray-900'
                        }`}>
                          {format(formatDateForDisplay(conta.dataVencimento), 'dd/MM/yy')}
                        </p>
                        {isVencida && (
                          <p className="text-xs text-red-500 font-medium leading-tight">Vencida</p>
                        )}
                        {isProximaVencimento && (
                          <p className="text-xs text-amber-600 font-medium leading-tight">Próximo vencimento</p>
                        )}
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-1 sm:p-1.5 border border-green-200 w-full">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                          <span className="text-green-600 mr-0.5 text-xs">R$</span>
                          <span className="text-xs">Valor</span>
                        </label>
                        <p className="text-xs font-bold text-green-700 leading-tight">{formatCurrency(conta.valor)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Informações secundárias - Compacto */}
                  <div className="space-y-1">
                    {conta.numeroDocumento && (
                      <div 
                        className="flex items-center justify-between py-1 px-1.5 bg-gray-50 rounded border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                        onClick={() => handleCopyCode(conta.numeroDocumento!)}
                        title="Clique para copiar o código"
                      >
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                          <FileText className="w-2 h-2 mr-0.5" />
                          <span className="text-xs">CÓD</span>
                        </span>
                        <span className={`text-xs font-medium truncate ml-1 transition-colors duration-200 ${
                          copiedCode === conta.numeroDocumento 
                            ? 'text-green-600' 
                            : 'text-gray-900'
                        }`}>
                          {copiedCode === conta.numeroDocumento ? 'Copiado!' : conta.numeroDocumento}
                        </span>
                      </div>
                    )}
                    
                    {conta.status === 'paga' && conta.dataPagamento && (
                      <div className="flex items-center justify-between py-1 px-1.5 bg-green-50 rounded border border-green-200">
                        <span className="text-xs font-medium text-green-600 uppercase tracking-wide flex items-center">
                          <Calendar className="w-2 h-2 mr-0.5" />
                          <span className="text-xs">Pago</span>
                        </span>
                        <span className="text-xs font-bold text-green-700">{format(formatDateForDisplay(conta.dataPagamento), 'dd/MM/yy')}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between py-1 px-1.5 bg-blue-50 rounded border border-blue-200">
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                        <span className="text-xs">Conta</span>
                      </span>
                      <span className="text-xs font-medium text-blue-800 truncate ml-1 max-w-[100px]" title={getContaContabilNome(conta.contaContabilId)}>
                        {getContaContabilNome(conta.contaContabilId)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Divisor elegante - Compacto */}
                <div className="mx-2 border-t border-gray-200"></div>
                
                {/* Botões de ação modernos - Grid 2x2 */}
                <div className="p-3 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleView(conta)} 
                      className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
                      title="Ver detalhes"
                    >
                      <Eye className="h-3 w-3" />
                      <span className="text-xs">Ver</span>
                    </button>
                    
                    <button 
                      onClick={() => handleEdit(conta)} 
                      className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded shadow-md hover:shadow-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:scale-105"
                      title="Editar"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span className="text-xs">Editar</span>
                    </button>
                    
                    {conta.status === 'pendente' && (
                      <button 
                        onClick={() => handleMarkAsPaid(conta)}
                        disabled={payingContaId === conta.id}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white rounded shadow-md hover:shadow-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                        title="Marcar como paga"
                      >
                        <CreditCard className="h-3 w-3" />
                        <span className="text-xs">Pagar</span>
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleDelete(conta.id)} 
                      className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gradient-to-r from-red-500 to-red-600 text-white rounded shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105"
                      title="Excluir"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="text-xs">Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {contasFiltradas.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma conta encontrada</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou adicione uma nova conta</p>
            </div>
          )}
        </div>
      </div>

      {/* Paginação / Carregar mais */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Mostrando {contas.length} de {totalCount} contas
        </div>
        <button
          onClick={() => setFetchLimit(prev => Math.min(prev + 1000, (totalCount || prev) ))}
          disabled={contas.length >= totalCount || loading}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Carregar mais
        </button>
      </div>

      {/* Scanner de código de barras - Renderizado fora do modal */}
      {scannerAtivo && (
        <BarcodeScanner 
          scannerAtivo={scannerAtivo}
          scannerPermissaoNegada={scannerPermissaoNegada}
          scannerError={scannerError}
          onBarcodeDetected={(codigo: string) => {
            // Callback para quando o código for detectado
            if (contaParaScanner) {
              // Aqui você pode implementar a lógica para atualizar a conta
              console.log('Código detectado para conta:', contaParaScanner.id, 'Código:', codigo);
            }
            setScannerAtivo(false);
            setContaParaScanner(null);
          }}
          onClose={() => {
            setScannerAtivo(false);
            setContaParaScanner(null);
            setScannerError(null);
            setScannerPermissaoNegada(false);
          }}
        />
      )}

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
        size="fullscreen"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-x-hidden">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">
                  Marcar como Paga
                </h3>
                <button
                  onClick={() => {
                    setShowComprovanteModal(false);
                    setContaParaPagar(null);
                    setComprovanteFile(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              
              {contaParaPagar && (
                <div className="mb-4 sm:mb-6">
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                    <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base truncate">
                      {contaParaPagar.fornecedor}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1 break-words">
                      {contaParaPagar.descricao}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                      {formatCurrency(contaParaPagar.valor)}
                    </p>
                  </div>
                  
                  <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
                    Deseja adicionar uma foto do comprovante de pagamento?
                  </p>

                  {/* Data de Pagamento */}
                  <div className="mb-3 sm:mb-4">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Data de Pagamento *
                    </label>
                    <DatePicker
                      value={dataPagamentoFormatada}
                      onChange={(value) => {
                        setDataPagamentoFormatada(value);
                      }}
                      onISOChange={(isoValue) => {
                        setDataPagamentoISO(isoValue);
                      }}
                      placeholder="dd/mm/yyyy"
                      className="w-full text-sm"
                    />
                  </div>
                  
                  {/* Comprovante */}
                  <div className="mb-3 sm:mb-4">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Comprovante (opcional)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleComprovanteFileChange}
                        className="hidden"
                        id="comprovante-file-input"
                      />
                      <label
                        htmlFor="comprovante-file-input"
                        className="block w-full cursor-pointer"
                      >
                        <div className="flex items-center justify-between p-2 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="px-2 sm:px-4 py-1 sm:py-2 bg-blue-50 text-blue-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-100 transition-colors">
                              Escolher Arquivo
                            </div>
                            <span className="text-xs sm:text-sm text-gray-500">
                              {comprovanteFile ? comprovanteFile.name : 'Nenhum arquivo selecionado'}
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos aceitos: JPG, JPEG, PNG, WEBP (máx. 5MB)
                    </p>
                    
                    {comprovanteFile && (
                      <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-xs sm:text-sm text-green-700 break-all">
                          📎 {comprovanteFile.name}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 sm:gap-3 overflow-x-hidden">
                    <button
                      onClick={() => processPayment(comprovanteFile ? true : false)}
                      disabled={uploadingComprovante || payingContaId === contaParaPagar.id}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                      {uploadingComprovante || payingContaId === contaParaPagar.id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2 flex-shrink-0"></div>
                          <span className="truncate">Processando...</span>
                        </div>
                      ) : (
                        <span className="truncate">{comprovanteFile ? 'Marcar como Paga' : 'Pagar sem Comprovante'}</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Ordenação Móvel */}
      {showMobileSortModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Ordenar por
                </h3>
                <button
                  onClick={() => setShowMobileSortModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                {[
                  { key: 'fornecedor', label: 'Fornecedor' },
                  { key: 'descricao', label: 'Descrição' },
                  { key: 'contaContabil', label: 'Conta Contábil' },
                  { key: 'dataVencimento', label: 'Vencimento' },
                  { key: 'valor', label: 'Valor' },
                  { key: 'status', label: 'Status' }
                ].map((campo) => (
                  <button
                    key={campo.key}
                    onClick={() => {
                      handleSort(campo.key);
                      setShowMobileSortModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      campoOrdenacao === campo.key
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{campo.label}</span>
                    <div className="flex items-center gap-1">
                      {campoOrdenacao === campo.key && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {direcaoOrdenacao === 'asc' ? 'A-Z' : 'Z-A'}
                        </span>
                      )}
                      {campoOrdenacao === campo.key ? (
                        direcaoOrdenacao === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowMobileSortModal(false)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanner de código de barras - renderizado fora de qualquer modal */}
      <BarcodeScanner
        scannerAtivo={scannerAtivo}
        scannerPermissaoNegada={scannerPermissaoNegada}
        scannerError={scannerError}
        onBarcodeDetected={(codigo) => {
          // Quando o código for detectado, fechar o scanner
          setScannerAtivo(false);
          setScannerError(null);
          setScannerPermissaoNegada(false);
          
          // Enviar o código para o formulário através do evento customizado
          if (window.setBarcodeData) {
            window.setBarcodeData(codigo);
          }
        }}
        onClose={() => {
          setScannerAtivo(false);
          setScannerError(null);
          setScannerPermissaoNegada(false);
        }}
      />
    </div>
  );
};
