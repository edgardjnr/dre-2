import React, { useEffect, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';

interface SplashScreenProps {
  isVisible?: boolean;
  progress?: number;
  onComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  isVisible = true, 
  progress = 0,
  onComplete 
}) => {
  const [loadingText, setLoadingText] = useState('Carregando');

  useEffect(() => {
    if (!isVisible) return;

    // Animação do texto de carregamento
    const textInterval = setInterval(() => {
      setLoadingText(prev => {
        if (prev === 'Carregando...') return 'Carregando';
        return prev + '.';
      });
    }, 500);

    return () => {
      clearInterval(textInterval);
    };
  }, [isVisible]);

  const currentProgress = progress > 0 ? Math.min(100, Math.max(0, progress)) : 0;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 overflow-hidden ${
      isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Efeito de partículas de fundo */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-ping animation-delay-1000"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white rounded-full animate-ping animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-white rounded-full animate-ping animation-delay-3000"></div>
        <div className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-white rounded-full animate-ping animation-delay-4000"></div>
      </div>

      {/* Container principal */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 px-8">
        {/* Logo/Ícone principal */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
          <div className="relative bg-white/10 backdrop-blur-sm rounded-full p-8 border border-white/20 shadow-2xl animate-bounce-slow">
            <Zap className="w-16 h-16 text-white animate-spin-slow" />
          </div>
        </div>

        {/* Título */}
        <div className="text-center space-y-2 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            DRE System
          </h1>
          <p className="text-lg md:text-xl text-white/80 font-light">
            Demonstrativo de Resultados
          </p>
        </div>

        {/* Barra de progresso */}
        <div className="w-full max-w-md space-y-4 animate-fade-in-up animation-delay-500">
          {currentProgress > 0 ? (
            <div className="relative h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-white to-blue-200 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${currentProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
              </div>
            </div>
          ) : (
            <div className="relative h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-white to-blue-200 rounded-full animate-indeterminate" />
            </div>
          )}
          
          {/* Texto de carregamento */}
          <div className="text-center">
            <p className="text-white/90 text-lg font-medium">
              {loadingText}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {currentProgress > 0 ? `${Math.round(currentProgress)}%` : 'Aguarde...'}
            </p>
          </div>
        </div>

        {/* Indicador de carregamento secundário */}
        <div className="flex items-center space-x-2 animate-fade-in-up animation-delay-1000">
          <Loader2 className="w-5 h-5 text-white/70 animate-spin" />
          <span className="text-white/70 text-sm">Inicializando sistema...</span>
        </div>
      </div>

      {/* Estilos CSS inline para animações personalizadas */}
      <style>
        {`
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          @keyframes indeterminate {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
          
          .animate-bounce-slow { animation: bounce-slow 2s infinite; }
          .animate-spin-slow { animation: spin-slow 3s linear infinite; }
          .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
          .animate-shimmer { animation: shimmer 2s infinite; }
          .animate-indeterminate { animation: indeterminate 1.2s infinite; }
          .animation-delay-500 { animation-delay: 0.5s; }
          .animation-delay-1000 { animation-delay: 1s; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-3000 { animation-delay: 3s; }
          .animation-delay-4000 { animation-delay: 4s; }
        `}
      </style>
    </div>
  );
};

export default SplashScreen;
