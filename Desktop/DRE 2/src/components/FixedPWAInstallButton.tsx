import React, { useState } from 'react';
import { StarBorder } from './ui/star-border';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { X, Share, Plus } from 'lucide-react';

const FixedPWAInstallButton: React.FC = () => {
    const { isInstallable, install } = usePWAInstall();
    const [showIOSModal, setShowIOSModal] = useState(false);

    // Detectar se é iOS
    const isIOS = () => {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    };

    // Detectar se é Safari no iOS
    const isIOSSafari = () => {
        const ua = navigator.userAgent;
        return isIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
    };

    const handleInstallClick = () => {
        if (isIOS()) {
            setShowIOSModal(true);
        } else if (isInstallable) {
            install();
        }
    };

    // Não mostrar o botão se não for instalável e não for iOS
    if (!isInstallable && !isIOS()) {
        return null;
    }

    return (
        <>
            {/* Botão fixo */}
            <div className="fixed bottom-6 right-6 z-50">
                <StarBorder
                    onClick={handleInstallClick}
                    className="shadow-lg hover:shadow-xl transition-shadow duration-300"
                    color="hsl(59, 100%, 50%)"
                    speed="4s"
                >
                    <div className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Instalar APP
                    </div>
                </StarBorder>
            </div>

            {/* Modal para iOS */}
            {showIOSModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 relative">
                        {/* Botão fechar */}
                        <button
                            onClick={() => setShowIOSModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        {/* Conteúdo do modal */}
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">
                                Instalar no iOS
                            </h3>
                            
                            <div className="space-y-4 text-left">
                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                                        <span className="text-blue-600 font-bold text-sm">1</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-700">
                                            Toque no botão <strong>Compartilhar</strong> 
                                            <Share className="inline h-4 w-4 mx-1" /> 
                                            na barra inferior do Safari
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                                        <span className="text-blue-600 font-bold text-sm">2</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-700">
                                            Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                                            <Plus className="inline h-4 w-4 mx-1" />
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                                        <span className="text-blue-600 font-bold text-sm">3</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-700">
                                            Toque em <strong>"Adicionar"</strong> para confirmar
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {!isIOSSafari() && (
                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-yellow-800 text-sm">
                                        <strong>Nota:</strong> Para instalar este app, você precisa abrir esta página no Safari.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => setShowIOSModal(false)}
                                className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FixedPWAInstallButton;