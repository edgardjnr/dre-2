import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallNotification, setShowInstallNotification] = useState(false);

  useEffect(() => {
    // Debug: Log informações do dispositivo
    console.log('PWA Debug - User Agent:', navigator.userAgent);
    console.log('PWA Debug - Is Mobile:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    console.log('PWA Debug - Is Chrome:', /Chrome/i.test(navigator.userAgent));
    console.log('PWA Debug - Service Worker Support:', 'serviceWorker' in navigator);
    console.log('PWA Debug - Location:', window.location.href);
    console.log('PWA Debug - Is HTTPS:', window.location.protocol === 'https:');
    console.log('PWA Debug - Is Localhost:', window.location.hostname === 'localhost');
    
    // Verificar se já está instalado
    const checkIfInstalled = () => {
      // Verificar se está rodando como PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInstalled = isStandalone || isInWebAppiOS;
      
      console.log('PWA Debug - Is Standalone:', isStandalone);
      console.log('PWA Debug - Is iOS WebApp:', isInWebAppiOS);
      console.log('PWA Debug - Is Installed:', isInstalled);
      
      setIsInstalled(isInstalled);
      return isInstalled;
    };

    // Verificar instalação inicial
    const installed = checkIfInstalled();

    // Listener para o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('PWA Debug - beforeinstallprompt event fired!', e);
      console.log('PWA Debug - Event platforms:', e.platforms);
      console.log('PWA Debug - Current URL:', window.location.href);
      
      // Prevenir o prompt automático
      e.preventDefault();
      
      // Salvar o evento para uso posterior
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      // Se não está instalado, mostrar notificação
      if (!installed) {
        setShowInstallNotification(true);
      }
    };

    // Listener para quando o app é instalado
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallNotification(false);
      setDeferredPrompt(null);
      console.log('PWA foi instalado com sucesso!');
    };

    // Adicionar listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Função para instalar o PWA
  const installPWA = async () => {
    console.log('PWA Debug - installPWA called');
    console.log('PWA Debug - deferredPrompt exists:', !!deferredPrompt);
    console.log('PWA Debug - isInstallable:', isInstallable);
    
    if (!deferredPrompt) {
      console.log('PWA Debug - Prompt de instalação não disponível');
      console.log('PWA Debug - Possíveis causas:');
      console.log('PWA Debug - 1. Evento beforeinstallprompt não foi disparado');
      console.log('PWA Debug - 2. PWA já está instalado');
      console.log('PWA Debug - 3. Critérios de instalação não foram atendidos');
      console.log('PWA Debug - 4. Navegador não suporta PWA');
      return false;
    }

    try {
      // Mostrar o prompt de instalação
      await deferredPrompt.prompt();
      
      // Aguardar a escolha do usuário
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Usuário aceitou instalar o PWA');
        setShowInstallNotification(false);
        return true;
      } else {
        console.log('Usuário rejeitou instalar o PWA');
        return false;
      }
    } catch (error) {
      console.error('Erro ao tentar instalar PWA:', error);
      return false;
    } finally {
      // Limpar o prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  // Função para dispensar a notificação
  const dismissNotification = () => {
    setShowInstallNotification(false);
    // Removido localStorage - notificação sempre aparecerá após novo login
  };

  // Função para verificar se deve mostrar notificação após login
  const checkShowNotificationAfterLogin = () => {
    if (isInstalled) return false;
    
    // Sempre mostrar se PWA não estiver instalado e for instalável
    return isInstallable;
  };

  return {
    isInstallable,
    isInstalled,
    showInstallNotification,
    installPWA,
    dismissNotification,
    checkShowNotificationAfterLogin
  };
};

export default usePWAInstall;