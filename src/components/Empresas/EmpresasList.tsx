import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { Empresa } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { Modal } from '../ui/Modal';
import { EmpresaForm } from './EmpresaForm';
import { Spinner } from '../ui/Spinner';

export const EmpresasList: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('empresas')
      .select(`
        id,
        user_id,
        created_at,
        razaoSocial:razao_social,
        cnpj,
        regimeTributario:regime_tributario,
        dataAbertura:data_abertura,
        email,
        telefone,
        endereco,
        ativa
      `)
      .order('razao_social', { ascending: true });

    if (error) {
      setError(error.message);
      console.error("Erro ao buscar empresas:", error);
    } else {
      setEmpresas(data as Empresa[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
      const { error } = await supabase.from('empresas').delete().eq('id', id);
      if (error) {
        alert(`Erro ao excluir: ${error.message}`);
      } else {
        fetchEmpresas();
      }
    }
  };

  const handleAddNew = () => {
    setEditingEmpresa(null);
    setShowModal(true);
  };

  const handleSave = () => {
    setShowModal(false);
    fetchEmpresas();
  };

  const getRegimeColor = (regime: string) => {
    const colors = {
      'Simples Nacional': 'bg-green-100 text-green-800',
      'Lucro Presumido': 'bg-blue-100 text-blue-800',
      'Lucro Real': 'bg-purple-100 text-purple-800'
    };
    return colors[regime as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Erro ao carregar empresas: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Empresas</h2>
          <p className="text-gray-600">Gerencie as empresas do sistema</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nova Empresa</span>
        </button>
      </div>

      {empresas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empresas.map((empresa) => (
            <div key={empresa.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{empresa.razaoSocial}</h3>
                      <p className="text-sm text-gray-600">{empresa.cnpj}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(empresa)}
                      className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(empresa.id)}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Regime Tributário</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRegimeColor(empresa.regimeTributario)}`}>
                      {empresa.regimeTributario}
                    </span>
                  </div>

                  {empresa.email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{empresa.email}</span>
                    </div>
                  )}

                  {empresa.telefone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{empresa.telefone}</span>
                    </div>
                  )}

                  {empresa.endereco && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{empresa.endereco}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Data de Abertura</span>
                  <span className="font-medium">
                    {new Date(empresa.dataAbertura + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma empresa cadastrada</h3>
          <p className="text-gray-600 mb-4">Comece adicionando sua primeira empresa ao sistema.</p>
          <button
            onClick={handleAddNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Adicionar Empresa
          </button>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
        size="lg"
      >
        <EmpresaForm
          empresa={editingEmpresa}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};
