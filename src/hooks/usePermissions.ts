import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CollaboratorsService } from '../services/collaboratorsService';
import type { Collaborator } from '../types/collaborators';
import { 
  Role, 
  Permission, 
  hasRolePrecedence,
  getRolePermissions,
  roleHasPermission
} from '../types/permissions';

// As permissões agora são importadas do arquivo de tipos centralizado

export interface UsePermissionsReturn {
  permissions: Permission[];
  role: Role | null;
  isLoading: boolean;
  error: string | null;
  collaborator: Collaborator | null;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
  canManageCollaborators: boolean;
  canManageCompany: boolean;
  canManageRole: (targetRole: Role) => boolean;
  refreshPermissions: () => Promise<void>;
}

export const usePermissions = (companyId: string): UsePermissionsReturn => {
  const { user } = useAuth();
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCollaborator = useCallback(async () => {
    if (!user?.id || !companyId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const collaborators = await CollaboratorsService.getCompanyCollaborators(companyId);
      const userCollaborator = collaborators.find(c => c.user_id === user.id);
      
      setCollaborator(userCollaborator || null);
    } catch (err: unknown) {
      console.error('Erro ao carregar permissões:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar permissões';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, companyId]);

  useEffect(() => {
    loadCollaborator();
  }, [user?.id, companyId, loadCollaborator]);

  const role = collaborator?.role as Role | null;
  
  const permissions = useMemo(() => {
    if (!role) {
      return [];
    }
    
    return getRolePermissions(role);
  }, [role]);

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return roleHasPermission(role, permission);
  };

  const hasAnyPermission = (permissionList: Permission[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList: Permission[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };

  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isMember = role === 'member';
  const isViewer = role === 'viewer';
  
  const canManageCollaborators = hasAnyPermission([
    'canInviteCollaborators',
    'canRemoveCollaborators',
    'canEditCollaboratorRoles'
  ]);

  const canManageRole = (targetRole: Role): boolean => {
    if (!role) return false;
    return hasRolePrecedence(role, targetRole);
  };
  
  const canManageCompany = hasAnyPermission([
    'canEditCompanySettings',
    'canDeleteCompany',
    'canManageIntegrations',
    'canManageBilling'
  ]);

  const refreshPermissions = async () => {
    await loadCollaborator();
  };

  return {
    permissions,
    role,
    isLoading,
    error,
    collaborator,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isAdmin,
    isMember,
    isViewer,
    canManageCollaborators,
    canManageCompany,
    canManageRole,
    refreshPermissions,
  };
};

// Hook para verificar permissões específicas de forma mais simples
export const useHasPermission = (companyId: string, permission: Permission): boolean => {
  const { hasPermission } = usePermissions(companyId);
  return hasPermission(permission);
};

// Hook para verificar se o usuário pode acessar uma rota/funcionalidade
export const useCanAccess = (companyId: string, requiredPermissions: Permission[]): boolean => {
  const { hasAllPermissions } = usePermissions(companyId);
  return hasAllPermissions(requiredPermissions);
};

export default usePermissions;