# Documento de Requisitos do Produto (PRD) - Sistema DRE 2

## 1. Visão Geral do Produto

### 1.1 Descrição
O DRE 2 é um sistema completo de gestão financeira desenvolvido para pequenas e médias empresas, focado na geração de Demonstrativos de Resultado do Exercício (DRE) e no controle eficiente de fluxo de caixa. A plataforma permite o gerenciamento de múltiplas empresas, contas contábeis, lançamentos financeiros, contas a pagar e relatórios analíticos.

### 1.2 Proposta de Valor
O sistema oferece uma solução integrada para gestão financeira que simplifica a geração de DRE, automatiza o controle de contas a pagar, e fornece insights valiosos através de relatórios analíticos, permitindo que pequenas e médias empresas tomem decisões financeiras mais informadas sem a necessidade de conhecimentos contábeis avançados.

### 1.3 Público-Alvo
- Pequenas e médias empresas
- Contadores e consultores financeiros
- Gestores e administradores financeiros
- Empreendedores individuais

## 2. Requisitos Funcionais

### 2.1 Sistema de Autenticação e Acesso

#### 2.1.1 Cadastro e Login
- Registro de novos usuários com validação de email
- Sistema de código de ativação para controle de acesso
- Login com email e senha
- Recuperação de senha
- Integração com Supabase Auth

#### 2.1.2 Sistema de Colaboradores e Permissões
- Gerenciamento de colaboradores com diferentes níveis de acesso
- Definição de papéis e permissões (admin, gerente, operador, etc.)
- Convite de novos colaboradores por email
- Controle de acesso baseado em Row Level Security (RLS)

### 2.2 Gestão de Empresas

#### 2.2.1 Cadastro de Empresas
- Registro de múltiplas empresas por usuário
- Dados cadastrais completos (razão social, CNPJ, endereço, etc.)
- Seletor de empresa ativo em toda a aplicação

### 2.3 Plano de Contas

#### 2.3.1 Contas Contábeis
- Cadastro de contas contábeis com código, nome, categoria e subcategoria
- Estrutura hierárquica de contas
- Classificação por tipo (receita, despesa, etc.)
- Status de ativação/desativação

### 2.4 Lançamentos Financeiros

#### 2.4.1 Registro de Transações
- Lançamentos de crédito e débito
- Vinculação com contas contábeis
- Descrição detalhada e valores
- Datas de competência
- Geração automática de lançamentos a partir de contas pagas

### 2.5 Contas a Pagar

#### 2.5.1 Gestão de Contas a Pagar
- Cadastro de contas a pagar com fornecedor, descrição, valor e vencimento
- Controle de status (pendente, paga, vencida, cancelada)
- Upload de comprovantes de pagamento
- Vinculação com contas contábeis
- Geração automática de lançamentos no DRE ao marcar como paga

### 2.6 Relatórios e Análises

#### 2.6.1 Demonstrativo de Resultado do Exercício (DRE)
- Geração automática de DRE com base nos lançamentos
- Estrutura completa (Receita Bruta, Deduções, Lucro Bruto, etc.)
- Comparativo entre períodos (mensal, trimestral, anual)
- Visualização gráfica de margens e indicadores

#### 2.6.2 Fluxo de Caixa
- Relatório de fluxo de caixa com entradas, saídas e saldo
- Evolução do fluxo de caixa nos últimos 12 meses
- Análise por categoria
- Projeções para os próximos meses

#### 2.6.3 Dashboard Analítico
- Visão consolidada dos principais indicadores financeiros
- Gráficos de desempenho e tendências
- KPIs financeiros e comparativos
- Alertas e recomendações de melhoria

### 2.7 Configuração do Sistema

#### 2.7.1 Integração com Supabase
- Configuração de credenciais Supabase
- Execução de migrações de banco de dados
- Teste de conexão com serviços Supabase

## 3. Requisitos Não-Funcionais

### 3.1 Usabilidade
- Interface responsiva para desktop e dispositivos móveis
- Design moderno e intuitivo
- Suporte a instalação como PWA (Progressive Web App)

### 3.2 Desempenho
- Carregamento rápido de relatórios e dashboards
- Otimização de consultas ao banco de dados
- Paginação e filtragem eficiente de listas

