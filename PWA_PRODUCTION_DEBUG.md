# PWA Production Debug Guide

## Problema Identificado e Corrigido

✅ **Correção Aplicada**: O componente `PWAInstallButton` estava tentando usar a função `install` que não existia no hook `usePWAInstall`. Foi corrigido para usar `installPWA`.

## Como Verificar se o PWA Funciona em Produção

### 1. Abrir Console do Navegador

1. Acesse seu site em produção
2. Pressione `F12` ou `Ctrl+Shift+I` (Windows/Linux) ou `Cmd+Option+I` (Mac)
3. Vá para a aba **Console**
4. Recarregue a página (`F5` ou `Ctrl+R`)

### 2. Verificar Logs de Debug

Procure por estas mensagens no console:

```
PWA Debug - User Agent: [informações do navegador]
PWA Debug - Is Mobile: [true/false]
PWA Debug - Is Chrome: [true/false]
PWA Debug - Service Worker Support: [true/false]
PWA Debug - Location: [URL do site]
PWA Debug - Is HTTPS: [true/false]
PWA Debug - Is Localhost: [true/false]
PWA Debug - Is Standalone: [true/false]
PWA Debug - Is iOS WebApp: [true/false]
PWA Debug - Is Installed: [true/false]
```

### 3. Verificar Evento beforeinstallprompt

Se o PWA for instalável, você deve ver:

```
PWA Debug - beforeinstallprompt event fired!
PWA Debug - Event platforms: [plataformas suportadas]
PWA Debug - Current URL: [URL atual]
```

### 4. Testar o Botão de Instalação

1. Clique no botão "Instalar APP" abaixo do botão de login
2. Verifique os logs no console:

```
PWA Install button clicked
PWA Debug - installPWA called
PWA Debug - deferredPrompt exists: [true/false]
PWA Debug - isInstallable: [true/false]
```

## Possíveis Problemas e Soluções

### ❌ Problema: "PWA Debug - beforeinstallprompt event fired!" não aparece

**Possíveis Causas:**
- Site não está sendo servido via HTTPS (obrigatório para PWA)
- Manifest.json não está acessível ou tem erros
- Service Worker não está registrado corretamente
- Critérios de PWA não foram atendidos

**Soluções:**
1. Verificar se o site está em HTTPS
2. Acessar `/manifest.json` diretamente no navegador
3. Verificar se o service worker está registrado em DevTools > Application > Service Workers

### ❌ Problema: "deferredPrompt exists: false"

**Possíveis Causas:**
- O evento `beforeinstallprompt` não foi disparado
- PWA já está instalado
- Navegador não suporta instalação de PWA

**Soluções:**
1. Verificar se o PWA já está instalado
2. Testar em um navegador diferente (Chrome, Edge)
3. Limpar cache e cookies do site

### ❌ Problema: Service Worker não registra

**Verificar em DevTools:**
1. F12 > Application > Service Workers
2. Deve mostrar `/sw.js` como registrado

**Se não estiver registrado:**
- Verificar se `/sw.js` existe e é acessível
- Verificar logs de erro no console

### ❌ Problema: Manifest.json não carrega

**Verificar:**
1. Acessar `/manifest.json` diretamente
2. F12 > Application > Manifest
3. Verificar se não há erros de sintaxe JSON

## Critérios para PWA Instalável

Para um PWA ser instalável, precisa atender:

✅ **Obrigatórios:**
- Servido via HTTPS (ou localhost para desenvolvimento)
- Manifest.json válido com:
  - `name` ou `short_name`
  - `start_url`
  - `display` (standalone, fullscreen, ou minimal-ui)
  - Ícone de pelo menos 192x192px
- Service Worker registrado
- Pelo menos uma página visitada

✅ **Recomendados:**
- Ícones de diferentes tamanhos (192x192, 512x512)
- `theme_color` e `background_color`
- Screenshots para app stores

## Testando em Diferentes Dispositivos

### 📱 **iOS (Safari)**
- PWA não mostra prompt automático
- Botão mostra modal com instruções manuais
- Usuário deve usar "Compartilhar" > "Adicionar à Tela de Início"

### 🤖 **Android (Chrome/Edge)**
- Mostra prompt automático de instalação
- Botão aciona o prompt nativo do navegador

### 💻 **Desktop (Chrome/Edge)**
- Mostra ícone de instalação na barra de endereços
- Botão aciona o prompt nativo do navegador

## Comandos Úteis para Debug

```javascript
// No console do navegador, verificar:

// 1. Service Worker
navigator.serviceWorker.getRegistrations().then(console.log);

// 2. Modo standalone (se PWA está instalado)
window.matchMedia('(display-mode: standalone)').matches;

// 3. Suporte a Service Worker
'serviceWorker' in navigator;

// 4. Protocolo HTTPS
window.location.protocol === 'https:';
```

## Próximos Passos

1. **Teste em produção** seguindo este guia
2. **Compartilhe os logs** do console se ainda houver problemas
3. **Verifique cada critério** listado acima
4. **Teste em diferentes navegadores** e dispositivos

---

**Nota**: Os logs detalhados foram adicionados para facilitar o debug. Em produção, você pode remover ou reduzir esses logs editando o arquivo `src/hooks/usePWAInstall.ts`.