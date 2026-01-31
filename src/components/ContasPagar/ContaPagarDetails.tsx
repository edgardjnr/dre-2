import React, { useState, useEffect } from 'react';
import { ContaPagar, ContaContabil } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { ContaPagarInfo } from './components/ContaPagarInfo';
import { ImageModal } from './components/ImageModal';
import { ContaPagarForm } from './ContaPagarForm';
import { Pencil, Eye } from 'lucide-react';

interface ContaPagarDetailsProps {
  conta: ContaPagar;
  empresa?: { razao_social: string };
  onUpdate?: () => void;
}

export function ContaPagarDetails({ conta, empresa, onUpdate }: ContaPagarDetailsProps) {
  const [contasContabeis, setContasContabeis] = useState<ContaContabil[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'edit'>('overview');
  
  

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
      {/* Abas */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 text-sm rounded-t-md ${activeTab === 'overview' ? 'bg-white border-x border-t border-gray-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            title="Detalhes"
          >
            <Eye className="w-4 h-4 inline mr-1" /> Detalhes
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-2 text-sm rounded-t-md ${activeTab === 'edit' ? 'bg-white border-x border-t border-gray-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            title="Editar"
          >
            <Pencil className="w-4 h-4 inline mr-1" /> Editar
          </button>
        </div>
      </div>

      {/* Conteúdo por aba */}
      {activeTab === 'overview' && (
        <div>
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
      )}

      {activeTab === 'edit' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
          <ContaPagarForm
            conta={conta}
            onSave={() => {
              setActiveTab('overview');
              onUpdate?.();
            }}
            onCancel={() => setActiveTab('overview')}
          />
        </div>
      )}

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

    </div>
  );
}
