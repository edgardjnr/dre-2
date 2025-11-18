import React, { useState } from 'react';
import { AuthLayout } from '../components/Auth/AuthLayout';
import { ConfigurationStatus } from '../components/ConfigurationStatus';
import { PWAInstallBanner } from '../components/PWAInstallBanner';
import { ActivationCodeVerification } from '../components/Auth/ActivationCodeVerification';
import { ActivationCodeRequest } from '../components/Auth/ActivationCodeRequest';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured } from '../utils/supabaseConfig';

enum ActivationStep {
  VERIFICATION = 'verification',
  REQUEST = 'request'
}

export const ActivationCodePage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<ActivationStep>(ActivationStep.VERIFICATION);
  const navigate = useNavigate();
  const supabaseConfigured = isSupabaseConfigured();

  const handleCodeVerified = () => {
    // Redirecionar para a página de cadastro
    navigate('/signup');
  };

  const handleRequestCode = () => {
    setCurrentStep(ActivationStep.REQUEST);
  };

  const handleRequestComplete = () => {
    setCurrentStep(ActivationStep.VERIFICATION);
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <AuthLayout>
      <PWAInstallBanner />
      {!supabaseConfigured && <ConfigurationStatus isConfigured={false} />}

      <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900">OneBots DRE</h1>
            <p className="mt-2 text-sm text-gray-600">
              Sistema de Demonstrativo de Resultados do Exercício
            </p>
          </div>

          {currentStep === ActivationStep.VERIFICATION ? (
            <ActivationCodeVerification 
              onCodeVerified={handleCodeVerified} 
              onRequestCode={handleRequestCode}
              onBackToLogin={handleBackToLogin}
            />
          ) : (
            <ActivationCodeRequest 
              onRequestComplete={handleRequestComplete}
              onBackToLogin={handleBackToLogin}
            />
          )}
        </div>
      </div>
    </AuthLayout>
  );
};