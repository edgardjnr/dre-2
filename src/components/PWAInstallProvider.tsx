import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import PWAInstallNotification from './PWAInstallNotification';

interface PWAInstallContextType {
  showInstallPrompt: () => void;
  hideInstallPrompt: () => void;
  isInstalled: boolean;
  isInstallable: boolean;
}

const PWAInstallContext = createContext<PWAInstallContextType | undefined>(undefined);

export const PWAInstallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const {
    isInstallable,
    isInstalled,
    showInstallNotification,
    installPWA,
    dismissNotification,
    checkShowNotificationAfterLogin
  } = usePWAInstall();
  
  const [shouldShowNotification, setShouldShowNotification] = useState(false);

  // Desabilitado: agora usamos o PWAInstallBanner específico para login
  // useEffect(() => {
  //   if (!loading && user) {
  //     const timer = setTimeout(() => {
  //       if (checkShowNotificationAfterLogin()) {
  //         setShouldShowNotification(true);
  //       }
  //     }, 2000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [user, loading, checkShowNotificationAfterLogin]);

  // Reset quando usuário faz logout
  useEffect(() => {
    if (!user) {
      setShouldShowNotification(false);
    }
  }, [user]);

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setShouldShowNotification(false);
    }
  };

  const handleDismiss = () => {
    dismissNotification();
    setShouldShowNotification(false);
  };

  const showInstallPrompt = () => {
    if (isInstallable && !isInstalled) {
      setShouldShowNotification(true);
    }
  };

  const hideInstallPrompt = () => {
    setShouldShowNotification(false);
  };

  const contextValue: PWAInstallContextType = {
    showInstallPrompt,
    hideInstallPrompt,
    isInstalled,
    isInstallable
  };

  return (
    <PWAInstallContext.Provider value={contextValue}>
      {children}
      
      {/* Notificação PWA desabilitada - agora usamos PWAInstallBanner na tela de login */}
      {/* <PWAInstallNotification
        show={shouldShowNotification && isInstallable && !isInstalled}
        onInstall={handleInstall}
        onDismiss={handleDismiss}
      /> */}
    </PWAInstallContext.Provider>
  );
};

export const usePWAInstallContext = (): PWAInstallContextType => {
  const context = useContext(PWAInstallContext);
  if (context === undefined) {
    throw new Error('usePWAInstallContext must be used within a PWAInstallProvider');
  }
  return context;
};

export default PWAInstallProvider;