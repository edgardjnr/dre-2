import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | 'full' | 'fullscreen';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  // Controle de viewport para prevenir zoom em dispositivos móveis
  useEffect(() => {
    if (isOpen && size === 'fullscreen') {
      // Salvar configuração original do viewport
      const originalViewport = document.querySelector('meta[name="viewport"]');
      const originalContent = originalViewport?.getAttribute('content') || '';
      
      // Criar ou atualizar meta viewport para desabilitar zoom
      let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
      }
      
      // Configuração que previne zoom em dispositivos móveis
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      
      // Cleanup: restaurar configuração original quando modal fechar
      return () => {
        if (originalContent) {
          viewportMeta.content = originalContent;
        } else {
          viewportMeta.content = 'width=device-width, initial-scale=1.0';
        }
      };
    }
  }, [isOpen, size]);

  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
    fullscreen: 'w-screen h-screen max-w-none',
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center ${size === 'fullscreen' ? 'p-0' : 'p-4'} transition-opacity duration-300`}>
      <div 
        className={`bg-white ${size === 'fullscreen' ? 'rounded-none' : 'rounded-lg'} shadow-xl w-full ${sizeClasses[size]} ${size === 'fullscreen' ? 'max-h-none h-full m-6' : 'max-h-[90vh]'} flex flex-col transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale`}
        style={{ animation: 'fade-in-scale 0.3s forwards' }}
      >
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-white bg-red-600 hover:bg-red-700 p-1 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fade-in-scale {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
