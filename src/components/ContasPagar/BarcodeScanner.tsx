import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Flashlight, Image, X } from 'lucide-react';
import { toast } from 'sonner';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { barcode44ToLinhaDigitavel47, isValidBarcode44, isValidLinhaDigitavel47, normalizeDigits } from '../../utils/boletoUtils';

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
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCandidateRef = useRef<{ value: string; count: number; ts: number } | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const hints = useMemo(() => {
    const map = new Map();
    map.set(DecodeHintType.TRY_HARDER, true);
    map.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.ITF,
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE
    ]);
    return map;
  }, []);

  const forceOrientationLandscape = async () => {
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch (error) {
      console.log('Erro ao forçar orientação landscape:', error);
    }
  };

  const restoreOrientation = () => {
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch (error) {
      console.log('Erro ao restaurar orientação:', error);
    }
  };

  const stopScanner = () => {
    if (stopRef.current) {
      try {
        stopRef.current();
      } catch {}
      stopRef.current = null;
    }
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {}
    }
  };

  const setTorch = async (enabled: boolean) => {
    const track = videoTrackRef.current;
    if (!track) {
      setTorchOn(false);
      return;
    }
    const caps = (track.getCapabilities ? (track.getCapabilities() as any) : null) as any;
    if (!caps?.torch) {
      setTorchOn(false);
      return;
    }
    try {
      await track.applyConstraints({ advanced: [{ torch: enabled }] } as any);
      setTorchOn(enabled);
    } catch (e: any) {
      setTorchOn(false);
      toast.error('Não foi possível controlar a lanterna neste dispositivo/navegador.');
    }
  };

  useEffect(() => {
    if (scannerAtivo) {
      void forceOrientationLandscape();
    } else {
      restoreOrientation();
      setTorchSupported(false);
      setTorchOn(false);
      videoTrackRef.current = null;
    }
  }, [scannerAtivo]);

  useEffect(() => {
    if (scannerError) setScannerErro(scannerError);
  }, [scannerError]);

  useEffect(() => {
    return () => {
      if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
      void setTorch(false);
      stopScanner();
    };
  }, []);

  const handleScannerError = (error: any) => {
    console.error('Erro no scanner:', error);

    const msg = String(error?.message || '');
    if (
      msg.includes('NotFoundException') ||
      msg.includes('No MultiFormat Readers were able to detect the code') ||
      msg.includes('No code found') ||
      msg.includes('No QR code found')
    ) {
      return;
    }

    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      setScannerErro('Permissão da câmera negada. Clique no ícone de câmera na barra de endereço do navegador e permita o acesso.');
    } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
      setScannerErro('Nenhuma câmera encontrada no dispositivo.');
    } else if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
      setScannerErro('A câmera está em uso por outro aplicativo ou não pode ser acessada.');
    } else if (error?.name === 'OverconstrainedError') {
      setScannerErro('As configurações da câmera solicitadas não são suportadas pelo seu dispositivo.');
    } else if (error?.name === 'TypeError' || msg.includes('SSL')) {
      setScannerErro('Erro de segurança: O acesso à câmera requer uma conexão segura (HTTPS).');
    } else if (error?.name === 'NotSupportedError' || error?.name === 'InsecureContextError') {
      setScannerErro('Scanner não suportado neste navegador ou contexto inseguro.');
    } else {
      setScannerErro(`Erro ao acessar a câmera: ${msg || 'Verifique as permissões do navegador e tente novamente'}`);
    }
  };

  const handleBarcodeTextDetected = (barcodeData: string, source: 'live' | 'image') => {
    if (!barcodeData || isScanning) return;

    const digits = normalizeDigits(barcodeData);
    if (!digits) return;
    if (digits.length !== 44 && digits.length !== 47 && digits.length !== 48) return;

    if (digits.length === 47 && !isValidLinhaDigitavel47(digits)) {
      toast.error('Leitura inválida (boleto). Tente novamente com mais foco/luz.');
      return;
    }
    if (digits.length === 44 && !isValidBarcode44(digits)) {
      toast.error('Leitura inválida (código de barras). Tente novamente.');
      return;
    }

    if (source === 'live') {
      const now = Date.now();
      const last = lastCandidateRef.current;
      if (!last || last.value !== digits || now - last.ts > 2000) {
        lastCandidateRef.current = { value: digits, count: 1, ts: now };
        toast.message('Aproxime e mantenha estável para confirmar a leitura...');
        return;
      }
      lastCandidateRef.current = { value: digits, count: last.count + 1, ts: now };
      if (last.count + 1 < 2) return;
    }

    lastCandidateRef.current = null;
    stopScanner();
    setIsScanning(true);

    if (navigator.vibrate) navigator.vibrate(200);
    toast.success('Código de barras lido com sucesso!');

    scannerTimeoutRef.current = setTimeout(() => {
      if (digits.length === 44 && digits[0] !== '8') {
        const linha = barcode44ToLinhaDigitavel47(digits);
        onBarcodeDetected(linha || digits);
        setIsScanning(false);
        return;
      }
      onBarcodeDetected(digits);
      setIsScanning(false);
    }, 700);
  };

  const startScanner = async () => {
    if (!videoRef.current) return;

    stopScanner();
    setScannerErro(null);
    setTorchSupported(false);
    setTorchOn(false);
    videoTrackRef.current = null;

    const reader = new BrowserMultiFormatReader(hints, 200);
    readerRef.current = reader;

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const controls = await reader.decodeFromConstraints(constraints, videoRef.current, (result, err) => {
        if (result) {
          handleBarcodeTextDetected(String(result.getText() || '').trim(), 'live');
          return;
        }
        if (err) handleScannerError(err);
      });

      stopRef.current = () => {
        try {
          controls.stop();
        } catch {}
      };

      const stream = (videoRef.current.srcObject as MediaStream | null) || null;
      const track = stream?.getVideoTracks?.()?.[0] || null;
      videoTrackRef.current = track;
      if (track && cameraFacing === 'environment') {
        const caps = (track.getCapabilities ? (track.getCapabilities() as any) : null) as any;
        setTorchSupported(Boolean(caps?.torch));
      } else {
        setTorchSupported(false);
      }
    } catch (error: any) {
      handleScannerError(error);
    }
  };

  const decodeFromImageFile = async (file: File) => {
    if (!file) return;
    setIsDecodingImage(true);
    setScannerErro(null);
    stopScanner();

    const url = URL.createObjectURL(file);
    try {
      const img = new window.Image();
      img.decoding = 'async';
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Falha ao carregar a imagem'));
      });

      const reader = new BrowserMultiFormatReader(hints, 200);
      readerRef.current = reader;
      const result = await reader.decodeFromImageElement(img);
      handleBarcodeTextDetected(String(result.getText() || '').trim(), 'image');
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg.includes('NotFoundException') || msg.includes('No MultiFormat Readers were able to detect the code')) {
        setScannerErro('Não foi possível ler o código na foto. Tente aproximar mais e melhorar a iluminação.');
      } else {
        setScannerErro(`Erro ao ler foto: ${msg || 'tente novamente'}`);
      }
    } finally {
      URL.revokeObjectURL(url);
      setIsDecodingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (scannerAtivo) void startScanner();
    }
  };

  useEffect(() => {
    if (!scannerAtivo) return;
    setIsScanning(false);
    lastCandidateRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
    void startScanner();
    return () => {
      void setTorch(false);
      stopScanner();
    };
  }, [scannerAtivo, cameraFacing]);

  const toggleCamera = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!scannerAtivo) return null;

  if (scannerErro) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999]">
        <div className="bg-white p-6 rounded-lg max-w-md mx-4 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Erro no Scanner</h3>
          <p className="text-gray-600 mb-4">{scannerErro}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setScannerErro(null);
                void startScanner();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Tentar Novamente
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (scannerPermissaoNegada) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999]">
        <div className="bg-white p-6 rounded-lg max-w-md mx-4 text-center">
          <div className="text-red-500 text-6xl mb-4">📷</div>
          <h3 className="text-lg font-semibold mb-2">Permissão Negada</h3>
          <p className="text-gray-600 mb-4">
            Permita o acesso à câmera no navegador para usar o scanner.
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          backgroundColor: 'black'
        }}
      >
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
      </div>

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
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>

        <div className="relative flex items-center justify-center">
          <div
            className={`relative bg-transparent transition-all duration-300 ${isScanning ? 'animate-pulse' : ''}`}
            style={{
              width: '95vw',
              height: Math.min(window.innerHeight * 0.3, 180),
              minWidth: '90vw',
              minHeight: '120px',
              border: `4px ${isScanning ? 'solid' : 'dashed'} ${isScanning ? '#ef4444' : '#dc2626'}`,
              borderRadius: '20px',
              backgroundColor: isScanning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 0, 0, 0.1)',
              boxShadow: isScanning ? '0 0 30px rgba(239, 68, 68, 0.6)' : 'none'
            }}
          >
            <div
              className={`absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 ${isScanning ? 'border-red-400' : 'border-red-500'} rounded-tl-xl transition-colors duration-300`}
            ></div>
            <div
              className={`absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 ${isScanning ? 'border-red-400' : 'border-red-500'} rounded-tr-xl transition-colors duration-300`}
            ></div>
            <div
              className={`absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 ${isScanning ? 'border-red-400' : 'border-red-500'} rounded-bl-xl transition-colors duration-300`}
            ></div>
            <div
              className={`absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 ${isScanning ? 'border-red-400' : 'border-red-500'} rounded-br-xl transition-colors duration-300`}
            ></div>

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

      <div className="fixed top-0 left-0 right-0 flex justify-between items-center p-6 pointer-events-auto" style={{ zIndex: 10001 }}>
        <button
          onClick={toggleCamera}
          className="bg-black bg-opacity-80 text-white rounded-full p-4 hover:bg-opacity-95 transition-all duration-200 shadow-lg"
          title={`Alternar para câmera ${cameraFacing === 'environment' ? 'frontal' : 'traseira'}`}
        >
          <Camera size={24} />
        </button>

        <div className="bg-black bg-opacity-80 text-white px-4 py-2 rounded-full text-base font-medium shadow-lg">
          🔄 Landscape Mode | 📷 {cameraFacing === 'environment' ? 'Traseira' : 'Frontal'}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void setTorch(!torchOn)}
            disabled={!torchSupported}
            className={`${torchOn ? 'bg-yellow-500' : 'bg-black bg-opacity-80'} text-white rounded-full p-4 hover:bg-opacity-95 transition-all duration-200 shadow-lg disabled:opacity-50`}
            title={torchSupported ? (torchOn ? 'Desligar lanterna' : 'Ligar lanterna') : 'Lanterna indisponível'}
          >
            <Flashlight size={24} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDecodingImage}
            className="bg-blue-600 bg-opacity-90 text-white rounded-full p-4 hover:bg-opacity-100 transition-all duration-200 shadow-lg disabled:opacity-50"
            title="Ler pela foto"
          >
            <Image size={24} />
          </button>
          <button
            onClick={() => {
              void setTorch(false);
              onClose();
              setIsScanning(false);
            }}
            className="bg-red-600 bg-opacity-90 text-white rounded-full p-4 hover:bg-opacity-100 transition-all duration-200 shadow-lg"
            title="Fechar scanner"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void decodeFromImageFile(file);
        }}
      />
    </>
  );
}
