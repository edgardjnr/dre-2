import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, Plus, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { cn } from '../lib/utils';

interface PWAInstallButtonProps {
    className?: string;
}

const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '' }) => {
    const { isInstallable, installPWA } = usePWAInstall();
    const [showIOSModal, setShowIOSModal] = useState(false);
    const [status, setStatus] = useState<'idle' | 'installing' | 'installed'>('idle');

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

    const handleInstallClick = async () => {
        console.log('PWA Install button clicked');
        if (status === 'idle') {
            if (isIOS()) {
                console.log('iOS detected, showing modal');
                setShowIOSModal(true);
            } else if (isInstallable) {
                console.log('Installing PWA');
                setStatus('installing');
                try {
                    await installPWA();
                    setStatus('installed');
                    setTimeout(() => {
                        setStatus('idle');
                    }, 2000);
                } catch (error) {
                    console.error('PWA installation failed:', error);
                    setStatus('idle');
                }
            } else {
                console.log('PWA not installable');
            }
        }
    };

    // Não mostrar o botão se não for instalável e não for iOS
    if (!isInstallable && !isIOS()) {
        return null;
    }

    const buttonVariants = {
        idle: {
            backgroundColor: "rgb(59, 130, 246)",
            color: "rgb(255, 255, 255)",
            scale: 1,
        },
        installing: {
            backgroundColor: "rgb(168, 85, 247)",
            color: "rgb(255, 255, 255)",
            scale: 1,
        },
        installed: {
            backgroundColor: "rgb(34, 197, 94)",
            color: "rgb(255, 255, 255)",
            scale: [1, 1.1, 1],
            transition: {
                duration: 0.2,
                times: [0, 0.5, 1],
            },
        },
    };

    const text = {
        idle: "Instalar APP",
        installing: "Instalando...",
        installed: "Instalado!"
    };

    return (
        <>
            <div className={`w-full ${className}`}>
                <div className="relative">
                    <motion.button
                        onClick={handleInstallClick}
                        animate={status}
                        variants={buttonVariants}
                        className={cn(
                            "group relative grid overflow-hidden rounded-full px-6 py-2 transition-all duration-200 w-full",
                            status === "idle"
                                ? "shadow-[0_1000px_0_0_hsl(217_91%_60%)_inset]"
                                : "",
                            "hover:shadow-lg"
                        )}
                        style={{ minWidth: "150px" }}
                        whileHover={status === "idle" ? { scale: 1.05 } : {}}
                        whileTap={status === "idle" ? { scale: 0.95 } : {}}
                    >
                        {status === "idle" && (
                            <span>
                                <span
                                    className={cn(
                                        "spark mask-gradient absolute inset-0 h-[100%] w-[100%] animate-flip overflow-hidden rounded-full",
                            "[mask:linear-gradient(#ffffff,_transparent_50%)] before:absolute before:aspect-square before:w-[200%] before:bg-[conic-gradient(from_0deg,transparent_0_340deg,#ffffff_360deg)]",
                            "before:rotate-[-90deg] before:animate-rotate",
                                        "before:content-[''] before:[inset:0_auto_auto_50%] before:[translate:-50%_-15%]"
                                    )}
                                />
                            </span>
                        )}
                        <span
                            className={cn(
                                "backdrop absolute inset-px rounded-[22px] transition-colors duration-200",
                                status === "idle"
                                    ? "bg-blue-500 group-hover:bg-blue-600"
                                    : ""
                            )}
                        />
                        <span className="z-10 flex items-center justify-center gap-2 text-sm font-medium">
                            <AnimatePresence mode="wait">
                                {status === "installing" && (
                                    <motion.span
                                        key="installing"
                                        initial={{ opacity: 0, rotate: 0 }}
                                        animate={{ opacity: 1, rotate: 360 }}
                                        exit={{ opacity: 0 }}
                                        transition={{
                                            duration: 0.3,
                                            rotate: { repeat: Number.POSITIVE_INFINITY, duration: 1, ease: "linear" },
                                        }}
                                    >
                                        <Loader2 className="w-4 h-4" />
                                    </motion.span>
                                )}
                                {status === "installed" && (
                                    <motion.span
                                        key="installed"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <Check className="w-4 h-4" />
                                    </motion.span>
                                )}
                                {status === "idle" && (
                                    <motion.span
                                        key="idle"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            <motion.span
                                key={status}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {text[status]}
                            </motion.span>
                        </span>
                    </motion.button>
                </div>
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

export default PWAInstallButton;
