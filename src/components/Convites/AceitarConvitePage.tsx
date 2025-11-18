import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CollaboratorsService } from '../../services/collaboratorsService';
import type { CompanyInvitation } from '../../types/collaborators';
import { Spinner } from '../ui/Spinner';
import { UserPlus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export const AceitarConvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<CompanyInvitation | null>(null);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'already_member' | 'processing' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setLoading(false);
      return;
    }

    validateInvitation();
  }, [token, user]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      setStatus('loading');

      console.log('🔍 Validando convite com token:', token);

      // Buscar o convite usando o serviço
      const invitationData = await CollaboratorsService.getInvitationByToken(token!);

      if (!invitationData) {
        console.log('❌ Convite não encontrado ou inválido');
        setStatus('invalid');
        setErrorMessage('Convite não encontrado, expirado ou já foi usado.');
        return;
      }

      setInvitation(invitationData);
      console.log('📋 Convite encontrado:', invitationData);

      // Se o usuário não está logado, mostrar como válido para login
      if (!user) {
        console.log('🔐 Usuário não logado, mostrando opção de login');
        setStatus('valid');
        return;
      }

      // Verificar se o email do usuário logado corresponde ao convite
      if (user.email !== invitationData.email) {
        console.log('❌ Email não corresponde');
        setStatus('invalid');
        setErrorMessage(`Este convite é para ${invitationData.email}, mas você está logado como ${user.email}`);
        return;
      }

      // Verificar se o usuário já é colaborador desta empresa
      const existingCollaborator = await CollaboratorsService.isUserCollaborator(
        invitationData.company_id,
        user.id
      );

      if (existingCollaborator) {
        console.log('ℹ️ Usuário já é colaborador');
        setStatus('already_member');
        return;
      }

      console.log('✅ Convite válido!');
      setStatus('valid');
    } catch (error) {
      console.error('💥 Erro ao validar convite:', error);
      setStatus('error');
      setErrorMessage('Erro ao validar convite');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user || !invitation || !token) return;

    try {
      setStatus('processing');

      // Aceitar o convite usando o serviço
      const result = await CollaboratorsService.acceptInvitation(token);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao aceitar convite');
      }

      setStatus('success');
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/configuracoes');
      }, 3000);
    } catch (error: any) {
      console.error('Erro ao aceitar convite:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Erro ao aceitar convite');
    }
  };

  const handleLogin = () => {
    // Salvar o token para usar após o login
    localStorage.setItem('pending_invitation_token', token || '');
    navigate('/login');
  };

  const handleRegister = () => {
    // Salvar o token para usar após o registro
    localStorage.setItem('pending_invitation_token', token || '');
    navigate('/register');
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      owner: 'Proprietário',
      admin: 'Administrador',
      collaborator: 'Colaborador',
      viewer: 'Visualizador'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-gray-600">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <Spinner className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Processando...</h2>
          <p className="text-gray-600">
            Aceitando seu convite, aguarde um momento...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Convite Aceito!</h2>
          <p className="text-gray-600 mb-4">
            Você agora é colaborador da empresa <strong>{invitation?.company?.razao_social}</strong>.
          </p>
          <p className="text-sm text-gray-500">
            Redirecionando para as configurações...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Convite Inválido</h2>
          <p className="text-gray-600 mb-4">
            {errorMessage || 'Este convite não é válido ou já foi usado.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Convite Expirado</h2>
          <p className="text-gray-600 mb-4">
            Este convite expirou. Entre em contato com quem enviou o convite para solicitar um novo.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  if (status === 'already_member') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Já é Colaborador</h2>
          <p className="text-gray-600 mb-4">
            Você já é colaborador da empresa <strong>{invitation?.company?.razao_social}</strong>.
          </p>
          <button
            onClick={() => navigate('/configuracoes')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Ir para Configurações
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Erro</h2>
          <p className="text-gray-600 mb-4">
            {errorMessage || 'Ocorreu um erro ao processar o convite.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Status 'valid' - mostrar convite para aceitar
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
        <div className="text-center mb-6">
          <UserPlus className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Convite para Colaborar</h2>
        </div>

        {invitation && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Detalhes do Convite</h3>
              <p className="text-sm text-gray-600">
                <strong>Empresa:</strong> {invitation.company?.razao_social}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {invitation.email}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Função:</strong> {getRoleDisplayName(invitation.role)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Expira em:</strong> {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
              </p>
            </div>

            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  Para aceitar este convite, você precisa ter uma conta.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleLogin}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Já tenho conta - Fazer Login
                  </button>
                  <button
                    onClick={handleRegister}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                  >
                    Não tenho conta - Criar Conta
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Após fazer login ou criar sua conta, você será automaticamente redirecionado para aceitar o convite.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  Ao aceitar, você se tornará colaborador desta empresa e terá acesso aos recursos permitidos para sua função.
                </p>
                <button
                  onClick={acceptInvitation}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Aceitar Convite
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};