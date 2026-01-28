import React, { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, CheckCircle, ChevronLeft, ChevronRight, RotateCw, Maximize2, Loader2, Info, Download } from 'lucide-react';
import { useImageViewer } from '../hooks/useImageViewer';
import { useImageCache } from '../hooks/useImageCache';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useMobileGestures, useOrientation } from '../hooks/useMobileGestures';
import { ContaPagar } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageName?: string;
  conta: ContaPagar;
  onClose: () => void;
}

// Remover a função getTipoDocumentoText (linhas 16-22)

export function ImageModal({ 
  isOpen, 
  imageUrl, 
  imageName, 
  conta, 
  onClose
}: ImageModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [currentImageName, setCurrentImageName] = useState(imageName);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [imageMetadata, setImageMetadata] = useState<{width: number, height: number, size?: number, lastModified?: number} | null>(null);
  const [showImageInfo, setShowImageInfo] = useState(false);

  // Criar array combinado de todas as imagens
  const allImages = React.useMemo(() => {
    const images = [];
    
    // Adicionar fotos do array (novo sistema)
    if (conta.fotos && conta.fotos.length > 0) {
      images.push(...conta.fotos.map(foto => ({
        url: foto.fotoUrl,
        name: foto.fotoNome
      })));
    }
    
    // Adicionar foto única (sistema antigo) se não estiver no array
    if (conta.fotoUrl) {
      const isAlreadyInArray = images.some(img => img.url === conta.fotoUrl);
      if (!isAlreadyInArray) {
        images.push({
          url: conta.fotoUrl,
          name: conta.fotoNome || 'Comprovante de Pagamento'
        });
      }
    }
    
    return images;
  }, [conta.fotos, conta.fotoUrl, conta.fotoNome]);
  
  const [signedMap, setSignedMap] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const genSigned = async () => {
      const urls = allImages.map(i => i.url);
      const entries: [string, string][] = [];
      for (const url of urls) {
        const m = url.match(/\/contas-fotos\/(.+)$/);
        const key = m?.[1];
        if (key) {
          const { data, error } = await supabase.storage.from('contas-fotos').createSignedUrl(key, 60 * 60 * 24 * 7);
          if (!error && data?.signedUrl) {
            entries.push([url, data.signedUrl]);
          }
        }
      }
      if (entries.length) {
        setSignedMap(prev => {
          const next = { ...prev };
          for (const [orig, signed] of entries) next[orig] = signed;
          return next;
        });
      }
    };
    genSigned();
  }, [allImages]);
  
  const hasMultiplePhotos = allImages.length > 1;
  const totalPhotos = allImages.length;

  const {
    zoomLevel,
    imagePosition,
    isDragging,
    isTouchDevice,
    rotation,
    isLoading,
    imageRef,
    containerRef,
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
  } = useImageViewer();

  const {
    loadImage,
    preloadAdjacent,
    isImageLoaded,
    isImageLoading,
    getCachedImage,
    clearCache
  } = useImageCache({ maxCacheSize: 15, preloadAdjacent: true });

  // Atualizar imagem atual quando o modal abrir ou a conta mudar
  useEffect(() => {
    if (isOpen && allImages.length > 0) {
      // Procurar a imagem clicada no array combinado
      const index = allImages.findIndex(img => img.url === imageUrl);
      const currentIndex = index >= 0 ? index : 0;
      
      setCurrentImageIndex(currentIndex);
      setCurrentImageUrl(allImages[currentIndex].url);
      setCurrentImageName(allImages[currentIndex].name);
      setImageError(false);
      setRetryCount(0);
      
      // Preload de imagens adjacentes
      const urls = allImages.map(img => img.url);
      preloadAdjacent(urls, currentIndex);
    }
  }, [isOpen, imageUrl, allImages, preloadAdjacent]);

  // Preload quando mudar de imagem
  useEffect(() => {
    if (allImages.length > 1) {
      const urls = allImages.map(img => img.url);
      preloadAdjacent(urls, currentImageIndex);
    }
  }, [currentImageIndex, allImages, preloadAdjacent]);

  // Carregar metadados da imagem
  useEffect(() => {
    if (currentImageUrl && imageRef.current) {
      const img = imageRef.current;
      const updateMetadata = () => {
        // Usar apenas as dimensões naturais da imagem (sem requisições de rede)
        setImageMetadata({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      
      if (img.complete) {
        updateMetadata();
      } else {
        img.addEventListener('load', updateMetadata);
        return () => img.removeEventListener('load', updateMetadata);
      }
    }
  }, [currentImageUrl]);

  const handlePreviousImage = useCallback(() => {
    if (allImages.length <= 1) return;
    
    // Feedback visual para swipe
    if (isTouchDevice) {
      setSwipeDirection('right');
      setTimeout(() => setSwipeDirection(null), 300);
    }
    
    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : allImages.length - 1;
    setCurrentImageIndex(newIndex);
    setCurrentImageUrl(signedMap[allImages[newIndex].url] || allImages[newIndex].url);
    setCurrentImageName(allImages[newIndex].name);
    setImageError(false);
    setRetryCount(0);
    resetViewer();
  }, [allImages, currentImageIndex, resetViewer, isTouchDevice, signedMap]);

  const handleNextImage = useCallback(() => {
    if (allImages.length <= 1) return;
    
    // Feedback visual para swipe
    if (isTouchDevice) {
      setSwipeDirection('left');
      setTimeout(() => setSwipeDirection(null), 300);
    }
    
    const newIndex = currentImageIndex < allImages.length - 1 ? currentImageIndex + 1 : 0;
    setCurrentImageIndex(newIndex);
    setCurrentImageUrl(signedMap[allImages[newIndex].url] || allImages[newIndex].url);
    setCurrentImageName(allImages[newIndex].name);
    setImageError(false);
    setRetryCount(0);
    resetViewer();
  }, [allImages, currentImageIndex, resetViewer, isTouchDevice, signedMap]);

  const handleGoToImage = useCallback((index: number) => {
    if (index < 0 || index >= allImages.length) return;
    
    setCurrentImageIndex(index);
    setCurrentImageUrl(signedMap[allImages[index].url] || allImages[index].url);
    setCurrentImageName(allImages[index].name);
    setImageError(false);
    setRetryCount(0);
    setShowThumbnails(false);
    resetViewer();
  }, [allImages, resetViewer, signedMap]);

  const handleClose = useCallback(() => {
    resetViewer();
    clearCache();
    setShowThumbnails(false);
    setShowInfo(false);
    onClose();
  }, [resetViewer, clearCache, onClose]);

  const handleDownloadImage = useCallback(async () => {
    try {
      const response = await fetch(currentImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentImageName || `imagem-${currentImageIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      // Fallback: abrir imagem em nova aba
      window.open(currentImageUrl, '_blank');
    }
  }, [currentImageUrl, currentImageName, currentImageIndex]);

  const handleRetryLoad = useCallback(() => {
    if (retryCount < 3) {
      setImageError(false);
      setRetryCount(prev => prev + 1);
      setLoadingState(true);
      
      loadImage(currentImageUrl)
        .then(() => {
          setLoadingState(false);
        })
        .catch(() => {
          setImageError(true);
          setLoadingState(false);
        });
    }
  }, [currentImageUrl, retryCount, loadImage, setLoadingState]);

  // Configurar atalhos de teclado
  useKeyboardShortcuts({
    onClose: handleClose,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onResetZoom: resetViewer,
    onFitToScreen: fitToScreen,
    onRotateLeft: rotateLeft,
    onRotateRight: rotateRight,
    onPreviousImage: handlePreviousImage,
    onNextImage: handleNextImage,
    onDownloadImage: handleDownloadImage,
    enabled: isOpen
  });

  const { hapticFeedback } = useMobileGestures({
    onSwipeLeft: handleNextImage,
    onSwipeRight: handlePreviousImage,
    onDoubleTap: (event) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = event.touches[0].clientX - rect.left;
        const y = event.touches[0].clientY - rect.top;
        handleDoubleClick({ clientX: x, clientY: y } as MouseEvent);
      }
    },
    enabled: isOpen && isTouchDevice,
    swipeThreshold: 80
  });

  const orientation = useOrientation();

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        resetViewer();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resetViewer]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-title"
      aria-describedby="image-modal-description"
    >
      
      <h1 id="image-modal-title" className="sr-only">
        Visualizador de Imagem - {currentImageName}
      </h1>
      <div id="image-modal-description" className="sr-only">
        Imagem {currentImageIndex + 1} de {totalPhotos}. Use as setas do teclado para navegar, ESC para fechar, + e - para zoom.
      </div>

      <div className="relative w-full h-full flex flex-col">
        
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 z-[60]">
          
          <div className="hidden sm:flex p-4 justify-between items-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomOut}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Diminuir zoom (-)"
                aria-label="Diminuir zoom"
              >
                <ZoomOut className="w-5 h-5 text-white" />
              </button>
              <span className="text-white text-sm font-medium min-w-[60px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Aumentar zoom (+)"
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={resetZoom}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                title="Resetar zoom (R)"
                aria-label="Resetar zoom e posição da imagem"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={fitToScreen}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                title="Ajustar à tela (Espaço)"
                aria-label="Ajustar imagem ao tamanho da tela"
              >
                <Maximize2 className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={rotateLeft}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                title="Rotacionar esquerda (Q)"
                aria-label="Rotacionar imagem 90 graus para esquerda"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={rotateRight}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                title="Rotacionar direita (E)"
                aria-label="Rotacionar imagem 90 graus para direita"
              >
                <RotateCw className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={handleDownloadImage}
                className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-green-400 shadow-lg"
                title="Baixar imagem (D)"
                aria-label="Fazer download da imagem atual"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              {allImages.length > 1 && (
                <button
                  onClick={() => setShowThumbnails(!showThumbnails)}
                  className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
                  title="Mostrar miniaturas"
                >
                  <div className="w-5 h-5 grid grid-cols-2 gap-0.5">
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                  </div>
                </button>
              )}
              <button
                onClick={() => setShowImageInfo(!showImageInfo)}
                className={`p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 ${
                  showImageInfo ? 'bg-opacity-40' : ''
                }`}
                title="Informações da imagem (I)"
                aria-label="Mostrar informações detalhadas da imagem"
              >
                <Info className="w-5 h-5 text-white" />
              </button>
              <span className="text-white text-sm">
                {currentImageIndex + 1} de {allImages.length}
              </span>
              <button
                onClick={handleClose}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-red-400 shadow-lg border-2 border-red-500"
                title="Fechar (ESC)"
                aria-label="Fechar visualizador de imagem"
              >
                <X className="w-5 h-5 text-white font-bold" />
              </button>
          </div>
        
        </div>

          
          <div className="sm:hidden p-2 space-y-2">
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Diminuir zoom (-)"
                  aria-label="Diminuir zoom"
                >
                  <ZoomOut className="w-4 h-4 text-white" />
                </button>
                <span className="text-white text-xs font-medium min-w-[45px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Aumentar zoom (+)"
                  aria-label="Aumentar zoom"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={resetZoom}
                  className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  title="Resetar zoom (R)"
                  aria-label="Resetar zoom e posição da imagem"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={fitToScreen}
                  className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  title="Ajustar à tela (Espaço)"
                  aria-label="Ajustar imagem ao tamanho da tela"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
              </div>
              
              <div className="flex items-center space-x-1">
                <span className="text-white text-xs">
                  {currentImageIndex + 1}/{allImages.length}
                </span>
                <button
                  onClick={handleClose}
                  className="p-1.5 bg-red-600 hover:bg-red-700 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-red-400 shadow-lg border border-red-500"
                  title="Fechar (ESC)"
                  aria-label="Fechar visualizador de imagem"
                >
                  <X className="w-4 h-4 text-white font-bold" />
                </button>
              </div>
        
            

            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-1">
                <button
                  onClick={rotateLeft}
                  className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  title="Rotacionar esquerda (Q)"
                  aria-label="Rotacionar imagem 90 graus para esquerda"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={rotateRight}
                  className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  title="Rotacionar direita (E)"
                  aria-label="Rotacionar imagem 90 graus para direita"
                >
                  <RotateCw className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={handleDownloadImage}
                  className="p-1.5 bg-green-600 hover:bg-green-700 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-green-400 shadow-lg"
                  title="Baixar imagem (D)"
                  aria-label="Fazer download da imagem atual"
                >
                  <Download className="w-4 h-4 text-white" />
                </button>
              </div>
              
              <div className="flex items-center space-x-1">
                {allImages.length > 1 && (
                  <button
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
                    title="Mostrar miniaturas"
                  >
                    <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                      <div className="bg-white rounded-sm"></div>
                      <div className="bg-white rounded-sm"></div>
                      <div className="bg-white rounded-sm"></div>
                      <div className="bg-white rounded-sm"></div>
                    </div>
                  </button>
                )}
                <button
                  onClick={() => setShowImageInfo(!showImageInfo)}
                  className={`p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 ${
                    showImageInfo ? 'bg-opacity-40' : ''
                  }`}
                  title="Informações da imagem (I)"
                  aria-label="Mostrar informações detalhadas da imagem"
                >
                  <Info className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        
        {hasMultiplePhotos && (
          <>
            <button
              onClick={handlePreviousImage}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 hover:bg-opacity-70 transition-all z-[50] touch-manipulation h-16 w-12 flex items-center justify-center"
              title="Foto anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 hover:bg-opacity-70 transition-all z-[50] touch-manipulation h-16 w-12 flex items-center justify-center"
              title="Próxima foto"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        
        <div
          ref={containerRef}
          className={`flex-1 flex items-center justify-center overflow-hidden relative transition-all duration-300 ease-in-out ${
            orientation.isLandscape ? 'landscape-mode' : 'portrait-mode'
          } ${swipeDirection ? 'animate-pulse' : ''}`}
          onMouseDown={!isTouchDevice ? handleMouseDown : undefined}
          onMouseMove={!isTouchDevice ? handleMouseMove : undefined}
          onMouseUp={!isTouchDevice ? handleMouseUp : undefined}
          onMouseLeave={!isTouchDevice ? handleMouseUp : undefined}
          onWheel={!isTouchDevice ? handleWheel : undefined}
          onTouchStart={isTouchDevice ? handleTouchStart : undefined}
          onTouchMove={isTouchDevice ? handleTouchMove : undefined}
          onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
          onDoubleClick={!isTouchDevice ? handleDoubleClick : undefined}
          style={{ 
            cursor: isDragging ? 'grabbing' : (isTouchDevice ? 'default' : 'grab'),
            touchAction: 'none'
          }}
        >
          
          {(isLoading || isImageLoading(currentImageUrl)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10">
              <div className="bg-white bg-opacity-90 rounded-lg p-4 flex items-center space-x-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-gray-700 font-medium">Carregando imagem...</span>
              </div>
            </div>
          )}

          
          {imageError && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10"
              role="alert"
              aria-live="polite"
            >
              <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
                <div className="text-red-500 mb-4">
                  <X className="w-12 h-12 mx-auto" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Erro ao carregar imagem
                </h3>
                <p className="text-gray-600 mb-4">
                  {retryCount > 0 
                    ? `Tentativa ${retryCount + 1} de 3 falhou. Verifique sua conexão.`
                    : 'Não foi possível carregar a imagem. Verifique sua conexão com a internet.'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={handleRetryLoad}
                    disabled={retryCount >= 3}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label="Tentar carregar a imagem novamente"
                  >
                    {retryCount >= 3 ? 'Limite atingido' : `Tentar novamente (${retryCount + 1}/3)`}
                  </button>
                  <button
                    onClick={() => {
                      setImageError(false);
                      setRetryCount(0);
                      handleNextImage();
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                    aria-label="Pular para próxima imagem"
                  >
                    Próxima imagem
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label="Fechar visualizador de imagem"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          <img
            ref={imageRef}
            src={currentImageUrl}
            alt={currentImageName || "Documento da conta"}
            className={`max-w-full max-h-full select-none ${
              isDragging ? 'transition-none' : 'transition-transform duration-300 ease-out'
            }`}
            style={{
              transform: `scale(${zoomLevel}) translate(${imagePosition.x / zoomLevel}px, ${imagePosition.y / zoomLevel}px) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              willChange: isDragging ? 'transform' : 'auto',
              objectFit: 'contain',
              filter: imageError ? 'blur(2px) grayscale(100%)' : 'none',
              opacity: (isLoading || isImageLoading(currentImageUrl)) ? 0.7 : 1
            }}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onError={() => setImageError(true)}
            onLoad={() => {
              setImageError(false);
              setLoadingState(false);
            }}
          />

          
           {isTouchDevice && swipeDirection && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
               <div className={`bg-black bg-opacity-70 text-white px-6 py-3 rounded-full flex items-center space-x-2 transform transition-all duration-300 ${
                 swipeDirection === 'left' 
                   ? 'animate-bounce translate-x-4' 
                   : 'animate-bounce -translate-x-4'
               }`}>
                 {swipeDirection === 'left' ? (
                   <>
                     <ChevronRight className="w-6 h-6 animate-pulse" />
                     <span className="font-medium">Próxima</span>
                   </>
                 ) : (
                   <>
                     <ChevronLeft className="w-6 h-6 animate-pulse" />
                     <span className="font-medium">Anterior</span>
                   </>
                 )}
               </div>
             </div>
           )}
           
           
           {showImageInfo && imageMetadata && (
             <div className="absolute top-20 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-xs z-[60] backdrop-blur-sm">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-lg font-semibold flex items-center">
                   <Info className="w-5 h-5 mr-2" />
                   Informações
                 </h3>
                 <button
                   onClick={() => setShowImageInfo(false)}
                   className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                   aria-label="Fechar informações"
                 >
                   <X className="w-4 h-4" />
                 </button>
               </div>
               
               <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-gray-300">Nome:</span>
                   <span className="font-medium truncate ml-2" title={currentImageName}>
                     {currentImageName || 'Sem nome'}
                   </span>
                 </div>
                 
                 <div className="flex justify-between">
                   <span className="text-gray-300">Dimensões:</span>
                   <span className="font-medium">
                     {imageMetadata.width} × {imageMetadata.height}px
                   </span>
                 </div>
                 
                 {imageMetadata.size && (
                   <div className="flex justify-between">
                     <span className="text-gray-300">Tamanho:</span>
                     <span className="font-medium">
                       {(imageMetadata.size / 1024 / 1024).toFixed(2)} MB
                     </span>
                   </div>
                 )}
                 
                 <div className="flex justify-between">
                   <span className="text-gray-300">Zoom:</span>
                   <span className="font-medium">{Math.round(zoomLevel * 100)}%</span>
                 </div>
                 
                 <div className="flex justify-between">
                   <span className="text-gray-300">Rotação:</span>
                   <span className="font-medium">{rotation}°</span>
                 </div>
                 
                 {imageMetadata.lastModified && (
                   <div className="flex justify-between">
                     <span className="text-gray-300">Modificado:</span>
                     <span className="font-medium text-xs">
                       {new Date(imageMetadata.lastModified).toLocaleDateString('pt-BR', {
                         day: '2-digit',
                         month: '2-digit',
                         year: 'numeric',
                         hour: '2-digit',
                         minute: '2-digit'
                       })}
                     </span>
                   </div>
                 )}
                 
                 <div className="border-t border-gray-600 pt-2 mt-3">
                   <div className="flex justify-between">
                     <span className="text-gray-300">Posição:</span>
                     <span className="font-medium text-xs">
                       {currentImageIndex + 1} de {totalPhotos}
                     </span>
                   </div>
                 </div>
               </div>
             </div>
           )}
        </div>

        
        {showThumbnails && allImages.length > 1 && (
          <div className="absolute bottom-20 left-0 right-0 bg-black bg-opacity-70 p-4 z-[60]">
            <div className="flex justify-center space-x-2 overflow-x-auto max-w-full">
              {allImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => handleGoToImage(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 ${
                    index === currentImageIndex
                      ? 'border-blue-400 ring-2 ring-blue-400 ring-opacity-50'
                      : 'border-white border-opacity-30 hover:border-opacity-60'
                  }`}
                  title={`Ir para imagem ${index + 1}`}
                  aria-label={`Navegar para imagem ${index + 1} de ${totalPhotos}`}
                  aria-current={index === currentImageIndex ? 'true' : 'false'}
                >
                  <img
                    src={signedMap[image.url] || image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        
        {showInfo && (
          <div className="absolute top-20 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-sm z-[60]">
            <h3 className="font-semibold mb-3 text-lg">Informações da Imagem</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-300">Nome:</span>
                <p className="font-medium break-words">{currentImageName}</p>
              </div>
              {imageMetadata && (
                <div>
                  <span className="text-gray-300">Dimensões:</span>
                  <p className="font-medium">{imageMetadata.width} x {imageMetadata.height} pixels</p>
                </div>
              )}
              <div>
                <span className="text-gray-300">Zoom:</span>
                <p className="font-medium">{Math.round(zoomLevel * 100)}%</p>
              </div>
              <div>
                <span className="text-gray-300">Rotação:</span>
                <p className="font-medium">{rotation} deg</p>
              </div>
              <div>
                <span className="text-gray-300">Fornecedor:</span>
                <p className="font-medium">{conta.fornecedor}</p>
              </div>
              <div>
                <span className="text-gray-300">Vencimento:</span>
                <p className="font-medium">{new Date(conta.dataVencimento).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

        )}
        
      </div>
    </div>
  );
}
