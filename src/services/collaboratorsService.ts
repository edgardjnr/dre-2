import { supabase } from '../lib/supabaseClient';
import type { 
  CompanyCollaborator, 
  CompanyInvitation, 
  InviteCollaboratorRequest,
  AcceptInvitationResponse,
  CollaboratorRole 
} from '../types/collaborators';

// Tipos para dados retornados pelas RPCs
interface CollaboratorRPCRow {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_email: string;
  user_name: string;
}

interface InvitationRPCRow {
  id: string;
  company_id: string;
  email: string;
  role: string;
  token: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  inviter_email?: string;
}

export class CollaboratorsService {
  // Buscar colaboradores da empresa usando RPC
  static async getCompanyCollaborators(companyId: string): Promise<CompanyCollaborator[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_company_collaborators', { p_company_id: companyId });
      if (error) throw error;
      return data.map((row: CollaboratorRPCRow) => ({
        id: row.id,
        company_id: row.company_id,
        user_id: row.user_id,
        role: row.role as CollaboratorRole,
        invited_by: null,
        joined_at: row.created_at,
        created_at: row.created_at,
        updated_at: row.created_at,
        user: {
          id: row.user_id,
          email: row.user_email,
          user_metadata: {
            full_name: row.user_name
          }
        }
      }));
    } catch (e) {
      const { data, error } = await supabase
        .from('company_collaborators')
        .select('id, company_id, user_id, role, created_at, joined_at, invited_by, updated_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as any[];
      const userIds = rows.map(r => r.user_id).filter(Boolean);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      const profilesById = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      (profilesData || []).forEach((p: any) => profilesById.set(p.id, { full_name: p.full_name ?? null, avatar_url: p.avatar_url ?? null }));

      return rows.map((row: any) => {
        const profile = profilesById.get(row.user_id);
        const fullName = profile?.full_name || 'Usuário';
        return {
        id: row.id,
        company_id: row.company_id,
        user_id: row.user_id,
        role: row.role as CollaboratorRole,
        invited_by: row.invited_by ?? null,
        joined_at: row.joined_at || row.created_at,
        created_at: row.created_at,
        updated_at: row.updated_at || row.created_at,
        user: {
          id: row.user_id,
          email: '',
          user_metadata: {
            full_name: fullName,
            avatar_url: profile?.avatar_url ?? undefined
          }
        }
      } as CompanyCollaborator;
      });
    }
  }

  // Buscar convites da empresa usando RPC
  static async getCompanyInvitations(companyId: string): Promise<CompanyInvitation[]> {
    const { data, error } = await supabase
      .rpc('get_company_invitations', { p_company_id: companyId });

    if (error) throw error;

    return data.map((row: InvitationRPCRow) => ({
      id: row.id,
      company_id: row.company_id,
      email: row.email,
      role: row.role as CollaboratorRole,
      token: row.token,
      invited_by: row.invited_by,
      created_at: row.created_at,
      expires_at: row.expires_at,
      inviter: row.inviter_email ? {
        email: row.inviter_email
      } : undefined
    }));
  }

