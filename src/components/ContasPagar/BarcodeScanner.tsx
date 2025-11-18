import React, { useState, useEffect, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import QrBarcodeScanner from 'react-qr-barcode-scanner';

interface BarcodeScannerProps {
  scannerAtivo: boolean;
  scannerPermissaoNegada: boolean;
  scannerError: string | null;
  onBarcodeDetected: (codigo: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ 
  scannerAtivo, 
  scannerPermissaoNegada, 
  scannerError, 
  onBarcodeDetected, 
  onClose 
}: BarcodeScannerProps) {
  const [scannerErro, setScannerErro] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState(false);
  
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para forçar orientação landscape
  const forceOrientationLandscape = async () => {
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch (error) {
      console.log('Erro ao forçar orientação landscape:', error);
    }
  };

  // Função para restaurar orientação
  const restoreOrientation = () => {
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch (error) {
      console.log('Erro ao restaurar orientação:', error);
    }
  };

  // Efeito principal - executado quando scanner é ativado
  useEffect(() => {
    if (scannerAtivo) {
      // Forçar orientação landscape
      forceOrientationLandscape();
    } else {
      restoreOrientation();
    }
  }, [scannerAtivo]);

  // Efeito para erros externos
  useEffect(() => {
    if (scannerError) {
      setScannerErro(scannerError);
    }
  }, [scannerError]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, []);

  // Função para processar o código de barras lido
  const handleBarcodeDetected = (result: any) => {
    if (result && result.text && !isScanning) {
      setIsScanning(true);
      const barcodeData = result.text;
      console.log('Código de barras detectado:', barcodeData);
      
      // Vibração se disponível
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
      
      // Feedback visual de sucesso
      toast.success('Código de barras lido com sucesso!');
      
      try {
        // Desativar o scanner após leitura bem-sucedida com delay
        scannerTimeoutRef.current = setTimeout(() => {
          onBarcodeDetected(barcodeData);
          setIsScanning(false);
        }, 1000);
        
        // Limpar qualquer erro anterior
        setScannerErro(null);
        
      } catch (error) {
        console.error('Erro ao processar código de barras:', error);
        setScannerErro('Erro ao processar o código de barras.');
        setIsScanning(false);
      }
    }
  };

  // Função para lidar com erros do scanner
  const handleScannerError = (error: any) => {
    console.error('Erro no scanner:', error);
    
    // Ignorar erros normais de detecção de código - isso é comportamento normal
    if (error.message && (
      error.message.includes('No MultiFormat Readers were able to detect the code') ||
      error.message.includes('NotFoundException') ||
      error.message.includes('No code found') ||
      error.message.includes('No QR code found')
    )) {
      console.log('Erro normal de detecção (ignorado):', error.message);
      return; // Não tratar como erro
    }
    
    // Verificar se o erro está relacionado a permissões
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      setScannerErro('Permissão da câmera negada. Clique no ícone de câmera na barra de endereço do navegador e permita o acesso.');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      setScannerErro('Nenhuma câmera encontrada no dispositivo.');
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      setScannerErro('A câmera está em uso por outro aplicativo ou não pode ser acessada.');
    } else if (error.name === 'OverconstrainedError') {
      setScannerErro('As configurações da câmera solicitadas não são suportadas pelo seu dispositivo.');
    } else if (error.name === 'TypeError' || error.message?.includes('SSL')) {
      setScannerErro('Erro de segurança: O acesso à câmera requer uma conexão segura (HTTPS).');
    } else if (error.name === 'NotSupportedError' || error.name === 'InsecureContextError') {
      setScannerErro('Scanner não suportado neste navegador ou contexto inseguro.');
    } else {
      setScannerErro(`Erro ao acessar a câmera: ${error.message || 'Verifique as permissões do navegador e tente novamente'}`);
    }
  };

  // Função para alternar entre câmeras
  const toggleCamera = () => {
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
  };

  if (!scannerAtivo) return null;

  // Se houver erro, mostrar tela de erro
  if (scannerErro) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999]">
        <div className="bg-white p-6 rounded-lg max-w-md mx-4 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Erro no Scanner</h3>
          <p className="text-gray-600 mb-4">
            {scannerErro}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setScannerErro(null);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Tentar Novamente
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar scanner diretamente
  return (
    <>
      {/* Container da câmera ocupando toda a tela - Layout natural para landscape */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: 'black'
      }}>
        <QrBarcodeScanner
          width="100%"
          height="100%"
          onUpdate={(err, result) => {
            console.log('Scanner onUpdate chamado:', { err, result });
            if (result) {
              console.log('Código detectado:', result.text);
              handleBarcodeDetected(result);
            } else if (err && !err.message?.includes('No MultiFormat Readers')) {
              // Só tratar erros que NÃO sejam de detecção normal
              console.error('Erro no scanner onUpdate:', err);
              handleScannerError(err);
            }
            // Ignorar erros de "não encontrou código" - isso é normal
          }}
          facingMode={cameraFacing}
          constraints={{
            video: {
              facingMode: cameraFacing
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </div>
          
          {/* Overlay com guia de posicionamento para landscape */}
          <div 
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{
              width: '100vw',
              height: '100vh',
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 10000
            }}
          >
            {/* Área escura ao redor com transparência reduzida */}
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
            
            {/* Container centralizado para a área de scan - otimizado para landscape */}
            <div className="relative flex items-center justify-center">
              {/* Área central transparente com bordas animadas - formato landscape */}
              <div 
                className={`relative bg-transparent transition-all duration-300 ${isScanning ? 'animate-pulse' : ''}`}
                style={{
                  width: '95vw', // Ocupar 95% da largura da tela
                  height: Math.min(window.innerHeight * 0.3, 180), // Altura proporcional para códigos de barras
                  minWidth: '90vw', // Garantir largura mínima ampla
                  minHeight: '120px',
                  border: `4px ${isScanning ? 'solid' : 'dashed'} ${isScanning ? '#ef4444' : '#dc2626'}`,
                  borderRadius: '20px',
                  backgroundColor: isScanning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                  boxShadow: isScanning ? '0 0 30px rgba(239, 68, 68, 0.6)' : 'none'
                }}
              >
                {/* Cantos destacados com animação */}
                <div className={`absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 ${isScanning ? 'border-red-400' : 'border-red-500'} rounded-tl-xl transition-colors duration-300`}></div>
                <div className={`absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 ${isScanning ? 'border-red-400' : 'border-red-500'} rounded-tr-xl transition-colors duration-300`}></div>
                <div className={`absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 ${isScanning ? 'border-red-400' : 'border-red-500'} rounded-bl-xl transition-colors duration-300`}></div>
                <div className={`absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 ${isScanning ? 'border-red-400' : 'border-red-500'} rounded-br-xl transition-colors duration-300`}></div>
                
                {/* Linha de scan animada */}
                {!isScanning && (
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-red-400 animate-pulse"
                    style={{
                      top: '50%',
                      transform: 'translateY(-50%)',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                    }}
                  ></div>
                )}
                

              </div>
            </div>
          </div>
          
          {/* Controles do scanner - Layout responsivo para landscape */}
          <div 
            className="fixed top-0 left-0 right-0 flex justify-between items-center p-6 pointer-events-auto" 
            style={{ 
              zIndex: 10001
            }}
          >
            {/* Botão para alternar câmera - Maior para fullscreen */}
            <button
              onClick={toggleCamera}
              className="bg-black bg-opacity-80 text-white rounded-full p-4 hover:bg-opacity-95 transition-all duration-200 shadow-lg"
              title={`Alternar para câmera ${cameraFacing === 'environment' ? 'frontal' : 'traseira'}`}
            >
              <Camera size={24} />
            </button>
            
            {/* Indicador de orientação e status - Mais visível */}
            <div className="bg-black bg-opacity-80 text-white px-4 py-2 rounded-full text-base font-medium shadow-lg">
              🔄 Landscape Mode | 📷 {cameraFacing === 'environment' ? 'Traseira' : 'Frontal'}
            </div>
            
            {/* Botão de fechar - Maior e mais visível */}
            <button
              onClick={() => {
                onClose();
                setIsScanning(false);
              }}
              className="bg-red-600 bg-opacity-90 text-white rounded-full p-4 hover:bg-opacity-100 transition-all duration-200 shadow-lg"
              title="Fechar scanner"
            >
              <X size={24} />
            </button>
          </div>
          

    </>
  );
}