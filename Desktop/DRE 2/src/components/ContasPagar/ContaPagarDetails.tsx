import React, { useState, useEffect } from 'react';
import { ContaPagar, ContaContabil } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { StatusControl } from './components/StatusControl';
import { ContaPagarInfo } from './components/ContaPagarInfo';
import { ImageModal } from './components/ImageModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { useContaPagarStatus } from './hooks/useContaPagarStatus';
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
  
  const statusControl = useContaPagarStatus(conta.status, conta.id, onUpdate);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Detalhes da Conta</h2>
        <div className="flex items-center space-x-3">
          <StatusControl
            currentStatus={conta.status}
            editingStatus={statusControl.editingStatus}
            newStatus={statusControl.newStatus}
            loading={statusControl.loading}
            onStartEdit={() => statusControl.setEditingStatus(true)}
            onStatusChange={statusControl.setNewStatus}
            onSave={statusControl.handleStatusChange}
            onCancel={() => {
              statusControl.setEditingStatus(false);
              statusControl.setNewStatus(conta.status);
            }}
          />
        </div>
      </div>

      {/* Informações principais */}
      <ContaPagarInfo
        conta={conta}
        empresa={empresa}
        contasContabeis={contasContabeis}
        onImageClick={(imageUrl: string, imageName: string) => {
          setSelectedImage({ url: imageUrl, name: imageName });
          setShowImageModal(true);
        }}
      />

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
          onGerarLancamento={() => dreService.gerarLancamentoDRE(conta)}
          loadingLancamento={dreService.loading}
        />
      )}

      {/* Modal de confirmação */}
      <ConfirmationModal
        isOpen={statusControl.showConfirmModal}
        title="Confirmar Pagamento"
        message="Ao marcar esta conta como paga, será gerado automaticamente um lançamento no DRE. Deseja continuar?"
        loading={statusControl.loading}
        onConfirm={statusControl.confirmStatusChange}
        onCancel={statusControl.cancelStatusChange}
      />
    </div>
  );
}