export type ContaCategoria = 
  | 'Receita Bruta'
  | 'Deduções e Impostos'
  | 'Custo dos Produtos Vendidos'
  | 'Despesas Comerciais'
  | 'Despesas Administrativas'
  | 'Outras Despesas Operacionais'
  | 'Receitas Financeiras'
  | 'Despesas Financeiras'
  | 'Impostos sobre Lucro';

export type ContaPagarStatus = 'pendente' | 'paga' | 'vencida' | 'cancelada';

export interface Empresa {
  id: string;
  user_id: string;
  created_at: string;
  razaoSocial: string;
  cnpj: string;
  regimeTributario: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';
  dataAbertura: string;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  ativa: boolean;
}

export interface ContaContabil {
  id: string;
  user_id: string;
  created_at: string;
  empresaId: string;
  codigo: string;
  nome: string;
  categoria: ContaCategoria;
  subcategoria?: string | null;
  tipo: 'Analítica' | 'Sintética';
  ativa: boolean;
}

export interface Lancamento {
  id: string;
  user_id: string;
  created_at: string;
  empresaId: string;
  contaId: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'Débito' | 'Crédito';
}

export interface DREPeriodo {
  empresaId: string;
  dataInicio: string;
  dataFim: string;
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custos: number;
  lucroBruto: number;
  despesasComerciais: number;
  despesasAdministrativas: number;
  outrasDespesas: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
  receitasFinanceiras: number;
  despesasFinanceiras: number;
  resultadoFinanceiro: number;
  resultadoAntesIR: number;
  impostosSobreLucro: number;
  lucroLiquido: number;
  margemBruta: number;
  margemOperacional: number;
  margemLiquida: number;
}

export interface DashboardMetrics {
  receitaTotal: number;
  lucroLiquido: number;
  margemLiquida: number;
  variacaoReceita: number;
  variacaoLucro: number;
  comparativoPeriodos: Array<{
    periodo: string;
    receita: number;
    lucro: number;
  }>;
}

// Collaborators and Invitations System
export type CollaboratorRole = 'owner' | 'admin' | 'member' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface EmpresaCollaborator {
  id: string;
  empresaId: string;
  userId: string;
  role: CollaboratorRole;
  invitedBy: string | null;
  invitedAt: string;
  createdAt: string;
  
  // Populated fields
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
  inviter?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface Invitation {
  id: string;
  empresaId: string;
  invitedBy: string;
  email: string;
  role: CollaboratorRole;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  
  // Populated fields
  empresa?: {
    id: string;
    razaoSocial: string;
  };
  inviter?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface InviteCollaboratorData {
  email: string;
  role: CollaboratorRole;
  empresaId: string;
}


export interface ContaPagarFoto {
  id: string;
  contaPagarId: string;
  fotoUrl: string;
  fotoNome: string;
  ordem: number;
  createdAt: string;
}

export interface ContaPagar {
  id: string;
  fornecedor: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: ContaPagarStatus;
  contaContabilId?: string;
  numeroDocumento?: string;
  observacoes?: string;
  empresaId: string;
  fotoUrl?: string; // Deprecated - mantido para compatibilidade
  fotoNome?: string; // Deprecated - mantido para compatibilidade
  fotos?: ContaPagarFoto[]; // Nova propriedade para múltiplas fotos
  createdAt: string;
  updatedAt: string;
}

export interface ContaPagarFormData {
  fornecedor: string;
  valor: number;
  dataVencimento: string;
  contaContabilId?: string;
  numeroDocumento?: string;
  observacoes?: string;
  foto?: File;
}