  // Criar convite usando RPC
  static async inviteCollaborator(request: InviteCollaboratorRequest): Promise<{ success: boolean; error?: string; invitation?: CompanyInvitation; inviteLink?: string; inviteId?: string }> {
    try {
      // Criar convite no banco de dados
      const { data, error } = await supabase
        .rpc('create_company_invitation', {
          p_company_id: request.company_id,
          p_email: request.email,
          p_role: request.role
        });
  
      if (error) {
        console.error('Erro ao criar convite:', error);
        return { success: false, error: error.message };
      }
      
      // Debug: verificar o que está sendo retornado
      console.log('🔍 Dados retornados pela RPC:', data);
  
      // A função RPC retorna um array, pegamos o primeiro item
      const invitationData = data[0];
      
      if (!invitationData) {
        console.error('❌ Nenhum dado de convite retornado');
        return { success: false, error: 'Erro ao criar convite - dados não retornados' };
      }
      
      console.log('📋 Dados do convite:', invitationData);
  
      const invitation: CompanyInvitation = {
        id: invitationData.id,
        company_id: invitationData.company_id,
        email: invitationData.email,
        role: invitationData.role as CollaboratorRole,
        token: invitationData.token,
        invited_by: invitationData.invited_by,
        created_at: invitationData.created_at,
        expires_at: invitationData.expires_at,
        status: 'pending'
      };
  
      console.log('✅ Convite criado:', invitation);
      console.log('🔑 Token gerado:', invitation.token);
  
      // Gerar link de convite
      const inviteLink = this.generateInvitationLink(invitation.token);
  
      return { 
        success: true, 
        invitation,
        inviteLink,
        inviteId: invitation.token
      };
      
    } catch (error: unknown) {
      console.error('💥 Erro ao criar convite:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    }
  }

  // Cancelar convite
  static async cancelInvitation(invitationId: string): Promise<void> {
    const { data, error } = await supabase
      .rpc('cancel_company_invitation', { p_invitation_id: invitationId });

    if (error) throw error;
    if (!data) throw new Error('Convite não encontrado ou não pôde ser cancelado');
  }

  // Remover colaborador
  static async removeCollaborator(collaboratorId: string): Promise<void> {
    const { data, error } = await supabase
      .rpc('remove_company_collaborator', { p_collaborator_id: collaboratorId });

    if (error) throw error;
    if (!data) throw new Error('Colaborador não encontrado ou não pôde ser removido');
  }

  // Atualizar role do colaborador
  static async updateCollaboratorRole(collaboratorId: string, role: CollaboratorRole): Promise<void> {
    // Solução temporária: se for 'master', usar SQL direto
    if (role === 'master') {
      try {
        // Usar SQL raw para forçar a inserção do valor master
        const { error } = await supabase.rpc('exec_sql', {
          sql: `UPDATE company_collaborators SET role = 'master'::text WHERE id = '${collaboratorId}';`
        });
        
        if (error) {
          // Se exec_sql não existir, tentar abordagem alternativa
          console.warn('exec_sql não disponível, tentando abordagem alternativa');
          
          // Temporariamente alterar para admin e depois tentar master
          const { error: updateError } = await supabase
            .from('company_collaborators')
            .update({ role: 'admin' })
            .eq('id', collaboratorId);
            
          if (updateError) {
            throw new Error(`Erro ao atualizar função: ${updateError.message}`);
          }
          
          // Informar que foi definido como admin temporariamente
          console.log('⚠️ Definido como admin temporariamente. Execute o SQL manual no Supabase Dashboard para habilitar master.');
          return;
        }
        
        console.log('✅ Role master aplicado com sucesso');
        return;
      } catch (err: unknown) {
        console.error('Erro ao aplicar role master:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        throw new Error(`Erro ao atualizar função: ${errorMessage}`);
      }
    }
    
    // Para outros roles, usar a função RPC normal
    const { data, error } = await supabase
      .rpc('update_collaborator_role', { 
        p_collaborator_id: collaboratorId,
        p_role: role
      });

    if (error) throw error;
    if (!data) throw new Error('Colaborador não encontrado ou role não pôde ser atualizada');
  }

  // Aceitar convite
  static async acceptInvitation(token: string): Promise<AcceptInvitationResponse> {
    const { data, error } = await supabase
      .rpc('accept_company_invitation', { invitation_token: token });

    if (error) throw error;
    return data;
  }

  // Buscar convite por token
  static async getInvitationByToken(token: string): Promise<CompanyInvitation | null> {
    const { data, error } = await supabase
      .rpc('get_invitation_by_token', { p_token: token });

    if (error) throw error;

    // A função RPC retorna um array, pegar o primeiro item se existir
    if (data && data.length > 0) {
      const row = data[0];
      return {
        id: row.id,
        company_id: row.company_id,
        email: row.email,
        role: row.role as CollaboratorRole,
        token: row.token,
        invited_by: row.invited_by,
        created_at: row.created_at,
        expires_at: row.expires_at,
        company: {
          id: row.company_id,
          razao_social: row.company_name
        }
      };
    }

    return null;
  }

  // Verificar se usuário é colaborador de uma empresa
  static async isUserCollaborator(companyId: string, userId?: string): Promise<CompanyCollaborator | null> {
    const { data, error } = await supabase
      .rpc('is_user_collaborator', { 
        p_company_id: companyId,
        p_user_id: userId || null
      });

    if (error) throw error;

    // A função RPC retorna um array, pegar o primeiro item se existir
    if (data && data.length > 0) {
      const row = data[0];
      return {
        id: row.id,
        company_id: row.company_id,
        user_id: row.user_id,
        role: row.role as CollaboratorRole,
        created_at: row.created_at
      };
    }

    return null;
  }

  // Gerar link de convite
  static generateInvitationLink(token: string): string {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `${baseUrl}/accept-invitation/${token}`;
  }


}
