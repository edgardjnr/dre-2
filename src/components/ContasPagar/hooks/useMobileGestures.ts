import { useEffect, useCallback, useRef, useState } from 'react';

interface MobileGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDoubleTap?: (event: TouchEvent) => void;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
  enabled?: boolean;
  swipeThreshold?: number;
  doubleTapDelay?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  touchCount: number;
}

export function useMobileGestures({
  onSwipeLeft,
  onSwipeRight,
  onDoubleTap,
  onPinchStart,
  onPinchEnd,
  enabled = true,
  swipeThreshold = 50,
  doubleTapDelay = 300
}: MobileGesturesOptions) {
  const touchStateRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    touchCount: 0
  });

  const isPinchingRef = useRef(false);

  // Função para vibração tátil (se suportado)
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // Detectar mudança de orientação
  const handleOrientationChange = useCallback(() => {
    // Pequeno delay para aguardar a mudança completa da orientação
    setTimeout(() => {
      // Disparar evento customizado para componentes que precisam reagir
      window.dispatchEvent(new CustomEvent('orientationChanged', {
        detail: {
          orientation: screen.orientation?.angle || window.orientation || 0,
          isLandscape: window.innerWidth > window.innerHeight
        }
      }));
    }, 100);
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!enabled) return;

    const touch = event.touches[0];
    const now = Date.now();
    
    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: now,
      lastTapTime: touchStateRef.current.lastTapTime,
      touchCount: event.touches.length
    };

    // Detectar início de pinch
    if (event.touches.length === 2) {
      isPinchingRef.current = true;
      onPinchStart?.();
    }
  }, [enabled, onPinchStart]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!enabled) return;

    const touch = event.changedTouches[0];
    const now = Date.now();
    const touchState = touchStateRef.current;
    
    // Detectar fim de pinch
    if (isPinchingRef.current && event.touches.length < 2) {
      isPinchingRef.current = false;
      onPinchEnd?.();
      return;
    }

    // Ignorar se foi um pinch
    if (isPinchingRef.current || touchState.touchCount > 1) {
      return;
    }

    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    const deltaTime = now - touchState.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Detectar duplo toque
    const timeSinceLastTap = now - touchState.lastTapTime;
    if (timeSinceLastTap < doubleTapDelay && distance < 30 && deltaTime < 200) {
      hapticFeedback('medium');
      onDoubleTap?.(event);
      touchStateRef.current.lastTapTime = 0; // Reset para evitar triplo toque
      return;
    }

    touchStateRef.current.lastTapTime = now;

    // Detectar swipe (movimento rápido e longo)
    if (deltaTime < 300 && distance > swipeThreshold) {
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
      
      if (isHorizontalSwipe) {
        if (deltaX > 0) {
          // Swipe para direita
          hapticFeedback('light');
          onSwipeRight?.();
        } else {
          // Swipe para esquerda
          hapticFeedback('light');
          onSwipeLeft?.();
        }
      }
    }
  }, [enabled, onSwipeLeft, onSwipeRight, onDoubleTap, onPinchEnd, doubleTapDelay, swipeThreshold, hapticFeedback]);

  // Configurar listeners de eventos
  useEffect(() => {
    if (!enabled) return;

    // Eventos de toque
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Eventos de orientação
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [enabled, handleTouchStart, handleTouchEnd, handleOrientationChange]);

  return {
    hapticFeedback,
    isPinching: isPinchingRef.current
  };
}

// Hook para detectar mudanças de orientação
export function useOrientation() {
  const [orientation, setOrientation] = useState({
    angle: screen.orientation?.angle || window.orientation || 0,
    isLandscape: window.innerWidth > window.innerHeight
  });

  useEffect(() => {
    const handleOrientationChange = (event: CustomEvent) => {
      setOrientation(event.detail);
    };

    window.addEventListener('orientationChanged', handleOrientationChange as EventListener);
    
    return () => {
      window.removeEventListener('orientationChanged', handleOrientationChange as EventListener);
    };
  }, []);

  return orientation;
}

// Tipos para exportação
export type { MobileGesturesOptions, TouchState };