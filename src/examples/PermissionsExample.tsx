import React from 'react';
import {
  GerenciarColaboradores,
  ListarColaboradores,
  ConvidarColaborador,
  PermissionGuard,
  PermissionGate,
  RoleGate,
  usePermissions,
  withPermissions
} from '../components/Convites';


// Exemplo de uso básico dos componentes com permissões
interface ExamplePageProps {
  companyId: string;
}

export const PermissionsExample: React.FC<ExamplePageProps> = ({ companyId }) => {
  const { 
    role, 
    hasPermission, 
    canManageCollaborators,
    loading 
  } = usePermissions(companyId);

  if (loading) {
    return <div className="flex justify-center p-8">Carregando permissões...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Permissões</h1>
        <p className="text-gray-600 mb-4">Seu role atual: <span className="font-semibold">{role}</span></p>
        
        {/* Exemplo de verificação de permissão específica */}
        {hasPermission('canViewCollaborators') && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800">✅ Você pode visualizar colaboradores</p>
          </div>
        )}
        
        {/* Exemplo de verificação de capacidade de gerenciar */}
        {canManageCollaborators && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800">🔧 Você pode gerenciar colaboradores</p>
          </div>
        )}
      </div>

      {/* Exemplo 1: Componente protegido por PermissionGuard */}
      <PermissionGuard 
        companyId={companyId} 
        permission="canViewCollaborators"
        fallback={
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">❌ Você não tem permissão para visualizar colaboradores</p>
          </div>
        }
      >
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Lista de Colaboradores</h2>
            <p className="text-gray-600">Protegido por PermissionGuard</p>
          </div>
          <ListarColaboradores companyId={companyId} />
        </div>
      </PermissionGuard>

      {/* Exemplo 2: Botões condicionais com PermissionGate */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Ações Disponíveis</h2>
        <div className="flex flex-wrap gap-3">
          
          <PermissionGate companyId={companyId} permission="canInviteCollaborators">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Convidar Colaborador
            </button>
          </PermissionGate>
          
          <PermissionGate companyId={companyId} permission="canEditCompanySettings">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Configurações da Empresa
            </button>
          </PermissionGate>
          
          <PermissionGate companyId={companyId} permission="canDeleteCompany">
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
              Deletar Empresa
            </button>
          </PermissionGate>
          
          <PermissionGate companyId={companyId} permission="canManageApiKeys">
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
              Gerenciar API Keys
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Exemplo 3: Conteúdo baseado em role com RoleGate */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Conteúdo por Role</h2>
        
        <RoleGate companyId={companyId} role="owner">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-yellow-800">👑 Área do Proprietário</h3>
            <p className="text-yellow-700">Conteúdo exclusivo para proprietários da empresa.</p>
          </div>
        </RoleGate>
        
        <RoleGate companyId={companyId} role="admin">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800">🛡️ Área do Administrador</h3>
            <p className="text-blue-700">Conteúdo para administradores.</p>
          </div>
        </RoleGate>
        
        <RoleGate companyId={companyId} role="member">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-green-800">👤 Área do Membro</h3>
            <p className="text-green-700">Conteúdo para membros da equipe.</p>
          </div>
        </RoleGate>
      </div>

      {/* Exemplo 4: Componente de gestão completa (apenas para quem pode gerenciar) */}
      <PermissionGuard 
        companyId={companyId} 
        permissions={['canInviteCollaborators', 'canRemoveCollaborators']}
        requireAll={false} // Precisa de pelo menos uma das permissões
        fallback={
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Gestão de Colaboradores</h2>
            <p className="text-gray-500">Você não tem permissão para gerenciar colaboradores.</p>
          </div>
        }
      >
        <GerenciarColaboradores companyId={companyId} />
      </PermissionGuard>

      {/* Exemplo 5: Formulário de convite (protegido) */}
      <ConvidarColaborador 
        companyId={companyId}
        onInviteSent={() => {
          console.log('Convite enviado com sucesso!');
        }}
        onCancel={() => {
          console.log('Convite cancelado');
        }}
      />

      {/* Exemplo 6: Informações de debug (apenas para desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Debug - Informações de Permissão</h3>
          <div className="text-sm space-y-1">
            <p><strong>Role:</strong> {role}</p>
            <p><strong>Pode convidar:</strong> {hasPermission('canInviteCollaborators') ? '✅' : '❌'}</p>
            <p><strong>Pode remover:</strong> {hasPermission('canRemoveCollaborators') ? '✅' : '❌'}</p>
            <p><strong>Pode editar roles:</strong> {hasPermission('canEditCollaboratorRoles') ? '✅' : '❌'}</p>
            <p><strong>Pode gerenciar empresa:</strong> {hasPermission('canEditCompanySettings') ? '✅' : '❌'}</p>
            <p><strong>Pode deletar empresa:</strong> {hasPermission('canDeleteCompany') ? '✅' : '❌'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Exemplo de HOC (Higher-Order Component)
const ProtectedAdminComponent: React.FC = () => {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="font-semibold text-red-800">🔒 Componente Protegido</h3>
      <p className="text-red-700">Este componente só é visível para administradores.</p>
    </div>
  );
};

// Aplicando o HOC
export const ProtectedAdminWithHOC = withPermissions(
  ProtectedAdminComponent,
  ['canEditCompanySettings'], // Permissões necessárias
  {
    requireAll: true, // Precisa de todas as permissões
    fallback: (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">Acesso negado: você não tem permissões de administrador.</p>
      </div>
    )
  }
);

export default PermissionsExample;