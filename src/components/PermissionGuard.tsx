import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Role, Permission } from '../types/permissions';
import { Spinner } from './ui/Spinner';
import { Shield, AlertCircle, Lock } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  companyId: string;
  permission?: Permission;
  permissions?: Permission[];
  role?: Role;
  roles?: Role[];
  requireAll?: boolean; // Se true, requer todas as permissões. Se false, requer pelo menos uma
  fallback?: React.ReactNode;
  showError?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  companyId,
  requiredPermissions = [],
  requireAnyPermission = false,
  fallback,
  showError = true
}) => {
  const { 
    permissions, 
    role, 
    isLoading, 
    error, 
    hasAnyPermission, 
    hasAllPermissions 
  } = usePermissions(companyId);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
        <span className="ml-2">Verificando permissões...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto mt-8">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Erro de Permissão</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No role (user is not a collaborator)
  if (!role) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showError) {
      return null;
    }

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto mt-8">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-yellow-600" />
          <div>
            <h3 className="text-lg font-medium text-yellow-800">Acesso Negado</h3>
            <p className="text-sm text-yellow-600 mt-1">
              Você não é um colaborador desta empresa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check permissions
  if (requiredPermissions.length > 0) {
    const hasAccess = requireAnyPermission 
      ? hasAnyPermission(requiredPermissions)
      : hasAllPermissions(requiredPermissions);

    if (!hasAccess) {
      if (fallback) {
        return <>{fallback}</>;
      }

      if (!showError) {
        return null;
      }

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto mt-8">
          <div className="flex items-center space-x-3">
            <Lock className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Permissão Insuficiente</h3>
              <p className="text-sm text-red-600 mt-1">
                Você não tem permissão para acessar esta funcionalidade.
              </p>
              <p className="text-xs text-red-500 mt-2">
                Sua função atual: <span className="font-medium">{getRoleLabel(role)}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  // User has access, render children
  return <>{children}</>;
};

// Component for inline permission checking
interface PermissionGateProps {
  children: React.ReactNode;
  companyId: string;
  permission: Permission;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  companyId,
  permission,
  children,
  fallback = null
}) => {
  const { hasPermission, isLoading } = usePermissions(companyId);

  if (isLoading) {
    return <Spinner size="sm" />;
  }

  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
};

// Component for role-based rendering
interface RoleGateProps {
  children: React.ReactNode;
  companyId: string;
  role: Role;
  fallback?: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  companyId,
  allowedRoles,
  children,
  fallback = null
}) => {
  const { role, isLoading } = usePermissions(companyId);

  if (isLoading) {
    return <Spinner size="sm" />;
  }

  return role && allowedRoles.includes(role) ? <>{children}</> : <>{fallback}</>;
};

// Higher-order component for protecting entire components
// HOC para proteger componentes com permissões
export const withPermissions = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: Permission[],
  options: {
    requireAll?: boolean;
    fallback?: React.ReactNode;
  } = {}
) => {
  return (props: P & { companyId: string }) => {
    const { companyId, ...componentProps } = props;
    
    return (
      <PermissionGuard
        companyId={companyId}
        permissions={requiredPermissions}
        requireAll={options.requireAll}
        fallback={options.fallback}
      >
        <Component {...(componentProps as P)} />
      </PermissionGuard>
    );
  };
};

// Utility function to get role label
function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    member: 'Membro',
    viewer: 'Visualizador'
  };
  
  return roleLabels[role] || role;
}

export default PermissionGuard;