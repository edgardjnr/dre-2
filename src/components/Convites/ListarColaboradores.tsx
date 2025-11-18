import React, { useState, useEffect } from 'react';
import { CollaboratorsService } from '../../services/collaboratorsService';
import type { Collaborator } from '../../types/collaborators';
import { Spinner } from '../ui/Spinner';
import { Users, Shield, Mail, Phone } from 'lucide-react';

interface ListarColaboradoresProps {
  companyId: string;
  showActions?: boolean;
}

export const ListarColaboradores: React.FC<ListarColaboradoresProps> = ({ 
  companyId, 
  showActions = false 
}) => {
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [error, setError] = useState<string | null>(null);

  const roles = {
    owner: { label: 'Proprietário', color: 'bg-purple-100 text-purple-800' },
    admin: { label: 'Administrador', color: 'bg-red-100 text-red-800' },
    member: { label: 'Membro', color: 'bg-blue-100 text-blue-800' },
    viewer: { label: 'Visualizador', color: 'bg-gray-100 text-gray-800' }
  };

  useEffect(() => {
    loadCollaborators();
  }, [companyId]);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CollaboratorsService.getCompanyCollaborators(companyId);
      setCollaborators(data);
    } catch (error: any) {
      console.error('Erro ao carregar colaboradores:', error);
      setError('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
        <span className="ml-2">Carregando colaboradores...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">{error}</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">
            Colaboradores ({collaborators.length})
          </h3>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {collaborators.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum colaborador encontrado</p>
          </div>
        ) : (
          collaborators.map((collaborator) => {
            const roleInfo = roles[collaborator.role as keyof typeof roles] || roles.viewer;
            
            return (
              <div key={collaborator.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {collaborator.user?.email?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          {collaborator.user?.email || 'Email não disponível'}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {roleInfo.label}
                        </span>
                      </div>
                      
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{collaborator.user?.email}</span>
                        </div>
                        
                        {collaborator.created_at && (
                          <span>
                            Membro desde {new Date(collaborator.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-400 rounded-full" title="Ativo"></div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ListarColaboradores;