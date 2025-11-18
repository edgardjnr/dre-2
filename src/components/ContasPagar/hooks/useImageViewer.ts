import { useState, useEffect, useRef, useCallback } from 'react';

export interface ImageViewerState {
  zoomLevel: number;
  imagePosition: { x: number; y: number };
  isDragging: boolean;
  dragStart: { x: number; y: number };
  lastTouchDistance: number;
  isTouchDevice: boolean;
  rotation: number;
  isLoading: boolean;
}

export function useImageViewer() {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapTime = useRef(0);
  const doubleTapDelay = 300;

  // Detectar dispositivo touch
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Funções de controle de zoom
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // Função para ajustar imagem à tela
  const fitToScreen = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    
    const img = imageRef.current;
    const container = containerRef.current;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageWidth = img.naturalWidth;
    const imageHeight = img.naturalHeight;
    
    if (imageWidth === 0 || imageHeight === 0) return;
    
    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Não aumentar além do tamanho original
    
    setZoomLevel(scale);
    setImagePosition({ x: 0, y: 0 });
  }, []);

  // Funções de rotação
  const rotateLeft = useCallback(() => {
    setRotation(prev => (prev - 90) % 360);
    setImagePosition({ x: 0, y: 0 }); // Reset posição ao rotacionar
  }, []);

  const rotateRight = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
    setImagePosition({ x: 0, y: 0 }); // Reset posição ao rotacionar
  }, []);

  // Zoom inteligente com duplo clique
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    if (zoomLevel === 1) {
      // Zoom in no ponto clicado
      const newZoom = 2;
      const centerX = containerRef.current.clientWidth / 2;
      const centerY = containerRef.current.clientHeight / 2;
      
      const offsetX = (centerX - clickX) * (newZoom - 1);
      const offsetY = (centerY - clickY) * (newZoom - 1);
      
      setZoomLevel(newZoom);
      setImagePosition({ x: offsetX, y: offsetY });
    } else {
      // Reset zoom
      resetZoom();
    }
  }, [zoomLevel, resetZoom]);

  // Zoom para nível específico
  const zoomToLevel = useCallback((level: number) => {
    const clampedLevel = Math.min(Math.max(level, 0.1), 10);
    setZoomLevel(clampedLevel);
    if (clampedLevel === 1) {
      setImagePosition({ x: 0, y: 0 });
    }
  }, []);

  // Gestos touch para zoom
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Detectar duplo toque
      const now = Date.now();
      const timeDiff = now - lastTapTime.current;
      
      if (timeDiff < doubleTapDelay) {
        // Duplo toque - zoom inteligente
        const touch = e.touches[0];
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const clickX = touch.clientX - rect.left;
          const clickY = touch.clientY - rect.top;
          
          if (zoomLevel === 1) {
            const newZoom = 2;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const offsetX = (centerX - clickX) * (newZoom - 1);
            const offsetY = (centerY - clickY) * (newZoom - 1);
            
            setZoomLevel(newZoom);
            setImagePosition({ x: offsetX, y: offsetY });
          } else {
            resetZoom();
          }
        }
        lastTapTime.current = 0; // Reset para evitar triplo toque
      } else {
        // Single touch - start dragging
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - imagePosition.x,
          y: e.touches[0].clientY - imagePosition.y
        });
        lastTapTime.current = now;
      }
    } else if (e.touches.length === 2) {
      // Two finger touch - start pinch zoom
      setIsDragging(false);
      setLastTouchDistance(getTouchDistance(e.touches));
      lastTapTime.current = 0; // Reset duplo toque
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging) {
      // Single touch - drag image
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setImagePosition({ x: newX, y: newY });
    } else if (e.touches.length === 2) {
      // Two finger touch - pinch zoom
      const currentDistance = getTouchDistance(e.touches);
      if (lastTouchDistance > 0) {
        const scale = currentDistance / lastTouchDistance;
        const newZoom = Math.min(Math.max(zoomLevel * scale, 0.5), 5);
        setZoomLevel(newZoom);
      }
      setLastTouchDistance(currentDistance);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  // Mouse events para desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setImagePosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Função para zoom com roda do mouse
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Determinar direção do scroll
    const delta = Math.sign(e.deltaY) * -1;
    
    // Calcular o ponto de zoom baseado na posição do mouse
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calcular a posição relativa do mouse na imagem
      const relativeX = (mouseX - imagePosition.x) / zoomLevel;
      const relativeY = (mouseY - imagePosition.y) / zoomLevel;
      
      // Ajustar o zoom baseado na direção
      let newZoom = zoomLevel;
      if (delta > 0) {
        // Scroll para cima - zoom in
        newZoom = Math.min(zoomLevel + 0.2, 5);
      } else {
        // Scroll para baixo - zoom out
        newZoom = Math.max(zoomLevel - 0.2, 0.5);
      }
      
      // Ajustar a posição para manter o ponto sob o cursor
      const newX = mouseX - relativeX * newZoom;
      const newY = mouseY - relativeY * newZoom;
      
      setZoomLevel(newZoom);
      setImagePosition({ x: newX, y: newY });
    } else {
      // Fallback se não conseguir obter o retângulo do container
      if (delta > 0) {
        setZoomLevel(prev => Math.min(prev + 0.2, 5));
      } else {
        setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
      }
    }
  }, [zoomLevel, imagePosition]);


  const resetViewer = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
    setRotation(0);
    setIsDragging(false);
    setIsLoading(false);
  };

  // Função para definir estado de carregamento
  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return {
    // State
    zoomLevel,
    imagePosition,
    isDragging,
    isTouchDevice,
    rotation,
    isLoading,
    imageRef,
    containerRef,
    
    // Actions
    handleZoomIn,
    handleZoomOut,
    resetZoom,
    fitToScreen,
    rotateLeft,
    rotateRight,
    handleDoubleClick,
    zoomToLevel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    resetViewer,
    setLoadingState
  };
}