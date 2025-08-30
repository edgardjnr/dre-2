import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, DollarSign, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useImageViewer } from '../hooks/useImageViewer';
import { ContaPagar } from '../../../types';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageName?: string;
  conta: ContaPagar;
  onClose: () => void;
  onGerarLancamento?: () => void;
  loadingLancamento?: boolean;
}

// Remover a função getTipoDocumentoText (linhas 16-22)

export function ImageModal({ 
  isOpen, 
  imageUrl, 
  imageName, 
  conta, 
  onClose, 
  onGerarLancamento,
  loadingLancamento = false 
}: ImageModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [currentImageName, setCurrentImageName] = useState(imageName);

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
  
  const hasMultiplePhotos = allImages.length > 1;
  const totalPhotos = allImages.length;

  const {
    zoomLevel,
    imagePosition,
    isDragging,
    isTouchDevice,
    imageRef,
    containerRef,
    handleZoomIn,
    handleZoomOut,
    resetZoom,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetViewer
  } = useImageViewer();

  // Atualizar imagem atual quando o modal abrir ou a conta mudar
  useEffect(() => {
    if (isOpen && allImages.length > 0) {
      // Procurar a imagem clicada no array combinado
      const index = allImages.findIndex(img => img.url === imageUrl);
      const currentIndex = index >= 0 ? index : 0;
      
      setCurrentImageIndex(currentIndex);
      setCurrentImageUrl(allImages[currentIndex].url);
      setCurrentImageName(allImages[currentIndex].name);
    }
  }, [isOpen, imageUrl, allImages]);

  const handlePreviousImage = () => {
    if (allImages.length <= 1) return;
    
    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : allImages.length - 1;
    setCurrentImageIndex(newIndex);
    setCurrentImageUrl(allImages[newIndex].url);
    setCurrentImageName(allImages[newIndex].name);
    resetViewer();
  };

  const handleNextImage = () => {
    if (allImages.length <= 1) return;
    
    const newIndex = currentImageIndex < allImages.length - 1 ? currentImageIndex + 1 : 0;
    setCurrentImageIndex(newIndex);
    setCurrentImageUrl(allImages[newIndex].url);
    setCurrentImageName(allImages[newIndex].name);
    resetViewer();
  };

  const handleClose = () => {
    resetViewer();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full h-full flex flex-col">
        {/* Barra de controles superior */}
        <div className="absolute top-2 sm:top-4 left-0 right-0 z-20 flex justify-between items-center px-3 sm:px-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={handleZoomOut}
              className="bg-black bg-opacity-50 text-white p-2 sm:p-3 rounded-full hover:bg-opacity-70 transition-all touch-manipulation"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleZoomIn}
              className="bg-black bg-opacity-50 text-white p-2 sm:p-3 rounded-full hover:bg-opacity-70 transition-all touch-manipulation"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={resetZoom}
              className="bg-black bg-opacity-50 text-white px-2 py-2 sm:px-3 sm:py-2 rounded-full hover:bg-opacity-70 transition-all text-xs sm:text-sm touch-manipulation"
              title="Resetar zoom"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          
          {/* Contador de fotos */}
          {hasMultiplePhotos && (
            <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {totalPhotos}
            </div>
          )}
          
          <button
            onClick={handleClose}
            className="bg-black bg-opacity-50 text-white p-2 sm:p-3 rounded-full hover:bg-opacity-70 transition-all touch-manipulation"
            title="Fechar"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Controles de navegação */}
        {hasMultiplePhotos && (
          <>
            <button
              onClick={handlePreviousImage}
              className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 sm:p-3 rounded-full hover:bg-opacity-70 transition-all z-20 touch-manipulation"
              title="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 sm:p-3 rounded-full hover:bg-opacity-70 transition-all z-20 touch-manipulation"
              title="Próxima foto"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Container da imagem */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden"
          onMouseDown={!isTouchDevice ? handleMouseDown : undefined}
          onMouseMove={!isTouchDevice ? handleMouseMove : undefined}
          onMouseUp={!isTouchDevice ? handleMouseUp : undefined}
          onMouseLeave={!isTouchDevice ? handleMouseUp : undefined}
          onTouchStart={isTouchDevice ? handleTouchStart : undefined}
          onTouchMove={isTouchDevice ? handleTouchMove : undefined}
          onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
        >
          <img
            ref={imageRef}
            src={currentImageUrl}
            alt={currentImageName || "Documento da conta"}
            className={`max-w-none select-none ${
              isDragging ? 'transition-none' : 'transition-transform duration-150 ease-out'
            }`}
            style={{
              transform: `scale(${zoomLevel}) translate(${imagePosition.x / zoomLevel}px, ${imagePosition.y / zoomLevel}px)`,
              transformOrigin: 'center center',
              willChange: isDragging ? 'transform' : 'auto',
              maxHeight: '90vh',
              maxWidth: '90vw'
            }}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        </div>

        {/* Informações do arquivo */}
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-black bg-opacity-50 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
          <p className="text-xs sm:text-sm break-words max-w-xs">{currentImageName || 'documento.jpg'}</p>
          <p className="text-xs opacity-75">Zoom: {Math.round(zoomLevel * 100)}%</p>
          {isTouchDevice && (
            <p className="text-xs opacity-75 mt-1">Pinça para zoom • Arraste para mover</p>
          )}
        </div>

        {/* Botão para gerar lançamento DRE */}
        {conta.status === 'paga' && conta.contaContabilId && !conta.lancamentoGeradoId && onGerarLancamento && (
          <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4">
            <button
              onClick={onGerarLancamento}
              disabled={loadingLancamento}
              className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 text-sm touch-manipulation"
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Gerar Lançamento DRE</span>
              <span className="sm:hidden">Gerar DRE</span>
            </button>
          </div>
        )}

        {/* Indicador de lançamento já gerado */}
        {conta.lancamentoGeradoId && (
          <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-green-600 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs sm:text-sm">DRE Gerado</span>
          </div>
        )}
      </div>
    </div>
  );
}