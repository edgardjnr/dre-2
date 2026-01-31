import { useState } from 'react';
import { ContaPagarStatus } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';
import { useDRELancamento } from './useDRELancamento';

export function useContaPagarStatus(initialStatus: ContaPagarStatus, contaId: string, onUpdate?: () => void) {
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<ContaPagarStatus>(initialStatus);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ContaPagarStatus | null>(null);
  
  const { sincronizarLancamentoDRE } = useDRELancamento(onUpdate);

  const updateStatus = async (status: ContaPagarStatus) => {
    try {
      setLoading(true);
      
      const updateData: any = { status };
      
      // Se mudando para "paga", adicionar data de pagamento
      if (status === 'paga') {
        updateData.data_pagamento = new Date().toISOString().split('T')[0];
      }
      
      // Se mudando de "paga" para outro status, remover data de pagamento
      if (status !== 'paga') {
        updateData.data_pagamento = null;
      }

      const { error } = await supabase
        .from('contas_a_pagar')
        .update(updateData)
        .eq('id', contaId);

      if (error) throw error;

      const { data: contaData, error: fetchError } = await supabase
        .from('contas_a_pagar')
        .select('*')
        .eq('id', contaId)
        .single();

      if (fetchError) throw fetchError;

      if (contaData) {
        const conta = {
          id: contaData.id,
          empresaId: contaData.empresa_id,
          fornecedor: contaData.fornecedor,
          descricao: contaData.descricao,
          valor: contaData.valor,
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

        await sincronizarLancamentoDRE(conta);
      }

      setEditingStatus(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = () => {
    if (newStatus !== initialStatus) {
      // Se mudando para "paga", mostrar modal de confirmação
      if (newStatus === 'paga') {
        setPendingStatus(newStatus);
        setShowConfirmModal(true);
      } else {
        updateStatus(newStatus);
      }
    } else {
      setEditingStatus(false);
    }
  };

  const confirmStatusChange = () => {
    if (pendingStatus) {
      updateStatus(pendingStatus);
      setShowConfirmModal(false);
      setPendingStatus(null);
    }
  };

  const cancelStatusChange = () => {
    setShowConfirmModal(false);
    setPendingStatus(null);
    setNewStatus(initialStatus);
    setEditingStatus(false);
  };

  return {
    loading,
    editingStatus,
    newStatus,
    showConfirmModal,
    setEditingStatus,
    setNewStatus,
    handleStatusChange,
    confirmStatusChange,
    cancelStatusChange
  };
}
