import React from 'react';
import { SignUpForm } from '../components/Auth/SignUpForm';
import { AuthLayout } from '../components/Auth/AuthLayout';
import { ConfigurationStatus } from '../components/ConfigurationStatus';
import PWAInstallBanner from '../components/PWAInstallBanner';
import { supabase } from '../lib/supabaseClient';

export const SignUpPage: React.FC = () => {
    // Verificar se o Supabase está configurado
    const isSupabaseConfigured = Boolean(
        import.meta.env.VITE_SUPABASE_URL && 
        import.meta.env.VITE_SUPABASE_URL !== 'your-project-url.supabase.co' &&
        import.meta.env.VITE_SUPABASE_ANON_KEY && 
        import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-anon-key-here'
    );

    return (
        <>
            <AuthLayout title="Cadastre-se" subtitle="Crie sua conta para acessar o sistema">
                {isSupabaseConfigured ? (
                    <SignUpForm />
                ) : (
                    <ConfigurationStatus isConfigured={false} />
                )}
            </AuthLayout>
            <PWAInstallBanner />
        </>
    );
};

export default SignUpPage;