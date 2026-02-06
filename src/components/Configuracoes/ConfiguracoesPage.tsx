import React, { useMemo, useState, useEffect } from 'react';
import { Settings, UserPlus, Users, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CollaboratorsService } from '../../services/collaboratorsService';
import type { CompanyCollaborator, CollaboratorRole } from '../../types/collaborators';
import { Spinner } from '../ui/Spinner';
import { ConfirmModal } from '../ui/ConfirmModal';
import { supabase } from '../../lib/supabaseClient';


export const ConfiguracoesPage: React.FC = () => {
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [collaborators, setCollaborators] = useState<CompanyCollaborator[]>([]);
  const [lastInviteLink, setLastInviteLink] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  type DreCategoriaRow = {
    id: string;
    empresa_id: string;
    parent_id: string | null;
    codigo: string;
    nome: string;
  };

  const [dreCategorias, setDreCategorias] = useState<DreCategoriaRow[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [novaPrincipalNome, setNovaPrincipalNome] = useState('');
  const [novaSubPrincipalId, setNovaSubPrincipalId] = useState('');
  const [novaSubNome, setNovaSubNome] = useState('');
  const [categoriasError, setCategoriasError] = useState<string | null>(null);
  const [deleteCategoriaOpen, setDeleteCategoriaOpen] = useState(false);
  const [deleteCategoria, setDeleteCategoria] = useState<DreCategoriaRow | null>(null);

  const [contasContabeis, setContasContabeis] = useState<any[]>([]);
  const [loadingContas, setLoadingContas] = useState(false);
  const [contasError, setContasError] = useState<string | null>(null);
  const [novaContaCodigo, setNovaContaCodigo] = useState('');
  const [novaContaNome, setNovaContaNome] = useState('');
  const [novaContaCategoria, setNovaContaCategoria] = useState('');

  useEffect(() => {
    fetchEmpresas();
  }, []);

  // Inicializar o nome do usuário quando o perfil for carregado


  useEffect(() => {
    if (selectedEmpresa) {
      fetchCollaborators();
      fetchDreCategorias();
      fetchContasContabeis();
    }
  }, [selectedEmpresa]);

  const fetchEmpresas = async () => {
    if (!user) {
      console.log('Usuário não está autenticado');
      return;
    }
    
    console.log('Buscando empresas para usuário:', user.id);
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_companies');
      
      console.log('Resultado da busca de empresas:', { data, error });
      
      if (error) throw error;
      
      setEmpresas((data || []).map((row: any) => ({
        id: row.id,
        razaoSocial: row.razao_social
      })));
      if (data && data.length > 0) {
        setSelectedEmpresa(data[0].id);
        console.log('Empresa selecionada automaticamente:', data[0]);
      } else {
        console.log('Nenhuma empresa encontrada para este usuário');
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContasContabeis = async () => {
    if (!selectedEmpresa) return;
    try {
      setLoadingContas(true);
      setContasError(null);
      const { data, error } = await supabase
        .from('contas_contabeis')
        .select('id, codigo, nome, categoria, tipo, ativa')
        .eq('empresa_id', selectedEmpresa)
        .order('codigo', { ascending: true });
      if (error) throw error;
      setContasContabeis(data || []);
    } catch (error: any) {
      setContasError(error?.message || 'Erro ao carregar contas contábeis');
      setContasContabeis([]);
    } finally {
      setLoadingContas(false);
    }
  };

  const handleAddContaContabil = async () => {
    if (!selectedEmpresa || !novaContaCodigo.trim() || !novaContaNome.trim() || !novaContaCategoria.trim()) return;
    try {
      setLoadingContas(true);
      setContasError(null);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('contas_contabeis')
        .insert({
          user_id: currentUser.id,
          empresa_id: selectedEmpresa,
          codigo: novaContaCodigo.trim(),
          nome: novaContaNome.trim(),
          categoria: novaContaCategoria.trim(),
          tipo: 'Analítica',
          ativa: true
        });
      if (error) throw error;
      setNovaContaCodigo('');
      setNovaContaNome('');
      setNovaContaCategoria('');
      await fetchContasContabeis();
    } catch (error: any) {
      setContasError(error?.message || 'Erro ao criar conta contábil');
    } finally {
      setLoadingContas(false);
    }
  };

  const handleDeleteContaContabil = async (contaId: string) => {
    try {
      setLoadingContas(true);
      setContasError(null);
      const { error } = await supabase
        .from('contas_contabeis')
        .delete()
        .eq('id', contaId);
      if (error) throw error;
      await fetchContasContabeis();
    } catch (error: any) {
      setContasError(error?.message || 'Erro ao excluir conta contábil');
    } finally {
      setLoadingContas(false);
    }
  };

  const fetchCollaborators = async () => {
    try {
      setLoadingAction('collaborators');
      const data = await CollaboratorsService.getCompanyCollaborators(selectedEmpresa);
      setCollaborators(data);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const fetchDreCategorias = async () => {
    if (!selectedEmpresa) return;
    try {
      setLoadingCategorias(true);
      setCategoriasError(null);
      const { data, error } = await supabase
        .from('dre_categorias_dre')
        .select('id, empresa_id, parent_id, codigo, nome')
        .eq('empresa_id', selectedEmpresa)
        .order('codigo', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as DreCategoriaRow[];
      setDreCategorias(rows);
      const principals = rows.filter((r) => r.parent_id === null);
      if (principals.length > 0 && !novaSubPrincipalId) {
        setNovaSubPrincipalId(principals[0].id);
      }
    } catch (error: any) {
      setCategoriasError(error?.message || 'Erro ao carregar categorias');
      setDreCategorias([]);
    } finally {
      setLoadingCategorias(false);
    }
  };

  const drePrincipais = useMemo(() => dreCategorias.filter((r) => r.parent_id === null), [dreCategorias]);
  const proximoCodigoPrincipal = useMemo(() => {
    const nums = drePrincipais
      .map((r) => parseInt(String(r.codigo).split('.')[0], 10))
      .filter((n) => Number.isFinite(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return String(max + 1);
  }, [drePrincipais]);

  const principalSelecionada = useMemo(() => {
    return drePrincipais.find((p) => p.id === novaSubPrincipalId) || null;
  }, [drePrincipais, novaSubPrincipalId]);

  const proximoCodigoSubcategoria = useMemo(() => {
    if (!principalSelecionada) return '';
    const prefix = `${principalSelecionada.codigo}.`;
    const subs = dreCategorias
      .filter((r) => r.parent_id === principalSelecionada.id && typeof r.codigo === 'string' && r.codigo.startsWith(prefix));
    const nums = subs
      .map((r) => {
        const rest = r.codigo.slice(prefix.length);
        const first = rest.split('.')[0];
        const n = parseInt(first, 10);
        return Number.isFinite(n) ? n : NaN;
      })
      .filter((n) => Number.isFinite(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `${principalSelecionada.codigo}.${max + 1}`;
  }, [principalSelecionada, dreCategorias]);

  const dreSubsByPrincipal = useMemo(() => {
    const map = new Map<string, DreCategoriaRow[]>();
    for (const row of dreCategorias) {
      if (!row.parent_id) continue;
      const list = map.get(row.parent_id) || [];
      list.push(row);
      map.set(row.parent_id, list);
    }
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => a.codigo.localeCompare(b.codigo));
      map.set(key, list);
    }
    return map;
  }, [dreCategorias]);

  const isCodigoDisponivel = (codigo: string): boolean => {
    return !dreCategorias.some((r) => r.codigo === codigo);
  };

  const friendlyCategoriaError = (error: any, fallback: string) => {
    const msg = error?.message || fallback;
    if (/duplicate key|unique constraint|violates unique constraint/i.test(msg)) {
      return 'Esse código já existe. Tente novamente.';
    }
    return msg;
  };

  const handleAddPrincipal = async () => {
    if (!selectedEmpresa || !proximoCodigoPrincipal || !novaPrincipalNome.trim()) return;
    try {
      if (!isCodigoDisponivel(proximoCodigoPrincipal)) {
        setCategoriasError('Esse código já existe. Tente novamente.');
        return;
      }
      setLoadingCategorias(true);
      setCategoriasError(null);
      const { error } = await supabase.from('dre_categorias_dre').insert({
        empresa_id: selectedEmpresa,
        parent_id: null,
        codigo: proximoCodigoPrincipal,
        nome: novaPrincipalNome.trim(),
      });
      if (error) throw error;
      setNovaPrincipalNome('');
      await fetchDreCategorias();
    } catch (error: any) {
      setCategoriasError(friendlyCategoriaError(error, 'Erro ao criar categoria principal'));
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleAddSubcategoria = async () => {
    if (!selectedEmpresa || !novaSubPrincipalId || !proximoCodigoSubcategoria || !novaSubNome.trim()) return;
    try {
      const principal = dreCategorias.find((r) => r.id === novaSubPrincipalId && r.parent_id === null);
      if (!principal) {
        setCategoriasError('Selecione uma categoria principal válida');
        return;
      }
      if (!isCodigoDisponivel(proximoCodigoSubcategoria)) {
        setCategoriasError('Esse código já existe. Tente novamente.');
        return;
      }

      setLoadingCategorias(true);
      setCategoriasError(null);
      const { error } = await supabase.from('dre_categorias_dre').insert({
        empresa_id: selectedEmpresa,
        parent_id: novaSubPrincipalId,
        codigo: proximoCodigoSubcategoria,
        nome: novaSubNome.trim(),
      });
      if (error) throw error;
      setNovaSubNome('');
      await fetchDreCategorias();
    } catch (error: any) {
      setCategoriasError(friendlyCategoriaError(error, 'Erro ao criar subcategoria'));
    } finally {
      setLoadingCategorias(false);
    }
  };

  const requestDeleteCategoria = (categoriaId: string) => {
    const categoria = dreCategorias.find((r) => r.id === categoriaId) || null;
    setDeleteCategoria(categoria);
    setDeleteCategoriaOpen(true);
  };

  const handleDeleteCategoria = async (categoriaId: string) => {
    try {
      setLoadingCategorias(true);
      setCategoriasError(null);
      const { error } = await supabase.rpc('delete_dre_categoria', { p_categoria_id: categoriaId });
      if (error) throw error;
      await fetchDreCategorias();
      setDeleteCategoriaOpen(false);
      setDeleteCategoria(null);
    } catch (error: any) {
      setCategoriasError(error?.message || 'Erro ao excluir categoria');
    } finally {
      setLoadingCategorias(false);
    }
  };

  // Convites pendentes removidos do sistema

  const createUserAndLink = async () => {
    if (!inviteEmail.trim() || !selectedEmpresa) {
      console.log('Validação falhou:', { inviteEmail: inviteEmail.trim(), selectedEmpresa });
      return;
    }
    try {
      setLoadingAction('creating-user');
      const resp = await fetch('/api/create-user-and-link-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), companyId: selectedEmpresa })
      });
      const result = await resp.json();
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }
      alert('✅ Usuário criado e vinculado à empresa com sucesso!');
      setInviteEmail('');
      setShowInviteForm(false);
      fetchCollaborators();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      alert(`❌ Erro ao criar usuário: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      const originalTitle = document.title;
      document.title = '✅ Link Copiado!';
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
      
      alert('🔗 Link copiado para a área de transferência!\n\n📱 Agora você pode compartilhar via:\n• WhatsApp\n• Email\n• Telegram\n• Qualquer outra plataforma');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('🔗 Link selecionado! Use Ctrl+C para copiar.');
      } catch (err) {
        alert('❌ Erro ao copiar. Tente selecionar e copiar manualmente:\n\n' + text);
      }
      document.body.removeChild(textArea);
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este colaborador?')) return;
    
    try {
      setLoadingAction(`removing-${collaboratorId}`);
      const result = await CollaboratorsService.removeCollaborator(collaboratorId);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao remover colaborador');
      }
      fetchCollaborators();
      alert('Colaborador removido com sucesso!');
    } catch (error: any) {
      console.error('Erro ao remover colaborador:', error);
      alert(`Erro ao remover colaborador: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Cancelamento de convites removido do sistema

  const formatMemberSince = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
      </div>


      {/* Seleção de Empresa */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Empresa</h2>
        <select
          value={selectedEmpresa}
          onChange={(e) => setSelectedEmpresa(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Selecione uma empresa</option>
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.razaoSocial}
            </option>
          ))}
        </select>
      </div>

      {selectedEmpresa && (
        <>
          {/* Gestão de Colaboradores */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Colaboradores</h2>
              </div>
              <button
                onClick={() => setShowInviteForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                disabled={loadingAction === 'creating-user'}
              >
                <UserPlus className="h-4 w-4" />
                {loadingAction === 'creating-user' ? 'Criando...' : 'Adicionar Usuário'}
              </button>
            </div>

            {/* Lista de Colaboradores */}
            <div className="space-y-4">
              {loadingAction === 'collaborators' ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : collaborators.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum colaborador encontrado</p>
                </div>
              ) : (
                collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {collaborator.user?.email || 'Sem email'}
                        </p>
                        {collaborator.user?.user_metadata?.full_name && collaborator.user.user_metadata.full_name !== 'Usuário' && (
                          <p className="text-sm text-gray-500">{collaborator.user.user_metadata.full_name}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          Membro desde {formatMemberSince(collaborator.joined_at || collaborator.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Usuário
                      </span>
                      {collaborator.role !== 'owner' && collaborator.role !== 'master' && (
                        <button
                          onClick={() => removeCollaborator(collaborator.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          disabled={loadingAction === `removing-${collaborator.id}`}
                        >
                          {loadingAction === `removing-${collaborator.id}` ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">DRE e Plano de Contas</h2>
              </div>
            </div>

            {(categoriasError || contasError) && (
              <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                {categoriasError || contasError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Criar Conta Contábil</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Código</label>
                    <input
                      value={novaContaCodigo}
                      onChange={(e) => setNovaContaCodigo(e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex.: 1.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Categoria</label>
                    <input
                      value={novaContaCategoria}
                      onChange={(e) => setNovaContaCategoria(e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex.: Receita Bruta"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                    <input
                      value={novaContaNome}
                      onChange={(e) => setNovaContaNome(e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex.: Produtos"
                    />
                  </div>
                  
                </div>
                <div className="mt-3">
                  <button
                    onClick={handleAddContaContabil}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                    disabled={loadingContas}
                  >
                    <Plus className="h-4 w-4" />
                    Criar
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Criar Categoria DRE</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Categoria Principal</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Código (automático)</label>
                        <input value={proximoCodigoPrincipal} readOnly className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Nome</label>
                        <input value={novaPrincipalNome} onChange={(e) => setNovaPrincipalNome(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ex.: Receita Bruta" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <button onClick={handleAddPrincipal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2" disabled={loadingCategorias}>
                        <Plus className="h-4 w-4" />
                        Criar Principal
                      </button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Subcategoria</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Categoria Principal</label>
                        <select value={novaSubPrincipalId} onChange={(e) => setNovaSubPrincipalId(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          {drePrincipais.map((p) => (
                            <option key={p.id} value={p.id}>{`${p.codigo}. ${p.nome}`}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Código (automático)</label>
                          <input value={proximoCodigoSubcategoria} readOnly className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Nome</label>
                          <input value={novaSubNome} onChange={(e) => setNovaSubNome(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ex.: Venda de Bebidas" />
                        </div>
                      </div>
                      <div>
                        <button onClick={handleAddSubcategoria} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2" disabled={loadingCategorias || drePrincipais.length === 0}>
                          <Plus className="h-4 w-4" />
                          Criar Subcategoria
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Contas Contábeis Cadastradas</h3>
                  <button onClick={fetchContasContabeis} className="text-sm text-blue-600 hover:text-blue-700" disabled={loadingContas}>Recarregar</button>
                </div>
                {loadingContas ? (
                  <div className="p-4"><Spinner /></div>
                ) : contasContabeis.length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">Nenhuma conta contábil cadastrada para esta empresa.</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {contasContabeis.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between">
                        <div className="text-sm text-gray-900">{`${c.codigo} - ${c.nome}`}<span className="ml-2 text-gray-600">({c.categoria})</span></div>
                        <button type="button" onClick={() => handleDeleteContaContabil(c.id)} className="text-red-600 hover:text-red-800 p-1" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Categorias DRE Cadastradas</h3>
                  <button onClick={fetchDreCategorias} className="text-sm text-blue-600 hover:text-blue-700" disabled={loadingCategorias}>Recarregar</button>
                </div>
                {drePrincipais.length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">Nenhuma categoria cadastrada para esta empresa.</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {drePrincipais.map((p) => {
                      const subs = dreSubsByPrincipal.get(p.id) || [];
                      return (
                        <div key={p.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-900">{`${p.codigo}. ${p.nome}`}</div>
                            <button type="button" onClick={() => requestDeleteCategoria(p.id)} className="text-red-600 hover:text-red-800 p-1" disabled={loadingCategorias} title="Excluir"><Trash2 className="h-4 w-4" /></button>
                          </div>
                          {subs.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {subs.map((s) => (
                                <div key={s.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                                  <div className="text-sm text-gray-800">{`${s.codigo} ${s.nome}`}</div>
                                  <button type="button" onClick={() => requestDeleteCategoria(s.id)} className="text-red-600 hover:text-red-800 p-1" disabled={loadingCategorias} title="Excluir"><Trash2 className="h-4 w-4" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Convites pendentes removidos */}
        </>
      )}

      {/* Modal de Convite */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Usuário</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email do colaborador
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="colaborador@exemplo.com"
                />
              </div>
              
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={createUserAndLink}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                disabled={loadingAction === 'creating-user'}
              >
                {loadingAction === 'creating-user' ? 'Criando...' : 'Adicionar'}
              </button>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                disabled={loadingAction === 'creating-user'}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteCategoriaOpen}
        onClose={() => {
          setDeleteCategoriaOpen(false);
          setDeleteCategoria(null);
        }}
        onConfirm={() => {
          if (deleteCategoria?.id) {
            void handleDeleteCategoria(deleteCategoria.id);
            return;
          }
          setDeleteCategoriaOpen(false);
          setDeleteCategoria(null);
        }}
        title="Confirmar exclusão"
        message={
          deleteCategoria
            ? `Deseja excluir ${deleteCategoria.parent_id ? 'esta subcategoria' : 'esta categoria'}?\n\n${deleteCategoria.codigo}${deleteCategoria.parent_id ? '' : '.'} ${deleteCategoria.nome}\n\nA exclusão só é permitida se não houver contas vinculadas.`
            : 'Deseja excluir esta categoria? A exclusão só é permitida se não houver contas vinculadas.'
        }
        type="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        loading={loadingCategorias}
      />

      {/* Removido link de último convite */}
    </div>
  );
};
