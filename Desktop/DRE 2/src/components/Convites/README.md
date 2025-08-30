# Sistema de Gestão de Colaboradores e Permissões

Este módulo fornece um sistema completo para gerenciar colaboradores e controlar permissões em aplicações multi-tenant.

## 📋 Componentes Disponíveis

### Componentes Principais

- **`GerenciarColaboradores`** - Interface completa para gestão de colaboradores
- **`ListarColaboradores`** - Lista simples de colaboradores
- **`ConvidarColaborador`** - Formulário para enviar convites
- **`AceitarConvitePage`** - Página para aceitar convites

### Componentes de Proteção

- **`PermissionGuard`** - Protege componentes baseado em permissões
- **`PermissionGate`** - Renderização condicional por permissão
- **`RoleGate`** - Renderização condicional por role
- **`withPermissions`** - HOC para proteger componentes

## 🔐 Sistema de Permissões

### Roles Disponíveis

| Role | Descrição |
|------|----------|
| `owner` | Proprietário da empresa - todas as permissões |
| `admin` | Administrador - quase todas as permissões |
| `member` | Membro - permissões básicas de trabalho |
| `viewer` | Visualizador - apenas leitura |

### Categorias de Permissões

#### 👥 Gestão de Colaboradores
- `canInviteCollaborators` - Convidar novos colaboradores
- `canRemoveCollaborators` - Remover colaboradores
- `canEditCollaboratorRoles` - Editar roles de colaboradores
- `canViewCollaborators` - Visualizar lista de colaboradores

#### 🏢 Gestão da Empresa
- `canEditCompanySettings` - Editar configurações da empresa
- `canDeleteCompany` - Deletar empresa
- `canViewCompanySettings` - Visualizar configurações

#### 📊 Gestão de Dados
- `canCreateData` - Criar novos dados
- `canEditData` - Editar dados existentes
- `canDeleteData` - Deletar dados
- `canViewData` - Visualizar dados
- `canExportData` - Exportar dados

#### 📈 Relatórios
- `canCreateReports` - Criar relatórios
- `canEditReports` - Editar relatórios
- `canDeleteReports` - Deletar relatórios
- `canViewReports` - Visualizar relatórios
- `canExportReports` - Exportar relatórios

#### ⚙️ Configurações Avançadas
- `canManageIntegrations` - Gerenciar integrações
- `canManageBackups` - Gerenciar backups
- `canViewAuditLogs` - Visualizar logs de auditoria
- `canManageApiKeys` - Gerenciar chaves de API

## 🚀 Como Usar

### 1. Hook usePermissions

```tsx
import { usePermissions } from './components/Convites';

function MyComponent({ companyId }: { companyId: string }) {
  const { 
    role, 
    hasPermission, 
    canManageCollaborators,
    loading 
  } = usePermissions(companyId);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <p>Seu role: {role}</p>
      {hasPermission('canInviteCollaborators') && (
        <button>Convidar Colaborador</button>
      )}
    </div>
  );
}
```

### 2. PermissionGuard

Protege componentes inteiros baseado em permissões:

```tsx
import { PermissionGuard } from './components/Convites';

<PermissionGuard 
  companyId={companyId} 
  permission="canViewCollaborators"
  fallback={<div>Acesso negado</div>}
>
  <ListarColaboradores companyId={companyId} />
</PermissionGuard>
```

### 3. PermissionGate

Renderização condicional inline:

```tsx
import { PermissionGate } from './components/Convites';

<div>
  <h1>Dashboard</h1>
  <PermissionGate companyId={companyId} permission="canInviteCollaborators">
    <button>Convidar Colaborador</button>
  </PermissionGate>
</div>
```

### 4. RoleGate

Renderização baseada em role:

