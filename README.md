# DRE 2 - Sistema de Gestão Financeira

Uma aplicação web moderna para gerenciamento de dados financeiros e geração de relatórios DRE (Demonstração do Resultado do Exercício) usando React, TypeScript e Supabase.

## 🚀 Funcionalidades

### 🔐 Autenticação e Segurança
- **Registro de Usuários** - Sistema completo de cadastro com confirmação por email
- **Login Seguro** - Autenticação com JWT tokens e gerenciamento de sessão
- **Proteção de Rotas** - Rotas protegidas com controle de acesso
- **Segurança de Dados** - Row Level Security (RLS) para isolamento de dados por usuário

### 🏢 Gestão de Empresas
- **Cadastro de Empresas** - Criação e gerenciamento de múltiplas empresas
- **Perfis Empresariais** - Informações detalhadas de cada empresa
- **Controle Multi-empresa** - Alternância entre diferentes empresas

### 💰 Gestão de Contas
- **Plano de Contas** - Estrutura hierárquica de contas contábeis
- **Categorização** - Organização por tipos de conta (Receitas, Despesas, Ativos, Passivos)
- **Contas Personalizadas** - Criação de contas específicas para cada negócio
- **Histórico de Movimentações** - Rastreamento completo de todas as transações

### 📊 Lançamentos Financeiros
- **Registro de Transações** - Lançamentos de débito e crédito
- **Categorização Automática** - Classificação inteligente de lançamentos
- **Anexos de Comprovantes** - Upload de documentos fiscais
- **Conciliação Bancária** - Comparação com extratos bancários

### 📈 Relatórios e Análises
- **DRE Completa** - Demonstração do Resultado do Exercício detalhada
- **Balanço Patrimonial** - Visão completa dos ativos e passivos
- **Fluxo de Caixa** - Controle de entradas e saídas
- **Análise de Rentabilidade** - Indicadores de performance financeira
- **Relatórios Personalizados** - Filtros por período, conta e categoria

### 📱 Dashboard Interativo
- **Gráficos Dinâmicos** - Visualizações em tempo real dos dados financeiros
- **Indicadores KPI** - Métricas principais de performance
- **Alertas Financeiros** - Notificações de vencimentos e metas
- **Resumo Executivo** - Visão geral da situação financeira

### 📄 Exportação de Dados
- **Exportação PDF** - Relatórios formatados para impressão
- **Exportação Excel** - Planilhas para análise avançada
- **Backup de Dados** - Exportação completa da base de dados
- **Integração Contábil** - Formatos compatíveis com sistemas contábeis

### 💳 Contas a Pagar
- **Controle de Fornecedores** - Cadastro e gestão de fornecedores
- **Agenda de Pagamentos** - Calendário de vencimentos
- **Controle de Fluxo** - Previsão de saídas de caixa
- **Histórico de Pagamentos** - Registro completo de quitações

### 📊 Análises Avançadas
- **Gráficos de Pizza** - Distribuição de gastos por categoria
- **Gráficos de Barras** - Comparação de receitas e despesas
- **Tendências Temporais** - Evolução dos indicadores ao longo do tempo
- **Análise de Fornecedores** - Ranking dos maiores gastos

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Ferramenta de Build**: Vite
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Roteamento**: React Router DOM
- **Estilização**: Tailwind CSS com componentes customizados

## ⚙️ Configuração do Projeto

### Pré-requisitos

- Node.js (v16 ou superior)
- npm ou yarn
- Conta no Supabase

### 1. Instalação

```bash
# Extrair os arquivos do projeto
# Navegar para o diretório do projeto
cd "DRE 2"

# Instalar dependências
npm install
```

### 2. Configuração do Supabase

#### A. Criar um Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login/cadastro e crie um novo projeto
3. Aguarde a configuração completa do projeto

#### B. Obter suas Credenciais

