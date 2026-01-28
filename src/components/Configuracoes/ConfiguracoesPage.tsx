import React, { useState, useEffect } from 'react';
import { Settings, UserPlus, Users, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CollaboratorsService } from '../../services/collaboratorsService';
import type { CompanyCollaborator, CollaboratorRole } from '../../types/collaborators';
import { Spinner } from '../ui/Spinner';
import { supabase } from '../../lib/supabaseClient';


export const ConfiguracoesPage: React.FC = () => {
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [collaborators, setCollaborators] = useState<CompanyCollaborator[]>([]);
  const [lastInviteLink, setLastInviteLink] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  // Inicializar o nome do usuário quando o perfil for carregado


  useEffect(() => {
    if (selectedEmpresa) {
      fetchCollaborators();
    }
  }, [selectedEmpresa]);

  const fetchEmpresas = async () => {
    if (!user) {
      console.log('Usuário não está autenticado');
      return;
    }
    
    console.log('Buscando empresas para usuário:', user.id);
    
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razaoSocial:razao_social')
        .eq('user_id', user.id);
      
      console.log('Resultado da busca de empresas:', { data, error });
      
      if (error) throw error;
      
      setEmpresas(data || []);
      if (data && data.length > 0) {
        setSelectedEmpresa(data[0].id);
        console.log('Empresa selecionada automaticamente:', data[0]);
      } else {
        console.log('Nenhuma empresa encontrada para este usuário');
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaborators = async () => {
    try {
      setLoadingAction('collaborators');
      const data = await CollaboratorsService.getCompanyCollaborators(selectedEmpresa);
      setCollaborators(data);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  // Convites pendentes removidos do sistema

  const createUserAndLink = async () => {
    if (!inviteEmail.trim() || !selectedEmpresa) {
      console.log('Validação falhou:', { inviteEmail: inviteEmail.trim(), selectedEmpresa });
      return;
    }
    try {
      setLoadingAction('creating-user');
      const resp = await fetch('/api/create-user-and-link-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), companyId: selectedEmpresa })
      });
      const result = await resp.json();
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }
      alert('✅ Usuário criado e vinculado à empresa com sucesso!');
      setInviteEmail('');
      setShowInviteForm(false);
      fetchCollaborators();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      alert(`❌ Erro ao criar usuário: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      const originalTitle = document.title;
      document.title = '✅ Link Copiado!';
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
      
      alert('🔗 Link copiado para a área de transferência!\n\n📱 Agora você pode compartilhar via:\n• WhatsApp\n• Email\n• Telegram\n• Qualquer outra plataforma');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('🔗 Link selecionado! Use Ctrl+C para copiar.');
      } catch (err) {
        alert('❌ Erro ao copiar. Tente selecionar e copiar manualmente:\n\n' + text);
      }
      document.body.removeChild(textArea);
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este colaborador?')) return;
    
    try {
      setLoadingAction(`removing-${collaboratorId}`);
      await CollaboratorsService.removeCollaborator(collaboratorId);
      fetchCollaborators();
      alert('Colaborador removido com sucesso!');
    } catch (error: any) {
      console.error('Erro ao remover colaborador:', error);
      alert(`Erro ao remover colaborador: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Cancelamento de convites removido do sistema

  const formatMemberSince = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
      </div>


      {/* Seleção de Empresa */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Empresa</h2>
        <select
          value={selectedEmpresa}
          onChange={(e) => setSelectedEmpresa(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Selecione uma empresa</option>
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.razaoSocial}
            </option>
          ))}
        </select>
      </div>

      {selectedEmpresa && (
        <>
          {/* Gestão de Colaboradores */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Colaboradores</h2>
              </div>
              <button
                onClick={() => setShowInviteForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                disabled={loadingAction === 'creating-user'}
              >
                <UserPlus className="h-4 w-4" />
                {loadingAction === 'creating-user' ? 'Criando...' : 'Adicionar Usuário'}
              </button>
            </div>

            {/* Lista de Colaboradores */}
            <div className="space-y-4">
              {loadingAction === 'collaborators' ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : collaborators.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum colaborador encontrado</p>
                </div>
              ) : (
                collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {collaborator.user?.email || 'Sem email'}
                        </p>
                        {collaborator.user?.user_metadata?.full_name && collaborator.user.user_metadata.full_name !== 'Usuário' && (
                          <p className="text-sm text-gray-500">{collaborator.user.user_metadata.full_name}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          Membro desde {formatMemberSince(collaborator.joined_at || collaborator.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Usuário
                      </span>
                      {collaborator.role !== 'owner' && collaborator.role !== 'master' && (
                        <button
                          onClick={() => removeCollaborator(collaborator.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          disabled={loadingAction === `removing-${collaborator.id}`}
                        >
                          {loadingAction === `removing-${collaborator.id}` ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Convites pendentes removidos */}
        </>
      )}

      {/* Modal de Convite */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Usuário</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email do colaborador
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="colaborador@exemplo.com"
                />
              </div>
              
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={createUserAndLink}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                disabled={loadingAction === 'creating-user'}
              >
                {loadingAction === 'creating-user' ? 'Criando...' : 'Adicionar'}
              </button>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                disabled={loadingAction === 'creating-user'}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Removido link de último convite */}
    </div>
  );
};
