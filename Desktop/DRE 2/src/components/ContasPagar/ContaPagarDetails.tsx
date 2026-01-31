import React, { useState, useEffect } from 'react';
import { ContaPagar, ContaContabil } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { StatusControl } from './components/StatusControl';
import { ContaPagarInfo } from './components/ContaPagarInfo';
import { ImageModal } from './components/ImageModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { useEditConta } from './hooks/useEditConta';
import { useDRELancamento } from './hooks/useDRELancamento';

interface ContaPagarDetailsProps {
  conta: ContaPagar;
  empresa?: { razao_social: string };
  onUpdate?: () => void;
}

export function ContaPagarDetails({ conta, empresa, onUpdate }: ContaPagarDetailsProps) {
  const [contasContabeis, setContasContabeis] = useState<ContaContabil[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  
  const editControl = useEditConta(
    conta.id,
    conta.status,
    conta.valor,
    conta.dataVencimento,
    conta.dataPagamento || null,
    onUpdate
  );
  const dreService = useDRELancamento(onUpdate);

  // Buscar contas contábeis
  useEffect(() => {
    const fetchContasContabeis = async () => {
      try {
        const { data, error } = await supabase
          .from('contas_contabeis')
          .select('id, codigo, nome, categoria')
          .eq('ativa', true);
        
        if (error) throw error;
        
        const contasData = (data || []).map(item => ({
          id: item.id,
          user_id: '',
          created_at: '',
          empresaId: '',
          codigo: item.codigo,
          nome: item.nome,
          categoria: item.categoria,
          subcategoria: null,
          tipo: 'despesa' as const,
          ativa: true
        }));
        
        setContasContabeis(contasData);
      } catch (error) {
        console.error('Erro ao buscar contas contábeis:', error);
      }
    };

    fetchContasContabeis();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header com controle de status */}
      <div className={`${editControl.editing ? 'w-full' : 'flex justify-end'}`}>
        <div className={`${editControl.editing ? 'w-full' : 'flex items-center space-x-3'}`}>
          <StatusControl
            currentStatus={conta.status}
            currentValor={conta.valor}
            currentDataVencimento={conta.dataVencimento}
            editing={editControl.editing}
            newStatus={editControl.newStatus}
            newValor={editControl.newValor}
            newDataVencimento={editControl.newDataVencimento}
            loading={editControl.loading}
            onStartEdit={() => editControl.setEditing(true)}
            onStatusChange={editControl.setNewStatus}
            onValorChange={editControl.setNewValor}
            onDataVencimentoChange={editControl.setNewDataVencimento}
            onSave={editControl.handleSave}
            onCancel={editControl.handleCancel}
            // Novas props para data de pagamento
            newDataPagamento={editControl.newDataPagamento}
            onDataPagamentoChange={editControl.setNewDataPagamento}
          />
        </div>
      </div>

      {/* Informações principais */}
      <div className={editControl.editing ? 'mt-6' : ''}>
        <ContaPagarInfo
        conta={conta}
        empresa={empresa}
        contasContabeis={contasContabeis}
        onImageClick={(imageUrl: string, imageName: string) => {
          setSelectedImage({ url: imageUrl, name: imageName });
          setShowImageModal(true);
        }}
      />
      </div>

      {/* Modal de visualização da imagem */}
      {showImageModal && selectedImage && (
        <ImageModal
          isOpen={showImageModal}
          imageUrl={selectedImage.url}
          imageName={selectedImage.name}
          conta={conta}
          onClose={() => {
            setShowImageModal(false);
            setSelectedImage(null);
          }}
        />
      )}

      {/* Modal de confirmação */}
      <ConfirmationModal
        isOpen={editControl.showConfirmModal}
        title="Confirmar Alterações"
        message="Ao marcar esta conta como paga, será gerado automaticamente um lançamento no DRE com o valor informado. Deseja continuar?"
        loading={editControl.loading}
        onConfirm={editControl.confirmSave}
        onCancel={editControl.cancelSave}
      />
    </div>
  );
}