import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onClose?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitToScreen?: () => void;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;
  onPreviousImage?: () => void;
  onNextImage?: () => void;
  onToggleFullscreen?: () => void;
  onDownloadImage?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const {
    onClose,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFitToScreen,
    onRotateLeft,
    onRotateRight,
    onPreviousImage,
    onNextImage,
    onToggleFullscreen,
    onDownloadImage,
    enabled = true
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Prevenir ação padrão para teclas que vamos interceptar
    const { key, ctrlKey, altKey, shiftKey } = event;
    
    // Ignorar se estiver digitando em um input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    switch (key) {
      case 'Escape':
        event.preventDefault();
        onClose?.();
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        if (shiftKey) {
          onRotateLeft?.();
        } else {
          onPreviousImage?.();
        }
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        if (shiftKey) {
          onRotateRight?.();
        } else {
          onNextImage?.();
        }
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        onZoomIn?.();
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        onZoomOut?.();
        break;
        
      case '+':
      case '=':
        event.preventDefault();
        onZoomIn?.();
        break;
        
      case '-':
      case '_':
        event.preventDefault();
        onZoomOut?.();
        break;
        
      case '0':
      case 'r':
      case 'R':
        event.preventDefault();
        onResetZoom?.();
        break;
        
      case ' ':
      case 'f':
      case 'F':
        event.preventDefault();
        onFitToScreen?.();
        break;
        
      case 'F11':
        if (!ctrlKey && !altKey) {
          event.preventDefault();
          onToggleFullscreen?.();
        }
        break;
        
      case 'd':
      case 'D':
        event.preventDefault();
        onDownloadImage?.();
        break;
        
      case 'Home':
        event.preventDefault();
        // Ir para a primeira imagem
        if (onPreviousImage) {
          // Simular múltiplos cliques para ir ao início
          for (let i = 0; i < 100; i++) {
            onPreviousImage();
          }
        }
        break;
        
      case 'End':
        event.preventDefault();
        // Ir para a última imagem
        if (onNextImage) {
          // Simular múltiplos cliques para ir ao final
          for (let i = 0; i < 100; i++) {
            onNextImage();
          }
        }
        break;
        
      default:
        // Teclas numéricas para zoom específico
        if (key >= '1' && key <= '9' && !ctrlKey && !altKey) {
          event.preventDefault();
          const zoomLevel = parseInt(key);
          // Implementar zoom para nível específico
          // Por enquanto, usar reset + zoom in múltiplas vezes
          onResetZoom?.();
          for (let i = 1; i < zoomLevel; i++) {
            setTimeout(() => onZoomIn?.(), i * 50);
          }
        }
        break;
    }
  }, [enabled, onClose, onZoomIn, onZoomOut, onResetZoom, onFitToScreen, 
      onRotateLeft, onRotateRight, onPreviousImage, onNextImage, onToggleFullscreen, onDownloadImage]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // Função para mostrar ajuda de atalhos
  const getShortcutsHelp = useCallback(() => {
    return {
      navigation: {
        'Seta Esquerda': 'Imagem anterior',
        'Seta Direita': 'Próxima imagem',
        'Home': 'Primeira imagem',
        'End': 'Última imagem'
      },
      zoom: {
        'Seta Cima / +': 'Aumentar zoom',
        'Seta Baixo / -': 'Diminuir zoom',
        '0 / R': 'Resetar zoom',
        'Espaço / F': 'Ajustar à tela',
        '1-9': 'Zoom específico (1x-9x)'
      },
      rotation: {
        'Shift + Seta Esquerda': 'Rotacionar anti-horário',
        'Shift + Seta Direita': 'Rotacionar horário'
      },
      general: {
        'ESC': 'Fechar modal',
        'F11': 'Tela cheia'
      }
    };
  }, []);

  return {
    getShortcutsHelp
  };
}