```tsx
import { RoleGate } from './components/Convites';

<div>
  <RoleGate companyId={companyId} role="owner">
    <div>Conteúdo exclusivo para proprietários</div>
  </RoleGate>
  
  <RoleGate companyId={companyId} role="admin">
    <div>Conteúdo para administradores</div>
  </RoleGate>
</div>
```

### 5. HOC withPermissions

Protege componentes usando Higher-Order Component:

```tsx
import { withPermissions } from './components/Convites';

const AdminPanel = ({ companyId }: { companyId: string }) => {
  return <div>Painel administrativo</div>;
};

const ProtectedAdminPanel = withPermissions(
  AdminPanel,
  ['canEditCompanySettings'], // Permissões necessárias
  {
    requireAll: true,
    fallback: <div>Acesso negado</div>
  }
);

// Uso
<ProtectedAdminPanel companyId={companyId} />
```

### 6. Componentes Prontos

#### Gestão Completa
```tsx
import { GerenciarColaboradores } from './components/Convites';

<GerenciarColaboradores companyId={companyId} />
```

#### Lista Simples
```tsx
import { ListarColaboradores } from './components/Convites';

<ListarColaboradores companyId={companyId} />
```

#### Formulário de Convite
```tsx
import { ConvidarColaborador } from './components/Convites';

<ConvidarColaborador 
  companyId={companyId}
  onInviteSent={() => console.log('Convite enviado!')}
  onCancel={() => console.log('Cancelado')}
/>
```

## 🔧 Configuração

### 1. Estrutura do Banco de Dados

Certifique-se de que as tabelas estão configuradas:

```sql
-- Tabela de colaboradores
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de convites
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Políticas RLS (Row Level Security)

```sql
-- Habilitar RLS
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Políticas para colaboradores
CREATE POLICY "Users can view collaborators of their companies" ON collaborators
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM collaborators 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para convites
CREATE POLICY "Users can view invitations of their companies" ON invitations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM collaborators 
      WHERE user_id = auth.uid()
    )
  );
```

### 3. Configuração de Email

Para que os convites funcionem, configure um provedor SMTP no Supabase:

1. Acesse o dashboard do Supabase
2. Vá em Authentication > Settings
3. Configure um provedor SMTP (recomendado: Resend)
4. Teste o envio de emails

## 📝 Exemplo Completo

Veja o arquivo `src/examples/PermissionsExample.tsx` para um exemplo completo de uso de todos os componentes e funcionalidades.

## 🛠️ Personalização

### Modificar Permissões

Edite o arquivo `src/types/permissions.ts` para:
- Adicionar novas permissões
- Modificar roles existentes
- Ajustar a hierarquia de roles

### Customizar Componentes

Todos os componentes aceitam props de className para personalização:

```tsx
<GerenciarColaboradores 
  companyId={companyId}
  className="custom-styles"
/>
```

### Fallbacks Personalizados

```tsx
<PermissionGuard 
  companyId={companyId} 
  permission="canViewData"
  fallback={
    <div className="custom-access-denied">
      <h2>Acesso Restrito</h2>
      <p>Entre em contato com o administrador.</p>
    </div>
  }
>
  {/* Conteúdo protegido */}
</PermissionGuard>
```

## 🔍 Troubleshooting

### Problemas Comuns

1. **Permissões não carregam**: Verifique se o `companyId` está correto
2. **Emails não chegam**: Configure SMTP no Supabase
3. **Erro de RLS**: Verifique as políticas do banco de dados
4. **Componente não renderiza**: Verifique se o usuário tem as permissões necessárias

### Debug

Use o modo de desenvolvimento para ver informações de debug:

```tsx
{process.env.NODE_ENV === 'development' && (
  <div>
    <p>Role: {role}</p>
    <p>Permissões: {JSON.stringify(permissions)}</p>
  </div>
)}
```

## 📚 Recursos Adicionais

- [Documentação do Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Configuração de SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

---

**Desenvolvido com ❤️ para facilitar a gestão de colaboradores e permissões em aplicações React.**