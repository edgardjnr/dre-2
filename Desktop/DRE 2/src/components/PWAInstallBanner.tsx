import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Sparkles, Zap } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  show: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  show,
  onInstall,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  console.log('PWAInstallBanner render:', { show, isVisible });

  useEffect(() => {
    if (show) {
      // Pequeno delay para suavizar a animação
      const timer = setTimeout(() => {
        setIsVisible(true);
        setAnimationClass('animate-slide-up');
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setAnimationClass('');
    }
  }, [show]);

  const handleDismiss = () => {
    setAnimationClass('animate-slide-down');
    setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onDismiss} />
      
      {/* Modal */}
      <div className={`relative w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden ${animationClass}`}>
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 text-center">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-xl mb-2">Instalar App</h3>
          <p className="text-sm text-white text-opacity-90">
            Acesso rápido e funcionalidade offline
          </p>
        </div>
        
        {/* Conteúdo */}
        <div className="p-6">
          <p className="text-gray-600 text-sm text-center mb-6">
            Instale nosso aplicativo para uma experiência mais rápida, notificações e acesso mesmo sem internet.
          </p>
          
          {/* Botões */}
          <div className="space-y-3">
            <button
              onClick={onInstall}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
            >
              Instalar Agora
            </button>
            <button
              onClick={handleDismiss}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition-all duration-200"
            >
              Talvez mais tarde
            </button>
          </div>
        </div>
        
        {/* Botão fechar */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-white text-opacity-70 hover:text-opacity-100 transition-opacity"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallBanner;