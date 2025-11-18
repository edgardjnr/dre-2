// Tipos para o sistema de permissões e roles

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export type Permission = 
  // Gestão de colaboradores
  | 'canInviteCollaborators'
  | 'canRemoveCollaborators'
  | 'canEditCollaboratorRoles'
  | 'canViewCollaborators'
  
  // Gestão da empresa
  | 'canEditCompanySettings'
  | 'canDeleteCompany'
  | 'canViewCompanySettings'
  
  // Gestão de dados
  | 'canCreateData'
  | 'canEditData'
  | 'canDeleteData'
  | 'canViewData'
  | 'canExportData'
  
  // Relatórios
  | 'canCreateReports'
  | 'canEditReports'
  | 'canDeleteReports'
  | 'canViewReports'
  | 'canExportReports'
  
  // Configurações avançadas
  | 'canManageIntegrations'
  | 'canManageBackups'
  | 'canViewAuditLogs'
  | 'canManageApiKeys';

export interface RolePermissions {
  [key: string]: Permission[];
}

export interface UserPermissions {
  role: Role;
  permissions: Permission[];
  companyId: string;
  userId: string;
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string;
}

// Mapeamento de roles para permissões
export const ROLE_PERMISSIONS: RolePermissions = {
  owner: [
    // Todas as permissões
    'canInviteCollaborators',
    'canRemoveCollaborators', 
    'canEditCollaboratorRoles',
    'canViewCollaborators',
    'canEditCompanySettings',
    'canDeleteCompany',
    'canViewCompanySettings',
    'canCreateData',
    'canEditData',
    'canDeleteData',
    'canViewData',
    'canExportData',
    'canCreateReports',
    'canEditReports',
    'canDeleteReports',
    'canViewReports',
    'canExportReports',
    'canManageIntegrations',
    'canManageBackups',
    'canViewAuditLogs',
    'canManageApiKeys'
  ],
  admin: [
    // Gestão de colaboradores (exceto remover outros admins)
    'canInviteCollaborators',
    'canRemoveCollaborators',
    'canEditCollaboratorRoles',
    'canViewCollaborators',
    // Configurações da empresa (limitadas)
    'canViewCompanySettings',
    // Gestão completa de dados
    'canCreateData',
    'canEditData',
    'canDeleteData',
    'canViewData',
    'canExportData',
    // Gestão completa de relatórios
    'canCreateReports',
    'canEditReports',
    'canDeleteReports',
    'canViewReports',
    'canExportReports',
    // Algumas configurações avançadas
    'canViewAuditLogs'
  ],
  member: [
    // Visualização de colaboradores
    'canViewCollaborators',
    // Gestão básica de dados
    'canCreateData',
    'canEditData',
    'canViewData',
    'canExportData',
    // Gestão básica de relatórios
    'canCreateReports',
    'canEditReports',
    'canViewReports',
    'canExportReports'
  ],
  viewer: [
    // Apenas visualização
    'canViewCollaborators',
    'canViewData',
    'canViewReports'
  ]
};

// Hierarquia de roles (para verificações de precedência)
export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1
};

// Função utilitária para verificar se um role tem precedência sobre outro
export const hasRolePrecedence = (userRole: Role, targetRole: Role): boolean => {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
};

// Função utilitária para obter todas as permissões de um role
export const getRolePermissions = (role: Role): Permission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

// Função utilitária para verificar se um role tem uma permissão específica
export const roleHasPermission = (role: Role, permission: Permission): boolean => {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
};