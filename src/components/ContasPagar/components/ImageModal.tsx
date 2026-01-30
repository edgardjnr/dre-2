import React, { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, CheckCircle, ChevronLeft, ChevronRight, RotateCw, Maximize2, Loader2, Download } from 'lucide-react';
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

export function ImageModal({ isOpen, imageUrl, imageName, conta, onClose }: ImageModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [currentImageName, setCurrentImageName] = useState(imageName);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [imageMetadata, setImageMetadata] = useState<{width: number, height: number, size?: number, lastModified?: number} | null>(null);

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

  const extractStorageKey = (value: string): string | null => {
    const url = String(value || '').trim();
    if (!url) return null;
    if (url.startsWith('data:')) return null;
    if (url.startsWith('http')) {
      const m = url.match(/\/contas-fotos\/(.+)$/);
      return m?.[1] || null;
    }
    return url;
  };

  useEffect(() => {
    const genSigned = async () => {
      const urls = allImages.map(i => i.url);
      const entries: [string, string][] = [];
      
      for (const url of urls) {
        const key = extractStorageKey(url);
        if (key) {
          const { data, error } = await supabase.storage
            .from('contas-fotos')
            .createSignedUrl(key, 60 * 60 * 24 * 7);
          
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
  } = useImageCache({
    maxCacheSize: 15,
    preloadAdjacent: true
  });

  // Atualizar imagem atual quando o modal abrir ou a conta mudar
  useEffect(() => {
    if (isOpen && allImages.length > 0) {
      // Procurar a imagem clicada no array combinado
      const index = allImages.findIndex(img => img.url === imageUrl);
      const currentIndex = index >= 0 ? index : 0;
      
      setCurrentImageIndex(currentIndex);
      setCurrentImageUrl(signedMap[allImages[currentIndex].url] || allImages[currentIndex].url);
      setCurrentImageName(allImages[currentIndex].name);
      setImageError(false);
      setRetryCount(0);
      
      // Preload de imagens adjacentes
      const urls = allImages.map(img => img.url);
      preloadAdjacent(urls, currentIndex);
    }
  }, [isOpen, imageUrl, allImages, preloadAdjacent, signedMap]);

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
  }, [currentImageUrl, imageRef]);

  const handlePreviousImage = useCallback(() => {
    if (allImages.length <= 1) return;
    
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
  }, [resetViewer, imageRef]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-title"
      aria-describedby="image-modal-description"
    >
      <div className="sr-only" id="image-modal-title">
        Visualizador de Imagem - {currentImageName}
      </div>
      <div className="sr-only" id="image-modal-description">
        Imagem {currentImageIndex + 1} de {totalPhotos}. Use as setas do teclado para navegar, ESC para fechar, + e - para zoom.
      </div>

      {/* Barra de ferramentas superior - Desktop */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent p-4 hidden md:block">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <h2 className="text-white text-lg font-semibold truncate max-w-md">
              {currentImageName}
            </h2>
            <span className="text-white text-opacity-80 text-sm">
              {Math.round(zoomLevel * 100)}%
            </span>
            {allImages.length > 1 && (
              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
                title="Mostrar miniaturas"
              >
                <CheckCircle className="w-5 h-5 text-white" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
              title="Diminuir zoom (tecla -)"
              aria-label="Diminuir zoom"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
              title="Aumentar zoom (tecla +)"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={resetViewer}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
              title="Resetar zoom e rotação (tecla R)"
              aria-label="Resetar visualização"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={fitToScreen}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
              title="Ajustar à tela (tecla F)"
              aria-label="Ajustar à tela"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={rotateLeft}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
              title="Rotacionar à esquerda (tecla [)"
              aria-label="Rotacionar à esquerda"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={rotateRight}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
              title="Rotacionar à direita (tecla ])"
              aria-label="Rotacionar à direita"
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleDownloadImage}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
              title="Baixar imagem (tecla D)"
              aria-label="Baixar imagem"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
              title="Fechar (tecla ESC)"
              aria-label="Fechar visualizador"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Barra de ferramentas superior - Mobile */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent p-3 md:hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h2 className="text-white text-sm font-semibold truncate">
              {currentImageName}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all flex-shrink-0"
            aria-label="Fechar visualizador"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Barra de informações inferior - Mobile */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black to-transparent p-3 md:hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-white text-sm">
              {Math.round(zoomLevel * 100)}%
            </span>
            <span className="text-white text-opacity-80 text-sm">
              {currentImageIndex + 1}/{allImages.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {allImages.length > 1 && (
              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
                title="Mostrar miniaturas"
              >
                <CheckCircle className="w-4 h-4 text-white" />
              </button>
            )}
            <button
              onClick={handleDownloadImage}
              className="p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all"
              aria-label="Baixar imagem"
            >
              <Download className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Botões de navegação - apenas se houver múltiplas fotos */}
      {hasMultiplePhotos && (
        <>
          <button
            onClick={handlePreviousImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            title="Imagem anterior (seta esquerda)"
            aria-label="Navegar para imagem anterior"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={handleNextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            title="Próxima imagem (seta direita)"
            aria-label="Navegar para próxima imagem"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* Container da imagem */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-move active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        style={{ touchAction: 'none' }}
      >
        {(isLoading || isImageLoading(currentImageUrl)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-2" />
              <p className="text-white text-sm">Carregando imagem...</p>
            </div>
          </div>
        )}

        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md text-center">
              <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Erro ao carregar imagem
              </h3>
              <p className="text-gray-600 mb-4">
                {retryCount > 0 
                  ? `Tentativa ${retryCount + 1} de 3 falhou. Verifique sua conexão.`
                  : 'Não foi possível carregar a imagem. Verifique sua conexão com a internet.'
                }
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRetryLoad}
                  disabled={retryCount >= 3}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                  aria-label="Tentar carregar a imagem novamente"
                >
                  {retryCount >= 3 ? 'Limite atingido' : `Tentar novamente (${retryCount + 1}/3)`}
                </button>
                {allImages.length > 1 && (
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
                )}
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                  aria-label="Fechar visualizador"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        <img
          ref={imageRef}
          src={signedMap[currentImageUrl] || currentImageUrl}
          alt={currentImageName || `Imagem ${currentImageIndex + 1}`}
          className="max-w-none select-none pointer-events-none"
          style={{
            transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            transformOrigin: 'center center'
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
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black bg-opacity-60 text-white px-6 py-3 rounded-full flex items-center gap-2 animate-fade-in-out">
              {swipeDirection === 'left' ? (
                <>
                  <ChevronRight className="w-6 h-6" />
                  <span>Próxima</span>
                </>
              ) : (
                <>
                  <ChevronLeft className="w-6 h-6" />
                  <span>Anterior</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Painel de miniaturas */}
      {showThumbnails && allImages.length > 1 && (
        <div className="absolute bottom-20 md:bottom-4 left-0 right-0 z-20 px-4">
          <div className="bg-black bg-opacity-80 rounded-lg p-4 max-w-4xl mx-auto">
            <div className="flex gap-3 overflow-x-auto pb-2">
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
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
