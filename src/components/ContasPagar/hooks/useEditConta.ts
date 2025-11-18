import { useState, useEffect } from 'react';
import { ContaPagarStatus } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';
import { useDRELancamento } from './useDRELancamento';
import { parseCurrencyToNumber, formatCurrency } from '../components/EditContaForm';
import { format } from 'date-fns';

// Função para formatar data para exibição sem problemas de timezone
const formatDateForDisplay = (dateString: string): Date => {
  if (!dateString) return new Date();
  // Adiciona horário fixo para evitar problemas de timezone na exibição
  return new Date(dateString + 'T00:00:00');
};

// Função para garantir que a data seja salva sem conversão de timezone
const formatDateForDatabase = (dateString: string): string => {
  if (!dateString) return dateString;
  
  // Se a data já está no formato correto (YYYY-MM-DD), retorna como está
  // Isso evita conversões de timezone desnecessárias
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegex.test(dateString)) {
    return dateString;
  }
  
  // Se por algum motivo a data não está no formato esperado, 
  // cria uma nova data e formata corretamente
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export function useEditConta(
  contaId: string,
  initialStatus: ContaPagarStatus,
  initialValor: number,
  initialDataVencimento: string,
  initialDataPagamento: string | null,
  onUpdate?: () => void
) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Estados dos campos editáveis
  const [newStatus, setNewStatus] = useState<ContaPagarStatus>(initialStatus);
  const [newValor, setNewValor] = useState(formatCurrency(initialValor.toString().replace('.', '')));
  const [newDataVencimento, setNewDataVencimento] = useState(
    format(formatDateForDisplay(initialDataVencimento), 'yyyy-MM-dd')
  );
  const [newDataPagamento, setNewDataPagamento] = useState(
    initialDataPagamento ? format(formatDateForDisplay(initialDataPagamento), 'yyyy-MM-dd') : ''
  );
  
  const { gerarLancamentoDREAutomatico } = useDRELancamento(onUpdate);

  const resetFields = () => {
    setNewStatus(initialStatus);
    setNewValor(formatCurrency(initialValor.toString().replace('.', '')));
    setNewDataVencimento(format(formatDateForDisplay(initialDataVencimento), 'yyyy-MM-dd'));
    setNewDataPagamento(initialDataPagamento ? format(formatDateForDisplay(initialDataPagamento), 'yyyy-MM-dd') : '');
  };

  const hasChanges = () => {
    const valorChanged = parseCurrencyToNumber(newValor) !== initialValor;
    const statusChanged = newStatus !== initialStatus;
    const dataChanged = newDataVencimento !== format(formatDateForDisplay(initialDataVencimento), 'yyyy-MM-dd');
    const pagamentoChanged = newDataPagamento !== (initialDataPagamento ? format(formatDateForDisplay(initialDataPagamento), 'yyyy-MM-dd') : '');
    
    return valorChanged || statusChanged || dataChanged || pagamentoChanged;
  };

  // Preencher automaticamente data de pagamento ao mudar para "paga"
  useEffect(() => {
    if (newStatus === 'paga' && !newDataPagamento) {
      setNewDataPagamento(format(new Date(), 'yyyy-MM-dd'));
    }
    // Se sair de "paga", opcionalmente poderíamos limpar, mas manteremos como está
  }, [newStatus]);

  const updateConta = async () => {
    try {
      setLoading(true);
      
      const valorNumerico = parseCurrencyToNumber(newValor);
      
      const updateData: any = {
        status: newStatus,
        valor: valorNumerico,
        data_vencimento: newDataVencimento
      };
      
      // Validação: data de pagamento obrigatória quando status = paga
      if (newStatus === 'paga') {
        if (!newDataPagamento) {
          alert('Informe a Data de Pagamento para marcar como paga.');
          setLoading(false);
          return;
        }
        updateData.data_pagamento = newDataPagamento;
      } else {
        // Se mudando de "paga" para outro status, remover data de pagamento
        updateData.data_pagamento = null;
      }

      const { error } = await supabase
        .from('contas_a_pagar')
        .update({
          ...updateData,
          data_vencimento: formatDateForDatabase(updateData.data_vencimento)
        })
        .eq('id', contaId);

      if (error) throw error;

      // Se mudando para "paga", gerar lançamento DRE automaticamente com a data escolhida
      if (newStatus === 'paga') {
        // Buscar os dados atualizados da conta para gerar o lançamento
        const { data: contaData, error: fetchError } = await supabase
          .from('contas_a_pagar')
          .select('*')
          .eq('id', contaId)
          .single();

        if (!fetchError && contaData) {
          const conta = {
            id: contaData.id,
            empresaId: contaData.empresa_id,
            fornecedor: contaData.fornecedor,
            descricao: contaData.descricao,
            valor: contaData.valor, // Usar o valor atualizado
            dataVencimento: contaData.data_vencimento,
            dataPagamento: contaData.data_pagamento,
            status: contaData.status,
            observacoes: contaData.observacoes,
            numeroDocumento: contaData.numero_documento,
            fotoUrl: contaData.foto_url,
            fotoNome: contaData.foto_nome,
            fotos: [],
            contaContabilId: contaData.conta_contabil_id,
            lancamentoGeradoId: contaData.lancamento_gerado_id,
            created_at: contaData.created_at,
            updated_at: contaData.updated_at
          };
          
          await gerarLancamentoDREAutomatico(conta);
        }
      }

      setEditing(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao atualizar conta:', error);
      alert('Erro ao atualizar conta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handlers de ação
  const handleSave = () => {
    // Se não houve alterações, apenas sair do modo edição
    if (!hasChanges()) {
      setEditing(false);
      return;
    }
    // Solicitar confirmação ao marcar como paga
    if (newStatus === 'paga') {
      setShowConfirmModal(true);
    } else {
      // Salvar diretamente para demais casos
      updateConta();
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setEditing(false);
    resetFields();
  };

  const confirmSave = () => {
    setShowConfirmModal(false);
    updateConta();
  };

  const cancelSave = () => {
    setShowConfirmModal(false);
  };

  return {
    // Estados
    loading,
    editing,
    showConfirmModal,
    newStatus,
    newValor,
    newDataVencimento,
    newDataPagamento,
    
    // Setters
    setEditing,
    setNewStatus,
    setNewValor,
    setNewDataVencimento,
    setNewDataPagamento,
    
    // Funções
    handleSave,
    handleCancel,
    confirmSave,
    cancelSave,
    hasChanges
  };
}