### 3.3 Segurança
- Autenticação segura via Supabase Auth
- Políticas de Row Level Security (RLS) para isolamento de dados
- Proteção contra acesso não autorizado
- Validação de dados em formulários

### 3.4 Disponibilidade
- Funcionamento offline para funções básicas (PWA)
- Modo de demonstração quando não configurado

## 4. Arquitetura do Sistema

### 4.1 Frontend
- Aplicação React com TypeScript
- Vite como bundler
- Tailwind CSS para estilização
- Componentes reutilizáveis
- Hooks personalizados para lógica de negócio

### 4.2 Backend
- Supabase como plataforma de backend
- PostgreSQL como banco de dados
- Funções Edge para processamento serverless
- Autenticação e autorização via Supabase Auth

### 4.3 Banco de Dados

#### 4.3.1 Tabelas Principais
- **empresas**: Armazena dados das empresas gerenciadas
- **contas_contabeis**: Plano de contas com hierarquia e categorização
- **lancamentos**: Registros financeiros de crédito e débito
- **contas_a_pagar**: Controle de contas a pagar com status e comprovantes
- **profiles**: Perfis de usuários com dados complementares
- **collaborators**: Sistema de colaboradores com permissões
- **invitations**: Convites para novos colaboradores
- **activation_codes**: Códigos de ativação para controle de acesso

## 5. Fluxos de Usuário

### 5.1 Fluxo de Ativação e Cadastro
1. Usuário solicita código de ativação fornecendo email, nome e empresa
2. Sistema gera código e envia para administrador
3. Administrador fornece código ao usuário
4. Usuário utiliza código para acessar tela de cadastro
5. Usuário completa cadastro e acessa o sistema

### 5.2 Fluxo de Gestão de Contas a Pagar
1. Usuário cadastra conta a pagar com dados do fornecedor, valor e vencimento
2. Sistema notifica sobre contas próximas do vencimento
3. Usuário marca conta como paga e opcionalmente anexa comprovante
4. Sistema gera automaticamente lançamento no DRE
5. Lançamento é refletido nos relatórios financeiros

### 5.3 Fluxo de Geração de DRE
1. Sistema agrega lançamentos por categorias contábeis
2. Cálculo automático de receitas, despesas e resultados
3. Geração de estrutura completa do DRE
4. Apresentação visual com gráficos e indicadores
5. Comparativo com períodos anteriores

## 6. Integrações

### 6.1 Supabase
- Autenticação e gerenciamento de usuários
- Banco de dados PostgreSQL
- Storage para armazenamento de comprovantes
- Funções Edge para processamento serverless

### 6.2 Serviços de Email
- Integração para envio de códigos de ativação
- Notificações de contas a vencer
- Convites para colaboradores

## 7. Considerações de Implementação

### 7.1 Configuração Inicial
- Criação de projeto no Supabase
- Configuração de variáveis de ambiente
- Execução de migrações de banco de dados
- Configuração de políticas de RLS

### 7.2 Manutenção
- Monitoramento de logs de autenticação
- Verificação de erros no console do navegador
- Atualização de dependências
- Backup regular dos dados

## 8. Métricas de Sucesso

### 8.1 Indicadores de Desempenho
- Tempo de geração de relatórios
- Taxa de conversão de cadastros
- Número de lançamentos processados
- Satisfação do usuário

## 9. Roadmap Futuro

### 9.1 Funcionalidades Planejadas
- Integração com sistemas de emissão de notas fiscais
- Aplicativo móvel nativo
- Importação/exportação de dados em formatos padrão
- Módulo de orçamento e planejamento financeiro
- Integração com bancos para reconciliação automática

## 10. Suporte e Troubleshooting

### 10.1 Problemas Comuns
- Erros de configuração do Supabase
- Falhas na execução de migrações
- Problemas de autenticação
- Erros na geração de relatórios

### 10.2 Recursos de Suporte
- Documentação detalhada
- Guias de configuração
- Verificação de logs no painel do Supabase
- Verificação de console do navegador

---

Este PRD fornece uma visão abrangente do sistema DRE 2, detalhando suas funcionalidades, arquitetura e fluxos de usuário. O documento serve como guia para o desenvolvimento, implementação e manutenção do sistema, garantindo que todas as partes interessadas tenham uma compreensão clara dos requisitos e objetivos do produto.