1. No painel do Supabase, vá em **Settings** > **API**
2. Copie:
   - **Project URL** (ex: `https://seu-projeto-id.supabase.co`)
   - **anon/public key** (começa com `eyJhbGciOiJIUzI1NiIs...`)

#### C. Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Edite o `.env` e substitua pelas suas credenciais reais:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

#### D. Configurar Schema do Banco de Dados

1. No painel do Supabase, vá em **SQL Editor**
2. Execute os arquivos de migração em ordem (encontrados em `supabase/migrations/`):
   - `20250729100000_create_profiles_table.sql`
   - `20250725110000_create_core_tables_and_rls.sql`
   - Outros arquivos de migração conforme necessário

Ou use a CLI do Supabase:
```bash
# Instalar CLI do Supabase
npm install -g @supabase/cli

# Inicializar e executar migrações
supabase init
supabase db reset
```

### 3. Executar a Aplicação

```bash
# Iniciar servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### 4. Build para Produção

```bash
# Fazer build do projeto
npm run build

# Visualizar build de produção
npm run preview
```

## 👤 Fluxo de Registro de Usuário

A aplicação inclui um sistema completo de registro de usuários:

1. **Formulário de Registro** (`/register`) - Usuários podem criar contas com email e nome completo
2. **Confirmação por Email** - Supabase envia emails de confirmação automaticamente
3. **Criação de Perfil** - Perfis de usuário são criados automaticamente via triggers do banco
4. **Sistema de Login** (`/login`) - Autenticação segura com gerenciamento de sessão

### Recursos de Autenticação:

- ✅ Registro com email/senha
- ✅ Confirmação por email obrigatória
- ✅ Criação automática de perfil
- ✅ Rotas protegidas
- ✅ Gerenciamento de sessão
- ✅ Row Level Security (RLS)

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── Auth/           # Componentes de autenticação
│   ├── Dashboard/      # Dashboard e gráficos
│   ├── Layout/         # Componentes de layout
│   └── ui/             # Componentes de interface
├── contexts/           # Contextos React
├── lib/                # Bibliotecas e utilitários
├── pages/              # Componentes de página
├── services/           # Serviços de API
└── types/              # Tipos TypeScript
```

## 🔧 Variáveis de Ambiente

Variáveis de ambiente obrigatórias:

- `VITE_SUPABASE_URL` - URL do seu projeto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave anon/public do Supabase

## 🔒 Segurança

- Row Level Security (RLS) habilitado em todas as tabelas
- Isolamento de dados do usuário através de políticas PostgreSQL
- Autenticação segura com tokens JWT
- Rotas protegidas no React Router

## 🚀 Desenvolvimento

### Scripts Disponíveis

- `npm run dev` - Iniciar servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Visualizar build de produção
- `npm run lint` - Executar ESLint

### Testando o Registro de Usuário

1. Inicie o servidor de desenvolvimento
2. Navegue para `/register`
3. Preencha o formulário de registro
4. Verifique seu email para confirmação
5. Clique no link de confirmação
6. Faça login em `/login`

## 🔧 Solução de Problemas

### Problemas Comuns

1. **"Supabase URL and Anon Key must be defined"**
   - Certifique-se de que o arquivo `.env` existe com as credenciais corretas
   - Verifique se as variáveis de ambiente estão configuradas adequadamente

2. **"Database error saving new user"**
   - Certifique-se de que as migrações foram executadas
   - Verifique se as políticas RLS estão configuradas corretamente

3. **Erros TypeScript com import.meta.env**
   - Certifique-se de que `src/vite-env.d.ts` existe
   - Verifique a configuração do TypeScript

### Suporte

Para problemas com este projeto:
1. Verifique o painel do Supabase para logs de autenticação
2. Verifique o console do navegador para erros JavaScript
3. Verifique se as variáveis de ambiente estão carregadas corretamente

---

**DRE 2** - Sistema completo de gestão financeira para pequenas e médias empresas.

Desenvolvido com ❤️ usando tecnologias modernas para oferecer a melhor experiência em gestão financeira.