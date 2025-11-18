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
  const [animationProgress, setAnimationProgress] = useState(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);

  // Controlar tempo mínimo de exibição (2 segundos)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Controlar fade-out quando loading terminar
  useEffect(() => {
    if (!isVisible && minTimeElapsed) {
      // Aguardar animação de fade-out antes de esconder completamente
      const hideTimer = setTimeout(() => {
        setShouldHide(true);
      }, 1000); // Tempo da animação de fade-out
      
      return () => clearTimeout(hideTimer);
    }
  }, [isVisible, minTimeElapsed]);

  useEffect(() => {
    if (!isVisible) return;

    // Garantir tempo mínimo de exibição (2 segundos)
    const minTimeTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000);

    // Animação do texto de carregamento
    const textInterval = setInterval(() => {
      setLoadingText(prev => {
        if (prev === 'Carregando...') return 'Carregando';
        return prev + '.';
      });
    }, 500);

    // Animação da barra de progresso
    const progressInterval = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          // Só chama onComplete quando o tempo mínimo passou
          const checkComplete = () => {
            if (minTimeElapsed) {
              setTimeout(() => onComplete?.(), 500);
            } else {
              setTimeout(checkComplete, 100);
            }
          };
          checkComplete();
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    return () => {
      clearTimeout(minTimeTimer);
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, [isVisible, onComplete, minTimeElapsed]);

  // Se deve esconder completamente, não renderizar
  if (shouldHide) {
    return null;
  }

  const currentProgress = progress > 0 ? progress : animationProgress;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 overflow-hidden transition-opacity duration-1000 ${
      isVisible ? 'opacity-100' : 'opacity-0'
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
          <div className="relative h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-white to-blue-200 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${currentProgress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
            </div>
          </div>
          
          {/* Texto de carregamento */}
          <div className="text-center">
            <p className="text-white/90 text-lg font-medium">
              {loadingText}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {Math.round(currentProgress)}%
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
          
          .animate-bounce-slow { animation: bounce-slow 2s infinite; }
          .animate-spin-slow { animation: spin-slow 3s linear infinite; }
          .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
          .animate-shimmer { animation: shimmer 2s infinite; }
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