import React, { useState, useEffect } from 'react';
import { Settings, Crown, UserPlus, Users, Mail, Trash2, Copy, ExternalLink, AlertCircle, Shield, Eye, UserCheck, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CollaboratorsService } from '../../services/collaboratorsService';
import type { CompanyCollaborator, CompanyInvitation, CollaboratorRole } from '../../types/collaborators';
import { Spinner } from '../ui/Spinner';
import { supabase } from '../../lib/supabaseClient';


export const ConfiguracoesPage: React.FC = () => {
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('member');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [collaborators, setCollaborators] = useState<CompanyCollaborator[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [lastInviteLink, setLastInviteLink] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<CollaboratorRole | null>(null);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  // Inicializar o nome do usuário quando o perfil for carregado


  useEffect(() => {
    if (selectedEmpresa) {
      fetchCollaborators();
      fetchInvitations();
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
      
      // Encontrar o papel do usuário atual
      const currentUser = data.find(collaborator => collaborator.user_id === user?.id);
      setCurrentUserRole(currentUser?.role || null);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const fetchInvitations = async () => {
    try {
      setLoadingAction('invitations');
      const data = await CollaboratorsService.getCompanyInvitations(selectedEmpresa);
      setInvitations(data);
    } catch (error) {
      console.error('Erro ao carregar convites:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const sendInvitation = async () => {
    if (!inviteEmail.trim() || !selectedEmpresa) {
      console.log('Validação falhou:', { inviteEmail: inviteEmail.trim(), selectedEmpresa });
      return;
    }
    
    console.log('Iniciando envio de convite:', { email: inviteEmail, empresaId: selectedEmpresa, role: inviteRole });
    
    try {
      setLoadingAction('sending-invite');
      
      // Criar o convite usando o serviço
      const result = await CollaboratorsService.inviteCollaborator({
        email: inviteEmail,
        role: inviteRole,
        company_id: selectedEmpresa
      });

      if (!result.success || !result.invitation) {
        throw new Error(result.error || 'Erro ao criar convite');
      }

      // Gerar link de convite
      const inviteLink = CollaboratorsService.generateInvitationLink(result.invitation.token);
      
      console.log('Convite criado com sucesso!');
      console.log('Token do convite:', result.invitation.token);
      console.log('Link do convite:', inviteLink);
      
      // Salvar o link para mostrar na interface
      setLastInviteLink(inviteLink);
      
      // Mostrar mensagem de sucesso
      alert(`✅ Convite criado com sucesso!\n\n🔗 Compartilhe o link abaixo com o colaborador:\n${inviteLink}\n\n📱 Você pode enviar via WhatsApp, Email, Telegram, etc.`);
      
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
      fetchInvitations();
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error);
      alert(`❌ Erro ao enviar convite: ${error.message}`);
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

  const cancelInvitation = async (invitationId: string) => {
    try {
      setLoadingAction(`canceling-${invitationId}`);
      await CollaboratorsService.cancelInvitation(invitationId);
      fetchInvitations();
      alert('Convite cancelado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao cancelar convite:', error);
      alert(`Erro ao cancelar convite: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Função para verificar se o usuário pode alterar para um papel específico
  const canPromoteToRole = (targetRole: CollaboratorRole): boolean => {
    if (!currentUserRole) return false;
    
    // Master pode fazer qualquer alteração
    if (currentUserRole === 'master') return true;
    
    // Ninguém pode se tornar master, exceto outros masters
    if (targetRole === 'master') return false;
    
    // Admin não pode promover para admin ou master
    if (currentUserRole === 'admin' && (targetRole === 'admin' || targetRole === 'master')) {
      return false;
    }
    
    // Owner pode alterar qualquer papel exceto master
    if (currentUserRole === 'owner' && targetRole !== 'master') return true;
    
    // Admin pode alterar apenas para member e viewer
    if (currentUserRole === 'admin' && (targetRole === 'member' || targetRole === 'viewer')) {
      return true;
    }
    
    return false;
  };

  const updateCollaboratorRole = async (collaboratorId: string, newRole: CollaboratorRole) => {
    // Verificar permissões antes de tentar alterar
    if (!canPromoteToRole(newRole)) {
      let message = 'Você não tem permissão para alterar para este papel.';
      
      if (newRole === 'master') {
        message = 'Apenas usuários Master podem promover outros usuários para Master.';
      } else if (currentUserRole === 'admin' && (newRole === 'admin' || newRole === 'master')) {
        message = 'Administradores não podem promover usuários para Administrador ou Master.';
      }
      
      alert(message);
      return;
    }
    
    try {
      setLoadingAction(`updating-${collaboratorId}`);
      await CollaboratorsService.updateCollaboratorRole(collaboratorId, newRole);
      fetchCollaborators();
      alert('Função do colaborador atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar função:', error);
      alert(`Erro ao atualizar função: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };



  const getRoleDisplayName = (role: CollaboratorRole) => {
    const roleNames = {
      owner: 'Proprietário',
      admin: 'Administrador',
      member: 'Membro',
      viewer: 'Visualizador',
      master: 'Master'
    };
    return roleNames[role] || role;
  };

  const getRoleIcon = (role: CollaboratorRole) => {
    switch (role) {
      case 'owner':
        return Crown;
      case 'admin':
        return Shield;
      case 'member':
        return UserCheck;
      case 'viewer':
        return Eye;
      case 'master':
        return Zap;
      default:
        return UserCheck;
    }
  };

  const getRoleDescription = (role: CollaboratorRole) => {
    switch (role) {
      case 'owner':
        return 'Acesso total e controle da empresa';
      case 'admin':
        return 'Gerenciar usuários e configurações';
      case 'member':
        return 'Acesso completo às funcionalidades';
      case 'viewer':
        return 'Apenas visualização de dados';
      case 'master':
        return 'Controle supremo sobre todo o sistema';
      default:
        return 'Acesso completo às funcionalidades';
    }
  };

  const getRoleBadgeColor = (role: CollaboratorRole) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      member: 'bg-blue-100 text-blue-800',
      viewer: 'bg-gray-100 text-gray-800',
      master: 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
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
                disabled={loadingAction === 'sending-invite'}
              >
                <UserPlus className="h-4 w-4" />
                {loadingAction === 'sending-invite' ? 'Enviando...' : 'Convidar'}
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
                          {collaborator.user?.user_metadata?.full_name || collaborator.user?.email || 'Usuário'}
                        </p>
                        <p className="text-sm text-gray-500">{collaborator.user?.email}</p>
                        <p className="text-xs text-gray-400">
                          Membro desde {new Date(collaborator.joined_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span 
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(collaborator.role)} cursor-help`}
                        title={getRoleDescription(collaborator.role)}
                      >
                        {React.createElement(getRoleIcon(collaborator.role), { className: 'w-3 h-3' })}
                        {getRoleDisplayName(collaborator.role)}
                      </span>
                      {collaborator.role !== 'owner' && collaborator.role !== 'master' && (
                        <div className="relative">
                          <select
                            value={collaborator.role}
                            onChange={(e) => updateCollaboratorRole(collaborator.id, e.target.value as CollaboratorRole)}
                            className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loadingAction === `updating-${collaborator.id}`}
                          >
                            {/* Master - apenas masters podem atribuir */}
                            {canPromoteToRole('master') && (
                              <option value="master">⚡ Master</option>
                            )}
                            {/* Admin - masters e owners podem atribuir */}
                            {canPromoteToRole('admin') && (
                              <option value="admin">🛡️ Administrador</option>
                            )}
                            {/* Member - todos exceto viewers podem atribuir */}
                            {canPromoteToRole('member') && (
                              <option value="member">✅ Membro</option>
                            )}
                            {/* Viewer - todos podem atribuir */}
                            {canPromoteToRole('viewer') && (
                              <option value="viewer">👁️ Visualizador</option>
                            )}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      )}
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

          {/* Convites Pendentes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Convites Pendentes</h2>
            </div>

            <div className="space-y-4">
              {loadingAction === 'invitations' ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum convite pendente</p>
                </div>
              ) : (
                invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{invitation.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">Função:</span>
                        <span 
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(invitation.role)} cursor-help`}
                          title={getRoleDescription(invitation.role)}
                        >
                          {React.createElement(getRoleIcon(invitation.role), { className: 'w-3 h-3' })}
                          {getRoleDisplayName(invitation.role)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Enviado em {new Date(invitation.created_at).toLocaleDateString('pt-BR')} • 
                        Expira em {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(CollaboratorsService.generateInvitationLink(invitation.token))}
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="Copiar link do convite"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => cancelInvitation(invitation.id)}
                        className="text-red-600 hover:text-red-800 p-2"
                        disabled={loadingAction === `canceling-${invitation.id}`}
                        title="Cancelar convite"
                      >
                        {loadingAction === `canceling-${invitation.id}` ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal de Convite */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Convidar Colaborador</h3>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Função
                </label>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as CollaboratorRole)}
                    className="appearance-none w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {/* Master - apenas masters podem convidar */}
                    {canPromoteToRole('master') && (
                      <option value="master">⚡ Master - Controle supremo sobre todo o sistema</option>
                    )}
                    {/* Admin - masters e owners podem convidar */}
                    {canPromoteToRole('admin') && (
                      <option value="admin">🛡️ Administrador - Gerenciar usuários e configurações</option>
                    )}
                    {/* Member - todos exceto viewers podem convidar */}
                    {canPromoteToRole('member') && (
                      <option value="member">✅ Membro - Acesso completo às funcionalidades</option>
                    )}
                    {/* Viewer - todos podem convidar */}
                    {canPromoteToRole('viewer') && (
                      <option value="viewer">👁️ Visualizador - Apenas visualização de dados</option>
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={sendInvitation}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                disabled={loadingAction === 'sending-invite'}
              >
                {loadingAction === 'sending-invite' ? 'Enviando...' : 'Enviar Convite'}
              </button>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail('');
                  setInviteRole('member');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                disabled={loadingAction === 'sending-invite'}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link do último convite */}
      {lastInviteLink && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Último convite criado:</p>
              <p className="text-sm break-all">{lastInviteLink}</p>
              <button
                onClick={() => copyToClipboard(lastInviteLink)}
                className="text-green-800 hover:text-green-900 text-sm underline mt-1"
              >
                Copiar link
              </button>
            </div>
            <button
              onClick={() => setLastInviteLink('')}
              className="text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};