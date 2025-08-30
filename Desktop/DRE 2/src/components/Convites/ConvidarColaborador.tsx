import React, { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionGuard } from '../PermissionGuard';
import { CollaboratorsService } from '../../services/collaboratorsService';
import { Spinner } from '../ui/Spinner';
import { Mail, UserPlus, Check, AlertCircle, X } from 'lucide-react';

interface ConvidarColaboradorProps {
  companyId: string;
  onInviteSent?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const ConvidarColaborador: React.FC<ConvidarColaboradorProps> = ({
  companyId,
  onInviteSent,
  onCancel,
  className = ''
}) => {
  const { hasPermission } = usePermissions(companyId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const roles = {
    admin: {
      label: 'Administrador',
      description: 'Pode gerenciar colaboradores e configurações da empresa'
    },
    member: {
      label: 'Membro',
      description: 'Pode acessar e editar dados da empresa'
    },
    viewer: {
      label: 'Visualizador',
      description: 'Pode apenas visualizar dados da empresa'
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      setMessage(null);
      
      const result = await CollaboratorsService.inviteCollaborator({
        company_id: companyId,
        email: email.trim(),
        role
      });

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: 'Convite enviado com sucesso! O colaborador receberá um email com as instruções.' 
        });
        
        // Reset form
        setEmail('');
        setRole('member');
        
        // Call callback
        onInviteSent?.();
        
        // Auto-hide form after success
        setTimeout(() => {
          setShowForm(false);
          setMessage(null);
        }, 3000);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'Erro ao enviar convite. Tente novamente.' 
        });
      }
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro inesperado ao enviar convite' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEmail('');
    setRole('member');
    setMessage(null);
    setShowForm(false);
    onCancel?.();
  };

  if (!showForm) {
    return (
      <PermissionGuard companyId={companyId} permission="canInviteCollaborators">
        <button
          onClick={() => setShowForm(true)}
          className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 ${className}`}
        >
          <UserPlus className="h-4 w-4" />
          <span>Convidar Colaborador</span>
        </button>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard companyId={companyId} permission="canInviteCollaborators">
      <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Convidar Colaborador</h3>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-start space-x-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
            <button
              onClick={() => setMessage(null)}
              className={`${
                message.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email do Colaborador
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="colaborador@exemplo.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Função do Colaborador
            </label>
            <div className="space-y-3">
              {Object.entries(roles).map(([roleKey, roleInfo]) => (
                <label key={roleKey} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={roleKey}
                    checked={role === roleKey}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'member' | 'viewer')}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {roleInfo.label}
                    </div>
                    <div className="text-sm text-gray-500">
                      {roleInfo.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span>Enviar Convite</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
    </PermissionGuard>
  );
};

export default ConvidarColaborador;