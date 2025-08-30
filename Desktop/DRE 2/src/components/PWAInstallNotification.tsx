import React from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface PWAInstallNotificationProps {
  onInstall: () => void;
  onDismiss: () => void;
  show: boolean;
}

export const PWAInstallNotification: React.FC<PWAInstallNotificationProps> = ({
  onInstall,
  onDismiss,
  show
}) => {
  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-right duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Instalar App DRE
            </h3>
            <p className="text-gray-600 mb-4">
              Instale o app DRE no seu dispositivo para uma experiência mais rápida e acesso offline!
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={onInstall}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center space-x-1"
          >
            <Download className="h-4 w-4" />
            <span>Instalar</span>
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallNotification;