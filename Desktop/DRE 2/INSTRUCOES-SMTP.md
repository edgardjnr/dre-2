# Configuração SMTP do Resend para Supabase

Este guia explica como configurar o SMTP do Resend no seu projeto Supabase para permitir envio de emails para qualquer endereço.

## Passo 1: Obter Access Token do Supabase

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em "Generate new token"
3. Dê um nome para o token (ex: "SMTP Config")
4. Copie o token gerado

## Passo 2: Criar conta no Resend

1. Acesse: https://resend.com
2. Crie uma conta gratuita
3. Verifique seu email
4. Faça login no dashboard

## Passo 3: Obter API Key do Resend

1. No dashboard do Resend, vá em "API Keys"
2. Clique em "Create API Key"
3. Dê um nome (ex: "Supabase SMTP")
4. Selecione "Sending access"
5. Copie a API key gerada

## Passo 4: Configurar domínio (opcional mas recomendado)

1. No Resend, vá em "Domains"
2. Clique em "Add Domain"
3. Digite seu domínio (ex: seusite.com)
4. Configure os registros DNS conforme instruído
5. Aguarde a verificação

## Passo 5: Editar o script de configuração

1. Abra o arquivo `configure-smtp.js`
2. Substitua `SEU_ACCESS_TOKEN_AQUI` pelo token do Supabase
3. Substitua `SUA_API_KEY_DO_RESEND_AQUI` pela API key do Resend
4. Substitua `seudominio.com` pelo seu domínio (ou use um domínio do Resend)

## Passo 6: Executar a configuração

```bash
node configure-smtp.js
```

## Verificação

Após a configuração bem-sucedida:

1. Vá ao dashboard do Supabase
2. Acesse Authentication > Settings
3. Verifique se as configurações SMTP estão aplicadas
4. Teste enviando um convite para um email externo

## Troubleshooting

### Erro 401 - Unauthorized
- Verifique se o Access Token do Supabase está correto
- Certifique-se de que o token tem as permissões necessárias

### Erro 400 - Bad Request
- Verifique se a API key do Resend está correta
- Confirme se o domínio está verificado no Resend

### Emails não chegam
- Verifique a pasta de spam
- Confirme se o domínio está verificado no Resend
- Verifique os logs no dashboard do Resend

## Configurações importantes

- `external_email_enabled: true` - Permite envio para emails externos
- `mailer_autoconfirm: false` - Requer confirmação de email
- `smtp_port: 587` - Porta padrão do Resend
- `smtp_user: 'resend'` - Sempre 'resend' para o Resend

## Custos

- Resend: 3.000 emails gratuitos por mês
- Supabase: Sem custos adicionais para SMTP customizado

## Suporte

- Documentação Resend: https://resend.com/docs
- Documentação Supabase SMTP: https://supabase.com/docs/guides/auth/auth-smtp