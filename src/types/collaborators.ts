export type CollaboratorRole = 'owner' | 'admin' | 'member' | 'viewer' | 'master';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface CompanyCollaborator {
  id: string;
  company_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_by: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
  // Dados do usuário (via join)
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: CollaboratorRole;
  invited_by: string;
  status: InvitationStatus;
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  // Dados da empresa (via join)
  company?: {
    id: string;
    razao_social: string;
    nome_fantasia?: string;
  };
}

export interface InviteCollaboratorRequest {
  email: string;
  role: CollaboratorRole;
  company_id: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  error?: string;
  company_id?: string;
  role?: CollaboratorRole;
}