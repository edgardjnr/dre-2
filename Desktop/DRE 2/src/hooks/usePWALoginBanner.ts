import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePWAInstall } from './usePWAInstall';

export const usePWALoginBanner = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [hasShownOnLogin, setHasShownOnLogin] = useState(false);

  // Verificar se está na página de login
  const isLoginPage = location.pathname === '/login' || location.pathname === '/';

  useEffect(() => {
    // Reset quando usuário faz logout
    if (!user) {
      setHasShownOnLogin(false);
    }
  }, [user]);

  useEffect(() => {
    // Mostrar banner após 2 segundos na página de login se PWA não estiver instalado e for instalável
    if (
      isLoginPage && 
      !user && 
      isInstallable &&
      !isInstalled &&
      !hasShownOnLogin
    ) {
      const timer = setTimeout(() => {
        setShowBanner(true);
        setHasShownOnLogin(true);
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [isLoginPage, isInstalled, isInstallable, user, hasShownOnLogin]);

  // Esconder banner quando usuário faz login
  useEffect(() => {
    if (user) {
      setShowBanner(false);
    }
  }, [user]);

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Marcar como mostrado para não aparecer novamente nesta sessão
    setHasShownOnLogin(true);
  };

  return {
    showBanner,
    handleInstall,
    handleDismiss,
    isInstallable,
    isInstalled
  };
};

export default usePWALoginBanner;