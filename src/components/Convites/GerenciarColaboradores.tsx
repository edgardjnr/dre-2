import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionGate } from '../PermissionGuard';
import { CollaboratorsService } from '../../services/collaboratorsService';
import type { Collaborator, CompanyInvitation } from '../../types/collaborators';
import { Spinner } from '../ui/Spinner';
import { 
  UserPlus, 
  Users, 
  Mail, 
  Shield, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Clock,
  AlertCircle
} from 'lucide-react';

interface GerenciarColaboradoresProps {
  companyId: string;
}

export const GerenciarColaboradores: React.FC<GerenciarColaboradoresProps> = ({ companyId }) => {
  const { user } = useAuth();
  const { canManageCollaborators, hasPermission } = usePermissions(companyId);
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<string | null>(null);
  
  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const roles = {
    owner: 'Proprietário',
    admin: 'Administrador', 
    member: 'Membro',
    viewer: 'Visualizador'
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const collaboratorsData = await CollaboratorsService.getCompanyCollaborators(companyId);
      
      setCollaborators(collaboratorsData);
      setInvitations([]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar colaboradores' });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviteLoading(true);
      const response = await fetch('/api/create-user-and-link-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), companyId })
      });
      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Usuário criado e vinculado à empresa!' });
        setInviteEmail('');
        setShowInviteForm(false);
        loadData(); // Recarregar dados
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao criar usuário' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao criar usuário' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateRole = async (collaboratorId: string, newRole: string) => {
    setMessage({ type: 'error', text: 'Sistema de funções desativado. Todos os usuários são iguais.' });
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Tem certeza que deseja remover este colaborador?')) return;

    try {
      const result = await CollaboratorsService.removeCollaborator(collaboratorId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Colaborador removido com sucesso!' });
        loadData();
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao remover colaborador' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao remover colaborador' });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este convite?')) return;

    try {
      const result = await CollaboratorsService.cancelInvitation(invitationId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Convite cancelado com sucesso!' });
        loadData();
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao cancelar convite' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao cancelar convite' });
    }
  };

  // Permissões são gerenciadas pelo hook usePermissions

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
        <span className="ml-2">Carregando colaboradores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Colaboradores</h2>
        </div>
        <PermissionGate companyId={companyId} permission="canInviteCollaborators">
          <button
            onClick={() => setShowInviteForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Convidar</span>
          </button>
        </PermissionGate>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Convidar Colaborador</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div>
                
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {inviteLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>Enviar Convite</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmail('');
                    setInviteRole('member');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collaborators List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Colaboradores Ativos</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {collaborators.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum colaborador encontrado</p>
            </div>
          ) : (
            collaborators.map((collaborator) => (
              <div key={collaborator.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {collaborator.user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {collaborator.user?.email}
                    </p>
                    <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Usuário
                    </span>
                    </div>
                  </div>
                </div>
                
                {collaborator.role !== 'owner' && collaborator.user_id !== user?.id && (
                  <div className="flex items-center space-x-2">
                    {editingCollaborator === collaborator.id ? (
                      <button
                        onClick={() => setEditingCollaborator(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <>
                        <PermissionGate companyId={companyId} permission="canRemoveCollaborators">
                          <button
                            onClick={() => handleRemoveCollaborator(collaborator.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      
    </div>
  );
};
