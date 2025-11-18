import React from 'react';
import { TrendingUp } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, description }) => {
  return (
    <div className="min-h-screen lg:flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 flex-col justify-center items-center p-12 text-white relative overflow-hidden">
        <div className="absolute bg-blue-600 -bottom-24 -right-24 w-72 h-72 rounded-full opacity-20"></div>
        <div className="absolute bg-blue-500 -top-12 -left-32 w-80 h-80 rounded-full opacity-20"></div>
        
        <div className="z-10 text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
                <TrendingUp className="h-12 w-12 text-blue-400" />
                <span className="text-4xl font-bold">Sistema DRE</span>
            </div>
            <p className="text-xl text-gray-300 max-w-md">
            Sua plataforma completa para análise e gestão do Demonstrativo de Resultados do Exercício.
            </p>
            <div className="mt-10 w-full max-w-md h-64 bg-gray-800/50 rounded-lg flex items-center justify-center border border-gray-700 backdrop-blur-sm">
                <p className="text-gray-500 italic">Análises inteligentes para decisões assertivas.</p>
            </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white">
        {/* Form Content */}
        <div className="max-w-md w-full space-y-8 p-6 sm:p-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{title}</h2>
            <p className="mt-2 text-center text-sm text-gray-600">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
