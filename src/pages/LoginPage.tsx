import React from 'react';
import { AuthLayout } from '../components/Auth/AuthLayout';
import { LoginForm } from '../components/Auth/LoginForm';
import { ConfigurationStatus } from '../components/ConfigurationStatus';
import { PWAInstallBanner } from '../components/PWAInstallBanner';
import { usePWALoginBanner } from '../hooks/usePWALoginBanner';


// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  return url && key && 
         url !== 'your-project-url.supabase.co' && 
         key !== 'your-anon-key-here' &&
         url.includes('.supabase.co');
};

const LoginPage: React.FC = () => {
    const { showBanner, handleInstall, handleDismiss } = usePWALoginBanner();
    
    // Show configuration screen if Supabase is not configured
    if (!isSupabaseConfigured()) {
        return <ConfigurationStatus isConfigured={false} />;
    }

    return (
        <>
            <AuthLayout title="Bem-vindo de volta!" description="Faça login para acessar sua conta.">
                <LoginForm />
            </AuthLayout>
            
            {/* Banner PWA específico para login */}
            <PWAInstallBanner
                show={showBanner}
                onInstall={handleInstall}
                onDismiss={handleDismiss}
            />
            

        </>
    );
};

export default LoginPage;
