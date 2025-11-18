import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  details?: string[];
  actionText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  details,
  actionText = 'Entendi'
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    error: {
      icon: XCircle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      titleColor: 'text-red-900'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      titleColor: 'text-yellow-900'
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      buttonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      titleColor: 'text-green-900'
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      titleColor: 'text-blue-900'
    }
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full transform transition-all duration-300 animate-scale-in">
        {/* Header */}
        <div className={`p-6 rounded-t-xl ${config.bgColor} ${config.borderColor} border-b`}>
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-full bg-white shadow-sm`}>
              <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${config.titleColor}`}>{title}</h3>
              <p className="text-gray-700 mt-2 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Details */}
        {details && details.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Detalhes:</h4>
            <ul className="space-y-2">
              {details.map((detail, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end p-6">
          <button
            onClick={onClose}
            className={`px-6 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${config.buttonColor}`}
          >
            {actionText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { 
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};